/**
 * PatternedLineRenderer - Creates mesh-based patterns for line visualization
 *
 * Architecture:
 * - Static utility class for creating pattern geometries
 * - ALL geometries MUST use XZ plane (Y=0) for proper billboarding
 * - Uses FilledArrowRenderer shader for tangent billboarding
 * - Every element is a slot in a batch shared by every element of its shape (issue #444)
 * @remarks
 * This implements Phases 1-4 of design/rendering/mesh-based-patterned-lines.md. That
 * document is a DESIGN NOTE, not a generator input: nothing in tools/ or
 * graphty-element/scripts/ produces this file, so it is an ordinary source file and is
 * edited directly. It previously carried a "THIS FILE IS AUTO GENERATED" banner naming a
 * path (design/mesh-based-patterned-lines.md) that no longer exists after the monorepo
 * reorganisation. That banner was false and was removed, because it would have stopped the
 * next reader from making the mesh-count and material-lifetime repairs this file now carries.
 * - Phase 1: Discrete patterns (dot, star, dash, diamond) with billboarding
 * - Phase 2: Adaptive density (add/remove meshes based on line length)
 * - Phase 3: Alternating patterns (dash-dot)
 * - Phase 4: Connected patterns (sinewave, zigzag) with seamless connection
 */

import { Mesh, type Scene, type Vector3, VertexData } from "@babylonjs/core";

import type { ArrowCap } from "./ArrowCapBatch";
import { FilledArrowRenderer } from "./FilledArrowRenderer";
import { MaterialHelper } from "./MaterialHelper";
import { PatternedLineMesh, type PatternedLineOptions } from "./PatternedLineMesh";
import {
    type RingPiece,
    sineWavePeriod,
    type WaveShape,
    WHOLE_PERIOD,
    zigzagPeriod,
    type ZigzagPiece,
    zigzagPieceKey,
} from "./shapeOutlines";

// ==========================================
// PATTERN TYPE DEFINITIONS
// ==========================================

export type PatternType =
    | "dot"
    | "star"
    | "box"
    | "dash"
    | "diamond"
    | "dash-dot"
    | "sinewave"
    | "zigzag"
    | "double"
    | "forward-slash"
    | "backward-slash"
    | "vertical-slash"
    | "separate-arrow"
    | "contiguous-arrow";

/**
 * The shapes a pattern element is drawn as. The glyphs (`GLYPHS`) are drawn in units of the
 * line's width: a slash, an arrow, a chevron on a bar, two parallel bars.
 */
export type PatternShapeType =
    | "circle"
    | "star"
    | "box"
    | "diamond"
    | "sinewave-segment"
    | "zigzag-segment"
    | "forward-slash"
    | "backward-slash"
    | "vertical-slash"
    | "arrow"
    | "chevron"
    | "double-bar";

interface ShapeDefinition {
    type: PatternShapeType;
    size?: number; // Base size multiplier (default 1.0)
    aspectRatio?: number; // For elongated shapes (default 1.0)
    points?: number; // For star (default 5)
    angle?: number; // For zigzag (default 60)
    periods?: number; // For sinewave (default 0.5)
}

interface SpacingConfig {
    min: number; // Minimum spacing (below this, remove meshes)
    ideal: number; // Target spacing
    max: number; // Maximum spacing (above this, add meshes)
}

export interface PatternDefinition {
    shapes: ShapeDefinition[];
    spacing: SpacingConfig;
    connected: boolean;
}

// ==========================================
// PATTERN REGISTRY
// ==========================================

