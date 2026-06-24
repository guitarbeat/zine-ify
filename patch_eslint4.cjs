const fs = require('fs');

function patch(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix parsing error in InnovativeInputs
    content = content.replace(/case 'ArrowUp':/g, "case 'ArrowUp': {");
    content = content.replace(/buttons\[prevIndex\]\.focus\(\);\n          break;\n        case 'ArrowRight':/g, "buttons[prevIndex].focus();\n          break;\n        }\n        case 'ArrowRight':");

    fs.writeFileSync(filepath, content);
}

patch('src/components/InnovativeInputs.js');

function patch3(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    content = content.replace(/import \{ sanitizeHTML \} from '\.\.\/utils\/formValidation\.js';/g, "");

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
