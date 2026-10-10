import type { F64, GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { type CommonLayoutOptions, planar as inPlane, resolve, result } from "./common.js";

/**
 * A combinatorial embedding: around every node, its neighbours in clockwise order, as a circular doubly linked list
 * (`cw` and `ccw`), and the neighbour the order starts at. A port of NetworkX's `PlanarEmbedding`.
 */
class Embedding {
    readonly cw: Map<number, number>[];
    readonly ccw: Map<number, number>[];
    readonly first: Int32Array;

    constructor(readonly n: number) {
        this.cw = Array.from({ length: n }, () => new Map<number, number>());
        this.ccw = Array.from({ length: n }, () => new Map<number, number>());
        this.first = new Int32Array(n).fill(-1);
    }

    has(v: number, w: number): boolean {
        return this.cw[v].has(w);
    }

    /**
     * The half-edge v -> w, clockwise after v -> ref; with ref -1, the first half-edge of v.
     * @param v - the node the half-edge leaves
     * @param w - the node it reaches
     * @param ref - the neighbour it is placed next to, or -1
     */
    addCw(v: number, w: number, ref: number): void {
        if (ref < 0) {
            this.cw[v].set(w, w);
            this.ccw[v].set(w, w);
            this.first[v] = w;
            return;
        }
        const after = this.cw[v].get(ref);
        if (after === undefined) {
            throw new Error("Cannot add edge. Reference neighbor does not exist");
        }
        this.cw[v].set(ref, w);
        this.cw[v].set(w, after);
        this.ccw[v].set(after, w);
        this.ccw[v].set(w, ref);
    }

    /**
     * The half-edge v -> w, counter-clockwise before v -> ref; with ref -1, the first half-edge of v.
     * @param v - the node the half-edge leaves
     * @param w - the node it reaches
     * @param ref - the neighbour it is placed next to, or -1
     */
    addCcw(v: number, w: number, ref: number): void {
        if (ref < 0) {
            this.addCw(v, w, -1);
            return;
        }
        this.addCw(v, w, this.ccw[v].get(ref) ?? -1);
        if (ref === this.first[v]) {
            this.first[v] = w;
        }
    }

    /**
     * The half-edge v -> w, first in the order around v.
     * @param v - the node the half-edge leaves
     * @param w - the node it reaches
     */
    addFirst(v: number, w: number): void {
        this.addCcw(v, w, this.first[v]);
    }

    /**
     * The half-edge after v -> w along the face to its right.
     * @param v - the node the half-edge leaves
     * @param w - the node it reaches
     * @returns the next half-edge
     */
    nextFace(v: number, w: number): [number, number] {
        return [w, this.ccw[w].get(v) ?? -1];
    }

    /**
     * The neighbours of v in clockwise order.
     * @param v - the node
     * @returns its neighbours
     */
    neighboursCw(v: number): number[] {
        const start = this.first[v];
        if (start < 0) {
            return [];
        }
        const out = [start];
        for (let w = this.cw[v].get(start) ?? start; w !== start; w = this.cw[v].get(w) ?? start) {
            out.push(w);
        }
        return out;
    }
}

/** A set of return edges (as edge keys; -1 is none) that must all lie on the same side. */
interface Interval {
    low: number;
    high: number;
}

/** Two intervals whose edges must lie on opposite sides. */
interface ConflictPair {
    left: Interval;
    right: Interval;
}

const interval = (low = -1, high = -1): Interval => ({ low, high });
const empty = (i: Interval): boolean => i.low < 0 && i.high < 0;

/**
 * The left-right planarity test of de Fraysseix and Rosenstiehl as Brandes describes it, with the embedding it
 * yields: a port of NetworkX's `LRPlanarity` (its non-recursive variant). Edges are keys `v * n + w`.
 */
class LeftRight {
    private readonly n: number;
    private readonly height: Int32Array;
    private readonly parentEdge: Float64Array;
    private readonly lowpt = new Map<number, number>();
    private readonly lowpt2 = new Map<number, number>();
    private readonly nesting = new Map<number, number>();
    private readonly oriented = new Set<number>();
    private readonly out: number[][];
    private ordered: number[][] = [];
    private readonly ref = new Map<number, number>();
    private readonly side = new Map<number, number>();
    private readonly stack: ConflictPair[] = [];
    private readonly stackBottom = new Map<number, ConflictPair | null>();
    private readonly lowptEdge = new Map<number, number>();
    private readonly leftRef = new Map<number, number>();
    private readonly rightRef = new Map<number, number>();
    private readonly roots: number[] = [];

    constructor(private readonly adj: readonly number[][]) {
        this.n = adj.length;
        this.height = new Int32Array(this.n).fill(-1);
        this.parentEdge = new Float64Array(this.n).fill(-1);
        this.out = Array.from({ length: this.n }, () => []);
    }

    private key(v: number, w: number): number {
        return v * this.n + w;
    }

    private target(e: number): number {
        return e % this.n;
    }

    private low(e: number): number {
        return this.lowpt.get(e) ?? 0;
    }

    /**
     * The embedding, or null when the graph is not planar.
     * @returns the embedding
     */
    run(): Embedding | null {
        const { n } = this;
        const edgeCount = this.adj.reduce((t, l) => t + l.length, 0) / 2;
        if (n > 2 && edgeCount > 3 * n - 6) {
            return null;
        }
        for (let v = 0; v < n; v++) {
            if (this.height[v] < 0) {
                this.height[v] = 0;
                this.roots.push(v);
                this.orient(v);
            }
        }
        const byNesting = (v: number): number[] =>
            [...this.out[v]].sort(
                (a, b) => (this.nesting.get(this.key(v, a)) ?? 0) - (this.nesting.get(this.key(v, b)) ?? 0),
            );
        this.ordered = Array.from({ length: n }, (_, v) => byNesting(v));
        for (const v of this.roots) {
            if (!this.test(v)) {
                return null;
            }
        }
        for (const e of this.oriented) {
            this.nesting.set(e, this.sign(e) * (this.nesting.get(e) ?? 0));
        }
        const embedding = new Embedding(n);
        for (let v = 0; v < n; v++) {
            this.ordered[v] = byNesting(v);
            let previous = -1;
            for (const w of this.ordered[v]) {
                embedding.addCw(v, w, previous);
                previous = w;
            }
        }
        for (const v of this.roots) {
            this.embed(v, embedding);
        }
        return embedding;
    }

    /**
     * Orients the edges by a depth-first search from `root`, and computes lowpoints and the nesting order.
     * @param root - the search root
     */
    private orient(root: number): void {
        const stack = [root];
        const index = new Int32Array(this.n);
        const resumed = new Set<number>();
        while (stack.length > 0) {
            const v = stack.pop() ?? 0;
            const e = this.parentEdge[v];
            while (index[v] < this.adj[v].length) {
                const w = this.adj[v][index[v]];
                const vw = this.key(v, w);
                if (!resumed.has(vw)) {
                    if (this.oriented.has(vw) || this.oriented.has(this.key(w, v))) {
                        index[v]++;
                        continue;
                    }
                    this.oriented.add(vw);
                    this.out[v].push(w);
                    this.lowpt.set(vw, this.height[v]);
                    this.lowpt2.set(vw, this.height[v]);
                    if (this.height[w] < 0) {
                        // a tree edge: visit w, then come back to v
                        this.parentEdge[w] = vw;
                        this.height[w] = this.height[v] + 1;
                        stack.push(v, w);
                        resumed.add(vw);
                        break;
                    }
                    // a back edge
                    this.lowpt.set(vw, this.height[w]);
                }
                this.nesting.set(vw, 2 * this.low(vw) + ((this.lowpt2.get(vw) ?? 0) < this.height[v] ? 1 : 0));
                if (e >= 0) {
                    const le = this.low(e);
                    const l2e = this.lowpt2.get(e) ?? 0;
                    const lvw = this.low(vw);
                    const l2vw = this.lowpt2.get(vw) ?? 0;
                    if (lvw < le) {
                        this.lowpt2.set(e, Math.min(le, l2vw));
                        this.lowpt.set(e, lvw);
                    } else if (lvw > le) {
                        this.lowpt2.set(e, Math.min(l2e, lvw));
                    } else {
                        this.lowpt2.set(e, Math.min(l2e, l2vw));
                    }
                }
                index[v]++;
            }
        }
    }

    private conflicting(i: Interval, b: number): boolean {
        return !empty(i) && this.low(i.high) > this.low(b);
    }

    private lowest(p: ConflictPair): number {
        if (empty(p.left)) {
            return this.low(p.right.low);
        }
        if (empty(p.right)) {
            return this.low(p.left.low);
        }
        return Math.min(this.low(p.left.low), this.low(p.right.low));
    }

    private top(): ConflictPair | null {
        return this.stack.length === 0 ? null : this.stack[this.stack.length - 1];
    }

    /**
     * Tests for a left-right partition below `root`.
     * @param root - the search root
     * @returns false when the graph is not planar
     */
    private test(root: number): boolean {
        const stack = [root];
        const index = new Int32Array(this.n);
        const resumed = new Set<number>();
        while (stack.length > 0) {
            const v = stack.pop() ?? 0;
            const e = this.parentEdge[v];
            let descended = false;
            const list = this.ordered[v];
            while (index[v] < list.length) {
                const w = list[index[v]];
                const ei = this.key(v, w);
                if (!resumed.has(ei)) {
                    this.stackBottom.set(ei, this.top());
                    if (ei === this.parentEdge[w]) {
                        stack.push(v, w);
                        resumed.add(ei);
                        descended = true;
                        break;
                    }
                    this.lowptEdge.set(ei, ei);
                    this.stack.push({ left: interval(), right: interval(ei, ei) });
                }
                if (this.low(ei) < this.height[v]) {
                    if (w === list[0]) {
                        this.lowptEdge.set(e, this.lowptEdge.get(ei) ?? -1);
                    } else if (!this.addConstraints(ei, e)) {
                        return false;
                    }
                }
                index[v]++;
            }
            if (!descended && e >= 0) {
                this.removeBackEdges(e);
            }
        }
        return true;
    }

    private addConstraints(ei: number, e: number): boolean {
        const p: ConflictPair = { left: interval(), right: interval() };
        for (;;) {
            const q = this.stack.pop() as ConflictPair;
            if (!empty(q.left)) {
                [q.left, q.right] = [q.right, q.left];
            }
            if (!empty(q.left)) {
                return false;
            }
            if (this.low(q.right.low) > this.low(e)) {
                if (empty(p.right)) {
                    p.right = { ...q.right };
                } else {
                    this.ref.set(p.right.low, q.right.high);
                }
                p.right.low = q.right.low;
            } else {
                this.ref.set(q.right.low, this.lowptEdge.get(e) ?? -1);
            }
            if (this.top() === (this.stackBottom.get(ei) ?? null)) {
                break;
            }
        }
        for (
            let t = this.top();
            t !== null && (this.conflicting(t.left, ei) || this.conflicting(t.right, ei));
            t = this.top()
        ) {
            const q = this.stack.pop() as ConflictPair;
            if (this.conflicting(q.right, ei)) {
                [q.left, q.right] = [q.right, q.left];
            }
            if (this.conflicting(q.right, ei)) {
                return false;
            }
            this.ref.set(p.right.low, q.right.high);
            if (q.right.low >= 0) {
                p.right.low = q.right.low;
            }
            if (empty(p.left)) {
                p.left = { ...q.left };
            } else {
                this.ref.set(p.left.low, q.left.high);
            }
            p.left.low = q.left.low;
        }
        if (!(empty(p.left) && empty(p.right))) {
            this.stack.push(p);
        }
        return true;
    }

    private removeBackEdges(e: number): void {
        const u = Math.floor(e / this.n);
        const refOf = (x: number): number => this.ref.get(x) ?? -1;
        while (this.stack.length > 0 && this.lowest(this.top() as ConflictPair) === this.height[u]) {
            const p = this.stack.pop() as ConflictPair;
            if (p.left.low >= 0) {
                this.side.set(p.left.low, -1);
            }
        }
        if (this.stack.length > 0) {
            const p = this.stack.pop() as ConflictPair;
            while (p.left.high >= 0 && this.target(p.left.high) === u) {
                p.left.high = refOf(p.left.high);
            }
            if (p.left.high < 0 && p.left.low >= 0) {
                this.ref.set(p.left.low, p.right.low);
                this.side.set(p.left.low, -1);
                p.left.low = -1;
            }
            while (p.right.high >= 0 && this.target(p.right.high) === u) {
                p.right.high = refOf(p.right.high);
            }
            if (p.right.high < 0 && p.right.low >= 0) {
                this.ref.set(p.right.low, p.left.low);
                this.side.set(p.right.low, -1);
                p.right.low = -1;
            }
            this.stack.push(p);
        }
        if (this.low(e) < this.height[u]) {
            const t = this.top() as ConflictPair;
            const hl = t.left.high;
            const hr = t.right.high;
            this.ref.set(e, hl >= 0 && (hr < 0 || this.low(hl) > this.low(hr)) ? hl : hr);
        }
    }

    /**
     * The absolute side of an edge, resolving its chain of references.
     * @param start - the edge
     * @returns 1 or -1
     */
    private sign(start: number): number {
        const stack = [start];
        const oldRef = new Map<number, number>();
        while (stack.length > 0) {
            const e = stack.pop() ?? 0;
            const r = this.ref.get(e) ?? -1;
            if (r >= 0) {
                stack.push(e, r);
                oldRef.set(e, r);
                this.ref.set(e, -1);
            } else {
                const o = oldRef.get(e) ?? -1;
                this.side.set(e, (this.side.get(e) ?? 1) * (o >= 0 ? (this.side.get(o) ?? 1) : 1));
            }
        }
        return this.side.get(start) ?? 1;
    }

    /**
     * Adds the half-edges back along every edge below `root`.
     * @param root - the search root
     * @param embedding - the embedding so far
     */
    private embed(root: number, embedding: Embedding): void {
        const stack = [root];
        const index = new Int32Array(this.n);
        while (stack.length > 0) {
            const v = stack.pop() ?? 0;
            const list = this.ordered[v];
            while (index[v] < list.length) {
                const w = list[index[v]++];
                const ei = this.key(v, w);
                if (ei === this.parentEdge[w]) {
                    embedding.addFirst(w, v);
                    this.leftRef.set(v, w);
                    this.rightRef.set(v, w);
                    stack.push(v, w);
                    break;
                }
                if ((this.side.get(ei) ?? 1) === 1) {
                    embedding.addCw(w, v, this.rightRef.get(w) ?? -1);
                } else {
                    embedding.addCcw(w, v, this.leftRef.get(w) ?? -1);
                    this.leftRef.set(w, v);
                }
            }
        }
    }
}

/**
 * Adds edges inside the face to the right of v -> w until no node repeats on it, and returns the face's nodes, or []
 * when the face was already walked. A port of NetworkX's `make_bi_connected`.
 * @param embedding - the embedding
 * @param start - the half-edge's first node
 * @param outgoing - its second node
 * @param counted - the half-edges already walked, as keys v * n + w
 * @returns the face's nodes
 */
function makeBiconnected(embedding: Embedding, start: number, outgoing: number, counted: Set<number>): number[] {
    const { n } = embedding;
    if (counted.has(start * n + outgoing)) {
        return [];
    }
    counted.add(start * n + outgoing);
    let v1 = start;
    let v2 = outgoing;
    const face = [start];
    const onFace = new Set(face);
    let [, v3] = embedding.nextFace(v1, v2);
    while (v2 !== start || v3 !== outgoing) {
        if (onFace.has(v2)) {
            embedding.addCw(v1, v3, v2);
            embedding.addCcw(v3, v1, v2);
            counted.add(v2 * n + v3);
            counted.add(v3 * n + v1);
            v2 = v1;
        } else {
            onFace.add(v2);
            face.push(v2);
        }
        v1 = v2;
        [v2, v3] = embedding.nextFace(v2, v3);
        counted.add(v1 * n + v2);
    }
    return face;
}

/**
 * Triangulates the face to the right of v1 -> v2. A port of NetworkX's `triangulate_face`.
 * @param embedding - the embedding
 * @param v1 - the half-edge's first node
 * @param v2 - its second node
 */
function triangulateFace(embedding: Embedding, v1: number, v2: number): void {
    let [, v3] = embedding.nextFace(v1, v2);
    let [, v4] = embedding.nextFace(v2, v3);
    if (v1 === v2 || v1 === v3) {
        return;
    }
    while (v1 !== v4) {
        if (embedding.has(v1, v3)) {
            [v1, v2, v3] = [v2, v3, v4];
        } else {
            embedding.addCw(v1, v3, v2);
            embedding.addCcw(v3, v1, v2);
            [v2, v3] = [v3, v4];
        }
        [, v4] = embedding.nextFace(v2, v3);
    }
}

/**
 * Connects the components, makes the embedding biconnected and triangulates every face but the largest, which is
 * returned as the outer face. A port of NetworkX's `triangulate_embedding` (without full triangulation).
 * @param embedding - the embedding
 * @returns the outer face
 */
function triangulate(embedding: Embedding): number[] {
    const { n } = embedding;
    // the smallest node of each component, joined one to the next
    const seen = new Uint8Array(n);
    const firsts: number[] = [];
    for (let r = 0; r < n; r++) {
        if (seen[r] === 1) {
            continue;
        }
        firsts.push(r);
        seen[r] = 1;
        for (const stack = [r]; stack.length > 0;) {
            for (const w of embedding.neighboursCw(stack.pop() ?? 0)) {
                if (seen[w] === 0) {
                    seen[w] = 1;
                    stack.push(w);
                }
            }
        }
    }
    for (let i = 0; i + 1 < firsts.length; i++) {
        embedding.addFirst(firsts[i], firsts[i + 1]);
        embedding.addFirst(firsts[i + 1], firsts[i]);
    }
    let outer: number[] = [];
    const faces: number[][] = [];
    const counted = new Set<number>();
    for (let v = 0; v < n; v++) {
        const start = embedding.first[v];
        if (start < 0) {
            continue;
        }
        // read the next neighbour only after the face is done, as NetworkX's generator does: it may add edges at v
        let w = start;
        do {
            const face = makeBiconnected(embedding, v, w, counted);
            if (face.length > 0) {
                faces.push(face);
                if (face.length > outer.length) {
                    outer = face;
                }
            }
            w = embedding.cw[v].get(w) ?? start;
        } while (w !== start);
    }
    for (const face of faces) {
        if (face !== outer) {
            triangulateFace(embedding, face[0], face[1]);
        }
    }
    return outer;
}

/**
 * A canonical ordering of a triangulated embedding, each node with the contour nodes it covers. A port of NetworkX's
 * `get_canonical_ordering`.
 * @param embedding - the embedding
 * @param outer - the outer face, in order
 * @returns each node with the contour nodes it covers, in order
 */
function canonicalOrdering(embedding: Embedding, outer: readonly number[]): [number, number[]][] {
    const { n } = embedding;
    const v1 = outer[0];
    const v2 = outer[1];
    const chords = new Int32Array(n);
    const marked = new Uint8Array(n);
    const ready = new Set(outer);
    const ccwNbr = new Map<number, number>();
    const cwNbr = new Map<number, number>();
    let prev = v2;
    for (let i = 2; i < outer.length; i++) {
        ccwNbr.set(prev, outer[i]);
        prev = outer[i];
    }
    ccwNbr.set(prev, v1);
    prev = v1;
    for (let i = outer.length - 1; i > 0; i--) {
        cwNbr.set(prev, outer[i]);
        prev = outer[i];
    }
    const isOuterNbr = (x: number, y: number): boolean => ccwNbr.get(x) === y || cwNbr.get(x) === y;
    const isOnOuter = (x: number): boolean => marked[x] === 0 && (ccwNbr.has(x) || x === v1);
    for (const v of outer) {
        for (const nbr of embedding.neighboursCw(v)) {
            if (isOnOuter(nbr) && !isOuterNbr(v, nbr)) {
                chords[v]++;
                ready.delete(v);
            }
        }
    }
    const order: [number, number[]][] = new Array<[number, number[]]>(n);
    order[0] = [v1, []];
    order[1] = [v2, []];
    ready.delete(v1);
    ready.delete(v2);
    for (let k = n - 1; k > 1; k--) {
        const v = ready.values().next().value as number;
        ready.delete(v);
        marked[v] = 1;
        let wp = -1;
        let wq = -1;
        for (const nbr of embedding.neighboursCw(v)) {
            if (marked[nbr] === 1) {
                continue;
            }
            if (isOnOuter(nbr)) {
                if (nbr === v1) {
                    wp = v1;
                } else if (nbr === v2) {
                    wq = v2;
                } else if (cwNbr.get(nbr) === v) {
                    wp = nbr;
                } else {
                    wq = nbr;
                }
            }
            if (wp >= 0 && wq >= 0) {
                break;
            }
        }
        const contour = [wp];
        for (let nbr = wp; nbr !== wq;) {
            const next = embedding.ccw[v].get(nbr) ?? wq;
            contour.push(next);
            cwNbr.set(nbr, next);
            ccwNbr.set(next, nbr);
            nbr = next;
        }
        if (contour.length === 2) {
            for (const w of [wp, wq]) {
                if (--chords[w] === 0) {
                    ready.add(w);
                }
            }
        } else {
            const inner = new Set(contour.slice(1, -1));
            for (const w of inner) {
                ready.add(w);
                for (const nbr of embedding.neighboursCw(w)) {
                    if (isOnOuter(nbr) && !isOuterNbr(w, nbr)) {
                        chords[w]++;
                        ready.delete(w);
                        if (!inner.has(nbr)) {
                            chords[nbr]++;
                            ready.delete(nbr);
                        }
                    }
                }
            }
        }
        order[k] = [v, contour];
    }
    return order;
}

/**
 * Integer grid positions of a planar embedding, no two edges crossing: the shift method of de Fraysseix, Pach and
 * Pollack in Chrobak and Payne's linear-time form. A port of NetworkX's `combinatorial_embedding_to_pos`.
 * @param embedding - the embedding; edges are added to it
 * @returns `2 * n` values
 */
function embeddingToRows(embedding: Embedding): F64 {
    const { n } = embedding;
    const rows = new Float64Array(2 * n);
    if (n < 4) {
        const defaults = [0, 0, 2, 0, 1, 1];
        rows.set(defaults.slice(0, 2 * n));
        return rows;
    }
    const order = canonicalOrdering(embedding, triangulate(embedding));
    const left = new Int32Array(n).fill(-1);
    const right = new Int32Array(n).fill(-1);
    const dx = new Float64Array(n);
    const y = new Float64Array(n);
    const [v1, v2, v3] = [order[0][0], order[1][0], order[2][0]];
    right[v1] = v3;
    dx[v2] = 1;
    dx[v3] = 1;
    y[v3] = 1;
    right[v3] = v2;
    for (let k = 3; k < n; k++) {
        const [vk, contour] = order[k];
        const wp = contour[0];
        const wp1 = contour[1];
        const wq = contour[contour.length - 1];
        const wq1 = contour[contour.length - 2];
        const several = contour.length > 2;
        dx[wp1] += 1;
        dx[wq] += 1;
        let span = 0;
        for (let i = 1; i < contour.length; i++) {
            span += dx[contour[i]];
        }
        dx[vk] = Math.floor((-y[wp] + span + y[wq]) / 2);
        y[vk] = Math.floor((y[wp] + span + y[wq]) / 2);
        dx[wq] = span - dx[vk];
        if (several) {
            dx[wp1] -= dx[vk];
        }
        right[wp] = vk;
        right[vk] = wq;
        if (several) {
            left[vk] = wp1;
            right[wq1] = -1;
        } else {
            left[vk] = -1;
        }
    }
    // x is relative to the parent in the tree of left and right children
    rows[2 * v1 + 1] = y[v1];
    for (const stack = [v1]; stack.length > 0;) {
        const parent = stack.pop() ?? 0;
        for (const child of [left[parent], right[parent]]) {
            if (child >= 0) {
                rows[2 * child] = rows[2 * parent] + dx[child];
                rows[2 * child + 1] = y[child];
                stack.push(child);
            }
        }
    }
    return rows;
}

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
 * Planar-layout rows over an undirected snapshot, rescaled so the farthest node is `scale` from `center`.
 * @param g - an undirected snapshot
 * @param scale - the distance of the farthest node from the centre
 * @param center - at least 2 components
 * @returns `2 * n` values
 * @throws "G is not planar." when the graph is not planar
 */
function planarRows(g: GraphSnapshot, scale: number, center: readonly number[]): F64 {
    const embedding = new LeftRight(neighbourLists(g)).run();
    if (embedding === null) {
        throw new Error("G is not planar.");
    }
    return rescaleInPlace(embeddingToRows(embedding), 2, scale, center);
}

/**
 * Nodes placed so that no two edges cross, as NetworkX's `planar_layout` places them: the left-right planarity test
 * finds an embedding, and the shift method of de Fraysseix, Pach and Pollack (in Chrobak and Payne's form) puts the
 * nodes on integer grid points from it. Self-loops and parallel edges are ignored; the layout is deterministic, so
 * `seed` has no effect. In 3D the layout lies in the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the distance of the farthest node from the centre
 * @returns the layout
 * @throws "G is not planar." when the graph is not planar
 */
export function planar(s: GraphSnapshot, options: CommonLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    return result(inPlane(planarRows(toLayoutSnapshot(s), scale, center), dim, center), dim, n);
}
