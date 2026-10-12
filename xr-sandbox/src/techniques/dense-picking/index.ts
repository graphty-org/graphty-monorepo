// Dense picking (design section 9.9, plan section 3.12): two aids for picking one node in a crowded
// graph, each its own setting so they can be compared alone or together.
//
// - Hint tags: hold the dominant ray on the graph briefly and two-letter tags latch over the nodes in
//   a cone around it (or over the dots on the slab when the ray is on the plate). Type a tag on the
//   mini keyboard above the graph and that node is selected. Tag strings: Vimium's hintStrings
//   (MIT, copied with its license in hint-strings.ts), voice-safe alphabet by default.
// - The slab: a plate held in the off hand, pushed through the graph (after Slicing-Volume, IEEE VR
//   2020, no code). Nodes within half its thickness are drawn flat on the plate, the rest dim; the
//   dominant ray on the plate targets the nearest dot (a target provider), so the framework's tap
//   selects that node in the full graph. Off-hand grip (or fist) pins the plate in place; the button
//   under the plate pins it or takes it back. It is also offered to other techniques as the "slab" tool.
//
// Gaps (README.md here has the full list): RayCursor, LassoGrid, SQUAD, Flower Ray and VoiceRay are
// not built; tags latch on a dwell and do not follow the ray after that; saying a tag needs the
// voice technique; the plate is not smoothed against hand tremor.

import { Ray, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import { isVisible } from "../../core/state";
import type { TargetProvider, Technique, TechniqueContext } from "../../framework/technique";
import { coneMembers, HOME_ROW, VOICE_SAFE } from "./hint-strings";
import { createHints, type Hints } from "./hints";
import { createMiniKeyboard, type MiniKeyboard } from "./mini-keyboard";
import { createSlab, type Slab } from "./slab";

const KB_W = 0.3;
const KB_H = 0.16;
/** The graph is re-dimmed at most this often while the slice changes (each re-dim rebuilds its buffers). */
const DIM_EVERY_MS = 100;

let ctx: TechniqueContext;
let hints: Hints;
let kb: MiniKeyboard;
let slab: Slab;
let holdHand: Hand | null = null;
const provided = new Set<Hand>();
const rays: Record<Hand, Ray> = {
    left: new Ray(Vector3.Zero(), Vector3.Forward(), 1),
    right: new Ray(Vector3.Zero(), Vector3.Forward(), 1),
};
let world = new Float32Array(0);
let worldStamp = -1;
let candidate = { anchor: -1, since: 0 };
let dimDue = false;
let dimAt = 0;
let dimCount = 0;
let lastLatch: Record<string, unknown> | null = null;
const tmp = new Vector3();
const center = new Vector3();

const other = (h: Hand): Hand => (h === "left" ? "right" : "left");
const visible = (i: number): boolean => isVisible(ctx.state, i);
const alphabet = (): string => (ctx.settings.str("alphabet") === "home-row" ? HOME_ROW : VOICE_SAFE);
const head = (): Vector3 =>
    ctx.xr()?.baseExperience.camera.globalPosition ?? ctx.scene.activeCamera?.globalPosition ?? Vector3.ZeroReadOnly;

/**
 * The hand's pointer ray, the same ray the targeting layer uses.
 * @param hand - which hand
 * @returns the ray, or null when the hand is not tracked
 */
const rayOf = (hand: Hand): Ray | null => {
    const src = ctx.xr()?.input.controllers.find((c) => c.inputSource.handedness === hand);
    if (!src) {
        return null;
    }
    src.getWorldPointerRayToRef(rays[hand], false);
    return rays[hand];
};

/** Node world positions, refreshed only when the graph root moved. */
const refreshWorld = (): void => {
    const { data, root } = ctx.graph;
    const m = root.computeWorldMatrix(false);
    if (m.updateFlag === worldStamp && world.length === data.nodeCount * 3) {
        return;
    }
    worldStamp = m.updateFlag;
    world = new Float32Array(data.nodeCount * 3);
    for (let i = 0; i < data.nodeCount; i++) {
        tmp.set(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]);
        Vector3.TransformCoordinatesToRef(tmp, m, tmp);
        world[i * 3] = tmp.x;
        world[i * 3 + 1] = tmp.y;
        world[i * 3 + 2] = tmp.z;
    }
};

