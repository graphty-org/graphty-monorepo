/**
 * @file Support points: the control point of a curved edge that a force simulation places, as vis-network places
 * the hidden support node of its "dynamic" smooth edges. Each support point is pulled toward its edge's two nodes by
 * two springs, each half the edge's rest length, pushed away from every node and every other support point, and
 * pulled toward the middle of the nodes; the edge is drawn as a quadratic curve through it. The nodes stay where the
 * layout put them: only the support points move.
 *
 * Plain numbers, nothing from Babylon.js, so it runs in Node.
 */

import type { Xyz } from "./edgeRoute";

/**
 * The force law the support points settle under: `"barnesHut"`, a push of `repulsion / d^2` and a pull toward the
 * middle of constant size `centralGravity` (vis-network's default barnesHut solver); `"forceAtlas2"`, a push of
 * `repulsion / d` and a pull of `centralGravity * d` (its forceAtlas2Based solver).
 */
export type SupportModel = "barnesHut" | "forceAtlas2";

/** What one edge's support point settles under: the `line.support*` style options. */
export interface SupportForces {
    readonly model: SupportModel;
    /** The edge's rest length; each of its two springs rests at half of it. */
    readonly springLength: number;
    /** How hard a spring pulls per unit it is stretched. */
    readonly springConstant: number;
    /** How hard every node and every other support point pushes it away. */
    readonly repulsion: number;
    /** How hard it is pulled toward the middle of the nodes. */
    readonly centralGravity: number;
    /** How many scene units one unit of these lengths and forces is. */
    readonly unit: number;
    /**
     * `"drawing"`: the unit is not {@link SupportForces.unit} but the drawing's own, the size at which these forces
     * hold the drawn nodes (and the support points, at their edges' middles) in balance ({@link balancedUnit}), so a
     * curve bows among nodes a layout of another scale placed as among the nodes the forces placed themselves.
     * Absent or `"unit"`: {@link SupportForces.unit}.
     */
    readonly scale?: "unit" | "drawing";
}

/** One edge whose curve runs through a support point: where its two nodes are, and its forces. */
export interface SupportEdge {
    readonly src: Xyz;
    readonly dst: Xyz;
    readonly forces: SupportForces;
}

/** The forces a support point settles under where its style leaves a number unset: vis-network's barnesHut. */
export const SUPPORT_DEFAULTS = {
    springLength: 95,
    springConstant: 0.04,
    repulsion: 2000,
    centralGravity: 0.3,
} as const;

/** vis-network's integration step (`physics.timestep`), maximum speed and damping per solver. */
const TIMESTEP = 0.5;
const MAX_VELOCITY = 50;
const DAMPING: Readonly<Record<SupportModel, number>> = { barnesHut: 0.09, forceAtlas2: 0.4 };
/** Barnes-Hut's opening angle (vis-network's `theta`). */
const THETA = 0.5;
/**
 * Below this speed, in the forces' units per step, for {@link CALM_STEPS} steps in a row, the support points are at
 * rest. Above the trembling the Barnes-Hut tree leaves (its cells change as the points cross them: about 0.003 to
 * 0.008 on vis-network's siblings sample, which a lower threshold never got under, so every curve ran to
 * {@link MAX_STEPS_TO_REST}); held for a run of steps, so a point that only turns round mid-swing is not at rest.
 */
const REST_SPEED = 0.02;
/** How many steps in a row every support point must stay under {@link REST_SPEED} to be at rest. */
const CALM_STEPS = 20;

/** A cell of the Barnes-Hut tree: its bodies' count and center of mass, its size, and its four quarters. */
interface Cell {
    x0: number;
    y0: number;
    size: number;
    mass: number;
    mx: number;
    my: number;
    /** The one body in a leaf, or -1. */
    body: number;
    kids: (Cell | null)[] | null;
}

