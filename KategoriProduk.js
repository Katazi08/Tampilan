let token = "";

function setToken(externalToken) {
  token = externalToken;
}

window.setToken = setToken;

const select = document.getElementById("kategoriSelect");
const grid = document.getElementById("subGrid");
const produkContainer = document.getElementById("produkContainer");
const paginationContainer = document.getElementById("pagination");

let semuaData = [];
let currentPage = parseInt(localStorage.getItem("lastProductPage")) || 1;
const totalData = 20;
const maxPagesToShow = 5;
let produkCache = {};

const groupMap = {
  "Elektronik Rumah": ["Televisi", "Kipas Angin", "AC", "Lampu", "Speaker", "Mesin Cuci", "Dispenser", "Kulkas"],
  "Peralatan Dapur": ["Rice Cooker", "Blender", "Mixer", "Juicer", "Microwave", "Kompor Gas", "Oven", "Teko Listrik"],
  "Perlengkapan Rumah": ["Karpet", "Gorden", "Seprai", "Bantal", "Keset", "Tempat Sampah", "Jam Dinding", "Rak Sepatu"],
  "Perlengkapan Masak": ["Wajan", "Panci", "Pisau", "Talenan", "Spatula", "Sutil", "Centong", "Pemanggang"],
  "Perlengkapan Makan": ["Piring", "Gelas", "Mangkok", "Sendok", "Garpu", "Teko", "Nampan", "Tempat Bumbu"]
};

function scrollUp() {
  window.scrollTo({ top: 340, behavior: 'smooth' });
}

function formatNamaFile(nama) {
  return nama + ".png";
}

function isiDropdown() {
  semuaData.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id_kategori;
    option.textContent = item.nama_kategori;
    select.appendChild(option);
  });
}

