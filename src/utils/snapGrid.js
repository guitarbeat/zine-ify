const STEP_X = 168;
const STEP_Y = 64;
const GAP = 8;

function snapX(v) { return Math.round(v / STEP_X) * STEP_X; }
function snapY(v) { return Math.round(v / STEP_Y) * STEP_Y; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function savePos(id, left, top) {
  try { localStorage.setItem('zine-card3-' + id, JSON.stringify({ left, top })); } catch (_) {}
}
function loadPos(id) {
  try { const r = localStorage.getItem('zine-card3-' + id); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

function applyPos(card, left, top) {
  const canvas = card.parentElement;
  const cw = canvas ? canvas.offsetWidth  : window.innerWidth;
  const ch = canvas ? canvas.offsetHeight : window.innerHeight;
  card.style.left   = clamp(left, GAP, Math.max(GAP, cw - card.offsetWidth  - GAP)) + 'px';
  card.style.top    = clamp(top,  GAP, Math.max(GAP, ch - 48)) + 'px';
  card.style.right  = 'auto';
  card.style.bottom = 'auto';
  card.style.transform = 'none';
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw + GAP && ax + aw + GAP > bx &&
         ay < by + bh + GAP && ay + ah + GAP > by;
}

function findNonOverlappingPos(card, left, top, others) {
  const cw = card.offsetWidth || 200;
  const ch = card.offsetHeight || 100;
  const vw = (card.parentElement ? card.parentElement.offsetWidth : window.innerWidth) || window.innerWidth;

  let tryLeft = left;
  let tryTop  = top;

  for (let attempt = 0; attempt < 40; attempt++) {
    const blocked = others.some(other => {
      if (other === card) return false;
      return rectsOverlap(
        tryLeft, tryTop, cw, ch,
        other.offsetLeft, other.offsetTop,
        other.offsetWidth || 200, other.offsetHeight || 100
      );
    });

    if (!blocked) return { left: tryLeft, top: tryTop };

    tryLeft += STEP_X;
    if (tryLeft + cw > vw - GAP) {
      tryLeft = GAP;
      tryTop += STEP_Y;
    }
  }

  return { left, top };
}

function defaultPos(card) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w  = card.offsetWidth  || 200;

  if (card.id === 'card-zine') return { left: GAP, top: 60 };

  if (card.id === 'card-logo') {
    return { left: vw - (card.offsetWidth || 160) - GAP, top: GAP };
  }

  const zineCardW = Math.min(660, vw - 16);
  const sheetH    = (zineCardW - 8) * (8.5 / 11);
  const zineBottom = 60 + 42 + 8 + sheetH + 12;

  const colA = vw - w - GAP;
  const sidebarFits = colA >= (GAP + zineCardW + GAP);

  const colB = vw - (w + GAP) * 2 - GAP;
  const twoSidebarCols = sidebarFits && colB >= GAP + zineCardW + GAP;

  if (sidebarFits) {
    const cb = twoSidebarCols ? colB : colA;
    const botRow = snapY(Math.min(vh - 130, 460));

    return {
      'card-settings':     { left: colA, top: 60  },
      'card-upload':       { left: cb,   top: 60  },
      'card-export':       { left: colA, top: botRow },
      'card-preview-fold': { left: cb,   top: botRow },
    }[card.id] || { left: colA, top: 60 };
  }

  const twoFit = (w * 2 + GAP * 3) <= vw;
  const leftCol  = GAP;
  const rightCol = twoFit ? vw - w - GAP : GAP;
  const row0 = snapY(zineBottom);
  const row1 = row0 + snapY(260);

  return {
    'card-settings':     { left: rightCol, top: row0 },
    'card-upload':       { left: leftCol,  top: row0 },
    'card-export':       { left: rightCol, top: row1 },
    'card-preview-fold': { left: leftCol,  top: row1 },
  }[card.id] || { left: leftCol, top: row0 };
}

function enableDrag(card, overlay, cards) {
  const handle = card.querySelector('.snap-card-handle') || card;
  let startX, startY, startLeft, startTop, active = false;

  function begin(px, py) {
    active = true;
    startX = px; startY = py;
    startLeft = card.offsetLeft;
    startTop  = card.offsetTop;
    card.style.right  = 'auto';
    card.style.bottom = 'auto';
    card.style.transform  = 'none';
    card.style.transition = 'none';
    card.classList.add('is-dragging');
    document.querySelectorAll('.snap-card').forEach(c => c.style.zIndex = '');
    card.style.zIndex = '200';
    if (overlay) overlay.classList.add('is-visible');
  }

  function move(px, py) {
    if (!active) return;
    card.style.left = (startLeft + px - startX) + 'px';
    card.style.top  = (startTop  + py - startY) + 'px';
  }

  function settle() {
    if (!active) return;
    active = false;
    card.classList.remove('is-dragging');
    card.style.zIndex = '';
    if (overlay) overlay.classList.remove('is-visible');
    card.style.transition = '';

    const snappedLeft = snapX(parseFloat(card.style.left));
    const snappedTop  = snapY(parseFloat(card.style.top));

    const others = cards.filter(c => c !== card);
    const { left, top } = findNonOverlappingPos(card, snappedLeft, snappedTop, others);

    applyPos(card, left, top);
    savePos(card.id, parseFloat(card.style.left), parseFloat(card.style.top));
  }

  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    begin(e.pageX, e.pageY);
    const mm = e2 => move(e2.pageX, e2.pageY);
    const mu = () => { settle(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    e.preventDefault();
  });

  handle.addEventListener('touchstart', e => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    const t = e.touches[0];
    begin(t.pageX, t.pageY);
    const tm = e2 => { e2.preventDefault(); const t2 = e2.touches[0]; move(t2.pageX, t2.pageY); };
    const te = () => { settle(); document.removeEventListener('touchmove', tm); document.removeEventListener('touchend', te); };
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', te);
  }, { passive: true });
}

export function initSnapGrid() {
  const overlay = document.getElementById('snap-grid-overlay');
  const cards   = [...document.querySelectorAll('.snap-card')];

  function placeCard(card) {
    const saved = loadPos(card.id);
    const pos   = saved || defaultPos(card);
    applyPos(card, pos.left, pos.top);
  }

  requestAnimationFrame(() => {
    cards.forEach(card => {
      placeCard(card);
      enableDrag(card, overlay, cards);
    });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => cards.forEach(placeCard), 150);
  });
}
