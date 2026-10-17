/**
 * Which githerd this is. A copy materialized from the default branch (design section 3.4) carries
 * a version.json with the version and the tree hash it was archived from; a working tree has only
 * package.json, and so no code hash.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The package directory: the parent of bin/ and lib/. */
export const PACKAGE_DIR = fileURLToPath(new URL("..", import.meta.url));

/**
 * Reads the version of the githerd copy in `dir`.
 * @param {string} [dir] the package directory
 * @returns {{version: string, codeHash: string | null}} the version, and the tree hash when known
 */
export function readVersion(dir = PACKAGE_DIR) {
    let text;
    try {
        text = readFileSync(join(dir, "version.json"), "utf8");
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        return { version: pkg.version, codeHash: null };
    }
    const { version, codeHash } = JSON.parse(text);
    return { version, codeHash: codeHash ?? null };
}
