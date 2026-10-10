// Handling the graph (design section 9.10, plan section 3.4): grab and turn it with one hand, scale
// and turn it with two, and hold a small copy of it in the off hand. What it reuses, what it does
// not, and what we would fix or replace later: README.md beside this file.
//
// - One hand (grip on a controller, a fist with hands, or a pinch on the graph's empty space moved
//   1.5 cm): Babylon's SixDofDragBehavior in its near-drag mode, so the graph follows the hand
//   rigidly, eased by the behavior's own per-frame follow (grab.ts).
// - Two hands (the second hand's press while the first is held here): "ours" by default, the hands
//   measured in reference space, filtered with the One Euro filter, scale clamped 0.2x to 5x, scale
//   and full 3D turn about their midpoint (two-hand.ts); or Babylon's stock two-pointer drag
//   (setting "Two hands"), unclamped and turning about the vertical only.
// - The held copy (setting "Held copy"): above the off hand's palm when it faces up, or above the
//   off controller; the dominant hand's ray on it targets the full graph (held-copy.ts).
// Moving the graph is not a step in the history; each hold is logged as `handling.grab`.

import { MeshBuilder, Quaternion, type TransformNode, Vector3 } from "@babylonjs/core";
import { OneEuroFilter } from "1eurofilter";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { createGrab, type Grab, rootRotation } from "./grab";
import { createHeldCopy, type HeldCopy } from "./held-copy";
import { type Pose, startTwoHand, twoHandPose, type TwoHandStart } from "./two-hand";

const HANDS: readonly Hand[] = ["left", "right"];
const other = (h: Hand): Hand => (h === "left" ? "right" : "left");

let ctx: TechniqueContext;
let grab: Grab;
let copy: HeldCopy;
let grips: Record<Hand, TransformNode>;
/** Hands holding the graph, in the order they took hold. */
const held: Hand[] = [];
/** "ours" while two hands hold with that setting; otherwise the behavior moves the graph. */
let ours: TwoHandStart | null = null;
/** The graph's pose when the first hand took hold, for cancel and the log. */
let before: Pose | null = null;
const out: Pose = { position: new Vector3(), rotation: new Quaternion(), scale: 1 };
const filtered: Record<Hand, Vector3> = { left: new Vector3(), right: new Vector3() };
const filters: Record<Hand, OneEuroFilter[]> = { left: [], right: [] };
/** The hand the copy is the target provider of, if any. */
let providing: Hand | null = null;

const poseOf = (root: TransformNode): Pose => ({
    position: root.position.clone(),
    rotation: rootRotation(root).clone(),
    scale: root.scaling.x,
});

const raw = new Vector3();
const filter = (hand: Hand, now: number, reset: boolean): Vector3 => {
    const g = grips[hand];
    (g.parent as TransformNode | null)?.computeWorldMatrix(true);
    g.computeWorldMatrix(true).getTranslationToRef(raw);
    const [x, y, z] = filters[hand];
    if (reset) {
        for (const f of filters[hand]) {
            f.reset();
            f.setMinCutoff(ctx.settings.num("minCutoff"));
            f.setBeta(ctx.settings.num("beta"));
        }
    }
    const t = now / 1000;
    return filtered[hand].set(x.filter(raw.x, t), y.filter(raw.y, t), z.filter(raw.z, t));
};

/** Hand the graph from the behavior to the two-hand mode the setting picks. */
const startTwo = (): void => {
    const { root } = ctx.graph;
    for (const h of grab.held()) {
        grab.up(h);
    }
    if (ctx.settings.str("twoHand") === "stock") {
        ours = null;
        for (const h of held) {
            grab.down(h, "touch", grips[h], root);
        }
    } else {
        const now = performance.now();
        ours = startTwoHand(filter("left", now, true).clone(), filter("right", now, true).clone(), poseOf(root));
    }
    ctx.log("twoHand", { mode: ctx.settings.str("twoHand") });
};

/**
 * One hand holds: the behavior's near drag, from the graph's pose now.
 * @param hand - the holding hand
 */
const startOne = (hand: Hand): void => {
    for (const h of grab.held()) {
        grab.up(h);
    }
    ours = null;
    grab.down(hand, "xr-near", grips[hand], ctx.graph.root);
};

const release = (hand: Hand, cancelled: boolean): void => {
    const i = held.indexOf(hand);
    if (i < 0) {
        return;
    }
    held.splice(i, 1);
    const { root } = ctx.graph;
    if (cancelled && before) {
        // Design section 4.1: a cancelled press undoes its transform.
        for (const h of grab.held()) {
            grab.up(h);
        }
        held.length = 0;
        ours = null;
        root.position.copyFrom(before.position);
        rootRotation(root).copyFrom(before.rotation);
        root.scaling.setAll(before.scale);
        before = null;
        return;
    }
    if (held.length === 1) {
        startOne(held[0]);
        return;
    }
    for (const h of grab.held()) {
        grab.up(h);
    }
    ours = null;
    if (before) {
        const dot = Math.min(1, Math.abs(Quaternion.Dot(before.rotation, rootRotation(root))));
        const turned = (2 * Math.acos(dot) * 180) / Math.PI;
        ctx.log("grab", {
            movedCm: Math.round(Vector3.Distance(before.position, root.position) * 1000) / 10,
            turnedDeg: Math.round(turned * 10) / 10,
            scale: Math.round(root.scaling.x * 1000) / 1000,
        });
    }
    before = null;
};

