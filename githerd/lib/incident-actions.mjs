/**
 * The daemon's own incident actions on GitHub, write group `incidents` (design sections 3.1, 3.2,
 * 3.10 and 4.5): the red-head re-run and the parent re-test, the revert pull request, the
 * `intermittent` issue, the re-run of a paid lane out of balance, the CI re-run that
 * recreates a release's expired artifacts, and the "lane not progressing" owner item. Every write
 * goes through the client's write gate, so while the group is not `acting` each one is a `would-do`
 * ledger line and nothing is sent.
 *
 * Spending on paid lanes is bounded by one persisted record, `spent`. Each one-shot write is
 * recorded there before it is sent, and the write gate saves the daemon's state before it sends
 * anything, so a crash between the send and the end of the reconcile loses a re-run rather than
 * doubling it. A write GitHub surely did not take (refused, rate-limited, a 4xx) is taken back off
 * the record, so it is tried again. While the group is not acting nothing is recorded as spent: the
 * would-do is ledgered once (`spent.wouldDo`), and the real write goes out once the group acts.
 *
 * - a job is re-run at most once per (head commit, failure key), whoever asks and why [PF 9.7];
 * - a lane out of balance is re-run once when the owner answers its owner item (the balance is
 *   topped up), never on elapsed time, and never while one of its runs is in progress or no runner
 *   picks its jobs up. A new commit needs no re-run: its push starts the lane by itself, and a
 *   silent top-up shows as that run going green. A balance-rejected job fails about 5 seconds
 *   after it is created and is not charged [PF 9.6];
 * - the creates (the revert pull request, the `intermittent` issue) look on GitHub first for the
 *   one an earlier attempt made, so they are never made twice.
 */
import { notSent } from "./github.mjs";
import { incidentOutcome } from "./incident.mjs";
import { expiredArtifacts } from "./release.mjs";

/** The write group every action here belongs to. */
const GROUP = "incidents";

const MINUTE = 60_000;
/** Labels of a new `intermittent` issue: the repository's type, priority and effort rule. */
const INTERMITTENT_LABELS = ["intermittent", "bug", "priority:high", "effort:medium"];
const CRITICAL = "priority:critical";
/** The line that ties an `intermittent` issue to its failure key. */
const MARKER = "githerd-key: ";
/** The longest log excerpt put into an issue or comment. */
const EXCERPT_MAX = 2000;

const REVERT = `mutation RevertPullRequest($id: ID!, $title: String!, $body: String!) {
  revertPullRequest(input: {pullRequestId: $id, title: $title, body: $body}) {
    revertPullRequest { number }
  }
}`;

/**
 * @typedef {{id: number, runId: number, attempt: number, name: string}} JobRef a job of one run
 *   attempt: its job id, its run, the attempt it ran in, and its name
 * @typedef {{
 *   reruns?: Record<string, {why: string, at: string}>,
 *   backoff?: Record<string, number>,
 *   reverts?: Record<string, number>,
 *   intermittent?: Record<string, number>,
 *   wouldDo?: Record<string, string>,
 * }} Spent the persisted record of what was already done: re-runs by `<sha> <key>`, the run
 *   re-run per answered paid-lane item, revert pull requests by the reverted number, the
 *   `intermittent` issue per `<sha> <key>`, and when each would-do of a group that did not act was
 *   ledgered
 * @typedef {{
 *   key: string, verdict?: "code" | null, redSha: string, redJob: JobRef, parentSha: string | null,
 *   parentJob: JobRef | null, suspects: import("./incident.mjs").Suspect[], confirmed: boolean,
 *   excerpt: string,
 * }} CodeRed one code-red key on master: Claude's verdict on it (`code`, or null while it is
 *   unclassified), the red commit and its failing job, the last green commit and the same job of
 *   its run (null when not known), the first-parent commits between them, whether an earlier
 *   reconcile already saw the key red (the first one posts the merge hold and reads the steps;
 *   design 4.5 steps 1 to 3), and a log excerpt for the issue
 * @typedef {{
 *   lane: string, openedAt: number, retry: boolean, run: {id: number, attempt: number},
 *   running: boolean, notProgressing: boolean,
 * }} PaidLane a lane parked for paid capacity: when its owner item opened, whether that item was
 *   raised again after the owner answered it, its newest red run, whether any of its runs is in
 *   progress, and whether a job sits queued past its pickup bound
 */

