const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /\[#111111\]/g, replacement: 'foreground' },
  { regex: /\[#f2f2f2\]/g, replacement: 'background' },
  { regex: /\[#1e1e1e\]/g, replacement: 'border' },
  { regex: /\[#ffffff\]/g, replacement: 'card' },
  { regex: /bg-white/g, replacement: 'bg-card' },
  { regex: /text-white/g, replacement: 'text-card' }, // Wait, if a button is bg-foreground text-white, in dark mode it will be bg-white text-[1a1a1a].
  { regex: /rgba\(17,17,17,1\)/g, replacement: 'var(--color-foreground)' },
  { regex: /rgba\(17, 17, 17, 1\)/g, replacement: 'var(--color-foreground)' },
  { regex: /rgba\(17,17,17/g, replacement: 'var(--color-foreground)' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const r of replacements) {
        content = content.replace(r.regex, r.replacement);
      }
      
      // Specifically for text-white on a bg-foreground, we probably want text-background instead of text-card, 
      // but let's see. If the background is foreground, the text should be background to invert properly.
      // Wait, in light mode: foreground is black, background is #f2f2f2, card is white.
      // In dark mode: foreground is #f2f2f2, background is #111111, card is #1a1a1a.
      // If we use bg-foreground text-background, in light: black bg, #f2f2f2 text. In dark: #f2f2f2 bg, #111111 text.
      content = content.replace(/text-card/g, 'text-background');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
