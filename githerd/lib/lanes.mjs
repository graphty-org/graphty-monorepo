/**
 * Lane facts (design section 4.3): what master's workflow runs say, as pure functions over the
 * runs and jobs answers of the GitHub REST API.
 *
 * - **Lane verdict**, per workflow: the newest completed run on master by sighting order. A
 *   cancelled or skipped run is recorded as the newest run but leaves the verdict as it was.
 * - **Red since**: the first red run of the current red stretch, and the failure keys every red
 *   run of the stretch named (a red master is a set of keys, each handled on its own).
 * - **Green commit**: the newest master commit on which every gating lane's newest run is green
 *   (an `if-run` lane counts only when it ran for that commit).
 * - **CI-green commit**: the newest master commit whose CI run is green and on which no gating lane
 *   is red.
 * - **Queue age**: per queued job of a gating run, how long it has waited against the worst pickup
 *   time ever seen on its runner label.
 *
 * Times are epoch milliseconds in, ISO strings in the records.
 */

/** How many recent commits the facts remember the runs of. */
const SHA_MEMORY = 50;

/** Worst pickup seen on the rented GPU label before githerd watched it (platform facts 9.8). */
export const PICKUP_SEED = { "machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand": 926_000 };

const RED = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * @typedef {{id: number, run_attempt: number, name: string, head_sha: string, status: string,
 *   conclusion: string | null, created_at: string, updated_at: string}} WorkflowRun
 * @typedef {{name: string, status: string, conclusion: string | null,
 *   steps?: {name: string, conclusion: string | null}[]}} Job
 * @typedef {{id: number, name: string, status: string, created_at: string, started_at?: string | null,
 *   runner_name?: string | null, labels?: string[]}} QueueJob
 * @typedef {"green" | "red" | "neutral" | "running"} Outcome
 * @typedef {{runId: number, attempt: number, sha: string, conclusion: string | null,
 *   createdAt: string, updatedAt: string, sightedAt: string}} RunRef
 * @typedef {{firstRunId: number, firstSeenAt: string, lastRunId: number}} KeySeen
 * @typedef {{newest: RunRef | null, verdict: "green" | "red" | "unknown", redSince: RunRef | null,
 *   keys: Record<string, KeySeen>}} Lane
 * @typedef {{order: number, runs: Record<string, {id: number, attempt: number, outcome: Outcome}>}} ShaRecord
 * @typedef {{lanes: Record<string, Lane>, shas: Record<string, ShaRecord>,
 *   greenSha: string | null, ciGreenSha: string | null}} LaneFacts
 * @typedef {{gating: Record<string, "required" | "if-run">, ci: string}} LaneConfig gating
 *   workflows by name, and the name of the CI workflow
 */

/**
 * The outcome class of a run.
 * @param {WorkflowRun} run the run
 * @returns {Outcome} green, red, running, or neutral (cancelled, skipped, neutral, action_required)
 */
function outcomeOf(run) {
    if (run.status !== "completed") return "running";
    if (run.conclusion === "success") return "green";
    return RED.has(run.conclusion ?? "") ? "red" : "neutral";
}

/**
 * Whether (id, attempt) a is at least (id, attempt) b.
 * @param {{id: number, attempt: number}} a a run
 * @param {{id: number, attempt: number}} b a run
 * @returns {boolean} true when a is the same run attempt as b or newer
 */
function atLeast(a, b) {
    return a.id > b.id || (a.id === b.id && a.attempt >= b.attempt);
}

/**
 * Empty facts, as at githerd's first start.
 * @returns {LaneFacts} no lanes, no commits
 */
export function emptyFacts() {
    return { lanes: {}, shas: {}, greenSha: null, ciGreenSha: null };
}

/**
 * Whether a completed run is a sighting for its lane: its (run id, run attempt) is at least the
 * lane's newest, and its `updated_at` is newer. A backwards answer (an older run named as the
 * newest) and an answer seen before are not.
 * @param {Lane | undefined} lane the lane's facts
 * @param {WorkflowRun} run the newest completed run of the lane's workflow in a poll answer
 * @returns {boolean} true for a sighting
 */
function isSighting(lane, run) {
    const n = lane?.newest;
    if (!n) return true;
    return (
        atLeast({ id: run.id, attempt: run.run_attempt }, { id: n.runId, attempt: n.attempt }) &&
        run.updated_at > n.updatedAt
    );
}

