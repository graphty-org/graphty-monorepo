import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { RandomNumberGenerator } from "../utils/random";
import { type CommonLayoutOptions, resolve, result } from "./common";

/**
 * Uniform random rows in `[center, center + scale)` per component, drawn in node order from the layout package's
 * seeded generator.
 * @param n - node count
 * @param dim - components per row
 * @param scale - the side of the cell
 * @param center - `dim` components: the cell's lowest corner
 * @param seed - the generator seed, or null for a random one
 * @returns `n * dim` values
 */
function randomRows(n: number, dim: number, scale: number, center: readonly number[], seed: number | null): F64 {
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const rows = new Float64Array(n * dim);
    for (let i = 0; i < n * dim; i++) {
        rows[i] = (rng.rand() as number) * scale + center[i % dim];
    }
    return rows;
}

/**
 * Nodes uniformly at random in the cell `[center, center + scale)` of every axis (the unit cell at the origin by
 * default). The same seed gives the same layout.
 * @param s - the snapshot; only its node count is read
 * @param options - `scale` is the side of the cell; `seed` the generator seed
 * @returns the layout
 */
export function random(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(randomRows(n, dim, scale, center, options.seed ?? null), dim, n);
}
