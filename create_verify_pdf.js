
import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF();
doc.text('Verify', 10, 10);
const output = doc.output('arraybuffer');
fs.writeFileSync('test-verify.pdf', Buffer.from(output));
console.log('Created test-verify.pdf');
