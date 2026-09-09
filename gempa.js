/*
  Halaman Gempa — menampilkan SEMUA data dari data/gempa-bmkg.json apa adanya.
  Tidak ada data contoh/dummy di halaman ini sesuai permintaan: kalau data
  BMKG belum tersedia, tampilkan pesan jujur, bukan gempa palsu.
*/

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

  el.innerHTML = list.map(item => {
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
        </div>
      </li>
    `;
  }).join("");
}

async function loadQuakePage() {
  try {
    const res = await fetch("data/gempa-bmkg.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data && data.Infogempa && data.Infogempa.gempa;

    renderQuakeList(Array.isArray(list) ? list : []);

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
    const note = document.getElementById("quakeFetchedNote");
    if (note) note.textContent = "Gagal memuat data. Coba muat ulang halaman.";
  }
}

document.addEventListener("DOMContentLoaded", loadQuakePage);

