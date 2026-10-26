#!/usr/bin/env node
// run-group.mjs -- runs one test group and writes what it ran to the results store
// (design/ci/channels-pipeline/results-service.md 5.1 and 11).
//
//   node tools/results/run-group.mjs <shard> [<command>]
//
// Computes the group's inputs key, runs the shard's command (or <command>, run shape `selected`) through
// tools/test-quarantine.mjs runShard() -- which retries the failed test files once and decides as it does
// today -- then posts one record per try (1 = the run, 2 = the retry) and exits with runShard()'s code. The
// reporter (tools/results/reporter.mjs) sends each failure while the group runs. The store never changes the
// verdict: a record it does not take within 5 s is written to test-results/results-spool/<id>.json.
//
// Off (runs the command through runShard() and writes nothing) unless RESULTS_URL is set; GRAPHTY_RESULTS=0
// switches it off. GRAPHTY_FLAGS=on names the feature-flag variant.

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { shardKeys } from "../prepush-inputs.mjs";
import { failureHashes, familyOf, headFacts, newRunId, parseJunit } from "../test-ledger.mjs";
import { emptyState, runShard } from "../test-quarantine.mjs";
import { config, flushHealth, postInvocation, sendHealth } from "./client.mjs";
import { envString, inputsKey } from "./inputs.mjs";

/**
 * The group's invocation id without its try: `<run>.<attempt>.<job>.<shard>` in GitHub Actions, else `local.*`.
 * @param shard the shard
 * @param [env] the environment
 * @returns the id
 */
export function baseId(shard, env = process.env) {
    if (env.GITHUB_RUN_ID)
        return `${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT ?? 1}.${env.GITHUB_JOB ?? "job"}.${shard}`;
    return `local.${Date.now()}.${hostname()}.${process.pid}.${shard}`;
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
 * @returns the exit code
 */
export async function runGroup(shardName, command = undefined, { root = process.cwd(), env = process.env } = {}) {
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const shard = SHARDS.find((s) => s.shard === shardName);
    const cmd = command ?? shard?.["test-command"];
    if (!cmd) {
        console.error(`run-group: unknown shard ${shardName} and no command`);
        return 2;
    }
    if (env.GRAPHTY_RESULTS === "0" || !env.RESULTS_URL)
        return runShard(shardName, cmd, { root, env, state: emptyState() });
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
    const code = await runShard(shardName, cmd, { root, env: childEnv, state: emptyState() });
    const endedAt = Date.now();
    try {
        await record(shardName, shard, { command, cmd, root, env, id, runId, code, resultFile, startedAt, endedAt });
    } catch (e) {
        // The store never changes the verdict: a record that cannot be built, sent or spooled is only a warning.
        console.log(`run-group: ${shardName}: no record (${e.message.split("\n")[0]}); the shard's result stands`);
    }
    return code;
}

/**
 * A run's shape, the last part of its variant: `shots` for a story-tests run that also takes and compares every
 * story's screenshot (VISUAL_REVIEW_STORY_OUT set, ci.yml's story-tests job), which runs a storybook shard's
 * stories under the same shard name as the plain test job and so must not share its history; else `selected` for
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
 * Builds a finished group's records and posts them (spooling what the store does not take).
 * @param shardName the shard
 * @param shard its SHARDS entry, or undefined
 * @param o runGroup()'s facts: `command`, `cmd`, `root`, `env`, `id`, `runId`, `code`, `resultFile`, `startedAt`,
 *   `endedAt`
 */
async function record(shardName, shard, o) {
    const { command, cmd, root, env, id, runId, code, resultFile, startedAt, endedAt } = o;
    const flags = env.GRAPHTY_FLAGS === "on" ? "on" : "off";
    const selected = command !== undefined && command !== shard?.["test-command"];
    const shape = runShape(env, selected);
    const shardKey = (shard && shardKeys(root)?.()(shard)) || `unknown-${randomUUID()}`;
    const facts = { id, head: headFacts(root, env), code, result: readResult(resultFile), startedAt, endedAt, runId };
    const recs = recordsOf({
        ...facts,
        variant: `${familyOf(shardName)}|flags=${flags}|${shape}`,
        inputs: inputsKey({
            shardKey,
            env: envString(env),
            flags,
            // unchanged for the other shapes, so their history keeps its keys
            extra: (selected ? cmd : "") + (shape === "shots" ? "\nshots" : ""),
        }),
        env: envString(env),
        dir: join(root, "test-results"),
    });
    await postRecords(config(env, root), recs, join(root, "test-results/results-spool"));
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
