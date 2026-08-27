import fs from 'fs';

let content = fs.readFileSync('src/services/ExportService.js', 'utf8');

// Insert the preloading logic right before the sheetCount loop
const preloadLogic = `
    const uniqueUrls = [...new Set(filledSlots)];
    const imageCache = new Map();
    await Promise.all(
      uniqueUrls.map(url =>
        this._loadImage(url).then(img => {
          imageCache.set(url, img);
        })
      )
    );

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {`;

content = content.replace(
  "for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {",
  preloadLogic
);

// Replace the Promise.all with sequential drawing using the cache
const oldDrawLogic = `await Promise.all(
        draws.map(({ url, cellX, cellY, rotateDeg, scale, objectFit }) =>
          this._loadImage(url).then((img) => {
            this._drawCell(ctx, img, cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit);
          })
        )
      );`;

const newDrawLogic = `for (const { url, cellX, cellY, rotateDeg, scale, objectFit } of draws) {
        const img = imageCache.get(url);
        if (img) {
          this._drawCell(ctx, img, cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit);
        }
      }`;

content = content.replace(oldDrawLogic, newDrawLogic);

fs.writeFileSync('src/services/ExportService.js', content, 'utf8');
