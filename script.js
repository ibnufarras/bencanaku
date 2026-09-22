/*
  Bencanaku — homepage (script.js)
 
  Prinsip:
  - Homepage = ringkasan cepat, bukan duplikat halaman detail.
  - Semua angka di sini berasal dari data asli (gempa-bmkg.json,
    hotspot-firms.json, aqi-stations.json, atau fetch live Open-Meteo).
    Kalau data gagal/API belum tersedia, tampilkan itu apa adanya.
  - Gunung Api sengaja TIDAK punya angka status — tidak ada sumber live
    yang bisa dipakai secara sah (lihat catatan di halaman Gunung Api).
*/
 
const JAKARTA_DEFAULT = { name: "Jakarta", lat: -6.2088, lon: 106.8456 };
 
let mapInstance = null;
let quakeLayer = null;
let hotspotLayer = null;
let aqiLayer = null;
let lastQuakeList = [];
let lastAqiStations = [];
 
// ---------- Util ----------
 
function safeSet(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
 
function formatRelativeTime(isoString) {
  try {
    const then = new Date(isoString).getTime();
    const diffMin = Math.round((Date.now() - then) / 60000);
    if (diffMin < 1) return "baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.round(diffHour / 24);
    return `${diffDay} hari lalu`;
  } catch (err) {
    return "";
  }
}
 
function parseDirectionalCoord(str) {
  if (!str) return NaN;
  const m = String(str).match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)/);
  if (!m) return NaN;
  let val = parseFloat(m[1]);
  const dir = m[2].toUpperCase();
  if (dir === "LS" || dir === "BB" || dir === "S" || dir === "W") val = -Math.abs(val);
  else val = Math.abs(val);
  return val;
}
 
function parseQuakeCoords(item) {
  const lat = parseDirectionalCoord(item.Lintang);
  const lon = parseDirectionalCoord(item.Bujur);
  if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
  if (item.Coordinates) {
    const parts = String(item.Coordinates).split(",").map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !parts.some(isNaN)) return [parts[0], parts[1]];
  }
  return null;
}
 
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
 
function aqiColorFromValue(aqi) {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#7f1d1d";
}
 
function aqiLabelFromValue(aqi) {
  if (aqi <= 50) return "Baik";
  if (aqi <= 100) return "Sedang";
  if (aqi <= 150) return "Tidak sehat";
  if (aqi <= 200) return "Sangat tidak sehat";
  return "Berbahaya";
}
 
// ---------- Nav dropdown "Pantau" ----------
 
function setupNavDropdown() {
  const btn = document.getElementById("pantauBtn");
  const menu = document.getElementById("pantauMenu");
  if (!btn || !menu) return;
 
  function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); }
 
  btn.addEventListener("click", () => { menu.hidden ? open() : close(); });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
 
// ---------- Data: Gempa ----------
 
