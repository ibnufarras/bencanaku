/*
  Bencanaku — mitigasi.js
  Halaman ini murni konten edukasi statis (bukan data live). Tidak ada
  fetch ke API apa pun. Konten ditulis ulang secara ringkas dari prinsip
  umum kesiapsiagaan bencana, bukan disalin dari satu sumber tertentu.
*/

const ICONS = {
  gempa: `<path d="M3 12h4l2-6 3 12 2-8 2 4h5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  tsunami: `<path d="M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/>`,
  "gunung-api": `<path d="M3 19 L10 6 L13 11 L15 8 L21 19 Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M13 6c1 1 1.5 2 0.5 3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  banjir: `<path d="M2 8h20M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/>`,
  longsor: `<path d="M2 19 L10 7 L14 13 L22 19 Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M2 19h20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  karhutla: `<path d="M12 3c2 3-1 4-1 7a3 3 0 106 0c0-1-0.5-2-1-2 1 4-2 5-2 8a4 4 0 11-8 0c0-3 2-4 2-7 0-2-1-3 0-6z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>`,
  "cuaca-ekstrem": `<path d="M7 16a4 4 0 010-8 5 5 0 019.6-1.5A4.5 4.5 0 0117 16H7z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><path d="M13 17l-2 4M17 17l-2 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  kekeringan: `<circle cx="12" cy="9" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v1.5M12 14.5V16M5 9h1.5M17.5 9H19M6.5 3.5l1 1M16.5 4.5l-1 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 20c2-1 4 1 6 0s4-1 6 0 4 1 6 0" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
};

