#!/usr/bin/env node
// The month's spend on the paid LLM regression tests, checked before each paid run of release.yml's LLM lane: about
// $0.94 a run, a warning (budget key spend:llm) at $60 in a calendar month, the owner's ceiling (2026-10-12). It
// never stops the run: the lane runs in every release test of a candidate (owner, 2026-10-29), and the warning is
// for the owner.
//
// Counted: release.yml's "LLM regression tests" steps, and bisect.yml's "Run the failing files" steps in the points
// of a bisect of the llm lane (run name "Bisect (llm lane)"), each a passed, failed or cancelled step. A run whose
// jobs cannot be read is counted as one paid run and named in a warning, so a GitHub outage never hides spend.
// Bisects before the run name carried the lane (October 2026: run 40492117633, one point) are not counted.
//
// Until the results store exists (design/ci/channels-pipeline.md section 4), the month's runs are read through the
// Actions API; the store's query replaces fetchPaid.
//
//   GH_TOKEN=... GITHUB_REPOSITORY=o/r [GITHUB_RUN_ID=n] node tools/llm-spend.mjs
//   node --test tools/llm-spend.test.mjs
import { execFile } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const STEP = "LLM regression tests";
export const BISECT_STEP = "Run the failing files";
const COST_PER_RUN = 0.94;
const MONTHLY_CEILING = 60;

// Conclusions of a test step that sent paid calls: a failed or cancelled run cost money too.
export const PAID = ["success", "failure", "cancelled"];

/**
 * Completion times of the paid test steps in one run's jobs.
 * @param jobs the Actions API's jobs
 * @param step the paid step's name
 * @returns ISO times
 */
export function paidSteps(jobs, step = STEP) {
    return jobs.flatMap((job) =>
        (job.steps ?? []).filter((s) => s.name === step && PAID.includes(s.conclusion)).map((s) => s.completed_at),
    );
}

/**
 * The spend:llm warning, or null under the ceiling.
 * @param count runs this month, this one included
 * @param month YYYY-MM
 * @returns the warning
 */
export function spendWarning(count, month) {
    const spend = count * COST_PER_RUN;
    if (spend < MONTHLY_CEILING) return null;
    return `spend:llm: ${count} LLM regression runs in ${month} is about $${spend.toFixed(2)}, at or over the $${MONTHLY_CEILING} monthly ceiling`;
}

/**
 * Whether a failed request is GitHub's own (5xx), worth asking again.
 * @param e the error
 * @returns true for a 5xx
 */
const serverError = (e) => e.status >= 500;

/** Tries of one request GitHub answers 5xx, and the waits between them. */
export const RETRY = { tries: 3, waitMs: 2000 };

/**
 * `get(path)`, again after a 5xx up to RETRY.tries times in all.
 * @param get resolves to the JSON body, or rejects with an error whose `status` is the HTTP status
 * @param path the API path
 * @returns the body
 */
export async function getRetried(get, path) {
    for (let i = 1; ; i++) {
        try {
            return await get(path);
        } catch (e) {
            if (!serverError(e) || i >= RETRY.tries) throw e;
            await sleep(RETRY.waitMs * i);
        }
    }
}

// GitHub answers 502 to some pages of a large run's jobs every time (a page holding one particular job: on run
// 40476709992, attempt 2, pages of 100, 50 and 25 fail and pages of 10 pass, 2026-10-29), so such a page is read again
// as smaller pages over the same jobs. Each size divides the one before it.
const SIZES = [100, 50, 10, 1];

/**
 * One page of `size` jobs, read as smaller pages when GitHub keeps failing it.
 * @param get as for getRetried
 * @param path the jobs path, with its query
 * @param size jobs a page
 * @param page the page, from 1
 * @returns the page's total_count and jobs
 */
async function jobsPage(get, path, size, page) {
    try {
        return await getRetried(get, `${path}&per_page=${size}&page=${page}`);
    } catch (e) {
        const smaller = SIZES[SIZES.indexOf(size) + 1];
        if (!serverError(e) || !smaller) throw e;
        const n = size / smaller;
        const out = { total_count: 0, jobs: [] };
        for (let p = (page - 1) * n + 1; p <= page * n; p++) {
            const r = await jobsPage(get, path, smaller, p);
            out.total_count = r.total_count;
            out.jobs.push(...r.jobs);
            if (r.jobs.length < smaller) break;
        }
        return out;
    }
}

/**
 * Every job of every attempt of a run.
 * @param get as for getRetried
 * @param repo owner/name
 * @param id the run id
 * @returns the jobs
 */
