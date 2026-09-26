let currentOffset = 0;
const pageLimit = 15;
let debounceTimer = null;
let totalSessions = 0;

document.addEventListener('DOMContentLoaded', () => {
  fetchSessionsList();
});

function debounceFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentOffset = 0;
    fetchSessionsList();
  }, 250);
}

function fetchSessionsList() {
  const search = document.getElementById('sessionSearchInput').value.trim();
  const behavior = document.getElementById('sessionBehaviorSelect').value;
  const isDemo = document.getElementById('sessionTypeSelect').value;
  const sortVal = document.getElementById('sessionSortSelect').value.split('_');
  const sortCol = sortVal.slice(0, -1).join('_');
  const sortDir = sortVal[sortVal.length - 1];

  const params = new URLSearchParams({
    search: search,
    behavior: behavior,
    is_demo: isDemo,
    sort_by: sortCol,
    sort_order: sortDir,
    limit: pageLimit,
    offset: currentOffset
  });

  fetch('/api/sessions?' + params.toString())
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to fetch sessions', 'rose');
        return;
      }
      totalSessions = res.total || 0;
      renderSessionsTable(res.data || []);
      updatePaginationControls();
    })
    .catch(() => {
      showToast('Network error querying sessions', 'rose');
    });
}

function renderSessionsTable(rows) {
  const tbody = document.getElementById('sessionsTableBody');
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:36px;color:var(--text-muted);">
          No session data matches the selected query parameters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const durMin = Math.round(r.duration / 60);
    const actMin = Math.round(r.active_time / 60);
    const idlMin = Math.round(r.idle_time / 60);

    let badgeClass = 'behavior-normal';
    const c = (r.behavior_class || '').toLowerCase();
    if (c.includes('deep')) badgeClass = 'behavior-deep';
    else if (c.includes('frag')) badgeClass = 'behavior-fragmented';
    else if (c.includes('explor')) badgeClass = 'behavior-exploration';
    else if (c.includes('idle')) badgeClass = 'behavior-idle';

    const originBadge = r.is_demo
      ? '<span class="badge-tag badge-demo">Demo</span>'
      : '<span class="badge-tag badge-privacy">User</span>';

    return `
      <tr>
        <td class="mono" style="font-weight:600;color:var(--cyan-primary);">${r.session_id}</td>
        <td>${r.created_at || r.start_time}</td>
        <td class="mono">${durMin}m</td>
        <td class="mono" style="color:var(--emerald);">${actMin}m</td>
        <td class="mono" style="color:var(--amber);">${idlMin}m</td>
        <td class="mono">${r.focus_index}%</td>
        <td class="mono">${r.continuity_index}%</td>
        <td><span class="behavior-indicator-badge ${badgeClass}" style="padding:4px 10px;font-size:0.75rem;">${r.behavior_class}</span></td>
        <td>${originBadge}</td>
        <td style="text-align:right;">
          <button class="btn btn-outline" style="padding:4px 10px;font-size:0.75rem;" onclick="openSessionDetailModal('${r.session_id}')">Inspect</button>
        </td>
      </tr>
    `;
  }).join('');
}

function updatePaginationControls() {
  const start = totalSessions === 0 ? 0 : currentOffset + 1;
  const end = Math.min(currentOffset + pageLimit, totalSessions);
  document.getElementById('sessionCountInfo').innerText = `Showing ${start}–${end} of ${totalSessions} sessions`;

  document.getElementById('btnPrevPage').disabled = (currentOffset <= 0);
  document.getElementById('btnNextPage').disabled = (currentOffset + pageLimit >= totalSessions);
}

function prevPage() {
  if (currentOffset > 0) {
    currentOffset = Math.max(0, currentOffset - pageLimit);
    fetchSessionsList();
  }
}

function nextPage() {
  if (currentOffset + pageLimit < totalSessions) {
    currentOffset += pageLimit;
    fetchSessionsList();
  }
}
