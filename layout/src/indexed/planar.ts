import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions";
import { toLayoutSnapshot } from "../simulation/snapshot";
import { RandomNumberGenerator } from "../utils/random";
import { type CommonLayoutOptions, planar as inPlane, resolve, result } from "./common";

/** The golden angle in radians, which spreads the steps of a spiral evenly around it. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * The distinct neighbours of every node other than itself, in ascending index.
 * @param g - an undirected snapshot
 * @returns one list per node
 */
function neighbourLists(g: GraphSnapshot): number[][] {
    const lists: number[][] = [];
    for (let u = 0; u < g.nodeCount; u++) {
        const list: number[] = [];
        for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
            const v = g.colIdx[a];
            if (v !== u && v !== list[list.length - 1]) {
                list.push(v);
            }
        }
        lists.push(list);
    }
    return lists;
}

/**
 * Whether `u` and `v` are neighbours.
 * @param adj - the neighbour lists
 * @param u - a node
 * @param v - another node
 * @returns true when adjacent
 */
const adjacent = (adj: readonly number[][], u: number, v: number): boolean => adj[u].includes(v);

/**
 * Whether the graph is K5 or K3,3, the two graphs the planarity check names outright.
 * @param adj - the neighbour lists
 * @param edgeCount - the number of distinct edges between two nodes
 * @returns true for K5 or K3,3
 */
function isKuratowski(adj: readonly number[][], edgeCount: number): boolean {
    const n = adj.length;
    if (n === 5 && edgeCount === 10) {
        for (let u = 0; u < n; u++) {
            for (let v = u + 1; v < n; v++) {
                if (!adjacent(adj, u, v)) {
                    return false;
                }
            }
        }
        return true;
    }
    if (n !== 6 || edgeCount !== 9) {
        return false;
    }
    // two-colour from node 0; an unreached node takes the second colour
    const colour = new Int8Array(n).fill(-1);
    colour[0] = 0;
    for (const queue = [0]; queue.length > 0; ) {
        const u = queue.shift() ?? 0;
        for (const v of adj[u]) {
            if (colour[v] === -1) {
                colour[v] = 1 - colour[u];
                queue.push(v);
            } else if (colour[v] === colour[u]) {
                return false;
            }
        }
    }
    const first = [0, 1, 2, 3, 4, 5].filter((u) => colour[u] === 0);
    const second = [0, 1, 2, 3, 4, 5].filter((u) => colour[u] !== 0);
    return first.length === 3 && first.every((u) => second.every((v) => adjacent(adj, u, v)));
}

/**
 * The cycle that becomes the outer face: for eight nodes or fewer a Hamiltonian cycle when there is one, otherwise the
 * first cycle a depth-first search from node 0 closes, otherwise every node in index order.
 * @param adj - the neighbour lists
 * @returns node indices around the face
 */
function outerFace(adj: readonly number[][]): number[] {
    const n = adj.length;
    const all = Array.from({ length: n }, (_, i) => i);
    if (n <= 2) {
        return all;
    }
    if (n <= 8) {
        const onPath = new Uint8Array(n);
        const path: number[] = [];
        const extend = (u: number): boolean => {
            path.push(u);
            onPath[u] = 1;
            if (path.length === n ? adjacent(adj, u, path[0]) : adj[u].some((v) => onPath[v] === 0 && extend(v))) {
                return true;
            }
            onPath[u] = 0;
            path.pop();
            return false;
        };
        if (extend(0)) {
            return path;
        }
    }
    // an iterative depth-first search, so a long path cannot overflow the stack
    const visited = new Uint8Array(n);
    const parent = new Int32Array(n).fill(-1);
    for (let root = 0; root < n; root++) {
        if (visited[root] === 1) {
            continue;
        }
        visited[root] = 1;
        const stack: [number, number][] = [[root, 0]];
        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            const [u, cursor] = frame;
            if (cursor === adj[u].length) {
                stack.pop();
                continue;
            }
            frame[1]++;
            const v = adj[u][cursor];
            if (v === parent[u]) {
                continue;
            }
            if (visited[v] === 1) {
                const cycle = [v, u];
                for (let w = u; parent[w] >= 0 && parent[w] !== v; w = parent[w]) {
                    cycle.push(parent[w]);
                }
                return cycle;
            }
            visited[v] = 1;
            parent[v] = u;
            stack.push([v, 0]);
        }
    }
    return all;
}

/**
 * Planar-layout rows before rescaling: the outer face on the unit circle, then every other node, in index order, at
 * the mean of its already placed neighbours plus a seeded jitter of up to 0.05 per component (a node with no placed
 * neighbour at a random point within 0.5 of the origin, an isolated node on the origin). An interior node that lands
 * within `min(0.02, 0.5 / sqrt(n))` of a node already placed steps outward along a spiral until it is that far from
 * every one: the jitter alone can be arbitrarily small (the first draw of seed 1 is about 5e-6), and nodes that share
 * their placed neighbours share a mean, so without the step two nodes can land on the same point.
 * @param adj - the neighbour lists
 * @param seed - the jitter's seed, or null for a random one
 * @returns `2 * n` values
 */
