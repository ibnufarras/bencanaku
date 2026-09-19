/*
  Bencanaku — udara.js
  Berbasis STASIUN PENGAMATAN WAQI (data/aqi-stations.json), bukan provinsi.

  Alur pencarian:
  1. Cocokkan teks yang diketik ke nama stasiun WAQI (substring match).
  2. Kalau tidak ada yang cocok, geocode teks itu (Open-Meteo Geocoding,
     sudah dipakai di halaman Cuaca, gratis tanpa token) untuk dapat
     koordinat, lalu cari stasiun WAQI terdekat dari titik itu.
  3. Kalau stasiun yang ditampilkan bukan match langsung, halaman WAJIB
     menjelaskan itu ("tidak ada stasiun tepat di lokasi ini") — tidak
     boleh terkesan seolah AQI itu milik lokasi yang dicari.

  Prinsip: tidak ada AQI/polutan yang dikarang. Kalau data tidak ada,
  tampilkan state itu apa adanya.
*/

const AQI_LEVELS = [
  { max: 50,  label: "Baik", color: "#22c55e", emoji: "😊" },
  { max: 100, label: "Sedang", color: "#eab308", emoji: "😐" },
  { max: 150, label: "Tidak sehat", color: "#f97316", emoji: "😷" },
  { max: 200, label: "Sangat tidak sehat", color: "#ef4444", emoji: "🤢" },
  { max: Infinity, label: "Berbahaya", color: "#7f1d1d", emoji: "☠️" },
];

