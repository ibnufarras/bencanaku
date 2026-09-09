/*
  Bencanaku — data contoh (mock)
  Struktur data di bawah sengaja dibuat menyerupai bentuk data yang nanti
  datang dari BMKG / BNPB-InaRISK / API cuaca & udara. Saat backend asli
  disambungkan, hanya bagian "ambil data" yang perlu diganti — fungsi
  render tetap sama.

  Catatan penting: setiap fungsi render dibungkus try/catch. Kalau salah
  satu gagal, bagian itu menampilkan pesan error yang jelas, bukan kosong
  diam-diam — supaya kalau ada masalah, gampang ketahuan dari tampilan.
*/

const REGIONS = {
  "Jakarta Timur": {
    status: [
      { level: "red",    count: 2, label: "Peringatan aktif" },
      { level: "green",  count: 0, label: "Peringatan tsunami" },
      { level: "orange", count: 8, label: "Peringatan cuaca" },
      { level: "yellow", count: 1, label: "Update gunung api" },
    ],
    area: [
      { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
      { label: "Kualitas udara", value: "112 — Tidak sehat bagi kelompok sensitif", tone: "orange", technical: true, source: "Data pihak ketiga" },
      { label: "Risiko banjir", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
      { label: "Risiko gempa", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    ],
  },
  "Bandung": {
    status: [
      { level: "yellow", count: 1, label: "Peringatan aktif" },
      { level: "green",  count: 0, label: "Peringatan tsunami" },
      { level: "orange", count: 3, label: "Peringatan cuaca" },
      { level: "yellow", count: 1, label: "Update gunung api" },
    ],
    area: [
      { label: "Peringatan resmi", value: "Waspada longsor", tone: "yellow", technical: false, source: "BNPB" },
      { label: "Kualitas udara", value: "68 — Sedang", tone: "yellow", technical: true, source: "Data pihak ketiga" },
      { label: "Risiko banjir", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
      { label: "Risiko gempa", value: "Tinggi", tone: "orange", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    ],
  },
  "Surabaya": {
    status: [
      { level: "green",  count: 0, label: "Peringatan aktif" },
      { level: "green",  count: 0, label: "Peringatan tsunami" },
      { level: "orange", count: 2, label: "Peringatan cuaca" },
      { level: "green",  count: 0, label: "Update gunung api" },
    ],
    area: [
      { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
      { label: "Kualitas udara", value: "95 — Sedang", tone: "yellow", technical: true, source: "Data pihak ketiga" },
      { label: "Risiko banjir", value: "Sedang", tone: "yellow", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
      { label: "Risiko gempa", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    ],
  },
  "Yogyakarta": {
    status: [
      { level: "yellow", count: 1, label: "Peringatan aktif" },
      { level: "green",  count: 0, label: "Peringatan tsunami" },
      { level: "orange", count: 1, label: "Peringatan cuaca" },
      { level: "orange", count: 1, label: "Update gunung api" },
    ],
    area: [
      { label: "Peringatan resmi", value: "Tidak ada", tone: "green", technical: false, source: "BMKG" },
      { label: "Kualitas udara", value: "54 — Baik", tone: "green", technical: true, source: "Data pihak ketiga" },
      { label: "Risiko banjir", value: "Rendah", tone: "green", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
      { label: "Risiko gempa", value: "Tinggi", tone: "orange", technical: false, source: "InaRISK · data historis, bukan prediksi hari ini" },
    ],
  },
};

const MOCK_UPDATED_AT = "06:42 WIB";

const MOCK_EVENTS = [
  { severity: "red", title: "Gempa M5.2", location: "Maluku", detail: "Kedalaman 10 km", time: "10 menit lalu", timeActual: "06:32 WIB", source: "BMKG" },
  { severity: "orange", title: "Hujan lebat", location: "Jawa Barat", detail: "Potensi genangan di beberapa wilayah", time: "18 menit lalu", timeActual: "06:24 WIB", source: "BMKG" },
  { severity: "yellow", title: "Peningkatan aktivitas", location: "Gunung Ile Lewotolok", detail: "Level II — Waspada", time: "1 jam lalu", timeActual: "05:40 WIB", source: "PVMBG" },
  { severity: "red", title: "Gempa M4.1", location: "Selat Sunda", detail: "Kedalaman 24 km", time: "3 jam lalu", timeActual: "03:15 WIB", source: "BMKG" },
];

const MOCK_MAP_MARKERS = [
  { x: 620, y: 130, kind: "red" },
  { x: 380, y: 118, kind: "orange" },
  { x: 470, y: 132, kind: "yellow" },
  { x: 140, y: 148, kind: "red" },
];

let currentRegion = "Jakarta Timur";

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

function renderStatusStrip(regionName) {
  safeRender("statusStrip", (el) => {
    const data = REGIONS[regionName].status;
    el.innerHTML = data.map(item => `
      <div class="status-item">
        <span class="status-dot dot-${item.level}"></span>
        <div>
          <div class="status-count">${item.count}</div>
          <div class="status-label">${item.label}</div>
        </div>
      </div>
    `).join("");
  });

  const lu = document.getElementById("lastUpdated");
  if (lu) lu.textContent = `Terakhir diperbarui ${MOCK_UPDATED_AT}`;
}

function renderMapMarkers() {
  safeRender("mapMarkers", (el) => {
    el.innerHTML = MOCK_MAP_MARKERS.map(m => `
      <g class="map-marker" transform="translate(${m.x}, ${m.y})">
        <circle class="ping" r="4" fill="var(--${m.kind})" fill-opacity="0.5"></circle>
        <circle r="4" fill="var(--${m.kind})"></circle>
      </g>
    `).join("");
  });
}

function renderEvents() {
  safeRender("eventList", (el) => {
    el.innerHTML = MOCK_EVENTS.map((ev, i) => `
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
      btn.addEventListener("click", () => shareEvent(MOCK_EVENTS[Number(btn.dataset.eventIndex)]));
    });
  });
}

function shareEvent(ev) {
  const text = `${ev.title} — ${ev.location} (${ev.detail}). ${ev.time}, sumber: ${ev.source}. Info selengkapnya di Bencanaku.`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert("Disalin ke clipboard.");
    }).catch(() => {
      alert(text);
    });
  } else {
    alert(text);
  }
}

function renderArea(regionName) {
  const label = document.getElementById("regionLabel");
  if (label) label.textContent = regionName;

  safeRender("areaReadout", (el) => {
    const rows = REGIONS[regionName].area;
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

function renderAll(regionName) {
  currentRegion = regionName;
  renderStatusStrip(regionName);
  renderArea(regionName);
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
    saveRegion(name);
    renderAll(name);
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

document.addEventListener("DOMContentLoaded", () => {
  currentRegion = getSavedRegion();
  if (!REGIONS[currentRegion]) currentRegion = "Jakarta Timur";

  renderAll(currentRegion);
  renderMapMarkers();
  renderEvents();
  setupRegionDropdown();
  setupStickyHeader();
});
