const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, '..', 'generated');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    try {
      const mod = require(path.join(dir, f));
      if (!mod || typeof mod.createModel !== 'function') continue;
      console.log('Instantiating', f);
      const m = mod.createModel();
      // do a tiny smoke: if model has components and ports, send some sample values
      const comps = Object.keys(m.components || {});
      if (comps.length) {
        const c = m.components[comps[0]];
        const ports = Object.keys(c.ports || {});
        if (ports.length) {
          const p = c.ports[ports[0]];
          console.log('  sending 1 to', comps[0], ports[0]);
          p.send(1, m);
        }
      }
      console.log('  OK', f);
    } catch (e) {
      console.error('Error instantiating', f, e && e.message);
    }
  }
  console.log('[smoke_all] Done');
}

module.exports.run = run;
