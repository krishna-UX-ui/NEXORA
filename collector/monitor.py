import time
import datetime
import uuid
import psutil
from ml.feature_engineering import compute_derived_features
from database.database import insert_session

class LiveMonitorSession:
    def __init__(self, session_id=None):
        self.session_id = session_id or f"S-{uuid.uuid4().hex[:6].upper()}"
        self.start_time = datetime.datetime.now()
        self.last_update = time.time()
        self.is_active = True
        self.is_paused = False
        self.mouse_clicks = 0
        self.keyboard_events = 0
        self.scroll_events = 0
        self.mouse_distance = 0.0
        self.app_switches = 0
        self.active_time = 0.0
        self.idle_time = 0.0
        self.apps_tracker = {}
        self.current_app = self._detect_current_app()

    def _detect_current_app(self):
        try:
            for proc in psutil.process_iter(["name"]):
                pname = proc.info.get("name")
                if pname and pname.lower() not in ["system idle process", "system"]:
                    clean_name = pname.replace(".exe", "").title()
                    if clean_name in ["Code", "Chrome", "Msedge", "Firefox", "Terminal", "Powershell", "Explorer"]:
                        return clean_name
            return "Workstation Desktop"
        except Exception:
            return "Workstation Session"

    def record_pulse(self, data):
        if not self.is_active or self.is_paused:
            return self.get_live_state()

        now = time.time()
        delta = max(0.0, min(10.0, now - self.last_update))
        self.last_update = now

        clicks = int(data.get("mouse_clicks", 0))
        keys = int(data.get("keyboard_events", 0))
        scrolls = int(data.get("scroll_events", 0))
        distance = float(data.get("mouse_distance", 0.0))
        switches = int(data.get("app_switches", 0))
        reported_app = data.get("current_app")

        if reported_app and reported_app.strip():
            active_app_name = reported_app.strip()
        else:
            active_app_name = self._detect_current_app()

        if active_app_name != self.current_app:
            self.app_switches += 1
            self.current_app = active_app_name

        self.mouse_clicks += clicks
        self.keyboard_events += keys
        self.scroll_events += scrolls
        self.mouse_distance += distance
        self.app_switches += switches

        has_activity = (clicks > 0 or keys > 0 or scrolls > 0 or distance > 10.0)
        if has_activity:
            self.active_time += delta
        else:
            self.idle_time += delta

        self.apps_tracker[self.current_app] = self.apps_tracker.get(self.current_app, 0.0) + delta
        return self.get_live_state()

    def pause(self):
        self.is_paused = True
        self.last_update = time.time()
        return self.get_live_state()

    def resume(self):
        self.is_paused = False
        self.last_update = time.time()
        return self.get_live_state()

    def get_live_state(self):
        duration = round(self.active_time + self.idle_time, 1)
        if duration <= 0:
            duration = 1.0

        raw = {
            "duration": duration,
            "active_time": round(self.active_time, 1),
            "idle_time": round(self.idle_time, 1),
            "mouse_clicks": self.mouse_clicks,
            "keyboard_events": self.keyboard_events,
            "scroll_events": self.scroll_events,
            "mouse_distance": round(self.mouse_distance, 1),
            "app_switches": self.app_switches,
            "application_count": max(1, len(self.apps_tracker))
        }
        derived = compute_derived_features(raw)

        return {
            "session_id": self.session_id,
            "status": "PAUSED" if self.is_paused else ("ACTIVE" if self.is_active else "ENDED"),
            "duration": duration,
            "active_time": round(self.active_time, 1),
            "idle_time": round(self.idle_time, 1),
            "mouse_clicks": self.mouse_clicks,
            "keyboard_events": self.keyboard_events,
            "scroll_events": self.scroll_events,
            "mouse_distance": round(self.mouse_distance, 1),
            "app_switches": self.app_switches,
            "current_app": self.current_app,
            "focus_index": derived["focus_index"],
            "continuity_index": derived["continuity_index"],
            "interaction_stability": derived["interaction_stability"],
            "fragmentation_index": derived["fragmentation_index"],
            "activity_density": derived["activity_density"]
        }

    def end_and_persist(self, behavior_engine=None, anomaly_engine=None):
        self.is_active = False
        end_time = datetime.datetime.now()
        duration = max(1.0, round(self.active_time + self.idle_time, 1))

        raw_metrics = {
            "duration": duration,
            "active_time": round(self.active_time, 1),
            "idle_time": round(self.idle_time, 1),
            "mouse_clicks": self.mouse_clicks,
            "keyboard_events": self.keyboard_events,
            "scroll_events": self.scroll_events,
            "mouse_distance": round(self.mouse_distance, 1),
            "app_switches": self.app_switches,
            "application_count": max(1, len(self.apps_tracker))
        }

        derived = compute_derived_features(raw_metrics)
        full_dict = {**raw_metrics, **derived}

        classification_res = {"behavior_class": "NORMAL WORK", "confidence": 75.0, "top_signals": []}
        if behavior_engine:
            classification_res = behavior_engine.predict(full_dict)

        anomaly_res = {"is_anomaly": False, "anomaly_score": 0.15, "deviations": [], "status": "NORMAL"}
        if anomaly_engine:
            anomaly_res = anomaly_engine.predict(full_dict)

        session_record = {
            "session_id": self.session_id,
            "start_time": self.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": duration,
            "active_time": round(self.active_time, 1),
            "idle_time": round(self.idle_time, 1),
            "mouse_clicks": self.mouse_clicks,
            "keyboard_events": self.keyboard_events,
            "scroll_events": self.scroll_events,
            "mouse_distance": round(self.mouse_distance, 1),
            "app_switches": self.app_switches,
            "application_count": max(1, len(self.apps_tracker)),
            "focus_index": derived["focus_index"],
            "continuity_index": derived["continuity_index"],
            "interaction_stability": derived["interaction_stability"],
            "fragmentation_index": derived["fragmentation_index"],
            "activity_density": derived["activity_density"],
            "behavior_class": classification_res.get("behavior_class", "NORMAL WORK"),
            "is_demo": 0,
            "anomaly_score": anomaly_res.get("anomaly_score", 0.15),
            "is_anomaly": 1 if anomaly_res.get("is_anomaly") else 0,
            "created_at": end_time.strftime("%Y-%m-%d %H:%M:%S")
        }

        apps_list = []
        total_tracked = sum(self.apps_tracker.values())
        if total_tracked <= 0:
            total_tracked = duration

        if not self.apps_tracker:
            self.apps_tracker[self.current_app] = duration

        for app_name, app_sec in self.apps_tracker.items():
            pct = round((app_sec / total_tracked) * 100.0, 1)
            apps_list.append({
                "app_name": app_name,
                "duration_seconds": round(app_sec, 1),
                "percentage": pct
            })

        insert_session(session_record, apps_list)

        return {
            "session": session_record,
            "applications": apps_list,
            "classification": classification_res,
            "anomaly": anomaly_res
        }
