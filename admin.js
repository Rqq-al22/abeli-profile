// ============================================================
// ADMIN PANEL & NEWS SYSTEM SCRIPT - KELURAHAN ABELI
// ============================================================

const API_BASE = window.location.protocol.startsWith('http')
  ? `${window.location.origin}/api`
  : 'http://localhost:3001/api';

// Default Initial Seed Data if offline & localStorage empty
const DEFAULT_ARTIKEL = [
  {
    id: 1,
    title: 'Pelaksanaan Posyandu Balita & Lansia Kelurahan Abeli Bulan Ini',
    content: 'Kegiatan Posyandu rutin kembali dilaksanakan di Kantor Kelurahan Abeli dengan tingkat partisipasi warga yang sangat tinggi. Layanan pemeriksaan kesehatan gratis dan pemberian makanan tambahan (PMT) berjalan lancar.',
    category: 'Berita Kelurahan',
    author: 'Tim Kelurahan Abeli',
    created_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  },
  {
    id: 2,
    title: 'Daily Report KKN Hari Ke-12: Sosialisasi Saring Sebelum Sharing',
    content: 'Tim KKN Tematik sukses menyelenggarakan workshop literasi digital untuk pemuda karang taruna dan ibu-ibu PKK. Materi berfokus pada verifikasi berita palsu (hoax) dan keamanan media sosial.',
    category: 'Daily Report KKN',
    author: 'Tim KKN Tematik',
    created_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  },
  {
    id: 3,
    title: 'Panduan Praktis Mengenali Ciri-Ciri Berita Hoax & Deepfake AI',
    content: 'Perkembangan AI memudahkan rekayasa foto dan suara (deepfake). Pastikan selalu memeriksa sumber berita melalui situs terpercaya seperti CekFakta.com atau TurnBackHoax.id sebelum menyebarkannya.',
    category: 'Edukasi Anti-Hoax',
    author: 'Tim Redaksi Anti-Hoax',
    created_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
];

// --- All DOM elements declared here, assigned inside DOMContentLoaded ---
let loginModal, loginForm, adminPanel, articleForm, formTitle, articleIdInput;
let titleInput, contentInput, categorySelect;
let coverImageUrlInput, coverImageFileInput, coverImagePreviewWrap, coverImagePreview, coverImageClearBtn;
let cancelEditBtn, articlesTableBody, publicNewsGrid, loginNavBtn, loginNavBtnMobile;

let currentEditingId = null;
let pendingCoverImage = null;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCoverImageForSave() {
  if (pendingCoverImage) return pendingCoverImage;
  if (coverImageUrlInput && coverImageUrlInput.value.trim()) {
    return coverImageUrlInput.value.trim();
  }
  return null;
}

function updateCoverPreview(src) {
  if (!coverImagePreviewWrap || !coverImagePreview) return;
  if (src) {
    coverImagePreview.src = src;
    coverImagePreviewWrap.classList.remove('hidden');
  } else {
    coverImagePreview.removeAttribute('src');
    coverImagePreviewWrap.classList.add('hidden');
  }
}

function resetCoverFields() {
  pendingCoverImage = null;
  if (coverImageUrlInput) coverImageUrlInput.value = '';
  if (coverImageFileInput) coverImageFileInput.value = '';
  updateCoverPreview(null);
}

function setCoverFieldsFromArticle(article) {
  pendingCoverImage = null;
  if (coverImageFileInput) coverImageFileInput.value = '';
  const cover = article && article.cover_image ? String(article.cover_image) : '';
  if (coverImageUrlInput) {
    coverImageUrlInput.value = cover.startsWith('data:') ? '' : cover;
  }
  updateCoverPreview(cover || null);
}

// Helper: Check Login State
function isLoggedIn() {
  return sessionStorage.getItem('abeli_admin_logged_in') === 'true';
}

function updateUIForLoginState() {
  const loggedInContent = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg> Logout Admin
  `;
  const loggedOutContent = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg> Login Admin
  `;

  if (isLoggedIn()) {
    if (adminPanel) adminPanel.classList.remove('hidden');
    if (loginNavBtn) {
      loginNavBtn.innerHTML = loggedInContent;
      loginNavBtn.title = "Klik untuk Keluar dari Sesi Admin";
    }
    if (loginNavBtnMobile) {
      loginNavBtnMobile.innerHTML = loggedInContent;
      loginNavBtnMobile.title = "Klik untuk Keluar dari Sesi Admin";
    }
  } else {
    if (adminPanel) adminPanel.classList.add('hidden');
    if (loginNavBtn) {
      loginNavBtn.innerHTML = loggedOutContent;
      loginNavBtn.title = "Masuk Sebagai Administrator";
    }
    if (loginNavBtnMobile) {
      loginNavBtnMobile.innerHTML = loggedOutContent;
      loginNavBtnMobile.title = "Masuk Sebagai Administrator";
    }
  }
}

// Open / Close Login Modal
function openLoginModal() {
  if (isLoggedIn()) {
    // If already logged in, clicking the button logs out
    if (confirm("Apakah Anda yakin ingin logout dari Admin Panel?")) {
      sessionStorage.removeItem('abeli_admin_logged_in');
      updateUIForLoginState();
      alert("Anda telah berhasil logout.");
    }
    return;
  }
  if (loginModal) loginModal.classList.remove('hidden');
}

function closeLoginModal() {
  if (loginModal) loginModal.classList.add('hidden');
}

// ------------------------------------------------------------
// DATA FETCHING & LOCALSTORAGE FALLBACK
// ------------------------------------------------------------

function getLocalArticles() {
  const data = localStorage.getItem('abeli_articles');
  if (!data) {
    localStorage.setItem('abeli_articles', JSON.stringify(DEFAULT_ARTIKEL));
    return DEFAULT_ARTIKEL;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('abeli_articles', JSON.stringify(DEFAULT_ARTIKEL));
      return DEFAULT_ARTIKEL;
    }
    return parsed;
  } catch (err) {
    localStorage.setItem('abeli_articles', JSON.stringify(DEFAULT_ARTIKEL));
    return DEFAULT_ARTIKEL;
  }
}

