
import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF();
for (let i = 1; i <= 16; i++) {
    if (i > 1) doc.addPage();
    doc.setFontSize(40);
    doc.text(`Page ${i}`, 10, 50);
    // Add complexity
    for (let j = 0; j < 500; j++) {
        doc.rect(Math.random() * 200, Math.random() * 200, 10, 10);
    }
}
const output = doc.output('arraybuffer');
fs.writeFileSync('test-16-pages.pdf', Buffer.from(output));
console.log('Created complex test-16-pages.pdf');