async function loadGempaData() {
  try {
    const res = await fetch("data/gempa-bmkg.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data && data.Infogempa && data.Infogempa.gempa;
    if (!Array.isArray(list) || list.length === 0) throw new Error("Data gempa kosong");
    lastQuakeList = list;
    return { list, fetchedAtUTC: data.fetchedAtUTC || null };
  } catch (err) {
    console.warn("Bencanaku: gempa belum tersedia —", err.message);
    lastQuakeList = [];
    return { list: [], fetchedAtUTC: null };
  }
}
 
function renderEvents(list) {
  safeSet("eventList", "");
  const el = document.getElementById("eventList");
  if (!el) return;
 
  if (list.length === 0) {
    el.innerHTML = `<li class="fallback-text">Data gempa BMKG belum tersedia saat ini. Coba muat ulang halaman sesaat lagi.</li>`;
    return;
  }
 
  el.innerHTML = list.slice(0, 5).map(item => {
    const time = item.DateTime ? formatRelativeTime(item.DateTime) : (item.Jam || "");
    const timeActual = `${item.Jam || ""} · ${item.Tanggal || ""}`.trim();
    return `
      <li class="event-item sev-red">
        <div class="event-title">Gempa M${item.Magnitude || "?"}</div>
        <div class="event-meta">
          <span>${item.Wilayah || "Lokasi tidak diketahui"}</span>
          <span>Kedalaman ${item.Kedalaman || "?"}${item.Potensi ? " · " + item.Potensi : ""}</span>
        </div>
        <div class="event-time">${time} · ${timeActual} · Sumber: BMKG</div>
      </li>
    `;
  }).join("");
}
 
// ---------- Data: Hotspot (FIRMS) ----------
 
async function loadHotspotData() {
  try {
    const res = await fetch("data/hotspot-firms.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hotspots = Array.isArray(data.hotspots) ? data.hotspots : [];
    return { hotspots, fetchedAtUTC: data.fetchedAtUTC || null };
  } catch (err) {
    console.warn("Bencanaku: hotspot belum tersedia —", err.message);
    return { hotspots: [], fetchedAtUTC: null };
  }
}
 
// ---------- Data: Udara (WAQI stations) ----------
 
async function loadAqiStations() {
  try {
    const res = await fetch("data/aqi-stations.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stations = Array.isArray(data.stations) ? data.stations : [];
    lastAqiStations = stations;
    return stations;
  } catch (err) {
    console.warn("Bencanaku: data udara belum tersedia —", err.message);
    lastAqiStations = [];
    return [];
  }
}
 
// ---------- Data: Cuaca (Open-Meteo, live) ----------
 
async function fetchCurrentWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
 
// ---------- Situasi saat ini (snapshot) ----------
 
async function renderSnapshot(gempaResult, hotspotResult, aqiStations) {
  const grid = document.getElementById("snapshotGrid");
  if (!grid) return;
 
  // Cuaca: fetch live untuk Jakarta sebagai representasi nasional
  let cuacaText = "Data sementara tidak tersedia";
  try {
    const wx = await fetchCurrentWeather(JAKARTA_DEFAULT.lat, JAKARTA_DEFAULT.lon);
    if (wx.current) cuacaText = `Jakarta · ${Math.round(wx.current.temperature_2m)}°C`;
  } catch (err) {
    console.warn("Bencanaku: snapshot cuaca gagal —", err.message);
  }
 
  // Udara: cari stasiun yang namanya mengandung "Jakarta"
  let udaraText = "Data sementara tidak tersedia";
  const jakartaStation = aqiStations.find(s => s.name.toLowerCase().includes("jakarta"));
  if (jakartaStation) udaraText = `${jakartaStation.name} · AQI ${jakartaStation.aqi}`;
  else if (aqiStations.length > 0) udaraText = `${aqiStations.length} stasiun terpantau`;
 
  const cards = [
    { name: "Gempa", color: "#3B82F6", value: gempaResult.list.length > 0 ? `${gempaResult.list.length} kejadian terbaru` : "Data sementara tidak tersedia", href: "gempa.html" },
    { name: "Cuaca", color: "#38BDF8", value: cuacaText, href: "cuaca.html" },
    { name: "Udara", color: "#22C55E", value: udaraText, href: "udara.html" },
    { name: "Banjir", color: "#2563EB", value: "Data debit sungai tersedia", href: "banjir.html" },
    { name: "Karhutla", color: "#F97316", value: hotspotResult.fetchedAtUTC ? `${hotspotResult.hotspots.length} titik panas terdeteksi` : "Data sementara tidak tersedia", href: "karhutla.html" },
    { name: "Gunung Api", color: "#A855F7", value: "Perkembangan resmi terbaru", href: "gunung-api.html" },
  ];
 
  grid.innerHTML = cards.map(c => `
    <a href="${c.href}" class="snapshot-card" style="--cat-color:${c.color}">
      <div class="snapshot-card-name">${c.name}</div>
      <div class="snapshot-card-value">${c.value}</div>
    </a>
  `).join("");
}
 
// ---------- Peta gabungan ----------
 
function ensureMapReady() {
  const container = document.getElementById("leafletMap");
  const fallbackNote = document.getElementById("mapFallbackNote");
  if (!container) return false;
 
  if (typeof L === "undefined") {
    console.error("Bencanaku: Leaflet gagal dimuat.");
    if (fallbackNote) fallbackNote.hidden = false;
    return false;
  }
 
  if (!mapInstance) {
    const indonesiaBounds = L.latLngBounds([-11.5, 92], [7, 145]);
    mapInstance = L.map(container, {
      scrollWheelZoom: false,
      minZoom: 4,
      maxBounds: indonesiaBounds.pad(0.25),
      maxBoundsViscosity: 0.8,
    }).fitBounds(indonesiaBounds);
 
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstance);
 
    quakeLayer = L.layerGroup().addTo(mapInstance);
    hotspotLayer = L.layerGroup().addTo(mapInstance);
    aqiLayer = L.layerGroup().addTo(mapInstance);
  }
  return true;
}
 
function renderQuakeLayer(quakeList) {
  if (!ensureMapReady()) return;
  quakeLayer.clearLayers();
 
  quakeList.slice(0, 15).forEach(item => {
    const coords = parseQuakeCoords(item);
    if (!coords) return;
    const mag = parseFloat(item.Magnitude) || 3;
    const radius = Math.min(12, Math.max(4, mag * 1.6));
 
    const marker = L.circleMarker(coords, { radius, color: "#3B82F6", weight: 1, fillColor: "#3B82F6", fillOpacity: 0.6 });
    marker.bindPopup(`
      <b>Gempa M${item.Magnitude || "?"}</b><br>
      ${item.Wilayah || "Lokasi tidak diketahui"}<br>
      ${item.Jam || ""} · ${item.Tanggal || ""}<br>
      Sumber: BMKG
    `);
    quakeLayer.addLayer(marker);
  });
}
 
function renderHotspotLayer(hotspots) {
  if (!ensureMapReady()) return;
  hotspotLayer.clearLayers();
 
  hotspots.slice(0, 1000).forEach(h => {
    const marker = L.circleMarker([h.lat, h.lon], { radius: 3, color: "#F97316", weight: 1, fillColor: "#F97316", fillOpacity: 0.75 });
    marker.bindPopup(`
      <b>Hotspot terdeteksi</b><br>
      ${h.acq_date || ""} ${h.acq_time || ""}<br>
      ${h.satellite ? "Satelit: " + h.satellite + "<br>" : ""}
      Sumber: NASA FIRMS<br>
      <span style="font-size:11px;">Deteksi anomali panas, bukan konfirmasi kebakaran.</span>
    `);
    hotspotLayer.addLayer(marker);
  });
}
 
function renderAqiLayerOnMap(stations) {
  if (!ensureMapReady()) return;
  aqiLayer.clearLayers();
 
  stations.forEach(s => {
    if (typeof s.lat !== "number" || typeof s.lon !== "number") return;
    const color = aqiColorFromValue(s.aqi);
    const marker = L.circleMarker([s.lat, s.lon], { radius: 5, color: "#fff", weight: 1, fillColor: color, fillOpacity: 0.85 });
    marker.bindPopup(`<b>${s.name}</b><br>AQI ${s.aqi} · Sumber: WAQI`);
    aqiLayer.addLayer(marker);
  });
}
 
function setupMapLayerToggles() {
  const quakeToggle = document.getElementById("toggleLayerGempa");
  const hotspotToggle = document.getElementById("toggleLayerHotspot");
  const aqiToggle = document.getElementById("toggleLayerUdara");
 
  if (quakeToggle) quakeToggle.addEventListener("change", () => {
    if (!mapInstance) return;
    quakeToggle.checked ? mapInstance.addLayer(quakeLayer) : mapInstance.removeLayer(quakeLayer);
  });
  if (hotspotToggle) hotspotToggle.addEventListener("change", () => {
    if (!mapInstance) return;
    hotspotToggle.checked ? mapInstance.addLayer(hotspotLayer) : mapInstance.removeLayer(hotspotLayer);
  });
  if (aqiToggle) aqiToggle.addEventListener("change", () => {
    if (!mapInstance) return;
    aqiToggle.checked ? mapInstance.addLayer(aqiLayer) : mapInstance.removeLayer(aqiLayer);
  });
 
  // Layer "Sebaran asap" memang belum ada sumber datanya — tampilkan itu
  // apa adanya, bukan pura-pura jadi toggle yang berfungsi.
  const asapNote = document.getElementById("asapEmptyNote");
  if (asapNote) asapNote.hidden = false;
}
 
// ---------- Wilayah kamu (search bebas) ----------
 
async function geocodeQuery(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json&country=ID`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) && data.results.length > 0 ? data.results[0] : null;
}
 
function findGempaMention(query) {
  const q = query.toLowerCase();
  return lastQuakeList.find(item => (item.Wilayah || "").toLowerCase().includes(q));
}
 
function findNearestAqiStation(lat, lon) {
  if (lastAqiStations.length === 0) return null;
  let nearest = lastAqiStations[0];
  let minDist = distanceKm(lat, lon, nearest.lat, nearest.lon);
  for (const s of lastAqiStations.slice(1)) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return minDist < 100 ? nearest : null; // hanya pakai kalau cukup dekat
}
 
async function renderWilayah(name, lat, lon) {
  const el = document.getElementById("areaReadout");
  if (!el) return;
  el.innerHTML = `<p class="fallback-text">Memuat data wilayah…</p>`;
 
  const rows = [];
 
  // Cuaca — live
  try {
    const wx = await fetchCurrentWeather(lat, lon);
    rows.push({ label: "Cuaca", value: wx.current ? `${Math.round(wx.current.temperature_2m)}°C` : "Data wilayah ini belum tersedia." });
  } catch (err) {
    rows.push({ label: "Cuaca", value: "Data wilayah ini belum tersedia." });
  }
 
  // Udara — stasiun terdekat
  const nearestStation = findNearestAqiStation(lat, lon);
  rows.push({
    label: "Udara",
    value: nearestStation ? `AQI ${nearestStation.aqi} (${nearestStation.name})` : "Data wilayah ini belum tersedia.",
  });
 
  // Gempa — cek penyebutan wilayah di data terbaru
  const gempaMention = findGempaMention(name);
  rows.push({
    label: "Gempa",
    value: gempaMention ? `M${gempaMention.Magnitude} — ${gempaMention.Wilayah}` : "Tidak ada kejadian signifikan terbaru di dekat wilayah ini.",
  });
 
  // Banjir — tidak fetch ulang di sini (hindari duplikasi API), cukup info arah
  rows.push({ label: "Banjir", value: "Data debit sungai tersedia di halaman Banjir." });
 
  el.innerHTML = rows.map(r => `
    <div class="area-row">
      <div class="area-row-label">${r.label}</div>
      <div class="area-row-value"><span class="value">${r.value}</span></div>
    </div>
  `).join("");
}
 
function setupWilayahSearch() {
  const input = document.getElementById("wilayahSearch");
  const list = document.getElementById("wilayahSearchResults");
  if (!input || !list) return;
 
  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) { list.hidden = true; return; }
 
    debounceTimer = setTimeout(async () => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=id&format=json&country=ID`;
        const res = await fetch(url);
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : [];
 
        if (results.length === 0) {
          list.innerHTML = `<li style="cursor:default; color:var(--text-faint);">Tidak ditemukan</li>`;
          list.hidden = false;
          return;
        }
 
        list.innerHTML = results.map((r, i) => `<li data-index="${i}">${r.name}${r.admin1 ? ", " + r.admin1 : ""}</li>`).join("");
        list.hidden = false;
 
        list.querySelectorAll("li[data-index]").forEach(li => {
          li.addEventListener("click", () => {
            const r = results[Number(li.dataset.index)];
            input.value = `${r.name}${r.admin1 ? ", " + r.admin1 : ""}`;
            list.hidden = true;
            renderWilayah(r.name, r.latitude, r.longitude);
          });
        });
      } catch (err) {
        console.error("Bencanaku: pencarian wilayah gagal —", err);
      }
    }, 350);
  });
 
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) list.hidden = true;
  });
}
 