export const PATTERN_DEFINITIONS: Record<PatternType, PatternDefinition> = {
    dot: {
        shapes: [{ type: "circle", size: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    star: {
        shapes: [{ type: "star", size: 1, points: 5 }],
        spacing: { min: 0.3, ideal: 0.6, max: 1.2 },
        connected: false,
    },
    box: {
        shapes: [{ type: "box", size: 1, aspectRatio: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    dash: {
        shapes: [{ type: "box", size: 1, aspectRatio: 3 }],
        spacing: { min: 0.2, ideal: 0.4, max: 0.8 },
        connected: false,
    },
    diamond: {
        shapes: [{ type: "diamond", size: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    "dash-dot": {
        shapes: [
            { type: "box", size: 1, aspectRatio: 3 },
            { type: "circle", size: 0.6 },
        ],
        spacing: { min: 0.15, ideal: 0.3, max: 0.6 },
        connected: false,
    },
    sinewave: {
        shapes: [{ type: "sinewave-segment", size: 1, periods: 0.5 }],
        spacing: { min: 0, ideal: 0, max: 0 },
        connected: true,
    },
    zigzag: {
        shapes: [{ type: "zigzag-segment", size: 1, angle: 90 }],
        spacing: { min: 0, ideal: 0, max: 0 },
        connected: true, // Connected pattern - no gaps between segments
    },
    // Glyph patterns (Cytoscape desktop's line types). A bar glyph (double, contiguous-arrow) is
    // longer than the length it is spaced by, so neighbors overlap into one continuous line.
    double: {
        shapes: [{ type: "double-bar", size: 1, aspectRatio: 2 }],
        spacing: { min: 0, ideal: 0, max: 0 },
        connected: false,
    },
    "forward-slash": {
        shapes: [{ type: "forward-slash", size: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    "backward-slash": {
        shapes: [{ type: "backward-slash", size: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    "vertical-slash": {
        shapes: [{ type: "vertical-slash", size: 1 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    "separate-arrow": {
        shapes: [{ type: "arrow", size: 1, aspectRatio: 2 }],
        spacing: { min: 0.2, ideal: 0.5, max: 1 },
        connected: false,
    },
    "contiguous-arrow": {
        shapes: [{ type: "chevron", size: 1, aspectRatio: 2 }],
        spacing: { min: 0, ideal: 0, max: 0 },
        connected: false,
    },
};

/** How a pattern element is drawn, beyond its pattern and line ({@link PatternedLineRenderer.createPatternElement}). */
export interface PatternElementOptions {
    /** A specific shape type, for alternating patterns. */
    readonly shapeType?: PatternShapeType;
    /** Draw flat in the XY plane with a StandardMaterial rather than billboarded. */
    readonly is2DMode?: boolean;
    /** A sinewave's or zigzag's own swing and period, in world units. */
    readonly wave?: WaveShape;
    /** How much of its period a zigzag element with a wave of its own draws, and its caps. */
    readonly piece?: ZigzagPiece;
}

/** A flat polygon in a glyph's own plane: `[along, across]` points, in units of the line's width. */
type GlyphPolygon = readonly (readonly [number, number])[];

/**
 * A thin bar from one point to another.
 * @param x0 - Where it starts, along the line.
 * @param z0 - Where it starts, across the line.
 * @param x1 - Where it ends, along the line.
 * @param z1 - Where it ends, across the line.
 * @param thickness - How thick it is.
 * @returns The bar's four corners.
 */
function bar(x0: number, z0: number, x1: number, z1: number, thickness: number): GlyphPolygon {
    const length = Math.hypot(x1 - x0, z1 - z0) || 1;
    const [nx, nz] = [(-(z1 - z0) / length) * (thickness / 2), ((x1 - x0) / length) * (thickness / 2)];
    return [
        [x0 + nx, z0 + nz],
        [x1 + nx, z1 + nz],
        [x1 - nx, z1 - nz],
        [x0 - nx, z0 - nz],
    ];
}

/**
 * The glyph patterns' elements as polygons, in units of the line's width, centered on the origin
 * with the line running along +x (toward the target).
 */
const GLYPHS: Readonly<Record<string, readonly GlyphPolygon[]>> = {
    // a stroke two widths across the line, leaning half a width forward, back, or not at all; -z is
    // the line's left (up on screen for a line drawn left to right), so "/" runs from +z back to -z ahead
    "forward-slash": [bar(-0.5, 1, 0.5, -1, 0.3)],
    "backward-slash": [bar(-0.5, -1, 0.5, 1, 0.3)],
    "vertical-slash": [bar(0, -1, 0, 1, 0.3)],
    // a shaft and a head, two widths long
    arrow: [
        bar(-1, 0, 0.3, 0, 0.3),
        [
            [0.3, 0.5],
            [1, 0],
            [0.3, -0.5],
        ],
    ],
    // a bar four widths long (it overlaps its neighbors, two widths away, into one line) with a
    // chevron pointing along it
    // ponytail: overlapping bars draw darker where they overlap on a translucent line; join them
    // into one strip if that is ever seen
    chevron: [bar(-2, 0, 2, 0, 0.5), bar(-0.3, 0.8, 0.5, 0, 0.25), bar(-0.3, -0.8, 0.5, 0, 0.25)],
    // two thin bars four widths long, a width apart at their outer edges
    "double-bar": [bar(-2, 0.4, 2, 0.4, 0.2), bar(-2, -0.4, 2, -0.4, 0.2)],
};

/**
 * A glyph's polygons as one mesh in the XZ plane (y = 0), each fanned from its first point.
 * @param polygons - The polygons.
 * @returns The geometry.
 */
function glyphGeometry(polygons: readonly GlyphPolygon[]): VertexData {
    const positions: number[] = [];
    const indices: number[] = [];

    for (const polygon of polygons) {
        const base = positions.length / 3;
        for (const [x, z] of polygon) {
            positions.push(x, 0, z);
        }
        for (let i = 1; i < polygon.length - 1; i++) {
            indices.push(base, base + i, base + i + 1);
        }
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    return vertexData;
}

// ==========================================
// RENDERER CLASS
// ==========================================

/**
 * The height of a continuous zigzag at one of its four corner phases.
 * @param phase - The corner, 0 to 3: baseline, peak, baseline, valley.
 * @param amplitude - The peak height.
 * @returns The height at that corner.
 */
function zigzagZ(phase: number, amplitude: number): number {
    if (phase === 1) {
        return amplitude; // Peak
    }

    if (phase === 3) {
        return -amplitude; // Valley
    }

    return 0; // Baseline (phases 0 and 2)
}

/**
 * Static utility class for creating mesh-based pattern geometries for line visualization
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PatternedLineRenderer {
    /**
     * Create a PatternedLineMesh instance
     * Note: start/end are already adjusted by Edge.transformArrowCap() for node surfaces and arrows
     * @param pattern - The pattern type to render
     * @param start - Starting point of the line (already adjusted)
     * @param end - Ending point of the line (already adjusted)
     * @param scene - Babylon.js scene
     * @param options - Width, color, opacity, 2D mode (2D materials instead of the 3D shader, default
     *   false) and pattern count (omit to follow the spacing rule)
     * @returns A PatternedLineMesh instance
     */
    static create(
        pattern: PatternType,
        start: Vector3,
        end: Vector3,
        scene: Scene,
        options: PatternedLineOptions,
    ): PatternedLineMesh {
        // For connected patterns (zigzag, sinewave), use zero-spacing discrete meshes
        // This is more efficient than creating one large mesh
        const patternDef = PATTERN_DEFINITIONS[pattern];
        if (patternDef.connected) {
            return this.createContinuousMesh(pattern, start, end, scene, options);
        }

        return new PatternedLineMesh(pattern, start, end, scene, options);
    }

    /**
     * Create connected pattern using repeating segment meshes with ZERO spacing
     * Used for patterns like zigzag that need seamless tiling
     * Uses same efficient approach as discrete patterns (dot/star/etc) but with spacing=0
     * @param pattern - The pattern type to render
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     * @param scene - Babylon.js scene
     * @param options - Width, color, opacity, 2D mode and pattern count
     * @returns A PatternedLineMesh instance
     */
    static createContinuousMesh(
        pattern: PatternType,
        start: Vector3,
        end: Vector3,
        scene: Scene,
        options: PatternedLineOptions,
    ): PatternedLineMesh {
        // Use PatternedLineMesh approach (multiple small meshes) with zero spacing
        // This is more efficient than creating one large mesh with many vertices
        return new PatternedLineMesh(pattern, start, end, scene, options);
    }

    /**
     * Draw one pattern element as a slot in the batch every element of its shape shares.
     *
     * A SLOT, NOT A MESH (issue #444). Every element -- each dash of a dashed line, each segment
     * of a zigzag -- used to be a `Mesh` with a material of its own, so a single dashed edge was
     * tens of scene objects. It is now a slot in an `ArrowCapBatch`, the batch arrow caps are
     * drawn from, because an element is drawn exactly the way a cap is: in 3D by the same
     * billboard shader, with its direction, size and colour per instance; in 2D by a
     * StandardMaterial that holds the colour, turned into the XY plane and along its line by its slot.
     *
     * WHAT A BATCH IS KEYED BY is whatever the batch's mesh or material holds rather than a slot:
     * the shape, the opacity, in 2D the colour, and for a connected pattern the width, because
     * its segment geometry is built to it rather than scaled.
     * @param pattern - The pattern type to render
     * @param width - Line width
     * @param color - Line color
     * @param opacity - Line opacity (0-1)
     * @param scene - Babylon.js scene
     * @param options - How the element is drawn, beyond its pattern and line:
     *   `shapeType`, a specific shape type for alternating patterns;
     *   `is2DMode`, draw flat in the XY plane with a StandardMaterial rather than billboarded;
     *   `wave`, a sinewave's or zigzag's own swing and period, in world units: given, one element
     *   is one period of {@link PatternedLineRenderer.waveGeometry}, `width` thick;
     *   `piece`, how much of its period a zigzag element with a wave of its own draws (the last
     *   stops at its last turn) and whether it is capped where the line starts or ends
     * @returns The element; place it with `ArrowCap.place`
     */
    static createPatternElement(
        pattern: PatternType,
        width: number,
        color: string,
        opacity: number,
        scene: Scene,
        options: PatternElementOptions = {},
    ): ArrowCap {
        const { shapeType, is2DMode, wave, piece = WHOLE_PERIOD } = options;
        const patternDef = PATTERN_DEFINITIONS[pattern];
        const shape = shapeType ?? this.getDefaultShapeType(pattern);

        // A connected pattern's geometry is pre-scaled to the width (its amplitude and thickness
        // follow the width, its length does not), so it is drawn at scale 1 and the width is part
        // of its key. A discrete shape is one normalized geometry drawn at a per-slot scale.
        const scale = patternDef.connected ? 1 : width / this.getGeometryDiameter(pattern, shapeType);
        const waved = patternDef.connected && wave !== undefined;
        const waveKey = waved ? `~${String(wave.amplitude)}~${String(wave.period)}~${zigzagPieceKey(piece)}` : "";
        const builtWidth = patternDef.connected ? `${String(width)}${waveKey}` : "";
        const geometry = (): VertexData => {
            if (waved) {
                return this.waveGeometry(pattern, width, wave, piece);
            }
            if (patternDef.connected) {
                return this.createConnectedSegmentGeometry(pattern, width);
            }

            return shapeType ? this.getGeometryForShapeType(shapeType) : this.getGeometryForPattern(pattern);
        };
        const meshName = shapeType ? `pattern-${pattern}-${shapeType}` : `pattern-${pattern}`;

        if (is2DMode) {
            return FilledArrowRenderer.capOf(
                scene,
                `2d|pattern-${pattern}|${shape}|${builtWidth}|${color}|${String(opacity)}`,
                () => {
                    const mesh = new Mesh(meshName, scene);
                    geometry().applyToMesh(mesh);
                    MaterialHelper.apply2DMaterial(mesh, color, opacity, scene);

                    const positions = mesh.getVerticesData("position");
                    const indices = mesh.getIndices();
                    if (positions && indices) {
                        const normals: number[] = [];
                        VertexData.ComputeNormals(positions, indices, normals);
                        mesh.setVerticesData("normal", normals);
                    }

                    return mesh;
                },
                { scale, billboard: false },
            );
        }

        const element = FilledArrowRenderer.capOf(
            scene,
            `3d|pattern-${pattern}|${shape}|${builtWidth}|${String(opacity)}`,
            () => {
                const mesh = new Mesh(meshName, scene);
                geometry().applyToMesh(mesh);
                // The shader sets the batch's visibility to the opacity, which is what puts a
                // translucent line in the alpha-blended queue, as it does an arrow cap (issue #619).
                return FilledArrowRenderer.applyInstancedShader(mesh, opacity, scene);
            },
            { scale, billboard: true },
        );

        element.setAppearance(scale, color);

        return element;
    }

    /**
     * One period of a sinewave or zigzag with a swing and period of its own, in the XZ plane (x along
     * the line, z across it): a sine wave's period centered on its element's place
     * ({@link sineWavePeriod}), a zigzag's starting there ({@link zigzagPeriod}), so elements a
     * period apart from the line's start draw the wave Cytoscape desktop draws.
     * @param pattern - sinewave or zigzag
     * @param width - The thickness of the waving line, in world units
     * @param wave - Its swing and period, in world units
     * @param piece - How much of its period a zigzag's piece draws, and its caps
     * @returns The geometry
     */
    static waveGeometry(
        pattern: PatternType,
        width: number,
        wave: WaveShape,
        piece: ZigzagPiece = WHOLE_PERIOD,
    ): VertexData {
        return this.pieceGeometry(this.wavePiece(pattern, width, wave, piece));
    }

    /**
     * One period of a wave with a swing and period of its own, in its own frame (x along the line, y across it).
     * @param pattern - sinewave or zigzag
     * @param width - The thickness of the waving line
     * @param wave - Its swing and period
     * @param piece - How much of its period a zigzag's piece draws, and its caps
     * @returns The period, as a band
     */
    static wavePiece(
        pattern: PatternType,
        width: number,
        wave: WaveShape,
        piece: ZigzagPiece = WHOLE_PERIOD,
    ): RingPiece {
        return pattern === "sinewave"
            ? sineWavePeriod(wave.amplitude, wave.period, width)
            : zigzagPeriod(wave.amplitude, wave.period, width, piece);
    }

    /**
     * A band as a quad strip in the XZ plane (y = 0).
     * @param piece - The band, x along and y across.
     * @returns The geometry.
     */
    private static pieceGeometry(piece: RingPiece): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];
        piece.inner.forEach(([x, y], i) => {
            const [ox, oy] = piece.outer[i];
            positions.push(x, 0, y, ox, 0, oy);
        });
        for (let i = 0; i + 1 < piece.inner.length; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create geometry for connected patterns (zigzag, sinewave) pre-scaled to width
     * Segment length can be adjusted per edge for exact fit
     * @param pattern - Pattern type (zigzag or sinewave)
     * @param width - Desired visual width (scales amplitude/thickness, not X-length)
     * @param segmentLength - X-length of one pattern period (defaults to 0.75)
     * @returns VertexData with specified segment length and amplitude/thickness proportional to width
     */
    private static createConnectedSegmentGeometry(
        pattern: PatternType,
        width: number,
        segmentLength = 0.75,
    ): VertexData {
        const amplitude = width / 2; // Amplitude proportional to width
        const thickness = width * 0.1; // Thickness proportional to width

        switch (pattern) {
            case "zigzag":
                return this.createZigzagSegmentGeometry(segmentLength, amplitude, thickness);
            case "sinewave":
                // Use 1.0 period per segment for seamless tiling
                return this.createSinewaveSegmentGeometry(segmentLength, amplitude, 1, thickness);
            default:
                throw new Error(`Unknown connected pattern: ${pattern}`);
        }
    }

    /**
     * Get geometry for a pattern type
     * @param pattern - The pattern type
     * @returns VertexData for the pattern
     */
    private static getGeometryForPattern(pattern: PatternType): VertexData {
        const glyph = GLYPHS[this.getDefaultShapeType(pattern)] as readonly GlyphPolygon[] | undefined;
        if (glyph !== undefined) {
            return glyphGeometry(glyph);
        }

        switch (pattern) {
            case "dot":
                return this.createCircleGeometry();
            case "star":
                return this.createStarGeometry();
            case "box":
                return this.createBoxGeometry(1); // aspect ratio 1:1 (square)
            case "dash":
                return this.createBoxGeometry(3); // aspect ratio 3:1
            case "diamond":
                return this.createDiamondGeometry();
            case "dash-dot":
                // Phase 3: For dash-dot, default to box (first shape)
                // Actual alternation is handled via the shapeType parameter of createPatternElement
                return this.createBoxGeometry(3);
            case "sinewave":
                return this.createSinewaveSegmentGeometry();
            case "zigzag":
                return this.createZigzagSegmentGeometry();
            default:
                throw new Error(`Unsupported pattern type: ${pattern as string}`);
        }
    }

    /**
     * Get geometry for a specific shape type
     * Phase 3: Enables alternating patterns (e.g., dash-dot)
     * @param shapeType - The shape type
     * @returns VertexData for the shape
     */
    private static getGeometryForShapeType(shapeType: PatternShapeType): VertexData {
        const glyph = GLYPHS[shapeType] as readonly GlyphPolygon[] | undefined;
        if (glyph !== undefined) {
            return glyphGeometry(glyph);
        }

        switch (shapeType) {
            case "circle":
                return this.createCircleGeometry();
            case "star":
                return this.createStarGeometry();
            case "box":
                return this.createBoxGeometry(3);
            case "diamond":
                return this.createDiamondGeometry();
            case "sinewave-segment":
                return this.createSinewaveSegmentGeometry();
            case "zigzag-segment":
                return this.createZigzagSegmentGeometry();
            default:
                throw new Error(`Unsupported shape type: ${shapeType as string}`);
        }
    }

    // ==========================================
    // GEOMETRY GENERATORS
    // CRITICAL: ALL MUST USE XZ PLANE (Y=0)!
    // ==========================================

    /**
     * Create circle geometry in XZ plane (Y=0)
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     * @param segments - Number of segments in the circle
     * @returns VertexData for a circle
     */
    private static createCircleGeometry(segments = 32): VertexData {
        const positions: number[] = [0, 0, 0]; // Center
        const indices: number[] = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // XZ plane (Y=0)
            positions.push(
                Math.cos(angle), // X
                0, // Y = 0
                Math.sin(angle), // Z
            );

            if (i < segments) {
                indices.push(0, i + 1, i + 2);
            }
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create star geometry in XZ plane (Y=0)
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     * @param points - Number of star points
     * @param innerRadius - Inner radius of the star
     * @param outerRadius - Outer radius of the star
     * @returns VertexData for a star
     */
    private static createStarGeometry(points = 5, innerRadius = 0.4, outerRadius = 1): VertexData {
        const positions: number[] = [0, 0, 0]; // Center
        const indices: number[] = [];
        const totalPoints = points * 2;

        for (let i = 0; i <= totalPoints; i++) {
            const angle = (i / totalPoints) * Math.PI * 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            // XZ plane (Y=0)
            positions.push(
                Math.cos(angle) * radius, // X
                0, // Y = 0
                Math.sin(angle) * radius, // Z
            );

            if (i < totalPoints) {
                indices.push(0, i + 1, i + 2);
            }
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create box geometry in XZ plane (Y=0)
     * Elongated rectangle for dashes
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     * @param aspectRatio - Aspect ratio (length/width)
     * @returns VertexData for a box
     */
    private static createBoxGeometry(aspectRatio = 1): VertexData {
        const length = 1;
        const width = length / aspectRatio;
        const halfLength = length / 2;
        const halfWidth = width / 2;

        // XZ plane (Y=0), centered at origin, extends along +/- X
        const positions = [
            -halfLength,
            0,
            halfWidth, // Top-left
            halfLength,
            0,
            halfWidth, // Top-right
            halfLength,
            0,
            -halfWidth, // Bottom-right
            -halfLength,
            0,
            -halfWidth, // Bottom-left
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
        return vertexData;
    }

    /**
     * Create diamond geometry in XZ plane (Y=0)
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     * @returns VertexData for a diamond
     */
    private static createDiamondGeometry(): VertexData {
        const length = 1;
        const width = 0.8;

        // XZ plane (Y=0), centered at origin like other shapes
        // Diamond extends from -length/2 to +length/2 along X axis
        const positions = [
            length / 2,
            0,
            0, // Front tip (right)
            0,
            0,
            width / 2, // Top (center-top)
            -length / 2,
            0,
            0, // Back tip (left)
            0,
            0,
            -width / 2, // Bottom (center-bottom)
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
        return vertexData;
    }

    /**
     * Create sinewave segment geometry in XZ plane (Y=0)
     * Creates a quad strip following a sine wave for seamless tiling
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     *
     * IMPORTANT: For seamless tiling, each segment must contain exactly 1 complete wave period.
     * This ensures that when segments are placed end-to-end at 0.75 unit intervals,
     * the wave pattern continues smoothly without discontinuities.
     * @param segmentLength - Length of one segment (default 1.0, typically 0.75 for tiling)
     * @param amplitude - Wave amplitude (default 0.3)
     * @param periods - Number of complete sine wave periods per segment (should be 1.0 for seamless tiling)
     * @param thickness - Line thickness (quad strip width), default proportional to amplitude
     * @returns VertexData with positions and indices for quad strip
     */
    private static createSinewaveSegmentGeometry(
        segmentLength = 1,
        amplitude = 0.3,
        periods = 1, // Changed from 0.5 to 1.0 for proper tiling!
        thickness = amplitude * 0.2,
    ): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];
        const segments = 20; // Smooth curve

        // Generate sine wave vertices in XZ plane (Y=0)
        // For seamless tiling: z = amplitude * sin(2π * x / wavelength)
        // where wavelength = segmentLength / periods
        const wavelength = segmentLength / periods;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = t * segmentLength;
            // Use absolute X position for phase to ensure continuity between segments
            const z = amplitude * Math.sin((2 * Math.PI * x) / wavelength);

            // Calculate the tangent (derivative) to apply thickness perpendicular to curve
            // dz/dx = amplitude * cos(2π * x / wavelength) * (2π / wavelength)
            const derivative = amplitude * Math.cos((2 * Math.PI * x) / wavelength) * ((2 * Math.PI) / wavelength);

            // Tangent vector in XZ plane: (1, dz/dx)
            // Normal (perpendicular) vector: (-dz/dx, 1)
            // Normalize to get unit normal
            const normalLength = Math.sqrt(derivative * derivative + 1);
            const nx = -derivative / normalLength;
            const nz = 1 / normalLength;

            // Apply thickness along the normal direction (perpendicular to curve)
            // Bottom vertex, then top vertex
            positions.push(x + nx * thickness, 0, z + nz * thickness, x - nx * thickness, 0, z - nz * thickness);
        }

        // Create triangle indices for quad strip
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create continuous zigzag geometry for the full line length (ZERO spacing)
     * Generates a seamless zigzag pattern along the entire X axis
     * @param lineLength - Total length of the line
     * @returns VertexData with positions and indices for continuous quad strip
     */
    static createContinuousZigzag(lineLength: number): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];

        // Pattern configuration
        const segmentLength = 1.275; // Length of one complete /\/\ period (15% shorter than 1.5)
        const thickness = 0.15; // Line thickness perpendicular to the zigzag

        // Calculate diagonal segment length and amplitude
        // For 90-degree angles at corners, each diagonal must be at 45 degrees
        // This means rise = run, so amplitude = diagonalLength
        const segmentCount = 4; // Number of diagonal segments per period (/\/\)
        const diagonalLength = segmentLength / segmentCount; // 0.25
        const amplitude = diagonalLength; // 0.25 for 45-degree slopes and 90-degree corners

        // Generate zigzag points directly along the line length
        // Pattern: baseline(0) -> peak(1) -> baseline(2) -> valley(3) -> baseline(4) -> ...
        const points: [number, number, number][] = [];

        // Calculate total number of diagonal segments that fit
        const totalDiagonals = Math.ceil(lineLength / diagonalLength);

        // Generate points for each diagonal segment
        for (let i = 0; i <= totalDiagonals; i++) {
            const x = i * diagonalLength;

            // If we've exceeded the line length, interpolate the final point
            if (x > lineLength) {
                const prevX = (i - 1) * diagonalLength;
                const prevPhase = (i - 1) % 4;
                const currPhase = i % 4;

                // Get Z values for previous and current phase
                const prevZ = zigzagZ(prevPhase, amplitude);
                const currZ = zigzagZ(currPhase, amplitude);

                // Interpolate to find Z at exact lineLength
                const t = (lineLength - prevX) / (x - prevX);
                const finalZ = prevZ + t * (currZ - prevZ);

                points.push([lineLength, 0, finalZ]);
                break;
            }

            points.push([x, 0, zigzagZ(i % 4, amplitude)]);
        }

        // Create quad strip with thickness
        for (const [px, py, pz] of points) {
            // Bottom vertex, then top vertex
            positions.push(px, py, pz - thickness, px, py, pz + thickness);
        }

        // Create triangle indices for quad strip
        for (let i = 0; i < points.length - 1; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create continuous sinewave geometry for the full line length (ZERO spacing)
     * Generates a seamless sinewave pattern along the entire X axis
     * @param lineLength - Total length of the line
     * @returns VertexData with positions and indices for continuous quad strip
     */
    static createContinuousSinewave(lineLength: number): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];

        const amplitude = 0.3;
        const periods = 0.5; // Half period per unit length
        const thickness = amplitude * 1; // Same as amplitude for visibility
        const segments = Math.max(20, Math.ceil(lineLength * 10)); // More segments for longer lines

        // Generate sine wave vertices
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = t * lineLength;
            const z = amplitude * Math.sin(2 * Math.PI * periods * lineLength * t);

            // Bottom vertex, then top vertex
            positions.push(x, 0, z - thickness, x, 0, z + thickness);
        }

        // Create triangle indices for quad strip
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Create zigzag segment geometry in XZ plane (Y=0)
     * Creates a quad strip following a zigzag pattern for seamless connection
     * Face normal points in ±Y direction, maps to shader's "up" vector (toward camera)
     * @param segmentLength - Length of one segment (X-direction), default 1.0
     * @param amplitude - Perpendicular amplitude (Z-direction peak height), default 0.5
     * @param thickness - Line thickness (quad strip width), default 0.05
     * @returns VertexData with positions and indices for quad strip
     */
    private static createZigzagSegmentGeometry(segmentLength = 1, amplitude = 0.5, thickness = 0.05): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];

        // Create a true zigzag pattern with diagonal slanting lines
        // For 90-degree corners with equal segment lengths, use 45-degree diagonals
        // This means: rise = run, so amplitude/2 = segmentLength/4
        // Or equivalently: amplitude = segmentLength/2
        const segmentCount = 4; // Number of diagonal segments per period (/\/\)
        const diagonalLength = segmentLength / segmentCount; // X-length per diagonal
        const segmentAmplitude = amplitude; // Z-height (perpendicular amplitude)

        // Zigzag points: continuous diagonal pattern /\/\/\ (XZ plane, Y=0)
        // Total Z extent: -0.5 to +0.5 = 1.0 (matches getGeometryDiameter)
        const points: [number, number, number][] = [
            [0, 0, 0], // Start at baseline
            [diagonalLength, 0, segmentAmplitude], // Up-right diagonal (/) to peak
            [2 * diagonalLength, 0, 0], // Down-right diagonal (\) back to baseline
            [3 * diagonalLength, 0, -segmentAmplitude], // Down-right diagonal (\) to valley
            [4 * diagonalLength, 0, 0], // Up-right diagonal (/) back to baseline - seamless tiling
        ];

        // Create quad strip with thickness
        for (const [x, y, z] of points) {
            // Bottom vertex, then top vertex
            positions.push(x, y, z - thickness, x, y, z + thickness);
        }

        // Create triangle indices
        for (let i = 0; i < points.length - 1; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        return vertexData;
    }

    /**
     * Get geometry perpendicular diameter for a pattern
     * Returns the actual mesh extent perpendicular to the line (the visual height)
     *
     * IMPORTANT: Returns the actual geometric extent (max - min), NOT 2 × radius
     * @param pattern - Pattern type
     * @param shapeType - Optional specific shape type (for alternating patterns)
     * @returns The perpendicular diameter of the geometry
     */
    static getGeometryDiameter(pattern: PatternType, shapeType?: PatternShapeType): number {
        // Get pattern definition to look up aspectRatio
        const patternDef = PATTERN_DEFINITIONS[pattern];

        // Determine which shape we're using
        const shape = shapeType ?? this.getDefaultShapeType(pattern);

        // Find the shape definition to get aspectRatio
        const shapeDef = patternDef.shapes.find((s) => s.type === shape) ?? patternDef.shapes[0];
        const aspectRatio = shapeDef.aspectRatio ?? 1;

        switch (shape) {
            case "circle":
            case "star":
                // Circle: radius=0.5 → extent from -0.5 to +0.5 = 1.0
                // Star: outerRadius=1.0, innerRadius=0.4 → extent from -1.0 to +1.0 = 2.0
                // But we use the ACTUAL geometric extent in createCircleGeometry (radius=0.5) and createStarGeometry (outerRadius=1.0)
                // Fixed: Circle geometry uses Math.cos/sin(angle) * 1.0, so extent is 2.0
                // But createCircleGeometry in PatternedLineRenderer uses radius=1.0 for unit circle
                // Actual extent is from -1.0 to +1.0 = 2.0
                return 2;
            case "box":
                // Box has length=1.0, width=1.0/aspectRatio
                // Perpendicular dimension (width) = 1.0 / aspectRatio
                return 1 / aspectRatio;
            case "diamond":
            case "sinewave-segment":
                // These have diameter=1.0
                return 1;
            case "zigzag-segment":
                // Zigzag with 90-degree corners: amplitude=0.25, diameter=0.5
                return 0.5;
            default:
                // the glyphs are drawn in units of the line's width
                return 1;
        }
    }

    /**
     * Get the default shape type for a pattern
     * @param pattern - The pattern type
     * @returns The default shape type for the pattern
     */
    private static getDefaultShapeType(pattern: PatternType): PatternShapeType {
        switch (pattern) {
            case "dot":
                return "circle";
            case "star":
                return "star";
            case "box":
            case "dash":
                return "box";
            case "diamond":
                return "diamond";
            case "dash-dot":
                return "box"; // First shape in alternating pattern
            case "sinewave":
                return "sinewave-segment";
            case "zigzag":
                return "zigzag-segment";
            case "double":
                return "double-bar";
            case "separate-arrow":
                return "arrow";
            case "contiguous-arrow":
                return "chevron";
            case "forward-slash":
            case "backward-slash":
            case "vertical-slash":
                return pattern;
            default:
                return "circle";
        }
    }
}
