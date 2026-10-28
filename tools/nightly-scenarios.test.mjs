#!/usr/bin/env node
// The nightly release path as a scenario matrix: release.yml, the workflows it calls (ci.yml, gpu.yml, ...) and the
// workflows that react to its runs (release-rerun.yml, release-watch.yml), run through a small model of GitHub
// Actions over the real YAML, one row per situation the path must survive. Each row that encodes a defect that once
// broke the nightly path (2026-10-26/27) fails when that defect's fix is reverted.
//
// The model: expressions are evaluated by GitHub's own evaluator (@actions/expressions), with success(), failure(),
// cancelled() and always() and the implicit success() of an `if:` that names none of them; the needs graph decides
// what runs (a job whose `if` is false is skipped, a skipped or failed need skips a job that only asks success());
// a job's result comes from the row (default success; a lane can be failure, cancelled or timed_out, which ends a
// job cancelled); a called workflow (`uses: ./.github/workflows/x.yml`) runs with the caller's github context and
// the inputs its `with:` computes, and fails when one of its jobs fails; steps run in order with their `if`, and a
// row stubs their outputs (the verdict's are computed by tools/full-run.mjs's own functions from the LANES the
// workflow templates); attempt N+1 keeps attempt N's results and outputs for every job that did not fail and does not
// depend on one that did; concurrency keeps one running and one pending run per group.
//
// Every job a row runs is also checked for what it reads: a job that checks out another commit than the
// workflow's own (a picked candidate) runs a path under tools/ or a local action only once the workflow's own copy is
// overlaid (git archive "$GITHUB_SHA" ... | tar -x), or when it is on OWN_TOOLS below.
//
//   node tools/nightly-scenarios.test.mjs        (pnpm run test:ci-workflows)
//   WORKFLOWS=<dir> node tools/nightly-scenarios.test.mjs    checks another tree's workflows (a reverted fix)
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { data, Evaluator, Lexer, Parser } from "@actions/expressions";
import { truthy } from "@actions/expressions/result";
import { parse } from "yaml";

import { captureLane, deferred, differingImages, heldLine, holdAction, verdictOf } from "./full-run.mjs";
import { autoAbandon } from "./channel/hold.mjs";
import { promotion } from "./channel/nightly.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { readPolicy } from "./release-hold.mjs";
import { decide as rerunDecide } from "./release-rerun.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WF = process.env.WORKFLOWS ?? join(ROOT, ".github/workflows");
const TMP = mkdtempSync(join(tmpdir(), "nightly-scenarios-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

const workflows = new Map();
// A workflow's parsed YAML.
const load = (file) => {
    if (!workflows.has(file)) workflows.set(file, parse(readFileSync(join(WF, file), "utf8")));
    return workflows.get(file);
};

// ---------------------------------------------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------------------------------------------

const CONTEXTS = [
    "github",
    "inputs",
    "needs",
    "steps",
    "env",
    "vars",
    "secrets",
    "matrix",
    "runner",
    "job",
    "strategy",
];
const STATUS = ["success", "failure", "cancelled", "always"];
const toData = (ctx) => JSON.parse(JSON.stringify(ctx), data.reviver);

function evaluate(src, ctx, status = {}) {
    const fns = STATUS.map((name) => ({
        name,
        minArgs: 0,
        maxArgs: 0,
        call: () => new data.BooleanData(Boolean(status[name] ? status[name]() : name === "always")),
    }));
    // the runner's own function: a key, never a decision
    fns.push({ name: "hashFiles", minArgs: 1, maxArgs: 255, call: () => new data.StringData("hash") });
    try {
        const ast = new Parser(new Lexer(src).lex().tokens, CONTEXTS, fns).parse();
        return new Evaluator(ast, toData(ctx), new Map(fns.map((f) => [f.name.toLowerCase(), f]))).evaluate();
    } catch (error) {
        throw new Error(`cannot evaluate \${{ ${src.trim()} }}: ${error.message}`);
    }
}

// A value with `${{ }}` in it, as GitHub substitutes it (each expression coerced to a string).
function template(value, ctx) {
    if (typeof value !== "string") return value;
    return value.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, src) => evaluate(src, ctx).coerceString());
}
const templateAll = (obj, ctx) =>
    Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [k, String(template(v, ctx) ?? "")]));