/** One provider per hand, so each keeps its own hysteresis. */
const providers: Record<Hand, TargetProvider> = {
    left: (origin, dir) => slab.hit(origin, dir, ctx.hover("left").node),
    right: (origin, dir) => slab.hit(origin, dir, ctx.hover("right").node),
};

const provide = (hands: Hand[]): void => {
    for (const h of ["left", "right"] as const) {
        if (hands.includes(h)) {
            ctx.target.provide(h, providers[h]);
            provided.add(h);
        } else if (provided.delete(h)) {
            ctx.target.provide(h, null);
        }
    }
};

const setDim = (keep: Set<number> | null): void => {
    dimCount = keep ? ctx.graph.data.nodeCount - keep.size : 0;
    ctx.graph.setDim(keep);
};

/**
 * Put the slab in a hand: it follows that hand's ray; the other hand picks on it.
 * @param hand - the hand that holds it
 */
const take = (hand: Hand): void => {
    if (!ctx.settings.bool("slab")) {
        return;
    }
    if (holdHand && holdHand !== hand) {
        ctx.tools.hold(holdHand, null);
    }
    holdHand = hand;
    slab.setPinned(false);
    ctx.tools.hold(hand, "slab");
    provide([other(hand)]);
    slab.show();
    ctx.log("slab", { event: "take", hand });
};

/** Leave the slab where it is: both hands are free, and both can pick on it. */
const pin = (): void => {
    if (holdHand) {
        ctx.tools.hold(holdHand, null);
    }
    holdHand = null;
    slab.setPinned(true);
    provide(["left", "right"]);
    ctx.log("slab", { event: "pin" });
};

const stow = (): void => {
    if (holdHand) {
        ctx.tools.hold(holdHand, null);
    }
    holdHand = null;
    provide([]);
    slab.hide();
    if (dimCount > 0) {
        setDim(null);
    }
    dimDue = false;
};

const hideHints = (): void => {
    hints.clear();
    kb.panel.hide();
    candidate = { anchor: -1, since: 0 };
};

const refreshKeys = (): void => {
    if (hints.latched) {
        kb.setKeys(hints.next(), hints.typed);
        kb.panel.show();
    } else {
        kb.panel.hide();
    }
};

const onKey = (key: string): void => {
    const tag = hints.typed + key;
    const mode = hints.latched?.mode;
    const node = hints.type(key);
    if (node >= 0) {
        const dom = ctx.dominant();
        ctx.commands.run("select", { ids: [node] }, dom);
        ctx.log("pick", { tag, node: ctx.graph.data.names[node], mode, hand: dom });
        candidate = { anchor: -1, since: 0 };
    }
    refreshKeys();
};

/**
 * The nodes the dominant ray would tag now, nearest the ray first, and on what.
 * @param r - the dominant ray
 * @returns the mode and the nodes
 */
const candidates = (r: Ray): { mode: "cone" | "slab"; nodes: number[] } => {
    const rayLike = { origin: r.origin.asArray(), dir: r.direction.asArray() };
    const rad = (ctx.settings.num("coneDeg") * Math.PI) / 180;
    if (ctx.settings.bool("slab") && slab.hit(r.origin, r.direction)) {
        // The same cone, over the dots on the plate.
        const pts = new Float32Array(slab.slice.length * 3);
        slab.slice.forEach((i, k) => {
            slab.dotWorld(i, tmp)?.toArray(pts, k * 3);
        });
        return { mode: "slab", nodes: coneMembers(pts, rayLike, rad).map((k) => slab.slice[k]) };
    }
    return { mode: "cone", nodes: coneMembers(world, rayLike, rad, visible) };
};