function getAqiLevel(aqi) {
  return AQI_LEVELS.find((lvl) => aqi <= lvl.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let map;
let markers = [];
let allStations = [];
let fetchedAtUTC = null;

// ---------- Ambil data stasiun ----------

async function loadStationsData() {
  const res = await fetch("data/aqi-stations.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fetchedTimeLabel() {
  if (!fetchedAtUTC) return "";
  return new Date(fetchedAtUTC).toLocaleString("id-ID", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Jakarta"
  }) + " WIB";
}

// ---------- Peta ----------

function initMap() {
  const container = document.getElementById("udaraMap");
  const fallback = document.getElementById("udaraMapFallback");
  if (!container) return;

  if (typeof L === "undefined") {
    console.error("Bencanaku (udara): Leaflet gagal dimuat.");
    if (fallback) fallback.hidden = false;
    return;
  }

  map = L.map(container, {
    minZoom: 4,
    maxBounds: [[-13, 90], [8, 142]],
    scrollWheelZoom: false,
  }).setView([-2.5, 118], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function renderMapMarkers(stations) {
  if (!map) return;
  clearMarkers();

  stations.forEach((s) => {
    const level = getAqiLevel(s.aqi);
    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 6,
      color: "#fff",
      weight: 1,
      fillColor: level.color,
      fillOpacity: 0.85,
    }).bindPopup(`<b>${s.name}</b><br>AQI ${s.aqi} — ${level.label} ${level.emoji}`);

    marker.on("click", () => selectStation(s, { exact: true }));
    marker.addTo(map);
    markers.push(marker);
  });
}

// ---------- Render bagian-bagian halaman ----------

function renderSelected(station, meta) {
  const el = document.getElementById("udaraSelected");
  if (!el) return;

  if (!station) {
    el.innerHTML = `<p class="fallback-text">Tidak ada stasiun yang ditemukan untuk lokasi tersebut.</p>`;
    return;
  }

  const level = getAqiLevel(station.aqi);
  const updatedLine = fetchedAtUTC ? `Diperbarui ${fetchedTimeLabel()}` : "";

  const nearestNote = meta && !meta.exact ? `
    <div class="udara-nearest-note">
      <strong>${meta.queryLabel}</strong><br>
      Tidak ada stasiun pengamatan tepat di lokasi ini.
      Menampilkan data dari stasiun terdekat${meta.distanceKm ? ` (~${Math.round(meta.distanceKm)} km)` : ""}:
    </div>
  ` : "";

  el.innerHTML = `
    ${nearestNote}
    <div class="udara-hero-name">${station.name}</div>
    <div class="udara-hero-main">
      <div class="udara-hero-number" style="color:${level.color}">${station.aqi}</div>
      <div class="udara-hero-meta">
        <div class="udara-hero-category" style="color:${level.color}">${level.label.toUpperCase()} <span class="udara-hero-emoji">${level.emoji}</span></div>
        ${updatedLine ? `<div class="udara-hero-updated">${updatedLine}</div>` : ""}
        <div class="udara-hero-source">Sumber: WAQI</div>
      </div>
    </div>
  `;

  // Detail polutan — belum tersedia dari pipeline data saat ini (lihat catatan di udaraPollutants)
  renderPollutants(null);
}

function renderPollutants(pollutants) {
  const el = document.getElementById("udaraPollutants");
  if (!el) return;

  if (!pollutants) {
    el.innerHTML = `<p class="fallback-text">Detail polutan (PM2.5, PM10, O₃, dll) belum tersedia untuk stasiun ini di Bencanaku.</p>`;
    return;
  }

  // Struktur ini siap dipakai kalau nanti data per-polutan sudah diambil
  const items = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³" },
    { key: "pm10", label: "PM10", unit: "µg/m³" },
    { key: "o3", label: "O₃", unit: "" },
    { key: "no2", label: "NO₂", unit: "" },
    { key: "co", label: "CO", unit: "" },
    { key: "so2", label: "SO₂", unit: "" },
  ];

  const available = items.filter(i => pollutants[i.key] != null);
  if (available.length === 0) {
    el.innerHTML = `<p class="fallback-text">Detail polutan tidak tersedia untuk stasiun ini.</p>`;
    return;
  }

  el.innerHTML = available.map(i => `
    <div class="quake-card">
      <div class="event-title">${i.label}</div>
      <div class="udara-hero-number" style="font-size:1.4rem;">${pollutants[i.key]}${i.unit ? " " + i.unit : ""}</div>
    </div>
  `).join("");
}

function renderGrid(stations) {
  const grid = document.getElementById("udaraGrid");
  if (!grid) return;

  if (!Array.isArray(stations) || stations.length === 0) {
    grid.innerHTML = `<p class="fallback-text">Data kualitas udara tidak dapat dimuat saat ini.</p>`;
    return;
  }

  grid.innerHTML = stations.map((s, i) => {
    const level = getAqiLevel(s.aqi);
    return `
      <div class="aqi-card" style="border-color:${level.color}; cursor:pointer;" data-station-index="${i}">
        <div class="aqi-card-name">${s.name}</div>
        <div class="aqi-card-emoji" style="color:${level.color}">${level.emoji}</div>
        <div class="aqi-card-number" style="color:${level.color}">${s.aqi}</div>
        <div class="aqi-card-label">${level.label}</div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-station-index]").forEach(card => {
    card.addEventListener("click", () => {
      const s = stations[Number(card.dataset.stationIndex)];
      selectStation(s, { exact: true });
    });
  });
}

function selectStation(station, meta) {
  renderSelected(station, meta);
  if (map && station) {
    map.setView([station.lat, station.lon], 9);
    const marker = markers.find(m => {
      const ll = m.getLatLng();
      return ll.lat === station.lat && ll.lng === station.lon;
    });
    if (marker) marker.openPopup();
  }
}

// ---------- Pencarian ----------

async function geocodeQuery(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json&country=ID`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) && data.results.length > 0 ? data.results[0] : null;
}

function findDirectStationMatch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return allStations.find(s => s.name.toLowerCase().includes(q)) || null;
}

function findNearestStation(lat, lon) {
  if (allStations.length === 0) return null;
  let nearest = allStations[0];
  let minDist = distanceKm(lat, lon, nearest.lat, nearest.lon);
  for (const s of allStations.slice(1)) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return { station: nearest, distanceKm: minDist };
}

async function handleSearch(query) {
  if (!query.trim()) return;

  const direct = findDirectStationMatch(query);
  if (direct) {
    selectStation(direct, { exact: true });
    return;
  }

  try {
    const geo = await geocodeQuery(query);
    if (!geo) {
      renderSelected(null);
      return;
    }
    const nearest = findNearestStation(geo.latitude, geo.longitude);
    if (!nearest) {
      renderSelected(null);
      return;
    }
    selectStation(nearest.station, {
      exact: false,
      queryLabel: `${geo.name}${geo.admin1 ? ", " + geo.admin1 : ""}`,
      distanceKm: nearest.distanceKm,
    });
  } catch (err) {
    console.error("Bencanaku (udara): pencarian gagal —", err);
    renderSelected(null);
  }
}

function setupSearch() {
  const input = document.getElementById("udaraSearch");
  const list = document.getElementById("udaraSearchResults");
  if (!input || !list) return;

  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; return; }

    debounceTimer = setTimeout(() => {
      const matches = allStations.filter(s => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
      if (matches.length === 0) {
        list.hidden = true;
        return;
      }
      list.innerHTML = matches.map((s, i) => `<li data-index="${i}">${s.name}</li>`).join("");
      list.hidden = false;

      list.querySelectorAll("li[data-index]").forEach(li => {
        li.addEventListener("click", () => {
          const s = matches[Number(li.dataset.index)];
          input.value = s.name;
          list.hidden = true;
          selectStation(s, { exact: true });
        });
      });
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      list.hidden = true;
      handleSearch(input.value);
    }
  });

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) list.hidden = true;
  });
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initMap();
  } catch (err) {
    console.error("Bencanaku (udara): gagal init peta —", err);
  }

  try {
    const data = await loadStationsData();
    allStations = Array.isArray(data.stations) ? data.stations : [];
    fetchedAtUTC = data.fetchedAtUTC || null;

    const note = document.getElementById("udaraMapNote");
    if (note && fetchedAtUTC) note.textContent = `Diperbarui ${fetchedTimeLabel()}`;

    allStations.sort((a, b) => b.aqi - a.aqi);
    renderMapMarkers(allStations);
    renderGrid(allStations);

    if (allStations.length === 0) {
      renderSelected(null);
    }
  } catch (err) {
    console.error("Bencanaku (udara): gagal memuat data stasiun —", err);
    document.getElementById("udaraGrid").innerHTML =
      `<p class="fallback-text">Data kualitas udara tidak dapat dimuat saat ini.</p>`;
    document.getElementById("udaraSelected").innerHTML =
      `<p class="fallback-text">Data kualitas udara tidak dapat dimuat saat ini.</p>`;
  }

  setupSearch();
});
