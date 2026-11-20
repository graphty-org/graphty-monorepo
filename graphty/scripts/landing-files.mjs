/**
 * The files an ordinary load of the built app fetches before any dynamic import(): every script dist/index.html names,
 * and every file those import statically, transitively. Shared by check-assistant-chunks.mjs and check-size.mjs.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * @param {string} dist - the build directory
 * @returns {Set<string>} the absolute paths of the files that exist
 */
export function landingFiles(dist) {
    dist = resolve(dist);
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const queue = [...html.matchAll(/(?:src|href)="\/?([^"]+\.js)"/g)].map((match) => join(dist, match[1]));
    const seen = new Set();
    while (queue.length > 0) {
        const file = queue.pop();
        if (seen.has(file) || !existsSync(file)) {
            continue;
        }
        seen.add(file);
        for (const [, target] of readFileSync(file, "utf8").matchAll(
            /(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g,
        )) {
            queue.push(resolve(dirname(file), target));
        }
    }
    return seen;
}
