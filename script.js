/**
 * script.js — Kelurahan Abeli Interactive Portal
 * Fitur: Count-Up Stats, Progress Bar Demografi, Animate on Scroll,
 *        Leaflet Map, Filter Berita, Hero Quick Search, Gallery Lightbox,
 *        Navbar Active Tracking, Slogan Copy Toast
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. SMOOTH SCROLL — navbar & anchor links
    // ==========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = document.querySelector('.navbar-container')?.offsetHeight || 72;
                const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ==========================================================================
    // 2. NAVBAR — active link tracking on scroll + mobile toggle
    // ==========================================================================
    (function initNavbar() {
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        const sections = [];
        navLinks.forEach(link => {
            const id = link.getAttribute('href').slice(1);
            const sec = document.getElementById(id);
            if (sec) sections.push({ link, sec });
        });

        function setActive() {
            const scrollY = window.scrollY + 100;
            let current = null;
            sections.forEach(({ sec }) => {
                if (sec.offsetTop <= scrollY) current = sec.id;
            });
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === '#' + current);
            });
        }
        window.addEventListener('scroll', setActive, { passive: true });
        setActive();

        // Navbar glass effect on scroll
        const navbar = document.querySelector('.navbar-container');
        window.addEventListener('scroll', () => {
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });

        // Mobile hamburger toggle
        const hamburger = document.getElementById('nav-hamburger');
        const navMenu = document.getElementById('nav-menu');
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('open');
                hamburger.classList.toggle('open');
            });
            // Close menu on link click
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('open');
                    hamburger.classList.remove('open');
                });
            });
        }
    })();

    // ==========================================================================
    // 3. ADMIN LOGIN MODAL
    // ==========================================================================
    (function initLoginModal() {
        const loginBtn = document.getElementById('nav-admin-login-btn');
        const modal    = document.getElementById('login-modal');
        const closeBtn = document.getElementById('login-modal-close');

        if (!loginBtn || !modal) return;

        loginBtn.addEventListener('click', () => modal.classList.add('show'));
        closeBtn?.addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    })();

    // ==========================================================================
    // 4. ANIMATE ON SCROLL — class 'animate-scroll' revealed via IntersectionObserver
    // ==========================================================================
    (function initScrollAnimations() {
        const items = document.querySelectorAll('.animate-scroll');
        if (!items.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        items.forEach(el => observer.observe(el));
    })();

    // ==========================================================================
    // 5. COUNT-UP ANIMATION — .stat-value & .small-num elements
    // ==========================================================================
    (function initCountUp() {
        const targets = document.querySelectorAll('.stat-value[data-target], .small-num[data-target]');
        if (!targets.length) return;

        function animateCount(el) {
            const target = parseInt(el.dataset.target, 10);
            const duration = 1800;
            const step = Math.ceil(duration / target) || 1;
            let current = 0;

            const timer = setInterval(() => {
                current += Math.max(1, Math.ceil(target / 80));
                if (current >= target) {
                    el.textContent = target.toLocaleString('id-ID');
                    clearInterval(timer);
                } else {
                    el.textContent = current.toLocaleString('id-ID');
                }
            }, step);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        targets.forEach(el => observer.observe(el));
    })();

    // ==========================================================================
    // 6. DEMOGRAFI PROGRESS BARS — .dem-bar & .dem-value elements
    // ==========================================================================
    (function initProgressBars() {
        const bars   = document.querySelectorAll('.dem-bar[data-target]');
        const values = document.querySelectorAll('.dem-value[data-target]');
        if (!bars.length) return;

        function animateBar(bar) {
            const target = parseInt(bar.dataset.target, 10);
            let width = 0;
            const timer = setInterval(() => {
                width += 1;
                bar.style.width = width + '%';
                if (width >= target) clearInterval(timer);
            }, 18);
        }

        function animateValue(el) {
            const target = parseInt(el.dataset.target, 10);
            let current = 0;
            const timer = setInterval(() => {
                current += 1;
                el.textContent = current + '%';
                if (current >= target) clearInterval(timer);
            }, 18);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Trigger all bars and values at once when the section is visible
                    bars.forEach(bar => animateBar(bar));
                    values.forEach(val => animateValue(val));
                    observer.disconnect(); // only once
                }
            });
        }, { threshold: 0.3 });

        const demoSection = document.querySelector('.demo-section');
        if (demoSection) observer.observe(demoSection);
    })();

    // ==========================================================================
    // 7. LEAFLET MAP — Interactive map of Kelurahan Abeli
    // ==========================================================================
    (function initLeafletMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl || typeof L === 'undefined') {
            // Retry once Leaflet loads
            window.addEventListener('load', () => {
                const el = document.getElementById('map');
                if (el && typeof L !== 'undefined') setupMap(el);
            });
            return;
        }
        setupMap(mapEl);

        function setupMap(el) {
            // Check if map already initialized
            if (el._leaflet_id) return;

            const lat = -4.0117;
            const lng = 122.5754;

            const map = L.map(el, {
                center: [lat, lng],
                zoom: 15,
                scrollWheelZoom: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

            const customIcon = L.divIcon({
                className: '',
                html: `<div style="background:#0284c7; color:#fff; border-radius:50% 50% 50% 0; width:38px; height:38px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; box-shadow:0 4px 12px rgba(2,132,199,0.5); transform:rotate(-45deg)"><span style="transform:rotate(45deg)">📍</span></div>`,
                iconSize: [38, 38],
                iconAnchor: [19, 38],
                popupAnchor: [0, -42],
            });

            L.marker([lat, lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family:'Inter',sans-serif; min-width:180px;">
                        <strong style="color:#0284c7; font-size:0.95rem;">Kantor Kelurahan Abeli</strong><br>
                        <span style="font-size:0.82rem; color:#475569;">Jl. Poros Abeli No. 12,<br>Kec. Abeli, Kota Kendari,<br>Sulawesi Tenggara</span>
                    </div>
                `, { maxWidth: 220 })
                .openPopup();

            // "Buka Peta Interaktif" button scrolls to map
            const mapBtn = document.getElementById('open-abeli-map-btn');
            if (mapBtn) {
                mapBtn.addEventListener('click', () => {
                    const mapSection = document.getElementById('lokasi');
                    if (mapSection) {
                        const navHeight = document.querySelector('.navbar-container')?.offsetHeight || 72;
                        const top = mapSection.getBoundingClientRect().top + window.scrollY - navHeight - 12;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                    setTimeout(() => map.invalidateSize(), 400);
                });
            }
        }
    })();

    // ==========================================================================
    // 8. NEWS FILTER + SEARCH (pills & live search input)
    // ==========================================================================
    (function initNewsFilter() {
        const pillsContainer = document.getElementById('news-category-pills');
        const searchInput    = document.getElementById('news-search-input');
        if (!pillsContainer && !searchInput) return;

        let activeCategory = 'all';
        let searchQuery    = '';

        function filterCards() {
            const cards = document.querySelectorAll('#news-grid-container .news-card, #news-grid-container [data-category]');
            cards.forEach(card => {
                const cat = (card.dataset.category || '').toLowerCase();
                const title = (card.querySelector('.card-title, h3, h4')?.textContent || '').toLowerCase();
                const body  = (card.querySelector('p')?.textContent || '').toLowerCase();
                const q     = searchQuery.toLowerCase();

                const matchCat  = activeCategory === 'all' || cat === activeCategory.toLowerCase();
                const matchSearch = !q || title.includes(q) || body.includes(q) || cat.includes(q);

                card.style.display = (matchCat && matchSearch) ? '' : 'none';
            });
        }

        // Pill click handler
        if (pillsContainer) {
            pillsContainer.addEventListener('click', (e) => {
                const pill = e.target.closest('.news-pill');
                if (!pill) return;
                pillsContainer.querySelectorAll('.news-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeCategory = pill.dataset.category || 'all';
                filterCards();
            });
        }

        // Live search handler
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value.trim();
                filterCards();
            });
        }
    })();

    // ==========================================================================
    // 9. HERO QUICK SEARCH — scroll down to berita section & apply query
    // ==========================================================================
    (function initHeroSearch() {
        const searchInput = document.getElementById('hero-quick-search');
        const searchBtn   = document.getElementById('hero-search-btn');
        if (!searchInput || !searchBtn) return;

        function doSearch() {
            const query = searchInput.value.trim();
            const beritaSection = document.getElementById('berita');
            const newsSearchInput = document.getElementById('news-search-input');

            if (beritaSection) {
                const navHeight = document.querySelector('.navbar-container')?.offsetHeight || 72;
                const top = beritaSection.getBoundingClientRect().top + window.scrollY - navHeight - 12;
                window.scrollTo({ top, behavior: 'smooth' });
            }

            if (newsSearchInput && query) {
                setTimeout(() => {
                    newsSearchInput.value = query;
                    newsSearchInput.dispatchEvent(new Event('input'));
                }, 600);
            }
        }

        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    })();

    // ==========================================================================
    // 10. GALLERY LIGHTBOX
    // ==========================================================================
    (function initGalleryLightbox() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        if (!galleryItems.length) return;

        // Create lightbox overlay
        const overlay = document.createElement('div');
        overlay.id = 'gallery-lightbox';
        overlay.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Tutup">&times;</button>
                <img id="lightbox-img" src="" alt="Gallery Image" />
                <div id="lightbox-caption" class="lightbox-caption"></div>
                <a id="lightbox-download" href="#" download class="btn btn-secondary btn-sm lightbox-download-btn">
                    <i class="ph ph-download-simple"></i> Unduh Foto
                </a>
            </div>
        `;
        document.body.appendChild(overlay);

        const lightboxImg     = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const lightboxDl      = document.getElementById('lightbox-download');
        const closeBtn        = overlay.querySelector('.lightbox-close');
        const backdrop        = overlay.querySelector('.lightbox-backdrop');

        function openLightbox(src, alt) {
            lightboxImg.src = src;
            lightboxImg.alt = alt;
            lightboxCaption.textContent = alt;
            lightboxDl.href = src;
            lightboxDl.download = alt;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        galleryItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const img = item.querySelector('img.gallery-img');
                if (img) openLightbox(img.src, img.alt);
            });
        });

        closeBtn.addEventListener('click', closeLightbox);
        backdrop.addEventListener('click', closeLightbox);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    })();

    // ==========================================================================
    // 11. SLOGAN INTERACTION: copy & feedback toast
    // ==========================================================================
    (function sloganInteraction() {
        const slogan = document.querySelector('.slogan-headline');
        if (!slogan) return;

        function showTip() {
            const tip = document.createElement('div');
            tip.className = 'slogan-copy-tip';
            tip.textContent = 'Tersalin: "Saring Sebelum Sharing!"';
            document.body.appendChild(tip);

            const rect = slogan.getBoundingClientRect();
            tip.style.position = 'fixed';
            tip.style.top = (rect.bottom + 12) + 'px';
            tip.style.left = (rect.left + rect.width / 2) + 'px';
            tip.style.transform = 'translateX(-50%)';
            tip.style.zIndex = '99999';

            requestAnimationFrame(() => {
                tip.classList.add('show');
            });

            setTimeout(() => {
                tip.classList.remove('show');
                setTimeout(() => tip.remove(), 300);
            }, 1800);
        }

        slogan.style.cursor = 'pointer';
        slogan.title = 'Klik untuk menyalin slogan';

        slogan.addEventListener('click', async () => {
            const text = slogan.textContent.trim().replace(/^"|"$/g, '');
            try {
                if (navigator.clipboard) await navigator.clipboard.writeText(text);
            } catch (e) {
                // ignore clipboard errors in non-secure context
            }
            slogan.classList.remove('pulse');
            void slogan.offsetWidth;
            slogan.classList.add('pulse');
            showTip();
        });
    })();

    // ==========================================================================
    // 12. LIGHTBOX CSS injection (ensures styles exist even if style.css is cached)
    // ==========================================================================
    (function injectLightboxCSS() {
        if (document.getElementById('lightbox-inline-css')) return;
        const style = document.createElement('style');
        style.id = 'lightbox-inline-css';
        style.textContent = `
            #gallery-lightbox {
                display: none;
                position: fixed; inset: 0; z-index: 9999;
                align-items: center; justify-content: center;
            }
            #gallery-lightbox.open { display: flex; }
            #gallery-lightbox .lightbox-backdrop {
                position: absolute; inset: 0;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
            }
            #gallery-lightbox .lightbox-content {
                position: relative; z-index: 1;
                background: #fff; border-radius: 16px;
                padding: 20px; max-width: 90vw; max-height: 90vh;
                display: flex; flex-direction: column; align-items: center;
                gap: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.4);
            }
            #gallery-lightbox #lightbox-img {
                max-width: 100%; max-height: 65vh;
                object-fit: contain; border-radius: 10px;
            }
            #gallery-lightbox .lightbox-caption {
                font-size: 0.9rem; color: #475569; text-align: center;
            }
            #gallery-lightbox .lightbox-close {
                position: absolute; top: 10px; right: 14px;
                background: none; border: none; font-size: 1.8rem;
                color: #64748b; cursor: pointer; line-height: 1;
            }
            #gallery-lightbox .lightbox-close:hover { color: #0f172a; }
        `;
        document.head.appendChild(style);
    })();

});