const DISASTER_TOPICS = [
  {
    id: "gempa",
    name: "Gempa Bumi",
    shortDesc: "Kenali tempat aman dan langkah dasar saat guncangan terjadi.",
    source: { label: "BMKG", url: "https://www.bmkg.go.id" },
    before: [
      "Kenali tempat aman di rumah, sekolah, atau tempat kerja.",
      "Ketahui jalur evakuasi dan titik kumpul.",
      "Siapkan kebutuhan darurat seperlunya.",
      "Amankan benda yang berpotensi jatuh.",
    ],
    saat: [
      "Lindungi diri dari benda yang dapat jatuh.",
      "Tetap tenang dan ikuti prosedur keselamatan yang berlaku.",
      "Setelah guncangan berhenti, ikuti arahan evakuasi jika diperlukan.",
    ],
    setelah: [
      "Periksa kondisi sekitar dengan hati-hati.",
      "Ikuti informasi dan arahan resmi.",
      "Waspadai kemungkinan bahaya lanjutan sesuai kondisi.",
    ],
  },
  {
    id: "tsunami",
    name: "Tsunami",
    shortDesc: "Kenali tanda bahaya dan pentingnya segera menuju tempat aman.",
    source: { label: "BMKG", url: "https://www.bmkg.go.id" },
    before: [
      "Kenali apakah wilayah tempat tinggal berada di zona rawan tsunami.",
      "Ketahui jalur evakuasi menuju dataran tinggi terdekat.",
      "Pahami tanda alami seperti air laut yang surut secara tiba-tiba.",
    ],
    saat: [
      "Jika merasakan gempa kuat atau berlangsung lama di dekat pantai, segera menuju tempat yang lebih tinggi tanpa menunggu peringatan resmi.",
      "Ikuti peringatan dini tsunami dari BMKG jika tersedia.",
    ],
    setelah: [
      "Jangan kembali ke wilayah pesisir sebelum ada arahan resmi bahwa kondisi sudah aman.",
      "Waspadai kemungkinan gelombang susulan.",
    ],
  },
  {
    id: "gunung-api",
    name: "Gunung Api",
    shortDesc: "Pahami informasi aktivitas dan langkah kesiapsiagaan di sekitar gunung api.",
    source: { label: "PVMBG", url: "https://vsi.esdm.go.id" },
    before: [
      "Kenali status aktivitas gunung api di sekitar tempat tinggal melalui sumber resmi PVMBG.",
      "Pahami zona bahaya yang ditetapkan untuk wilayah tersebut.",
      "Siapkan masker dan pelindung mata sebagai antisipasi abu vulkanik.",
    ],
    saat: [
      "Ikuti rekomendasi resmi terkait zona bahaya.",
      "Gunakan masker untuk melindungi diri dari abu vulkanik jika diarahkan mengungsi.",
      "Ikuti arahan evakuasi dari PVMBG/BPBD setempat.",
    ],
    setelah: [
      "Ikuti arahan PVMBG/BPBD terkait waktu yang dianggap aman untuk kembali.",
      "Bersihkan abu vulkanik dengan hati-hati dan gunakan pelindung pernapasan.",
    ],
  },
  {
    id: "banjir",
    name: "Banjir",
    shortDesc: "Persiapkan diri menghadapi genangan, arus, dan kemungkinan evakuasi.",
    source: { label: "BNPB", url: "https://bnpb.go.id" },
    before: [
      "Pantau informasi cuaca dan peringatan dini banjir dari sumber resmi.",
      "Siapkan dokumen dan barang penting di tempat yang mudah dijangkau.",
    ],
    saat: [
      "Lindungi dokumen dan barang penting.",
      "Hindari melintasi arus air yang tidak diketahui kedalaman atau kekuatannya.",
      "Ikuti arahan evakuasi jika diminta oleh petugas setempat.",
    ],
    setelah: [
      "Periksa kondisi rumah dengan hati-hati sebelum masuk kembali.",
      "Waspadai risiko korsleting listrik dan air yang terkontaminasi.",
      "Ikuti arahan resmi terkait proses pembersihan.",
    ],
  },
  {
    id: "longsor",
    name: "Tanah Longsor",
    shortDesc: "Kenali tanda awal dan area yang berpotensi terdampak.",
    source: { label: "Badan Geologi / PVMBG", url: "https://vsi.esdm.go.id" },
    before: [
      "Kenali tanda area rawan longsor seperti lereng curam, retakan tanah, atau pohon yang mulai miring.",
      "Perhatikan kondisi cuaca, terutama saat hujan berkepanjangan.",
    ],
    saat: [
      "Segera menjauh dari area yang menunjukkan tanda pergerakan tanah.",
      "Ikuti arahan evakuasi dari petugas setempat.",
    ],
    setelah: [
      "Hindari mendekati area longsor karena risiko pergerakan susulan.",
      "Ikuti informasi dan arahan resmi mengenai kondisi wilayah.",
    ],
  },
  {
    id: "karhutla",
    name: "Kebakaran Hutan & Lahan",
    shortDesc: "Kenali risiko asap dan langkah menjaga keselamatan saat kualitas udara memburuk.",
    source: { label: "BNPB", url: "https://bnpb.go.id" },
    before: [
      "Pantau informasi kualitas udara dan titik panas di sekitar wilayah.",
      "Siapkan masker untuk mengurangi paparan asap.",
    ],
    saat: [
      "Kurangi aktivitas di luar ruangan saat kualitas udara memburuk.",
      "Gunakan masker yang sesuai untuk mengurangi paparan asap.",
      "Perhatikan kelompok rentan seperti anak-anak, lansia, dan penderita gangguan pernapasan.",
    ],
    setelah: [
      "Tetap pantau kualitas udara hingga kondisi membaik.",
      "Ikuti arahan pemerintah setempat terkait aktivitas luar ruangan.",
    ],
  },
  {
    id: "cuaca-ekstrem",
    name: "Cuaca Ekstrem",
    shortDesc: "Kenali tindakan saat hujan lebat, angin kencang, atau kondisi ekstrem.",
    source: { label: "BMKG", url: "https://www.bmkg.go.id" },
    before: [
      "Pantau peringatan dini cuaca dari BMKG secara berkala.",
    ],
    saat: [
      "Hindari area yang berpotensi berbahaya seperti pohon besar, papan reklame, atau area yang mudah tergenang saat cuaca ekstrem berlangsung.",
      "Ikuti arahan resmi setempat.",
    ],
    setelah: [
      "Periksa kondisi sekitar dengan hati-hati.",
      "Laporkan kerusakan pada pihak berwenang jika diperlukan.",
    ],
  },
  {
    id: "kekeringan",
    name: "Kekeringan",
    shortDesc: "Pahami langkah penghematan air dan kesiapsiagaan menghadapi kekeringan.",
    source: { label: "BMKG", url: "https://www.bmkg.go.id" },
    before: [
      "Kenali pola musim kemarau di wilayah setempat dan lakukan penghematan air sejak dini.",
    ],
    saat: [
      "Prioritaskan penggunaan air untuk kebutuhan pokok.",
      "Ikuti imbauan pemerintah daerah terkait pembatasan penggunaan air jika diberlakukan.",
    ],
    setelah: [
      "Ikuti arahan resmi terkait pemulihan pasokan air.",
      "Perhatikan informasi terkait pemulihan lahan pertanian jika terdampak.",
    ],
  },
];

const CHECKLIST_ITEMS = [
  "Mengetahui jalur evakuasi",
  "Mengetahui titik kumpul",
  "Menyimpan kontak penting",
  "Mengetahui sumber informasi resmi",
  "Menyiapkan kebutuhan darurat dasar",
];

const PHASE_LABELS = { sebelum: "SEBELUM", saat: "SAAT", setelah: "SETELAH" };

let preferredPhase = "sebelum";
let currentTopicId = null;

// ---------- Render kategori ----------

function renderGrid(filterText) {
  const grid = document.getElementById("mitigasiGrid");
  const empty = document.getElementById("mitigasiEmpty");
  if (!grid) return;

  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? DISASTER_TOPICS.filter(t => t.name.toLowerCase().includes(q) || t.shortDesc.toLowerCase().includes(q))
    : DISASTER_TOPICS;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  grid.innerHTML = filtered.map(t => `
    <button class="mitigasi-card" data-topic="${t.id}" aria-label="Pelajari ${t.name}">
      <span class="mitigasi-card-icon"><svg width="26" height="26" viewBox="0 0 24 24">${ICONS[t.id] || ""}</svg></span>
      <span class="mitigasi-card-body">
        <span class="mitigasi-card-name">${t.name}</span>
        <span class="mitigasi-card-desc">${t.shortDesc}</span>
      </span>
      <span class="mitigasi-card-arrow">→</span>
    </button>
  `).join("");

  grid.querySelectorAll("[data-topic]").forEach(card => {
    card.addEventListener("click", () => openTopic(card.dataset.topic));
  });
}

