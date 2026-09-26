let isSessionActive = false;
let isSessionPaused = false;
let timerInterval = null;
let syncInterval = null;
let elapsedSeconds = 0;
let lastMouseX = null;
let lastMouseY = null;
let isSimulating = false;
let simInterval = null;

let pendingClicks = 0;
let pendingKeys = 0;
let pendingScrolls = 0;
let pendingDistance = 0;
let pendingSwitches = 0;

let streamChart = null;
let gaugesChart = null;
let streamDataPoints = [];
const maxStreamPoints = 20;

document.addEventListener('DOMContentLoaded', () => {
  initLiveCharts();
  attachInputListeners();
  checkExistingSession();
});

function checkExistingSession() {
  fetch('/api/session/live')
    .then(r => r.json())
    .then(res => {
      if (res.success && res.data && res.data.status !== 'ENDED') {
        syncUIWithSession(res.data);
      }
    })
    .catch(() => {});
}

function initLiveCharts() {
  const streamCtx = document.getElementById('liveStreamChart');
  if (streamCtx) {
    streamChart = new Chart(streamCtx, {
      type: 'line',
      data: {
        labels: Array(maxStreamPoints).fill(''),
        datasets: [
          {
            label: 'Key Pulses',
            data: Array(maxStreamPoints).fill(0),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Mouse Clicks',
            data: Array(maxStreamPoints).fill(0),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Scroll Events',
            data: Array(maxStreamPoints).fill(0),
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        scales: {
          x: { display: false },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
        },
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        }
      }
    });
  }

  const gaugeCtx = document.getElementById('liveGaugesChart');
  if (gaugeCtx) {
    gaugesChart = new Chart(gaugeCtx, {
      type: 'bar',
      data: {
        labels: ['Focus Index', 'Continuity', 'Stability', 'Fragmentation'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(56, 189, 248, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(129, 140, 248, 0.8)',
            'rgba(244, 63, 94, 0.8)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
          y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function attachInputListeners() {
  window.addEventListener('keydown', (e) => {
    if (!isSessionActive || isSessionPaused) return;
    pendingKeys++;
  });

  window.addEventListener('click', (e) => {
    if (!isSessionActive || isSessionPaused) return;
    pendingClicks++;
  });

  window.addEventListener('wheel', (e) => {
    if (!isSessionActive || isSessionPaused) return;
    pendingScrolls++;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isSessionActive || isSessionPaused) return;
    if (lastMouseX !== null && lastMouseY !== null) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      pendingDistance += Math.sqrt(dx * dx + dy * dy);
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('blur', () => {
    if (!isSessionActive || isSessionPaused) return;
    pendingSwitches++;
  });
}

function startLiveSession() {
  fetch('/api/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Unable to launch session', 'rose');
        return;
      }
      syncUIWithSession(res.data);
      showToast('Live monitoring session active', 'emerald');
    })
    .catch(() => showToast('Server connection failed', 'rose'));
}

function togglePauseSession() {
  if (!isSessionActive) return;
  const endpoint = isSessionPaused ? '/api/session/resume' : '/api/session/pause';

  fetch(endpoint, { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error, 'rose');
        return;
      }
      isSessionPaused = (res.data.status === 'PAUSED');
      document.getElementById('pauseBtnText').innerText = isSessionPaused ? 'RESUME SESSION' : 'PAUSE SESSION';
      document.getElementById('liveStatusText').innerText = isSessionPaused ? 'PAUSED' : 'ACTIVE';
      document.getElementById('liveStatusText').style.color = isSessionPaused ? 'var(--amber)' : 'var(--emerald)';
      showToast(isSessionPaused ? 'Session paused' : 'Session resumed', 'cyan');
    });
}

function endLiveSession() {
  if (!isSessionActive) return;

  fetch('/api/session/end', { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to conclude session', 'rose');
        return;
      }
      stopLocalIntervals();
      isSessionActive = false;
      isSessionPaused = false;
      updateControlButtons();
      displaySessionEndSummary(res.data);
      showToast('Session saved to SQLite and classified', 'emerald');
    })
    .catch(() => showToast('Network error during session conclusion', 'rose'));
}

function syncUIWithSession(data) {
  isSessionActive = true;
  isSessionPaused = (data.status === 'PAUSED');
  elapsedSeconds = Math.round(data.duration || 0);

  document.getElementById('liveSessionId').innerText = `ID: ${data.session_id}`;
  document.getElementById('liveStatusText').innerText = isSessionPaused ? 'PAUSED' : 'ACTIVE';
  document.getElementById('liveStatusText').style.color = isSessionPaused ? 'var(--amber)' : 'var(--emerald)';

  updateControlButtons();
  startLocalIntervals();
  updateMetricsDisplay(data);
}

function updateControlButtons() {
  document.getElementById('btnStartSession').disabled = isSessionActive;
  document.getElementById('btnPauseSession').disabled = !isSessionActive;
  document.getElementById('btnEndSession').disabled = !isSessionActive;
  document.getElementById('pauseBtnText').innerText = isSessionPaused ? 'RESUME SESSION' : 'PAUSE SESSION';
}

function startLocalIntervals() {
  stopLocalIntervals();

  timerInterval = setInterval(() => {
    if (isSessionActive && !isSessionPaused) {
      elapsedSeconds++;
      document.getElementById('liveTimerText').innerText = formatTimer(elapsedSeconds);
    }
  }, 1000);

  syncInterval = setInterval(() => {
    if (isSessionActive && !isSessionPaused) {
      sendHeartbeatPulse();
    }
  }, 1500);
}

function stopLocalIntervals() {
  if (timerInterval) clearInterval(timerInterval);
  if (syncInterval) clearInterval(syncInterval);
  timerInterval = null;
  syncInterval = null;
}

function sendHeartbeatPulse() {
  const payload = {
    mouse_clicks: pendingClicks,
    keyboard_events: pendingKeys,
    scroll_events: pendingScrolls,
    mouse_distance: pendingDistance,
    app_switches: pendingSwitches,
    current_app: document.getElementById('liveCurrentApp').innerText
  };

  const currentClicks = pendingClicks;
  const currentKeys = pendingKeys;
  const currentScrolls = pendingScrolls;

  pendingClicks = 0;
  pendingKeys = 0;
  pendingScrolls = 0;
  pendingDistance = 0;
  pendingSwitches = 0;

  fetch('/api/session/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(res => {
      if (res.success && res.data) {
        updateMetricsDisplay(res.data);
        pushStreamData(currentKeys, currentClicks, currentScrolls);
      }
    })
    .catch(() => {});
}

function updateMetricsDisplay(d) {
  document.getElementById('liveClicks').innerText = (d.mouse_clicks || 0).toLocaleString();
  document.getElementById('liveKeys').innerText = (d.keyboard_events || 0).toLocaleString();
  document.getElementById('liveScrolls').innerText = (d.scroll_events || 0).toLocaleString();
  document.getElementById('liveDistance').innerText = Math.round(d.mouse_distance || 0).toLocaleString();
  document.getElementById('liveSwitches').innerText = d.app_switches || 0;
  document.getElementById('liveIdleSeconds').innerText = `${Math.round(d.idle_time || 0)}s`;
  document.getElementById('liveCurrentApp').innerText = d.current_app || 'Workstation Desktop';

  const focus = d.focus_index || 0;
  document.getElementById('liveActiveRatio').innerText = `${focus}%`;
  document.getElementById('liveActiveTimeSub').innerText = `Active: ${Math.round(d.active_time || 0)}s | Idle: ${Math.round(d.idle_time || 0)}s`;

  if (gaugesChart) {
    gaugesChart.data.datasets[0].data = [
      d.focus_index || 0,
      d.continuity_index || 0,
      d.interaction_stability || 0,
      d.fragmentation_index || 0
    ];
    gaugesChart.update('none');
  }
}

function pushStreamData(k, c, s) {
  if (!streamChart) return;

  streamChart.data.datasets[0].data.shift();
  streamChart.data.datasets[0].data.push(k);

  streamChart.data.datasets[1].data.shift();
  streamChart.data.datasets[1].data.push(c);

  streamChart.data.datasets[2].data.shift();
  streamChart.data.datasets[2].data.push(s);

  streamChart.update('none');
}

function formatTimer(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function toggleSimulation() {
  isSimulating = document.getElementById('simToggle').checked;
  if (isSimulating) {
    if (!isSessionActive) {
      startLiveSession();
    }
    simInterval = setInterval(() => {
      if (isSessionActive && !isSessionPaused) {
        pendingKeys += Math.floor(Math.random() * 8) + 2;
        pendingClicks += Math.floor(Math.random() * 3) + 1;
        pendingScrolls += Math.floor(Math.random() * 2);
        pendingDistance += Math.floor(Math.random() * 120) + 20;
        if (Math.random() < 0.15) {
          pendingSwitches += 1;
          const apps = ['VS Code', 'Chrome Docs', 'Terminal', 'Postman', 'Figma'];
          document.getElementById('liveCurrentApp').innerText = apps[Math.floor(Math.random() * apps.length)];
        }
      }
    }, 500);
    showToast('Simulation pulse active', 'cyan');
  } else {
    if (simInterval) clearInterval(simInterval);
    simInterval = null;
    showToast('Simulation deactivated', 'cyan');
  }
}

function displaySessionEndSummary(data) {
  const s = data.session || {};
  const c = data.classification || {};
  const a = data.anomaly || {};

  const card = document.getElementById('sessionEndSummaryCard');
  const details = document.getElementById('sessionEndSummaryDetails');

  let signalsHtml = '';
  if (c.top_signals && c.top_signals.length > 0) {
    signalsHtml = '<ul style="padding-left:18px;margin-top:6px;color:var(--text-secondary);">' +
      c.top_signals.map(sig => `<li>${sig}</li>`).join('') +
      '</ul>';
  }

  details.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;margin-bottom:18px;">
      <div class="stat-widget">
        <div class="stat-label">Identified Class</div>
        <div class="stat-val" style="font-size:1.15rem;color:var(--cyan-primary);">${c.behavior_class || s.behavior_class}</div>
        <div class="stat-sub">Confidence: ${c.confidence || 80}%</div>
      </div>
      <div class="stat-widget">
        <div class="stat-label">Anomaly Status</div>
        <div class="stat-val" style="font-size:1.15rem;color:${a.is_anomaly ? 'var(--rose)' : 'var(--emerald)'};">${a.status || 'NORMAL'}</div>
        <div class="stat-sub">Score: ${a.anomaly_score || 0.12}</div>
      </div>
      <div class="stat-widget">
        <div class="stat-label">Duration</div>
        <div class="stat-val" style="font-size:1.15rem;">${Math.round(s.duration)}s</div>
        <div class="stat-sub">Active: ${Math.round(s.active_time)}s</div>
      </div>
      <div class="stat-widget">
        <div class="stat-label">Focus Index</div>
        <div class="stat-val" style="font-size:1.15rem;color:var(--emerald);">${s.focus_index}%</div>
        <div class="stat-sub">Continuity: ${s.continuity_index}%</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.02);padding:14px;border-radius:var(--radius-sm);font-size:0.84rem;">
      <div style="font-weight:600;color:#fff;">Contributing Predictive Signals:</div>
      ${signalsHtml}
      <div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted);">
        Notice: Anomaly and behavioral metrics are strictly algorithmic interaction abstractions and do not convey psychological evaluations.
      </div>
    </div>
  `;

  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth' });
}
