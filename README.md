# NEXORA — Digital Behavior Intelligence Engine

NEXORA is an academic BCA and Data Science project engineered as a privacy-preserving digital behavior intelligence engine. It quantifies and analyzes human-computer interaction patterns without recording personal messages, keystroke characters, passwords, browser page contents, screenshots, or clipboard data.

---

## Project Overview

Modern digital workstations require tools to measure focus, cognitive workflow continuity, and ergonomic interaction stability. Traditional surveillance or monitoring tools record sensitive personal details, raising ethical and privacy concerns. NEXORA resolves this dilemma by modeling human-computer interaction purely as anonymous telemetry—event frequencies, movement velocities, session durations, and application transitions.

---

## Problem Statement

Existing activity tracking systems pose privacy risks by capturing:
- Plaintext keystrokes and sensitive credentials
- Screen recordings and visual screenshots
- Clipboard copy-paste contents
- Confidential documents and communication logs

There is a critical academic and industry need for an analytics framework capable of deriving meaningful behavioral intelligence (focus depth, task switching, interaction stability, and anomalous rhythms) while operating under strict zero-content privacy boundaries.

---

## Objectives

1. Develop a zero-content telemetry capture model restricted to aggregate numerical metrics.
2. Formulate deterministic mathematical indices for Focus, Continuity, Stability, and Fragmentation.
3. Apply supervised machine learning (Random Forest) to categorize interaction sessions into five behavioral archetypes.
4. Implement unsupervised machine learning (Isolation Forest and K-Means) to establish baseline envelopes and isolate anomalous sessions.
5. Provide a local-first web interface equipped with real-time streaming charts, data filtering, and dataset export.

---

## Technology Stack

- **Frontend:** HTML5, CSS3 (Custom dark-theme research UI), Vanilla JavaScript (ES6+), Chart.js
- **Backend:** Python 3.12+, Flask
- **Data Science:** Pandas, NumPy, Scikit-learn
- **System Telemetry:** psutil
- **Datastore:** SQLite3 (`nexora.db`)

---

## Key Features

- **Login & Landing Portal:** Dedicated workstation entry view featuring the official NEXORA logo, research quote, telemetry status, and operator role configuration.
- **Dashboard:** Operational overview featuring the official NEXORA brand card, current behavior badge, active/idle ratios, activity timeline, and application usage hierarchy.
- **Live Monitor:** Real-time session chronometer, live stream pulse charts, dynamic cognitive indices, and workstation simulation mode.
- **Session Archive:** Searchable, filterable, and sortable historical session records with deep inspection modals.
- **Statistical Analytics Laboratory:** 8 analytical charts (Activity Over Time, Focus Index, Idle Ratio, Duration Histogram, Application Usage, Behavior Distribution, Stability Trajectory, Fragmentation Trend).
- **Behavior Intelligence:** Supervised Random Forest classification with confidence scores, feature contributions, and an interactive inference sandbox.
- **Anomaly Detection:** Unsupervised Isolation Forest baseline profiling with divergence score trajectories and deviation analysis.
- **Data Explorer:** Complete tabular view of all numerical features with pagination, density toggles, and CSV export.
- **Model Center:** Real machine learning lifecycle operations (Train, Retrain, Reset) displaying genuine Accuracy, Precision, Recall, and F1 scores.
- **Privacy Center:** Architectural comparison between collected and non-collected data, plus local data purge controls.
- **Settings:** Configurable tracking status, idle thresholds, data retention policies, and demonstration flags.

---

## Brand Identity & Logo Specifications

The official NEXORA logo represents the intersection of cognitive flow and privacy:
- **Symbol:** 3D gradient blue/cyan stylized 'N' surrounded by an orbital trajectory and tracking node.
- **Wordmark:** Geometric typography `NEXORA` with custom triplet-bar 'E' and chevron 'A'.
- **Tagline:** `Digital Behavior Intelligence Engine`.
- **Assets Location:**
  - Full Logo: `static/assets/nexora-logo.png`
  - Symbol: `static/assets/nexora-symbol.png`
  - Favicon: `static/assets/favicon.ico`

---

## Architecture & Data Pipeline

```
[ User Interaction ] 
       │ (Clicks, Wheel, Cursor Distance, Key Events, Window Blur)
       ▼
[ Client / Collector Engine ] 
       │ (Aggregate Counts & Intervals Only — Zero Characters Stored)
       ▼
[ Flask REST API ]
       │
  ┌────┴───────────────────────────┐
  ▼                                ▼
[ SQLite Database: nexora.db ]   [ Feature Engineering Engine ]
                                  ├── Focus Index = (Active / Duration) * 100
                                  ├── Continuity Index = 100 - (Idle + Switch Penalties)
                                  ├── Interaction Stability = Input Modality Balance
                                  └── Fragmentation Index = Task Switching Rate
                                   │
                                   ▼
                         [ Machine Learning Suite ]
                          ├── Random Forest Classifier (Supervised)
                          ├── K-Means Clustering (Unsupervised)
                          └── Isolation Forest (Anomaly Baseline)
```

