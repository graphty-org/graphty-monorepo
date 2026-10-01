/**
 * The option record of label propagation (design 3.3 line 807, 8.6). Types only.
 */

/**
 * Label propagation's options. Ties between neighbour labels are broken by the LOWEST label, never at random, so
 * the result is bitwise reproducible on one device; that is also why there is no `randomSeed`.
 * @public
 */
export interface LabelPropagationOptions {
    /** The largest number of passes (default 100, as in `@graphty/algorithms`); a non-negative integer. */
    readonly maxIterations?: number | undefined;
    /**
     * Sum the weights of the edges to each neighbour label (default true; an unweighted snapshot's edges weigh 1
     * each, so a parallel edge counts once per copy); false counts every distinct neighbour once.
     */
    readonly weighted?: boolean | undefined;
}
