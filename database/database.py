import os
import sqlite3
import json
import datetime
import pandas as pd
from ml.preprocessing import generate_synthetic_sessions, save_synthetic_csv

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nexora.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration REAL NOT NULL,
        active_time REAL NOT NULL,
        idle_time REAL NOT NULL,
        mouse_clicks INTEGER NOT NULL,
        keyboard_events INTEGER NOT NULL,
        scroll_events INTEGER NOT NULL,
        mouse_distance REAL NOT NULL,
        app_switches INTEGER NOT NULL,
        application_count INTEGER NOT NULL,
        focus_index REAL NOT NULL,
        continuity_index REAL NOT NULL,
        interaction_stability REAL NOT NULL,
        fragmentation_index REAL NOT NULL,
        activity_density REAL NOT NULL,
        behavior_class TEXT NOT NULL,
        is_demo INTEGER DEFAULT 0,
        anomaly_score REAL DEFAULT 0.0,
        is_anomaly INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        percentage REAL NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_type TEXT NOT NULL,
        training_samples INTEGER NOT NULL,
        metrics_json TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    default_settings = [
        ("tracking", "ON"),
        ("auto_start", "OFF"),
        ("idle_threshold", "60"),
        ("data_retention", "90"),
        ("demo_mode", "ON"),
        ("show_notifications", "ON")
    ]

    for k, v in default_settings:
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    cursor.execute("SELECT COUNT(*) FROM sessions")
    session_count = cursor.fetchone()[0]

    if session_count == 0:
        demo_sessions, demo_apps = generate_synthetic_sessions(count=70)
        save_synthetic_csv(demo_sessions)

        for s in demo_sessions:
            cursor.execute("""
            INSERT INTO sessions (
                session_id, start_time, end_time, duration, active_time, idle_time,
                mouse_clicks, keyboard_events, scroll_events, mouse_distance,
                app_switches, application_count, focus_index, continuity_index,
                interaction_stability, fragmentation_index, activity_density,
                behavior_class, is_demo, anomaly_score, is_anomaly, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["session_id"], s["start_time"], s["end_time"], s["duration"],
                s["active_time"], s["idle_time"], s["mouse_clicks"], s["keyboard_events"],
                s["scroll_events"], s["mouse_distance"], s["app_switches"],
                s["application_count"], s["focus_index"], s["continuity_index"],
                s["interaction_stability"], s["fragmentation_index"], s["activity_density"],
                s["behavior_class"], s["is_demo"], s["anomaly_score"], s["is_anomaly"],
                s["created_at"]
            ))

        for a in demo_apps:
            cursor.execute("""
            INSERT INTO applications (session_id, app_name, duration_seconds, percentage, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (
                a["session_id"], a["app_name"], a["duration_seconds"],
                a["percentage"], a["created_at"]
            ))

    conn.commit()
    conn.close()

def insert_session(s, apps=None):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO sessions (
        session_id, start_time, end_time, duration, active_time, idle_time,
        mouse_clicks, keyboard_events, scroll_events, mouse_distance,
        app_switches, application_count, focus_index, continuity_index,
        interaction_stability, fragmentation_index, activity_density,
        behavior_class, is_demo, anomaly_score, is_anomaly, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        s["session_id"], s["start_time"], s["end_time"], s["duration"],
        s["active_time"], s["idle_time"], s["mouse_clicks"], s["keyboard_events"],
        s["scroll_events"], s["mouse_distance"], s["app_switches"],
        s["application_count"], s["focus_index"], s["continuity_index"],
        s["interaction_stability"], s["fragmentation_index"], s["activity_density"],
        s["behavior_class"], s.get("is_demo", 0), s.get("anomaly_score", 0.0),
        s.get("is_anomaly", 0), s.get("created_at", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    ))

    if apps:
        for a in apps:
            cursor.execute("""
            INSERT INTO applications (session_id, app_name, duration_seconds, percentage, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (
                s["session_id"], a.get("app_name", "Active Window"),
                a.get("duration_seconds", 0.0), a.get("percentage", 100.0),
                s.get("created_at", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            ))

    conn.commit()
    conn.close()
    return True

def get_all_sessions(search=None, behavior=None, is_demo=None, sort_col="created_at", sort_dir="DESC", limit=50, offset=0):
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM sessions WHERE 1=1"
    params = []

    if search:
        query += " AND (session_id LIKE ? OR behavior_class LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if behavior and behavior != "ALL":
        query += " AND behavior_class = ?"
        params.append(behavior)

    if is_demo is not None and is_demo != "ALL":
        query += " AND is_demo = ?"
        params.append(int(is_demo))

    allowed_cols = [
        "id", "session_id", "start_time", "end_time", "duration",
        "active_time", "idle_time", "mouse_clicks", "keyboard_events",
        "scroll_events", "mouse_distance", "app_switches", "application_count",
        "focus_index", "continuity_index", "interaction_stability",
        "fragmentation_index", "activity_density", "behavior_class",
        "created_at", "anomaly_score"
    ]
    if sort_col not in allowed_cols:
        sort_col = "created_at"

    sort_direction = "DESC" if str(sort_dir).upper() == "DESC" else "ASC"
    query += f" ORDER BY {sort_col} {sort_direction}"

    if limit is not None:
        query += " LIMIT ? OFFSET ?"
        params.extend([int(limit), int(offset)])

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    count_query = "SELECT COUNT(*) FROM sessions WHERE 1=1"
    count_params = []
    if search:
        count_query += " AND (session_id LIKE ? OR behavior_class LIKE ?)"
        count_params.extend([f"%{search}%", f"%{search}%"])
    if behavior and behavior != "ALL":
        count_query += " AND behavior_class = ?"
        count_params.append(behavior)
    if is_demo is not None and is_demo != "ALL":
        count_query += " AND is_demo = ?"
        count_params.append(int(is_demo))

    cursor.execute(count_query, count_params)
    total_count = cursor.fetchone()[0]

    conn.close()
    return rows, total_count

def get_session_by_id(session_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    session = dict(row)
    cursor.execute("SELECT * FROM applications WHERE session_id = ?", (session_id,))
    session["applications"] = [dict(a) for a in cursor.fetchall()]
    conn.close()
    return session

def get_dashboard_summary():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1")
    latest_row = cursor.fetchone()
    latest_session = dict(latest_row) if latest_row else None

    cursor.execute("SELECT COUNT(*) FROM sessions")
    total_sessions = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sessions WHERE is_demo = 1")
    demo_count = cursor.fetchone()[0]

    cursor.execute("""
    SELECT 
        AVG(focus_index) as avg_focus,
        AVG(continuity_index) as avg_continuity,
        AVG(interaction_stability) as avg_stability,
        AVG(fragmentation_index) as avg_fragmentation,
        AVG(duration) as avg_duration,
        SUM(active_time) as total_active_time,
        SUM(idle_time) as total_idle_time
    FROM sessions
    """)
    aggregates = dict(cursor.fetchone() or {})

    cursor.execute("SELECT * FROM sessions ORDER BY created_at ASC LIMIT 20")
    timeline_rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT app_name, SUM(duration_seconds) as total_duration
    FROM applications
    GROUP BY app_name
    ORDER BY total_duration DESC
    LIMIT 6
    """)
    app_usage = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT behavior_class, COUNT(*) as count
    FROM sessions
    GROUP BY behavior_class
    """)
    behavior_counts = {r["behavior_class"]: r["count"] for r in cursor.fetchall()}

    conn.close()
    return {
        "latest_session": latest_session,
        "total_sessions": total_sessions,
        "demo_count": demo_count,
        "has_demo_data": demo_count > 0,
        "aggregates": {
            "avg_focus": round(aggregates.get("avg_focus") or 0.0, 1),
            "avg_continuity": round(aggregates.get("avg_continuity") or 0.0, 1),
            "avg_stability": round(aggregates.get("avg_stability") or 0.0, 1),
            "avg_fragmentation": round(aggregates.get("avg_fragmentation") or 0.0, 1),
            "avg_duration": round(aggregates.get("avg_duration") or 0.0, 1),
            "total_active_time": round(aggregates.get("total_active_time") or 0.0, 1),
            "total_idle_time": round(aggregates.get("total_idle_time") or 0.0, 1)
        },
        "timeline": timeline_rows,
        "app_usage": app_usage,
        "behavior_distribution": behavior_counts
    }

def get_analytics_summary():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        COUNT(*) as total_sessions,
        SUM(active_time) as total_active_seconds,
        AVG(duration) as avg_duration,
        AVG(focus_index) as avg_focus,
        AVG(idle_time / (duration + 0.001) * 100.0) as avg_idle_ratio,
        AVG(app_switches) as avg_switches,
        AVG(continuity_index) as avg_continuity,
        AVG(interaction_stability) as avg_stability,
        AVG(fragmentation_index) as avg_fragmentation
    FROM sessions
    """)
    metrics_row = cursor.fetchone()
    metrics = dict(metrics_row) if metrics_row else {}

    cursor.execute("SELECT * FROM sessions ORDER BY created_at ASC")
    all_sessions = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT app_name, SUM(duration_seconds) as total_seconds
    FROM applications
    GROUP BY app_name
    ORDER BY total_seconds DESC
    LIMIT 10
    """)
    app_ranks = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT behavior_class, COUNT(*) as count
    FROM sessions
    GROUP BY behavior_class
    """)
    classes = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "metrics": {
            "total_sessions": metrics.get("total_sessions", 0),
            "total_active_hours": round((metrics.get("total_active_seconds") or 0.0) / 3600.0, 2),
            "avg_duration_minutes": round((metrics.get("avg_duration") or 0.0) / 60.0, 1),
            "avg_focus_index": round(metrics.get("avg_focus") or 0.0, 1),
            "avg_idle_ratio": round(metrics.get("avg_idle_ratio") or 0.0, 1),
            "avg_app_switches": round(metrics.get("avg_switches") or 0.0, 1),
            "avg_continuity": round(metrics.get("avg_continuity") or 0.0, 1),
            "avg_stability": round(metrics.get("avg_stability") or 0.0, 1),
            "avg_fragmentation": round(metrics.get("avg_fragmentation") or 0.0, 1)
        },
        "sessions": all_sessions,
        "app_ranks": app_ranks,
        "behavior_classes": classes
    }