function saveLocalArticles(articles) {
  localStorage.setItem('abeli_articles', JSON.stringify(articles));
}

async function fetchArticles() {
  try {
    const res = await fetch(`${API_BASE}/articles`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        saveLocalArticles(DEFAULT_ARTIKEL);
        return DEFAULT_ARTIKEL;
      }
      saveLocalArticles(data); // Sync local storage
      return data;
    }
  } catch (err) {
    console.log('Backend API offline, loading from localStorage');
  }
  return getLocalArticles();
}

// ------------------------------------------------------------
// RENDERING FUNCTIONS
// ------------------------------------------------------------

function getCategoryBadgeHTML(category) {
  let badgeClass = 'badge-berita';
  let icon = '<i class="ph ph-newspaper"></i>';
  if (category === 'Daily Report KKN') {
    badgeClass = 'badge-daily';
    icon = '<i class="ph ph-notepad"></i>';
  } else if (category === 'Edukasi Anti-Hoax') {
    badgeClass = 'badge-hoax';
    icon = '<i class="ph ph-shield-check"></i>';
  }
  return `<span class="badge ${badgeClass}">${icon} ${category}</span>`;
}

async function renderAll() {
  const articles = await fetchArticles();
  renderAdminTable(articles);
  renderPublicNews(articles);
}

