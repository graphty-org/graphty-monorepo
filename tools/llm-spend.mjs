#!/usr/bin/env node
// The month's spend on release.yml's LLM regression lane, checked before each paid run: each run's logged cost (the
// "LLM regression cost: <usd> USD" step after its tests), or about $0.94 for a run that logged none, and a
// warning (budget key spend:llm) at $60 in a calendar month, the owner's ceiling (2026-10-12). It never stops the
// run: the lane runs in every release test of a candidate (owner, 2026-10-29), and the warning is for the owner.
//
// Until the results store exists (design/ci/channels-pipeline.md section 4), the month's runs are read from
// release.yml's own runs through the Actions API; the store's query replaces fetchPaid.
//
//   GH_TOKEN=... GITHUB_REPOSITORY=o/r [GITHUB_RUN_ID=n] node tools/llm-spend.mjs
//   node tools/llm-spend.mjs cost <log>   prints the run's cost in USD from its vitest log, or nothing
//   node --test tools/llm-spend.test.mjs
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const STEP = "LLM regression tests";
/** The step after the tests whose name carries the run's cost (release.yml). */
export const COST_STEP = /^LLM regression cost: (\d+(?:\.\d+)?) USD$/;
/** A run that logged no cost: the measured average before caching and Flex (tmp/ai-cost/report.md, 2026-10-12). */
export const COST_PER_RUN = 0.94;
const MONTHLY_CEILING = 60;

// Conclusions of a test step that sent paid calls: a failed or cancelled run cost money too.
export const PAID = ["success", "failure", "cancelled"];

/**
 * A run's cost from its vitest log: the sum of the costs on its `[llm-regression] API calls` lines (one per test
 * file), or null when no line has one (a provider with no price in the harness, or an older harness).
 * @param log the log's text
 * @returns USD, or null
 */
export function logCost(log) {
    const costs = [...log.matchAll(/\[llm-regression\] API calls: \d+[^\n]*?, cost \$(\d+(?:\.\d+)?)/g)];
    return costs.length ? costs.reduce((sum, m) => sum + Number(m[1]), 0) : null;
}

/**
 * The LLM test steps in one run's jobs that sent paid calls, each with its job's logged cost or the flat estimate.
 * @param jobs the Actions API's jobs
 * @returns completion time and USD of each
 */
export function paidSteps(jobs) {
    return jobs.flatMap((job) => {
        const logged = (job.steps ?? []).map((s) => COST_STEP.exec(s.name)?.[1]).find(Boolean);
        return (job.steps ?? [])
            .filter((s) => s.name === STEP && PAID.includes(s.conclusion))
            .map((s) => ({ at: s.completed_at, usd: logged === undefined ? COST_PER_RUN : Number(logged) }));
    });
}

/**
 * The spend:llm warning, or null under the ceiling.
 * @param spend USD this month, this run's estimate included
 * @param count runs this month, this one included
 * @param month YYYY-MM
 * @returns the warning
 */
export function spendWarning(spend, count, month) {
    if (spend < MONTHLY_CEILING) return null;
    return `spend:llm: ${count} LLM regression runs in ${month} is about $${spend.toFixed(2)}, at or over the $${MONTHLY_CEILING} monthly ceiling`;
}

const DAY_MS = 86_400_000;

const run = promisify(execFile);

/**
 * One JSON value per line of a paginated `gh api` call (older gh has no --slurp).
 * @param path the API path
 * @param jq picks the values
 * @returns the values
 */
async function gh(path, jq) {
    const { stdout } = await run("gh", ["api", "--paginate", path, "--jq", `${jq} | tojson`], { maxBuffer: 64 << 20 });
    return stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

/**
 * Paid LLM steps of release.yml runs created since `since` (a day early, for runs that crossed midnight).
 * @param repo owner/name
 * @param since YYYY-MM-DD
 * @param ownRun this run's id, left out
 * @returns completion time and USD of each
 */
async function fetchPaid(repo, since, ownRun) {
    // ponytail: a run that reached the LLM lane ran CI first, so only runs of 15 minutes or more are read job by
    // job, 8 at a time. The results store's LLM-run query replaces this list.
    const long = "select((.updated_at | fromdate) - (.run_started_at | fromdate) >= 900) | .id";
    const ids = await gh(
        `repos/${repo}/actions/workflows/release.yml/runs?created=>=${since}&per_page=100`,
        `.workflow_runs[] | ${long}`,
    );
    const queue = ids.filter((id) => String(id) !== String(ownRun));
    const paid = [];
    const worker = async () => {
        for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
            paid.push(
                ...paidSteps(await gh(`repos/${repo}/actions/runs/${id}/jobs?filter=all&per_page=100`, ".jobs[]")),
            );
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return paid;
}

/** Prints the month's count and spend, as a warning at or over the ceiling. Never fails the job. */
async function main() {
    if (process.argv[2] === "cost") {
        const usd = logCost(readFileSync(process.argv[3], "utf8"));
        if (usd !== null) console.log(usd.toFixed(4));
        return;
    }

    const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: ownRun } = process.env;
    const month = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(Date.parse(`${month}-01`) - DAY_MS).toISOString().slice(0, 10);
    await fetchPaid(repo, monthStart, ownRun).then(
        (all) => {
            const runs = all.filter((r) => r.at?.startsWith(month));
            // this run is not paid yet: estimated at the month's mean, or the flat estimate in a month with none
            const before = runs.reduce((sum, r) => sum + r.usd, 0);
            const count = runs.length + 1;
            const total = before + (runs.length ? before / runs.length : COST_PER_RUN);
            const warning = spendWarning(total, count, month);
            const spend = total.toFixed(2);
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
