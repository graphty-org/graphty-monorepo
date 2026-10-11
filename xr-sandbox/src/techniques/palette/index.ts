// The palette tool (design section 9.2): an off-hand prism of five faces -- Analyze, Style, Filter,
// Selection, History -- like Tilt Brush's palette. It rides above the off controller, or on the
// back of the off hand with hand tracking. One flick of the off stick turns exactly one face; a
// pinch-drag on the rim below the faces turns it with hands (Galaxy XR has no microgestures).
// Each face's card tears off by its bar and stays world-locked where it is dropped; dropped near
// its own slot, facing it, it snaps back. Presses on the cards are UI, never arbitrated. The off
// hand's slot is shared with handling's held copy: the framework setting "Off hand carries" picks
// one, so the two are never shown together.

import {
    Color3,
    Matrix,
    type Mesh,
    MeshBuilder,
    type Node,
    Quaternion,
    StandardMaterial,
    type TransformNode,
    Vector3,
    WebXRHandJoint,
} from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import type { Panel } from "../../scene/ui";
import { handTracking } from "../../scene/xr";
import { analyzeFace } from "./faces/analyze";
import { filterFace } from "./faces/filter";
import { historyFace } from "./faces/history";
import { selectionFace } from "./faces/selection";
import { styleFace } from "./faces/style";
import { createPrism, FACE_H, FACE_W, type Prism } from "./prism";
import { makeTearable, type TearOff } from "./tear-off";

const FACES = ["Analyze", "Style", "Filter", "Selection", "History"] as const;
const BAR_H = 0.016;
/** Hands: how much of last frame's offset within the hand to keep (about 100 ms to settle at 72 Hz). */
const HAND_SMOOTH = 0.8;
/** Above the off controller's grip, meters (design section 4.4: "the palette above the controller"). */
const ABOVE_CONTROLLER = new Vector3(0, 0.11, 0.02);

interface Card {
    face: (typeof FACES)[number];
    bar: Mesh;
    panel: Panel;
    tear: TearOff;
    refresh: () => void;
}

let ctx: TechniqueContext;
let prism: Prism;
let cards: Card[] = [];
let active = false;
let shown = false;
let stateKey = "";
let pickKey = "";
/** Whether the hands pose has a value to ease from. */
let settled = false;
/** The off hand's anchor world matrix last frame: hand joints are one frame behind it (see place()). */
const anchorPrev = new Matrix();
let anchorPrevValid = false;

const off = (): Hand => (ctx.dominant() === "left" ? "right" : "left");

/**
 * A string that changes whenever anything a face shows changes, so faces redraw only then.
 * @returns the key
 */
const keyOf = (): string => {
    const s = ctx.state;
    const f = s.filter;
    return [
        s.colorBy,
        s.sizeBy,
        f ? `${f.result}${f.op}${f.value}` : "",
        [...s.selection].join(","),
        s.hidden.size,
        [...s.shown].join(","),
        ctx.commands.undoLabel(),
        ctx.tools.reason("sieve"),
    ].join("|");
};

const setShown = (want: boolean): void => {
    if (want === shown) {
        return;
    }
    shown = want;
    prism.root.setEnabled(want);
    ctx.log(want ? "shown" : "hidden", {});
};

const tmpV = new Vector3();
const tmpQ = new Quaternion();
const inv = new Matrix();

/**
 * Turn the prism so its front card looks straight at the eyes, its axis as close to `axis` as that
 * allows (Open Brush tilts its panels to face the user the same way), and set it as a local pose
 * under an anchor whose world matrix is `m`.
 * @param center - the prism's center, world
 * @param axis - the axis it should keep near: the grip's up, or out of the back of the hand
 * @param m - the anchor's world matrix the pose is expressed in
 * @param smooth - 0 to set the pose; up to 1 to ease toward it (hands: the offset within the hand is
 *   nearly constant, so easing it removes joint noise while the hand's own motion, which arrives
 *   through the parent, is never filtered)
 */