const frame = (): void => {
    const { root } = ctx.graph;
    if (ours && held.length === 2) {
        const now = performance.now();
        twoHandPose(ours, filter("left", now, false), filter("right", now, false), out);
        root.position.copyFrom(out.position);
        rootRotation(root).copyFrom(out.rotation);
        root.scaling.setAll(out.scale);
    } else {
        grab.apply(grips, root);
    }
    // The copy: on the off controller always, on the off hand while its palm faces up.
    const off = other(ctx.dominant());
    const h = ctx.hover(off);
    copy.frame(ctx.settings.bool("copy") && h.connected && (!h.isHand || ctx.poses(off).palmUp), off);
    const want = copy.visible() ? ctx.dominant() : null;
    if (want !== providing) {
        if (providing) {
            ctx.target.provide(providing, null);
        }
        if (want) {
            ctx.target.provide(want, copy.pick);
        }
        providing = want;
    }
};

/** Read-only state for the dry run, installed only with `?emulate=`. */
const installHooks = (): void => {
    // A mesh, because __sandbox.aim finds targets with getMeshByName; never drawn or picked.
    const marker = MeshBuilder.CreateBox("handling-aim", { size: 0.001 }, ctx.scene);
    marker.isVisible = false;
    marker.isPickable = false;
    const api = {
        root: () => {
            const r = ctx.graph.root;
            const q = rootRotation(r);
            return { position: r.position.asArray(), rotation: q.asArray(), scale: r.scaling.asArray() };
        },
        cameraParent: () => ctx.xr()?.baseExperience.camera.parent?.name ?? null,
        grip: (hand: Hand) => {
            const g = grips[hand];
            (g.parent as TransformNode | null)?.computeWorldMatrix(true);
            g.computeWorldMatrix(true);
            return { position: g.absolutePosition.asArray(), rotation: g.absoluteRotationQuaternion.asArray() };
        },
        poses: (hand: Hand) => ({ ...ctx.poses(hand) }),
        name: (i: number) => ctx.graph.data.names[i] ?? null,
        held: () => held.slice(),
        mode: () => {
            if (held.length < 2) {
                return held.length === 1 ? "one" : "none";
            }
            return ours ? "ours" : "stock";
        },
        copy: () => ({ shown: copy.visible(), position: copy.root.getAbsolutePosition().asArray() }),
        /**
         * Where a node is drawn on the held copy.
         * @param name - the node's name
         * @returns its world position
         */
        copyNode(name: string) {
            const i = ctx.graph.data.names.indexOf(name);
            const p = ctx.graph.data.positions;
            return Vector3.TransformCoordinates(
                new Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]),
                copy.root.computeWorldMatrix(true),
            ).asArray();
        },
        /**
         * Put the "handling-aim" marker at a world point, for `__sandbox.aim(hand, "handling-aim")`.
         * @param x - meters
         * @param y - meters
         * @param z - meters
         */
        mark(x: number, y: number, z: number) {
            marker.position.set(x, y, z);
            marker.computeWorldMatrix(true);
        },
    };
    (window as unknown as { __handling: typeof api }).__handling = api;
};

export const technique: Technique = {
    id: "handling",
    name: "Handling",
    color: "#ab47bc",
    settings: [
        { key: "twoHand", label: "Two hands", kind: "choice", choices: ["ours", "stock"], default: "ours" },
        {
            key: "follow",
            label: "One-hand follow per frame (1 = rigid)",
            kind: "number",
            min: 0.1,
            max: 1,
            step: 0.1,
            default: 0.2,
        },
        {
            key: "minCutoff",
            label: "Two-hand smoothing: min cutoff (Hz)",
            kind: "number",
            min: 0.2,
            max: 5,
            step: 0.2,
            default: 1,
        },
        { key: "beta", label: "Two-hand smoothing: speed", kind: "number", min: 0, max: 40, step: 2, default: 10 },
        { key: "copy", label: "Held copy in the off hand", kind: "bool", default: false },
        { key: "copySize", label: "Held copy size (cm)", kind: "number", min: 6, max: 24, step: 2, default: 12 },
    ],
    claims: [
        { channel: "squeeze", contexts: ["node", "graph", "space"], priority: 40, note: "grab at start" },
        {
            channel: "select",
            contexts: ["graph"],
            priority: 40,
            decide: (g) => (g.movedM >= 0.015 ? "take" : "wait"),
            note: "take after 1.5 cm of movement",
        },
        { channel: "two-hand", contexts: "any", priority: 40, note: "when the first press is handling's" },
    ],
    smoke: { input: "squeeze", hand: "dominant", aim: "space" },
    prepare(c) {
        ctx = c;
        grab = createGrab(c.scene.getEngine());
        grab.behavior.dragDeltaRatio = c.settings.num("follow");
        grips = { left: c.anchor("hand-left"), right: c.anchor("hand-right") };
        for (const h of HANDS) {
            filters[h] = [0, 1, 2].map(
                () => new OneEuroFilter(72, c.settings.num("minCutoff"), c.settings.num("beta")),
            );
        }
        copy = createHeldCopy(c);
        c.settings.onChange((key) => {
            if (key === "follow") {
                grab.behavior.dragDeltaRatio = c.settings.num("follow");
            }
        });
        c.onFrame(frame);
        if (/[?&]emulate=/.test(location.search)) {
            installHooks();
        }
    },
    activate() {
        // Nothing to show until a hand holds the graph or the copy is wanted.
    },
    deactivate() {
        copy.frame(false, "left");
        if (providing) {
            ctx.target.provide(providing, null);
            providing = null;
        }
    },
    onPress(_p, hand) {
        if (held.includes(hand)) {
            return undefined;
        }
        held.push(hand);
        if (held.length === 1) {
            before = poseOf(ctx.graph.root);
            startOne(hand);
        } else {
            startTwo();
        }
        return {
            end: () => {
                release(hand, false);
            },
            cancel: () => {
                release(hand, true);
            },
        };
    },
};
