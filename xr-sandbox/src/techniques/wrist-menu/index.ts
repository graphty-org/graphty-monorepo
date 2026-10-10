// Wrist menu (design section 9.12, plan section 3.3): global actions on the off hand -- Undo (naming
// its step), Redo, Save, Settings, Steps, Recenter and Flag. With hands, Babylon's
// HandConstraintBehavior (the placement half of GUI's HandMenu, playground #24DLJ4#7) keeps the
// panel beside the off hand, and it shows when that palm faces sideways across the body and the
// viewer looks at it; palm up and palm toward the face hide it, because palm toward the face is
// Quest's own system-menu gesture. With controllers, the same panel rides on the off grip
// (controller-variant.ts). The other hand presses it by poke or ray; a press made by the menu hand
// itself is ignored. It claims no input: a press on UI is never arbitrated (design section 5.8).

import {
    HandConstraintBehavior,
    HandConstraintVisibility,
    HandConstraintZone,
    Matrix,
    type Mesh,
    type Observer,
    type Scene,
    TransformNode,
    Vector3,
    WebXRFeatureName,
    WebXRHandJoint,
    type WebXRNearInteraction,
} from "@babylonjs/core";
import { type Button, StackPanel } from "@babylonjs/gui";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { guiButton, type Panel } from "../../scene/ui";
import { handTracking } from "../../scene/xr";
import { type ControllerVariant, createControllerVariant } from "./controller-variant";

const ZONES: Record<string, HandConstraintZone> = {
    ulnar: HandConstraintZone.ULNAR_SIDE,
    radial: HandConstraintZone.RADIAL_SIDE,
    "below-wrist": HandConstraintZone.BELOW_WRIST,
    "above-fingertips": HandConstraintZone.ABOVE_FINGER_TIPS,
};
/** Palm sideways: the palm normal across the body (dot with the head's right) and level. [show, hide]. */
const ACROSS: [number, number] = [0.6, 0.4];
const LEVEL: [number, number] = [0.5, 0.7];
const WIDTH_M = 0.18;
const HEIGHT_M = 0.16;
const PX = 512;
const ROW_PX = 100;

type Mode = "hand" | "controller" | null;

let ctx: TechniqueContext;
let panel: Panel;
/** Hand mode: `holder` is enabled while the pose holds; `follow` is placed by the behavior. */
let holder: TransformNode;
let follow: TransformNode;
let behavior: HandConstraintBehavior | null = null;
let variant: ControllerVariant;
let undoButton: Button;
let undoText = "";
let mode: Mode = null;
let want = false;
let visible = false;
/** When `visible` last changed (performance.now), for the dry run's latency check. */
let changedAt = 0;
let frameCount = 0;
let changedFrame = 0;
const palm = { across: 0, level: 0 };
const w = new Vector3();
const a = new Vector3();
const b = new Vector3();
const n = new Vector3();
const right = new Vector3();

const offHand = (): Hand => (ctx.dominant() === "left" ? "right" : "left");

/**
 * Which hand made a GUI press (by ray or by poke), from the pointer id Babylon gave the event.
 * @param pointerId - the event's pointer id
 * @returns the hand, or null when it is not an XR input (a desktop mouse)
 */
const handOfPointer = (pointerId: number | undefined): Hand | null => {
    const xr = ctx.xr();
    if (!xr || pointerId === undefined) {
        return null;
    }
    const near = xr.baseExperience.featuresManager.getEnabledFeature(
        WebXRFeatureName.NEAR_INTERACTION,
    ) as WebXRNearInteraction | null;
    const source =
        xr.pointerSelection.getXRControllerByPointerId(pointerId) ?? near?.getXRControllerByPointerId(pointerId);
    const h = source?.inputSource.handedness;
    return h === "left" || h === "right" ? h : null;
};

const item = (name: string, text: string, act: (hand: Hand) => void): Button => {
    const button = guiButton(`wrist-menu-${name}`, text, () => undefined, ROW_PX - 4, name === "undo" ? 492 : 244);
    button.onPointerClickObservable.add((_v, state) => {
        const id = (state.userInfo as { event?: { pointerId?: number } } | undefined)?.event?.pointerId;
        const hand = handOfPointer(id);
        if (hand === offHand()) {
            ctx.log("ignored", { item: name, hand, why: "pressed by the menu hand" });
            return;
        }
        const by = hand ?? ctx.dominant();
        ctx.log("item", { item: name, hand: by, mode });
        act(by);
    });
    return button;
};