const orient = (center: Vector3, axis: Vector3, m: Matrix, smooth = 0): void => {
    const head = ctx.xr()?.baseExperience.camera.globalPosition ?? Vector3.Zero();
    // Local -Z is the front: Z runs from the head through the prism.
    const z = center.subtract(head).normalize();
    let up = axis.subtract(z.scale(Vector3.Dot(axis, z)));
    if (up.length() < 0.2) {
        // The axis points at the eyes: keep world up instead.
        up = Vector3.Up().subtract(z.scale(z.y));
    }
    up.normalize();
    Quaternion.RotationQuaternionFromAxisToRef(Vector3.Cross(up, z), up, z, tmpQ);
    m.invertToRef(inv);
    Vector3.TransformCoordinatesToRef(center, inv, tmpV);
    const anchorRot = new Quaternion();
    m.decompose(undefined, anchorRot);
    const q = Quaternion.Inverse(anchorRot).multiply(tmpQ);
    const { root } = prism;
    if (smooth > 0 && root.rotationQuaternion && settled) {
        Vector3.LerpToRef(root.position, tmpV, 1 - smooth, root.position);
        Quaternion.SlerpToRef(root.rotationQuaternion, q, 1 - smooth, root.rotationQuaternion);
    } else {
        root.position.copyFrom(tmpV);
        root.rotationQuaternion = q;
    }
    settled = smooth > 0;
};

/**
 * Put the prism on the off hand: above the grip with controllers, on the back of the hand with hand
 * tracking. It is parented to the framework's hand anchor (the grip), so the renderer places it
 * from the same frame's grip pose: no lag. With hands its offset from the anchor comes from the
 * joints, which this hook sees one frame old (Babylon updates them after the framework's frame
 * hook), so they are paired with last frame's anchor matrix.
 */
const place = (): void => {
    const hand = off();
    const anchor = ctx.anchor(`hand-${hand}`);
    if (prism.root.parent !== anchor) {
        prism.root.parent = anchor;
    }
    const xr = ctx.xr();
    // The carrying hand never near-interacts with its own palette: within 10 cm Babylon's near
    // interaction would take it over and switch its far ray off (the gear became unreachable).
    // Babylon's own exclusion, as its HandMenu uses it.
    const carrier = xr?.input.controllers.find((s) => s.inputSource.handedness === hand)?.uniqueId;
    prism.root.reservedDataStore ??= {};
    const store = prism.root.reservedDataStore as { nearInteraction?: { excludedControllerId?: string } };
    if (store.nearInteraction?.excludedControllerId !== carrier) {
        store.nearInteraction = { excludedControllerId: carrier };
    }
    const h = ctx.hover(hand).isHand && xr ? handTracking(xr)?.getHandByHandedness(hand) : null;
    if (!h) {
        const m = anchor.computeWorldMatrix(true);
        orient(
            Vector3.TransformCoordinates(ABOVE_CONTROLLER, m),
            Vector3.TransformNormal(Vector3.Up(), m).normalize(),
            m,
        );
        anchorPrevValid = false;
        return;
    }
    if (anchorPrevValid) {
        const j = (n: WebXRHandJoint): Vector3 => h.getJointMesh(n).getAbsolutePosition().clone();
        const w = j(WebXRHandJoint.WRIST);
        const mid = j(WebXRHandJoint.MIDDLE_FINGER_METACARPAL);
        const a = j(WebXRHandJoint.INDEX_FINGER_METACARPAL).subtract(w);
        const b = j(WebXRHandJoint.PINKY_FINGER_METACARPAL).subtract(w);
        // Out of the palm (the pose layer's formula); the back of the hand is the other way.
        const back = (hand === "right" ? Vector3.Cross(b, a) : Vector3.Cross(a, b)).normalize().scale(-1);
        const center = w
            .add(mid)
            .scale(0.5)
            .add(back.scale(ctx.settings.num("back") / 100 + FACE_H / 2));
        orient(center, back, anchorPrev, HAND_SMOOTH);
    }
    anchorPrev.copyFrom(anchor.computeWorldMatrix(true));
    anchorPrevValid = true;
};

