#!/usr/bin/env node
/**
 * ci-reuse-plan.mjs -- whether a pull request run of ci.yml can reuse an earlier run's results.
 *
 * When the owner presses Finish on the review page, the accepted baselines and the signed approval
 * are committed to the pull request's branch, and the new head would run the whole suite again
 * although no code changed. ci.yml's packages job calls this once. It finds the newest earlier
 * commit on the head's first-parent chain whose ci.yml run (on this branch, as a pull request)
 * passed every job but the screenshot ones, and reuses that run when the tree this run tests (the
 * merge of the pull request into its base) is identical to the tree that run tested once the
 * baselines and approvals directories are taken out. Anything else -- a changed file anywhere else,
 * a moved base, a failed or cancelled run, no record of the tree a run tested -- is a full run.
 *
 * Every run records the tree it tested as the name of an artifact, `ci-tested-<tree>` (or
 * `ci-tested-<tree>-from-<run id>` when it reused that run's results), because the Actions API
 * keeps neither the merge commit a pull request run tested nor the base it merged onto.
 *
 * The two directories are the `baselines` and `approvals` of visual-review.config.json, read from
 * the base branch (HEAD^1 of the merge checkout), never the pull request's copy: a pull request that
 * named "." there must not take its whole tree out of the comparison.
 *
 * Usage (ci.yml): node tools/ci-reuse-plan.mjs
 *   env GH_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL, HEAD_SHA (the pull request's
 *   head), HEAD_REF (its branch); the checkout is the merge commit, with full history.
 * Prints GITHUB_OUTPUT lines: tested-tree, marker (the artifact name to upload), reuse-run (the run
 * whose test results stand for this one's; empty for a full run), reuse-url, and artifacts-run (the
 * run whose package and Storybook builds this run downloads instead of building; empty to build).
 *
 * Usage (ci.yml, input reuse_build_run): node tools/ci-reuse-plan.mjs --build-run <run id>
 *   env GH_TOKEN, GITHUB_REPOSITORY; the checkout is the commit this run tests.
 * Prints one GITHUB_OUTPUT line, artifacts-run: the named run when it built this same commit and its
 * builds are all still there, else empty, so this run builds ("unknown means run").
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Jobs that must have succeeded in a run whose results are reused. A run that itself reused another
// one's results skipped the last three, so for it only the first two count.
const BUILD_JOBS = ["Build", "Storybooks"];
const CHECK_JOBS = ["Lint", "Checks", "Docs"];
// Jobs that say nothing about the tree's code: the screenshots (the gate judges them in every run),
// the summaries, the draft probe (continue-on-error) and the benchmarks (never on a pull request).
const IGNORED = (name) =>
    name.startsWith("visual (") ||
    ["All Checks Pass", "Queue Checks Pass", "Draft state", "Performance Benchmarks"].includes(name);
// What this run downloads from the earlier one instead of building: every package's dist and the
// Storybooks the visual job captures. ci.yml's build job uploads exactly these (a test holds them
// to it).
export const STORYBOOKS = {
    "build-storybook-element": "graphty-element/storybook-static",
    "build-storybook-app": "graphty/storybook-static",
    "build-storybook-compact-mantine": "compact-mantine/storybook-static",
    "build-storybook-algorithms": "algorithms/storybook-static",
    "build-storybook-layout": "layout/storybook-static",
    "build-storybook-cytoscape-extensions": "cytoscape-extensions/storybook-static",
    "build-storybook-graph-io-fidelity": "graph-io/fidelity-stories/storybook-static",
};
const BUILDS = ["build-packages", ...Object.keys(STORYBOOKS)];
// How many earlier runs to look at before giving up: each costs two API requests.
const MAX_CANDIDATES = 3;

const git = (cwd, args, env) => execFileSync("git", args, { cwd, encoding: "utf8", env }).trim();

/**
 * The tree a commit holds with the given directories taken out, through a throwaway index.
 * @param cwd the repository
 * @param commit the commit
 * @param excluded the repository-relative directories to leave out
 * @returns the tree's hash
 */
