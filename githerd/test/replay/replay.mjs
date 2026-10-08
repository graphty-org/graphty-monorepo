/**
 * The replay harness: graphty-monorepo's recorded month (2026-09-02 to 2026-10-03) served back as
 * GitHub would have answered a poll at any minute of it.
 *
 * The data in `data/` was read from GitHub with `gh api` on 2026-10-02 and 2026-10-03:
 *
 * - `runs-master.jsonl`: every workflow run on master (`actions/runs?branch=master`).
 * - `runs-pr.jsonl`: every CI run of a pull request (`actions/runs?event=pull_request`, CI only).
 * - `attempts.jsonl`: every attempt of each run that was re-run (`actions/runs/{id}/attempts/{n}`),
 *   so an earlier attempt's result is visible between its end and the next attempt's start.
 * - `failed-jobs.jsonl`: the failed jobs and failed steps of each failed master run (latest attempt).
 * - `logs.json`: per failed job id, `matches` (log lines matching error words) and `errors` (the 12
 *   lines before each of the first three `##[error]` annotations).
 * - `prs.json`, `issues.json`: pull requests and issues created in the month (`gh pr list`,
 *   `gh issue list`), with their final labels and the issues' comments.
 *
 * Every non-ASCII character is written as a JSON `\u` escape; the parsed values are the recorded
 * ones.
 *
 * What the record does not hold, and how a reconstructed answer fills it in:
 *
 * - A run's state before it completed: `in_progress` from its attempt's start, with `updated_at` at
 *   the start, then `completed` with the recorded result. Queue time is not recorded (a first
 *   attempt's start is its run's creation), so nothing is ever `queued`.
 * - Labels, titles and draft flags as they were at the time: the final values are served.
 * - Jobs of a run before its latest attempt completed, and jobs of pull request runs: not recorded,
 *   so the jobs answer is empty.
 *
 * The two backwards answers: on 2026-10-02 at 10:48 and 11:19 UTC GitHub's runs answer for master
 * named CI run 36684386406 (a failure from 2026-09-30) as CI's newest finished run, and a watcher
 * raised two false red-master alarms on it. During those two minutes the master runs answer carries
 * that run in place of every CI run.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const DATA = new URL("data/", import.meta.url);
const REPO = "graphty-org/graphty-monorepo";
const MINUTE = 60_000;
const RATE_LIMIT = 5000;
const HOUR = 60 * MINUTE;

/** The stale run GitHub answered with, and the minutes it did. */
export const BACKWARDS = {
    runId: 36684386406,
    workflow: "CI",
    minutes: ["2026-10-02T10:48:00Z", "2026-10-02T11:19:00Z"].map((s) => Date.parse(s)),
};

/**
 * @typedef {{n: number, start: number, end: number, conclusion: string}} Attempt
 * @typedef {{run: Record<string, any>, created: number, attempts: Attempt[]}} Timeline
 * @typedef {{status: number, etag?: string, body: any, text?: string}} Answer `text` is the body as
 *   sent, kept with a cached answer
 */

/**
 * Reads one data file.
 * @param {string} name file name under `data/`
 * @returns {any} the parsed JSON, or the rows of a `.jsonl` file
 */
