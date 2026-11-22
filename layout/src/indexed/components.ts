import { detHypot, type F64 } from "@graphty/graph-format";

/** The adjacency a layout reads: row `u`'s neighbors are `colIdx[rowPtr[u] .. rowPtr[u + 1])`. */
export interface Csr {
    readonly nodeCount: number;
    readonly rowPtr: ArrayLike<number>;
    readonly colIdx: ArrayLike<number>;
}

/**
 * The connected components of an undirected graph, by breadth-first search.
 * @param g - the graph
 * @returns each component's nodes in increasing index order, the components in order of their lowest node
 */
export function connectedComponents(g: Csr): number[][] {
    const { nodeCount: n, rowPtr, colIdx } = g;
    const seen = new Uint8Array(n);
    const out: number[][] = [];
    for (let s = 0; s < n; s++) {
        if (seen[s] === 1) {
            continue;
        }
        seen[s] = 1;
        const nodes = [s];
        for (let head = 0; head < nodes.length; head++) {
            const u = nodes[head];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                if (seen[v] === 0) {
                    seen[v] = 1;
                    nodes.push(v);
                }
            }
        }
        nodes.sort((x, y) => x - y);
        out.push(nodes);
    }
    return out;
}

/**
 * The subgraph on a whole component, its nodes renumbered 0 .. k - 1 in the given order. Increasing `nodes` keep
 * every row's neighbor order.
 * @param g - the graph
 * @param nodes - a connected component of `g`, in increasing index order
 * @returns the component's adjacency
 */
export function inducedCsr(g: Csr, nodes: readonly number[]): Csr {
    const local = new Map<number, number>();
    nodes.forEach((u, i) => local.set(u, i));
    const rowPtr = new Uint32Array(nodes.length + 1);
    const colIdx: number[] = [];
    nodes.forEach((u, i) => {
        for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
            colIdx.push(local.get(g.colIdx[a]) ?? 0);
        }
        rowPtr[i + 1] = colIdx.length;
    });
    return { nodeCount: nodes.length, rowPtr, colIdx: Uint32Array.from(colIdx) };
}

/**
 * Place separately laid-out components side by side in the first two axes so none overlaps: each is enclosed by the
 * circle around its mean through its farthest node, and the circles, largest first, fill shelves (rows) of a
 * square-ish strip, one unit apart. Other axes keep each component's own values.
 * @param parts - each component's nodes in the whole graph
 * @param rows - each component's `nodes.length * dim` rows, in the order of its nodes
 * @param n - the whole graph's node count
 * @param dim - components per row, at least 2
 * @returns the whole graph's `n * dim` rows
 */
export function packComponents(
    parts: readonly (readonly number[])[],
    rows: readonly F64[],
    n: number,
    dim: number,
): F64 {
    const gap = 1;
    const boxes = parts.map((nodes, p) => {
        const r = rows[p];
        const mean = [0, 1].map((k) => nodes.reduce((sum, _, i) => sum + r[dim * i + k], 0) / nodes.length);
        let radius = 0;
        for (let i = 0; i < nodes.length; i++) {
            radius = Math.max(radius, detHypot(r[dim * i] - mean[0], r[dim * i + 1] - mean[1]));
        }
        return { p, mean, side: 2 * radius + gap };
    });
    boxes.sort((a, b) => b.side - a.side || a.p - b.p);
    const width = Math.sqrt(boxes.reduce((sum, b) => sum + b.side * b.side, 0));
    const out = new Float64Array(n * dim);
    let x = 0;
    let y = 0;
    let shelf = 0;
    for (const { p, mean, side } of boxes) {
        if (x > 0 && x + side > width) {
            y += shelf;
            x = 0;
            shelf = 0;
        }
        shelf = Math.max(shelf, side);
        const shift = [x + side / 2 - mean[0], y + side / 2 - mean[1]];
        parts[p].forEach((u, i) => {
            for (let k = 0; k < dim; k++) {
                out[dim * u + k] = rows[p][dim * i + k] + (k < 2 ? shift[k] : 0);
            }
        });
        x += side;
    }
    return out;
}
