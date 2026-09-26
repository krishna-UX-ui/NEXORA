import os
import random
import datetime
import pandas as pd
from ml.feature_engineering import compute_derived_features

BEHAVIOR_CLASSES = [
    "DEEP WORK",
    "NORMAL WORK",
    "FRAGMENTED WORK",
    "EXPLORATION",
    "IDLE"
]

FEATURE_COLUMNS = [
    "duration",
    "active_time",
    "idle_time",
    "mouse_clicks",
    "keyboard_events",
    "scroll_events",
    "mouse_distance",
    "app_switches",
    "application_count",
    "focus_index",
    "continuity_index",
    "interaction_stability",
    "fragmentation_index",
    "activity_density"
]

def generate_synthetic_sessions(count=75):
    sessions = []
    apps_data = []
    base_time = datetime.datetime.now() - datetime.timedelta(days=14)

    app_catalog = {
        "DEEP WORK": ["VS Code", "Terminal", "Documentation", "Database IDE"],
        "NORMAL WORK": ["Browser", "VS Code", "Slack", "Spreadsheet", "Terminal"],
        "FRAGMENTED WORK": ["Slack", "Browser", "Email Client", "Music Player", "File Manager", "VS Code"],
        "EXPLORATION": ["Web Browser", "Figma", "Research PDF", "Terminal"],
        "IDLE": ["Background Player", "Desktop", "Screensaver"]
    }

    for i in range(1, count + 1):
        target_class = random.choice(BEHAVIOR_CLASSES)
        session_id = f"DEMO-{1000 + i}"
        offset_minutes = random.randint(10, 20000)
        start_dt = base_time + datetime.timedelta(minutes=offset_minutes)

        if target_class == "DEEP WORK":
            duration = random.randint(2400, 7200)
            active_ratio = random.uniform(0.85, 0.98)
            active_time = round(duration * active_ratio, 1)
            idle_time = round(duration - active_time, 1)
            mouse_clicks = random.randint(250, 950)
            keyboard_events = random.randint(800, 2800)
            scroll_events = random.randint(60, 220)
            mouse_distance = round(random.uniform(5000, 18000), 1)
            app_switches = random.randint(2, 8)
            app_count = random.randint(2, 3)

        elif target_class == "NORMAL WORK":
            duration = random.randint(1800, 5400)
            active_ratio = random.uniform(0.68, 0.84)
            active_time = round(duration * active_ratio, 1)
            idle_time = round(duration - active_time, 1)
            mouse_clicks = random.randint(200, 600)
            keyboard_events = random.randint(350, 1200)
            scroll_events = random.randint(80, 300)
            mouse_distance = round(random.uniform(4000, 14000), 1)
            app_switches = random.randint(9, 18)
            app_count = random.randint(3, 5)

        elif target_class == "FRAGMENTED WORK":
            duration = random.randint(1200, 4800)
            active_ratio = random.uniform(0.40, 0.65)
            active_time = round(duration * active_ratio, 1)
            idle_time = round(duration - active_time, 1)
            mouse_clicks = random.randint(300, 800)
            keyboard_events = random.randint(150, 600)
            scroll_events = random.randint(150, 450)
            mouse_distance = round(random.uniform(8000, 22000), 1)
            app_switches = random.randint(22, 55)
            app_count = random.randint(5, 8)

        elif target_class == "EXPLORATION":
            duration = random.randint(1500, 4200)
            active_ratio = random.uniform(0.65, 0.82)
            active_time = round(duration * active_ratio, 1)
            idle_time = round(duration - active_time, 1)
            mouse_clicks = random.randint(450, 1100)
            keyboard_events = random.randint(100, 400)
            scroll_events = random.randint(350, 950)
            mouse_distance = round(random.uniform(12000, 28000), 1)
            app_switches = random.randint(14, 28)
            app_count = random.randint(4, 6)

        else:
            duration = random.randint(900, 3600)
            active_ratio = random.uniform(0.10, 0.32)
            active_time = round(duration * active_ratio, 1)
            idle_time = round(duration - active_time, 1)
            mouse_clicks = random.randint(15, 80)
            keyboard_events = random.randint(10, 90)
            scroll_events = random.randint(10, 60)
            mouse_distance = round(random.uniform(400, 2500), 1)
            app_switches = random.randint(1, 5)
            app_count = random.randint(1, 2)

        end_dt = start_dt + datetime.timedelta(seconds=duration)

        raw_metrics = {
            "duration": duration,
            "active_time": active_time,
            "idle_time": idle_time,
            "mouse_clicks": mouse_clicks,
            "keyboard_events": keyboard_events,
            "scroll_events": scroll_events,
            "mouse_distance": mouse_distance,
            "app_switches": app_switches,
            "application_count": app_count
        }

        derived = compute_derived_features(raw_metrics)

        session_record = {
            "session_id": session_id,
            "start_time": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": duration,
            "active_time": active_time,
            "idle_time": idle_time,
            "mouse_clicks": mouse_clicks,
            "keyboard_events": keyboard_events,
            "scroll_events": scroll_events,
            "mouse_distance": mouse_distance,
            "app_switches": app_switches,
            "application_count": app_count,
            "focus_index": derived["focus_index"],
            "continuity_index": derived["continuity_index"],
            "interaction_stability": derived["interaction_stability"],
            "fragmentation_index": derived["fragmentation_index"],
            "activity_density": derived["activity_density"],
            "behavior_class": target_class,
            "is_demo": 1,
            "anomaly_score": 0.12 if target_class != "FRAGMENTED WORK" else 0.28,
            "is_anomaly": 0,
            "created_at": end_dt.strftime("%Y-%m-%d %H:%M:%S")
        }
        sessions.append(session_record)

        chosen_apps = app_catalog.get(target_class, ["AppA", "AppB"])
        weights = [random.uniform(10, 100) for _ in chosen_apps]
        total_w = sum(weights)
        for app_idx, app_name in enumerate(chosen_apps):
            portion = weights[app_idx] / total_w
            apps_data.append({
                "session_id": session_id,
                "app_name": app_name,
                "duration_seconds": round(duration * portion, 1),
                "percentage": round(portion * 100.0, 1),
                "created_at": end_dt.strftime("%Y-%m-%d %H:%M:%S")
            })

    return sessions, apps_data

def save_synthetic_csv(sessions, output_dir="data"):
    os.makedirs(output_dir, exist_ok=True)
    df = pd.DataFrame(sessions)
    csv_path = os.path.join(output_dir, "synthetic_sessions.csv")
    df.to_csv(csv_path, index=False)
    return csv_path