const newCell = (x0: number, y0: number, size: number): Cell => ({
    x0,
    y0,
    size,
    mass: 0,
    mx: 0,
    my: 0,
    body: -1,
    kids: null,
});

/**
 * Put body `b` at (x, y) into a cell, splitting a leaf that already holds one. Bodies at one place stop splitting
 * at a size of 1e-6 and share the leaf's mass.
 * @param cell - The cell.
 * @param b - The body's index.
 * @param xs - Every body's x.
 * @param ys - Every body's y.
 */
function insert(cell: Cell, b: number, xs: Float64Array, ys: Float64Array): void {
    let c = cell;
    for (;;) {
        const { mass } = c;
        c.mx = (c.mx * mass + xs[b]) / (mass + 1);
        c.my = (c.my * mass + ys[b]) / (mass + 1);
        c.mass = mass + 1;
        if (mass === 0) {
            c.body = b;
            return;
        }
        if (c.kids === null) {
            const old = c.body;
            if (xs[b] === xs[old] && ys[b] === ys[old]) {
                // vis-network nudges a body off one it sits on (by a seeded random amount), so two support points
                // of edges between the same two nodes, which start at one middle, push apart; this nudge is fixed
                xs[b] += nudge(b);
                ys[b] += nudge(b + 1);
            }
            if (c.size < 1e-6) {
                return;
            }
            c.kids = [null, null, null, null];
            c.body = -1;
            const k = quarter(c, xs[old], ys[old]);
            const kid = child(c, k);
            kid.mass = 1;
            kid.mx = xs[old];
            kid.my = ys[old];
            kid.body = old;
        }
        c = child(c, quarter(c, xs[b], ys[b]));
    }
}

/**
 * A fixed amount under one unit, different for each body.
 * @param b - The body's index.
 * @returns The amount.
 */
const nudge = (b: number): number => ((b * 0.618033988749895) % 1) - 0.5;

const quarter = (c: Cell, x: number, y: number): number =>
    (x >= c.x0 + c.size / 2 ? 1 : 0) + (y >= c.y0 + c.size / 2 ? 2 : 0);

/**
 * A cell's quarter, made when it is first needed.
 * @param c - The cell.
 * @param k - Which quarter: bit 0 the right half, bit 1 the lower half.
 * @returns The quarter.
 */
function child(c: Cell, k: number): Cell {
    const kids = c.kids ?? [null, null, null, null];
    c.kids = kids;
    const half = c.size / 2;
    const made = kids[k] ?? newCell(c.x0 + (k & 1 ? half : 0), c.y0 + (k & 2 ? half : 0), half);
    kids[k] = made;
    return made;
}

/**
 * The push every body but `self` gives the body at (x, y): the Barnes-Hut sum, a far cell taken as its center of
 * mass.
 * @param root - The tree.
 * @param self - The pushed body's own index.
 * @param x - Its x.
 * @param y - Its y.
 * @param forces - Its force law.
 * @returns The push, x and y.
 */
function repulsionOn(root: Cell, self: number, x: number, y: number, forces: SupportForces): [number, number] {
    let fx = 0;
    let fy = 0;
    const stack: Cell[] = [root];
    while (stack.length > 0) {
        const c = stack.pop() as Cell;
        if (c.mass === 0 || c.body === self) {
            continue;
        }
        const d = Math.hypot(c.mx - x, c.my - y);
        if (c.kids !== null && c.size / Math.max(d, 1e-12) >= THETA) {
            stack.push(...c.kids.filter((kid): kid is Cell => kid !== null));
            continue;
        }
        const [px, py] = pushFrom(c, x, y, d, forces);
        fx += px;
        fy += py;
    }
    return [fx, fy];
}

/**
 * The push one cell, taken as its center of mass, gives the body at (x, y).
 * @param c - The cell.
 * @param x - The body's x.
 * @param y - Its y.
 * @param distance - How far the cell's center of mass is.
 * @param forces - The body's force law.
 * @returns The push, x and y.
 */
