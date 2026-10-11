// The slab (design section 9.9): a plate held in the off hand and pushed through the graph, after
// the Slicing-Volume technique (Montano-Murillo et al., IEEE VR 2020, no published code). Nodes
// within half its thickness of its plane, and inside its square, are drawn flat on the plate as
// dots; the rest of the graph dims. A ray on the plate targets the dot nearest the ray's hit point
// (a bubble cursor on the plate), as that hand's target provider, so a tap there selects the node
// in the full graph. A small button under the plate pins it in place or takes it back.

import {
    Color3,
    type Mesh,
    MeshBuilder,
    Quaternion,
    type Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

import type { NodePick } from "../../scene/graph-view";
import { guiButton, type Panel } from "../../scene/ui";

/** The slab's pose and contents, for the hints, the provider and the dry run. */
export interface Slab {
    readonly plate: Mesh;
    /** Node indices in the slice, in no order. */
    readonly slice: readonly number[];
    readonly pinned: boolean;
    /** Move the plate to a pose: center, unit normal (away from the user), edge length. */
    pose(center: Vector3, normal: Vector3, sizeM: number): void;
    /** Recompute the slice from node world positions (x y z per node); true when it changed. */
    cut(world: Float32Array, halfThicknessM: number, visible: (i: number) => boolean): boolean;
    /**
     * Where the ray meets the plate, as the nearest dot, or null when it misses the plate or the
     * slice is empty. With `keep` (the node this hand is on now), that node stays the pick until
     * another dot is clearly nearer (hysteresis, design section 10.2 rule 7).
     */
    hit(origin: Vector3, dir: Vector3, keep?: number): NodePick | null;
    /** A dot's world position (on the plate), or null when the node is not in the slice. */
    dotWorld(i: number, out: Vector3): Vector3 | null;
    /** Highlight one dot (the hovered node), or -1. */
    highlight(i: number): void;
    setPinned(pinned: boolean): void;
    show(): void;
    hide(): void;
}

const DOT = new Color3(0.95, 0.97, 1);
const DOT_HOVER = new Color3(1, 0.82, 0.2);
/** Dots sit this far in front of the plate (toward the user), so they never z-fight with it. */
const LIFT_M = 0.003;

/**
 * Build the slab, hidden.
 * @param scene - the scene
 * @param nodeCount - nodes in the graph (the dot buffer's capacity)
 * @param dotRadius - the dot radius in meters
 * @param button - a panel for the pin button, from the technique context
 * @param onPin - called when the pin button is pressed
 * @returns the slab
 */
export function createSlab(
    scene: Scene,
    nodeCount: number,
    dotRadius: () => number,
    button: Panel,
    onPin: () => void,
): Slab {
    const plate = MeshBuilder.CreatePlane("dense-picking-plate", { size: 1 }, scene);
    const mat = new StandardMaterial("dense-picking-plate-mat", scene);
    mat.diffuseColor = new Color3(0.2, 0.32, 0.45);
    mat.emissiveColor = new Color3(0.08, 0.14, 0.2);
    mat.specularColor = Color3.Black();
    mat.alpha = 0.45;
    mat.backFaceCulling = false;
    plate.material = mat;
    plate.isPickable = false;
    plate.rotationQuaternion = new Quaternion();
    plate.setEnabled(false);

    // The dots: children of a node that cancels the plate's scale, in plate-local meters.
    const dotsRoot = new TransformNode("dense-picking-dots-root", scene);
    dotsRoot.parent = plate;
    const dots = MeshBuilder.CreateDisc("dense-picking-dots", { radius: 1, tessellation: 12 }, scene);
    const dotMat = new StandardMaterial("dense-picking-dot-mat", scene);
    dotMat.disableLighting = true;
    dotMat.emissiveColor = Color3.White();
    dotMat.backFaceCulling = false;
    dots.material = dotMat;
    dots.parent = dotsRoot;
    dots.isPickable = false;
    dots.alwaysSelectAsActiveMesh = true;
    const matrices = new Float32Array(16 * Math.max(1, nodeCount));
    const colors = new Float32Array(4 * Math.max(1, nodeCount));
    dots.thinInstanceSetBuffer("matrix", matrices, 16, false);
    dots.thinInstanceSetBuffer("color", colors, 4, false);
    dots.thinInstanceCount = 0;
    // With no thin instances Babylon draws the base disc itself: a 1 m white disc over the whole view
    // whenever the slab showed with an empty slice before its first change (dry run pass 1).
    dots.setEnabled(false);

    button.mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    const pin = guiButton("dense-picking-pin", "Pin slab", onPin, 56);
    button.stack.addControl(pin);

    const center = new Vector3();
    const normal = new Vector3(0, 0, 1);
    const right = new Vector3(1, 0, 0);
    const up = new Vector3(0, 1, 0);
    let size = 0.3;
    let slice: number[] = [];
    let local = new Float32Array(0); // x y per slice entry, plate meters
    let lit = -1;
    let slot = new Map<number, number>(); // node -> its entry in the slice
    let pinned = false;
    const tmp = new Vector3();

    const writeDots = (): void => {
        const r = dotRadius();
        for (let k = 0; k < slice.length; k++) {
            const o = k * 16;
            matrices.fill(0, o, o + 16);
            matrices[o] = r;
            matrices[o + 5] = r;
            matrices[o + 10] = r;
            matrices[o + 12] = local[k * 2];
            matrices[o + 13] = local[k * 2 + 1];
            matrices[o + 14] = -LIFT_M;
            matrices[o + 15] = 1;
            const c = slice[k] === lit ? DOT_HOVER : DOT;
            colors[k * 4] = c.r;
            colors[k * 4 + 1] = c.g;
            colors[k * 4 + 2] = c.b;
            colors[k * 4 + 3] = 1;
        }
        dots.thinInstanceCount = slice.length;
        dots.thinInstanceBufferUpdated("matrix");
        dots.thinInstanceBufferUpdated("color");
        dots.setEnabled(slice.length > 0);
    };

    return {
        plate,
        get slice() {
            return slice;
        },
        get pinned() {
            return pinned;
        },
        pose(c, n, s) {
            if (center.equals(c) && normal.equals(n) && s === size) {
                return;
            }
            center.copyFrom(c);
            normal.copyFrom(n).normalize();
            size = s;
            // No roll: the plate's up is world up projected onto the plate.
            Vector3.CrossToRef(Vector3.UpReadOnly, normal, right);
            if (right.lengthSquared() < 1e-6) {
                right.set(1, 0, 0);
            }
            right.normalize();
            Vector3.CrossToRef(normal, right, up);
            up.normalize();
            plate.position.copyFrom(center);
            Quaternion.RotationQuaternionFromAxisToRef(right, up, normal, plate.rotationQuaternion as Quaternion);
            plate.scaling.set(size, size, 1);
            dotsRoot.scaling.set(1 / size, 1 / size, 1);
            // The pin button hangs just under the plate's lower edge.
            center.addToRef(up.scale(-(size / 2 + 0.04)), button.mesh.position);
        },
        cut(world, half, visible) {
            const next: number[] = [];
            const xy: number[] = [];
            const lim = size / 2;
            for (let i = 0; i < world.length / 3; i++) {
                const vx = world[i * 3] - center.x;
                const vy = world[i * 3 + 1] - center.y;
                const vz = world[i * 3 + 2] - center.z;
                if (Math.abs(vx * normal.x + vy * normal.y + vz * normal.z) > half) {
                    continue;
                }
                const x = vx * right.x + vy * right.y + vz * right.z;
                const y = vx * up.x + vy * up.y + vz * up.z;
                if (Math.abs(x) <= lim && Math.abs(y) <= lim && visible(i)) {
                    next.push(i);
                    xy.push(x, y);
                }
            }
            const same = next.length === slice.length && next.every((v, k) => v === slice[k]);
            if (same && xy.every((v, k) => Math.abs(v - local[k]) < 1e-7)) {
                return false;
            }
            local = Float32Array.from(xy);
            slice = next;
            slot = new Map(next.map((n, k) => [n, k]));
            writeDots();
            return !same;
        },
        hit(origin, dir, keep = -1) {
            if (!plate.isEnabled() || slice.length === 0) {
                return null;
            }
            const dn = Vector3.Dot(dir, normal);
            if (Math.abs(dn) < 1e-4) {
                return null;
            }
            center.subtractToRef(origin, tmp);
            const t = Vector3.Dot(tmp, normal) / dn;
            if (t <= 0) {
                return null;
            }
            origin.addToRef(dir.scale(t), tmp);
            tmp.subtractInPlace(center);
            const x = Vector3.Dot(tmp, right);
            const y = Vector3.Dot(tmp, up);
            if (Math.abs(x) > size / 2 || Math.abs(y) > size / 2) {
                return null;
            }
            let best = -1;
            let bestD = Infinity;
            let keepD = Infinity;
            for (let k = 0; k < slice.length; k++) {
                const d = (local[k * 2] - x) ** 2 + (local[k * 2 + 1] - y) ** 2;
                if (d < bestD) {
                    bestD = d;
                    best = k;
                }
                if (slice[k] === keep) {
                    keepD = d;
                }
            }
            // Keep the current dot unless the new one is nearer by a third, and the current one is
            // within a dot spacing (1 cm) of the ray.
            if (keepD < Infinity && Math.sqrt(keepD) < 0.01 && Math.sqrt(bestD) > Math.sqrt(keepD) * 0.7) {
                bestD = keepD;
                best = slice.indexOf(keep);
            }
            // The angle is to the dot, so the input layer's hysteresis compares like with like.
            const dist = Math.sqrt(bestD);
            return { index: slice[best], angle: Math.atan2(dist, t), distance: t };
        },
        dotWorld(i, out) {
            const k = slot.get(i) ?? -1;
            if (k < 0) {
                return null;
            }
            out.copyFrom(center);
            out.addInPlace(right.scale(local[k * 2]));
            out.addInPlace(up.scale(local[k * 2 + 1]));
            return out.addInPlace(normal.scale(-LIFT_M));
        },
        highlight(i) {
            if (i !== lit) {
                lit = i;
                writeDots();
            }
        },
        setPinned(p) {
            pinned = p;
            if (pin.textBlock) {
                pin.textBlock.text = p ? "Take slab" : "Pin slab";
            }
        },
        show() {
            plate.setEnabled(true);
            button.show();
        },
        hide() {
            plate.setEnabled(false);
            button.hide();
            slice = [];
            slot.clear();
            writeDots();
        },
    };
}
