import {
    AbstractMesh,
    Camera,
    Color3,
    Effect,
    Engine,
    GreasedLineBaseMesh,
    GreasedLineMeshColorMode,
    Mesh,
    MeshBuilder,
    RawTexture,
    type Scene,
    StandardMaterial,
    Texture,
    Vector3,
    VertexBuffer,
    VertexData,
} from "@babylonjs/core";
import { CreateGreasedLine } from "@babylonjs/core/Meshes/Builders/greasedLineBuilder.js";

import type { EdgeStyleConfig } from "../config";
import { EDGE_CONSTANTS } from "../constants/meshConstants";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { ArrowCap } from "./ArrowCapBatch";
import { parseArrowStack } from "./arrowStack";
import { CustomLineRenderer } from "./CustomLineRenderer";
import type { EdgeLineBatch } from "./EdgeLineBatch";
import { parseBends } from "./edgeRoute";
import { FilledArrowRenderer, HALF_BARB, HALF_OPEN_MEETS, TEE_DEPTH } from "./FilledArrowRenderer";
import { FrameRoster } from "./FrameRoster";
import { MaterialHelper } from "./MaterialHelper";
import type { MeshCache } from "./MeshCache";
import { PatternedLineMesh } from "./PatternedLineMesh";
import { PatternedLineRenderer, type PatternType } from "./PatternedLineRenderer";
import type { WaveShape } from "./shapeOutlines";
import { Simple2DLineRenderer } from "./Simple2DLineRenderer";

/** The line types drawn as a run of pattern elements rather than as one line. */
/** The animated edge lines of each scene, behind one before-render observer; see {@link FrameRoster}. */
const animatedEdgeFrames = new FrameRoster();

const PATTERNED_TYPES: ReadonlySet<string> = new Set<PatternType>([
    "dot",
    "star",
    "box",
    "dash",
    "diamond",
    "dash-dot",
    "sinewave",
    "zigzag",
    "double",
    "forward-slash",
    "backward-slash",
    "vertical-slash",
    "separate-arrow",
    "contiguous-arrow",
]);

interface EdgeMeshOptions {
    styleId: string;
    width: number;
    color: string;
}

interface ArrowHeadOptions {
    type?: string;
    width: number;
    color: string;
    size?: number; // Size multiplier (default 1.0)
    breadth?: number; // Width across the line as a multiple of the type's own (default 1.0)
    opacity?: number; // Opacity 0-1 (default 1.0)
    image?: string; // The picture an "image" cap draws (a URL or a data URL)
    side?: "left" | "right"; // Draw only the cap's half on this side of its line (unset: all of it)
}

/**
 * The part of a triangle on one side of the cap's line (z = 0), as a fan of triangles.
 * @param tri - The triangle's corners, each x, y, z.
 * @param keep - Whether a z is on the kept side.
 * @param at - Where a side crosses the line: the point between two corners.
 * @returns The kept corners, in order (none, a triangle or a quad).
 */
function clipTriangle(
    tri: readonly (readonly number[])[],
    keep: (z: number) => boolean,
    at: (a: readonly number[], b: readonly number[]) => number[],
): (readonly number[])[] {
    const out: (readonly number[])[] = [];
    for (let i = 0; i < 3; i++) {
        const a = tri[i];
        const b = tri[(i + 1) % 3];
        if (keep(a[2])) {
            out.push(a);
        }
        if (keep(a[2]) !== keep(b[2])) {
            out.push(at(a, b));
        }
    }
    return out;
}

/**
 * An arrow cap's geometry cut along its line, keeping one side: Graphviz's `l` and `r` arrow
 * modifiers ("clip the shape, leaving only the part to the left of the edge"). Left is left looking
 * along the line toward the cap's tip, which is -z in every cap's geometry, as half-open's arm is.
 * The mesh is named for its side, so the cap reads as a half arrow.
 * @param mesh - The cap's normalized geometry.
 * @param side - The side kept, or undefined for the whole cap.
 * @returns The same mesh.
 */
function sided(mesh: Mesh, side: "left" | "right" | undefined): Mesh {
    if (side === undefined) {
        return mesh;
    }

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (positions === null || indices === null) {
        return mesh;
    }

    const keep = side === "left" ? (z: number): boolean => z <= 1e-9 : (z: number): boolean => z >= -1e-9;
    const at = (a: readonly number[], b: readonly number[]): number[] => {
        const t = a[2] / (a[2] - b[2]);
        return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), 0];
    };
    const corner = (i: number): number[] => [positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]];
    const out: number[] = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
        const kept = clipTriangle([corner(indices[i]), corner(indices[i + 1]), corner(indices[i + 2])], keep, at);
        for (let k = 1; k + 1 < kept.length; k++) {
            out.push(...kept[0], ...kept[k], ...kept[k + 1]);
        }
    }

    const data = new VertexData();
    data.positions = out;
    data.indices = Array.from({ length: out.length / 3 }, (_, i) => i);
    data.applyToMesh(mesh);
    mesh.name = `${mesh.name}-${side}-half`;
    return mesh;
}

/**
 * An arrow cap's geometry drawn wider or narrower across its line: every cap's geometry lies with
 * its line along x and across it along z, in the 2D path and the billboard shader alike.
 * @param mesh - The cap's normalized geometry.
 * @param breadth - The multiple of its own width.
 * @returns The same mesh.
 */
function widened(mesh: Mesh, breadth: number): Mesh {
    const positions = breadth === 1 ? null : mesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions !== null) {
        const out = Float32Array.from(positions);
        for (let i = 2; i < out.length; i += 3) {
            out[i] *= breadth;
        }

        mesh.setVerticesData(VertexBuffer.PositionKind, out);
        mesh.refreshBoundingInfo();
    }

    return mesh;
}

interface ArrowGeometry {
    /** Whether arrow uses center positioning (sphere-like) or tip positioning (triangular) */
    positioningMode: "center" | "tip";
    /** Whether arrow mesh needs rotation to align with edge direction */
    needsRotation: boolean;
    /** Position offset from surface point (in units of arrow length) */
    positionOffset: number;
    /** Optional scale factor for variant arrows (e.g., "dot" variants are smaller) */
    scaleFactor?: number;
    /**
     * How far back from its tip the line stops, as a fraction of the cap's length (default 1, at its back): a crossed
     * delta's line runs on through its bar to the back of its delta.
     */
    lineStop?: number;
}

