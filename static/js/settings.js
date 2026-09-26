document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});

function loadSettings() {
  fetch('/api/settings')
    .then(r => r.json())
    .then(res => {
      if (!res.success) {
        showToast(res.error || 'Failed to load settings', 'rose');
        return;
      }
      const s = res.data || {};
      document.getElementById('settingTracking').checked = (s.tracking === 'ON');
      document.getElementById('settingAutoStart').checked = (s.auto_start === 'ON');
      document.getElementById('settingIdleThreshold').value = s.idle_threshold || '60';
      document.getElementById('settingDataRetention').value = s.data_retention || '90';
      document.getElementById('settingDemoMode').checked = (s.demo_mode === 'ON');
      document.getElementById('settingNotifications').checked = (s.show_notifications === 'ON');
    })
    .catch(() => {
      showToast('Network error querying settings', 'rose');
    });
}

function saveSettings() {
  const payload = {
    tracking: document.getElementById('settingTracking').checked ? 'ON' : 'OFF',
    auto_start: document.getElementById('settingAutoStart').checked ? 'ON' : 'OFF',
    idle_threshold: document.getElementById('settingIdleThreshold').value,
    data_retention: document.getElementById('settingDataRetention').value,
    demo_mode: document.getElementById('settingDemoMode').checked ? 'ON' : 'OFF',
    show_notifications: document.getElementById('settingNotifications').checked ? 'ON' : 'OFF'
  };

  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('Settings saved successfully', 'emerald');
      } else {
        showToast(res.error || 'Failed to save settings', 'rose');
      }
    })
    .catch(() => {
      showToast('Network error saving settings', 'rose');
    });
}

function clearDemoDataFromSettings() {
  if (!confirm('Purge all synthetic demo data? Real user sessions will be retained.')) return;
  fetch('/api/data/clear-demo', { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast(res.message, 'cyan');
      } else {
        showToast(res.error, 'rose');
      }
    })
    .catch(() => showToast('Server communication error', 'rose'));
}
