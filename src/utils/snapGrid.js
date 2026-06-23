const STEP_X = 168;
const STEP_Y = 64;
const GAP = 8;

function snap(val, step) { return Math.round(val / step) * step; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function savePos(id, left, top) {
  try { localStorage.setItem('zine-card2-' + id, JSON.stringify({ left, top })); } catch (_) {}
}
function loadPos(id) {
  try { const r = localStorage.getItem('zine-card2-' + id); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}

function applyPos(card, left, top) {
  const canvas = card.parentElement;
  const maxLeft = Math.max(GAP, (canvas ? canvas.offsetWidth : window.innerWidth) - card.offsetWidth - GAP);
  const maxTop  = Math.max(GAP, (canvas ? canvas.offsetHeight : window.innerHeight) - 48);
  card.style.left = clamp(left, GAP, maxLeft) + 'px';
  card.style.top  = clamp(top,  GAP, maxTop)  + 'px';
  card.style.right = 'auto';
  card.style.bottom = 'auto';
  card.style.transform = 'none';
}

function defaultPos(card) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w  = card.offsetWidth || 240;

  // right-side columns, viewport-relative (canvas starts at 0,0)
  const colA = vw - w - GAP;
  const colB = vw - (w + GAP) * 2 - GAP;

  const map = {
    'card-logo':         { left: colA,                                    top: GAP },
    'card-zine':         { left: GAP,                                     top: 60 },
    'card-settings':     { left: colA,                                    top: 60 },
    'card-upload':       { left: colB,                                    top: 60 },
    'card-export':       { left: colA,                                    top: Math.min(vh - 120, 460) },
    'card-preview-fold': { left: colB,                                    top: Math.min(vh - 120, 460) },
  };
  return map[card.id] || { left: GAP, top: GAP };
}

function enableDrag(card, overlay) {
  const handle = card.querySelector('.snap-card-handle') || card;
  let startX, startY, startLeft, startTop, active = false;

  function begin(px, py) {
    active = true;
    startX = px; startY = py;
    startLeft = card.offsetLeft;
    startTop  = card.offsetTop;
    card.style.left = startLeft + 'px';
    card.style.top  = startTop  + 'px';
    card.style.right  = 'auto';
    card.style.bottom = 'auto';
    card.style.transform = 'none';
    card.style.transition = 'none';
    card.classList.add('is-dragging');
    // Bring to front
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
    applyPos(card, snap(parseFloat(card.style.left), STEP_X), snap(parseFloat(card.style.top), STEP_Y));
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
  const cards   = document.querySelectorAll('.snap-card');

  requestAnimationFrame(() => {
    cards.forEach(card => {
      const saved = loadPos(card.id);
      applyPos(card, ...(saved ? [saved.left, saved.top] : [defaultPos(card).left, defaultPos(card).top]));
      enableDrag(card, overlay);
    });
  });

  window.addEventListener('resize', () => {
    cards.forEach(card => {
      const saved = loadPos(card.id);
      if (saved) applyPos(card, saved.left, saved.top);
    });
  });
}
