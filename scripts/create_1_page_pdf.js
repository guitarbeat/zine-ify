
import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF();
doc.setFontSize(40);
doc.text('Page 1', 10, 50);
// Add a little complexity
doc.rect(20, 20, 100, 100);

const output = doc.output('arraybuffer');
fs.writeFileSync('test-1-page.pdf', Buffer.from(output));
console.log('Created test-1-page.pdf');
