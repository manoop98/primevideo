// ==================================================================
//  PrimeClone frontend
//  The browser only ever calls RELATIVE URLs like "/api/movies".
//  nginx (in the same container that serves this file) forwards
//  /api/* to the backend Service. So the frontend never needs to
//  know the backend's IP - that is the key idea for students.
// ==================================================================
const API = '/api';

const state = {
  view: 'home',
  movies: [],
  categories: [],
  watchlistIds: new Set(),
  token: localStorageGet('pc_token'),
  user: JSON.parse(localStorageGet('pc_user') || 'null'),
  featured: null,
  current: null,
  authMode: 'login',
};

const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2500);
}

function gradient(m) { return `linear-gradient(135deg, ${m.color_from}, ${m.color_to})`; }

function metaHTML(m) {
  return `
    <span class="imdb">IMDb ${m.imdb_score}</span>
    <span>${m.release_year}</span>
    <span>${m.duration}</span>
    <span class="rating">${m.age_rating}</span>
    <span>${m.language}</span>
    <span>${m.genre}</span>`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- rendering ----------
function cardHTML(m) {
  return `
    <div class="card" style="background:${gradient(m)}" data-id="${m.id}">
      <span class="tag">${m.type === 'series' ? 'SERIES' : 'MOVIE'}</span>
      <div class="card-title">${escapeHTML(m.title)}</div>
      <div class="card-sub">${m.genre} &middot; ${m.release_year} &middot; IMDb ${m.imdb_score}</div>
    </div>`;
}

function rowHTML(title, list) {
  if (!list.length) return '';
  return `
    <section class="row">
      <h3><span class="prime">prime</span> ${escapeHTML(title)}</h3>
      <div class="row-track">${list.map(cardHTML).join('')}</div>
    </section>`;
}

function renderHero(m) {
  if (!m) return;
  state.featured = m;
  $('hero').style.background = gradient(m);
  $('heroTitle').textContent = m.title;
  $('heroMeta').innerHTML = metaHTML(m);
  $('heroDesc').textContent = m.description;
}

function renderRows(list) {
  const rows = $('rows');
  if (state.view === 'home') {
    rows.innerHTML = state.categories
      .map((c) => rowHTML(c.name, list.filter((m) => m.category_id === c.id)))
      .join('');
  } else {
    const titles = { movie: 'Movies', series: 'TV Shows', watchlist: 'My Watchlist', search: 'Search results' };
    rows.innerHTML = list.length
      ? rowHTML(titles[state.view], list)
      : `<p class="empty">${state.view === 'watchlist' ? 'Your watchlist is empty. Add something with the + button.' : 'Nothing found.'}</p>`;
  }
}

// ---------- data loading ----------
async function loadHome() {
  const [categories, movies, featured] = await Promise.all([
    api('/categories'), api('/movies'), api('/movies/featured'),
  ]);
  state.categories = categories;
  state.movies = movies;
  renderHero(featured[Math.floor(Math.random() * featured.length)] || movies[0]);
  renderRows(movies);
}

async function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  $('searchInput').value = '';
  try {
    if (view === 'home') return renderRows(state.movies);
    if (view === 'watchlist') {
      if (!state.token) { openAuth('login'); return switchView('home'); }
      return renderRows(await api('/watchlist'));
    }
    renderRows(state.movies.filter((m) => m.type === view));
  } catch (e) { toast(e.message); }
}

async function loadWatchlistIds() {
  if (!state.token) { state.watchlistIds = new Set(); return; }
  try {
    const list = await api('/watchlist');
    state.watchlistIds = new Set(list.map((m) => m.id));
  } catch { logout(true); }
}

// ---------- details modal ----------
function openDetails(id) {
  const m = state.movies.find((x) => x.id === Number(id));
  if (!m) return;
  state.current = m;
  $('detailBanner').style.background = gradient(m);
  $('detailTitle').textContent = m.title;
  $('detailMeta').innerHTML = metaHTML(m);
  $('detailDesc').textContent = m.description;
  updateWatchlistBtn();
  $('detailModal').classList.add('open');
}

function updateWatchlistBtn() {
  const inList = state.current && state.watchlistIds.has(state.current.id);
  $('detailWatchlist').textContent = inList ? '✓ In Watchlist' : '+ Watchlist';
}

