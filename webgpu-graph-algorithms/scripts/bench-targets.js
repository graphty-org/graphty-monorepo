/**
 * The absolute performance targets of the T-table (plan section 10.4), read from benchmarks/results/targets.json and
 * judged against one benchmark row. Shared by scripts/bench-compare.js (the GPU lane's gate) and
 * scripts/bench-readme-tables.js (the README's Performance tables), so both say the same thing about a row.
 *
 * targets.json is an object keyed by benchmark row, `group/name` exactly as bench-compare matches rows. Each entry:
 *   id                   the T-table id ("T-1" .. "T-14")
 *   what                 the README's description of the row
 *   target               a threshold in milliseconds the median must not exceed, or "recorded" (no threshold)
 *   gatingRunnerClasses  the runner classes on which a miss fails bench:compare. The targets bind the reference
 *                        card, the Tesla T4 of the GPU lane (`gpu-linux-t4`); every other class reports and does not
 *                        gate (the decision on issue #277, the question docs/decisions/G4.md G4-F16 left open)
 *   knownMiss            { <runner class>: <reason> } for a target that class already misses: reported, never failing,
 *                        so the gate goes red only on a NEW miss. The reason names the decision record.
 *
 * A miss is the median above the target. It fails the gate only when the minimum is above the target as well: as in
 * bench-compare's regression rule, interference can only make a sample slower, so a median over the target with the
 * fastest run under it is a noisy run, not a slower kernel ("missed (noisy)").
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * @typedef {{ id: string, what: string, target: number | "recorded", gatingRunnerClasses?: readonly string[], knownMiss?: Readonly<Record<string, string>> }} Target
 */

/**
 * Reads a targets file.
 * @param {string} file - the path of targets.json
 * @returns {Readonly<Record<string, Target>>} the targets keyed by `group/name`, {} when the file is absent
 */
export function readTargets(file) {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

/**
 * Judges one measured row against its target on one runner class.
 * @param {Target | undefined} target - the row's entry in targets.json
 * @param {{ medianMs: number, minMs?: number }} r - the measured row
 * @param {string} cls - the runner class the row was measured on
 * @returns {{ status: string, fails: boolean } | null} the status, and whether it fails the gate; null without a target
 */
export function judgeTarget(target, r, cls) {
    if (target === undefined) {
        return null;
    }
    if (target.target === "recorded") {
        return { status: "recorded", fails: false };
    }
    if (r.medianMs <= target.target) {
        return { status: "met", fails: false };
    }
    if (target.knownMiss?.[cls] !== undefined) {
        return { status: "missed (known)", fails: false };
    }
    if (typeof r.minMs === "number" && r.minMs <= target.target) {
        return { status: "missed (noisy)", fails: false };
    }
    return { status: "missed", fails: (target.gatingRunnerClasses ?? []).includes(cls) };
}
