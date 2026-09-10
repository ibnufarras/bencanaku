/*
  Bencanaku — homepage logic

  Prinsip penting:
  - Status nasional (banner status 2x2) dan peta gempa SELALU nasional,
    tidak berubah oleh pilihan dropdown "Wilayah kamu".
  - Dropdown wilayah HANYA mengubah card "Wilayah kamu" (data lokal).
  - Data gempa: real dari data/gempa-bmkg.json (hasil GitHub Actions BMKG).
    Kalau belum tersedia/gagal, tampil fallback yang jelas ditandai contoh,
    bukan dianggap kosong diam-diam.
  - Data cuaca/gunung api/risiko wilayah: masih contoh, belum live.
*/

// Status nasional — masih contoh, belum live (menyusul setelah gempa stabil)
const NATIONAL_STATUS_SUMMARY = {
  activeAlerts: 2,
  tsunamiWarning: false,
  weatherAlerts: 8,
  volcanoUpdates: 1,
};

const MOCK_UPDATED_AT = "06:42 WIB";

// Data lokal per wilayah — HANYA dipakai untuk card "Wilayah kamu",
// tidak memengaruhi status nasional maupun peta gempa.
const REGIONS = {
  "Jakarta Timur": [
    { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
    { label: "Kualitas udara", value: "112 — Tidak sehat bagi kelompok sensitif", tone: "orange", technical: true, source: "Data pihak ketiga" },
    { label: "Risiko banjir", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    { label: "Risiko gempa", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
  ],
  "Bandung": [
    { label: "Peringatan resmi", value: "Waspada longsor", tone: "yellow", technical: false, source: "BNPB" },
    { label: "Kualitas udara", value: "68 — Sedang", tone: "yellow", technical: true, source: "Data pihak ketiga" },
    { label: "Risiko banjir", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    { label: "Risiko gempa", value: "Tinggi", tone: "orange", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
  ],
  "Surabaya": [
    { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
    { label: "Kualitas udara", value: "95 — Sedang", tone: "yellow", technical: true, source: "Data pihak ketiga" },
    { label: "Risiko banjir", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    { label: "Risiko gempa", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
  ],
  "Yogyakarta": [
    { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
    { label: "Kualitas udara", value: "54 — Baik", tone: "green", technical: true, source: "Data pihak ketiga" },
    { label: "Risiko banjir", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    { label: "Risiko gempa", value: "Tinggi", tone: "orange", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
  ],
};

// Dipakai kalau data BMKG belum berhasil diambil (fallback, ditandai jelas)
const FALLBACK_EVENTS = [
  { severity: "red", title: "Gempa M5.2", location: "Maluku", detail: "Kedalaman 10 km", time: "10 menit lalu", timeActual: "06:32 WIB", source: "BMKG (contoh)" },
  { severity: "red", title: "Gempa M4.1", location: "Selat Sunda", detail: "Kedalaman 24 km", time: "3 jam lalu", timeActual: "03:15 WIB", source: "BMKG (contoh)" },
];

let ACTIVE_EVENTS = FALLBACK_EVENTS;
let usingRealQuakeData = false;
let currentRegion = "Jakarta Timur";
let mapInstance = null;

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

// Ambil arah + nilai dari string BMKG seperti "6.2 LS" atau "106.8 BT"
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

// Koordinat asli tiap gempa. Prioritas: Lintang/Bujur (ada arah mata angin,
// jadi tidak ambigu). Fallback: field Coordinates, asumsi "lat,lon".
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

let lastQuakeList = [];

async function loadRealEarthquakes() {
  try {
    const res = await fetch("data/gempa-bmkg.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data && data.Infogempa && data.Infogempa.gempa;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("Belum ada data gempa dari BMKG (menunggu run pertama).");
    }

    lastQuakeList = list;

    const realQuakes = list.slice(0, 5).map(item => ({
      severity: "red",
      title: `Gempa M${item.Magnitude}`,
      location: item.Wilayah || "Lokasi tidak diketahui",
      detail: `Kedalaman ${item.Kedalaman || "?"}${item.Potensi ? " · " + item.Potensi : ""}`,
      time: item.DateTime ? formatRelativeTime(item.DateTime) : (item.Jam || ""),
      timeActual: `${item.Jam || ""} · ${item.Tanggal || ""}`.trim(),
      source: "BMKG",
    }));

    ACTIVE_EVENTS = realQuakes;
    usingRealQuakeData = true;

    const fetchedNote = data.fetchedAtUTC
      ? new Date(data.fetchedAtUTC).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB"
      : null;

    const quakeNote = document.getElementById("quakeUpdatedNote");
    if (quakeNote && fetchedNote) quakeNote.textContent = `Data diambil ${fetchedNote}`;

    const mapNote = document.getElementById("mapUpdatedNote");
    if (mapNote && fetchedNote) mapNote.textContent = `Diperbarui ${fetchedNote}`;

  } catch (err) {
    console.warn("Bencanaku: pakai data contoh, BMKG belum tersedia —", err.message);
    ACTIVE_EVENTS = FALLBACK_EVENTS;
    lastQuakeList = [];
    usingRealQuakeData = false;
  }
}

function updateDemoBanner() {
  const banner = document.querySelector(".demo-banner");
  if (!banner) return;
  if (usingRealQuakeData) {
    banner.innerHTML = `<strong>Sebagian data live.</strong> Data gempa langsung dari BMKG, diperbarui otomatis tiap jam. Cuaca, gunung api, dan risiko wilayah masih data contoh.`;
  } else {
    banner.innerHTML = `<strong>Mode pratinjau.</strong> Data gempa BMKG belum tersedia saat ini (menunggu pembaruan). Data lain masih contoh.`;
  }
}

function getSavedRegion() {
  try {
    return localStorage.getItem("bencanaku:region") || "Jakarta Timur";
  } catch (err) {
    return "Jakarta Timur";
  }
}

function saveRegion(name) {
  try {
    localStorage.setItem("bencanaku:region", name);
  } catch (err) {
    // localStorage tidak tersedia (mode privat dsb) — abaikan, tidak fatal
  }
}

function safeRender(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    fn(el);
  } catch (err) {
    console.error(`Bencanaku: gagal render #${id}`, err);
    el.innerHTML = `<p class="fallback-text" style="color:var(--red)">Gagal memuat bagian ini. Coba muat ulang halaman.</p>`;
  }
}

// Status nasional — dipanggil SEKALI saat load, tidak tergantung dropdown
function renderNationalStatus() {
  safeRender("statusSummary", (el) => {
    const s = NATIONAL_STATUS_SUMMARY;
    const tsunamiText = s.tsunamiWarning ? "ada peringatan tsunami aktif" : "tidak ada peringatan tsunami";
    el.textContent = `Saat ini tercatat ${s.activeAlerts} peringatan aktif (contoh), ${tsunamiText}, ${s.weatherAlerts} peringatan cuaca, dan ${s.volcanoUpdates} update gunung api. Data cuaca & gunung api masih contoh.`;
  });

  const lu = document.getElementById("lastUpdated");
  if (lu) lu.textContent = `Terakhir diperbarui ${MOCK_UPDATED_AT}`;
}

function renderEvents() {
  safeRender("eventList", (el) => {
    el.innerHTML = ACTIVE_EVENTS.map((ev, i) => `
      <li class="event-item sev-${ev.severity}">
        <div class="event-title">${ev.title}</div>
        <div class="event-meta">
          <span>${ev.location}</span>
          <span>${ev.detail}</span>
        </div>
        <div class="event-time">
          ${ev.time} · ${ev.timeActual} · Sumber: ${ev.source}
          <button class="share-btn" data-event-index="${i}" type="button">Bagikan</button>
        </div>
      </li>
    `).join("");

    el.querySelectorAll(".share-btn").forEach(btn => {
      btn.addEventListener("click", () => shareEvent(ACTIVE_EVENTS[Number(btn.dataset.eventIndex)]));
    });
  });
}

function shareEvent(ev) {
  const text = `${ev.title} — ${ev.location} (${ev.detail}). ${ev.time}, sumber: ${ev.source}. Info selengkapnya di Bencanaku.`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert("Disalin ke clipboard.")).catch(() => alert(text));
  } else {
    alert(text);
  }
}

let realAqiData = null;

async function loadRealAqi() {
  try {
    const res = await fetch("data/aqi.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.fetchedAtUTC) throw new Error("AQI belum tersedia (token belum diisi / Action belum jalan).");
    realAqiData = data;
  } catch (err) {
    console.warn("Bencanaku: AQI masih contoh —", err.message);
    realAqiData = null;
  }
}

function aqiToneFromValue(aqi) {
  if (aqi <= 50) return "green";
  if (aqi <= 100) return "yellow";
  if (aqi <= 150) return "orange";
  return "red";
}

function aqiLabelFromValue(aqi) {
  if (aqi <= 50) return "Baik";
  if (aqi <= 100) return "Sedang";
  if (aqi <= 150) return "Tidak sehat bagi kelompok sensitif";
  return "Tidak sehat";
}

// Card "Wilayah kamu" — satu-satunya bagian yang berubah karena dropdown
function renderArea(regionName) {
  const label = document.getElementById("regionLabel");
  if (label) label.textContent = regionName;

  safeRender("areaReadout", (el) => {
    const rows = REGIONS[regionName].map(row => ({ ...row }));

    // Kalau AQI asli tersedia untuk wilayah ini, timpa baris mock-nya
    const realEntry = realAqiData && realAqiData[regionName];
    if (realEntry && realEntry.data && typeof realEntry.data.aqi !== "undefined") {
      const aqiRow = rows.find(r => r.label === "Kualitas udara");
      if (aqiRow) {
        const aqiVal = realEntry.data.aqi;
        aqiRow.value = `${aqiVal} — ${aqiLabelFromValue(aqiVal)}`;
        aqiRow.tone = aqiToneFromValue(aqiVal);
        aqiRow.source = "WAQI (live)";
      }
    }

    el.innerHTML = rows.map(row => `
      <div class="area-row">
        <div class="area-row-label">${row.label}</div>
        <div class="area-row-value">
          <span class="value tone-${row.tone}${row.technical ? " is-technical" : ""}">${row.value}</span>
          <span class="source">${row.source}</span>
        </div>
      </div>
    `).join("");
  });
}

function setupRegionDropdown() {
  const button = document.getElementById("regionSelect");
  const dropdown = document.getElementById("regionDropdown");
  if (!button || !dropdown) return;

  dropdown.innerHTML = Object.keys(REGIONS).map(name => `
    <li role="option" data-region="${name}" tabindex="0" aria-selected="${name === currentRegion}">${name}</li>
  `).join("");

  function closeDropdown() {
    dropdown.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }
  function openDropdown() {
    dropdown.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  button.addEventListener("click", () => {
    dropdown.hidden ? openDropdown() : closeDropdown();
  });

  dropdown.addEventListener("click", (e) => {
    const li = e.target.closest("[data-region]");
    if (!li) return;
    const name = li.dataset.region;
    currentRegion = name;
    saveRegion(name);
    renderArea(name); // HANYA area lokal — status nasional & peta tidak ikut berubah
    dropdown.querySelectorAll("li").forEach(item => {
      item.setAttribute("aria-selected", String(item.dataset.region === name));
    });
    closeDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== button && !button.contains(e.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });
}

function setupStickyHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  window.addEventListener("scroll", () => {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  }, { passive: true });
}

// Peta nasional — selalu Indonesia, markernya dari data gempa BMKG asli
function initLeafletMap(quakeList) {
  const container = document.getElementById("leafletMap");
  const fallbackNote = document.getElementById("mapFallbackNote");
  if (!container) return;

  if (typeof L === "undefined") {
    console.error("Bencanaku: library Leaflet gagal dimuat (cek koneksi/CDN).");
    if (fallbackNote) fallbackNote.hidden = false;
    return;
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
  }

  // Bersihkan marker lama sebelum gambar ulang
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) mapInstance.removeLayer(layer);
  });

  if (!Array.isArray(quakeList) || quakeList.length === 0) {
    const note = document.createElement("p");
    note.className = "map-empty-note";
    note.textContent = "Belum ada data gempa BMKG untuk ditampilkan di peta.";
    container.parentElement.insertBefore(note, container.nextSibling);
    return;
  }

  quakeList.slice(0, 15).forEach(item => {
    const coords = parseQuakeCoords(item);
    if (!coords) return;

    const mag = parseFloat(item.Magnitude) || 3;
    // Radius kecil & proporsional. Ini titik lokasi, bukan area dampak —
    // jadi sengaja dikecilkan supaya tidak terlihat seperti area luas kena.
    const radius = Math.min(12, Math.max(4, mag * 1.6));

    const marker = L.circleMarker(coords, {
      radius,
      color: "#DD6363",
      weight: 1,
      fillColor: "#DD6363",
      fillOpacity: 0.55,
    }).addTo(mapInstance);

    marker.bindPopup(`
      <b>Magnitudo ${item.Magnitude || "?"}</b><br>
      ${item.Wilayah || "Lokasi tidak diketahui"}<br>
      Kedalaman: ${item.Kedalaman || "?"}<br>
      ${item.Jam || ""} · ${item.Tanggal || ""}<br>
      ${item.Potensi ? item.Potensi + "<br>" : ""}
      Sumber: BMKG
    `);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  currentRegion = getSavedRegion();
  if (!REGIONS[currentRegion]) currentRegion = "Jakarta Timur";

  try { renderNationalStatus(); } catch (e) { console.error("renderNationalStatus gagal", e); }
  try { renderArea(currentRegion); } catch (e) { console.error("renderArea gagal", e); }

  try {
    await loadRealAqi();
    renderArea(currentRegion); // render ulang kalau AQI asli berhasil masuk
  } catch (e) {
    console.error("loadRealAqi gagal", e);
  }

  try {
    await loadRealEarthquakes();
  } catch (e) {
    console.error("loadRealEarthquakes gagal", e);
  }

  try { updateDemoBanner(); } catch (e) { console.error("updateDemoBanner gagal", e); }
  try { renderEvents(); } catch (e) { console.error("renderEvents gagal", e); }
  try { initLeafletMap(lastQuakeList); } catch (e) { console.error("initLeafletMap gagal", e); }
  try { setupRegionDropdown(); } catch (e) { console.error("setupRegionDropdown gagal", e); }
  try { setupStickyHeader(); } catch (e) { console.error("setupStickyHeader gagal", e); }
});
