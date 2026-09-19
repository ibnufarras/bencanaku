/*
  Bencanaku — banjir.js
  Data debit sungai dari Open-Meteo Flood API (model GloFAS), fetch
  langsung dari browser — sama seperti Cuaca, tanpa API key.
 
  PENTING: river_discharge_mean/median/min/max/p25/p75 adalah STATISTIK
  HISTORIS jangka panjang untuk tanggal itu (bukan ringkasan periode
  prakiraan) — dipakai sebagai konteks "apakah debit hari ini normal
  dibanding biasanya", bukan ambang bahaya banjir.
*/
 
const DEFAULT_LOCATION = { name: "Jakarta", lat: -6.2088, lon: 106.8456 };
 
function fmtDischarge(val) {
  if (val === null || val === undefined) return "Tidak tersedia";
  return `${val.toLocaleString("id-ID", { maximumFractionDigits: 1 })} m³/s`;
}
 
function fmtDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
 
// ---------- Pencarian wilayah (Open-Meteo Geocoding, gratis tanpa token) ----------
 
let searchDebounce;
 
async function searchLocations(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=id&format=json&country=ID`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}
 
function setupSearch() {
  const input = document.getElementById("floodSearch");
  const list = document.getElementById("floodSearchResults");
  if (!input || !list) return;
 
  input.placeholder = `Cari wilayah… (saat ini: ${DEFAULT_LOCATION.name})`;
 
  input.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    const query = input.value.trim();
    if (query.length < 3) { list.hidden = true; return; }
 
    searchDebounce = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
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
            loadFloodData({ name: r.name, lat: r.latitude, lon: r.longitude });
          });
        });
      } catch (err) {
        console.error("Bencanaku (banjir): pencarian gagal —", err);
      }
    }, 350);
  });
 
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) list.hidden = true;
  });
}
 
// ---------- Render ----------
 
function safeSet(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
 
function renderHero(location, daily) {
  const discharge = daily.river_discharge[0];
  safeSet("floodHero", `
    <div class="flood-hero-location">${location.name.toUpperCase()}</div>
    <div class="flood-hero-label">Debit sungai</div>
    <div class="flood-hero-value">${fmtDischarge(discharge)}</div>
    <div class="flood-hero-date">Data untuk ${fmtDateShort(daily.time[0])}</div>
    <div class="flood-hero-note">Data model hidrologi — bukan konfirmasi bahwa banjir sedang terjadi.</div>
  `);
}
 
function renderStats(daily) {
  const items = [
    { label: "Rata-rata", value: daily.river_discharge_mean[0] },
    { label: "Median", value: daily.river_discharge_median[0] },
    { label: "Minimum", value: daily.river_discharge_min[0] },
    { label: "Maksimum", value: daily.river_discharge_max[0] },
  ];
  safeSet("floodStats", items.map(i => `
    <div class="flood-stat-item">
      <div class="flood-stat-value">${fmtDischarge(i.value)}</div>
      <div class="flood-stat-label">${i.label}</div>
    </div>
  `).join(""));
}
 
function renderTrend(daily) {
  const values = daily.river_discharge.filter(v => v !== null && v !== undefined);
  if (values.length < 2) {
    safeSet("floodTrend", `<p class="fallback-text">Data tidak cukup untuk menilai tren.</p>`);
    return;
  }
 
  const first = values[0];
  const last = values[values.length - 1];
  const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
 
  let text, icon;
  if (pctChange > 10) {
    text = `Debit meningkat sekitar ${pctChange.toFixed(0)}% dari ${fmtDateShort(daily.time[0])} ke ${fmtDateShort(daily.time[daily.time.length - 1])}.`;
    icon = "📈";
  } else if (pctChange < -10) {
    text = `Debit menurun sekitar ${Math.abs(pctChange).toFixed(0)}% dari ${fmtDateShort(daily.time[0])} ke ${fmtDateShort(daily.time[daily.time.length - 1])}.`;
    icon = "📉";
  } else {
    text = `Debit relatif stabil dalam periode prakiraan ini.`;
    icon = "➡️";
  }
 
  safeSet("floodTrend", `
    <div class="flood-trend-row">
      <span class="flood-trend-icon">${icon}</span>
      <span>${text}</span>
    </div>
  `);
}
 
function renderTable(daily) {
  const rows = daily.time.map((date, i) => `
    <tr>
      <td>${fmtDateShort(date)}</td>
      <td class="flood-table-num">${fmtDischarge(daily.river_discharge[i])}</td>
      <td class="flood-table-num">${fmtDischarge(daily.river_discharge_p25[i])}</td>
      <td class="flood-table-num">${fmtDischarge(daily.river_discharge_p75[i])}</td>
    </tr>
  `).join("");
  safeSet("floodTableBody", rows);
}
 
// Grafik SVG sederhana — tanpa library eksternal, biar halaman tetap ringan
function renderChart(daily) {
  const el = document.getElementById("floodChart");
  if (!el) return;
 
  const n = daily.time.length;
  const w = 700, h = 220, padX = 30, padY = 20;
 
  const allVals = [...daily.river_discharge, ...daily.river_discharge_p25, ...daily.river_discharge_p75].filter(v => v != null);
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
 
  const x = i => padX + (i / (n - 1)) * (w - padX * 2);
  const y = v => h - padY - ((v - minV) / (maxV - minV || 1)) * (h - padY * 2);
 
  const bandTop = daily.river_discharge_p75.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const bandBottom = daily.river_discharge_p25.map((v, i) => `${x(i)},${y(v)}`).reverse().join(" ");
  const linePoints = daily.river_discharge.map((v, i) => `${x(i)},${y(v)}`).join(" ");
 
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="flood-chart-svg" role="img" aria-label="Grafik prakiraan debit sungai">
      <polygon points="${bandTop} ${bandBottom}" fill="var(--green)" fill-opacity="0.15" stroke="none"></polygon>
      <polyline points="${linePoints}" fill="none" stroke="var(--green)" stroke-width="2"></polyline>
      ${daily.time.map((t, i) => `<text x="${x(i)}" y="${h - 4}" font-size="9" fill="var(--text-faint)" text-anchor="middle">${fmtDateShort(t)}</text>`).join("")}
    </svg>
  `;
}
 
function renderError() {
  const msg = `<p class="fallback-text">Data debit sungai tidak dapat dimuat saat ini. Coba muat ulang halaman.</p>`;
  ["floodHero", "floodStats", "floodChart", "floodTrend"].forEach(id => safeSet(id, msg));
  safeSet("floodTableBody", `<tr><td colspan="4" class="fallback-text">Data tidak tersedia.</td></tr>`);
}
 
// ---------- Fetch ----------
 
async function loadFloodData(location) {
  try {
    const params = new URLSearchParams({
      latitude: location.lat,
      longitude: location.lon,
      daily: "river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_min,river_discharge_p25,river_discharge_p75",
      timezone: "auto",
    });
 
    const res = await fetch(`https://flood-api.open-meteo.com/v1/flood?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
 
    if (!data.daily || !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
      throw new Error("Data harian kosong dari API.");
    }
 
    renderHero(location, data.daily);
    renderStats(data.daily);
    renderTrend(data.daily);
    renderTable(data.daily);
    renderChart(data.daily);
  } catch (err) {
    console.error("Bencanaku (banjir): gagal memuat data —", err);
    renderError();
  }
}
 
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  loadFloodData(DEFAULT_LOCATION);
});
 
