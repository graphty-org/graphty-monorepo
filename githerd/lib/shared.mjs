/**
 * Shared failures across pull requests while master is green (design 4.4, class 5): the same
 * failure key, failing under the summary checks of `sharedFailurePrs` (3 by default) open pull
 * requests, is one shared cause, not each pull request's own. githerd then offers no `pr` job for a
 * pull request that fails only on shared keys, shows the key on the board, and offers one
 * `incident` job (scope `shared`) to find and fix the cause, unless an open pull request is already
 * its fix (found as `lib/master-fix.mjs` finds a red master's fix) or a held job names the key.
 *
 * - **Counted:** a pull request's failure keys (`rec.failureKeys`, prs.mjs), unless its failure is
 *   inherited from a red master (classify.mjs `inherited` comes first). Test jobs never count: the
 *   flaky-test tracker (flakes.mjs) owns them, test by test, and files their issues, so the two
 *   never double-count a test or both raise it.
 * - **Kept:** once declared, a key stays shared while any open pull request still fails it, so the
 *   last stale pull requests do not each become a job while the fix is under way.
 * - **Ended, by events:** no open pull request fails the key; its shared job is done (its done check
 *   saw the job pass on master's fix and on a canary pull request); or its linked fix pull request
 *   merged. The pull requests still failing then are settled at their heads: each is its own again
 *   (its `pr` job updates it from master), and only new heads count toward a new shared failure.
 *
 * `state.sharedFailures` is `{[key]: {shared, since, prs, fix, settled}}`: `prs` the pull requests
 * failing it now, `fix` the linked fix `{pr, why}`, `settled` the heads by pull request that no
 * longer count.
 */

import { byOwner, TERMINAL } from "./board.mjs";
import { isTestJob } from "./flakes.mjs";
import { failureKey } from "./lanes.mjs";
import { fixReason } from "./master-fix.mjs";
import { newestContexts } from "./prs.mjs";

/**
 * The job name a failure key names (`CI / Links / Check links` -> `Links`).
 * @param {string} key the key
 * @returns {string} the job
 */
const jobOf = (key) => key.split(" / ")[1] ?? key;

/**
 * The board's words for a shared key.
 * @param {string} key the key
 * @param {number} n the pull requests failing it
 * @returns {string} the words
 */
const words = (key, n) => `${jobOf(key)} failing on ${n} PR${n === 1 ? "" : "s"}: shared cause`;

/**
 * The live or finished `incident` job of a shared key.
 * @param {any} state the daemon state
 * @param {string} key the key
 * @returns {any} the job, or undefined
 */
const sharedJob = (state, key) =>
    Object.values(state.jobs ?? {}).find(
        (j) => j.kind === "incident" && j.facts?.scope === "shared" && j.facts?.key === key,
    );

/**
 * The open pull request that fixes a key: by the owner, and either linked as master-fix.mjs links a
 * red master's fix (naming the key in its description or its failing step in its title), or one
 * whose newest run of the key's job passed, on a run started after the key became shared, while
 * the other pull requests still fail it.
 * ponytail: a fix whose run has not finished is not linked yet (the workflow's YAML would say which
 * file the failing step runs); read it if a worker takes the job in that window.
 * @param {any} state the daemon state
 * @param {any[]} nodes the open pull requests
 * @param {string} key the key
 * @param {any} r the key's record
 * @returns {{pr: number, why: string} | null} the fix
 */
function findFix(state, nodes, key, r) {
    const facts = { keys: [{ key }], issues: new Set(), reported: new Set() };
    const mine = nodes.filter((node) => byOwner(state, node.author?.login));
    for (const node of mine) {
        const why = fixReason(node, facts);
        if (why) return { pr: Number(node.number), why };
    }
    const pass = mine.find((node) => !r.prs.includes(Number(node.number)) && passesSince(node, key, r.since));
    const n = r.prs.length;
    const why = `passes ${jobOf(key)} while ${n} PR${n === 1 ? " fails" : "s fail"} it`;
    return pass ? { pr: Number(pass.number), why } : null;
}

/**
 * Whether a pull request's newest run of a key's job passed and started at or after a time.
 * @param {any} node the pull request
 * @param {string} key the key
 * @param {string} since when the key became shared
 * @returns {boolean} true when it passed
 */
function passesSince(node, key, since) {
    const [workflow] = key.split(" / ");
    const contexts = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? [];
    return [...newestContexts(contexts).values()].some(
        (c) =>
            c.__typename === "CheckRun" &&
            jobOf(failureKey(workflow, c.name)) === jobOf(key) &&
            (c.checkSuite?.workflowRun?.workflow?.name ?? workflow) === workflow &&
            c.conclusion === "SUCCESS" &&
            String(c.startedAt ?? "") >= since,
    );
}

/**
 * Why a shared key ended this poll, or null.
 * @param {any} state the daemon state
 * @param {any} r the key's record
 * @param {string} key the key
 * @param {Set<number>} open the open pull requests
 * @returns {string | null} why
 */
function endedBy(state, r, key, open) {
    if (!r.prs.length) return "no open pull request fails it";
    const job = sharedJob(state, key);
    if (job?.state === "done" && job.stateSince >= r.since) return "its shared job is done";
    const fix = r.fix?.pr;
    const merged = (state.merged?.pending ?? []).some((/** @type {any} */ p) => p.number === fix);
    // ponytail: the merge scan's record of this poll's head; a fix merged before a refresh triage
    // emptied `pending` reads as closed, and the key stays shared until no pull request fails it.
    if (fix && !open.has(fix) && merged) return `its fix #${fix} merged`;
    return null;
}

