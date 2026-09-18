/*
  Bencanaku — cuaca.js
  Fetch langsung ke Open-Meteo dari browser (tanpa API key, tanpa GitHub
  Actions) — beda dari pola Gempa/Udara karena search wilayah butuh query
  live ke koordinat manapun yang diketik, bukan wilayah tetap.
*/
 
// Default: Jakarta Timur, konsisten dengan wilayah default di halaman lain
const DEFAULT_LOCATION = { name: "Jakarta Timur", admin: "Jakarta, Indonesia", lat: -6.2250, lon: 106.9004 };
 
// Kode cuaca WMO (dipakai Open-Meteo) → label + emoji dalam bahasa Indonesia
const WEATHER_CODES = {
  0:  { label: "Cerah", emoji: "☀️" },
  1:  { label: "Cerah berawan", emoji: "🌤️" },
  2:  { label: "Berawan sebagian", emoji: "⛅" },
  3:  { label: "Berawan", emoji: "☁️" },
  45: { label: "Berkabut", emoji: "🌫️" },
  48: { label: "Berkabut", emoji: "🌫️" },
  51: { label: "Gerimis ringan", emoji: "🌦️" },
  53: { label: "Gerimis", emoji: "🌦️" },
  55: { label: "Gerimis lebat", emoji: "🌦️" },
  56: { label: "Gerimis beku", emoji: "🌧️" },
  57: { label: "Gerimis beku lebat", emoji: "🌧️" },
  61: { label: "Hujan ringan", emoji: "🌧️" },
  63: { label: "Hujan", emoji: "🌧️" },
  65: { label: "Hujan lebat", emoji: "🌧️" },
  66: { label: "Hujan beku", emoji: "🌨️" },
  67: { label: "Hujan beku lebat", emoji: "🌨️" },
  71: { label: "Salju ringan", emoji: "🌨️" },
  73: { label: "Salju", emoji: "🌨️" },
  75: { label: "Salju lebat", emoji: "❄️" },
  77: { label: "Butiran salju", emoji: "❄️" },
  80: { label: "Hujan lokal ringan", emoji: "🌦️" },
  81: { label: "Hujan lokal", emoji: "🌧️" },
  82: { label: "Hujan lokal deras", emoji: "🌧️" },
  85: { label: "Salju lokal ringan", emoji: "🌨️" },
  86: { label: "Salju lokal lebat", emoji: "🌨️" },
  95: { label: "Badai petir", emoji: "⛈️" },
  96: { label: "Badai petir + hujan es", emoji: "⛈️" },
  99: { label: "Badai petir + hujan es lebat", emoji: "⛈️" },
};
 
function weatherInfo(code) {
  return WEATHER_CODES[code] || { label: "Tidak diketahui", emoji: "❓" };
}
 
function windDirectionLabel(deg) {
  const dirs = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}
 
function dayNameShort(dateStr) {
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return days[new Date(dateStr).getDay()];
}
 
function uvCategory(uv) {
  if (uv < 3) return "Rendah";
  if (uv < 6) return "Sedang";
  if (uv < 8) return "Tinggi";
  if (uv < 11) return "Sangat tinggi";
  return "Ekstrem";
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
  const input = document.getElementById("weatherSearch");
  const list = document.getElementById("weatherSearchResults");
  if (!input || !list) return;
 
  input.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    const query = input.value.trim();
    if (query.length < 3) {
      list.hidden = true;
      return;
    }
    searchDebounce = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        if (results.length === 0) {
          list.innerHTML = `<li style="cursor:default; color:var(--text-faint);">Tidak ditemukan</li>`;
          list.hidden = false;
          return;
        }
        list.innerHTML = results.map((r, i) => `
          <li data-index="${i}">
            ${r.name}${r.admin1 ? ", " + r.admin1 : ""}
          </li>
        `).join("");
        list.hidden = false;
 
        list.querySelectorAll("li[data-index]").forEach(li => {
          li.addEventListener("click", () => {
            const r = results[Number(li.dataset.index)];
            input.value = `${r.name}${r.admin1 ? ", " + r.admin1 : ""}`;
            list.hidden = true;
            loadWeather({
              name: r.name,
              admin: `${r.admin1 || ""}${r.admin1 ? ", " : ""}Indonesia`,
              lat: r.latitude,
              lon: r.longitude,
            });
          });
        });
      } catch (err) {
        console.error("Bencanaku (cuaca): pencarian gagal —", err);
      }
    }, 350);
  });
 
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) list.hidden = true;
  });
}
 
// ---------- Ambil & render data cuaca ----------
 
