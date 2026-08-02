// ============================================================
// EXPRESS BACKEND SERVER - MySQL (Laragon) + Neon (PostgreSQL) + JSON FALLBACK
// Kelurahan Abeli Admin & News System
// ============================================================

require('dotenv').config(); // Load config dari file .env

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files (index.html, admin.js, admin.css, etc.)
app.use(express.static(__dirname));

// Serve index.html on root GET /
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('index.html tidak ditemukan');
});

// ============================================================
// DATABASE CONNECTIONS
// ============================================================

const IS_VERCEL = !!process.env.VERCEL;

// --- MySQL (Laragon) ---
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'abel_db',
};

let mysqlPool = null;

async function connectMySQL() {
  // Lewati MySQL jika di environment Vercel dan menggunakan localhost
  const isLocalHost = !process.env.MYSQL_HOST || process.env.MYSQL_HOST === 'localhost' || process.env.MYSQL_HOST === '127.0.0.1';
  if (IS_VERCEL && isLocalHost) {
    console.log('ℹ️ Environment Vercel terdeteksi tanpa MYSQL_HOST eksternal. Lewati MySQL Laragon.');
    return;
  }

  try {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      ...MYSQL_CONFIG,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 2500
    });

    // Test connection with timeout
    const conn = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MySQL connection timeout')), 2500))
    ]);
    conn.release();
    mysqlPool = pool;
    console.log('✅ Berhasil terhubung ke MySQL Laragon!');

    // Auto-create tables if not exists
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          nama_lengkap VARCHAR(100) NOT NULL,
          \`role\` VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS articles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          author VARCHAR(100) DEFAULT 'Tim Admin KKN',
          cover_image LONGTEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user if not exists
    await mysqlPool.query(`
      INSERT IGNORE INTO users (username, password, nama_lengkap, \`role\`)
      VALUES ('admin', 'admin123', 'Administrator Kelurahan Abeli', 'admin')
    `);

    // Check if articles table is empty, insert initial seed data
    const [rows] = await mysqlPool.query('SELECT COUNT(*) as cnt FROM articles');
    if (rows[0].cnt === 0) {
      await mysqlPool.query(`
        INSERT INTO articles (title, content, category, author) VALUES
        ('Pelaksanaan Posyandu Balita & Lansia Kelurahan Abeli Bulan Ini', 'Kegiatan Posyandu rutin kembali dilaksanakan di Kantor Kelurahan Abeli dengan tingkat partisipasi warga yang sangat tinggi. Layanan pemeriksaan kesehatan gratis dan pemberian makanan tambahan (PMT) berjalan lancar.', 'Berita Kelurahan', 'Tim Kelurahan Abeli'),
        ('Daily Report KKN Hari Ke-12: Sosialisasi Saring Sebelum Sharing', 'Tim KKN Tematik sukses menyelenggarakan workshop literasi digital untuk pemuda karang taruna dan ibu-ibu PKK. Materi berfokus pada verifikasi berita palsu (hoax) dan keamanan media sosial.', 'Daily Report KKN', 'Tim KKN Tematik'),
        ('Panduan Praktis Mengenali Ciri-Ciri Berita Hoax & Deepfake AI', 'Perkembangan AI memudahkan rekayasa foto dan suara (deepfake). Pastikan selalu memeriksa sumber berita melalui situs terpercaya seperti CekFakta.com atau TurnBackHoax.id sebelum menyebarkannya.', 'Edukasi Anti-Hoax', 'Tim Redaksi Anti-Hoax')
      `);
      console.log('✅ Seed data inserted into MySQL!');
    }

    console.log('✅ MySQL Tables and Seed Data initialized!');
  } catch (err) {
    console.error('❌ Gagal konek ke MySQL:', err.message);
    console.log('ℹ️ MySQL tidak tersedia, mencoba Neon PostgreSQL atau db.json fallback.');
  }
}

// --- Neon PostgreSQL (untuk deploy online) ---
const DATABASE_URL = process.env.DATABASE_URL || '';
let pgClient = null;

