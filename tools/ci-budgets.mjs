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
//   node tools/ci-budgets.mjs trend --history <rows.json> [--apply]
//       the trend alarms over stored rows; with --apply, one issue per key and run kind is filed,
//       commented on, or closed once the key is back under both lines.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { call, config } from "./results/client.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const COMMENT_MARKER = "<!-- ci-budgets -->";
const ISSUE_LABELS = ["bug", "ci-budget", "priority:high", "effort:medium"];

// ---------- the budgets file ----------

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
    const file = JSON.parse(readFileSync(join(root, "ci-budgets.json"), "utf8"));
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
    return { recent, earlier, alarm: overBudget || overTrend, range, runs: recentRows };
}

/**
 * Trend verdicts per key and run kind: `recent` = median of the last 5 runs, `earlier` = median of
 * the 10 before; an alarm when recent is over the budget, or over 1.3 x earlier and 60 s slower.
 * @param history stored rows { key, run_kind, seconds, sha, recorded_at, outcome }
 * @param file the parsed ci-budgets.json
 * @returns key, kind, recent, earlier, alarm, range, runs per key and kind
 */
export function trend(history, file) {
    return [...groups(history).entries()]
        .filter(([, rows]) => rows.length >= 5)
        .map(([k, rows]) => ({ key: k.split("\u0000")[0], kind: k.split("\u0000")[1], ...judge(file, rows) }));
}

export const issuePrefix = (v) => `CI budget: ${v.key} (${v.kind}) `;

function issueBody(v) {
    const runs = v.runs.map((r) => `- ${r.recorded_at} ${r.sha.slice(0, 10)}: ${fmt(r.seconds)}`).join("\n");
    const range = v.range
        ? `Suspects: master's first-parent merges in ${v.range}.`
        : "Suspects: no single step over the line.";
    return `\`${v.key}\` on ${v.kind} runs: median of the last 5 runs ${fmt(v.recent)}, of the 10 before ${fmt(v.earlier)}.\n\n${range}\n\nLast 5 runs:\n${runs}`;
}

/**
 * File, comment on or close one issue per key and run kind.
 * @param gh (path, init?) => parsed answer of GitHub's REST API for this repository
 * @param verdicts trend()'s answer
 * @param owner the owner label of the alarm (`defaults.owner`)
 * @returns the actions taken, `{ action, key, kind, number? }[]`
 */
export async function syncIssues(gh, verdicts, owner = "pipeline") {
    const open = await gh(`/issues?state=open&labels=ci-budget&per_page=100`);
    const done = [];
    for (const v of verdicts) {
        const issue = open.find((i) => i.title.startsWith(issuePrefix(v)));
        if (v.alarm && issue) {
            await gh(`/issues/${issue.number}/comments`, {
                method: "POST",
                body: JSON.stringify({ body: issueBody(v) }),
            });
            done.push({ action: "comment", key: v.key, kind: v.kind, number: issue.number });
        } else if (v.alarm) {
            const title = `${issuePrefix(v)}${fmt(v.earlier)} -> ${fmt(v.recent)}`;
            const labels = [...ISSUE_LABELS, ...(owner === "pipeline" ? [] : [owner])];
            const made = await gh(`/issues`, {
                method: "POST",
                body: JSON.stringify({ title, body: issueBody(v), labels }),
            });
            done.push({ action: "file", key: v.key, kind: v.kind, number: made?.number });
        } else if (issue) {
            await gh(`/issues/${issue.number}/comments`, {
                method: "POST",
                body: JSON.stringify({ body: `Back under both lines: last 5 runs ${fmt(v.recent)}.` }),
            });
            await gh(`/issues/${issue.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
            done.push({ action: "close", key: v.key, kind: v.kind, number: issue.number });
        }
    }
    return done;
}

// ---------- the command line ----------

function githubApi(repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN) {
    return async (path, init = {}) => {
        const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
            ...init,
            headers: {
                authorization: `Bearer ${token}`,
                accept: "application/vnd.github+json",
                "content-type": "application/json",
            },
        });
        if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
        return res.status === 204 ? null : res.json();
    };
}

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

// Master's own runs are kind full in the store (the Worker sets it from master's ci.yml and release.yml).
async function storeMedians(run, rows) {
    const cfg = config();
    if (!cfg) return {};
    const q = new URLSearchParams({ workflows: basename(run.path ?? "ci.yml"), kind: "full", n: "10" });
    const r = await call(cfg, "GET", `/v1/durations/medians?${q}`, undefined, 10_000);
    if (!r.ok) throw new Error(`GET /v1/durations/medians: ${r.why}`);
    return mediansByKey(run, rows, r.data ?? {});
}

// The store sets the rows' kind from the job's OIDC token (the timings job needs id-token: write).
async function sendRows(run, rows) {
    const cfg = config();
    if (!cfg) return console.log("RESULTS_URL is unset or no credential: rows not sent");
    const r = await call(cfg, "POST", "/v1/durations", { rows: storeRows(run, rows) }, 10_000);
    if (!r.ok) throw new Error(`POST /v1/durations: ${r.why}`);
    console.log(`sent ${r.data?.stored ?? 0} duration rows (kind ${r.data?.kind})`);
}

const KIND_OF_EVENT = { pull_request: "pr", push: "master", workflow_dispatch: "dispatch" };

async function report(v) {
    const file = JSON.parse(readFileSync(join(ROOT, "ci-budgets.json"), "utf8"));
    const gh = githubApi();
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
    await failOpen("sending the rows", () => sendRows(run, rows));
    return 0;
}

async function trendCommand(v) {
    const file = JSON.parse(readFileSync(join(ROOT, "ci-budgets.json"), "utf8"));
    const verdicts = trend(JSON.parse(readFileSync(v.history, "utf8")), file);
    for (const x of verdicts.filter((y) => y.alarm))
        console.log(`alarm: ${x.key} (${x.kind}) ${fmt(x.earlier)} -> ${fmt(x.recent)}`);
    if (v.apply)
        for (const a of await syncIssues(githubApi(), verdicts, file.defaults?.owner))
            console.log(`${a.action} #${a.number}: ${a.key} (${a.kind})`);
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
            apply: { type: "boolean" },
        },
    });
    const cmd = positionals[0];
    if (cmd === "lint") return await lint();
    // report and trend warn, never fail a run
    if (cmd === "report" && v.run) return (await failOpen("report", () => report(v))) ?? 0;
    if (cmd === "trend" && v.history) return (await failOpen("trend", () => trendCommand(v))) ?? 0;
    console.error("usage: ci-budgets.mjs lint | report --run <id> | trend --history <rows.json> [--apply]");
    return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
