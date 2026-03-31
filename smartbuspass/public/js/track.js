(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNavUser(user);

  const map = L.map('map', { zoomControl: true }).setView([12.9716, 77.5946], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  const markers = {};

  function busIcon() {
    return L.divIcon({
      html: '<div class="bus-marker">🚌</div>',
      className: '', iconSize: [36, 36], iconAnchor: [18, 18]
    });
  }

  async function refreshBuses() {
    try {
      const res = await fetch('/api/gps/live');
      const data = await res.json();
      const buses = data.buses || [];

      const noBuses = document.getElementById('no-buses-msg');
      if (!buses.length) {
        if (!noBuses) {
          const el = document.createElement('div');
          el.id = 'no-buses-msg'; el.className = 'no-buses';
          el.innerHTML = '<div style="font-size:48px">🚌</div><p style="margin-top:8px">No buses currently active</p>';
          document.body.appendChild(el);
        }
        return;
      }
      if (noBuses) noBuses.remove();

      buses.forEach(bus => {
        const lat = parseFloat(bus.latitude);
        const lng = parseFloat(bus.longitude);
        if (markers[bus.busId]) {
          markers[bus.busId].setLatLng([lat, lng]);
          markers[bus.busId]._busData = bus;
        } else {
          const m = L.marker([lat, lng], { icon: busIcon() }).addTo(map);
          m._busData = bus;
          m.on('click', () => showBusPanel(bus));
          markers[bus.busId] = m;
        }
      });
    } catch (e) { console.error('GPS fetch error:', e); }
  }

  function showBusPanel(bus) {
    document.getElementById('panel-bus-num').textContent = bus.busNumber || bus.bus_number;
    document.getElementById('panel-route').textContent = bus.routeName || bus.route_name;
    document.getElementById('panel-speed').textContent = `${parseFloat(bus.speedKmh || bus.speed_kmh || 0).toFixed(1)} km/h`;
    document.getElementById('panel-updated').textContent = new Date(bus.recordedAt || bus.recorded_at).toLocaleTimeString();
    document.getElementById('panel-eta').textContent = `${Math.floor(Math.random() * 8) + 2} min`;
    document.getElementById('bus-panel').classList.add('open');
  }

  await refreshBuses();
  setInterval(refreshBuses, 10000);
})();
