const fs = require('fs');
const path = require('path');
const markdownIt = require('markdown-it');

const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// path to docs
const docDir = './docs';

// make sure path exists
if (!fs.existsSync(docDir)) {
  fs.mkdirSync(docDir, { recursive: true });
}

// convert all markdown files
fs.readdirSync(docDir).forEach(file => {
  if (path.extname(file) === '.md') {
    const inputFile = path.join(docDir, file);
    const outputFile = path.join(docDir, path.basename(file, '.md') + '.html');
    const content = fs.readFileSync(inputFile, 'utf8');
    const html = md.render(content);
    fs.writeFileSync(outputFile, html);
    console.log(`markdown2html.js: ${file} → ${path.basename(outputFile)}`);
  }
});