function pushFrom(c: Cell, x: number, y: number, distance: number, forces: SupportForces): [number, number] {
    // vis-network: two bodies at one place are taken as 0.1 apart along x
    const [d, dx, dy] = distance === 0 ? [0.1, 0.1, 0] : [distance, c.mx - x, c.my - y];
    const g = (forces.repulsion * c.mass) / (forces.model === "barnesHut" ? d * d * d : d * d);
    return [-dx * g, -dy * g];
}

/**
 * The force on a support point at (x, y) from its two springs and the pull toward the middle.
 * @param x - Its x.
 * @param y - Its y.
 * @param ends - Its edge's two nodes, x and y.
 * @param center - The middle of the nodes.
 * @param forces - Its force law.
 * @returns The force, x and y.
 */
function springsAndGravity(
    x: number,
    y: number,
    ends: readonly [number, number, number, number],
    center: readonly [number, number],
    forces: SupportForces,
): [number, number] {
    let fx = 0;
    let fy = 0;
    for (let e = 0; e < 4; e += 2) {
        const dx = ends[e] - x;
        const dy = ends[e + 1] - y;
        const d = Math.max(Math.hypot(dx, dy), 0.01);
        const s = (forces.springConstant * (d - forces.springLength / 2)) / d;
        fx += dx * s;
        fy += dy * s;
    }
    const cx = center[0] - x;
    const cy = center[1] - y;
    const d = Math.hypot(cx, cy);
    if (d > 0) {
        const g = forces.model === "barnesHut" ? forces.centralGravity / d : forces.centralGravity;
        fx += cx * g;
        fy += cy * g;
    }
    return [fx, fy];
}

/**
 * Step every support point toward where its forces balance, with the nodes held still. The points are read from
 * and written back to `points` (flat x, y per edge, in scene units); `velocities` (the same layout, in the forces'
 * units) carries their speed from one call to the next. The simulation runs in the first edge's units and over the
 * nodes' x and y: the curves are drawn in the plane of the drawing.
 * @param nodes - Every node's center, each one pushing.
 * @param edges - The edges with support points.
 * @param points - Each edge's support point, x and y in scene units; updated.
 * @param velocities - Each support point's velocity; updated.
 * @param steps - How many steps to take at most.
 * @param calm - How many steps in a row every point has stayed under the resting speed; carried from call to call,
 * updated.
 * @param calm.steps - The count.
 * @returns Whether any support point is still moving after the last step.
 */
export function stepSupportPoints(
    nodes: readonly Xyz[],
    edges: readonly SupportEdge[],
    points: Float64Array,
    velocities: Float64Array,
    steps: number,
    calm?: { steps: number },
): boolean {
    const m = edges.length;
    if (m === 0) {
        return false;
    }
    const given = edges[0].forces.unit > 0 ? edges[0].forces.unit : 1;
    const unit = edges[0].forces.scale === "drawing" ? (balancedUnit(nodes, edges) ?? given) : given;
    const n = nodes.length;
    const xs = new Float64Array(n + m);
    const ys = new Float64Array(n + m);
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
        xs[i] = nodes[i].x / unit;
        ys[i] = nodes[i].y / unit;
        cx += xs[i] / n;
        cy += ys[i] / n;
    }
    const center: [number, number] = [cx, cy];
    const ends = edges.map(
        (e) => [e.src.x / unit, e.src.y / unit, e.dst.x / unit, e.dst.y / unit] as [number, number, number, number],
    );
    let moving = false;
    const counted = calm ?? { steps: 0 };
    for (let step = 0; step < steps; step++) {
        for (let j = 0; j < m; j++) {
            xs[n + j] = points[2 * j] / unit;
            ys[n + j] = points[2 * j + 1] / unit;
        }
        const root = treeOf(xs, ys);
        let fastest = 0;
        for (let j = 0; j < m; j++) {
            const { forces } = edges[j];
            const [x, y] = [xs[n + j], ys[n + j]];
            const [px, py] = repulsionOn(root, n + j, x, y, forces);
            const [sx, sy] = springsAndGravity(x, y, ends[j], center, forces);
            const damping = DAMPING[forces.model];
            const speedX = integrate(velocities, points, 2 * j, px + sx, damping, unit);
            const speedY = integrate(velocities, points, 2 * j + 1, py + sy, damping, unit);
            fastest = Math.max(fastest, speedX, speedY);
        }
        counted.steps = fastest > REST_SPEED ? 0 : counted.steps + 1;
        moving = counted.steps < CALM_STEPS;
        if (!moving) {
            break;
        }
    }
    return moving;
}

