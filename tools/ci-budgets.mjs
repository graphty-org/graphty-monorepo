#!/usr/bin/env node
// CI time budgets: the reader of ci-budgets.json (design/ci/channels-pipeline.md section 7). The one other
// reader is tools/pipeline-health/src/model/metrics.ts, which judges full-run shards by `job:ci.yml:Test (*)`.
//
//   node tools/ci-budgets.mjs lint
//       every job of a budgeted workflow has timeout-minutes = max(hangRatio x budget, minHangMinutes),
//       and no step that builds with nx reads a secret or depends on the event or ref
//       (one build for every event). Exit 1 on a problem.
//   node tools/ci-budgets.mjs report --run <id> [--kind pr|master|full|promote|dispatch]
//                                    [--nx-profile <file>]... [--medians <file>] [--pr <n>]
//       the run's run, job, step, queue and nx task durations against their budgets: a table in
//       $GITHUB_STEP_SUMMARY, a warning per key over budget, one comment on the pull request for a key
//       over 1.5 times master's median and 60 s slower, and the rows sent to $RESULTS_URL. Never fails.
//       Master's and full runs' alarms go to one issue per workflow, kind and finding (syncAlarms(), #9273).
//   node tools/ci-budgets.mjs trend --history <rows.json>
//       the trend alarms over stored rows, printed.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { repoApi } from "./lib/github.mjs";
import { call, config } from "./results/client.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const COMMENT_MARKER = "<!-- ci-budgets -->";

// ---------- the budgets file ----------

/**
 * The parsed budgets file.
 * @param root the repository root
 * @returns the parsed ci-budgets.json
 */
export function loadBudgets(root = ROOT) {
    return JSON.parse(readFileSync(join(root, "ci-budgets.json"), "utf8"));
}

/**
 * The budget of a key: an exact entry, else one whose `*` matches (a specific key wins).
 * @param file the parsed ci-budgets.json
 * @param key a key such as `job:ci.yml:Test (graphty-1)`
 * @returns the entry, or undefined
 */
export function budgetFor(file, key) {
    const budgets = file.budgets ?? {};
    if (budgets[key]) return budgets[key];
    const hit = Object.keys(budgets).find((k) => k.includes("*") && globMatch(k, key));
    return hit ? budgets[hit] : undefined;
}

function globMatch(pattern, key) {
    const re = pattern.split("*").map((p) => p.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));
    return new RegExp(`^${re.join(".*")}$`).test(key);
}

/**
 * The hang guard of a budget.
 * @param file the parsed ci-budgets.json
 * @param minutes a budget in minutes
 * @returns the timeout-minutes a job with that budget must have
 */
export function hangMinutes(file, minutes) {
    const d = { hangRatio: 2, minHangMinutes: 10, ...file.defaults };
    return Math.max(Math.ceil(d.hangRatio * minutes), d.minHangMinutes);
}

/**
 * The budgets file's own problems.
 * @param file the parsed ci-budgets.json
 * @returns a problem per malformed entry
 */
export function fileProblems(file) {
    if (file?.version !== 1 || typeof file.budgets !== "object")
        return ["ci-budgets.json: needs version 1 and budgets"];
    return Object.entries(file.budgets)
        .filter(([, b]) => !(b.minutes > 0 || b.gib > 0 || b.gb > 0 || b.record === true))
        .map(([k]) => `ci-budgets.json: ${k} has no minutes, gib, gb or record: true`);
}

// ---------- lint ----------

/**
 * The jobs of a workflow, a matrix name's `${{ ... }}` read as `*`.
 * @param doc the parsed workflow
 * @returns one entry per job: id, name, timeout, uses, env, steps
 */
export function jobsOf(doc) {
    return Object.entries(doc?.jobs ?? {}).map(([id, j]) => ({
        id,
        name: String(j.name ?? id).replaceAll(/\$\{\{[^}]*\}\}/g, "*"),
        timeout: j["timeout-minutes"],
        uses: j.uses,
        env: j.env ?? {},
        steps: j.steps ?? [],
    }));
}

const BUILD_RUN =
    /\bnx\b[^\n]*(-t|--targets?)[ =]\S*\bbuild\b|\bnx\b[^\n]*\s\S+:build\b|\bnx\s+build\b|\bp?npm( run)? build\b/;
