/**
 * The report shape of one measured check and its error / tolerance ratio, shared by the sabotage matrix
 * (sabotage.ts re-exports both) and the parity helpers. Imports nothing, so the parity helpers stay bundleable for
 * the browser project, which cannot load sabotage.ts (it imports the Node setup).
 */

/** The outcome of one measured check: the largest error / tolerance ratio over its samples (Infinity for a mismatch under a tolerance of 0). */
export interface CheckReport {
    readonly worst: number;
    readonly worstLabel: string;
    readonly samples: number;
}

/**
 * The error / tolerance ratio of one sample: 0 for an exact match, Infinity for any mismatch under a tolerance of 0
 * (a bitwise test), NaN counts as Infinity.
 * @param error - the measured error (absolute or relative, the caller's choice, the same as the tolerance's)
 * @param tolerance - the test's tolerance in the same units
 * @returns the ratio the sabotage tests compare with `minFactor`
 */
export function ratioOf(error: number, tolerance: number): number {
    if (Number.isNaN(error)) {
        return Infinity;
    }
    if (tolerance <= 0) {
        return error === 0 ? 0 : Infinity;
    }
    return error / tolerance;
}
