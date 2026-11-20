/**
 * Force-directed edge bundling (Holten and van Wijk, "Force-Directed Edge Bundling for Graph Visualization",
 * EuroVis 2009): each edge is cut into points that springs hold along it, and each point is pulled toward the
 * matching point of every edge compatible with it (edges about as long, as parallel and as close), so edges that
 * run the same way gather into bundles. `line.route` "bundled" draws an edge through its points.
 */

/** One edge to bundle: its two ends, in the plane the edges are drawn in. */
export interface BundleEdge {
    readonly src: { readonly x: number; readonly y: number };
    readonly dst: { readonly x: number; readonly y: number };
}

/** How hard and how long to bundle. */
export interface BundleOptions {
    /** 0 draws every edge straight, 1 fully bundled; between, each point that share of the way. */
    readonly strength: number;
    /** The iterations of the first cycle; each later cycle runs two thirds as many. */
    readonly iterations: number;
}

/** The cycles: each doubles the points an edge is cut into, from one. */
const CYCLES = 5;
/** The first cycle's step, as a share of the edges' mean length; each later cycle halves it. */
const STEP_SHARE = 0.04;
/** How stiff the springs along an edge are. */
const SPRING = 0.1;
/** Edges less compatible than this do not pull on each other. */
const COMPATIBLE = 0.6;

/**
 * How compatible two edges are, from 0 to 1: the product of how parallel, how alike in length and how close their
 * middles are (the paper's angle, scale and position compatibility).
 * @param a - An edge.
 * @param b - Another.
 * @returns The compatibility.
 */
function compatibility(a: BundleEdge, b: BundleEdge): number {
    const ax = a.dst.x - a.src.x;
    const ay = a.dst.y - a.src.y;
    const bx = b.dst.x - b.src.x;
    const by = b.dst.y - b.src.y;
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) {
        return 0;
    }
    const angle = Math.abs((ax * bx + ay * by) / (la * lb));
    const mean = (la + lb) / 2;
    const scale = 2 / (mean / Math.min(la, lb) + Math.max(la, lb) / mean);
    const mid = Math.hypot((a.src.x + a.dst.x - b.src.x - b.dst.x) / 2, (a.src.y + a.dst.y - b.src.y - b.dst.y) / 2);
    const position = mean / (mean + mid);
    return angle * scale * position;
}

/**
 * Cuts each edge's points into twice as many, evenly along the polyline they make.
 * @param edges - The edges.
 * @param points - Each edge's inner points, flat x, y pairs.
 * @param count - How many inner points each edge gets.
 * @returns The new points.
 */
function subdivide(edges: readonly BundleEdge[], points: readonly number[][], count: number): number[][] {
    return edges.map((edge, e) => {
        const line = [edge.src.x, edge.src.y, ...points[e], edge.dst.x, edge.dst.y];
        let length = 0;
        for (let i = 2; i < line.length; i += 2) {
            length += Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1]);
        }
        const out: number[] = [];
        const piece = length / (count + 1);
        let at = 0;
        let walked = 0;
        for (let k = 1; k <= count; k++) {
            const want = piece * k;
            while (at + 2 < line.length) {
                const seg = Math.hypot(line[at + 2] - line[at], line[at + 3] - line[at + 1]);
                if (walked + seg >= want || at + 4 >= line.length) {
                    const t = seg === 0 ? 0 : (want - walked) / seg;
                    out.push(
                        line[at] + (line[at + 2] - line[at]) * t,
                        line[at + 1] + (line[at + 3] - line[at + 1]) * t,
                    );
                    break;
                }
                walked += seg;
                at += 2;
            }
        }
        return out;
    });
}

/**
 * The pull on one point of an edge from the same point of each compatible edge: a unit toward each.
 * @param points - Every edge's inner points.
 * @param others - The compatible edges.
 * @param p - The point's index.
 * @param x - The point's x.
 * @param y - The point's y.
 * @returns The pull.
 */
function attraction(
    points: readonly number[][],
    others: readonly number[],
    p: number,
    x: number,
    y: number,
): { x: number; y: number } {
    let fx = 0;
    let fy = 0;
    for (const o of others) {
        const dx = points[o][2 * p] - x;
        const dy = points[o][2 * p + 1] - y;
        const d = Math.hypot(dx, dy);
        if (d > 1e-9) {
            fx += dx / d;
            fy += dy / d;
        }
    }
    return { x: fx, y: fy };
}

/**
 * Bundles edges: see the file header.
 *
 * ponytail: every pair of edges is compared, O(edges^2 * points) a step; a spatial index of edge middles
 * is the upgrade when bundled graphs reach thousands of edges.
 * @param edges - The edges, in the plane they are drawn in.
 * @param options - How hard and how long.
 * @returns Each edge's inner points, flat x, y pairs, ends excluded; an empty list draws it straight.
 */
