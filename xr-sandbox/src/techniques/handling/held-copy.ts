// The held copy (design section 9.10): a small copy of the graph above the off hand's palm (above the
// off controller), drawn from the full graph's own instance buffers, so selection, color and hover
// show on both. While it is shown it is the dominant hand's target provider (design section 5.2):
// a ray on the copy's Medici hovers, and a tap selects, the Medici of the full graph; a ray that
// misses the copy falls through to the plain ray.
//
// It is parented to the off hand's grip anchor (rule 6: no pose copied in an observer, so no lag).
// When it appears, it is placed 8 cm above the hand along world up and turned to match the full
// graph; from then on it rides rigidly with the hand, so turning the hand turns the copy.

import { Quaternion, TransformNode, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import { isVisible } from "../../core/state";
import type { TargetProvider, TechniqueContext } from "../../framework/technique";
import type { NodePick } from "../../scene/graph-view";
import { rootRotation } from "./grab";

/** The held copy. */
export interface HeldCopy {
    readonly root: TransformNode;
    readonly pick: TargetProvider;
    visible(): boolean;
    /** Per frame: show it on `hand` or hide it, and re-upload the graph's buffers when they changed. */
    frame(want: boolean, hand: Hand): void;
}

/** Gap (fix later): the graph view keeps its instance buffers private; this reads them by name. */
interface ThinStorage {
    _thinInstanceDataStorage: { matrixData: Float32Array | null };
    _userThinInstanceBuffersStorage?: { data: Record<string, Float32Array | undefined> };
}

/** The graph's layout box, meters (graph-data.ts). */
const BOX_M = 0.5;
/** Height of the copy's center above the hand when it appears. */
const LIFT_M = 0.08;

/**
 * Build the copy, hidden.
 * @param ctx - the technique context
 * @returns the copy
 */
export function createHeldCopy(ctx: TechniqueContext): HeldCopy {
    const { graph } = ctx;
    const root = new TransformNode("handling-copy", ctx.scene);
    root.rotationQuaternion = new Quaternion();
    // The full graph's node and edge meshes: share their buffers rather than copy them.
    const meshes = graph.meshes.slice(0, 2).map((src) => {
        const m = src.clone(`handling-copy-${src.name}`, root, true);
        const store = src as unknown as ThinStorage;
        const matrices = store._thinInstanceDataStorage.matrixData;
        if (matrices) {
            m.thinInstanceSetBuffer("matrix", matrices, 16, false);
        }
        const colors = store._userThinInstanceBuffersStorage?.data.color;
        if (colors) {
            m.thinInstanceSetBuffer("color", colors, 4, false);
        }
        m.isPickable = false;
        m.alwaysSelectAsActiveMesh = true;
        m.setEnabled(false);
        return { mesh: m, colors: !!colors };
    });
    let shown = false;
    let seen = -1;
    const tmp = new Vector3();
    const inv = new Quaternion();

    const show = (hand: Hand): void => {
        const anchor = ctx.anchor(`hand-${hand}`);
        (anchor.parent as TransformNode | null)?.computeWorldMatrix(true);
        anchor.computeWorldMatrix(true);
        root.parent = anchor;
        anchor.absoluteRotationQuaternion.conjugateToRef(inv);
        Vector3.UpReadOnly.scaleToRef(LIFT_M, tmp).rotateByQuaternionToRef(inv, root.position);
        inv.multiplyToRef(rootRotation(graph.root), root.rotationQuaternion as Quaternion);
        root.scaling.setAll(ctx.settings.num("copySize") / 100 / BOX_M);
        for (const { mesh } of meshes) {
            mesh.setEnabled(true);
        }
        shown = true;
        seen = -1;
        ctx.log("copy", { shown: true, hand });
    };
    const hide = (): void => {
        for (const { mesh } of meshes) {
            mesh.setEnabled(false);
        }
        shown = false;
        ctx.log("copy", { shown: false });
    };

    const world = new Vector3();
    const pick: TargetProvider = (origin, dir, minAngle) => {
        if (!shown) {
            return null;
        }
        const m = root.computeWorldMatrix(true);
        const { positions, nodeCount } = graph.data;
        const rWorld = (graph.radiusWorld() / Math.abs(graph.root.scaling.x)) * Math.abs(root.absoluteScaling.x);
        let best: NodePick | null = null;
        for (let i = 0; i < nodeCount; i++) {
            if (!isVisible(ctx.state, i)) {
                continue;
            }
            Vector3.TransformCoordinatesFromFloatsToRef(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2],
                m,
                world,
            );
            world.subtractInPlace(origin);
            const t = Vector3.Dot(world, dir);
            if (t <= 0) {
                continue;
            }
            const angle = Math.atan2(Math.sqrt(Math.max(0, world.lengthSquared() - t * t)), t);
            if (angle <= Math.max(minAngle, Math.atan2(rWorld, t)) && (!best || angle < best.angle)) {
                best = { index: i, angle, distance: t };
            }
        }
        return best;
    };

    return {
        root,
        pick,
        visible: () => shown,
        frame(want, hand) {
            if (want && (!shown || root.parent !== ctx.anchor(`hand-${hand}`))) {
                show(hand);
            } else if (!want && shown) {
                hide();
            }
            if (shown && graph.rebuilds !== seen) {
                seen = graph.rebuilds;
                for (const { mesh, colors } of meshes) {
                    mesh.thinInstanceBufferUpdated("matrix");
                    if (colors) {
                        mesh.thinInstanceBufferUpdated("color");
                    }
                }
            }
        },
    };
}
