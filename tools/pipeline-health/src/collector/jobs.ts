// Jobs judged by their own record (design/ci/health-dashboard.md, section 4.3): chronically failing jobs, gating or
// not, and the jobs allowed to fail (job-level continue-on-error). A lane's verdict leaves a non-gating job's failure
// out (parse.ts releaseAttempt), which is right for the lane and is how Performance Benchmarks failed in most full
// runs for a week with nothing on the page; these members read each job's own conclusions instead.

import { DAY, floorTo } from "../model/items.js";
import type { Bucket } from "../model/items.js";
import { loadSeries } from "../model/rollup.js";
import { type ChronicJob, readSnapshot } from "../model/snapshots.js";
import type { Store } from "../model/store.js";
import { words } from "./flaky.js";
import type { GitHub } from "./github.js";

/** A job's newest runs this many, judged by the failure share. */
export const LAST_RUNS = 10;
/** Fewer runs than this are never judged by their failure share (one failed run is not 100%). */
export const MIN_RUNS = 4;
/** A job failing in every run for this long is chronic however few runs it had. */
export const STREAK_MS = 3 * DAY;
/**
 * A job with no run in this long, or in twice its usual gap between runs when that is longer (a weekly job), has
 * stopped -- renamed or removed -- and is not judged.
 */
export const ACTIVE_MS = 2 * DAY;
/** Days of history read. */
export const HISTORY_DAYS = 14;

export interface JobRun {
    at: number;
    ok: boolean;
}

/** One job's runs, newest first. */
export interface JobHistory {
    workflow: string;
    job: string;
    runs: JobRun[];
}

/**
 * Each job's runs from the ci.job_history rollup, newest first: its dimension is [workflow, job, "pass" | "fail"] and
 * its values the times the job finished.
 * @param series - buckets of ci.job_history
 */
export function jobHistories(series: Iterable<Bucket>): JobHistory[] {
    const out = new Map<string, JobHistory>();
    for (const b of series)
        for (const [dim, a] of Object.entries(b.dims ?? {})) {
            const [workflow, job, outcome] = JSON.parse(dim) as [string, string, string];
            const k = JSON.stringify([workflow, job]);
            const h = out.get(k) ?? { workflow, job, runs: [] };
            out.set(k, h);
            for (const at of a.vals ?? []) h.runs.push({ at, ok: outcome === "pass" });
        }
    for (const h of out.values()) h.runs.sort((x, y) => y.at - x.at);
    return [...out.values()];
}

/** How long a job may go without a run and still be running: ACTIVE_MS, or twice its median gap between runs. */
function activeFor(runs: JobRun[]): number {
    const gaps = runs.slice(1).map((r, i) => runs[i].at - r.at);
    if (!gaps.length) return ACTIVE_MS;
    const median = gaps.toSorted((a, b) => a - b)[Math.floor(gaps.length / 2)];
    return Math.max(ACTIVE_MS, 2 * median);
}

/**
 * The jobs failing chronically: failed in at least half of their newest LAST_RUNS runs (MIN_RUNS at least), or
 * failed in every run for STREAK_MS. Worst first.
 * @param histories - jobHistories
 * @param now
 */
export function chronicJobs(histories: JobHistory[], now: number): ChronicJob[] {
    const out: ChronicJob[] = [];
    for (const h of histories) {
        const newest = h.runs[0];
        if (!newest || now - newest.at > activeFor(h.runs)) continue;
        const last = h.runs.slice(0, LAST_RUNS);
        const failed = last.filter((r) => !r.ok).length;
        const streak = h.runs.findIndex((r) => r.ok);
        const streakRuns = streak === -1 ? h.runs : h.runs.slice(0, streak);
        const failingSince = streakRuns.at(-1)?.at;
        const byShare = last.length >= MIN_RUNS && failed * 2 >= last.length;
        const byStreak = failingSince !== undefined && now - failingSince >= STREAK_MS;
        if (!byShare && !byStreak) continue;
        const lastPassAt = h.runs.find((r) => r.ok)?.at;
        out.push({
            workflow: h.workflow,
            job: h.job,
            runs: last.length,
            failed,
            ...(lastPassAt === undefined ? {} : { lastPassAt }),
            ...(failingSince === undefined ? {} : { failingSince }),
        });
    }
    return out.sort((a, b) => b.failed / b.runs - a.failed / a.runs || (a.lastPassAt ?? 0) - (b.lastPassAt ?? 0));
}

