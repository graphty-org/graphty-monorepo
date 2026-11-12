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
            let list = members.get(p);
            if (list === undefined) {
                list = [];
                members.set(p, list);
            }
            list.push(row);
        }
    }
    // members before their group, walked with a stack of its own: nesting may be as deep as the file has nodes; a
    // cycle the file should not have stops at the group already being walked, which counts its stored box
    const seen = new Set<number>();
    for (const root of members.keys()) {
        if (seen.has(root)) {
            continue;
        }
        seen.add(root);
        const stack: [number, number][] = [[root, 0]];
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            const inside = members.get(top[0]) ?? [];
            if (top[1] < inside.length) {
                const member = inside[top[1]++];
                if (members.has(member) && !seen.has(member)) {
                    seen.add(member);
                    stack.push([member, 0]);
                }
                continue;
            }
            stack.pop();
            const box = enclose(frameOf(top[0]), inside, (row) => out.get(row) ?? boxOf(row));
            if (box !== null) {
                out.set(top[0], box);
            }
        }
    }
    return out;
}

/**
 * An open group's box round its members' boxes, grown by its frame.
 * @param frame - the group's frame, or null for a node that is not an open group
 * @param inside - the group's members
 * @param drawn - a member's box, or null without one
 * @returns the box, or null for no open group or no member with a box
 */
function enclose(
    frame: YedGroupFrame | null,
    inside: readonly number[],
    drawn: (row: number) => YedBox | null,
): YedBox | null {
    if (frame === null) {
        return null;
    }
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    let found = false;
    for (const member of inside) {
        const b = drawn(member);
        if (b !== null) {
            found = true;
            x0 = Math.min(x0, b[0]);
            y0 = Math.min(y0, b[1]);
            x1 = Math.max(x1, b[2]);
            y1 = Math.max(y1, b[3]);
        }
    }
    if (!found) {
        return null;
    }
    const [top, left, bottom, right] = frame.insets;
    return [x0 - left, y0 - top - frame.top, x1 + right, y1 + bottom + frame.bottom];
}

/**
 * The nodes yEd and yEd Live do not draw because a group holding them, at any depth, is closed: they draw the closed
 * group alone (graphml-synthetic-nodes' `grp-closed`, yed-live-graphml-specimen-groups-p3's `group-collapsed`).
 * @param snapshot - the graph, its nesting in the `parent` node role
 * @param closed - whether a node is a closed group
 * @returns the hidden nodes' indices
 */
export function foldedMembers(snapshot: GraphSnapshot, closed: (row: number) => boolean): Set<number> {
    const hidden = new Set<number>();
    const parent = snapshot.nodes.byRole("parent");
    if (parent === null) {
        return hidden;
    }
    const known = new Map<number, boolean>();
    const isClosed = (row: number): boolean => {
        const was = known.get(row);
        if (was !== undefined) {
            return was;
        }
        const now = closed(row);
        known.set(row, now);
        return now;
    };
    const parentOf = (row: number): number | undefined => {
        const p = parent.isSet(row) ? parent.value(row) : undefined;
        return typeof p === "number" ? p : undefined;
    };
    // whether a node is hidden, known for every node a walk passed, so each walk up the nesting stops at the first
    // node already known and deep nesting costs its depth once, not once per member
    const hiddenOf = cycleHidden(parent.length, parentOf, isClosed);
    for (let row = 0; row < parent.length; row++) {
        const path: number[] = [];
        let r: number | undefined = row;
        let isHidden = false;
        while (r !== undefined) {
            const was = hiddenOf.get(r);
            if (was !== undefined) {
                isHidden = was;
                break;
            }
            path.push(r);
            const p = parentOf(r);
            if (p !== undefined && isClosed(p)) {
                isHidden = true;
                break;
            }
            r = p;
        }
        for (const passed of path) {
            hiddenOf.set(passed, isHidden);
        }
        if (isHidden) {
            hidden.add(row);
        }
    }
    return hidden;
}

/**
 * Whether each node on a nesting cycle (one the file should not have) is hidden: a node on one is in every other
 * node's group on it, so it is hidden when any other node on the cycle is closed.
 * @param count - the number of nodes
 * @param parentOf - a node's group, or undefined at the top
 * @param isClosed - whether a node is a closed group
 * @returns whether each node on a cycle is hidden, by node index
 */
function cycleHidden(
    count: number,
    parentOf: (row: number) => number | undefined,
    isClosed: (row: number) => boolean,
): Map<number, boolean> {
    const out = new Map<number, boolean>();
    const walking = new Set<number>();
    const done = new Set<number>();
    for (let row = 0; row < count; row++) {
        const path: number[] = [];
        let r: number | undefined = row;
        while (r !== undefined && !done.has(r) && !walking.has(r)) {
            walking.add(r);
            path.push(r);
            r = parentOf(r);
        }
        if (r !== undefined && walking.has(r)) {
            const cycle = path.slice(path.indexOf(r));
            const closed = cycle.filter(isClosed).length;
            for (const c of cycle) {
                out.set(c, closed - (isClosed(c) ? 1 : 0) > 0);
            }
        }
        for (const passed of path) {
            walking.delete(passed);
            done.add(passed);
        }
    }
    return out;
}