const SECRET = /\$\{\{[^}]*\bsecrets\b/;
const EVENT_IF = /github\.(event_name|ref)\b/;

function buildStepProblems(where, job, workflowEnv = {}) {
    const out = [];
    for (const step of job.steps) {
        if (!BUILD_RUN.test(step.run ?? "")) continue;
        const label = `${where}: job ${job.name}, step "${step.name ?? step.run}"`;
        const env = { ...workflowEnv, ...job.env, ...step.env };
        for (const [k, v] of Object.entries(env)) {
            if (SECRET.test(String(v)))
                out.push(`${label}: env ${k} reads a secret; a build gets the same inputs on every event`);
        }
        if (EVENT_IF.test(String(step.if ?? "")))
            out.push(`${label}: if: depends on the event or ref; a build runs on every event`);
    }
    return out;
}

function timeoutProblem(where, file, job, workflow) {
    const budget = budgetFor(file, `job:${workflow}:${job.name}`) ?? budgetFor(file, `job:${workflow}:${job.id}`);
    if (!budget?.minutes) {
        return job.timeout
            ? { warning: `${where}: job ${job.name} has no budget` }
            : { error: `${where}: job ${job.name} has no timeout-minutes (and no budget)` };
    }
    const want = hangMinutes(file, budget.minutes);
    if (job.timeout === want) return {};
    return {
        error: `${where}: job ${job.name} has timeout-minutes ${job.timeout ?? "unset"}, want ${want} (twice its ${budget.minutes} min budget)`,
    };
}

/**
 * Lint one workflow against the budgets file.
 * @param file the parsed ci-budgets.json
 * @param workflow the workflow's file name, `ci.yml`
 * @param doc the parsed workflow
 * @returns the errors and the warnings
 */
export function lintWorkflow(file, workflow, doc) {
    const where = `.github/workflows/${workflow}`;
    const budgeted = Object.keys(file.budgets ?? {}).some((k) => k.split(":")[1] === workflow);
    const errors = [];
    const warnings = [];
    for (const job of jobsOf(doc)) {
        errors.push(...buildStepProblems(where, job, doc?.env));
        if (!budgeted || job.uses) continue; // a called workflow's jobs carry their own guards
        const p = timeoutProblem(where, file, job, workflow);
        if (p.error) errors.push(p.error);
        if (p.warning) warnings.push(p.warning);
    }
    return { errors, warnings };
}

async function lint(root = ROOT) {
    // yaml only here: the timings job runs `report` from a checkout with no node_modules
    const { parse: parseYaml } = await import("yaml");
    const file = loadBudgets(root);
    const errors = fileProblems(file);
    const warnings = [];
    const dir = join(root, ".github/workflows");
    for (const name of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
        const r = lintWorkflow(file, name, parseYaml(readFileSync(join(dir, name), "utf8")));
        errors.push(...r.errors);
        warnings.push(...r.warnings);
    }
    for (const w of warnings) console.log(`warning: ${w}`);
    for (const e of errors) console.log(`error: ${e}`);
    console.log(`ci-budgets lint: ${errors.length} problem(s), ${warnings.length} warning(s)`);
    return errors.length ? 1 : 0;
}

// ---------- report ----------

const secondsBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 1000;
const RUN_JOB = "(run)";
const QUEUE_STEP = "(queue)";
const TASK_JOB = "(nx)";

/**
 * Rows for a run from GitHub's jobs listing. A skipped job records nothing; queue rows are a job's
 * created_at to its started_at.
 * @param run the run (`created_at`, `path`)
 * @param jobs the run's jobs with their steps
 * @param kind the run kind (pr, master, full, ...)
 * @returns rows of key, level, seconds, outcome, runner
 */
export function rowsFromJobs(run, jobs, kind) {
    const wf = basename(run.path ?? "ci.yml");
    const done = jobs.filter((j) => j.completed_at && j.started_at && j.conclusion !== "skipped");
    const rows = [];
    for (const j of done) {
        const base = { outcome: j.conclusion, runner: j.labels?.[0] ?? null, job: j.name };
        rows.push(
            {
                ...base,
                key: `job:${wf}:${j.name}`,
                level: "job",
                seconds: secondsBetween(j.started_at, j.completed_at),
                startedAt: j.started_at,
            },
            {
                ...base,
                key: `queue:${wf}:${j.name}`,
                level: "queue",
                seconds: secondsBetween(j.created_at ?? j.started_at, j.started_at),
                step: QUEUE_STEP,
                startedAt: j.created_at ?? j.started_at,
            },
        );
        for (const s of (j.steps ?? []).filter((s) => s.started_at && s.completed_at && s.conclusion !== "skipped")) {
            rows.push({
                ...base,
                outcome: s.conclusion,
                key: `step:${wf}:${j.name}:${s.name}`,
                level: "step",
                seconds: secondsBetween(s.started_at, s.completed_at),
                step: s.name,
                startedAt: s.started_at,
            });
        }
    }
    const last = done
        .map((j) => j.completed_at)
        .sort()
        .at(-1);
    if (last) {
        const failed = done.some((j) => j.conclusion === "failure");
        rows.unshift({
            key: `run:${wf}:${kind}`,
            level: "run",
            seconds: secondsBetween(run.created_at, last),
            outcome: failed ? "failure" : "success",
            runner: null,
            job: RUN_JOB,
            startedAt: run.created_at,
        });
    }
    return rows;
}

/**
 * Task rows from an Nx profile (a Chrome trace: complete events, microseconds).
 * @param trace the parsed profile
 * @returns rows
 */
export function taskRows(trace) {
    const events = Array.isArray(trace) ? trace : (trace?.traceEvents ?? []);
    return events
        .filter((e) => e.ph === "X" && typeof e.name === "string" && e.name.includes(":") && e.dur > 0)
        .map((e) => ({
            key: `task:${e.name}`,
            level: "task",
            seconds: e.dur / 1e6,
            outcome: "success",
            runner: null,
            job: TASK_JOB,
            task: e.name,
        }));
}

/**
 * A run's rows as the results store's duration rows (tools/results-service, POST /v1/durations): the run row
 * is job `(run)`, a queue row is its job's step `(queue)`, an nx task row is job `(nx)` with its task.
 * @param run the run (`id`, `run_attempt`, `path`, `head_sha`)
 * @param rows rowsFromJobs() and taskRows() rows
 * @returns the store's rows
 */
export function storeRows(run, rows) {
    return rows.map((r) => ({
        runId: run.id,
        attempt: run.run_attempt ?? 1,
        workflow: basename(run.path ?? "ci.yml"),
        job: r.job,
        step: r.step ?? "",
        task: r.task ?? "",
        sha: run.head_sha,
        startedAt: r.startedAt ? Date.parse(r.startedAt) : null,
        ms: Math.round(r.seconds * 1000),
        conclusion: r.outcome,
    }));
}

const budgetKey = (file, key) => budgetFor(file, key) ?? budgetFor(file, key.replace(/^run:([^:]+):.*$/, "run:$1"));

/**
 * Each row against its budget and master's median.
 * @param rows the run's rows
 * @param file the parsed ci-budgets.json
 * @param medians master's median seconds by key
 * @returns key, seconds, budget, median, over, slow per row: `over` past the budget, `slow` over 1.5x
 *   master's median and at least 60 s slower
 */
export function evaluate(rows, file, medians = {}) {
    return rows.map((r) => {
        const minutes = budgetKey(file, r.key)?.minutes;
        const median = medians[r.key];
        return {
            key: r.key,
            level: r.level,
            seconds: r.seconds,
            budget: minutes ? minutes * 60 : null,
            median: median ?? null,
            over: !!minutes && r.seconds > minutes * 60,
            slow: median > 0 && r.seconds > 1.5 * median && r.seconds - median >= 60,
        };
    });
}

/**
 * A duration as `13m33s` or `45s`.
 * @param s seconds, or null
 * @returns the text, `-` for null
 */
export function fmt(s) {
    if (s == null) return "-";
    const r = Math.round(s);
    if (r < 60) return `${r}s`;
    return `${Math.floor(r / 60)}m${String(r % 60).padStart(2, "0")}s`;
}

/**
 * The step summary's table.
 * @param evals evaluate()'s answer
 * @returns the summary table (Markdown)
 */
export function summaryTable(evals) {
    const lines = ["| Key | Measured | Budget | Master median | Change |", "| --- | --- | --- | --- | --- |"];
    for (const e of evals.filter((x) => x.level !== "step" || x.over)) {
        const sign = e.seconds >= e.median ? "+" : "-";
        const change = e.median ? `${sign}${fmt(Math.abs(e.seconds - e.median))}` : "-";
        lines.push(
            `| ${e.over ? "**" + e.key + "**" : e.key} | ${fmt(e.seconds)} | ${fmt(e.budget)} | ${fmt(e.median)} | ${change} |`,
        );
    }
    return lines.join("\n");
}

/**
 * The pull request's budgets comment.
 * @param evals evaluate()'s answer
 * @returns the pull request comment, or null when no key is slow against master
 */
export function prComment(evals) {
    const slow = evals.filter((e) => e.slow);
    if (!slow.length) return null;
    const rows = slow.map((e) => `| ${e.key} | ${fmt(e.seconds)} | ${fmt(e.median)} |`);
    return [
        COMMENT_MARKER,
        "CI time: these keys took over 1.5 times master's median on this pull request.",
        "",
        "| Key | This run | Master median |",
        "| --- | --- | --- |",
        ...rows,
    ].join("\n");
}

/**
 * Write or update the one budgets comment on a pull request.
 * @param gh (path, init?) => parsed answer of GitHub's REST API for this repository
 * @param pr the pull request number
 * @param body the comment
 */
export async function upsertComment(gh, pr, body) {
    const comments = await gh(`/issues/${pr}/comments?per_page=100`);
    const mine = comments.find((c) => c.body?.includes(COMMENT_MARKER));
    if (mine) await gh(`/issues/comments/${mine.id}`, { method: "PATCH", body: JSON.stringify({ body }) });
    else await gh(`/issues/${pr}/comments`, { method: "POST", body: JSON.stringify({ body }) });
}

// ---------- trend ----------

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function groups(history) {
    const by = new Map();
    for (const r of history.filter((x) => x.outcome !== "cancelled")) {
        const k = `${r.key}\u0000${r.run_kind}`;
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(r);
    }
    for (const rows of by.values()) rows.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    return by;
}

/**
 * Whether a key is back under its lines with room to spare, so it leaves its alarm. The closing line sits below the
 * opening one (0.9 x the budget, 1.1 x earlier or under 30 s slower), so a key near the line does not flap.
 * @param file the parsed ci-budgets.json
 * @param key the row key
 * @param seconds the key's time in the run judged
 * @param earlier median of the 10 runs before the last 5, or null
 * @returns true when the key is back under
 */
export function clearOf(file, key, seconds, earlier) {
    const minutes = budgetKey(file, key)?.minutes;
    const underBudget = !minutes || seconds < 0.9 * minutes * 60;
    return underBudget && (earlier == null || seconds <= 1.1 * earlier || seconds - earlier < 30);
}

function judge(file, rows) {
    const recentRows = rows.slice(-5);
    const recent = median(recentRows.map((r) => r.seconds));
    const earlierRows = rows.slice(-15, -5);
    const earlier = earlierRows.length ? median(earlierRows.map((r) => r.seconds)) : null;
    const minutes = budgetKey(file, rows[0].key)?.minutes;
    const overBudget = !!minutes && recent > minutes * 60;
    const overTrend = earlier != null && recent > 1.3 * earlier && recent - earlier >= 60;
    const line = overBudget ? minutes * 60 : Math.max(1.3 * earlier, earlier + 60);
    const firstOver = rows.findIndex((r, i) => i >= rows.length - 5 && r.seconds > line);
    const range = firstOver > 0 ? `${rows[firstOver - 1].sha.slice(0, 10)}..${rows[firstOver].sha.slice(0, 10)}` : null;
    return { recent, earlier, alarm: overBudget || overTrend, range, last: rows.at(-1).seconds, runs: recentRows };
}

/**
 * Trend verdicts per key and run kind: `recent` = median of the last 5 runs, `earlier` = median of
 * the 10 before; an alarm when recent is over the budget, or over 1.3 x earlier and 60 s slower; `last` = the newest
 * run's time. A key that stopped getting samples (VANISHED_RUNS) gets no verdict.
 * @param history stored rows { key, run_kind, seconds, sha, recorded_at, outcome }
 * @param file the parsed ci-budgets.json
 * @returns key, kind, recent, earlier, alarm, range, last, runs per key and kind
 */
export function trend(history, file) {
    const live = history.filter((r) => r.outcome !== "cancelled");
    // a key no run of its workflow and kind has sampled in VANISHED_RUNS runs (counted by commit) is gone: no verdict
    const gone = (rows) => {
        const { key, run_kind, recorded_at } = rows.at(-1);
        const wf = key.split(":")[1];
        const later = live.filter(
            (r) => r.run_kind === run_kind && r.key.split(":")[1] === wf && r.recorded_at > recorded_at,
        );
        return new Set(later.map((r) => r.sha)).size >= VANISHED_RUNS;
    };
    return [...groups(history).entries()]
        .filter(([, rows]) => rows.length >= 5 && !gone(rows))
        .map(([k, rows]) => ({ key: k.split("\u0000")[0], kind: k.split("\u0000")[1], ...judge(file, rows) }));
}

// ---------- the alarm issues ----------

// One open issue per workflow, run kind and finding lists every key over its line (#9273): `code`, the keys a change
// in their suspect range may have slowed, and `shared`, the keys a slowdown the whole run shares explains (runner
// contention, a slower runner class). Each run updates the lists instead of filing an issue per key.
const FINDINGS = {
    code: { title: "keys over the line", labels: ["bug", "ci-budget", "priority:high", "effort:medium"] },
    shared: { title: "shared slowdown", labels: ["infrastructure", "ci-budget", "priority:medium", "effort:medium"] },
};

/**
 * The title of a workflow's and run kind's alarm issue.
 * @param workflow the workflow's file name, `release.yml`
 * @param kind the run kind
 * @param finding `code` or `shared`
 * @returns the title
 */
export const alarmTitle = (workflow, kind, finding) => `CI budget: ${workflow} (${kind}) ${FINDINGS[finding].title}`;

// A run slowed as a whole when its typical key of 2 minutes or more took SHARED_RATIO times its usual time (`earlier`):
// full runs measured 0.96 to 1.06 before the runner contention of 2026-11-20 and 1.09 to 1.13 during it (#9273). Which
// test files changed cannot tell the two apart: a full run's suspect range is 6 hours of master (400 to 519 files, 42 to
// 99 of them graphty's or graphty-element's tests, on 2026-11-20), and the job cannot see which files a shard ran.
export const SHARED_RATIO = 1.08;
// a key slowed past SHARED_SPREAD times its run's own slowdown has a slowdown of its own
const SHARED_SPREAD = 1.5;
const LONG_SECONDS = 120;
const MIN_LONG_KEYS = 20;
const STATE = /<!-- ci-budgets-alarm (\{.*?\}) -->/s;
const BODY_MAX = 60_000;
const REOPEN_DAYS = 7;
const SETTLED = new Set(["not_planned", "duplicate"]);
// the per-key issues filed before #9273, folded into the issue that lists their key
const PER_KEY_TITLE = /^CI budget: ((?:run|job|step|queue):[^:]+:.+) \(([a-z-]+)\) /;

/**
 * How much slower the run ran as a whole: the median, over its job and step keys whose usual time is 2 minutes or
 * more, of the key's time in this run (`last`) over its usual time (`earlier`).
 * @param verdicts the run's verdicts
 * @returns the factor, or null with fewer than 20 such keys
 */
export function sharedSlowdown(verdicts) {
    const r = verdicts
        .filter((v) => /^(job|step):/.test(v.key) && v.earlier >= LONG_SECONDS && v.last > 0)
        .map((v) => v.last / v.earlier);
    return r.length >= MIN_LONG_KEYS ? median(r) : null;
}

function readState(body) {
    try {
        return JSON.parse(STATE.exec(body ?? "")?.[1] ?? "null") ?? { keys: {} };
    } catch {
        return { keys: {} };
    }
}

const short = (range) => range?.replaceAll(/([0-9a-f]{10})[0-9a-f]+/g, "$1") ?? "-";

const struckText = (s) => {
    if (s.gone) return `no longer runs (run ${s.run})`;
    if (s.moved)
        return `still over its line in run ${s.run}, which did not slow as a whole: moved to the keys over the line`;
    return `back under in run ${s.run}: ${fmt(s.seconds)}`;
};

function alarmBody(workflow, kind, finding, state) {
    const slow = state.slowdown
        ? ` In run ${state.slowdown.run} the keys of 2 minutes or more took a median ${state.slowdown.factor} times their usual time, and a key listed here slowed no more than ${SHARED_SPREAD} times that; one still over its line in a run that did not slow as a whole moves to the keys over the line.`
        : "";
    const head =
        finding === "shared"
            ? `\`${workflow}\` ${kind} runs: keys slowed by a slowdown the whole run shares, not by a change.${slow} A queue key is time spent waiting for a runner. Look at runner contention or the runner class, not at the suspect merges.`
            : `\`${workflow}\` ${kind} runs: keys over their line (the budget, or 1.3 times their usual time and a minute slower, on the median of the last 5 runs). Suspects: master's first-parent merges in each key's range.`;
    const rows = Object.entries(state.keys).map(([key, e]) => {
        const where = e.struck ? struckText(e.struck) : `over since run ${e.since}`;
        const name = e.struck ? `~~\`${key}\`~~` : `\`${key}\``;
        return `| ${name} | ${fmt(e.earlier)} | ${fmt(e.recent)} | ${fmt(e.last)} | ${short(e.range)} | ${where} |`;
    });
    return [
        `<!-- ci-budgets-alarm ${JSON.stringify(state)} -->`,
        head,
        "",
        "Each run updates this list: a key back under its closing line in a run is struck with that run as evidence, and the issue closes itself when no key is left (tools/ci-budgets.mjs).",
        "",
        "| Key | Usual | Last 5 runs | Latest run | Suspects | State |",
        "| --- | --- | --- | --- | --- | --- |",
        ...rows,
    ].join("\n");
}

// ponytail: struck keys stay listed until the issue closes; past BODY_MAX the oldest struck ones are dropped
function fittedBody(workflow, kind, finding, state) {
    let body = alarmBody(workflow, kind, finding, state);
    const struck = Object.entries(state.keys)
        .filter(([, e]) => e.struck)
        .sort(([, a], [, b]) => a.struck.run - b.struck.run);
    while (body.length > BODY_MAX && struck.length) {
        delete state.keys[struck.shift()[0]];
        body = alarmBody(workflow, kind, finding, state);
    }
    return body;
}

// A key no run of its workflow and kind sampled in VANISHED_RUNS runs (or in the store's 30 days) is gone: its job or
// step was renamed or removed (#5176). Run and nx task keys never go.
function gone(key, lastSeen, workflow) {
    const [level, wf, job, ...step] = key.split(":");
    if (!Object.keys(lastSeen ?? {}).length || wf !== workflow || !["job", "step", "queue"].includes(level))
        return false;
    const seen =
        lastSeen[level === "job" ? key : `step:${wf}:${job}:${level === "queue" ? QUEUE_STEP : step.join(":")}`];
    return !seen || seen.runsSince >= VANISHED_RUNS;
}

// The alarming step: verdict under a job: or run: key, in the same run kind: one slowdown, listed once, as the step.
function alarmingStep(v, verdicts) {
    const [type, wf] = v.key.split(":");
    if (type !== "job" && type !== "run") return undefined;
    const prefix = type === "job" ? `step:${v.key.slice(4)}:` : `step:${wf}:`;
    return verdicts.find((s) => s.alarm && s.kind === v.kind && s.key.startsWith(prefix));
}

/**
 * Lists one run's alarms in its workflow's and kind's issues: a key the trend alarms on (trend()'s line) and over its
 * closing line in this run joins the issue of its finding, unless an open issue lists it already; a listed key under
 * its closing line in this run (clearOf) is struck with the run as evidence, and one that no longer runs is struck as
 * gone; an issue with no key left closes itself. A job or run whose step alarms too is the step's slowdown. A key is
 * the `shared` finding when it waited for a runner (queue), or when the run slowed as a whole (sharedSlowdown() at
 * least SHARED_RATIO) and the key no more than SHARED_SPREAD times the run; any other key is `code`, and a shared key
 * still alarming in a run that did not slow as a whole moves to `code`. Each issue is filed (or reopened when it
 * closed in the last 7 days, not as not planned or duplicate) with its first keys, its list rewritten every run, and
 * commented on when a key joins or leaves. An open per-key issue of the form filed before #9273 is closed as a
 * duplicate of the issue that now holds its workflow's and kind's keys (one labeled in-progress belongs to its
 * session and is left).
 * @param gh (path, init?) => parsed answer of GitHub's REST API for this repository
 * @param verdicts the run's verdicts: key, kind, recent, earlier, alarm, range and `last` (this run's seconds)
 * @param opts `{ run: { id, html_url? }, workflow, kind, file, lastSeen?, note? }`: lastSeen is the store's (strikes
 *   gone keys), note a prefix for the per-key issues' closing comments
 * @returns the actions taken, `{ action, number, finding?, added?, struck? }[]`
 */
export async function syncAlarms(gh, verdicts, opts) {
    const { workflow, kind, note = "" } = opts;
    const open = await gh(`/issues?state=open&labels=ci-budget&per_page=100`);
    const lists = Object.fromEntries(
        Object.keys(FINDINGS).map((f) => {
            const issue = open.find((i) => i.title === alarmTitle(workflow, kind, f));
            return [f, { issue, state: readState(issue?.body), added: [], struck: [] }];
        }),
    );
    const ctx = { ...opts, byKey: new Map(verdicts.map((v) => [v.key, v])), shared: sharedSlowdown(verdicts) };
    for (const [finding, list] of Object.entries(lists)) strikeListed(finding, list, ctx);
    addAlarms(lists, verdicts, ctx);
    const done = [];
    for (const [finding, list] of Object.entries(lists)) {
        const r = await writeList(gh, { ...opts, finding, list, open });
        if (r) done.push({ ...r, finding, added: list.added, struck: list.struck });
    }
    done.push(...(await foldPerKey(gh, open, lists, { ...opts, note })));
    return done;
}

const clearNow = (file, v) => v?.last != null && clearOf(file, v.key, v.last, v.earlier);
const numbers = (v) => ({ earlier: v.earlier, recent: v.recent, last: v.last ?? null });
const ticked = (keys) => keys.map((k) => `\`${k}\``).join(", ");

// Strikes each listed key back under its closing line in this run, gone, or (a shared one) still alarming in a run that
// did not slow as a whole; updates the numbers of the rest.
function strikeListed(finding, list, { run, file, workflow, lastSeen, byKey, shared }) {
    const calm = shared != null && shared < SHARED_RATIO;
    for (const [key, e] of Object.entries(list.state.keys).filter(([, x]) => !x.struck)) {
        const v = byKey.get(key);
        if (clearNow(file, v)) e.struck = { run: run.id, seconds: v.last };
        else if (!v && gone(key, lastSeen, workflow)) e.struck = { run: run.id, gone: true };
        else if (finding === "shared" && calm && v?.alarm && !key.startsWith("queue:"))
            e.struck = { run: run.id, moved: true };
        else if (v) Object.assign(e, numbers(v));
        if (e.struck) list.struck.push(key);
    }
}

// Lists each key the trend alarms on, over its closing line in this run and on no list yet, under its finding.
function addAlarms(lists, verdicts, { run, file, shared }) {
    const listed = (key) => Object.values(lists).some((l) => l.state.keys[key] && !l.state.keys[key].struck);
    const findingOf = (v) =>
        v.key.startsWith("queue:") || (shared >= SHARED_RATIO && v.last / v.earlier <= SHARED_SPREAD * shared)
            ? "shared"
            : "code";
    for (const v of verdicts) {
        if (!v.alarm || clearNow(file, v) || listed(v.key) || alarmingStep(v, verdicts)) continue;
        const list = lists[findingOf(v)];
        list.state.keys[v.key] = { ...numbers(v), range: v.range, since: run.id };
        list.added.push(v.key);
    }
    if (shared >= SHARED_RATIO && lists.shared.added.length)
        lists.shared.state.slowdown = { run: run.id, factor: +shared.toFixed(2) };
}

async function writeList(gh, { run, workflow, kind, file, finding, list }) {
    const runRef = run.html_url ? `[run ${run.id}](${run.html_url})` : `run ${run.id}`;
    const body = fittedBody(workflow, kind, finding, list.state);
    const left = Object.values(list.state.keys).filter((e) => !e.struck).length;
    const comment = (number, text) =>
        gh(`/issues/${number}/comments`, { method: "POST", body: JSON.stringify({ body: text }) });
    if (!list.issue) {
        if (!list.added.length) return null;
        const title = alarmTitle(workflow, kind, finding);
        const since = Date.now() - REOPEN_DAYS * 86_400_000;
        const closed = await gh(`/issues?state=closed&labels=ci-budget&per_page=100`);
        const old = closed.find(
            (i) => i.title === title && Date.parse(i.closed_at) >= since && !SETTLED.has(i.state_reason),
        );
        if (old) {
            await gh(`/issues/${old.number}`, { method: "PATCH", body: JSON.stringify({ state: "open", body }) });
            await comment(old.number, `${runRef}: over the line again: ${ticked(list.added)}.`);
            list.issue = old;
            return { action: "reopen", number: old.number };
        }
        const owner = file.defaults?.owner ?? "pipeline";
        const labels = [...FINDINGS[finding].labels, ...(owner === "pipeline" ? [] : [owner])];
        const made = await gh(`/issues`, { method: "POST", body: JSON.stringify({ title, body, labels }) });
        list.issue = made;
        return { action: "file", number: made?.number };
    }
    const number = list.issue.number;
    const patch = left ? { body } : { body, state: "closed" };
    await gh(`/issues/${number}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!list.added.length && !list.struck.length) return { action: "update", number };
    const lines = [
        list.added.length && `- over the line: ${ticked(list.added)}`,
        ...list.struck.map((k) => `- \`${k}\`: ${struckText(list.state.keys[k].struck)}`),
        !left && "\nNo key is left over its line: closing.",
    ].filter(Boolean);
    await comment(number, [`${runRef}:`, ...lines].join("\n"));
    return { action: left ? "update" : "close", number };
}

