// Page loader
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('page-loader');
  if (loader) setTimeout(() => { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 400); }, 400);
});

// Check if already logged in
(async () => {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success) {
      const map = { ADMIN: '/admin/dashboard.html', DRIVER: '/driver/scanner.html', PASSENGER: '/dashboard.html' };
      window.location.href = map[data.role] || '/dashboard.html';
    }
  } catch {}
})();

// Tab switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + '-form').classList.add('active');
    clearAlert();
  });
});

// Eye toggle
document.querySelectorAll('.eye-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

function showAlert(msg, type = 'error') {
  const box = document.getElementById('alert-box');
  box.textContent = msg;
  box.className = `alert alert-${type} show`;
}
function clearAlert() {
  const box = document.getElementById('alert-box');
  box.className = 'alert';
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  clearAlert();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value })
    });
    const data = await res.json();
    if (data.success) { window.location.href = data.redirect; }
    else { showAlert(data.message); }
  } catch { showAlert('Network error. Please try again.'); }
  finally { btn.textContent = 'Sign In'; btn.disabled = false; }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.textContent = 'Creating account...'; btn.disabled = true;
  clearAlert();
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        password: document.getElementById('reg-password').value,
        role: document.getElementById('reg-role').value
      })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(data.message, 'success');
      setTimeout(() => { document.querySelector('[data-tab="login"]').click(); }, 1500);
    } else { showAlert(data.message); }
  } catch { showAlert('Network error. Please try again.'); }
  finally { btn.textContent = 'Create Account'; btn.disabled = false; }
});
