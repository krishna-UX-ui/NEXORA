import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

MODEL_FEATURES = [
    "focus_index",
    "continuity_index",
    "interaction_stability",
    "fragmentation_index",
    "activity_density",
    "app_switches",
    "mouse_distance",
    "mouse_clicks",
    "keyboard_events",
    "scroll_events"
]

class BehaviorIntelligenceEngine:
    def __init__(self):
        self.classifier = None
        self.cluster_model = None
        self.feature_names = MODEL_FEATURES
        self.metrics = {}
        self.cluster_centers = []
        self.is_trained = False
        self.sample_count = 0
        self.cluster_map = {}

    def train(self, df):
        if df is None or len(df) < 10:
            self.is_trained = False
            return {
                "success": False,
                "error": "Insufficient data for reliable model evaluation."
            }

        valid_df = df.dropna(subset=self.feature_names + ["behavior_class"]).copy()
        if len(valid_df) < 10:
            self.is_trained = False
            return {
                "success": False,
                "error": "Insufficient data for reliable model evaluation."
            }

        X = valid_df[self.feature_names].values
        y = valid_df["behavior_class"].values

        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            return {
                "success": False,
                "error": "Dataset must contain at least 2 behavioral classes to train classifier."
            }

        test_size = 0.25 if len(valid_df) >= 20 else 0.15
        stratify_opt = y if min(np.bincount(pd.factorize(y)[0])) > 1 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=stratify_opt
        )

        rf = RandomForestClassifier(
            n_estimators=60,
            max_depth=8,
            random_state=42,
            min_samples_split=3
        )
        rf.fit(X_train, y_train)

        y_pred = rf.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

        n_clusters = min(5, len(unique_classes))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(X)

        feature_importances = {
            self.feature_names[i]: round(float(rf.feature_importances_[i]), 4)
            for i in range(len(self.feature_names))
        }

        self.classifier = rf
        self.cluster_model = kmeans
        self.sample_count = len(valid_df)
        self.is_trained = True
        self.metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "total_samples": len(valid_df),
            "feature_importances": feature_importances,
            "classes": list(rf.classes_)
        }

        return {
            "success": True,
            "metrics": self.metrics
        }

    def predict(self, feature_dict):
        if not self.is_trained or self.classifier is None:
            return self.fallback_heuristic_classification(feature_dict)

        vector = [float(feature_dict.get(col, 0.0)) for col in self.feature_names]
        X_vec = np.array([vector])

        predicted_class = self.classifier.predict(X_vec)[0]
        probabilities = self.classifier.predict_proba(X_vec)[0]
        class_idx = list(self.classifier.classes_).index(predicted_class)
        confidence = round(float(probabilities[class_idx]) * 100.0, 1)

        importances = self.classifier.feature_importances_
        sorted_indices = np.argsort(importances)[::-1]
        top_signals = []
        for idx in sorted_indices[:3]:
            fname = self.feature_names[idx]
            val = vector[idx]
            top_signals.append(f"{fname.replace('_', ' ').title()}: {val}")

        return {
            "behavior_class": predicted_class,
            "confidence": confidence,
            "top_signals": top_signals
        }

    def fallback_heuristic_classification(self, d):
        focus = float(d.get("focus_index", 50.0))
        continuity = float(d.get("continuity_index", 50.0))
        frag = float(d.get("fragmentation_index", 20.0))
        switches = int(d.get("app_switches", 5))
        scrolls = int(d.get("scroll_events", 50))
        clicks = int(d.get("mouse_clicks", 50))
        keys = int(d.get("keyboard_events", 50))

        signals = []
        if focus < 35.0:
            cls = "IDLE"
            conf = 88.0
            signals = ["Elevated idle ratio", "Subdued event counts", "Low continuity"]
        elif frag > 45.0 or switches > 20:
            cls = "FRAGMENTED WORK"
            conf = 82.5
            signals = ["Frequent app transitions", "High fragmentation index", "Shorter active spans"]
        elif scrolls > (clicks + keys) or (clicks > 250 and keys < 150):
            cls = "EXPLORATION"
            conf = 79.0
            signals = ["Elevated scroll interactions", "Broad mouse traversal", "Dispersed event focus"]
        elif focus >= 75.0 and continuity >= 70.0 and switches <= 10:
            cls = "DEEP WORK"
            conf = 86.0
            signals = ["High activity continuity", "Low application switching", "Sustained interaction"]
        else:
            cls = "NORMAL WORK"
            conf = 78.0
            signals = ["Balanced keystrokes and clicks", "Moderate task switching", "Stable focus index"]

        return {
            "behavior_class": cls,
            "confidence": conf,
            "top_signals": signals
        }

    def reset(self):
        self.classifier = None
        self.cluster_model = None
        self.metrics = {}
        self.is_trained = False
        self.sample_count = 0

    def get_status(self):
        return {
            "is_trained": self.is_trained,
            "model_type": "Random Forest & K-Means",
            "features_used": self.feature_names,
            "total_samples": self.sample_count,
            "metrics": self.metrics
        }
