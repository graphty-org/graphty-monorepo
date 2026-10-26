#!/usr/bin/env node
// run-group.mjs -- runs one test group and writes what it ran to the results store
// (design/ci/channels-pipeline/results-service.md 5.1 and 11).
//
//   node tools/results/run-group.mjs <shard> [<command>]
//
// Computes the group's inputs key, runs the shard's command (or <command>, run shape `selected`) through
// tools/test-quarantine.mjs runShard() -- which retries the failed test files once and decides as it does
// today -- then posts one record per try (1 = the run, 2 = the retry) and exits with runShard()'s code. The
// reporter (tools/results/reporter.mjs) sends each failure while the group runs. A record it does not take
// within 5 s is written to test-results/results-spool/<id>.json.
//
// On a pull request with RESULTS_PLAN set (the light check's `results-plan` artifact: GET /v1/plan's answer plus
// `base`, `affected` (the test files whose file or import closure the pull request changed) and `unknownFamilies`
// (families the selector has no file-level answer for: every file touched)), the store's
// quarantine replaces tools/test-quarantine.json and the pull request rules apply (results-service.md 6.1, 6.3):
// `[NEW-FLAKY]`, `[FLAKY-UNRELATED]`, `[KNOWN]`, `[KNOWN?]`. A re-run attempt reads the quarantine and the master
// evidence again, so a base check made after the first attempt counts. An unreadable or unavailable plan (a store
// outage) changes nothing: the committed list stands, as it does elsewhere. When the store answers that a record proved a test flaky, this
// files its priority:critical issue (or comments on the signature's earlier one) and posts the number back; a
// `base` run (base-check.yml) files one `Failing on master` issue per signature that failed every time.
//
// Off (runs the command through runShard() and writes nothing) unless RESULTS_URL is set; GRAPHTY_RESULTS=0
// switches it off. GRAPHTY_FLAGS=on names the feature-flag variant; RESULTS_VARIANT names the whole variant
// (base-check.yml asks for the pull request's); RESULTS_REPEAT=<n> keeps repeated runs of one job apart.

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { shardKeys } from "../prepush-inputs.mjs";
import { failureHashes, familyOf, headFacts, newRunId, parseJunit } from "../test-ledger.mjs";
import {
    activeList,
    closedIssues,
    committedList,
    emptyState,
    fileIssue,
    PASSES_TO_LEAVE,
    quarantined,
    runShard,
} from "../test-quarantine.mjs";
import { call, config, flushHealth, postInvocation, readPlan, sendHealth } from "./client.mjs";
import { envString, inputsKey } from "./inputs.mjs";

/**
 * The group's invocation id without its try: `<run>.<attempt>.<job>.<shard>` in GitHub Actions, else `local.*`.
 * @param shard the shard
 * @param [env] the environment
 * @returns the id
 */
export function baseId(shard, env = process.env) {
    const group = env.RESULTS_REPEAT ? `${shard}.r${env.RESULTS_REPEAT}` : shard;
    if (env.GITHUB_RUN_ID)
        return `${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT ?? 1}.${env.GITHUB_JOB ?? "job"}.${group}`;
    return `local.${Date.now()}.${hostname()}.${process.pid}.${group}`;
}

const idOf = (f) => `${f.file} > ${f.name}`;
const keyOf = (f) => failureHashes((f.text ?? f.message ?? "").slice(0, 2000), f.file).key;

/**
 * The pull request rules (results-service.md 6.1, 6.3) as runShard()'s `judge`. Quarantined tests pass loudly. A
 * test that failed and then passed fails as `[NEW-FLAKY]` when the pull request touched it, else passes as
 * `[FLAKY-UNRELATED]`. A test that failed every time fails when touched; untouched, it passes as `[KNOWN]` only
 * when master's own runs failed it the same way on the base (`failingOnBase`, same family and key), else fails as
 * `[KNOWN?]`. Each untouched case names the base-check.yml dispatch the pipeline round makes.
 * @param plan the plan file (no `affected`: every test touched)
 * @param o the group
 * @param o.shard the shard
 * @param o.family its family
 * @param o.variant its variant
 * @param o.base the pull request's base commit
 * @returns the judge
 */
