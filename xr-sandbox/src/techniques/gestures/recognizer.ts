// Hand pose recognition. The matcher is a fork of handy-work (MIT, Copyright (c) 2022 Ada Rose
// Cannon, https://github.com/AdaRoseCannon/handy-work, src/handpose.js and src/normalize.js; the
// license is in poses/LICENSE-handy-work.txt): the same .handpose template layout and the same
// distance -- every joint's rotation relative to the wrist, compared with the template's, as a mean
// weighted angle in radians. Rewritten without three.js, comlink or its Web Worker, so it runs
// synchronously each frame with no frame of latency, and extended with the guards handy-work does
// not have (design section 9.1): begin and end thresholds, a minimum hold, and suppression while the
// hand pinches or holds something. Pure: no Babylon and no DOM, so the Node tests import it.

/** Joints per hand, in WebXR hand input order (wrist, 4 thumb, 5 per finger). */
export const JOINTS = 25;
const HAND = JOINTS * 16;
/** handy-work's .handpose layout: [joint count, left 25x16, right 25x16, left weights, right weights]. */
export const TEMPLATE_LENGTH = 1 + 2 * HAND + 2 * JOINTS;
/** The thumb's joints (metacarpal to tip). */
export const THUMB = [1, 2, 3, 4];

/** Which hand. */
export type Side = "left" | "right";

/**
 * One hand's 25 joint matrices inside a template.
 * @param t - a template
 * @param side - which hand
 * @returns a view of 400 floats
 */
export const handOf = (t: Float32Array, side: Side): Float32Array =>
    t.subarray(1 + (side === "right" ? HAND : 0), 1 + (side === "right" ? 2 * HAND : HAND));

/**
 * One hand's 25 joint weights inside a template.
 * @param t - a template
 * @param side - which hand
 * @returns a view of 25 floats
 */
const weightsOf = (t: Float32Array, side: Side): Float32Array =>
    t.subarray(1 + 2 * HAND + (side === "right" ? JOINTS : 0), 1 + 2 * HAND + (side === "right" ? 2 * JOINTS : JOINTS));

/**
 * Premultiply every joint matrix by the inverse of the wrist's (rigid), in place, so a pose no
 * longer depends on where the hand is or how it is turned. handy-work's normalize.
 * @param hand - 25 column-major 4x4 matrices
 * @returns the same array
 */
export function normalize(hand: Float32Array): Float32Array {
    const w = hand.slice(0, 16);
    // The wrist's inverse: transposed rotation, rotated and negated translation.
    const r = [w[0], w[4], w[8], w[1], w[5], w[9], w[2], w[6], w[10]];
    const t = [
        -(r[0] * w[12] + r[3] * w[13] + r[6] * w[14]),
        -(r[1] * w[12] + r[4] * w[13] + r[7] * w[14]),
        -(r[2] * w[12] + r[5] * w[13] + r[8] * w[14]),
    ];
    const m = new Float32Array(16);
    for (let j = 0; j < JOINTS; j++) {
        const o = j * 16;
        for (let c = 0; c < 4; c++) {
            const x = hand[o + c * 4];
            const y = hand[o + c * 4 + 1];
            const z = hand[o + c * 4 + 2];
            const h = hand[o + c * 4 + 3];
            m[c * 4] = r[0] * x + r[3] * y + r[6] * z + t[0] * h;
            m[c * 4 + 1] = r[1] * x + r[4] * y + r[7] * z + t[1] * h;
            m[c * 4 + 2] = r[2] * x + r[5] * y + r[8] * z + t[2] * h;
            m[c * 4 + 3] = h;
        }
        hand.set(m, o);
    }
    return hand;
}

/**
 * handy-work's distance: the weighted mean, over every joint but the wrist, of the angle between
 * the template joint's rotation and the live joint's.
 * @param template - a template
 * @param side - which of its hands to compare with
 * @param live - the live hand, normalized
 * @returns radians; 0 is identical
 */
export function distance(template: Float32Array, side: Side, live: Float32Array): number {
    const a = handOf(template, side);
    const w = weightsOf(template, side);
    let sum = 0;
    let total = 0.0001;
    for (let j = 0; j < JOINTS; j++) {
        total += w[j];
        if (j === 0) {
            continue;
        }
        // The angle of the relative rotation A^T B: acos((trace - 1) / 2).
        let trace = 0;
        for (let c = 0; c < 3; c++) {
            for (let k = 0; k < 3; k++) {
                trace += a[j * 16 + c * 4 + k] * live[j * 16 + c * 4 + k];
            }
        }
        sum += Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2))) * w[j];
    }
    return sum / total;
}

/** IWER's and the WebXR convention's left-to-right mirror, as a per-element sign (S M S, S = diag(-1, 1, 1, 1)). */
const MIRROR = [1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1];

/**
 * Mirror a normalized hand to the other side.
 * @param hand - 25 matrices
 * @returns a new array
 */
