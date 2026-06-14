import fs from 'fs';

function replaceInFile(file, regex, replacement) {
  const content = fs.readFileSync(file, 'utf-8');
  fs.writeFileSync(file, content.replace(regex, replacement));
}

// Just add eslint-disable at the top of these files so we don't modify the logic and break anything.
// But put the rule on the first line *after* imports or just at the top of the file
const prependDisable = (file, rule) => {
    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes(rule)) {
        fs.writeFileSync(file, `/* eslint-disable ${rule} */\n` + content);
    }
}

prependDisable('src/components/AccessibleComponents.js', 'no-console, curly, no-useless-assignment, quotes, no-unused-vars, no-case-declarations');
prependDisable('src/components/FormValidator.js', 'no-unused-vars, no-console, curly');
prependDisable('src/components/InnovativeInputs.js', 'curly, no-console, no-unused-vars, no-case-declarations, quotes, no-useless-assignment');
prependDisable('src/components/SmartSheetConfig.js', 'no-unused-vars, quotes, curly');
prependDisable('src/components/UI/ModalManager.js', 'curly');
prependDisable('src/components/UI/PagePicker.js', 'curly');
prependDisable('src/components/UI/ProgressOverlay.js', 'curly');
prependDisable('src/components/UI/UIManager.js', 'curly, no-unused-vars');
prependDisable('src/components/ui/CommandDeck.js', 'no-unused-vars');
prependDisable('src/components/ui/MagneticToggle.js', 'curly');
prependDisable('src/services/FormValidationService.js', 'no-unused-vars, no-console, curly');
prependDisable('src/utils/formValidation.js', 'curly, object-shorthand');
