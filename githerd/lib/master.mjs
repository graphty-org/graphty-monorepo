/**
 * The default branch's lanes and verdict (design section 6.4). Every function here is pure over
 * plain data: workflow runs and commits as the GitHub REST API returns them, lane records as
 * `state.json` keeps them (design section 5.1), and the normalized config. Times are epoch
 * milliseconds in and ISO strings in the records.
 */

/** Default for `lanes.<x>.maxMinutes`. */
const DEFAULT_MAX_MINUTES = 180;

/** How many recent commits a lane remembers the outcome of. */
const SHA_MEMORY = 50;

const RED = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * @typedef {{id: number, run_attempt: number, head_sha: string, status: string,
 *   conclusion: string | null, updated_at?: string, workflow_id?: number, name?: string,
 *   head_branch?: string}} WorkflowRun
 * @typedef {{sha: string, parents?: {sha: string}[],
 *   commit: {message: string, committer?: {date: string}, author?: {date: string}}}} Commit
 * @typedef {"green" | "red" | "neutral" | "running"} Outcome
 * @typedef {{runId: number | null, attempt: number | null, sha: string | null,
 *   conclusion: string | null, verdict: "green" | "red" | "unknown", updatedAt: string | null,
 *   pendingRed: {runId: number, attempt: number, conclusion: string, sha: string, seenAt: string} | null,
 *   inFlight: Record<string, {sha: string, firstSeenAt: string, reportedAt?: string}>,
 *   shas: Record<string, Outcome>}} LaneRecord
 * @typedef {{lane: string, runId: number, sha: string, firstSeenAt: string, minutes: number}} StuckRun
 * @typedef {{event: string, lane: string, runId: number, attempt?: number, sha: string,
 *   conclusion?: string, firstSeenAt?: string, minutes?: number}} LaneEvent
 */

/**
 * The outcome class of a completed run's conclusion.
 * @param {string | null} conclusion the run's conclusion
 * @returns {Outcome} green, red, or neutral (cancelled, skipped, neutral, action_required)
 */
function classify(conclusion) {
    if (conclusion === "success") return "green";
    return RED.has(conclusion) ? "red" : "neutral";
}

/**
 * Orders runs newest first: higher id, then higher attempt.
 * @param {WorkflowRun} a a run
 * @param {WorkflowRun} b a run
 * @returns {number} the sort order
 */
function newestFirst(a, b) {
    return b.id - a.id || b.run_attempt - a.run_attempt;
}

/**
 * Folds one poll's runs of a lane's workflow into its saved record.
 * @param {string} name the lane id
 * @param {LaneRecord | undefined} saved the lane's record from the last poll
 * @param {WorkflowRun[]} runs the workflow's newest runs on the default branch
 * @param {{lanes: Record<string, {gating: string, maxMinutes: number | null}>}} config the config
 * @param {number} now the poll's time
 * @returns {{lane: LaneRecord, events: LaneEvent[]}} the new record and what changed: `lane-red`
 *   (red confirmed by a second sighting), `lane-green` (green after red or unknown) and
 *   `lane-stuck` (a gating lane's run queued or running past `maxMinutes`, once per run)
 */
export function updateLane(name, saved, runs, config, now) {
    const at = new Date(now).toISOString();
    /** @type {LaneRecord} */
    const prev = saved ?? {
        runId: null,
        attempt: null,
        sha: null,
        conclusion: null,
        verdict: "unknown",
        updatedAt: null,
        pendingRed: null,
        inFlight: {},
        shas: {},
    };
    /** @type {LaneRecord} */
    const lane = { ...prev, inFlight: {}, shas: { ...prev.shas } };
    const sorted = [...runs].sort(newestFirst);
    recordShas(lane, sorted);
    const events = trackInFlight(lane, prev, sorted, name, config.lanes[name], now);

    const done = sorted.find((r) => r.status === "completed");
    const backwards =
        done &&
        prev.runId !== null &&
        (done.id < prev.runId || (done.id === prev.runId && done.run_attempt < prev.attempt));
    if (!done || backwards) return { lane, events };
    applyDone(lane, prev, done, name, at, events);
    return { lane, events };
}

/**
 * Records what each recent commit's newest run says (the verdict and greenSha are read from this),
 * keeping the last SHA_MEMORY commits.
 * @param {LaneRecord} lane the record being built
 * @param {WorkflowRun[]} sorted the runs, newest first
 */