function renderAdminTable(articles) {
  if (!articlesTableBody) return;
  articlesTableBody.innerHTML = '';

  if (articles.length === 0) {
    articlesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Belum ada artikel. Tambahkan artikel baru melalui form di samping.</td></tr>`;
    return;
  }

  articles.forEach((article, index) => {
    const tr = document.createElement('tr');

    const coverTd = document.createElement('td');
    if (article.cover_image) {
      const img = document.createElement('img');
      img.src = article.cover_image;
      img.alt = 'Sampul';
      img.className = 'cover-thumb';
      coverTd.appendChild(img);
    } else {
      coverTd.textContent = '—';
      coverTd.className = 'text-muted';
    }
    tr.appendChild(coverTd);

    const titleTd = document.createElement('td');
    titleTd.className = 'article-title-cell';
    titleTd.textContent = article.title;
    tr.appendChild(titleTd);

    const previewTd = document.createElement('td');
    previewTd.className = 'article-preview-cell';
    previewTd.textContent = article.content.length > 60 ? article.content.slice(0, 60) + '...' : article.content;
    tr.appendChild(previewTd);

    const categoryTd = document.createElement('td');
    categoryTd.innerHTML = getCategoryBadgeHTML(article.category);
    tr.appendChild(categoryTd);

    const actionsTd = document.createElement('td');
    actionsTd.style.whiteSpace = 'nowrap';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action-edit';
    editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i> Edit';
    editBtn.addEventListener('click', () => startEditArticle(article));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action-delete';
    deleteBtn.innerHTML = '<i class="ph ph-trash"></i> Hapus';
    deleteBtn.addEventListener('click', () => deleteArticle(article.id));

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(deleteBtn);
    tr.appendChild(actionsTd);

    articlesTableBody.appendChild(tr);
  });
}

function renderPublicNews(articles) {
  if (!publicNewsGrid) return;
  publicNewsGrid.innerHTML = '';

  if (articles.length === 0) {
    publicNewsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5"><p>Belum ada berita terpublikasi.</p></div>`;
    return;
  }

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'news-card animate-scroll';

    const formattedDate = article.created_at
      ? (typeof article.created_at === 'string' && article.created_at.includes('T')
        ? new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : article.created_at)
      : 'Terbaru';

    const coverBlock = article.cover_image
      ? `<div class="news-card-cover"><img src="${escapeHtml(article.cover_image)}" alt="${escapeHtml(article.title)}" loading="lazy"></div>`
      : '';

    card.innerHTML = `
      ${coverBlock}
      <div class="news-card-header">
        ${getCategoryBadgeHTML(article.category)}
        <span class="news-card-date"><i class="ph ph-calendar"></i> ${formattedDate}</span>
      </div>
      <div class="news-card-body">
        <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
        <p class="news-card-desc">${escapeHtml(article.content)}</p>
      </div>
      <div class="news-card-footer">
        <span><i class="ph ph-pen"></i> ${article.author || 'Admin Kelurahan'}</span>
        <span class="text-primary font-weight-bold">Kelurahan Abeli</span>
      </div>
    `;

    publicNewsGrid.appendChild(card);
  });
}

// ------------------------------------------------------------
// CRUD ACTIONS
// ------------------------------------------------------------

function startEditArticle(article) {
  currentEditingId = article.id;
  if (formTitle) formTitle.innerHTML = '<i class="ph ph-pencil-simple"></i> Edit Artikel';
  if (articleIdInput) articleIdInput.value = article.id;
  if (titleInput) titleInput.value = article.title;
  if (contentInput) contentInput.value = article.content;
  if (categorySelect) categorySelect.value = article.category;
  setCoverFieldsFromArticle(article);
  if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');

  // Scroll to form
  if (articleForm) articleForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEditing() {
  currentEditingId = null;
  if (formTitle) formTitle.innerHTML = '<i class="ph ph-plus"></i> Tambah Artikel Berita Baru';
  if (articleForm) articleForm.reset();
  resetCoverFields();
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
}

// Delete Article
async function deleteArticle(id) {
  if (!isLoggedIn()) {
    alert("Anda harus login sebagai Admin untuk menghapus berita!");
    openLoginModal();
    return;
  }

  if (!confirm("Apakah Anda yakin ingin menghapus artikel ini secara permanen?")) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/articles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus di server');
  } catch (err) {
    console.log('Backend API delete failed, deleting from localStorage');
    let localArticles = getLocalArticles();
    localArticles = localArticles.filter(a => String(a.id) !== String(id));
    saveLocalArticles(localArticles);
  }

  await renderAll();
  alert("Artikel telah berhasil dihapus.");
}

