const STEP_X = 168;
const STEP_Y = 64;
const GAP = 8;

function snap(val, step) { return Math.round(val / step) * step; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function savePos(id, left, top) {
  try { localStorage.setItem('zine-card-' + id, JSON.stringify({ left, top })); } catch (_) {}
}
function loadPos(id) {
  try { const r = localStorage.getItem('zine-card-' + id); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

function applyPos(card, left, top) {
  const maxLeft = window.innerWidth - card.offsetWidth - GAP;
  const maxTop = window.innerHeight - 48;
  card.style.left = clamp(left, GAP, maxLeft) + 'px';
  card.style.top = clamp(top, GAP, maxTop) + 'px';
  card.style.right = 'auto';
  card.style.bottom = 'auto';
  card.style.transform = 'none';
}

function defaultPos(card) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = card.offsetWidth || 240;

  // Two right-side columns
  const colA = vw - w - GAP;             // rightmost column
  const colB = vw - (w + GAP) * 2 - GAP; // one column left of that

  const posMap = {
    'card-logo':         { left: colA,  top: GAP },
    'card-status':       { left: Math.max(GAP, Math.round((vw - w) / 2)), top: GAP },
    'card-settings':     { left: colA,  top: 56 },
    'card-upload':       { left: colB,  top: 56 },
    'card-export':       { left: colA,  top: Math.min(vh - 120, 448) },
    'card-preview-fold': { left: colB,  top: Math.min(vh - 120, 448) },
  };

  return posMap[card.id] || { left: GAP, top: GAP };
}

function enableDrag(card, overlay) {
  const handle = card.querySelector('.snap-card-handle') || card;
  let startX, startY, startLeft, startTop, active = false;

  function begin(cx, cy) {
    active = true;
    const rect = card.getBoundingClientRect();
    startX = cx; startY = cy;
    startLeft = rect.left; startTop = rect.top;
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.style.transform = 'none';
    card.style.transition = 'none';
    card.classList.add('is-dragging');
    if (overlay) overlay.classList.add('is-visible');
  }

  function move(cx, cy) {
    if (!active) return;
    card.style.left = (startLeft + cx - startX) + 'px';
    card.style.top  = (startTop  + cy - startY) + 'px';
  }

  function settle() {
    if (!active) return;
    active = false;
    card.classList.remove('is-dragging');
    if (overlay) overlay.classList.remove('is-visible');
    card.style.transition = '';
    const sl = snap(parseFloat(card.style.left), STEP_X);
    const st = snap(parseFloat(card.style.top), STEP_Y);
    applyPos(card, sl, st);
    savePos(card.id, parseFloat(card.style.left), parseFloat(card.style.top));
  }

  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    begin(e.clientX, e.clientY);
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    e.preventDefault();
  });

  const mm = e => move(e.clientX, e.clientY);
  const mu = () => { settle(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };

  handle.addEventListener('touchstart', e => {
    if (e.target.closest('button,input,select,label,details,summary,a')) return;
    const t = e.touches[0];
    begin(t.clientX, t.clientY);
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', te);
  }, { passive: true });

  const tm = e => { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY); };
  const te = () => { settle(); document.removeEventListener('touchmove', tm); document.removeEventListener('touchend', te); };
}

export function initSnapGrid() {
  const overlay = document.getElementById('snap-grid-overlay');
  const cards = document.querySelectorAll('.snap-card');

  // Position all cards: saved position or computed default
  function placeCard(card) {
    const saved = loadPos(card.id);
    if (saved) {
      applyPos(card, saved.left, saved.top);
    } else {
      const pos = defaultPos(card);
      applyPos(card, pos.left, pos.top);
    }
  }

  // Wait one frame so card sizes are computed
  requestAnimationFrame(() => {
    cards.forEach(card => {
      placeCard(card);
      enableDrag(card, overlay);
    });
  });

  window.addEventListener('resize', () => {
    cards.forEach(card => {
      const saved = loadPos(card.id);
      if (saved) {
        applyPos(card, saved.left, saved.top);
      }
    });
  });
}
