const fs = require('fs');

const file = 'src/components/UI/UIManager.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find all `const stepButtonMap = new Map();`
let indices = [];
lines.forEach((l, i) => {
    if (l.includes('const stepButtonMap = new Map();')) {
        indices.push(i);
    }
});
console.log(indices);

// Delete the second duplicate chunk
if (indices.length > 1) {
    // Looks like the chunk to delete is between indices[0]-16 and indices[1]-16 or something
    // The duplicate starts at line 501: `this.elements.exportPdfBtn?.addEventListener('click', ...)`
    // And ends before `if (!this.smartSheetConfig) {` at 559

    // Let's remove from 501 to 559.
    const toRemove = [];
    let startRemove = -1;
    let endRemove = -1;

    // Find first `this.elements.exportPdfBtn?.addEventListener` after line 500
    for(let i=400; i<lines.length; i++) {
        if(lines[i].includes("this.elements.exportPdfBtn?.addEventListener")) {
            startRemove = i;
            break;
        }
    }

    for(let i=startRemove + 1; i<lines.length; i++) {
        if(lines[i].includes("this.elements.exportPdfBtn?.addEventListener")) {
            startRemove = i;
            break;
        }
    }

    for(let i=startRemove; i<lines.length; i++) {
        if(lines[i].includes("if (!this.smartSheetConfig) {")) {
            // Find second one? No, there is only one smartSheetConfig below 500
            endRemove = i - 1;
            break;
        }
    }

    console.log(`Removing from ${startRemove} to ${endRemove}`);
    lines.splice(startRemove, endRemove - startRemove + 1);
    fs.writeFileSync(file, lines.join('\n'));
}