export function bundleEdges(edges: readonly BundleEdge[], options: BundleOptions): number[][] {
    const strength = Math.min(1, Math.max(0, options.strength));
    if (edges.length < 2 || strength === 0) {
        return edges.map(() => []);
    }
    const compatible = edges.map((a, i) =>
        edges.flatMap((b, j) => (i !== j && compatibility(a, b) >= COMPATIBLE ? [j] : [])),
    );
    const lengths = edges.map((edge) => Math.hypot(edge.dst.x - edge.src.x, edge.dst.y - edge.src.y));
    const meanLength = lengths.reduce((sum, length) => sum + length, 0) / edges.length;
    let points: number[][] = edges.map(() => []);
    let count = 1;
    let step = STEP_SHARE * meanLength;
    let iterations = Math.max(1, Math.round(options.iterations));
    for (let cycle = 0; cycle < CYCLES; cycle++) {
        points = subdivide(edges, points, count);
        for (let it = 0; it < iterations; it++) {
            points = points.map((own, e) => {
                const edge = edges[e];
                const k = SPRING / (lengths[e] * (count + 1) || 1);
                const next = [...own];
                for (let p = 0; p < count; p++) {
                    const x = own[2 * p];
                    const y = own[2 * p + 1];
                    const prevX = p === 0 ? edge.src.x : own[2 * p - 2];
                    const prevY = p === 0 ? edge.src.y : own[2 * p - 1];
                    const nextX = p === count - 1 ? edge.dst.x : own[2 * p + 2];
                    const nextY = p === count - 1 ? edge.dst.y : own[2 * p + 3];
                    const pull = attraction(points, compatible[e], p, x, y);
                    const fx = k * (prevX - x + nextX - x) + pull.x;
                    const fy = k * (prevY - y + nextY - y) + pull.y;
                    const f = Math.hypot(fx, fy);
                    if (f > 0) {
                        next[2 * p] = x + (step * fx) / Math.max(1, f);
                        next[2 * p + 1] = y + (step * fy) / Math.max(1, f);
                    }
                }
                return next;
            });
        }
        count *= 2;
        step /= 2;
        iterations = Math.max(1, Math.round((iterations * 2) / 3));
    }
    // Strength: each point that share of the way from the straight line to its bundle.
    return points.map((own, e) => {
        const edge = edges[e];
        const n = own.length / 2;
        return own.map((value, i) => {
            const t = (Math.floor(i / 2) + 1) / (n + 1);
            const straight =
                i % 2 === 0 ? edge.src.x + (edge.dst.x - edge.src.x) * t : edge.src.y + (edge.dst.y - edge.src.y) * t;
            return straight + (value - straight) * strength;
        });
    });
}

/**
 * The bundles of every edge drawn with `line.route` "bundled", worked out together when one of them asks after any
 * of them moved, restyled, came or went; edges with different strengths or iterations bundle apart. They are worked
 * out at most once a frame: the edges a frame places are read together, and a change after that stays stale until
 * the next frame's first read.
 * @internal
 */
export class ForceBundles<E> {
    /** Counts each new set of bundles, so an edge drawn along an older one draws again. */
    version = 0;
    #stale = true;
    /** Set when the bundles were worked out in this synchronous frame, cleared after it. */
    #fresh = false;
    #bends = new Map<E, number[]>();

    /**
     * Whether the bundles must be worked out again before they are read.
     * @returns True when they must.
     */
    get stale(): boolean {
        return this.#stale;
    }

    /** Something a bundle depends on changed: an edge's ends, its style, the edges there are. */
    touch(): void {
        this.#stale = true;
    }

    /**
     * One edge's inner points, working every bundle out again first when stale.
     * @param edge - The edge.
     * @param edges - Every edge there is.
     * @param read - An edge's ends and options when it is drawn bundled, else undefined.
     * @returns Its inner points, flat x, y pairs; empty draws it straight.
     */
    bendsOf(
        edge: E,
        edges: () => Iterable<E>,
        read: (edge: E) => { edge: BundleEdge; options: BundleOptions } | undefined,
    ): readonly number[] {
        if (this.#stale && !this.#fresh) {
            this.#stale = false;
            this.#fresh = true;
            queueMicrotask(() => {
                this.#fresh = false;
            });
            this.version++;
            const groups = new Map<string, { edges: E[]; ends: BundleEdge[]; options: BundleOptions }>();
            for (const each of edges()) {
                const input = read(each);
                if (input === undefined) {
                    continue;
                }
                const key = `${String(input.options.strength)}|${String(input.options.iterations)}`;
                const group = groups.get(key) ?? { edges: [], ends: [], options: input.options };
                group.edges.push(each);
                group.ends.push(input.edge);
                groups.set(key, group);
            }
            this.#bends = new Map();
            for (const group of groups.values()) {
                const bends = bundleEdges(group.ends, group.options);
                group.edges.forEach((each, i) => this.#bends.set(each, bends[i]));
            }
        }
        return this.#bends.get(edge) ?? [];
    }
}
