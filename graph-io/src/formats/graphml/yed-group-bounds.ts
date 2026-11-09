/**
 * The box yEd draws an open group in. yEd keeps an open group's bounds round its members (a GraphML
 * `y:ProxyAutoBoundsNode`, a GML `isGroup` node): the members' box grown by the group's insets, and by the height of
 * its labels inside its top and its bottom, whatever box the file stores. yEd 3.25 draws
 * `yed-graphml-specimen-groups`' open group, stored at 105,83.5 150 x 90 with members over x 138..222, y 126.5..150.5, insets 15 and a 10 pt top
 * label, at 123,95.8594 114 x 69.6406, and `gml-specimen-groups`' nested group round its inner group's own box.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

/** A box: left, top, right and bottom, y growing downward. */
export type YedBox = readonly [number, number, number, number];

/** What grows an open group's box round its members: its insets (top, left, bottom, right) and its labels. */
export interface YedGroupFrame {
    readonly insets: readonly [number, number, number, number];
    /** The height of the group's labels inside its top; 0 without one. */
    readonly top: number;
    /** The height of the group's labels inside its bottom; 0 without one. */
    readonly bottom: number;
}

/** yEd's insets of a group that stores none (GroupNodeRealizer's default). */
export const YED_GROUP_INSETS = 15;

/**
 * The boxes yEd draws the open groups of a graph in, for the groups with at least one member with a box.
 * @param snapshot - the graph, its nesting in the `parent` node role
 * @param boxOf - a node's stored box, or null without one
 * @param frameOf - an open group's frame, or null for a node that is not one (a closed group, a plain node)
 * @returns each such group's box, by node index
 */
export function yedGroupBounds(
    snapshot: GraphSnapshot,
    boxOf: (row: number) => YedBox | null,
    frameOf: (row: number) => YedGroupFrame | null,
): Map<number, YedBox> {
    const out = new Map<number, YedBox>();
    const parent = snapshot.nodes.byRole("parent");
    if (parent === null) {
        return out;
    }
    const members = new Map<number, number[]>();
    for (let row = 0; row < parent.length; row++) {
        const p = parent.isSet(row) ? parent.value(row) : undefined;
        if (typeof p === "number") {
            members.set(p, [...(members.get(p) ?? []), row]);
        }
    }
    const seen = new Set<number>();
    const drawn = (row: number): YedBox | null => {
        if (out.has(row) || seen.has(row)) {
            return out.get(row) ?? boxOf(row);
        }
        seen.add(row);
        const frame = frameOf(row);
        const inside = (members.get(row) ?? []).map(drawn).filter((b): b is YedBox => b !== null);
        if (frame === null || inside.length === 0) {
            return boxOf(row);
        }
        const [top, left, bottom, right] = frame.insets;
        const box: YedBox = [
            Math.min(...inside.map((b) => b[0])) - left,
            Math.min(...inside.map((b) => b[1])) - top - frame.top,
            Math.max(...inside.map((b) => b[2])) + right,
            Math.max(...inside.map((b) => b[3])) + bottom + frame.bottom,
        ];
        out.set(row, box);
        return box;
    };
    for (const row of members.keys()) {
        drawn(row);
    }
    return out;
}
