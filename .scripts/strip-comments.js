const fs = require('fs');
const path = require('path');

const files = [
  'tales/v0.3/generated/AGV.js',
  'tales/v0.3/generated/RTC.js',
  'tales/v0.3/generated/Simple.js',
  'tales/v0.3/generated/SmartPlace.js'
];

function stripComments(src){
  let out = '';
  let i = 0;
  const len = src.length;
  while(i < len){
    const ch = src[i];
    const nxt = src[i+1];
    // line comment
    if (ch === '/' && nxt === '/'){
      // skip until newline, but keep the newline
      i += 2;
      while(i < len && src[i] !== '\n') i++;
      // keep newline if present
      if (i < len && src[i] === '\n') { out += '\n'; i++; }
      continue;
    }
    // block comment
    if (ch === '/' && nxt === '*'){
      i += 2;
      // preserve newlines
      let newlines = '';
      while(i < len){
        if (src[i] === '*' && src[i+1] === '/') { i += 2; break; }
        if (src[i] === '\n') newlines += '\n';
        i++;
      }
      out += newlines;
      continue;
    }
    // single-quoted string
    if (ch === "'"){
      out += ch; i++;
      while(i < len){
        const c = src[i];
        out += c; i++;
        if (c === "\\") { if (i < len) { out += src[i]; i++; } continue; }
        if (c === "'") break;
      }
      continue;
    }
    // double-quoted string
    if (ch === '"'){
      out += ch; i++;
      while(i < len){
        const c = src[i];
        out += c; i++;
        if (c === "\\") { if (i < len) { out += src[i]; i++; } continue; }
        if (c === '"') break;
      }
      continue;
    }
    // template literal (basic handling)
    if (ch === '`'){
      out += ch; i++;
      while(i < len){
        const c = src[i];
        out += c; i++;
        if (c === "\\") { if (i < len) { out += src[i]; i++; } continue; }
        if (c === '`') break;
        // we don't fully parse ${} expressions; assume rare in generated files
      }
      continue;
    }
    // default
    out += ch; i++;
  }
  return out;
}

files.forEach(f => {
  try{
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) {
      console.error('Not found:', f);
      return;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const bak = abs + '.bak';
    fs.writeFileSync(bak, src, 'utf8');
    const cleaned = stripComments(src);
    fs.writeFileSync(abs, cleaned, 'utf8');
    console.log('Cleaned:', f, '(backup at ' + bak + ')');
  }catch(e){
    console.error('Error processing', f, e);
  }
});
