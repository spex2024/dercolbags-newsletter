const fs = require('fs');
let c = fs.readFileSync('src/lib/template-presets.ts', 'utf8');
c = c.replace(/borderRadius:\s*"0px",\s*/g, '');
c = c.replace(/border:\s*\{\},\s*/g, '');
fs.writeFileSync('src/lib/template-presets.ts', c);
console.log('Done');
