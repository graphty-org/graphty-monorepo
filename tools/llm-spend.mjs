#!/usr/bin/env node
// The month's spend on release.yml's LLM regression lane, checked before each paid run: about $0.94 a run, a
// warning (budget key spend:llm) at $60 in a calendar month, the owner's ceiling (2026-10-12). It never stops the
// run: the lane runs in every release test of a candidate (owner, 2026-10-29), and the warning is for the owner.
//
// Until the results store exists (design/ci/channels-pipeline.md section 4), the month's runs are read from
// release.yml's own runs through the Actions API; the store's query replaces fetchPaid.
//
//   GH_TOKEN=... GITHUB_REPOSITORY=o/r [GITHUB_RUN_ID=n] node tools/llm-spend.mjs
//   node --test tools/llm-spend.test.mjs
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const STEP = "LLM regression tests";
const COST_PER_RUN = 0.94;
const MONTHLY_CEILING = 60;

// Conclusions of a test step that sent paid calls: a failed or cancelled run cost money too.
export const PAID = ["success", "failure", "cancelled"];

/**
 * Completion times of the LLM test steps in one run's jobs that sent paid calls.
 * @param jobs the Actions API's jobs
 * @returns ISO times
 */
export function paidSteps(jobs) {
    return jobs.flatMap((job) =>
        (job.steps ?? []).filter((s) => s.name === STEP && PAID.includes(s.conclusion)).map((s) => s.completed_at),
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
 * @returns ISO times
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
    const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: ownRun } = process.env;
    const month = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(Date.parse(`${month}-01`) - DAY_MS).toISOString().slice(0, 10);
    await fetchPaid(repo, monthStart, ownRun).then(
        (all) => {
            const count = all.filter((t) => t?.startsWith(month)).length + 1;
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
