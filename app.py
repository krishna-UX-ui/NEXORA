import io
import csv
from flask import Flask, render_template, request, jsonify, Response
from database.database import (
    init_db,
    get_dashboard_summary,
    get_all_sessions,
    get_session_by_id,
    get_analytics_summary,
    get_sessions_df,
    clear_demo_data,
    delete_all_data,
    get_settings,
    update_setting,
    save_model_result,
    get_latest_model_results
)
from collector.monitor import LiveMonitorSession
from ml.behavior_model import BehaviorIntelligenceEngine
from ml.anomaly_model import AnomalyDetectionEngine

app = Flask(__name__)

init_db()

behavior_engine = BehaviorIntelligenceEngine()
anomaly_engine = AnomalyDetectionEngine()

initial_df = get_sessions_df()
if not initial_df.empty:
    behavior_engine.train(initial_df)
    anomaly_engine.train(initial_df)

active_monitor = None

@app.route("/")
@app.route("/dashboard")
def page_dashboard():
    return render_template("dashboard.html", active_page="dashboard")

@app.route("/login")
@app.route("/landing")
def page_login():
    return render_template("login.html", active_page="login")

@app.route("/monitor")
def page_monitor():
    return render_template("monitor.html", active_page="monitor")

@app.route("/sessions")
def page_sessions():
    return render_template("sessions.html", active_page="sessions")

@app.route("/analytics")
def page_analytics():
    return render_template("analytics.html", active_page="analytics")

@app.route("/behavior")
def page_behavior():
    return render_template("behavior.html", active_page="behavior")

@app.route("/anomalies")
def page_anomalies():
    return render_template("anomalies.html", active_page="anomalies")

@app.route("/explorer")
def page_explorer():
    return render_template("explorer.html", active_page="explorer")

@app.route("/model")
def page_model():
    return render_template("model.html", active_page="model")

@app.route("/privacy")
def page_privacy():
    return render_template("privacy.html", active_page="privacy")

@app.route("/settings")
def page_settings():
    return render_template("settings.html", active_page="settings")