function tampilkanKategori(id) {
  const kategori = semuaData.find(item => String(item.id_kategori) === id);
  const subKategori = Array.isArray(kategori?.sub_kategori) ? kategori.sub_kategori : [];

  if (!subKategori.length) {
    grid.innerHTML = "<p>Belum Tersedia.</p>";
    return;
  }

  grid.innerHTML = "";
  const githubBase = "https://raw.githubusercontent.com/Katazi08/kategori_icon/main/";
  let isFirstGroup = true;

  for (const [groupName, groupItems] of Object.entries(groupMap)) {
    const matched = subKategori.filter(sub => groupItems.includes(sub.nama_kategori));
    if (!matched.length) continue;

    const groupEl = document.createElement("div");
    groupEl.className = "group-container";

    const header = document.createElement("div");
    header.className = "group-header";
    header.textContent = groupName;

    const icon = document.createElement("span");
    icon.textContent = isFirstGroup ? "−" : "+";
    header.appendChild(icon);

    const content = document.createElement("div");
    content.className = "group-content";
    if (isFirstGroup) content.classList.add("active");

    const gridEl = document.createElement("div");
    gridEl.className = "sub-grid";

    matched.forEach(sub => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <a href="${sub.url_kategori || '#'}" style="text-decoration:none;">
          <img src="${githubBase + formatNamaFile(sub.nama_kategori)}" alt="${sub.nama_kategori}" loading="lazy" />
          <p>${sub.nama_kategori}</p>
        </a>
      `;
      gridEl.appendChild(card);
    });

    content.appendChild(gridEl);
    groupEl.appendChild(header);
    groupEl.appendChild(content);
    grid.appendChild(groupEl);

    header.addEventListener("click", () => {
      const isActive = content.classList.contains("active");
      document.querySelectorAll(".group-content").forEach(c => c.classList.remove("active"));
      document.querySelectorAll(".group-header span").forEach(i => i.textContent = "+");
      if (!isActive) {
        content.classList.add("active");
        header.querySelector("span").textContent = "−";
        setTimeout(() => {
          const offset = 95;
          const headerTop = header.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: headerTop - offset, behavior: "smooth" });
        }, 300);
      } else {
        icon.textContent = "+";
      }
    });

    isFirstGroup = false;
  }

  const subIDs = subKategori.map(sub => sub.id_kategori);
  ambilProdukDanTampilkan(subIDs, currentPage);
}

function ambilProdukDanTampilkan(subKategoriIDs, page = 1) {
  const cacheKey = `${select.value}_${page}`;
  if (produkCache[cacheKey]) {
    tampilkanProduk(produkCache[cacheKey]);
    buatPagination(produkCache[cacheKey].totalPage || 25);
    return;
  }

  fetch(`https://openapi.bukaolshop.net/v1/app/produk?token=${token}&page=${page}&total_data=${totalData}`)
    .then(res => res.json())
    .then(data => {
      const produkTerkait = data.data.filter(p => subKategoriIDs.includes(p.id_kategori));
      produkCache[cacheKey] = {
        produk: produkTerkait,
        totalPage: data.total_page || 25
      };
      tampilkanProduk(produkCache[cacheKey]);
      buatPagination(produkCache[cacheKey].totalPage);
    })
    .catch(() => {
      produkContainer.innerHTML = "<p>Gagal mengambil produk.</p>";
    });
}

function tampilkanProduk({ produk }) {
  produkContainer.innerHTML = "";
  if (produk.length === 0) {
    produkContainer.innerHTML = "<p style='grid-column: 1 / -1; text-align: center;'>Tidak ada produk.</p>";
    return;
  }

  produk.forEach(produk => {
    const card = document.createElement("div");
    card.className = "produk-card";
    card.innerHTML = `
      <a href="${produk.url_produk}" target="_blank">
        <img src="${produk.url_gambar_produk}" alt="${produk.nama_produk}" />
        <div class="produk-nama">${produk.nama_produk}</div>
        ${produk.harga_produk_asli ? `<div class="produk-info">
          <span class="diskon">${Math.round(((produk.harga_produk_asli - produk.harga_produk) / produk.harga_produk_asli) * 100)}%</span>
          <span class="harga-asli">Rp ${produk.harga_produk_asli.toLocaleString("id-ID")}</span>
        </div>` : ""}
        <div class="produk-harga">Rp ${produk.harga_produk.toLocaleString("id-ID")}</div>
      </a>
    `;
    produkContainer.appendChild(card);
  });
}

function buatPagination(totalPages) {
  paginationContainer.innerHTML = "";
  const group = Math.floor((currentPage - 1) / maxPagesToShow);
  const startPage = group * maxPagesToShow + 1;
  const endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

  if (startPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "<";
    prevBtn.onclick = () => gantiHalaman(startPage - 1);
    paginationContainer.appendChild(prevBtn);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => gantiHalaman(i);
    paginationContainer.appendChild(btn);
  }

  if (endPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = ">";
    nextBtn.onclick = () => gantiHalaman(endPage + 1);
    paginationContainer.appendChild(nextBtn);
  }
}

function gantiHalaman(page) {
  currentPage = page;
  localStorage.setItem("lastProductPage", page);
  tampilkanKategori(select.value);
  scrollUp();
}

// Event select kategori
select.addEventListener("change", e => {
  currentPage = 1;
  tampilkanKategori(e.target.value);
});

// INIT
window.addEventListener("DOMContentLoaded", () => {
  const tipeKategori = localStorage.getItem("tipe_kategori") || "utama";
  fetch(`https://openapi.bukaolshop.net/v1/app/kategori?token=${token}&tipe_kategori=${tipeKategori}`)
    .then(res => res.json())
    .then(data => {
      semuaData = data.data;
      isiDropdown();
      const last = localStorage.getItem("lastKategori");
      if (last && semuaData.some(k => k.id_kategori == last)) {
        select.value = last;
        tampilkanKategori(last);
      } else if (semuaData.length > 0) {
        select.value = semuaData[0].id_kategori;
        tampilkanKategori(semuaData[0].id_kategori);
      }
    });
});

// Dengarkan perubahan localStorage antar tab/jendela browser
window.addEventListener("storage", (event) => {
  if (event.key === "lastKategori") {
    const newKategori = event.newValue;
    if (newKategori) {
      select.value = newKategori;
      tampilkanKategori(newKategori);
    }
  }
});const select = document.getElementById("kategoriSelect");
const grid = document.getElementById("subGrid");
const produkContainer = document.getElementById("produkContainer");
const paginationContainer = document.getElementById("pagination");

let semuaData = [];
let currentPage = parseInt(localStorage.getItem("lastProductPage")) || 1;
const totalData = 20;
const maxPagesToShow = 5;
let produkCache = {};

const groupMap = {
  "Elektronik Rumah": ["Televisi", "Kipas Angin", "AC", "Lampu", "Speaker", "Mesin Cuci", "Dispenser", "Kulkas"],
  "Peralatan Dapur": ["Rice Cooker", "Blender", "Mixer", "Juicer", "Microwave", "Kompor Gas", "Oven", "Teko Listrik"],
  "Perlengkapan Rumah": ["Karpet", "Gorden", "Seprai", "Bantal", "Keset", "Tempat Sampah", "Jam Dinding", "Rak Sepatu"],
  "Perlengkapan Masak": ["Wajan", "Panci", "Pisau", "Talenan", "Spatula", "Sutil", "Centong", "Pemanggang"],
  "Perlengkapan Makan": ["Piring", "Gelas", "Mangkok", "Sendok", "Garpu", "Teko", "Nampan", "Tempat Bumbu"]
};

function scrollUp() {
  window.scrollTo({ top: 340, behavior: 'smooth' });
}

function formatNamaFile(nama) {
  return nama + ".png";
}

function isiDropdown() {
  semuaData.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id_kategori;
    option.textContent = item.nama_kategori;
    select.appendChild(option);
  });
}

