-- ============================================================
-- SQL SCHEMA UNTUK NEON (PostgreSQL)
-- Jalankan ini di Neon SQL Editor
-- ============================================================

-- 1. Tabel Users (Untuk Login Admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Articles / News (Berita & Report)
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Berita Kelurahan', 'Daily Report KKN', 'Edukasi Anti-Hoax')),
    author VARCHAR(100) DEFAULT 'Tim Admin KKN',
    cover_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MIGRASI: Database yang sudah ada (tambah kolom sampul)
-- Salin-tempel blok ini di Neon SQL Editor jika tabel articles sudah terbuat sebelumnya
-- ============================================================
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- ============================================================
-- DATA AWAL (SEED DATA)
-- ============================================================

-- Insert Admin User Default (Username: admin | Password: admin123)
INSERT INTO users (username, password, nama_lengkap, role)
VALUES ('admin', 'admin123', 'Administrator Kelurahan Abeli', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert Contoh Artikel Awal
INSERT INTO articles (title, content, category, author) VALUES
(
    'Pelaksanaan Posyandu Balita & Lansia Kelurahan Abeli Bulan Ini',
    'Kegiatan Posyandu rutin kembali dilaksanakan di Kantor Kelurahan Abeli dengan tingkat partisipasi warga yang sangat tinggi. Layanan pemeriksaan kesehatan gratis dan pemberian makanan tambahan (PMT) berjalan lancar.',
    'Berita Kelurahan',
    'Tim Kelurahan Abeli'
),
(
    'Daily Report KKN Hari Ke-12: Sosialisasi Saring Sebelum Sharing',
    'Tim KKN Tematik sukses menyelenggarakan workshop literasi digital untuk pemuda karang taruna dan ibu-ibu PKK. Materi berfokus pada verifikasi berita palsu (hoax) dan keamanan media sosial.',
    'Daily Report KKN',
    'Tim KKN Tematik'
),
(
    'Panduan Praktis Mengenali Ciri-Ciri Berita Hoax & Deepfake AI',
    'Perkembangan AI memudahkan rekayasa foto dan suara (deepfake). Pastikan selalu memeriksa sumber berita melalui situs terpercaya seperti CekFakta.com atau TurnBackHoax.id sebelum menyebarkannya.',
    'Edukasi Anti-Hoax',
    'Tim Redaksi Anti-Hoax'
);

-- ============================================================
-- MIGRASI (database lama): jalankan hanya jika kolom belum ada
-- ============================================================
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image TEXT;
