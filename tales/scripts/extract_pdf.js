const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extract() {
  const pdfPath = path.join(__dirname, '..', 'livro', 'Software Architecture in Action. Oquendo. 2016.pdf');
  const outPath = path.join(__dirname, '..', 'livro', 'book.txt');
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    process.exit(1);
  }
  const data = fs.readFileSync(pdfPath);
  try {
    const res = await pdf(data);
    fs.writeFileSync(outPath, res.text, 'utf8');
    console.log('Wrote', outPath, 'size', Buffer.byteLength(res.text, 'utf8'));
  } catch (e) {
    console.error('pdf-parse failed:', e.message);
    process.exit(1);
  }
}

extract();
