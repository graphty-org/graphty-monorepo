/**
 * The collision force of the CPU simulations (`LayoutSimulation.setCollision`), a port of d3's `forceCollide` to a
 * rule the GPU simulations can run as written: after every iteration each node moves out of the nodes it overlaps,
 * reading the positions the iteration left and writing all its moves at once (a Jacobi step, so the result does not
 * depend on the order of the nodes). A pair shares the push and a fixed partner leaves all of it to the free one; a
 * node pushed by several neighbours takes their sum, which spreads a crowd far faster than their mean (measured: 230
 * sweeps against more than 400 on the same 200 nodes). The forces can leave pairs overlapping when a run ends, so a
 * settling simulation sweeps until none are (`settleCollisions`). The grid is one largest diameter wide, so a node is
 * compared with the nodes of its own and the neighbouring cells only. GPU twin:
 * webgpu-graph-algorithms/src/wgsl/collide-gather.wgsl.ts.
 */

import { maskTest, type NodeMask } from "@graphty/graph-format";

import { FA2_COINCIDENT_SQ } from "./constants.js";
import { kickDir } from "./forceatlas2.js";
import type { CollisionOptions } from "./types.js";

/** The most sweeps a settling simulation spends parting what the forces left overlapping. */
const COLLISION_FINAL_SWEEPS = 256;
/** A cell and the cells around it, in 3D and in a plane. */
const AROUND_3D: readonly (readonly [number, number, number])[] = [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as const)),
);
const AROUND_2D = AROUND_3D.filter(([, , z]) => z === 0);

/**
 * Checks a `setCollision` argument against the node count.
 * @param collision - the caller's collision
 * @param n - the node count
 * @throws RangeError when `radii` has the wrong length, or a radius or `scale` is negative or not finite
 */
export function assertCollision(collision: CollisionOptions, n: number): void {
    if (collision.radii.length !== n) {
        throw new RangeError(`setCollision: radii has ${collision.radii.length} values, expected ${n}`);
    }
    const scale = collision.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0) {
        throw new RangeError(`setCollision: scale must be finite and > 0, got ${scale}`);
    }
    if (collision.radii.some((radius) => !Number.isFinite(radius) || radius < 0)) {
        throw new RangeError("setCollision: every radius must be finite and >= 0");
    }
}

/**
 * One cell's key; two cells sharing one only cost comparisons, because a candidate's own cell is checked.
 * @param x - column
 * @param y - row
 * @param z - layer
 * @returns the key
 */
function cellKey(x: number, y: number, z: number): number {
    return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0;
}

/** One sweep's inputs. */
interface Sweep {
    readonly pos: Float64Array;
    readonly radii: CollisionOptions["radii"];
    /** What turns a radius into layout units. */
    readonly factor: number;
    readonly flat: boolean;
    /** One over the cell width. */
    readonly inverse: number;
    readonly fixed: NodeMask | null;
    readonly cells: Map<number, number[]>;
}

/**
 * A row's cell along one axis.
 * @param sweep - the sweep
 * @param i - the row
 * @param axis - the axis
 * @returns the cell
 */
function cellOf(sweep: Sweep, i: number, axis: number): number {
    return axis === 2 && sweep.flat ? 0 : Math.floor(sweep.pos[3 * i + axis] * sweep.inverse);
}

/**
 * Adds to `moves` the push of `j` on `i`, when they overlap.
 * @param sweep - the sweep
 * @param i - the node being pushed
 * @param j - the node pushing
 * @param moves - the stride-3 moves
 * @returns whether they overlap
 */