/**
 * Folds one sighting into its lane.
 * @param {Lane | undefined} prev the lane's facts
 * @param {WorkflowRun} run the sighted run
 * @param {string} at the poll's time
 * @returns {Lane} the lane's new facts
 */
function sight(prev, run, at) {
    /** @type {RunRef} */
    const ref = {
        runId: run.id,
        attempt: run.run_attempt,
        sha: run.head_sha,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        sightedAt: at,
    };
    const lane = {
        newest: ref,
        verdict: prev?.verdict ?? "unknown",
        redSince: prev?.redSince ?? null,
        keys: prev?.keys ?? {},
    };
    const outcome = outcomeOf(run);
    if (outcome === "green") return { ...lane, verdict: "green", redSince: null, keys: {} };
    if (outcome === "red" && lane.verdict !== "red") return { ...lane, verdict: "red", redSince: ref, keys: {} };
    return lane;
}

/**
 * Folds one poll's master runs answer into the facts.
 * @param {LaneFacts} facts the facts from the last poll
 * @param {WorkflowRun[]} runs the runs answer's `workflow_runs`, every workflow
 * @param {LaneConfig} config the gating workflows
 * @param {number} now the poll's time
 * @returns {{facts: LaneFacts, sighted: RunRef[]}} the new facts, and the runs sighted this poll
 *   (a red one is the cue to read its jobs and call `foldJobs`)
 */
export function foldRuns(facts, runs, config, now) {
    const at = new Date(now).toISOString();
    const lanes = { ...facts.lanes };
    const shas = { ...facts.shas };
    /** @type {RunRef[]} */
    const sighted = [];

    /** @type {Map<string, WorkflowRun>} */
    const newestDone = new Map();
    for (const run of runs) {
        const entry = { id: run.id, attempt: run.run_attempt, outcome: outcomeOf(run) };
        const rec = shas[run.head_sha] ?? { order: run.id, runs: {} };
        const old = rec.runs[run.name];
        if (!old || atLeast(entry, old)) {
            shas[run.head_sha] = { order: Math.min(rec.order, run.id), runs: { ...rec.runs, [run.name]: entry } };
        }
        if (run.status !== "completed") continue;
        const best = newestDone.get(run.name);
        if (!best || atLeast({ id: run.id, attempt: run.run_attempt }, { id: best.id, attempt: best.run_attempt }))
            newestDone.set(run.name, run);
    }
    for (const [name, run] of newestDone) {
        if (!isSighting(lanes[name], run)) continue;
        lanes[name] = sight(lanes[name], run, at);
        sighted.push(/** @type {RunRef} */ (lanes[name].newest));
    }

    const order = Object.keys(shas).sort((a, b) => shas[b].order - shas[a].order);
    for (const sha of order.slice(SHA_MEMORY)) delete shas[sha];
    const recent = order.slice(0, SHA_MEMORY);
    const gating = Object.entries(config.gating);
    const outcome = (/** @type {string} */ sha, /** @type {string} */ wf) => shas[sha].runs[wf]?.outcome;
    const green = recent.find((sha) =>
        gating.every(([wf, kind]) => outcome(sha, wf) === "green" || (kind === "if-run" && !outcome(sha, wf))),
    );
    const ciGreen = recent.find(
        (sha) => outcome(sha, config.ci) === "green" && gating.every(([wf]) => outcome(sha, wf) !== "red"),
    );
    return {
        facts: { lanes, shas, greenSha: green ?? facts.greenSha, ciGreenSha: ciGreen ?? facts.ciGreenSha },
        sighted,
    };
}

/**
 * The failure key (design 1.4): workflow, job and first failed step, with shard numbers and commit
 * hashes replaced by `*`. The lane facts and the classifier both use it.
 * @param {string} workflow the workflow's name
 * @param {string} job the job's name, such as `Test (graphty-element-browser-4)`
 * @param {string} [step] the failed step's name; empty for a job with no failed step
 * @returns {string} the key, such as `CI / Test (graphty-element-browser-*) / Run tests`
 */
export function failureKey(workflow, job, step = "") {
    const norm = (/** @type {string} */ s) =>
        s
            // A hash has both digits and letters, so `deadbeef` and `2025` stay.
            .replaceAll(/\b[0-9a-f]{7,40}\b/g, (h) => (/\d/.test(h) && /[a-f]/.test(h) ? "*" : h))
            // One or two digits only: `windows-2025` names a runner image, not a shard.
            .replaceAll(/-\d{1,2}(?=\)|$)/g, "-*");
    return `${workflow} / ${norm(job)} / ${norm(step)}`;
}

