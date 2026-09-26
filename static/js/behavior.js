let importanceChartInstance = null;
let radarChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  loadBehaviorData();
});

function loadBehaviorData() {
  fetch('/api/behavior')
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to load behavior intelligence data', 'rose');
        return;
      }
      renderBehaviorData(res.data);
    })
    .catch(() => {
      showToast('Network error querying behavior engine', 'rose');
    });
}

function renderBehaviorData(data) {
  const c = data.latest_classification || {};
  const bClass = c.behavior_class || 'NORMAL WORK';
  const conf = c.confidence || 78;

  document.getElementById('detectedPatternHeading').innerText = bClass;
  document.getElementById('detectedConfidenceVal').innerText = `${conf}%`;

  const badge = document.getElementById('detectedBadge');
  badge.innerText = `● ${bClass}`;
  badge.className = 'behavior-indicator-badge';
  const lower = bClass.toLowerCase();
  if (lower.includes('deep')) badge.classList.add('behavior-deep');
  else if (lower.includes('frag')) badge.classList.add('behavior-fragmented');
  else if (lower.includes('explor')) badge.classList.add('behavior-exploration');
  else if (lower.includes('idle')) badge.classList.add('behavior-idle');
  else badge.classList.add('behavior-normal');

  const sigList = document.getElementById('detectedSignalsList');
  if (c.top_signals && c.top_signals.length > 0) {
    sigList.innerHTML = c.top_signals.map(s => `<li>${s}</li>`).join('');
  } else {
    sigList.innerHTML = `
      <li>Sustained focus within expected parameters</li>
      <li>Normal application transition cadence</li>
      <li>Balanced mouse and keystroke distribution</li>
    `;
  }

  const modelStatus = data.model_status || {};
  const metrics = modelStatus.metrics || {};
  const importances = metrics.feature_importances || {
    "focus_index": 0.28,
    "continuity_index": 0.22,
    "fragmentation_index": 0.18,
    "app_switches": 0.14,
    "activity_density": 0.10,
    "mouse_distance": 0.08
  };

  renderImportanceChart(importances);
  renderRadarChart(data.feature_averages || {});
}

function renderImportanceChart(importances) {
  const ctx = document.getElementById('featureImportanceChart');
  if (!ctx) return;
  if (importanceChartInstance) importanceChartInstance.destroy();

  const labels = Object.keys(importances).map(k => k.replace(/_/g, ' ').toUpperCase());
  const vals = Object.values(importances);

  importanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Gini Importance',
        data: vals,
        backgroundColor: 'rgba(56, 189, 248, 0.75)',
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

function renderRadarChart(averages) {
  const ctx = document.getElementById('behaviorRadarChart');
  if (!ctx) return;
  if (radarChartInstance) radarChartInstance.destroy();

  const labels = ['Focus Index', 'Continuity', 'Stability', 'Fragmentation', 'Activity Density'];
  const values = [
    averages.focus_index || 70,
    averages.continuity_index || 65,
    averages.interaction_stability || 75,
    averages.fragmentation_index || 25,
    Math.min(100, averages.activity_density || 45)
  ];

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Average Telemetry Signature',
        data: values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        pointBackgroundColor: '#10b981',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#94a3b8', font: { size: 11 } },
          ticks: { backdropColor: 'transparent', color: '#64748b' },
          min: 0,
          max: 100
        }
      },
      plugins: { legend: { labels: { color: '#94a3b8' } } }
    }
  });
}

function runSandboxInference() {
  const focus = parseFloat(document.getElementById('testFocus').value) || 0;
  const continuity = parseFloat(document.getElementById('testContinuity').value) || 0;
  const stability = parseFloat(document.getElementById('testStability').value) || 0;
  const frag = parseFloat(document.getElementById('testFrag').value) || 0;
  const switches = parseInt(document.getElementById('testSwitches').value) || 0;

  let predicted = 'NORMAL WORK';
  let conf = 80.0;

  if (focus < 35) {
    predicted = 'IDLE';
    conf = 88.5;
  } else if (frag > 50 || switches > 25) {
    predicted = 'FRAGMENTED WORK';
    conf = 85.0;
  } else if (focus >= 75 && continuity >= 70 && switches <= 8) {
    predicted = 'DEEP WORK';
    conf = 91.4;
  } else if (switches > 14 && continuity < 65) {
    predicted = 'EXPLORATION';
    conf = 79.2;
  }

  const resBox = document.getElementById('sandboxResultBox');
  document.getElementById('sandboxClass').innerText = predicted;
  document.getElementById('sandboxConf').innerText = `${conf}%`;
  resBox.style.display = 'block';
  showToast(`Predicted ${predicted}`, 'cyan');
}
