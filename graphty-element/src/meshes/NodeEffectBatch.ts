import { Constants, type Scene, type ShaderMaterial } from "@babylonjs/core";

import type { HostShader } from "../session/shaders";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { NodeBillboardBatch } from "./NodeBillboardBatch";
import type { NodeShaderData } from "./NodeShaderDrawing";

/**
 * Every node carrying one effect, drawn as a second camera-facing square around it, `reach` times
 * its radius, in this batch's own packed buffer (design/rendering/shader-styles.md section 5).
 *
 * An effect is drawn over what lies beneath and never replaces it: premultiplied alpha over
 * (`blend: "over"`) or added (`blend: "add"`), with no depth writes, so effects stack in the order
 * their batches draw and a node and its label stay drawn. Its entered and exited times are its own
 * (the slot's), because two effects on one node enter and leave apart; selected, hovered, pinned
 * and changed come from the node's row of the state-time texture, as every node shader's do.
 */
export class NodeEffectBatch extends NodeBillboardBatch {
    /**
     * Start a batch for one effect.
     * @param scene - The scene.
     * @param shader - The effect.
     * @param data - The scene's data textures.
     * @param runtime - The shader runtime.
     */
    constructor(scene: Scene, shader: HostShader, data: NodeShaderData, runtime: ShaderRuntime) {
        super(scene, "effect", shader, data, runtime);
    }

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
     * An effect draws `reach` times the radius.
     * @returns The reach.
     */
    protected override reachOf(): number {
        return this.shader.registration.descriptor.reach ?? 1;
    }
}
