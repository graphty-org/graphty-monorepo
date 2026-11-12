/**
 * @file The `arc-move` transition: every node travels on an arc to its new place, bowing to the
 * left of its direction of travel within the layout's plane.
 *
 * The arc stays in the X-Y plane, so a 2D layout's nodes stay on Z = 0 throughout.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { blend, easeInOut } from "./glide";

/** Arc move: a bowed path. */
export const ARC_MOVE: TransitionRegistration = {
    descriptor: {
        id: "arc-move",
        plainName: "Arc move",
        params: [{ name: "height", plainName: "Height", type: "number", default: 0.3, min: 0, max: 1 }],
    },
    move: (t, from, to, _node, params) => {
        if (t >= 1) {
            return to;
        }

        const height = typeof params.height === "number" ? params.height : 0.3;
        const u = easeInOut(t);
        const at = blend(from, to, u);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const flat = Math.hypot(dx, dy);
        if (flat < 1e-9) {
            return at;
        }

        // The bow's height is a share of the whole move's length; its direction is the move's,
        // turned a quarter to the left.
        const bow = (Math.hypot(dx, dy, to.z - from.z) * height * Math.sin(Math.PI * u)) / flat;
        return { x: at.x - dy * bow, y: at.y + dx * bow, z: at.z };
    },
};
