// The wrist menu's controller variant (design section 9.12). Babylon's HandMenu and
// HandConstraintBehavior follow tracked hands only, so with controllers the same panel is parented to
// the off controller's grip (the framework's hand anchor) and shown when the inner side of that wrist
// turns toward the face, as when reading a watch worn on the inside of the wrist. It moves with the
// grip in the same frame because it is a child of it, not a follower.

import { type TransformNode, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { TechniqueContext } from "../../framework/technique";

/** Facing thresholds on the palm side's dot with the direction to the head: [show, hide]. */
const FACING: [number, number] = [0.6, 0.4];

/** The controller variant: a node on the off grip that carries the panel while it is shown. */
export interface ControllerVariant {
    /** Parent of the panel in controller mode; enabled only while the menu is shown. */
    readonly node: TransformNode;
    /** The palm side's dot with the direction to the head, last frame (for the log and the dry run). */
    readonly facing: number;
    /**
     * Per frame: follow the off grip and decide whether the menu shows.
     * @param hand - the off hand
     * @param shown - whether it is shown now (for hysteresis)
     * @returns whether it should show
     */
    update(hand: Hand, shown: boolean): boolean;
}

/**
 * Build the controller variant, hidden.
 * @param ctx - the technique context
 * @param node - the node the panel hangs from in controller mode
 * @returns the variant
 */
export function createControllerVariant(ctx: TechniqueContext, node: TransformNode): ControllerVariant {
    const palmSide = new Vector3();
    const toHead = new Vector3();
    const v = {
        node,
        facing: 0,
        update(hand: Hand, shown: boolean): boolean {
            const anchor = ctx.anchor(`hand-${hand}`);
            const side = hand === "left" ? 1 : -1;
            if (node.parent !== anchor) {
                node.parent = anchor;
                // Over the inner wrist: toward the palm side, a little up and back from the grip.
                node.position.set(side * 0.04, 0.04, -0.06);
            }
            const head = ctx.xr()?.baseExperience.camera.globalPosition;
            if (!anchor.parent || !head) {
                return false;
            }
            (anchor.parent as TransformNode).computeWorldMatrix(true);
            const m = anchor.computeWorldMatrix(true);
            // The palm side of a grip held thumb up is +x for the left hand and -x for the right
            // (WebXR grip space), so the inner wrist faces the head when that axis does.
            Vector3.TransformNormalToRef(Vector3.RightReadOnly, m, palmSide);
            palmSide.normalize().scaleInPlace(side);
            head.subtractToRef(anchor.getAbsolutePosition(), toHead).normalize();
            v.facing = Vector3.Dot(palmSide, toHead);
            return v.facing > (shown ? FACING[1] : FACING[0]);
        },
    };
    return v;
}
