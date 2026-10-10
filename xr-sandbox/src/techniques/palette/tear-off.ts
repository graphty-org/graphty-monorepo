// Tear-off cards: each face's card has a bar on top; drag the bar (ray and trigger, a pinch, or a
// near grab) and the card leaves the prism and stays where it is dropped, world-locked. Dropped
// within SNAP_M of its own slot and facing the same way within SNAP_DEG, it snaps back. Open Brush's
// AttachHeldPanelToWand is the behavior reference (70 degrees there too); Babylon's
// SixDofDragBehavior does the dragging, owned by the bar so presses on the card's buttons never drag.

import { type Mesh, Quaternion, type Scene, SixDofDragBehavior, type TransformNode, Vector3 } from "@babylonjs/core";

/** Snap back when dropped this close to the slot (meters). */
export const SNAP_M = 0.1;
/** ...and facing within this angle of the slot (degrees). */
export const SNAP_DEG = 70;

/** One card's tear-off state. */
export interface TearOff {
    readonly docked: boolean;
    /** The drag behavior (for its settings, such as zDragFactor). */
    readonly drag: SixDofDragBehavior;
    /** Put the card back on its slot. */
    dock(): void;
}

/**
 * Whether a dropped card should snap back onto its slot.
 * @param card - the card's world position and forward (its normal)
 * @param card.pos - world position
 * @param card.fwd - world forward
 * @param slot - the slot's world position and forward
 * @param slot.pos - world position
 * @param slot.fwd - world forward
 * @returns true when within SNAP_M and facing within SNAP_DEG
 */
export function snaps(card: { pos: Vector3; fwd: Vector3 }, slot: { pos: Vector3; fwd: Vector3 }): boolean {
    const cos = Vector3.Dot(card.fwd.normalizeToNew(), slot.fwd.normalizeToNew());
    return Vector3.Distance(card.pos, slot.pos) <= SNAP_M && cos >= Math.cos((SNAP_DEG * Math.PI) / 180);
}

/**
 * Make `bar` (with its card as a child) tearable from `slot`.
 * @param scene - the scene
 * @param bar - the card's root: the tear bar, a UI-marked mesh parented to the slot
 * @param slot - where it docks
 * @param on - tear and dock events, for the log
 * @returns the card's tear-off state
 */
export function makeTearable(
    scene: Scene,
    bar: Mesh,
    slot: TransformNode,
    on: (what: "tear" | "drop" | "dock", distM: number) => void,
): TearOff {
    bar.rotationQuaternion ??= Quaternion.Identity();
    const rest = bar.position.clone();
    const drag = new SixDofDragBehavior();
    drag.draggableMeshes = [bar];
    drag.allowMultiPointer = false;
    bar.addBehavior(drag);
    let docked = true;

    const dock = (): void => {
        bar.setParent(slot);
        bar.position.copyFrom(rest);
        bar.rotationQuaternion?.copyFrom(Quaternion.Identity());
        docked = true;
    };

    // The behavior reads the owner's local rotation as world at drag start, so the card must leave
    // its (rotated) slot first: this observer runs before the behavior's (insertFirst).
    scene.onPointerObservable.add(
        (p) => {
            if (docked && p.type === 1 /* POINTERDOWN */ && p.pickInfo?.pickedMesh === bar) {
                bar.setParent(null);
                docked = false;
                on("tear", 0);
            }
        },
        undefined,
        true,
    );
    drag.onDragEndObservable.add(() => {
        const pos = bar.getAbsolutePosition();
        const home = Vector3.TransformCoordinates(rest, slot.getWorldMatrix());
        const d = Vector3.Distance(pos, home);
        if (snaps({ pos, fwd: bar.forward }, { pos: home, fwd: slot.forward })) {
            dock();
            on("dock", d);
        } else {
            on("drop", d);
        }
    });

    return {
        get docked() {
            return docked;
        },
        drag,
        dock,
    };
}
