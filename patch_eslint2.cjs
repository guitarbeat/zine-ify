const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix unused newIndex warning
    content = content.replace(/let newIndex = currentIndex;/g, "let newIndex;");

    fs.writeFileSync(filepath, content);
}

patch('src/components/AccessibleComponents.js');
console.log("Patched");
