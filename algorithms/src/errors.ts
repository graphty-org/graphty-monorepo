/**
 * Thrown when an iterative algorithm reaches its iteration cap before meeting its tolerance.
 *
 * The scores it had reached are not returned: an unconverged vector is not the answer, and
 * returning it in silence would pass it off as one. networkx makes the same choice with
 * `PowerIterationFailedConvergence`. Raise `maxIterations`, or loosen `tolerance`, and call again.
 */
export class ConvergenceError extends Error {
    override readonly name = "ConvergenceError";

    /**
     * Builds the error and its message.
     * @param algorithm - The function that gave up, e.g. `"eigenvectorCentrality"`
     * @param iterations - The passes it ran, which is its `maxIterations`
     * @param tolerance - The tolerance it did not meet
     */
    constructor(
        readonly algorithm: string,
        readonly iterations: number,
        readonly tolerance: number,
    ) {
        super(
            `${algorithm} did not converge in ${String(iterations)} iterations (tolerance ${String(tolerance)}); raise maxIterations or tolerance`,
        );
    }
}