// The slab: follow the holding hand, cut the slice, dim the rest (throttled), light the hovered dot.
const updateSlab = (now: number, dom: Hand): void => {
    const r = holdHand ? rayOf(holdHand) : null;
    if (r) {
        r.origin.addToRef(r.direction.scale(ctx.settings.num("reachCm") / 100), center);
        slab.pose(center, r.direction, ctx.settings.num("sizeCm") / 100);
    }
    if (slab.cut(world, ctx.settings.num("thicknessCm") / 200, visible)) {
        dimDue = true;
    }
    if (dimDue && now - dimAt >= DIM_EVERY_MS) {
        dimDue = false;
        dimAt = now;
        setDim(slab.slice.length > 0 ? new Set(slab.slice) : null);
    }
    const h = ctx.hover(dom).node;
    slab.highlight(h >= 0 && slab.slice.includes(h) ? h : -1);
};

// Hint tags: latch over the cone (or the slab's dots) once the ray has dwelt on one anchor node.
const updateLatch = (now: number, dom: Hand): void => {
    const hov = ctx.hover(dom);
    const r = hov.context === "ui" || hints.typed ? null : rayOf(dom);
    if (!r) {
        return;
    }
    const c = candidates(r);
    const anchor = c.nodes[0] ?? -1;
    if (anchor !== candidate.anchor) {
        candidate = { anchor, since: now };
        return;
    }
    if (anchor < 0 || hints.latched?.nodes.includes(anchor) || now - candidate.since < ctx.settings.num("dwellMs")) {
        return;
    }
    const l = hints.latch(c.mode, c.nodes, alphabet());
    const { names } = ctx.graph.data;
    lastLatch = {
        mode: l.mode,
        count: l.tags.length,
        coneDeg: ctx.settings.num("coneDeg"),
        origin: r.origin.asArray().map((v) => Math.round(v * 1e5) / 1e5),
        dir: r.direction.asArray().map((v) => Math.round(v * 1e6) / 1e6),
        tags: Object.fromEntries(l.tags.map((t, k) => [t, names[l.nodes[k]]])),
    };
    ctx.log("latch", lastLatch);
    refreshKeys();
};

const frame = (): void => {
    const now = performance.now();
    const dom = ctx.dominant();
    refreshWorld();

    if (ctx.settings.bool("slab") && (holdHand || slab.pinned)) {
        updateSlab(now, dom);
    }

    if (!ctx.settings.bool("hints")) {
        return;
    }
    updateLatch(now, dom);
    const mode = hints.latched?.mode;
    hints.place(
        (i, out) =>
            mode === "slab" ? slab.dotWorld(i, out) : out.set(world[i * 3], world[i * 3 + 1], world[i * 3 + 2]),
        head(),
        ctx.settings.num("tagDeg"),
    );
    if (kb.panel.visible) {
        // Above the graph, world-fixed: on the off hand it shook with the hand, and a near-pickable
        // panel that close to a tracked hand took that hand's pinch away from its own ray.
        ctx.anchor("graph-top")
            .getAbsolutePosition()
            .addToRef(new Vector3(0, 0.1, 0), tmp);
        if (!kb.panel.mesh.position.equals(tmp)) {
            kb.panel.mesh.position.copyFrom(tmp);
        }
    }
};

