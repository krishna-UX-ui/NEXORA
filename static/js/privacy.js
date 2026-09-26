function confirmDeleteAllData() {
  const confirmed = confirm('WARNING: Are you certain you wish to purge ALL locally stored session data, application breakdowns, and machine learning models? This operation is irreversible.');
  if (!confirmed) return;

  fetch('/api/data', { method: 'DELETE' })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('All local session data has been purged successfully', 'rose');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1200);
      } else {
        showToast(res.error || 'Failed to purge data', 'rose');
      }
    })
    .catch(() => {
      showToast('Network error during data deletion', 'rose');
    });
}
