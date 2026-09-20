/*
  Bencanaku — karhutla.js
 
  Dua sumber hotspot yang SENGAJA dipisah, bukan dijumlahkan jadi satu
  angka, karena metodologinya beda:
  - NASA FIRMS: deteksi satelit mentah, 24 jam terakhir
  - BNPB: rekap kumulatif per laporan provinsi
 
  Sebaran asap: tidak ada produk resmi otomatis yang ditemukan, jadi
  section itu selalu honest empty state — bukan digambar sendiri.
*/
 
const BNPB_QUERY_URL = "https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_tabeldata_karhutla_prov_2026_v2/MapServer/3/query?where=1%3D1&outFields=*&f=geojson";
 
let map;
let markers = [];
 
// ---------- 1. Fetch ----------
 
async function fetchHotspotFirms() {
  const res = await fetch("data/hotspot-firms.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
 
async function fetchProvinceDataBnpb() {
  const res = await fetch(BNPB_QUERY_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
 
// ---------- 2. Normalize ----------
 
function normalizeFirms(raw) {
  return {
    fetchedAtUTC: raw.fetchedAtUTC || null,
    hotspots: Array.isArray(raw.hotspots) ? raw.hotspots : [],
  };
}
 
function normalizeBnpbProvinces(geojson) {
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  return features.map(f => {
    const p = f.properties || {};
    return {
      provinsi: p.provinsi || "Tidak diketahui",
      totalHotspot: typeof p.total_hotspot === "number" ? p.total_hotspot : null,
      luasLahanTerbakar: typeof p.luas_lahan_terbakar_sipongi_2026 === "number" ? p.luas_lahan_terbakar_sipongi_2026 : null,
      tanggalUpdate: p.tanggal_update || null,
    };
  });
}
 
// ---------- Util ----------
 
function fmtNumber(n) {
  if (n === null || n === undefined) return "Data belum tersedia";
  return n.toLocaleString("id-ID");
}
 
function fmtHectare(n) {
  if (n === null || n === undefined) return "Data belum tersedia";
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ha`;
}
 
function fmtDateOnly(val) {
  if (!val) return "Tidak tersedia";
  try {
    return new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return String(val);
  }
}
 
// ---------- 3. Render: summary ----------
 
function renderSummary(firms, provinces) {
  const el = document.getElementById("karhutlaSummary");
  if (!el) return;
 
  const firmsCount = firms.hotspots.length;
  const bnpbTotal = provinces.reduce((sum, p) => sum + (p.totalHotspot || 0), 0);
  const totalLuas = provinces.reduce((sum, p) => sum + (p.luasLahanTerbakar || 0), 0);
  const provinsiTerdampak = provinces.filter(p => (p.totalHotspot || 0) > 0).length;
 
  const cards = [
    { label: "Hotspot terdeteksi (FIRMS, 24 jam)", value: firms.fetchedAtUTC ? fmtNumber(firmsCount) : "Data belum tersedia" },
    { label: "Hotspot tercatat (BNPB, kumulatif)", value: provinces.length > 0 ? fmtNumber(bnpbTotal) : "Data belum tersedia" },
    { label: "Luas lahan terbakar 2026 (BNPB)", value: provinces.length > 0 ? fmtHectare(totalLuas) : "Data belum tersedia" },
    { label: "Provinsi terdampak (BNPB)", value: provinces.length > 0 ? fmtNumber(provinsiTerdampak) : "Data belum tersedia" },
  ];
 
  el.innerHTML = cards.map(c => `
    <div class="volcano-summary-card" style="border-left-color:#DD6363">
      <div class="volcano-summary-count" style="font-size:1.3rem;">${c.value}</div>
      <div class="volcano-summary-label">${c.label}</div>
    </div>
  `).join("");
}
 
// ---------- 3. Render: peta hotspot ----------
 
function renderMap(firms) {
  const container = document.getElementById("karhutlaMap");
  const fallback = document.getElementById("karhutlaMapFallback");
  if (!container) return;
 
  if (typeof L === "undefined") {
    console.error("Bencanaku (karhutla): Leaflet gagal dimuat.");
    if (fallback) fallback.hidden = false;
    return;
  }
 
  if (!map) {
    const indonesiaBounds = L.latLngBounds([-11.5, 92], [7, 145]);
    map = L.map(container, {
      scrollWheelZoom: false,
      minZoom: 4,
      maxBounds: indonesiaBounds.pad(0.25),
    }).fitBounds(indonesiaBounds);
 
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  }
 
  markers.forEach(m => map.removeLayer(m));
  markers = [];
 
  if (firms.hotspots.length === 0) return;
 
  // Batasi jumlah marker yang digambar biar tetap ringan
  firms.hotspots.slice(0, 2000).forEach(h => {
    const marker = L.circleMarker([h.lat, h.lon], {
      radius: 3,
      color: "#DD6363",
      weight: 1,
      fillColor: "#DD6363",
      fillOpacity: 0.75,
    });
 
    marker.bindPopup(`
      <b>Titik panas terdeteksi</b><br>
      ${h.acq_date || ""} ${h.acq_time || ""}<br>
      ${h.satellite ? "Satelit: " + h.satellite + "<br>" : ""}
      ${h.instrument ? "Sensor: " + h.instrument + "<br>" : ""}
      ${h.confidence ? "Confidence: " + h.confidence + "<br>" : ""}
      ${h.frp ? "FRP: " + h.frp + " MW<br>" : ""}
      Sumber: NASA FIRMS<br>
      <span style="font-size:11px; color:#8a8a8a;">Deteksi hotspot bukan konfirmasi pasti terjadinya kebakaran.</span>
    `);
    marker.addTo(map);
    markers.push(marker);
  });
}
 
// ---------- 3. Render: tabel provinsi ----------
 
function renderProvinceTable(provinces) {
  const el = document.getElementById("karhutlaProvTableBody");
  if (!el) return;
 
  if (provinces.length === 0) {
    el.innerHTML = `<tr><td colspan="4" class="fallback-text">Data karhutla tidak dapat dimuat saat ini.</td></tr>`;
    return;
  }
 
  const sorted = [...provinces].sort((a, b) => (b.totalHotspot || 0) - (a.totalHotspot || 0));
 
  el.innerHTML = sorted.map(p => `
    <tr>
      <td>${p.provinsi}</td>
      <td class="flood-table-num">${fmtNumber(p.totalHotspot)}</td>
      <td class="flood-table-num">${fmtHectare(p.luasLahanTerbakar)}</td>
      <td class="flood-table-num">${fmtDateOnly(p.tanggalUpdate)}</td>
    </tr>
  `).join("");
}
 
// ---------- Init ----------
 
async function init() {
  let firms = { fetchedAtUTC: null, hotspots: [] };
  let provinces = [];
  let firmsFailed = false;
  let bnpbFailed = false;
 
  try {
    firms = normalizeFirms(await fetchHotspotFirms());
  } catch (err) {
    console.error("Bencanaku (karhutla): gagal memuat FIRMS —", err);
    firmsFailed = true;
  }
 
  try {
    provinces = normalizeBnpbProvinces(await fetchProvinceDataBnpb());
  } catch (err) {
    console.error("Bencanaku (karhutla): gagal memuat BNPB —", err);
    bnpbFailed = true;
  }
 
  const updatedNote = document.getElementById("karhutlaUpdatedAt");
  if (updatedNote) {
    updatedNote.textContent = firms.fetchedAtUTC
      ? `Hotspot diperbarui ${new Date(firms.fetchedAtUTC).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Jakarta" })} WIB`
      : "Menunggu pembaruan data hotspot.";
  }
 
  renderSummary(firms, provinces);
  renderMap(firms);
  renderProvinceTable(provinces);
 
  // Kegagalan sebagian — jangan bikin seluruh halaman error
  if (firmsFailed && !bnpbFailed) {
    const note = document.getElementById("karhutlaMapFallback");
    if (note) { note.hidden = false; note.textContent = "Data hotspot FIRMS sementara tidak tersedia. Data provinsi BNPB tetap tersedia di bawah."; }
  } else if (bnpbFailed && !firmsFailed) {
    document.getElementById("karhutlaProvTableBody").innerHTML =
      `<tr><td colspan="4" class="fallback-text">Data provinsi BNPB sementara tidak tersedia. Data hotspot FIRMS tetap tersedia di peta.</td></tr>`;
  }
}
 
document.addEventListener("DOMContentLoaded", init);
