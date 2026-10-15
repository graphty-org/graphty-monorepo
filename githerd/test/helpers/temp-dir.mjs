import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const made = [];

/**
 * A new temporary directory, removed when the test file that made it finishes (removeTempDirs,
 * run after each file by temp-home.setup.mjs).
 * @param {string} prefix the directory name's prefix
 * @returns {string} its path
 */
export function tempDir(prefix) {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    made.push(dir);
    return dir;
}

/** Removes every directory tempDir has made so far. */
export function removeTempDirs() {
    for (const dir of made.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
}