export function prJudge(plan, { shard, family, variant, base }) {
    const affected = plan?.affected ? new Set(plan.affected) : null;
    const unknown = (plan?.unknownFamilies ?? []).includes(family);
    const touched = (f) => !affected || unknown || affected.has(f.file);
    // master's evidence counts only from the same family and the same flags as this job
    const flagsOf = (v) => v.split("|")[1];
    const onBase = (plan?.failingOnBase ?? []).filter(
        (b) => b.variant.split("|")[0] === family && flagsOf(b.variant) === flagsOf(variant),
    );
    const known = (f) => onBase.find((b) => b.file === f.file && b.name === f.name && b.key === keyOf(f));
    const list = storeList(plan);
    const check = (f, repeat) =>
        `gh workflow run base-check.yml --ref master -f base=${base} -f file='${f.file}' -f variant='${variant}' -f repeat=${repeat}`;
    return (d, { firstOutcome }) => {
        if (firstOutcome !== "failed" || d.flaky.length + d.excused.length + d.failing.length === 0) return d;
        const lines = [];
        const failing = [];
        const warn = (text) => lines.push({ warn: true, text });
        const fail = (f, text) => {
            failing.push(f);
            lines.push({ text });
        };
        const issue = (q) => `issue #${q.issue ?? "pending"}`;
        for (const f of d.excused)
            warn(`[QUARANTINED] ${shard}: ${idOf(f)} failed again; ${issue(quarantined(list, family, f))}`);
        for (const f of d.flaky) {
            const q = quarantined(list, family, f);
            if (q) warn(`[QUARANTINED] ${shard}: ${idOf(f)} failed and passed; ${issue(q)}`);
            else if (touched(f))
                fail(
                    f,
                    `[NEW-FLAKY] ${shard}: ${idOf(f)} failed and passed, and this pull request changed it or its imports`,
                );
            else
                warn(
                    `[FLAKY-UNRELATED] ${shard}: ${idOf(f)} failed and passed; this pull request did not touch it. Base check: ${check(f, 5)}`,
                );
        }
        for (const f of d.failing) {
            const k = !touched(f) && known(f);
            if (k) warn(`[KNOWN] ${shard}: ${idOf(f)} fails the same way on master ${k.sha}, ${issue(k)}`);
            else if (touched(f)) fail(f, `[FAIL] ${shard}: ${idOf(f)} failed every time`);
            else
                fail(
                    f,
                    `[KNOWN?] ${shard}: ${idOf(f)} failed every time; no master evidence. Base check: ${check(f, 1)}`,
                );
        }
        return { ...d, flaky: d.flaky.filter((f) => !failing.includes(f)), failing, pass: failing.length === 0, lines };
    };
}

/**
 * The store's quarantine as runShard()'s list.
 * @param plan the plan file, or null
 * @returns entries `{ family, file, name, issue }`
 */
export const storeList = (plan) =>
    (plan?.quarantine ?? []).map((q) => ({ family: q.family, file: q.file, name: q.name, issue: q.issue }));

function readPlanFile(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        console.log(`run-group: no plan in ${file}: the committed quarantine list stands`);
        return null;
    }
}

/**
 * A re-run attempt's plan: the store's quarantine and master evidence read again (a base check dispatched after the
 * first attempt stored its evidence since), the rest as the first attempt planned. Fails open to the plan as it is.
 * @param plan the plan file
 * @param o the run's facts
 * @param o.cfg config()
 * @param o.sha the commit tested
 * @param o.family the shard family
 * @param o.variant the variant
 * @returns the plan
 */
export async function refreshPlan(plan, { cfg, sha, family, variant }) {
    if (!cfg || !plan?.base) return plan;
    const variants = [...new Set([`${family}|flags=off|whole`, `${family}|flags=off|selected`, variant])];
    try {
        const fresh = await readPlan(cfg, { sha, base: plan.base, variants, inputs: variants.map(() => "-") });
        if (!fresh) return plan;
        return { ...plan, quarantine: fresh.quarantine ?? [], failingOnBase: fresh.failingOnBase ?? [] };
    } catch {
        return plan;
    }
}

