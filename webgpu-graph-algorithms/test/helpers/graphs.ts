/**
 * Deterministic test graphs (contract 5.2): Zachary's karate club, grids, paths, stars, cycles, complete graphs,
 * three seeded random generators, the two snapshot constructors (arena through fromEdgeArrays, separate arrays
 * through fromCsr) and the named fixtures of spec 11.3 / 11.4 sized by a scale factor. Pure data: this module is
 * imported by node AND browser tests, so it never imports test/setup/gpu.ts (PLAN DECISION 17: callers pass
 * gpuScale() / browserScale()). KARATE_EDGES and gridEdges are copied from graph-format's test/helpers/parts.ts,
 * randomEdges has the shape of its test/audit/gpu-upload.test.ts generator (with parallel edges rejected; driven by
 * xorshift32, see that function) and randomEdgesLoose plus the xorshift32 generator come from its
 * benchmarks/datasets.ts and benchmarks/harness.ts.
 */

import { type F32, fromCsr, fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

/**
 * One edge: [source, target] or [source, target, weight]. Exported by contract 5.2 for the edge lists later tests
 * build; nothing at P1-T2 imports it by name.
 * @public
 */
export type EdgeSpec = readonly [number, number] | readonly [number, number, number];

/** Zachary's karate club, 78 edges, node indices 0..33. */
export const KARATE_EDGES: readonly EdgeSpec[] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [0, 8],
    [0, 10],
    [0, 11],
    [0, 12],
    [0, 13],
    [0, 17],
    [0, 19],
    [0, 21],
    [0, 31],
    [1, 2],
    [1, 3],
    [1, 7],
    [1, 13],
    [1, 17],
    [1, 19],
    [1, 21],
    [1, 30],
    [2, 3],
    [2, 7],
    [2, 8],
    [2, 9],
    [2, 13],
    [2, 27],
    [2, 28],
    [2, 32],
    [3, 7],
    [3, 12],
    [3, 13],
    [4, 6],
    [4, 10],
    [5, 6],
    [5, 10],
    [5, 16],
    [6, 16],
    [8, 30],
    [8, 32],
    [8, 33],
    [9, 33],
    [13, 33],
    [14, 32],
    [14, 33],
    [15, 32],
    [15, 33],
    [18, 32],
    [18, 33],
    [19, 33],
    [20, 32],
    [20, 33],
    [22, 32],
    [22, 33],
    [23, 25],
    [23, 27],
    [23, 29],
    [23, 32],
    [23, 33],
    [24, 25],
    [24, 27],
    [24, 31],
    [25, 31],
    [26, 29],
    [26, 33],
    [27, 33],
    [28, 31],
    [28, 33],
    [29, 32],
    [29, 33],
    [30, 32],
    [30, 33],
    [31, 32],
    [31, 33],
    [32, 33],
];

/**
 * A w x h grid (4-neighbour), row-major node indices.
 * @param w - columns
 * @param h - rows
 * @returns the edges
 */
export function gridEdges(w: number, h: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = y * w + x;
            if (x + 1 < w) {
                edges.push([u, u + 1]);
            }
            if (y + 1 < h) {
                edges.push([u, u + w]);
            }
        }
    }
    return edges;
}

/**
 * A path over n nodes: (i, i + 1) for i in 0..n-2 (in index order, so a directed freeze has an identity arcToEdge).
 * @param n - node count
 * @returns the n - 1 edges
 */
export function pathEdges(n: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 0; i + 1 < n; i++) {
        edges.push([i, i + 1]);
    }
    return edges;
}

/**
 * A star: node 0 joined to nodes 1..leaves.
 * @param leaves - number of leaves
 * @returns the edges
 */
export function starEdges(leaves: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 1; i <= leaves; i++) {
        edges.push([0, i]);
    }
    return edges;
}

/**
 * A cycle over n nodes (n >= 3; n = 2 gives one edge, n < 2 none).
 * @param n - node count
 * @returns the edges
 */
