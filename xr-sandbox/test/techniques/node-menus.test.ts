import { describe, expect, it } from "vitest";

import { graphVerbs, NODE_VERBS, ringPosition, ringSlot } from "../../src/techniques/node-menus/verbs";

/** The projected point of a hand turned `deg` degrees toward compass angle `toward` (0 = up, 90 = right). */
const tilt = (deg: number, toward: number): [number, number, number] => {
    const t = (toward * Math.PI) / 180;
    const s = Math.sin((deg * Math.PI) / 180);
    return [Math.sin(t) * s, Math.cos(t) * s, deg];
};

describe("ring item from a wrist turn", () => {
    const n = NODE_VERBS.length;

    it("a 40 degree turn to the right chooses Neighbors, the item at the right", () => {
        expect(NODE_VERBS[ringSlot(...tilt(40, 90), n, 12)].id).toBe("neighbors");
    });

    it("turns up, down and left choose the items there", () => {
        expect(NODE_VERBS[ringSlot(...tilt(30, 0), n, 12)].id).toBe("select");
        expect(NODE_VERBS[ringSlot(...tilt(30, 180), n, 12)].id).toMatch(/probe|note/);
        expect(NODE_VERBS[ringSlot(...tilt(30, 288), n, 12)].id).toBe("hide");
    });

    it("chooses nothing inside the dead zone", () => {
        expect(ringSlot(...tilt(8, 90), n, 12)).toBe(-1);
        expect(ringSlot(0, 0, 0, n, 12)).toBe(-1);
    });

    it("keeps the current item a little past its sector edge, then lets go", () => {
        // Sector 1 spans 36 to 108 degrees; 111 would be item 2 without hysteresis.
        expect(ringSlot(...tilt(30, 111), n, 12, 1)).toBe(1);
        expect(ringSlot(...tilt(30, 111), n, 12)).toBe(2);
        expect(ringSlot(...tilt(30, 130), n, 12, 1)).toBe(2);
    });

    it("places items clockwise from the top", () => {
        const p = ringPosition(1, 4, 0.1);
        expect(p.x).toBeCloseTo(0.1);
        expect(p.y).toBeCloseTo(0);
    });

    it("words the graph verbs from the state", () => {
        expect(graphVerbs(true, false).map((v) => v.label)).toEqual([
            "Show PageRank",
            "Remove filter",
            "Select none",
            "Note",
        ]);
    });
});