// ---------- Init ----------
 
document.addEventListener("DOMContentLoaded", async () => {
  setupNavDropdown();
  setupWilayahSearch();
 
  let gempaResult = { list: [], fetchedAtUTC: null };
  let hotspotResult = { hotspots: [], fetchedAtUTC: null };
  let aqiStations = [];
 
  try { gempaResult = await loadGempaData(); } catch (e) { console.error("loadGempaData gagal", e); }
  try { hotspotResult = await loadHotspotData(); } catch (e) { console.error("loadHotspotData gagal", e); }
  try { aqiStations = await loadAqiStations(); } catch (e) { console.error("loadAqiStations gagal", e); }
 
  try { renderEvents(gempaResult.list); } catch (e) { console.error("renderEvents gagal", e); }
 
  const quakeNote = document.getElementById("quakeUpdatedNote");
  if (quakeNote && gempaResult.fetchedAtUTC) {
    quakeNote.textContent = `Data diambil ${new Date(gempaResult.fetchedAtUTC).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
  }
 
  try { await renderSnapshot(gempaResult, hotspotResult, aqiStations); } catch (e) { console.error("renderSnapshot gagal", e); }
 
  try {
    renderQuakeLayer(gempaResult.list);
    renderHotspotLayer(hotspotResult.hotspots);
    renderAqiLayerOnMap(aqiStations);
    setupMapLayerToggles();
  } catch (e) { console.error("render map gagal", e); }
});
 