/**
 * Marks the shared failure keys of one poll's pull requests: sets `rec.shared` (the board's words
 * for each shared key, when every key the pull request fails on is shared; null otherwise) and
 * updates `state.sharedFailures`.
 * @param {any} state the daemon state; its `jobs`, `merged` and `trust` are read
 * @param {Record<string, any>} prs this poll's records, changed in place
 * @param {any[]} nodes the open pull requests, as the poll's query returns them
 * @param {{threshold: number, at: string}} opts the config's `sharedFailurePrs` and the poll's time
 * @returns {{declared: string[], ended: {key: string, why: string}[]}} what changed, for the ledger
 */
export function markShared(state, prs, nodes, { threshold, at }) {
    const store = (state.sharedFailures ??= {});
    const out = { declared: /** @type {string[]} */ ([]), ended: /** @type {{key: string, why: string}[]} */ ([]) };
    const failing = failingByKey(store, prs);
    const open = new Set(nodes.map((n) => Number(n.number)));
    for (const key of new Set([...Object.keys(store), ...failing.keys()])) {
        const r = (store[key] ??= { shared: false, since: null, prs: [], fix: null, settled: {} });
        r.settled = Object.fromEntries(Object.entries(r.settled).filter(([n, head]) => prs[n]?.headSha === head));
        r.prs = failing.get(key) ?? [];
        const why = r.shared ? endedBy(state, r, key, open) : null;
        if (why) out.ended.push({ key, why: settle(r, prs, why) });
        if (!r.shared && r.prs.length >= threshold) {
            Object.assign(r, { shared: true, since: at });
            out.declared.push(key);
        }
        r.fix = r.shared ? findFix(state, nodes, key, r) : null;
        if (!r.shared && !r.prs.length && !Object.keys(r.settled).length) delete store[key];
    }
    for (const rec of Object.values(prs)) rec.shared = sharedWords(store, rec);
    return out;
}

/**
 * Ends a key's shared stretch: the pull requests still failing it are settled at their heads.
 * @param {any} r the key's record, changed in place
 * @param {Record<string, any>} prs this poll's records
 * @param {string} why why it ended
 * @returns {string} why
 */
function settle(r, prs, why) {
    for (const n of r.prs) r.settled[n] = prs[n].headSha;
    Object.assign(r, { shared: false, since: null, prs: [], fix: null });
    return why;
}

/**
 * The open pull requests failing each countable key: not inherited, not a test job, and not at a
 * head settled for the key.
 * @param {Record<string, any>} store `state.sharedFailures`
 * @param {Record<string, any>} prs this poll's records
 * @returns {Map<string, number[]>} the pull requests by key
 */
function failingByKey(store, prs) {
    /** @type {Map<string, number[]>} */
    const failing = new Map();
    for (const [n, rec] of Object.entries(prs)) {
        if (rec.inherited?.length) continue;
        for (const key of rec.failureKeys ?? []) {
            if (isTestJob(jobOf(key)) || store[key]?.settled?.[n] === rec.headSha) continue;
            failing.set(key, [...(failing.get(key) ?? []), Number(n)]);
        }
    }
    return failing;
}

/**
 * The board's words for a pull request whose every failure key is shared, else null.
 * @param {Record<string, any>} store `state.sharedFailures`
 * @param {any} rec the pull request's record
 * @returns {string[] | null} the words
 */
function sharedWords(store, rec) {
    const keys = rec.inherited?.length ? [] : (rec.failureKeys ?? []);
    if (!keys.length || !keys.every((/** @type {string} */ k) => store[k]?.shared)) return null;
    return keys.map((/** @type {string} */ k) => words(k, store[k].prs.length));
}

/**
 * The `incident` job each shared key calls for: one while no fix pull request is open, or while
 * the job is already held (its own pull request names the key too); none once the key ended.
 * @param {any} state the daemon state
 * @returns {Map<string, any>} the job spec by key
 */
export function sharedJobSpecs(state) {
    const out = new Map();
    for (const [key, r] of Object.entries(state.sharedFailures ?? {})) {
        if (!r.shared) continue;
        const job = sharedJob(state, key);
        const held = Boolean(job?.holder) && !TERMINAL.includes(job.state);
        // A held job of another kind that names the key is someone already on it.
        const named = Object.values(state.jobs ?? {}).some(
            (j) => j !== job && j.holder && !TERMINAL.includes(j.state) && `${j.target} ${j.reason}`.includes(key),
        );
        if ((r.fix || named) && !held) continue;
        const workflow = key.split(" / ")[0];
        const lane = Object.entries(state.master?.lanes ?? {}).find(
            ([name, l]) => /** @type {any} */ (l.workflowName ?? name) === workflow,
        )?.[0];
        out.set(key, {
            id: `incident-shared-${key}`,
            kind: "incident",
            target: key,
            priority: "urgent",
            reason: words(key, r.prs.length),
            facts: { scope: "shared", key, prs: r.prs, lane: lane ?? null, since: r.since },
        });
    }
    return out;
}

/**
 * The board's and status's lines for the shared keys.
 * @param {any} state the daemon state
 * @returns {string[]} one line per shared key
 */
export function sharedLines(state) {
    return Object.entries(state?.sharedFailures ?? {})
        .filter(([, r]) => r.shared)
        .map(([key, r]) => {
            const how = r.fix ? `fix in #${r.fix.pr} (${r.fix.why})` : "one job finds and fixes it";
            return `  ${words(key, r.prs.length)} (${key}) -- ${how}`;
        });
}
