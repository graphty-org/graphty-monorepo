import {
    type AbstractEngine,
    type AbstractMesh,
    type InstancedMesh,
    MaterialPluginBase,
    type Mesh,
    type Scene,
    ShaderLanguage,
    type StandardMaterial,
    type SubMesh,
    type UniformBuffer,
    Vector4,
} from "@babylonjs/core";

import type { HostShader } from "../session/shaders";
import { MESH_ATTRIBUTES, meshInjection } from "../shaders/runtime/nodePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { SCENE_MEMBERS } from "../shaders/runtime/wrap";
import type { NodeShaderData } from "./NodeShaderDrawing";

/** The plugin's name on a material, so a second attach is refused. */
const PLUGIN_NAME = "GraphtyNodeShader";

/** After InstanceColorShading (900), so its rewrite of the lit term is already in place. */
const PLUGIN_PRIORITY = 950;

/**
 * A node surface drawn on the node's own mesh: the mesh path, for a surface on a shape that is
 * not a sphere (design/rendering/shader-styles.md section 5).
 *
 * The plugin keeps the material's geometry and lighting setup and replaces its output: the
 * fragment fills `NodeInput` from the pixel's view-space position and normal, the instance color
 * and the node's two instanced `vec4` attributes (the varying parameters; seed, parameter-set row,
 * state bits, state-time row), calls the shader and writes its color, or the color beneath where
 * the result is not a number.
 *
 * **Attached before the material is first ready.** The node material is built with
 * `checkReadyOnlyOnce`, which stops re-evaluating defines once ready, and a plugin is a define, so
 * the plugin goes on as the source mesh is built, before any frame draws it.
 *
 * **The scene members are written on every draw** (`hardBindForSubMesh`, which Babylon calls even
 * when the material is frozen or need not rebind) into the material's own uniform block, rather
 * than the scene's shader block being bound beside it: so the time moves on a frozen material.
 */
export class NodeShaderPlugin extends MaterialPluginBase {
    private readonly code: ReturnType<typeof meshInjection>;

    /**
     * Attach a shader to one node material.
     * @param material - The source mesh's material.
     * @param shader - The shader.
     * @param data - The scene's data textures.
     * @param runtime - The shader runtime.
     * @param meshRadius - The radius of the source mesh's geometry, in its own units.
     */
    constructor(
        material: StandardMaterial,
        readonly shader: HostShader,
        private readonly data: NodeShaderData,
        private readonly runtime: ShaderRuntime,
        private readonly meshRadius: number,
    ) {
        // Added to the material only once the code exists: adding collects the injected code, and
        // the extra events are what make Babylon call hardBindForSubMesh.
        super(material, PLUGIN_NAME, PLUGIN_PRIORITY, { GRAPHTY_NODE_SHADER: true }, false, false);
        this.code = meshInjection(shader.registration.descriptor, shader.registration.glsl);
        this.registerForExtraEvents = true;
        this._pluginManager._addPlugin(this);
        this._enable(true);
    }

    /**
     * The class name Babylon keys the plugin on.
     * @returns The name.
     */
    override getClassName(): string {
        return PLUGIN_NAME;
    }

    /**
     * GLSL only. On WebGPU the element does not attach the plugin.
     * @param shaderLanguage - The language.
     * @returns Whether it is GLSL.
     */
    override isCompatible(shaderLanguage: ShaderLanguage): boolean {
        return shaderLanguage === ShaderLanguage.GLSL;
    }

    /**
     * The two instanced attributes.
     * @param attributes - The list to add to.
     */
    override getAttributes(attributes: string[]): void {
        attributes.push(...MESH_ATTRIBUTES);
    }

    /**
     * The data textures.
     * @param samplers - The list to add to.
     */
    override getSamplers(samplers: string[]): void {
        samplers.push(this.data.paramSampler, this.data.stateSampler);
    }

    /**
     * The radius and the canvas size.
     * @returns The uniforms.
     */
    override getUniforms(): {
        ubo: { name: string; size: number; type: string }[];
        vertex: string;
        fragment: string;
    } {
        return {
            ubo: [
                { name: "graphty_meshRadius", size: 1, type: "float" },
                { name: "graphty_resolution", size: 2, type: "vec2" },
                ...SCENE_MEMBERS.map((name) => ({ name, size: 4, type: "vec4" })),
            ],
            // Declared here for an engine without uniform buffers; with them, Babylon declares the
            // two in the material's block.
            vertex: "uniform float graphty_meshRadius;\nuniform vec2 graphty_resolution;",
            fragment: SCENE_MEMBERS.map((name) => `uniform vec4 ${name};`).join("\n"),
        };
    }