@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    try:
        summary = get_dashboard_summary()
        return jsonify({
            "success": True,
            "data": summary
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/sessions", methods=["GET"])
def api_sessions():
    try:
        search = request.args.get("search", "").strip()
        behavior = request.args.get("behavior", "ALL").strip()
        is_demo = request.args.get("is_demo", "ALL").strip()
        sort_col = request.args.get("sort_by", "created_at").strip()
        sort_dir = request.args.get("sort_order", "DESC").strip()
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))

        rows, total = get_all_sessions(
            search=search,
            behavior=behavior,
            is_demo=is_demo,
            sort_col=sort_col,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset
        )
        return jsonify({
            "success": True,
            "data": rows,
            "total": total,
            "limit": limit,
            "offset": offset
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/sessions/<session_id>", methods=["GET"])
def api_session_detail(session_id):
    try:
        session = get_session_by_id(session_id)
        if not session:
            return jsonify({
                "success": False,
                "error": f"Session {session_id} not found."
            }), 404
        return jsonify({
            "success": True,
            "data": session
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/session/start", methods=["POST"])
def api_session_start():
    global active_monitor
    try:
        data = request.get_json(silent=True) or {}
        custom_id = data.get("session_id")
        active_monitor = LiveMonitorSession(session_id=custom_id)
        return jsonify({
            "success": True,
            "message": "Monitoring session initialized",
            "data": active_monitor.get_live_state()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/session/update", methods=["POST"])
def api_session_update():
    global active_monitor
    try:
        if not active_monitor:
            return jsonify({
                "success": False,
                "error": "No active session in progress. Please start a session first."
            }), 400
        data = request.get_json(silent=True) or {}
        state = active_monitor.record_pulse(data)
        return jsonify({
            "success": True,
            "data": state
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/session/pause", methods=["POST"])
def api_session_pause():
    global active_monitor
    try:
        if not active_monitor:
            return jsonify({
                "success": False,
                "error": "No active session to pause."
            }), 400
        state = active_monitor.pause()
        return jsonify({
            "success": True,
            "data": state
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/session/resume", methods=["POST"])
def api_session_resume():
    global active_monitor
    try:
        if not active_monitor:
            return jsonify({
                "success": False,
                "error": "No active session to resume."
            }), 400
        state = active_monitor.resume()
        return jsonify({
            "success": True,
            "data": state
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/session/live", methods=["GET"])
def api_session_live():
    global active_monitor
    if not active_monitor:
        return jsonify({
            "success": True,
            "data": None
        })
    return jsonify({
        "success": True,
        "data": active_monitor.get_live_state()
    })

@app.route("/api/session/end", methods=["POST"])
def api_session_end():
    global active_monitor
    try:
        if not active_monitor:
            return jsonify({
                "success": False,
                "error": "No active session to conclude."
            }), 400

        result = active_monitor.end_and_persist(
            behavior_engine=behavior_engine,
            anomaly_engine=anomaly_engine
        )
        active_monitor = None
        return jsonify({
            "success": True,
            "message": "Session finalized and metrics registered",
            "data": result
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/analytics", methods=["GET"])
def api_analytics():
    try:
        analytics_data = get_analytics_summary()
        return jsonify({
            "success": True,
            "data": analytics_data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/behavior", methods=["GET"])
def api_behavior():
    try:
        df = get_sessions_df()
        if df.empty:
            return jsonify({
                "success": False,
                "error": "No session dataset available."
            }), 404

        latest_session = df.iloc[-1].to_dict()
        classification = behavior_engine.predict(latest_session)
        distribution = df["behavior_class"].value_counts().to_dict()

        feature_averages = {
            "focus_index": round(float(df["focus_index"].mean()), 1),
            "continuity_index": round(float(df["continuity_index"].mean()), 1),
            "interaction_stability": round(float(df["interaction_stability"].mean()), 1),
            "fragmentation_index": round(float(df["fragmentation_index"].mean()), 1),
            "activity_density": round(float(df["activity_density"].mean()), 1)
        }

        return jsonify({
            "success": True,
            "data": {
                "latest_classification": classification,
                "latest_session": latest_session,
                "distribution": distribution,
                "feature_averages": feature_averages,
                "model_status": behavior_engine.get_status()
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/anomalies", methods=["GET"])
def api_anomalies():
    try:
        df = get_sessions_df()
        if df.empty:
            return jsonify({
                "success": False,
                "error": "No session dataset available."
            }), 404

        latest_session = df.iloc[-1].to_dict()
        anomaly_check = anomaly_engine.predict(latest_session)

        conn_records = []
        for idx, row in df.iterrows():
            rec = row.to_dict()
            chk = anomaly_engine.predict(rec)
            if chk.get("is_anomaly") or rec.get("is_anomaly") == 1:
                conn_records.append({
                    "session_id": rec["session_id"],
                    "created_at": rec["created_at"],
                    "anomaly_score": chk["anomaly_score"],
                    "behavior_class": rec["behavior_class"],
                    "deviations": chk.get("deviations", [])
                })

        return jsonify({
            "success": True,
            "data": {
                "latest_status": anomaly_check,
                "detected_anomalies": conn_records[-10:],
                "total_anomalies_count": len(conn_records),
                "baseline": anomaly_engine.baseline_stats,
                "model_status": anomaly_engine.get_status()
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/data", methods=["GET", "DELETE"])
def api_data():
    if request.method == "DELETE":
        try:
            delete_all_data()
            behavior_engine.reset()
            anomaly_engine.reset()
            return jsonify({
                "success": True,
                "message": "All local session data has been purged."
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    try:
        rows, total = get_all_sessions(limit=None, offset=0)
        return jsonify({
            "success": True,
            "data": rows,
            "total": total
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/data/clear-demo", methods=["POST"])
def api_clear_demo():
    try:
        removed = clear_demo_data()
        df = get_sessions_df()
        if len(df) >= 10:
            behavior_engine.train(df)
            anomaly_engine.train(df)
        else:
            behavior_engine.reset()
            anomaly_engine.reset()

        return jsonify({
            "success": True,
            "message": f"Purged {removed} synthetic demo sessions.",
            "removed_count": removed
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/model/train", methods=["POST"])
def api_model_train():
    try:
        df = get_sessions_df()
        if df.empty or len(df) < 10:
            return jsonify({
                "success": False,
                "error": "Insufficient data for reliable model evaluation."
            }), 400

        b_result = behavior_engine.train(df)
        a_result = anomaly_engine.train(df)

        if b_result.get("success"):
            save_model_result("RandomForest", b_result["metrics"]["training_samples"], b_result["metrics"], "MODEL READY")
        if a_result.get("success"):
            save_model_result("IsolationForest", a_result.get("training_samples", len(df)), a_result, "MODEL READY")

        return jsonify({
            "success": True,
            "message": "Machine learning engines successfully trained.",
            "behavior_model": b_result,
            "anomaly_model": a_result
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/model/status", methods=["GET"])
def api_model_status():
    try:
        df = get_sessions_df()
        b_status = behavior_engine.get_status()
        a_status = anomaly_engine.get_status()
        saved = get_latest_model_results()
        return jsonify({
            "success": True,
            "dataset_size": len(df),
            "behavior_model": b_status,
            "anomaly_model": a_status,
            "persisted_results": saved
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/model/reset", methods=["POST"])
def api_model_reset():
    try:
        behavior_engine.reset()
        anomaly_engine.reset()
        return jsonify({
            "success": True,
            "message": "Model weights and metrics cleared."
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/settings", methods=["GET", "POST"])
def api_settings():
    if request.method == "POST":
        try:
            data = request.get_json(silent=True) or {}
            for k, v in data.items():
                update_setting(k, v)
            return jsonify({
                "success": True,
                "message": "Settings updated successfully."
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    try:
        settings_map = get_settings()
        return jsonify({
            "success": True,
            "data": settings_map
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/export/csv", methods=["GET"])
def api_export_csv():
    try:
        rows, _ = get_all_sessions(limit=None, offset=0)
        if not rows:
            return Response("session_id,start_time,end_time\n", mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=nexora_sessions.csv"})

        fieldnames = list(rows[0].keys())
        si = io.StringIO()
        writer = csv.DictWriter(si, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

        output = si.getvalue()
        return Response(
            output,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=nexora_sessions.csv"}
        )
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
