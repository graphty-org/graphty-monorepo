/**
 * Bundle TypeScript declarations into a single file
 *
 * This script creates dist/algorithms.d.ts with all type declarations
 * bundled together, matching the structure of dist/algorithms.js
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
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
        // One star re-export rather than a hand-copied mirror of src/index.ts: the mirror went
        // stale every time the barrel changed (it had no `indexed` namespace, no `toSnapshot`, no
        // `accelerated`), and a stale dist/algorithms.d.ts is what every consumer that resolves the
        // package's "types" entry after `npm run build:bundle` compiles against. `export *` carries
        // the namespace export and every type through unchanged.
        const content = `/**
 * TypeScript declarations for @graphty/algorithms
 *
 * This file provides type information for the bundled dist/algorithms.js module.
 */

export * from './src/index';
`;

        const outputPath = path.resolve(__dirname, "../dist/algorithms.d.ts");
        writeFileSync(outputPath, content, "utf8");
        console.log("Successfully created dist/algorithms.d.ts");
    } catch (error) {
        console.error("Error bundling types:", error);
        process.exit(1);
    }
}

bundleTypes();
