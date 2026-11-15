/**
 * @file The `staggered-glide` transition: nodes glide one after another, in a wave that starts at
 * the middle of the graph or at the selection.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { blend, easeInOut, windowed } from "./glide";

/** Staggered glide: a wave of glides. */
export const STAGGERED_GLIDE: TransitionRegistration = {
    descriptor: {
        id: "staggered-glide",
        plainName: "Staggered glide",
        params: [
            {
                name: "from",
                plainName: "From",
                type: "enum",
                default: "center",
                values: [
                    { value: "center", label: "Center" },
                    { value: "selection", label: "Selection" },
                ],
            },
            { name: "stagger", plainName: "Stagger", type: "number", default: 0.5, min: 0, max: 1 },
        ],
    },
    move: (t, from, to, node, params) => {
        if (t >= 1) {
            return to;
        }

        // With nothing selected, the wave starts at the middle.
        const order =
            params.from === "selection" && node.hopFromSelection !== undefined
                ? node.hopFromSelection
                : node.distanceFromCenter;
        const stagger = typeof params.stagger === "number" ? params.stagger : 0.5;
        // Each node's glide takes the share of the duration left by the stagger (a fifth of it at
        // the most stagger, so no node snaps), and the last one ends as the duration does.
        const length = 1 - stagger * 0.8;
        return blend(from, to, easeInOut(windowed(t, order * (1 - length), length)));
    },
};