const row = (...buttons: Button[]): StackPanel => {
    const r = new StackPanel();
    r.isVertical = false;
    r.height = `${ROW_PX}px`;
    for (const x of buttons) {
        r.addControl(x);
    }
    return r;
};

const applySettings = (): void => {
    if (!behavior) {
        return;
    }
    behavior.targetZone = ZONES[ctx.settings.str("placement")] ?? HandConstraintZone.ULNAR_SIDE;
    behavior.targetOffset = ctx.settings.num("offsetCm") / 100;
    behavior.lerpTime = ctx.settings.num("followLagMs");
    behavior.gazeProximityRadius = ctx.settings.num("gazeRadiusCm") / 100;
    behavior.handConstraintVisibility = ctx.settings.bool("gaze")
        ? HandConstraintVisibility.GAZE_FOCUS
        : HandConstraintVisibility.ALWAYS_VISIBLE;
};

/**
 * Recompute the three joints the behavior reads, just before it reads them. The behavior reads each
 * joint's cached `absolutePosition`, and the cache was filled earlier in the frame by the framework's
 * pose layer, before Babylon's hand tracking moved the joints, so without this the menu trails the
 * hand by one frame (6.5 mm in the dry run's animate_to check).
 */
const refreshJoints = (): void => {
    const xr = ctx.xr();
    const joints = xr ? handTracking(xr)?.getHandByHandedness(offHand()) : null;
    if (joints) {
        for (const j of [
            WebXRHandJoint.WRIST,
            WebXRHandJoint.MIDDLE_FINGER_METACARPAL,
            WebXRHandJoint.PINKY_FINGER_METACARPAL,
        ]) {
            joints.getJointMesh(j).computeWorldMatrix(true);
        }
    }
};
let refresher: Observer<Scene> | null = null;

/** Link the behavior once the XR experience exists (techniques are prepared before it does). */
const attachBehavior = (): void => {
    const xr = ctx.xr();
    if (!xr) {
        return;
    }
    if (!behavior) {
        behavior = new HandConstraintBehavior();
        behavior.linkToXRExperience(xr.baseExperience);
    }
    if (!behavior.attachedNode) {
        // First in the before-render list, so it runs before the behavior's own observer.
        refresher = ctx.scene.onBeforeRenderObservable.add(refreshJoints, undefined, true);
        behavior.attach(follow);
        applySettings();
    }
};

const detachBehavior = (): void => {
    if (behavior?.attachedNode) {
        behavior.detach();
    }
    ctx.scene.onBeforeRenderObservable.remove(refresher);
    refresher = null;
};

/**
 * Whether the off palm faces sideways across the body (not up, not at the face), with hysteresis.
 * @param hand - the off hand
 * @param shown - whether the menu shows now
 * @returns whether the pose holds
 */
const palmSideways = (hand: Hand, shown: boolean): boolean => {
    const xr = ctx.xr();
    const joints = xr ? handTracking(xr)?.getHandByHandedness(hand) : null;
    if (!xr || !joints) {
        return false;
    }
    const at = (joint: WebXRHandJoint, out: Vector3): Vector3 =>
        out.copyFrom(joints.getJointMesh(joint).getAbsolutePosition());
    // The palm normal as the pose layer computes it (scene/poses.ts), mirrored for the left hand.
    at(WebXRHandJoint.WRIST, w);
    at(WebXRHandJoint.INDEX_FINGER_METACARPAL, a).subtractInPlace(w);
    at(WebXRHandJoint.PINKY_FINGER_METACARPAL, b).subtractInPlace(w);
    Vector3.CrossToRef(hand === "right" ? b : a, hand === "right" ? a : b, n);
    n.normalize();
    xr.baseExperience.camera.getDirectionToRef(Vector3.RightReadOnly, right);
    right.y = 0;
    right.normalize();
    palm.across = Vector3.Dot(n, right) * (hand === "left" ? 1 : -1);
    palm.level = Math.abs(n.y);
    const p = ctx.poses(hand);
    if (p.palmUp || p.palmFace) {
        return false;
    }
    return shown ? palm.across > ACROSS[1] && palm.level < LEVEL[1] : palm.across > ACROSS[0] && palm.level < LEVEL[0];
};

