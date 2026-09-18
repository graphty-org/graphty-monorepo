/**
 * Build GitHub Pages Script
 *
 * Creates a static site for GitHub Pages that:
 * - Builds a self-contained examples/layout.js (the same entry as dist/layout.js, with
 *   @graphty/graph-format inlined so the raw browser modules of the examples can load it)
 * - Transforms example HTML files to work without Vite
 * - Creates a gh-pages directory ready for deployment
 */

import { build } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDirectoryExists(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        // Directory already exists
    }
}

async function processExampleHtml(htmlPath, outputPath) {
    let content = await fs.readFile(htmlPath, "utf-8");

    // Replace the import path to use the bundled layout.js
    // Change: from "../dist/layout.js"
    // To: from "./layout.js"
    content = content.replace(/from\s+["']\.\.\/dist\/layout\.js["']/g, 'from "./layout.js"');

    // Also update debug messages that reference the old path
    content = content.replace(/["']\.\.\/dist\/layout\.js["']/g, '"./layout.js"');

    await fs.writeFile(outputPath, content);
}

async function buildGitHubPages() {
    const rootDir = path.resolve(__dirname, "..");
    const examplesDir = path.join(rootDir, "examples-legacy");
    const distDir = path.join(rootDir, "dist");
    const ghPagesDir = path.join(rootDir, "gh-pages");

    try {
        console.log("Building GitHub Pages site...");

        // 1. Clean and create gh-pages directory
        await fs.rm(ghPagesDir, { recursive: true, force: true });
        await ensureDirectoryExists(ghPagesDir);

        // Create examples subdirectory
        const ghPagesExamplesDir = path.join(ghPagesDir, "examples");
        await ensureDirectoryExists(ghPagesExamplesDir);

        // 2. Ensure dist/layout.js exists
        const layoutJsPath = path.join(distDir, "layout.js");
        try {
            await fs.access(layoutJsPath);
        } catch {
            console.error('dist/layout.js not found. Please run "npm run build:bundle" first.');
            process.exit(1);
        }

        // 3. Build a self-contained gh-pages/examples/layout.js. dist/layout.js leaves
        //    @graphty/graph-format external (scripts/build-bundle.js), and the example pages load
        //    layout.js as a raw browser module, where a bare "@graphty/graph-format" specifier
        //    cannot resolve; this second lib build inlines the dependency for the examples only.
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphLayout",
                    formats: ["es"],
                    fileName: () => "layout.js",
                },
                outDir: ghPagesExamplesDir,
                emptyOutDir: false,
                rollupOptions: { external: [], output: { preserveModules: false, inlineDynamicImports: true } },
                minify: false,
                sourcemap: false,
            },
        });
        console.log("Built the self-contained examples/layout.js");

        // 4. Copy and process example HTML files
        const files = await fs.readdir(examplesDir);
        for (const file of files) {
            if (file.endsWith(".html")) {
                const inputPath = path.join(examplesDir, file);
                const outputPath = path.join(ghPagesExamplesDir, file);
                await processExampleHtml(inputPath, outputPath);
                console.log(`Processed ${file}`);
            } else if (file.endsWith(".js")) {
                // Process and copy helper JS files
                const inputPath = path.join(examplesDir, file);
                let content = await fs.readFile(inputPath, "utf-8");

                // Replace the import path to use the bundled layout.js
                content = content.replace(/from\s+["']\.\.\/dist\/layout\.js["']/g, 'from "./layout.js"');

                await fs.writeFile(path.join(ghPagesExamplesDir, file), content);
                console.log(`Processed ${file}`);
            }
        }

        // 5. Create a redirect index.html at the root
        const redirectHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=examples/index.html">
    <title>Redirecting to examples...</title>
</head>
<body>
    <p>Redirecting to <a href="examples/index.html">examples</a>...</p>
</body>
</html>`;
        await fs.writeFile(path.join(ghPagesDir, "index.html"), redirectHtml);
        console.log("Created redirect index.html");

        // 6. Create a .nojekyll file to prevent GitHub Pages from processing files
        await fs.writeFile(path.join(ghPagesDir, ".nojekyll"), "");

        // 7. Create a simple deployment instruction file
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

        await fs.writeFile(path.join(ghPagesDir, "DEPLOY.md"), deployInstructions);

        console.log("\nSuccessfully built GitHub Pages site in gh-pages/");
        console.log("See gh-pages/DEPLOY.md for deployment instructions");
    } catch (error) {
        console.error("Error building GitHub Pages site:", error);
        process.exit(1);
    }
}

buildGitHubPages();