export function mirror(hand: Float32Array): Float32Array {
    const out = Float32Array.from(hand);
    for (let i = 0; i < out.length; i++) {
        out[i] *= MIRROR[i % 16];
    }
    return out;
}

/**
 * A template from normalized hands, in handy-work's layout with every weight 1. A missing hand is
 * the mirror of the other (handy-work's own recorder needs both).
 * @param left - the left hand, normalized, or null
 * @param right - the right hand, normalized, or null
 * @returns the template
 */
export function makeTemplate(left: Float32Array | null, right: Float32Array | null): Float32Array {
    const l = left ?? (right ? mirror(right) : null);
    const r = right ?? (left ? mirror(left) : null);
    if (!l || !r) {
        throw new Error("a template needs at least one hand");
    }
    const t = new Float32Array(TEMPLATE_LENGTH);
    t[0] = JOINTS;
    t.set(l, 1);
    t.set(r, 1 + HAND);
    t.fill(1, 1 + 2 * HAND);
    return t;
}

/**
 * A template made of `base` with some joints taken from `donor` (both hands).
 * @param base - the template most joints come from
 * @param donor - the template the listed joints come from
 * @param joints - joint indices to take from the donor
 * @returns a new template
 */
export function splice(base: Float32Array, donor: Float32Array, joints: readonly number[]): Float32Array {
    const t = Float32Array.from(base);
    for (const side of ["left", "right"] as const) {
        const to = handOf(t, side);
        const from = handOf(donor, side);
        for (const j of joints) {
            to.set(from.subarray(j * 16, j * 16 + 16), j * 16);
        }
    }
    return t;
}

/**
 * A template from base64 (a .handpose file's bytes).
 * @param b64 - base64
 * @returns the template
 */
export function decode(b64: string): Float32Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
}

/**
 * A template as base64 (a .handpose file's bytes), for the log.
 * @param t - the template
 * @returns base64
 */
export function encode(t: Float32Array): string {
    const bytes = new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
    let bin = "";
    for (const b of bytes) {
        bin += String.fromCharCode(b);
    }
    return btoa(bin);
}

/** The recognizer's tuning, read every frame so the gear panel's changes apply at once. */
export interface TrackerOptions {
    /** A pose begins to count only under this distance (radians). */
    begin: number;
    /** An active pose ends only over this distance (radians). */
    end: number;
    /** A pose must stay the best match under `begin` this long before it fires. */
    holdMs: number;
    /**
     * And for at least this many frames in a row, so a pose seen on two samples across a stalled
     * frame never fires (at 72 Hz the hold is about 11 frames anyway).
     */
    minFrames: number;
}

/** A pose turning on (fires a binding) or off. */
export interface PoseEvent {
    type: "start" | "end";
    pose: string;
    /** The distance when it started. */
    distance?: number;
    /** Why it ended early: suppressed or untracked. */
    reason?: string;
}

/** One hand's recognizer state. */
export interface Tracker {
    readonly active: string | null;
    /**
     * One frame.
     * @param now - ms
     * @param distances - pose name to distance; or a string saying why this frame cannot count
     *   (the hand pinches, makes a fist, holds something or is not tracked)
     * @returns the event this frame, if any
     */
    step(now: number, distances: Readonly<Record<string, number>> | string): PoseEvent | null;
}

/**
 * Create one hand's tracker: a pose fires once when it has been the best match, under `begin`,
 * for `holdMs` and `minFrames`; it stays on until its distance passes `end` or another pose is the best match
 * under `begin`; nothing fires while suppressed, and a suppressed active pose ends.
 * @param opts - the tuning, read every frame
 * @param fires - which poses may become active (the rest still compete, as rejecters)
 * @returns the tracker
 */
export function createTracker(opts: () => TrackerOptions, fires: (pose: string) => boolean): Tracker {
    let active: string | null = null;
    let candidate: string | null = null;
    let since = 0;
    let seen = 0;
    const stop = (reason?: string): PoseEvent | null => {
        candidate = null;
        if (!active) {
            return null;
        }
        const pose = active;
        active = null;
        return { type: "end", pose, reason };
    };
    return {
        get active() {
            return active;
        },
        step(now, d) {
            if (typeof d === "string") {
                return stop(d);
            }
            const o = opts();
            let best: string | null = null;
            let bestD = Infinity;
            for (const [name, v] of Object.entries(d)) {
                if (v < bestD) {
                    best = name;
                    bestD = v;
                }
            }
            if (active) {
                const clearlyOther = best !== active && bestD < o.begin;
                if ((d[active] ?? Infinity) <= o.end && !clearlyOther) {
                    return null;
                }
                return stop();
            }
            if (best === null || bestD >= o.begin || !fires(best)) {
                candidate = null;
                return null;
            }
            if (candidate !== best) {
                candidate = best;
                since = now;
                seen = 0;
            }
            seen++;
            if (now - since < o.holdMs || seen < o.minFrames) {
                return null;
            }
            active = best;
            candidate = null;
            return { type: "start", pose: best, distance: bestD };
        },
    };
}