/** Emulated runs only: what the dry run reads (arrange through the hook, assert through it). */
const installProbe = (): void => {
    if (!new URLSearchParams(location.search).has("emulate")) {
        return;
    }
    const w = (n: Node): number[] => (n as TransformNode).getAbsolutePosition().asArray();
    (globalThis as unknown as { __palette: unknown }).__palette = {
        face: () => prism.face,
        faceName: () => FACES[prism.face],
        visible: () => shown && prism.root.isEnabled(),
        root: () => w(prism.root),
        rootMatrix: () => Array.from(prism.root.computeWorldMatrix(true).m),
        anchorMatrix: () => Array.from(ctx.anchor(`hand-${off()}`).computeWorldMatrix(true).m),
        rim: () => w(ctx.scene.getMeshByName("palette-rim") as Mesh),
        cards: () =>
            cards.map((c, k) => ({
                face: c.face,
                docked: c.tear.docked,
                bar: c.bar.name,
                pos: w(c.bar),
                // Where the bar sits when docked.
                home: Vector3.TransformCoordinates(
                    new Vector3(0, FACE_H / 2 - BAR_H / 2, 0),
                    prism.slots[k].computeWorldMatrix(true),
                ).asArray(),
                visible: c.bar.isEnabled(),
            })),
        /**
         * A card control's world position, for aiming at or poking it.
         * @param name - the control's name
         * @returns its position, the card's normal, whether enabled, its text; null when not found
         */
        control(name: string) {
            for (const c of cards) {
                const ctl = c.panel.adt.getControlByName(name);
                if (ctl) {
                    const size = c.panel.adt.getSize();
                    const ext = c.panel.mesh.getBoundingInfo().boundingBox.extendSize;
                    const local = new Vector3(
                        (ctl.centerX / size.width - 0.5) * 2 * ext.x,
                        (0.5 - ctl.centerY / size.height) * 2 * ext.y,
                        0,
                    );
                    return {
                        pos: Vector3.TransformCoordinates(local, c.panel.mesh.computeWorldMatrix(true)).asArray(),
                        normal: c.panel.mesh.forward.asArray(),
                        enabled: ctl.isEnabled,
                        text: (ctl as { textBlock?: { text: string } }).textBlock?.text ?? null,
                    };
                }
            }
            return null;
        },
        /**
         * The off hand's palm: its center and the normal out of the palm, from the joints.
         * @returns center and normal, or null without hand tracking
         */
        palm() {
            const xr = ctx.xr();
            const h = xr ? handTracking(xr)?.getHandByHandedness(off()) : null;
            if (!h) {
                return null;
            }
            const j = (n: WebXRHandJoint): Vector3 => h.getJointMesh(n).getAbsolutePosition().clone();
            const wr = j(WebXRHandJoint.WRIST);
            const a = j(WebXRHandJoint.INDEX_FINGER_METACARPAL).subtract(wr);
            const b = j(WebXRHandJoint.PINKY_FINGER_METACARPAL).subtract(wr);
            const n = (off() === "right" ? Vector3.Cross(b, a) : Vector3.Cross(a, b)).normalize();
            return {
                center: wr.add(j(WebXRHandJoint.MIDDLE_FINGER_METACARPAL)).scale(0.5).asArray(),
                normal: n.asArray(),
            };
        },
        /**
         * A hand's index fingertip, for pokes.
         * @param hand - which hand
         * @returns its world position, or null without hand tracking
         */
        indexTip(hand: Hand) {
            const xr = ctx.xr();
            const h = xr ? handTracking(xr)?.getHandByHandedness(hand) : null;
            return h ? w(h.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)) : null;
        },
        /**
         * Held UI lag: for `frames` rendered frames, where the palette is drawn against where the
         * off grip's raw pose of that same XR frame puts it (the rest offset taken at the start).
         * @param frames - frames to sample
         * @returns the largest gap and the largest per-frame grip movement (the gap a one-frame lag would show), mm
         */
        lag(frames: number) {
            const xr = ctx.xr();
            if (!xr) {
                return Promise.resolve(null);
            }
            const sm = xr.baseExperience.sessionManager;
            const src = xr.input.controllers.find((s) => s.inputSource.handedness === off())?.inputSource;
            const rest = prism.root
                .computeWorldMatrix(true)
                .multiply(ctx.anchor(`hand-${off()}`).computeWorldMatrix(true).clone().invert());
            const raw = (): Matrix | null => {
                const p = src?.gripSpace && sm.currentFrame?.getPose(src.gripSpace, sm.referenceSpace);
                if (!p) {
                    return null;
                }
                const { position: t, orientation: o } = p.transform;
                // Right-handed XR to Babylon's left-handed scene: z flips (as Babylon does).
                return Matrix.Compose(Vector3.One(), new Quaternion(o.x, o.y, -o.z, -o.w), new Vector3(t.x, t.y, -t.z));
            };
            let n = 0;
            let maxMm = 0;
            let moveMm = 0;
            let last: Vector3 | null = null;
            return new Promise((resolve) => {
                const obs = ctx.scene.onAfterRenderObservable.add(() => {
                    const g = raw();
                    if (g) {
                        const want = rest.multiply(g).getTranslation();
                        maxMm = Math.max(maxMm, Vector3.Distance(want, prism.root.getAbsolutePosition()) * 1000);
                        const at = g.getTranslation();
                        if (last) {
                            moveMm = Math.max(moveMm, Vector3.Distance(at, last) * 1000);
                        }
                        last = at;
                    }
                    if (++n >= frames) {
                        ctx.scene.onAfterRenderObservable.remove(obs);
                        resolve({ frames, maxMm, maxGripMoveMm: moveMm });
                    }
                });
            });
        },
    };
};