export function cycleEdges(n: number): EdgeSpec[] {
    if (n < 2) {
        return [];
    }
    if (n === 2) {
        return [[0, 1]];
    }
    const edges: EdgeSpec[] = [];
    for (let i = 0; i < n; i++) {
        edges.push([i, (i + 1) % n]);
    }
    return edges;
}

/**
 * The complete graph K_n (every pair i < j).
 * @param n - node count
 * @returns the n (n - 1) / 2 edges
 */
export function completeEdges(n: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push([i, j]);
        }
    }
    return edges;
}

/**
 * The graph-format benchmark xorshift32 generator (harness.ts makeRandom; bitwise on the generator state only,
 * never on an index). Used by every random generator here: the gpu-upload.test.ts LCG (state * 1103515245 + 12345
 * mod 2^32) has low bits of tiny period, so when n is a power of two `state % n` depends on those low bits alone
 * and a rejection loop that must find m DISTINCT pairs starves (verified 2026-09-15: randomEdges(4096, 50000, 42)
 * on the LCG finds only 2048 distinct pairs in 1e8 draws, and randomEdges(64, 192, 1003) only 32 -- the sizes
 * residency.test.ts and the scaled "isolated" fixture use; non-power-of-two n such as (50, 300, 7) terminates).
 * @param seed - the seed
 * @returns a function returning uniform numbers in [0, 1)
 */
export function xorshift(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state / 0x100000000;
    };
}

/**
 * Seeded G(n, m) WITHOUT self-loops or parallels (the unordered pair {u, v} appears at most once, so the list is
 * parallel-free in both orientations): the gpu-upload.test.ts generator's shape (a self-loop is turned into (u, u + 1))
 * with repeated pairs rejected, driven by xorshift32.
 * @param n - node count
 * @param m - edge count; must not exceed n (n - 1) / 2
 * @param seed - the generator seed
 * @returns the edges
 */
export function randomEdges(n: number, m: number, seed: number): EdgeSpec[] {
    if (m > (n * (n - 1)) / 2) {
        throw new RangeError(`randomEdges: ${m} distinct edges do not exist on ${n} nodes`);
    }
    const random = xorshift(seed);
    const seen = new Set<number>();
    const edges: EdgeSpec[] = [];
    while (edges.length < m) {
        const u = Math.floor(random() * n);
        let v = Math.floor(random() * n);
        if (u === v) {
            v = (v + 1) % n;
        }
        const key = Math.min(u, v) * n + Math.max(u, v);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        edges.push([u, v]);
    }
    return edges;
}

/**
 * Seeded G(n, m) WITH self-loops and parallels and integer weights 1..10 (the graph-format benchmark generator).
 * @param n - node count
 * @param m - edge count
 * @param seed - the generator seed
 * @returns the weighted edges
 */
export function randomEdgesLoose(n: number, m: number, seed: number): EdgeSpec[] {
    const random = xorshift(seed);
    const edges: EdgeSpec[] = [];
    for (let e = 0; e < m; e++) {
        edges.push([Math.floor(random() * n), Math.floor(random() * n), 1 + Math.floor(random() * 10)]);
    }
    return edges;
}

/**
 * Seeded R-MAT-like hub graph over 2^scale nodes with edgeFactor edges per node (a, b, c, d = 0.57, 0.19, 0.19,
 * 0.05); self-loops and parallels are kept.
 * @param scale - log2 of the node count
 * @param edgeFactor - edges per node
 * @param seed - the generator seed
 * @returns the edges
 */
export function rmatEdges(scale: number, edgeFactor: number, seed: number): EdgeSpec[] {
    const random = xorshift(seed);
    const n = 2 ** scale;
    const edges: EdgeSpec[] = [];
    for (let e = 0; e < n * edgeFactor; e++) {
        let u = 0;
        let v = 0;
        for (let bit = 0; bit < scale; bit++) {
            const r = random();
            let qu = 0;
            let qv = 0;
            if (r < 0.57) {
                qu = 0;
                qv = 0;
            } else if (r < 0.76) {
                qu = 0;
                qv = 1;
            } else if (r < 0.95) {
                qu = 1;
                qv = 0;
            } else {
                qu = 1;
                qv = 1;
            }
            u = u * 2 + qu;
            v = v * 2 + qv;
        }
        edges.push([u, v]);
    }
    return edges;
}

