const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist', 'file-preview-element', 'browser');
const OUT_FILE = path.join(__dirname, 'dist', 'file-preview-element', 'pdf-file-preview.js');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`Build output not found at ${DIST_DIR}`);
  console.error('Run "npm run build:element" first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.js'));

files.sort((a, b) => {
  if (a.startsWith('polyfills')) return -1;
  if (b.startsWith('polyfills')) return 1;
  return a.localeCompare(b);
});

console.log('Concatenating files:');
files.forEach((f) => console.log(`  - ${f}`));

let bundle = `// pdf-file-preview Web Component\n// Built: ${new Date().toISOString()}\n\n`;

const cssFile = path.join(DIST_DIR, 'styles.css');
if (fs.existsSync(cssFile)) {
  const cssContent = fs.readFileSync(cssFile, 'utf-8').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  bundle += `// --- Injected styles ---\n`;
  bundle += `(function(){var s=document.createElement('style');s.textContent=\`${cssContent}\`;document.head.appendChild(s);})();\n\n`;
  console.log('  - styles.css (embedded)');
}

for (const file of files) {
  const content = fs.readFileSync(path.join(DIST_DIR, file), 'utf-8');
  bundle += `// --- ${file} ---\n${content}\n\n`;
}

fs.writeFileSync(OUT_FILE, bundle, 'utf-8');

const sizeMB = (Buffer.byteLength(bundle) / (1024 * 1024)).toFixed(2);
console.log(`\n✅ Bundled to: ${OUT_FILE} (${sizeMB} MB)`);
