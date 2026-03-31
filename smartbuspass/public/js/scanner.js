let scanning = false;
let lastScanned = '';
const scanHistory = [];

(async () => {
  const user = await requireLogin('DRIVER');
  if (!user) return;
  renderNavUser(user);
  startCamera();
})();

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('qr-video');
    video.srcObject = stream;
    video.play();
    scanning = true;
    requestAnimationFrame(scanFrame);
  } catch (e) {
    console.warn('Camera unavailable:', e.message);
  }
}

function scanFrame() {
  if (!scanning) return;
  const video = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data !== lastScanned) {
      lastScanned = code.data;
      validateQR(code.data);
      setTimeout(() => { lastScanned = ''; }, 3000);
    }
  }
  requestAnimationFrame(scanFrame);
}

async function validateQR(payload) {
  try {
    const res = await fetch('/api/driver/scan/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_payload: payload })
    });
    const data = await res.json();
    showResult(data);
    addToHistory(data);
  } catch (e) {
    showResult({ valid: false, message: 'Network error.' });
  }
}

async function validateManual() {
  const payload = document.getElementById('manual-input').value.trim();
  if (!payload) return;
  await validateQR(payload);
  document.getElementById('manual-input').value = '';
}

function showResult(data) {
  const flash = document.getElementById('result-flash');
  const icon = document.getElementById('flash-icon');
  const msg = document.getElementById('flash-msg');
  const detail = document.getElementById('flash-detail');

  if (data.valid) {
    flash.className = 'result-flash valid show';
    icon.textContent = '✓';
    msg.textContent = data.passengerName || 'Valid Pass';
    detail.textContent = `${data.routeName || ''} · Expires ${data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : ''}`;
  } else {
    flash.className = 'result-flash invalid show';
    icon.textContent = '✗';
    msg.textContent = data.message || 'Invalid Pass';
    detail.textContent = '';
  }

  setTimeout(() => { flash.classList.remove('show'); }, 3000);
}

function addToHistory(data) {
  scanHistory.unshift({ ...data, time: new Date() });
  if (scanHistory.length > 10) scanHistory.pop();
  const list = document.getElementById('scan-list');
  list.innerHTML = scanHistory.map(s => `
    <div class="scan-item">
      <div>
        <div class="name">${s.valid ? (s.passengerName || 'Valid') : 'Invalid/Expired'}</div>
        <div class="time">${s.time.toLocaleTimeString()}</div>
      </div>
      ${s.valid
        ? '<span class="badge badge-approved">VALID</span>'
        : '<span class="badge badge-rejected">INVALID</span>'}
    </div>`).join('');
}
