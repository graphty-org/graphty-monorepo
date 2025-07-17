import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the compiled JavaScript from dist
const distLayoutPath = path.join(__dirname, 'dist', 'layout.js');
const examplesLayoutPath = path.join(__dirname, 'examples', 'layout.js');

try {
  // Check if dist file exists
  if (!fs.existsSync(distLayoutPath)) {
    console.error('Error: dist/layout.js not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Copy the bundled layout.js to examples directory
  fs.copyFileSync(distLayoutPath, examplesLayoutPath);
  console.log('Successfully copied dist/layout.js to examples/layout.js');

} catch (error) {
  console.error('Error building examples:', error);
  process.exit(1);
}