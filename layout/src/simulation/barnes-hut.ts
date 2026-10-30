/**
 * The Barnes-Hut tree of ForceAtlas2's repulsion (`barnesHutOptimize`): a quadtree in 2D, an octree in 3D, rebuilt
 * each iteration over the f64 LAYOUT-unit positions. A cell far enough from a node (its width over the distance to
 * its centre of mass below `theta`) repels it as one body of the cell's total mass at that centre, as Gephi's
 * ForceAtlas2 does; every nearer body is visited one by one. That makes the repulsion O(n log n) per iteration instead
 * of the O(n^2) of every pair.
 */

/** Cells deeper than this keep their bodies in one list (coincident nodes cannot be split by halving the cell). */
const MAX_DEPTH = 40;

/** The nodes a cell holds before it splits. */
const LEAF_SIZE = 1;

/** A Barnes-Hut tree over n nodes, reused across iterations (grown when a build needs more cells). */
export class BarnesHutTree {
    private readonly dim: 2 | 3;
    private readonly fan: number;
    private capacity = 0;
    /** Per cell: its centre and half width. */
    private midX: Float64Array = new Float64Array(0);
    private midY: Float64Array = new Float64Array(0);
    private midZ: Float64Array = new Float64Array(0);
    private half: Float64Array = new Float64Array(0);
    /** Per cell: total mass and the mass-weighted position sum (the centre of mass once divided). */
    private mass: Float64Array = new Float64Array(0);
    private comX: Float64Array = new Float64Array(0);
    private comY: Float64Array = new Float64Array(0);
    private comZ: Float64Array = new Float64Array(0);
    /** Per cell: the first child (children are `fan` consecutive cells), or -1 for a leaf. */
    private child: Int32Array = new Int32Array(0);
    /** Per cell: a leaf's body list (head node, -1 when empty), its length and its depth. */
    private head: Int32Array = new Int32Array(0);
    private count: Int32Array = new Int32Array(0);
    private depth: Int32Array = new Int32Array(0);
    /** Per node: the next node in its leaf's list. */
    private next: Int32Array = new Int32Array(0);
    private cells = 0;
    private stack: Int32Array = new Int32Array(64);

    /**
     * An empty tree; build() fills it.
     * @param dim - 2 for a quadtree, 3 for an octree
     */
    constructor(dim: 2 | 3) {
        this.dim = dim;
        this.fan = dim === 2 ? 4 : 8;
    }

