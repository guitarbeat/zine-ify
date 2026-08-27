const { JSDOM } = require("jsdom");

const html = `
  <div id="orientation-toggle">
    <button class="orientation-seg-btn" data-value="portrait"></button>
    <button class="orientation-seg-btn" data-value="landscape"></button>
  </div>
`;

function runUnoptimized() {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const toggle = document.getElementById('orientation-toggle');

  toggle.querySelectorAll('.orientation-seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      toggle.querySelectorAll('.orientation-seg-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  const btn = toggle.querySelector('.orientation-seg-btn');
  const start = process.hrtime.bigint();
  for (let i = 0; i < 100000; i++) {
    btn.click();
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // ms
}

function runOptimized() {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const toggle = document.getElementById('orientation-toggle');

  const btns = toggle.querySelectorAll('.orientation-seg-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      btns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  const btn = toggle.querySelector('.orientation-seg-btn');
  const start = process.hrtime.bigint();
  for (let i = 0; i < 100000; i++) {
    btn.click();
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // ms
}

let unopt = 0;
let opt = 0;

for (let i = 0; i < 5; i++) {
  unopt += runUnoptimized();
  opt += runOptimized();
}

console.log("Unoptimized (ms, avg):", unopt / 5);
console.log("Optimized (ms, avg):", opt / 5);