export const technique: Technique = {
    id: "palette",
    name: "Palette",
    color: "#f78c6c",
    settings: [
        { key: "back", label: "Off the back of the hand (cm)", kind: "number", min: 2, max: 12, step: 1, default: 4 },
        // Babylon's drag pushes and pulls an object 3x as the hand moves toward or away from the body
        // (zDragFactor), made for reaching far; off, a torn card moves 1:1 with the hand.
        { key: "reach", label: "Drag reach boost (cards)", kind: "bool", default: false },
    ],
    claims: [
        {
            channel: "stick",
            detail: "x",
            contexts: "any",
            priority: 70,
            hand: "off",
            note: "off-hand stick left or right turns a face",
        },
        { channel: "micro", contexts: "any", priority: 70, hand: "off", note: "off-hand swipes turn a face" },
    ],
    prepare(c) {
        ctx = c;
        prism = createPrism(c.scene, FACES.length, (face, why) => {
            c.log("turn", { face: FACES[face], why });
        });
        prism.root.setEnabled(false);
        const barMat = new StandardMaterial("palette-bar-mat", c.scene);
        barMat.diffuseColor = new Color3(0.97, 0.55, 0.42);
        barMat.emissiveColor = new Color3(0.4, 0.2, 0.14);
        const sieve = {
            reason: () => c.tools.reason("sieve"),
            take: () => {
                const why = c.tools.take("sieve", c.dominant());
                c.log("sieve", { taken: why === null, why });
            },
        };
        const build = [
            analyzeFace,
            styleFace,
            (x: TechniqueContext, s: Panel["stack"]) => filterFace(x, s, sieve),
            selectionFace,
            historyFace,
        ];
        cards = FACES.map((face, k) => {
            // The card's root is its tear bar; the panel hangs below it, so only the bar drags.
            const bar = MeshBuilder.CreatePlane(
                `palette-bar-${face.toLowerCase()}`,
                { width: FACE_W, height: BAR_H },
                c.scene,
            );
            bar.material = barMat;
            bar.metadata = { ui: true };
            bar.isPickable = true;
            bar.isNearPickable = true;
            bar.parent = prism.slots[k];
            bar.position.set(0, FACE_H / 2 - BAR_H / 2, 0);
            const panel = c.ui.panel(`card-${face.toLowerCase()}`, FACE_W, FACE_H - BAR_H - 0.002, 448);
            panel.mesh.parent = bar;
            panel.mesh.position.set(0, -(FACE_H - 0.002) / 2, 0);
            panel.show(); // shown with its card; the prism root's enabled state hides it all
            // A card is read from the front only; from behind it would show mirrored through the others.
            if (panel.mesh.material) {
                panel.mesh.material.backFaceCulling = true;
            }
            const refresh = build[k](c, panel.stack);
            const tear = makeTearable(c.scene, bar, prism.slots[k], (what, distM) => {
                c.log(what, { face, distCm: Math.round(distM * 1000) / 10 });
            });
            return { face, bar, panel, tear, refresh };
        });
        const reach = (): void => {
            for (const card of cards) {
                card.tear.drag.zDragFactor = c.settings.bool("reach") ? 3 : 0;
            }
        };
        reach();
        c.settings.onChange(() => {
            anchorPrevValid = false;
            reach();
        });
        c.onFrame((dt) => {
            const slot = c.settings.framework("offHand");
            setShown(slot !== "held copy" && c.hover(off()).connected);
            // Torn-off cards stay live while the prism is hidden, so faces refresh either way.
            const key = keyOf();
            if (key !== stateKey) {
                stateKey = key;
                for (const card of cards) {
                    card.refresh();
                }
            }
            if (shown) {
                place();
                prism.update(dt);
            }
            // Only the front card takes a ray or a poke (as in Open Brush): a side card would catch a
            // ray from the dominant hand meant for the front one. Torn-off cards always do.
            const pk = `${prism.face}|${cards.map((cd) => (cd.tear.docked ? 1 : 0)).join("")}`;
            if (pk !== pickKey) {
                pickKey = pk;
                cards.forEach((cd, k) => {
                    const on = !cd.tear.docked || k === prism.face;
                    // The framework's ray predicate reads the ui mark, not isPickable.
                    for (const m of [cd.bar, cd.panel.mesh]) {
                        m.metadata = { ...(m.metadata as object | null), ui: on };
                        m.isPickable = on;
                        m.isNearPickable = on;
                    }
                });
            }
        });
        installProbe();
    },
    activate() {
        active = true;
        stateKey = "";
        anchorPrevValid = false;
        // Torn-off cards come back where they were left; docked ones ride the prism.
        for (const card of cards) {
            if (!card.tear.docked) {
                card.bar.setEnabled(true);
            }
        }
    },
    deactivate() {
        active = false;
        setShown(false);
        for (const card of cards) {
            if (!card.tear.docked) {
                card.bar.setEnabled(false);
            }
        }
    },
    onPress(p, hand) {
        if (!active || !shown) {
            return undefined;
        }
        if (p.press.channel === "stick") {
            // The arbiter's stick press says "x"; which way comes from the axis itself (a read, no subscription).
            const gp = ctx.xr()?.input.controllers.find((s) => s.inputSource.handedness === hand)?.inputSource.gamepad;
            const v = gp?.axes[2] ?? 0;
            prism.turn(v >= 0 ? 1 : -1, "stick");
        } else if (p.press.channel === "micro") {
            prism.turn(p.press.detail === "swipe-left" ? -1 : 1, "microgesture");
        }
        return undefined;
    },
};
