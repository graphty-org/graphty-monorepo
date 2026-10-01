/**
 * Bundle TypeScript declarations
 *
 * Writes one declaration shim per bundle entry (dist/graph-samples.d.ts, dist/generators.d.ts,
 * dist/datasets/<name>.d.ts), each a single re-export of the tsc output of its source entry under
 * dist/src/, so a shim can never drift from the source export list.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { declarationSpecifier, ENTRIES } from "./entries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

function bundleTypes() {
    for (const [name, source] of Object.entries(ENTRIES)) {
        const declaration = path.resolve(distDir, source.replace(/\.ts$/, ".d.ts"));
        if (!existsSync(declaration)) {
            console.error(
                `Error: ${path.relative(distDir, declaration)} not found under dist/. Run "npm run build" first.`,
            );
            process.exit(1);
        }
        try {
            const content = `export * from "${declarationSpecifier(name, source)}";\n`;
            const target = path.resolve(distDir, `${name}.d.ts`);
            mkdirSync(path.dirname(target), { recursive: true });
            writeFileSync(target, content, "utf8");
        } catch (error) {
            console.error(`Error writing dist/${name}.d.ts:`, error);
            process.exit(1);
        }
    }
    console.log(`Successfully created dist/{${Object.keys(ENTRIES).join(",")}}.d.ts`);
}

bundleTypes();