    /**
     * Builds the tree over the nodes' positions and masses.
     * @param pos - stride-3 positions (z ignored in 2D)
     * @param mass - per-node mass
     * @param n - the node count
     */
    build(pos: Float64Array, mass: Float64Array, n: number): void {
        if (this.next.length < n) {
            this.next = new Int32Array(n);
        }
        this.ensure(Math.max(16, 2 * this.fan * n));
        let lo = [Infinity, Infinity, Infinity];
        let hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < n; i++) {
            for (let a = 0; a < this.dim; a++) {
                const v = pos[3 * i + a];
                lo[a] = Math.min(lo[a], v);
                hi[a] = Math.max(hi[a], v);
            }
        }
        if (n === 0) {
            lo = [0, 0, 0];
            hi = [0, 0, 0];
        }
        let half = 0;
        for (let a = 0; a < this.dim; a++) {
            half = Math.max(half, (hi[a] - lo[a]) / 2);
        }
        this.cells = 0;
        const root = this.newCell(
            (lo[0] + hi[0]) / 2,
            (lo[1] + hi[1]) / 2,
            this.dim === 3 ? (lo[2] + hi[2]) / 2 : 0,
            half * 1.0001 + 1e-9,
            0,
        );
        for (let i = 0; i < n; i++) {
            this.insert(root, i, pos, mass);
        }
    }

    /**
     * The repulsion on node i: every body or far cell calls `exact` (a node j) or adds an approximated cell's force
     * into `out` (the unscaled sum of `M_cell (p_i - c) / d^2`; the caller multiplies by `k m_i`).
     * @param i - the node
     * @param pos - the positions the tree was built over
     * @param theta - the opening angle: a cell is one body when its width over its distance is below it
     * @param out - three numbers the approximated force is added to
     * @param exact - called with each node j (never i) visited one by one
     * @returns how many bodies and cells the node interacted with
     */
    repel(i: number, pos: Float64Array, theta: number, out: Float64Array, exact: (j: number) => void): number {
        const px = pos[3 * i];
        const py = pos[3 * i + 1];
        const pz = this.dim === 3 ? pos[3 * i + 2] : 0;
        const theta2 = theta * theta;
        let interactions = 0;
        let top = 0;
        this.stack[top++] = 0;
        while (top > 0) {
            const c = this.stack[--top];
            if (this.mass[c] === 0) {
                continue;
            }
            if (this.child[c] === -1) {
                for (let j = this.head[c]; j !== -1; j = this.next[j]) {
                    if (j !== i) {
                        exact(j);
                        interactions++;
                    }
                }
                continue;
            }
            const h = this.half[c];
            const outside =
                Math.abs(px - this.midX[c]) > h ||
                Math.abs(py - this.midY[c]) > h ||
                (this.dim === 3 && Math.abs(pz - this.midZ[c]) > h);
            const m = this.mass[c];
            const dx = px - this.comX[c] / m;
            const dy = py - this.comY[c] / m;
            const dz = this.dim === 3 ? pz - this.comZ[c] / m : 0;
            const d2 = dx * dx + dy * dy + dz * dz;
            const width = 2 * h;
            if (outside && width * width < theta2 * d2) {
                const s = m / d2;
                out[0] += dx * s;
                out[1] += dy * s;
                out[2] += dz * s;
                interactions++;
                continue;
            }
            if (top + this.fan > this.stack.length) {
                const grown = new Int32Array(2 * this.stack.length);
                grown.set(this.stack);
                this.stack = grown;
            }
            const first = this.child[c];
            for (let k = 0; k < this.fan; k++) {
                this.stack[top++] = first + k;
            }
        }
        return interactions;
    }

    /**
     * Grows the cell arrays to hold at least `cells` cells.
     * @param cells - the cell count needed
     */
    private ensure(cells: number): void {
        if (cells <= this.capacity) {
            return;
        }
        const f = (old: Float64Array): Float64Array => {
            const a = new Float64Array(cells);
            a.set(old);
            return a;
        };
        const g = (old: Int32Array): Int32Array => {
            const a = new Int32Array(cells);
            a.set(old);
            return a;
        };
        this.midX = f(this.midX);
        this.midY = f(this.midY);
        this.midZ = f(this.midZ);
        this.half = f(this.half);
        this.mass = f(this.mass);
        this.comX = f(this.comX);
        this.comY = f(this.comY);
        this.comZ = f(this.comZ);
        this.child = g(this.child);
        this.head = g(this.head);
        this.count = g(this.count);
        this.depth = g(this.depth);
        this.capacity = cells;
    }

    /**
     * Adds an empty leaf.
     * @param x - centre x
     * @param y - centre y
     * @param z - centre z
     * @param half - half width
     * @param depth - its depth
     * @returns its index
     */
    private newCell(x: number, y: number, z: number, half: number, depth: number): number {
        this.ensure(this.cells + 1);
        const c = this.cells++;
        this.midX[c] = x;
        this.midY[c] = y;
        this.midZ[c] = z;
        this.half[c] = half;
        this.mass[c] = 0;
        this.comX[c] = 0;
        this.comY[c] = 0;
        this.comZ[c] = 0;
        this.child[c] = -1;
        this.head[c] = -1;
        this.count[c] = 0;
        this.depth[c] = depth;
        return c;
    }

    /**
     * The child of an inner cell that holds a position.
     * @param c - the cell
     * @param pos - the positions
     * @param i - the node
     * @returns the child cell
     */
    private childFor(c: number, pos: Float64Array, i: number): number {
        let k = 0;
        if (pos[3 * i] >= this.midX[c]) {
            k |= 1;
        }
        if (pos[3 * i + 1] >= this.midY[c]) {
            k |= 2;
        }
        if (this.dim === 3 && pos[3 * i + 2] >= this.midZ[c]) {
            k |= 4;
        }
        return this.child[c] + k;
    }

    /**
     * Splits a leaf into `fan` children and moves its bodies down.
     * @param c - the leaf
     * @param pos - the positions
     */
    private split(c: number, pos: Float64Array): void {
        const h = this.half[c] / 2;
        const d = this.depth[c] + 1;
        const first = this.cells;
        for (let k = 0; k < this.fan; k++) {
            this.newCell(
                this.midX[c] + (k & 1 ? h : -h),
                this.midY[c] + (k & 2 ? h : -h),
                this.dim === 3 ? this.midZ[c] + (k & 4 ? h : -h) : 0,
                h,
                d,
            );
        }
        this.child[c] = first;
        let j = this.head[c];
        this.head[c] = -1;
        this.count[c] = 0;
        while (j !== -1) {
            const after = this.next[j];
            const leaf = this.childFor(c, pos, j);
            this.next[j] = this.head[leaf];
            this.head[leaf] = j;
            this.count[leaf]++;
            j = after;
        }
    }

    /**
     * Inserts node i under cell c, adding its mass to every cell on the way down.
     * @param root - the cell to start at
     * @param i - the node
     * @param pos - the positions
     * @param mass - the masses
     */
    private insert(root: number, i: number, pos: Float64Array, mass: Float64Array): void {
        const m = mass[i];
        const x = pos[3 * i];
        const y = pos[3 * i + 1];
        const z = this.dim === 3 ? pos[3 * i + 2] : 0;
        let c = root;
        for (;;) {
            this.mass[c] += m;
            this.comX[c] += m * x;
            this.comY[c] += m * y;
            this.comZ[c] += m * z;
            if (this.child[c] === -1) {
                if (this.count[c] < LEAF_SIZE || this.depth[c] >= MAX_DEPTH) {
                    this.next[i] = this.head[c];
                    this.head[c] = i;
                    this.count[c]++;
                    return;
                }
                // the bodies already here move down; their mass is already in c, and the children total it below
                this.split(c, pos);
                for (let k = 0; k < this.fan; k++) {
                    const leaf = this.child[c] + k;
                    for (let j = this.head[leaf]; j !== -1; j = this.next[j]) {
                        const mj = mass[j];
                        this.mass[leaf] += mj;
                        this.comX[leaf] += mj * pos[3 * j];
                        this.comY[leaf] += mj * pos[3 * j + 1];
                        this.comZ[leaf] += mj * (this.dim === 3 ? pos[3 * j + 2] : 0);
                    }
                }
            }
            c = this.childFor(c, pos, i);
        }
    }
}
