const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'transformer.js');
const src = fs.readFileSync(file, 'utf8');
if (src.indexOf('__findPortComponent') !== -1 || src.indexOf('__findPortComponentByNormalized') !== -1) {
  console.error('transformer.js contains runtime lookup helper emission; strict policy requires removal');
  process.exit(1);
}
console.log('OK: transformer.js does not contain runtime lookup helper emission strings');
process.exit(0);