const ghCli = (args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
// one marker per kind, so a flaky test's issue and a `Failing on master` one for the same signature stay apart
const marker = (signature, kind) => `<!-- results kind=${kind} signature=${signature} -->`;

/**
 * The issue carrying a signature's marker (a post-back that was lost), or null.
 * @param gh `(args) => stdout`
 * @param signature the failure signature
 * @param kind `flaky` or `failing-on-master`
 * @param [state] `all` or `open`
 * @returns the number or null
 */
function findIssue(gh, signature, kind, state = "all") {
    try {
        const search = `"results kind=${kind} signature=${signature}" in:body`;
        const out = gh(["issue", "list", "--state", state, "--search", search]);
        return Number(/^(\d+)\s/m.exec(out)?.[1]) || null;
    } catch {
        return null;
    }
}

// An earlier flaky issue that was closed (fixed, then the test regressed on current master) is reopened, so the new
// quarantine is tracked on an open issue. Not for a base run, whose commit may predate the fix.
function reopen(gh, number) {
    try {
        gh(["issue", "reopen", String(number)]);
    } catch {
        // already open, or GitHub refused: the comment still lands
    }
    return number;
}

// The issue a flaky test's quarantine goes on: its earlier one, reopened by a full or bisect run. A base run never
// reopens, so it never tracks a quarantine on a closed issue (the next master run would end it): it takes an open
// issue of the signature, or none (a new one).
function earlierIssue(gh, t, isBase) {
    const earlier = t.had ?? findIssue(gh, t.signature, "flaky");
    if (!earlier) return earlier;
    if (!isBase) return reopen(gh, earlier);
    // reused only when GitHub says it is open: closed, or unknown (the query failed), takes an open one or a new one
    return closedIssues([earlier], gh)?.has(earlier) === false ? earlier : findIssue(gh, t.signature, "flaky", "open");
}

// One `Failing on master` issue per signature a base run failed every time (6.3): a comment when it exists.
function fileFailingOnMaster(gh, f, sha) {
    const { signature, line } = failureHashes(f.message, f.file);
    // open only: a closed one may have been fixed after this base, so a failure here is a new issue, not a comment
    const had = findIssue(gh, signature, "failing-on-master", "open");
    const body = [
        `\`${idOf(f)}\` fails on master ${sha} in its base check.`,
        "",
        "```",
        f.message.slice(0, 600),
        "```",
        "",
        marker(signature, "failing-on-master"),
    ].join("\n");
    try {
        if (had) {
            gh(["issue", "comment", String(had), "--body", body]);
            return { signature, number: had };
        }
        const url = gh([
            "issue",
            "create",
            "--title",
            `Failing on master: ${line}`.slice(0, 200),
            "--label",
            "bug",
            "--label",
            "priority:high",
            "--label",
            "effort:medium",
            "--body",
            body,
        ]);
        return { signature, number: Number(/\/issues\/(\d+)/.exec(url)?.[1]) || 0 };
    } catch (e) {
        console.log(`run-group: could not file the issue for ${idOf(f)} (${e.message.split("\n")[0]})`);
        return { signature, number: 0 };
    }
}

/**
 * Files the issues a group's stored records call for and posts their numbers back (results-service.md 6.6).
 * @param cfg config()
 * @param recs recordsOf()
 * @param answers postRecords()
 * @param failing runShard()'s failing tests `{ file, name }`
 * @param gh `(args) => stdout`
 * @param [now] milliseconds
 * @param [o] options
 * @param [o.onMaster] whether a base run that failed files `Failing on master` (false for one repeat of several,
 *   which alone proves nothing: the repeats together decide, through the store's flaky verdict)
 * @param [o.base] whether this is a base run (`cli.mjs base-check` sets RESULTS_REPEAT); also true when any answer
 *   the store gave says kind `base`, so a spooled last answer cannot turn a base run into a master one
 * @param [o.file] the one test file a base check asked about; `Failing on master` files only its tests
 * @returns the issues filed or commented on: `{ signature, number }`
 */
export async function fileIssues(
    cfg,
    recs,
    answers,
    failing,
    gh,
    now = Date.now(),
    { onMaster = true, base = false, file } = {},
) {
    const out = [];
    const isBase = base || answers.some((a) => a.ok && a.data?.kind === "base");
    const day = (ms) => new Date(ms).toISOString().slice(0, 10);
    // both tries' answers can name one test: one issue for it
    const named = new Map(answers.flatMap((a) => (a.ok ? (a.data?.flaky ?? []) : [])).map((t) => [idOf(t), t]));
    for (const t of named.values()) {
        const seen = recs.flatMap((r) => r.failures).find((f) => f.file === t.file && f.name === t.name);
        const entry = {
            ...t,
            reason: `failed and passed on the same commit and inputs (${t.proof})`,
            excerpt: (seen?.message ?? "").slice(0, 600),
            since: day(now),
            where: [
                "It is quarantined in the results store: it still runs and is reported loudly, but its failures no",
                `longer fail CI. It leaves when this issue closes, after ${PASSES_TO_LEAVE} consecutive passing runs on`,
                `master, or on ${day(now + 14 * 86_400_000)}.`,
            ],
            extra: ["", marker(t.signature, "flaky")],
        };
        const number = fileIssue(entry, earlierIssue(gh, t, isBase), gh);
        if (number)
            out.push({ signature: t.signature, number, kind: "flaky", family: t.family, file: t.file, name: t.name });
    }
    const last = recs.at(-1);
    if (onMaster && isBase && last?.outcome === "failed") {
        // only the file the base check was asked about: a whole-shard check also fails tests nobody asked about
        const broken = last.failures.filter(
            (f) => (!file || f.file === file) && failing.some((x) => x.file === f.file && x.name === f.name),
        );
        const bySignature = new Map(broken.map((f) => [failureHashes(f.message, f.file).signature, f]));
        for (const f of bySignature.values()) {
            const r = fileFailingOnMaster(gh, f, last.sha);
            if (r.number) out.push({ ...r, kind: "failing-on-master" });
        }
    }
    for (const i of out) await call(cfg, "POST", "/v1/issues", i);
    // the store's entries whose issue closed leave, as a committed entry does (6.5); one just reopened stays
    const filed = new Set(out.map((i) => i.number));
    const tracked = [...new Set(answers.flatMap((a) => (a.ok ? (a.data?.tracked ?? []) : [])))].filter(
        (n) => !filed.has(n),
    );
    for (const n of closedIssues(tracked, gh) ?? [])
        await call(cfg, "POST", "/v1/issues", { number: n, state: "closed" });
    return out;
}

/**
 * The JUnit reports one vitest run wrote (vitest.ci-junit.mjs names them by TEST_LEDGER_RUN).
 * @param dir the test-results directory
 * @param id the run's TEST_LEDGER_RUN
 * @returns parseJunit()'s `{ files, failures }`, or null when it wrote none or one is unreadable
 */
export function junitOf(dir, id) {
    const names = existsSync(dir)
        ? readdirSync(dir).filter((n) => /^junit-.*\.xml$/.test(n) && n.includes(`-${id}-`))
        : [];
    if (names.length === 0) return null;
    const into = { files: new Map(), failures: [] };
    try {
        for (const n of names) parseJunit(readFileSync(join(dir, n), "utf8"), n.slice(6, n.indexOf(`-${id}-`)), into);
    } catch {
        return null;
    }
    return into;
}

const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);
const firstOutcome = (code, result) => {
    // The group's code is its verdict after the retry; the first try is judged by its own exit code. A first try
    // that exited 0 is never retried, so a group code other than 0 is runShard's own verdict on it (the output
    // budget): an error, not a pass.
    if ((result.firstCode ?? code) === 0) return code === 0 ? "passed" : "error";
    return OUTCOMES.has(result.firstOutcome) ? result.firstOutcome : "infra";
};
const retryOutcome = (result, junit) => {
    if (result.retryCode === 0) return "passed";
    return junit?.failures.length ? "failed" : "error";
};

