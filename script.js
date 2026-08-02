document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. MOBILE MENU TOGGLE
    // ==========================================================================
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // ==========================================================================
    // 2. STICKY NAVBAR & ACTIVE NAV LINK HIGHLIGHT ON SCROLL
    // ==========================================================================
    const header = document.querySelector('.navbar-container');
    const sections = document.querySelectorAll('section');
    // Back to top button (created dynamically)
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    document.body.appendChild(backToTop);
    backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    // Scroll direction detection
    let lastScrollY = window.scrollY;
    const handleDirection = () => {
        const current = window.scrollY;
        if (current < lastScrollY) {
            document.documentElement.classList.add('scrolling-up');
            document.documentElement.classList.remove('scrolling-down');
        } else if (current > lastScrollY) {
            document.documentElement.classList.add('scrolling-down');
            document.documentElement.classList.remove('scrolling-up');
        }
        lastScrollY = current;
    };

    const handleScroll = () => {
        // Sticky Header Class
        if (window.scrollY > 50) {
            header.classList.add('scroll-scrolled');
        } else {
            header.classList.remove('scroll-scrolled');
        }

        // Active Link Highlight
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100; // Offset for sticky header
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        // Attach click handler for profile button to open/map and scroll to lokasi
        const openMapBtn = document.getElementById('open-abeli-map-btn');
        if (openMapBtn && !openMapBtn._hasListener) {
            openMapBtn.addEventListener('click', function() {
                if (typeof window.openAbeliMap === 'function') {
                    window.openAbeliMap();
                } else {
                    const target = document.getElementById('lokasi');
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            openMapBtn._hasListener = true;
        }

        if (currentSectionId) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                }
            });
        }
        // hero parallax: move background slightly based on scroll
        const hero = document.querySelector('.hero-section');
        if (hero) {
            const offset = Math.min(window.scrollY * 0.2, 120);
            hero.style.backgroundPosition = `center ${-offset}px`;
        }

        // show back-to-top when scrolled down
        if (window.scrollY > 400) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
        // detect scroll direction and toggle classes
        handleDirection();
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run once initially

    // ==========================================================================
    // 3. SCROLL REVEAL ANIMATIONS (Intersection Observer)
    // ==========================================================================
    const scrollElements = document.querySelectorAll('.animate-scroll');

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('appear');
    };

    // Use IntersectionObserver for better performance where supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    displayScrollElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        scrollElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        const checkScrollReveal = () => {
            scrollElements.forEach((el) => {
                if (elementInView(el, 1.15)) {
                    displayScrollElement(el);
                }
            });
        };
        window.addEventListener('scroll', checkScrollReveal);
        checkScrollReveal();
    }

    // ==========================================================================
    // CountUp & Progress Animations (for stats-section and demo-section)
    // ==========================================================================
    function animateCount(el, target, duration = 1600, formatter) {
        const start = 0;
        let startTime = null;
        const fmt = formatter || (v => v.toString());
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const value = Math.floor(progress * (target - start) + start);
            el.textContent = fmt(value);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    if ('IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const section = entry.target;
                // stats count-up
                section.querySelectorAll('[data-target]').forEach(el => {
                    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
                    if (el.classList.contains('dem-value')) {
                        animateCount(el, target, 1200, v => v + '%');
                    } else if (el.classList.contains('small-num')) {
                        animateCount(el, target, 1000);
                    } else {
                        animateCount(el, target, 1400, v => v.toLocaleString());
                    }
                });

                // animate dem bars specifically
                section.querySelectorAll('.dem-bar').forEach(bar => {
                    const target = parseInt(bar.getAttribute('data-target'), 10) || 0;
                    bar.style.width = target + '%';
                });

                obs.unobserve(section);
            });
        }, { threshold: 0.15 });

        const statsSection = document.querySelector('.stats-section');
        if (statsSection) statsObserver.observe(statsSection);

        const demoSection = document.querySelector('.demo-section');
        if (demoSection) statsObserver.observe(demoSection);
    } else {
        // fallback: trigger immediately
        document.querySelectorAll('.stats-section [data-target], .demo-section [data-target]').forEach(el => {
            const target = parseInt(el.getAttribute('data-target'), 10) || 0;
            if (el.classList.contains('dem-value')) el.textContent = target + '%'; else el.textContent = target.toLocaleString();
        });
        document.querySelectorAll('.dem-bar').forEach(bar => { bar.style.width = (bar.getAttribute('data-target')||0) + '%'; });
    }

    // ==========================================================================
    // 4. INTERACTIVE ORGANIZATIONAL CHART
    // ==========================================================================
    const rwNodes = document.querySelectorAll('.rw-node');

    rwNodes.forEach(node => {
        node.addEventListener('click', (e) => {
            const branch = node.parentElement;
            const rtList = branch.querySelector('.rt-list');
            
            // Toggle highlight branch
            branch.classList.toggle('highlighted-branch');
            
            // Toggle collapsed class on RT List with transition
            if (rtList) {
                rtList.classList.toggle('collapsed');
            }
        });
    });

    // ==========================================================================
    // 5. INTERACTIVE MAP (LEAFLET.JS)
    // ==========================================================================
    const mapContainer = document.getElementById('map');
    
    if (mapContainer) {
        // Koordinat Kelurahan Abeli: -3.9987, 122.57795
        const abeliCoords = [-3.9987, 122.57795];
        
        // Inisialisasi Peta
        const map = L.map('map', {
            center: abeliCoords,
            zoom: 15,
            scrollWheelZoom: false // Mencegah zoom tidak sengaja saat scroll halaman
        });

        // Load OpenStreetMap Tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Tambah Custom Marker
        const marker = L.marker(abeliCoords).addTo(map);
        
        // Popup untuk Marker
        marker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 4px;">
                <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 14px;">Kelurahan Abeli</h4>
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4;">
                    Kecamatan Abeli, Kota Kendari,<br>Sulawesi Tenggara.
                </p>
            </div>
        `).openPopup();

        // Enable zoom scroll setelah user klik peta (menghindari user stuck saat scroll halaman)
        map.on('focus', () => { map.scrollWheelZoom.enable(); });
        map.on('blur', () => { map.scrollWheelZoom.disable(); });

        // Expose map and helper globally so other UI components can control it
        window.abeliMap = map;
        window.abeliMarker = marker;
        window.openAbeliMap = function() {
            const target = document.getElementById('lokasi');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                try {
                    map.invalidateSize();
                    map.setView(abeliCoords, 15);
                    marker.openPopup();
                } catch (e) {
                    // ignore if map not ready
                }
            }, 600);
        };
    }

    // ==========================================================================
    // GALLERY INTERACTIVE BUTTONS (VIEW / DOWNLOAD / SHARE)
    // ==========================================================================
    (function setupGalleryControls(){
        const galleryItems = document.querySelectorAll('.gallery-item');
        if (!galleryItems.length) return;

        // Create modal once
        const galleryModal = document.createElement('div');
        galleryModal.id = 'gallery-modal';
        galleryModal.className = 'modal-overlay hidden';
        galleryModal.innerHTML = `
            <div class="modal-card modal-gallery-card">
                <button class="modal-close-btn" id="gallery-modal-close" aria-label="Tutup">&times;</button>
                <img id="gallery-modal-img" src="" alt="Preview gambar">
                <div id="gallery-modal-caption" class="modal-caption"></div>
                <div class="modal-actions">
                    <a id="gallery-modal-download" class="btn btn-primary" href="#" download>Unduh</a>
                    <button id="gallery-modal-share" class="btn btn-secondary" type="button">Bagikan</button>
                </div>
            </div>
        `;
        document.body.appendChild(galleryModal);

        const modalImg = galleryModal.querySelector('#gallery-modal-img');
        const modalCaption = galleryModal.querySelector('#gallery-modal-caption');
        const modalDownload = galleryModal.querySelector('#gallery-modal-download');
        const modalShare = galleryModal.querySelector('#gallery-modal-share');

        function openGallery(src, caption){
            modalImg.src = src;
            modalCaption.textContent = caption || '';
            modalDownload.href = src;
            galleryModal.classList.remove('hidden');
            setTimeout(()=> galleryModal.classList.add('appear'), 10);
        }
        function closeGallery(){
            galleryModal.classList.add('hidden');
            galleryModal.classList.remove('appear');
            modalImg.src = '';
        }

        galleryModal.addEventListener('click', (e)=>{ if (e.target === galleryModal) closeGallery(); });
        galleryModal.querySelector('#gallery-modal-close').addEventListener('click', closeGallery);
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeGallery(); });

        galleryItems.forEach(item => {
            const wrapper = item.querySelector('.gallery-img-wrapper');
            const img = item.querySelector('.gallery-img');
            const title = item.querySelector('.gallery-item-title')?.textContent || '';
            if (!wrapper || !img) return;

            const actions = document.createElement('div');
            actions.className = 'gallery-actions';
            // View button
            const viewBtn = document.createElement('button'); viewBtn.className = 'btn view-btn'; viewBtn.type='button'; viewBtn.textContent = 'Lihat';
            // Download button (anchor)
            const dl = document.createElement('a'); dl.className='btn download-btn'; dl.href = img.src; dl.setAttribute('download',''); dl.textContent = 'Unduh';
            // Share button
            const shareBtn = document.createElement('button'); shareBtn.className='btn share-btn'; shareBtn.type='button'; shareBtn.textContent='Bagikan';

            actions.appendChild(viewBtn); actions.appendChild(dl); actions.appendChild(shareBtn);
            wrapper.appendChild(actions);

            viewBtn.addEventListener('click', ()=> openGallery(img.src, title));

            shareBtn.addEventListener('click', async ()=>{
                const url = location.origin + '/' + img.getAttribute('src');
                const text = title || 'Galeri Kelurahan Abeli';
                try {
                    if (navigator.share) {
                        await navigator.share({ title: text, text, url });
                    } else if (navigator.clipboard) {
                        await navigator.clipboard.writeText(url);
                        const tip = document.createElement('div'); tip.className='copy-tip'; tip.textContent='Link disalin ke clipboard'; document.body.appendChild(tip);
                        setTimeout(()=> tip.classList.add('show'), 10);
                        setTimeout(()=> tip.remove(), 2000);
                    } else {
                        // fallback: open new window with URL
                        window.open(url, '_blank');
                    }
                } catch (err) {
                    console.warn('Share failed', err);
                }
            });
        });
    })();

    // ==========================================================================
    // SLOGAN INTERACTION: copy & feedback
    // ==========================================================================
    (function sloganInteraction(){
        const slogan = document.querySelector('.slogan-headline');
        if (!slogan) return;
        // create tooltip element
        const tip = document.createElement('div');
        tip.className = 'slogan-copy-tip';
        tip.textContent = 'Tersalin: "Saring Sebelum Sharing!"';
        document.body.appendChild(tip);

        function showTip(){
            const rect = slogan.getBoundingClientRect();
            tip.style.top = (rect.bottom + window.scrollY + 12) + 'px';
            tip.style.left = (rect.left + rect.width/2) + 'px';
            tip.classList.add('show');
            setTimeout(()=> tip.classList.remove('show'), 1600);
        }

        slogan.addEventListener('click', async ()=>{
            const text = slogan.textContent.trim().replace(/^"|"$/g,'');
            try {
                if (navigator.clipboard) await navigator.clipboard.writeText(text);
            } catch (e) {
                // ignore clipboard errors
            }
            // pulse animation
            slogan.classList.remove('pulse');
            void slogan.offsetWidth; // reflow to restart animation
            slogan.classList.add('pulse');
            showTip();
        });
    })();
});
