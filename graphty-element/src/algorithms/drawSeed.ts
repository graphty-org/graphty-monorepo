/**
 * A fresh seed for a run that was given none: unseeded is the neutral default, so each run draws
 * its own and reports it in the result's caveats, where a consumer can read it to repeat the run.
 * @returns a non-negative 31-bit integer
 */
export function drawSeed(): number {
    return Math.floor(Math.random() * 2 ** 31); // NOSONAR(S2245): an algorithm seed, not a security value
}