/**
 * The scene units per force unit at which the first edge's forces hold the drawing in balance on the whole: where the
 * virial of every force (the sum over the bodies of position times force) is zero, as it is wherever a simulation of
 * those forces comes to rest. The bodies are the nodes and a support point at each edge's middle, as vis-network's
 * physics holds them (every body pushes every other, each edge's two half springs pull, central gravity pulls every
 * body toward the middle of the nodes; under forceAtlas2 a node's push and pull are weighted by its degree plus one, as
 * vis-network weights them). The push is summed once over the Barnes-Hut tree at the drawing's own size;
 * every term then scales by a power of the size, so the balance is one root found by bisection.
 * @param nodes - Every node's center.
 * @param edges - The edges with support points.
 * @returns The unit, or null when the drawing has no size or no balance (no edge of any length).
 */
export function balancedUnit(nodes: readonly Xyz[], edges: readonly SupportEdge[]): number | null {
    const n = nodes.length;
    const m = edges.length;
    if (m === 0 || n === 0) {
        return null;
    }
    const xs = new Float64Array(n + m);
    const ys = new Float64Array(n + m);
    let [cx, cy] = [0, 0];
    nodes.forEach((p, i) => {
        [xs[i], ys[i]] = [p.x, p.y];
        cx += p.x / n;
        cy += p.y / n;
    });
    edges.forEach(({ src, dst }, j) => {
        xs[n + j] = (src.x + dst.x) / 2;
        ys[n + j] = (src.y + dst.y) / 2;
    });
    const { forces } = edges[0];
    const bh = forces.model === "barnesHut";
    // barnesHut takes no degree
    const weight = bh ? new Float64Array(n + m).fill(1) : degreeWeights(nodes, edges);
    const root = treeOf(xs, ys);
    // at a size s force units per scene unit: barnesHut's push (1 / d^2) gives a virial of push / s, forceAtlas2's
    // (1 / d) one of push whatever the size; a half spring of drawn length h gives -k (s h - L / 2) s h; central
    // gravity -cg s r (barnesHut, a constant pull) or -cg s^2 r^2 (forceAtlas2, in proportion to the distance)
    let push = 0;
    let reach = 0;
    let reach2 = 0;
    for (let i = 0; i < n + m; i++) {
        const [fx, fy] = repulsionOn(root, i, xs[i], ys[i], forces);
        push += weight[i] * ((xs[i] - cx) * fx + (ys[i] - cy) * fy);
        const r = Math.hypot(xs[i] - cx, ys[i] - cy);
        reach += r;
        reach2 += weight[i] * r * r;
    }
    let springs2 = 0;
    let springs1 = 0;
    for (const { src, dst, forces: f } of edges) {
        const h = Math.hypot(dst.x - src.x, dst.y - src.y) / 2;
        springs2 += 2 * f.springConstant * h * h;
        springs1 += f.springConstant * h * f.springLength;
    }
    const cg = forces.centralGravity;
    const virial = (s: number): number =>
        (bh ? push / s : push) - s * s * springs2 + s * springs1 - (bh ? cg * s * reach : cg * s * s * reach2);
    const size = springs2 > 0 ? falling(virial) : null;
    return size === null ? null : 1 / size;
}

