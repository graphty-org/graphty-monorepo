#!/usr/bin/env node
// The duplicate code check: jscpd (configured by .jscpd.json) scans the checkout and the push base, and
// the check fails on an exact clone the base did not have, when both its sides are non-test code and one
// of them is in a file this push changes. A new clone that touches a test, story, fixture or benchmark is
// printed and does not fail. Run by tools/prepush-source-checks.sh, tools/check-quick.sh and CI's Checks job.
//
//   node tools/duplicates-check.mjs   (the base: tools/push-base.mjs, or $PUSH_BASE_REF)
//
// Why two scans and not jscpd's --baseline-from-ref: its fingerprint is the clone's raw text, so editing a
// comment inside a clone that both files already shared made it "new". Here a clone is keyed by its two
// files and its text with comments and whitespace removed. Only exact clones count: jscpd's similar
// (--similarity) clones pick a different representative of a group on each run.
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

// ponytail: regex comment stripping can eat a "//" inside a string; both scans are stripped alike, so the
// worst case is two clones read as one.
const key = (d) =>
    [d.firstFile.name, d.secondFile.name].sort().join("\0") +
    "\0" +
    d.fragment
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/.*$/gm, "$1")
        .replace(/\s+/g, "");

/**
 * The new clones of a scan, split into the ones that fail the check and the ones only reported.
 * @param head the jscpd report's duplicates of the checkout
 * @param base the jscpd report's duplicates of the push base
 * @param changed the files the push changes (paths from the repository root)
 * @returns {{ blocking: object[], report: object[] }}
 */
export function newClones(head, base, changed) {
    const old = new Set(base.filter((d) => d.kind === "exact").map(key));
    const touched = new Set(changed);
    const fresh = head.filter(
        (d) =>
            d.kind === "exact" && (touched.has(d.firstFile.name) || touched.has(d.secondFile.name)) && !old.has(key(d)),
    );
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
    const changed = [
        ...git("diff", "--name-only", "--diff-filter=ACMR", mb).split("\n"),
        ...git("ls-files", "--others", "--exclude-standard").split("\n"),
    ].filter((f) => /\.[cm]?[jt]sx?$/.test(f));
    if (changed.length === 0) {
        console.log(`No JavaScript or TypeScript file changed since ${mb.slice(0, 12)}: nothing to check.`);
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
    const { blocking, report } = newClones(head, base, changed);
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
