/**
 * The fast-check parameters every property test passes to fc.assert: `numRuns`, plus the seed and
 * shrink path from GRAPHTY_FC_SEED / GRAPHTY_FC_PATH so a CI failure reproduces exactly. The seed in
 * use is logged before the run.
 */

import { type Parameters } from "fast-check";

/**
 * Build the fc.assert parameters for one property.
 * @param numRuns - the number of generated cases
 * @returns the parameters, with the reproduction seed and path applied when set
 */
export function fcParams<T>(numRuns: number): Parameters<T> {
    const envSeed = process.env.GRAPHTY_FC_SEED;
    const seed = envSeed === undefined || envSeed === "" ? Date.now() ^ (Math.random() * 0x100000000) : Number(envSeed);
    const path = process.env.GRAPHTY_FC_PATH;
    console.log(`fast-check seed ${seed} (set GRAPHTY_FC_SEED=${seed} to reproduce)`);
    return path === undefined || path === "" ? { numRuns, seed } : { numRuns, seed, path };
}