/**
 * Options of snapshotOf / csrSnapshotOf. Exported by contract 5.2; nothing at P1-T2 imports it by name.
 * @public
 */
export interface SnapshotOptions {
    readonly directed?: boolean | undefined;
    readonly nodeCount?: number | undefined;
    readonly weighted?: boolean | undefined;
    readonly arena?: boolean | undefined;
    readonly label?: string | undefined;
    /** Record the FNV-1a checksums so `s.validate({ checksum: true })` can prove the arrays unchanged after a run. */
    readonly checksum?: boolean | undefined;
}

/**
 * The edge arrays of an edge list: weights are present iff some edge carries one or `weighted` is set (edges
 * without a weight get 1).
 * @param edges - the edge list
 * @param options - directedness, node count, weighting
 * @returns the fromEdgeArrays input parts
 */
function edgeArrays(
    edges: readonly EdgeSpec[],
    options: SnapshotOptions,
): { nodeCount: number; src: Uint32Array<ArrayBuffer>; dst: Uint32Array<ArrayBuffer>; weights: F32 | undefined } {
    const m = edges.length;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    let maxIndex = -1;
    let anyWeight = false;
    for (let e = 0; e < m; e++) {
        const edge = edges[e];
        src[e] = edge[0];
        dst[e] = edge[1];
        maxIndex = Math.max(maxIndex, edge[0], edge[1]);
        if (edge.length === 3) {
            anyWeight = true;
        }
    }
    let weights: F32 | undefined;
    if (anyWeight || options.weighted === true) {
        weights = new Float32Array(m);
        for (let e = 0; e < m; e++) {
            const edge = edges[e];
            weights[e] = edge.length === 3 ? edge[2] : 1;
        }
    }
    return { nodeCount: options.nodeCount ?? maxIndex + 1, src, dst, weights };
}

/**
 * fromEdgeArrays over the edge list (undirected by default; weights present iff some edge carries one or
 * `weighted`; the arena is built unless `arena: false`).
 * @param edges - the edge list
 * @param options - directedness, node count, weighting, arena, label
 * @returns the snapshot
 */
export function snapshotOf(edges: readonly EdgeSpec[], options?: SnapshotOptions): GraphSnapshot {
    const resolved = options ?? {};
    const parts = edgeArrays(edges, resolved);
    return fromEdgeArrays(
        {
            directed: resolved.directed ?? false,
            nodeCount: parts.nodeCount,
            src: parts.src,
            dst: parts.dst,
            weights: parts.weights,
        },
        {
            weighted: parts.weights === undefined ? undefined : true,
            arena: resolved.arena ?? true,
            label: resolved.label,
            checksum: resolved.checksum,
        },
    );
}

/**
 * The same graph through fromCsr on SEPARATE copied arrays, so `arena === null` for every graph WITH arcs (the
 * per-array upload path). fromCsr's arena detection accepts a lone rowPtr as a trivial arena, so an arc-less graph
 * keeps one; use snapshotOf(edges, { arena: false }) when a null arena is needed for arcCount 0.
 * @param edges - the edge list
 * @param options - directedness, node count, weighting (arena and label apply to the intermediate snapshot only)
 * @returns the snapshot (`arena === null` whenever arcCount > 0)
 */
export function csrSnapshotOf(edges: readonly EdgeSpec[], options?: SnapshotOptions): GraphSnapshot {
    const s = snapshotOf(edges, options);
    const identity = s.flags.arcToEdgeIsIdentity;
    const csr = fromCsr(
        {
            directed: s.directed,
            nodeCount: s.nodeCount,
            rowPtr: s.rowPtr.slice(),
            colIdx: s.colIdx.slice(),
            weights: s.weights === null ? null : s.weights.slice(),
            arcToEdge: identity ? undefined : s.arcToEdge.slice(),
            edgeToArc: identity ? undefined : s.edgeToArc.slice(),
            edgeCount: s.edgeCount,
        },
        { validate: "structure" },
    );
    return csr;
}

