const STEP_X = 168;
const STEP_Y = 64;
const GAP = 8;
const MAX_LAYOUT_ATTEMPTS = 120;

const CARD_PRIORITY = [
  'card-zine',
  'card-logo',
  'card-settings',
  'card-upload',
  'card-export',
  'card-preview-fold'
];

function snapX(v) { return Math.round(v / STEP_X) * STEP_X; }
function snapY(v) { return Math.round(v / STEP_Y) * STEP_Y; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function savePos(id, left, top) {
  try { localStorage.setItem('zine-card3-' + id, JSON.stringify({ left, top })); } catch (_) {}
}
function loadPos(id) {
  try { const r = localStorage.getItem('zine-card3-' + id); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

function getCanvasSize(card) {
  const canvas = card?.parentElement;
  return {
    width: canvas?.offsetWidth || window.innerWidth,
    height: canvas?.offsetHeight || window.innerHeight
  };
}

function getCardBox(card) {
  return {
    left: card.offsetLeft,
    top: card.offsetTop,
    width: card.offsetWidth || 200,
    height: card.offsetHeight || 100
  };
}

function applyPos(card, left, top) {
  const { width: cw, height: ch } = getCanvasSize(card);
  card.style.left = clamp(left, GAP, Math.max(GAP, cw - card.offsetWidth - GAP)) + 'px';
  card.style.top = clamp(top, GAP, Math.max(GAP, ch - 48)) + 'px';
  card.style.right = 'auto';
  card.style.bottom = 'auto';
  card.style.transform = 'none';
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw + GAP && ax + aw + GAP > bx &&
         ay < by + bh + GAP && ay + ah + GAP > by;
}

function overlapsAny(cardBox, others) {
  return others.some((other) => {
    const ob = getCardBox(other);
    return rectsOverlap(
      cardBox.left, cardBox.top, cardBox.width, cardBox.height,
      ob.left, ob.top, ob.width, ob.height
    );
  });
}

function findNonOverlappingPos(card, left, top, others) {
  const width = card.offsetWidth || 200;
  const height = card.offsetHeight || 100;
  const { width: vw } = getCanvasSize(card);

  let tryLeft = snapX(left);
  let tryTop = snapY(top);
  const startLeft = tryLeft;

  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    const candidate = { left: tryLeft, top: tryTop, width, height };
    if (!overlapsAny(candidate, others)) {
      return { left: tryLeft, top: tryTop };
    }

    tryLeft += STEP_X;
    if (tryLeft + width > vw - GAP) {
      tryLeft = startLeft;
      tryTop += STEP_Y;
    }
  }

  // Fallback: stack below the lowest placed card.
  const lowestBottom = others.reduce((max, other) => {
    const box = getCardBox(other);
    return Math.max(max, box.top + box.height);
  }, GAP);

  return {
    left: snapX(GAP),
    top: snapY(lowestBottom + GAP)
  };
}

function measureZineBottom(cards) {
  const zine = cards.find((card) => card.id === 'card-zine');
  if (zine?.offsetHeight) {
    return zine.offsetTop + zine.offsetHeight + GAP;
  }

  const vw = window.innerWidth;
  const zineCardW = Math.min(660, vw - 16);
  const sheetH = (zineCardW - 8) * (8.5 / 11);
  return 60 + 42 + 8 + sheetH + 12;
}

function defaultPos(card, cards) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = card.offsetWidth || 200;

  if (card.id === 'card-zine') return { left: GAP, top: 60 };

  if (card.id === 'card-logo') {
    return { left: vw - (card.offsetWidth || 160) - GAP, top: GAP };
  }

  const zineCardW = Math.min(660, vw - 16);
  const zineBottom = measureZineBottom(cards);
  const logo = cards.find((c) => c.id === 'card-logo');
  const logoBottom = logo
    ? logo.offsetTop + logo.offsetHeight + GAP
    : 52;

  const colA = vw - w - GAP;
  const sidebarFits = colA >= (GAP + zineCardW + GAP);
  const colB = vw - (w + GAP) * 2 - GAP;
  const twoSidebarCols = sidebarFits && colB >= GAP + zineCardW + GAP;
  const topRow = Math.max(60, logoBottom);

  if (sidebarFits) {
    const cb = twoSidebarCols ? colB : colA;
    const botRow = snapY(Math.min(vh - 130, zineBottom + 24));

    return {
      'card-settings': { left: colA, top: topRow },
      'card-upload': { left: cb, top: topRow },
      'card-export': { left: colA, top: botRow },
      'card-preview-fold': { left: cb, top: botRow }
    }[card.id] || { left: colA, top: topRow };
  }

  const twoFit = (w * 2 + GAP * 3) <= vw;
  const leftCol = GAP;
  const rightCol = twoFit ? vw - w - GAP : GAP;
  const row0 = snapY(zineBottom);
  const row1 = row0 + snapY(280);

  return {
    'card-settings': { left: rightCol, top: row0 },
    'card-upload': { left: leftCol, top: row0 },
    'card-export': { left: rightCol, top: row1 },
    'card-preview-fold': { left: leftCol, top: row1 }
  }[card.id] || { left: leftCol, top: row0 };
}

function updateCanvasHeight(cards) {
  const canvas = document.getElementById('canvas-surface');
  if (!canvas) return;

  const maxBottom = cards.reduce((max, card) => {
    const box = getCardBox(card);
    return Math.max(max, box.top + box.height);
  }, 0);

  canvas.style.minHeight = `${Math.max(window.innerHeight, maxBottom + GAP * 4)}px`;
}

function layoutAllCards(cards, { useSaved = true } = {}) {
  const ordered = [...cards].sort((a, b) => {
    const ai = CARD_PRIORITY.indexOf(a.id);
    const bi = CARD_PRIORITY.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const placed = [];

  ordered.forEach((card) => {
    const saved = useSaved ? loadPos(card.id) : null;
    const preferred = saved || defaultPos(card, cards);
    const { left, top } = findNonOverlappingPos(card, preferred.left, preferred.top, placed);

    applyPos(card, left, top);
    placed.push(card);
    savePos(card.id, parseFloat(card.style.left), parseFloat(card.style.top));
  });

  updateCanvasHeight(cards);
}

function enableDrag(card, overlay, cards) {
  const handle = card.querySelector('.snap-card-handle') || card;
  let startX, startY, startLeft, startTop, active = false;

  function begin(px, py) {
    active = true;
    startX = px; startY = py;
    startLeft = card.offsetLeft;
    startTop = card.offsetTop;
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.style.transform = 'none';
    card.style.transition = 'none';
    card.classList.add('is-dragging');
    document.querySelectorAll('.snap-card').forEach((c) => { c.style.zIndex = ''; });
    card.style.zIndex = '200';
    if (overlay) overlay.classList.add('is-visible');
  }

  function move(px, py) {
    if (!active) return;
    card.style.left = (startLeft + px - startX) + 'px';
    card.style.top = (startTop + py - startY) + 'px';
  }

  function settle() {
    if (!active) return;
    active = false;
    card.classList.remove('is-dragging');
    card.style.zIndex = '';
    if (overlay) overlay.classList.remove('is-visible');
    card.style.transition = '';

    const snappedLeft = snapX(parseFloat(card.style.left));
    const snappedTop = snapY(parseFloat(card.style.top));
    const others = cards.filter((c) => c !== card);
    const { left, top } = findNonOverlappingPos(card, snappedLeft, snappedTop, others);

    applyPos(card, left, top);
    savePos(card.id, parseFloat(card.style.left), parseFloat(card.style.top));
    updateCanvasHeight(cards);
  }

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    begin(e.pageX, e.pageY);
    const mm = (e2) => move(e2.pageX, e2.pageY);
    const mu = () => {
      settle();
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    e.preventDefault();
  });

  handle.addEventListener('touchstart', (e) => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    const t = e.touches[0];
    begin(t.pageX, t.pageY);
    const tm = (e2) => {
      e2.preventDefault();
      const t2 = e2.touches[0];
      move(t2.pageX, t2.pageY);
    };
    const te = () => {
      settle();
      document.removeEventListener('touchmove', tm);
      document.removeEventListener('touchend', te);
    };
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', te);
  }, { passive: true });
}

export function initSnapGrid() {
  const overlay = document.getElementById('snap-grid-overlay');
  const cards = [...document.querySelectorAll('.snap-card')];

  // Double rAF so card dimensions are measured before overlap resolution.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      layoutAllCards(cards);
      cards.forEach((card) => enableDrag(card, overlay, cards));
    });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layoutAllCards(cards), 150);
  });
}