/** The name an issue uses for a job: its own name without the caller's ("CI / Performance Benchmarks"). */
export const shortName = (job: string): string => job.split(" / ").at(-1) ?? job;

/** Run kinds a title may name a workflow's runs by, beside the workflow's own name ("Full run: ..." is release.yml). */
const RUN_KINDS: Record<string, string[]> = { "release.yml": ["full run"], "ci.yml": ["master"] };

/**
 * Whether an issue title owns a job: it names the job as words, and names the job's workflow -- its file's name
 * ("release", "codeql", "work protection macos") or the kind of its runs ("full run") -- outside a leading
 * conventional-commit type ("ci: ..." names no workflow). A title naming a called job ("CI / All Checks Pass", called by
 * release.yml) does not own a job of the same name that nothing calls (ci.yml's own "All Checks Pass").
 * @param title
 * @param job - its workflow file and its name
 */
export function titleOwnsJob(title: string, job: Pick<ChronicJob, "workflow" | "job">): boolean {
    const short = shortName(job.job);
    if (!words(title).includes(words(short))) return false;
    const called = title
        .toLowerCase()
        .split("/")
        .map((x) => x.trim())
        .join("/")
        .includes(`/${short.toLowerCase()}`);
    if (called && short === job.job) return false;
    const rest = words(title.replace(/^[a-z]+(\([^)]*\))?!?:/, ""));
    const names = [job.workflow.replace(/\.ya?ml$/, ""), ...(RUN_KINDS[job.workflow] ?? [])];
    return names.some((n) => rest.includes(words(n)));
}

/**
 * The open issue owning each job (titleOwnsJob), in one GraphQL query: a search per job name for an open bug naming
 * it that is not a CI budget issue (those are about a job's time, not its failures). A mention in a body is not
 * ownership: it named #3447 for "All Checks Pass" and #3606 for "Dependabot".
 * @param gh
 * @param repo
 * @param jobs
 * @returns each job's issue number, in the order of `jobs`
 */
export async function issuesNamingJobs(gh: GitHub, repo: string, jobs: ChronicJob[]): Promise<(number | undefined)[]> {
    const names = [...new Set(jobs.map((j) => shortName(j.job)))];
    if (!names.length) return [];
    const vars: Record<string, string> = {};
    const fields = names.map((n, i) => {
        vars[`q${i}`] = `repo:${repo} is:issue is:open label:bug -label:ci-budget "${n.replaceAll('"', " ")}" in:title`;
        return `j${i}: search(query: $q${i}, type: ISSUE, first: 10) { nodes { ... on Issue { number title } } }`;
    });
    const decl = names.map((_, i) => `$q${i}: String!`).join(", ");
    type Node = { number: number; title: string } | null;
    const data = await gh.graphql<Record<string, { nodes?: Node[] } | undefined>>(
        `query(${decl}) { ${fields.join(" ")} }`,
        vars,
    );
    return jobs.map((j) => {
        const nodes = data[`j${names.indexOf(shortName(j.job))}`]?.nodes ?? [];
        return nodes.find((x) => x && titleOwnsJob(x.title, j))?.number;
    });
}

/** A job of ci.yml, run on its own or called by another workflow as "CI" (release.yml's "CI / Lint"). */
const isCiJob = (j: ChronicJob): boolean => j.workflow === "ci.yml" || j.job.startsWith("CI / ");

