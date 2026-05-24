const fs = require('fs');
const path = require('path');
const file = path.resolve(process.cwd(), 'src', 'App.jsx');
const src = fs.readFileSync(file, 'utf8');
const pairs = { '{': '}', '(': ')', '[': ']' };
const opening = new Set(Object.keys(pairs));
const closing = new Set(Object.values(pairs));
const stack = [];
const lines = src.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (opening.has(ch)) stack.push({ch, line: i+1, col: j+1});
    else if (closing.has(ch)) {
      const last = stack.pop();
      if (!last || pairs[last.ch] !== ch) {
        console.error(`Mismatch at line ${i+1}, col ${j+1}: unexpected '${ch}'`);
        process.exit(2);
      }
    }
  }
}
if (stack.length) {
  const last = stack[stack.length-1];
  console.error(`Unclosed '${last.ch}' at line ${last.line}, col ${last.col}`);
  process.exit(3);
}
console.log('All braces/parens/brackets appear balanced.');
