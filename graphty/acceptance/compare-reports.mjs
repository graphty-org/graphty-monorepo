#!/usr/bin/env node
/**
 * Compare two acceptance reports route by route: the dry run's (run.mjs, report.json in tmp/dry-run or
 * tmp/dry-run-<features>) or the selection workspace test's (selection-workspace-uat.mjs --report <file>). Made to put a run with an
 * experiment on beside one without, so a route that passes on graphty-element's default render path and
 * fails on the batched one (the cosmograph experiment) shows as a difference, with both reasons.
 *
 *   node graphty/acceptance/compare-reports.mjs tmp/dry-run/report.json tmp/dry-run-cosmograph/report.json
 *
 * Prints every route whose result or reason differs, then a count. Exit 0 when every route has the same
 * result in both, 1 when one differs or is missing from one report, 2 on a usage error.
 */
import { readFileSync } from "node:fs";

/**
 * A report's routes by key, whichever runner wrote it.
 * @param file the report
 * @returns key to { ok, reason }
 */
export function outcomes(file) {
    const { results } = JSON.parse(readFileSync(file, "utf8"));
    return new Map(
        results.map((r) => [
            r.engine ? `${r.engine} ${r.id}` : r.id,
            { ok: (r.result ?? r.status) === "pass", reason: r.reason ?? r.message ?? "" },
        ]),
    );
}

if (process.argv[1]?.endsWith("compare-reports.mjs")) {
    const [a, b] = process.argv.slice(2);
    if (!a || !b) {
        console.error("usage: compare-reports.mjs <without.json> <with.json>");
        process.exit(2);
    }
    const [left, right] = [outcomes(a), outcomes(b)];
    let differ = 0;
    for (const key of new Set([...left.keys(), ...right.keys()])) {
        const [l, r] = [left.get(key), right.get(key)];
        const word = (x) => {
            if (x === undefined) return "missing";
            return x.ok ? "pass" : "FAIL";
        };
        if (l?.ok === r?.ok && (l?.ok || l?.reason === r?.reason)) continue;
        if (l?.ok !== r?.ok) differ++;
        console.log(`${key}: ${word(l)} -> ${word(r)}`);
        if (l && !l.ok) console.log(`    without: ${l.reason}`);
        if (r && !r.ok) console.log(`    with:    ${r.reason}`);
    }
    console.log(
        `\n${differ} of ${new Set([...left.keys(), ...right.keys()]).size} routes differ in result (${a} vs ${b})`,
    );
    process.exit(differ ? 1 : 0);
}
