/*
  Halaman Udara — menampilkan data AQI dari data/aqi.json (WAQI) apa adanya
  untuk 4 kota. Kalau data belum tersedia, tampilkan pesan jujur.
*/
 
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
 
function renderAqiGrid(data) {
  const el = document.getElementById("aqiGrid");
  if (!el) return;
 
  const cityKeys = Object.keys(data || {}).filter(k => k !== "fetchedAtUTC" && k !== "note");
  const validCities = cityKeys.filter(k => data[k] && data[k].data && typeof data[k].data.aqi !== "undefined");
 
  if (validCities.length === 0) {
    el.innerHTML = `
      <p class="fallback-text">
        Data kualitas udara belum tersedia saat ini. Halaman ini akan terisi
        otomatis setelah token WAQI aktif dan GitHub Actions berjalan.
      </p>`;
    return;
  }
 
  el.innerHTML = validCities.map(city => {
    const entry = data[city].data;
    const aqi = entry.aqi;
    const tone = aqiToneFromValue(aqi);
    const label = aqiLabelFromValue(aqi);
    const pollutant = entry.dominentpol ? entry.dominentpol.toUpperCase() : null;
    const stationTime = entry.time && entry.time.s ? entry.time.s : null;
 
    return `
      <div class="quake-card">
        <div class="event-title">${city}</div>
        <div class="event-meta">
          <span class="value tone-${tone}" style="font-size:1.4rem; font-weight:700; display:block; margin:6px 0;">${aqi} — ${label}</span>
          ${pollutant ? `<span>Polutan dominan: ${pollutant}</span>` : ""}
        </div>
        <div class="event-time">
          <span>${stationTime ? "Data stasiun: " + stationTime : ""} · Sumber: WAQI</span>
        </div>
      </div>
    `;
  }).join("");
}
 
async function loadAqiPage() {
  try {
    const res = await fetch("data/aqi.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
 
    renderAqiGrid(data);
 
    const note = document.getElementById("aqiFetchedNote");
    if (note) {
      if (data.fetchedAtUTC) {
        const fetchedLocal = new Date(data.fetchedAtUTC).toLocaleString("id-ID", {
          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Jakarta"
        });
        note.textContent = `Data terakhir diambil ${fetchedLocal} WIB`;
      } else {
        note.textContent = "Menunggu pengambilan data pertama dari WAQI.";
      }
    }
  } catch (err) {
    console.error("Bencanaku (udara.html): gagal memuat data AQI —", err);
    renderAqiGrid({});
    const note = document.getElementById("aqiFetchedNote");
    if (note) note.textContent = "Gagal memuat data. Coba muat ulang halaman.";
  }
}
 
document.addEventListener("DOMContentLoaded", loadAqiPage);
 
