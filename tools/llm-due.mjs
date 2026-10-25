#!/usr/bin/env node
// Whether release.yml's LLM regression lane is due on this run: once per UTC day, on the first run whose
// "LLM regression tests" step passes, and on every run a person dispatched (TRIGGER=workflow_dispatch with
// any MODE but restart). Scheduled attempts (TRIGGER=schedule) and restarts -- tools/release-due.mjs dispatches
// them as workflow_dispatch with MODE=restart, older ones arrive as workflow_run -- skip once that step passed
// today.
// When it is due it also checks the month's spend: about $0.94 a run, a warning (budget key spend:llm)
// at $60 in a calendar month, the owner's ceiling (2026-10-12).
//
// Until the results store exists (design/ci/channels-pipeline.md section 4), "an LLM run today" is read
// from release.yml's own runs through the Actions API; the store's query replaces fetchPasses.
//
//   TRIGGER=schedule MODE=full GH_TOKEN=... GITHUB_REPOSITORY=o/r [GITHUB_RUN_ID=n] node tools/llm-due.mjs
//   prints due=true|false (and appends it to $GITHUB_OUTPUT when set)
//   node --test tools/llm-due.test.mjs
import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const STEP = "LLM regression tests";
const COST_PER_RUN = 0.94;
const MONTHLY_CEILING = 60;

// Conclusions of a test step that sent paid calls: a failed or cancelled run cost money too.
export const PAID = ["success", "failure", "cancelled"];

/**
 * Completion times of LLM test steps in one run's jobs that ended with one of `conclusions`.
 * @param jobs the Actions API's jobs
 * @param conclusions the step conclusions counted (passed only, by default)
 * @returns ISO times
 */
export function llmPasses(jobs, conclusions = ["success"]) {
    return jobs.flatMap((job) =>
        (job.steps ?? [])
            .filter((s) => s.name === STEP && conclusions.includes(s.conclusion))
            .map((s) => s.completed_at),
    );
}

/**
 * Whether a person dispatched the run: a workflow_dispatch that is not a restart (release-due.mjs dispatches
 * restarts with mode=restart).
 * @param trigger the run's TRIGGER (workflow_dispatch, schedule, workflow_run)
 * @param mode the run's MODE (full, restart, shadow, legacy)
 * @returns whether it is a person's dispatch
 */
export function byPerson(trigger, mode) {
    return trigger === "workflow_dispatch" && mode !== "restart";
}

/**
 * A person's dispatch always runs; anything else runs only when no LLM step passed on `day`.
 * @param input the run and the day's passes
 * @param input.trigger the run's TRIGGER (workflow_dispatch, schedule, workflow_run)
 * @param input.mode the run's MODE (full, restart, shadow, legacy)
 * @param input.passes ISO times of passed LLM steps
 * @param input.day YYYY-MM-DD (UTC)
 * @returns whether the paid tests run
 */
export function isDue({ trigger, mode, passes, day }) {
    return byPerson(trigger, mode) || !passes.some((t) => t?.startsWith(day));
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
 * Passed LLM steps of release.yml runs created since `since` (a day early, for runs that crossed midnight).
 * @param repo owner/name
 * @param since YYYY-MM-DD
 * @param ownRun this run's id, left out
 * @param conclusions the step conclusions counted
 * @returns ISO times
 */
async function fetchPasses(repo, since, ownRun, conclusions) {
    // ponytail: most release.yml runs are master-push restarts that only pick and skip in a minute; a run that
    // reached the LLM lane ran CI first, so only runs of 15 minutes or more are read job by job, 8 at a time.
    // The results store's LLM-run query replaces this list.
    const long = "select((.updated_at | fromdate) - (.run_started_at | fromdate) >= 900) | .id";
    const ids = await gh(
        `repos/${repo}/actions/workflows/release.yml/runs?created=>=${since}&per_page=100`,
        `.workflow_runs[] | ${long}`,
    );
    const queue = ids.filter((id) => String(id) !== String(ownRun));
    const passes = [];
    const worker = async () => {
        for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
            passes.push(
                ...llmPasses(
                    await gh(`repos/${repo}/actions/runs/${id}/jobs?filter=all&per_page=100`, ".jobs[]"),
                    conclusions,
                ),
            );
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return passes;
}

/** Prints due=true|false and appends it to $GITHUB_OUTPUT. */
async function main() {
    const { TRIGGER = "", MODE = "", GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: ownRun, GITHUB_OUTPUT } = process.env;
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
    // A lookup that fails runs the tests: an API hiccup costs one paid run, never an untested day or a held release.
    const passes = byPerson(TRIGGER, MODE)
        ? []
        : await fetchPasses(repo, yesterday, ownRun).catch((error) => {
              console.log(`::warning::could not read today's LLM runs, so they run: ${error.message}`);
              return [];
          });
    const due = isDue({ trigger: TRIGGER, mode: MODE, passes, day });
    if (due) {
        const monthStart = new Date(Date.parse(`${month}-01`) - DAY_MS).toISOString().slice(0, 10);
        await fetchPasses(repo, monthStart, ownRun, PAID).then(
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
    } else {
        console.log(`::notice::the LLM regression tests already passed on ${day} (UTC); they run once a day`);
    }
    console.log(`due=${due}`);
    if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `due=${due}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