export async function runJobs(get, repo, id) {
    const path = `repos/${repo}/actions/runs/${id}/jobs?filter=all`;
    const jobs = [];
    for (let page = 1; page <= 50; page++) {
        const r = await jobsPage(get, path, SIZES[0], page);
        jobs.push(...r.jobs);
        if (jobs.length >= r.total_count || r.jobs.length < SIZES[0]) break;
    }
    return jobs;
}

/**
 * The paid steps of some runs, 8 runs at a time; a run whose jobs cannot be read counts as one paid step at its
 * last update and is named in `unread`.
 * @param get as for getRetried
 * @param repo owner/name
 * @param runs [{ id, updated_at }]
 * @param step the paid step's name
 * @returns the paid steps' ISO times (`paid`) and the run ids not read (`unread`)
 */
export async function countPaid(get, repo, runs, step) {
    const queue = [...runs];
    const paid = [];
    const unread = [];
    const worker = async () => {
        for (let run = queue.pop(); run !== undefined; run = queue.pop()) {
            try {
                paid.push(...paidSteps(await runJobs(get, repo, run.id), step));
            } catch {
                paid.push(run.updated_at);
                unread.push(run.id);
            }
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return { paid, unread };
}

const DAY_MS = 86_400_000;

const exec = promisify(execFile);

/**
 * The HTTP status in gh's error output ("gh: Server Error (HTTP 502)"), or NaN.
 * @param text gh's stderr
 * @returns the status
 */
export const httpStatus = (text) => Number(/\(HTTP (\d{3})\)/.exec(text)?.[1]);

/**
 * `gh api <path>` as JSON; a failure carries the HTTP status gh prints.
 * @param path the API path
 * @returns the body
 */
async function ghGet(path) {
    try {
        const { stdout } = await exec("gh", ["api", path], { maxBuffer: 64 << 20 });
        return JSON.parse(stdout);
    } catch (e) {
        const text = String(e.stderr || e.message);
        throw Object.assign(new Error(text.trim()), { status: httpStatus(text) });
    }
}

/**
 * Runs of a workflow created since `since`, every page.
 * @param repo owner/name
 * @param workflow the workflow file
 * @param since YYYY-MM-DD
 * @returns the runs
 */
async function listRuns(repo, workflow, since) {
    const runs = [];
    for (let page = 1; page <= 10; page++) {
        const r = await getRetried(
            ghGet,
            `repos/${repo}/actions/workflows/${workflow}/runs?created=>=${since}&per_page=100&page=${page}`,
        );
        runs.push(...r.workflow_runs);
        if (r.workflow_runs.length < 100) break;
    }
    return runs;
}

/**
 * Paid steps of release.yml and llm-lane bisect.yml runs created since `since` (a day early, for runs that crossed
 * midnight).
 * @param repo owner/name
 * @param since YYYY-MM-DD
 * @param ownRun this run's id, left out
 * @returns the paid steps' ISO times (`paid`) and the run ids not read (`unread`)
 */
async function fetchPaid(repo, since, ownRun) {
    // ponytail: a release run that reached the LLM lane ran CI first, so only runs of 15 minutes or more are read job
    // by job. The results store's LLM-run query replaces this list.
    const long = (r) => Date.parse(r.updated_at) - Date.parse(r.run_started_at) >= 900_000;
    const release = (await listRuns(repo, "release.yml", since)).filter(
        (r) => long(r) && String(r.id) !== String(ownRun),
    );
    const bisect = (await listRuns(repo, "bisect.yml", since)).filter((r) => /\bllm lane\b/.test(r.display_title));
    const a = await countPaid(ghGet, repo, release, STEP);
    const b = await countPaid(ghGet, repo, bisect, BISECT_STEP);
    return { paid: [...a.paid, ...b.paid], unread: [...a.unread, ...b.unread] };
}

/** Prints the month's count and spend, as a warning at or over the ceiling. Never fails the job. */
async function main() {
    const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: ownRun } = process.env;
    const month = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(Date.parse(`${month}-01`) - DAY_MS).toISOString().slice(0, 10);
    await fetchPaid(repo, monthStart, ownRun).then(
        ({ paid, unread }) => {
            if (unread.length)
                console.log(
                    `::warning::spend:llm: could not read the jobs of run(s) ${unread.join(", ")}; each is counted as one paid run`,
                );
            const count = paid.filter((t) => t?.startsWith(month)).length + 1;
            const warning = spendWarning(count, month);
            const spend = (count * COST_PER_RUN).toFixed(2);
            console.log(
                warning
                    ? `::warning::${warning}`
                    : `::notice::LLM regression run ${count} of ${month}, about $${spend}`,
            );
        },
        (error) => console.log(`::warning::spend:llm not checked: ${error.message}`),
    );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
