// ==================================================================
//  PrimeClone API  (Node.js + Express + MySQL)
//
//  Request flow:
//   Browser -> Frontend (nginx) -> /api/*  -> THIS backend -> MySQL
// ==================================================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectWithRetry, getPool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
let dbReady = false;

// Simple request logger - students can watch this with `kubectl logs`
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

// ------------------------------------------------------------------
//  Health checks (used by Kubernetes probes)
//   /api/health -> liveness  : "is the Node process alive?"
//   /api/ready  -> readiness : "can I serve traffic? (DB reachable)"
// ------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'primeclone-backend', pod: process.env.HOSTNAME });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not-ready', database: 'disconnected' });
  }
});

// Block API calls until DB is connected
app.use('/api', (req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database is starting, try again shortly' });
  next();
});

// ------------------------------------------------------------------
//  Auth middleware (JWT)
// ------------------------------------------------------------------
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ------------------------------------------------------------------
//  Catalogue
// ------------------------------------------------------------------
app.get('/api/categories', async (_req, res, next) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM categories ORDER BY sort_order');
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/movies?category=action&search=cloud
app.get('/api/movies', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let sql = `SELECT m.*, c.name AS category_name, c.slug AS category_slug
               FROM movies m LEFT JOIN categories c ON m.category_id = c.id WHERE 1=1`;
    const params = [];
    if (category) { sql += ' AND c.slug = ?'; params.push(category); }
    if (search) {
      sql += ' AND (m.title LIKE ? OR m.genre LIKE ? OR m.language LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY m.imdb_score DESC';
    const [rows] = await getPool().query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/movies/featured', async (_req, res, next) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM movies WHERE is_featured = TRUE');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/movies/:id', async (req, res, next) => {
  try {
    const [rows] = await getPool().query(
      `SELECT m.*, c.name AS category_name FROM movies m
       LEFT JOIN categories c ON m.category_id = c.id WHERE m.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------
//  Users
// ------------------------------------------------------------------
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await getPool().query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email.toLowerCase(), hash]);

    const user = { id: result.insertId, name, email: email.toLowerCase() };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
    next(e);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------
//  Watchlist (requires login)
// ------------------------------------------------------------------
app.get('/api/watchlist', auth, async (req, res, next) => {
  try {
    const [rows] = await getPool().query(
      `SELECT m.* FROM watchlist w JOIN movies m ON w.movie_id = m.id
       WHERE w.user_id = ? ORDER BY w.added_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

app.post('/api/watchlist/:movieId', auth, async (req, res, next) => {
  try {
    await getPool().query('INSERT IGNORE INTO watchlist (user_id, movie_id) VALUES (?, ?)', [req.user.id, req.params.movieId]);
    res.status(201).json({ added: true });
  } catch (e) { next(e); }
});

app.delete('/api/watchlist/:movieId', auth, async (req, res, next) => {
  try {
    await getPool().query('DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?', [req.user.id, req.params.movieId]);
    res.json({ removed: true });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------
//  Error handler
// ------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ------------------------------------------------------------------
//  Start: open the port first (so liveness passes), then connect DB
// ------------------------------------------------------------------
app.listen(PORT, () => console.log(`[api] PrimeClone backend listening on port ${PORT}`));

connectWithRetry()
  .then(() => { dbReady = true; })
  .catch((err) => { console.error(err.message); process.exit(1); });
