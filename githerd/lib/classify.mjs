/**
 * The failure classifier (design section 4.4): one ordered list of classes, and the first class
 * that matches a failure wins. Every failure githerd sees goes through it: failed jobs on master
 * and on pull requests, release runs, the push queue's gate runs, and the reference worktree's
 * install and audit runs.
 *
 * The text patterns live in one table, `PATTERNS`. A failure's text is read in the order its
 * sources carry it: step names first (the rented runner's balance rejection is only a step name),
 * then annotations ("lost communication" is only an annotation), then the log (a runner shutdown is
 * only in the log) [PF 9.5]. Facts that are not text (the same key red on master or on other pull
 * requests, an open `intermittent` issue) arrive in the context, computed by the caller.
 *
 * The table holds only unambiguous failures (the owner's decision of 2026-10-05). On master,
 * anything it does not match is `unclassified`: githerd holds merges and re-runs the job once, and
 * a Claude session records whether it is the code or the environment (`githerd_verdict`). Claude
 * makes the judgment; code enforces it.
 *
 * Pure: no I/O, no clock.
 */

import { failureKey } from "./lanes.mjs";

/**
 * @typedef {"credential" | "paid-capacity" | "outside" | "inherited" | "shared" | "intermittent" | "own"}
 *   Class the classes, in the order they are tried (design 4.4)
 */

/** The prefix of a runner label served by the rented GPU provider (`runs-on: machine/...` in `gpu.yml`). */
const RENTED_PREFIX = "machine/";

/** How far back another pull request's failure on the same key still makes this one shared. */
export const SHARED_WINDOW_MS = 6 * 3_600_000;