/**
 * The failure keys of one run's jobs. A summary job (one that only reports whether the others
 * passed, such as `All Checks Pass`) is left out when another job failed, because its failure is
 * theirs; alone, it is a key of its own.
 * @param {string} workflow the workflow's name
 * @param {Job[]} jobs the run's jobs
 * @param {string[]} [summaries] names of the summary jobs
 * @returns {string[]} the keys, in job order, without repeats
 */
export function failureKeys(workflow, jobs, summaries = []) {
    const failed = jobs.filter((j) => j.status === "completed" && RED.has(j.conclusion ?? ""));
    const own = failed.filter((j) => !summaries.includes(j.name));
    const keys = (own.length > 0 ? own : failed).map((j) =>
        failureKey(workflow, j.name, j.steps?.find((s) => RED.has(s.conclusion ?? ""))?.name ?? ""),
    );
    return [...new Set(keys)];
}

/**
 * Adds a red run's failure keys to its lane's current red stretch. A run older than the stretch,
 * or a lane that is not red, adds nothing.
 * @param {LaneFacts} facts the facts
 * @param {string} workflow the run's workflow name
 * @param {number} runId the run
 * @param {Job[]} jobs the run's jobs
 * @param {number} now the time the jobs were read
 * @param {string[]} [summaries] names of the summary jobs (see `failureKeys`)
 * @returns {LaneFacts} the facts, with new keys recorded
 */
export function foldJobs(facts, workflow, runId, jobs, now, summaries = []) {
    const lane = facts.lanes[workflow];
    if (lane?.verdict !== "red" || !lane.redSince || runId < lane.redSince.runId) return facts;
    const at = new Date(now).toISOString();
    const keys = { ...lane.keys };
    for (const key of failureKeys(workflow, jobs, summaries)) {
        const seen = keys[key];
        keys[key] = seen
            ? { ...seen, lastRunId: Math.max(seen.lastRunId, runId) }
            : { firstRunId: runId, firstSeenAt: at, lastRunId: runId };
    }
    return { ...facts, lanes: { ...facts.lanes, [workflow]: { ...lane, keys } } };
}

/**
 * A job's runner label.
 * @param {QueueJob} job the job
 * @returns {string} its labels, joined
 */
function labelOf(job) {
    return (job.labels ?? []).join(",");
}

/**
 * Records the pickup time of every job a runner has taken: `started_at` minus `created_at`, kept as
 * the worst per runner label. A queued job's `started_at` equals its `created_at`, so only a job
 * with a `runner_name` counts.
 * @param {Record<string, number>} worst worst pickup in milliseconds by label
 * @param {QueueJob[]} jobs a run's jobs
 * @returns {Record<string, number>} the worst pickups, updated
 */
export function notePickups(worst, jobs) {
    const out = { ...worst };
    for (const job of jobs) {
        if (!job.runner_name || !job.started_at) continue;
        const ms = Date.parse(job.started_at) - Date.parse(job.created_at);
        const label = labelOf(job);
        if (out[label] === undefined || out[label] < ms) out[label] = ms;
    }
    return out;
}

/**
 * The queue age of each job still waiting for a runner (`queued`, no `runner_name`), against the
 * worst pickup ever seen on its label. A label never seen is held to the worst pickup on any label.
 * @param {QueueJob[]} jobs a gating run's jobs
 * @param {Record<string, number>} worst worst pickup in milliseconds by label (`notePickups`)
 * @param {number} now the time the jobs were read
 * @returns {{jobId: number, name: string, label: string, ageMs: number, boundMs: number, over: boolean}[]}
 *   one entry per queued job; `over` once its age passes the bound
 */
export function queueAges(jobs, worst, now) {
    // ponytail: an unseen label borrows the worst bound of any label; a per-label seed when one misleads.
    const fallback = Math.max(0, ...Object.values(worst));
    return jobs
        .filter((j) => j.status === "queued" && !j.runner_name)
        .map((j) => {
            const label = labelOf(j);
            const ageMs = now - Date.parse(j.created_at);
            const boundMs = worst[label] ?? fallback;
            return { jobId: j.id, name: j.name, label, ageMs, boundMs, over: ageMs > boundMs };
        });
}
