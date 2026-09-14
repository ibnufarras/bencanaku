// ============================================================
// Bencanaku — udara.js
// Peta + grid semua stasiun WAQI + search provinsi (perkiraan area)
// ============================================================

// Kotak koordinat perkiraan per provinsi (lat_min, lat_max, lon_min, lon_max)
// CATATAN: ini perkiraan area, bukan batas administratif resmi.
const PROVINCES = [
  { name: "Aceh", box: [2, 6, 95, 98.5] },
  { name: "Sumatera Utara", box: [-0.5, 4.5, 97, 100.5] },
  { name: "Sumatera Barat", box: [-3.5, 0.5, 98.5, 101.5] },
  { name: "Riau", box: [-1.5, 2.5, 100, 103.5] },
  { name: "Kepulauan Riau", box: [-1, 5, 103.5, 109] },
  { name: "Jambi", box: [-3, 0, 101, 104.5] },
  { name: "Sumatera Selatan", box: [-4.5, 0, 102, 106] },
  { name: "Kepulauan Bangka Belitung", box: [-4, 0, 105, 108.5] },
  { name: "Bengkulu", box: [-5.5, -2, 101, 104] },
  { name: "Lampung", box: [-6, -3.5, 103.5, 106] },
  { name: "DKI Jakarta", box: [-6.4, -5.9, 106.6, 107.0] },
  { name: "Jawa Barat", box: [-7.8, -5.9, 106, 108.9] },
  { name: "Banten", box: [-7, -5.7, 105.1, 106.8] },
  { name: "Jawa Tengah", box: [-8.2, -6.5, 108.5, 111.5] },
  { name: "DI Yogyakarta", box: [-8.3, -7.5, 110, 110.8] },
  { name: "Jawa Timur", box: [-8.8, -6.9, 111, 114.5] },
  { name: "Bali", box: [-8.9, -8.0, 114.4, 115.7] },
  { name: "Nusa Tenggara Barat", box: [-9.1, -8.0, 115.7, 119.3] },
  { name: "Nusa Tenggara Timur", box: [-11, -8.0, 118.9, 125.2] },
  { name: "Kalimantan Barat", box: [-3, 3, 108.5, 114.5] },
  { name: "Kalimantan Tengah", box: [-3.5, -0.5, 110.5, 115.5] },
  { name: "Kalimantan Selatan", box: [-4.3, -1.5, 114, 116.5] },
  { name: "Kalimantan Timur", box: [-2.5, 4, 113.5, 119.5] },
  { name: "Kalimantan Utara", box: [1.5, 4.5, 115, 118.5] },
  { name: "Sulawesi Utara", box: [-0.5, 4.7, 121.5, 127] },
  { name: "Gorontalo", box: [0, 1.2, 121.3, 123.6] },
  { name: "Sulawesi Tengah", box: [-3.5, 1.5, 119, 124.5] },
  { name: "Sulawesi Barat", box: [-3.5, -0.5, 118.5, 120] },
  { name: "Sulawesi Selatan", box: [-7.5, -0.5, 118.5, 121.5] },
  { name: "Sulawesi Tenggara", box: [-6, 2, 120.5, 124] },
  { name: "Maluku", box: [-8.5, 0, 125, 135] },
  { name: "Maluku Utara", box: [-1, 3, 124.5, 129.5] },
  { name: "Papua Barat", box: [-4, 0, 130, 134.5] },
  { name: "Papua Barat Daya", box: [-4, 0, 130, 133] },
  { name: "Papua Tengah", box: [-5, -2, 135, 138] },
  { name: "Papua Pegunungan", box: [-5, -3, 137, 141] },
  { name: "Papua Selatan", box: [-9, -5, 137, 141] },
  { name: "Papua", box: [-5, -2, 136, 141] },
];

// Kategori AQI: batas bawah, label, warna, emoji
const AQI_LEVELS = [
  { max: 50, label: "Baik", color: "#22c55e", emoji: "😊" },
  { max: 100, label: "Sedang", color: "#eab308", emoji: "😐" },
  { max: 150, label: "Tidak sehat", color: "#f97316", emoji: "😷" },
  { max: 200, label: "Sangat tidak sehat", color: "#ef4444", emoji: "🤢" },
  { max: Infinity, label: "Berbahaya", color: "#7f1d1d", emoji: "☠️" },
];