async function foldPerKey(gh, open, lists, { run, workflow, kind, note }) {
    const done = [];
    for (const issue of open) {
        const [, key, k] = PER_KEY_TITLE.exec(issue.title) ?? [];
        const labels = (issue.labels ?? []).map((l) => l.name ?? l);
        if (!key || k !== kind || key.split(":")[1] !== workflow || labels.includes("in-progress")) continue;
        const home =
            Object.values(lists).find((l) => l.issue && l.state.keys[key] && !l.state.keys[key].struck) ??
            Object.values(lists).find((l) => l.issue && Object.values(l.state.keys).some((e) => !e.struck));
        const text = home
            ? `${note}Folded into #${home.issue.number}, which lists every key of ${workflow}'s ${kind} runs over its line and is updated by each run (#9273).`
            : `${note}Closing: no key of ${workflow}'s ${kind} runs is over its line in run ${run.id} (#9273).`;
        await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: text }) });
        const reason = home ? "duplicate" : "completed";
        await gh(`/issues/${issue.number}`, {
            method: "PATCH",
            body: JSON.stringify({ state: "closed", state_reason: reason }),
        });
        done.push({ action: "fold", number: issue.number, key, into: home?.issue.number ?? null });
    }
    return done;
}

// ---------- the command line ----------