/**
 * Each body's weight under forceAtlas2: a node's degree plus one (vis-network's forceAtlas2Based pushes a node, and
 * pulls it to the middle, in proportion to it), a support point's one.
 * @param nodes - Every node's center; the first bodies.
 * @param edges - The edges with support points; a body each after the nodes.
 * @returns The weights.
 */
function degreeWeights(nodes: readonly Xyz[], edges: readonly SupportEdge[]): Float64Array {
    const weight = new Float64Array(nodes.length + edges.length).fill(1);
    const index = new Map(nodes.map((p, i) => [p, i]));
    for (const end of edges.flatMap(({ src, dst }) => [src, dst])) {
        const i = index.get(end);
        if (i !== undefined) {
            weight[i]++;
        }
    }
    return weight;
}

/**
 * Where a function that is positive at 1e-9 and negative at 1e9 crosses zero, by bisection of the logarithm.
 * @param f - The function.
 * @returns The crossing, or null when it is not positive below and negative above (or not a number).
 */
function falling(f: (s: number) => number): number | null {
    let [lo, hi] = [1e-9, 1e9];
    const brackets = f(lo) > 0 && f(hi) < 0;
    if (!brackets) {
        return null;
    }
    for (let k = 0; k < 100; k++) {
        const mid = Math.sqrt(lo * hi);
        if (f(mid) > 0) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return Math.sqrt(lo * hi);
}

/**
 * One step of one coordinate of a support point under its force, as vis-network integrates a body (its damping,
 * timestep and maximum speed).
 * @param velocities - Every velocity; updated.
 * @param points - Every point, in scene units; updated.
 * @param at - Which coordinate.
 * @param force - The force on it.
 * @param damping - The damping.
 * @param unit - Scene units per force unit.
 * @returns Its new speed.
 */
function integrate(
    velocities: Float64Array,
    points: Float64Array,
    at: number,
    force: number,
    damping: number,
    unit: number,
): number {
    const v = velocities[at];
    const next = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v + (force - damping * v) * TIMESTEP));
    velocities[at] = next;
    points[at] += next * TIMESTEP * unit;
    return Math.abs(next);
}

/**
 * The Barnes-Hut tree over every body.
 * @param xs - Every body's x.
 * @param ys - Every body's y.
 * @returns Its root.
 */
function treeOf(xs: Float64Array, ys: Float64Array): Cell {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < xs.length; i++) {
        [x0, y0, x1, y1] = [Math.min(x0, xs[i]), Math.min(y0, ys[i]), Math.max(x1, xs[i]), Math.max(y1, ys[i])];
    }
    // vis-network's root: the bodies' box made square about its middle (BarnesHutSolver._formBarnesHutTree)
    const size = Math.max(x1 - x0, y1 - y0, 1e-5);
    const root = newCell((x0 + x1 - size) / 2, (y0 + y1 - size) / 2, size);
    for (let i = 0; i < xs.length; i++) {
        insert(root, i, xs, ys);
    }
    return root;
}

/** How many force evaluations one frame may spend on the support points, at most. */
const FRAME_BUDGET = 400_000;
/** How many steps one frame takes at most. */
const MAX_FRAME_STEPS = 40;
/**
 * How many steps the support points take after their nodes last moved before they are called at rest even if
 * still creeping: the Barnes-Hut tree's cells change as the points cross them, which keeps a point trembling a little
 * above the resting speed. vis-network itself stops after its stabilization iterations (1000 by default); stepped
 * from vis-network's own node positions, its corpus files settle in 170 to 720 steps.
 */
const MAX_STEPS_TO_REST = 1500;

/**
 * Every support point of a graph, carried from frame to frame: each held as where it sits along and across its
 * edge, so it moves with its nodes, and stepped a few times a frame until it comes to rest.
 * @template E - The edge.
 */
