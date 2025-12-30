/**
 * Bundle TypeScript declarations into a single file
 * 
 * This script creates dist/layout.d.ts with all type declarations
 * bundled together, matching the structure of dist/layout.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function bundleTypes() {
  const indexPath = path.resolve(__dirname, '../dist/src/index.d.ts');
  
  if (!existsSync(indexPath)) {
    console.error('Error: dist/src/index.d.ts not found. Run "npm run build" first.');
    process.exit(1);
  }
  
  try {
    // For now, we'll create a simple declaration file that re-exports everything
    // from the proper location. This works because all exports go through index.ts
    const content = `/**
 * TypeScript declarations for @graphty/layout
 * 
 * This file provides type information for the bundled dist/layout.js module.
 */

// Re-export all types
export * from './src/types/index';

// Re-export utilities that are part of the public API  
export { rescaleLayout, rescaleLayoutDict } from './src/utils/rescale';

// Re-export all layout algorithms
export * from './src/layouts/index';

// Re-export all graph generation functions
export * from './src/generators/index';
`;
    
    const outputPath = path.resolve(__dirname, '../dist/layout.d.ts');
    writeFileSync(outputPath, content, 'utf8');
    console.log('Successfully created dist/layout.d.ts');
    
  } catch (error) {
    console.error('Error bundling types:', error);
    process.exit(1);
  }
}

bundleTypes();