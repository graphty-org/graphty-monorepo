// Jobs judged by their own record (design/ci/health-dashboard.md, section 4.3): chronically failing jobs, gating or
// not, and the jobs allowed to fail (job-level continue-on-error). A lane's verdict leaves a non-gating job's failure
// out (parse.ts releaseAttempt), which is right for the lane and is how Performance Benchmarks failed in most full
// runs for a week with nothing on the page; these members read each job's own conclusions instead.

import { DAY, floorTo } from "../model/items.js";
import type { Bucket } from "../model/items.js";
import { loadSeries } from "../model/rollup.js";
import type { ChronicJob } from "../model/snapshots.js";
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

/**
 * The open issue naming each job, in one GraphQL query: a search per job for its name, confirmed by the name
 * appearing in the title or body as words (as flaky.ts namesTest does for a test).
 * @param gh
 * @param repo
 * @param jobs
 */
export async function issuesNamingJobs(gh: GitHub, repo: string, jobs: ChronicJob[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const names = [...new Set(jobs.map((j) => shortName(j.job)))];
    if (!names.length) return out;
    const vars: Record<string, string> = {};
    const fields = names.map((n, i) => {
        vars[`q${i}`] = `repo:${repo} is:issue is:open "${n.replaceAll('"', " ")}"`;
        return `j${i}: search(query: $q${i}, type: ISSUE, first: 10) { nodes { ... on Issue { number title body } } }`;
    });
    const decl = names.map((_, i) => `$q${i}: String!`).join(", ");
    type Node = { number: number; title: string; body: string } | null;
    const data = await gh.graphql<Record<string, { nodes?: Node[] } | undefined>>(
        `query(${decl}) { ${fields.join(" ")} }`,
        vars,
    );
    names.forEach((n, i) => {
        const hit = (data[`j${i}`]?.nodes ?? []).find((x) => x && words(`${x.title}\n${x.body}`).includes(words(n)));
        if (hit) out.set(n, hit.number);
    });
    return out;
}

/**
 * The chronic jobs with their issues, and the two observations: chronic jobs, and those with no open issue.
 * @param store
 * @param gh
 * @param repo
 * @param now
 */
export async function jobMembers(store: Store, gh: GitHub, repo: string, now: number) {
    const today = floorTo(now, "1d");
    const series = await loadSeries(store, "ci.job_history", "1d", today - (HISTORY_DAYS - 1) * DAY, today, now);
    const chronic = chronicJobs(jobHistories(series.values()), now);
    const issues = await issuesNamingJobs(gh, repo, chronic);
    const list = chronic.map((j) => {
        const issue = issues.get(shortName(j.job));
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

/**
 * The jobs of a workflow file allowed to fail: job-level `continue-on-error: true`, or an expression for a job the
 * advisory list names (tools/ci-advisory-checks.json, a whole job in its warning period). Each by its `name:`, or its
 * id when it has none; a `${{ ... }}` in a name matches anything (a matrix job).
 * ponytail: reads the workflow line by line at the repository's indentation (jobs at 4 spaces, their keys at 8);
 * use a YAML parser if a workflow ever leaves that layout.
 * @param yaml - the workflow file
 * @param advisory - jobs in their warning period
 */
export function nonGatingJobs(yaml: string, advisory: string[] = []): string[] {
    const out: string[] = [];
    let inJobs = false;
    let job: { id: string; name?: string; non?: boolean } | undefined;
    const flush = () => {
        if (job?.non) out.push(job.name ?? job.id);
    };
    for (const line of yaml.split("\n")) {
        if (/^\S/.test(line)) {
            flush();
            job = undefined;
            inJobs = line.startsWith("jobs:");
            continue;
        }
        if (!inJobs) continue;
        const id = /^ {4}([\w-]+):\s*$/.exec(line)?.[1];
        if (id) {
            flush();
            job = { id };
            continue;
        }
        const key = /^ {8}(name|continue-on-error):(.*)$/.exec(line);
        if (!job || !key) continue;
        const value = key[2].trim().replace(/^(["'])(.*)\1$/, "$2");
        if (key[1] === "name") job.name = value;
        else job.non = value === "true" || (value.startsWith("${{") && advisory.includes(job.id));
    }
    flush();
    return out;
}

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
