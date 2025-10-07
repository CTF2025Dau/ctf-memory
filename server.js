// server.js — version sécurisée pour déploiement (Render-ready)
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Vérification du secret de session ---
if (!process.env.SESSION_SECRET) {
  console.error('❌ ERREUR: la variable SESSION_SECRET n’est pas définie.');
  console.error('Ajoute-la dans Render > Environment.');
  process.exit(1);
}

// --- Config session (secure) ---
app.set('trust proxy', 1); // nécessaire derrière proxy HTTPS (Render)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: 'auto', // HTTPS seulement
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 // 1h
  }
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Lieux en Tunisie ---
const PLACES = [
  { slug: 'sidi_bou_said', name: 'Sidi Bou Said' },
  { slug: 'dougga', name: 'Dougga' },
  { slug: 'chebika', name: 'Chebika' },
  { slug: 'tunis_medina', name: 'Medina' },
  { slug: 'el_jem', name: 'Djem' },
  { slug: 'bizerte', name: 'Bizerte' },
  { slug: 'matmata', name: 'Matmata' },
  { slug: 'gafsa', name: 'Gafsa' },
];

// --- Fonctions utilitaires ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateBoard() {
  const pairs = [];
  PLACES.forEach(p => {
    pairs.push({ slug: p.slug, img: `/images/${p.slug}.jpg` });
    pairs.push({ slug: p.slug, img: `/images/${p.slug}.jpg` });
  });
  shuffle(pairs);
  return pairs;
}

function placeFlag(slug) {
  return `ITLABCTF{PLACE_${slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}}`;
}

const FINAL_FLAG = process.env.FINAL_FLAG || 'ITLABCTF{TUNISIA_MASTER}';

// --- Initialisation session ---
app.use((req, res, next) => {
  if (!req.session.board) {
    req.session.board = generateBoard();
    req.session.revealed = [];
    req.session.foundPairs = {};
  }
  next();
});

// --- Routes API ---
app.get('/api/board', (req, res) => {
  const board = req.session.board.map((_, idx) => ({ id: idx }));
  res.json({ rows: 4, cols: 4, board });
});


app.get('/api/flip/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= req.session.board.length)
    return res.status(400).json({ error: 'ID invalide' });

  const card = req.session.board[id];
  req.session.revealed.push(id);
  res.json({ id, img: card.img });
});

app.post('/api/check-pair', (req, res) => {
  const { first, second } = req.body;
  if (first == null || second == null)
    return res.status(400).json({ error: 'Indices manquants' });

  const b = req.session.board;
  const isMatch = b[first].slug === b[second].slug;
  res.json({ match: isMatch });
});

app.post('/api/validate', (req, res) => {
  const { answer } = req.body;
  if (!answer) return res.status(400).json({ ok: false, msg: 'Réponse manquante' });

  const lower = answer.trim().toLowerCase();
  const found = PLACES.find(p => p.name.toLowerCase() === lower);
  if (!found) return res.json({ ok: true, correct: false });

  req.session.foundPairs[found.slug] = true;
  const flag = placeFlag(found.slug);
  const allFound = PLACES.every(p => req.session.foundPairs[p.slug]);

  res.json({
    ok: true,
    correct: true,
    flag,
    allFound,
    finalFlag: allFound ? FINAL_FLAG : null
  });
});

app.get('/api/progress', (req, res) => {
  res.json({ found: Object.keys(req.session.foundPairs) });
});

app.post('/api/reset', (req, res) => {
  req.session.board = generateBoard();
  req.session.revealed = [];
  req.session.foundPairs = {};
  res.json({ ok: true });
});

// --- Lancement ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur ITLABCTF lancé sur le port ${PORT}`);
});
