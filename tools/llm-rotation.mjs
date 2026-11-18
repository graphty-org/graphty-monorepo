#!/usr/bin/env node
// Which LLM regression cases release.yml's LLM job runs: a rotating quarter of them, not all (owner, 2026-11-17: "is
// there a way that we can run a random set of LLM tests instead of the full suite? so we get coverage over multiple
// runs and reduce our costs?").
//
// Each case belongs to one of SLICES slices (default 4) by a hash of its full name
// (graphty-element/test/helpers/llm-regression-rotation.ts), and each run takes the slice after the last recorded
// run's, so every case runs at least once every SLICES LLM runs (about once a day at four runs a day) at about
// 1/SLICES of the cost. The next slice comes from the record, not from the run number: release.yml runs that skip
// the LLM job (promote-nightly) would otherwise make some slices come up far more often than others. A seeded random
// pick was not used: it leaves some cases unrun for many runs in a row.
//
// A run also executes:
// - every case that failed the last time a run executed it, so a fix is confirmed and a regression re-checked at once;
// - every case, when the AI code, its tests or the lockfile changed since the last run that ran every case (or no such
//   run is recorded, or its commit cannot be read), so such a change gets full coverage at once (ROTATION_PATHS);
// - every case, when FULL=true (the owner's shadow run, whose gate needs it, or a run by hand).
//
// The record is the `llm-regression-state` artifact of the newest LLM job that finished its tests (release.yml reads
// it in two API calls): { sha, slice, slices, lastFull, failed: [{ name, run }] }.
//
//   node tools/llm-rotation.mjs plan --state <record.json> --out <selection.json>
//       env SLICES, FULL, RUN_NUMBER; writes LLM_REGRESSION_SELECTION's file and the plan to the job summary
//   node tools/llm-rotation.mjs record --state <record.json> --selection <selection.json> --report <vitest.json> --out <record.json>
//       env SHA, RUN_URL; run from graphty-element (the report's paths are relative to it); writes the new record
//   node --test tools/llm-rotation.test.mjs
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { AI_PATHS } from "./bisect-ci.mjs";

export const DEFAULT_SLICES = 4;

/**
 * The paths whose change since the last full run makes a run execute every case: at least every path an LLM-lane
 * bisect takes a merge as a candidate for (bisect-ci.mjs AI_PATHS). A bisect blames a merge whose parent is the last
 * green run without testing that parent, which is sound only when the merges before it could not have broken a case
 * the green run's slice left out: each such merge made the run after it execute every case.
 */
export const ROTATION_PATHS = [...AI_PATHS, "graphty-element/test/helpers/llm-regression-*"];

/**
 * What a run executes.
 * @param o the facts
 * @param o.state the last record, or null when none is found
 * @param o.slices how many slices
 * @param o.full whether every case was asked for
 * @param o.runNumber the run's number, for the first slice when there is no record
 * @param o.changed the AI paths changed since the record's last full run, or null when that cannot be told
 * @returns `{ full, slice, slices, also, why, extras: [{ name, why }] }`; `why` says why every case runs, or is empty
 */
export function planSelection({ state, slices, full, runNumber, changed }) {
    const slice = state ? (Number(state.slice) + 1) % slices : runNumber % slices;
    let why = "";
    if (full) why = "every case was asked for (FULL)";
    else if (!state) why = "no earlier LLM run's record was found";
    else if (!state.lastFull) why = "no earlier run that executed every case is recorded";
    else if (changed === null) why = `the changes since ${state.lastFull.slice(0, 9)} could not be read`;
    else if (changed.length)
        why = `the AI code or its LLM tests changed since the last full run (${state.lastFull.slice(0, 9)}): ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? ", ..." : ""}`;
    const extras = (state?.failed ?? []).map((f) => ({ name: f.name, why: `failed in ${f.run}` }));
    return { full: !!why, slice, slices, also: extras.map((e) => e.name), why, extras };
}