def get_sessions_df():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM sessions ORDER BY created_at ASC", conn)
    conn.close()
    return df

def clear_demo_data():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id FROM sessions WHERE is_demo = 1")
    demo_ids = [r[0] for r in cursor.fetchall()]
    if demo_ids:
        placeholders = ",".join("?" for _ in demo_ids)
        cursor.execute(f"DELETE FROM applications WHERE session_id IN ({placeholders})", demo_ids)
        cursor.execute("DELETE FROM sessions WHERE is_demo = 1")
    conn.commit()
    conn.close()
    return len(demo_ids)

def delete_all_data():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM applications")
    cursor.execute("DELETE FROM sessions")
    cursor.execute("DELETE FROM model_results")
    conn.commit()
    conn.close()
    return True

def get_settings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {r["key"]: r["value"] for r in cursor.fetchall()}
    conn.close()
    return settings

def update_setting(key, value):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()
    return True

def save_model_result(model_type, samples, metrics, status="MODEL READY"):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO model_results (model_type, training_samples, metrics_json, status, updated_at)
    VALUES (?, ?, ?, ?, ?)
    """, (model_type, samples, json.dumps(metrics), status, now_str))
    conn.commit()
    conn.close()
    return True

def get_latest_model_results():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT m1.* FROM model_results m1
    INNER JOIN (
        SELECT model_type, MAX(id) as max_id
        FROM model_results
        GROUP BY model_type
    ) m2 ON m1.id = m2.max_id
    """)
    results = {r["model_type"]: dict(r) for r in cursor.fetchall()}
    conn.close()
    return results
