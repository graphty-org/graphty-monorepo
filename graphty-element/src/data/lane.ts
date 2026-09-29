/**
 * @file The coordinate lane as the renderer's public objects hand it out: read-only. The writable
 * lane is reached only through {@link writableLane}, which no entry point exports.
 */

import type { ReadonlyElementPositions } from "../session/types";
import { ElementPositions } from "./positions";

/** The key a data manager keeps its writable lane under; see {@link writableLane}. */
export const WRITABLE_LANE: unique symbol = Symbol("graphty.writableLane");

/**
 * The writable coordinate lane of a data manager, for the element's own layout engines and
 * nodes. A consumer reads `getDataManager().positions`, which has no writer, and places nodes
 * through `session.positions.set`.
 * @param manager - A data manager, or a stand-in for one that hands its lane out directly.
 * @returns The lane, or undefined when the manager keeps none.
 */
export function writableLane(manager: object | undefined): ElementPositions | undefined {
    if (manager === undefined) {
        return undefined;
    }

    const held = (manager as { [WRITABLE_LANE]?: ElementPositions })[WRITABLE_LANE];
    if (held !== undefined) {
        return held;
    }

    // A test's stand-in for a data manager hands out a real lane under `positions`.
    const direct = (manager as { positions?: unknown }).positions;
    return direct instanceof ElementPositions ? direct : undefined;
}

/**
 * The read half of a coordinate lane, as a plain object: a caller holding it can read every row
 * and reach no writer, not even through a cast.
 * @param lane - Reads the lane now; a store may replace its lane object.
 * @returns The read-only coordinates.
 */
export function readonlyPositions(lane: () => ReadonlyElementPositions): ReadonlyElementPositions {
    return {
        get capacity() {
            return lane().capacity;
        },
        get count() {
            return lane().count;
        },
        get placedCount() {
            return lane().placedCount;
        },
        get pinnedCount() {
            return lane().pinnedCount;
        },
        get generation() {
            return lane().generation;
        },
        isPlaced: (index) => lane().isPlaced(index),
        isPinned: (index) => lane().isPinned(index),
        read: (index, out) => {
            lane().read(index, out);
        },
    };
}
