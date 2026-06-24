const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix unused newIndex warning
    content = content.replace(/let newIndex = currentIndex;/g, "let newIndex;");

    // Fix unused args
    content = content.replace(/_handleBlur\(e\) \{/g, "_handleBlur(_e) {");
    content = content.replace(/trigger.addEventListener\('click', \(e\) => \{/g, "trigger.addEventListener('click', (_e) => {");

    // Remove no-useless-assignment variable assignment 'newIndex' if applicable
    content = content.replace(/let newIndex = 0;\n/g, "");

    // Fix no-case-declarations
    content = content.replace(/case 'ArrowDown':\n            e.preventDefault\(\);\n            const nextIndex/g, "case 'ArrowDown': {\n            e.preventDefault();\n            const nextIndex");
    content = content.replace(/this\.items\[nextIndex\]\.trigger\.focus\(\);\n            break;\n          case 'ArrowUp':/g, "this.items[nextIndex].trigger.focus();\n            break;\n          }\n          case 'ArrowUp': {");
    content = content.replace(/this\.items\[prevIndex\]\.trigger\.focus\(\);\n            break;\n          case 'Home':/g, "this.items[prevIndex].trigger.focus();\n            break;\n          }\n          case 'Home':");

    fs.writeFileSync(filepath, content);
}

patch('src/components/AccessibleComponents.js');

function patch2(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix unused args
    content = content.replace(/this\.track\.querySelectorAll\('\.segmented-control-btn'\)\.forEach\(\(btn, index\) => \{/g, "this.track.querySelectorAll('.segmented-control-btn').forEach((btn, _index) => {");

    // Fix no-useless-assignment
    content = content.replace(/let delta = 0;\n/g, "");

    // Fix no-case-declarations
    content = content.replace(/case 'ArrowDown':\n          e\.preventDefault\(\);\n          const nextIndex/g, "case 'ArrowDown': {\n          e.preventDefault();\n          const nextIndex");
    content = content.replace(/buttons\[nextIndex\]\.focus\(\);\n          break;\n        case 'ArrowUp':/g, "buttons[nextIndex].focus();\n          break;\n        }\n        case 'ArrowUp': {");
    content = content.replace(/buttons\[prevIndex\]\.focus\(\);\n          break;\n        case 'ArrowRight':/g, "buttons[prevIndex].focus();\n          break;\n        }\n        case 'ArrowRight':");


    fs.writeFileSync(filepath, content);
}
patch2('src/components/InnovativeInputs.js');

function patch3(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    content = content.replace(/import \{ sanitizeHTML \} from '\.\.\/utils\/formValidation\.js';\n/g, "");

    fs.writeFileSync(filepath, content);
}
patch3('src/components/FormValidator.js');

function patch4(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/export \{ fromMm \} from '\.\.\/utils\/units\.js';\n/g, "");
    fs.writeFileSync(filepath, content);
}
patch4('src/components/SmartSheetConfig.js');

function patch5(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/import \{ createMagneticToggle \} from '\.\/MagneticToggle\.js';\nimport \{ createActionOrb \} from '\.\/ActionOrb\.js';\n/g, "");
    fs.writeFileSync(filepath, content);
}
patch5('src/components/ui/CommandDeck.js');

function patch6(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/import \{ createFieldValidator \} from '\.\.\/utils\/formValidation\.js';\n/g, "");
    fs.writeFileSync(filepath, content);
}
patch6('src/services/FormValidationService.js');


console.log("Patched");