/**
 * Factory class for creating edge meshes and arrow heads
 *
 * Handles creation of various edge types including solid lines, patterned lines,
 * bezier curves, and different arrow head styles. Manages 2D/3D rendering modes
 * and mesh caching for performance optimization.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static factory class for edge mesh creation
export class EdgeMesh {
    private static readonly UNIT_VECTOR_POINTS = [0, 0, -0.5, 0, 0, 0.5];
    /** A self-loop's radius around a node it clears. */
    static readonly SELF_LOOP_RADIUS = 2;
    /** How far a self-loop stays outside a node too big for {@link EdgeMesh.SELF_LOOP_RADIUS}. */
    static readonly SELF_LOOP_CLEARANCE = 0.5;
    private static shadersRegistered = false;

    /**
     * Feature flag: Use custom line renderer instead of GreasedLine
     * Set to true to test the new custom rendering system
     */
    private static readonly USE_CUSTOM_RENDERER = true;

    private static _registerShaders(): void {
        if (this.shadersRegistered) {
            return;
        }

        // Register dot arrow screen-space vertex shader
        // Matches GreasedLine's screen-space expansion algorithm
        Effect.ShadersStore.dotArrowScreenSpaceVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 viewProjection;
uniform mat4 projection;
uniform vec2 grlResolution;
uniform float grlWidth;

varying vec2 vUV;

void main() {
    vUV = uv;

    // Get disc center in clip space
    vec4 centerClip = viewProjection * world * vec4(0.0, 0.0, 0.0, 1.0);

    // Simple circle in screen space - expand radially
    // position.xy is already a unit circle from the disc geometry
    vec2 offset = position.xy * grlWidth * 0.5;

    // Apply screen-space sizing
    // Multiply by w to compensate for perspective divide (GPU will divide by w)
    // Divide by resolution to convert from pixels to NDC (-1 to +1)
    offset *= centerClip.w;
    offset /= grlResolution;

    // Apply offset in clip space
    gl_Position = centerClip;
    gl_Position.xy += offset;
}
`;

        // Register dot arrow screen-space fragment shader
        Effect.ShadersStore.dotArrowScreenSpaceFragmentShader = `
precision highp float;

varying vec2 vUV;
uniform vec3 arrowColor;

void main() {
    // Center coordinates (-1 to +1)
    vec2 centered = vUV * 2.0 - 1.0;

    // SDF: distance from center
    float dist = length(centered);

    // Hard cutoff for uniform color
    if (dist > 1.0) {
        discard;
    }

    gl_FragColor = vec4(arrowColor, 1.0);
}
`;

        // Register vee arrow vertex shader
        // Simple billboard shader - mesh billboard mode handles camera facing
        Effect.ShadersStore.veeArrowVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;

varying vec2 vUV;

void main() {
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

        // Register vee arrow fragment shader
        // Draws two lines forming a 90-degree V pointing right
        Effect.ShadersStore.veeArrowFragmentShader = `
precision highp float;

varying vec2 vUV;
uniform vec3 arrowColor;
uniform float lineWidth;

void main() {
    // Center coordinates (-1 to +1)
    vec2 centered = vUV * 2.0 - 1.0;

    // Tip of V points right at (1, 0)
    // Left arm goes to top-left (-1, 1)
    // Right arm goes to bottom-left (-1, -1)
    // This creates a > shape pointing right with 90-degree angle

    vec2 tip = vec2(1.0, 0.0);
    vec2 leftEnd = vec2(-1.0, 1.0);
    vec2 rightEnd = vec2(-1.0, -1.0);

    // Calculate distance to left arm line
    vec2 leftDir = normalize(leftEnd - tip);
    vec2 toPointLeft = centered - tip;
    float projLeft = dot(toPointLeft, leftDir);
    vec2 closestLeft = tip + leftDir * clamp(projLeft, 0.0, length(leftEnd - tip));
    float distLeft = length(centered - closestLeft);

    // Calculate distance to right arm line
    vec2 rightDir = normalize(rightEnd - tip);
    vec2 toPointRight = centered - tip;
    float projRight = dot(toPointRight, rightDir);
    vec2 closestRight = tip + rightDir * clamp(projRight, 0.0, length(rightEnd - tip));
    float distRight = length(centered - closestRight);

    // Take minimum distance to either line
    float dist = min(distLeft, distRight);

    // Discard if too far from either line
    if (dist > lineWidth) {
        discard;
    }

    gl_FragColor = vec4(arrowColor, 1.0);
}
`;

        this.shadersRegistered = true;
    }

    /**
     * Determine if 2D rendering mode should be used
     *
     * 2D mode is enabled when BOTH conditions are met:
     * 1. Camera is in orthographic mode
     * 2. Graph has twoD metadata set to true
     * @param scene - Babylon.js scene
     * @returns true if 2D mode should be used
     */
    private static is2DMode(scene: Scene): boolean {
        const camera = scene.activeCamera;
        if (!camera) {
            return false;
        }

        const isOrtho = camera.mode === Camera.ORTHOGRAPHIC_CAMERA;
        // Check scene metadata for twoD flag (will be set by Graph)
        const is2DGraph = scene.metadata?.twoD === true;

        return isOrtho && is2DGraph;
    }

    /**
     * Build the line for a patterned style: a run of pattern elements, each a slot in a batch
     * shared by every element of its shape. Every other line is a slot in a line batch
     * ({@link EdgeMesh.lineBatch}), and this is only ever asked for when that answered null.
     * @param options - Edge mesh options including width and color.
     * @param style - Full edge style configuration; its `line.type` is one of the patterns.
     * @param scene - Babylon.js scene.
     * @returns The patterned line.
     */
    static createPatternedLine(options: EdgeMeshOptions, style: EdgeStyleConfig, scene: Scene): PatternedLineMesh {
        // Edge.transformArrowCap() provides start/end already adjusted for node surfaces and arrows
        return PatternedLineRenderer.create(
            style.line?.type as PatternType,
            new Vector3(0, 0, -0.5), // Placeholder start (Edge.update() will set real positions)
            new Vector3(0, 0, 0.5), // Placeholder end (Edge.update() will set real positions)
            scene,
            {
                width: options.width / 40, // Convert back from scaled width - need /40 to match solid line thickness
                color: options.color,
                opacity: style.line?.opacity ?? 1,
                is2DMode: this.is2DMode(scene), // Pass 2D mode detection flag
                patternCount: style.line?.patternCount, // undefined means follow the spacing rule
                wave: this.waveOf(style),
            },
        );
    }

    /**
     * A sinewave's or zigzag's own swing and period in world units (`line.waveAmplitude`,
     * `line.wavePeriod`, in the line's width units), or undefined to draw the wave within its width.
     * @param style - The resolved style.
     * @returns The wave, or undefined.
     */
    private static waveOf(style: EdgeStyleConfig): WaveShape | undefined {
        const amplitude = style.line?.waveAmplitude;
        if (amplitude === undefined) {
            return undefined;
        }

        // world units per unit of line width, as createPatternedLine converts the width
        const perWidth = 1 / 40;
        const period = style.line?.wavePeriod || 4 * amplitude;
        return period > 0 ? { amplitude: amplitude * perWidth, period: period * perWidth } : undefined;
    }

    /**
     * Whether a style's line is drawn as pattern elements (`PatternedLineMesh`) rather than as a
     * slot in a line batch: every patterned type, laid along whatever route the edge takes
     * (issue #3102), except a dashed or dotted curve, or one through bends or round a self-loop,
     * which is a joined line in a batch that measures its dashes along the whole route.
     * @param style - The resolved style.
     * @param loop - Whether the edge is a self-loop, which is never a straight line.
     * @returns True for pattern elements.
     */
    static drawsAsPattern(style: EdgeStyleConfig, loop = false): boolean {
        const lineType = style.line?.type ?? "solid";
        if (!PATTERNED_TYPES.has(lineType)) {
            return false;
        }

        const { line } = style;
        const routed =
            loop ||
            line?.bezier === true ||
            [line?.bends, line?.sourcePort, line?.targetPort].some((text) => parseBends(text) !== null);
        return !(routed && (lineType === "dash" || lineType === "dot"));
    }

    /**
     * Whether a scene draws its lines as the 2D view does: flat rectangles in world units.
     * @param scene - The scene.
     * @returns True in the 2D view.
     */
    static drawsFlat(scene: Scene): boolean {
        return this.is2DMode(scene);
    }

    /**
     * The thin-instance batch that draws one edge appearance, or null for a patterned line.
     *
     * EVERY LINE BUT A PATTERNED ONE IS A SLOT HERE (issues #419 and #444), so a style draws what
     * it always drew:
     *
     * - a curve is a run of slots in the solid line's batch, one per straight segment, placed by
     *   the edge as its ends move (`Edge.placeCurve`) -- in 2D as well, which is what it drew
     * - a patterned line answers null: its elements are slots in batches of their own, kept by
     *   `PatternedLineMesh`
     * - a solid line in 2D is a slot in a batch of flat rectangles (`Simple2DLineRenderer`)
     * - an animated line is a slot in a batch of the animated greased line, whose shader reads
     *   `finalWorld` and so draws thin instances as it drew instanced meshes
     * - everything else is the straight solid 3D line
     *
     * A slot is sixteen floats; the mesh and the material are the batch's, so the colour, the
     * width and the opacity stay folded into the key, and there is one batch per appearance.
     * @param cache - The mesh cache, which owns the batches so that they die when it does.
     * @param options - Edge mesh options including styleId, width, and color.
     * @param style - Full edge style configuration.
     * @param scene - Babylon.js scene.
     * @param widened - A batch whose slots carry a taper (`edge.taper`): a joined line with the
     *     static attributes (`EdgeLineBatch`), in a batch of its own. An animated line is drawn
     *     still when widened.
     * @param loop - Whether the edge is a self-loop (see {@link EdgeMesh.drawsAsPattern}).
     * @returns The batch to take a slot in, or null for a patterned line.
     */
    static lineBatch(
        cache: MeshCache,
        options: EdgeMeshOptions,
        style: EdgeStyleConfig,
        scene: Scene,
        widened = false,
        loop = false,
    ): EdgeLineBatch | null {
        const lineType = style.line?.type ?? "solid";
        const key = `edge-style-${options.styleId}${widened ? "-w" : ""}`;
        const staticLine = (): Mesh => this.createStaticLine(options, style, scene, cache, widened);
        const curve = style.line?.bezier === true;

        if (this.drawsAsPattern(style, loop)) {
            return null;
        }

        // A DASHED OR DOTTED LINE THAT BENDS IS ONE JOINED LINE, its dashes measured along the
        // whole edge so they turn its corners (design/edges/sharp-corners.md). Pattern elements
        // are placed along a straight line from end to end, so they cannot follow a bend. Its
        // width and element sizes are the pattern elements' own (world units), so a bent dashed
        // edge is as thick as the straight one beside it.
        if (lineType === "dash" || lineType === "dot") {
            const is2D = this.is2DMode(scene);
            const width = options.width / 40;
            return cache.getBatch(
                `${key}-joined${is2D ? "-2d" : ""}`,
                () =>
                    CustomLineRenderer.createJoinedLineMesh(
                        {
                            width,
                            color: options.color,
                            opacity: style.line?.opacity ?? 1,
                            worldWidth: true,
                            widened,
                            minScreenWidth: style.line?.minScreenWidth,
                            pattern: {
                                kind: lineType,
                                elementLength: lineType === "dash" ? width * 3 : width,
                                count: style.line?.patternCount,
                            },
                        },
                        scene,
                    ),
                scene,
            );
        }

        // A 2D CURVE IS A RUN OF FLAT RECTANGLES, like a straight 2D line (#125). It used to be
        // a run of slots in the 3D line batch, whose width is screen pixels -- `width * 20` -- so
        // under the 2D camera a curve drew ten pixels per unit of `line.width` at every zoom,
        // while the straight edge beside it drew `width / 40` world units: dense curved graphs
        // turned into wide hatched bands next to hairline straight edges.
        if ((curve || lineType === "solid") && this.is2DMode(scene)) {
            return cache.getBatch(
                `${key}-2d`,
                () =>
                    Simple2DLineRenderer.createBatchMesh(
                        options.width / 40, // Convert back from scaled width to match 3D line thickness
                        options.color,
                        style.line?.opacity ?? 1,
                        scene,
                        widened,
                        style.line?.minScreenWidth,
                    ),
                scene,
            );
        }

        if (!curve && !widened && style.line?.animationSpeed) {
            return cache.getBatch(key, () => this.createAnimatedLine(options, style, scene), scene);
        }

        return cache.getBatch(key, staticLine, scene);
    }

    /**
     * Creates an arrow head mesh for edge endpoints.
     *
     * Supports multiple arrow types:
     * - Filled: normal, inverted, diamond, box, dot, vee, tee, half-open, crow
     * - Open: open-normal, open-diamond, open-dot
     * - Spheres: sphere-dot
     *
     * In 2D mode, uses StandardMaterial with XY rotation.
     * In 3D mode, uses shader-based billboard rendering.
     *
     * The head is a thin-instance slot in a batch its scene shares with every head of the same
     * shape (and, where the material holds them, the same colour and opacity), so a graph's
     * arrowheads cost one draw call and one material per batch, and nothing at all per edge.
     * See `ArrowCapBatch`.
     * @param _cache - MeshCache instance (currently unused, kept for API compatibility)
     * @param _styleId - Style ID (currently unused, kept for API compatibility)
     * @param options - Arrow head options including type, width, color, size, and opacity
     * @param scene - Babylon.js scene
     * @returns The created arrow mesh, or null if type is "none" or undefined
     */
    static createArrowHead(
        _cache: MeshCache,
        _styleId: string,
        options: ArrowHeadOptions,
        scene: Scene,
    ): ArrowCap | null {
        // A SIZE OF 0 IS NO CAP (#2067), the same as type "none": a zero-scale slot would still be
        // drawn, and the line runs as it would with no cap at that end.
        const size = options.size ?? 1;
        if (!options.type || options.type === "none" || size <= 0) {
            return null;
        }

        const opacity = options.opacity ?? 1;
        const length = this.calculateArrowLength() * size;
        const breadth = options.breadth ?? 1;
        const { side } = options;
        // A batch holds one geometry, so a cap drawn at another width or on one side is a batch of its own.
        const breadthKey = breadth === 1 ? "" : `|w${String(breadth)}`;
        const sideKey = side === undefined ? "" : `|${side}`;
        const widthKey = `${breadthKey}${sideKey}`;

        // AN IMAGE CAP IS ITS PICTURE on a flat quad, drawn by a StandardMaterial that holds the
        // texture, so it is a batch per picture and is laid in the XY plane turned along its line in
        // 3D as in 2D: the billboard shader draws a single colour and no texture.
        if (options.type === "image") {
            const src = options.image;
            if (src === undefined || src === "") {
                return null;
            }

            return FilledArrowRenderer.capOf(
                scene,
                `2d|image|${src}|${String(opacity)}${widthKey}`,
                () => widened(this.createImageCap(src, opacity, scene), breadth),
                { scale: length, billboard: false },
            );
        }

        // Detect 2D mode
        const is2D = this.is2DMode(scene);

        // Arrow type routing:
        // All arrows use FilledArrowRenderer (unified implementation)
        const FILLED_ARROWS = [
            "normal",
            "inverted",
            "diamond",
            "box",
            "dot",
            "vee",
            "tee",
            "half-open",
            "crow",
            "sphere-dot",
            ...Object.keys(FilledArrowRenderer.POLYGON_ARROWS),
            ...Object.keys(FilledArrowRenderer.OPEN_OUTLINES),
        ];

        // A CAP IS A SLOT, NOT A MESH. The note that used to stand here said thin instances had
        // been measured at a 1,147 ms bottleneck, 35 times slower than moving a mesh, and that
        // sentence is why every cap and every line in this file was a scene object with its own
        // material. What it measured was an API misuse: `thinInstanceSetMatrixAt` re-uploads the
        // WHOLE buffer unless it is told not to, so moving n of them one at a time is O(n^2) --
        // 42 seconds a frame at 20,000 instances. Writing the floats and uploading once a frame
        // is 1.7 ms for the same 20,000. See EdgeLineBatch for the lines and ArrowCapBatch for
        // these caps.

        const arrowType = options.type;
        if (!FILLED_ARROWS.includes(arrowType)) {
            throw new Error(`Unsupported arrow type: ${options.type}`);
        }

        // AN OPEN CAP'S FRAME IS AS THICK AS ITS LINE (#4253), as Graphviz and Cytoscape.js stroke one with the edge's
        // own pen: the line's width in scene units (`width / 40`, see createPatternedLine) over the cap's length, which
        // a batch's one geometry holds, so it is part of the key. The outline is widened before it is framed, so the
        // frame stays as thick on every side.
        const stroke =
            arrowType in FilledArrowRenderer.OPEN_OUTLINES
                ? Math.round((options.width / 40 / length) * 1000) / 1000
                : undefined;
        const openKey = stroke === undefined ? widthKey : `${widthKey}|s${String(stroke)}`;
        const open = (): Mesh | null =>
            stroke === undefined ? null : FilledArrowRenderer.createOpenOutline(arrowType, scene, stroke, breadth);

        if (is2D) {
            // StandardMaterial (no shader, XY rotation). Colour and opacity live on the material,
            // so they are part of the batch key; the size and the turn are the slot's matrix.
            return FilledArrowRenderer.capOf(
                scene,
                `2d|${arrowType}|${options.color}|${String(opacity)}${openKey}`,
                () => {
                    const outline = open();
                    if (outline !== null) {
                        outline.name = `arrow-2d-${arrowType}`;
                        MaterialHelper.apply2DMaterial(outline, options.color, opacity, scene);
                    }
                    const source = sided(
                        outline ??
                            widened(
                                FilledArrowRenderer.create2DArrow(arrowType, 1, 1, options.color, opacity, scene),
                                breadth,
                            ),
                        side,
                    );
                    source.visibility = opacity;
                    return source;
                },
                { scale: length, billboard: false },
            );
        }

        if (arrowType === "sphere-dot") {
            return this.createSphereDot(length, options.color, opacity, scene);
        }

        // 3D mode: shader-based billboard arrows; size and colour are per instance.
        return FilledArrowRenderer.createArrowCap(
            `${arrowType}${openKey}`,
            () => sided(open() ?? widened(this.createArrowShape(arrowType, scene), breadth), side),
            {
                size: length, // World-space length (e.g., 0.5 units)
                color: options.color,
                opacity,
            },
            scene,
        );
    }

    /**
     * A 3D sphere-dot arrowhead: an unlit sphere, batched by colour and opacity, sized by the
     * slot's own scale.
     * @param length - Arrow length in world units
     * @param color - Arrow color as hex string
     * @param opacity - Arrow opacity (0-1)
     * @param scene - Babylon.js scene
     * @returns The sphere cap
     */
    private static createSphereDot(length: number, color: string, opacity: number, scene: Scene): ArrowCap {
        // CRITICAL: The sphere size must match what positioning code expects
        // calculateArrowPosition() uses actualSize = length * scaleFactor
        // So the sphere's diameter must be length * scaleFactor
        const sphereDotScaleFactor = EdgeMesh.getArrowGeometry("sphere-dot").scaleFactor ?? 1;
        const sphereDiameter = length * sphereDotScaleFactor; // e.g., 0.5 * 0.25 = 0.125

        return FilledArrowRenderer.capOf(
            scene,
            `sphere-dot|${color}|${String(opacity)}`,
            () => {
                const sphereMesh = MeshBuilder.CreateSphere(
                    "sphere-dot-arrow-3d",
                    { diameter: 1, segments: 16 },
                    scene,
                );
                const sphereMaterial = new StandardMaterial("sphere-dot-material-3d", scene);
                sphereMaterial.diffuseColor = Color3.FromHexString(color);
                sphereMaterial.emissiveColor = Color3.FromHexString(color);
                sphereMaterial.disableLighting = true;
                sphereMesh.material = sphereMaterial;
                sphereMesh.visibility = opacity;
                return sphereMesh;
            },
            { scale: sphereDiameter, billboard: false },
        );
    }

    /**
     * An image cap's source mesh: a square quad in the XZ plane from its tip at the origin back to
     * x = -1 and half a unit either side of the line, with the picture's top edge across the tip and
     * its left edge on the -Z side (vis-network draws an image arrow so: the picture turned to
     * stand on its line, its top at the arrow's point).
     * @param src - The picture's URL or data URL.
     * @param opacity - How opaque it is drawn.
     * @param scene - Babylon.js scene
     * @returns The mesh, with its textured material
     */
    private static createImageCap(src: string, opacity: number, scene: Scene): Mesh {
        const mesh = new Mesh("arrow-2d-image", scene);
        const data = new VertexData();
        data.positions = [0, 0, -0.5, 0, 0, 0.5, -1, 0, 0.5, -1, 0, -0.5];
        // the picture's top (v = 1) at the tip, its left (u = 0) on the -Z side
        data.uvs = [0, 1, 1, 1, 1, 0, 0, 0];
        data.indices = [0, 1, 2, 0, 2, 3];
        data.applyToMesh(mesh);

        const material = new StandardMaterial(`material-2d-image|${src}`, scene);
        material.disableLighting = true;
        material.diffuseColor = Color3.Black();
        material.emissiveColor = Color3.White();
        material.specularColor = Color3.Black();
        material.backFaceCulling = false;
        material.alpha = opacity;
        // Babylon.js reads a `data:` URL itself only in base64; another (an SVG written out as text)
        // it loads as an image only when handed the URL as the picture's buffer
        const texture = new Texture(
            src,
            scene,
            false,
            true,
            Texture.TRILINEAR_SAMPLINGMODE,
            null,
            null,
            src.startsWith("data:") && !src.includes(";base64,") ? src : null,
        );
        texture.hasAlpha = true;
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        material.diffuseTexture = texture;
        material.useAlphaFromDiffuseTexture = true;
        mesh.material = material;
        mesh.metadata = { is2D: true };

        return mesh;
    }

    /**
     * Build the normalized geometry of a billboarded arrow type (every filled type but sphere-dot).
     * @param type - Arrow type (normal, inverted, diamond, etc.)
     * @param scene - Babylon.js scene
     * @returns The arrow's geometry, with no material
     */
    private static createArrowShape(type: string, scene: Scene): Mesh {
        switch (type) {
            case "normal":
                return FilledArrowRenderer.createTriangle(false, scene);
            case "inverted":
                return FilledArrowRenderer.createTriangle(true, scene);
            case "diamond":
                return FilledArrowRenderer.createDiamond(scene);
            case "box":
                return FilledArrowRenderer.createBox(scene);
            case "dot":
                return FilledArrowRenderer.createCircle(scene);
            case "vee":
                return FilledArrowRenderer.createVee(scene);
            case "tee":
                return FilledArrowRenderer.createTee(scene);
            case "half-open":
                return FilledArrowRenderer.createHalfOpen(scene);
            case "crow":
                return FilledArrowRenderer.createCrow(scene);
            default:
                if (type in FilledArrowRenderer.POLYGON_ARROWS) {
                    return FilledArrowRenderer.createPolygonArrow(type, scene);
                }
                throw new Error(`Unsupported filled arrow type: ${type}`);
        }
    }

    private static createStaticLine(
        options: EdgeMeshOptions,
        style: EdgeStyleConfig,
        scene: Scene,

        _cache: MeshCache,
        widened = false,
    ): Mesh {
        // Use custom line renderer if flag is enabled

        if (this.USE_CUSTOM_RENDERER || widened) {
            // A joined line: a straight edge is one piece with square ends, as it always was; a
            // curve's or a bent edge's pieces meet at their corners (design/edges/sharp-corners.md).
            return CustomLineRenderer.createJoinedLineMesh(
                {
                    width: options.width * 20, // Scale factor to match GreasedLine sizing
                    color: options.color,
                    opacity: style.line?.opacity,
                    widened,
                    minScreenWidth: style.line?.minScreenWidth,
                },
                scene,
            );
        }

        // Fallback to GreasedLine
        const mesh = CreateGreasedLine(
            "edge-plain",
            {
                points: this.UNIT_VECTOR_POINTS,
            },
            {
                color: Color3.FromHexString(options.color),
                width: options.width,
            },
            scene,
        );

        // Apply opacity if specified
        if (style.line?.opacity !== undefined) {
            mesh.visibility = style.line.opacity;
        }

        return mesh;
    }

    private static createAnimatedLine(options: EdgeMeshOptions, style: EdgeStyleConfig, scene: Scene): Mesh {
        const baseColor = Color3.FromHexString(EDGE_CONSTANTS.MOVING_LINE_BASE_COLOR);
        const movingColor = Color3.FromHexString(options.color);

        const texture = this.createAnimatedTexture(baseColor, movingColor, scene);

        const mesh = CreateGreasedLine(
            "edge-moving",
            {
                points: this.UNIT_VECTOR_POINTS,
            },
            {
                // IN SCENE UNITS, WHICH IS NOT THE UNIT THE STYLE'S WIDTH IS IN. A greased line
                // takes its width in world space, and the element's `edge.width` is a screen-space
                // pixel width -- `CustomLineRenderer` multiplies it by 20 and expands the line by
                // that many pixels in the vertex shader. Handing the pixel number straight over
                // drew the element's own width of 8 as a ribbon eight scene units thick, which on
                // a graph ten units across is a band taller than the graph. `/ 40` is the
                // conversion the other two world-space renderers already use for exactly this --
                // see `Simple2DLineRenderer` and `PatternedLineRenderer`, both of which call it
                // "convert back from scaled width to match 3D line thickness".
                width: options.width / 40,
                colorMode: GreasedLineMeshColorMode.COLOR_MODE_MULTIPLY,
                // Babylon otherwise binds one colours texture shared by every engine on the page
                // and disposed with whichever engine goes first. WebGL tolerates the stale
                // binding; WebGPU refuses the draw ("Trying to bind a null gpu texture").
                colorsTexture: this.emptyColorsTexture(scene),
            },
            scene,
        );

        this.applyAnimatedTexture(mesh, texture, scene, style.line?.animationSpeed);

        // Apply opacity if specified
        if (style.line?.opacity !== undefined) {
            mesh.visibility = style.line.opacity;
        }

        return mesh;
    }

    /**
     * An empty colours texture for one animated line, disposed with it. Not shared: the line's
     * mesh disposes its material's textures when it goes, so a shared one would be disposed under
     * every other line still using it.
     * @param scene - The scene the line is drawn in.
     * @returns The texture.
     */
    private static emptyColorsTexture(scene: Scene): RawTexture {
        const texture = new RawTexture(
            new Uint8Array(4),
            1,
            1,
            Engine.TEXTUREFORMAT_RGBA,
            scene,
            false,
            false,
            Engine.TEXTURE_NEAREST_NEAREST,
        );
        texture.name = "edge-moving-empty-colors";
        return texture;
    }

    private static createAnimatedTexture(baseColor: Color3, movingColor: Color3, scene: Scene): RawTexture {
        const r1 = Math.floor(baseColor.r * 255);
        const g1 = Math.floor(baseColor.g * 255);
        const b1 = Math.floor(baseColor.b * 255);
        const r2 = Math.floor(movingColor.r * 255);
        const g2 = Math.floor(movingColor.g * 255);
        const b2 = Math.floor(movingColor.b * 255);

        // RGBA, not RGB: WebGPU has no three-channel texture format, and Babylon refuses one there.
        const textureData = new Uint8Array([r1, g1, b1, 255, r2, g2, b2, 255]);

        const texture = new RawTexture(
            textureData,
            textureData.length / 4,
            1,
            Engine.TEXTUREFORMAT_RGBA,
            scene,
            false,
            true,
            Engine.TEXTURE_NEAREST_NEAREST,
        );

        texture.wrapU = RawTexture.WRAP_ADDRESSMODE;
        texture.name = "moving-texture";

        return texture;
    }

    /**
     * Run the moving texture along a line, at the speed the style asked for.
     *
     * `animationSpeed` IS A MULTIPLE OF THE ELEMENT'S OWN PACE, not a distance and not a
     * frequency: 1 is the pace `EDGE_CONSTANTS.MOVING_TEXTURE_ANIMATION_SPEED` sets, 2 is twice
     * that, 0.5 is half. Scaling `scene.getAnimationRatio()` rather than counting frames is what
     * keeps the pace the same on a 144 Hz screen as on a 60 Hz one.
     * @param mesh - The line the texture runs along.
     * @param texture - The moving texture, which this takes ownership of.
     * @param scene - The scene whose frames drive it.
     * @param animationSpeed - The multiple of the element's own pace, defaulting to it exactly.
     */
    private static applyAnimatedTexture(
        mesh: GreasedLineBaseMesh,
        texture: RawTexture,
        scene: Scene,
        animationSpeed = 1,
    ): void {
        const material = mesh.material as StandardMaterial;
        material.emissiveTexture = texture;
        material.disableLighting = true;
        texture.uScale = EDGE_CONSTANTS.MOVING_TEXTURE_U_SCALE;

        const perFrame = EDGE_CONSTANTS.MOVING_TEXTURE_ANIMATION_SPEED * animationSpeed;

        const stopFrames = animatedEdgeFrames.join(scene, () => {
            // PARKED AT THE START OF THE GRADIENT WHEN THE SCENE SAYS NOT TO ANIMATE, rather than
            // left wherever the last frame put it. `scene.animationsEnabled` is Babylon's own
            // switch for "do not animate", and honouring it is what lets a visual baseline of an
            // animated edge exist at all: the line is still built and drawn by this renderer, so
            // a defect in it still shows up in the picture, but the picture is the same one every
            // time. Stopping without resetting would have made every snapshot differ by however
            // far the gradient had crept before the shot, which is the whole problem.
            if (!scene.animationsEnabled) {
                texture.uOffset = 0;
                return;
            }

            texture.uOffset -= perFrame * scene.getAnimationRatio();
        });

        const releaseFrames = animatesEveryFrame(scene);

        // The texture and the per-frame callback belong to this mesh alone; without this every
        // rebuilt animated line would leave both behind.
        mesh.onDisposeObservable.addOnce(() => {
            releaseFrames();
            stopFrames();
            texture.dispose();
        });
    }

    // Helper to create a circular texture with anti-aliasing (white circle on transparent background)
    private static _createCircleTextureData(size: number): Uint8Array {
        const data = new Uint8Array(size * size * 4);
        const center = size / 2;
        const radius = size / 2 - 1; // Leave 1 pixel margin for anti-aliasing

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center + 0.5;
                const dy = y - center + 0.5;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const index = (y * size + x) * 4;

                // Anti-aliased edge: smooth transition over 1.5 pixels
                let alpha = 255;
                if (distance > radius) {
                    const edgeDistance = distance - radius;
                    if (edgeDistance < 1.5) {
                        // Smooth falloff for anti-aliasing
                        alpha = Math.max(0, Math.min(255, (255 * (1.5 - edgeDistance)) / 1.5));
                    } else {
                        alpha = 0;
                    }
                }

                data[index] = 255; // R
                data[index + 1] = 255; // G
                data[index + 2] = 255; // B
                data[index + 3] = alpha; // A (anti-aliased)
            }
        }

        return data;
    }

    /**
     * Gets the default arrow width based on constants.
     * @returns The default arrow width value from EDGE_CONSTANTS
     */
    static calculateArrowWidth(): number {
        return EDGE_CONSTANTS.DEFAULT_ARROW_WIDTH;
    }

    /**
     * Gets the default arrow length based on constants.
     * @returns The default arrow length value from EDGE_CONSTANTS
     */
    static calculateArrowLength(): number {
        return EDGE_CONSTANTS.DEFAULT_ARROW_LENGTH;
    }

    /**
     * How far back from its tip a vee's line stops, as a fraction of the vee's length: at its notch (half) while the
     * line's square end stays inside the vee's body, further back for a line wider than half the vee, and at the
     * vee's back for a line as wide as the vee or wider, so a thick line never covers the vee's barbs.
     * @param cap - The line's width and the vee's size and breadth; absent, the element's defaults
     * @param cap.lineWidth - The line's width (`line.width`)
     * @param cap.size - The vee's size multiple
     * @param cap.breadth - The vee's width multiple
     * @returns The fraction, from 1/2 to 1
     */
    static veeLineStop(cap?: { lineWidth?: number; size?: number; breadth?: number }): number {
        // a solid line's thickness in scene units is its width over 40 (see createPatternedLine)
        const line = (cap?.lineWidth ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) / 40;
        const vee =
            EDGE_CONSTANTS.NORMAL_ARROW_ASPECT * this.calculateArrowLength() * (cap?.size ?? 1) * (cap?.breadth ?? 1);
        return vee > 0 ? Math.min(1, Math.max(1 / 2, line / vee)) : 1;
    }

    /**
     * Get geometry metadata for an arrow type
     * This is the single source of truth for arrow positioning and line length calculations
     * @param arrowType - The arrow type to get geometry metadata for
     * @param cap - The line's width and the cap's size and breadth, which decide how far a vee's line runs on
     * @param cap.lineWidth - The line's width (`line.width`)
     * @param cap.size - The cap's size multiple
     * @param cap.stack - The caps drawn in a row behind it (`stack`), past which the line runs to the last
     * @param cap.breadth - The cap's width multiple
     * @returns Arrow geometry configuration including positioning mode and offsets
     */
    static getArrowGeometry(
        arrowType: string,
        cap?: { lineWidth?: number; size?: number; breadth?: number; stack?: string },
    ): ArrowGeometry {
        const own = EdgeMesh.ownArrowGeometry(arrowType, cap);
        const parts = parseArrowStack(cap?.stack);
        const last = parts.at(-1);
        if (last === undefined) {
            return own;
        }

        // a cap with a row behind it (`stack`): the line runs past it and every part but the last, and stops where
        // the last one's own line would
        const size = cap?.size ?? 1;
        let stop = EdgeMesh.capExtent(arrowType, size);
        for (const part of parts.slice(0, -1)) {
            stop += EdgeMesh.capExtent(part.type, part.size ?? size);
        }
        const lastSize = last.size ?? size;
        const lastOwn = EdgeMesh.ownArrowGeometry(last.type, {
            lineWidth: cap?.lineWidth,
            size: lastSize,
            breadth: last.width,
        });
        stop += this.calculateArrowLength() * lastSize * (lastOwn.scaleFactor ?? 1) * (lastOwn.lineStop ?? 1);
        return { ...own, lineStop: stop / (this.calculateArrowLength() * size * (own.scaleFactor ?? 1)) };
    }

    /**
     * How long a cap is drawn along its line, from its tip to its back, in scene units: its size's length, a tee's bar
     * shallower, a 3D sphere dot smaller. A cap in an end cap's row (`stack`) starts where the one before it ends.
     * @param arrowType - The cap's type.
     * @param size - Its size.
     * @returns The length.
     */
    static capExtent(arrowType: string, size: number): number {
        const depth = arrowType === "tee" ? TEE_DEPTH : 1;
        const scale = EdgeMesh.ownArrowGeometry(arrowType).scaleFactor ?? 1;
        return this.calculateArrowLength() * size * depth * scale;
    }

    /**
     * Geometry metadata for one cap of an arrow type, without the row a `stack` draws behind it.
     * @param arrowType - The arrow type.
     * @param cap - The cap's line width, size and breadth, where its line stop depends on them.
     * @param cap.lineWidth - The line's width (`line.width`)
     * @param cap.size - The cap's size multiple
     * @param cap.breadth - The cap's width multiple
     * @returns The cap's positioning mode and offsets.
     */
    private static ownArrowGeometry(
        arrowType: string,
        cap?: { lineWidth?: number; size?: number; breadth?: number },
    ): ArrowGeometry {
        switch (arrowType) {
            // Center-based arrows (all use same positioning, no scaling)
            case "dot":
            case "open-dot":
                return {
                    positioningMode: "center", // Symmetric, positioned by center
                    needsRotation: false,
                    positionOffset: 0,
                };

            case "sphere-dot":
                return {
                    positioningMode: "center", // Symmetric, positioned by center
                    needsRotation: false,
                    positionOffset: 0,
                    scaleFactor: 0.25, // Small dot-sized sphere (1/4 size)
                };

            // A crossed delta's line runs on through its bar to the back of its delta
            case "cross-delta":
            case "open-cross-delta":
                return {
                    positioningMode: "tip",
                    needsRotation: false,
                    positionOffset: 0,
                    lineStop: 2 / 3,
                };

            // A vee's line runs on under it to its notch, half the cap back from its tip: Graphviz strokes a shaft
            // from the notch to the back (arrows.c arrow_type_crow0), Cytoscape.js and vis-network draw the line on
            // under the vee
            case "vee":
                return {
                    positioningMode: "tip",
                    needsRotation: false,
                    positionOffset: 0,
                    lineStop: EdgeMesh.veeLineStop(cap),
                };

            // A half arrow's line runs on under it to where its arm meets the line, so no break shows between them
            // (Graphviz's halfopen meets its line at its back, Cytoscape's HALF_TOP near its tip): half-open's arm
            // meets it 0.4 of the cap back from the tip, the half barb's stroke its own length back
            case "half-open":
            case "half-open-flipped":
                return { positioningMode: "tip", needsRotation: false, positionOffset: 0, lineStop: HALF_OPEN_MEETS };
            case "half-barb":
            case "half-barb-flipped":
                return { positioningMode: "tip", needsRotation: false, positionOffset: 0, lineStop: HALF_BARB };

            // Filled arrows using FilledArrowRenderer (billboard shaders, no rotation)
            // These arrows have tip/front edge at origin
            case "normal":
            case "tee":
            case "inverted-vee":
            case "crow":
            case "open-normal":
            case "open-diamond":
            case "diamond":
            case "box":
            case "half-circle":
            case "open-half-circle":
            case "curve":
            case "triangle-tee":
            case "triangle-cross":
            case "circle-triangle":
            case "open-box":
            case "open-inverted":
            case "image":
                return {
                    positioningMode: "tip",
                    needsRotation: false, // Billboard shaders handle orientation
                    positionOffset: 0, // Tip at origin, position mesh at surface
                };

            // Inverted arrow: geometry extends forward (+X), so we offset backward
            // to position the base (at +1.0) at the sphere surface
            // Note: subtract() in calculateArrowPosition means positive offset moves TOWARD sphere
            case "inverted":
                return {
                    positioningMode: "tip",
                    needsRotation: false, // Billboard shaders handle orientation
                    positionOffset: 1, // Move arrow backward (toward sphere) to place base at surface
                };

            default:
                return {
                    positioningMode: "tip",
                    needsRotation: true,
                    positionOffset: 0, // Tip positioned exactly at surface
                };
        }
    }

    /**
     * Calculate arrow mesh position given surface point and arrow properties
     * @param surfacePoint - Point on the node surface where arrow should be positioned
     * @param direction - Direction vector from surface to arrow
     * @param arrowLength - Length of the arrow in world units
     * @param geometry - Arrow geometry configuration
     * @returns Calculated position for the arrow mesh
     */
    static calculateArrowPosition(
        surfacePoint: Vector3,
        direction: Vector3,
        arrowLength: number,
        geometry: ArrowGeometry,
    ): Vector3 {
        const scaleFactor = geometry.scaleFactor ?? 1;

        if (geometry.positioningMode === "center") {
            // Center-based: position center back by radius so front edge touches surface
            const actualSize = arrowLength * scaleFactor;
            const radius = actualSize / 2;
            return surfacePoint.subtract(direction.scale(radius));
        }

        // Tip-based: apply custom offset
        const offset = arrowLength * geometry.positionOffset;
        return surfacePoint.subtract(direction.scale(offset));
    }

    /**
     * Calculate where the line should end given arrow properties
     * @param surfacePoint - Point on the node surface
     * @param direction - Direction vector from surface outward
     * @param arrowLength - Length of the arrow in world units
     * @param geometry - Arrow geometry configuration
     * @returns Calculated endpoint for the line segment
     */
    static calculateLineEndpoint(
        surfacePoint: Vector3,
        direction: Vector3,
        arrowLength: number,
        geometry: ArrowGeometry,
    ): Vector3 {
        // Line gap equals actual arrow size (base size × scale factor)
        const scaleFactor = geometry.scaleFactor ?? 1;
        const actualSize = arrowLength * scaleFactor * (geometry.lineStop ?? 1);
        return surfacePoint.subtract(direction.scale(actualSize));
    }

    /**
     * Transforms an edge mesh to span between two points.
     *
     * Positions the mesh at the midpoint between source and destination,
     * orients it to look at the destination, and scales it to match the
     * distance between the two points.
     *
     * Note: This method is used for straight-line edges only.
     * Bezier curves have their geometry baked in world coordinates.
     * @param mesh - The edge mesh to transform
     * @param srcPoint - The source point (start of edge)
     * @param dstPoint - The destination point (end of edge)
     */
    static transformMesh(mesh: AbstractMesh, srcPoint: Vector3, dstPoint: Vector3): void {
        const delta = dstPoint.subtract(srcPoint);
        const midPoint = new Vector3(srcPoint.x + delta.x / 2, srcPoint.y + delta.y / 2, srcPoint.z + delta.z / 2);
        const length = delta.length();

        mesh.position = midPoint;
        mesh.lookAt(dstPoint);
        mesh.scaling.z = length;
    }

    /**
     * Generate Bezier curve points between two positions
     * @param srcPoint - Start point of the curve
     * @param dstPoint - End point of the curve
     * @param controlPoints - Optional custom control points (default: auto-calculated)
     * @param loopRadius - A self-loop's radius, when the two points are one (default
     *     {@link EdgeMesh.SELF_LOOP_RADIUS}).
     * @returns Flat array of coordinates [x1, y1, z1, x2, y2, z2, ...]
     */
    static createBezierLine(
        srcPoint: Vector3,
        dstPoint: Vector3,
        controlPoints?: Vector3[],
        loopRadius = EdgeMesh.SELF_LOOP_RADIUS,
    ): number[] {
        // Handle self-loops (source === destination)
        if (srcPoint.equalsWithEpsilon(dstPoint, 0.01)) {
            return this.createSelfLoopCurve(srcPoint, loopRadius);
        }

        // Calculate automatic control points if not provided
        const controls = controlPoints ?? this.calculateControlPoints(srcPoint, dstPoint);

        // Determine point density based on curve length, up to a ceiling: see BEZIER_MAX_SEGMENTS.
        const estimatedLength = Vector3.Distance(srcPoint, dstPoint) * 1.5; // Curve is ~1.5x longer
        const numPoints = Math.min(
            EDGE_CONSTANTS.BEZIER_MAX_SEGMENTS,
            Math.max(10, Math.ceil(estimatedLength * EDGE_CONSTANTS.BEZIER_POINT_DENSITY)),
        );

        const points: number[] = [];

        // Generate cubic Bezier curve points
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = this.cubicBezier(t, srcPoint, controls[0], controls[1], dstPoint);
            points.push(point.x, point.y, point.z);
        }

        return points;
    }

    /**
     * Calculate automatic control points for natural curve
     * Creates a perpendicular offset from the midpoint for a smooth arc
     * @param src - Source point of the curve
     * @param dst - Destination point of the curve
     * @returns Tuple of two control points for the bezier curve
     */
    private static calculateControlPoints(src: Vector3, dst: Vector3): [Vector3, Vector3] {
        const direction = dst.subtract(src);
        const distance = direction.length();

        // The curve bows in the XY plane, the plane a 2D graph is drawn in, to the left of the
        // direction from source to destination: (-dy, dx), as Gephi bows its curved edges. A
        // perpendicular out of that plane (the cross product with the up vector, which is along
        // z) draws a 2D curve as a straight line seen from the front.
        let perpendicular = Vector3.Cross(new Vector3(0, 0, 1), direction);

        // A line along z has no perpendicular in the XY plane: bow it sideways instead
        if (perpendicular.length() < 1e-6 * Math.max(distance, 1e-12)) {
            perpendicular = Vector3.Cross(direction, new Vector3(0, 1, 0));
        }

        perpendicular.normalize();

        // Offset control points perpendicular to line
        const offset = distance * EDGE_CONSTANTS.BEZIER_CONTROL_POINT_OFFSET;

        const midPoint = Vector3.Lerp(src, dst, 0.5);
        const control1 = Vector3.Lerp(src, midPoint, 0.5).add(perpendicular.scale(offset));
        const control2 = Vector3.Lerp(midPoint, dst, 0.5).add(perpendicular.scale(offset));

        return [control1, control2];
    }

    /**
     * Cubic Bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
     * @param t - Interpolation parameter (0-1)
     * @param p0 - Start point
     * @param p1 - First control point
     * @param p2 - Second control point
     * @param p3 - End point
     * @returns Interpolated point on the bezier curve
     */
    private static cubicBezier(t: number, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3): Vector3 {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        return p0
            .scale(uuu)
            .add(p1.scale(3 * uu * t))
            .add(p2.scale(3 * u * tt))
            .add(p3.scale(ttt));
    }

    /**
     * Create a self-loop curve (circular arc) when source === destination
     * @param center - Center point for the self-loop
     * @param radius - The loop's radius
     * @returns Flat array of coordinates forming a circular arc
     */
    private static createSelfLoopCurve(center: Vector3, radius: number): number[] {
        const segments = 32; // Smooth circle
        const points: number[] = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            const { z } = center;
            points.push(x, y, z);
        }

        return points;
    }
}