async function failOpen(what, fn) {
    try {
        return await fn();
    } catch (err) {
        console.log(`::warning title=ci-budgets::${what} failed: ${err.message}`);
        return undefined;
    }
}

// A stored row's key, as the Worker's keyOf makes it.
function storeKey(s) {
    if (s.task) return `task:${s.task}`;
    return s.step ? `step:${s.workflow}:${s.job}:${s.step}` : `job:${s.workflow}:${s.job}`;
}

/**
 * Master's medians, from the store's per-key answer, under each row's own key. The store keys a row by its
 * stored identity (the Worker's keyOf), so a queue row is its job's `(queue)` step and the run row is job `(run)`.
 * @param run the run (`path`)
 * @param rows the run's rows
 * @param byStoreKey seconds by store key (GET /v1/durations/medians)
 * @returns seconds by row key
 */
export function mediansByKey(run, rows, byStoreKey) {
    return Object.fromEntries(
        storeRows(run, rows).flatMap((s, i) => {
            const key = storeKey(s);
            return byStoreKey[key] === undefined ? [] : [[rows[i].key, byStoreKey[key]]];
        }),
    );
}

// The baseline a run is compared with: master's own push of ci.yml (a build, stored as kind master) for ci.yml,
// the full run (kind full) for the workflows it runs.
async function storeMedians(run, rows) {
    const cfg = config();
    if (!cfg) return {};
    const workflow = basename(run.path ?? "ci.yml");
    const q = new URLSearchParams({ workflows: workflow, kind: workflow === "ci.yml" ? "master" : "full", n: "10" });
    const r = await call(cfg, "GET", `/v1/durations/medians?${q}`, undefined, 10_000);
    if (!r.ok) throw new Error(`GET /v1/durations/medians: ${r.why}`);
    return mediansByKey(run, rows, r.data ?? {});
}