/**
 * Each executed case of a vitest JSON report, with its full name as vitest's `task.fullName` spells it.
 * @param report the JSON reporter's output
 * @param root the directory the file names are made relative to (the project root)
 * @returns `[{ name, status }]`, status passed or failed (skipped cases are left out)
 */
export function caseResults(report, root = process.cwd()) {
    return (report.testResults ?? []).flatMap((file) =>
        (file.assertionResults ?? [])
            .filter((a) => a.status === "passed" || a.status === "failed")
            .map((a) => ({
                name: [relative(root, file.name), ...a.ancestorTitles, a.title].join(" > "),
                status: a.status,
            })),
    );
}

/**
 * The record after a run: a case that failed is kept until a run executes it and it passes.
 * @param o the facts
 * @param o.prev the last record, or null
 * @param o.selection what this run executed
 * @param o.results this run's caseResults
 * @param o.sha the run's commit
 * @param o.run the run's URL
 * @returns the new record
 */
export function nextState({ prev, selection, results, sha, run }) {
    const ran = new Set(results.map((r) => r.name));
    const failed = [
        ...(prev?.failed ?? []).filter((f) => !ran.has(f.name)),
        ...results.filter((r) => r.status === "failed").map((r) => ({ name: r.name, run })),
    ];
    return {
        sha,
        slice: selection.slice,
        slices: selection.slices,
        lastFull: selection.full ? sha : (prev?.lastFull ?? ""),
        failed,
    };
}

/**
 * The AI paths changed between a commit and HEAD, fetching the commit when the checkout lacks it.
 * @param sha the last full run's commit
 * @returns the paths, or null when the commit cannot be read
 */
export function changedSince(sha) {
    const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    try {
        try {
            git("cat-file", "-e", `${sha}^{commit}`);
        } catch {
            git("fetch", "--quiet", "--no-tags", "--depth=1", "origin", sha);
        }
        return git("diff", "--name-only", sha, "HEAD", "--", ...ROTATION_PATHS)
            .split("\n")
            .filter(Boolean);
    } catch {
        return null;
    }
}

const readJson = (file) => (file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
const summary = (lines) => {
    const text = `${lines.join("\n")}\n`;
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
    console.log(text);
};

function main() {
    const [command] = process.argv.slice(2);
    const { values: o } = parseArgs({
        args: process.argv.slice(3),
        options: {
            state: { type: "string" },
            out: { type: "string" },
            selection: { type: "string" },
            report: { type: "string" },
        },
    });
    const state = readJson(o.state);
    if (command === "plan") {
        const slices = Number(process.env.SLICES || DEFAULT_SLICES);
        const full = process.env.FULL === "true";
        const changed = state?.lastFull && !full ? changedSince(state.lastFull) : [];
        const plan = planSelection({ state, slices, full, runNumber: Number(process.env.RUN_NUMBER || 0), changed });
        writeFileSync(o.out, JSON.stringify(plan));
        summary([
            "### LLM regression cases",
            plan.full
                ? `Every case runs: ${plan.why}.`
                : `Slice ${plan.slice + 1} of ${plan.slices} (each case runs at least once every ${plan.slices} LLM runs).`,
            ...(plan.full || !plan.extras.length
                ? []
                : ["", "Also run, whatever their slice:", ...plan.extras.map((e) => `- ${e.name} -- ${e.why}`)]),
        ]);
        return;
    }
    if (command === "record") {
        const selection = readJson(o.selection);
        const results = caseResults(readJson(o.report) ?? {});
        const next = nextState({ prev: state, selection, results, sha: process.env.SHA, run: process.env.RUN_URL });
        writeFileSync(o.out, JSON.stringify(next));
        const failed = results.filter((r) => r.status === "failed").length;
        summary([
            `Ran ${results.length} cases (${failed} failed); ${next.failed.length} case(s) are carried to the next run as failed.`,
        ]);
        return;
    }
    throw new Error(`usage: llm-rotation.mjs plan|record ...`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
