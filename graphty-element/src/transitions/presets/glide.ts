/**
 * @file The `glide` transition: every node travels straight to its new place, eased.
 *
 * Also the home of the small helpers the other presets share (an ease, a window of the duration,
 * a blend of two points), so each preset stays one short file.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Vec3 } from "../../camera/types";
import type { TransitionRegistration } from "../registry";

/**
 * Ease in and out, cubic: slow to leave, slow to land.
 * @param u - Progress, 0..1.
 * @returns The eased progress, 0 at 0 and exactly 1 at 1.
 */
export function easeInOut(u: number): number {
    return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/**
 * A spring: overshoots its target and settles on it.
 * @param u - Progress, 0..1.
 * @returns The sprung progress, 0 at 0 and exactly 1 at 1.
 */
export function spring(u: number): number {
    // The (1 - u) factor makes the wobble die to nothing at u = 1, so the landing is exact.
    return 1 - Math.exp(-6 * u) * Math.cos(4.5 * Math.PI * u) * (1 - u);
}

/**
 * Progress within a window of the duration.
 * @param t - The transition's progress, 0..1.
 * @param start - Where the window starts, 0..1.
 * @param length - How long the window is, as a share of the duration.
 * @returns 0 before the window, 1 after it, linear inside.
 */
export function windowed(t: number, start: number, length: number): number {
    return Math.min(1, Math.max(0, (t - start) / Math.max(length, 1e-6)));
}

/**
 * A point part of the way from one point to another.
 *
 * Written as `a * (1 - u) + b * u`, not `a + (b - a) * u`, so u = 1 gives `b` exactly.
 * @param a - The start.
 * @param b - The end.
 * @param u - How far, 0..1 (a spring may pass 1).
 * @returns The point.
 */
export function blend(a: Vec3, b: Vec3, u: number): Vec3 {
    const v = 1 - u;
    return { x: a.x * v + b.x * u, y: a.y * v + b.y * u, z: a.z * v + b.z * u };
}

const EASINGS: Readonly<Record<string, (u: number) => number>> = {
    linear: (u) => u,
    "ease-in-out": easeInOut,
    spring,
};

/** Glide: straight to the new place. */
export const GLIDE: TransitionRegistration = {
    descriptor: {
        id: "glide",
        plainName: "Glide",
        params: [
            {
                name: "easing",
                plainName: "Easing",
                type: "enum",
                default: "ease-in-out",
                values: [
                    { value: "linear", label: "Linear" },
                    { value: "ease-in-out", label: "Ease in and out" },
                    { value: "spring", label: "Spring" },
                ],
            },
        ],
    },
    move: (t, from, to, _node, params) => {
        if (t >= 1) {
            return to;
        }

        const ease = EASINGS[String(params.easing)] ?? easeInOut;
        return blend(from, to, ease(t));
    },
};
