const fs = require('fs');
let content = fs.readFileSync('src/components/SmartSheetConfig.js', 'utf8');

// I also need to remove the paper variable declaration since it's unused after removing landscapeW and landscapeH!
content = content.replace(/const paper = resolvePaperSize\(paperSize, this\.state\.customPaper\);\n/g, '');

fs.writeFileSync('src/components/SmartSheetConfig.js', content);
