(async () => {
  const user = await requireLogin('PASSENGER');
  if (!user) return;
  renderNavUser(user);
  initSidebar();

  // Welcome
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcome-text').textContent = `${greet}, ${user.fullName} 👋`;

  // Simulated ETA
  document.getElementById('stat-eta').textContent = `${Math.floor(Math.random() * 11) + 5} min`;

  // Load passes
  const res = await fetch('/api/pass/my-passes');
  const data = await res.json();
  const passes = data.passes || [];

  const approved = passes.find(p => p.status === 'APPROVED');
  const pending = passes.find(p => p.status === 'PENDING');
  const params = new URLSearchParams(window.location.search);

  if (params.get('applied') === '1') {
    showToast('Application submitted. Your dashboard has been refreshed.', 'success');
    history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
  }

  if (approved) {
    document.getElementById('stat-route').textContent = approved.route_name.split(' - ')[0] || approved.route_name;
    const expiry = new Date(approved.expiry_date);
    const today = new Date(); today.setHours(0,0,0,0);
    const daysLeft = Math.max(0, Math.ceil((expiry - today) / 86400000));
    document.getElementById('days-left').textContent = daysLeft;
    document.getElementById('stat-expiry').textContent = fmtDate(approved.expiry_date);
    document.getElementById('pass-status-text').textContent = `Active pass on ${approved.route_name}`;

    // Arc animation
    const circumference = 150.8;
    const maxDays = 180;
    const offset = circumference - (Math.min(daysLeft, maxDays) / maxDays) * circumference;
    setTimeout(() => {
      document.getElementById('expiry-arc-circle').style.transition = 'stroke-dashoffset 1s ease';
      document.getElementById('expiry-arc-circle').style.strokeDashoffset = offset;
    }, 600);

    // QR Card
    document.getElementById('qr-section').innerHTML = `
      <div class="qr-card">
        <div class="qr-route">${approved.route_name}</div>
        <div class="qr-bus">${approved.start_point} → ${approved.end_point}</div>
        <img class="qr-image" src="${approved.qr_code}" width="200" height="200" alt="QR Code" />
        <div class="qr-dates">
          <span>Issued: <strong>${fmtDate(approved.issue_date)}</strong></span>
          <span>Expires: <strong>${fmtDate(approved.expiry_date)}</strong></span>
        </div>
        <div class="qr-pass-id">PASS-ID: #${String(approved.pass_id).padStart(6,'0')}</div>
        <span class="qr-valid-badge ${daysLeft > 0 ? 'valid' : 'expired'}">
          ${daysLeft > 0 ? '✓ Valid' : '✗ Expired'}
        </span>
      </div>`;
  } else if (pending) {
    document.getElementById('stat-route').textContent = pending.route_name.split(' - ')[0] || pending.route_name;
    document.getElementById('days-left').textContent = '...';
    document.getElementById('stat-expiry').textContent = 'Pending';
    document.getElementById('pass-status-text').textContent = `Latest application pending approval for ${pending.route_name}`;

    document.getElementById('expiry-arc-circle').style.stroke = 'var(--accent-yellow)';
    document.getElementById('expiry-arc-circle').style.strokeDashoffset = 90;

    document.getElementById('qr-section').innerHTML = `
      <div class="pending-pass-card">
        <div class="pending-pass-head">
          <div>
            <div class="qr-route">${pending.route_name}</div>
            <div class="qr-bus">${pending.start_point} → ${pending.end_point}</div>
          </div>
          ${statusBadge(pending.status)}
        </div>
        <p class="pending-pass-copy">Your application is in review. The pass will move here as an active pass as soon as it is approved.</p>
        <div class="review-card">
          <div class="review-row"><span>Application ID</span><span>#${String(pending.pass_id).padStart(6,'0')}</span></div>
          <div class="review-row"><span>Applied On</span><span>${fmtDate(pending.created_at)}</span></div>
          <div class="review-row"><span>Expected Expiry</span><span>${fmtDate(pending.expiry_date)}</span></div>
        </div>
      </div>`;
  } else {
    document.getElementById('stat-route').textContent = 'None';
    document.getElementById('stat-expiry').textContent = '—';
    document.getElementById('pass-status-text').textContent = 'No active pass';
    document.getElementById('qr-section').innerHTML = `
      <div class="empty-state card">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><rect x="8" y="16" width="48" height="32" rx="6" stroke="#3B82F6" stroke-width="2"/><path d="M20 28h24M20 36h16" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/></svg>
        <h3>No Active Pass</h3>
        <p>Apply for a bus pass to get started</p>
        <a href="/apply.html" class="btn-primary btn" style="width:auto;padding:10px 24px">Apply for Pass →</a>
      </div>`;
  }

  // Pass history table
  const tbody = document.getElementById('passes-tbody');
  if (!passes.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No applications yet.</td></tr>`;
  } else {
    tbody.innerHTML = passes.map(p => `
      <tr>
        <td><span class="mono">#${String(p.pass_id).padStart(6,'0')}</span></td>
        <td>${p.route_name}</td>
        <td>${fmtDate(p.created_at)}</td>
        <td>${fmtDate(p.expiry_date)}</td>
        <td>${statusBadge(p.status)}</td>
      </tr>`).join('');
  }
})();