const setMode = (next: Mode): void => {
    if (next === mode) {
        return;
    }
    mode = next;
    panel.mesh.parent = mode === "controller" ? variant.node : follow;
    holder.setEnabled(false);
    variant.node.setEnabled(false);
    want = false;
    ctx.log("mode", { mode });
};

const frame = (): void => {
    frameCount++;
    attachBehavior();
    const hand = offHand();
    const h = ctx.hover(hand);
    let next: Mode = null;
    if (h.connected) {
        next = h.isHand ? "hand" : "controller";
    }
    setMode(next);
    if (behavior) {
        behavior.handedness = hand;
    }
    if (mode === "hand") {
        want = palmSideways(hand, want);
        holder.setEnabled(want);
    } else if (mode === "controller") {
        want = variant.update(hand, want);
        variant.node.setEnabled(want);
    } else {
        want = false;
    }
    // Hand mode also needs the behavior's gaze test, decided at the last render.
    const now = want && (mode === "controller" || follow.isEnabled(false));
    if (now !== visible) {
        visible = now;
        changedAt = performance.now();
        changedFrame = frameCount;
        ctx.log(visible ? "shown" : "hidden", {
            mode,
            hand,
            across: Math.round(palm.across * 100) / 100,
            level: Math.round(palm.level * 100) / 100,
            facing: Math.round(variant.facing * 100) / 100,
        });
    }
    const label = ctx.commands.undoLabel() ?? "Undo";
    if (label !== undoText) {
        undoText = label;
        if (undoButton.textBlock) {
            undoButton.textBlock.text = label;
        }
    }
};

/** Read-only probes for the dry run (only with `?emulate=`), in the spirit of `window.__sandbox`. */
const installDebug = (): void => {
    const toArr = (v: Vector3): number[] => [v.x, v.y, v.z];
    const api = {
        state: () => ({
            mode,
            want,
            visible,
            ...palm,
            facing: variant.facing,
            undo: undoText,
            changedAt,
            frame: frameCount,
            changedFrame,
            poses: { ...ctx.poses(offHand()) },
        }),
        /**
         * A button's center in world space, and the direction toward the viewer.
         * @param name - undo, redo, save, settings, steps, recenter or flag
         * @returns the point and the normal
         */
        button(name: string) {
            const c = panel.adt.getControlByName(`wrist-menu-${name}`);
            if (!c) {
                throw new Error(`no wrist menu button ${name}`);
            }
            const size = panel.adt.getSize();
            const local = new Vector3(
                (c.centerX / size.width - 0.5) * WIDTH_M,
                (0.5 - c.centerY / size.height) * HEIGHT_M,
                0,
            );
            const m = panel.mesh.computeWorldMatrix(true);
            const p = Vector3.TransformCoordinates(local, m);
            const cam = ctx.xr()?.baseExperience.camera.globalPosition ?? Vector3.Zero();
            return { point: toArr(p), toward: toArr(cam.subtract(p).normalize()), mesh: panel.mesh.name };
        },
        /**
         * Where a hand's index fingertip is (world).
         * @param hand - which hand
         * @returns the point, or null without hand tracking
         */
        tip(hand: Hand) {
            const xr = ctx.xr();
            const j = xr ? handTracking(xr)?.getHandByHandedness(hand) : null;
            return j ? toArr(j.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP).getAbsolutePosition()) : null;
        },
        graphRoot: () => toArr(ctx.graph.root.getAbsolutePosition()),
        /**
         * Held UI lag: over `frames` rendered frames, how far the panel moves in the frame of what it
         * follows (the off wrist joint with hands, the off grip with controllers). Zero when it keeps up
         * in the same frame.
         * @param frames - frames to watch
         * @returns the largest offset from the first frame's, in mm, and the path length of the reference
         */
        lag(frames: number): Promise<{ maxMm: number; movedMm: number; samples: number }> {
            const ref = (): TransformNode | Mesh | null => {
                const hand = offHand();
                if (mode === "controller") {
                    return ctx.anchor(`hand-${hand}`);
                }
                const xr = ctx.xr();
                const j = xr ? handTracking(xr)?.getHandByHandedness(hand) : null;
                return j ? j.getJointMesh(WebXRHandJoint.WRIST) : null;
            };
            let first: Vector3 | null = null;
            let last: Vector3 | null = null;
            let maxMm = 0;
            let movedMm = 0;
            let samples = 0;
            return new Promise((resolve) => {
                const obs = ctx.scene.onAfterRenderObservable.add(() => {
                    const r = ref();
                    if (r) {
                        // Position and rotation only: joint spheres are scaled, which would scale the offset.
                        r.computeWorldMatrix(true);
                        const at = r.getAbsolutePosition().clone();
                        const inv = Matrix.Compose(Vector3.One(), r.absoluteRotationQuaternion, at).invert();
                        const local = Vector3.TransformCoordinates(panel.mesh.getAbsolutePosition(), inv);
                        first ??= local;
                        maxMm = Math.max(maxMm, Vector3.Distance(first, local) * 1000);
                        if (last) {
                            movedMm += Vector3.Distance(last, at) * 1000;
                        }
                        last = at;
                        samples++;
                    }
                    if (samples >= frames) {
                        ctx.scene.onAfterRenderObservable.remove(obs);
                        resolve({ maxMm, movedMm, samples });
                    }
                });
            });
        },
    };
    (window as unknown as { __wristMenu: typeof api }).__wristMenu = api;
};

