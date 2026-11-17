const GEOJSON_PATH = 'data/RS.geojson';
const INITIAL_CENTER = [3.585, 98.675];
const INITIAL_ZOOM = 12;

// 1. Inisialisasi Peta
const map = L.map('map').setView(INITIAL_CENTER, INITIAL_ZOOM);

// 2. Pilihan Basemap (Gratis tanpa API Key)
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

const esriStreet = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
);

const esriSatelit = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
  }
);

osm.addTo(map);

// 3. Layer Groups
const rsLayerGroup = L.layerGroup().addTo(map);
const userLocationGroup = L.layerGroup().addTo(map);
const routeLineGroup = L.layerGroup().addTo(map);
const measureGroup = L.layerGroup().addTo(map);

// 4. Layer Control
const baseMaps = {
  "Peta Jalan (OSM)": osm,
  "Peta Jalan (Esri)": esriStreet,
  "Citra Satelit (Esri)": esriSatelit
};

const overlayMaps = {
  "Fasilitas Rumah Sakit": rsLayerGroup
};

L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);

// 5. Klasifikasi Kategori & Warna
function klasifikasiFaskes(props) {
  const nama = (props.name || "").toLowerCase();
  const operator = (props["operator:type"] || "").toLowerCase();

  if (
    operator === "government" ||
    nama.includes("rsup") ||
    nama.includes("rsud") ||
    nama.includes("tni") ||
    nama.includes("bhayangkara") ||
    nama.includes("universitas sumatera utara")
  ) {
    return { kategori: "RS Pemerintah / TNI", warna: "#dc2626" };
  }

  if (
    nama.includes("puskesmas") ||
    nama.includes("klinik") ||
    nama.includes("laboratorium") ||
    nama.includes("hewan")
  ) {
    return { kategori: "Puskesmas / Klinik", warna: "#16a34a" };
  }

  if (
    nama.includes("rsia") ||
    nama.includes("ibu") ||
    nama.includes("maternity") ||
    nama.includes("mata") ||
    nama.includes("ginjal") ||
    nama.includes("rsj")
  ) {
    return { kategori: "RS Khusus / RSIA", warna: "#7c3aed" };
  }

  return { kategori: "RS Umum", warna: "#2563eb" };
}

