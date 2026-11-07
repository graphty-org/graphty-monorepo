#!/usr/bin/env node
/**
 * Proves that an ordinary load of the built app fetches none of the Assistant: walks every file
 * dist/index.html loads and every file those import statically, and fails on a mark of the panel, a
 * provider's SDK or TanStack AI. Run after `vite build`, from graphty/.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DIST = resolve(process.argv[2] ?? "dist");
/** Text only those files hold: a word of the panel, and the addresses the SDKs call. */
const MARKS = [
    "Enter sends, Shift+Enter makes a new line",
    "generativelanguage.googleapis.com",
    "api.anthropic.com",
    "api.openai.com",
    "@tanstack/ai",
];

const html = readFileSync(join(DIST, "index.html"), "utf8");
const queue = [...html.matchAll(/(?:src|href)="\/?([^"]+\.js)"/g)].map((match) => join(DIST, match[1]));
const seen = new Set();
const found = [];
while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file) || !existsSync(file)) {
        continue;
    }
    seen.add(file);
    const text = readFileSync(file, "utf8");
    found.push(...MARKS.filter((mark) => text.includes(mark)).map((mark) => `${file}: ${mark}`));
    for (const [, target] of text.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
        queue.push(resolve(dirname(file), target));
    }
}

if (seen.size === 0 || found.length > 0) {
    console.error(found.length > 0 ? found.join("\n") : "index.html loads no script");
    process.exit(1);
}
console.log(`${seen.size} files an ordinary load fetches hold none of the Assistant`);
