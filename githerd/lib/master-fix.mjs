/**
 * A red master's fix (design 4.5 and 4.6): the open pull request that fixes a judged master failure.
 * Once a failing key on a red gating lane has Claude's verdict (code, or environment with a fix in a
 * pull request), githerd links each open pull request by the owner that is that key's fix, so the
 * board shows it beside the incident, and labels one of them `priority:critical` (write group `master-fix`, its
 * own so it can act while `incidents`, whose reverts the owner leaves to master-guard, stays
 * dry-run; the gate adopts `actions.masterFix` once one dry-run poll has logged a would-do line of
 * it, as for any group): Mergify puts it first, master-guard's
 * freeze lets it merge, githerd's own hold lets it through, and its pushes go first in the push
 * queue (`isMasterFix`).
 *
 * A pull request is the fix when it names the incident's issue (master-guard's "Red master: CI
 * failed on <sha>" or "<lane> lane red on master", or an incident key's `intermittent` issue) as one
 * it closes or in its description; when a session reported it as the fix (a verdict's reason names
 * it, or an incident job made it or reported it); when its description names a judged failure key;
 * or when its title names the key's failing step (`Security audit` of `CI / Build / Security
 * audit`), as a title says what a pull request is for. Touching the same package is not enough.
 */
import { byOwner, TERMINAL } from "./board.mjs";

export const CRITICAL = "priority:critical";
/** The titles of the issues master-guard opens for a red master lane. */
const GUARD_TITLE = /^(Red master: CI failed on [0-9a-f]{7,40}|.+ lane red on master)$/;
/** The write group of the label. */
const GROUP = "master-fix";

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
export function fixReason(node, { keys, issues, reported }) {
    const body = String(node.body ?? "");
    const closes = (node.closingIssuesReferences?.nodes ?? []).map((/** @type {any} */ i) => Number(i.number));
    const named = [...body.matchAll(/#(\d+)\b/g)].map((m) => Number(m[1]));
    const issue = [...closes, ...named].find((n) => issues.has(n));
    if (issue) return `names #${issue}, the red master's issue`;
    if (reported.has(Number(node.number))) return "reported as the fix";
    const key = keys.find((k) => body.includes(k.key));
    if (key) return `names ${key.key}`;
    // ponytail: a generic step name ("Run tests") in a title links too eagerly; require the job name
    // too if that ever labels a pull request that is not the fix.
    const title = String(node.title ?? "").toLowerCase();
    const step = keys.find((k) => title.includes(String(k.key.split(" / ").at(-1)).toLowerCase()));
    return step ? `its title names ${step.key}` : null;
}

/**
 * Whether an open pull request names a judged key, or its failing step, in its title or body: one
 * that already carries `priority:critical` is the incident's critical fix, whoever labelled it.
 * @param {any} node the pull request
 * @param {{key: string}[]} keys the judged keys
 * @returns {boolean} true when it names one
 */
function namesKey(node, keys) {
    const text = `${node.title ?? ""}\n${node.body ?? ""}`.toLowerCase();
    return keys.some((k) => [k.key, String(k.key.split(" / ").at(-1))].some((s) => text.includes(s.toLowerCase())));
}

/**
 * The one linked fix to label `priority:critical`, or null (design 4.6): a red master gets one
 * critical fix, since each critical pull request entering Mergify's queue interrupts the running
 * batches. None while an open pull request that is a fix or names a judged key already carries the
 * label (someone else's label is never removed); else the fix chosen before while it is open (or
 * merged), else the one a session reported, else the oldest.
 * @param {any} state the daemon state
 * @param {any[]} nodes the open pull requests on the default branch
 * @param {{keys: {key: string}[], issues: Set<number>, reported: Set<number>}} facts the facts
 * @returns {number | null} its number
 */
function criticalTarget(state, nodes, facts) {
    const m = state.master;
    const labelled = nodes.some(
        (n) =>
            (n.labels?.nodes ?? []).some((/** @type {any} */ l) => l.name === CRITICAL) &&
            (fixReason(n, facts) !== null || namesKey(n, facts.keys)),
    );
    const linked = m.fixPrs.map((/** @type {any} */ f) => f.pr);
    const chosen = m.criticalFix;
    if (chosen && !linked.includes(chosen.pr)) {
        // ponytail: "merged" is the merge scan's record of this poll's head; a search that lags a
        // poll reads a merged fix as closed unmerged. Ask GitHub for the pull request if that bites.
        chosen.merged ||= (state.merged?.pending ?? []).some((/** @type {any} */ p) => p.number === chosen.pr);
        if (!chosen.merged) m.criticalFix = null;
    }
    if (labelled) return null;
    if (m.criticalFix) return m.criticalFix.merged ? null : m.criticalFix.pr;
    const pick = linked.find((/** @type {number} */ n) => facts.reported.has(n)) ?? Math.min(...linked);
    if (!Number.isFinite(pick)) return null;
    m.criticalFix = { pr: pick, merged: false };
    return pick;
}

/**
 * Links the red master's fix pull requests, every poll: `state.master.fixPrs` is
 * `[{pr, why, labelled, critical}]`, empty while no failing key is judged (master green drops the
 * verdicts). `critical` marks the one fix to label (`criticalTarget`); the others are shown as also
 * fixing the red master. `labelled` (the label write: "sent" or "would-do") carries over from the
 * poll before.
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
    const open = keys.length ? nodes.filter((n) => n.baseRefName === branch) : [];
    m.fixPrs = [];
    for (const node of open) {
        if (!byOwner(state, node.author?.login)) continue;
        const why = fixReason(node, facts);
        if (!why) continue;
        const labels = (node.labels?.nodes ?? []).map((/** @type {any} */ l) => l.name);
        const labelled = labels.includes(CRITICAL) ? "present" : (before.get(node.number)?.labelled ?? null);
        m.fixPrs.push({ pr: node.number, why, labelled, critical: false });
    }
    if (!keys.length) m.criticalFix = null;
    const target = keys.length ? criticalTarget(state, open, facts) : null;
    for (const f of m.fixPrs) f.critical = f.pr === target;
    return m.fixPrs
        .filter((/** @type {any} */ f) => !before.has(f.pr))
        .map((/** @type {any} */ f) => ({ pr: f.pr, why: f.why }));
}

/**
 * Labels the one linked fix marked `critical` `priority:critical` through the write gate (group
 * `master-fix`): once when the group acts, and one would-do line while it does not.
 * @param {{write: Function, acting: (group: string) => boolean}} github the client
 * @param {string} repo `owner/name`
 * @param {any} state the daemon state; each fix's `labelled` is updated in place
 */
export async function labelMasterFixes(github, repo, state) {
    for (const f of state.master?.fixPrs ?? []) {
        if (!f.critical || f.labelled === "present" || f.labelled === "sent") continue;
        if (f.labelled === "would-do" && !github.acting(GROUP)) continue;
        const at = `repos/${repo}/issues/${f.pr}/labels`;
        const res = await github.write(
            "POST",
            at,
            { labels: [CRITICAL] },
            {
                group: GROUP,
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
