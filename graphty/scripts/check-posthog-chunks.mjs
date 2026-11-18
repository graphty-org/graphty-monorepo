#!/usr/bin/env node
/**
 * Proves that an ordinary load of the built app fetches none of PostHog: walks every file
 * dist/index.html loads and every file those import statically, and fails on a PostHog ingest host
 * or its opt-out marker. PostHog is a lazy chunk loaded only after the reader says Share usage data
 * (src/lib/analytics.ts); a match here means something imports posthog-js statically. Run after
 * `vite build`, from graphty/.
 */

import { resolve } from "node:path";

import { assertLandingFree, builtScripts } from "./landing-files.mjs";

const DIST = resolve(process.argv[2] ?? "dist");
/** Text only posthog-js holds: its ingest host and its consent marker. */
const MARKS = ["i.posthog.com", "__ph_opt_in_out_"];

const seen = assertLandingFree(DIST, MARKS);
if (!builtScripts(DIST).some((text) => MARKS.every((mark) => text.includes(mark)))) {
    console.error(
        `no built file holds ${MARKS.join(" and ")}: the check proves nothing; pick marks posthog-js still has`,
    );
    process.exit(1);
}
console.log(`${seen.size} files an ordinary load fetches hold none of PostHog`);