// 6. Rumus Haversine (Menghitung jarak akurat dalam Kilometer)
function hitungJarakKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatJarak(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

// Fungsi menggambar garis jarak dari posisi user ke RS tertentu
function gambarGarisKeRS(targetLatlng, namaRS, jarakKm) {
  if (!userCoords) return;
  routeLineGroup.clearLayers();

  const line = L.polyline([userCoords, targetLatlng], {
    color: '#0284c7',
    weight: 3,
    dashArray: '6, 8'
  }).addTo(routeLineGroup);

  line.bindTooltip(`Jarak ke ${namaRS}: ± ${formatJarak(jarakKm)}`, {
    permanent: true,
    direction: 'center'
  }).openTooltip();
}

let allFeatures = [];
let userCoords = null; // Menyimpan [lat, lng] pengguna jika aktif

// 7. Hitung Statistik KPI
function updateKpiStats(features) {
  let pemerintah = 0, umum = 0, khusus = 0, klinik = 0;

  features.forEach(f => {
    const kat = klasifikasiFaskes(f.properties || {}).kategori;
    if (kat === "RS Pemerintah / TNI") pemerintah++;
    else if (kat === "RS Umum") umum++;
    else if (kat === "RS Khusus / RSIA") khusus++;
    else klinik++;
  });

  document.getElementById('kpi-pemerintah').textContent = pemerintah;
  document.getElementById('kpi-umum').textContent = umum;
  document.getElementById('kpi-khusus').textContent = khusus;
  document.getElementById('kpi-klinik').textContent = klinik;
}

// 8. Render Marker & Daftar Sidebar
function renderDashboard() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  const selectedKategori = document.getElementById('kategori-filter').value;
  const igdOnly = document.getElementById('igd-only-checkbox').checked;

  rsLayerGroup.clearLayers();
  const listEl = document.getElementById('facility-list');
  listEl.innerHTML = '';

  let filtered = allFeatures.filter(feature => {
    const p = feature.properties || {};
    const info = klasifikasiFaskes(p);
    const alamat = (p["addr:full"] || p["addr:street"] || "").toLowerCase();

    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || alamat.includes(searchQuery);
    const matchKategori = selectedKategori === "SEMUA" || info.kategori === selectedKategori;
    const matchIgd = !igdOnly || p.emergency === "yes";

    return matchSearch && matchKategori && matchIgd;
  });

  // Jika posisi pengguna diketahui, hitung jarak & urutkan dari terdekat
  if (userCoords) {
    filtered = filtered
      .map(f => {
        const coords = f.geometry.coordinates;
        const jarak = hitungJarakKm(userCoords[0], userCoords[1], coords[1], coords[0]);
        return { ...f, jarakKm: jarak };
      })
      .sort((a, b) => a.jarakKm - b.jarakKm);
  }

  document.getElementById('total-badge').textContent = `${filtered.length} Titik`;

  if (filtered.length === 0) {
    listEl.innerHTML = `<li style="font-size:0.8rem; color:#64748b; text-align:center; padding:16px;">Tidak ada fasilitas yang cocok dengan filter.</li>`;
    return;
  }

  filtered.forEach(feature => {
    const p = feature.properties || {};
    const info = klasifikasiFaskes(p);
    const coords = feature.geometry.coordinates;
    const latlng = [coords[1], coords[0]];

    const alamat = p["addr:full"] || p["addr:street"] || "Kota Medan, Sumatera Utara";
    const igd = p.emergency === "yes" ? "Tersedia (24 Jam)" : "Tidak tercantum";
    const telepon = p.phone || p["contact:phone"] || "-";
    const webLink = p.website
      ? `<p><strong>Website:</strong> <a href="${p.website}" target="_blank" rel="noopener">Kunjungi Situs</a></p>`
      : "";

    const infoJarakPopup =
      feature.jarakKm !== undefined
        ? `<p><strong>Jarak dari Anda:</strong> ± ${formatJarak(feature.jarakKm)}</p>`
        : "";

    const popupContent = `
      <div class="popup-card">
        <h3>${p.name}</h3>
        <span class="popup-badge" style="background-color:${info.warna};">${info.kategori}</span>
        ${infoJarakPopup}
        <p><strong>Alamat:</strong> ${alamat}</p>
        <p><strong>Layanan IGD:</strong> ${igd}</p>
        <p><strong>Telepon:</strong> ${telepon}</p>
        ${webLink}
        <p style="font-size:0.72rem; color:#64748b; margin-top:5px;">
          Koordinat: ${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}
        </p>
      </div>
    `;

    const marker = L.circleMarker(latlng, {
      radius: 8,
      fillColor: info.warna,
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.92
    }).bindPopup(popupContent);

    marker.on('click', () => {
      if (feature.jarakKm !== undefined) {
        gambarGarisKeRS(latlng, p.name, feature.jarakKm);
      }
    });

    marker.addTo(rsLayerGroup);

    // Item Sidebar
    const li = document.createElement('li');
    li.className = 'facility-item';

    const badgeJarakHtml =
      feature.jarakKm !== undefined
        ? `<span class="distance-badge">📍 ± ${formatJarak(feature.jarakKm)} dari lokasi Anda</span>`
        : "";

    li.innerHTML = `
      <div class="facility-item-top">
        <h4>${p.name}</h4>
        <span class="tag-mini" style="background:${info.warna};">${info.kategori.replace('RS ', '')}</span>
      </div>
      <p>${alamat}</p>
      ${badgeJarakHtml}
    `;

    li.addEventListener('click', () => {
      map.flyTo(latlng, 16, { duration: 0.8 });
      marker.openPopup();
      if (feature.jarakKm !== undefined) {
        gambarGarisKeRS(latlng, p.name, feature.jarakKm);
      }
      document.getElementById('sidebar').classList.remove('open');
    });

    listEl.appendChild(li);
  });

  // Otomatis tarik garis ke RS terdekat pertama kali saat lokasi ditemukan
  if (userCoords && filtered.length > 0) {
    const terdekat = filtered[0];
    const c = terdekat.geometry.coordinates;
    gambarGarisKeRS([c[1], c[0]], terdekat.properties.name, terdekat.jarakKm);
  }
}

// 9. Muat Data GeoJSON
fetch(GEOJSON_PATH)
  .then(res => res.json())
  .then(data => {
    allFeatures = (data.features || []).filter(f => {
      const name = (f.properties && f.properties.name) || "";
      return name && !name.toLowerCase().startsWith("igd ");
    });
    updateKpiStats(allFeatures);
    renderDashboard();
  })
  .catch(err => console.error("Gagal memuat GeoJSON:", err));

// Event Listeners Filter
document.getElementById('search-input').addEventListener('input', renderDashboard);
document.getElementById('kategori-filter').addEventListener('change', renderDashboard);
document.getElementById('igd-only-checkbox').addEventListener('change', renderDashboard);

document.getElementById('reset-view-btn').addEventListener('click', () => {
  routeLineGroup.clearLayers();
  map.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { duration: 0.8 });
});

