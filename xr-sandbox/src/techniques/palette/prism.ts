// The prism: N faces on a ring around one axis, carried by the off hand, turned one face at a time.
// After Open Brush's PanelManager.cs (Apache-2.0, behavior reference only, not ported): panels on a
// ring around the wand, a stick flick snaps one pane, a swipe turns it freely. Here the faces sit on
// a ring around the prism's local Y axis; the front face (local -Z) is the one turned toward the
// owner. A rim band below the faces turns the prism with a pinch-drag (Babylon PointerDragBehavior),
// which is the hands path for Galaxy XR, where there are no microgestures.

import {
    Color3,
    MeshBuilder,
    PointerDragBehavior,
    type Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

/** The prism. */
export interface Prism {
    /** Carried by the off hand: parented to the grip, or to the wrist joint with hands. */
    root: TransformNode;
    /** Slot k: where face k's card docks. */
    slots: TransformNode[];
    /** The face turned toward the owner (an integer; wraps). */
    readonly face: number;
    /** Turn by `n` faces (animated). */
    turn(n: number, why: string): void;
    /** Per frame: ease the rotation toward the target face. */
    update(dtMs: number): void;
}

/** Meters across one face; the cards are this wide. */
export const FACE_W = 0.18;
/** Height of a card, its tear bar included. */
export const FACE_H = 0.2;

/**
 * Build the prism, hidden.
 * @param scene - the scene
 * @param n - number of faces
 * @param onTurn - called when the target face changes (after a flick, a drag snap)
 * @returns the prism
 */
export function createPrism(scene: Scene, n: number, onTurn: (face: number, why: string) => void): Prism {
    const root = new TransformNode("palette-root", scene);
    const spin = new TransformNode("palette-spin", scene);
    spin.parent = root;
    const step = (2 * Math.PI) / n;
    // Apothem of a regular n-gon of side FACE_W: the cards meet at their edges.
    const r = FACE_W / (2 * Math.tan(Math.PI / n));
    const slots: TransformNode[] = [];
    for (let k = 0; k < n; k++) {
        const pivot = new TransformNode(`palette-pivot-${k}`, scene);
        pivot.parent = spin;
        pivot.rotation.y = k * step;
        const slot = new TransformNode(`palette-slot-${k}`, scene);
        slot.parent = pivot;
        slot.position.set(0, 0, -r);
        slots.push(slot);
    }

    // The rim: an n-sided band under the faces. UI (never arbitrated), so a pinch on it is Babylon's.
    const rim = MeshBuilder.CreateCylinder(
        "palette-rim",
        { diameter: (2 * r) / Math.cos(Math.PI / n) + 0.01, height: 0.018, tessellation: n },
        scene,
    );
    rim.parent = spin;
    rim.rotation.y = Math.PI / n; // flats of the band line up with the faces
    rim.position.y = -FACE_H / 2 - 0.012;
    const mat = new StandardMaterial("palette-rim-mat", scene);
    mat.diffuseColor = new Color3(0.97, 0.55, 0.42);
    mat.emissiveColor = new Color3(0.35, 0.18, 0.12);
    rim.material = mat;
    rim.metadata = { ui: true };
    rim.isPickable = true;
    rim.isNearPickable = true;

    let face = 0;
    let target = 0; // radians of spin.rotation.y the prism eases toward
    let dragFrom = 0;
    let dragging = false;
    const local = new Vector3();

    const setFace = (f: number, why: string): void => {
        face = f;
        target = -f * step;
        onTurn(((f % n) + n) % n, why);
    };

    // Pinch-drag on the rim: sideways movement in the prism's own frame turns it live, like a dial;
    // release snaps to the nearest face. moveAttached is off: the rim itself never moves away.
    const drag = new PointerDragBehavior();
    drag.moveAttached = false;
    drag.useObjectOrientationForDragging = false;
    drag.updateDragPlane = false;
    rim.addBehavior(drag);
    let sideways = 0;
    drag.onDragStartObservable.add(() => {
        dragging = true;
        sideways = 0;
        dragFrom = spin.rotation.y;
    });
    drag.onDragObservable.add((e) => {
        // The world delta in the root's frame; x is sideways across the front face.
        const inv = root.getWorldMatrix().clone().invert();
        Vector3.TransformNormalToRef(e.delta, inv, local);
        sideways += local.x;
        // Dragging the front face to the right carries it right (arc length = r * angle; +y turns it left).
        spin.rotation.y = dragFrom - sideways / r;
    });
    drag.onDragEndObservable.add(() => {
        dragging = false;
        // Nearest face to where the drag left the prism.
        setFace(Math.round(-spin.rotation.y / step), "rim drag");
    });

    return {
        root,
        slots,
        get face() {
            return ((face % n) + n) % n;
        },
        turn(by, why) {
            setFace(face + by, why);
        },
        update(dtMs) {
            if (dragging) {
                return;
            }
            const d = target - spin.rotation.y;
            if (d === 0) {
                return;
            }
            // About 90% of the way in 120 ms, then lands exactly.
            const k = 1 - Math.exp(-dtMs / 50);
            spin.rotation.y = Math.abs(d) < 1e-4 ? target : spin.rotation.y + d * k;
        },
    };
}