function getAqiLevel(aqi) {
  return AQI_LEVELS.find((lvl) => aqi <= lvl.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

let map;
let markers = [];
let allStations = [];

// Data sekarang berbentuk { fetchedAtUTC, stations: [...] } — bukan array
// langsung — hasil dari workflow update-aqi-stations.yml (WAQI map/bounds).
async function loadStationsData() {
  const res = await fetch("data/aqi-stations.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat data stasiun");
  return res.json();
}

function setFetchedNote(fetchedAtUTC) {
  const note = document.getElementById("aqiFetchedNote");
  if (!note) return;
  if (fetchedAtUTC) {
    const fetchedLocal = new Date(fetchedAtUTC).toLocaleString("id-ID", {
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Jakarta"
    });
    note.textContent = `Data terakhir diambil ${fetchedLocal} WIB`;
  } else {
    note.textContent = "Menunggu pengambilan data pertama dari WAQI.";
  }
}

function initMap() {
  map = L.map("aqi-map", {
    minZoom: 4,
    maxBounds: [
      [-13, 90],
      [8, 142],
    ],
  }).setView([-2.5, 118], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function renderMap(stations) {
  clearMarkers();
  stations.forEach((s) => {
    const level = getAqiLevel(s.aqi);
    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 6,
      color: level.color,
      fillColor: level.color,
      fillOpacity: 0.8,
      weight: 1,
    }).bindPopup(
      `<strong>${s.name}</strong><br>AQI ${s.aqi} — ${level.label} ${level.emoji}`
    );
    marker.addTo(map);
    markers.push(marker);
  });
}

function renderGrid(stations, titleSuffix) {
  const grid = document.getElementById("aqi-grid");
  const title = document.getElementById("grid-title");
  title.textContent = titleSuffix ? `Stasiun di ${titleSuffix}` : "Semua stasiun";

  if (stations.length === 0) {
    if (titleSuffix) {
      grid.innerHTML = "<p>Tidak ada stasiun WAQI yang ditemukan di area ini.</p>";
    } else {
      grid.innerHTML = "<p>Data stasiun belum tersedia saat ini. Coba muat ulang beberapa saat lagi.</p>";
    }
    return;
  }

  grid.innerHTML = stations
    .map((s) => {
      const level = getAqiLevel(s.aqi);
      return `
        <div class="aqi-card" style="border-color:${level.color}">
          <div class="aqi-card-name">${s.name}</div>
          <div class="aqi-card-emoji" style="color:${level.color}">${level.emoji}</div>
          <div class="aqi-card-number" style="color:${level.color}">${s.aqi}</div>
          <div class="aqi-card-label">${level.label}</div>
        </div>
      `;
    })
    .join("");
}

function findProvince(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return PROVINCES.find((p) => p.name.toLowerCase().includes(q));
}

function filterByBox(stations, box) {
  const [latMin, latMax, lonMin, lonMax] = box;
  return stations.filter(
    (s) => s.lat >= latMin && s.lat <= latMax && s.lon >= lonMin && s.lon <= lonMax
  );
}

function handleSearch(query) {
  const province = findProvince(query);
  if (!province) {
    // provinsi tidak ketemu / input kosong -> tampilkan semua
    renderGrid(allStations, null);
    if (map) map.setView([-2.5, 118], 5);
    renderMap(allStations);
    return;
  }
  const filtered = filterByBox(allStations, province.box);
  renderGrid(filtered, province.name);
  if (map) {
    const [latMin, latMax, lonMin, lonMax] = province.box;
    map.fitBounds([
      [latMin, lonMin],
      [latMax, lonMax],
    ]);
  }
  renderMap(filtered.length ? filtered : allStations);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initMap();
  } catch (err) {
    console.error("Gagal memuat peta:", err);
    document.getElementById("aqi-map").innerHTML =
      "<p>Peta gagal dimuat.</p>";
  }

  try {
    loadStationsData()
      .then((data) => {
        const stations = Array.isArray(data.stations) ? data.stations : [];
        setFetchedNote(data.fetchedAtUTC);
        allStations = stations.sort((a, b) => b.aqi - a.aqi);
        renderGrid(allStations, null);
        renderMap(allStations);
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("aqi-grid").innerHTML =
          "<p>Data stasiun belum tersedia.</p>";
        const note = document.getElementById("aqiFetchedNote");
        if (note) note.textContent = "Gagal memuat data. Coba muat ulang halaman.";
      });
  } catch (err) {
    console.error("Gagal memuat data stasiun:", err);
  }

  try {
    const searchInput = document.getElementById("provinsi-search");
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleSearch(e.target.value), 300);
    });
  } catch (err) {
    console.error("Gagal memasang search:", err);
  }
});
