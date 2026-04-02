let selectedRoute = null;
let selectedDuration = null;
let routes = [];
const feeFactors = { 1: 1, 3: 2.5, 6: 4.5 };

(async () => {
  const user = await requireLogin('PASSENGER');
  if (!user) return;
  renderNavUser(user);
  initSidebar();
  await loadRoutes();
})();

async function loadRoutes() {
  const res = await fetch('/api/pass/routes/active');
  const data = await res.json();
  routes = data.routes || [];
  const grid = document.getElementById('route-cards');
  if (!routes.length) {
    grid.innerHTML = `<p style="color:var(--text-muted)">No active routes available.</p>`;
    return;
  }
  grid.innerHTML = routes.map(r => `
    <div class="route-card" data-id="${r.route_id}" onclick="selectRoute(${r.route_id})">
      <div class="route-card-name">${r.route_name}</div>
      <div class="route-card-path">
        <span>${r.start_point}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <span>${r.end_point}</span>
      </div>
      <div class="route-card-meta">
        <span class="route-badge route-badge-dist">${r.distance_km} km</span>
        <span class="route-badge route-badge-fee">₹${r.fee_amount}/mo</span>
      </div>
    </div>`).join('');
}

function selectRoute(id) {
  selectedRoute = routes.find(r => r.route_id === id);
  document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.route-card[data-id="${id}"]`).classList.add('selected');
  document.getElementById('step1-next').disabled = false;

  // Update duration fees
  [1, 3, 6].forEach(m => {
    document.getElementById(`fee-${m}`).textContent = `₹${(selectedRoute.fee_amount * feeFactors[m]).toFixed(0)}`;
  });
}

document.querySelectorAll('.duration-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedDuration = parseInt(card.dataset.months);
    document.getElementById('step2-next').disabled = false;
  });
});

function goStep(step) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`panel${i}`).classList.remove('active');
    document.getElementById(`sc${i}`).className = 'step-circle';
    document.getElementById(`sl${i}`).className = 'step-label';
  });
  document.getElementById(`panel${step}`).classList.add('active');
  document.getElementById(`sc${step}`).classList.add('active');
  document.getElementById(`sl${step}`).classList.add('active');

  // Mark done steps
  for (let i = 1; i < step; i++) {
    document.getElementById(`sc${i}`).classList.add('done');
    document.getElementById(`line${i}`) && document.getElementById(`line${i}`).classList.add('done');
  }

  if (step === 3) renderReview();
}

function renderReview() {
  if (!selectedRoute || !selectedDuration) return;
  const total = (selectedRoute.fee_amount * feeFactors[selectedDuration]).toFixed(2);
  document.getElementById('review-summary').innerHTML = `
    <div class="review-row"><span>Route</span><span>${selectedRoute.route_name}</span></div>
    <div class="review-row"><span>From</span><span>${selectedRoute.start_point}</span></div>
    <div class="review-row"><span>To</span><span>${selectedRoute.end_point}</span></div>
    <div class="review-row"><span>Duration</span><span>${selectedDuration} Month${selectedDuration > 1 ? 's' : ''}</span></div>
    <div class="review-row"><span>Base Fee</span><span>₹${selectedRoute.fee_amount}/mo</span></div>
    <div class="review-row"><span>Total Amount</span><span>₹${total}</span></div>`;
}

async function submitApplication() {
  if (!selectedRoute || !selectedDuration) {
    showToast('Select a route and duration first.', 'error');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Processing...'; btn.disabled = true;
  try {
    const res = await fetch('/api/pass/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: selectedRoute.route_id, duration_months: selectedDuration })
    });
    const data = await res.json();
    if (data.success) {
      launchConfetti();
      btn.textContent = '✓ Submitted!';
      btn.style.background = 'var(--accent-green)';
      setTimeout(() => window.location.href = '/dashboard.html?applied=1#passes', 1200);
    } else {
      showToast(data.message, 'error');
      btn.textContent = 'Pay & Submit'; btn.disabled = false;
    }
  } catch {
    showToast('Network error.', 'error');
    btn.textContent = 'Pay & Submit'; btn.disabled = false;
  }
}

function launchConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.5}s;`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}
