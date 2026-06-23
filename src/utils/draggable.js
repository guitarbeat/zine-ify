export function makeDraggable(panel, handle) {
  let startX, startY, startLeft, startTop;
  let isDragging = false;

  handle.addEventListener('mousedown', onMouseDown);
  handle.addEventListener('touchstart', onTouchStart, { passive: true });

  function onMouseDown(e) {
    if (e.target.closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    panel.style.transition = 'none';
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    setPos(startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    panel.style.transition = '';
  }

  function onTouchStart(e) {
    if (e.target.closest('button')) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    setPos(startLeft + (t.clientX - startX), startTop + (t.clientY - startY));
  }

  function onTouchEnd() {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  function setPos(left, top) {
    left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - 60, top));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }
}
