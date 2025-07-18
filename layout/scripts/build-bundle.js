/**
 * Build Bundle Script
 * 
 * Creates a single ES module bundle (dist/layout.js) that:
 * - Contains all the library code in a single file
 * - Is used by the examples (via Vite alias)
 * - Can be distributed as a standalone file
 * - Is the single source of truth for the bundled version
 */

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildBundle() {
  try {
    // Build a bundled ES module version
    await build({
      configFile: false,
      build: {
        lib: {
          entry: path.resolve(__dirname, '../src/index.ts'),
          name: 'GraphLayout',
          formats: ['es'],
          fileName: () => 'layout.js'
        },
        outDir: path.resolve(__dirname, '../dist'),
        rollupOptions: {
          external: [],
          output: {
            preserveModules: false,
            inlineDynamicImports: true
          }
        },
        minify: false,
        sourcemap: true
      }
    });
    
    console.log('Successfully built dist/layout.js');
  } catch (error) {
    console.error('Error building bundle:', error);
    process.exit(1);
  }
}

buildBundle();