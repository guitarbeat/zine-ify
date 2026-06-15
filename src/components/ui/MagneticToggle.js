export function createMagneticToggle({
  icon = 'check',
  label = 'Toggle',
  checked = false,
  onChange = () => {},
}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'magnetic-toggle';
  if (checked) {wrapper.classList.add('is-active');}

  wrapper.innerHTML = `
    <input type="checkbox" class="magnetic-toggle__input" ${checked ? 'checked' : ''}>
    <span class="magnetic-toggle__track">
      <span class="magnetic-toggle__thumb">
        <span class="material-symbols-outlined magnetic-toggle__icon">${icon}</span>
      </span>
    </span>
    <span class="magnetic-toggle__label">${label}</span>
  `;

  const input = wrapper.querySelector('input');
  input.addEventListener('change', (e) => {
    wrapper.classList.toggle('is-active', e.target.checked);
    onChange(e.target.checked);
  });

  return wrapper;
}

export function createMagneticToggleGroup(items) {
  const group = document.createElement('div');
  group.className = 'magnetic-toggle-group';
  for (const cfg of items) {
    group.appendChild(createMagneticToggle(cfg));
  }
  return group;
}