/**
 * The store's answer to POST /v1/durations (per store key within the run's kind) as alarm issues: each verdict under
 * its row's own key with this run's seconds as `last`, listed by syncAlarms().
 * @param gh (path, init?) => parsed answer of GitHub's REST API for this repository
 * @param run the run (`id`, `path`, `html_url`)
 * @param rows the run's rows
 * @param stored the answer: `kind`, `trend` (`{ key, kind, recent, earlier, alarm, range }[]`) and `lastSeen`
 * @param file the parsed ci-budgets.json
 * @returns syncAlarms()'s actions
 */
export async function applyTrend(gh, run, rows, stored, file) {
    const rowOf = new Map(storeRows(run, rows).map((s, i) => [storeKey(s), rows[i]]));
    const verdicts = (stored.trend ?? []).map((v) => {
        const row = rowOf.get(v.key);
        return { ...v, key: row?.key ?? v.key, last: row?.seconds };
    });
    const workflow = basename(run.path ?? "ci.yml");
    return syncAlarms(gh, verdicts, { run, workflow, kind: stored.kind, file, lastSeen: stored.lastSeen });
}

// A key with no sample in this many runs of its workflow and kind is gone (its job or step was renamed or removed,
// #5176). 10 full runs are two to three days: longer than a red run or two that skips a job's later steps, short
// enough that a dead alarm does not sit open for a week. A key that comes back is judged and listed again.
export const VANISHED_RUNS = 10;