function recordShas(lane, sorted) {
    const seen = new Set();
    for (const r of sorted) {
        if (seen.has(r.head_sha)) continue;
        seen.add(r.head_sha);
        delete lane.shas[r.head_sha];
        lane.shas[r.head_sha] = r.status === "completed" ? classify(r.conclusion) : "running";
    }
    const keys = Object.keys(lane.shas);
    for (const k of keys.slice(0, Math.max(0, keys.length - SHA_MEMORY))) delete lane.shas[k];
}

/**
 * Records the runs in flight, and a `lane-stuck` event once for a gating lane's run queued or
 * running past `maxMinutes`.
 * @param {LaneRecord} lane the record being built
 * @param {LaneRecord} prev the record from the last poll
 * @param {WorkflowRun[]} sorted the runs, newest first
 * @param {string} name the lane id
 * @param {{gating: string, maxMinutes: number | null} | undefined} laneConfig the lane's config
 * @param {number} now the poll's time
 * @returns {LaneEvent[]} the events
 */
function trackInFlight(lane, prev, sorted, name, laneConfig, now) {
    const at = new Date(now).toISOString();
    const maxMs = (laneConfig?.maxMinutes ?? DEFAULT_MAX_MINUTES) * 60_000;
    /** @type {LaneEvent[]} */
    const events = [];
    for (const r of sorted) {
        if (r.status === "completed") continue;
        const entry = { ...(prev.inFlight?.[r.id] ?? { sha: r.head_sha, firstSeenAt: at }) };
        const age = now - Date.parse(entry.firstSeenAt);
        if (laneConfig?.gating !== "watch" && age > maxMs && !entry.reportedAt) {
            entry.reportedAt = at;
            events.push({
                event: "lane-stuck",
                lane: name,
                runId: r.id,
                sha: entry.sha,
                firstSeenAt: entry.firstSeenAt,
                minutes: Math.floor(age / 60_000),
            });
        }
        lane.inFlight[r.id] = entry;
    }
    return events;
}

/**
 * Applies the newest completed run: green at once, red only on a second sighting of the same
 * attempt and conclusion; any other conclusion leaves the verdict as it was.
 * @param {LaneRecord} lane the record being built
 * @param {LaneRecord} prev the record from the last poll
 * @param {WorkflowRun} done the newest completed run
 * @param {string} name the lane id
 * @param {string} at the poll's time, ISO
 * @param {LaneEvent[]} events gets `lane-green` or `lane-red`
 */
function applyDone(lane, prev, done, name, at, events) {
    const outcome = classify(done.conclusion);
    const ref = {
        lane: name,
        runId: done.id,
        attempt: done.run_attempt,
        sha: done.head_sha,
        conclusion: done.conclusion,
    };
    Object.assign(lane, {
        runId: done.id,
        attempt: done.run_attempt,
        sha: done.head_sha,
        conclusion: done.conclusion,
        updatedAt: done.updated_at ?? at,
    });
    if (outcome !== "red") {
        // Green, or cancelled, skipped, neutral, action_required: the previous verdict stands.
        lane.pendingRed = null;
        if (outcome !== "green") return;
        lane.verdict = "green";
        if (prev.verdict !== "green") events.push({ event: "lane-green", ...ref });
        return;
    }
    const p = prev.pendingRed;
    const second = p?.runId === done.id && p.attempt === done.run_attempt && p.conclusion === done.conclusion;
    const confirmed = prev.verdict === "red" && prev.runId === done.id && prev.attempt === done.run_attempt;
    if (second) {
        lane.pendingRed = null;
        lane.verdict = "red";
        if (prev.verdict !== "red") events.push({ event: "lane-red", ...ref });
    } else if (!confirmed) {
        lane.pendingRed = {
            runId: done.id,
            attempt: done.run_attempt,
            conclusion: done.conclusion,
            sha: done.head_sha,
            seenAt: at,
        };
    }
}

/**
 * Every gating lane's run that has been queued or running longer than its `maxMinutes`.
 * @param {Record<string, LaneRecord>} lanes the lane records
 * @param {{lanes: Record<string, {gating: string, maxMinutes: number | null}>}} config the config
 * @param {number} now the current time
 * @returns {StuckRun[]} the stuck runs
 */
export function stuckLaneRuns(lanes, config, now) {
    /** @type {StuckRun[]} */
    const out = [];
    for (const [name, laneConfig] of Object.entries(config.lanes)) {
        if (laneConfig.gating === "watch") continue;
        const maxMs = (laneConfig.maxMinutes ?? DEFAULT_MAX_MINUTES) * 60_000;
        for (const [id, entry] of Object.entries(lanes[name]?.inFlight ?? {})) {
            const age = now - Date.parse(entry.firstSeenAt);
            if (age > maxMs) {
                out.push({
                    lane: name,
                    runId: Number(id),
                    sha: entry.sha,
                    firstSeenAt: entry.firstSeenAt,
                    minutes: Math.floor(age / 60_000),
                });
            }
        }
    }
    return out;
}

