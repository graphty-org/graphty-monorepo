/**
 * @file The `swirl` transition: every node turns about the middle of the layout as it travels,
 * its distance from the middle changing smoothly from the old to the new.
 *
 * The turn is about the Z axis, so a 2D layout's nodes stay on Z = 0 throughout.
 *
 * ponytail: turns about the origin, which is where the element's layouts center a graph; a layout
 * centered elsewhere swirls about a point off its middle. Pass the graph's center in
 * `TransitionNode` if one ever does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { easeInOut } from "./glide";

const TURN = 2 * Math.PI;

/**
 * How far a node turns: the angle that takes it to its new bearing, the way `turns` points (its
 * sign; counterclockwise when positive), and at least `|turns|` of a whole turn. Every node turns
 * the same way, which is what makes it a swirl, and lands on its new bearing exactly.
 * @param delta - The new bearing less the old, in radians.
 * @param turns - The `turns` parameter.
 * @returns The angle to turn through, in radians.
 */
function sweep(delta: number, turns: number): number {
    if (turns === 0) {
        // The shorter way round.
        return delta - TURN * Math.round(delta / TURN);
    }

    const way = Math.sign(turns);
    const least = Math.abs(turns) * TURN;
    let angle = (((way * delta) % TURN) + TURN) % TURN;
    if (angle < least) {
        angle += TURN * Math.ceil((least - angle) / TURN);
    }

    return way * angle;
}

/** Swirl: a turn about the middle. */
export const SWIRL: TransitionRegistration = {
    descriptor: {
        id: "swirl",
        plainName: "Swirl",
        params: [{ name: "turns", plainName: "Turns", type: "number", default: 0.5, min: -2, max: 2 }],
    },
    move: (t, from, to, _node, params) => {
        if (t >= 1) {
            return to;
        }

        const turns = typeof params.turns === "number" ? params.turns : 0.5;
        const u = easeInOut(t);
        const start = Math.atan2(from.y, from.x);
        const delta = Math.atan2(to.y, to.x) - start;
        const angle = start + sweep(delta, turns) * u;
        const radius = Math.hypot(from.x, from.y) * (1 - u) + Math.hypot(to.x, to.y) * u;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: from.z * (1 - u) + to.z * u };
    },
};