// An `if:`, with GitHub's implicit success() when it names no status function.
function condition(cond, ctx, status) {
    if (cond === undefined || cond === null) return Boolean(status.success());
    let src = String(cond).trim();
    const whole = /^\$\{\{([\s\S]*)\}\}$/.exec(src);
    if (whole) src = whole[1];
    if (!/\b(success|failure|cancelled|always)\s*\(/.test(src)) src = `success() && (${src})`;
    return truthy(evaluate(src, ctx, status));
}

// ---------------------------------------------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------------------------------------------

const needsOf = (job) => [job.needs ?? []].flat();
const FAILED = new Set(["failure", "cancelled"]);
const result = (r) => (r === "timed_out" ? "cancelled" : r);

function order(jobs) {
    const done = [];
    const visit = (id) => {
        if (done.includes(id)) return;
        for (const n of needsOf(jobs[id])) visit(n);
        done.push(id);
    };
    Object.keys(jobs).forEach(visit);
    return done;
}

function inputsFor(wf, event, given) {
    const declared = (event === "workflow_call" ? wf.on?.workflow_call : wf.on?.workflow_dispatch)?.inputs ?? {};
    const out = {};
    for (const [k, d] of Object.entries(declared)) {
        let v = k in given ? given[k] : d.default;
        if (d.type === "boolean") v = v === true || v === "true";
        else if (d.type === "number") v = Number(v ?? 0);
        else v = v === undefined || v === null ? "" : String(v);
        out[k] = v;
    }
    return { ...given, ...out };
}

// One run of a workflow.
// file: the workflow's file name
// sc: the row: github (the context), inputs, vars, results `{ path: result }` (a path is the job id, or
// `<caller>/<job>` inside a called workflow), outputs `{ path: outputs }` (a job's outputs, instead of its steps'),
// steps `{ path: { stepId: { outputs, fail } | (step) => ... } }`, cancelled (the run was cancelled), prior (the
// previous attempt's run, for a re-run of its failed jobs)
// returns `{ jobs: { path: { result, outputs, steps, ran } }, conclusion, title, reads }`
function simulate(file, sc) {
    const out = { jobs: {}, reads: [], title: "" };
    const wf = load(file);
    const inputs = inputsFor(wf, sc.github.event_name, sc.inputs ?? {});
    const base = { github: sc.github, inputs, vars: sc.vars ?? {}, secrets: {}, matrix: {}, runner: { temp: "/rt" } };
    out.title = wf["run-name"] ? template(wf["run-name"], base) : wf.name;
    out.concurrency = concurrencyOf(wf.concurrency, base);
    run(file, sc, inputs, "", out);
    const top = Object.keys(wf.jobs).map((id) => out.jobs[id].result);
    out.conclusion = top.includes("failure") ? "failure" : top.includes("cancelled") ? "cancelled" : "success";
    return out;
}

function concurrencyOf(c, ctx) {
    if (!c) return null;
    if (typeof c === "string") return { group: template(c, ctx), cancel: false };
    return {
        group: template(c.group, ctx),
        cancel: String(template(c["cancel-in-progress"] ?? false, ctx)) === "true",
    };
}

function run(file, sc, inputs, prefix, out) {
    const wf = load(file);
    const base = { github: sc.github, inputs, vars: sc.vars ?? {}, secrets: {}, matrix: {}, runner: { temp: "/rt" } };
    const wfEnv = templateAll(wf.env, base);
    const ancestors = (id) => {
        const seen = new Set();
        const walk = (j) => needsOf(wf.jobs[j]).forEach((n) => seen.has(n) || (seen.add(n), walk(n)));
        walk(id);
        return [...seen];
    };
    for (const id of order(wf.jobs)) {
        const job = wf.jobs[id];
        const path = prefix + id;
        const kept = sc.prior?.jobs[path];
        const rerun =
            !kept || FAILED.has(kept.result) || needsOf(job).some((n) => out.jobs[prefix + n]?.rerun === true);
        if (!rerun) {
            out.jobs[path] = { ...kept, rerun: false };
            copyInner(sc.prior, path, out);
            continue;
        }
        const needs = Object.fromEntries(
            needsOf(job).map((n) => [
                n,
                { result: out.jobs[prefix + n].result, outputs: out.jobs[prefix + n].outputs },
            ]),
        );
        const ctx = { ...base, needs, env: wfEnv };
        const res = (j) => out.jobs[prefix + j].result;
        const status = {
            success: () =>
                needsOf(job).every((n) => res(n) === "success") && !ancestors(id).some((a) => FAILED.has(res(a))),
            failure: () => ancestors(id).some((a) => res(a) === "failure"),
            cancelled: () => Boolean(sc.cancelled),
            always: () => true,
        };
        let go;
        try {
            go = condition(job.if, ctx, status);
        } catch (error) {
            throw new Error(`${file} job ${id}: ${error.message}`);
        }
        if (!go) {
            out.jobs[path] = { result: "skipped", outputs: {}, steps: {}, ran: false, rerun: true };
            continue;
        }
        if (String(job.uses ?? "").startsWith("./.github/workflows/")) {
            const called = job.uses.replace("./.github/workflows/", "");
            const given = templateAll(job.with, ctx);
            const calledInputs = inputsFor(load(called), "workflow_call", given);
            run(called, sc, calledInputs, `${path}/`, out);
            const inner = Object.entries(load(called).jobs).map(([j, d]) => ({
                r: out.jobs[`${path}/${j}`].result,
                soft: d["continue-on-error"] === true,
            }));
            const derived = inner.some((i) => i.r === "failure" && !i.soft)
                ? "failure"
                : inner.some((i) => i.r === "cancelled")
                  ? "cancelled"
                  : "success";
            out.jobs[path] = {
                result: result(sc.results?.[path] ?? derived),
                outputs: sc.outputs?.[path] ?? {},
                steps: {},
                ran: true,
                rerun: true,
                inputs: calledInputs,
            };
            continue;
        }
        out.jobs[path] = runSteps(
            file,
            id,
            job,
            path,
            { ...ctx, env: { ...wfEnv, ...templateAll(job.env, ctx) } },
            sc,
            out,
        );
    }
}

function copyInner(prior, path, out) {
    for (const [p, j] of Object.entries(prior.jobs)) if (p.startsWith(`${path}/`)) out.jobs[p] = { ...j, rerun: false };
}

function runSteps(file, id, job, path, ctx, sc, out) {
    const steps = {};
    const byKey = {}; // each step under its id and under its name
    const list = [];
    const keep = (st, i, rec) => {
        for (const k of [st.id, st.name, `#${i}`]) if (k) byKey[k] = rec;
        list.push(rec);
    };
    let failed = false;
    const status = {
        success: () => !failed,
        failure: () => failed,
        cancelled: () => Boolean(sc.cancelled),
        always: () => true,
    };
    (job.steps ?? []).forEach((st, i) => {
        const key = st.id ?? st.name ?? `#${i}`;
        const stubs = sc.steps?.[path] ?? {};
        const sctx = { ...ctx, steps, job: { status: failed ? "failure" : "success" } };
        let go;
        try {
            go = condition(st.if, sctx, status);
        } catch (error) {
            throw new Error(`${file} job ${id} step ${key}: ${error.message}`);
        }
        if (!go) {
            if (st.id) steps[st.id] = { outputs: {}, outcome: "skipped", conclusion: "skipped" };
            keep(st, i, { ran: false, step: st });
            return;
        }
        const env = { ...ctx.env, ...templateAll(st.env, sctx) };
        const withs = templateAll(st.with, { ...sctx, env });
        const stub = stubs[st.id] ?? stubs[st.name];
        const r = (typeof stub === "function" ? stub({ env, with: withs, sc }) : stub) ?? {};
        const outcome = r.fail ? "failure" : "success";
        const conclusion = outcome === "failure" && st["continue-on-error"] ? "success" : outcome;
        if (conclusion === "failure") failed = true;
        if (st.id) steps[st.id] = { outputs: r.outputs ?? {}, outcome, conclusion };
        keep(st, i, { ran: true, step: st, env, with: withs, outputs: r.outputs ?? {}, outcome });
    });
    const forced = sc.results?.[path];
    const outputs = sc.outputs?.[path] ?? templateAll(job.outputs, { ...ctx, steps });
    out.reads.push(...readsOf(file, id, list, ctx));
    return {
        result: result(forced ?? (failed ? "failure" : "success")),
        outputs,
        steps: byKey,
        ran: true,
        rerun: true,
    };
}

// ---------------------------------------------------------------------------------------------------------------
// What a job reads
// ---------------------------------------------------------------------------------------------------------------

// Jobs that run the checked-out commit's own tools/ on purpose (as tools/own-tools-overlay.test.mjs lists them).
const OWN_TOOLS = {
    "ci.yml/lint": "lints the commit's own tools/ with its own eslint rules",
    "ci.yml/checks": "runs the commit's tool tests and checks against its own workflows and packages",
    "ci.yml/docs": "builds the commit's docs with its own copy-docs-content.js and sanitize-api-docs.js",
};

const PATHS = /(?:^|[\s;|&(`"'=])((?:\.\/)?tools\/[\w./-]+)/g;

// The paths under tools/ and .github/actions/ a job runs that come from a commit other than the workflow's own and
// were not overlaid first: one problem per path.
function readsOf(file, id, steps, ctx) {
    const key = `${file}/${id}`;
    if (OWN_TOOLS[key]) return [];
    const own = new Set([ctx.github.sha, "master", "refs/heads/master", ""]);
    let ref = null; // no checkout yet: nothing from the repository
    const overlaid = [];
    const problems = [];
    for (const { ran, step, env } of steps) {
        // a step whose `if` reads another step's outputs may run whatever a row stubbed: counted as running
        const mayRun = ran || /steps\./.test(String(step.if ?? ""));
        if (!mayRun) continue;
        const uses = String(step.uses ?? "");
        if (uses.startsWith("actions/checkout@") && !step.with?.path) {
            ref = ran ? String(template(step.with?.ref ?? "", { ...ctx, steps: {} }) ?? "") : ctx.github.sha;
            continue;
        }
        const text = String(step.run ?? "")
            .split("\n")
            .filter((l) => !/^\s*#/.test(l))
            .join("\n");
        const archive = /git archive "\$GITHUB_SHA" ([^|\n]+)\| tar -x/.exec(text);
        if (archive && ran) {
            const list = archive[1].replace(/\$OVERLAY/g, env?.OVERLAY ?? step.env?.OVERLAY ?? "");
            overlaid.push(...list.split(/\s+/).filter(Boolean));
            continue;
        }
        if (ref === null || own.has(ref)) continue;
        const reads = [...text.matchAll(PATHS)].map((m) => m[1].replace(/^\.\//, ""));
        if (uses.startsWith("./.github/actions/")) reads.push(uses.slice(2));
        for (const p of reads) {
            if (!overlaid.some((o) => p === o || p.startsWith(`${o.replace(/\/$/, "")}/`)))
                problems.push(`${key}: runs ${p} from ${ref.slice(0, 12)} (step "${step.name ?? uses}")`);
        }
    }
    return [...new Set(problems)];
}

// ---------------------------------------------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------------------------------------------

// GitHub's concurrency groups: one running and one pending run per group; a newer pending run cancels the older.
class Groups {
    constructor() {
        this.groups = new Map();
        this.log = new Map();
    }
    arrive(name, { group, cancel }) {
        const g = this.groups.get(group) ?? { running: null, pending: null };
        this.groups.set(group, g);
        if (cancel) {
            for (const r of [g.running, g.pending]) if (r) this.log.set(r, "cancelled");
            g.running = name;
            g.pending = null;
            this.log.set(name, "running");
            return;
        }
        if (!g.running) {
            g.running = name;
            this.log.set(name, "running");
            return;
        }
        if (g.pending) this.log.set(g.pending, "cancelled");
        g.pending = name;
        this.log.set(name, "pending");
    }
    finish(group) {
        const g = this.groups.get(group);
        this.log.set(g.running, "finished");
        g.running = g.pending;
        g.pending = null;
        if (g.running) this.log.set(g.running, "running");
    }
    state(name) {
        return this.log.get(name);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------------------------

const M = "a".repeat(40); // master's head: the workflow's own commit
const H = "b".repeat(40); // the picked candidate, older than master
const OTHER = "c".repeat(40); // a commit another run held
const REPO = "graphty-org/graphty-monorepo";

const github = (over = {}) => ({
    event_name: "workflow_dispatch",
    ref: "refs/heads/master",
    sha: M,
    run_attempt: "1",
    run_id: "4000",
    repository: REPO,
    server_url: "https://github.com",
    token: "t",
    event: {},
    ...over,
});

const pickOutputs = (over = {}) => ({
    release: "true",
    sha: H,
    good: "",
    build_run: "77",
    held: "",
    resume: "false",
    tested: "",
    source_run: "",
    forward: "",
    shards: "",
    hosts: "",
    macos: "",
    capture: "",
    ...over,
});

// ci.yml's Build job's plan in a full run: every package affected, every shard
const SHARDS = [
    "graphty-storybook",
    "graphty-element-storybook-1",
    "layout",
    "algorithms-browser",
    "compact-mantine",
    "cytoscape-extensions",
    "graph-io-browser",
];
const ciPackages = {
    full: "true",
    light: "false",
    affected: JSON.stringify(["graphty", "graphty-element", "layout", "algorithms"]),
    "test-matrix": JSON.stringify(SHARDS),
    "test-count": "36",
    "stories-matrix": "[]",
    "stories-count": "0",
    "advisory-checks": "[]",
    "visual-skip": "[]",
    "visual-on": "[]",
    docs: "true",
    "cost-accuracy": "true",
    "reuse-run": "",
    "reuse-url": "",
    "artifacts-run": "",
};

// The verdict job's "Judge the run" step, as tools/full-run.mjs verdict decides it from the LANES and the other
// values the workflow hands it: the hold is read from the store as it is now (`held`), as heldNow does; with no
// store answer, the pick's HELD.
const judge =
    ({ held, images = 0, missing = [] } = {}) =>
    ({ env }) => {
        const lanes = JSON.parse(env.LANES);
        lanes.captures = captureLane(missing);
        const { state, red } = verdictOf(lanes, images, env.LLM_OWNER_ITEM, env.VERSION_HELD);
        const wait = deferred({ attempt: Number(env.RUN_ATTEMPT), mode: env.MODE, state, red, lanes });
        const now = held ?? env.HELD;
        const hold = wait || red[0] === "pick" ? "none" : holdAction({ held: now, sha: env.SHA, state });
        return {
            outputs: { state, deferred: String(wait), hold, held: now, owner: heldLine(env.VERSION_HELD), what: "" },
        };
    };

// The verdict job's later steps: the hold step does what it was asked, the gate passes, the promotion decides.
const verdictSteps = (judged, { gate = { outputs: { outcome: "success", first: "false" } } } = {}) => ({
    "Judge the run": judge(judged),
    hold: ({ env }) => ({ outputs: { action: env.HOLD } }),
    gate,
    promote: ({ env }) => ({
        outputs: {
            promote: String(
                promotion({ state: env.STATE, publishHold: "", gate: env.GATE, held: env.HELD, sha: env.SHA }).promote,
            ),
        },
    }),
});

const promoted = {
    version: { version: { outputs: { commit: "d".repeat(40), tags: "x@1.0.0" } } },
    land: { push: { outputs: { pushed: "true" } } },
    site: { current: { outputs: { ours: "true" } } },
};

// A full (or restart or candidate) run of release.yml.
const fullRun = ({
    mode = "full",
    attempt = "1",
    pick = {},
    results = {},
    steps = {},
    outputs = {},
    prior,
    judged,
    gate,
} = {}) =>
    simulate("release.yml", {
        github: github({ run_attempt: attempt }),
        inputs: { mode, scheduled: true },
        results,
        prior,
        outputs: { pick: pickOutputs(pick), "ci/packages": ciPackages, "ci/build": ciPackages, ...outputs },
        steps: { verdict: verdictSteps(judged, { gate }), ...promoted, ...steps },
    });

const ran = (r, ...paths) => paths.forEach((p) => assert.equal(r.jobs[p]?.ran, true, `${p} runs`));
const skipped = (r, ...paths) => paths.forEach((p) => assert.equal(r.jobs[p]?.result, "skipped", `${p} is skipped`));
const stepRan = (r, job, step) => r.jobs[job].steps[step]?.ran === true;
const LANE_JOBS = ["ci", "t4", "hosts", "autosave_macos", "audit", "llm", "version_dry_run"];
const RED_EARLY = LANE_JOBS.map((l) => `${l}_red`);

// The workflow_run event GitHub sends release-rerun.yml and release-watch.yml for a finished Release run.
const finished = (r, { attempt = 1, conclusion = r.conclusion } = {}) =>
    github({
        event_name: "workflow_run",
        event: {
            workflow: { name: load("release.yml").name },
            workflow_run: {
                id: 4000,
                name: r.title, // GitHub names a run by its run-name: "Release (full)"
                display_title: r.title,
                run_attempt: attempt,
                conclusion,
                head_sha: M,
                html_url: "https://run",
                run_started_at: "t",
            },
        },
    });

// Whether release-rerun.yml runs for a run, and what tools/release-rerun.mjs decides with the env it is handed.
function rerunFor(r, { attempt = 1, conclusion, record, record2 = null, failed }) {
    const gh = finished(r, { attempt, conclusion });
    const rr = simulate("release-rerun.yml", { github: gh });
    const job = rr.jobs.rerun;
    if (!job.ran) return { ran: false, decision: "none" };
    const env = job.steps["Re-run the failed jobs once, or file what the verdict deferred"].env;
    const decision = rerunDecide({
        workflow: env.WORKFLOW,
        title: env.TITLE,
        attempt: env.ATTEMPT,
        conclusion: env.CONCLUSION,
        record,
        record2,
        failed,
        lostRunner: () => false,
    });
    return { ran: true, decision, env };
}

const failedNames = (r) =>
    Object.entries(r.jobs)
        .filter(([, j]) => FAILED.has(j.result))
        .map(([p]) => {
            const [top, inner] = p.split("/");
            const name = load("release.yml").jobs[top].name;
            return inner
                ? `${name} / ${load(load("release.yml").jobs[top].uses.split("/").pop()).jobs[inner].name}`
                : name;
        });

describe("the nightly path's scenario matrix", () => {
    it("(1) a scheduled full run, attempt 1, every lane green: judged, promoted, nothing held or filed", () => {
        const r = fullRun({ judged: { held: "" } });
        assert.equal(r.title, "Release (full)");
        ran(r, "pick", ...LANE_JOBS, "recapture", "verdict", "version", "land", "publish", "site");
        skipped(r, ...RED_EARLY, "held", "keep_builds", "candidate_branch", "unhold", "resume");
        assert.equal(r.jobs.verdict.outputs.state, "green-clean");
        assert.equal(r.jobs.verdict.outputs.promote, "true");
        assert.ok(!stepRan(r, "verdict", "hold"), "no hold on a green-clean verdict");
        assert.equal(r.conclusion, "success");
        assert.deepEqual(r.reads, []);
    });

    it("(2) attempt 1 with a CI shard red: the verdict defers, holds nothing and announces nothing", () => {
        const r = fullRun({ results: { "ci/test": "failure" }, judged: { held: "" } });
        assert.equal(r.jobs.ci.result, "failure");
        const v = r.jobs.verdict;
        assert.deepEqual([v.outputs.state, v.outputs.deferred, v.outputs.hold], ["red", "true", "none"]);
        assert.ok(!stepRan(r, "verdict", "hold"));
        assert.ok(!stepRan(r, "verdict", "Announce a red run, an owner item or changed screenshots"));
        skipped(r, "keep_builds", "candidate_branch", "held", "version", "recapture");
        // the early red filer runs, and on attempt 1 files nothing (tools/full-run.mjs lane-red)
        ran(r, "ci_red");
        const filer = r.jobs.ci_red.steps["File the red issue"].env;
        const lane = spawnSync(process.execPath, ["tools/full-run.mjs", "lane-red"], {
            cwd: ROOT,
            encoding: "utf8",
            env: {
                ...process.env,
                ...filer,
                GITHUB_RUN_ATTEMPT: "1",
                RUN_ATTEMPT: filer.RUN_ATTEMPT ?? "1",
                PATH: "/nonexistent",
            },
        });
        assert.equal(lane.status, 0, lane.stderr);
        assert.match(lane.stdout, /the verdict decides after the one same-commit re-run/);
        // release-rerun.yml re-runs it, and release-watch.yml stays silent because of that
        const record = { deferred: true, state: "red", red: ["ci"] };
        const rr = rerunFor(r, { record, failed: failedNames(r) });
        assert.deepEqual([rr.ran, rr.decision], [true, "rerun"]);
        const watch = simulate("release-watch.yml", { github: finished(r) });
        assert.equal(watch.jobs.announce.ran, true);
        assert.match(watch.jobs.announce.steps["Comment on the Release status issue"].step.run, /--dry/);
    });

    it("(3) the same run's attempt 2: the verdict judges the hold as the store has it now, not attempt 1's pick", () => {
        const first = fullRun({ results: { "ci/test": "failure" }, judged: { held: "" } });
        // between the attempts another run held its commit; attempt 2 keeps attempt 1's pick (held "")
        const second = fullRun({ attempt: "2", prior: first, judged: { held: OTHER } });
        assert.equal(second.jobs.pick.rerun, false, "the pick is attempt 1's");
        assert.equal(second.jobs.pick.outputs.held, "");
        assert.equal(second.jobs.ci.result, "success");
        const v = second.jobs.verdict;
        assert.equal(v.outputs.state, "green-clean");
        assert.equal(v.outputs.hold, "none", "no second hold");
        assert.equal(v.steps.promote.env.HELD, OTHER, "the promotion sees the store's hold, not the pick's");
        assert.equal(v.outputs.promote, "false", "only the held candidate promotes");
        skipped(second, "version", "candidate_branch", "keep_builds");
    });

    it("(4) the T4 lane times out: the run ends cancelled and release-rerun.yml still re-runs it", () => {
        const r = fullRun({ results: { t4: "timed_out" }, judged: { held: "" } });
        assert.equal(r.jobs.t4.result, "cancelled");
        assert.equal(r.conclusion, "cancelled");
        assert.equal(r.jobs.verdict.outputs.deferred, "true");
        skipped(r, "t4_red");
        const rr = rerunFor(r, { record: { deferred: true, state: "red", red: ["t4"] }, failed: failedNames(r) });
        assert.deepEqual([rr.ran, rr.decision], [true, "rerun"]);
    });

    it("(5) a run of workflow Release titled Release (full): release-rerun.yml and release-watch.yml take it", () => {
        const r = fullRun({ results: { "ci/test": "failure" }, judged: { held: "" } });
        assert.equal(r.title, "Release (full)");
        const rr = rerunFor(r, { record: { deferred: true, state: "red", red: ["ci"] }, failed: ["CI / Test (x)"] });
        assert.equal(rr.env.WORKFLOW, "Release", "the workflow's name, never the run's title");
        assert.equal(rr.decision, "rerun");
        for (const f of ["release-rerun.yml", "release-watch.yml"])
            assert.ok(load(f).on.workflow_run.workflows.includes(load("release.yml").name), f);
        assert.equal(simulate("release-watch.yml", { github: finished(r) }).jobs.announce.ran, true);
    });

    it("(6) three master pushes in a row: the running build finishes, the middle one is replaced, release-due only when green", () => {
        const push = (sha) => github({ event_name: "push", sha, ref: "refs/heads/master" });
        const g = new Groups();
        const runs = ["p1", "p2", "p3"].map((n, i) => ({ n, gh: push(String(i + 1).repeat(40)) }));
        for (const { n, gh } of runs)
            g.arrive(n, concurrencyOf(load("ci.yml").concurrency, { github: gh, inputs: { ref: "" } }));
        assert.deepEqual(
            ["p1", "p2", "p3"].map((n) => g.state(n)),
            ["running", "cancelled", "pending"],
        );
        g.finish(concurrencyOf(load("ci.yml").concurrency, { github: runs[0].gh, inputs: { ref: "" } }).group);
        assert.deepEqual([g.state("p1"), g.state("p3")], ["finished", "running"]);
        const ci = (results) =>
            simulate("ci.yml", { github: runs[2].gh, outputs: { packages: ciPackages, build: ciPackages }, results });
        const green = ci({});
        ran(green, "release-due", "all-checks");
        const red = ci({ "all-checks": "failure" });
        skipped(red, "release-due");
    });

    it("(7) release.yml's call of ci.yml runs every job the full run needs, and none only a pull request runs gates it", () => {
        const r = fullRun({ judged: { held: "" } });
        const ci = r.jobs.ci.inputs;
        assert.equal(ci.ref, H);
        ran(
            r,
            ...["packages", "build", "lint", "checks", "docs", "test", "links", "performance", "story-tests"].map(
                (j) => `ci/${j}`,
            ),
        );
        ran(r, "ci/story-tests-merge", "ci/all-checks");
        skipped(
            r,
            ...["stories", "visual-report", "base-checks", "release-due", "select-graphs", "cache-hygiene"].map(
                (j) => `ci/${j}`,
            ),
        );
        assert.equal(r.jobs.ci.result, "success");
        // what the re-capture reads (visual-<project>-<attempt>) is uploaded only by jobs that run here
        const producers = Object.entries(load("ci.yml").jobs)
            .filter(([, j]) =>
                (j.steps ?? []).some((s) => /^visual-\$\{\{ matrix\.project \}\}/.test(String(s.with?.name ?? ""))),
            )
            .map(([id]) => `ci/${id}`);
        assert.ok(producers.length >= 2, producers.join(","));
        ran(r, ...producers);
        assert.equal(r.jobs.recapture.ran, true);
    });

    it("(8) mode candidate on a held head two days old: every job on it runs the workflow's own tools", () => {
        const r = fullRun({ mode: "candidate", pick: { sha: H, held: H, forward: OTHER }, judged: { held: H } });
        assert.equal(r.title, "Release (candidate)");
        ran(r, "candidate_fix", "ci", "version_dry_run", "recapture", "verdict", "candidate_site");
        assert.deepEqual(r.reads, []);
        // the same job with its overlay step taken out is caught: it would run the candidate's tools/
        const steps = load("release.yml")
            .jobs.version.steps.filter((st) => st.name !== "Use the workflow's own tools and actions")
            .map((st) => ({ ran: true, step: st, env: {} }));
        const ctx = { github: github(), inputs: {}, needs: { pick: { result: "success", outputs: pickOutputs() } } };
        const bad = readsOf("release.yml", "version", steps, ctx);
        assert.ok(
            bad.some((p) => p.includes("tools/release-version.sh")),
            bad.join("\n"),
        );
    });

    it("(9) mode promote-nightly: no lane runs; the approved candidate's kept builds are versioned, landed, published", () => {
        // the run that judged H green-images and held it: keep_builds keeps H's builds under H's name
        const judging = simulate("release.yml", {
            github: github({ run_id: "3000" }),
            inputs: { mode: "full", scheduled: true },
            outputs: { pick: pickOutputs(), "ci/packages": ciPackages, "ci/build": ciPackages },
            steps: { verdict: verdictSteps({ held: "", images: 3 }) },
        });
        assert.equal(judging.jobs.verdict.outputs.state, "green-images");
        assert.equal(judging.jobs.verdict.outputs.hold, "start");
        ran(judging, "keep_builds", "candidate_branch");
        const kept = judging.jobs.keep_builds.steps;
        const keptName = Object.values(kept).find((s) => /upload-artifact/.test(s.step.uses ?? ""))?.with.name;
        assert.equal(keptName, `release-builds-${H}`);
        // the owner approved: P is the approval commit on top of H
        const P = "e".repeat(40);
        const r = simulate("release.yml", {
            github: github(),
            inputs: { mode: "promote-nightly" },
            outputs: {
                pick: pickOutputs({ release: "false", resume: "true", sha: P, tested: H, source_run: "3000", held: H }),
                resume: { promote: "true", screenshots: "" },
            },
            steps: promoted,
        });
        assert.equal(r.title, "Release (promote-nightly)");
        skipped(r, ...LANE_JOBS, "recapture", "verdict", "candidate_fix");
        ran(r, "resume", "version", "land", "publish", "site", "unhold");
        const download = r.jobs.version.steps["Download the approved candidate's builds"];
        assert.deepEqual([download.ran, download.with.name, download.with["run-id"]], [true, keptName, "3000"]);
        assert.deepEqual(r.reads, []);
    });

    it("(10) nightly-abandon.yml: anyone, no approval, its own group; trains and dispatches meanwhile still run", () => {
        const wf = load("nightly-abandon.yml");
        // owner, 2026-10-27: abandoning publishes nothing and the next full run undoes it, so it waits for nobody
        assert.notEqual(wf.jobs.abandon.environment, "production");
        assert.ok(!load("release.yml").on.workflow_dispatch.inputs.mode.options.includes("abandon"));
        assert.ok(!Object.keys(load("release.yml").jobs).some((id) => id.startsWith("abandon")));
        const a = simulate("nightly-abandon.yml", { github: github(), inputs: { reason: "stale" } });
        assert.equal(a.jobs.abandon.ran, true);
        assert.notEqual(a.concurrency.group, "release-train");
        const of = (inputs) =>
            simulate("release.yml", { github: github(), inputs, outputs: { pick: pickOutputs({ release: "false" }) } })
                .concurrency;
        const g = new Groups();
        g.arrive("abandon", a.concurrency);
        g.arrive("full-1", of({ mode: "full", scheduled: true }));
        g.arrive("abandon-2", a.concurrency);
        g.arrive("full-2", of({ mode: "full" }));
        assert.deepEqual(
            ["abandon", "full-1", "abandon-2"].map((n) => g.state(n)),
            ["running", "running", "pending"],
            "neither waits for nor cancels the other",
        );
    });

    it("(11) attempt 2 pending and replaced by a full dispatch: attempt 1's deferred red is still filed", () => {
        const first = fullRun({ results: { t4: "failure" }, judged: { held: "" } });
        const g = new Groups();
        const train = first.concurrency;
        g.arrive("other-running", train);
        g.arrive("attempt-2", train);
        g.arrive("new-dispatch", train);
        assert.equal(g.state("attempt-2"), "cancelled");
        const rr = rerunFor(first, {
            attempt: 2,
            conclusion: "cancelled",
            record: { deferred: true, state: "red", red: ["t4"] },
            failed: [],
        });
        assert.deepEqual([rr.ran, rr.decision], [true, "file"]);
    });

    it("(12) green-clean, then the screenshot gate errors: the Verdict job fails and is re-run once", () => {
        const r = fullRun({ judged: { held: "" }, gate: { fail: true } });
        assert.equal(r.jobs.verdict.result, "failure");
        assert.equal(r.jobs.verdict.steps.gate.outcome, "failure");
        skipped(r, "version");
        assert.equal(r.conclusion, "failure");
        const rr = rerunFor(r, { record: { deferred: false, state: "green-clean", red: [] }, failed: failedNames(r) });
        assert.deepEqual(failedNames(r), ["Verdict"]);
        assert.deepEqual([rr.ran, rr.decision], [true, "rerun"]);
    });

    it("(13) an owner item from a first publish, then the approval merges on master: the re-test reads master's approvals", () => {
        const r = fullRun({ outputs: { version_dry_run: { held: "babylonjs-map" } }, judged: { held: "" } });
        const v = r.jobs.verdict;
        assert.equal(v.outputs.state, "green-clean");
        assert.match(v.outputs.owner, /^babylonjs-map held/);
        assert.ok(stepRan(r, "verdict", "Announce the projects held for the owner's approval"));
        // the re-test of the same candidate: its dry run checks out H, but reads the policy master has now
        const dry = r.jobs.version_dry_run;
        const env = dry.steps["Version the candidate and check majors and first publishes"].env;
        const checkout = load("release.yml").jobs.version_dry_run.steps.find((s) => /checkout/.test(s.uses ?? ""));
        assert.equal(checkout.with["fetch-depth"], 0);
        const repo = join(TMP, "policy");
        mkdirSync(repo);
        const gitEnv = isolatedGitEnv();
        const git = (...a) => execFileSync("git", a, { cwd: repo, env: gitEnv, encoding: "utf8" }).trim();
        git("init", "-q", "-b", "master");
        writeFileSync(join(repo, "release-approvals.json"), JSON.stringify({ approve: [] }));
        git("add", ".");
        git("commit", "-qm", "H");
        const h = git("rev-parse", "HEAD");
        writeFileSync(
            join(repo, "release-approvals.json"),
            JSON.stringify({ approve: [{ project: "babylonjs-map" }] }),
        );
        git("commit", "-qam", "approval");
        git("update-ref", "refs/remotes/origin/master", "HEAD");
        git("checkout", "-q", h);
        assert.deepEqual(readPolicy("release-approvals.json", env, repo).approve, [{ project: "babylonjs-map" }]);
    });

    it("(14) a capture that is not complete: the verdict is not green", () => {
        const dir = join(TMP, "captures");
        mkdirSync(join(dir, "visual-layout-1"), { recursive: true });
        writeFileSync(join(dir, "visual-layout-1", "results.json"), JSON.stringify({ complete: false, items: [] }));
        const { changed, missing } = differingImages(dir, ["layout"]);
        assert.deepEqual(missing, ["layout"]);
        const lanes = Object.fromEntries(
            Object.keys({
                ci: 1,
                llm: 1,
                t4: 1,
                hosts: 1,
                autosave_macos: 1,
                audit: 1,
                version_dry_run: 1,
                recapture: 1,
            }).map((l) => [l, "success"]),
        );
        const v = verdictOf({ ...lanes, captures: captureLane(missing) }, changed.length);
        assert.deepEqual([v.state, v.red], ["red", ["captures"]]);
    });

    it("(16) the automatic abandon: before a full or restart pick only, failing open, never on changed screenshots", () => {
        const auto = "Abandon a stale or pipeline-made hold";
        for (const mode of ["full", "restart"]) {
            const r = fullRun({ mode, judged: { held: "" } });
            assert.ok(stepRan(r, "candidate_fix", auto), `${mode} runs it`);
        }
        assert.ok(!stepRan(fullRun({ mode: "candidate", judged: { held: H } }), "candidate_fix", auto));
        // a failure (the store or GitHub down) abandons nothing and the pick still runs
        const down = fullRun({ judged: { held: "" }, steps: { candidate_fix: { auto: { fail: true } } } });
        assert.equal(down.jobs.candidate_fix.result, "success");
        ran(down, "pick", ...LANE_JOBS);
        // the rule: held red by the screenshot capture only, and a newer master commit passed it
        const N = "d".repeat(40);
        const hold = { base: H, head: H, issue: 3994, at: Date.now() };
        const chain = [N, H];
        const red = { sha: H, state: "red", lane: "captures" };
        const fixed = autoAbandon({ hold, chain, recent: [{ sha: N, state: "green-clean", lane: "" }, red] });
        assert.equal(fixed.abandon, true, fixed.why);
        assert.equal(autoAbandon({ hold, chain, recent: [red] }).abandon, false, "nothing newer passed it");
        const code = { sha: H, state: "red", lane: "ci" };
        assert.equal(
            autoAbandon({ hold, chain, sites: [N], recent: [code] }).abandon,
            false,
            "a fresh code red stands",
        );
        const old = { ...hold, at: Date.now() - 25 * 60 * 60 * 1000 };
        assert.equal(autoAbandon({ hold: old, chain, sites: [N], recent: [code] }).abandon, true, "a stale red ends");
        const images = { sha: H, state: "green-images", lane: "" };
        assert.equal(autoAbandon({ hold: old, chain, sites: [N], recent: [images] }).abandon, false);
    });

    describe("(15) a GitHub 5xx", () => {
        // a gh that answers 502 to its first `fail` calls, then as the row says
        const fakeGh = (name, fail, body) => {
            const dir = join(TMP, name);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, "count"), "0");
            writeFileSync(
                join(dir, "gh"),
                `#!/bin/bash\nn=$(($(cat "${dir}/count") + 1)); echo "$n" > "${dir}/count"\n` +
                    `[ "$n" -gt ${fail} ] || { echo "HTTP 502: Server Error" >&2; exit 1; }\n${body}\n`,
                { mode: 0o755 },
            );
            return dir;
        };
        it("in the pick: its reads are tried again, so a passing GitHub never makes a red pick", () => {
            const step = load("release.yml").jobs.pick.steps.find((s) => s.id === "pending");
            const retry = /^\s*(retry\(\) \{.*\}; \})\s*$/m.exec(step.run)[1].replace(/sleep \d+/g, "true");
            const dir = fakeGh("pick", 2, "echo 12345");
            const r = spawnSync("bash", ["-c", `${retry}\nretry gh run list --workflow ci.yml`], {
                encoding: "utf8",
                env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
            });
            assert.deepEqual([r.status, r.stdout.trim()], [0, "12345"]);
        });
        it("in the pick, lasting: the pick fails and the verdict reports it red on its own lane, loudly", () => {
            const r = fullRun({ results: { pick: "failure" }, judged: { held: "" } });
            skipped(r, ...LANE_JOBS);
            const v = r.jobs.verdict;
            assert.deepEqual([v.ran, v.outputs.state, v.outputs.hold], [true, "red", "none"]);
            assert.ok(stepRan(r, "verdict", "Announce a red run, an owner item or changed screenshots"));
        });
        it("in release-rerun's verdict download: tried again, and a lasting one fails loudly, never decides none", () => {
            const record = JSON.stringify({ deferred: true, state: "red", red: ["t4"] });
            const body = [
                'case "$*" in',
                '  *attempts/1/jobs*) echo "T4 GPU / Test (NVIDIA T4)";;',
                "  *artifacts?name=verdict-1*) echo 1;;",
                "  *artifacts?name=verdict-2*) echo 0;;",
                `  run\\ download*) d=\${@: -1}; mkdir -p "$d"; echo '${record}' > "$d/verdict-1.json";;`,
                "esac",
            ].join("\n");
            const go = (dir) =>
                spawnSync(process.execPath, ["tools/release-rerun.mjs", "--dry"], {
                    cwd: ROOT,
                    encoding: "utf8",
                    env: {
                        ...process.env,
                        PATH: `${dir}:${process.env.PATH}`,
                        RELEASE_RERUN_RETRY_MS: "1",
                        GITHUB_OUTPUT: join(dir, "out"),
                        GITHUB_REPOSITORY: REPO,
                        RUN: "4000",
                        WORKFLOW: "Release",
                        TITLE: "Release (full)",
                        ATTEMPT: "1",
                        CONCLUSION: "failure",
                    },
                });
            const once = fakeGh("rerun-once", 1, body);
            writeFileSync(join(once, "out"), "");
            const ok = go(once);
            assert.equal(ok.status, 0, ok.stderr);
            assert.match(readFileSync(join(once, "out"), "utf8"), /^decision=rerun$/m);
            const always = fakeGh("rerun-always", 1000, body);
            writeFileSync(join(always, "out"), "");
            const bad = go(always);
            assert.notEqual(bad.status, 0);
            assert.doesNotMatch(readFileSync(join(always, "out"), "utf8"), /decision=none/);
        });
    });
});