function tampilkanKategori(id) {
  const kategori = semuaData.find(item => String(item.id_kategori) === id);
  const subKategori = Array.isArray(kategori?.sub_kategori) ? kategori.sub_kategori : [];

  if (!subKategori.length) {
    grid.innerHTML = "<p>Belum Tersedia.</p>";
    return;
  }

  grid.innerHTML = "";
  const githubBase = "https://raw.githubusercontent.com/Katazi08/kategori_icon/main/";
  let isFirstGroup = true;

  for (const [groupName, groupItems] of Object.entries(groupMap)) {
    const matched = subKategori.filter(sub => groupItems.includes(sub.nama_kategori));
    if (!matched.length) continue;

    const groupEl = document.createElement("div");
    groupEl.className = "group-container";

    const header = document.createElement("div");
    header.className = "group-header";
    header.textContent = groupName;

    const icon = document.createElement("span");
    icon.textContent = isFirstGroup ? "−" : "+";
    header.appendChild(icon);

    const content = document.createElement("div");
    content.className = "group-content";
    if (isFirstGroup) content.classList.add("active");

    const gridEl = document.createElement("div");
    gridEl.className = "sub-grid";

    matched.forEach(sub => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <a href="${sub.url_kategori || '#'}" style="text-decoration:none;">
          <img src="${githubBase + formatNamaFile(sub.nama_kategori)}" alt="${sub.nama_kategori}" loading="lazy" />
          <p>${sub.nama_kategori}</p>
        </a>
      `;
      gridEl.appendChild(card);
    });

    content.appendChild(gridEl);
    groupEl.appendChild(header);
    groupEl.appendChild(content);
    grid.appendChild(groupEl);

    header.addEventListener("click", () => {
      const isActive = content.classList.contains("active");
      document.querySelectorAll(".group-content").forEach(c => c.classList.remove("active"));
      document.querySelectorAll(".group-header span").forEach(i => i.textContent = "+");
      if (!isActive) {
        content.classList.add("active");
        header.querySelector("span").textContent = "−";
        setTimeout(() => {
          const offset = 95;
          const headerTop = header.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: headerTop - offset, behavior: "smooth" });
        }, 300);
      } else {
        icon.textContent = "+";
      }
    });

    isFirstGroup = false;
  }

  const subIDs = subKategori.map(sub => sub.id_kategori);
  ambilProdukDanTampilkan(subIDs, currentPage);
}

function ambilProdukDanTampilkan(subKategoriIDs, page = 1) {
  const cacheKey = `${select.value}_${page}`;
  if (produkCache[cacheKey]) {
    tampilkanProduk(produkCache[cacheKey]);
    buatPagination(produkCache[cacheKey].totalPage || 25);
    return;
  }

  fetch(`https://openapi.bukaolshop.net/v1/app/produk?token=${token}&page=${page}&total_data=${totalData}`)
    .then(res => res.json())
    .then(data => {
      const produkTerkait = data.data.filter(p => subKategoriIDs.includes(p.id_kategori));
      produkCache[cacheKey] = {
        produk: produkTerkait,
        totalPage: data.total_page || 25
      };
      tampilkanProduk(produkCache[cacheKey]);
      buatPagination(produkCache[cacheKey].totalPage);
    })
    .catch(() => {
      produkContainer.innerHTML = "<p>Gagal mengambil produk.</p>";
    });
}

function tampilkanProduk({ produk }) {
  produkContainer.innerHTML = "";
  if (produk.length === 0) {
    produkContainer.innerHTML = "<p style='grid-column: 1 / -1; text-align: center;'>Tidak ada produk.</p>";
    return;
  }

  produk.forEach(produk => {
    const card = document.createElement("div");
    card.className = "produk-card";
    card.innerHTML = `
      <a href="${produk.url_produk}" target="_blank">
        <img src="${produk.url_gambar_produk}" alt="${produk.nama_produk}" />
        <div class="produk-nama">${produk.nama_produk}</div>
        ${produk.harga_produk_asli ? `<div class="produk-info">
          <span class="diskon">${Math.round(((produk.harga_produk_asli - produk.harga_produk) / produk.harga_produk_asli) * 100)}%</span>
          <span class="harga-asli">Rp ${produk.harga_produk_asli.toLocaleString("id-ID")}</span>
        </div>` : ""}
        <div class="produk-harga">Rp ${produk.harga_produk.toLocaleString("id-ID")}</div>
      </a>
    `;
    produkContainer.appendChild(card);
  });
}

function buatPagination(totalPages) {
  paginationContainer.innerHTML = "";
  const group = Math.floor((currentPage - 1) / maxPagesToShow);
  const startPage = group * maxPagesToShow + 1;
  const endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

  if (startPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "<";
    prevBtn.onclick = () => gantiHalaman(startPage - 1);
    paginationContainer.appendChild(prevBtn);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => gantiHalaman(i);
    paginationContainer.appendChild(btn);
  }

  if (endPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = ">";
    nextBtn.onclick = () => gantiHalaman(endPage + 1);
    paginationContainer.appendChild(nextBtn);
  }
}

function gantiHalaman(page) {
  currentPage = page;
  localStorage.setItem("lastProductPage", page);
  tampilkanKategori(select.value);
  scrollUp();
}

// Event select kategori
select.addEventListener("change", e => {
  currentPage = 1;
  tampilkanKategori(e.target.value);
});

// INIT
window.addEventListener("DOMContentLoaded", () => {
  const tipeKategori = localStorage.getItem("tipe_kategori") || "utama";
  fetch(`https://openapi.bukaolshop.net/v1/app/kategori?token=${token}&tipe_kategori=${tipeKategori}`)
    .then(res => res.json())
    .then(data => {
      semuaData = data.data;
      isiDropdown();
      const last = localStorage.getItem("lastKategori");
      if (last && semuaData.some(k => k.id_kategori == last)) {
        select.value = last;
        tampilkanKategori(last);
      } else if (semuaData.length > 0) {
        select.value = semuaData[0].id_kategori;
        tampilkanKategori(semuaData[0].id_kategori);
      }
    });
});

// Dengarkan perubahan localStorage antar tab/jendela browser
window.addEventListener("storage", (event) => {
  if (event.key === "lastKategori") {
    const newKategori = event.newValue;
    if (newKategori) {
      select.value = newKategori;
      tampilkanKategori(newKategori);
    }
  }
});
