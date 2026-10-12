// What the node menus offer, and which ring item a wrist tilt chooses. Pure: no Babylon, no DOM,
// so test/techniques/node-menus.test.ts can run it in Node.

/** A menu entry: a stable id (logged, and what the dry run looks for) and its words. */
export interface Verb {
    id: string;
    label: string;
}

/** The verbs of a node, in ring order (item 0 at the top, then clockwise). */
export const NODE_VERBS: readonly Verb[] = [
    { id: "select", label: "Select" },
    { id: "neighbors", label: "Neighbors" },
    { id: "probe", label: "Probe" },
    { id: "note", label: "Note" },
    { id: "hide", label: "Hide" },
];

/**
 * The verbs of the graph itself (a hold on empty space).
 * @param filtered - whether a filter is on (the filter verb then removes it)
 * @param hasSelection - whether anything is selected
 * @returns the verbs, in ring order
 */
export function graphVerbs(filtered: boolean, hasSelection: boolean): Verb[] {
    return [
        { id: "show", label: "Show PageRank" },
        { id: "filter", label: filtered ? "Remove filter" : "Keep top half" },
        { id: "clear", label: hasSelection ? "Clear selection" : "Select none" },
        { id: "note", label: "Note" },
    ];
}

/** How far past a sector's edge the current item is kept, so a hand at a boundary does not flicker. */
const HYSTERESIS_DEG = 6;

/**
 * Which ring item a wrist tilt chooses, after Open Brush's PinCushion: the hand's rotation since
 * the ring opened, applied to a point ahead of the hand and projected onto the ring's plane.
 * @param dx - the projected point's offset to the viewer's right
 * @param dy - its offset upward
 * @param tiltDeg - how far the hand has turned since the ring opened, in degrees
 * @param n - items on the ring (item 0 at the top, then clockwise as the viewer sees it)
 * @param deadDeg - tilts below this choose nothing (release there cancels)
 * @param current - the item highlighted now, or -1, kept while the tilt stays near its sector
 * @returns the item index, or -1 for none
 */
export function ringSlot(dx: number, dy: number, tiltDeg: number, n: number, deadDeg: number, current = -1): number {
    if (n <= 0) {
        return -1;
    }
    const sector = 360 / n;
    const deg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
    if (current >= 0 && current < n && tiltDeg >= deadDeg - HYSTERESIS_DEG / 2) {
        const off = Math.abs(((deg - current * sector + 540) % 360) - 180);
        if (off <= sector / 2 + HYSTERESIS_DEG) {
            return current;
        }
    }
    if (tiltDeg < deadDeg) {
        return -1;
    }
    return Math.round(deg / sector) % n;
}

/**
 * Where item `i` of `n` sits on a ring of radius `r` (x to the viewer's right, y up).
 * @param i - the item
 * @param n - items on the ring
 * @param r - radius in meters
 * @returns the offset in the ring's plane
 */
export function ringPosition(i: number, n: number, r: number): { x: number; y: number } {
    const a = (i * 2 * Math.PI) / n;
    return { x: Math.sin(a) * r, y: Math.cos(a) * r };
}
