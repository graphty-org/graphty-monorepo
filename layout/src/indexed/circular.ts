import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { np } from "../utils/numpy";
import { RandomNumberGenerator } from "../utils/random";
import { type CommonLayoutOptions, resolve, result } from "./common";

/**
 * Circle (2D) or Fibonacci-sphere (3D) rows; above 3 dimensions, random points on the hypersphere.
 * @param n - node count
 * @param dim - components per row, 2 or more
 * @param scale - the radius
 * @param center - `dim` components
 * @returns `n * dim` values; a single node sits on the centre
 */
export function circularRows(n: number, dim: number, scale: number, center: readonly number[]): F64 {
    const rows = new Float64Array(n * dim);
    if (n === 1) {
        rows.set(center);
    } else if (dim === 2) {
        const theta = np.linspace(0, 2 * Math.PI, n + 1);
        for (let i = 0; i < n; i++) {
            rows[2 * i] = Math.cos(theta[i]) * scale + center[0];
            rows[2 * i + 1] = Math.sin(theta[i]) * scale + center[1];
        }
    } else if (dim === 3) {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        for (let i = 0; i < n; i++) {
            const theta = (2 * Math.PI * i) / goldenRatio;
            const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
            rows[3 * i] = Math.sin(phi) * Math.cos(theta) * scale + center[0];
            rows[3 * i + 1] = Math.sin(phi) * Math.sin(theta) * scale + center[1];
            rows[3 * i + 2] = Math.cos(phi) * scale + center[2];
        }
    } else {
        const rng = new RandomNumberGenerator();
        for (let i = 0; i < n; i++) {
            const coords = Array.from({ length: dim }, () => (rng.rand() as number) * 2 - 1);
            const norm = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
            coords.forEach((c, k) => (rows[dim * i + k] = (c / norm) * scale + center[k]));
        }
    }
    return rows;
}

/**
 * Nodes on a circle (2D) or spread over a sphere by the Fibonacci spiral (3D), in node-index order: node `i` of a
 * circle is at angle `2 * PI * i / n`.
 * @param s - the snapshot; only its node count is read
 * @param options - `scale` is the radius
 * @returns the layout
 */
export function circular(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(circularRows(n, dim, scale, center), dim, n);
}
