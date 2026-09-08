/*
  Bencanaku — data contoh (mock)
  Struktur objek di bawah ini sengaja dibuat menyerupai bentuk data
  yang nantinya akan datang dari BMKG / BNPB-InaRISK / API cuaca & udara,
  supaya saat backend sungguhan disambungkan, hanya bagian "fetch data"
  yang perlu diganti — bagian render (di bawah) tetap sama.
*/
 
const MOCK_STATUS = [
  { level: "red",    count: 2, label: "Peringatan aktif" },
  { level: "green",  count: 0, label: "Peringatan tsunami" },
  { level: "orange", count: 8, label: "Peringatan cuaca" },
  { level: "yellow", count: 1, label: "Update gunung api" },
];
 
const MOCK_EVENTS = [
  {
    severity: "red",
    title: "Gempa M5.2",
    meta: "Maluku — kedalaman 10 km",
    time: "10 menit lalu",
    source: "BMKG",
  },
  {
    severity: "orange",
    title: "Hujan lebat",
    meta: "Jawa Barat — potensi genangan",
    time: "18 menit lalu",
    source: "BMKG",
  },
  {
    severity: "yellow",
    title: "Peningkatan aktivitas",
    meta: "Gunung Ile Lewotolok — Level II (Waspada)",
    time: "1 jam lalu",
    source: "PVMBG",
  },
  {
    severity: "red",
    title: "Gempa M4.1",
    meta: "Selat Sunda — kedalaman 24 km",
    time: "3 jam lalu",
    source: "BMKG",
  },
];
 
const MOCK_MAP_MARKERS = [
  { x: 620, y: 150, kind: "red" },
  { x: 380, y: 140, kind: "orange" },
  { x: 470, y: 155, kind: "yellow" },
  { x: 140, y: 175, kind: "red" },
];
 
const MOCK_AREA = {
  name: "Jakarta Timur",
  rows: [
    {
      label: "Peringatan resmi aktif",
      value: "Tidak ada",
      tone: "green",
      source: "BMKG",
    },
    {
      label: "Kualitas udara (AQI)",
      value: "112 — Tidak sehat bagi kelompok sensitif",
      tone: "orange",
      source: "Data udara pihak ketiga",
    },
    {
      label: "Risiko banjir wilayah",
      value: "Sedang",
      tone: "yellow",
      source: "InaRISK, data historis — bukan prediksi hari ini",
    },
    {
      label: "Risiko gempa wilayah",
      value: "Sedang",
      tone: "yellow",
      source: "InaRISK, data historis — bukan prediksi hari ini",
    },
  ],
};
 
function renderStatusStrip() {
  const el = document.getElementById("statusStrip");
  el.innerHTML = MOCK_STATUS.map(item => `
    <div class="status-item">
      <span class="status-dot dot-${item.level}"></span>
      <div>
        <div class="status-count">${item.count}</div>
        <div class="status-label">${item.label}</div>
      </div>
    </div>
  `).join("");
}
 
function renderMapMarkers() {
  const g = document.getElementById("mapMarkers");
  g.innerHTML = MOCK_MAP_MARKERS.map(m => `
    <g class="map-marker" transform="translate(${m.x}, ${m.y})">
      <circle class="ping" r="4" fill="var(--${m.kind})" fill-opacity="0.5"></circle>
      <circle r="4" fill="var(--${m.kind})"></circle>
    </g>
  `).join("");
}
 
function renderEvents() {
  const el = document.getElementById("eventList");
  el.innerHTML = MOCK_EVENTS.map(ev => `
    <li class="event-item sev-${ev.severity}">
      <div class="event-title">${ev.title}</div>
      <div class="event-meta">${ev.meta}</div>
      <div class="event-time">${ev.time} · Sumber: ${ev.source}</div>
    </li>
  `).join("");
}
 
function renderArea() {
  document.getElementById("regionLabel").textContent = MOCK_AREA.name;
  const el = document.getElementById("areaReadout");
  el.innerHTML = MOCK_AREA.rows.map(row => `
    <div class="area-row">
      <div class="area-row-label">${row.label}</div>
      <div class="area-row-value">
        <span class="value tone-${row.tone}">${row.value}</span>
        <span class="source">${row.source}</span>
      </div>
    </div>
  `).join("");
}
 
document.addEventListener("DOMContentLoaded", () => {
  renderStatusStrip();
  renderMapMarkers();
  renderEvents();
  renderArea();
});
 