// ---------- Detail panel ----------

function openTopic(topicId) {
  const topic = DISASTER_TOPICS.find(t => t.id === topicId);
  if (!topic) return;
  currentTopicId = topicId;

  const section = document.getElementById("mitigasiDetailSection");
  const el = document.getElementById("mitigasiDetail");
  if (!section || !el) return;

  section.hidden = false;
  renderDetail(topic, preferredPhase);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDetail(topic, activePhase) {
  const el = document.getElementById("mitigasiDetail");
  if (!el) return;

  const phases = ["sebelum", "saat", "setelah"];
  const items = { sebelum: topic.before, saat: topic.saat, setelah: topic.setelah };

  el.innerHTML = `
    <div class="mitigasi-detail-header">
      <span class="mitigasi-card-icon"><svg width="28" height="28" viewBox="0 0 24 24">${ICONS[topic.id] || ""}</svg></span>
      <div>
        <div class="mitigasi-detail-title">${topic.name.toUpperCase()}</div>
        ${topic.source ? `<a href="${topic.source.url}" class="mitigasi-detail-source">Sumber acuan: ${topic.source.label}</a>` : ""}
      </div>
    </div>
    <div class="mitigasi-tabs" role="tablist">
      ${phases.map(p => `
        <button class="mitigasi-tab ${p === activePhase ? "active" : ""}" data-tab="${p}" role="tab" aria-selected="${p === activePhase}">
          ${PHASE_LABELS[p]}
        </button>
      `).join("")}
    </div>
    <ul class="mitigasi-detail-list">
      ${(items[activePhase] || []).map(li => `<li>${li}</li>`).join("")}
    </ul>
  `;

  el.querySelectorAll(".mitigasi-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      preferredPhase = tab.dataset.tab;
      renderDetail(topic, preferredPhase);
    });
  });
}

// ---------- Fase cepat & decision helper ----------

function setupPhaseButtons() {
  document.querySelectorAll(".mitigasi-phase-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      preferredPhase = btn.dataset.phase;
      document.getElementById("kategoriSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (currentTopicId) {
        const topic = DISASTER_TOPICS.find(t => t.id === currentTopicId);
        if (topic) renderDetail(topic, preferredPhase);
      }
    });
  });
}

function setupDecisionHelper() {
  const map = { sebelum: "sebelum", saat: "saat", setelah: "setelah", pahami: "sebelum" };
  document.querySelectorAll(".mitigasi-decision-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      preferredPhase = map[btn.dataset.decision] || "sebelum";
      document.getElementById("kategoriSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupFooterLinks() {
  document.querySelectorAll(".mitigasi-footer-link[data-topic]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openTopic(link.dataset.topic);
    });
  });
}

// ---------- Search ----------

function setupSearch() {
  const input = document.getElementById("mitigasiSearch");
  if (!input) return;
  input.addEventListener("input", () => renderGrid(input.value));
}

// ---------- Checklist (localStorage) ----------

function getChecklistState() {
  try {
    const raw = localStorage.getItem("bencanaku:mitigasi-checklist");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveChecklistState(state) {
  try {
    localStorage.setItem("bencanaku:mitigasi-checklist", JSON.stringify(state));
  } catch (e) {
    // localStorage tidak tersedia — checklist tetap berfungsi untuk sesi ini saja
  }
}

function renderChecklist() {
  const list = document.getElementById("mitigasiChecklist");
  if (!list) return;

  const state = getChecklistState();

  list.innerHTML = CHECKLIST_ITEMS.map((label, i) => `
    <li class="mitigasi-checklist-item">
      <label>
        <input type="checkbox" data-index="${i}" ${state[i] ? "checked" : ""}>
        <span>${label}</span>
      </label>
    </li>
  `).join("");

  list.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const s = getChecklistState();
      s[cb.dataset.index] = cb.checked;
      saveChecklistState(s);
      updateProgress();
    });
  });

  updateProgress();
}

function updateProgress() {
  const state = getChecklistState();
  const done = CHECKLIST_ITEMS.filter((_, i) => state[i]).length;
  const total = CHECKLIST_ITEMS.length;
  const pct = Math.round((done / total) * 100);

  const fill = document.getElementById("mitigasiProgressFill");
  const text = document.getElementById("mitigasiProgressText");
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${done} dari ${total} selesai`;
}

function setupChecklistReset() {
  const btn = document.getElementById("mitigasiResetBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    saveChecklistState({});
    renderChecklist();
  });
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  renderGrid("");
  setupSearch();
  setupPhaseButtons();
  setupDecisionHelper();
  setupFooterLinks();
  renderChecklist();
  setupChecklistReset();
});
