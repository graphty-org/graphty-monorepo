import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { np } from "../utils/numpy";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";
import { groupsOfColumn } from "./multipartite";

/** Options of the index-based shell layout. */
export interface ShellLayoutOptions extends CommonLayoutOptions {
    /**
     * The shells, innermost first: either lists of node indices, or the name of a `u32` or `dict` node column whose
     * equal values form one shell, in ascending value (for `dict`, dictionary) order. A node in no shell, or with an
     * unset value, is not placed: its row is NaN. Default one shell of every node.
     */
    readonly nlist?: readonly ArrayLike<number>[] | string | undefined;
}

/**
 * Concentric-circle rows. Shell k of m has radius `(k + 1) * scale / m`, except that a first shell of exactly one
 * node puts that node on the centre and shell k at `k * scale / m`; an empty shell is skipped and takes no radius.
 * A node listed twice keeps its last place.
 * @param n - node count (rows)
 * @param shells - node indices per shell, innermost first
 * @param scale - the radius step times the shell count
 * @param center - at least 2 components
 * @returns `2 * n` values, NaN for a node in no shell
 */
export function shellRows(n: number, shells: readonly ArrayLike<number>[], scale: number, center: readonly number[]): F64 {
    const rows = new Float64Array(2 * n).fill(Number.NaN);
    if (shells.length === 0) {
        return rows;
    }
    const radiusBump = scale / shells.length;
    let radius = radiusBump;
    if (shells[0].length === 1) {
        rows[2 * shells[0][0]] = center[0];
        rows[2 * shells[0][0] + 1] = center[1];
    }
    shells.forEach((shell, k) => {
        if (shell.length === 0 || (k === 0 && shell.length === 1)) {
            return;
        }
        const theta = np.linspace(0, 2 * Math.PI, shell.length + 1);
        for (let j = 0; j < shell.length; j++) {
            rows[2 * shell[j]] = Math.cos(theta[j]) * radius + center[0];
            rows[2 * shell[j] + 1] = Math.sin(theta[j]) * radius + center[1];
        }
        radius += radiusBump;
    });
    return rows;
}

/**
 * Nodes on concentric circles, one circle per shell, each circle's nodes evenly spaced in the order listed. In 3D the
 * circles lie in the plane of the centre's z.
 * @param s - the snapshot
 * @param options - `scale / m` is the radius step between the m shells; `nlist` the shells
 * @returns the layout
 */
export function shell(s: GraphSnapshot, options: ShellLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const { nlist } = options;
    const shells =
        typeof nlist === "string" ? groupsOfColumn(s, nlist, "shell") : (nlist ?? [Array.from({ length: n }, (_, i) => i)]);
    for (const list of shells) {
        for (let j = 0; j < list.length; j++) {
            if (!Number.isInteger(list[j]) || list[j] < 0 || list[j] >= n) {
                throw new Error(`shell node index ${String(list[j])} is not a node of the graph`);
            }
        }
    }
    return result(planar(shellRows(n, shells, scale, center), dim, center), dim, n);
}
