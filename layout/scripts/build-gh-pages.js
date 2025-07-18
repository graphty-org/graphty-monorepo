/**
 * Build GitHub Pages Script
 * 
 * Creates a static site for GitHub Pages that:
 * - Uses the same dist/layout.js bundle created by build-bundle.js
 * - Transforms example HTML files to work without Vite
 * - Creates a gh-pages directory ready for deployment
 */

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function copyFile(src, dest) {
  await pipeline(
    createReadStream(src),
    createWriteStream(dest)
  );
}

async function processExampleHtml(htmlPath, outputPath) {
  let content = await fs.readFile(htmlPath, 'utf-8');
  
  // Replace the import path to use the bundled layout.js
  // Change: import { springLayout } from "./layout.js";
  // To: import { springLayout } from "./layout.js";
  // (No change needed since we'll copy layout.js to the same directory)
  
  // The examples already use "./layout.js" which will work with our copied bundle
  await fs.writeFile(outputPath, content);
}

async function buildGitHubPages() {
  const rootDir = path.resolve(__dirname, '..');
  const examplesDir = path.join(rootDir, 'examples');
  const distDir = path.join(rootDir, 'dist');
  const ghPagesDir = path.join(rootDir, 'gh-pages');
  
  try {
    console.log('Building GitHub Pages site...');
    
    // 1. Clean and create gh-pages directory
    await fs.rm(ghPagesDir, { recursive: true, force: true });
    await ensureDirectoryExists(ghPagesDir);
    
    // 2. Ensure dist/layout.js exists
    const layoutJsPath = path.join(distDir, 'layout.js');
    try {
      await fs.access(layoutJsPath);
    } catch {
      console.error('dist/layout.js not found. Please run "npm run build:bundle" first.');
      process.exit(1);
    }
    
    // 3. Copy dist/layout.js to gh-pages
    await copyFile(layoutJsPath, path.join(ghPagesDir, 'layout.js'));
    console.log('Copied dist/layout.js');
    
    // 4. Copy and process example HTML files
    const files = await fs.readdir(examplesDir);
    for (const file of files) {
      if (file.endsWith('.html')) {
        const inputPath = path.join(examplesDir, file);
        const outputPath = path.join(ghPagesDir, file);
        await processExampleHtml(inputPath, outputPath);
        console.log(`Processed ${file}`);
      } else if (file.endsWith('.js')) {
        // Copy helper JS files
        await copyFile(
          path.join(examplesDir, file),
          path.join(ghPagesDir, file)
        );
        console.log(`Copied ${file}`);
      }
    }
    
    // 5. Create a .nojekyll file to prevent GitHub Pages from processing files
    await fs.writeFile(path.join(ghPagesDir, '.nojekyll'), '');
    
    // 6. Create a simple deployment instruction file
    const deployInstructions = `# GitHub Pages Deployment

This directory contains the built static site for GitHub Pages.

## To deploy:

1. Make sure you're on the main branch and everything is committed
2. Run: \`npm run build:gh-pages\`
3. Deploy the gh-pages directory to GitHub Pages

### Option 1: Using gh-pages npm package
\`\`\`bash
npx gh-pages -d gh-pages
\`\`\`

### Option 2: Manual deployment
\`\`\`bash
git subtree push --prefix gh-pages origin gh-pages
\`\`\`

### Option 3: GitHub Actions
Configure GitHub Actions to deploy the gh-pages directory on push to main.
`;
    
    await fs.writeFile(path.join(ghPagesDir, 'DEPLOY.md'), deployInstructions);
    
    console.log('\nSuccessfully built GitHub Pages site in gh-pages/');
    console.log('See gh-pages/DEPLOY.md for deployment instructions');
    
  } catch (error) {
    console.error('Error building GitHub Pages site:', error);
    process.exit(1);
  }
}

buildGitHubPages();