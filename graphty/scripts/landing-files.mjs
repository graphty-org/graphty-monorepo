/**
 * The files an ordinary load of the built app fetches before any dynamic import(): every script dist/index.html names,
 * and every file those import statically, transitively. Shared by check-assistant-chunks.mjs, check-posthog-chunks.mjs
 * and check-size.mjs.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
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

/**
 * Exits with an error when a file an ordinary load fetches holds one of the marks, or when index.html loads none.
 * @param {string} dist - the build directory
 * @param {string[]} marks - text that must not reach the landing page
 * @returns {Set<string>} the landing files, when none holds a mark
 */
export function assertLandingFree(dist, marks) {
    const seen = landingFiles(dist);
    const found = [...seen].flatMap((file) => {
        const text = readFileSync(file, "utf8");
        return marks.filter((mark) => text.includes(mark)).map((mark) => `${file}: ${mark}`);
    });
    if (seen.size === 0 || found.length > 0) {
        console.error(found.length > 0 ? found.join("\n") : "index.html loads no script");
        process.exit(1);
    }
    return seen;
}

/**
 * @param {string} dist - the build directory
 * @returns {string[]} the text of every built JavaScript file
 */
export function builtScripts(dist) {
    return readdirSync(dist, { recursive: true })
        .filter((name) => String(name).endsWith(".js"))
        .map((name) => readFileSync(join(dist, String(name)), "utf8"));
}
