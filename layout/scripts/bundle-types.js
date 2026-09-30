/**
 * Bundle TypeScript declarations into a single file
 *
 * This script creates dist/layout.d.ts with all type declarations
 * bundled together, matching the structure of dist/layout.js
 */

import { writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function bundleTypes() {
    const indexPath = path.resolve(__dirname, "../dist/src/index.d.ts");

    if (!existsSync(indexPath)) {
        console.error('Error: dist/src/index.d.ts not found. Run "npm run build" first.');
        process.exit(1);
    }

    try {
        // dist/layout.js is bundled from src/index.ts, so its declarations are exactly those of src/index: a hand-kept
        // list here would drift from the bundle whenever the entry gains an export
        const content = `/**
 * TypeScript declarations for @graphty/layout
 *
 * This file provides type information for the bundled dist/layout.js module.
 */

export * from './src/index';
`;

        const outputPath = path.resolve(__dirname, "../dist/layout.d.ts");
        writeFileSync(outputPath, content, "utf8");
        console.log("Successfully created dist/layout.d.ts");
    } catch (error) {
        console.error("Error bundling types:", error);
        process.exit(1);
    }
}

bundleTypes();
