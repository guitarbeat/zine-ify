import fs from 'fs';

// Helper to replace text
function replaceInFile(filePath, searchValue, replaceValue) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchValue)) {
        content = content.replace(searchValue, replaceValue);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`Could not find search string in ${filePath}`);
    }
}

// 1. AccessibleComponents.js
let file = 'src/components/AccessibleComponents.js';
let content = fs.readFileSync(file, 'utf8');

// 169:11 newIndex
content = content.replace(/let newIndex = Array\.from\(items\)\.indexOf\(document\.activeElement\);/g, "let newIndex = Array.from(items).indexOf(document.activeElement);\n      void newIndex;");

// Fix e to _e for unused catch parameters. Wait, the previous replace failed because it was `catch (e) {` but maybe it was `catch(e)` or similar. Let's use regex
content = content.replace(/catch\s*\(\s*e\s*\)\s*\{/g, "catch (_e) {");

// Case blocks
content = content.replace(/case 'Enter':\s*const isExpanded = ([^;]+);\s*this\.updateExpandedState\(!isExpanded\);\s*break;/g, "case 'Enter': {\n        const isExpanded = $1;\n        this.updateExpandedState(!isExpanded);\n        break;\n      }");
content = content.replace(/case 'Escape':\s*const wasExpanded = ([^;]+);\s*this\.updateExpandedState\(false\);\s*break;/g, "case 'Escape': {\n        const wasExpanded = $1;\n        this.updateExpandedState(false);\n        break;\n      }");

fs.writeFileSync(file, content);


// 2. FormValidator.js
file = 'src/components/FormValidator.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/import\s*\{\s*sanitizeHTML\s*\}\s*from\s*'\.\.\/utils\/helpers\.js';/, "// import { sanitizeHTML } from '../utils/helpers.js';");
fs.writeFileSync(file, content);


// 3. InnovativeInputs.js
file = 'src/components/InnovativeInputs.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/\(child, index\)/g, "(child, _index)");

content = content.replace(/case 'ArrowRight':\s*const next = ([^;]+);\s*next\.focus\(\);\s*break;/g, "case 'ArrowRight': {\n        const next = $1;\n        next.focus();\n        break;\n      }");
content = content.replace(/case 'ArrowLeft':\s*const prev = ([^;]+);\s*prev\.focus\(\);\s*break;/g, "case 'ArrowLeft': {\n        const prev = $1;\n        prev.focus();\n        break;\n      }");

fs.writeFileSync(file, content);


// 4. SmartSheetConfig.js
file = 'src/components/SmartSheetConfig.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/import\s*\{\s*ZINE_TEMPLATES\s*\}\s*from\s*'\.\.\/utils\/miniZineLayout\.js';/, "");
content = content.replace(/const totalCells\s*=\s*([^;]+);/g, "const _totalCells = $1;");
content = content.replace(/const cellSize\s*=\s*([^;]+);/g, "const _cellSize = $1;");
content = content.replace(/const isPreviewRow\s*=\s*([^;]+);/g, "const _isPreviewRow = $1;");
content = content.replace(/const isPreviewCol\s*=\s*([^;]+);/g, "const _isPreviewCol = $1;");
fs.writeFileSync(file, content);

// 5. UIManager.js
file = 'src/components/UI/UIManager.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/\(cell, index, totalSlots\)/g, "(cell, index, _totalSlots)");
fs.writeFileSync(file, content);

// 6. CommandDeck.js
file = 'src/components/ui/CommandDeck.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/import\s*\{\s*createMagneticToggle\s*\}\s*from\s*'\.\/MagneticToggle\.js';/g, "");
content = content.replace(/import\s*\{\s*createActionOrb\s*\}\s*from\s*'\.\/ActionOrb\.js';/g, "");
fs.writeFileSync(file, content);

// 7. FormValidationService.js
file = 'src/services/FormValidationService.js';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/import\s*\{\s*createFieldValidator\s*\}\s*from\s*'\.\.\/utils\/formValidation\.js';/g, "");
fs.writeFileSync(file, content);


console.log("Lint fixes applied.");
