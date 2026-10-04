/**
 * The master incident procedure's outcome (design section 4.5): what a code-red key on master means,
 * from the daemon's two re-runs and the merges between the last green commit and the red one.
 *
 * - The red head re-run is the failing job re-run on the red commit. A pass means the failure is
 *   intermittent, whatever the other two inputs say, so nothing is reverted.
 * - The parent re-run is the same job of the last green commit's run, re-run today. A failure means
 *   the world changed under unchanged code.
 * - Only when the red head fails again and the parent passes do the merges decide: exactly one is
 *   reverted (and its change re-landed); otherwise the incident fixes forward with the suspects.
 *
 * Pure: the caller fetches the re-run conclusions and the suspects (`findSuspects` in master.mjs).
 */

/**
 * @typedef {{sha: string, pr: number | null}} Suspect a first-parent commit between green and red;
 *   `pr` the pull request it merged, null for a commit that merged none (a release commit)
 * @typedef {{
 *   outcome: "waiting", waitingFor: "red-head" | "parent"
 * } | {
 *   outcome: "intermittent", revert: null, mergesResume: true
 * } | {
 *   outcome: "world-changed", revert: null, fixForward: true
 * } | {
 *   outcome: "revert", revert: Suspect & {pr: number}, reland: number
 * } | {
 *   outcome: "suspects", revert: null, fixForward: true, suspects: Suspect[]
 * }} Outcome `waiting` until the re-run that decides has finished; `intermittent`: file or update
 *   the `intermittent` issue, end the incident, resume merges; `world-changed`: fix forward and tell
 *   the worker; `revert`: open a revert pull request of `revert.pr` and a re-land job for it;
 *   `suspects`: fix forward with the suspect list
 */

/**
 * A re-run's answer from its job conclusion. Only a finished pass or failure answers; anything else
 * (not finished, cancelled, skipped) leaves the procedure waiting, and the incident's deadline bounds
 * the wait.
 * @param {string | null | undefined} conclusion the re-run job's `conclusion`
 * @returns {"pass" | "fail" | null} the answer, or null when there is none yet
 */
function answer(conclusion) {
    if (conclusion === "success") return "pass";
    if (conclusion === "failure") return "fail";
    return null;
}

/**
 * The outcome table of design section 4.5.
 * @param {{redHead: string | null | undefined, parent: string | null | undefined, suspects: Suspect[]}} input
 *   the red head re-run's and the parent re-run's job conclusions, and the first-parent commits
 *   between the last green commit (exclusive) and the red one (inclusive)
 * @returns {Outcome} what the incident means and what the daemon does
 */
export function incidentOutcome({ redHead, parent, suspects }) {
    const head = answer(redHead);
    if (head === null) return { outcome: "waiting", waitingFor: "red-head" };
    if (head === "pass") return { outcome: "intermittent", revert: null, mergesResume: true };
    const before = answer(parent);
    if (before === null) return { outcome: "waiting", waitingFor: "parent" };
    if (before === "fail") return { outcome: "world-changed", revert: null, fixForward: true };
    const merges = suspects.filter((s) => s.pr !== null);
    if (merges.length === 1) {
        const [merge] = merges;
        return {
            outcome: "revert",
            revert: { sha: merge.sha, pr: /** @type {number} */ (merge.pr) },
            reland: /** @type {number} */ (merge.pr),
        };
    }
    return { outcome: "suspects", revert: null, fixForward: true, suspects };
}
