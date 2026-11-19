#!/usr/bin/env node
// Which tests a paid release lane runs: a rotating quarter of them, not all. Two lanes use it:
// - `llm`, release.yml's LLM regression job (owner, 2026-11-17: "is there a way that we can run a random set of LLM
//   tests instead of the full suite? so we get coverage over multiple runs and reduce our costs?"), by test case;
// - `t4`, gpu.yml's NVIDIA T4 job (owner, 2026-11-18, issue #8916: the same for the T4), by test file.
//
// Each test belongs to one of SLICES slices (default 4) by a hash of its name (sliceOf; for the LLM lane the same
// hash in graphty-element/test/helpers/llm-regression-rotation.ts), and each run takes the slice after the last
// recorded run's, so every test runs at least once every SLICES runs of the lane at about 1/SLICES of the cost. The
// next slice comes from the record, not from the run number: release.yml runs that skip the lane (promote-nightly)
// would otherwise make some slices come up far more often than others. A seeded random pick was not used: it leaves
// some tests unrun for many runs in a row.
//
// A run also executes:
// - every test that failed the last time a run executed it, so a fix is confirmed and a regression re-checked at once;
// - every test, when the code the lane's tests load changed since the last run that ran every test (or no such run
//   is recorded, or its commit cannot be read), so such a change gets full coverage at once (the lane's `paths`);
// - every test, when FULL=true (the owner's shadow run, whose gate needs it, or a run by hand).
//
// The T4 lane slices webgpu-graph-algorithms' test files (node, node-gpu-alone, node-device-errors, node-limits, their
// no-subgroups twins and the browser smoke). By file, not by test as the LLM lane does: an LLM case's cost is its own
// API calls, but a GPU test file's is mostly its own (Dawn, the device, compiled pipelines, multi-gigabyte fixtures in
// beforeAll), which a per-test skip would still pay. The NVIDIA canary, graphty-element's accelerated layout, the
// large-graph screenshots and the benchmarks run every time: see gpu.yml.
//
// The record is the lane's state artifact (`llm-regression-state`, `t4-rotation-state`) of the newest run that
// finished its tests: { sha, slice, slices, lastFull, failed: [{ name, run }] }.
//
//   node tools/test-rotation.mjs <llm|t4> plan --state <record.json> --out <selection.json>
//       env SLICES, FULL, RUN_NUMBER; writes the selection and the plan to the job summary; t4 also writes
//       T4_ARGS (the vitest file filters, empty for every file) and T4_BROWSER to GITHUB_ENV
//   node tools/test-rotation.mjs llm record --state <record.json> --selection <selection.json> --report <vitest.json> --out <record.json>
//       env SHA, RUN_URL; run from graphty-element (the report's paths are relative to it)
//   node tools/test-rotation.mjs t4 record --state <record.json> --selection <selection.json> --report <test-results dir> --out <record.json>
//       env SHA, RUN_URL, COMPLETE (false: a red step skipped later tests); reads the JUnit reports every vitest run writes in CI (vitest.ci-junit.mjs)
//   node --test tools/test-rotation.test.mjs
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { AI_PATHS } from "./bisect-ci.mjs";
import { parseJunit } from "./test-ledger.mjs";

export const DEFAULT_SLICES = 4;

/** The T4 lane's package, whose test files it slices. */
const GPU_PACKAGE = "webgpu-graph-algorithms";

/**
 * Per lane: the words of its summary and reasons, and the paths whose change since the last full run makes a run
 * execute every test.
 *
 * llm: at least every path an LLM-lane bisect takes a merge as a candidate for (bisect-ci.mjs AI_PATHS). A bisect
 * blames a merge whose parent is the last green run without testing that parent, which is sound only when the merges
 * before it could not have broken a test the green run's slice left out: each such merge made the run after it
 * execute every test.
 *
 * t4: a GPU bisect takes every merge as a candidate, so the paths are instead everything the sliced test files load:
 * the package, each workspace package it depends on (tools/test-rotation.test.mjs holds that), the lockfile (Dawn is
 * the `webgpu` dependency) and the lane itself. graphty-element is not one of them: its accelerated layout test runs
 * on every T4 run, outside the rotation.
 */
export const LANES = {
    llm: {
        title: "LLM regression cases",
        unit: "case",
        lane: "LLM",
        code: "the AI code or its LLM tests",
        paths: [...AI_PATHS, "graphty-element/test/helpers/llm-regression-*"],
    },
    t4: {
        title: "T4 GPU test files",
        unit: "test file",
        lane: "T4",
        code: "the GPU code or its tests",
        paths: [
            GPU_PACKAGE,
            "graph-format",
            "algorithms",
            "layout",
            "remote-logger",
            "pnpm-lock.yaml",
            ".github/workflows/gpu.yml",
        ],
    },
};

