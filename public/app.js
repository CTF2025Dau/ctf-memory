let boardData = [];
let flipped = [];
let lock = false;

const boardEl = document.getElementById('board');
const iconsEl = document.getElementById('icons');
const messagesEl = document.getElementById('messages');

const modal = document.getElementById('modal');
const answerInput = document.getElementById('answerInput');
const submitAnswer = document.getElementById('submitAnswer');
const cancelAnswer = document.getElementById('cancelAnswer');
const modalResult = document.getElementById('modalResult');

async function loadBoard() {
  const res = await fetch('/api/board');
  const j = await res.json();
  boardData = j.board;

  // 🟢 applique automatiquement la grille 4x4
  boardEl.style.display = 'grid';
  boardEl.style.gridTemplateColumns = `repeat(${j.cols}, 1fr)`;
  boardEl.style.gap = '14px';
  boardEl.style.maxWidth = `${j.cols * 160}px`;
  boardEl.style.margin = '30px auto';

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';
  boardData.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">?</div>
        <div class="card-face card-back"></div>
      </div>`;
    card.addEventListener('click', onFlip);
    boardEl.appendChild(card);
  });
}

async function onFlip(e) {
  if (lock) return;
  const card = e.currentTarget;
  if (card.classList.contains('flipped')) return;
  const id = card.dataset.id;

  const res = await fetch(`/api/flip/${id}`);
  const j = await res.json();
  card.querySelector('.card-back').innerHTML = `<img src="${j.img}" alt="">`;
  card.classList.add('flipped');
  flipped.push({ id, card });

  if (flipped.length === 2) {
    lock = true;
    const [a, b] = flipped;
    const check = await fetch('/api/check-pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first: a.id, second: b.id })
    });
    const result = await check.json();
    if (result.match) {
      addIcon();
      flipped = [];
      lock = false;
    } else {
      setTimeout(() => {
        a.card.classList.remove('flipped');
        b.card.classList.remove('flipped');
        flipped = [];
        lock = false;
      }, 900);
    }
  }
}

function addIcon() {
  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = '🏛';
  icon.title = 'Clique pour nommer le lieu';
  icon.addEventListener('click', openModal);
  iconsEl.appendChild(icon);
}

function openModal(e) {
  modal.classList.remove('hidden');
  modalResult.textContent = '';
  answerInput.value = '';
  e.currentTarget.classList.add('locked');
}

cancelAnswer.addEventListener('click', () => {
  modal.classList.add('hidden');
});

submitAnswer.addEventListener('click', async () => {
  const answer = answerInput.value.trim();
  if (!answer) return;
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer })
  });
  const j = await res.json();
  if (j.correct) {
    modalResult.textContent = `✅ Correct ! Flag : ${j.flag}`;
    messagesEl.textContent = `Flag obtenu : ${j.flag}`;
    if (j.allFound) {
      alert(`🎉 Tous trouvés ! FLAG FINAL : ${j.finalFlag}`);
      messagesEl.textContent += `\nFlag final : ${j.finalFlag}`;
    }
    setTimeout(() => modal.classList.add('hidden'), 1500);
  } else {
    modalResult.textContent = '❌ Mauvaise réponse.';
  }
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  await fetch('/api/reset', { method: 'POST' });
  iconsEl.innerHTML = '';
  messagesEl.innerHTML = '';
  loadBoard();
});

window.addEventListener('load', loadBoard);
