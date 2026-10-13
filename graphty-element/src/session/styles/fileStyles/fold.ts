/**
 * @file The bound on a file's layers: at most 16 per kind. When a translation makes more, the
 * least readable run of them (copies of values first, then the largest tables) is folded into one
 * layer that holds, per element and channel, exactly what that run of layers painted. The picture
 * is unchanged; the run loses its editable form, and the load says so.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, LayerSpec } from "../../../catalog/types";

/** The most layers a file's styles make per kind. */
export const FILE_STYLE_LAYER_CAP = 16;

/** One layer a translation made, with what it paints, for the fold. */
export interface FoldableLayer {
    /** The layer. */
    readonly spec: LayerSpec;
    /**
     * Per channel, what the layer paints on each element of the load (by the load's element
     * index), or null where it paints nothing. Null for a layer that cannot be folded: one whose
     * values are not plain scalars, or one rebuilt from a layer graphty wrote.
     */
    readonly paint: ReadonlyMap<Channel, readonly unknown[]> | null;
    /** How readable the layer is: a run with the lowest total is folded first. */
    readonly worth: number;
}

/** What folding made. */
export interface FoldResult<L extends FoldableLayer> {
    /** The layers, bottom first, with each folded run replaced by its one layer. */
    readonly layers: readonly (L | FoldableLayer)[];
    /** How many layers were folded. */
    readonly folded: number;
}

/**
 * Fold the cheapest runs of foldable layers until the bound holds, or until no run can be folded.
 * @param layers - The layers, bottom first.
 * @param count - How many elements the load has.
 * @param build - Makes the layer that stands for a run: given the run and, per channel, what it
 *     painted on each element.
 * @param cap - The bound.
 * @returns The layers and how many were folded.
 */
export function foldToCap<L extends FoldableLayer>(
    layers: readonly L[],
    count: number,
    build: (run: readonly FoldableLayer[], paint: ReadonlyMap<Channel, readonly unknown[]>) => FoldableLayer,
    cap = FILE_STYLE_LAYER_CAP,
): FoldResult<L> {
    let out: (L | FoldableLayer)[] = [...layers];
    let folded = 0;
    while (out.length > cap) {
        const size = out.length - cap + 1;
        const at = cheapestRun(out, size);
        if (at < 0) {
            break;
        }

        const run = out.slice(at, at + size);
        out = [...out.slice(0, at), build(run, paintOf(run, count)), ...out.slice(at + size)];
        folded += size;
    }

    return { layers: out, folded };
}

/**
 * The start of the run of foldable layers of a size with the lowest total worth.
 * @param layers - The layers.
 * @param size - The run's length.
 * @returns The index, or -1 when no run of that size is foldable.
 */
function cheapestRun(layers: readonly FoldableLayer[], size: number): number {
    let best = -1;
    let bestWorth = Infinity;
    for (let at = 0; at + size <= layers.length; at++) {
        const run = layers.slice(at, at + size);
        if (run.some((layer) => layer.paint === null)) {
            continue;
        }

        const worth = run.reduce((sum, layer) => sum + layer.worth, 0);
        // The topmost of equally cheap runs, so the layers a reader sees first stay editable.
        if (worth <= bestWorth) {
            best = at;
            bestWorth = worth;
        }
    }

    return best;
}

/**
 * What a run of layers paints per channel and element: the topmost layer that paints wins.
 * @param run - The layers, bottom first.
 * @param count - How many elements the load has.
 * @returns Per channel, the value per element, or null.
 */
function paintOf(run: readonly FoldableLayer[], count: number): Map<Channel, unknown[]> {
    const out = new Map<Channel, unknown[]>();
    for (const layer of run) {
        for (const [channel, values] of layer.paint ?? []) {
            let held = out.get(channel);
            if (held === undefined) {
                held = new Array<unknown>(count).fill(null);
                out.set(channel, held);
            }

            for (let i = 0; i < count; i++) {
                const value = values[i];
                if (value !== null && value !== undefined) {
                    held[i] = value;
                }
            }
        }
    }

    return out;
}