/**
 * The slice a test belongs to: FNV-1a over its name, modulo the slice count (the LLM lane's TypeScript copy is
 * graphty-element/test/helpers/llm-regression-rotation.ts sliceOf).
 * @param name the test's name
 * @param slices how many slices
 * @returns 0 to slices - 1
 */
export function sliceOf(name, slices) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        // eslint-disable-next-line unicorn/prefer-code-point -- UTF-16 units, as the TypeScript copy hashes them
        hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193) >>> 0;
    }
    return hash % slices;
}

/**
 * What a run executes.
 * @param o the facts
 * @param o.state the last record, or null when none is found
 * @param o.slices how many slices
 * @param o.full whether every test was asked for
 * @param o.runNumber the run's number, for the first slice when there is no record
 * @param o.changed the lane's paths changed since the record's last full run, or null when that cannot be told
 * @param o.lane the lane's LANES entry (default llm)
 * @returns `{ full, slice, slices, also, why, extras: [{ name, why }] }`; `why` says why every test runs, or is empty
 */
export function planSelection({ state, slices, full, runNumber, changed, lane = LANES.llm }) {
    const slice = state ? (Number(state.slice) + 1) % slices : runNumber % slices;
    let why = "";
    if (full) why = `every ${lane.unit} was asked for (FULL)`;
    else if (!state) why = `no earlier ${lane.lane} run's record was found`;
    else if (!state.lastFull) why = `no earlier run that executed every ${lane.unit} is recorded`;
    else if (changed === null) why = `the changes since ${state.lastFull.slice(0, 9)} could not be read`;
    else if (changed.length)
        why = `${lane.code} changed since the last full run (${state.lastFull.slice(0, 9)}): ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? ", ..." : ""}`;
    const extras = (state?.failed ?? []).map((f) => ({ name: f.name, why: `failed in ${f.run}` }));
    return { full: !!why, slice, slices, also: extras.map((e) => e.name), why, extras };
}

/**
 * Whether a run with this selection executes the test.
 * @param name the test's name
 * @param selection planSelection()'s result
 * @returns true to run it
 */
export const isSelected = (name, selection) =>
    selection.full || sliceOf(name, selection.slices) === selection.slice || selection.also.includes(name);

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
 * Each GPU test file the JUnit reports of a directory ran (vitest.ci-junit.mjs's junit-<package>-...xml): failed
 * when any of its tests failed, or a hook or its loading did, in either pass (the no-subgroups pass names its files
 * no-subgroups/<file>: webgpu-graph-algorithms/vitest.config.ts). A file whose every test was skipped is left out.
 * @param dir the test-results directory
 * @returns `[{ name, status }]`, names repo-relative
 */
export function fileResults(dir) {
    const into = { files: new Map(), failures: [] };
    const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.startsWith(`junit-${GPU_PACKAGE}-`)) : [];
    for (const n of names) parseJunit(readFileSync(join(dir, n), "utf8"), GPU_PACKAGE, into);
    const status = new Map();
    for (const [name, c] of into.files) {
        if (c.passed + c.failed === 0) continue;
        const file = name.replace(`${GPU_PACKAGE}/no-subgroups/`, `${GPU_PACKAGE}/`);
        if (status.get(file) !== "failed") status.set(file, c.failed ? "failed" : "passed");
    }
    return [...status].map(([name, s]) => ({ name, status: s }));
}

/**
 * The record after a run: a test that failed is kept until a run executes it and it passes.
 * @param o the facts
 * @param o.prev the last record, or null
 * @param o.selection what this run executed
 * @param o.results this run's caseResults or fileResults
 * @param o.sha the run's commit
 * @param o.run the run's URL
 * @param o.complete false when the run went red: a crashed or hung test run writes no report, so the failed tests
 *   cannot be named, and a red step skips the steps after it. The next run then repeats this run's slice (and
 *   executes every test again after a full run), so nothing of it waits a whole turn; a lane that stays red keeps
 *   its slice until it is green, which only a fix (a full run, when it touches the lane's paths) changes.
 * @returns the new record
 */