/**
 * The chronic jobs with their issues, and the two observations: chronic jobs, and those with no open issue. A ci.yml
 * job that ci.yml on master no longer defines (removed or renamed) is left out at once: its old failures are not a
 * job failing now, and waiting ACTIVE_MS for it to go quiet kept a removed job red for two days.
 * @param store
 * @param gh
 * @param repo
 * @param now
 */
export async function jobMembers(store: Store, gh: GitHub, repo: string, now: number) {
    const today = floorTo(now, "1d");
    const series = await loadSeries(store, "ci.job_history", "1d", today - (HISTORY_DAYS - 1) * DAY, today, now);
    const ciJobs = await readSnapshot(store, "ci-jobs");
    const chronic = chronicJobs(jobHistories(series.values()), now).filter(
        (j) => !ciJobs || !isCiJob(j) || ciJobs.some((p) => isJob(p, j.job)),
    );
    const issues = await issuesNamingJobs(gh, repo, chronic);
    const list = chronic.map((j, i) => {
        const issue = issues[i];
        return issue === undefined ? j : { ...j, issue };
    });
    return {
        list,
        obs: {
            "ci.chronic_jobs": list.length,
            "ci.chronic_no_issue": list.filter((j) => j.issue === undefined).length,
        },
    };
}

interface WorkflowJob {
    id: string;
    name?: string;
    non?: boolean;
}

/**
 * Every job of a workflow file: its id, `name:` and whether it is allowed to fail (job-level `continue-on-error:
 * true`, or an expression for a job the advisory list names).
 * ponytail: reads the workflow line by line at the repository's indentation (jobs at 4 spaces, their keys at 8);
 * use a YAML parser if a workflow ever leaves that layout.
 * @param yaml - the workflow file
 * @param advisory - jobs in their warning period
 */
function workflowJobs(yaml: string, advisory: string[]): WorkflowJob[] {
    const out: WorkflowJob[] = [];
    let inJobs = false;
    let job: WorkflowJob | undefined;
    for (const line of yaml.split("\n")) {
        if (/^\S/.test(line)) {
            job = undefined;
            inJobs = line.startsWith("jobs:");
            continue;
        }
        if (!inJobs) continue;
        const id = /^ {4}([\w-]+):\s*$/.exec(line)?.[1];
        if (id) {
            job = { id };
            out.push(job);
            continue;
        }
        const key = /^ {8}(name|continue-on-error):(.*)$/.exec(line);
        if (!job || !key) continue;
        const value = key[2].trim().replace(/^(["'])(.*)\1$/, "$2");
        if (key[1] === "name") job.name = value;
        else job.non = value === "true" || (value.startsWith("${{") && advisory.includes(job.id));
    }
    return out;
}

/**
 * The jobs of a workflow file allowed to fail, each by its `name:`, or its id when it has none; a `${{ ... }}` in a
 * name matches anything (a matrix job).
 * @param yaml - the workflow file
 * @param advisory - jobs in their warning period (tools/ci-advisory-checks.json, a whole job)
 */
export function nonGatingJobs(yaml: string, advisory: string[] = []): string[] {
    return workflowJobs(yaml, advisory)
        .filter((j) => j.non)
        .map((j) => j.name ?? j.id);
}

/**
 * Every job a workflow file defines, by its `name:`, or its id when it has none (patterns for isJob).
 * @param yaml - the workflow file
 */
export const definedJobs = (yaml: string): string[] => workflowJobs(yaml, []).map((j) => j.name ?? j.id);

/**
 * Whether a job (its family name, as ci.job_outcome keys it) is the non-gating job `pattern` names, called or not:
 * "Story tests (${{ matrix.name || matrix.project }})" matches "CI / Story tests (graphty)".
 * @param pattern - a nonGatingJobs name
 * @param job
 */
export function isJob(pattern: string, job: string): boolean {
    const re = pattern
        .split(/\$\{\{.*?\}\}/)
        .map((p) => p.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
        .join(".+");
    return new RegExp(`^${re}$`).test(shortName(job));
}
