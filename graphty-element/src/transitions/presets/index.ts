/**
 * @file The element's own layout transitions.
 *
 * Each preset owns a file, `./<id>.ts`, exporting its `TransitionRegistration`; this file lists
 * them, one import line per preset, in catalog order (design/rendering/shader-styles.md section 8).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TransitionRegistration } from "../registry";

/** Every preset, in catalog order. */
export const TRANSITION_PRESETS: readonly TransitionRegistration[] = Object.freeze([]);