export function nextState({ prev, selection, results, sha, run, complete = true }) {
    const ran = new Set(results.map((r) => r.name));
    const failed = [
        ...(prev?.failed ?? []).filter((f) => !ran.has(f.name)),
        ...results.filter((r) => r.status === "failed").map((r) => ({ name: r.name, run })),
    ];
    return {
        sha,
        slice: complete ? selection.slice : (selection.slice + selection.slices - 1) % selection.slices,
        slices: selection.slices,
        lastFull: selection.full && complete ? sha : (prev?.lastFull ?? ""),
        failed,
    };
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/**
 * The paths changed between a commit and HEAD, fetching the commit when the checkout lacks it.
 * @param sha the last full run's commit
 * @param paths the lane's paths
 * @returns the changed paths, or null when the commit cannot be read
 */
export function changedSince(sha, paths) {
    try {
        try {
            git("cat-file", "-e", `${sha}^{commit}`);
        } catch {
            git("fetch", "--quiet", "--no-tags", "--depth=1", "origin", sha);
        }
        return git("diff", "--name-only", sha, "HEAD", "--", ...paths)
            .split("\n")
            .filter(Boolean);
    } catch {
        return null;
    }
}

/**
 * The T4 job's environment for a selection: the vitest file filters every sliced step appends (package-relative,
 * with --passWithNoTests, since a project may hold none of them; empty for every file), and whether the browser
 * smoke holds any selected file.
 * @param selection planSelection()'s result
 * @param files every test file of the package, repo-relative
 * @returns `{ T4_ARGS, T4_BROWSER, count }`
 */
export function t4Env(selection, files) {
    if (selection.full) return { T4_ARGS: "", T4_BROWSER: "true", count: files.length };
    const picked = files.filter((f) => isSelected(f, selection));
    return {
        T4_ARGS: ["--passWithNoTests", ...picked.map((f) => f.slice(GPU_PACKAGE.length + 1))].join(" "),
        T4_BROWSER: String(picked.some((f) => f.startsWith(`${GPU_PACKAGE}/test/browser/`))),
        count: picked.length,
    };
}

const readJson = (file) => (file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
const summary = (lines) => {
    const text = `${lines.join("\n")}\n`;
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
    console.log(text);
};

/**
 * Writes the T4 job's environment (t4Env) to GITHUB_ENV.
 * @param plan planSelection()'s result
 * @returns the summary's count of the files that run
 */
function writeT4Env(plan) {
    const files = git("ls-files", "--", `${GPU_PACKAGE}/test/*.test.ts`).split("\n").filter(Boolean);
    const env = t4Env(plan, files);
    if (process.env.GITHUB_ENV)
        appendFileSync(process.env.GITHUB_ENV, `T4_ARGS=${env.T4_ARGS}\nT4_BROWSER=${env.T4_BROWSER}\n`);
    return ` ${env.count} of ${files.length} test files.`;
}

/**
 * The command line.
 * @param laneName llm or t4
 * @param argv the command and its options
 */
export function main(laneName, argv) {
    const lane = LANES[laneName];
    const [command] = argv;
    if (!lane) throw new Error(`usage: test-rotation.mjs <${Object.keys(LANES).join("|")}> plan|record ...`);
    const { values: o } = parseArgs({
        args: argv.slice(1),
        options: {
            state: { type: "string" },
            out: { type: "string" },
            selection: { type: "string" },
            report: { type: "string" },
        },
    });
    const state = readJson(o.state);
    if (command === "plan") {
        // a variable set to 0 or to no number would select no test at all
        const slices = Math.max(1, Math.floor(Number(process.env.SLICES)) || DEFAULT_SLICES);
        const full = process.env.FULL === "true";
        const changed = state?.lastFull && !full ? changedSince(state.lastFull, lane.paths) : [];
        const runNumber = Number(process.env.RUN_NUMBER || 0);
        const plan = planSelection({ state, slices, full, runNumber, changed, lane });
        writeFileSync(o.out, JSON.stringify(plan));
        const count = laneName === "t4" ? writeT4Env(plan) : "";
        summary([
            `### ${lane.title}`,
            plan.full
                ? `Every ${lane.unit} runs: ${plan.why}.${count}`
                : `Slice ${plan.slice + 1} of ${plan.slices} (each ${lane.unit} runs at least once every ${plan.slices} ${lane.lane} runs).${count}`,
            ...(plan.full || !plan.extras.length
                ? []
                : ["", "Also run, whatever their slice:", ...plan.extras.map((e) => `- ${e.name} -- ${e.why}`)]),
        ]);
        return;
    }
    if (command === "record") {
        const selection = readJson(o.selection);
        const results = laneName === "t4" ? fileResults(o.report) : caseResults(readJson(o.report) ?? {});
        const next = nextState({
            prev: state,
            selection,
            results,
            sha: process.env.SHA,
            run: process.env.RUN_URL,
            complete: process.env.COMPLETE !== "false",
        });
        writeFileSync(o.out, JSON.stringify(next));
        const failed = results.filter((r) => r.status === "failed").length;
        summary([
            `Ran ${results.length} ${lane.unit}s (${failed} failed); ${next.failed.length} ${lane.unit}(s) are carried to the next run as failed.`,
        ]);
        return;
    }
    throw new Error(`usage: test-rotation.mjs ${laneName} plan|record ...`);
}

// realpath: the simulation in tools/test-rotation.test.mjs runs it through a symbolic link
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href)
    main(process.argv[2], process.argv.slice(3));
