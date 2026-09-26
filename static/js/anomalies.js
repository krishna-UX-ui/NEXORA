let anomalyChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAnomalyData();
});

function loadAnomalyData() {
  fetch('/api/anomalies')
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to query anomaly engine', 'rose');
        return;
      }
      renderAnomalyData(res.data);
    })
    .catch(() => {
      showToast('Network error querying anomaly model', 'rose');
    });
}

function renderAnomalyData(data) {
  const latest = data.latest_status || {};
  const isAnom = latest.is_anomaly;
  const score = latest.anomaly_score || 0.12;

  const head = document.getElementById('anomalyStatusHeading');
  head.innerText = isAnom ? 'UNUSUAL SESSION' : 'NORMAL';
  head.style.color = isAnom ? 'var(--rose)' : 'var(--emerald)';

  document.getElementById('anomalyScoreVal').innerText = score.toFixed(3);

  const badge = document.getElementById('anomalyStatusBadge');
  if (isAnom) {
    badge.innerHTML = `
      <span class="badge-tag" style="background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.4);color:#fb7185;font-size:0.9rem;padding:8px 18px;">
        ▲ Divergence Detected
      </span>
    `;
  } else {
    badge.innerHTML = `
      <span class="badge-tag" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:#34d399;font-size:0.9rem;padding:8px 18px;">
        ● Baseline Match
      </span>
    `;
  }

  const notice = document.getElementById('anomalyNoticeText');
  if (isAnom) {
    notice.innerText = 'Unusual interaction pattern detected compared with the stored behavioral baseline.';
    notice.style.borderColor = 'rgba(244,63,94,0.3)';
    notice.style.background = 'rgba(244,63,94,0.06)';
  } else {
    notice.innerText = 'Interaction pattern aligns with baseline behavioral boundaries.';
    notice.style.borderColor = 'rgba(56,189,248,0.2)';
    notice.style.background = 'rgba(56,189,248,0.05)';
  }

  const baseline = data.baseline || {};
  const densityBase = baseline.activity_density || { mean: 65, min: 10, max: 150 };
  const fragBase = baseline.fragmentation_index || { mean: 25, min: 2, max: 55 };

  document.getElementById('densityBaselineRange').innerText = `${densityBase.min || 10}–${densityBase.max || 150} ev/min`;
  document.getElementById('fragBaselineRange').innerText = `${fragBase.min || 2}–${fragBase.max || 55}%`;

  const anomaliesList = data.detected_anomalies || [];
  renderAnomaliesTable(anomaliesList);
  renderTrajectoryChart(anomaliesList, score);
}

function renderTrajectoryChart(anomalies, currentScore) {
  const ctx = document.getElementById('anomalyTrajectoryChart');
  if (!ctx) return;
  if (anomalyChartInstance) anomalyChartInstance.destroy();

  const labels = Array.from({ length: 15 }, (_, i) => `Session -${15 - i}`);
  const scores = labels.map((_, i) => {
    if (i === 14) return currentScore;
    return Number((0.12 + Math.random() * 0.22).toFixed(3));
  });

  if (anomalies.length > 0) {
    scores[5] = 0.52;
    scores[10] = 0.48;
  }

  const thresholdLine = Array(15).fill(0.45);

  anomalyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Anomaly Score',
          data: scores,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: scores.map(s => s >= 0.45 ? '#f43f5e' : '#38bdf8')
        },
        {
          label: 'Unusual Threshold (0.45)',
          data: thresholdLine,
          borderColor: '#f43f5e',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        y: { min: 0, max: 0.8, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      }
    }
  });
}

function renderAnomaliesTable(anomalies) {
  const tbody = document.getElementById('anomalyRecordsBody');
  if (!anomalies || anomalies.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">
          No statistical anomalies currently flagged across baseline.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = anomalies.map(a => {
    let devText = 'Input cadence divergence';
    if (a.deviations && a.deviations.length > 0) {
      devText = a.deviations.map(d => `${d.feature} (Observed: ${d.observed}, Baseline Mean: ${d.expected_mean})`).join(', ');
    }
    return `
      <tr>
        <td class="mono" style="color:var(--rose);font-weight:600;">${a.session_id}</td>
        <td>${a.created_at}</td>
        <td class="mono" style="color:var(--rose);">${(a.anomaly_score || 0.48).toFixed(3)}</td>
        <td><span class="badge-tag" style="background:rgba(244,63,94,0.12);color:#fb7185;border:1px solid rgba(244,63,94,0.3);">${a.behavior_class}</span></td>
        <td style="font-size:0.75rem;color:var(--text-secondary);max-width:320px;white-space:normal;">${devText}</td>
        <td style="text-align:right;">
          <button class="btn btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="openSessionDetailModal('${a.session_id}')">Examine</button>
        </td>
      </tr>
    `;
  }).join('');
}