/** Read-only state for the dry run's checks (dryrun/checks/dense-picking.mjs). */
const debug = {
    /**
     * What the module shows now.
     * @returns tags, typed letters, keyboard and slab state
     */
    state: () => {
        const { names } = ctx.graph.data;
        return {
            latched: hints.latched
                ? {
                      mode: hints.latched.mode,
                      tags: Object.fromEntries(
                          hints.latched.tags.map((t, k) => [t, names[hints.latched?.nodes[k] ?? 0]]),
                      ),
                  }
                : null,
            lastLatch,
            typed: hints.typed,
            keyboard: kb.panel.visible,
            slab: {
                shown: slab.plate.isEnabled(),
                holdHand,
                pinned: slab.pinned,
                slice: slab.slice.map((i) => names[i]),
                dimmed: dimCount,
                center: slab.plate.position.asArray(),
                normal: slab.plate.getDirection(Vector3.Forward()).asArray(),
                size: slab.plate.scaling.x,
                halfThickness: ctx.settings.num("thicknessCm") / 200,
            },
        };
    },
    /**
     * A hand's pointer ray, as this module and the targeting layer read it.
     * @param hand - which hand
     * @returns origin and direction, or null
     */
    ray: (hand: Hand) => {
        const r = rayOf(hand);
        return r ? { origin: r.origin.asArray(), dir: r.direction.asArray() } : null;
    },
    keyWorld: (key: string) => kb.keyWorld(key)?.asArray() ?? null,
    dotWorld: (name: string) => slab.dotWorld(ctx.graph.data.names.indexOf(name), new Vector3())?.asArray() ?? null,
    /**
     * Every node's world position, from the graph view (not this module's own copy).
     * @returns x y z by node name
     */
    positions: () =>
        Object.fromEntries(ctx.graph.data.names.map((n, i) => [n, ctx.graph.nodeWorld(i, new Vector3()).asArray()])),
};

export const technique: Technique = {
    id: "dense-picking",
    name: "Dense picking",
    color: "#b2ccd6",
    settings: [
        { key: "hints", label: "Hint tags", kind: "bool", default: true },
        { key: "slab", label: "Slab", kind: "bool", default: true },
        { key: "coneDeg", label: "Hint cone half angle (deg)", kind: "number", min: 1, max: 10, step: 0.5, default: 3 },
        { key: "tagDeg", label: "Tag letter height (deg)", kind: "number", min: 1, max: 2.5, step: 0.1, default: 1.2 },
        { key: "dwellMs", label: "Hold to latch tags (ms)", kind: "number", min: 0, max: 1000, step: 50, default: 250 },
        {
            key: "alphabet",
            label: "Tag letters",
            kind: "choice",
            choices: ["voice-safe", "home-row"],
            default: "voice-safe",
        },
        { key: "thicknessCm", label: "Slab thickness (cm)", kind: "number", min: 1, max: 10, step: 0.5, default: 3 },
        { key: "sizeCm", label: "Slab size (cm)", kind: "number", min: 15, max: 50, step: 5, default: 30 },
        { key: "reachCm", label: "Slab reach from hand (cm)", kind: "number", min: 10, max: 60, step: 5, default: 30 },
    ],
    claims: [
        { channel: "select", detail: "dense-picking", contexts: ["tool"], priority: 90, note: "take at start" },
        {
            channel: "squeeze",
            detail: "dense-picking",
            contexts: ["tool"],
            priority: 90,
            note: "pins the slab where it is",
        },
    ],
    prepare(c) {
        ctx = c;
        hints = createHints(c.scene);
        kb = createMiniKeyboard(c.ui.panel("keys", KB_W, KB_H, 600, { read: "graph", fit: true }), onKey);
        slab = createSlab(
            c.scene,
            c.graph.data.nodeCount,
            () => c.graph.radiusWorld() * 1.2,
            c.ui.panel("pin", 0.16, 0.035, 400, { read: "graph", fit: true }),
            () => {
                if (slab.pinned) {
                    take(other(ctx.dominant()));
                } else {
                    pin();
                }
            },
        );
        c.tools.offer({ id: "slab", take });
        c.settings.onChange((key) => {
            if (key === "hints" && !c.settings.bool("hints")) {
                hideHints();
            } else if (key === "slab") {
                if (c.settings.bool("slab")) {
                    take(other(c.dominant()));
                } else {
                    stow();
                }
            }
        });
        c.onFrame(frame);
        (globalThis as unknown as { __densePicking: typeof debug }).__densePicking = debug;
    },
    activate() {
        take(other(ctx.dominant()));
    },
    deactivate() {
        stow();
        hideHints();
    },
    onPress(p) {
        if (p.press.channel === "squeeze") {
            pin();
        }
        // A select from the hand holding the slab is taken and does nothing, so it never also acts on
        // the graph behind the plate.
        return undefined;
    },
};
