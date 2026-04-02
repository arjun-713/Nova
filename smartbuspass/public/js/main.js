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
  if (!user) return;

  const initials = user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const avatar = document.getElementById('nav-avatar');
  if (avatar) {
    avatar.textContent = initials;
    avatar.addEventListener('click', () => {
      document.getElementById('avatar-dropdown')?.classList.toggle('open');
    });
  }

  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;

  const sidebarName = document.getElementById('sidebar-user-name');
  if (sidebarName) sidebarName.textContent = user.fullName;

  const sidebarRole = document.getElementById('sidebar-user-role');
  if (sidebarRole) sidebarRole.textContent = user.role === 'PASSENGER' ? 'Passenger Account' : user.role;

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('avatar-dropdown');
    if (dd && !e.target.closest('.avatar')) dd.classList.remove('open');
  });
}

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/dashboard.html';
  return pathname.endsWith('/') ? `${pathname}dashboard.html` : pathname;
}

function focusHashTarget(hash, smooth = true) {
  if (!hash) return;
  const target = document.querySelector(hash);
  if (!target) return;

  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

function syncSidebarActiveState() {
  const currentPath = normalizePathname(window.location.pathname);
  const currentHash = window.location.hash;

  document.querySelectorAll('.sidebar-link').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    const linkPath = normalizePathname(url.pathname);
    const linkHash = url.hash;

    const pathMatches = linkPath === currentPath;
    const hashMatches = linkHash ? linkHash === currentHash : !currentHash || linkPath !== '/dashboard.html';
    link.classList.toggle('active', pathMatches && hashMatches);
  });
}

// Sidebar toggle + active state + section focus
function initSidebar() {
  const hamburger = document.getElementById('sidebar-toggle') || document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('button');
      overlay.type = 'button';
      overlay.id = 'sidebar-overlay';
      overlay.className = 'sidebar-overlay';
      overlay.setAttribute('aria-label', 'Close navigation');
      document.body.appendChild(overlay);
    }

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    };

    const openSidebar = () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    };

    if (hamburger) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }

    overlay.addEventListener('click', closeSidebar);

    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        const url = new URL(link.href, window.location.origin);
        const linkPath = normalizePathname(url.pathname);
        const currentPath = normalizePathname(window.location.pathname);

        if (linkPath === currentPath && url.hash) {
          event.preventDefault();
          history.pushState({}, '', `${url.pathname}${url.hash}`);
          syncSidebarActiveState();
          focusHashTarget(url.hash);
        }

        closeSidebar();
      });
    });

    window.addEventListener('hashchange', () => {
      syncSidebarActiveState();
      focusHashTarget(window.location.hash, false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!hamburger || !hamburger.contains(e.target))) {
        closeSidebar();
      }
    });

    syncSidebarActiveState();
    if (window.location.hash) {
      window.setTimeout(() => focusHashTarget(window.location.hash, false), 50);
    }
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
