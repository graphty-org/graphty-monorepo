/**
 * The report shape of one measured check and its error / tolerance ratio, shared by the sabotage matrix
 * (sabotage.ts re-exports both) and the parity helpers. Imports only the platform-neutral src/errors.js, so the parity
 * helpers stay bundleable for the browser project, which cannot load sabotage.ts (it imports the Node setup).
 */

import { isWebGpuGraphError } from "../../src/errors.js";

/** The outcome of one measured check: the largest error / tolerance ratio over its samples (Infinity for a mismatch under a tolerance of 0). */
export interface CheckReport {
    readonly worst: number;
    readonly worstLabel: string;
    readonly samples: number;
}

/**
 * The report of a run the driver refused as a wrong result: E_VALIDATION, the code of every result-level check (a
 * label that is not a node index, a forest with too many edges, a duplicate visit) is the maximal miss. Every other
 * error -- E_SHADER_COMPILE from a mutant that does not compile, an E_INVALID_ARGUMENT, a bug in the check itself --
 * is rethrown, so a sabotage row is killed only by a wrong answer, never by a mutant that merely broke something.
 * @param label - the sample's name
 * @param err - the caught value
 * @returns the Infinity report of an E_VALIDATION refusal (throws `err` otherwise)
 */
export function refusedReport(label: string, err: unknown): CheckReport {
    if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
        return { worst: Infinity, worstLabel: `${label}: E_VALIDATION ${err.message}`, samples: 1 };
    }
    throw err;
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