// The store sets the rows' kind from the job's OIDC token (the timings job needs id-token: write), and judges
// each posted key's trend against the budgets sent with the rows.
async function sendRows(run, rows, evals) {
    const cfg = config();
    if (!cfg) return console.log("RESULTS_URL is unset or no credential: rows not sent");
    const sent = storeRows(run, rows);
    const budgets = Object.fromEntries(
        sent.flatMap((s, i) => (evals[i].budget == null ? [] : [[storeKey(s), evals[i].budget]])),
    );
    const r = await call(cfg, "POST", "/v1/durations", { rows: sent, budgets }, 10_000);
    if (!r.ok) throw new Error(`POST /v1/durations: ${r.why}`);
    console.log(`sent ${r.data?.stored ?? 0} duration rows (kind ${r.data?.kind})`);
    return r.data;
}

// The run kinds whose trend alarms file issues: master's own runs, its build-only push of ci.yml (kind master) and
// the full run and its lanes (kind full), each judged against its own kind. A pull request only gets its comment.
const ISSUE_KINDS = new Set(["master", "full"]);

const KIND_OF_EVENT = { pull_request: "pr", push: "master", workflow_dispatch: "dispatch" };

async function report(v) {
    const file = loadBudgets();
    const gh = repoApi();
    const run = await gh(`/actions/runs/${v.run}`);
    const jobs = [];
    for (let page = 1; ; page++) {
        const got = await gh(`/actions/runs/${v.run}/jobs?filter=latest&per_page=100&page=${page}`);
        jobs.push(...got.jobs);
        if (jobs.length >= got.total_count || !got.jobs.length) break;
    }
    const kind = v.kind ?? KIND_OF_EVENT[run.event] ?? run.event;
    const rows = [
        ...rowsFromJobs(run, jobs, kind),
        ...(v["nx-profile"] ?? []).filter(existsSync).flatMap((p) => taskRows(JSON.parse(readFileSync(p, "utf8")))),
    ];
    const medians = v.medians
        ? JSON.parse(readFileSync(v.medians, "utf8"))
        : ((await failOpen("reading master's medians", () => storeMedians(run, rows))) ?? {});
    const evals = evaluate(rows, file, medians);
    if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## CI time\n\n${summaryTable(evals)}\n`);
    for (const e of evals.filter((x) => x.over))
        console.log(`::warning title=Over budget::${e.key} took ${fmt(e.seconds)}, budget ${fmt(e.budget)}`);
    const body = prComment(evals);
    const pr = v.pr ?? run.pull_requests?.[0]?.number;
    if (body && pr) await failOpen("the pull request comment", () => upsertComment(gh, pr, body));
    const stored = await failOpen("sending the rows", () => sendRows(run, rows, evals));
    if (ISSUE_KINDS.has(stored?.kind)) await alarmIssues(gh, run, rows, stored, file);
    return 0;
}