export function treeWithout(cwd, commit, excluded) {
    const dir = mkdtempSync(join(tmpdir(), "ci-reuse-"));
    const env = { ...process.env, GIT_INDEX_FILE: join(dir, "index") };
    try {
        git(cwd, ["read-tree", commit], env);
        git(
            cwd,
            ["rm", "-r", "--cached", "--quiet", "--ignore-unmatch", "--", ...excluded.map((p) => `:(literal)${p}`)],
            env,
        );
        return git(cwd, ["write-tree"], env);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * The baselines and approvals directories, from the base branch's visual-review.config.json.
 * @param cwd the repository
 * @param base the base branch's commit
 * @returns the two directories, or null when the base has no such config
 */
export function excludedPaths(cwd, base) {
    let config;
    try {
        config = JSON.parse(git(cwd, ["show", `${base}:visual-review.config.json`]));
    } catch {
        return null;
    }
    const paths = [config.baselines, config.approvals];
    const plain = (p) => typeof p === "string" && /^[\w.-]+(\/[\w.-]+)*$/.test(p) && !p.split("/").includes("..");
    return paths.every((p) => plain(p) && p !== ".") ? paths : null;
}

/**
 * The tree a run recorded, and the run it reused, from its artifacts' names.
 * @param artifacts the run's artifacts, as the API lists them
 * @returns the recorded tree and the run it reused (null for a full run), or null without a record
 */
export function marker(artifacts) {
    for (const { name } of artifacts) {
        const m = /^ci-tested-([0-9a-f]{40,64})(?:-from-(\d+))?$/.exec(name);
        if (m) {
            return { tree: m[1], from: m[2] ?? null };
        }
    }
    return null;
}

/**
 * Whether a run passed every job that says something about its tree's code.
 * @param jobs the run's jobs (its newest attempt), as the API lists them
 * @param reused whether the run itself reused another run's results
 * @returns null when it passed, else why not
 */
export function notPassed(jobs, reused) {
    const strict = reused ? BUILD_JOBS : [...BUILD_JOBS, ...CHECK_JOBS];
    for (const name of strict) {
        const j = jobs.find((x) => x.name === name);
        if (j?.conclusion !== "success") {
            return `${name} ${j ? j.conclusion || j.status : "missing"}`;
        }
    }
    const bad = jobs.find((j) => !IGNORED(j.name) && !["success", "skipped"].includes(j.conclusion));
    return bad ? `${bad.name} ${bad.conclusion || bad.status}` : null;
}

/**
 * Decides whether this run reuses an earlier one.
 * @param input what the run knows
 * @param input.tree the tree this run tests, without the two directories
 * @param input.chain the pull request head's first-parent chain, newest first
 * @param input.runs the branch's pull request runs of ci.yml, as the API lists them
 * @param input.runId this run's id
 * @param input.api reads an API path and returns its JSON
 * @returns the run whose test results stand for this one's (`reuse`, null for
 *     a full run), the run to download the builds from (`artifacts`, null to build) and why (`reason`)
 */
export async function decide({ tree, chain, runs, runId, api }) {
    const order = new Map(chain.map((sha, i) => [sha, i]));
    const candidates = runs
        .filter((r) => String(r.id) !== String(runId) && order.has(r.head_sha))
        .sort((a, b) => order.get(a.head_sha) - order.get(b.head_sha) || b.id - a.id)
        .slice(0, MAX_CANDIDATES);
    const skipped = [];
    for (const run of candidates) {
        const { artifacts } = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
        const record = marker(artifacts);
        const { jobs } = await api(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
        const why = notPassed(jobs, Boolean(record?.from));
        if (why) {
            skipped.push(`run ${run.id} (${run.head_sha.slice(0, 10)}): ${why}`);
            continue;
        }
        const at = `run ${run.id} at ${run.head_sha.slice(0, 10)}`;
        if (!record) {
            return { reuse: null, artifacts: null, reason: `${at} passed but recorded no tested tree`, skipped };
        }
        if (record.tree !== tree) {
            return { reuse: null, artifacts: null, reason: `${at} tested another tree (${record.tree})`, skipped };
        }
        const fresh = BUILDS.every((n) => artifacts.some((a) => a.name === n && !a.expired));
        return {
            reuse: record.from ?? String(run.id),
            artifacts: fresh ? String(run.id) : null,
            reason: `${at} tested the same tree${fresh ? "" : "; its builds expired, so this run builds"}`,
            skipped,
        };
    }
    return { reuse: null, artifacts: null, reason: "no earlier run of this branch passed", skipped };
}

/**
 * Whether a named run's builds can stand in for this run's (ci.yml's reuse_build_run input).
 * @param run the run, as the API returns it
 * @param artifacts its artifacts, as the API lists them
 * @param head the commit this run tests
 * @returns null when they can, else why not
 */
export function buildNotReusable(run, artifacts, head) {
    // Only a push run built exactly head_sha: a pull request run built its merge with the base, and a
    // called run (release.yml) may have checked out another ref than its head_sha.
    if (run.event !== "push") {
        return `it is a ${run.event} run, not a push run`;
    }
    if (run.head_sha !== head) {
        return `it built ${run.head_sha}, not ${head}`;
    }
    const missing = BUILDS.filter((n) => !artifacts.some((a) => a.name === n && !a.expired));
    return missing.length > 0 ? `missing or expired: ${missing.join(", ")}` : null;
}

/**
 * The --build-run mode: prints artifacts-run, the named run or empty.
 * @param id the run named by reuse_build_run
 */
function reuseBuildRun(id) {
    let why;
    try {
        if (!/^\d+$/.test(id ?? "")) {
            throw new Error(`not a run id: ${id}`);
        }
        const api = (path) =>
            JSON.parse(
                execFileSync("gh", ["api", `repos/${process.env.GITHUB_REPOSITORY}/${path}`], { encoding: "utf8" }),
            );
        const run = api(`actions/runs/${id}`);
        const { artifacts } = api(`actions/runs/${id}/artifacts?per_page=100`);
        why = buildNotReusable(run, artifacts, git(process.cwd(), ["rev-parse", "HEAD"]));
    } catch (error) {
        why = `could not read it: ${error.message}`;
    }
    console.log(`artifacts-run=${why ? "" : id}`);
    console.error(
        why
            ? `::warning::not reusing the builds of run ${id} (${why}): this run builds`
            : `reusing the builds of run ${id}`,
    );
}

const isMain = (() => {
    try {
        return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
})();

const buildRunAt = process.argv.indexOf("--build-run");
if (isMain && buildRunAt > 0) {
    reuseBuildRun(process.argv[buildRunAt + 1]);
} else if (isMain) {
    const env = process.env;
    const cwd = process.cwd();
    const out = (line) => console.log(line);
    const excluded = excludedPaths(cwd, "HEAD^1");
    if (!excluded) {
        console.error("::warning::no baselines and approvals directories on the base branch: a full run");
        out(`reuse-run=`);
        out(`artifacts-run=`);
        process.exit(0);
    }
    const tree = treeWithout(cwd, "HEAD", excluded);
    out(`tested-tree=${tree}`);
    let result;
    try {
        const api = async (path) =>
            JSON.parse(execFileSync("gh", ["api", `repos/${env.GITHUB_REPOSITORY}/${path}`], { encoding: "utf8" }));
        const chain = git(cwd, ["rev-list", "--first-parent", "--max-count=200", env.HEAD_SHA]).split("\n");
        const branch = encodeURIComponent(env.HEAD_REF);
        const { workflow_runs: runs } = await api(
            `actions/workflows/ci.yml/runs?event=pull_request&branch=${branch}&per_page=50`,
        );
        result = await decide({ tree, chain, runs, runId: env.GITHUB_RUN_ID, api });
    } catch (error) {
        result = {
            reuse: null,
            artifacts: null,
            reason: `could not read the earlier runs: ${error.message}`,
            skipped: [],
        };
    }
    const url = result.reuse ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${result.reuse}` : "";
    const from = result.reuse ? "-from-" + result.reuse : "";
    out(`marker=ci-tested-${tree}${from}`);
    out(`reuse-run=${result.reuse ?? ""}`);
    out(`reuse-url=${url}`);
    out(`artifacts-run=${result.artifacts ?? ""}`);
    const lines = [
        "### Reused results",
        result.reuse
            ? `Lint, Checks, Docs, the test shards, Links and Cost Estimate Accuracy are reused from ${url}: ` +
              `${result.reason}, apart from ${excluded.join("/ and ")}/.`
            : `A full run: ${result.reason}.`,
        ...result.skipped.map((s) => `- not reusable: ${s}`),
    ];
    console.error(lines.join("\n"));
    if (env.GITHUB_STEP_SUMMARY) {
        appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
    }
}