/**
 * The first-parent chain starting at a commit, within the commits given.
 * @param {Commit[]} commits commits, as `GET repos/{repo}/commits` returns them
 * @param {string} start the sha to start from
 * @returns {Commit[]} the chain, newest first; empty when `start` is not among the commits
 */
function firstParent(commits, start) {
    const bySha = new Map(commits.map((c) => [c.sha, c]));
    const chain = [];
    for (let c = bySha.get(start); c && !chain.includes(c); c = bySha.get(c.parents?.[0]?.sha)) chain.push(c);
    return chain;
}

/**
 * Whether a commit is verified green on every gating lane.
 * @param {Record<string, LaneRecord>} lanes the lane records
 * @param {{lanes: Record<string, {gating: string}>}} config the config
 * @param {string} sha the commit
 * @param {(lane: string, sha: string) => boolean} [excuse] a lane's missing answer to accept anyway
 * @returns {boolean} true when every required lane passed on it and no path-filtered lane failed
 *   or is still running on it
 */
function verified(lanes, config, sha, excuse = () => false) {
    return Object.entries(config.lanes).every(([name, { gating }]) => {
        if (gating === "watch") return true;
        const outcome = lanes[name]?.shas?.[sha];
        if (outcome === "green" || excuse(name, sha)) return true;
        return gating === "if-run" && outcome === undefined;
    });
}

/**
 * The default branch's verdict.
 * @param {Record<string, LaneRecord>} lanes the lane records
 * @param {{lanes: Record<string, {gating: string}>}} config the config
 * @param {{headSha: string, commits: Commit[], greenSha?: string | null}} branch the branch's head,
 *   its recent commits, and the last known `greenSha`
 * @returns {{verdict: "green" | "red" | "unknown", greenSha: string | null, pending: boolean}} red
 *   when a gating lane is red, green when every required lane is green, else unknown; `greenSha`
 *   the newest first-parent commit verified on every gating lane (the last known one when none of
 *   the given commits is); `pending` while the head is newer than `greenSha`
 */
export function masterVerdict(lanes, config, { headSha, commits, greenSha = null }) {
    const gating = Object.entries(config.lanes).filter(([, l]) => l.gating !== "watch");
    /** @type {"green" | "red" | "unknown"} */
    let verdict = "green";
    if (gating.some(([name]) => lanes[name]?.verdict === "red")) verdict = "red";
    else if (gating.some(([name, l]) => l.gating === "required" && lanes[name]?.verdict !== "green"))
        verdict = "unknown";

    const newest = firstParent(commits, headSha).find((c) => verified(lanes, config, c.sha));
    const green = newest?.sha ?? greenSha;
    return { verdict, greenSha: green, pending: headSha !== green };
}

/**
 * The pull request a first-parent commit landed, from its message.
 * @param {string} message the commit message
 * @returns {number | null} the PR number of a merge commit or a squash merge, else null
 */
function prOf(message) {
    const subject = message.split("\n", 1)[0];
    const m = /^Merge pull request #(\d+)/.exec(subject) ?? /\(#(\d+)\)\s*$/.exec(subject);
    return m ? Number(m[1]) : null;
}

/**
 * The commits that could have turned the branch red: the first-parent chain from the red commit
 * back to, but not including, the last green one.
 * @param {Commit[]} commits commits, as `GET repos/{repo}/commits` returns them
 * @param {string | null} lastGreenSha the last commit verified green
 * @param {string} redSha the commit a lane went red on
 * @returns {{sha: string, pr: number | null}[]} the suspects, newest first; every given commit on
 *   the chain when the last green one is not among them
 */
export function findSuspects(commits, lastGreenSha, redSha) {
    const chain = firstParent(commits, redSha);
    const end = chain.findIndex((c) => c.sha === lastGreenSha);
    return chain.slice(0, end === -1 ? chain.length : end).map((c) => ({ sha: c.sha, pr: prOf(c.commit.message) }));
}

