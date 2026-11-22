/**
 * How many more slots a scene's growing edge pools will be asked for, so a pool that must grow
 * while a load paints grows once to hold them, not by twenty doublings that each copy, rebuild and
 * upload the whole pool (about 0.5 s at a million edges).
 *
 * On the "batched" render path only, the edge pass arms it with the edges still to paint when a
 * paint run starts (`UpdateManager.syncEdgeStyles`), and an `addEdges` batch arms the caps its edges
 * build as they are stored (`DataManager`'s `edgesArriving`). The first line batch and the first cap
 * batch to grow each take it; a growth is never smaller than doubling, and every later one doubles.
 * ponytail: a run whose edges split over several batches gives all of it to whichever grows first,
 * so that batch can hold up to the run's edge count unused, no more than doubling may; per-batch
 * counts if that shows up.
 */
import type { Scene } from "@babylonjs/core/scene.js";

type Pool = "lines" | "caps";

const reserves = new WeakMap<Scene, Record<Pool, number>>();

/** Growths of every pulled line table and cap batch so far; read by tests only. */
export const poolGrowths = { lines: 0, caps: 0 };

/**
 * Arm a scene's pools for a run of edges.
 * @param scene - The scene.
 * @param slots - The edges the run will draw.
 * @param pools - The pools it arms.
 */
export function armPoolReserve(scene: Scene, slots: number, pools: readonly Pool[] = ["lines", "caps"]): void {
    const reserve = reserves.get(scene) ?? { lines: 0, caps: 0 };
    for (const pool of pools) {
        reserve[pool] = slots;
    }

    reserves.set(scene, reserve);
}

/**
 * Disarm a scene's pools: the run is over.
 * @param scene - The scene.
 * @param pools - The pools it disarms.
 */
export function clearPoolReserve(scene: Scene, pools: readonly Pool[] = ["lines", "caps"]): void {
    const reserve = reserves.get(scene);
    for (const pool of pools) {
        if (reserve !== undefined) {
            reserve[pool] = 0;
        }
    }
}

/**
 * Count one growth of a pool and take what the run still expects of it.
 * @param scene - The pool's scene.
 * @param pool - Which pool grows.
 * @returns Slots to make room for beyond those handed out, 0 when nothing is armed or another batch took it.
 */
export function takePoolReserve(scene: Scene, pool: Pool): number {
    poolGrowths[pool]++;
    const reserve = reserves.get(scene);
    if (reserve === undefined) {
        return 0;
    }

    const slots = reserve[pool];
    reserve[pool] = 0;
    return slots;
}