/** The named fixtures of spec 11.3 / 11.4. */
export const FIXTURE_NAMES: readonly string[] = Object.freeze([
    "empty",
    "one",
    "self-loop",
    "karate",
    "grid10",
    "path1k",
    "star200",
    "complete6",
    "random1k",
    "hub10k",
    "coincident",
    "isolated",
    "parallel",
    "rmat14",
    "random20k",
    "clumpy10",
    "clumpy100",
    "clumpy1000",
    "line",
    "polyline163",
    "onecell1k",
    "onecell1025",
    "outside5",
    "hubcell",
]);

/**
 * Seeded positions in [-1, 1) for n nodes, 3 per node.
 * @param n - node count
 * @param seed - the generator seed
 * @returns the positions
 */
function seededPositions(n: number, seed: number): F32 {
    const random = xorshift(seed);
    const positions = new Float32Array(3 * n);
    for (let i = 0; i < positions.length; i++) {
        positions[i] = 2 * random() - 1;
    }
    return positions;
}

/** The seed of the P4 fixtures' xorshift streams (positions and edges alike). */
const P4_SEED = 1006;
/** The half-width of the box every `onecell*` / `hubcell` position lies in: 1e-3 across, around (0.1, 0.1, 0.1). */
const ONE_CELL_HALF = 5e-4;

/**
 * Positions inside the 1e-3 box around (0.1, 0.1, 0.1): every node in ONE finest cell of any grid the P4 layouts
 * build.
 * @param n - node count
 * @returns the positions (3 per node)
 */
function oneCellPositions(n: number): F32 {
    const random = xorshift(P4_SEED);
    const positions = new Float32Array(3 * n);
    for (let i = 0; i < positions.length; i++) {
        positions[i] = 0.1 + ONE_CELL_HALF * (2 * random() - 1);
    }
    return positions;
}

/**
 * Positions drawn from `blobs` Gaussian blobs (centres uniform in [-0.8, 0.8) per axis, sigma 0.02) by the
 * Box-Muller pair, the blob of node i being i % blobs.
 * @param n - node count
 * @param blobs - the blob count
 * @returns the positions (3 per node)
 */
function clumpyPositions(n: number, blobs: number): F32 {
    const random = xorshift(P4_SEED);
    const centres = new Float64Array(3 * blobs);
    for (let k = 0; k < centres.length; k++) {
        centres[k] = 1.6 * random() - 0.8;
    }
    const positions = new Float32Array(3 * n);
    const sigma = 0.02;
    for (let i = 0; i < n; i++) {
        const blob = i % blobs;
        // Box-Muller: two uniforms give two independent standard normals; the third axis takes a second pair's first
        const u1 = Math.max(random(), Number.EPSILON);
        const u2 = random();
        const u3 = Math.max(random(), Number.EPSILON);
        const u4 = random();
        const r = Math.sqrt(-2 * Math.log(u1));
        const z0 = r * Math.cos(2 * Math.PI * u2);
        const z1 = r * Math.sin(2 * Math.PI * u2);
        const z2 = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);
        positions[3 * i] = centres[3 * blob] + sigma * z0;
        positions[3 * i + 1] = centres[3 * blob + 1] + sigma * z1;
        positions[3 * i + 2] = centres[3 * blob + 2] + sigma * z2;
    }
    return positions;
}