/**
 * One try's record (results-service.md 5.1).
 * @param o `id`, `head` (headFacts()), `variant`, `inputs`, `env`, `try`, `outcome`, `startedAt`, `ms`, `junit`
 * @returns the record
 */
export function recordOf(o) {
    const files = [...(o.junit?.files ?? [])].map(([f, c]) => [f, c.passed, c.failed, c.skipped, c.ms]);
    const failures = (o.junit?.failures ?? []).map((f) => ({
        file: f.file,
        name: f.name,
        status: failureHashes(f.text ?? "", f.file).status,
        message: (f.text ?? "").slice(0, 2000),
    }));
    return {
        id: `${o.id}.${o.try}`,
        sha: o.head.commit,
        tree: o.head.tree,
        baseSha: o.head.base,
        variant: o.variant,
        inputs: o.inputs,
        env: o.env,
        try: o.try,
        outcome: o.outcome,
        startedAt: o.startedAt,
        secs: Math.round(o.ms / 100) / 10,
        dirty: o.head.dirty,
        files,
        failures,
    };
}

/**
 * The records of a group's run and its retry.
 * @param o `id`, `head`, `variant`, `inputs`, `env`, `code` (runShard()), `result` (its TEST_QUARANTINE_RESULT),
 *   `startedAt`, `endedAt`, `dir` (test-results), `runId` (TEST_LEDGER_RUN)
 * @returns one or two records
 */
