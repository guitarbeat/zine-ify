const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix unused args
    content = content.replace(/_handleBlur\(e\) \{/g, "_handleBlur(_e) {");
    content = content.replace(/trigger.addEventListener\('click', \(e\) => \{/g, "trigger.addEventListener('click', (_e) => {");

    // Remove no-useless-assignment variable assignment 'newIndex' if applicable
    content = content.replace(/let newIndex = 0;\n/g, "");

    fs.writeFileSync(filepath, content);
}

patch('src/components/AccessibleComponents.js');
console.log("Patched");
