// Global utilities

// Page loader
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('page-loader');
  if (loader) setTimeout(() => { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 400); }, 400);
});

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Auth guard — call on protected pages
async function requireLogin(expectedRole) {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.success) { window.location.href = '/index.html'; return null; }
    if (expectedRole && data.role !== expectedRole) { window.location.href = '/index.html'; return null; }
    return data;
  } catch { window.location.href = '/index.html'; return null; }
}

// Logout
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

// Render navbar user
function renderNavUser(user) {
  const avatar = document.getElementById('nav-avatar');
  if (avatar && user) {
    avatar.textContent = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    avatar.addEventListener('click', () => {
      document.getElementById('avatar-dropdown').classList.toggle('open');
    });
  }
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('avatar-dropdown');
    if (dd && !e.target.closest('.avatar')) dd.classList.remove('open');
  });
}

// Sidebar hamburger
function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

// Skeleton loader helper
function skeletonRows(count, cols) {
  return Array(count).fill(0).map(() =>
    `<tr>${Array(cols).fill(0).map(() => `<td><div class="skeleton" style="height:16px;width:80%"></div></td>`).join('')}</tr>`
  ).join('');
}

// Format date
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Badge HTML
function statusBadge(status) {
  const map = { PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected', EXPIRED: 'badge-expired' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}
