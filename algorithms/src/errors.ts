/**
 * The stable code every error an algorithm throws on purpose carries as `error.code`, so a caller can tell the
 * cases apart without matching message text (which may change):
 *
 * - `E_NEEDS_UNDIRECTED` / `E_NEEDS_DIRECTED`: the algorithm is defined for the other kind of graph.
 * - `E_BAD_OPTION`: an option is out of range, of the wrong length, or inconsistent with another.
 * - `E_BAD_NODE`: a node index (a start, a target, a source) is not a node of the graph.
 * - `E_BAD_WEIGHT`: an edge weight the algorithm cannot use (negative, infinite or NaN).
 * - `E_NOT_CONNECTED` / `E_NOT_BIPARTITE` / `E_EMPTY_GRAPH`: the graph lacks a property the algorithm needs.
 * - `E_TOO_LARGE`: the result would exceed a size bound the caller can raise.
 * - `E_NOT_CONVERGED`, `E_BAD_PATH`, `E_PATH_COUNT_OVERFLOW`: {@link ConvergenceError}, {@link PathWalkError}
 *   and {@link PathCountOverflowError}.
 *
 * The thrown object stays the `Error` or `RangeError` it was before codes existed.
 * @public
 */
export type AlgorithmErrorCode =
    | "E_NEEDS_UNDIRECTED"
    | "E_NEEDS_DIRECTED"
    | "E_BAD_OPTION"
    | "E_BAD_NODE"
    | "E_BAD_WEIGHT"
    | "E_NOT_CONNECTED"
    | "E_NOT_BIPARTITE"
    | "E_EMPTY_GRAPH"
    | "E_TOO_LARGE"
    | "E_NOT_CONVERGED"
    | "E_BAD_PATH"
    | "E_PATH_COUNT_OVERFLOW";

/**
 * Attach a code to an error about to be thrown.
 * @param error - The error
 * @param code - Its code
 * @returns The same error, with `code` set
 */
export function withCode<E extends Error>(
    error: E,
    code: AlgorithmErrorCode,
): E & { readonly code: AlgorithmErrorCode } {
    return Object.assign(error, { code });
}

/**
 * Thrown when an iterative algorithm reaches its iteration cap before meeting its tolerance.
 *
 * The scores it had reached are not returned: an unconverged vector is not the answer, and
 * returning it in silence would pass it off as one. networkx makes the same choice with
 * `PowerIterationFailedConvergence`. Raise `maxIterations`, or loosen `tolerance`, and call again.
 */
export class ConvergenceError extends Error {
    override readonly name = "ConvergenceError";
    readonly code: AlgorithmErrorCode = "E_NOT_CONVERGED";

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

/**
 * Thrown when a shortest path cannot be walked back from its predecessor array: the walk met a
 * missing or out-of-range predecessor before the source (`"gap"`), or took more than
 * `nodeCount - 1` steps without reaching it (`"cycle"`).
 *
 * A CPU search never produces such an array; an accelerator's result can (a kernel bug, a lost
 * device, a buffer read too early). The error surfaces it instead of hanging or returning a wrong
 * path, and nothing recomputes the path on the CPU.
 */
export class PathWalkError extends Error {
    override readonly name = "PathWalkError";
    readonly code: AlgorithmErrorCode = "E_BAD_PATH";

    /**
     * Builds the error and its message.
     * @param source - The search's source node index
     * @param target - The node index the walk started from
     * @param reason - `"gap"` or `"cycle"`, as above
     */
    constructor(
        readonly source: number,
        readonly target: number,
        readonly reason: "cycle" | "gap",
    ) {
        super(
            `cannot walk the shortest path from node ${String(source)} to node ${String(target)}: the predecessor array has a ${reason}`,
        );
    }
}

/**
 * Thrown when an accelerator reports that the betweenness it computed is wrong because some pair of
 * nodes has more shortest paths than its counters can hold. The counts overflowed partway through
 * the run, so every score that depends on them is wrong, and none is returned.
 *
 * The CPU functions count in double precision and never throw this. Run the call without the
 * accelerator (the CPU function of the same name) to get the scores.
 */
export class PathCountOverflowError extends Error {
    override readonly name = "PathCountOverflowError";
    readonly code: AlgorithmErrorCode = "E_PATH_COUNT_OVERFLOW";

    /**
     * Builds the error and its message.
     * @param algorithm - The function whose counts overflowed, e.g. `"betweennessCentrality"`
     */
    constructor(readonly algorithm: string) {
        super(
            `${algorithm}: the accelerator's shortest-path counts overflowed, so its scores are wrong; run the CPU ${algorithm} instead`,
        );
    }
}