export const technique: Technique = {
    id: "wrist-menu",
    name: "Wrist menu",
    color: "#ffeb95",
    settings: [
        {
            key: "placement",
            label: "Hands: beside the hand",
            kind: "choice",
            choices: ["ulnar", "radial", "below-wrist", "above-fingertips"],
            default: "ulnar",
        },
        { key: "offsetCm", label: "Hands: distance (cm)", kind: "number", min: 4, max: 16, step: 2, default: 10 },
        { key: "gaze", label: "Hands: only while looked at", kind: "bool", default: true },
        {
            key: "gazeRadiusCm",
            label: "Hands: gaze radius (cm)",
            kind: "number",
            min: 5,
            max: 40,
            step: 5,
            default: 15,
        },
        {
            key: "followLagMs",
            label: "Hands: follow smoothing (ms)",
            kind: "number",
            min: 0,
            max: 200,
            step: 25,
            default: 0,
        },
    ],
    claims: [],
    prepare(c) {
        ctx = c;
        holder = new TransformNode("wrist-menu-holder", c.scene);
        follow = new TransformNode("wrist-menu-follow", c.scene);
        follow.parent = holder;
        holder.setEnabled(false);
        variant = createControllerVariant(c, new TransformNode("wrist-menu-controller", c.scene));
        variant.node.setEnabled(false);

        panel = c.ui.panel("panel", WIDTH_M, HEIGHT_M, PX);
        panel.mesh.parent = follow;
        panel.mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
        undoButton = item("undo", "Undo", (h) => {
            c.commands.undo(h);
        });
        if (undoButton.textBlock) {
            undoButton.textBlock.fontSize = 34;
        }
        panel.stack.addControl(row(undoButton));
        panel.stack.addControl(
            row(
                item("redo", "Redo", (h) => {
                    c.commands.redo(h);
                }),
                item("save", "Save", () => {
                    c.framework.save();
                }),
            ),
        );
        panel.stack.addControl(
            row(
                item("settings", "Settings", () => {
                    c.framework.toggleGear();
                }),
                item("steps", "Steps", () => {
                    c.framework.toggleSteps();
                }),
            ),
        );
        panel.stack.addControl(
            row(
                item("recenter", "Recenter", () => {
                    c.framework.recenter();
                }),
                item("flag", "Flag", () => {
                    c.framework.flag();
                }),
            ),
        );
        // Shown only through `holder` (hands) or the variant's node (controllers).
        panel.show();
        c.settings.onChange(applySettings);
        c.onFrame(frame);
        if (new URLSearchParams(location.search).has("emulate")) {
            installDebug();
        }
    },
    activate() {
        attachBehavior();
    },
    deactivate() {
        detachBehavior();
        holder.setEnabled(false);
        variant.node.setEnabled(false);
        setMode(null);
        if (visible) {
            visible = false;
            ctx.log("hidden", { mode: null, why: "switched off" });
        }
    },
};
