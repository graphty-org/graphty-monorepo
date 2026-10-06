/**
 * A red master's fix (design 4.5 and 4.6): the open pull request that fixes a judged master failure.
 * Once a failing key on a red gating lane has Claude's verdict (code, or environment with a fix in a
 * pull request), githerd links each open pull request by the owner that is that key's fix, so the
 * board shows it beside the incident, and labels it `priority:critical` (write group `incidents`,
 * like the revert pull request the incident procedure opens): Mergify puts it first, master-guard's
 * freeze lets it merge, githerd's own hold lets it through, and its pushes go first in the push
 * queue (`isMasterFix`).
 *
 * A pull request is the fix when it names the incident's issue (master-guard's "Red master: CI
 * failed on <sha>" or "<lane> lane red on master", or an incident key's `intermittent` issue) as one
 * it closes or in its description; when a session reported it as the fix (a verdict's reason names
 * it, or an incident job made it or reported it); or when its description names a judged failure
 * key. Touching the same package is not enough.
 */
import { byOwner, TERMINAL } from "./board.mjs";

export const CRITICAL = "priority:critical";
/** The titles of the issues master-guard opens for a red master lane. */
const GUARD_TITLE = /^(Red master: CI failed on [0-9a-f]{7,40}|.+ lane red on master)$/;

/**
 * The failure keys on red master lanes that have Claude's verdict, with the verdict's reason.
 * @param {any} state the daemon state
 * @returns {{key: string, reason: string}[]} the keys
 */
function judgedKeys(state) {
    const keys = [];
    for (const lane of Object.values(state.master?.lanes ?? {})) {
        const l = /** @type {any} */ (lane);
        if (l.verdict !== "red") continue;
        for (const j of l.redJobs ?? []) {
            const v = j.key && l.verdicts?.[j.key];
            if (v) keys.push({ key: j.key, reason: String(v.reason ?? "") });
        }
    }
    return keys;
}

/**
 * The open issues that stand for the red master: master-guard's, and the open incident keys'
 * `intermittent` issues.
 * @param {any} state the daemon state
 * @returns {Set<number>} their numbers
 */
function incidentIssues(state) {
    const out = new Set();
    for (const [n, i] of Object.entries(state.issues?.byNumber ?? {})) {
        const title = String(/** @type {any} */ (i).text ?? "").split("\n")[0];
        if (/** @type {any} */ (i).state === "open" && GUARD_TITLE.test(title)) out.add(Number(n));
    }
    for (const inc of Object.values(state.incidents ?? {})) {
        if (/** @type {any} */ (inc).status !== "open") continue;
        for (const k of Object.values(/** @type {any} */ (inc).keys ?? {})) if (k.issue) out.add(Number(k.issue));
    }
    return out;
}

/**
 * The pull requests a session reported as the fix: named in a verdict's reason, or made or
 * reported by an incident job.
 * @param {any} state the daemon state
 * @param {{reason: string}[]} keys the judged keys
 * @returns {Set<number>} their numbers
 */
function reportedFixes(state, keys) {
    const out = new Set();
    for (const k of keys) for (const m of k.reason.matchAll(/#(\d+)/g)) out.add(Number(m[1]));
    for (const j of Object.values(state.jobs ?? {})) {
        const job = /** @type {any} */ (j);
        if (job.kind !== "incident" || TERMINAL.includes(job.state)) continue;
        for (const n of [job.pr, job.report?.pr]) if (n) out.add(Number(n));
    }
    return out;
}

/**
 * Why one open pull request is the red master's fix, or null.
 * @param {any} node the pull request, as the poll's query returns it
 * @param {{keys: {key: string}[], issues: Set<number>, reported: Set<number>}} facts the judged
 *   keys, the incident's issues and the reported fixes
 * @returns {string | null} why
 */
function fixReason(node, { keys, issues, reported }) {
    const body = String(node.body ?? "");
    const closes = (node.closingIssuesReferences?.nodes ?? []).map((/** @type {any} */ i) => Number(i.number));
    const named = [...body.matchAll(/#(\d+)\b/g)].map((m) => Number(m[1]));
    const issue = [...closes, ...named].find((n) => issues.has(n));
    if (issue) return `names #${issue}, the red master's issue`;
    if (reported.has(Number(node.number))) return "reported as the fix";
    const key = keys.find((k) => body.includes(k.key));
    return key ? `names ${key.key}` : null;
}

/**
 * Links the red master's fix pull requests, every poll: `state.master.fixPrs` is
 * `[{pr, why, labelled}]`, empty while no failing key is judged (master green drops the verdicts).
 * `labelled` (the label write: "sent" or "would-do") carries over from the poll before.
 * @param {any} state the daemon state, changed in place
 * @param {any[]} nodes the open pull requests, as the poll's query returns them
 * @returns {{pr: number, why: string}[]} the links new since the poll before
 */
export function linkMasterFix(state, nodes) {
    const m = (state.master ??= {});
    const before = new Map((m.fixPrs ?? []).map((/** @type {any} */ f) => [f.pr, f]));
    const keys = judgedKeys(state);
    const facts = { keys, issues: incidentIssues(state), reported: reportedFixes(state, keys) };
    const branch = m.branch ?? "master";
    m.fixPrs = [];
    for (const node of keys.length ? nodes : []) {
        if (node.baseRefName !== branch || !byOwner(state, node.author?.login)) continue;
        const why = fixReason(node, facts);
        if (!why) continue;
        const labels = (node.labels?.nodes ?? []).map((/** @type {any} */ l) => l.name);
        const labelled = labels.includes(CRITICAL) ? "present" : (before.get(node.number)?.labelled ?? null);
        m.fixPrs.push({ pr: node.number, why, labelled });
    }
    return m.fixPrs
        .filter((/** @type {any} */ f) => !before.has(f.pr))
        .map((/** @type {any} */ f) => ({ pr: f.pr, why: f.why }));
}

/**
 * Labels each linked fix `priority:critical` through the write gate (group `incidents`): once when
 * the group acts, and one would-do line while it does not.
 * @param {{write: Function, acting: (group: string) => boolean}} github the client
 * @param {string} repo `owner/name`
 * @param {any} state the daemon state; each fix's `labelled` is updated in place
 */
export async function labelMasterFixes(github, repo, state) {
    for (const f of state.master?.fixPrs ?? []) {
        if (f.labelled === "present" || f.labelled === "sent") continue;
        if (f.labelled === "would-do" && !github.acting("incidents")) continue;
        const at = `repos/${repo}/issues/${f.pr}/labels`;
        const res = await github.write(
            "POST",
            at,
            { labels: [CRITICAL] },
            {
                group: "incidents",
                check: { path: at, expect: [{ name: CRITICAL }] },
                retry: true,
                fields: { situation: "master-fix-critical", pr: f.pr, why: f.why },
            },
        );
        f.labelled = res.performed ? "sent" : "would-do";
    }
}

/**
 * Whether a job's pushes are a red master's fix, so they go first in the push queue
 * (`PUSH_QUEUE_PRIORITY=critical`): an incident job's, or one whose pull request is a linked fix.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @returns {boolean} true for a fix
 */
export function isMasterFix(state, job) {
    if (job?.kind === "incident") return true;
    return Boolean(job?.pr) && (state.master?.fixPrs ?? []).some((/** @type {any} */ f) => f.pr === Number(job.pr));
}