// ---------------------------------------------------------------------------------------------------------------
// Static rules
// ---------------------------------------------------------------------------------------------------------------

const allWorkflows = () => readdirSync(WF).filter((f) => f.endsWith(".yml"));
const stepsOf = (wf) =>
    Object.entries(wf.jobs ?? {}).flatMap(([id, j]) => (j.steps ?? []).map((s, i) => ({ id, s, i, j })));

// Download steps whose pattern may match exactly one artifact, which download-artifact v8 extracts flat.
const FLAT_OK = {
    "ci.yml/visual-report":
        "story-tests uploads a visual-<project>-<attempt> for every matrix project (a skip marker included), so visual-* always matches several",
    "ci.yml/visual-flaky":
        "story-tests uploads a visual-<project>-<attempt> for every matrix project, and visual-flaky-report.mjs reads a flat results.json too",
};

describe("the nightly path's static rules", () => {
    it("every workflow_run filter names a workflow's name, never a run-name, and no step reads workflow_run.name", () => {
        const names = new Set(allWorkflows().map((f) => load(f).name));
        for (const f of allWorkflows()) {
            for (const w of load(f).on?.workflow_run?.workflows ?? [])
                assert.ok(names.has(w), `${f}: "${w}" is no workflow's name`);
            assert.doesNotMatch(
                readFileSync(join(WF, f), "utf8"),
                /github\.event\.workflow_run\.name\b/,
                `${f}: workflow_run.name is the run-name`,
            );
        }
    });

    it("release-rerun.yml takes a first attempt that failed, was cancelled or timed out", () => {
        const r = { title: "Release (full)" };
        for (const conclusion of ["failure", "cancelled", "timed_out"]) {
            const rr = simulate("release-rerun.yml", { github: finished(r, { conclusion }) });
            assert.equal(rr.jobs.rerun.ran, true, conclusion);
        }
        assert.equal(
            simulate("release-rerun.yml", { github: finished(r, { conclusion: "success" }) }).jobs.rerun.ran,
            false,
        );
    });

    it("every upload in release.yml, whose jobs a re-run runs again, is attempt-suffixed or overwrites", () => {
        const bad = stepsOf(load("release.yml"))
            .filter(({ s }) => /actions\/upload-artifact@/.test(s.uses ?? ""))
            .filter(({ s }) => !/github\.run_attempt/.test(String(s.with?.name ?? "")) && s.with?.overwrite !== true)
            .map(({ id, s }) => `${id}: ${s.with?.name}`);
        assert.deepEqual(bad, []);
    });

    it("the builds release.yml keeps are the version job's and ci.yml's build-<package> uploads", () => {
        const release = load("release.yml");
        const list = /^build-\{([a-z,-]+)\}$/.exec(release.env.PACKAGE_BUILDS)[1].split(",").sort();
        const patterns = (job) =>
            release.jobs[job].steps
                .filter((s) => /download-artifact/.test(s.uses ?? ""))
                .map((s) => s.with?.pattern)
                .filter(Boolean);
        assert.deepEqual(patterns("keep_builds"), ["${{ env.PACKAGE_BUILDS }}"]);
        assert.ok(patterns("version").includes("${{ env.PACKAGE_BUILDS }}"));
        const uploads = stepsOf(load("ci.yml"))
            .filter(({ id, s }) => id === "packages" && /upload-artifact/.test(s.uses ?? ""))
            .map(({ s }) => /^build-([a-z-]+)$/.exec(s.with?.name ?? "")?.[1])
            .filter((p) => p && p !== "packages");
        assert.deepEqual([...new Set(uploads)].sort(), list);
    });

    it("no two download patterns in one job overlap", () => {
        const glob = (p) =>
            new RegExp(
                `^${p
                    .replace(/\$\{\{[^}]*\}\}/g, "X")
                    .replace(/[.+^$()|[\]\\]/g, "\\$&")
                    .replace(/\*/g, ".*")}$`,
            );
        const sample = (p) => p.replace(/\$\{\{[^}]*\}\}/g, "X").replace(/\*/g, "1");
        const bad = [];
        for (const f of allWorkflows()) {
            for (const [id, j] of Object.entries(load(f).jobs ?? {})) {
                const ps = (j.steps ?? [])
                    .filter((s) => /download-artifact/.test(s.uses ?? "") && s.with?.pattern)
                    .map((s) => String(s.with.pattern));
                for (let a = 0; a < ps.length; a++)
                    for (let b = a + 1; b < ps.length; b++)
                        if (glob(ps[a]).test(sample(ps[b])) || glob(ps[b]).test(sample(ps[a])))
                            bad.push(`${f}/${id}: ${ps[a]} and ${ps[b]}`);
            }
        }
        assert.deepEqual(bad, []);
    });

    it("every pattern download of visual-* is nested (recapture.mjs nest) before it is read", () => {
        const bad = [];
        for (const f of allWorkflows()) {
            for (const [id, j] of Object.entries(load(f).jobs ?? {})) {
                if (FLAT_OK[`${f}/${id}`]) continue;
                const steps = j.steps ?? [];
                steps.forEach((s, i) => {
                    if (!/download-artifact/.test(s.uses ?? "") || !/^visual-/.test(String(s.with?.pattern ?? "")))
                        return;
                    if (s.with?.["merge-multiple"] === true) return;
                    const path = String(s.with?.path ?? "").replace("${{ runner.temp }}", "$RUNNER_TEMP");
                    const next = steps.slice(i + 1).find((n) => n.run && n.run.includes(path));
                    if (!next || !/recapture\.mjs nest --captures "?\$RUNNER_TEMP\/?\S*/.test(next.run))
                        bad.push(`${f}/${id}: ${s.with.pattern} into ${path}`);
                });
            }
        }
        assert.deepEqual(bad, []);
    });
});
