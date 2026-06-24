const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Curly brace fixes
    content = content.replace(/if \(!this.wrapper.contains\(e.target\)\) this._close\(\);/g, "if (!this.wrapper.contains(e.target)) { this._close(); }");

    // Fix _handleBlur(e)
    content = content.replace(/_handleBlur\(e\) \{/g, "_handleBlur(_e) {");

    // Fix click e in Accordion
    content = content.replace(/trigger.addEventListener\('click', \(e\) => \{/g, "trigger.addEventListener('click', (_e) => {");

    // Other missing curlies in AccessibleComponents.js
    content = content.replace(/if \(!this.options\) return;/g, "if (!this.options) { return; }");
    content = content.replace(/if \(!child.id\) child.id =/g, "if (!child.id) { child.id =");
    content = content.replace(/if \(!child.hasAttribute\('aria-labelledby'\)\) /g, "if (!child.hasAttribute('aria-labelledby')) { ");
    content = content.replace(/child.setAttribute\('aria-labelledby', tab.id\);/g, "child.setAttribute('aria-labelledby', tab.id);\n      }");
    content = content.replace(/if \(index === this.activeDescendant\) opt.scrollIntoView/g, "if (index === this.activeDescendant) { opt.scrollIntoView");
    content = content.replace(/\{ block: 'nearest' \}\);/g, "{ block: 'nearest' }); }");

    fs.writeFileSync(filepath, content);
}

patch('src/components/AccessibleComponents.js');