/**
 * The named fixtures of spec 11.3 / 11.4 sized by `scale` (1 on hardware, 1 / 50 on a software adapter; callers pass
 * gpuScale() / browserScale()): "empty", "one", "self-loop", "karate", "grid10", "path1k", "star200", "complete6",
 * "random1k", "hub10k" (a scaled 10k-degree star inside a random graph), "coincident" (karate with node 1 at node 0's
 * position and node 3 at node 2's, positions supplied), "isolated" (a connected giant component + 1% isolated nodes
 * + 100 triangles, scaled), "parallel" (parallels and zero weights), "rmat14" (a scale-14 R-MAT, 16,384 nodes and
 * 131,072 edges, whose degree distribution populates all three degree tiers of degreeOrder(); scale
 * 14 + log2(scale) rounded, never below 12, the smallest scale whose REVERSE order still has a row of in-degree
 * >= 1024) and the ten POSITIONED fixtures of the P4 grid suites (positions in [-1, 1) scene units, P4-T8 Step 1):
 * "random20k" (20k nodes over 5n random edges, uniform positions), "clumpy10" / "clumpy100" / "clumpy1000" (the
 * same graph, positions from 10 / 100 / 1000 Gaussian blobs of sigma 0.02), "line" (every position on
 * y = 0.3 x + 0.1, z = 0), "polyline163" (163 nodes on an irregular closed polygon, a cycle), "onecell1k" (1,024
 * nodes inside a 1e-3 box: exactly GRID_HUB_CELL entries in one finest cell), "onecell1025" (one over the
 * threshold), "outside5" (karate with five positions far outside the extent) and "hubcell" (20k nodes, scaled,
 * inside the same box).
 * @param name - a FIXTURE_NAMES entry
 * @param scale - the size factor (default 1)
 * @returns the snapshot, its positions (null unless the fixture supplies them) and the name
 */
