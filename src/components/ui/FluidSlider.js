export function createFluidSlider({
  label = 'Value',
  min = 0,
  max = 100,
  value = 50,
  step = 1,
  suffix = '',
  onChange = () => {},
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'fluid-slider';
  wrapper.innerHTML = `
    <div class="fluid-slider__header">
      <span class="fluid-slider__label">${label}</span>
      <span class="fluid-slider__value">${value}${suffix}</span>
    </div>
    <div class="fluid-slider__track">
      <input type="range" class="fluid-slider__input" min="${min}" max="${max}" value="${value}" step="${step}" aria-label="${label}">
      <div class="fluid-slider__fill" style="width:${((value - min) / (max - min)) * 100}%"></div>
    </div>
  `;

  const input = wrapper.querySelector('input');
  const fill = wrapper.querySelector('.fluid-slider__fill');
  const valueDisplay = wrapper.querySelector('.fluid-slider__value');

  input.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    const pct = ((v - min) / (max - min)) * 100;
    fill.style.width = `${pct}%`;
    valueDisplay.textContent = `${v}${suffix}`;
    onChange(v);
  });

  return wrapper;
}
