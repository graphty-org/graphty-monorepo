#!/usr/bin/env node
// The duplicate code check: jscpd (configured by .jscpd.json) scans the checkout and the push base, and
// the check fails on an exact clone the base did not have, when both its sides are non-test code and one
// of them holds lines this push adds. A new clone that touches a test, story, fixture or benchmark is
// printed and does not fail. Run by tools/prepush-source-checks.sh, tools/check-quick.sh and CI's Checks job.
//
//   node tools/duplicates-check.mjs   (the base: tools/push-base.mjs, or $PUSH_BASE_REF)
//
// Why two scans and not jscpd's --baseline-from-ref: its fingerprint is the clone's raw text, so editing a
// comment inside a clone that both files already shared made it "new". Here a clone is old when the base
// had a clone between the same two files whose text, with comments and whitespace removed, contains it
// (all but its first and last lines): editing a line inside an old clone splits it into smaller ones that
// end on the edited line, and the base clone still contains the rest. A clone must also overlap a line the
// push adds (git diff -M), so renaming or moving a file adds nothing. Only exact clones count: jscpd's
// similar (--similarity) clones pick a different representative of a group on each run.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runJscpd } from "jscpd";

import { pushBase } from "./push-base.mjs";

const TEST =
    /(^|\/)(tests?|__tests__|e2e|stories|fixtures|benchmarks?|acceptance)\/|\.(test|spec|stories|bench)\.[cm]?[jt]sx?$/;
export const isTest = (file) => TEST.test(file);

// The fragment holds whole lines, so a clone split by an edit ends (or starts) on the edited line: compare
// what lies between its first and last lines.
const inner = (d) => {
    const lines = d.fragment.split("\n");
    return lines.length > 2 ? lines.slice(1, -1).join("\n") : d.fragment;
};
const pair = (d) => [d.firstFile.name, d.secondFile.name].sort().join("\0");
// ponytail: regex comment stripping can eat a "//" inside a string; both scans are stripped alike, so the
// worst case is two clones read as one.
const text = (fragment) =>
    fragment
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/.*$/gm, "$1")
        .replace(/\s+/g, "");

/**
 * The lines each file gains in `git diff -U0` output.
 * @param diff the output of git diff -U0
 * @returns {Map<string, [number, number][]>} each file's added line ranges, first and last line inclusive
 */
export function addedLines(diff) {
    const added = new Map();
    let header = false;
    let ranges = [];
    for (const l of diff.split("\n")) {
        // A content line starts with "+", "-", " " or "\\", so "diff --git" and "@@" are always headers;
        // "+++ " is one only before a file's first hunk (an added line "++ x" also starts with "+++ ").
        if (l.startsWith("diff --git ")) {
            header = true;
            ranges = [];
        } else if (header && l.startsWith("+++ b/")) {
            added.set(l.slice(6), ranges);
        } else if (l.startsWith("@@ ")) {
            header = false;
            const [, first, count = "1"] = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(l);
            if (count !== "0") ranges.push([Number(first), Number(first) + Number(count) - 1]);
        }
    }
    return added;
}

/**
 * The new clones of a scan, split into the ones that fail the check and the ones only reported.
 * @param head the jscpd report's duplicates of the checkout
 * @param base the jscpd report's duplicates of the push base
 * @param added the lines the push adds, per file (paths from the repository root; see addedLines)
 * @returns {{ blocking: object[], report: object[] }}
 */
export function newClones(head, base, added) {
    const old = Map.groupBy(
        base.filter((d) => d.kind === "exact"),
        pair,
    );
    const hits = (f) => added.get(f.name)?.some(([first, last]) => f.start <= last && first <= f.end);
    const isOld = (d) => old.get(pair(d))?.some((b) => text(b.fragment).includes(text(inner(d))));
    const fresh = head.filter((d) => d.kind === "exact" && (hits(d.firstFile) || hits(d.secondFile)) && !isOld(d));
    const prod = (d) => !isTest(d.firstFile.name) && !isTest(d.secondFile.name);
    return { blocking: fresh.filter(prod), report: fresh.filter((d) => !prod(d)) };
}

function scan(dir, config, out) {
    const args = ["-c", config, "--reporters", "json", "--output", out, "--silent", "--no-tips", "."];
    const r = runJscpd(args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`jscpd exited ${r.status ?? r.signal} in ${dir}:\n${r.stdout}${r.stderr}`);
    return JSON.parse(readFileSync(join(out, "jscpd-report.json"), "utf8")).duplicates;
}

const where = (f) => `${f.name}:${f.start}`;
const line = (d) => `  ${where(d.firstFile)} <-> ${where(d.secondFile)} (${d.lines} lines)`;

function main() {
    const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
    const mb = pushBase({ cwd: root });
    const script = /\.[cm]?[jt]sx?$/;
    const added = addedLines(git("-c", "core.quotePath=false", "diff", "-M", "-U0", "--diff-filter=ACMR", mb));
    for (const f of git("ls-files", "--others", "--exclude-standard").split("\n"))
        if (script.test(f)) added.set(f, [[1, Infinity]]);
    for (const [f, ranges] of added) if (!script.test(f) || ranges.length === 0) added.delete(f);
    if (added.size === 0) {
        console.log(`No JavaScript or TypeScript lines added since ${mb.slice(0, 12)}: nothing to check.`);
        return 0;
    }
    const tmp = mkdtempSync(join(tmpdir(), "duplicates-check-"));
    let head, base;
    try {
        // .jscpd.json without similarity: only exact clones count, and the similar pass doubles a scan's time.
        const config = join(tmp, "jscpd.json");
        const { similarity, ...exact } = JSON.parse(readFileSync(join(root, ".jscpd.json"), "utf8"));
        writeFileSync(config, JSON.stringify(exact));
        // The base's script files only, about a second; the checkout's config scans both.
        mkdirSync(join(tmp, "base"));
        execFileSync(
            "bash",
            [
                "-c",
                `git archive "$1" -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' | tar -x -C "$2"`,
                "-",
                mb,
                join(tmp, "base"),
            ],
            { cwd: root },
        );
        head = scan(root, config, join(tmp, "head-report"));
        base = scan(join(tmp, "base"), config, join(tmp, "base-report"));
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
    const { blocking, report } = newClones(head, base, added);
    if (report.length)
        console.log(`New clones that touch tests (reported, not failing):\n${report.map(line).join("\n")}`);
    if (blocking.length) {
        console.log(`New duplicate code since ${mb.slice(0, 12)}:\n${blocking.map(line).join("\n")}`);
        console.log(
            "Reuse or extract the existing code; a deliberate parallel goes in .jscpd.json ignore with a reason.",
        );
        return 1;
    }
    console.log(
        `No new duplicate code since ${mb.slice(0, 12)} (${head.length} clones in the checkout, ${base.length} at the base).`,
    );
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
