import {
    type AbstractMesh,
    BoundingInfo,
    Color3,
    Effect,
    Mesh,
    Scene,
    ShaderMaterial,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import { EDGE_CONSTANTS } from "../constants/meshConstants";
import { ArrowCap, arrowCapBatch } from "./ArrowCapBatch";
import { MaterialHelper } from "./MaterialHelper";
import { PerSceneMaterials } from "./PerSceneMaterials";

/** Segments a whole circle is drawn with; an arc gets its share of them. */
const ARC_SEGMENTS = 32;
/** How thick an open cap's frame is when no line width is given: the open dot's old ring (its radius 0.5 inset 22.5%). */
const OPEN_FRAME = 0.5 * 0.225;
/**
 * How long along its line the half barb's stroke is, as a share of the cap: Cytoscape 3.10.5's HALF_TOP glyph is a strip
 * 0.135 of its 1.135 long (ding SVG export `M -0.3 0.1 L -1.3 1.1 L -1.435 1.1 L -0.535 0.2`).
 */
export const HALF_BARB = 0.135 / 1.135;
/** How far back from its tip half-open's arm meets its line: its inner corner. */
export const HALF_OPEN_MEETS = 0.4;

/**
 * A disc's piece between two angles, as a fan from its center, in the XZ plane.
 * @param cx - The center's x.
 * @param r - The radius.
 * @param cz - The center's z.
 * @param from - The first angle, in radians from +x toward +z.
 * @param to - The last angle.
 * @returns The center, then the arc's points.
 */
function arc(cx: number, r: number, cz: number, from: number, to: number): [number, number][] {
    const steps = Math.max(2, Math.ceil((ARC_SEGMENTS * Math.abs(to - from)) / (2 * Math.PI)));
    const points: [number, number][] = [[cx, cz]];
    for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    return points;
}

/**
 * An arc drawn as a band between two radii about a center on the axis, one quad per step.
 * @param cx - The center's x.
 * @param r - The outer radius.
 * @param inner - The inner radius as a fraction of the outer.
 * @param from - The first angle, in radians from +x toward +z.
 * @param to - The last angle.
 * @returns The quads.
 */
function band(cx: number, r: number, inner: number, from: number, to: number): [number, number][][] {
    const steps = Math.max(2, Math.ceil((ARC_SEGMENTS * Math.abs(to - from)) / (2 * Math.PI)));
    const at = (a: number, k: number): [number, number] => [cx + k * r * Math.cos(a), k * r * Math.sin(a)];
    const quads: [number, number][][] = [];
    for (let i = 0; i < steps; i++) {
        const a0 = from + ((to - from) * i) / steps;
        const a1 = from + ((to - from) * (i + 1)) / steps;
        quads.push([at(a0, 1), at(a1, 1), at(a1, inner), at(a0, inner)]);
    }
    return quads;
}

/**
 * A bar across the line, from x0 back to x1, `half` to each side of it.
 * @param x0 - Its back.
 * @param x1 - Its front.
 * @param half - Half its width.
 * @returns Its corners.
 */
function rect(x0: number, x1: number, half: number): [number, number][] {
    return [
        [x0, -half],
        [x1, -half],
        [x1, half],
        [x0, half],
    ];
}

/**
 * A convex outline drawn as a frame `t` thick inside it, one quad per side: each side moved in by
 * `t`, and each corner of the inner outline where two moved sides meet.
 * @param outline - The outline's corners, in order.
 * @param t - How thick the frame is.
 * @returns The quads.
 */
function frame(outline: readonly (readonly [number, number])[], t: number): [number, number][][] {
    const n = outline.length;
    // the side from corner i to i + 1, moved in by t: a point on it and its direction
    const area = outline.reduce((sum, [x, z], i) => {
        const [x1, z1] = outline[(i + 1) % n];
        return sum + x * z1 - x1 * z;
    }, 0);
    const turn = area > 0 ? 1 : -1;
    const sides = outline.map(([x, z], i) => {
        const [x1, z1] = outline[(i + 1) % n];
        const length = Math.hypot(x1 - x, z1 - z);
        const [dx, dz] = [(x1 - x) / length, (z1 - z) / length];
        // the inward normal: to the left of a side of a counter-clockwise outline
        const [nx, nz] = [-dz * turn, dx * turn];
        return { x: x + nx * t, z: z + nz * t, dx, dz };
    });
    const inner = outline.map((_, i) => {
        const a = sides[(i + n - 1) % n];
        const b = sides[i];
        const det = a.dx * b.dz - a.dz * b.dx;
        const k = ((b.x - a.x) * b.dz - (b.z - a.z) * b.dx) / det;
        return [a.x + k * a.dx, a.z + k * a.dz] as [number, number];
    });
    return outline.map((corner, i) => [
        [corner[0], corner[1]],
        [outline[(i + 1) % n][0], outline[(i + 1) % n][1]],
        inner[(i + 1) % n],
        inner[i],
    ]);
}

/**
 * A mesh of convex pieces in the XZ plane, each fanned from its first corner.
 * @param name - The mesh's name.
 * @param pieces - The pieces' corners, in order.
 * @param scene - Babylon.js scene
 * @returns The mesh.
 */
function piecesMesh(name: string, pieces: readonly (readonly (readonly [number, number])[])[], scene: Scene): Mesh {
    const mesh = new Mesh(name, scene);
    const positions: number[] = [];
    const indices: number[] = [];
    for (const piece of pieces) {
        const first = positions.length / 3;
        for (const [x, z] of piece) {
            positions.push(x, 0, z);
        }
        for (let i = 1; i + 1 < piece.length; i++) {
            indices.push(first, first + i, first + i + 1);
        }
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh);

    return mesh;
}

/** Cytoscape's CROSS_DELTA, 3 long: a delta 2 long and 1 wide at the tip, and a bar 0.25 deep and 1.5 wide at the back. */
const CROSS_DELTA = {
    delta: [
        [0, 0],
        [-2 / 3, -1 / 6],
        [-2 / 3, 1 / 6],
    ] as [number, number][],
    bar: rect(-1, -11 / 12, 0.25),
};

export interface FilledArrowOptions {
    size: number; // Screen-space size in pixels
    color: string; // Hex color
    opacity?: number; // 0-1
    clipEndX?: number; // X-axis clipping: undefined = no clipping, number = clip at X position
}

/** How long a tee cap is along its line, as a fraction of its size: a bar a third as deep as its 1.5 width. */
export const TEE_DEPTH = 0.5;

/**
 * Renderer for filled arrow heads using uniform screen-space scaling
 *
 * Uses the SAME screen-space formula as CustomLineRenderer (* clipPos.w / resolution)
 * to guarantee perfect alignment between lines and filled arrows.
 *
 * Architecture:
 * - Standard polygon meshes (triangles, not quad-strips)
 * - Uniform scaling shader (not perpendicular expansion)
 * - Screen-space sizing formula matches CustomLineRenderer exactly
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Utility class with static state for shader registration
export class FilledArrowRenderer {
    private static shadersRegistered = false;

    /**
     * Every billboarding material, grouped by scene, each scene's group given that scene's
     * camera position once per frame. See {@link PerSceneMaterials} for the defect (issue #45).
     */
    private static readonly cameraTracked = new PerSceneMaterials((scene, materials) => {
        const camera = scene.activeCamera;
        if (!camera) {
            return;
        }

        const cameraPos = camera.globalPosition;
        for (const material of materials) {
            material.setVector3("cameraPosition", cameraPos);
        }
    });

    /**
     * Unregister a shader material so the per-frame camera-uniform walk stops visiting it.
     *
     * WHY THIS EXISTS -- the defect it repairs:
     * {@link FilledArrowRenderer.applyShader} builds a fresh `ShaderMaterial` per mesh and
     * adds it to the per-frame camera walk. Nothing used to remove entries. A `catch` inside
     * that walk read as an eviction path but could not fire: `ShaderMaterial.setVector3` does not throw on a disposed
     * material, it just records the value into a dead material's uniform cache. So every
     * arrowhead and every pattern element ever built stayed in the walk for the lifetime of
     * the page, and since both are rebuilt wholesale on every style change the walk grew
     * without bound.
     *
     * `applyShader` also subscribes to each material's `onDisposeObservable` and calls this,
     * so the eviction happens even for callers that dispose a mesh without going through
     * a renderer -- `Edge.dispose` and `Edge.updateStyle`, for instance, which this unit does
     * not own and must not edit. That subscription is why the leak is closed for arrowheads
     * as well as for patterned lines.
     * @param material - The ShaderMaterial to stop tracking; passing an untracked material is a no-op
     * @public
     */
    static releaseMaterial(material: ShaderMaterial): void {
        this.cameraTracked.delete(material);
    }

    /**
     * Number of shader materials currently receiving per-frame camera updates.
     *
     * Exists so the leak described on {@link FilledArrowRenderer.releaseMaterial} is
     * OBSERVABLE from a test; it has no visible symptom until the frame rate has already
     * collapsed, and asserting on frame time instead would be flaky.
     * @param scene - Count only this scene's materials; omit for every scene
     * @returns Count of tracked materials
     * @public
     */
    static getActiveMaterialCount(scene?: Scene): number {
        return this.cameraTracked.count(scene);
    }

    /**
     * Register filled arrow shaders
     */
    static registerShaders(): void {
        if (this.shadersRegistered) {
            return;
        }

        // Vertex Shader: Tangent Billboarding
        //
        // Tangent billboarding: Arrow aligns with line direction AND rotates around
        // the line axis to always show its face to the camera.
        //
        // Strategy:
        // 1. Extract arrow center position from world matrix
        // 2. Build camera-facing coordinate system:
        //    - forward = line direction (arrow points this way)
        //    - right = perpendicular to both line and camera direction
        //    - up = perpendicular to forward and right (faces camera)
        // 3. Transform arrow vertices using this coordinate system
        // 4. Apply perspective projection
        //
        // Benefits:
        // 1. Arrow points along line (forward direction)
        // 2. Arrow rotates to face camera (around line axis)
        // 3. Arrow visible from ANY camera angle (never edge-on)
        // 4. Arrow base stays fixed (zero gap with line)
        // 5. Natural perspective foreshortening
        Effect.ShadersStore.filledArrowVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;      // Arrow geometry (XY plane, pointing along +X)

// Uniforms
uniform mat4 viewProjection;
uniform vec3 cameraPosition;

// Babylon's own instancing preamble: it declares world0..world3 for an instanced draw, the
// world uniform, and -- for thin instances, which is what a cap batch is -- both, because a
// slot's matrix is relative to the batch mesh's own place under the graph-root transform.
#include<instancesDeclaration>

#ifdef INSTANCES
// Arrow cap batches (ArrowCapBatch): one draw for every cap of an appearance, so the per-cap
// values are instance attributes rather than uniforms.
attribute vec3 arrowDirection; // Line direction
attribute float arrowSize;     // World-space arrow length
attribute vec3 arrowColor;
// Where a pattern segment is cut off, per instance: the last segment of a zigzag or a sinewave is
// clipped to the room left on its line, and -1 leaves a segment (and every arrow cap) whole.
attribute float arrowClip;
varying vec3 vColor;
varying float vClip;
#else
// Individual meshes (pattern elements)
uniform vec3 lineDirection;
uniform float size;
#endif

// Varyings
varying vec3 vLocalPosition;  // Pass local position to fragment shader for clipping

void main() {
    // Pass local position to fragment shader (for shader-based clipping)
    vLocalPosition = position;

    // Declares finalWorld, and multiplies a thin instance's slot matrix by the batch mesh's own
    // world matrix, which is how a batch follows an XR gesture on the graph-root transform.
    #include<instancesVertex>

#ifdef INSTANCES
    vec3 lineDir = arrowDirection;
    // A hidden or handed-back slot holds a ZERO matrix (ArrowCapBatch.hide). Its centre then
    // reads as the world origin, and since this shader builds the cap from the centre and
    // arrowSize, not from the matrix, it would draw a full-size cap there. A placed slot's
    // bottom-right is 1, so a zero there means "draw nothing": collapse the cap to a point.
    float scale = finalWorld[3][3] == 0.0 ? 0.0 : arrowSize;
    vColor = arrowColor;
    vClip = arrowClip;
#else
    vec3 lineDir = lineDirection;
    float scale = size;
#endif

    // Extract arrow center position from world matrix
    vec3 worldCenter = vec3(finalWorld[3][0], finalWorld[3][1], finalWorld[3][2]);

    // Build camera-facing coordinate system
    // This system is aligned with the line but rotates to face the camera
    vec3 forward = normalize(lineDir);                    // Arrow points along line
    vec3 toCamera = normalize(cameraPosition - worldCenter);
    vec3 right = normalize(cross(forward, toCamera));     // Perpendicular to line AND camera
    vec3 up = cross(right, forward);                      // Completes orthonormal basis, faces camera

    // Transform arrow vertex from local space to world space
    // Local space: position.x along +X (forward), position.y along +Y (up)
    // World space: aligned with line, facing camera
    vec3 worldOffset = position.x * forward + position.y * up + position.z * right;
    vec4 worldPos = vec4(worldCenter + worldOffset * scale, 1.0);

    // Transform to clip space
    gl_Position = viewProjection * worldPos;
}
`;

        // Fragment Shader: Simple solid color with optional clipping
        Effect.ShadersStore.filledArrowFragmentShader = `
precision highp float;

// Uniforms
#ifdef INSTANCES
varying vec3 vColor;
varying float vClip;
#else
uniform vec3 color;
uniform float clipEndX;        // X-axis clipping: -1.0 = disabled, >= 0.0 = clip at this X
#endif
uniform float opacity;

// Varyings
varying vec3 vLocalPosition;  // Local position from vertex shader

void main() {
#ifdef INSTANCES
    float clipX = vClip;
#else
    float clipX = clipEndX;
#endif

    // Shader-based clipping: Discard fragments beyond clipX
    // clipX < 0.0 means clipping is disabled
    // Only clip if clipX is meaningfully less than segment length (0.75)
    if (clipX >= 0.0 && clipX < 0.74 && vLocalPosition.x > clipX) {
        discard;
    }

#ifdef INSTANCES
    gl_FragColor = vec4(vColor, opacity);
#else
    gl_FragColor = vec4(color, opacity);
#endif
}
`;

        this.shadersRegistered = true;
    }

    /**
     * Create a filled triangle arrow mesh
     *
     * Geometry is in XY plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * @param inverted - If true, arrow points backward
     * @param scene - Babylon.js scene
     * @returns Created triangle arrow mesh
     */
    static createTriangle(inverted: boolean, scene: Scene): Mesh {
        const mesh = new Mesh("filled-triangle-arrow", scene);

        // Normalized dimensions
        const length = 1;
        const width = EDGE_CONSTANTS.NORMAL_ARROW_ASPECT;

        // Tip at origin, base extends backward
        // This allows positionOffset: 0 to place tip exactly at sphere surface
        const tip = 0;
        const base = inverted ? length : -length;

        // XZ plane (normal in Y), pointing along X axis
        // Y=0 so the face normal points in ±Y, which maps to 'up' (toward camera)
        const positions = [
            tip,
            0,
            0, // Tip at origin
            base,
            0,
            -width / 2, // Bottom corner (at base)
            base,
            0,
            width / 2, // Top corner (at base)
        ];

        const indices = [0, 1, 2]; // One triangle

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a filled diamond arrow mesh
     *
     * Geometry is in XY plane with diamond shape
     * Uses normalized dimensions - actual sizing handled by shader
     * @param scene - Babylon.js scene
     * @returns Created diamond arrow mesh
     */
    static createDiamond(scene: Scene): Mesh {
        const mesh = new Mesh("filled-diamond-arrow", scene);

        // Normalized dimensions
        const length = 1;
        const width = EDGE_CONSTANTS.NORMAL_ARROW_ASPECT;

        // Front tip at origin, extends backward
        // This allows positionOffset: 0 to place front tip exactly at sphere surface
        // XZ plane (normal in Y) so face points toward camera
        const positions = [
            0,
            0,
            0, // Front tip at origin
            -length / 2,
            0,
            width / 2, // Top (at middle)
            -length,
            0,
            0, // Back tip
            -length / 2,
            0,
            -width / 2, // Bottom (at middle)
        ];

        const indices = [
            0,
            1,
            2, // Top half
            0,
            2,
            3, // Bottom half
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a filled box arrow mesh
     *
     * Geometry is in XZ plane as a perfect square
     * Uses normalized dimensions - actual sizing handled by shader
     * @param scene - Babylon.js scene
     * @returns Created box arrow mesh
     */
    static createBox(scene: Scene): Mesh {
        const mesh = new Mesh("filled-box-arrow", scene);

        // Normalized dimensions - perfect square (1.0 x 1.0)
        const size = 1;
        const halfSize = size / 2;

        // Front edge at origin, extends backward
        // This allows positionOffset: 0 to place front edge exactly at sphere surface
        // XZ plane (normal in Y) so face points toward camera
        // Perfect square: size x size
        const positions = [
            -size,
            0,
            halfSize, // Top-left (back)
            0,
            0,
            halfSize, // Top-right at origin (front)
            0,
            0,
            -halfSize, // Bottom-right at origin (front)
            -size,
            0,
            -halfSize, // Bottom-left (back)
        ];

        const indices = [
            0,
            1,
            2, // First triangle
            0,
            2,
            3, // Second triangle
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a filled circle arrow mesh
     *
     * Geometry is in XZ plane as a circle (Y=0)
     * Uses normalized dimensions - actual sizing handled by shader
     * Follows the same pattern as all other filled arrows (normal, diamond, box)
     * @param scene - Babylon.js scene
     * @param segments - Number of segments for circle smoothness (default: 32)
     * @returns Created circle arrow mesh
     */
    static createCircle(scene: Scene, segments = 32): Mesh {
        const mesh = new Mesh("filled-circle-arrow", scene);

        // Normalized radius
        // Diameter = 1.0 to match other arrows' normalized length (triangle/diamond/box all extend 1.0 unit)
        const radius = 0.5;

        const positions: number[] = [0, 0, 0]; // Center point at origin
        const indices: number[] = [];

        // Generate circle vertices in XZ plane (Y=0)
        // This follows the same pattern as normal/diamond/box arrows
        // Face normal points in ±Y direction, which maps to "up" (toward camera) in shader
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            positions.push(
                Math.cos(angle) * radius, // X → forward (along line direction)
                0, // Y = 0 (face normal in ±Y, toward camera)
                Math.sin(angle) * radius, // Z → right (perpendicular to line)
            );
        }

        // Generate triangle fan indices
        for (let i = 1; i <= segments; i++) {
            indices.push(
                0, // Center
                i, // Current point
                i + 1, // Next point
            );
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a vee arrow mesh (V-shaped)
     *
     * Geometry is in XZ plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * V-shape: a triangle whose baseline's middle is pushed half its length toward the tip, the
     * vee Graphviz (lib/common/arrows.c arrow_type_crow0, its inner corner at 0.5 of the arrow),
     * Cytoscape.js (vee: (0, -0.15) of a 0.3 arrow) and vis-network (Vee: (-0.5, 0)) draw
     * @param scene - Babylon.js scene
     * @returns Created vee arrow mesh
     */
    static createVee(scene: Scene): Mesh {
        const mesh = new Mesh("filled-vee-arrow", scene);

        // Normalized dimensions
        const length = 1;
        const width = EDGE_CONSTANTS.NORMAL_ARROW_ASPECT;

        // Tip at origin, base extends backward
        const tip = 0;
        const base = -length;

        // Middle point: the baseline's center pushed half the length toward the tip
        const middleX = base + 0.5 * length;

        // XZ plane (normal in Y), pointing along X axis
        // 4 vertices to form V-shape (2 triangles)
        const positions = [
            tip,
            0,
            0, // 0: Tip at origin
            base,
            0,
            -width / 2, // 1: Base left corner
            middleX,
            0,
            0, // 2: Middle point (pushed toward tip)
            base,
            0,
            width / 2, // 3: Base right corner
        ];

        // Two triangles forming V-shape
        const indices = [
            0,
            1,
            2, // Left triangle: tip → base-left → middle
            0,
            2,
            3, // Right triangle: tip → middle → base-right
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a tee arrow mesh (thin horizontal bar)
     *
     * Geometry is in XZ plane as a 3:1 rectangle (wide and shallow)
     * Uses normalized dimensions - actual sizing handled by shader
     * @param scene - Babylon.js scene
     * @returns Created tee arrow mesh
     */
    static createTee(scene: Scene): Mesh {
        const mesh = new Mesh("filled-tee-arrow", scene);

        // Normalized dimensions - 3:1 rectangle (width:depth), 50% larger than base size
        const width = 1.5; // Z-axis (horizontal span)
        const depth = TEE_DEPTH; // X-axis (shallow depth) = width / 3
        const halfWidth = width / 2;

        // Front edge at origin, extends backward
        // This allows positionOffset: 0 to place front edge exactly at sphere surface
        // XZ plane (normal in Y) so face points toward camera
        const positions = [
            -depth,
            0,
            halfWidth, // Top-left (back)
            0,
            0,
            halfWidth, // Top-right at origin (front)
            0,
            0,
            -halfWidth, // Bottom-right at origin (front)
            -depth,
            0,
            -halfWidth, // Bottom-left (back)
        ];

        const indices = [
            0,
            1,
            2, // First triangle
            0,
            2,
            3, // Second triangle
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a half-open arrow mesh (half of a vee - one arm)
     *
     * Geometry is in XZ plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * Half-vee: One side of the V-shape
     * @param scene - Babylon.js scene
     * @returns Created half-open arrow mesh
     */
    static createHalfOpen(scene: Scene): Mesh {
        const mesh = new Mesh("filled-half-open-arrow", scene);

        // Normalized dimensions (same as vee)
        const length = 1;
        const width = 0.8;

        // Tip at origin, base extends backward
        const tip = 0;
        const base = -length;

        // Middle point: pushed 60% toward tip (deeper than the vee's half)
        const middleX = -HALF_OPEN_MEETS;

        // XZ plane (normal in Y), pointing along X axis
        // Only one side of the V (3 vertices forming 1 triangle)
        const positions = [
            tip,
            0,
            0, // 0: Tip at origin
            base,
            0,
            -width / 2, // 1: Base left corner
            middleX,
            0,
            0, // 2: Middle point (pushed toward tip)
        ];

        // One triangle forming half of the V
        const indices = [
            0,
            1,
            2, // Tip → base-left → middle
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create a crow arrow mesh (crow's foot)
     *
     * Geometry is in XZ plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * Crow's foot: a reversed vee (shared point at the back on the line, corners at the front near
     * the node) whose inner corner sits 0.6 of the length from the base toward the back, plus a
     * narrow center prong pointing at the node
     * @param scene - Babylon.js scene
     * @returns Created crow arrow mesh
     */
    static createCrow(scene: Scene): Mesh {
        const mesh = new Mesh("filled-crow-arrow", scene);

        // Normalized dimensions
        const length = 1;
        const width = 0.8;

        // ROTATED 180 degrees: Tip at back (touching line), base at front (near node)
        const tip = -length; // Tip now at back
        const base = 0; // Base now at front

        // Middle point: pushed 60% from base toward tip
        const middleX = base + 0.6 * (tip - base); // 0 + 0.6 * (-1.0) = -0.6

        // Width of center prong at base
        const centerProngWidth = 0.2;
        // Center prong base position (moved forward from tip to avoid obscuring vee tip)
        const centerProngBaseX = -0.6;

        // XZ plane (normal in Y), pointing along X axis
        // 7 vertices to form crow's foot shape (3 triangles)
        // Left and right prongs point toward node, center prong points toward line
        const positions = [
            tip,
            0,
            0, // 0: Shared tip for left/right prongs (at back, touching line)
            base,
            0,
            -width / 2, // 1: Base left corner (at front, near node)
            middleX,
            0,
            0, // 2: Middle point (pushed toward tip)
            base,
            0,
            width / 2, // 3: Base right corner (at front, near node)
            centerProngBaseX,
            0,
            -centerProngWidth / 2, // 4: Center prong base left edge (shortened, doesn't reach vee tip)
            centerProngBaseX,
            0,
            centerProngWidth / 2, // 5: Center prong base right edge (shortened, doesn't reach vee tip)
            base,
            0,
            0, // 6: Center prong tip (at front, near node)
        ];

        // Three triangles forming crow's foot
        const indices = [
            0,
            1,
            2, // Left triangle: tip → base-left → middle
            0,
            2,
            3, // Right triangle: tip → middle → base-right
            6,
            4,
            5, // Center prong (flipped): tip at front → base-left at back → base-right at back
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * The arrow types drawn from a list of convex pieces (`polygonArrow`), each piece in the XZ
     * plane with the tip at the origin and the arrow reaching back to x = -1:
     *
     * - "half-circle": a filled half disc, its flat side across the tip and its round side back
     *   along the line (Cytoscape's HALF_CIRCLE), twice as wide as it is long.
     * - "open-half-circle": the round side of that half disc alone, an arc opening toward the node
     *   (Cytoscape's OPEN_HALF_CIRCLE, vis-network's inv_curve).
     * - "curve": the same arc turned round, bulging toward the node (vis-network's curve).
     * - "triangle-tee": a triangle with a bar behind it (Cytoscape.js's triangle-tee).
     * - "triangle-cross": a triangle with a thin bar across the line behind it (triangle-cross).
     * - "circle-triangle": a dot at the tip with a triangle behind it pointing at it (circle-triangle).
     * - "half-open-flipped": half-open's one arm on the line's other side (Cytoscape's HALF_BOTTOM).
     * - "cross-delta": a delta with a bar across the line a little behind it (Cytoscape's CROSS_DELTA).
     * - "open-cross-delta": the delta outlined, with the bar (Cytoscape's CROSS_OPEN_DELTA).
     * - "half-barb": half-open's arm as one thin stroke, a strip a tenth of its length thick from the tip back to
     *   its corner (Cytoscape's HALF_TOP, which Cytoscape strokes where Graphviz's halfopen is a filled wedge).
     * - "half-barb-flipped": that barb on the line's other side (Cytoscape's HALF_BOTTOM).
     * - "inverted-vee": a vee turned round, its point back on the line, its corners at the tip and its notch a quarter
     *   back from them, with no tine along the line (vis-network's crow).
     */
    static readonly POLYGON_ARROWS: Readonly<Record<string, () => readonly (readonly [number, number])[][]>> = {
        "half-circle": () => [arc(0, 1, 0, Math.PI / 2, (3 * Math.PI) / 2)],
        "open-half-circle": () => band(0, 1, 0.75, Math.PI / 2, (3 * Math.PI) / 2),
        curve: () => band(-1, 1, 0.75, -Math.PI / 2, Math.PI / 2),
        "triangle-tee": () => [
            [
                [0, 0],
                [-0.6, -0.3],
                [-0.6, 0.3],
            ],
            rect(-1, -0.8, 0.3),
        ],
        "triangle-cross": () => [
            [
                [0, 0],
                [-0.75, -0.375],
                [-0.75, 0.375],
            ],
            rect(-1, -0.92, 0.375),
        ],
        "circle-triangle": () => [
            arc(-0.25, 0.25, 0, 0, 2 * Math.PI),
            [
                [-0.5, 0],
                [-1, -0.25],
                [-1, 0.25],
            ],
        ],
        // half-open's arm (tip, base corner, middle) reflected across the line, wound the same way
        "half-open-flipped": () => [
            [
                [0, 0],
                [-HALF_OPEN_MEETS, 0],
                [-1, 0.4],
            ],
        ],
        // half-open's arm (tip on the line, back corner at z -0.4) as a strip HALF_BARB long along the line, each
        // piece wound as half-open's triangle is
        "half-barb": () => [
            [
                [0, 0],
                [-1 + HALF_BARB, -0.4],
                [-1, -0.4],
                [-HALF_BARB, 0],
            ],
        ],
        "half-barb-flipped": () => [
            [
                [0, 0],
                [-HALF_BARB, 0],
                [-1, 0.4],
                [-1 + HALF_BARB, 0.4],
            ],
        ],
        // vis-network's crow (EndPoints.ts Crow: -1,0 0,0.5 -0.25,0 0,-0.5), as wide as the vee: two triangles
        // meeting along the line from the point to the notch
        "inverted-vee": () => [
            [
                [-1, 0],
                [-0.25, 0],
                [0, -EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
            ],
            [
                [-1, 0],
                [0, EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
                [-0.25, 0],
            ],
        ],
        // Cytoscape's CROSS_DELTA: a delta with a bar across the line behind it, a gap between them
        "cross-delta": () => [CROSS_DELTA.delta, CROSS_DELTA.bar],
        // CROSS_OPEN_DELTA: the same outlined, its 0.25 stroke a twelfth of its length; the bar it strokes is solid
        "open-cross-delta": () => [...frame(CROSS_DELTA.delta, 1 / 12), rect(-1, -5 / 6, 0.25)],
    };

    /**
     * Build one of {@link POLYGON_ARROWS}: each convex piece fanned from its first corner.
     * @param type - The arrow type.
     * @param scene - Babylon.js scene
     * @returns The mesh, in the XZ plane like every other arrow.
     */
    static createPolygonArrow(type: string, scene: Scene): Mesh {
        return piecesMesh(`filled-${type}-arrow`, this.POLYGON_ARROWS[type](), scene);
    }

    /**
     * The open caps, each a shape's outline drawn as a frame inside it, in the cap's frame (tip at the origin, back
     * along -x) before its width (`ArrowStyle.width`) is applied:
     *
     * - "open-normal": the triangle's outline (Graphviz's onormal, Cytoscape.js's hollow triangle).
     * - "open-diamond": the diamond's outline (odiamond).
     * - "open-dot": the dot's ring, centred on the origin (odot).
     * - "open-inverted": the inverted triangle's outline, its base across the tip (oinv).
     * - "open-box": the box's outline (obox, Cytoscape's OPEN_SQUARE).
     *
     * Graphviz and Cytoscape.js stroke an open arrow with its edge's own pen, so the frame is as thick as the line
     * (issue #4253); {@link createOpenOutline} takes that thickness.
     */
    static readonly OPEN_OUTLINES: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
        "open-normal": [
            [0, 0],
            [-1, -EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
            [-1, EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
        ],
        "open-diamond": [
            [0, 0],
            [-0.5, EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
            [-1, 0],
            [-0.5, -EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
        ],
        "open-dot": arc(0, 0.5, 0, 0, 2 * Math.PI).slice(1, -1),
        "open-inverted": [
            [0, -EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
            [0, EDGE_CONSTANTS.NORMAL_ARROW_ASPECT / 2],
            [-1, 0],
        ],
        "open-box": rect(-1, 0, 0.5),
    };

    /**
     * Build one of {@link OPEN_OUTLINES}: its outline widened, then drawn as a frame `stroke` thick inside it. The frame
     * is never more than half the way to the shape's middle, so the shape always reads as open.
     * @param type - The arrow type.
     * @param scene - Babylon.js scene
     * @param stroke - How thick the frame is, in the cap's own lengths (its line's width over the cap's length).
     * @param breadth - How wide the cap is across its line, as a multiple of its own (`ArrowStyle.width`).
     * @returns The mesh, in the XZ plane like every other arrow.
     */
    static createOpenOutline(type: string, scene: Scene, stroke = OPEN_FRAME, breadth = 1): Mesh {
        const outline = this.OPEN_OUTLINES[type].map(([x, z]) => [x, z * breadth] as [number, number]);
        // how far the middle (the corners' mean) is from the nearest side
        const [cx, cz] = outline.reduce(
            ([x, z], [px, pz]) => [x + px / outline.length, z + pz / outline.length],
            [0, 0],
        );
        const inner = Math.min(
            ...outline.map(([x, z], i) => {
                const [x1, z1] = outline[(i + 1) % outline.length];
                return Math.abs((x1 - x) * (cz - z) - (z1 - z) * (cx - x)) / Math.hypot(x1 - x, z1 - z);
            }),
        );
        return piecesMesh(`filled-${type}-arrow`, frame(outline, Math.min(stroke, inner / 2)), scene);
    }

    /**
     * Apply the filled arrow shader to a mesh
     *
     * Uses tangent billboarding: arrow aligns with line direction in screen space.
     * lineDirection is passed as a uniform.
     * @param mesh - Mesh to apply shader to
     * @param options - Styling options
     * @param scene - Babylon.js scene
     * @returns Mesh with shader material applied
     */
    static applyShader(mesh: Mesh, options: FilledArrowOptions, scene: Scene): Mesh {
        this.registerShaders();

        // Create shader material
        const shaderMaterial = new ShaderMaterial(
            "filledArrowMaterial",
            scene,
            {
                vertex: "filledArrow",
                fragment: "filledArrow",
            },
            {
                attributes: ["position"],
                uniforms: [
                    "world",
                    "viewProjection",
                    "cameraPosition",
                    "size",
                    "color",
                    "opacity",
                    "lineDirection", // Now a uniform instead of per-instance attribute
                    "clipEndX", // X-axis clipping for pattern segments
                ],
            },
        );

        // Set uniforms
        const colorObj = Color3.FromHexString(options.color);
        shaderMaterial.setVector3("color", new Vector3(colorObj.r, colorObj.g, colorObj.b));
        shaderMaterial.setFloat("size", options.size);
        shaderMaterial.setFloat("opacity", options.opacity ?? 1);

        // Initialize lineDirection to a default value (will be updated per-edge)
        shaderMaterial.setVector3("lineDirection", new Vector3(1, 0, 0));

        // Set clipping uniform (default -1.0 = disabled)
        shaderMaterial.setFloat("clipEndX", options.clipEndX ?? -1);

        // Register material for its own scene's camera position updates; the registration ends
        // when the material is disposed. See releaseMaterial and PerSceneMaterials.
        this.cameraTracked.add(shaderMaterial);

        // THE SCENE-WIDE SCAN THIS AVOIDS. Every property setter on a Babylon material that can change
        // its shader defines -- `backFaceCulling` among them -- calls `markAsDirty`, which walks EVERY
        // submesh of EVERY mesh in the scene looking for the ones drawn with this material. This
        // material is brand new and drawn by nothing yet, so the walk finds nothing, and with one
        // material per mesh (every arrow head, before arrow heads were instances of one source mesh
        // per batch; every pattern element still) the walk runs once per mesh over a scene that grows:
        // loading E edges cost E x (all meshes so far), which is why 2,000 nodes / 20,000 edges took
        // 21 s and 10,000 nodes never finished (issue #388; 94 % of the load's CPU profile was this
        // one walk). Blocking the material's dirty mechanism makes the setter a plain field write.
        //
        // It stays blocked for the material's life, on purpose. The mechanism exists so a material
        // whose defines changed gets its effect rebuilt; a ShaderMaterial re-derives its defines on
        // every readiness check (`isReadyForSubMesh` compares the joined defines to the compiled
        // effect's and recompiles on a difference), so it never needs the flag, and nothing here
        // sets a define-changing property after this line: the per-edge state is uniforms, which
        // `setFloat` / `setVector3` write without marking anything dirty.
        shaderMaterial.blockDirtyMechanism = true;
        shaderMaterial.backFaceCulling = false;
        mesh.material = shaderMaterial;

        this.applyShaderBoundingInfo(mesh, options.size);

        return mesh;
    }

    /**
     * Resize a shadered mesh's bounding volume to match what the vertex shader actually draws,
     * so Babylon's frustum culling can be trusted to keep it.
     *
     * WHY THIS EXISTS -- the defect it repairs, and the defect it is careful NOT to cause:
     *
     * This line used to read `mesh.alwaysSelectAsActiveMesh = true`, with a comment
     * explaining that thin instances needed it because their base mesh was parked at
     * y = -10000. Both halves of that comment are now false. This function is reached from
     * `applyShader`, which builds one mesh per pattern element -- positioned at the real element
     * location by `PatternedLineMesh` -- never on a parked template; and the `MeshCache` template that genuinely does sit at
     * y = -10000 holds NODE meshes and never reaches this function. The flag's effect was that
     * every mesh carrying this shader is submitted every frame regardless of where the camera
     * is pointing -- which, at the mesh counts a dotted line used to reach, was thousands of
     * pointless draw calls per frame.
     *
     * Deleting the flag outright would nevertheless have been wrong, and this is the part
     * worth reading twice. The vertex shader ignores the mesh's rotation and scaling
     * entirely: it takes only the TRANSLATION out of the world matrix and then lays each
     * vertex out as `worldCenter + (x*forward + y*up + z*right) * size`. So the geometry is
     * magnified by the `size` uniform on the GPU, while Babylon's CPU-side bounding volume
     * still describes the un-magnified geometry. For a pattern dot the geometry is 2.0 across
     * and `size` is `lineWidth / 2`, so at the default line width the drawn dot is four times
     * the radius Babylon thinks it is. Culling against the small volume would have popped
     * arrowheads and dots out of existence near the edges of the screen -- exactly the
     * "meshes vanishing" symptom the flag was added to suppress, reintroduced by its removal.
     *
     * The fix is therefore to tell Babylon the truth rather than to switch culling off. The
     * billboard basis is orthonormal but freely oriented, so the drawn geometry is contained
     * in a sphere about the mesh origin of radius `size * maxVertexDistanceFromOrigin`; a cube
     * of that half-extent contains that sphere for every possible orientation. The bound is
     * deliberately conservative -- it over-estimates rather than under-estimates, because an
     * over-estimate costs a wasted draw call at the screen edge while an under-estimate makes
     * an arrowhead disappear.
     *
     * If the mesh has no geometry yet, the flag is restored for that mesh: there is nothing
     * to measure, and never culling is the safe answer.
     * @param mesh - Mesh whose material was just replaced with the billboarding shader
     * @param size - The shader's `size` uniform, the factor its vertex stage scales geometry by
     */
    private static applyShaderBoundingInfo(mesh: AbstractMesh, size: number): void {
        const info = mesh.getBoundingInfo();
        const { minimum, maximum } = info.boundingBox;

        // Bound the distance from the mesh origin to the furthest vertex. Using the box
        // corners over-estimates that distance by at most sqrt(3), which is the safe
        // direction to be wrong in.
        const reach = Math.max(minimum.length(), maximum.length()) * Math.abs(size);

        if (!Number.isFinite(reach) || reach <= 0) {
            // No geometry to measure (or a degenerate size). Fall back to never culling this
            // mesh, which is what the whole shader path did before this repair.
            mesh.alwaysSelectAsActiveMesh = true;
            return;
        }

        mesh.alwaysSelectAsActiveMesh = false;
        mesh.setBoundingInfo(new BoundingInfo(new Vector3(-reach, -reach, -reach), new Vector3(reach, reach, reach)));
    }
    /**
     * Draw one arrow cap as a slot in its scene's batch for `key`, building that batch's mesh
     * with `build` the first time the scene needs it.
     *
     * WHY -- issues #25 and #419: every cap used to be its own `Mesh` with its own material, so
     * N capped edges cost N draw calls a frame, N materials, and (through issue #27) O(N^2) to
     * load. Batching them as `InstancedMesh`es fixed the draw calls and the materials and left a
     * scene object per cap; as a thin instance a cap is rows in the batch's own arrays and
     * nothing else, which is what lets the element's declared edge ceiling rise.
     * @param scene - The scene the cap is drawn in
     * @param key - What the batch's caps have in common: shape, and whatever else lives on the material
     * @param build - Builds the mesh (with its material) for a new batch
     * @param options - The cap's scale, and whether its batch carries per-instance appearance
     * @param options.scale - The uniform scale the cap's normalized geometry is drawn at
     * @param options.billboard - Whether the batch reads direction, size and colour per instance
     * @returns The cap: one slot of the batch
     */
    static capOf(
        scene: Scene,
        key: string,
        build: () => Mesh,
        options: { scale: number; billboard: boolean },
    ): ArrowCap {
        return new ArrowCap(arrowCapBatch(scene, key, build, options.billboard), options.scale);
    }

    /**
     * Draw one billboarded 3D arrow cap as a slot in its scene's batch for that shape and
     * opacity. The direction, size and colour are the slot's own attributes, so caps of every
     * colour and size share one draw call.
     * @param shape - The arrow type, which names the batch's geometry
     * @param createShape - Builds that geometry, for a new batch
     * @param options - The cap's size (world-space length), colour and opacity
     * @param scene - Babylon.js scene
     * @returns The cap; point it with {@link ArrowCap.place}
     */
    static createArrowCap(shape: string, createShape: () => Mesh, options: FilledArrowOptions, scene: Scene): ArrowCap {
        const opacity = options.opacity ?? 1;
        const cap = this.capOf(
            scene,
            `3d|${shape}|${String(opacity)}`,
            () => this.applyInstancedShader(createShape(), opacity, scene),
            { scale: options.size, billboard: true },
        );

        cap.setAppearance(options.size, options.color);

        return cap;
    }

    /**
     * Give a batch's mesh the billboard shader, reading direction, size and colour from
     * per-instance buffers instead of uniforms.
     * @param mesh - The batch's mesh
     * @param opacity - The opacity every cap in the batch is drawn at
     * @param scene - Babylon.js scene
     * @returns The same mesh
     */
    static applyInstancedShader(mesh: Mesh, opacity: number, scene: Scene): Mesh {
        this.registerShaders();

        const material = new ShaderMaterial(
            "filledArrowMaterial",
            scene,
            { vertex: "filledArrow", fragment: "filledArrow" },
            {
                attributes: ["position", "arrowDirection", "arrowSize", "arrowColor", "arrowClip"],
                // `world` is the batch mesh's own transform, which Babylon's instancing include
                // multiplies a thin instance's slot matrix by. Without it in this list the
                // include declares the uniform and nothing ever writes it, so the whole batch
                // would sit at the origin and ignore `graph-root`.
                uniforms: ["world", "viewProjection", "cameraPosition", "opacity"],
            },
        );
        material.setFloat("opacity", opacity);
        this.cameraTracked.add(material);
        // See applyShader (issue #388).
        material.blockDirtyMechanism = true;
        material.backFaceCulling = false;

        mesh.material = material;
        // Below 1 this is what puts the batch in the alpha-blended queue, as it did each cap.
        mesh.visibility = opacity;

        return mesh;
    }

    /**
     * Create a 2D arrow mesh with flat StandardMaterial
     *
     * This method reuses the same geometry creation logic as 3D arrows
     * but applies a 2D StandardMaterial instead of billboarded ShaderMaterial.
     * @param type - Arrow type (normal, diamond, box, dot, vee, tee, etc.)
     * @param length - Arrow length in world units
     * @param _width - Arrow width in world units (reserved for future use)
     * @param color - Hex color string
     * @param opacity - Opacity value 0-1
     * @param scene - Babylon.js scene
     * @returns Mesh with StandardMaterial and XY plane rotation
     */
    static create2DArrow(
        type: string,
        length: number,
        _width: number,
        color: string,
        opacity: number,
        scene: Scene,
    ): Mesh {
        // Get the appropriate geometry for the arrow type
        const geometry = this.getGeometryForType(type, scene);

        // Create mesh and apply geometry
        const mesh = new Mesh(`arrow-2d-${type}`, scene);
        geometry.applyToMesh(mesh);

        // Scale the mesh to desired size
        // Use uniform scaling to match 3D shader behavior (worldOffset * size)
        // The arrow geometry already has correct proportions, we just scale it uniformly
        mesh.scaling.setAll(length);

        // Apply 2D material (StandardMaterial + XY rotation)
        MaterialHelper.apply2DMaterial(mesh, color, opacity, scene);

        return mesh;
    }

    /**
     * Get geometry for a specific arrow type
     *
     * This extracts geometry creation from the existing create* methods
     * to enable reuse between 2D and 3D arrow creation.
     * @param type - Arrow type
     * @param scene - Babylon.js scene
     * @returns VertexData for the arrow geometry
     */
    private static getGeometryForType(type: string, scene: Scene): VertexData {
        let mesh: Mesh;

        switch (type) {
            case "normal":
                mesh = this.createTriangle(false, scene);
                break;
            case "inverted":
                mesh = this.createTriangle(true, scene);
                break;
            case "diamond":
                mesh = this.createDiamond(scene);
                break;
            case "box":
                mesh = this.createBox(scene);
                break;
            case "dot":
            case "sphere-dot": // 2D mode: sphere-dot uses circle geometry with StandardMaterial
                mesh = this.createCircle(scene);
                break;
            case "vee":
                mesh = this.createVee(scene);
                break;
            case "tee":
                mesh = this.createTee(scene);
                break;
            case "crow":
                mesh = this.createCrow(scene);
                break;
            case "half-open":
                mesh = this.createHalfOpen(scene);
                break;
            default:
                // a polygon arrow or an open one by its table, and any other as the normal triangle
                if (type in this.POLYGON_ARROWS) {
                    mesh = this.createPolygonArrow(type, scene);
                } else if (type in this.OPEN_OUTLINES) {
                    mesh = this.createOpenOutline(type, scene);
                } else {
                    mesh = this.createTriangle(false, scene);
                }
        }

        // Extract vertex data from the temporary mesh
        const geometry = VertexData.ExtractFromMesh(mesh);

        // Dispose the temporary mesh
        mesh.dispose();

        return geometry;
    }
}
