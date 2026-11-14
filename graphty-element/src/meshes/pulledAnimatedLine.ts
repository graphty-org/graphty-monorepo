import { Constants } from "@babylonjs/core/Engines/constants.js";
import { Effect } from "@babylonjs/core/Materials/effect.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { EDGE_CONSTANTS } from "../constants/meshConstants";

/**
 * @file A straight animated line (`line.animationSpeed`) pulled from the row table: the object path's greased line,
 * redrawn by `PulledLineBatch` from each piece's two rows, with its moving texture scrolled by one uniform.
 *
 * The vertex stage is the greased line plugin's camera-facing arithmetic with `sizeAttenuation` off, applied to the
 * two rows' places instead of a unit line under a thin-instance matrix: four vertices a piece, each end offset by half
 * the width along the screen normal, the normal multiplied by `projection`. The fragment stage samples a two-texel
 * mask (base, moving) at `5u + offset`, as the greased line samples its two-texel texture, so a band edge falls on
 * the same pixel. Design: `design/rendering/row-renderer.md`, section 4.3.
 */

/** The greased line's two triangles a piece, over its four vertices: (start, +), (start, -), (end, +), (end, -). */
export const ANIMATED_TEMPLATE = { indices: [0, 1, 2, 2, 1, 3], vertices: 4 } as const;

const VERTEX = `
precision highp float;
uniform mat4 world;
uniform mat4 viewProjection;
uniform mat4 projection;
uniform float aspect;
uniform float handed;
uniform float scroll;
uniform highp sampler2D rowPosition;
uniform highp sampler2D edgeRows;
flat varying vec3 vColor;
varying vec2 vUV;

vec4 rowAt(int i) {
    return texelFetch(rowPosition, ivec2(i & 1023, i >> 10), 0);
}

vec4 edgeAt(int i) {
    return texelFetch(edgeRows, ivec2(i & 1023, i >> 10), 0);
}

vec2 grlFix(vec4 i) {
    vec2 res = i.xy / i.w;
    res.x *= aspect;
    return res;
}

void main(void) {
    int piece = gl_VertexID / 4;
    int corner = gl_VertexID - piece * 4;
    vec4 head = edgeAt(piece * 2);
    vec4 tint = edgeAt(piece * 2 + 1);
    vColor = tint.rgb;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUV = vec2(0.0);
    if (head.x < 0.0 || head.y < 0.0) {
        return;
    }

    vec4 a = rowAt(int(head.x + 0.5));
    vec4 b = rowAt(int(head.y + 0.5));
    if (a.w * b.w == 0.0) {
        return;
    }

    bool end = corner >= 2;
    float side = (corner & 1) == 0 ? 1.0 : -1.0;
    vec3 p = end ? b.xyz : a.xyz;
    vec3 nearPosition = p + (b.xyz - a.xyz) * 0.01;
    mat4 grlMatrix = viewProjection * world;
    vec4 grlFinalPosition = grlMatrix * vec4(p, 1.0);
    vec4 screenNearPos = grlMatrix * vec4(nearPosition, 1.0);
    vec2 grlDir = normalize(grlFix(screenNearPos) - grlFix(grlFinalPosition));
    vec4 grlNormal = vec4(-grlDir.y, grlDir.x, 0.0, 1.0);
    grlNormal.xy *= handed * 0.5 * head.z;
    grlNormal *= projection;
    grlFinalPosition.xy += grlNormal.xy * side;
    gl_Position = grlFinalPosition;
    // the emissive texture's matrix: uScale 5, uOffset the scroll at the piece's speed
    vUV = vec2(${EDGE_CONSTANTS.MOVING_TEXTURE_U_SCALE.toFixed(1)} * (end ? 1.0 : 0.0) - scroll * tint.a, side > 0.0 ? 0.0 : 1.0);
}
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D movingMask;
uniform vec3 baseColor;
flat varying vec3 vColor;
varying vec2 vUV;

void main(void) {
    float moving = texture2D(movingMask, vUV).r;
    gl_FragColor = vec4(clamp(mix(baseColor, vColor, moving), 0.0, 1.0), 1.0);
}
`;

let registered = false;

/** Put the shaders in Babylon's store once. */
function register(): void {
    if (registered) {
        return;
    }

    Effect.ShadersStore.edgeAnimatedVertexShader = VERTEX;
    Effect.ShadersStore.edgeAnimatedFragmentShader = FRAGMENT;
    registered = true;
}

/**
 * A color as the greased line's moving texture holds it: each channel floored to a byte.
 * @param color - The color, 0 to 1 a channel.
 * @param color.r - Red.
 * @param color.g - Green.
 * @param color.b - Blue.
 * @returns The color the texture draws.
 */
export function movingTexel(color: { r: number; g: number; b: number }): Color3 {
    const byte = (c: number): number => Math.floor(c * 255) / 255;
    return new Color3(byte(color.r), byte(color.g), byte(color.b));
}

/**
 * Hand a mesh the engine's render size now and after every resize, until the mesh is disposed. A greased line's
 * material reads the size once, when it is built, and the first element on a page builds its lines before its
 * first resize, at the canvas's default 300 by 150.
 * @param mesh - The mesh.
 * @param apply - Takes the render width and height in pixels.
 */
export function followRenderSize(mesh: Mesh, apply: (width: number, height: number) => void): void {
    const engine = mesh.getScene().getEngine();
    const update = (): void => {
        apply(engine.getRenderWidth(true), engine.getRenderHeight(true));
    };
    update();
    const resized = engine.onResizeObservable.add(update);
    mesh.onDisposeObservable.addOnce(() => {
        resized.remove();
    });
}

/**
 * The mesh a batch of pulled animated lines draws with, its pieces' looks in the batch's edge table.
 * @param scene - The scene.
 * @returns The mesh.
 */
export function createPulledAnimatedLineMesh(scene: Scene): Mesh {
    register();
    const mesh = new Mesh("edge-moving-pulled", scene);
    const vertexData = new VertexData();
    vertexData.positions = new Array<number>(ANIMATED_TEMPLATE.vertices * 3).fill(0);
    vertexData.indices = [...ANIMATED_TEMPLATE.indices];
    vertexData.applyToMesh(mesh);

    const material = new ShaderMaterial(
        "edgeAnimatedMaterial",
        scene,
        { vertex: "edgeAnimated", fragment: "edgeAnimated" },
        {
            attributes: [],
            uniforms: ["world", "viewProjection", "projection", "aspect", "handed", "scroll", "baseColor"],
            samplers: ["rowPosition", "edgeRows", "movingMask"],
        },
    );
    // (base, moving), sampled nearest and wrapped, as the greased line's moving texture is
    const mask = new RawTexture(
        new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]),
        2,
        1,
        Constants.TEXTUREFORMAT_RGBA,
        scene,
        false,
        true,
        Constants.TEXTURE_NEAREST_NEAREST,
    );
    mask.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
    material.setTexture("movingMask", mask);
    material.setColor3("baseColor", movingTexel(Color3.FromHexString(EDGE_CONSTANTS.MOVING_LINE_BASE_COLOR)));
    material.setFloat("scroll", 0);
    material.setFloat("handed", scene.useRightHandedSystem ? -1 : 1);
    material.backFaceCulling = false;
    followRenderSize(mesh, (width, height) => {
        material.setFloat("aspect", width / height);
    });
    mesh.material = material;
    mesh.onDisposeObservable.addOnce(() => {
        mask.dispose();
    });
    return mesh;
}
