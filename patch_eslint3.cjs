const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix no-case-declarations
    content = content.replace(/case 'ArrowDown':\n            e.preventDefault\(\);\n            const nextIndex/g, "case 'ArrowDown': {\n            e.preventDefault();\n            const nextIndex");
    content = content.replace(/this\.items\[nextIndex\]\.trigger\.focus\(\);\n            break;\n          case 'ArrowUp':/g, "this.items[nextIndex].trigger.focus();\n            break;\n          }\n          case 'ArrowUp': {");
    content = content.replace(/this\.items\[prevIndex\]\.trigger\.focus\(\);\n            break;\n          case 'Home':/g, "this.items[prevIndex].trigger.focus();\n            break;\n          }\n          case 'Home':");

    fs.writeFileSync(filepath, content);
}

patch('src/components/AccessibleComponents.js');

function patch2(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix no-case-declarations
    content = content.replace(/case 'ArrowDown':\n          e\.preventDefault\(\);\n          const nextIndex/g, "case 'ArrowDown': {\n          e.preventDefault();\n          const nextIndex");
    content = content.replace(/this\.items\[nextIndex\]\.focus\(\);\n          break;\n        case 'ArrowUp':/g, "this.items[nextIndex].focus();\n          break;\n        }\n        case 'ArrowUp': {");
    content = content.replace(/this\.items\[prevIndex\]\.focus\(\);\n          break;\n        case 'Home':/g, "this.items[prevIndex].focus();\n          break;\n        }\n        case 'Home':");

    content = content.replace(/delta = Math\.max\(1, Math\.floor\(current \/ 10\)\);\n          break;\n        case 'ArrowDown':/g, "delta = Math.max(1, Math.floor(current / 10));\n          break;\n        case 'ArrowDown':");
    content = content.replace(/delta = -Math\.max\(1, Math\.floor\(current \/ 10\)\);\n          break;/g, "delta = -Math.max(1, Math.floor(current / 10));\n          break;");


    fs.writeFileSync(filepath, content);
}
patch2('src/components/InnovativeInputs.js');

console.log("Patched");