export class SupportPoints<E> {
    private edges: E[] = [];
    private readonly slot = new Map<E, number>();
    /** Each support point along its edge (a fraction of the edge) and across it (the same), flat. */
    private rel = new Float64Array(0);
    private velocities = new Float64Array(0);
    /** Each support point in the scene as last placed; a point is a new object each time it moves. */
    private placed: Xyz[] = [];
    private isResting = true;
    /** Steps taken since the nodes last moved. */
    private steps = 0;
    /** How many steps in a row every support point has stayed under the resting speed. */
    private readonly calm = { steps: 0 };
    /** Each edge's ends and forces at the last call, flat: source x, y, target x, y, then the forces. */
    private lastEnds = new Float64Array(0);

    /**
     * Step the support points after the nodes have moved (or while they still settle).
     * @param nodes - Every node's center, asked for only when there is work to do.
     * @param edges - Every edge.
     * @param read - An edge's ends and forces, or null for an edge drawn without a support point.
     * @param moved - Whether any node moved since the last call.
     * @returns Whether any support point moved.
     */
    update(
        nodes: () => readonly Xyz[],
        edges: Iterable<E>,
        read: (edge: E) => SupportEdge | null,
        moved: boolean,
    ): boolean {
        if (!moved && this.isResting) {
            return false;
        }
        const list: E[] = [];
        const ends: SupportEdge[] = [];
        for (const e of edges) {
            const s = read(e);
            if (s !== null) {
                list.push(e);
                ends.push(s);
            }
        }
        this.keep(list);
        // only a node that really moved, or forces that changed, start the count again: a walk of the edges for any
        // other reason (a repaint of something else) leaves the support points as they are
        if (this.endsChanged(ends)) {
            this.steps = 0;
            this.calm.steps = 0;
            this.isResting = false;
        }
        if (this.isResting) {
            return false;
        }
        if (list.length === 0) {
            const had = this.placed.length > 0;
            this.placed = [];
            this.isResting = true;
            return had;
        }
        this.step(nodes(), ends);
        return true;
    }

    /**
     * Step the support points a frame's worth, from where they sit on their edges, and place them.
     * @param centers - Every node's center.
     * @param ends - Each edge's ends and forces.
     */
    private step(centers: readonly Xyz[], ends: readonly SupportEdge[]): void {
        const m = ends.length;
        const points = new Float64Array(2 * m);
        for (let j = 0; j < m; j++) {
            const [x, y] = fromRel(ends[j], this.rel[2 * j], this.rel[2 * j + 1]);
            points[2 * j] = x;
            points[2 * j + 1] = y;
        }
        const perStep = m * 4 * Math.log2(centers.length + m + 2);
        const steps = Math.max(1, Math.min(MAX_FRAME_STEPS, Math.floor(FRAME_BUDGET / perStep)));
        this.steps += steps;
        const moving = stepSupportPoints(centers, ends, points, this.velocities, steps, this.calm);
        this.isResting = !moving || this.steps >= MAX_STEPS_TO_REST;
        this.placed = [];
        for (let j = 0; j < m; j++) {
            const { src, dst } = ends[j];
            const [along, across] = toRel(ends[j], points[2 * j], points[2 * j + 1]);
            this.rel[2 * j] = along;
            this.rel[2 * j + 1] = across;
            this.placed.push({ x: points[2 * j], y: points[2 * j + 1], z: src.z + (dst.z - src.z) * along });
        }
    }

    /**
     * Whether any edge's ends or forces differ from the last call, and remember them.
     * @param ends - Each edge's ends and forces.
     * @returns True when one moved or changed (or the edges changed).
     */
    private endsChanged(ends: readonly SupportEdge[]): boolean {
        const now = new Float64Array(11 * ends.length);
        ends.forEach(({ src, dst, forces: f }, j) => {
            const model = f.model === "barnesHut" ? 0 : 1;
            now.set(
                [
                    src.x,
                    src.y,
                    dst.x,
                    dst.y,
                    model,
                    f.springLength,
                    f.springConstant,
                    f.repulsion,
                    f.centralGravity,
                    f.unit,
                    f.scale === "drawing" ? 1 : 0,
                ],
                11 * j,
            );
        });
        const was = this.lastEnds;
        this.lastEnds = now;
        if (was.length === now.length) {
            this.reseedChangedForces(was, now);
        }
        return was.length !== now.length || now.some((v, i) => Math.abs(v - was[i]) > 1e-6);
    }