async function alarmIssues(gh, run, rows, stored, file) {
    // ponytail: two master timings jobs finishing together can both file one list's issue; a lock if seen
    const done = await failOpen("the trend alarm issues", () => applyTrend(gh, run, rows, stored, file));
    for (const a of done ?? []) console.log(`${a.action} #${a.number}: ${JSON.stringify(a)}`);
}

async function trendCommand(v) {
    const file = loadBudgets();
    const verdicts = trend(JSON.parse(readFileSync(v.history, "utf8")), file);
    for (const x of verdicts.filter((y) => y.alarm))
        console.log(`alarm: ${x.key} (${x.kind}) ${fmt(x.earlier)} -> ${fmt(x.recent)}`);
    return 0;
}

async function main(argv) {
    const { values: v, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            run: { type: "string" },
            kind: { type: "string" },
            pr: { type: "string" },
            medians: { type: "string" },
            "nx-profile": { type: "string", multiple: true },
            history: { type: "string" },
        },
    });
    const cmd = positionals[0];
    if (cmd === "lint") return await lint();
    // report and trend warn, never fail a run
    if (cmd === "report" && v.run) return (await failOpen("report", () => report(v))) ?? 0;
    if (cmd === "trend" && v.history) return (await failOpen("trend", () => trendCommand(v))) ?? 0;
    console.error("usage: ci-budgets.mjs lint | report --run <id> | trend --history <rows.json>");
    return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
