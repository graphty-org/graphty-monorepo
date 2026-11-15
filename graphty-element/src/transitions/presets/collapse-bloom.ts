/**
 * @file The `collapse-bloom` transition: the old layout shrinks into a knot at the middle, holds,
 * and the new layout blooms out of it.
 *
 * The knot is the old layout at 4% of its size turning into the new one at 4% of its size, so no
 * two joined nodes ever meet at one point (an edge of length zero has no direction).
 *
 * ponytail: shrinks toward the origin, which is where the element's layouts center a graph; a
 * layout centered elsewhere collapses to a point off its middle. Pass the graph's center in
 * `TransitionNode` if one ever does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Vec3 } from "../../camera/types";
import type { TransitionRegistration } from "../registry";
import { blend, windowed } from "./glide";

/** How small the knot is, as a share of the layout's size. */
const KNOT = 0.04;

/**
 * A point shrunk toward the origin.
 * @param at - The point.
 * @returns It at the knot's size.
 */
function knotted(at: Vec3): Vec3 {
    return { x: at.x * KNOT, y: at.y * KNOT, z: at.z * KNOT };
}

/** Collapse and bloom: in to the middle, out to the new layout. */
export const COLLAPSE_BLOOM: TransitionRegistration = {
    descriptor: {
        id: "collapse-bloom",
        plainName: "Collapse and bloom",
        params: [{ name: "hold", plainName: "Hold", type: "number", default: 0.1, min: 0, max: 0.5 }],
    },
    move: (t, from, to, node, params) => {
        if (t >= 1) {
            return to;
        }

        const hold = typeof params.hold === "number" ? params.hold : 0.1;
        const half = (1 - hold) / 2;
        if (t < half) {
            // Outer nodes fall in a little later, so the collapse closes like a hand.
            const u = windowed(t, node.distanceFromCenter * half * 0.25, half * 0.75);
            return blend(from, knotted(from), u * u * u);
        }

        if (t < half + hold) {
            return blend(knotted(from), knotted(to), windowed(t, half, hold));
        }

        const u = windowed(t, half + hold, half);
        return blend(knotted(to), to, 1 - (1 - u) ** 3);
    },
};