    /**
     * Start again from its edge's middle every support point whose forces changed, so where a point rests depends on
     * its forces and the nodes, not on the forces it had before (a style set and then removed draws the curve it drew
     * before it was set).
     * @param was - Each edge's ends and forces at the call before, flat, as {@link endsChanged} keeps them.
     * @param now - The same, now.
     */
    private reseedChangedForces(was: Float64Array, now: Float64Array): void {
        for (let j = 0; j < now.length / 11; j++) {
            const changed = now
                .subarray(11 * j + 4, 11 * j + 11)
                .some((v, k) => Math.abs(v - was[11 * j + 4 + k]) > 1e-6);
            if (changed) {
                this.rel.set([0.5, 0], 2 * j);
                this.velocities.set([0, 0], 2 * j);
            }
        }
    }

    /**
     * Whether every support point has come to rest (true with none).
     * @returns True at rest.
     */
    get resting(): boolean {
        return this.isResting;
    }

    /**
     * Where an edge's support point is: the same object until the point moves.
     * @param edge - The edge.
     * @returns The point, or null for an edge without one (or not placed yet).
     */
    pointOf(edge: E): Xyz | null {
        const j = this.slot.get(edge);
        return j === undefined ? null : (this.placed[j] ?? null);
    }

    /**
     * Keep the state of the edges that still have support points, and start a new one at its edge's middle.
     * @param list - The edges with support points now.
     */
    private keep(list: readonly E[]): void {
        if (list.length === this.edges.length && list.every((e, j) => this.edges[j] === e)) {
            return;
        }
        const rel = new Float64Array(2 * list.length);
        const velocities = new Float64Array(2 * list.length);
        list.forEach((e, j) => {
            const old = this.slot.get(e);
            rel[2 * j] = old === undefined ? 0.5 : this.rel[2 * old];
            rel[2 * j + 1] = old === undefined ? 0 : this.rel[2 * old + 1];
            velocities[2 * j] = old === undefined ? 0 : this.velocities[2 * old];
            velocities[2 * j + 1] = old === undefined ? 0 : this.velocities[2 * old + 1];
        });
        this.slot.clear();
        list.forEach((e, j) => this.slot.set(e, j));
        this.edges = [...list];
        this.rel = rel;
        this.velocities = velocities;
        this.placed = [];
        this.isResting = false;
    }
}

/**
 * A point given along and across an edge (fractions of its length, across turned left of its direction), in x, y.
 * @param e - The edge.
 * @param along - How far along.
 * @param across - How far across.
 * @returns The point.
 */
function fromRel(e: SupportEdge, along: number, across: number): [number, number] {
    const dx = e.dst.x - e.src.x;
    const dy = e.dst.y - e.src.y;
    return [e.src.x + along * dx - across * dy, e.src.y + along * dy + across * dx];
}

/**
 * The inverse of {@link fromRel}; an edge of no length keeps the point at its node, along 0.5.
 * @param e - The edge.
 * @param x - The point's x.
 * @param y - Its y.
 * @returns Along and across.
 */
function toRel(e: SupportEdge, x: number, y: number): [number, number] {
    const dx = e.dst.x - e.src.x;
    const dy = e.dst.y - e.src.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
        return [0.5, 0];
    }
    const qx = x - e.src.x;
    const qy = y - e.src.y;
    return [(qx * dx + qy * dy) / l2, (dx * qy - dy * qx) / l2];
}
