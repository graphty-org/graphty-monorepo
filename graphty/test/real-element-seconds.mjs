// real-element-seconds.mjs -- rewrites real-element-seconds.json, the measured time of each real-element file on a
// CI runner, which graphty/test/story-shards.ts splits the graphty-N parts by.
//
// Give it the logs of the graphty-N jobs (CI / Test (graphty-1) and so on) of a few full runs, fetched with
// `gh api repos/graphty-org/graphty-monorepo/actions/jobs/<job id>/logs > <file>`. A file's time is the median of
// its runs (so one hung run does not move it) plus LOAD_SECONDS for loading the element and the page, which
// vitest's per-file time leaves out. Only the experiments-off real-element project is read; the On twins split
// by the same table.
//
//   node graphty/test/real-element-seconds.mjs <log>...
import console from "node:console";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

/** Seconds a real-element file spends loading before its tests: (vitest's Duration - its files' times) / files. */
export const LOAD_SECONDS = 8;

/**
 * The real-element files' times in some job logs.
 * @param logs - the logs' text.
 * @returns each file (its path from graphty/) to whole seconds.
 */
export function measure(logs) {
    const runs = {};
    for (const log of logs) {
        // the logs color vitest's output: drop each escape sequence's "[<n>;<n>m" after the ESC character
        const text = log
            .split("\x1b")
            .map((piece) => piece.replace(/^\[[0-9;]*m/, ""))
            .join("");
        for (const m of text.matchAll(
            /[\u2713\u00d7]\s+real-element \(chromium\)\s+(\S+) \(\d+ tests?[^)]*\)\s+(\d+)ms/g,
        )) {
            (runs[m[1]] ??= []).push(Number(m[2]) / 1000);
        }
    }
    const median = (a) => {
        const s = [...a].sort((x, y) => x - y);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    return Object.fromEntries(
        Object.keys(runs)
            .sort()
            .map((file) => [file, Math.round(median(runs[file]) + LOAD_SECONDS)]),
    );
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const table = measure(process.argv.slice(2).map((f) => readFileSync(f, "utf8")));
    writeFileSync(new URL("real-element-seconds.json", import.meta.url), `${JSON.stringify(table, null, 4)}\n`);
    console.log(`${Object.keys(table).length} files`);
}