async function connectNeon() {
  if (!DATABASE_URL) return;

  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    pgClient = client;
    pgClient.on('error', err => {
      console.error('❌ Neon client error:', err.message);
      pgClient = null;
    });
    pgClient.on('end', () => {
      console.warn('⚠️ Neon connection closed.');
      pgClient = null;
    });

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          nama_lengkap VARCHAR(100) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS articles (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          author VARCHAR(100) DEFAULT 'Tim Admin KKN',
          cover_image TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgClient.query(`
      INSERT INTO users (username, password, nama_lengkap, role)
      VALUES ('admin', 'admin123', 'Administrator Kelurahan Abeli', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);

    const articleCountResult = await pgClient.query('SELECT COUNT(*)::int AS cnt FROM articles');
    if (articleCountResult.rows[0].cnt === 0) {
      await pgClient.query(`
        INSERT INTO articles (title, content, category, author) VALUES
        ('Pelaksanaan Posyandu Balita & Lansia Kelurahan Abeli Bulan Ini', 'Kegiatan Posyandu rutin kembali dilaksanakan di Kantor Kelurahan Abeli dengan tingkat partisipasi warga yang sangat tinggi. Layanan pemeriksaan kesehatan gratis dan pemberian makanan tambahan (PMT) berjalan lancar.', 'Berita Kelurahan', 'Tim Kelurahan Abeli'),
        ('Daily Report KKN Hari Ke-12: Sosialisasi Saring Sebelum Sharing', 'Tim KKN Tematik sukses menyelenggarakan workshop literita digital untuk pemuda karang taruna dan ibu-ibu PKK. Materi berfokus pada verifikasi berita palsu (hoax) dan keamanan media sosial.', 'Daily Report KKN', 'Tim KKN Tematik'),
        ('Panduan Praktis Mengenali Ciri-Ciri Berita Hoax & Deepfake AI', 'Perkembangan AI memudahkan rekayasa foto dan suara (deepfake). Pastikan selalu memeriksa sumber berita melalui situs terpercaya seperti CekFakta.com atau TurnBackHoax.id sebelum menyebarkannya.', 'Edukasi Anti-Hoax', 'Tim Redaksi Anti-Hoax')
      `);
    }

    console.log('✅ Berhasil terhubung ke Neon PostgreSQL dan tabel siap dipakai!');
  } catch (err) {
    console.error('❌ Gagal konek ke Neon:', err.message);
  }
}

// Connect to databases (MySQL first, then Neon as fallback)
let dbInitialized = false;
let dbInitPromise = null;

async function initDatabases() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await connectMySQL();
      if (!mysqlPool) {
        await connectNeon();
      }
      dbInitialized = true;
    })();
  }
  return dbInitPromise;
}
initDatabases().catch(err => console.error('DB init error:', err));

// Middleware untuk memastikan database terinisialisasi sebelum API diproses
app.use('/api', async (req, res, next) => {
  try {
    await initDatabases();
  } catch (e) {
    console.error('DB Middleware wait error:', e);
  }
  next();
});

// ============================================================
// LOCAL JSON DATABASE FALLBACK
// ============================================================
const DB_FILE = path.join(__dirname, 'db.json');

const SEED_ARTIKEL = [
  {
    id: 1,
    title: 'Pelaksanaan Posyandu Balita & Lansia Kelurahan Abeli Bulan Ini',
    content: 'Kegiatan Posyandu rutin kembali dilaksanakan di Kantor Kelurahan Abeli dengan tingkat partisipasi warga yang sangat tinggi.',
    category: 'Berita Kelurahan',
    author: 'Tim Kelurahan Abeli',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Daily Report KKN Hari Ke-12: Sosialisasi Saring Sebelum Sharing',
    content: 'Tim KKN Tematik sukses menyelenggarakan workshop literasi digital untuk pemuda karang taruna dan ibu-ibu PKK.',
    category: 'Daily Report KKN',
    author: 'Tim KKN Tematik',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Panduan Praktis Mengenali Ciri-Ciri Berita Hoax & Deepfake AI',
    content: 'Perkembangan AI memudahkan rekayasa foto dan suara (deepfake). Pastikan selalu memeriksa sumber berita melalui CekFakta.com.',
    category: 'Edukasi Anti-Hoax',
    author: 'Tim Redaksi Anti-Hoax',
    created_at: new Date().toISOString()
  }
];

let memoryArticles = null;

function readLocalDB() {
  if (memoryArticles) return memoryArticles;

  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      memoryArticles = JSON.parse(fileData);
      return memoryArticles;
    }
  } catch (err) {
    console.error('Error reading db.json:', err.message);
  }

  memoryArticles = [...SEED_ARTIKEL];
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryArticles, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Unable to write db.json (read-only filesystem on Vercel):', err.message);
  }
  return memoryArticles;
}

function writeLocalDB(data) {
  memoryArticles = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing db.json (read-only filesystem on Vercel):', err.message);
  }
}

function normalizeCoverImage(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

// ============================================================
// HELPER: Get active database connection
// Priority: MySQL > PostgreSQL > db.json
// ============================================================
function getDB() {
  if (mysqlPool) return 'mysql';
  if (pgClient) return 'pg';
  return 'json';
}

// ============================================================
// API ROUTES
// ============================================================

// --- 1. Admin Login ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  if (db === 'mysql') {
    try {
      const [rows] = await mysqlPool.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password]
      );
      if (rows.length > 0) {
        const user = rows[0];
        return res.json({ success: true, message: 'Login Berhasil', user: { username: user.username, name: user.nama_lengkap } });
      }
      return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    } catch (err) {
      console.error('MySQL login error:', err.message);
    }
  }

  if (db === 'pg') {
    try {
      const result = await pgClient.query(
        'SELECT * FROM users WHERE username = $1 AND password = $2',
        [username, password]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({ success: true, message: 'Login Berhasil', user: { username: user.username, name: user.nama_lengkap } });
      }
      return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    } catch (err) {
      console.error('Neon login error:', err.message);
    }
  }

  // Fallback: hard-coded credentials
  if (username === 'admin' && password === 'admin123') {
    return res.json({ success: true, message: 'Login Berhasil (offline)', user: { username: 'admin', name: 'Administrator Kelurahan Abeli' } });
  }
  return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
});

// --- 2. Get All Articles ---
app.get('/api/articles', async (req, res) => {
  const db = getDB();

  if (db === 'mysql') {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM articles ORDER BY id DESC');
      return res.json(rows);
    } catch (err) { console.error('MySQL GET articles error:', err.message); }
  }

  if (db === 'pg') {
    try {
      const result = await pgClient.query('SELECT * FROM articles ORDER BY id DESC');
      return res.json(result.rows);
    } catch (err) { console.error('Neon GET articles error:', err.message); }
  }

  res.json(readLocalDB());
});

// --- 3. Create Article ---
app.post('/api/articles', async (req, res) => {
  const { title, content, category, author, cover_image } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ success: false, message: 'Judul, konten, dan kategori wajib diisi!' });
  }
  const authorName = author || 'Tim Admin KKN';
  const coverImage = normalizeCoverImage(cover_image);
  const db = getDB();

  if (db === 'mysql') {
    try {
      const [result] = await mysqlPool.query(
        'INSERT INTO articles (title, content, category, author, cover_image) VALUES (?, ?, ?, ?, ?)',
        [title, content, category, authorName, coverImage]
      );
      const [rows] = await mysqlPool.query('SELECT * FROM articles WHERE id = ?', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) { console.error('MySQL POST articles error:', err.message); }
  }

  if (db === 'pg') {
    try {
      const result = await pgClient.query(
        'INSERT INTO articles (title, content, category, author, cover_image) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, content, category, authorName, coverImage]
      );
      return res.json(result.rows[0]);
    } catch (err) { console.error('Neon POST articles error:', err.message); }
  }

  const articles = readLocalDB();
  const newArticle = { id: Date.now(), title, content, category, author: authorName, cover_image: coverImage, created_at: new Date().toISOString() };
  articles.unshift(newArticle);
  writeLocalDB(articles);
  res.json(newArticle);
});

// --- 4. Update Article ---
app.put('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category, cover_image } = req.body;
  const coverImage = normalizeCoverImage(cover_image);
  const db = getDB();

  if (db === 'mysql') {
    try {
      await mysqlPool.query(
        'UPDATE articles SET title = ?, content = ?, category = ?, cover_image = ? WHERE id = ?',
        [title, content, category, coverImage, id]
      );
      const [rows] = await mysqlPool.query('SELECT * FROM articles WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Artikel tidak ditemukan' });
      return res.json(rows[0]);
    } catch (err) { console.error('MySQL PUT articles error:', err.message); }
  }

  if (db === 'pg') {
    try {
      const result = await pgClient.query(
        'UPDATE articles SET title = $1, content = $2, category = $3, cover_image = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [title, content, category, coverImage, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Artikel tidak ditemukan' });
      return res.json(result.rows[0]);
    } catch (err) { console.error('Neon PUT articles error:', err.message); }
  }

  let articles = readLocalDB();
  const idx = articles.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return res.status(404).json({ message: 'Artikel tidak ditemukan' });
  articles[idx] = { ...articles[idx], title, content, category, cover_image: coverImage };
  writeLocalDB(articles);
  res.json(articles[idx]);
});

// --- 5. Delete Article ---
app.delete('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  const db = getDB();

  if (db === 'mysql') {
    try {
      await mysqlPool.query('DELETE FROM articles WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Artikel berhasil dihapus' });
    } catch (err) { console.error('MySQL DELETE articles error:', err.message); }
  }

  if (db === 'pg') {
    try {
      await pgClient.query('DELETE FROM articles WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Artikel berhasil dihapus' });
    } catch (err) { console.error('Neon DELETE articles error:', err.message); }
  }

  let articles = readLocalDB().filter(a => String(a.id) !== String(id));
  writeLocalDB(articles);
  res.json({ success: true });
});

// Fallback GET route untuk menyajikan index.html untuk semua route non-API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(`🚀 Kelurahan Abeli Server: http://localhost:${PORT}`);
    const db = getDB();
    if (db === 'mysql') {
      console.log(`🛢️  Mode      : MySQL Laragon (${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database})`);
    } else if (db === 'pg') {
      console.log(`🛢️  Mode      : Neon PostgreSQL Database`);
    } else {
      console.log(`📁 Mode      : Local JSON File (db.json) Fallback`);
    }
    console.log(`============================================================`);
  });
}

module.exports = app;
