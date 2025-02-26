const fs = require('fs');
const path = require('path');

function printCodeFiles(dir, indent = '') {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    // Skip build/config/git directories
    if (['.next', 'node_modules', 'public', '.git', '.ipynb', 'venv'].includes(file) || 
        file.includes('.config.') || 
        file.endsWith('.d.ts')) {
      return;
    }

    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      console.log(indent + '+-- ' + file + '/');
      printCodeFiles(filePath, indent + '   |');
    } else if (file.endsWith('.js') || file === '.env.local') {
      console.log(indent + '|-- ' + file);
    }
  });
}

const projectRoot = '.';
printCodeFiles(projectRoot);