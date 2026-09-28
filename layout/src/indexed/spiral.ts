import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";

/** Options of the index-based spiral layout. */
export interface SpiralLayoutOptions extends CommonLayoutOptions {
    /** Angle between consecutive nodes, in radians, or the start angle when equidistant; default 0.35. */
    readonly resolution?: number | undefined;
    /** Space consecutive nodes one unit apart along the spiral instead of by equal angles; default false. */
    readonly equidistant?: boolean | undefined;
}

/**
 * Archimedean-spiral rows in node order, rescaled so the farthest node is `scale` from the centre.
 * @param n - node count
 * @param scale - distance of the farthest node from the centre
 * @param center - at least 2 components
 * @param resolution - see SpiralLayoutOptions
 * @param equidistant - see SpiralLayoutOptions
 * @returns `2 * n` values
 */
export function spiralRows(
    n: number,
    scale: number,
    center: readonly number[],
    resolution: number,
    equidistant: boolean,
): F64 {
    const rows = new Float64Array(2 * n);
    if (equidistant) {
        const chord = 1;
        const step = 0.5;
        let theta = resolution;
        theta += chord / (step * theta);
        for (let i = 0; i < n; i++) {
            const r = step * theta;
            theta += chord / r;
            rows[2 * i] = Math.cos(theta) * r;
            rows[2 * i + 1] = Math.sin(theta) * r;
        }
    } else {
        for (let i = 0; i < n; i++) {
            rows[2 * i] = Math.cos(resolution * i) * i;
            rows[2 * i + 1] = Math.sin(resolution * i) * i;
        }
    }
    return rescaleInPlace(rows, 2, scale, center);
}

/**
 * Nodes along an Archimedean spiral from the centre outwards, in node-index order. In 3D the spiral lies in the plane
 * of the centre's z.
 * @param s - the snapshot; only its node count is read
 * @param options - `scale` is the distance of the farthest node from the centre
 * @returns the layout
 */
export function spiral(s: GraphSnapshot, options: SpiralLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const rows = spiralRows(n, scale, center, options.resolution ?? 0.35, options.equidistant ?? false);
    return result(planar(rows, dim, center), dim, n);
}
