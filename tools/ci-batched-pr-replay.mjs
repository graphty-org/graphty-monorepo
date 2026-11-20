#!/usr/bin/env node
/**
 * ci-batched-pr-replay.mjs -- what the forced-batched graphty-element tests cost, and whether they run at all, on
 * the pull requests master merged most recently: each one's change goes through the checkout's own test selector
 * (tools/test-select.mjs) and CI matrix (tools/ci-test-matrix.mjs plan(), as a pull request), and the script counts
 * the forced-batched and objects browser test jobs and files the pull request would have run, with an estimate of
 * their runner minutes. Point --root at another checkout (a scratch worktree at an older commit) to compare.
 *
 * Usage: node tools/ci-batched-pr-replay.mjs [--root <checkout>] [--tools <dir>] [--last 30] [--json]
 *   --tools: the tools/ folder whose selector and matrix to use (default <root>/tools), such as an older commit's
 *   extracted with `git archive <commit> tools graphty-element/src/features | tar -x -C <dir>` (features-on.mjs
 *   reads that folder), to compare against it on the same import graphs
 *
 * The estimate is files x (FILE_MS + the family's per-file overhead) + jobs x JOB_SETUP_MIN, fitted to the full
 * run of 2026-11-19 (release.yml run 44596884333): its twelve forced-batched jobs ran 106 runner minutes, 88 of them
 * in the test step, over 629 files (8.4 s a file with its overhead, 1.5 min of setup a job).
 * The import graphs are built once, from the checkout, not per merged commit; only graphty-element's shards are
 * planned.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** A file's test time, ms (see the header). */
const FILE_MS = 3_900;
/** A test job's setup outside its tests (checkout, install, artifacts, browser), minutes. */
const JOB_SETUP_MIN = 1.5;
const FAMILIES = { batched: "graphty-element-forced-batched", objects: "graphty-element-browser" };

const { values } = parseArgs({
    options: {
        root: { type: "string", default: "." },
        tools: { type: "string" },
        last: { type: "string", default: "30" },
        json: { type: "boolean" },
    },
});
const root = resolve(values.root);
const tools = resolve(values.tools ?? `${root}/tools`);
const sel = await import(pathToFileURL(`${tools}/test-select.mjs`).href);
const { plan, SHARDS } = await import(pathToFileURL(`${tools}/ci-test-matrix.mjs`).href);
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).trim();

const shards = SHARDS.filter((s) => s.package === "graphty-element");
const durations = Object.fromEntries(Object.values(FAMILIES).map((f) => [f, { "(every file)": FILE_MS }]));
const merges = git("log", "--first-parent", "--merges", `-${values.last}`, "--format=%H %s", "origin/master")
    .split("\n")
    .map((l) => /^(\w+) Merge pull request #(\d+)/u.exec(l))
    .filter(Boolean);

const graphs = await sel.buildGraphs(root, ["graphty-element"], shards);
const rows = [];
for (const [, sha, pr] of merges) {
    const changed = sel.changedFiles(root, `${sha}^1`, `${sha}^2`);
    const selection = await sel.selectChange(root, changed, shards, graphs);
    const light = sel.lightPlan(root, shards, selection.shards, durations);
    const affected = selection.shards.some((s) => s.mode !== "none") ? ["graphty-element"] : [];
    const matrix = plan(affected, undefined, light, true, SHARDS);
    const row = { pr: Number(pr) };
    for (const [key, family] of Object.entries(FAMILIES)) {
        const re = new RegExp(String.raw`^${family}-\d+$`, "u");
        const jobs = matrix.filter((e) => re.test(e.shard));
        // a bin's files, or a shard's share of its project's files when it runs whole (vitest --shard splits by file)
        const slices = SHARDS.filter((s) => re.test(s.shard)).length;
        const filesOf = (e) =>
            light.bins.find((b) => b.name === e.shard)?.files.length ??
            (selection.shards.find((s) => s.shard === e.shard)?.specs?.length ?? 0) / slices;
        const files = jobs.reduce((n, e) => n + filesOf(e), 0);
        const { overheadMs } = sel.binCost(family);
        const minutes = (files * (FILE_MS + overheadMs)) / 60_000 + jobs.length * JOB_SETUP_MIN;
        row[key] = { jobs: jobs.length, files: Math.round(files), minutes: Math.round(minutes) };
    }
    rows.push(row);
}

const total = (key, field) => rows.reduce((n, r) => n + r[key][field], 0);
const summary = {
    root,
    tools,
    head: git("rev-parse", "--short", "HEAD"),
    pullRequests: rows.length,
    withBatched: rows.filter((r) => r.batched.jobs > 0).length,
    withObjects: rows.filter((r) => r.objects.jobs > 0).length,
    objectsWithoutBatched: rows.filter((r) => r.objects.jobs > 0 && r.batched.jobs === 0).map((r) => r.pr),
    batchedMinutes: total("batched", "minutes"),
    objectsMinutes: total("objects", "minutes"),
};
if (values.json) {
    console.log(JSON.stringify({ summary, rows }, null, 1));
} else {
    for (const r of rows) {
        console.log(
            `#${r.pr}\tobjects ${r.objects.jobs} jobs ${r.objects.files} files ~${r.objects.minutes} min\tbatched ${r.batched.jobs} jobs ${r.batched.files} files ~${r.batched.minutes} min`,
        );
    }
    console.log(JSON.stringify(summary));
}
