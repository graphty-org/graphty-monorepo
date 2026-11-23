/**
 * Writes a package's own version into its built output, so the package can say which version it is
 * without reading package.json at run time (no file system in a browser or a bundle).
 *
 * The source holds `export const VERSION: string = "0.0.0";` (src/version.ts). After tsc, and after
 * the bundle when the package has one, this script replaces that literal in each named file with the
 * version in the package.json of the current directory. nx release bumps package.json before the
 * build, so the stamped version is always the one published.
 *
 * Usage: node ../tools/stamp-package-version.mjs dist/src/version.js [dist/<bundle>.js ...]
 * Fails, with status 1, when a file does not hold the literal: a build that ships "0.0.0" would
 * write a version nobody released into every save file.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The literal as tsc and an unminified bundle write it; a bundle may rename the binding VERSION$1. */
const LITERAL = /(\bVERSION(?:\$\d+)?\s*=\s*)"0\.0\.0"/;

/**
 * Replaces the placeholder version in one built file.
 * @param file the built file
 * @param version the version to write
 */
export function stampPackageVersion(file, version) {
    const text = readFileSync(file, "utf8");
    if (!LITERAL.test(text)) {
        throw new Error(`${file} holds no VERSION = "0.0.0" literal to stamp`);
    }

    writeFileSync(file, text.replace(LITERAL, `$1${JSON.stringify(version)}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const files = process.argv.slice(2);
    try {
        if (files.length === 0) {
            throw new Error("usage: stamp-package-version.mjs <built file>...");
        }

        const { version } = JSON.parse(readFileSync(path.resolve("package.json"), "utf8"));
        for (const file of files) {
            stampPackageVersion(file, version);
        }
    } catch (error) {
        console.error(`stamp-package-version: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