function addPush(sweep: Sweep, i: number, j: number, moves: Float64Array): boolean {
    const { pos, radii, factor, flat, fixed } = sweep;
    const reach = (radii[i] + radii[j]) * factor;
    const ox = pos[3 * i] - pos[3 * j];
    const oy = pos[3 * i + 1] - pos[3 * j + 1];
    const oz = flat ? 0 : pos[3 * i + 2] - pos[3 * j + 2];
    const squared = ox * ox + oy * oy + oz * oz;
    if (squared >= reach * reach) {
        return false;
    }
    const share = fixed !== null && maskTest(fixed, j) ? 1 : 0.5;
    const coincident = squared < FA2_COINCIDENT_SQ;
    const kickDim = flat ? 2 : 3;
    const [dx, dy, dz] = coincident ? kickDir(i, j, kickDim) : [ox, oy, oz];
    const distance = Math.sqrt(squared);
    const push = (coincident ? reach : (reach - distance) / distance) * share;
    moves[3 * i] += dx * push;
    moves[3 * i + 1] += dy * push;
    moves[3 * i + 2] += dz * push;
    return true;
}

/**
 * Adds to `moves` the pushes on one node from its own and the neighbouring cells.
 * @param sweep - the sweep
 * @param i - the node
 * @param moves - the stride-3 moves
 * @returns whether it overlaps anything
 */
function addPushes(sweep: Sweep, i: number, moves: Float64Array): boolean {
    const cx = cellOf(sweep, i, 0);
    const cy = cellOf(sweep, i, 1);
    const cz = cellOf(sweep, i, 2);
    let overlaps = false;
    for (const [dx, dy, dz] of sweep.flat ? AROUND_2D : AROUND_3D) {
        const [x, y, z] = [cx + dx, cy + dy, cz + dz];
        for (const j of sweep.cells.get(cellKey(x, y, z)) ?? []) {
            const here = cellOf(sweep, j, 0) === x && cellOf(sweep, j, 1) === y && cellOf(sweep, j, 2) === z;
            if (j !== i && here && addPush(sweep, i, j, moves)) {
                overlaps = true;
            }
        }
    }
    return overlaps;
}

/**
 * Moves every free node out of the nodes it overlaps, once, in place.
 * @param pos - the simulation's stride-3 layout-unit rows
 * @param n - the node count
 * @param dim - the simulation's dimension
 * @param collision - the collision the owner set
 * @param unit - the simulation's `scale`: what turns the radii's owner units into layout units
 * @param fixed - the rows that do not move, or null
 * @param inert - the rows out of the forces, or null: they neither move nor push
 * @returns whether any node moved
 */
export function collide(
    pos: Float64Array,
    n: number,
    dim: 2 | 3,
    collision: CollisionOptions,
    unit: number,
    fixed: NodeMask | null,
    inert: NodeMask | null,
): boolean {
    const { radii } = collision;
    const factor = (collision.scale ?? 1) / unit;
    let largest = 0;
    for (let i = 0; i < n; i++) {
        largest = Math.max(largest, radii[i]);
    }
    if (largest <= 0) {
        return false;
    }

    const flat = dim === 2 || collision.flat === true;
    const sweep: Sweep = { pos, radii, factor, flat, inverse: 1 / (2 * largest * factor), fixed, cells: new Map() };
    const isInert = (i: number): boolean => inert !== null && maskTest(inert, i);
    for (let i = 0; i < n; i++) {
        if (!isInert(i)) {
            const key = cellKey(cellOf(sweep, i, 0), cellOf(sweep, i, 1), cellOf(sweep, i, 2));
            const bucket = sweep.cells.get(key);
            if (bucket === undefined) {
                sweep.cells.set(key, [i]);
            } else {
                bucket.push(i);
            }
        }
    }

    const moves = new Float64Array(3 * n);
    let moved = false;
    for (let i = 0; i < n; i++) {
        const free = !isInert(i) && (fixed === null || !maskTest(fixed, i));
        if (free && addPushes(sweep, i, moves)) {
            moved = true;
        }
    }
    for (let i = 0; i < 3 * n; i++) {
        pos[i] += moves[i];
    }
    return moved;
}

/**
 * The sweeps of a run that has settled: {@link collide} until nothing overlaps, or COLLISION_FINAL_SWEEPS.
 * @param args - collide()'s arguments
 */
export function settleCollisions(...args: Parameters<typeof collide>): void {
    for (let sweep = 0; sweep < COLLISION_FINAL_SWEEPS && collide(...args); sweep++) {
        // each sweep parts what the one before it pushed into a neighbour
    }
}
