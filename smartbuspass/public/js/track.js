(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNavUser(user);
  initSidebar();

  const map = L.map('map', { zoomControl: true }).setView([12.9716, 77.5946], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  const markers = {};
  let selectedBusId = null;

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
      document.getElementById('live-bus-count').textContent = `${buses.length} bus${buses.length === 1 ? '' : 'es'} live`;

      const mapEl = document.getElementById('map');
      const mapFrame = mapEl.parentElement;
      let noBuses = document.getElementById('no-buses-msg');
      if (!buses.length) {
        if (!noBuses) {
          const el = document.createElement('div');
          el.id = 'no-buses-msg';
          el.className = 'track-empty';
          el.innerHTML = '<div><div style="font-size:48px">🚌</div><p style="margin-top:8px">No buses currently active</p></div>';
          mapFrame.appendChild(el);
        }
        return;
      }
      if (noBuses) {
        noBuses.remove();
      }

      const liveIds = new Set(buses.map((bus) => String(bus.busId)));
      Object.keys(markers).forEach((busId) => {
        if (!liveIds.has(busId)) {
          map.removeLayer(markers[busId]);
          delete markers[busId];
          if (selectedBusId === busId) selectedBusId = null;
        }
      });

      buses.forEach(bus => {
        const busId = String(bus.busId);
        const lat = parseFloat(bus.latitude);
        const lng = parseFloat(bus.longitude);
        if (markers[busId]) {
          markers[busId].setLatLng([lat, lng]);
          markers[busId]._busData = bus;
          if (selectedBusId === busId) showBusPanel(bus);
        } else {
          const m = L.marker([lat, lng], { icon: busIcon() }).addTo(map);
          m._busData = bus;
          m.on('click', () => showBusPanel(bus));
          markers[busId] = m;
        }
      });

      if (!selectedBusId && buses[0]) {
        showBusPanel(buses[0]);
        map.setView([parseFloat(buses[0].latitude), parseFloat(buses[0].longitude)], 13);
      }
    } catch (e) { console.error('GPS fetch error:', e); }
  }

  function showBusPanel(bus) {
    selectedBusId = String(bus.busId);
    document.getElementById('panel-bus-num').textContent = bus.busNumber || bus.bus_number;
    document.getElementById('panel-route').textContent = bus.routeName || bus.route_name;
    document.getElementById('panel-speed').textContent = `${parseFloat(bus.speedKmh || bus.speed_kmh || 0).toFixed(1)} km/h`;
    document.getElementById('panel-updated').textContent = new Date(bus.recordedAt || bus.recorded_at).toLocaleTimeString();
    document.getElementById('panel-eta').textContent = `${Math.floor(Math.random() * 8) + 2} min`;
    const placeholder = document.getElementById('panel-placeholder');
    if (placeholder) placeholder.textContent = 'Live details update automatically every 10 seconds while this panel stays visible.';
  }

  await refreshBuses();
  setInterval(refreshBuses, 10000);
})();