/** Files that decide what `pnpm audit` reads: the manifests, the lockfile and the overrides. */
const DEPENDENCY_FILE = /(?:^|\/)(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$/;

/** Files no build step reads: design documents and agent configuration. */
const NOT_BUILT = /^(?:design|\.claude)\//;

/**
 * @typedef {object} Failure one failed job, or one failed local gate run
 * @property {string} workflow the workflow name (`CI`, `GPU`, `Release`), or `local` for a gate run
 * @property {string} job the job name
 * @property {string[]} steps the names of its failed steps, in order; empty when no step ran
 * @property {string[]} [annotations] its check run's annotation messages
 * @property {string | null} [log] its log text; null or absent when there is none
 * @property {string[]} [labels] its runner labels
 * @property {string[] | null} [files] the pull request's changed files; null or absent when unknown
 */

/**
 * @typedef {object} Context facts about the failure that are not in its text
 * @property {"pr" | "master"} [where] where the failure ran; `pr` by default
 * @property {Iterable<string>} [masterRed] the keys red on master now
 * @property {number} [others] other open pull requests with the same key within `SHARED_WINDOW_MS`
 *   (`othersWithKey`)
 * @property {boolean} [failsOnGreen] a local gate key that also fails on the green commit
 * @property {Iterable<string>} [intermittent] the keys named by open `intermittent` issues
 */

/**
 * @typedef {object} Verdict
 * @property {Class | "unclassified"} class the class; `unclassified` on master past
 *   class 3, for a Claude session to judge
 * @property {string} key the failure key
 * @property {string} reason the pattern or rule that decided it
 */

/**
 * @typedef {object} Pattern
 * @property {Class} class the class it puts a failure in
 * @property {string} name what it matches, in a few words
 * @property {(f: Failure, text: string[]) => boolean} test true on a match; `text` is the step
 *   names, then the annotations, then the log lines
 */

/**
 * A pattern that matches when any one line of the failure's text matches every regular expression.
 * @param {...RegExp} res the expressions
 * @returns {(f: Failure, text: string[]) => boolean} the test
 */
const line =
    (...res) =>
    (_f, text) =>
        text.some((l) => res.every((re) => re.test(l)));

/**
 * True when the job ran on the rented provider.
 * @param {Failure} f the failure
 * @returns {boolean} true on a rented label
 */
const rented = (f) => (f.labels ?? []).some((l) => l.startsWith(RENTED_PREFIX));

/** A runner that went away mid-job, as the runner and GitHub report it. */
const RUNNER_LOST = /received a shutdown signal|lost communication with the server/;

/**
 * The text patterns, in class order. Only unambiguous failures with an obvious action are here
 * (the owner's decision of 2026-10-05): a credential, paid capacity, a runner lost mid-job, and the
 * known outside outages (a package server or mirror, DNS). Anything else on master is
 * `unclassified`, and a Claude session judges it (design 4.4).
 */
export const PATTERNS = /** @type {Pattern[]} */ ([
    {
        class: "credential",
        name: "401 or bad credentials",
        test: line(/\b401\b|Bad credentials/, /unauthori[sz]ed|credentials|authenticat/i),
    },
    { class: "credential", name: "403 naming auth or permission", test: line(/\b403\b/, /auth|permission/i) },
    { class: "credential", name: "ssh key refused", test: line(/Permission denied \(publickey\)/) },
    { class: "credential", name: "npm E401", test: line(/\bE401\b/) },
    {
        class: "credential",
        name: "commit signing failed",
        test: line(/gpg failed to sign|gpg: signing failed|ssh-keygen.*(?:error|failed)/i),
    },
    { class: "credential", name: "Claude authentication failed", test: line(/\bauthentication_failed\b/) },
    { class: "paid-capacity", name: "rented runner balance", test: line(/Insufficient balance/) },
    { class: "paid-capacity", name: "rented runner time limit", test: line(/limited to 30 minutes/) },
    { class: "paid-capacity", name: "rented runner concurrency limit", test: line(/Concurrent runner limit reached/) },
    { class: "paid-capacity", name: "Claude billing error", test: line(/\bbilling_error\b/) },
    {
        class: "paid-capacity",
        name: "runner lost on a rented label",
        test: (f, text) => rented(f) && (f.steps.length === 0 || text.some((l) => RUNNER_LOST.test(l))),
    },
    // The same loss on any other runner: re-run once it is back.
    { class: "outside", name: "runner lost mid-job", test: line(RUNNER_LOST) },
    {
        class: "outside",
        name: "package registry fetch failed",
        test: line(/ERR_PNPM_(?:META_)?FETCH|ERR_PNPM_TARBALL|Error when performing the request to https:/),
    },
    // A package server or mirror failing a dependency install (apt, Playwright's system
    // dependencies): an outage outside the code, re-run once it is back.
    {
        class: "outside",
        name: "package server or mirror failed an install",
        test: line(
            /\bFailed to fetch https?:\/\/\S+ +(?:40[34]|5\d\d)\b|\bis no longer signed\b|Failed to install browser dependencies/,
        ),
    },
    // apt's and curl's words for a resolver that did not answer. Node's `getaddrinfo EAI_AGAIN` is not
    // here: a test resolving a made-up host prints it too (remote-logger's `test-server`).
    { class: "outside", name: "DNS lookup failed", test: line(/Temporary failure resolving|Could not resolve host/) },
]);

/**
 * True when the pull request's changes cannot affect the key, so its failure belongs to master: an
 * audit key with no dependency file changed, or a `Build` step with only unbuilt files changed.
 * @param {Failure} f the failure, with its `files`
 * @returns {boolean} true when the diff cannot affect the key
 */
export function cannotAffect(f) {
    if (!Array.isArray(f.files)) return false;
    const step = f.steps[0] ?? "";
    if (/audit/i.test(step)) return !f.files.some((p) => DEPENDENCY_FILE.test(p));
    if (f.job === "Build" && /^Build\b/.test(step)) return f.files.every((p) => NOT_BUILT.test(p));
    return false;
}

/** How many log lines before a failure marker the patterns read. */
const FAILURE_WINDOW = 40;

/**
 * The log lines that can say why a job failed: the `FAILURE_WINDOW` lines up to each `##[error]`
 * marker, or the last `FAILURE_WINDOW` lines when there is none. A passing test that prints
 * "HTTP 401: Bad credentials" thousands of lines earlier is not the failure.
 * @param {string} log the job's log
 * @returns {string[]} the lines
 */
export function failureLines(log) {
    const lines = log.split("\n");
    const marks = lines.flatMap((l, i) => (l.includes("##[error]") ? [i] : []));
    if (!marks.length) return lines.slice(-FAILURE_WINDOW);
    const keep = new Set(marks.flatMap((m) => Array.from({ length: FAILURE_WINDOW + 1 }, (_, k) => m - k)));
    return lines.filter((_, i) => keep.has(i));
}

/**
 * Classifies one failure.
 * @param {Failure} f the failure
 * @param {Context} [ctx] the facts that are not in its text
 * @returns {Verdict} the class, the key and the reason
 */
export function classify(f, ctx = {}) {
    const key = failureKey(f.workflow, f.job, f.steps[0]);
    const text = [...f.steps, ...(f.annotations ?? []), ...failureLines(f.log ?? "")];
    const hit = PATTERNS.find((p) => p.test(f, text));
    if (hit) return { class: hit.class, key, reason: hit.name };
    // Classes 4 to 7 need a pull request; on master the rest is Claude's to judge (design 4.5).
    if (ctx.where === "master")
        return { class: "unclassified", key, reason: "no unambiguous pattern: Claude judges code or environment" };
    if (new Set(ctx.masterRed ?? []).has(key))
        return { class: "inherited", key, reason: "the same key is red on master" };
    if ((ctx.others ?? 0) >= 1)
        return { class: "shared", key, reason: `the same key on ${ctx.others} other open pull request(s)` };
    if (cannotAffect(f)) return { class: "shared", key, reason: "the pull request's files cannot affect this key" };
    if (ctx.failsOnGreen) return { class: "shared", key, reason: "the local gate key also fails on the green commit" };
    if (new Set(ctx.intermittent ?? []).has(key))
        return { class: "intermittent", key, reason: "an open intermittent issue names the key" };
    return { class: "own", key, reason: "no other class matched" };
}

/**
 * @typedef {{key: string, pr: number, at: number}} Sighting one pull request failure: its key, its
 *   pull request and when it was seen
 */

/**
 * The number of OTHER pull requests that failed on the same key within `SHARED_WINDOW_MS` before
 * (or at) this failure. The caller passes only sightings of pull requests that are still open.
 * @param {Sighting[]} seen earlier sightings
 * @param {Sighting} now this failure
 * @returns {number} distinct other pull requests
 */
export function othersWithKey(seen, now) {
    const prs = new Set();
    for (const s of seen) {
        if (s.key === now.key && s.pr !== now.pr && s.at <= now.at && now.at - s.at <= SHARED_WINDOW_MS) prs.add(s.pr);
    }
    return prs.size;
}

/** `Set up job` lines that change on every run and say nothing about the environment. */
const PER_RUN = /^(?:Runner name|Machine name|Commit|Worker ID|Job is about to start|Waiting for a runner):?/;

/**
 * The environment drift between two job logs: the `Set up job` lines (everything before
 * `Complete job name`: runner version, operating system, runner image, action versions) that one
 * has and the other lacks. Timestamps and per-run lines are ignored.
 * @param {string | null | undefined} green the last green run's job log
 * @param {string | null | undefined} red the first red run's job log
 * @returns {string[]} `- line` for each line only green had, `+ line` for each only red has;
 *   empty when either log is missing
 */
export function setupDrift(green, red) {
    if (!green || !red || isNoLog(green) || isNoLog(red)) return [];
    const lines = (/** @type {string} */ log) => {
        const out = new Set();
        for (const raw of log.replace(/^\uFEFF/, "").split("\n")) {
            const l = raw.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, "").trim();
            if (l.startsWith("Complete job name")) break;
            if (l && !PER_RUN.test(l)) out.add(l);
        }
        return out;
    };
    const g = lines(green);
    const r = lines(red);
    return [
        ...[...g].filter((l) => !r.has(l)).map((l) => `- ${l}`),
        ...[...r].filter((l) => !g.has(l)).map((l) => `+ ${l}`),
    ];
}

/**
 * True when a job log body is the storage service's `BlobNotFound` document, which the log
 * endpoint returns for a job that has no log [PF 9.5]: "no log", not an error.
 * @param {string} body the log endpoint's answer
 * @returns {boolean} true when there is no log
 */
export function isNoLog(body) {
    return body.slice(0, 300).includes("<Code>BlobNotFound</Code>");
}
