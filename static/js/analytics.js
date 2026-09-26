let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
});

function loadAnalytics() {
  fetch('/api/analytics')
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to load analytics', 'rose');
        return;
      }
      renderAnalyticsData(res.data);
    })
    .catch(() => {
      showToast('Network error loading analytics dataset', 'rose');
    });
}

function renderAnalyticsData(data) {
  const m = data.metrics || {};
  document.getElementById('statTotalSessions').innerText = m.total_sessions || 0;
  document.getElementById('statTotalActiveHours').innerText = `${m.total_active_hours || 0} hrs`;
  document.getElementById('statAvgDuration').innerText = `${m.avg_duration_minutes || 0} min`;
  document.getElementById('statAvgFocus').innerText = `${m.avg_focus_index || 0}%`;
  document.getElementById('statAvgIdle').innerText = `${m.avg_idle_ratio || 0}%`;
  document.getElementById('statAvgSwitches').innerText = m.avg_app_switches || 0;

  const sessions = data.sessions || [];
  const appRanks = data.app_ranks || [];
  const classes = data.behavior_classes || [];

  renderChart1(sessions);
  renderChart2(sessions);
  renderChart3(sessions);
  renderChart4(sessions);
  renderChart5(appRanks);
  renderChart6(classes);
  renderChart7(sessions);
  renderChart8(sessions);
}

function destroyChart(name) {
  if (charts[name]) {
    charts[name].destroy();
  }
}

function renderChart1(sessions) {
  destroyChart('c1');
  const ctx = document.getElementById('chartActivityOverTime');
  if (!ctx) return;

  const labels = sessions.map((_, i) => `S-${i + 1}`);
  const values = sessions.map(s => Math.round(s.active_time / 60));

  charts['c1'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Active Minutes',
        data: values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart2(sessions) {
  destroyChart('c2');
  const ctx = document.getElementById('chartFocusOverTime');
  if (!ctx) return;

  const labels = sessions.map((_, i) => `S-${i + 1}`);
  const values = sessions.map(s => s.focus_index);

  charts['c2'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Index %',
        data: values,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart3(sessions) {
  destroyChart('c3');
  const ctx = document.getElementById('chartIdleOverTime');
  if (!ctx) return;

  const labels = sessions.map((_, i) => `S-${i + 1}`);
  const values = sessions.map(s => Math.round(s.idle_time / 60));

  charts['c3'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Idle Minutes',
        data: values,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart4(sessions) {
  destroyChart('c4');
  const ctx = document.getElementById('chartDurationDist');
  if (!ctx) return;

  const bins = { '< 30m': 0, '30–60m': 0, '60–90m': 0, '90–120m': 0, '> 120m': 0 };
  sessions.forEach(s => {
    const min = s.duration / 60;
    if (min < 30) bins['< 30m']++;
    else if (min < 60) bins['30–60m']++;
    else if (min < 90) bins['60–90m']++;
    else if (min < 120) bins['90–120m']++;
    else bins['> 120m']++;
  });

  charts['c4'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(bins),
      datasets: [{
        label: 'Sessions Count',
        data: Object.values(bins),
        backgroundColor: '#818cf8',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart5(appRanks) {
  destroyChart('c5');
  const ctx = document.getElementById('chartAppUsageRanks');
  if (!ctx) return;

  const labels = appRanks.map(a => a.app_name);
  const values = appRanks.map(a => Math.round(a.total_seconds / 60));

  charts['c5'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Minutes',
        data: values,
        backgroundColor: 'rgba(56, 189, 248, 0.7)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart6(classes) {
  destroyChart('c6');
  const ctx = document.getElementById('chartBehaviorDistribution');
  if (!ctx) return;

  const labels = classes.map(c => c.behavior_class);
  const counts = classes.map(c => c.count);

  charts['c6'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: ['#10b981', '#38bdf8', '#f59e0b', '#818cf8', '#64748b'],
        borderWidth: 2,
        borderColor: '#0b101b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });
}

function renderChart7(sessions) {
  destroyChart('c7');
  const ctx = document.getElementById('chartStabilityTrend');
  if (!ctx) return;

  const labels = sessions.map((_, i) => `S-${i + 1}`);
  const values = sessions.map(s => s.interaction_stability);

  charts['c7'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Interaction Stability %',
        data: values,
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderChart8(sessions) {
  destroyChart('c8');
  const ctx = document.getElementById('chartFragmentationTrend');
  if (!ctx) return;

  const labels = sessions.map((_, i) => `S-${i + 1}`);
  const values = sessions.map(s => s.fragmentation_index);

  charts['c8'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Fragmentation Index %',
        data: values,
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
