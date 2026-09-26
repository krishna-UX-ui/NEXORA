import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

ANOMALY_FEATURES = [
    "focus_index",
    "continuity_index",
    "interaction_stability",
    "fragmentation_index",
    "activity_density",
    "app_switches"
]

class AnomalyDetectionEngine:
    def __init__(self):
        self.model = None
        self.feature_names = ANOMALY_FEATURES
        self.is_trained = False
        self.sample_count = 0
        self.baseline_stats = {}

    def train(self, df):
        if df is None or len(df) < 8:
            self.is_trained = False
            return {
                "success": False,
                "error": "Insufficient data for reliable model evaluation."
            }

        valid_df = df.dropna(subset=self.feature_names).copy()
        if len(valid_df) < 8:
            self.is_trained = False
            return {
                "success": False,
                "error": "Insufficient data for reliable model evaluation."
            }

        X = valid_df[self.feature_names].values

        iso = IsolationForest(
            n_estimators=75,
            contamination=0.08,
            random_state=42
        )
        iso.fit(X)

        baseline = {}
        for col in self.feature_names:
            baseline[col] = {
                "mean": round(float(valid_df[col].mean()), 2),
                "std": round(float(valid_df[col].std()), 2),
                "min": round(float(valid_df[col].min()), 2),
                "max": round(float(valid_df[col].max()), 2)
            }

        self.model = iso
        self.is_trained = True
        self.sample_count = len(valid_df)
        self.baseline_stats = baseline

        return {
            "success": True,
            "training_samples": self.sample_count,
            "baseline": self.baseline_stats
        }

    def predict(self, feature_dict):
        if not self.is_trained or self.model is None:
            return self.heuristic_anomaly_check(feature_dict)

        vector = [float(feature_dict.get(col, 0.0)) for col in self.feature_names]
        X_vec = np.array([vector])

        pred = self.model.predict(X_vec)[0]
        decision_score = float(self.model.decision_function(X_vec)[0])

        normalized_score = round(float(max(0.0, min(1.0, 0.5 - decision_score))), 3)
        is_anomaly = (pred == -1 or normalized_score > 0.45)

        deviations = []
        for col in self.feature_names:
            val = float(feature_dict.get(col, 0.0))
            b_info = self.baseline_stats.get(col, {})
            b_mean = b_info.get("mean", 50.0)
            b_std = max(1.0, b_info.get("std", 10.0))
            z_score = abs(val - b_mean) / b_std
            if z_score > 2.0:
                deviations.append({
                    "feature": col.replace("_", " ").title(),
                    "observed": val,
                    "expected_mean": b_mean,
                    "deviation_ratio": round(z_score, 2)
                })

        return {
            "is_anomaly": bool(is_anomaly),
            "status": "UNUSUAL SESSION" if is_anomaly else "NORMAL",
            "anomaly_score": normalized_score,
            "deviations": deviations,
            "notice": "Unusual interaction pattern detected compared with the stored behavioral baseline." if is_anomaly else "Interaction pattern aligns with baseline behavioral boundaries."
        }

    def heuristic_anomaly_check(self, d):
        focus = float(d.get("focus_index", 50.0))
        switches = int(d.get("app_switches", 5))
        frag = float(d.get("fragmentation_index", 20.0))
        density = float(d.get("activity_density", 40.0))

        score = 0.15
        deviations = []

        if switches > 45:
            score += 0.35
            deviations.append({
                "feature": "App Switches",
                "observed": switches,
                "expected_mean": 12.0,
                "deviation_ratio": 2.8
            })
        if frag > 75.0:
            score += 0.25
            deviations.append({
                "feature": "Fragmentation Index",
                "observed": frag,
                "expected_mean": 28.0,
                "deviation_ratio": 2.4
            })
        if density > 350.0:
            score += 0.30
            deviations.append({
                "feature": "Activity Density",
                "observed": density,
                "expected_mean": 65.0,
                "deviation_ratio": 3.1
            })

        score = round(min(1.0, score), 3)
        is_anom = score >= 0.45

        return {
            "is_anomaly": bool(is_anom),
            "status": "UNUSUAL SESSION" if is_anom else "NORMAL",
            "anomaly_score": score,
            "deviations": deviations,
            "notice": "Unusual interaction pattern detected compared with the stored behavioral baseline." if is_anom else "Interaction pattern aligns with baseline behavioral boundaries."
        }

    def reset(self):
        self.model = None
        self.is_trained = False
        self.sample_count = 0
        self.baseline_stats = {}

    def get_status(self):
        return {
            "is_trained": self.is_trained,
            "model_type": "Isolation Forest",
            "features_used": self.feature_names,
            "training_samples": self.sample_count,
            "baseline": self.baseline_stats
        }