export function recordsOf(o) {
    const { result } = o;
    const common = { id: o.id, head: o.head, variant: o.variant, inputs: o.inputs, env: o.env };
    const firstEnd = result.retried ? result.retryAt : o.endedAt;
    const recs = [
        recordOf({
            ...common,
            try: 1,
            outcome: firstOutcome(o.code, result),
            startedAt: o.startedAt,
            ms: firstEnd - o.startedAt,
            junit: junitOf(o.dir, o.runId),
        }),
    ];
    if (result.retried) {
        const junit = junitOf(o.dir, `${o.runId}.retry`);
        const outcome = retryOutcome(result, junit);
        recs.push(
            recordOf({ ...common, try: 2, outcome, startedAt: result.retryAt, ms: o.endedAt - result.retryAt, junit }),
        );
    }
    return recs;
}

/**
 * Posts a group's records. A store that did not take one is not asked again: the rest go straight to the spool,
 * so a store that never answers costs one timeout, not one per record.
 * @param cfg config()
 * @param recs recordsOf()
 * @param spool the spool directory
 * @param [ms] the timeout of each post
 * @returns postInvocation()'s results
 */
export async function postRecords(cfg, recs, spool, ms = undefined) {
    const out = [];
    let store = cfg;
    for (const rec of recs) {
        // the health API still gets the records the store is no longer asked for
        if (!store && cfg?.health) sendHealth(cfg, "/v1/invocations", rec);
        const r = await postInvocation(store, rec, spool, ms);
        if (!r.ok) store = null;
        console.log(
            r.ok
                ? `run-group: recorded ${rec.id}`
                : `run-group: ${rec.id} not recorded (${r.why}); spooled to ${r.spooled}`,
        );
        out.push(r);
    }
    return out;
}

function readResult(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return {};
    }
}

/**
 * Runs the group and posts its records.
 * @param shardName the shard
 * @param [command] a narrower command (run shape `selected`)
 * @param [o] options
 * @param [o.root] the checkout
 * @param [o.env] the environment
 * @param [o.gh] `(args) => stdout`, the GitHub CLI
 * @returns the exit code
 */
export async function runGroup(
    shardName,
    command = undefined,
    { root = process.cwd(), env = process.env, gh = ghCli } = {},
) {
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const shard = SHARDS.find((s) => s.shard === shardName);
    const cmd = command ?? shard?.["test-command"];
    if (!cmd) {
        console.error(`run-group: unknown shard ${shardName} and no command`);
        return 2;
    }
    const flags = env.GRAPHTY_FLAGS === "on" ? "on" : "off";
    const selected = command !== undefined && command !== shard?.["test-command"];
    const family = groupFamily(shardName, env);
    const variant = env.RESULTS_VARIANT || `${family}|flags=${flags}|${runShape(env, selected)}`;
    const head = headFacts(root, env);
    // no file (the full path), an unreadable one or a store outage: the committed list stands
    let plan = env.RESULTS_PLAN && existsSync(env.RESULTS_PLAN) ? readPlanFile(env.RESULTS_PLAN) : null;
    // a family the store was not asked about (a bin of a package nx did not call affected) keeps the committed list
    if (plan?.unavailable || (plan?.families && !plan.families.includes(family))) plan = null;
    if (plan && Number(env.GITHUB_RUN_ATTEMPT ?? 1) > 1)
        plan = await refreshPlan(plan, { cfg: config(env, root), sha: head.commit, family, variant });
    const rules =
        env.GITHUB_EVENT_NAME === "pull_request" && plan
            ? {
                  list: storeList(plan),
                  judge: prJudge(plan, { shard: shardName, family, variant, base: plan.base ?? head.base }),
              }
            : {};
    rules.family = family;
    rules.list ??= activeList(committedList(root), emptyState());
    // a screenshot run's own family (`<family>-shots`) is never written by the gate or the store, so the shard's
    // quarantine counts for it too
    const base = familyOf(shardName);
    if (family !== base) rules.list = rules.list.map((q) => (q.family === base ? { ...q, family } : q));
    // the list this run judges by, for a later step (ci.yml's merge-results) that must judge by the same one
    if (env.RESULTS_QUARANTINE_OUT) {
        const quarantine = rules.list.filter((q) => q.family === family);
        mkdirSync(dirname(env.RESULTS_QUARANTINE_OUT), { recursive: true });
        writeFileSync(env.RESULTS_QUARANTINE_OUT, `${JSON.stringify({ quarantine }, null, 4)}\n`);
    }
    if (env.GRAPHTY_RESULTS === "0" || !env.RESULTS_URL)
        return runShard(shardName, cmd, { root, env, state: emptyState(), ...rules });
    const id = baseId(shardName, env);
    const runId = env.TEST_LEDGER_RUN ?? newRunId(shardName);
    const resultFile = join(tmpdir(), `run-group-${process.pid}-${Date.now()}.json`);
    const childEnv = {
        ...env,
        TEST_LEDGER_RUN: runId,
        GRAPHTY_RESULTS_INVOCATION: id,
        TEST_QUARANTINE_RESULT: resultFile,
    };
    const startedAt = Date.now();
    const code = await runShard(shardName, cmd, { root, env: childEnv, state: emptyState(), ...rules });
    const endedAt = Date.now();
    try {
        const facts = { cmd, root, env, id, runId, code, resultFile, startedAt, endedAt };
        await record(shard, { ...facts, flags, selected, variant, head, gh });
    } catch (e) {
        // The store never changes the verdict: a record that cannot be built, sent or spooled is only a warning.
        console.log(`run-group: ${shardName}: no record (${e.message.split("\n")[0]}); the shard's result stands`);
    }
    return code;
}

