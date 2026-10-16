/**
 * The one weight rule every algorithm follows: an algorithm that can use edge weights reads the graph's weights
 * when it has some, and `weighted: false` makes it ignore them; an algorithm that cannot use weights refuses
 * `weighted: true` instead of ignoring it.
 * @module
 */

import { withCode } from "../errors.js";

/** The `weighted` option every algorithm that can use edge weights takes. @public */
export interface WeightedOptions {
    /**
     * Read the snapshot's edge weights when it has some; default true. `false` treats every edge as weight 1 and
     * ignores a `weights` override too.
     */
    readonly weighted?: boolean | undefined;
}

/**
 * Whether a call reads edge weights: when the graph has a weight column, unless the options say `weighted: false`.
 * @param g - The graph or adjacency
 * @param g.weights - Its per-arc weights, or null when it has none
 * @param weighted - The caller's `weighted` option
 * @returns True when the call reads `g.weights`
 */
export function readsWeights(g: { readonly weights: unknown }, weighted: boolean | undefined): boolean {
    return weighted !== false && g.weights !== null;
}

/**
 * Refuse `weighted: true` on an algorithm that cannot use edge weights, so a caller who asked for a weighted answer
 * is told rather than handed an unweighted one.
 * @param algorithm - The function's name, for the message
 * @param options - The caller's options
 * @throws RangeError with code `E_BAD_OPTION` when `options.weighted` is true
 */
export function refuseWeights(algorithm: string, options: object | undefined): void {
    if (options !== undefined && "weighted" in options && options.weighted === true) {
        throw withCode(
            new RangeError(`${algorithm} cannot use edge weights; leave weighted unset or pass weighted: false`),
            "E_BAD_OPTION",
        );
    }
}