/**
 * The owner item for a lane no runner picks up (design 3.10): a job queued past the worst pickup
 * ever seen on its label. Release waits, merges continue, and the lane is not re-run meanwhile.
 * @param {string} lane the lane
 * @param {{name: string, label: string, ageMs: number, boundMs: number, over: boolean}[]} ages the
 *   lane's queued jobs (`queueAges` in lanes.mjs)
 * @returns {{key: string, lane: string, summary: string} | null} the item, or null while every job
 *   is within its bound
 */
export function laneNotProgressing(lane, ages) {
    const over = ages.filter((a) => a.over);
    if (over.length === 0) return null;
    const worst = over.reduce((a, b) => (a.ageMs >= b.ageMs ? a : b), over[0]);
    const min = (/** @type {number} */ ms) => Math.round(ms / MINUTE);
    return {
        key: `lane-not-progressing:${lane}`,
        lane,
        summary:
            `${lane}: ${worst.name} has waited ${min(worst.ageMs)} min for a runner on ${worst.label}, ` +
            `past the worst pickup seen there (${min(worst.boundMs)} min). Check the provider or the account; ` +
            `the release waits, merges continue, and githerd does not re-run the lane until a runner picks it up`,
    };
}

/**
 * A log excerpt as a fenced block, cut to its last `EXCERPT_MAX` characters.
 * @param {string} excerpt the log lines
 * @returns {string} the block, or nothing for an empty excerpt
 */
function fenced(excerpt) {
    const text = excerpt.trim().slice(-EXCERPT_MAX).replaceAll("```", "'''");
    return text ? `\n\n\`\`\`\n${text}\n\`\`\`` : "";
}

/**
 * Creates the incident actions over one GitHub client.
 * @param {{
 *   github: ReturnType<typeof import("./github.mjs").createGitHub>,
 *   repo: string,
 *   spent: Spent,
 *   now?: () => number,
 * }} options the client (its write gate decides dry-run), `owner/name`, the persisted record of
 *   what was already done (mutated in place; the caller saves it), and the clock
 * @returns the actions: `rerun`, `rerunResult`, `codeRed`, `intermittentIssue`, `openRevert`,
 *   `backoff` and `recreateArtifacts`
 */