// ------------------------------------------------------------
// INITIALIZATION — All DOM queries and event bindings here
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  // Query all DOM elements AFTER DOM is fully loaded
  loginModal = document.getElementById('login-modal');
  loginForm = document.getElementById('login-form');
  adminPanel = document.getElementById('admin-panel');
  articleForm = document.getElementById('article-form');
  formTitle = document.getElementById('form-title');
  articleIdInput = document.getElementById('article-id');
  titleInput = document.getElementById('title');
  contentInput = document.getElementById('content');
  categorySelect = document.getElementById('category');
  coverImageUrlInput = document.getElementById('cover-image-url');
  coverImageFileInput = document.getElementById('cover-image-file');
  coverImagePreviewWrap = document.getElementById('cover-image-preview-wrap');
  coverImagePreview = document.getElementById('cover-image-preview');
  coverImageClearBtn = document.getElementById('cover-image-clear');
  cancelEditBtn = document.getElementById('cancel-edit');
  articlesTableBody = document.querySelector('#articles-table tbody');
  publicNewsGrid = document.getElementById('news-grid-container');
  loginNavBtn = document.getElementById('nav-admin-login-btn');
  loginNavBtnMobile = document.getElementById('nav-admin-login-btn-mobile');

  // --- Cover image event listeners ---
  if (coverImageUrlInput) {
    coverImageUrlInput.addEventListener('input', function () {
      pendingCoverImage = null;
      if (coverImageFileInput) coverImageFileInput.value = '';
      const url = coverImageUrlInput.value.trim();
      updateCoverPreview(url || null);
    });
  }

  if (coverImageFileInput) {
    coverImageFileInput.addEventListener('change', function () {
      const file = coverImageFileInput.files && coverImageFileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar.');
        coverImageFileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        pendingCoverImage = reader.result;
        if (coverImageUrlInput) coverImageUrlInput.value = '';
        updateCoverPreview(pendingCoverImage);
      };
      reader.readAsDataURL(file);
    });
  }

  if (coverImageClearBtn) {
    coverImageClearBtn.addEventListener('click', function () {
      resetCoverFields();
    });
  }

  // --- Cancel edit button ---
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', cancelEditing);
  }

  // --- Login form submit ---
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();

      try {
        // Try Backend API Login
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            sessionStorage.setItem('abeli_admin_logged_in', 'true');
            closeLoginModal();
            updateUIForLoginState();
            loginForm.reset();
            // Scroll smoothly to admin panel
            if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
      } catch (err) {
        console.log('Backend not reachable, using offline login check');
      }

      // Fallback offline login check
      if (username === 'admin' && password === 'admin123') {
        sessionStorage.setItem('abeli_admin_logged_in', 'true');
        closeLoginModal();
        updateUIForLoginState();
        loginForm.reset();
        if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('Username atau Password yang Anda masukkan salah!');
      }
    });
  }

  // --- Article form submit ---
  if (articleForm) {
    articleForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!isLoggedIn()) {
        alert("Anda harus login sebagai Admin untuk menambah atau mengubah berita!");
        openLoginModal();
        return;
      }

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const category = categorySelect.value;

      if (!title || !content || !category) {
        alert("Silakan lengkapi Judul, Konten, dan Kategori!");
        return;
      }

      const articleData = {
        title,
        content,
        category,
        author: 'Tim Admin Kelurahan Abeli',
        cover_image: getCoverImageForSave()
      };

      try {
        if (currentEditingId) {
          // UPDATE
          const res = await fetch(`${API_BASE}/articles/${currentEditingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
          });
          if (!res.ok) throw new Error('Gagal update artikel di server');
        } else {
          // CREATE
          const res = await fetch(`${API_BASE}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
          });
          if (!res.ok) throw new Error('Gagal menyimpan artikel di server');
        }
      } catch (err) {
        console.log('Backend API request failed, updating localStorage');
        // Offline LocalStorage Fallback
        let localArticles = getLocalArticles();
        if (currentEditingId) {
          localArticles = localArticles.map(a => String(a.id) === String(currentEditingId) ? { ...a, ...articleData } : a);
        } else {
          localArticles.unshift({ id: Date.now(), ...articleData, created_at: new Date().toLocaleDateString('id-ID') });
        }
        saveLocalArticles(localArticles);
      }

      cancelEditing();
      await renderAll();
      alert(currentEditingId ? "Artikel berhasil diperbarui!" : "Artikel baru berhasil ditambahkan!");
    });
  }

  // --- Logout button inside Admin panel ---
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (confirm("Apakah Anda yakin ingin logout dari Admin Panel?")) {
        sessionStorage.removeItem('abeli_admin_logged_in');
        updateUIForLoginState();
        alert("Anda telah berhasil logout.");
      }
    });
  }

  // --- Nav login button events ---
  if (loginNavBtn) {
    loginNavBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openLoginModal();
    });
  }
  if (loginNavBtnMobile) {
    loginNavBtnMobile.addEventListener('click', function (e) {
      e.preventDefault();
      openLoginModal();
    });
  }

  // --- Close modal ---
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeLoginModal);
  }
  if (loginModal) {
    loginModal.addEventListener('click', function (e) {
      if (e.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  // --- Initialize UI and render articles ---
  updateUIForLoginState();
  renderAll();
});
