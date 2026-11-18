#!/usr/bin/env node
/**
 * Proves that PostHog stays out of first paint and is still loaded lazily: walks every file
 * dist/index.html loads and every file those import statically, and fails when one holds PostHog
 * (its ingest host, its opt-out marker or its cookieless id). PostHog is one lazy file, imported by
 * URL after first paint for every visitor (src/lib/analytics.ts, importPostHogModule); a match here
 * means something imports posthog-js statically. It also fails when no landing file names that file
 * (by URL, so as a string, not inside an `import(`). That proves the landing code can load it, not
 * which start does: the after-first-paint
 * start and the Share start share one import, so the after-first-paint start itself is guarded by
 * src/lib/analytics.test.ts (the case that holds the afterFirstPaint seam).
 * Run after `vite build`, from graphty/.
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { assertLandingFree } from "./landing-files.mjs";

const DIST = resolve(process.argv[2] ?? "dist");
/** Text only posthog-js holds: its ingest host, its consent marker and its cookieless id. */
const MARKS = ["i.posthog.com", "__ph_opt_in_out_", "$posthog_cookieless"];

const seen = assertLandingFree(DIST, MARKS);
const chunks = readdirSync(DIST, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(".js"))
    .filter((name) => {
        const text = readFileSync(join(DIST, name), "utf8");
        return MARKS.every((mark) => text.includes(mark));
    });
if (chunks.length === 0) {
    console.error(`no built file holds ${MARKS.join(", ")}: the check proves nothing; pick marks posthog-js still has`);
    process.exit(1);
}
/**
 * Whether a file names a chunk in a string literal, as the URL importPostHogModule loads.
 * @param {string} text - the file's text
 * @param {string} chunk - the chunk's path in dist
 * @returns {boolean} true when it does
 */
function namesChunk(text, chunk) {
    const name = basename(chunk).replaceAll(".", String.raw`\.`);
    return new RegExp("[\"'`][^\"'`]*" + name + "[\"'`]").test(text);
}
const lazy = [...seen].some((file) => {
    const text = readFileSync(file, "utf8");
    return chunks.some((chunk) => namesChunk(text, chunk));
});
if (!lazy) {
    console.error(`no first-paint file names ${chunks.join(", ")}: no lazy load of PostHog is left`);
    process.exit(1);
}
console.log(
    `${seen.size} files an ordinary load fetches hold none of PostHog, and one names ${chunks.join(", ")} to load later`,
);
