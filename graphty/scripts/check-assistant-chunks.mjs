#!/usr/bin/env node
/**
 * Proves that an ordinary load of the built app fetches none of the Assistant: walks every file
 * dist/index.html loads and every file those import statically, and fails on a mark of the panel, a
 * provider's SDK or TanStack AI. Run after `vite build`, from graphty/.
 */

import { resolve } from "node:path";

import { assertLandingFree, builtScripts } from "./landing-files.mjs";

const DIST = resolve(process.argv[2] ?? "dist");
/** A word only the panel holds: it must be somewhere in the build, or the check proves nothing. */
const PANEL_MARK = "Options, asking about the selection";
/** Text only those files hold: a word of the panel, and the addresses the SDKs call. */
const MARKS = [PANEL_MARK, "generativelanguage.googleapis.com", "api.anthropic.com", "api.openai.com", "@tanstack/ai"];

const seen = assertLandingFree(DIST, MARKS);
if (!builtScripts(DIST).some((text) => text.includes(PANEL_MARK))) {
    console.error(`no built file holds "${PANEL_MARK}": pick a word the panel still has`);
    process.exit(1);
}
console.log(`${seen.size} files an ordinary load fetches hold none of the Assistant`);