/**
 * The family a run's history, flaky detection and quarantine are kept under (the variant's first part, which the
 * results service files by): the shard's family, or for a story-tests run that takes screenshots (ci.yml's
 * story-tests job) a family of its own, `<family>-shots`, so a story unstable only when screenshotted never
 * excuses a failure in the plain storybook shard, and the algorithms and layout legs never mix into the
 * algorithms-browser and layout unit tests' history.
 * @param shardName the shard the run is named after
 * @param env the environment
 * @returns the family
 */
export function groupFamily(shardName, env) {
    return env.VISUAL_REVIEW_STORY_OUT ? `${familyOf(shardName)}-shots` : familyOf(shardName);
}

/**
 * A run's shape, the last part of its variant: `shots` for a story-tests run that also takes and compares every
 * story's screenshot (VISUAL_REVIEW_STORY_OUT set, ci.yml's story-tests job), which runs a storybook shard's
 * stories under the same shard name as the plain test job (its family is groupFamily()'s); else `selected` for
 * a narrower command than the shard's own, `whole` for the shard's own.
 * @param env the environment
 * @param selected whether the command is not the shard's own
 * @returns "shots", "selected" or "whole"
 */
export function runShape(env, selected) {
    if (env.VISUAL_REVIEW_STORY_OUT) return "shots";
    return selected ? "selected" : "whole";
}

/**
 * Builds a finished group's records, posts them (spooling what the store does not take) and files the
 * quarantine issues the store asks for.
 * @param shard its SHARDS entry, or undefined
 * @param o runGroup()'s facts: `cmd`, `root`, `env`, `id`, `runId`, `code`, `resultFile`, `startedAt`,
 *   `endedAt`, `flags`, `selected`, `variant`, `head`, `gh`
 */
async function record(shard, o) {
    const { cmd, root, env, id, runId, code, resultFile, startedAt, endedAt, flags, selected, variant, head, gh } = o;
    const shardKey = (shard && shardKeys(root)?.()(shard)) || `unknown-${randomUUID()}`;
    const result = readResult(resultFile);
    const facts = { id, head, code, result, startedAt, endedAt, runId };
    const recs = recordsOf({
        ...facts,
        variant,
        inputs: inputsKey({
            shardKey,
            env: envString(env),
            flags,
            extra: (selected ? cmd : "") + (env.VISUAL_REVIEW_STORY_OUT ? "\nshots" : ""),
        }),
        env: envString(env),
        dir: join(root, "test-results"),
    });
    const cfg = config(env, root);
    const answers = await postRecords(cfg, recs, join(root, "test-results/results-spool"));
    await fileIssues(cfg, recs, answers, result.failing ?? [], gh, Date.now(), {
        onMaster: env.RESULTS_FILE_FAILING !== "0",
        base: Boolean(env.RESULTS_REPEAT),
        file: env.RESULTS_BASE_FILE,
    });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [shard, command] = process.argv.slice(2);
    if (!shard) {
        console.error("usage: node tools/results/run-group.mjs <shard> [<command>]");
        process.exit(2);
    }
    const code = await runGroup(shard, command);
    await flushHealth();
    process.exit(code);
}
