let currentPage = 1;
let selectedIds = new Set();

(async () => {
  const user = await requireLogin('ADMIN');
  if (!user) return;
  renderNavUser(user);
  initSidebar();

  const page = window._page;
  if (!page) await loadOverview();
  else if (page === 'applications') await loadApplications(1);
  else if (page === 'routes') await loadRoutes();
  else if (page === 'reports') await loadReports();
})();

// ---- OVERVIEW ----
async function loadOverview() {
  const [statsRes, appsRes, reportsRes] = await Promise.all([
    fetch('/api/admin/stats'),
    fetch('/api/admin/applications?status=PENDING&limit=10'),
    fetch('/api/admin/reports')
  ]);
  const stats = await statsRes.json();
  const apps = await appsRes.json();
  const reports = await reportsRes.json();

  if (stats.success) {
    countUp('s-pending', stats.pendingApplications);
    countUp('s-total', stats.totalPassesIssued);
    countUp('s-routes', stats.activeRoutes);
    document.getElementById('s-revenue').textContent = `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}`;
  }

  if (apps.success) renderPendingTable(apps.applications);
  if (reports.success) renderBarChart(reports.daily);
}

function countUp(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

function renderPendingTable(apps) {
  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;
  if (!apps.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No pending applications</td></tr>`; return; }
  tbody.innerHTML = apps.map(a => `
    <tr id="row-${a.pass_id}">
      <td>${a.full_name}<br><small style="color:var(--text-muted)">${a.email}</small></td>
      <td>${a.route_name}</td>
      <td>${fmtDate(a.created_at)}</td>
      <td style="font-family:var(--font-mono)">₹${a.fee_amount}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="approvePass(${a.pass_id})">Approve</button>
        <button class="btn btn-sm btn-danger" style="margin-left:6px" onclick="rejectPass(${a.pass_id})">Reject</button>
      </td>
    </tr>`).join('');
}

function renderBarChart(daily) {
  const chart = document.getElementById('revenue-chart');
  if (!chart || !daily) return;
  const max = Math.max(...daily.map(d => parseFloat(d.revenue)), 1);
  chart.innerHTML = daily.map(d => {
    const pct = (parseFloat(d.revenue) / max * 100).toFixed(1);
    const day = new Date(d.day).toLocaleDateString('en-IN', { weekday: 'short' });
    return `<div class="bar-wrap">
      <div class="bar-val">₹${Math.round(d.revenue)}</div>
      <div class="bar" style="height:${pct}%"></div>
      <div class="bar-label">${day}</div>
    </div>`;
  }).join('');
}

// ---- APPLICATIONS ----
async function loadApplications(page = 1) {
  currentPage = page;
  const status = document.getElementById('filter-status')?.value || '';
  const res = await fetch(`/api/admin/applications?status=${status}&page=${page}&limit=20`);
  const data = await res.json();
  if (!data.success) return;

  const tbody = document.getElementById('apps-tbody');
  if (!data.applications.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">No applications found.</td></tr>`;
  } else {
    tbody.innerHTML = data.applications.map(a => `
      <tr id="row-${a.pass_id}">
        <td><input type="checkbox" class="row-check" value="${a.pass_id}" onchange="updateBulk()" /></td>
        <td><span class="mono">#${String(a.pass_id).padStart(6,'0')}</span></td>
        <td>${a.full_name}<br><small style="color:var(--text-muted)">${a.email}</small></td>
        <td>${a.route_name}</td>
        <td>${fmtDate(a.created_at)}</td>
        <td style="font-family:var(--font-mono)">₹${a.fee_amount}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          ${a.status === 'PENDING' ? `
            <button class="btn btn-sm btn-success" onclick="approvePass(${a.pass_id})">Approve</button>
            <button class="btn btn-sm btn-danger" style="margin-left:6px" onclick="rejectPass(${a.pass_id})">Reject</button>
          ` : '—'}
        </td>
      </tr>`).join('');
  }

  // Pagination
  const totalPages = Math.ceil(data.total / 20);
  const pg = document.getElementById('pagination');
  if (pg) {
    pg.innerHTML = Array.from({ length: totalPages }, (_, i) =>
      `<button class="page-btn ${i+1===page?'active':''}" onclick="loadApplications(${i+1})">${i+1}</button>`
    ).join('');
  }
}

function updateBulk() {
  selectedIds = new Set([...document.querySelectorAll('.row-check:checked')].map(c => c.value));
  const bar = document.getElementById('bulk-bar');
  const count = document.getElementById('bulk-count');
  if (bar) { bar.classList.toggle('show', selectedIds.size > 0); }
  if (count) count.textContent = `${selectedIds.size} selected`;
}

function toggleAll(cb) {
  document.querySelectorAll('.row-check').forEach(c => { c.checked = cb.checked; });
  updateBulk();
}

async function bulkApprove() {
  for (const id of selectedIds) await approvePass(id, true);
  showToast(`Approved ${selectedIds.size} applications`, 'success');
  selectedIds.clear();
  loadApplications(currentPage);
}

// ---- ROUTES ----
async function loadRoutes() {
  const res = await fetch('/api/admin/routes');
  const data = await res.json();
  const tbody = document.getElementById('routes-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.routes.map(r => `
    <tr>
      <td>${r.route_name}</td>
      <td>${r.start_point} → ${r.end_point}</td>
      <td>${r.distance_km} km</td>
      <td style="font-family:var(--font-mono)">₹${r.fee_amount}</td>
      <td>${r.is_active ? '<span class="badge badge-approved">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="editRoute(${JSON.stringify(r).replace(/"/g,'&quot;')})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteRoute(${r.route_id})" title="Deactivate">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function openDrawer(route) {
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('route-drawer').classList.add('open');
  if (!route) {
    document.getElementById('drawer-title').textContent = 'Add Route';
    document.getElementById('edit-route-id').value = '';
    ['d-name','d-start','d-end','d-dist','d-fee','d-stops'].forEach(id => document.getElementById(id).value = '');
  }
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('route-drawer').classList.remove('open');
}

function editRoute(r) {
  openDrawer(r);
  document.getElementById('drawer-title').textContent = 'Edit Route';
  document.getElementById('edit-route-id').value = r.route_id;
  document.getElementById('d-name').value = r.route_name;
  document.getElementById('d-start').value = r.start_point;
  document.getElementById('d-end').value = r.end_point;
  document.getElementById('d-dist').value = r.distance_km;
  document.getElementById('d-fee').value = r.fee_amount;
  const stops = Array.isArray(r.stops) ? r.stops.join(', ') : (typeof r.stops === 'string' ? JSON.parse(r.stops || '[]').join(', ') : '');
  document.getElementById('d-stops').value = stops;
}

async function saveRoute() {
  const id = document.getElementById('edit-route-id').value;
  const body = {
    route_name: document.getElementById('d-name').value,
    start_point: document.getElementById('d-start').value,
    end_point: document.getElementById('d-end').value,
    distance_km: document.getElementById('d-dist').value,
    fee_amount: document.getElementById('d-fee').value,
    stops: document.getElementById('d-stops').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  const url = id ? `/api/admin/routes/${id}` : '/api/admin/routes';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.success) { showToast(data.message, 'success'); closeDrawer(); loadRoutes(); }
  else showToast(data.message, 'error');
}

async function deleteRoute(id) {
  if (!confirm('Deactivate this route?')) return;
  const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { showToast(data.message, 'success'); loadRoutes(); }
  else showToast(data.message, 'error');
}

// ---- REPORTS ----
async function loadReports() {
  const res = await fetch('/api/admin/reports');
  const data = await res.json();
  const tbody = document.getElementById('report-tbody');
  if (!tbody || !data.success) return;
  tbody.innerHTML = data.byRoute.map(r => `
    <tr>
      <td>${r.route_name}</td>
      <td style="font-family:var(--font-mono)">${r.total_passes}</td>
      <td style="font-family:var(--font-mono);color:var(--accent-green)">₹${Number(r.revenue).toLocaleString('en-IN')}</td>
    </tr>`).join('');
}

// ---- SHARED APPROVE/REJECT ----
async function approvePass(passId, silent = false) {
  const res = await fetch(`/api/admin/applications/${passId}/approve`, { method: 'PUT' });
  const data = await res.json();
  if (data.success) {
    if (!silent) showToast('Pass approved and QR generated', 'success');
    const row = document.getElementById(`row-${passId}`);
    if (row) { row.style.opacity = '0'; row.style.transition = 'opacity 0.4s'; setTimeout(() => row.remove(), 400); }
  } else if (!silent) showToast(data.message, 'error');
}

async function rejectPass(passId) {
  const res = await fetch(`/api/admin/applications/${passId}/reject`, { method: 'PUT' });
  const data = await res.json();
  if (data.success) {
    showToast('Pass rejected', 'info');
    const row = document.getElementById(`row-${passId}`);
    if (row) { row.style.opacity = '0'; row.style.transition = 'opacity 0.4s'; setTimeout(() => row.remove(), 400); }
  } else showToast(data.message, 'error');
}
