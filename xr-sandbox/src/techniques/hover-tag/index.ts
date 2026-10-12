// Hover name tag (design section 9.5, plan section 3.1): pointing at a node shows "Strozzi 0.088,
// #3" -- its label, the value of the result the graph shows (degree before any is shown) and its
// rank -- before any press, one tag per hand, at a constant angular size.
//
// Builds on: the framework's targeting layer (`ctx.hover`, which already has hysteresis between
// nodes) and its billboard chip (`ctx.ui.chip`: a plane with its own small DynamicTexture, drawn
// in rendering group 1 so it never z-fights the spheres, redrawn only when its text changes).
// Gaps (README.md beside this file): no MSDF text (`@babylonjs/addons` TextRenderer is not a
// dependency and the framework has no label-renderer toggle yet); the tag sits below the node and
// can cover a neighbor's label in a crowded graph; ties in rank are broken by node order.

import { Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";
import { TagTarget, tagText } from "./tag";

/** The chip's narrowest width at scale 1, meters. */
const BASE_W = 0.06;
const HANDS: Hand[] = ["left", "right"];

interface HandTag {
    chip: Chip;
    target: TagTarget;
    text: string;
    redraws: number;
    visible: boolean;
}

let ctx: TechniqueContext;
const tags = {} as Record<Hand, HandTag>;
let transient = false;
// What the text was drawn from; the text is rebuilt only when one of these changes.
let drawnColorBy: string | null = null;
let drawnShown: ReadonlySet<string> | null = null;
let drawnShownSize = -1;
let textDirty = false;
const node = new Vector3();
const toCam = new Vector3();

const camera = (): Vector3 =>
    ctx.xr()?.baseExperience.camera.globalPosition ?? ctx.scene.activeCamera?.globalPosition ?? Vector3.ZeroReadOnly;

// Whether every input is a transient pointer, which has no hover (design section 5.2).
const allTransient = (): boolean => {
    const inputs = ctx.xr()?.input.controllers ?? [];
    return inputs.length > 0 && inputs.every((c) => (c.inputSource.targetRayMode as string) === "transient-pointer");
};

const redraw = (t: HandTag): void => {
    const text = tagText(ctx.graph.data, ctx.state, t.target.shown, ctx.settings.str("value"));
    if (text !== t.text) {
        t.text = text;
        t.redraws++;
        t.chip.set(text, "#20283a");
    }
};

const hide = (t: HandTag): void => {
    t.target.reset();
    t.chip.hide();
    t.visible = false;
};

// Put the tag under its node, toward the viewer, its capitals `size` degrees tall from the head.
const place = (t: HandTag, cam: Vector3): void => {
    const g = ctx.graph;
    g.nodeWorld(t.target.shown, node);
    cam.subtractToRef(node, toCam);
    const d = toCam.length();
    const r = g.radiusWorld();
    const m = t.chip.mesh;
    const capAt = (dist: number): number => 2 * dist * Math.tan((ctx.settings.num("size") * Math.PI) / 360);
    toCam.scaleInPlace(r / Math.max(d, 1e-6));
    m.position.copyFrom(node).addInPlace(toCam);
    m.position.y -= r * 1.5 + ((capAt(d) / t.chip.capM) * t.chip.heightM) / 2;
    // Size from the tag's own distance, so its angular size is exact where it is drawn.
    m.scaling.setAll(capAt(Vector3.Distance(cam, m.position)) / t.chip.capM);
};

// Notice a change of input kind (transient pointers have no hover) and of what the tag text shows.
const noteChanges = (): void => {
    const isTransient = allTransient();
    if (isTransient !== transient) {
        transient = isTransient;
        ctx.log("hover", { available: !transient });
    }
    const st = ctx.state;
    if (st.colorBy !== drawnColorBy || st.shown !== drawnShown || st.shown.size !== drawnShownSize) {
        drawnColorBy = st.colorBy;
        drawnShown = st.shown;
        drawnShownSize = st.shown.size;
        textDirty = true;
    }
};

// Show or hide a tag's chip when that changes.
const setShown = (t: HandTag, show: boolean): void => {
    if (show === t.visible) {
        return;
    }
    t.visible = show;
    if (show) {
        t.chip.show();
    } else {
        t.chip.hide();
    }
};

// Show, hide, redraw and place one hand's tag.
const updateTag = (hand: Hand, now: number, cam: Vector3): void => {
    const t = tags[hand];
    const h = ctx.hover(hand);
    if (transient || !h.connected) {
        if (t.visible || t.target.shown >= 0) {
            hide(t);
        }
        return;
    }
    const target = h.context === "node" ? h.node : -1;
    const changed = t.target.update(target, now, ctx.settings.num("dwellMs"), ctx.settings.num("lingerMs"));
    // Both hands on one node: one tag, the dominant hand's.
    const other = tags[hand === "left" ? "right" : "left"];
    const dup = hand !== ctx.dominant() && other.target.shown === t.target.shown;
    const show = t.target.shown >= 0 && !dup;
    if (show) {
        if (changed || textDirty || !t.visible) {
            redraw(t);
        }
        place(t, cam);
    }
    setShown(t, show);
    if (changed) {
        ctx.log("target", { hand, node: t.target.shown >= 0 ? ctx.graph.data.names[t.target.shown] : null });
    }
};

const frame = (): void => {
    const now = performance.now();
    noteChanges();
    const cam = camera();
    for (const hand of HANDS) {
        updateTag(hand, now, cam);
    }
    textDirty = false;
};

/** Read-only state and arrangement for the dry run, installed only with `?emulate=`. */
const installHooks = (): void => {
    const saved = new Vector3();
    let moved = false;
    const api = {
        tags: () =>
            Object.fromEntries(
                HANDS.map((h) => {
                    const t = tags[h];
                    return [
                        h,
                        {
                            node: t.target.shown >= 0 ? ctx.graph.data.names[t.target.shown] : null,
                            text: t.text,
                            visible: t.visible && t.chip.mesh.isEnabled(),
                            redraws: t.redraws,
                            changes: t.target.changes.slice(),
                        },
                    ];
                }),
            ),
        // The tag's capital letters' angular height and the one the setting asks for, in degrees.
        angular(hand: Hand) {
            const m = tags[hand].chip.mesh;
            m.computeWorldMatrix(true);
            const h = tags[hand].chip.capM * m.scaling.y;
            const d = Vector3.Distance(camera(), m.getAbsolutePosition());
            const deg = (a: number): number => (a * 180) / Math.PI;
            return {
                deg: deg(2 * Math.atan(h / 2 / d)),
                wantDeg: ctx.settings.num("size"),
                distance: d,
            };
        },
        // Move the graph (arrange only) so the named node is `m` meters from the head.
        nodeAt(name: string, m: number) {
            const i = ctx.graph.data.names.indexOf(name);
            const { root } = ctx.graph;
            if (!moved) {
                saved.copyFrom(root.position);
                moved = true;
            }
            const cam = camera();
            ctx.graph.nodeWorld(i, node);
            node.subtractToRef(cam, toCam);
            const d = toCam.length();
            root.position.addInPlace(toCam.scale((m - d) / d));
            root.computeWorldMatrix(true);
        },
        restoreGraph() {
            if (moved) {
                ctx.graph.root.position.copyFrom(saved);
                ctx.graph.root.computeWorldMatrix(true);
                moved = false;
            }
        },
        // Make every input report a transient pointer (the Galaxy XR case), or undo it.
        transient(on: boolean) {
            for (const c of ctx.xr()?.input.controllers ?? []) {
                const s = c.inputSource as unknown as Record<string, unknown>;
                if (on) {
                    Object.defineProperty(s, "targetRayMode", { value: "transient-pointer", configurable: true });
                } else {
                    delete s.targetRayMode;
                }
            }
        },
        // Every text line drawn on a GUI texture whose text matches.
        guiTexts(match: string) {
            const out: string[] = [];
            for (const tex of ctx.scene.textures) {
                const adt = tex as unknown as { getDescendants?: () => { text?: unknown }[] };
                for (const c of adt.getDescendants?.() ?? []) {
                    if (typeof c.text === "string" && c.text.includes(match)) {
                        out.push(c.text);
                    }
                }
            }
            return out;
        },
    };
    (globalThis as unknown as { __hoverTag: typeof api }).__hoverTag = api;
};

export const technique: Technique = {
    id: "hover-tag",
    name: "Hover name tag",
    color: "#c3e88d",
    needs: ["hover"],
    settings: [
        {
            key: "value",
            label: "Value shown",
            kind: "choice",
            choices: ["current", "pagerank", "degree", "betweenness"],
            default: "current",
        },
        { key: "size", label: "Letter height (deg)", kind: "number", min: 1, max: 2.5, step: 0.1, default: 1.2 },
        { key: "dwellMs", label: "Dwell before showing (ms)", kind: "number", min: 0, max: 600, step: 50, default: 0 },
        { key: "lingerMs", label: "Keep after leaving (ms)", kind: "number", min: 0, max: 800, step: 50, default: 300 },
    ],
    claims: [],
    prepare(c) {
        ctx = c;
        for (const hand of HANDS) {
            const chip = c.ui.chip(`tag-${hand}`, BASE_W, "hand", true);
            tags[hand] = { chip, target: new TagTarget(), text: "", redraws: 0, visible: false };
        }
        c.settings.onChange((key) => {
            if (key === "value") {
                textDirty = true;
            }
        });
        c.onFrame(frame);
        if (/[?&]emulate=/.test(location.search)) {
            installHooks();
        }
    },
    activate() {
        textDirty = true;
    },
    deactivate() {
        for (const hand of HANDS) {
            hide(tags[hand]);
        }
    },
};
