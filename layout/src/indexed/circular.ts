import { detAcos, detCos, detSin, type F64, type GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions.js";
import { np } from "../utils/numpy.js";
import { type CommonLayoutOptions, resolve, result } from "./common.js";

/**
 * Circle (2D) or Fibonacci-sphere (3D) rows.
 * @param n - node count
 * @param dim - components per row, 2 or 3
 * @param scale - the radius
 * @param center - `dim` components
 * @returns `n * dim` values; a single node sits on the centre
 */
function circularRows(n: number, dim: 2 | 3, scale: number, center: readonly number[]): F64 {
    const rows = new Float64Array(n * dim);
    if (n === 1) {
        rows.set(center);
    } else if (dim === 2) {
        const theta = np.linspace(0, 2 * Math.PI, n + 1);
        for (let i = 0; i < n; i++) {
            rows[2 * i] = detCos(theta[i]) * scale + center[0];
            rows[2 * i + 1] = detSin(theta[i]) * scale + center[1];
        }
    } else {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        for (let i = 0; i < n; i++) {
            const theta = (2 * Math.PI * i) / goldenRatio;
            const phi = detAcos(1 - (2 * (i + 0.5)) / n);
            rows[3 * i] = detSin(phi) * detCos(theta) * scale + center[0];
            rows[3 * i + 1] = detSin(phi) * detSin(theta) * scale + center[1];
            rows[3 * i + 2] = detCos(phi) * scale + center[2];
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