function safeSet(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
 
function renderHero(location, current) {
  const wx = weatherInfo(current.weather_code);
  safeSet("weatherHero", `
    <div class="weather-location">${location.name.toUpperCase()}</div>
    <div class="weather-location-sub">${location.admin}</div>
    <div class="weather-hero-main">
      <div class="weather-hero-temp">${Math.round(current.temperature_2m)}°</div>
      <div class="weather-hero-meta">
        <div>Terasa seperti ${Math.round(current.apparent_temperature)}°</div>
        <div class="weather-condition">${wx.emoji} ${wx.label}</div>
      </div>
    </div>
    <div class="weather-hero-stats">
      <span>Kelembapan ${current.relative_humidity_2m}%</span>
      <span>Angin ${Math.round(current.wind_speed_10m)} km/j</span>
      <span>↗ ${windDirectionLabel(current.wind_direction_10m)}</span>
    </div>
  `);
}
 
function renderToday(current, dailyToday) {
  safeSet("weatherToday", `
    <div class="weather-today-item">
      <div class="weather-today-icon">🌧</div>
      <div class="weather-today-value">${dailyToday.precipitation_probability_max}%</div>
      <div class="weather-today-label">Peluang hujan</div>
    </div>
    <div class="weather-today-item">
      <div class="weather-today-icon">🌡</div>
      <div class="weather-today-value">${Math.round(dailyToday.temperature_2m_min)}° — ${Math.round(dailyToday.temperature_2m_max)}°</div>
      <div class="weather-today-label">Suhu</div>
    </div>
    <div class="weather-today-item">
      <div class="weather-today-icon">☁</div>
      <div class="weather-today-value">${current.cloud_cover}%</div>
      <div class="weather-today-label">Tutupan awan</div>
    </div>
    <div class="weather-today-item">
      <div class="weather-today-icon">💨</div>
      <div class="weather-today-value">${Math.round(dailyToday.wind_speed_10m_max)} km/j</div>
      <div class="weather-today-label">Angin maks.</div>
    </div>
  `);
}
 
function renderWeekly(daily) {
  const items = daily.time.map((date, i) => {
    const wx = weatherInfo(daily.weather_code[i]);
    return `
      <div class="weather-day">
        <div class="weather-day-name">${dayNameShort(date)}</div>
        <div class="weather-day-icon">${wx.emoji}</div>
        <div class="weather-day-temp">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="weather-day-temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
        <div class="weather-day-rain">${daily.precipitation_probability_max[i]}%</div>
      </div>
    `;
  }).join("");
  safeSet("weatherWeekly", items);
}
 
function renderHourly(hourly) {
  const now = new Date();
  let startIdx = hourly.time.findIndex(t => new Date(t) >= now);
  if (startIdx === -1) startIdx = 0;
 
  const items = hourly.time.slice(startIdx, startIdx + 24).map((t, i) => {
    const idx = startIdx + i;
    const wx = weatherInfo(hourly.weather_code[idx]);
    const hour = new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="weather-hour">
        <div class="weather-hour-time">${hour}</div>
        <div class="weather-hour-icon">${wx.emoji}</div>
        <div class="weather-hour-temp">${Math.round(hourly.temperature_2m[idx])}°</div>
      </div>
    `;
  }).join("");
  safeSet("weatherHourly", items);
}
 
function renderContext(current, dailyToday) {
  const rows = [];
 
  if (dailyToday.precipitation_probability_max >= 50) {
    rows.push({
      icon: "🌧",
      title: "Potensi hujan meningkat",
      desc: `Kemungkinan presipitasi ${dailyToday.precipitation_probability_max}% dalam periode prakiraan hari ini.`,
    });
  } else {
    rows.push({
      icon: "🌤",
      title: "Potensi hujan rendah",
      desc: `Kemungkinan presipitasi hari ini sekitar ${dailyToday.precipitation_probability_max}%.`,
    });
  }
 
  const windLevel = dailyToday.wind_speed_10m_max >= 40 ? "cukup tinggi" : "relatif rendah";
  rows.push({
    icon: "💨",
    title: `Angin ${windLevel}`,
    desc: `Kecepatan angin maksimum hari ini diperkirakan ${Math.round(dailyToday.wind_speed_10m_max)} km/j.`,
  });
 
  if (typeof dailyToday.uv_index_max === "number") {
    rows.push({
      icon: "☀️",
      title: `Indeks UV: ${uvCategory(dailyToday.uv_index_max)}`,
      desc: `Indeks UV maksimum hari ini: ${dailyToday.uv_index_max.toFixed(1)}.`,
    });
  }
 
  safeSet("weatherContext", rows.map(r => `
    <div class="weather-context-row">
      <span class="weather-context-icon">${r.icon}</span>
      <div>
        <div class="weather-context-title">${r.title}</div>
        <div class="weather-context-desc">${r.desc}</div>
      </div>
    </div>
  `).join(""));
}
 
function renderError() {
  const msg = `<p class="fallback-text">Gagal memuat data cuaca. Coba muat ulang halaman.</p>`;
  ["weatherHero", "weatherToday", "weatherWeekly", "weatherHourly", "weatherContext"].forEach(id => safeSet(id, msg));
}
 
async function loadWeather(location) {
  try {
    const params = new URLSearchParams({
      latitude: location.lat,
      longitude: location.lon,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,relative_humidity_2m,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,wind_speed_10m_max",
      forecast_days: "7",
      timezone: "auto",
    });
 
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
 
    const dailyToday = {
      temperature_2m_max: data.daily.temperature_2m_max[0],
      temperature_2m_min: data.daily.temperature_2m_min[0],
      precipitation_probability_max: data.daily.precipitation_probability_max[0],
      wind_speed_10m_max: data.daily.wind_speed_10m_max[0],
      uv_index_max: data.daily.uv_index_max ? data.daily.uv_index_max[0] : null,
    };
 
    renderHero(location, data.current);
    renderToday(data.current, dailyToday);
    renderWeekly(data.daily);
    renderHourly(data.hourly);
    renderContext(data.current, dailyToday);
  } catch (err) {
    console.error("Bencanaku (cuaca): gagal memuat cuaca —", err);
    renderError();
  }
}
 
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  loadWeather(DEFAULT_LOCATION);
});
 
