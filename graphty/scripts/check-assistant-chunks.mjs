#!/usr/bin/env node
/**
 * Proves that an ordinary load of the built app fetches none of the Assistant: walks every file
 * dist/index.html loads and every file those import statically, and fails on a mark of the panel, a
 * provider's SDK or TanStack AI. Run after `vite build`, from graphty/.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { landingFiles } from "./landing-files.mjs";

const DIST = resolve(process.argv[2] ?? "dist");
/** A word only the panel holds: it must be somewhere in the build, or the check proves nothing. */
const PANEL_MARK = "Options, asking about the selection";
/** Text only those files hold: a word of the panel, and the addresses the SDKs call. */
const MARKS = [PANEL_MARK, "generativelanguage.googleapis.com", "api.anthropic.com", "api.openai.com", "@tanstack/ai"];

const seen = landingFiles(DIST);
const found = [...seen].flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return MARKS.filter((mark) => text.includes(mark)).map((mark) => `${file}: ${mark}`);
});

if (seen.size === 0 || found.length > 0) {
    console.error(found.length > 0 ? found.join("\n") : "index.html loads no script");
    process.exit(1);
}
const built = readdirSync(DIST, { recursive: true }).filter((name) => String(name).endsWith(".js"));
if (!built.some((name) => readFileSync(join(DIST, String(name)), "utf8").includes(PANEL_MARK))) {
    console.error(`no built file holds "${PANEL_MARK}": pick a word the panel still has`);
    process.exit(1);
}
console.log(`${seen.size} files an ordinary load fetches hold none of the Assistant`);