export function fixture(
    name: string,
    scale?: number,
): { readonly snapshot: GraphSnapshot; readonly positions: F32 | null; readonly name: string } {
    const factor = scale ?? 1;
    const sized = (base: number, min: number): number => Math.max(min, Math.round(base * factor));
    let snapshot: GraphSnapshot;
    let positions: F32 | null = null;
    switch (name) {
        case "empty":
            snapshot = snapshotOf([], { nodeCount: 0, label: name });
            break;
        case "one":
            snapshot = snapshotOf([], { nodeCount: 1, label: name });
            break;
        case "self-loop":
            snapshot = snapshotOf(
                [
                    [0, 0],
                    [0, 1],
                    [1, 2],
                ],
                { label: name },
            );
            break;
        case "karate":
            snapshot = snapshotOf(KARATE_EDGES, { label: name });
            break;
        case "grid10":
            snapshot = snapshotOf(gridEdges(10, 10), { label: name });
            break;
        case "path1k":
            snapshot = snapshotOf(pathEdges(sized(1000, 8)), { label: name });
            break;
        case "star200":
            snapshot = snapshotOf(starEdges(sized(200, 4)), { label: name });
            break;
        case "complete6":
            snapshot = snapshotOf(completeEdges(6), { label: name });
            break;
        case "random1k": {
            const n = sized(1000, 16);
            snapshot = snapshotOf(randomEdges(n, 5 * n, 1001), { nodeCount: n, label: name });
            break;
        }
        case "hub10k": {
            const n = sized(10_000, 64);
            const edges: EdgeSpec[] = starEdges(n - 1);
            for (const [u, v] of randomEdges(n - 1, 2 * n, 1002)) {
                edges.push([u + 1, v + 1]);
            }
            snapshot = snapshotOf(edges, { nodeCount: n, label: name });
            break;
        }
        case "coincident": {
            snapshot = snapshotOf(KARATE_EDGES, { label: name });
            const p = seededPositions(34, 1004);
            p[3] = p[0];
            p[4] = p[1];
            p[5] = p[2];
            p[9] = p[6];
            p[10] = p[7];
            p[11] = p[8];
            positions = p;
            break;
        }
        case "isolated": {
            const giant = sized(1000, 64);
            const triangles = sized(100, 2);
            const isolated = Math.max(1, Math.round(0.01 * giant));
            const edges: EdgeSpec[] = pathEdges(giant);
            for (const edge of randomEdges(giant, 3 * giant, 1003)) {
                edges.push(edge);
            }
            for (let t = 0; t < triangles; t++) {
                const base = giant + 3 * t;
                edges.push([base, base + 1], [base + 1, base + 2], [base, base + 2]);
            }
            snapshot = snapshotOf(edges, { nodeCount: giant + 3 * triangles + isolated, label: name });
            break;
        }
        case "parallel":
            snapshot = snapshotOf(
                [
                    [0, 1, 1],
                    [0, 1, 2],
                    [1, 2, 0],
                    [2, 3, 0.5],
                    [1, 2, 0],
                ],
                { label: name },
            );
            break;
        case "rmat14": {
            const rmatScale = Math.max(12, Math.round(14 + Math.log2(factor)));
            snapshot = snapshotOf(rmatEdges(rmatScale, 8, 1005), { nodeCount: 2 ** rmatScale, label: name });
            break;
        }
        case "random20k":
        case "clumpy10":
        case "clumpy100":
        case "clumpy1000":
        case "line":
        case "hubcell": {
            const n = sized(20_000, 400);
            snapshot = snapshotOf(randomEdges(n, 5 * n, P4_SEED), { nodeCount: n, label: name });
            if (name === "random20k") {
                positions = seededPositions(n, P4_SEED);
            } else if (name === "line") {
                const p = seededPositions(n, P4_SEED);
                for (let i = 0; i < n; i++) {
                    p[3 * i + 1] = 0.3 * p[3 * i] + 0.1;
                    p[3 * i + 2] = 0;
                }
                positions = p;
            } else if (name === "hubcell") {
                positions = oneCellPositions(n);
            } else {
                positions = clumpyPositions(n, Number(name.slice("clumpy".length)));
            }
            break;
        }
        case "polyline163": {
            const n = 163;
            snapshot = snapshotOf(cycleEdges(n), { nodeCount: n, label: name });
            const random = xorshift(P4_SEED);
            const p = new Float32Array(3 * n);
            for (let k = 0; k < n; k++) {
                const theta = (2 * Math.PI * k) / n;
                const radius = 0.5 + 0.3 * Math.sin(3 * theta) + 0.1 * random();
                p[3 * k] = radius * Math.cos(theta);
                p[3 * k + 1] = radius * Math.sin(theta);
                p[3 * k + 2] = 0;
            }
            positions = p;
            break;
        }
        case "onecell1k":
        case "onecell1025": {
            const n = name === "onecell1k" ? 1024 : 1025;
            snapshot = snapshotOf(randomEdges(n, 5 * n, P4_SEED), { nodeCount: n, label: name });
            positions = oneCellPositions(n);
            break;
        }
        case "outside5": {
            snapshot = snapshotOf(KARATE_EDGES, { label: name });
            const p = seededPositions(34, P4_SEED);
            const far: readonly (readonly [number, number, number])[] = [
                [50, 50, 0],
                [-50, 20, 0],
                [20, -50, 0],
                [-50, -50, 0],
                [0, 70, 0],
            ];
            for (let k = 0; k < far.length; k++) {
                [p[3 * k], p[3 * k + 1], p[3 * k + 2]] = far[k];
            }
            positions = p;
            break;
        }
        default:
            throw new RangeError(`fixture: unknown fixture "${name}" (FIXTURE_NAMES: ${FIXTURE_NAMES.join(", ")})`);
    }
    return { snapshot, positions, name };
}

/**
 * A seeded G(n, m) with parallels and self-loops (an LCG over typed arrays: 10n edges at n = 2^20 must not go through
 * a tuple list) plus one star of `leaves` leaves on node 0, undirected: the hub row is node 0.
 * @param n - the node count
 * @param m - the random edge count
 * @param leaves - the star's leaves (nodes 1..leaves)
 * @param seed - the generator seed
 * @returns the snapshot
 */
export function hubbedRandom(n: number, m: number, leaves: number, seed: number): GraphSnapshot {
    const src = new Uint32Array(m + leaves);
    const dst = new Uint32Array(m + leaves);
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    for (let e = 0; e < m; e++) {
        src[e] = next() % n;
        dst[e] = next() % n;
    }
    for (let i = 0; i < leaves; i++) {
        src[m + i] = 0;
        dst[m + i] = 1 + (i % (n - 1));
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src, dst }, { label: `hubbed-random-${n}` });
}