export function createIncidentActions({ github, repo, spent, now = Date.now }) {
    const reruns = (spent.reruns ??= {});
    const backoffs = (spent.backoff ??= {});
    const reverts = (spent.reverts ??= {});
    const issues = (spent.intermittent ??= {});
    const wouldDo = (spent.wouldDo ??= {});
    const r = `repos/${repo}/`;
    const iso = () => new Date(now()).toISOString();

    /**
     * A one-shot write. While the group does not act, its would-do is ledgered once per `wd` and
     * nothing is spent. Acting, `record[id]` is set to `mark` before the write, which the gate saves
     * before sending, and taken back when GitHub surely did not take the write.
     * @param {string} wd the would-do's key
     * @param {Record<string, any>} record the spent record
     * @param {string} id the entry
     * @param {unknown} mark what the entry holds once spent
     * @param {() => Promise<import("./github.mjs").WriteResult>} write the write
     * @returns {Promise<import("./github.mjs").WriteResult | null>} the write, or null when its
     *   would-do was already ledgered
     */
    async function once(wd, record, id, mark, write) {
        if (!github.acting(GROUP)) {
            if (wouldDo[wd]) return null;
            wouldDo[wd] = iso();
            return write();
        }
        const before = record[id];
        const restore = () => {
            if (before === undefined) delete record[id];
            else record[id] = before;
        };
        record[id] = mark;
        try {
            const res = await write();
            if (!res.performed) restore();
            return res;
        } catch (err) {
            if (notSent(err)) restore();
            throw err;
        }
    }

    /**
     * Re-runs one job, at most once per (head commit, failure key) [PF 9.7]: the same job id names
     * its run, and the run keeps its head commit, so an old run re-tests the old commit. Read back
     * at the run's next attempt, which exists once the re-run (or anyone's) started.
     * @param {JobRef} job the job
     * @param {string} sha its run's head commit
     * @param {string} key the failure key
     * @param {string} why the situation, for the ledger and for a refusal
     * @returns {Promise<{refused: string} | import("./github.mjs").WriteResult>} the write, or why
     *   it was refused
     */
    async function rerun(job, sha, key, why) {
        const id = `${sha} ${key}`;
        const done = reruns[id];
        if (done) return { refused: `${key} was already re-run on ${sha.slice(0, 8)} (${done.why}, ${done.at})` };
        const next = job.attempt + 1;
        const res = await once(`rerun ${id}`, reruns, id, { why, at: iso() }, () =>
            github.write("POST", `${r}actions/jobs/${job.id}/rerun`, undefined, {
                group: GROUP,
                check: { path: `${r}actions/runs/${job.runId}/attempts/${next}`, expect: { run_attempt: next } },
                fields: { situation: why, key, sha },
            }),
        );
        return res ?? { refused: `the would-do of re-running ${key} on ${sha.slice(0, 8)} is already recorded` };
    }

    /**
     * The conclusion of a job's re-run: the job of the same name in the run's next attempt. A re-run
     * someone else started counts the same; none yet (dry-run, or not finished) is null.
     * @param {JobRef} job the job that was re-run
     * @returns {Promise<string | null>} its re-run's conclusion, or null
     */
    async function rerunResult(job) {
        let body;
        try {
            body = (await github.get(`${r}actions/runs/${job.runId}/attempts/${job.attempt + 1}/jobs?per_page=100`))
                .body;
        } catch (err) {
            if (/** @type {{status?: number}} */ (err).status === 404) return null;
            throw err;
        }
        const next = (body?.jobs ?? []).find((/** @type {any} */ j) => j.name === job.name);
        return next?.status === "completed" ? next.conclusion : null;
    }

    /**
     * Files, reopens or updates the one `intermittent` issue of a key, once per (commit, key). An
     * earlier occurrence means this one is on another commit, which makes it critical (design 3.1).
     * The issue is found by its marker line before one is filed, so a filing that a crash or an
     * error interrupted is never repeated; a failure before the comment went out is tried again on
     * the next reconcile.
     * @param {string} key the failure key
     * @param {string} sha the commit it failed and then passed on
     * @param {string} excerpt log lines of the failure
     * @returns {Promise<number | null>} the issue's number; null while the group does not act
     */
    async function intermittentIssue(key, sha, excerpt) {
        const id = `${sha} ${key}`;
        if (issues[id]) return issues[id];
        const acting = github.acting(GROUP);
        if (!acting && wouldDo[`issue ${id}`]) return null;
        const list = (await github.get(`${r}issues?labels=intermittent&state=all&per_page=100`)).body ?? [];
        const found = list.find(
            (/** @type {any} */ i) => !i.pull_request && (i.body ?? "").split("\n").includes(`${MARKER}${key}`),
        );
        const fields = { situation: "intermittent", key, sha };
        const text =
            `\`${key}\` failed on master at ${sha} and passed when githerd re-ran the job on the same commit. ` +
            `A re-run is evidence, not a fix: the cause still needs one.${fenced(excerpt)}`;
        if (!found) {
            const res = await github.write(
                "POST",
                `${r}issues`,
                {
                    title: `Intermittent failure: ${key}`,
                    body: `${text}\n\n${MARKER}${key}`,
                    labels: INTERMITTENT_LABELS,
                },
                { group: GROUP, check: "created", fields },
            );
            if (!res.performed) wouldDo[`issue ${id}`] = iso();
            const n = Number(res.body?.number ?? 0);
            if (n) issues[id] = n;
            return n || null;
        }
        const n = found.number;
        if (acting) issues[id] = n;
        let commented = false;
        try {
            await updateIssue(found, text, fields);
            commented = true;
            await raisePriority(found, fields);
        } catch (err) {
            if (!commented) delete issues[id];
            throw err;
        }
        if (!acting) wouldDo[`issue ${id}`] = iso();
        return acting ? n : null;
    }

    /**
     * Reopens an `intermittent` issue if it was closed, and comments on it.
     * @param {any} found the issue
     * @param {string} text the comment's text
     * @param {Record<string, unknown>} fields ledger fields
     */
    async function updateIssue(found, text, fields) {
        const path = `${r}issues/${found.number}`;
        if (found.state === "closed") {
            await github.write(
                "PATCH",
                path,
                { state: "open" },
                { group: GROUP, check: { path, expect: { state: "open" } }, retry: true, fields },
            );
        }
        await github.write(
            "POST",
            `${path}/comments`,
            { body: `Again: ${text}` },
            { group: GROUP, check: "created", fields },
        );
    }

    /**
     * Makes an `intermittent` issue critical, dropping its other priority labels.
     * @param {any} found the issue
     * @param {Record<string, unknown>} fields ledger fields
     */
    async function raisePriority(found, fields) {
        const labels = (found.labels ?? []).map((/** @type {any} */ l) => (typeof l === "string" ? l : l.name));
        if (labels.includes(CRITICAL)) return;
        const at = `${r}issues/${found.number}/labels`;
        await github.write(
            "POST",
            at,
            { labels: [CRITICAL] },
            { group: GROUP, check: { path: at, expect: [{ name: CRITICAL }] }, retry: true, fields },
        );
        for (const l of labels.filter((x) => x.startsWith("priority:"))) {
            await github.write("DELETE", `${at}/${encodeURIComponent(l)}`, undefined, {
                group: GROUP,
                check: { path: at, lacks: [{ name: l }] },
                retry: true,
                fields,
            });
        }
    }

    /**
     * Opens the revert pull request of the one merge between green and red (GraphQL
     * `revertPullRequest`), once per reverted pull request, and labels it `priority:critical`, which
     * Mergify's priority rule puts first. Its title is GitHub's own revert form,
     * which commitlint ignores. An open pull request with that title (one a crash kept githerd from
     * recording, or one the owner opened) is taken as the revert instead of opening another.
     * @param {number} pr the pull request to revert
     * @param {CodeRed} inc the incident, for the body
     * @returns {Promise<number | null>} the revert pull request's number; null while the group does
     *   not act, or when GitHub's answer named none (the next reconcile finds it by its title)
     */
    async function openRevert(pr, inc) {
        if (reverts[pr]) return reverts[pr];
        if (!github.acting(GROUP) && wouldDo[`revert ${pr}`]) return null;
        const p = (await github.get(`${r}pulls/${pr}`, { fresh: true })).body;
        const title = `Revert "${p.title}"`;
        const list = `${r}pulls?state=open&base=${p.base.ref}&per_page=100`;
        const existing = ((await github.get(list, { fresh: true })).body ?? []).find(
            (/** @type {any} */ x) => x.title === title,
        );
        if (existing) {
            reverts[pr] = existing.number;
            return existing.number;
        }
        const body =
            `Reverts #${pr}. \`${inc.key}\` went red on master at ${inc.redSha}. Re-run on that commit it failed ` +
            `again; the same job of the last green commit ${inc.parentSha} passed when re-run today; and #${pr} is the ` +
            `only pull request merged between them. A re-land job brings the change back with a fix.`;
        const res = await github.mutate(
            REVERT,
            { id: p.node_id, title, body },
            {
                group: GROUP,
                check: { path: list, expect: [{ title }] },
                fields: { situation: "revert", pr, key: inc.key, sha: inc.redSha },
            },
        );
        if (!res.performed) wouldDo[`revert ${pr}`] = iso();
        const n = Number(res.body?.data?.revertPullRequest?.revertPullRequest?.number ?? 0);
        if (!n) return null;
        reverts[pr] = n;
        // A red master's fix goes first in Mergify's queue (its priority rule) and through the hold.
        const at = `${r}issues/${n}/labels`;
        await github.write(
            "POST",
            at,
            { labels: [CRITICAL] },
            {
                group: GROUP,
                check: { path: at, expect: [{ name: CRITICAL }] },
                retry: true,
                fields: { situation: "revert-critical", pr: n },
            },
        );
        return n;
    }

    /**
     * The incident procedure's daemon steps for one code-red key (design 4.5, steps 3 and 4): from
     * the reconcile after its first sighting, re-run the failing job on the red head, then act on
     * the outcome table: an intermittent pass files the issue. While the key has no `code` verdict
     * from Claude nothing else happens, because a re-run is the only reversible step (the owner's
     * decision of 2026-10-05). With one, the same job of the last green commit's run is re-run and a
     * single merge between green and red is reverted. The other outcomes are the worker's.
     * @param {CodeRed} inc the key
     * @returns {Promise<import("./incident.mjs").Outcome
     *   | {outcome: "waiting", waitingFor: "confirmation" | "verdict"}
     *   | (import("./incident.mjs").Outcome & {issue?: number | null, revertPr?: number | null})>} the
     *   outcome, with the issue or revert pull request it led to (null: not made yet)
     */
    async function codeRed(inc) {
        if (!inc.confirmed) return { outcome: "waiting", waitingFor: "confirmation" };
        await rerun(inc.redJob, inc.redSha, inc.key, "red-head-rerun");
        const code = inc.verdict === "code";
        if (code && inc.parentJob && inc.parentSha) await rerun(inc.parentJob, inc.parentSha, inc.key, "parent-retest");
        const redHead = await rerunResult(inc.redJob);
        if (!code && redHead !== "success") return { outcome: "waiting", waitingFor: "verdict" };
        const parent = redHead === "failure" && inc.parentJob ? await rerunResult(inc.parentJob) : null;
        const out = incidentOutcome({ redHead, parent, suspects: inc.suspects });
        if (out.outcome === "intermittent")
            return { ...out, issue: await intermittentIssue(inc.key, inc.redSha, inc.excerpt) };
        if (out.outcome === "revert") return { ...out, revertPr: await openRevert(out.revert.pr, inc) };
        return out;
    }

    /**
     * The re-run of a lane parked for paid capacity (design 3.2): the failed jobs of its newest red
     * run, once per owner item raised again after the owner answered it (he topped the balance
     * up). Nothing before he answers, whatever the time, nothing while a run of the lane is in
     * progress (the balance came back, or someone re-ran it), and nothing while no runner picks its
     * jobs up (design 3.10).
     * @param {PaidLane} item the parked lane
     * @returns {Promise<import("./github.mjs").WriteResult | null>} the write, or null when none is due
     */
    async function backoff(item) {
        const id = `${item.lane} ${new Date(item.openedAt).toISOString()}`;
        if (!item.retry || item.running || item.notProgressing || backoffs[id] !== undefined) return null;
        const next = item.run.attempt + 1;
        return once(`backoff ${id}`, backoffs, id, item.run.id, () =>
            github.write("POST", `${r}actions/runs/${item.run.id}/rerun-failed-jobs`, undefined, {
                group: GROUP,
                check: { path: `${r}actions/runs/${item.run.id}/attempts/${next}`, expect: { run_attempt: next } },
                fields: { situation: "paid-capacity-backoff", lane: item.lane },
            }),
        );
    }

    /**
     * Re-runs the CI run of a green commit whose artifacts expired, read from a release run's gate
     * annotations (design 3.10): the new attempt recreates them and triggers the release when it
     * completes. Once per attempt of that CI run, and not while it is running.
     * @param {{annotation_level: string, message: string}[]} annotations the release gate job's
     * @returns {Promise<import("./github.mjs").WriteResult | null>} the write, or null when none is due
     */
    async function recreateArtifacts(annotations) {
        const hit = expiredArtifacts(annotations);
        if (!hit) return null;
        const path = `${r}actions/runs/${hit.ciRunId}`;
        const run = (await github.get(path, { fresh: true })).body;
        const id = `${hit.sha} release-artifacts ${run.run_attempt}`;
        if (reruns[id] || run.status !== "completed") return null;
        const next = run.run_attempt + 1;
        return once(`rerun ${id}`, reruns, id, { why: "expired-artifacts", at: iso() }, () =>
            github.write("POST", `${path}/rerun`, undefined, {
                group: GROUP,
                check: { path: `${path}/attempts/${next}`, expect: { run_attempt: next } },
                fields: { situation: "expired-artifacts", sha: hit.sha },
            }),
        );
    }

    return { rerun, rerunResult, codeRed, intermittentIssue, openRevert, backoff, recreateArtifacts };
}