async function toggleWatchlist(movie) {
  if (!state.token) return openAuth('login');
  try {
    if (state.watchlistIds.has(movie.id)) {
      await api(`/watchlist/${movie.id}`, { method: 'DELETE' });
      state.watchlistIds.delete(movie.id);
      toast(`Removed "${movie.title}" from your watchlist`);
    } else {
      await api(`/watchlist/${movie.id}`, { method: 'POST' });
      state.watchlistIds.add(movie.id);
      toast(`Added "${movie.title}" to your watchlist`);
    }
    updateWatchlistBtn();
    if (state.view === 'watchlist') switchView('watchlist');
  } catch (e) { toast(e.message); }
}

// ---------- auth ----------
function openAuth(mode) {
  state.authMode = mode;
  const reg = mode === 'register';
  $('authTitle').textContent = reg ? 'Create account' : 'Sign in';
  $('authSubmit').textContent = reg ? 'Create your account' : 'Sign in';
  $('authName').classList.toggle('hidden', !reg);
  $('authName').required = reg;
  $('authSwitchText').textContent = reg ? 'Already have an account?' : 'New to PrimeClone?';
  $('authSwitch').textContent = reg ? 'Sign in' : 'Create an account';
  $('authError').textContent = '';
  $('authModal').classList.add('open');
}

async function submitAuth(e) {
  e.preventDefault();
  const body = { email: $('authEmail').value, password: $('authPassword').value };
  if (state.authMode === 'register') body.name = $('authName').value;
  try {
    const data = await api(`/auth/${state.authMode}`, { method: 'POST', body: JSON.stringify(body) });
    state.token = data.token;
    state.user = data.user;
    localStorageSet('pc_token', data.token);
    localStorageSet('pc_user', JSON.stringify(data.user));
    $('authModal').classList.remove('open');
    $('authForm').reset();
    updateUserBtn();
    await loadWatchlistIds();
    toast(`Welcome, ${data.user.name}!`);
  } catch (err) { $('authError').textContent = err.message; }
}

function logout(silent) {
  state.token = null; state.user = null; state.watchlistIds = new Set();
  localStorageSet('pc_token', null); localStorageSet('pc_user', null);
  updateUserBtn();
  if (!silent) toast('Signed out');
  if (state.view === 'watchlist') switchView('home');
}

function updateUserBtn() {
  $('userBtn').textContent = state.user ? `Hi, ${state.user.name.split(' ')[0]} (Sign out)` : 'Sign in';
}

// ---------- API status (shows which backend pod answered) ----------
async function checkHealth() {
  const el = $('apiStatus');
  try {
    const h = await fetch(`${API}/health`).then((r) => r.json());
    const r = await fetch(`${API}/ready`).then((r) => r.json());
    el.textContent = `API: ${h.status} · DB: ${r.database} · served by pod ${h.pod || 'local'}`;
    el.className = 'api-status ok';
  } catch {
    el.textContent = 'API unreachable';
    el.className = 'api-status err';
  }
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) return openDetails(card.dataset.id);
  const nav = e.target.closest('[data-view]');
  if (nav) { e.preventDefault(); return switchView(nav.dataset.view); }
  if (e.target.matches('[data-close]') || e.target.classList.contains('modal')) {
    e.target.closest('.modal').classList.remove('open');
  }
});

$('userBtn').onclick = () => (state.user ? logout() : openAuth('login'));
$('authSwitch').onclick = (e) => { e.preventDefault(); openAuth(state.authMode === 'login' ? 'register' : 'login'); };
$('authForm').onsubmit = submitAuth;
$('heroInfo').onclick = () => state.featured && openDetails(state.featured.id);
$('heroAdd').onclick = () => state.featured && toggleWatchlist(state.featured);
$('heroPlay').onclick = $('detailPlay').onclick = () => toast('▶ Playback is a demo - no video streaming in this project');
$('detailWatchlist').onclick = () => state.current && toggleWatchlist(state.current);

let searchTimer;
$('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  searchTimer = setTimeout(async () => {
    if (!q) return switchView('home');
    state.view = 'search';
    try { renderRows(await api(`/movies?search=${encodeURIComponent(q)}`)); } catch (err) { toast(err.message); }
  }, 300);
});

window.addEventListener('scroll', () => $('navbar').classList.toggle('scrolled', window.scrollY > 40));

// ---------- start ----------
(async function init() {
  updateUserBtn();
  checkHealth();
  setInterval(checkHealth, 10000);
  try {
    await loadHome();
    await loadWatchlistIds();
  } catch (e) {
    $('heroTitle').textContent = 'Backend not reachable';
    $('heroDesc').textContent = 'The frontend loaded, but /api did not respond. Check the backend pod and the MySQL pod (kubectl get pods -n primeclone).';
  }
})();
