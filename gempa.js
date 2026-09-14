*
  Halaman Gempa — menampilkan SEMUA data dari data/gempa-bmkg.json apa adanya.
  Tidak ada data contoh/dummy di halaman ini: kalau data BMKG belum
  tersedia, tampilkan pesan jujur, bukan gempa palsu.
*/
 
let currentQuakeList = [];
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
 
function shareQuake(item) {
  const text = `Gempa M${item.Magnitude || "?"} — ${item.Wilayah || "Lokasi tidak diketahui"}, kedalaman ${item.Kedalaman || "?"}. ${item.Potensi || ""} ${item.Jam || ""} ${item.Tanggal || ""}, sumber: BMKG. Info selengkapnya di Bencanaku.`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert("Disalin ke clipboard.")).catch(() => alert(text));
  } else {
    alert(text);
  }
}
 
function renderQuakeList(list) {
  const el = document.getElementById("quakeFullList");
  if (!el) return;
 
  if (!Array.isArray(list) || list.length === 0) {
    el.innerHTML = `
      <li class="fallback-text">
        Data gempa BMKG belum tersedia saat ini. Halaman ini akan terisi otomatis
        setelah proses pengambilan data berjalan (paling lama 1 jam sekali).
      </li>`;
    return;
  }
 
  el.innerHTML = list.map((item, i) => {
    const relTime = item.DateTime ? formatRelativeTime(item.DateTime) : "";
    const timeActual = `${item.Jam || ""} · ${item.Tanggal || ""}`.trim();
    return `
      <li class="event-item sev-red">
        <div class="event-title">Gempa M${item.Magnitude || "?"}</div>
        <div class="event-meta">
          <span>${item.Wilayah || "Lokasi tidak diketahui"}</span>
          <span>Kedalaman ${item.Kedalaman || "?"}</span>
          <span>${item.Potensi || "Potensi tsunami: tidak dilaporkan"}</span>
        </div>
        <div class="event-time">
          ${relTime ? relTime + " · " : ""}${timeActual} · Sumber: BMKG
          <button class="share-btn" data-quake-index="${i}" type="button">Bagikan</button>
        </div>
      </li>
    `;
  }).join("");
 
  el.querySelectorAll(".share-btn").forEach(btn => {
    btn.addEventListener("click", () => shareQuake(list[Number(btn.dataset.quakeIndex)]));
  });
}
 
function initLeafletMap(quakeList) {
  const container = document.getElementById("leafletMap");
  const fallbackNote = document.getElementById("mapFallbackNote");
  if (!container) return;
 
  if (typeof L === "undefined") {
    console.error("Bencanaku (gempa.html): Leaflet gagal dimuat.");
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
 
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) mapInstance.removeLayer(layer);
  });
 
  if (!Array.isArray(quakeList) || quakeList.length === 0) return;
 
  quakeList.forEach(item => {
    const coords = parseQuakeCoords(item);
    if (!coords) return;
 
    const mag = parseFloat(item.Magnitude) || 3;
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
 
async function loadQuakePage() {
  try {
    const res = await fetch("data/gempa-bmkg.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data && data.Infogempa && data.Infogempa.gempa;
 
    currentQuakeList = Array.isArray(list) ? list : [];
    renderQuakeList(currentQuakeList);
    initLeafletMap(currentQuakeList);
 
    const note = document.getElementById("quakeFetchedNote");
    if (note) {
      if (data.fetchedAtUTC) {
        const fetchedLocal = new Date(data.fetchedAtUTC).toLocaleString("id-ID", {
          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Jakarta"
        });
        note.textContent = `Data terakhir diambil ${fetchedLocal} WIB`;
      } else {
        note.textContent = "Menunggu pengambilan data pertama dari BMKG.";
      }
    }
  } catch (err) {
    console.error("Bencanaku (gempa.html): gagal memuat data BMKG —", err);
    renderQuakeList([]);
    initLeafletMap([]);
    const note = document.getElementById("quakeFetchedNote");
    if (note) note.textContent = "Gagal memuat data. Coba muat ulang halaman.";
  }
}
 
document.addEventListener("DOMContentLoaded", loadQuakePage);
 
