/**
 * @file The `particle-morph` transition (from the shader lab's particle morph): every node bursts
 * into a cloud of particles that streams through curl noise and gathers again where the node
 * lands, while the node itself glides there in a sweep across the graph.
 *
 * The cloud is the particle drawable, which reads `particles` and `curl` and caps the count at
 * 60,000 in all, fewer at lower quality.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { blend, easeInOut, windowed } from "./glide";

/** The share of the duration each node's own glide takes; the rest is the sweep's spread. */
const GLIDE = 0.65;

/** Particle morph: dissolve, stream, re-form. */
export const PARTICLE_MORPH: TransitionRegistration = {
    descriptor: {
        id: "particle-morph",
        plainName: "Particle morph",
        params: [
            { name: "particles", plainName: "Particles", type: "integer", default: 24, min: 1, max: 32 },
            { name: "curl", plainName: "Curl", type: "number", default: 1, min: 0, max: 3 },
        ],
    },
    drawable: "particles",
    move: (t, from, to, node) => {
        if (t >= 1) {
            return to;
        }

        return blend(from, to, easeInOut(windowed(t, node.seed * (1 - GLIDE), GLIDE)));
    },
};