function embeddingRows(adj: readonly number[][], seed: number | null): F64 {
    const n = adj.length;
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const rows = new Float64Array(2 * n);
    const placed = new Uint8Array(n);
    // placed nodes bucketed by a grid of cell size `gap`, so a near neighbour is found in the 3x3 cells around a point
    const gap = Math.min(0.02, 0.5 / Math.sqrt(n));
    const cells = new Map<number, number[]>();
    // one number per cell; exact while a coordinate stays within 2^20 cells of the origin
    const cellKey = (cx: number, cy: number): number => cx * 2 ** 21 + cy;
    const occupy = (u: number): void => {
        const key = cellKey(Math.floor(rows[2 * u] / gap), Math.floor(rows[2 * u + 1] / gap));
        const cell = cells.get(key);
        if (cell === undefined) {
            cells.set(key, [u]);
        } else {
            cell.push(u);
        }
    };
    const crowded = (x: number, y: number): boolean => {
        const cx = Math.floor(x / gap);
        const cy = Math.floor(y / gap);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const v of cells.get(cellKey(cx + dx, cy + dy)) ?? []) {
                    if (Math.hypot(rows[2 * v] - x, rows[2 * v + 1] - y) < gap) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    const face = outerFace(adj);
    face.forEach((u, i) => {
        const angle = (2 * Math.PI * i) / face.length;
        rows[2 * u] = Math.cos(angle);
        rows[2 * u + 1] = Math.sin(angle);
        placed[u] = 1;
        occupy(u);
    });
    const interior = Array.from({ length: n }, (_, i) => i).filter((u) => placed[u] === 0);
    for (const u of interior) {
        let x = 0;
        let y = 0;
        let count = 0;
        for (const v of adj[u]) {
            if (placed[v] === 1) {
                x += rows[2 * v];
                y += rows[2 * v + 1];
                count++;
            }
        }
        if (adj[u].length === 0) {
            rows[2 * u] = 0;
            rows[2 * u + 1] = 0;
        } else if (count > 0) {
            const jitter = 0.1 * (rng.rand() as number);
            rows[2 * u] = x / count + jitter * ((rng.rand() as number) - 0.5);
            rows[2 * u + 1] = y / count + jitter * ((rng.rand() as number) - 0.5);
        } else {
            const r = 0.5 * (rng.rand() as number);
            const angle = 2 * Math.PI * (rng.rand() as number);
            rows[2 * u] = r * Math.cos(angle);
            rows[2 * u + 1] = r * Math.sin(angle);
        }
        // a sunflower spiral around the chosen point: point k is gap * sqrt(k) out, at k golden angles; k grows by an
        // eighth each step, so getting past a crowd of m nodes takes about 8 ln(m) steps rather than m
        const x0 = rows[2 * u];
        const y0 = rows[2 * u + 1];
        for (let k = 1; crowded(rows[2 * u], rows[2 * u + 1]); k += 1 + (k >> 3)) {
            rows[2 * u] = x0 + gap * Math.sqrt(k) * Math.cos(k * GOLDEN_ANGLE);
            rows[2 * u + 1] = y0 + gap * Math.sqrt(k) * Math.sin(k * GOLDEN_ANGLE);
        }
        placed[u] = 1;
        occupy(u);
    }
    return rows;
}

/**
 * Planar-layout rows over an undirected snapshot, rescaled so the farthest node is `scale` from `center`.
 * @param g - an undirected snapshot
 * @param scale - the distance of the farthest node from the centre
 * @param center - at least 2 components
 * @param seed - the jitter's seed, or null for a random one
 * @returns `2 * n` values
 * @throws "G is not planar." for K5, K3,3 and a connected graph of more than `3n - 6` distinct edges, not counting
 * self-loops and parallel edges
 */
function planarRows(g: GraphSnapshot, scale: number, center: readonly number[], seed: number | null): F64 {
    const n = g.nodeCount;
    const adj = neighbourLists(g);
    // self-loops and parallel edges do not affect planarity, so count only the distinct edges between two nodes
    const edgeCount = adj.reduce((total, list) => total + list.length, 0) / 2;
    if (n > 4) {
        if (isKuratowski(adj, edgeCount)) {
            throw new Error("G is not planar.");
        }
        const reached = new Uint8Array(n);
        reached[0] = 1;
        let count = 1;
        for (const stack = [0]; stack.length > 0; ) {
            for (const v of adj[stack.pop() ?? 0]) {
                if (reached[v] === 0) {
                    reached[v] = 1;
                    count++;
                    stack.push(v);
                }
            }
        }
        if (count === n && edgeCount > 3 * n - 6) {
            throw new Error("G is not planar.");
        }
    }
    return rescaleInPlace(embeddingRows(adj, seed), 2, scale, center);
}

/**
 * Nodes placed without edge crossings for the graphs the check accepts (see `planarRows`): a cycle of the graph on a
 * circle, the other nodes inside it near their neighbours. In 3D the layout lies in the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the distance of the farthest node from the centre; `seed` fixes the jitter
 * @returns the layout
 * @throws "G is not planar." when the check rejects the graph
 */
export function planar(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(inPlane(planarRows(toLayoutSnapshot(s), scale, center, options.seed ?? null), dim, center), dim, n);
}
