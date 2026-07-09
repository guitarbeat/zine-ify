import fs from 'fs';

let content = fs.readFileSync('src/core/main.js', 'utf8');

content = content.replace(
  /if \(!themeToggle \|\| !themeIcon\) return;/,
  "if (!themeToggle || !themeIcon) {\n    return;\n  }"
);

fs.writeFileSync('src/core/main.js', content);
