// The input layer: what each hand is on (the targeting layer, design section 5.2), press edges from
// the session's events and from polled gamepad buttons, and the last 10 s of input for Flag. Edges
// arrive from DOM events but are handed on at the start of the next XR frame, with that frame's
// poses (section 5.2). Every gamepad index is guarded: Galaxy XR controllers report fewer buttons
// than their profile lists.

import { Ray, Vector3, type WebXRDefaultExperience, type WebXRInputSource } from "@babylonjs/core";

import type { Channel, Hand } from "../core/arbiter";
import type { GraphView } from "../scene/graph-view";
import type { HoverInfo } from "./technique";

/** A press edge. */
export interface Edge {
    hand: Hand;
    channel: Channel;
    detail?: string;
    down: boolean;
    time: number;
}

/** One hand's live input. */
export interface HandState extends HoverInfo {
    hand: Hand;
    source: WebXRInputSource | null;
    origin: Vector3;
    dir: Vector3;
    /** The UI mesh under this hand's ray, if any. */
    uiMesh: string | null;
}

/** The input layer. */
export interface InputLayer {
    readonly hands: Record<Hand, HandState>;
    /** Queue an edge (from a DOM event or the pose layer) for the next frame. */
    push(e: Edge): void;
    /** Per frame: targeting, gamepad polling; returns this frame's edges. */
    update(now: number, minAngleRad: (isHand: boolean) => number): Edge[];
    /** The press target (design section 5.2): the hover from 60 to 80 ms ago if it held, else now. */
    stabilizedTarget(hand: Hand, now: number): number;
    /** The last 10 s of input, for Flag. */
    recent(): { frames: number[][]; edges: Edge[] };
}

const RING = 32;
const FLAG_MS = 10_000;
/** Frames kept for Flag: 10 s at up to 120 Hz. */
const FLAG_FRAMES = 1200;
/** Per frame: time, then per hand origin xyz, direction xyz, hover node. */
const FLAG_STRIDE = 15;
/** xr-standard button indices: 3 stick click, 4 A or X, 5 B or Y. */
const BUTTONS: Record<Hand, [number, string][]> = {
    left: [
        [3, "stick"],
        [4, "x"],
        [5, "y"],
    ],
    right: [
        [3, "stick"],
        [4, "a"],
        [5, "b"],
    ],
};
const AXES: [number, string][] = [
    [2, "x"],
    [3, "y"],
];
const STICK_ON = 0.6;
const STICK_OFF = 0.3;
const MICRO: [number, string][] = [
    [5, "swipe-left"],
    [6, "swipe-right"],
    [7, "swipe-forward"],
    [8, "swipe-backward"],
    [9, "tap-thumb"],
];

/**
 * Create the input layer.
 * @param xr - the XR experience
 * @param graph - the graph view, for picking
 * @returns the layer
 */
