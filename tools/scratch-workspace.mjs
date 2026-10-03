/**
 * The scratch workspace the repository checkers build for their --self-test: a fresh temporary
 * directory, and a writer that creates a file's parent directories first. A body that is not a
 * string is written as JSON. The caller removes the directory when it is done.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Create a scratch workspace.
 * @param prefix - the temporary directory's name prefix
 * @returns the directory and its writer
 */
export function scratchWorkspace(prefix) {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    const write = (file, body) => {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), typeof body === "string" ? body : JSON.stringify(body));
    };
    return { dir, write };
}
