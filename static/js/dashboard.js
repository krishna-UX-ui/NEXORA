let timelineChartInstance = null;
let appUsageChartInstance = null;
let dailyChartInstance = null;
let behaviorChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

function loadDashboardData() {
  fetch('/api/dashboard')
    .then(res => res.json())
    .then(json => {
      if (!json.success) {
        showToast(json.error || 'Failed to load dashboard data', 'rose');
        return;
      }
      renderDashboard(json.data);
    })
    .catch(() => {
      showToast('Dashboard connection failed', 'rose');
    });
}

function renderDashboard(data) {
  const demoBanner = document.getElementById('demoAlertBanner');
  if (demoBanner) {
    demoBanner.style.display = data.has_demo_data ? 'flex' : 'none';
  }

  const s = data.latest_session;
  if (s) {
    const durMin = Math.round((s.duration || 0) / 60);
    const actMin = Math.round((s.active_time || 0) / 60);
    const idlMin = Math.round((s.idle_time || 0) / 60);

    document.getElementById('dashDuration').innerText = `${durMin}m`;
    document.getElementById('dashActiveTime').innerText = `${actMin}m`;
    document.getElementById('dashIdleTime').innerText = `${idlMin}m`;
    document.getElementById('dashMouseClicks').innerText = (s.mouse_clicks || 0).toLocaleString();
    document.getElementById('dashMouseDistance').innerText = `${Math.round(s.mouse_distance || 0).toLocaleString()} px`;
    document.getElementById('dashKeyboardEvents').innerText = (s.keyboard_events || 0).toLocaleString();
    document.getElementById('dashAppSwitches').innerText = s.app_switches || 0;

    const bText = document.getElementById('currentBehaviorText');
    const bBadge = document.getElementById('currentBehaviorBadge');
    if (bText && bBadge) {
      bText.innerText = s.behavior_class || 'NORMAL WORK';
      bBadge.className = 'behavior-indicator-badge';
      const c = (s.behavior_class || '').toLowerCase();
      if (c.includes('deep')) bBadge.classList.add('behavior-deep');
      else if (c.includes('frag')) bBadge.classList.add('behavior-fragmented');
      else if (c.includes('explor')) bBadge.classList.add('behavior-exploration');
      else if (c.includes('idle')) bBadge.classList.add('behavior-idle');
      else bBadge.classList.add('behavior-normal');
    }
  }

  const agg = data.aggregates || {};
  document.getElementById('dashFocusIndex').innerText = `${agg.avg_focus || 0}%`;
  document.getElementById('dashContinuityIndex').innerText = `${agg.avg_continuity || 0}%`;
  document.getElementById('dashStabilityIndex').innerText = `${agg.avg_stability || 0}%`;
  document.getElementById('dashFragmentationIndex').innerText = `${agg.avg_fragmentation || 0}%`;

  renderTimelineChart(data.timeline || []);
  renderAppUsageChart(data.app_usage || []);
  renderDailyActivityChart(data.timeline || []);
  renderBehaviorDistChart(data.behavior_distribution || {});
}

function renderTimelineChart(timeline) {
  const ctx = document.getElementById('timelineChart');
  if (!ctx) return;
  if (timelineChartInstance) timelineChartInstance.destroy();

  const labels = timeline.map((_, i) => `S-${i + 1}`);
  const activeSeries = timeline.map(t => Math.round(t.active_time / 60));
  const idleSeries = timeline.map(t => Math.round(t.idle_time / 60));

  timelineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Active (min)',
          data: activeSeries,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Idle (min)',
          data: idleSeries,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      }
    }
  });
}

function renderAppUsageChart(appUsage) {
  const ctx = document.getElementById('appUsageChart');
  if (!ctx) return;
  if (appUsageChartInstance) appUsageChartInstance.destroy();

  const labels = appUsage.map(a => a.app_name);
  const values = appUsage.map(a => Math.round(a.total_duration / 60));

  appUsageChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Minutes Spent',
        data: values,
        backgroundColor: [
          'rgba(56, 189, 248, 0.65)',
          'rgba(129, 140, 248, 0.65)',
          'rgba(16, 185, 129, 0.65)',
          'rgba(245, 158, 11, 0.65)',
          'rgba(244, 63, 94, 0.65)',
          'rgba(148, 163, 184, 0.65)'
        ],
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderDailyActivityChart(timeline) {
  const ctx = document.getElementById('dailyActivityChart');
  if (!ctx) return;
  if (dailyChartInstance) dailyChartInstance.destroy();

  const labels = timeline.slice(-14).map((_, i) => `Day ${i + 1}`);
  const focusSeries = timeline.slice(-14).map(t => t.focus_index);
  const stabilitySeries = timeline.slice(-14).map(t => t.interaction_stability);

  dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Focus Index %',
          data: focusSeries,
          borderColor: '#38bdf8',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3
        },
        {
          label: 'Stability %',
          data: stabilitySeries,
          borderColor: '#818cf8',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      }
    }
  });
}

function renderBehaviorDistChart(dist) {
  const ctx = document.getElementById('behaviorDistChart');
  if (!ctx) return;
  if (behaviorChartInstance) behaviorChartInstance.destroy();

  const keys = Object.keys(dist);
  const vals = Object.values(dist);

  behaviorChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: keys,
      datasets: [{
        data: vals,
        backgroundColor: [
          '#10b981',
          '#38bdf8',
          '#f59e0b',
          '#818cf8',
          '#64748b'
        ],
        borderWidth: 2,
        borderColor: '#0b101b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

function clearDemoDataFromDashboard() {
  if (!confirm('Purge all synthetic demo data? This action will retain only genuine user sessions.')) return;
  fetch('/api/data/clear-demo', { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast(res.message, 'cyan');
        loadDashboardData();
      } else {
        showToast(res.error, 'rose');
      }
    })
    .catch(() => showToast('Error communicating with server', 'rose'));
}