    /**
     * Write the radius and the canvas size.
     * @param uniformBuffer - The material's buffer.
     * @param scene - The scene.
     * @param engine - The engine.
     */
    override bindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, engine: AbstractEngine): void {
        uniformBuffer.updateFloat("graphty_meshRadius", this.meshRadius);
        uniformBuffer.updateFloat2("graphty_resolution", engine.getRenderWidth(), engine.getRenderHeight(), "");
    }

    /**
     * Bind the scene block and the data textures on every draw.
     * @param uniformBuffer - The material's buffer.
     * @param _scene - The scene.
     * @param _engine - The engine.
     * @param subMesh - The submesh drawn.
     */
    override hardBindForSubMesh(
        uniformBuffer: UniformBuffer,
        _scene: Scene,
        _engine: AbstractEngine,
        subMesh: SubMesh,
    ): void {
        if (subMesh.effect === null) {
            return;
        }

        // The material's own block carries the scene members, written on every draw (the material
        // uploads its block at the end of each bind), so a frozen material sees the time move.
        this.runtime.uniforms.copyInto(uniformBuffer, this.shader.hash);
        uniformBuffer.setTexture(this.data.paramSampler, this.data.paramTexture);
        uniformBuffer.setTexture(this.data.stateSampler, this.data.stateTexture);
    }

    /**
     * The injected code.
     * @param shaderType - "vertex" or "fragment".
     * @returns The code by injection point.
     */
    override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
        if (shaderType === "vertex") {
            return {
                CUSTOM_VERTEX_DEFINITIONS: this.code.vertexDefinitions,
                CUSTOM_VERTEX_MAIN_END: this.code.vertexMainEnd,
            };
        }

        return {
            CUSTOM_FRAGMENT_DEFINITIONS: this.code.fragmentDefinitions,
            CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: this.code.fragmentBeforeFragColor,
        };
    }
}

/**
 * Draw a node surface on a source mesh: attach the plugin to its material and register the two
 * instanced attributes, before anything draws it. A source that already carries it is left alone.
 * @param source - The source mesh every node of this look is an instance of.
 * @param shader - The shader.
 * @param data - The scene's data textures.
 * @param runtime - The shader runtime.
 * @returns True when the source carries the shader now.
 */
export function attachNodeShader(
    source: Mesh,
    shader: HostShader,
    data: NodeShaderData,
    runtime: ShaderRuntime,
): boolean {
    const material = source.material as StandardMaterial | null;
    if (material?.getClassName() !== "StandardMaterial" || source.getEngine().isWebGPU) {
        return false;
    }

    if (!material.pluginManager?.getPlugin(PLUGIN_NAME)) {
        const { extendSize } = source.getBoundingInfo().boundingBox;
        const radius = Math.max(extendSize.x, extendSize.y, extendSize.z, 1e-6);
        // Constructed for its side effect on the material, which is how a Babylon plugin attaches.
        new NodeShaderPlugin(material, shader, data, runtime, radius); // NOSONAR(S1848): a Babylon material plugin attaches itself in its constructor
        for (const name of MESH_ATTRIBUTES) {
            source.registerInstancedBuffer(name, 4);
            source.instancedBuffers[name] = new Vector4(0, 0, 0, 0);
        }
    }

    return true;
}

/**
 * Write a node's two instanced attributes on its instance.
 * @param instance - The node's mesh.
 * @param params - The varying parameters.
 * @param meta - Seed, parameter-set row, state bits, state-time row.
 */
export function writeNodeShaderAttributes(
    instance: AbstractMesh,
    params: readonly [number, number, number, number],
    meta: readonly [number, number, number, number],
): void {
    const mesh = instance as InstancedMesh;
    if (mesh.instancedBuffers === undefined) {
        return;
    }

    const [a, b] = MESH_ATTRIBUTES;
    mesh.instancedBuffers[a] = new Vector4(...params);
    mesh.instancedBuffers[b] = new Vector4(...meta);
}
