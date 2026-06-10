import fs from 'fs';

let content = fs.readFileSync('src/services/ExportService.js', 'utf8');

content = content.replace(
  /let imgData;\n\s*if \(typeof offscreen\.toDataURL === 'function'\) \{\n\s*imgData = offscreen\.toDataURL\('image\/jpeg', 0\.92\);\n\s*\} else \{\n\s*const blobUrl = await mediaProcessor\.canvasToBlob\(offscreen\);\n\s*const response = await fetch\(blobUrl\);\n\s*const blob = await response\.blob\(\);\n\s*imgData = await new Promise\(\(resolve\) => \{\n\s*const reader = new FileReader\(\);\n\s*reader\.onloadend = \(\) => resolve\(reader\.result\);\n\s*reader\.readAsDataURL\(blob\);\n\s*\}\);\n\s*mediaProcessor\.revokeBlobUrl\(blobUrl\);\n\s*\}/g,
  `let imgData;
      if (typeof offscreen.toDataURL === 'function') {
        imgData = offscreen.toDataURL('image/jpeg', 0.92);
      } else if (typeof offscreen.convertToBlob === 'function') {
        const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
        imgData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }`
);

fs.writeFileSync('src/services/ExportService.js', content);
