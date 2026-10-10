// The ring style, written fresh after Open Brush's PinCushion.cs (Apache-2.0, reference only): a
// ring of items opens at the hand and stays where it opened; turning the wrist steers the
// highlight. As in PinCushion, the hand's rotation since the ring opened is applied to a point
// ahead of the hand (toward the ring, away from the head) and projected onto the ring's plane; a
// small turn stays in the dead zone, and releasing there chooses nothing.

import { type AbstractMesh, Matrix, TransformNode, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";
import { ringPosition, ringSlot, type Verb } from "./verbs";

const RADIUS_M = 0.075;
const IDLE = "#2c3650";
const LIT = "#3f6fd8";
const TITLE = "#14192a";

/** A ring menu. */
export interface RingMenu {
    /**
     * Open at a hand.
     * @param hand - the hand whose wrist steers it
     * @param verbs - the items, item 0 at the top, then clockwise
     * @param title - shown in the middle
     * @param deadDeg - turns smaller than this choose nothing
     * @returns false when the hand has no pose to open at
     */
    open(hand: Hand, verbs: readonly Verb[], title: string, deadDeg: number): boolean;
    /** Per frame while open: steer by the wrist; returns the highlighted index, or -1. */
    steer(): number;
    close(): void;
    readonly isOpen: boolean;
}

/**
 * Build the ring, hidden: one chip per item slot and one for the title.
 * @param ctx - the technique context
 * @param slots - the most items any ring shows
 * @returns the ring
 */
export function createRingMenu(ctx: TechniqueContext, slots: number): RingMenu {
    const root = new TransformNode("node-menus-ring", ctx.scene);
    const chips: Chip[] = Array.from({ length: slots }, (_, i) => {
        const c = ctx.ui.chip(`ring-${i}`, 0.07, 0.022);
        c.mesh.parent = root;
        return c;
    });
    const title = ctx.ui.chip("ring-title", 0.07, 0.018);
    title.mesh.parent = root;
    // Compile the chips' shader now, so the first open does not stall a frame.
    for (const c of [...chips, title]) {
        c.mesh.material?.forceCompilation(c.mesh);
    }

    let grip: AbstractMesh | null = null;
    let verbs: readonly Verb[] = [];
    let dead = 12;
    let lit = -1;
    // The ring's frame at opening: n0 from the head through the hand, u up and r right in its plane.
    const n0 = new Vector3();
    const u = new Vector3();
    const r = new Vector3();
    // n0 in the grip's local frame at opening; re-expressed in world each frame, it is the
    // PinCushion point turned by the wrist's rotation since then.
    const local = new Vector3();
    const p = new Vector3();
    const inv = new Matrix();

    const paint = (i: number, on: boolean): void => {
        if (i >= 0 && i < verbs.length) {
            chips[i].set(verbs[i].label, on ? LIT : IDLE);
        }
    };

    const gripOf = (hand: Hand): AbstractMesh | null => {
        const src = ctx.xr()?.input.controllers.find((c) => c.inputSource.handedness === hand);
        return src?.grip ?? src?.pointer ?? null;
    };

    return {
        open(hand, v, text, deadDeg) {
            const g = gripOf(hand);
            const head = ctx.xr()?.baseExperience.camera.globalPosition;
            if (!g || !head) {
                return false;
            }
            grip = g;
            verbs = v.slice(0, slots);
            dead = deadDeg;
            lit = -1;
            const at = g.getAbsolutePosition();
            at.subtractToRef(head, n0);
            n0.normalize();
            u.set(0, 1, 0).subtractInPlace(n0.scale(n0.y)).normalize();
            Vector3.CrossToRef(u, n0, r);
            g.getWorldMatrix().invertToRef(inv);
            Vector3.TransformNormalToRef(n0, inv, local);
            // A little beyond the hand, so the hand does not cover the middle, and 4 cm lower, so the
            // top item clears the framework's owner badge 7 cm above the hand.
            root.position.copyFrom(at).addInPlace(n0.scale(0.05)).subtractInPlace(u.scale(0.04));
            root.lookAt(root.position.add(n0));
            root.computeWorldMatrix(true);
            verbs.forEach((_verb, i) => {
                const pos = ringPosition(i, verbs.length, RADIUS_M);
                chips[i].mesh.position.set(pos.x, pos.y, 0);
                paint(i, false);
                chips[i].show();
            });
            for (let i = verbs.length; i < slots; i++) {
                chips[i].hide();
            }
            title.set(text, TITLE);
            title.show();
            return true;
        },
        steer() {
            if (!grip) {
                return -1;
            }
            Vector3.TransformNormalToRef(local, grip.getWorldMatrix(), p);
            p.normalize();
            const along = Vector3.Dot(p, n0);
            const dx = Vector3.Dot(p, r);
            const dy = Vector3.Dot(p, u);
            const tilt = (Math.atan2(Math.hypot(dx, dy), along) * 180) / Math.PI;
            const i = ringSlot(dx, dy, tilt, verbs.length, dead, lit);
            if (i !== lit) {
                paint(lit, false);
                paint(i, true);
                lit = i;
            }
            return lit;
        },
        close() {
            grip = null;
            for (const c of chips) {
                c.hide();
            }
            title.hide();
        },
        get isOpen() {
            return grip !== null;
        },
    };
}
