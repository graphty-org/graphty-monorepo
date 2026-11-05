/**
 * @file The `fade-through` transition: each node dissolves into a soft puff of particles where it
 * stands, slips to its new place inside the puff, and forms again there.
 *
 * The puff is the particle drawable with no curl, so the particles stay around their node instead
 * of streaming; its size and count are fixed (internal parameters), so the catalog offers no
 * settings for it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { blend, easeInOut, windowed } from "./glide";

/** Fade through: a dissolve from one layout into the next. */
export const FADE_THROUGH: TransitionRegistration = {
    descriptor: {
        id: "fade-through",
        plainName: "Fade through",
        params: [
            {
                name: "particles",
                plainName: "Particles",
                type: "integer",
                default: 12,
                min: 1,
                max: 32,
                internal: true,
            },
            { name: "curl", plainName: "Curl", type: "number", default: 0, min: 0, max: 3, internal: true },
        ],
    },
    drawable: "particles",
    move: (t, from, to, node) => {
        if (t >= 1) {
            return to;
        }

        // The slip happens while the puff is thickest (the middle of the duration), each node a
        // little apart from the next so the dissolve ripples rather than snaps.
        return blend(from, to, easeInOut(windowed(t, 0.3 + node.seed * 0.15, 0.25)));
    },
};