document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// 10. Legenda Peta
const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend-box');
  div.innerHTML = `
    <h4>Legenda Simbol</h4>
    <div class="legend-item"><span class="legend-dot" style="background:#dc2626;"></span> RS Pemerintah / TNI</div>
    <div class="legend-item"><span class="legend-dot" style="background:#2563eb;"></span> RS Umum</div>
    <div class="legend-item"><span class="legend-dot" style="background:#7c3aed;"></span> RS Khusus / RSIA</div>
    <div class="legend-item"><span class="legend-dot" style="background:#16a34a;"></span> Puskesmas / Klinik</div>
  `;
  return div;
};
legend.addTo(map);

// 11. Tombol Geolocation + Hitung Jarak Otomatis ke RS Terdekat
const locateControl = L.control({ position: 'topleft' });
locateControl.onAdd = function () {
  const btn = L.DomUtil.create('button', 'locate-btn');
  btn.innerHTML = '📍';
  btn.title = 'Deteksi Lokasi Saya & Cari RS Terdekat';
  btn.onclick = function (e) {
    e.stopPropagation();
    map.locate({ setView: true, maxZoom: 14 });
  };
  return btn;
};
locateControl.addTo(map);

map.on('locationfound', function (e) {
  userCoords = [e.latlng.lat, e.latlng.lng];
  userLocationGroup.clearLayers();
  L.circle(e.latlng, { radius: e.accuracy / 2, color: '#0284c7', fillOpacity: 0.15 }).addTo(userLocationGroup);
  L.marker(e.latlng).addTo(userLocationGroup).bindPopup("<strong>Posisi Anda Saat Ini</strong>").openPopup();

  // Render ulang dashboard agar daftar RS otomatis urut dari yang terdekat
  renderDashboard();
});

map.on('locationerror', function () {
  alert("Tidak dapat mengakses lokasi. Pastikan izin lokasi browser diaktifkan.");
});

// 12. Alat Ukur Jarak Manual (Penggaris)
let isMeasuring = false;
let measurePoints = [];

// Buat banner status ukur di atas peta
const measureBanner = document.createElement('div');
measureBanner.className = 'measure-banner';
measureBanner.innerHTML = `
  <span id="measure-text">Klik titik di peta untuk mengukur jarak</span>
  <button id="clear-measure-btn" type="button">Reset</button>
`;
document.querySelector('.map-container').appendChild(measureBanner);

const measureControl = L.control({ position: 'topleft' });
measureControl.onAdd = function () {
  const btn = L.DomUtil.create('button', 'measure-btn');
  btn.id = 'measure-toggle-btn';
  btn.innerHTML = '📏';
  btn.title = 'Alat Ukur Jarak Manual';
  btn.onclick = function (e) {
    e.stopPropagation();
    isMeasuring = !isMeasuring;
    btn.classList.toggle('active', isMeasuring);

    if (isMeasuring) {
      measureBanner.classList.add('show');
      document.getElementById('map').style.cursor = 'crosshair';
    } else {
      measureBanner.classList.remove('show');
      document.getElementById('map').style.cursor = '';
      resetMeasure();
    }
  };
  return btn;
};
measureControl.addTo(map);

function resetMeasure() {
  measurePoints = [];
  measureGroup.clearLayers();
  document.getElementById('measure-text').textContent = 'Klik titik di peta untuk mengukur jarak';
}

document.getElementById('clear-measure-btn').addEventListener('click', function (e) {
  e.stopPropagation();
  resetMeasure();
});

map.on('click', function (e) {
  if (!isMeasuring) return;

  measurePoints.push([e.latlng.lat, e.latlng.lng]);
  measureGroup.clearLayers();

  // Gambar titik-titik yang diklik
  measurePoints.forEach(pt => {
    L.circleMarker(pt, {
      radius: 5,
      fillColor: '#f59e0b',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(measureGroup);
  });

  // Jika sudah ada minimal 2 titik, gambar garis & hitung total jarak
  if (measurePoints.length >= 2) {
    L.polyline(measurePoints, {
      color: '#f59e0b',
      weight: 3
    }).addTo(measureGroup);

    let totalKm = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      totalKm += hitungJarakKm(
        measurePoints[i - 1][0],
        measurePoints[i - 1][1],
        measurePoints[i][0],
        measurePoints[i][1]
      );
    }

    document.getElementById('measure-text').textContent = `Total Jarak Terukur: ${formatJarak(totalKm)}`;
  } else {
    document.getElementById('measure-text').textContent = 'Klik titik tujuan kedua di peta...';
  }
});