export function createActionOrb({
  icon = 'print',
  label = 'Action',
  variant = 'primary',
  disabled = false,
  onClick = () => {},
}) {
  const btn = document.createElement('button');
  btn.className = `action-orb action-orb--${variant}`;
  btn.disabled = disabled;
  btn.innerHTML = `
    <span class="material-symbols-outlined action-orb__icon">${icon}</span>
    <span class="action-orb__label">${label}</span>
  `;
  btn.addEventListener('click', onClick);
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.08)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
  });
  return btn;
}

export function createActionOrbGroup(orbs) {
  const group = document.createElement('div');
  group.className = 'action-orb-group';
  for (const cfg of orbs) {
    group.appendChild(createActionOrb(cfg));
  }
  return group;
}
