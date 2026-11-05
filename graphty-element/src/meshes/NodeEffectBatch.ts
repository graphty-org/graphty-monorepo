import { Constants, type ShaderMaterial } from "@babylonjs/core";

import { NodeBillboardBatch } from "./NodeBillboardBatch";

/**
 * Every node carrying one shader at one stacking place (`over`, `around` or `behind`), drawn as a
 * second camera-facing square, `reach` times its radius, in this batch's own packed buffer
 * (design/rendering/shader-styles.md section 5).
 *
 * A stacking use is drawn over what lies beneath and never replaces it: the body's straight alpha
 * premultiplied over (`blend: "over"`) or added (`blend: "add"`), with no depth writes, so uses
 * stack in the order their batches draw and a node and its label stay drawn. `over` is masked
 * inside the node's outline and `around` outside it; `behind` sits at the node's back, depth
 * tested, so the node covers its middle. Its entered and exited times are its own (the slot's),
 * because two uses on one node enter and leave apart; selected, hovered, pinned and changed come
 * from the node's row of the state-time texture, as every node shader's do.
 */
export class NodeEffectBatch extends NodeBillboardBatch {
    /**
     * Premultiplied over or additive, never writing depth.
     * @param material - The material.
     */
    protected override configureMaterial(material: ShaderMaterial): void {
        material.alphaMode =
            this.shader.registration.descriptor.blend === "add"
                ? Constants.ALPHA_ONEONE
                : Constants.ALPHA_PREMULTIPLIED;
        material.disableDepthWrite = true;
    }

    /**
     * A stacking square draws `reach` times the radius.
     * @returns The reach.
     */
    protected override reachOf(): number {
        return this.shader.registration.descriptor.reach ?? 1;
    }
}
