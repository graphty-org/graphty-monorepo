/**
 * @file The element's own layout transitions.
 *
 * Each preset owns a file, `./<id>.ts`, exporting its `TransitionRegistration`; this file lists
 * them, one import line per preset, in catalog order (design/rendering/shader-styles.md section 8).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";
import { ARC_MOVE } from "./arc-move";
import { COLLAPSE_BLOOM } from "./collapse-bloom";
import { FADE_THROUGH } from "./fade-through";
import { GLIDE } from "./glide";
import { PARTICLE_MORPH } from "./particle-morph";
import { STAGGERED_GLIDE } from "./staggered-glide";
import { SWIRL } from "./swirl";

/** Every preset, in catalog order. */
export const TRANSITION_PRESETS: readonly TransitionRegistration[] = Object.freeze([
    GLIDE,
    STAGGERED_GLIDE,
    ARC_MOVE,
    SWIRL,
    FADE_THROUGH,
    COLLAPSE_BLOOM,
    PARTICLE_MORPH,
]);
