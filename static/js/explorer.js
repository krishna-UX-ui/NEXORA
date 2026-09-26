let expOffset = 0;
let expLimit = 15;
let isShowingAll = false;
let expTotal = 0;
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  loadExplorerData();
});

function debounceExplorerSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    expOffset = 0;
    loadExplorerData();
  }, 250);
}

function toggleDatasetDensity() {
  isShowingAll = !isShowingAll;
  expLimit = isShowingAll ? 200 : 15;
  expOffset = 0;
  document.getElementById('densityBtnLabel').innerText = isShowingAll ? 'Show Paginated' : 'Show All Records';
  loadExplorerData();
}

function loadExplorerData() {
  const search = document.getElementById('explorerSearch').value.trim();
  const behavior = document.getElementById('explorerBehavior').value;
  const origin = document.getElementById('explorerOrigin').value;
  const sortTokens = document.getElementById('explorerSort').value.split('_');
  const sortCol = sortTokens.slice(0, -1).join('_');
  const sortDir = sortTokens[sortTokens.length - 1];

  const params = new URLSearchParams({
    search: search,
    behavior: behavior,
    is_demo: origin,
    sort_by: sortCol,
    sort_order: sortDir,
    limit: expLimit,
    offset: expOffset
  });

  fetch('/api/sessions?' + params.toString())
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to query dataset', 'rose');
        return;
      }
      expTotal = res.total || 0;
      renderExplorerRows(res.data || []);
      updateExplorerPagination();
    })
    .catch(() => {
      showToast('Network error querying explorer table', 'rose');
    });
}

function renderExplorerRows(rows) {
  const tbody = document.getElementById('explorerTableBody');
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="16" style="text-align:center;padding:36px;color:var(--text-muted);">
          No dataset records match the active filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const durMin = Math.round(r.duration / 60);
    const actMin = Math.round(r.active_time / 60);
    const idlMin = Math.round(r.idle_time / 60);

    return `
      <tr>
        <td class="mono" style="color:var(--cyan-primary);font-weight:600;">${r.session_id}</td>
        <td style="font-size:0.75rem;">${r.created_at || r.start_time}</td>
        <td class="mono">${durMin}m</td>
        <td class="mono" style="color:var(--emerald);">${actMin}m</td>
        <td class="mono" style="color:var(--amber);">${idlMin}m</td>
        <td class="mono">${r.mouse_clicks}</td>
        <td class="mono">${r.keyboard_events}</td>
        <td class="mono">${r.scroll_events}</td>
        <td class="mono">${Math.round(r.mouse_distance)} px</td>
        <td class="mono">${r.app_switches}</td>
        <td class="mono" style="color:var(--cyan-primary);">${r.focus_index}%</td>
        <td class="mono">${r.continuity_index}%</td>
        <td class="mono">${r.interaction_stability}%</td>
        <td class="mono" style="color:var(--rose);">${r.fragmentation_index}%</td>
        <td><span class="badge-tag" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:0.72rem;">${r.behavior_class}</span></td>
        <td style="text-align:right;">
          <button class="btn btn-outline" style="padding:3px 8px;font-size:0.72rem;" onclick="openSessionDetailModal('${r.session_id}')">Inspect</button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateExplorerPagination() {
  const start = expTotal === 0 ? 0 : expOffset + 1;
  const end = Math.min(expOffset + expLimit, expTotal);
  document.getElementById('explorerInfo').innerText = `Displaying ${start}–${end} of ${expTotal} telemetry records`;

  document.getElementById('btnExpPrev').disabled = (expOffset <= 0);
  document.getElementById('btnExpNext').disabled = (expOffset + expLimit >= expTotal);
}

function expPrev() {
  if (expOffset > 0) {
    expOffset = Math.max(0, expOffset - expLimit);
    loadExplorerData();
  }
}

function expNext() {
  if (expOffset + expLimit < expTotal) {
    expOffset += expLimit;
    loadExplorerData();
  }
}
