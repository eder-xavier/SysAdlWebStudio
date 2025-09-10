const { createModel } = require('../generated/AGV.js');
const util = require('util');
const m = createModel();
console.log('model keys:', Object.keys(m));
for (const k of Object.keys(m)){
  try{
    const v = m[k];
    if (v && typeof v === 'object') console.log('-', k, '->', Object.keys(v));
    else console.log('-', k, '->', typeof v);
  }catch(e){console.log('-', k, '->', 'error');}
}
console.log('\nfull inspect (shallow):', util.inspect(m, {depth:2, colors:false}));