function read(name) {
    const text = readFileSync(new URL(name, DATA), "utf8");
    if (!name.endsWith(".jsonl")) return JSON.parse(text);
    return text
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

/**
 * Builds each run's attempts, newest run first.
 * @param {Record<string, any>[]} runs recorded runs (their final state)
 * @param {Map<number, Record<string, any>[]>} attempts recorded attempts by run id
 * @returns {Timeline[]} one timeline per run, sorted newest first
 */
function timelines(runs, attempts) {
    return runs
        .map((run) => {
            const created = Date.parse(run.created_at);
            const recorded = attempts.get(run.id);
            /** @type {Attempt[]} */
            const list = recorded
                ? recorded
                      .map((a) => ({
                          n: a.run_attempt,
                          start: Date.parse(a.run_started_at),
                          end: Date.parse(a.updated_at),
                          conclusion: a.conclusion,
                      }))
                      .sort((a, b) => a.n - b.n)
                : [{ n: run.run_attempt, start: created, end: Date.parse(run.updated_at), conclusion: run.conclusion }];
            return { run, created, attempts: list };
        })
        .sort((a, b) => b.created - a.created || b.run.id - a.run.id);
}

/**
 * A run as the runs endpoint would have shown it at `at`, or null before it was created.
 * @param {Timeline} t the run's timeline
 * @param {number} at the time
 * @returns {Record<string, any> | null} the run
 */
function runAt(t, at) {
    if (at < t.created) return null;
    const a = t.attempts.findLast((x) => x.start <= at);
    const { pr, ...run } = t.run;
    if (pr) run.pull_requests = pr.map((/** @type {number} */ number) => ({ number }));
    const done = at >= a.end;
    return {
        ...run,
        run_attempt: a.n,
        run_started_at: new Date(a.start).toISOString(),
        status: done ? "completed" : "in_progress",
        conclusion: done ? a.conclusion : null,
        updated_at: new Date(done ? a.end : a.start).toISOString(),
    };
}

/**
 * The time a value was last changed, at or before `at`.
 * @param {(string | null | undefined)[]} times ISO times
 * @param {number} at the time
 * @returns {number} the latest of them not after `at`, or -Infinity
 */
function latest(times, at) {
    let best = -Infinity;
    for (const s of times) {
        const t = s ? Date.parse(s) : NaN;
        if (t <= at && t > best) best = t;
    }
    return best;
}

/**
 * Loads the record and returns a fake GitHub over it, with its own clock.
 * @returns the replay: `setTime`, `now`, `answer`, `response`, `sequence` and the parsed `record`
 */
export function createReplay() {
    const attempts = new Map();
    for (const a of read("attempts.jsonl")) attempts.set(a.id, [...(attempts.get(a.id) ?? []), a]);
    const record = {
        master: timelines(read("runs-master.jsonl"), attempts),
        pr: timelines(read("runs-pr.jsonl"), attempts),
        failedJobs: /** @type {Record<string, any>[]} */ (read("failed-jobs.jsonl")),
        prs: /** @type {Record<string, any>[]} */ (read("prs.json")),
        issues: /** @type {Record<string, any>[]} */ (read("issues.json")),
        logs: /** @type {Record<string, {matches?: string, errors?: string}>} */ (read("logs.json")),
    };
    const stale = record.master.find((t) => t.run.id === BACKWARDS.runId);
    /**
     * Every time at which some answer can change, ascending: a run's creation and its attempts'
     * starts and ends, a failed job's end, a pull request's or issue's creation, closing and merge,
     * a comment, and the edges of the backwards minutes. Between two of them every answer is the
     * same, so a minute-by-minute poller is answered from `cache` instead of rebuilding the answer,
     * its JSON and its SHA-256 each minute.
     */
    const changes = Float64Array.from(
        [
            ...[...record.master, ...record.pr].flatMap((t) => [
                t.created,
                ...t.attempts.flatMap((a) => [a.start, a.end]),
            ]),
            ...record.failedJobs.map((j) => Date.parse(j.ts)),
            ...record.prs.flatMap((p) => [p.createdAt, p.closedAt, p.mergedAt].map((s) => Date.parse(s))),
            ...record.issues.flatMap((i) =>
                [i.createdAt, i.closedAt, ...i.comments.map((/** @type {any} */ c) => c.createdAt)].map((s) =>
                    Date.parse(s),
                ),
            ),
            ...BACKWARDS.minutes.flatMap((m) => [m, m + MINUTE]),
        ].filter(Number.isFinite),
    ).sort();
    /** @type {Map<string, {status: number, body: any, text?: string, etag?: string}>} per path and epoch */
    const cache = new Map();

    /**
     * How many change times are at or before `at`: two times with the same count get the same answers.
     * @param {number} at the time
     * @returns {number} the count
     */
    function epoch(at) {
        let lo = 0;
        let hi = changes.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (changes[mid] <= at) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
    let clock = Date.parse("2026-09-02T00:00:00Z");
    /** 200 answers per hour window, for the rate headers. */
    const used = new Map();

    /**
     * The runs endpoint's first page at `at`.
     * @param {Timeline[]} list the runs
     * @param {number} at the time
     * @param {number} perPage page size
     * @returns {Record<string, any>[]} newest first
     */
    function runsPage(list, at, perPage) {
        const out = [];
        for (const t of list) {
            if (out.length === perPage) break;
            const run = runAt(t, at);
            if (run) out.push(run);
        }
        return out;
    }

    /**
     * True when `at` falls in one of the two minutes GitHub answered backwards.
     * @param {number} at the time
     * @returns {boolean} true inside a backwards minute
     */
    function isBackwards(at) {
        return BACKWARDS.minutes.some((m) => at >= m && at < m + MINUTE);
    }

    /**
     * GitHub's answer for one GET path at one time, before any ETag check.
     * @param {string} path the REST path, `repos/<repo>/...` with its query
     * @param {number} [at] the time; the replay clock by default
     * @returns {Answer} status and body (a string for a log)
     */
    function answer(path, at = clock) {
        const url = new URL(path, "https://api.github.com/");
        const q = url.searchParams;
        const perPage = Math.min(Number(q.get("per_page") ?? 30), 100);
        const skip = (Number(q.get("page") ?? 1) - 1) * perPage;
        const prefix = `/repos/${REPO}/`;
        if (!url.pathname.startsWith(prefix)) return { status: 404, body: { message: "Not Found" } };
        const rest = url.pathname.slice(prefix.length);
        const iso = (/** @type {number} */ t) => new Date(t).toISOString();

        if (rest === "actions/runs" && q.get("branch") === "master") {
            let runs = runsPage(record.master, at, perPage);
            if (isBackwards(at)) {
                runs = [
                    runAt(stale, Date.parse(stale.run.updated_at)),
                    ...runs.filter((r) => r.name !== BACKWARDS.workflow),
                ];
            }
            return { status: 200, body: { total_count: runs.length, workflow_runs: runs } };
        }
        if (rest === "actions/runs" && q.get("event") === "pull_request") {
            const runs = runsPage(record.pr, at, perPage);
            return { status: 200, body: { total_count: runs.length, workflow_runs: runs } };
        }
        const jobs = /^actions\/runs\/(\d+)\/jobs$/.exec(rest);
        if (jobs) {
            const t = record.master.find((x) => String(x.run.id) === jobs[1]);
            const done = t && at >= t.attempts.at(-1).end;
            const list = done
                ? record.failedJobs
                      .filter((j) => j.run === jobs[1])
                      .map((j) => ({
                          id: j.jid,
                          run_id: Number(j.run),
                          name: j.job,
                          status: "completed",
                          conclusion: "failure",
                          steps: j.steps.map((/** @type {string} */ name) => ({
                              name,
                              status: "completed",
                              conclusion: "failure",
                          })),
                      }))
                : [];
            return { status: 200, body: { total_count: list.length, jobs: list } };
        }
        const log = /^actions\/jobs\/(\d+)\/logs$/.exec(rest);
        if (log) {
            const l = record.logs[log[1]];
            const done = record.failedJobs.some((j) => String(j.jid) === log[1] && at >= Date.parse(j.ts));
            if (!l || !done) return { status: 404, body: { message: "Not Found" } };
            return { status: 200, body: `${l.errors ?? ""}${l.matches ?? ""}` };
        }
        if (rest === "pulls" && q.get("state") === "open") {
            const open = record.prs
                .filter((p) => Date.parse(p.createdAt) <= at && !(latest([p.closedAt, p.mergedAt], at) > -Infinity))
                .sort((a, b) => b.number - a.number)
                .slice(skip, skip + perPage)
                .map((p) => ({
                    number: p.number,
                    title: p.title,
                    state: "open",
                    draft: p.isDraft,
                    created_at: p.createdAt,
                    user: { login: p.author.login },
                    head: { ref: p.headRefName },
                    base: { ref: "master" },
                    labels: p.labels.map((/** @type {{name: string}} */ l) => ({ name: l.name })),
                }));
            return { status: 200, body: open };
        }
        if (rest === "issues") {
            const since = q.get("since") ? Date.parse(q.get("since")) : -Infinity;
            // GitHub answers a `since` at the Unix epoch with an empty list (seen live 2026-10-04).
            if (since === 0) return { status: 200, body: [] };
            const list = record.issues
                .filter((i) => Date.parse(i.createdAt) <= at)
                .map((i) => {
                    const closed = latest([i.closedAt], at) > -Infinity;
                    const comments = i.comments.filter((/** @type {any} */ c) => Date.parse(c.createdAt) <= at);
                    const updated = latest(
                        [
                            i.createdAt,
                            closed ? i.closedAt : null,
                            ...comments.map((/** @type {any} */ c) => c.createdAt),
                        ],
                        at,
                    );
                    return {
                        number: i.number,
                        title: i.title,
                        state: closed ? "closed" : "open",
                        user: { login: i.author.login },
                        labels: i.labels.map((/** @type {{name: string}} */ l) => ({ name: l.name })),
                        comments: comments.length,
                        created_at: i.createdAt,
                        updated_at: iso(updated),
                        closed_at: closed ? i.closedAt : null,
                    };
                })
                .filter((i) => Date.parse(i.updated_at) >= since)
                .sort((a, b) => b.number - a.number)
                .slice(skip, skip + perPage);
            return { status: 200, body: list };
        }
        if (rest === "issues/comments") {
            const since = q.get("since") ? Date.parse(q.get("since")) : -Infinity;
            const list = record.issues
                .flatMap((i) =>
                    i.comments.map((/** @type {any} */ c, /** @type {number} */ k) => ({
                        id: i.number * 1000 + k,
                        issue_url: `https://api.github.com/repos/${REPO}/issues/${i.number}`,
                        user: { login: c.author.login },
                        created_at: c.createdAt,
                        updated_at: c.createdAt,
                        body: c.body,
                    })),
                )
                .filter((c) => Date.parse(c.created_at) <= at && Date.parse(c.created_at) >= since)
                .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
                .slice(skip, skip + perPage);
            return { status: 200, body: list };
        }
        return { status: 404, body: { message: "Not Found" } };
    }

    /**
     * An answer with its ETag, as a conditional GET would get it: 304 when the ETag still matches.
     * @param {string} path the REST path
     * @param {string | undefined} etag the `If-None-Match` value sent
     * @param {number} at the time
     * @returns {Answer} the answer
     */
    function conditional(path, etag, at) {
        const key = `${epoch(at)} ${path}`;
        let a = cache.get(key);
        if (!a) {
            a = answer(path, at);
            if (a.status === 200) {
                const text = typeof a.body === "string" ? a.body : JSON.stringify(a.body);
                a = { ...a, text, etag: `W/"${createHash("sha256").update(text).digest("hex")}"` };
            }
            cache.set(key, a);
        }
        if (a.status !== 200) return { status: a.status, body: a.body };
        return etag === a.etag
            ? { status: 304, etag, body: undefined }
            : { status: 200, etag: a.etag, body: a.body, text: a.text };
    }

    return {
        record,

        /**
         * Sets the replay clock.
         * @param {number | string} at epoch milliseconds or an ISO time
         */
        setTime(at) {
            clock = typeof at === "string" ? Date.parse(at) : at;
        },

        /**
         * Reads the replay clock; pass it as `createGitHub({now})`.
         * @returns {number} the replay clock
         */
        now: () => clock,

        answer,

        /**
         * A `createFakeGh` responder: answers `gh api -i [-H "If-None-Match: <etag>"] <path>` at the
         * replay clock, with ETag and rate headers. Only 200 answers spend the hourly budget.
         * @param {{args: string[]}} call one recorded `gh` call
         * @returns {{status: number, headers: Record<string, string>, body?: unknown}} the response
         *   for `httpOutput`
         */
        response({ args }) {
            const h = args.indexOf("-H");
            const etag = h === -1 ? undefined : args[h + 1].replace(/^If-None-Match:\s*/i, "");
            const a = conditional(args.at(-1), etag, clock);
            const hour = Math.floor(clock / HOUR);
            if (a.status === 200) used.set(hour, (used.get(hour) ?? 0) + 1);
            const n = used.get(hour) ?? 0;
            /** @type {Record<string, string>} */
            const headers = {
                "X-RateLimit-Limit": String(RATE_LIMIT),
                "X-RateLimit-Remaining": String(RATE_LIMIT - n),
                "X-RateLimit-Used": String(n),
                "X-RateLimit-Reset": String(((hour + 1) * HOUR) / 1000),
                "X-RateLimit-Resource": "core",
            };
            if (a.etag) headers.ETag = a.etag;
            // As GitHub labels it, so the fake need not parse each body to tell JSON from a log.
            if (a.body !== undefined) {
                headers["Content-Type"] =
                    typeof a.body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
            }
            return { status: a.status, headers, body: a.text ?? a.body };
        },

        /**
         * The minute-by-minute answers one poller would get for one path: a 200 when the answer
         * changed since the previous minute, else a 304 with no body.
         * @param {string} path the REST path
         * @param {number | string} from the first minute
         * @param {number | string} to the end, exclusive
         * @yields {{at: number} & Answer} each minute's answer
         */
        *sequence(path, from, to) {
            let etag;
            const end = typeof to === "string" ? Date.parse(to) : to;
            for (let at = typeof from === "string" ? Date.parse(from) : from; at < end; at += MINUTE) {
                const a = conditional(path, etag, at);
                etag = a.etag;
                yield { at, status: a.status, etag: a.etag, body: a.body };
            }
        },
    };
}
