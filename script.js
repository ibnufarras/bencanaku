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

const MOCK_UPDATED_AT = "06:42 WIB";

const MOCK_EVENTS = [
  {
    severity: "red",
    title: "Gempa M5.2",
    location: "Maluku",
    detail: "Kedalaman 10 km",
    time: "10 menit lalu",
    timeActual: "06:32 WIB",
    source: "BMKG",
  },
  {
    severity: "orange",
    title: "Hujan lebat",
    location: "Jawa Barat",
    detail: "Potensi genangan di beberapa wilayah",
    time: "18 menit lalu",
    timeActual: "06:24 WIB",function renderEvents() {
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
 
