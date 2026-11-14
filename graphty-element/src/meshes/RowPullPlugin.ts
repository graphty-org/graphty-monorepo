import type { Material } from "@babylonjs/core/Materials/material.js";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase.js";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage.js";
import type { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

/**
 * @file Place a thin instance from the row table instead of from its matrix.
 *
 * A node batch draws many rows of one look in one draw call. A row's place lives in the
 * `rowPosition` texture (`render/RowTable.ts`), so moving a row moves one texel and never touches
 * the batch. The per-instance `graphtyRow` attribute says which texel is whose.
 *
 * The plugin sits on the material the object rows draw with; its define is on only for a batch
 * mesh, so those rows compile the shader they always did.
 *
 * Babylon writes a thin instance's normal by another formula than an ordinary instance's, which
 * shades any scale in `matrix` differently (85 levels for a non-uniform one). The rewrite below
 * puts the ordinary line back, so a batch and an object row agree.
 */

const PLUGIN_NAME = "GraphtyRowPull";

/** After `InstanceColorShading`, which rewrites a fragment line this does not touch. */
const PLUGIN_PRIORITY = 950;

const GLSL = {
    CUSTOM_VERTEX_DEFINITIONS: `#ifdef ROW_PULL
attribute float graphtyRow;
uniform highp sampler2D rowPosition;
#endif
`,
    [String.raw`!vNormalW=normalUpdated/vec3\(dot\(normalWorld\[0\],normalWorld\[0\]\),dot\(normalWorld\[1\],normalWorld\[1\]\),dot\(normalWorld\[2\],normalWorld\[2\]\)\);vNormalW=normalize\(normalWorld\*vNormalW\);`]:
        "vNormalW=normalize(normalWorld*normalUpdated);",
    // A batch whose rows are all unscaled sends no matrices (20 bytes a row): each row's own matrix is the identity.
    [String.raw`!mat4\s+finalWorld=mat4\(world0,world1,world2,world3\);`]: `
#ifdef ROW_UNSCALED
mat4 finalWorld=mat4(1.0);
#else
mat4 finalWorld=mat4(world0,world1,world2,world3);
#endif
`,
    CUSTOM_VERTEX_UPDATE_WORLDPOS: `#ifdef ROW_PULL
int grRow = int(graphtyRow + 0.5);
vec4 grPlace = graphtyRow < 0.0 ? vec4(0.0) : texelFetch(rowPosition, ivec2(grRow & 1023, grRow >> 10), 0);
vec3 grOrigin = world[3].xyz;
worldPos = vec4((worldPos.xyz - grOrigin) * grPlace.w + grOrigin + mat3(world) * grPlace.xyz, worldPos.w);
#endif
`,
};

const WGSL = {
    CUSTOM_VERTEX_DEFINITIONS: `#ifdef ROW_PULL
attribute graphtyRow: f32;
var rowPosition: texture_2d<f32>;
#endif
`,
    [String.raw`!vertexOutputs\.vNormalW=normalUpdated/\s*vec3f\(dot\(normalWorld\[0\],normalWorld\[0\]\),dot\(normalWorld\[1\],normalWorld\[1\]\),dot\(normalWorld\[2\],normalWorld\[2\]\)\);vertexOutputs\.vNormalW=normalize\(normalWorld\*vertexOutputs\.vNormalW\);`]:
        "vertexOutputs.vNormalW=normalize(normalWorld*normalUpdated);",
    [String.raw`!var\s+finalWorld\s*=\s*mat4x4<f32>\(vertexInputs\.world0,vertexInputs\.world1,vertexInputs\.world2,vertexInputs\.world3\);`]: `
#ifdef ROW_UNSCALED
var finalWorld=mat4x4<f32>(vec4f(1.0,0.0,0.0,0.0),vec4f(0.0,1.0,0.0,0.0),vec4f(0.0,0.0,1.0,0.0),vec4f(0.0,0.0,0.0,1.0));
#else
var finalWorld=mat4x4<f32>(vertexInputs.world0,vertexInputs.world1,vertexInputs.world2,vertexInputs.world3);
#endif
`,
    CUSTOM_VERTEX_UPDATE_WORLDPOS: `#ifdef ROW_PULL
let grRow: i32 = i32(vertexInputs.graphtyRow + 0.5);
var grPlace: vec4f = vec4f(0.0);
if (vertexInputs.graphtyRow >= 0.0) {
grPlace = textureLoad(rowPosition, vec2<i32>(grRow & 1023, grRow >> 10), 0);
}
#ifdef WORLD_UBO
let grWorld: mat4x4f = mesh.world;
#else
let grWorld: mat4x4f = uniforms.world;
#endif
let grOrigin: vec3f = grWorld[3].xyz;
let grLinear: mat3x3f = mat3x3f(grWorld[0].xyz, grWorld[1].xyz, grWorld[2].xyz);
worldPos = vec4f((worldPos.xyz - grOrigin) * grPlace.w + grOrigin + grLinear * grPlace.xyz, worldPos.w);
#endif
`,
};

/** What a batch mesh carries in its metadata. */
interface RowBatchMetadata {
    /** The table that places its rows. */
    readonly rowPlaces: { readonly positionTexture: RawTexture };
    /** Whether the batch sends no matrices, its rows all unscaled. */
    readonly rowUnscaled?: boolean;
}

/**
 * The row table of a batch mesh.
 * @param mesh - Any mesh.
 * @returns What places its rows, or undefined for anything but a batch.
 */
function rowPlacesOf(mesh: AbstractMesh | undefined): RowBatchMetadata["rowPlaces"] | undefined {
    return (mesh?.metadata as Partial<RowBatchMetadata> | null | undefined)?.rowPlaces;
}

/**
 * Whether a mesh is a node batch, for the walks that must leave one alone.
 * @param mesh - Any mesh.
 * @returns True for a batch.
 */
export function isRowBatch(mesh: AbstractMesh): boolean {
    return rowPlacesOf(mesh) !== undefined;
}

/**
 * Whether a batch sends no matrices, its rows all unscaled: a shader drawing it takes each row's matrix as the identity.
 * @param mesh - The mesh.
 * @returns True for such a batch.
 */
export function isUnscaledRowBatch(mesh: AbstractMesh): boolean {
    return (mesh.metadata as Partial<RowBatchMetadata> | null | undefined)?.rowUnscaled === true;
}

/** Reads a batch's rows from the row table; see the file comment. */
class RowPullPlugin extends MaterialPluginBase {
    /**
     * Attach to one material, enabled at once: the define, not the plugin, is what is per mesh.
     * @param material - The material.
     */
    constructor(material: Material) {
        super(material, PLUGIN_NAME, PLUGIN_PRIORITY, { ROW_PULL: false, ROW_UNSCALED: false }, true, true);
    }

    /**
     * The name Babylon keys this plugin's shader code on.
     * @returns The name.
     */
    override getClassName(): string {
        return PLUGIN_NAME;
    }

    /**
     * Whether a material's shader language has code here.
     * @returns True: both do.
     */
    override isCompatible(): boolean {
        return true;
    }

    /**
     * Turn the define on for a batch.
     * @param defines - The defines.
     * @param _scene - The scene.
     * @param mesh - The mesh being drawn.
     */
    override prepareDefines(defines: Record<string, unknown>, _scene: Scene, mesh: AbstractMesh): void {
        defines.ROW_PULL = rowPlacesOf(mesh) !== undefined;
        defines.ROW_UNSCALED = isUnscaledRowBatch(mesh);
    }

    /**
     * Name the row attribute for a batch.
     * @param attributes - The attributes.
     * @param _scene - The scene.
     * @param mesh - The mesh being drawn.
     */
    override getAttributes(attributes: string[], _scene: Scene, mesh: AbstractMesh): void {
        if (rowPlacesOf(mesh) !== undefined) {
            attributes.push("graphtyRow");
        }
    }

    /**
     * Name the row texture.
     * @param samplers - The samplers.
     */
    override getSamplers(samplers: string[]): void {
        samplers.push("rowPosition");
    }

    /**
     * Bind the row texture for a batch.
     * @param uniformBuffer - The material's uniform buffer.
     * @param _scene - The scene.
     * @param _engine - The engine.
     * @param subMesh - What is being drawn.
     */
    override bindForSubMesh(uniformBuffer: UniformBuffer, _scene: Scene, _engine: unknown, subMesh: SubMesh): void {
        const places = rowPlacesOf(subMesh.getRenderingMesh());
        if (places !== undefined) {
            uniformBuffer.setTexture("rowPosition", places.positionTexture);
        }
    }

    /**
     * The vertex code, in the language the material compiles to.
     * @param shaderType - "vertex" or "fragment".
     * @param shaderLanguage - GLSL or WGSL.
     * @returns The code, or null for a fragment shader.
     */
    override getCustomCode(shaderType: string, shaderLanguage?: ShaderLanguage): Record<string, string> | null {
        if (shaderType !== "vertex") {
            return null;
        }

        return shaderLanguage === ShaderLanguage.WGSL ? WGSL : GLSL;
    }
}

/**
 * Let a material draw batches. A frozen material stops evaluating defines, so it thaws for this.
 * @param material - The material a source mesh draws with.
 */
export function attachRowPull(material: Material): void {
    if (material.pluginManager?.getPlugin(PLUGIN_NAME)) {
        return;
    }

    const frozen = material.isFrozen;
    if (frozen) {
        material.unfreeze();
    }

    new RowPullPlugin(material); // NOSONAR(S1848): the base constructor attaches it to the material
    if (frozen) {
        material.freeze();
    }
}