export function createInput(xr: WebXRDefaultExperience, graph: GraphView): InputLayer {
    const blank = (hand: Hand): HandState => ({
        hand,
        source: null,
        origin: new Vector3(),
        dir: new Vector3(0, 0, 1),
        node: -1,
        context: "space",
        isHand: false,
        connected: false,
        uiMesh: null,
    });
    const hands: Record<Hand, HandState> = { left: blank("left"), right: blank("right") };
    const queue: Edge[] = [];
    const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);
    const tmp = new Vector3();
    const ringT: Record<Hand, Float64Array> = { left: new Float64Array(RING), right: new Float64Array(RING) };
    const ringN: Record<Hand, Int32Array> = {
        left: new Int32Array(RING).fill(-1),
        right: new Int32Array(RING).fill(-1),
    };
    const ringI: Record<Hand, number> = { left: 0, right: 0 };
    const buttonsDown = new Map<string, boolean>();
    const flagFrames = new Float64Array(FLAG_FRAMES * FLAG_STRIDE);
    let flagI = 0;
    const flagEdges: Edge[] = [];
    const order = [hands.left, hands.right];

    const sourceFor = (hand: Hand): WebXRInputSource | null =>
        xr.input.controllers.find((c) => c.inputSource.handedness === hand) ?? null;

    const pollGamepad = (h: HandState, now: number): void => {
        const gp = h.source?.inputSource.gamepad;
        if (gp && h.isHand) {
            // Quest thumb microgestures: buttons 5 to 9 of a hand's gamepad (Babylon's oculus-hand profile).
            for (const [i, detail] of MICRO) {
                const pressed = gp.buttons[i]?.pressed ?? false;
                const key = `${h.hand}.micro.${detail}`;
                if (pressed !== (buttonsDown.get(key) ?? false)) {
                    buttonsDown.set(key, pressed);
                    queue.push({ hand: h.hand, channel: "micro", detail, down: pressed, time: now });
                }
            }
        }
        if (!gp || h.isHand) {
            return;
        }
        // Guarded: a missing index is no button.
        for (const [i, detail] of BUTTONS[h.hand]) {
            const pressed = gp.buttons[i]?.pressed ?? false;
            const key = `${h.hand}.${detail}`;
            if (pressed !== (buttonsDown.get(key) ?? false)) {
                buttonsDown.set(key, pressed);
                queue.push({ hand: h.hand, channel: "button", detail, down: pressed, time: now });
            }
        }
        // Stick directions as presses, with hysteresis: x for left or right, y for up or down.
        for (const [i, detail] of AXES) {
            const v = gp.axes[i] ?? 0;
            const key = `${h.hand}.stick.${detail}`;
            const down = buttonsDown.get(key) ?? false;
            if ((!down && Math.abs(v) > STICK_ON) || (down && Math.abs(v) < STICK_OFF)) {
                buttonsDown.set(key, !down);
                queue.push({ hand: h.hand, channel: "stick", detail, down: !down, time: now });
            }
        }
    };

    const target = (h: HandState, minAngle: number, now: number): void => {
        const src = h.source;
        if (!src) {
            h.node = -1;
            h.context = "space";
            h.uiMesh = null;
            return;
        }
        src.getWorldPointerRayToRef(ray, false);
        h.origin.copyFrom(ray.origin);
        h.dir.copyFrom(ray.direction);
        const ui = xr.pointerSelection.getMeshUnderPointer(src.uniqueId);
        h.uiMesh = ui ? ui.name : null;
        if (ui) {
            h.context = "ui";
        } else {
            const best = graph.pick(h.origin, h.dir, minAngle);
            let node = best?.index ?? -1;
            // Hysteresis (rule 7): keep the current node unless the new one is clearly closer to the ray.
            if (h.node >= 0 && node !== h.node) {
                graph.nodeWorld(h.node, tmp).subtractInPlace(h.origin);
                const t = Vector3.Dot(tmp, h.dir);
                const cur = t > 0 ? Math.acos(Math.min(1, t / tmp.length())) : Math.PI;
                const keep = Math.max(minAngle, Math.atan2(graph.radiusWorld(), Math.max(t, 1e-6))) * 1.5;
                if (cur <= keep && (!best || best.angle > cur * 0.7)) {
                    ({ node } = h);
                }
            }
            h.node = node;
            if (node >= 0) {
                h.context = "node";
            } else {
                h.context = graph.inBounds(h.origin, h.dir) ? "graph" : "space";
            }
        }
        ringI[h.hand] = (ringI[h.hand] + 1) % RING;
        const i = ringI[h.hand];
        ringT[h.hand][i] = now;
        ringN[h.hand][i] = h.context === "node" ? h.node : -1;
    };

    return {
        hands,
        push: (e) => queue.push(e),
        update(now, minAngleRad) {
            const base = flagI * FLAG_STRIDE;
            flagFrames[base] = now;
            for (let k = 0; k < 2; k++) {
                const h = order[k];
                h.source = sourceFor(h.hand);
                h.connected = h.source !== null;
                h.isHand = !!h.source?.inputSource.hand;
                target(h, minAngleRad(h.isHand), now);
                pollGamepad(h, now);
                const o = base + 1 + k * 7;
                flagFrames[o] = h.origin.x;
                flagFrames[o + 1] = h.origin.y;
                flagFrames[o + 2] = h.origin.z;
                flagFrames[o + 3] = h.dir.x;
                flagFrames[o + 4] = h.dir.y;
                flagFrames[o + 5] = h.dir.z;
                flagFrames[o + 6] = h.node;
            }
            flagI = (flagI + 1) % FLAG_FRAMES;
            const out = queue.splice(0);
            flagEdges.push(...out);
            while (flagEdges.length && now - flagEdges[0].time > FLAG_MS) {
                flagEdges.shift();
            }
            return out;
        },
        stabilizedTarget(hand, now) {
            let held = -2;
            for (let k = 0; k < RING; k++) {
                const age = now - ringT[hand][k];
                if (age >= 60 && age <= 80) {
                    const n = ringN[hand][k];
                    held = held === -2 || held === n ? n : -1;
                }
            }
            if (held >= 0) {
                return held;
            }
            return hands[hand].context === "node" ? hands[hand].node : -1;
        },
        recent() {
            const now = flagFrames[((flagI + FLAG_FRAMES - 1) % FLAG_FRAMES) * FLAG_STRIDE];
            const frames: number[][] = [];
            for (let k = 0; k < FLAG_FRAMES; k++) {
                const base = ((flagI + k) % FLAG_FRAMES) * FLAG_STRIDE;
                if (flagFrames[base] > 0 && now - flagFrames[base] <= FLAG_MS) {
                    frames.push(
                        Array.from(flagFrames.subarray(base, base + FLAG_STRIDE), (v) => Math.round(v * 1000) / 1000),
                    );
                }
            }
            return { frames, edges: flagEdges.slice() };
        },
    };
}
