/**
 * The failure classifier (design section 4.4): one ordered list of classes, and the first class
 * that matches a failure wins. Every failure githerd sees goes through it: failed jobs on master
 * and on pull requests, release runs, the push queue's gate runs, and the reference worktree's
 * install and audit runs.
 *
 * The text patterns live in one table, `PATTERNS`. A failure's text is read in the order its
 * sources carry it: step names first (the rented runner's balance rejection is only a step name),
 * then annotations ("lost communication" is only an annotation), then the log (a runner shutdown is
 * only in the log) [PF 9.5]. Facts that are not text (the `Set up job` drift, the same key red on
 * master or on other pull requests, an open `intermittent` issue) arrive in the context, computed
 * by the caller.
 *
 * Pure: no I/O, no clock.
 */

import { failureKey } from "./lanes.mjs";

/** The classes, in the order they are tried (design 4.4). */
const CLASSES = /** @type {const} */ ([
    "credential",
    "paid-capacity",
    "outside",
    "drift",
    "inherited",
    "shared",
    "intermittent",
    "own",
]);

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
 * @property {string[]} [drift] the `Set up job` diff between the last green and the first red run
 *   (`setupDrift`); non-empty is environment drift
 * @property {boolean} [platformDegraded] githubstatus.com reports Actions degraded, or a gating job
 *   sits queued past its label's pickup bound
 * @property {Iterable<string>} [masterRed] the keys red on master now
 * @property {number} [others] other open pull requests with the same key within `SHARED_WINDOW_MS`
 *   (`othersWithKey`)
 * @property {boolean} [failsOnGreen] a local gate key that also fails on the green commit
 * @property {Iterable<string>} [intermittent] the keys named by open `intermittent` issues
 */

/**
 * @typedef {object} Verdict
 * @property {(typeof CLASSES)[number] | "code"} class the class; `code` on master past class 4
 * @property {string} key the failure key
 * @property {string} reason the pattern or rule that decided it
 */

/**
 * @typedef {object} Pattern
 * @property {(typeof CLASSES)[number]} class the class it puts a failure in
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

/** A connection error code, as Node and npm print them. */
const NET_ERROR = /\bE(?:TIMEDOUT|CONNRESET|CONNREFUSED|AI_AGAIN|NOTFOUND)\b/;
/** A remote host: a URL that is not loopback, or a public domain name. */
const REMOTE_HOST = /https?:\/\/(?!localhost|127\.)|\b[\w-]+\.(?:com|org|io|net|dev)\b/i;

/** The text patterns, in class order. */
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
        test: (f, text) =>
            rented(f) &&
            (f.steps.length === 0 ||
                text.some((l) => /received a shutdown signal|lost communication with the server/.test(l))),
    },
    {
        class: "outside",
        name: "third-party 5xx",
        test: line(/\b5\d\d\b/, /Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out/i),
    },
    { class: "outside", name: "connection error naming a remote host", test: line(NET_ERROR, REMOTE_HOST) },
    {
        class: "outside",
        name: "registry or corepack error",
        test: line(
            /ERR_PNPM_(?:META_)?FETCH|ERR_PNPM_TARBALL|corepack.*(?:error|failed)|Error when performing the request to https:/i,
        ),
    },
    {
        class: "drift",
        name: "deprecated runner or action",
        test: line(/automatically failed because it uses a deprecated version/),
    },
    // The job's machine or container lacks what the run needs: the runner image or the job's own
    // setup, not the code under test.
    {
        class: "drift",
        name: "missing system library",
        test: line(/error while loading shared libraries|cannot open shared object file/),
    },
    { class: "drift", name: "C library too old", test: line(/version `GLIBC_[\d.]+' not found/) },
    {
        class: "drift",
        name: "browser or its system dependencies not installed",
        test: line(/Host system is missing dependencies|Executable doesn't exist at \S*ms-playwright/),
    },
    { class: "drift", name: "runner out of disk space", test: line(/No space left on device|\bENOSPC\b/) },
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

/**
 * Classifies one failure.
 * @param {Failure} f the failure
 * @param {Context} [ctx] the facts that are not in its text
 * @returns {Verdict} the class, the key and the reason
 */
export function classify(f, ctx = {}) {
    const key = failureKey(f.workflow, f.job, f.steps[0]);
    const text = [...f.steps, ...(f.annotations ?? []), ...(f.log ?? "").split("\n")];
    for (const p of PATTERNS) {
        if (CLASSES.indexOf(p.class) > CLASSES.indexOf("outside")) break;
        if (p.test(f, text)) return { class: p.class, key, reason: p.name };
    }
    if (ctx.platformDegraded)
        return { class: "outside", key, reason: "Actions degraded or queued past the pickup bound" };
    if (ctx.drift?.length) return { class: "drift", key, reason: "Set up job changed since the last green run" };
    const environment = PATTERNS.find((p) => p.class === "drift" && p.test(f, text));
    if (environment) return { class: "drift", key, reason: environment.name };
    // Classes 5 to 8 need a pull request; on master anything past class 4 is code (design 4.5).
    if (ctx.where === "master") return { class: "code", key, reason: "not credential, capacity, outside or drift" };
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