/**
 * The release lane's state. Eligible means a commit newer than the last release commit is green on
 * every gating lane, or would be but for a stuck lane run.
 * @param {{lastRelease?: {sha: string, at: string} | null, releaseEligibleSince?: string | null} | undefined} saved
 *   the saved `master` record
 * @param {Record<string, LaneRecord>} lanes the lane records; the lane named `release` is the
 *   release workflow
 * @param {{lanes: Record<string, {gating: string, maxMinutes: number | null}>,
 *   release: {commitPattern: string, stallHours: number} | null}} config the config
 * @param {Commit[]} commits the branch's recent commits, head first
 * @param {number} now the current time
 * @returns {{lastRelease: {sha: string, at: string} | null, releaseEligibleSince: string | null,
 *   failed: boolean, stalled: boolean, stuckOnly: boolean}} `failed` while the release lane is red;
 *   `stalled` when eligible for longer than `release.stallHours`; `stuckOnly` when only a stuck lane
 *   run stands between the branch and eligibility
 */
export function releaseState(saved, lanes, config, commits, now) {
    const failed = lanes.release?.verdict === "red";
    if (!config.release)
        return { lastRelease: null, releaseEligibleSince: null, failed, stalled: false, stuckOnly: false };

    const pattern = new RegExp(config.release.commitPattern);
    const chain = firstParent(commits, commits[0]?.sha);
    const i = chain.findIndex((c) => pattern.test(c.commit.message));
    const found = chain[i];
    const lastRelease = found
        ? { sha: found.sha, at: found.commit.committer?.date ?? found.commit.author?.date ?? null }
        : (saved?.lastRelease ?? null);
    const newer = i === -1 ? chain : chain.slice(0, i);

    const stuck = new Set(stuckLaneRuns(lanes, config, now).map((s) => `${s.lane}@${s.sha}`));
    const green = newer.some((c) => verified(lanes, config, c.sha));
    const stuckOnly =
        !green && newer.some((c) => verified(lanes, config, c.sha, (lane, sha) => stuck.has(`${lane}@${sha}`)));

    const sameRelease = saved?.lastRelease?.sha === lastRelease?.sha;
    const releaseEligibleSince =
        green || stuckOnly ? (sameRelease && saved?.releaseEligibleSince) || new Date(now).toISOString() : null;
    const stalled =
        releaseEligibleSince !== null && now - Date.parse(releaseEligibleSince) > config.release.stallHours * 3_600_000;
    return { lastRelease, releaseEligibleSince, failed, stalled, stuckOnly };
}

/** Runs remembered per workflow and branch for sightings; an older unseen run is stale. */
export const SIGHTING_MEMORY = 100;

/**
 * @typedef {Record<string, Record<string, [number, string]>>} SightingRecord per
 *   `<workflow>@<branch>`, per run id, the attempt and `updated_at` of its last sighting
 */

/**
 * Picks the sightings out of one runs answer (design 1.4). A sighting is an answer about a run whose
 * (run attempt, `updated_at`) is newer than the last answer seen for that run, so a repeat or a
 * backwards answer is none and a re-run's new attempt is one, even on an older run. A run githerd
 * has not seen is a sighting unless its id is below every run the last poll remembered for its
 * workflow and branch: such a run is stale, not news (the backwards answers of 10-02 named a
 * two-day-old run that had already left the first page).
 * @param {SightingRecord} saved the record from the last poll
 * @param {WorkflowRun[]} runs one answer's runs (`workflow_id` or `name` names the workflow)
 * @param {string} branch the branch polled, for runs that do not carry `head_branch`
 * @returns {{record: SightingRecord, sightings: WorkflowRun[]}} the new record, and the sightings
 *   oldest `updated_at` first
 */
export function sightRuns(saved, runs, branch) {
    /** @type {SightingRecord} */
    const record = {};
    for (const [key, seen] of Object.entries(saved)) record[key] = { ...seen };
    /** @type {WorkflowRun[]} */
    const sightings = [];
    for (const run of runs) {
        const key = `${run.workflow_id ?? run.name}@${run.head_branch ?? branch}`;
        const seen = (record[key] ??= {});
        const last = seen[run.id];
        const known = Object.keys(saved[key] ?? {}).map(Number);
        const floor = known.length > 0 ? Math.min(...known) : -Infinity;
        const updated = run.updated_at ?? "";
        if (last) {
            if (run.run_attempt < last[0] || (run.run_attempt === last[0] && updated <= last[1])) continue;
        } else if (run.id < floor) {
            continue;
        }
        seen[run.id] = [run.run_attempt, updated];
        const newest = Object.keys(seen)
            .map(Number)
            .sort((a, b) => b - a);
        for (const id of newest.slice(SIGHTING_MEMORY)) delete seen[id];
        sightings.push(run);
    }
    sightings.sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? "") || a.id - b.id);
    return { record, sightings };
}
