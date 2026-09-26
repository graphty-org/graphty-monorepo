// Installs Mesh.prototype.createInstance, which the arrowhead batches call. See MeshCache.ts.
import "@babylonjs/core/Meshes/instancedMesh";

import {
    type AbstractMesh,
    BoundingInfo,
    Color3,
    Effect,
    InstancedMesh,
    Mesh,
    Scene,
    ShaderMaterial,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import { MaterialHelper } from "./MaterialHelper";
import { PerSceneMaterials } from "./PerSceneMaterials";

export interface FilledArrowOptions {
    size: number; // Screen-space size in pixels
    color: string; // Hex color
    opacity?: number; // 0-1
    clipEndX?: number; // X-axis clipping: undefined = no clipping, number = clip at X position
}

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
     * The arrowhead batches: per scene, one hidden source mesh per batch key. See
     * {@link FilledArrowRenderer.instanceOf}.
     */
    private static readonly batches = new WeakMap<Scene, Map<string, Mesh>>();

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

#ifdef INSTANCES
// Arrowhead batches (FilledArrowRenderer.instanceOf): one draw for every edge's head, so the
// per-edge values are instance attributes rather than uniforms.
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
attribute vec3 arrowDirection; // Line direction
attribute float arrowSize;     // World-space arrow length
attribute vec3 arrowColor;
varying vec3 vColor;
#else
// Individual meshes (pattern elements)
uniform mat4 world;
uniform vec3 lineDirection;
uniform float size;
#endif

// Varyings
varying vec3 vLocalPosition;  // Pass local position to fragment shader for clipping

void main() {
    // Pass local position to fragment shader (for shader-based clipping)
    vLocalPosition = position;

#ifdef INSTANCES
    mat4 finalWorld = mat4(world0, world1, world2, world3);
    vec3 lineDir = arrowDirection;
    float scale = arrowSize;
    vColor = arrowColor;
#else
    mat4 finalWorld = world;
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
#else
uniform vec3 color;
#endif
uniform float opacity;
uniform float clipEndX;        // X-axis clipping: -1.0 = disabled, >= 0.0 = clip at this X

// Varyings
varying vec3 vLocalPosition;  // Local position from vertex shader

void main() {
    // Shader-based clipping: Discard fragments beyond clipEndX
    // clipEndX < 0.0 means clipping is disabled
    // Only clip if clipEndX is meaningfully less than segment length (0.75)
    if (clipEndX >= 0.0 && clipEndX < 0.74 && vLocalPosition.x > clipEndX) {
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
        const length = 1.0;
        const width = 0.8;

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
        const length = 1.0;
        const width = 0.8;

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
        const size = 1.0;
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
     * V-shape: Triangle with middle baseline point pushed 2/3 toward tip
     * @param scene - Babylon.js scene
     * @returns Created vee arrow mesh
     */
    static createVee(scene: Scene): Mesh {
        const mesh = new Mesh("filled-vee-arrow", scene);

        // Normalized dimensions
        const length = 1.0;
        const width = 0.8;

        // Tip at origin, base extends backward
        const tip = 0;
        const base = -length;

        // Middle point: starts at center of baseline, pushed 60% toward tip (2/3 - 10%)
        const middleX = base + 0.6 * length; // -1.0 + 0.6 = -0.4

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
        const depth = width / 3; // X-axis (shallow depth) = 0.5
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
        const length = 1.0;
        const width = 0.8;

        // Tip at origin, base extends backward
        const tip = 0;
        const base = -length;

        // Middle point: pushed 60% toward tip (same as vee)
        const middleX = base + 0.6 * length; // -0.4

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
     * Create a crow arrow mesh (V-shaped) - EXACT COPY OF VEE
     *
     * Geometry is in XZ plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * V-shape: Triangle with middle baseline point pushed 2/3 toward tip
     * @param scene - Babylon.js scene
     * @returns Created crow arrow mesh
     */
    static createCrow(scene: Scene): Mesh {
        const mesh = new Mesh("filled-crow-arrow", scene);

        // Normalized dimensions
        const length = 1.0;
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
     * Create an open normal arrow mesh (hollow triangle outline)
     *
     * Geometry is in XZ plane pointing towards +X axis
     * Uses normalized dimensions - actual sizing handled by shader
     * Creates a single hollow shape with clean corners using inner/outer vertices
     * @param scene - Babylon.js scene
     * @returns Created open normal arrow mesh
     */
    static createOpenNormal(scene: Scene): Mesh {
        const mesh = new Mesh("filled-open-normal-arrow", scene);

        // Normalized dimensions
        const length = 1.0;
        const width = 0.8;
        const insetFactor = 0.225; // How much to inset inner triangle (22.5% toward center) - matches open-diamond thickness

        // Outer triangle vertices
        const v0 = { x: 0, z: 0 }; // Tip
        const v1 = { x: -length, z: -width / 2 }; // Bottom-left
        const v2 = { x: -length, z: width / 2 }; // Top-right

        // Calculate centroid
        const centerX = (v0.x + v1.x + v2.x) / 3;
        const centerZ = (v0.z + v1.z + v2.z) / 3;

        // Inner triangle vertices (moved toward center by insetFactor)
        const v3 = { x: v0.x + (centerX - v0.x) * insetFactor, z: v0.z + (centerZ - v0.z) * insetFactor };
        const v4 = { x: v1.x + (centerX - v1.x) * insetFactor, z: v1.z + (centerZ - v1.z) * insetFactor };
        const v5 = { x: v2.x + (centerX - v2.x) * insetFactor, z: v2.z + (centerZ - v2.z) * insetFactor };

        // Build positions array (outer vertices, then inner vertices)
        const positions = [
            v0.x,
            0,
            v0.z, // 0: Tip (outer)
            v1.x,
            0,
            v1.z, // 1: Bottom-left (outer)
            v2.x,
            0,
            v2.z, // 2: Top-right (outer)
            v3.x,
            0,
            v3.z, // 3: Tip (inner)
            v4.x,
            0,
            v4.z, // 4: Bottom-left (inner)
            v5.x,
            0,
            v5.z, // 5: Top-right (inner)
        ];

        // Create triangle strips connecting outer and inner vertices
        // Each edge forms 2 triangles (a quad strip)
        const indices = [
            // Edge 0->1 (tip to bottom-left)
            0, 3, 4, 0, 4, 1,
            // Edge 1->2 (bottom-left to top-right)
            1, 4, 5, 1, 5, 2,
            // Edge 2->0 (top-right to tip)
            2, 5, 3, 2, 3, 0,
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create an open circle arrow mesh (hollow circle outline)
     *
     * Geometry is in XZ plane as a circle (Y=0)
     * Uses normalized dimensions - actual sizing handled by shader
     * Creates a hollow circle with clean edges using inner/outer vertices (same pattern as open-normal and open-diamond)
     * @param scene - Babylon.js scene
     * @param segments - Number of segments for circle smoothness (default: 32)
     * @returns Created open circle arrow mesh
     */
    static createOpenCircle(scene: Scene, segments = 32): Mesh {
        const mesh = new Mesh("filled-open-circle-arrow", scene);

        // Normalized radius (diameter = 1.0 to match other arrows)
        const outerRadius = 0.5;
        const insetFactor = 0.225; // How much to inset inner circle (22.5% toward center) - matches open-diamond and open-normal thickness

        // Calculate inner radius
        const innerRadius = outerRadius * (1.0 - insetFactor);

        const positions: number[] = [];
        const indices: number[] = [];

        // Generate outer circle vertices in XZ plane (Y=0)
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            positions.push(
                Math.cos(angle) * outerRadius, // X → forward (along line direction)
                0, // Y = 0 (face normal in ±Y, toward camera)
                Math.sin(angle) * outerRadius, // Z → right (perpendicular to line)
            );
        }

        // Generate inner circle vertices
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            positions.push(
                Math.cos(angle) * innerRadius, // X → forward (along line direction)
                0, // Y = 0 (face normal in ±Y, toward camera)
                Math.sin(angle) * innerRadius, // Z → right (perpendicular to line)
            );
        }

        // Create triangle strip connecting outer and inner circles
        // Each segment forms 2 triangles (a quad strip)
        for (let i = 0; i < segments; i++) {
            const outerCurrent = i;
            const outerNext = i + 1;
            const innerCurrent = i + segments + 1;
            const innerNext = i + segments + 2;

            // First triangle: outer-current → inner-current → inner-next
            indices.push(outerCurrent, innerCurrent, innerNext);
            // Second triangle: outer-current → inner-next → outer-next
            indices.push(outerCurrent, innerNext, outerNext);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Create an open-diamond arrow mesh (hollow diamond outline)
     *
     * Geometry is in XZ plane
     * Uses normalized dimensions - actual sizing handled by shader
     * Creates a single hollow shape with clean corners using inner/outer vertices
     * @param scene - Babylon.js scene
     * @returns Created open diamond arrow mesh
     */
    static createOpenDiamond(scene: Scene): Mesh {
        const mesh = new Mesh("filled-open-diamond-arrow", scene);

        // Normalized dimensions (same as filled diamond)
        const length = 1.0;
        const width = 0.8;
        const insetFactor = 0.225; // How much to inset inner diamond (22.5% toward center) - 50% thicker than original 0.15

        // Outer diamond vertices
        const v0 = { x: 0, z: 0 }; // Front tip
        const v1 = { x: -length / 2, z: width / 2 }; // Top
        const v2 = { x: -length, z: 0 }; // Back tip
        const v3 = { x: -length / 2, z: -width / 2 }; // Bottom

        // Calculate centroid
        const centerX = (v0.x + v1.x + v2.x + v3.x) / 4;
        const centerZ = (v0.z + v1.z + v2.z + v3.z) / 4;

        // Inner diamond vertices (moved toward center by insetFactor)
        const v4 = { x: v0.x + (centerX - v0.x) * insetFactor, z: v0.z + (centerZ - v0.z) * insetFactor };
        const v5 = { x: v1.x + (centerX - v1.x) * insetFactor, z: v1.z + (centerZ - v1.z) * insetFactor };
        const v6 = { x: v2.x + (centerX - v2.x) * insetFactor, z: v2.z + (centerZ - v2.z) * insetFactor };
        const v7 = { x: v3.x + (centerX - v3.x) * insetFactor, z: v3.z + (centerZ - v3.z) * insetFactor };

        // Build positions array (outer vertices, then inner vertices)
        const positions = [
            v0.x,
            0,
            v0.z, // 0: Front tip (outer)
            v1.x,
            0,
            v1.z, // 1: Top (outer)
            v2.x,
            0,
            v2.z, // 2: Back tip (outer)
            v3.x,
            0,
            v3.z, // 3: Bottom (outer)
            v4.x,
            0,
            v4.z, // 4: Front tip (inner)
            v5.x,
            0,
            v5.z, // 5: Top (inner)
            v6.x,
            0,
            v6.z, // 6: Back tip (inner)
            v7.x,
            0,
            v7.z, // 7: Bottom (inner)
        ];

        // Create triangle strips connecting outer and inner vertices
        // Each edge forms 2 triangles (a quad strip)
        const indices = [
            // Edge 0->1 (front tip to top)
            0, 4, 5, 0, 5, 1,
            // Edge 1->2 (top to back tip)
            1, 5, 6, 1, 6, 2,
            // Edge 2->3 (back tip to bottom)
            2, 6, 7, 2, 7, 3,
            // Edge 3->0 (bottom to front tip)
            3, 7, 4, 3, 4, 0,
        ];

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Apply the filled arrow shader to a mesh
     *
     * Uses tangent billboarding: arrow aligns with line direction in screen space.
     * lineDirection is passed as a uniform (set via setLineDirection method).
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
        shaderMaterial.setFloat("opacity", options.opacity ?? 1.0);

        // Initialize lineDirection to a default value (will be updated per-edge)
        shaderMaterial.setVector3("lineDirection", new Vector3(1, 0, 0));

        // Set clipping uniform (default -1.0 = disabled)
        shaderMaterial.setFloat("clipEndX", options.clipEndX ?? -1.0);

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
     * `applyShader` (pattern elements, one mesh each) and from `createArrowInstance`, which
     * calls it on each arrowhead INSTANCE -- positioned at the real arrow location by `Edge` --
     * never on a parked template; and the `MeshCache` template that genuinely does sit at
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
     * Set the line direction for a filled arrow mesh
     * This should be called every frame when the edge updates
     * @param mesh - Filled arrow mesh, or an arrowhead instance from {@link FilledArrowRenderer.createArrowInstance}
     * @param direction - Line direction vector (normalized)
     */
    static setLineDirection(mesh: AbstractMesh, direction: Vector3): void {
        if (mesh instanceof InstancedMesh) {
            (mesh.instancedBuffers.arrowDirection as Vector3).copyFrom(direction);
            return;
        }

        if (mesh.material) {
            const material = mesh.material as ShaderMaterial;
            material.setVector3("lineDirection", direction);
        }
    }

    /**
     * Draw one arrowhead as an instance of its scene's batch for `key`, building the batch's
     * hidden source mesh with `build` the first time the scene needs it.
     *
     * WHY -- issue #25: every arrowhead used to be its own `Mesh` with its own material, so N
     * arrowheaded edges cost N draw calls a frame (and, through issue #27, O(N^2) to load). A
     * batch is drawn in one call however many edges use it. Each instance keeps its own
     * transform, and Babylon refills the per-instance buffers once per frame in one pass, so this
     * does not bring back the per-edge buffer writes that made thin instances 35x slower.
     *
     * The source mesh goes when its last instance does, so a cleared graph leaves nothing in the
     * scene, and the batches of one scene are never seen by another.
     * @param scene - The scene the arrowhead is drawn in
     * @param key - What the batch's heads have in common: shape, and whatever else lives on the material
     * @param build - Builds the source mesh (with its material) for a new batch
     * @returns The arrowhead: an instance of the batch's source mesh
     */
    static instanceOf(scene: Scene, key: string, build: () => Mesh): InstancedMesh {
        let byKey = this.batches.get(scene);
        if (!byKey) {
            byKey = new Map();
            this.batches.set(scene, byKey);
        }

        let source = byKey.get(key);
        if (!source || source.isDisposed()) {
            source = build();
            // The source mesh only carries the batch; the instances are what is drawn. It takes
            // a name that does not say "arrow", so code that looks for arrowheads by name finds
            // the heads on screen and not the carrier; the heads keep the shape's own name.
            source.metadata = { ...source.metadata, capName: source.name };
            source.name = `cap-batch|${key}`;
            source.isVisible = false;
            byKey.set(key, source);
        }

        const batch = source;
        const batchesOfScene = byKey;
        const instance = batch.createInstance((batch.metadata as { capName: string }).capName);
        instance.onDisposeObservable.add(() => {
            if (batch.instances.length > 0 || batch.isDisposed()) {
                return;
            }

            if (batchesOfScene.get(key) === batch) {
                batchesOfScene.delete(key);
            }

            batch.dispose(false, true);
        });

        return instance;
    }

    /**
     * Draw one billboarded 3D arrowhead as an instance of its scene's batch for that shape and
     * opacity. The direction, size and colour are the instance's own attributes, so edges of
     * every colour and size share one draw call.
     * @param shape - The arrow type, which names the batch's geometry
     * @param createShape - Builds that geometry, for a new batch
     * @param options - The head's size (world-space length), colour and opacity
     * @param scene - Babylon.js scene
     * @returns The arrowhead instance; point it with {@link FilledArrowRenderer.setLineDirection}
     */
    static createArrowInstance(
        shape: string,
        createShape: () => Mesh,
        options: FilledArrowOptions,
        scene: Scene,
    ): InstancedMesh {
        const opacity = options.opacity ?? 1.0;
        const instance = this.instanceOf(scene, `3d|${shape}|${String(opacity)}`, () =>
            this.applyInstancedShader(createShape(), opacity, scene),
        );

        instance.instancedBuffers.arrowDirection = new Vector3(1, 0, 0);
        instance.instancedBuffers.arrowSize = options.size;
        instance.instancedBuffers.arrowColor = Color3.FromHexString(options.color);
        this.applyShaderBoundingInfo(instance, options.size);

        return instance;
    }

    /**
     * Give a batch's source mesh the billboard shader, reading direction, size and colour from
     * instance attributes instead of uniforms.
     * @param mesh - The batch's source mesh
     * @param opacity - The opacity every head in the batch is drawn at
     * @param scene - Babylon.js scene
     * @returns The same mesh
     */
    private static applyInstancedShader(mesh: Mesh, opacity: number, scene: Scene): Mesh {
        this.registerShaders();

        const material = new ShaderMaterial(
            "filledArrowMaterial",
            scene,
            { vertex: "filledArrow", fragment: "filledArrow" },
            {
                attributes: ["position", "arrowDirection", "arrowSize", "arrowColor"],
                uniforms: ["viewProjection", "cameraPosition", "opacity", "clipEndX"],
            },
        );
        material.setFloat("opacity", opacity);
        material.setFloat("clipEndX", -1.0);
        this.cameraTracked.add(material);
        // See applyShader (issue #388).
        material.blockDirtyMechanism = true;
        material.backFaceCulling = false;

        mesh.material = material;
        // Below 1 this is what puts the batch in the alpha-blended queue, as it did each head.
        mesh.visibility = opacity;

        mesh.registerInstancedBuffer("arrowDirection", 3);
        mesh.registerInstancedBuffer("arrowSize", 1);
        mesh.registerInstancedBuffer("arrowColor", 3);
        // The source is never drawn, but Babylon reads its values whenever it would be.
        mesh.instancedBuffers.arrowDirection = new Vector3(1, 0, 0);
        mesh.instancedBuffers.arrowSize = 0;
        mesh.instancedBuffers.arrowColor = new Color3(1, 1, 1);

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
            case "open-normal":
                mesh = this.createOpenNormal(scene);
                break;
            case "open-circle":
            case "open-dot": // Alias for open-circle (used in 2D mode for consistency)
                mesh = this.createOpenCircle(scene);
                break;
            case "open-diamond":
                mesh = this.createOpenDiamond(scene);
                break;
            default:
                // Default to normal triangle
                mesh = this.createTriangle(false, scene);
        }

        // Extract vertex data from the temporary mesh
        const geometry = VertexData.ExtractFromMesh(mesh);

        // Dispose the temporary mesh
        mesh.dispose();

        return geometry;
    }
}
