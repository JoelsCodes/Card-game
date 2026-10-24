// Lists every file in assets/ into assets-manifest.json.
// Run after adding or removing images or music: node scripts/make-asset-manifest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'assets')).filter(f => !f.startsWith('.')).sort();
fs.writeFileSync(path.join(root, 'assets-manifest.json'), JSON.stringify(files.map(f => 'assets/' + f)));
console.log('manifest:', files.length, 'files');
