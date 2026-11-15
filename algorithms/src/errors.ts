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

/** What {@link checkNumber} accepts besides being finite: bounds and integrality. */
export interface NumberRule {
    /** Smallest allowed value, inclusive. */
    readonly min?: number;
    /** Largest allowed value, inclusive. */
    readonly max?: number;
    /** The value must be strictly greater than this. */
    readonly above?: number;
    /** The value must be an integer. */
    readonly integer?: boolean;
}

/**
 * Refuse a numeric option that is NaN, infinite, outside its bounds or not an integer when it must be one.
 * @param fn - The algorithm's name, for the message
 * @param name - The option's name
 * @param value - Its value
 * @param rule - What it must satisfy
 * @throws RangeError with code `E_BAD_OPTION`
 */
export function checkNumber(fn: string, name: string, value: number, rule: NumberRule): void {
    const { min, max, above, integer } = rule;
    const ok =
        Number.isFinite(value) &&
        (integer !== true || Number.isInteger(value)) &&
        (min === undefined || value >= min) &&
        (max === undefined || value <= max) &&
        (above === undefined || value > above);
    if (!ok) {
        const bounds = [
            integer === true ? "an integer" : "finite",
            min === undefined ? "" : `>= ${String(min)}`,
            above === undefined ? "" : `> ${String(above)}`,
            max === undefined ? "" : `<= ${String(max)}`,
        ].filter((b) => b !== "");
        throw withCode(
            new RangeError(`${fn}: ${name} must be ${bounds.join(" and ")}, got ${String(value)}`),
            "E_BAD_OPTION",
        );
    }
}

/**
 * Refuse a weight vector of the wrong length (`E_BAD_OPTION`) or holding a NaN weight, or an infinite or negative one
 * unless `ordered` allows it (`E_BAD_WEIGHT`).
 * @param fn - The algorithm's name, for the message
 * @param weights - The weights, or null for none (always accepted)
 * @param length - The length they must have, or undefined to skip that check
 * @param ordered - Accept every weight that can be ordered: negative and infinite ones too, only NaN refused (a
 *   spanning tree only compares weights); default false
 * @throws RangeError with code `E_BAD_OPTION` or `E_BAD_WEIGHT`
 */
export function checkWeights(fn: string, weights: ArrayLike<number> | null, length?: number, ordered = false): void {
    if (weights === null) {
        return;
    }
    if (length !== undefined && weights.length !== length) {
        throw withCode(
            new RangeError(
                `${fn}: weights has ${String(weights.length)} entries; the graph has ${String(length)} arcs`,
            ),
            "E_BAD_OPTION",
        );
    }
    for (let i = 0; i < weights.length; i++) {
        const w = weights[i];
        if (Number.isNaN(w) || (!ordered && (!Number.isFinite(w) || w < 0))) {
            throw withCode(
                new RangeError(
                    `${fn}: weight ${String(i)} is ${String(w)}; it needs ${ordered ? "numeric" : "finite, non-negative"} weights`,
                ),
                "E_BAD_WEIGHT",
            );
        }
    }
}

/**
 * The `E_TOO_LARGE` error of an algorithm that holds n x n values: a RangeError with `code` and
 * `params` (`nodeCount`, `maxNodes` -- null when no bound was set and the allocation itself failed --
 * and `bytes`).
 * @param fn - The algorithm's name, for the message
 * @param nodeCount - The node count
 * @param maxNodes - The caller's bound, or undefined when the allocation failed under no bound
 * @param bytes - The bytes the dense matrices need
 * @returns The error, to throw
 */
export function tooLarge(
    fn: string,
    nodeCount: number,
    maxNodes: number | undefined,
    bytes: number,
): RangeError & { readonly code: AlgorithmErrorCode; readonly params: object } {
    const message =
        maxNodes === undefined
            ? `${fn}: ${String(nodeCount)} nodes need ${String(bytes)} bytes of n x n memory, more than this runtime could allocate. Pass a maxNodes to refuse such graphs up front.`
            : `${fn}: ${String(nodeCount)} nodes exceeds maxNodes ${String(maxNodes)}; the result would allocate ${String(bytes)} bytes. Pass a larger maxNodes to allow it.`;
    return Object.assign(withCode(new RangeError(message), "E_TOO_LARGE"), {
        params: { nodeCount, maxNodes: maxNodes ?? null, bytes },
    });
}

/**
 * Refuse a graph above the caller's `maxNodes` before allocating, then run the n x n allocations,
 * turning the engine's RangeError ("Array buffer allocation failed", "Out of memory") into `E_TOO_LARGE`.
 * @param fn - The algorithm's name
 * @param nodeCount - The node count
 * @param maxNodes - The caller's bound; undefined for none
 * @param bytes - The bytes the allocations need
 * @param alloc - The allocations
 * @returns What alloc returns
 */
export function allocDense<T>(
    fn: string,
    nodeCount: number,
    maxNodes: number | undefined,
    bytes: number,
    alloc: () => T,
): T {
    // A NaN maxNodes refuses rather than switching the bound off.
    if (maxNodes !== undefined && (nodeCount > maxNodes || Number.isNaN(maxNodes))) {
        throw tooLarge(fn, nodeCount, maxNodes, bytes);
    }
    try {
        return alloc();
    } catch (error) {
        if (error instanceof RangeError) {
            throw tooLarge(fn, nodeCount, undefined, bytes);
        }
        throw error;
    }
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