---

## Behavioral Classes

1. **DEEP WORK:** High active ratio (>80%), high continuity, minimal application switches, balanced mouse/keyboard activity.
2. **NORMAL WORK:** Steady active ratio (65%–80%), moderate task switching, balanced input cadence.
3. **FRAGMENTED WORK:** Low active ratio, elevated application switches (>20), high fragmentation index.
4. **EXPLORATION:** Predominance of cursor traversal and wheel scrolls with moderate switching.
5. **IDLE:** Predominance of dormancy with minimal interaction pulses.

---

## Privacy Design & Guarantee

NEXORA guarantees that the following are **NEVER STORED**:
- Actual keys pressed, keystroke sequences, or typed words
- Passwords or authentication credentials
- Email or chat message contents
- Screenshots, screen buffers, or video feeds
- Clipboard payloads
- Web browsing history or page DOM structures
- File system contents or personal files

---

## Database Structure

Database file: `nexora.db`

### Tables:
- `sessions`: Session ID, timestamps, durations, counts, calculated indices, behavioral label, anomaly scores, demo flag.
- `applications`: Breakdown of time spent per foreground application.
- `model_results`: Historical training records, cross-validation metrics, and status timestamps.
- `settings`: Key-value configuration parameters.

---

## Installation & Windows Setup

### 1. Prerequisites
- Windows 10 or 11
- Python 3.10+ (tested on Python 3.12)

### 2. Clone or Navigate to Directory
```powershell
cd c:\Users\Ghanakrishna\Desktop\NEXORA
```

### 3. Create Virtual Environment
```powershell
python -m venv venv
```

### 4. Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

### 5. Install Dependencies
```powershell
pip install -r requirements.txt
```

---

## How to Run

```powershell
python app.py
```

Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## API Documentation

- `GET /api/dashboard` — Operational metrics, recent session status, timeline, and application usage.
- `GET /api/sessions` — Paginated, filterable, and sortable historical session list.
- `GET /api/sessions/<session_id>` — Detailed breakdown for a specific session including application distribution.
- `POST /api/session/start` — Initializes a new live tracking session.
- `POST /api/session/update` — Ingests aggregate telemetry pulses.
- `POST /api/session/pause` — Pauses session chronometer and pulse updates.
- `POST /api/session/resume` — Resumes an active session.
- `POST /api/session/end` — Concludes session, computes features, executes classification and anomaly models, and stores to SQLite.
- `GET /api/session/live` — Fetches status of any running session.
- `GET /api/analytics` — Statistical dataset distributions and inputs for 8 Chart.js visualizations.
- `GET /api/behavior` — Latest behavioral classification, feature importances, and class distributions.
- `GET /api/anomalies` — Isolation Forest baseline metrics and flagged anomalous sessions.
- `GET /api/data` — Complete dataset query.
- `DELETE /api/data` — Clears all session and application records from the database.
- `POST /api/data/clear-demo` — Clears synthetic demonstration sessions.
- `POST /api/model/train` — Trains Random Forest and Isolation Forest models on the current dataset.
- `GET /api/model/status` — Returns model readiness, sample sizes, and empirical validation metrics.
- `POST /api/model/reset` — Resets models to uncalibrated state.
- `GET /api/export/csv` — Downloads all session records as a structured CSV file.
- `GET /api/settings` — Retrieves engine preferences.
- `POST /api/settings` — Updates engine preferences.

---

## Project Structure

```
NEXORA/
│
├── app.py
├── requirements.txt
├── README.md
├── nexora.db
│
├── data/
│   ├── synthetic_sessions.csv
│   └── processed_sessions.csv
│
├── ml/
│   ├── preprocessing.py
│   ├── feature_engineering.py
│   ├── behavior_model.py
│   └── anomaly_model.py
│
├── database/
│   └── database.py
│
├── collector/
│   └── monitor.py
│
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── monitor.html
│   ├── sessions.html
│   ├── analytics.html
│   ├── behavior.html
│   ├── anomalies.html
│   ├── explorer.html
│   ├── model.html
│   ├── privacy.html
│   └── settings.html
│
└── static/
    ├── assets/
    │   ├── nexora-logo.png
    │   ├── nexora-symbol.png
    │   └── favicon.ico
    │
    ├── css/
    │   └── style.css
    │
    └── js/
        ├── dashboard.js
        ├── monitor.js
        ├── sessions.js
        ├── analytics.js
        ├── behavior.js
        ├── anomalies.js
        ├── explorer.js
        ├── model.js
        ├── privacy.js
        └── settings.js
```

---

## Limitations

- Telemetry is captured through active monitor sessions and aggregate OS process queries.
- Behavioral classes are statistical groupings of physical input rates and window changes, not cognitive evaluations.
- Anomalies represent statistical divergence from historical input rates and do not identify security intrusions or emotional distress.

---

## Academic Notice & Ethics

NEXORA does not assess or diagnose mental health, emotional state, intelligence, psychological conditions, or medical disorders. The system is designed exclusively for educational and computational research in human-computer interaction and privacy-preserving data science.
