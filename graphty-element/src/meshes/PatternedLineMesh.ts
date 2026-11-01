/**
 * PatternedLineMesh - Manages pattern meshes for a single edge line
 *
 * Architecture:
 * - Every element is a slot in a batch shared with every element of its shape, in every edge
 *   (see `PatternedLineRenderer.createPatternElement`), so a patterned line adds no scene object
 * - Uses FilledArrowRenderer shader for billboarding
 * - Adaptive element density (add/remove slots as line length changes)
 * @remarks
 * This class implements Phases 1-4 of design/rendering/mesh-based-patterned-lines.md.
 * That document is a DESIGN NOTE, not a generator input: nothing in tools/ or
 * graphty-element/scripts/ produces this file, so it is an ordinary source file and is
 * edited directly. It previously carried a "THIS FILE IS AUTO GENERATED" banner naming a
 * path (design/mesh-based-patterned-lines.md) that no longer exists after the monorepo
 * reorganisation. That banner was false and was removed, because it would have stopped the
 * next reader from making exactly the mesh-count repair this file now carries.
 * - Phase 1: Basic infrastructure with discrete patterns
 * - Phase 2: Adaptive mesh density with hysteresis
 * - Phase 3: Alternating patterns (dash-dot) support
 * - Phase 4: Connected patterns (sinewave, zigzag) positioning
 */

import { type Mesh, type Scene, Vector3 } from "@babylonjs/core";

import type { ArrowCap } from "./ArrowCapBatch";
import {
    PATTERN_DEFINITIONS,
    type PatternDefinition,
    PatternedLineRenderer,
    type PatternShapeType,
    type PatternType,
} from "./PatternedLineRenderer";
import { type WaveShape, WHOLE_PERIOD, type ZigzagPiece, zigzagPieceKey } from "./shapeOutlines";

/**
 * Centre-to-centre distance between two consecutive elements of a discrete pattern.
 *
 * WHY THIS IS A SHARED FUNCTION -- the defect it prevents:
 * The mesh COUNT and the mesh POSITIONS were computed from two independently written
 * copies of the spacing rule. Both happened to spell it `meshWidth * 0.5`, so they agreed
 * by coincidence rather than by construction. The moment the count gained a floor and a
 * ceiling (see {@link discreteMeshCount}) those two copies would have disagreed, and the
 * visible symptom of a disagreement is a wrong LAST GAP: the positions routine pins the
 * first and last element to the line's two boundaries, so any surplus or shortfall in the
 * spacing is pushed entirely into the gap nearest the end of the line. One function, two
 * callers, no possible disagreement.
 *
 * THE FIX THIS ENCODES:
 * The period used to be derived from the element width alone, which made the count
 * O(lineLength / lineWidth) with no lower bound on the period -- so halving the line width
 * doubled the mesh count. `PATTERN_DEFINITIONS[*].spacing.min` already carried a per-pattern
 * WORLD-SPACE spacing floor intended to stop exactly that, but it was dead code: the count
 * routine read only `.connected` off the pattern definition and the positions routine took
 * the definition as an underscore-prefixed unused parameter. Honouring `spacing.min` here is
 * what makes the count stop growing as the width shrinks.
 * @param meshWidth - Rendered length of one pattern element ALONG the line, in world units
 * @returns Centre-to-centre period in world units, never less than `meshWidth`
 * @public
 */
export function patternElementPeriod(meshWidth: number): number {
    // Half an element of clear space between elements. This is the historical rule and it is
    // what makes the default rendering match the original stories.
    //
    // It deliberately carries NO absolute floor. An earlier version took the larger of this and
    // `PATTERN_DEFINITIONS[*].spacing.min`, which stopped the count growing as the line width
    // shrank -- but it did so by changing the spacing the caller asked for. Density is now a
    // caller decision (`line.patternCount`), not something the renderer overrides.
    return meshWidth + meshWidth * 0.5;
}

/**
 * The most pieces one patterned line draws (issue #4257). Past it the pieces spread further apart
 * rather than multiply, so a huge or hostile length (a far-off bend in a file, a node flung away
 * by the physics) cannot allocate without bound, and the line still reads as its pattern.
 *
 * Why 65536: the densest piece a default line draws is a dot of the default width (8, so 0.2 in
 * world units, one every 0.3), which reaches the cap only on an edge about 19,600 world units long;
 * a width-1 dotted line reaches it at about 2,450 and a zigzag or sine wave (one piece every 0.75)
 * at about 49,000. The built-in layouts lay graphs out a few hundred units across at their default
 * scales, so every realistic edge stays under the cap and draws exactly as before. A line at the cap
 * shown whole on even an 8K screen puts its pieces under a pixel apart, below what a reader sees.
 */
const MAX_PATTERN_PIECES = 65536;

/**
 * Number of meshes a discrete pattern needs to cover a line of the given length.
 *
 * The layout this counts for: the first element's left edge sits exactly on the start of
 * the line, the last element's right edge sits exactly on the end of it, and any interior
 * elements are distributed evenly in between. A line too short to hold two elements with a
 * gap between them takes one, at its start, as a dash pattern starts on its line: two
 * elements squeezed onto it would touch or overlap and draw a solid line (`pajek-synth-lines`
 * arc 2 -> 3, Pajek's 5 px dash on the 6 px of line between the source and the arrowhead).
 *
 * The count follows the spacing rule, so a longer edge gets more elements, up to
 * {@link MAX_PATTERN_PIECES}; past that the elements spread further apart. A length that is not
 * finite gets one. A caller that wants fewer sets `line.patternCount`, which overrides the rule.
 * @param lineLength - Length of the line in world units, ALREADY trimmed for the node surface and the arrowhead by Edge.transformArrowCap
 * @param meshWidth - Rendered length of one pattern element along the line, in world units
 * @param patternCount - Explicit element count from `line.patternCount`; omit to follow the spacing rule
 * @returns Mesh count, at least 1
 * @public
 */
export function discreteMeshCount(lineLength: number, meshWidth: number, patternCount?: number): number {
    // An explicit count is the caller's decision and overrides the spacing rule entirely, so the
    // elements are spread evenly over the edge whatever its length or the line's width.
    if (patternCount !== undefined) {
        return Math.min(MAX_PATTERN_PIECES, Math.max(2, Math.floor(patternCount)));
    }

    // no length to spread elements over: one, rather than an unbounded count (issue #4257)
    if (!Number.isFinite(lineLength)) {
        return 1;
    }

    // Space available between the first element's right edge and the last element's left
    // edge. lineLength is already adjusted for the node surface and the arrow, so nothing
    // is subtracted for those a second time.
    const dynamicLength = lineLength - 2 * meshWidth;
    const period = patternElementPeriod(meshWidth);
    const minSpacing = period - meshWidth;

    // Line too short to hold the two boundary elements apart: one element.
    if (dynamicLength < minSpacing) {
        return 1;
    }

    // K interior elements open K + 1 gaps, so K * meshWidth + (K + 1) * minSpacing must fit
    // inside dynamicLength. Solving for K gives the line below.
    const numInterior = Math.floor((dynamicLength - minSpacing) / period);

    // a zero element width makes the period 0 and the count infinite
    return Math.min(MAX_PATTERN_PIECES, 2 + Math.max(0, Number.isNaN(numInterior) ? 0 : numInterior));
}

/**
 * Distances along the line, measured from its start, at which each discrete pattern
 * element's CENTRE sits.
 *
 * The rule, unchanged from before this repair: the first element's left edge touches the
 * start boundary, the last element's right edge touches the end boundary, and the interior
 * elements share the remaining room in equal gaps.
 *
 * WHY THE SPACING IS DERIVED FROM THE COUNT RATHER THAN RECOMPUTED:
 * The previous implementation wrote the even distribution as
 * `minSpacing + (dynamicLength - numInterior * meshWidth - numGaps * minSpacing) / numGaps`,
 * in which `minSpacing` cancels out algebraically -- it was arithmetic that looked like a
 * dependency on the spacing rule but was not one. Leaving it in place would have invited the
 * belief that this function had to be kept in step with {@link discreteMeshCount} by hand.
 * It does not: it takes whatever count it is given and spreads it evenly, so the new floor
 * and the new ceiling on the count cannot desynchronise the positions. That is the property
 * that keeps the last gap correct when the ceiling bites.
 * @param totalLength - Length of the line in world units, already trimmed for node surface and arrowhead
 * @param meshWidth - Rendered length of one pattern element along the line, in world units
 * @param meshCount - Number of elements to place; values below 2 place one
 * @returns Centre offsets from the line start, in world units, in order, one per element
 * @public
 */
export function discreteMeshOffsets(totalLength: number, meshWidth: number, meshCount: number): number[] {
    const meshRadius = meshWidth / 2;
    const firstCentre = meshRadius;
    const lastCentre = totalLength - meshRadius;

    // one element at the line's start, or its middle when the line is shorter than the element
    if (meshCount < 2) {
        return [Math.min(firstCentre, totalLength / 2)];
    }

    if (meshCount === 2) {
        return [firstCentre, lastCentre];
    }

    const numInterior = meshCount - 2;
    const numGaps = numInterior + 1;

    // Room between the first element's right edge and the last element's left edge.
    const firstMeshRightEdge = meshWidth;
    const lastMeshLeftEdge = totalLength - meshWidth;
    const dynamicLength = lastMeshLeftEdge - firstMeshRightEdge;

    // Even distribution: the interior elements consume numInterior * meshWidth of the room
    // and the rest is split equally across the numGaps gaps.
    const actualSpacing = (dynamicLength - numInterior * meshWidth) / numGaps;

    const offsets: number[] = [firstCentre];

    let currentPos = firstMeshRightEdge + actualSpacing + meshRadius;
    for (let i = 0; i < numInterior; i++) {
        offsets.push(currentPos);
        currentPos += meshWidth + actualSpacing;
    }

    offsets.push(lastCentre);

    return offsets;
}

/** How a patterned line looks: everything but its pattern, its endpoints and its scene. */
export interface PatternedLineOptions {
    /** Line width. */
    width: number;
    /** Line color. */
    color: string;
    /** Line opacity (0-1). */
    opacity: number;
    /** Whether to use 2D mode rendering; default false. */
    is2DMode?: boolean | undefined;
    /** Explicit element count from `line.patternCount`; omit to follow the spacing rule. */
    patternCount?: number | undefined;
    /**
     * A sinewave's or zigzag's own swing and period, in world units (`line.waveAmplitude`,
     * `line.wavePeriod`); omit to draw the wave within the width.
     */
    wave?: WaveShape | undefined;
}

/**
 * Manages pattern meshes for a single edge line with adaptive mesh density
 */
export class PatternedLineMesh {
    /**
     * One slot per pattern element, in order along the line. Not meshes: each is a slot in the
     * batch every element of its shape is drawn from (issue #444).
     */
    elements: ArrowCap[] = [];
    pattern: PatternType;
    lineDirection = new Vector3(1, 0, 0);
    private lastLength = 0;
    private readonly scene: Scene;
    private readonly width: number;
    private readonly color: string;
    private readonly opacity: number;
    private readonly is2DMode: boolean;
    /** Explicit element count from `line.patternCount`; undefined means follow the spacing rule. */
    private readonly patternCount: number | undefined;
    /** A wave's own swing and period, for a sinewave or zigzag that has them. */
    readonly wave: WaveShape | undefined;
    /** How much of its period each element of a wave with a period of its own draws, in order. */
    private stretches: ZigzagPiece[] = [];
    /**
     * Where the line was last laid: the points of its route in order (two for a straight line; a curve's, a bent
     * line's or a self-loop's run otherwise) and each point's distance along the route from its start.
     */
    private laid: { points: Vector3[]; along: number[] } | null = null;
    private static readonly SEGMENT_LENGTH = 0.75; // Fixed segment length for all edges (for instancing)

    // PHASE 5: Edge compatibility properties (mimic AbstractMesh interface)
    // These aren't used by PatternedLineMesh but are set by Edge.ts for consistency
    isPickable = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any = {};
    // Properties to maintain compatibility with AbstractMesh interface in tests
    position = new Vector3(0, 0, 0);
    scaling = new Vector3(1, 1, 1);
    visibility = 1;
    name = "PatternedLineMesh";
    isDisposed = false;
    sourceMesh: Mesh | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    material: any = null;

    /**
     * Creates a new patterned line mesh
     * @param pattern - The pattern type to render
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     * @param scene - Babylon.js scene
     * @param options - Width, color, opacity, 2D mode and pattern count
     */
    constructor(pattern: PatternType, start: Vector3, end: Vector3, scene: Scene, options: PatternedLineOptions) {
        this.pattern = pattern;
        this.scene = scene;
        this.width = options.width;
        this.color = options.color;
        this.opacity = options.opacity;
        this.is2DMode = options.is2DMode ?? false;
        this.patternCount = options.patternCount;
        this.wave = PATTERN_DEFINITIONS[pattern].connected ? options.wave : undefined;

        this.createInitialMeshes(start, end);
    }

    /**
     * Update pattern mesh positions when line endpoints change
     * Called every frame by Edge.update() during physics simulation
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     */
    update(start: Vector3, end: Vector3): void {
        this.updatePath([start, end]);
    }

    /**
     * Lay the line along a route: its elements spread along the route's own length, each pointing along the route
     * where it sits, so a dashed or dotted line turns the route's corners and follows its curve (issue #3102).
     * @param route - The route's points, in order from where the line starts to where it ends; at least two.
     */
    updatePath(route: readonly Vector3[]): void {
        // A disposed line stays disposed: re-sizing it would take fresh slots for elements nothing
        // will ever give back.
        if (this.isDisposed || route.length < 2) {
            return;
        }

        const newLength = this.lay(route);

        // Adaptive density: adjust mesh count if needed. A wave with a period of its own has exactly
        // the periods that fit, as Cytoscape desktop draws it.
        if (this.wave !== undefined) {
            this.fitWave(newLength);
        } else if (this.needsMeshCountAdjustment(newLength)) {
            this.adjustMeshCount(newLength);
        }

        this.placeElements();

        // For connected patterns, clip last segment to fit exactly
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        if (patternDef.connected && this.elements.length > 0) {
            this.clipLastSegment(newLength);
        }

        this.lastLength = newLength;
    }

    /**
     * Draw or stop drawing every element of this line.
     *
     * Only the hiding half does anything, as for a batched line: showing it again is the next
     * placement's job, which the visibility mask asks for by invalidating the edge's endpoints.
     * @param drawn - Whether the line is on screen.
     */
    setDrawn(drawn: boolean): void {
        for (const element of this.elements) {
            element.setDrawn(drawn);
        }
    }

    /**
     * Clip the last segment to fit exactly to line end
     * Uses shader-based clipping instead of mesh scaling (only in 3D mode)
     * All segments use identical 0.75 geometry
     * @param lineLength - Total length of the line
     */
    private clipLastSegment(lineLength: number): void {
        // Clipping only applies to 3D mode (the clip is the billboard shader's). A wave with a period
        // of its own runs its last period past the line's end, as Cytoscape desktop draws it.
        if (this.is2DMode || this.wave !== undefined) {
            return;
        }

        const lastIndex = this.elements.length - 1;

        // Calculate how much of the last segment should be visible
        const fullSegmentsLength = lastIndex * this.pieceStep(lineLength);
        const remainingLength = Math.max(0, lineLength - fullSegmentsLength);

        // If remainder is nearly full segment (>0.74), don't clip
        this.elements[lastIndex].setClip(remainingLength > 0.74 ? -1 : remainingLength);
    }

    /**
     * Give up every element's slot. A batch goes with the last element drawn from it, taking its
     * mesh and its material, so nothing is left in the scene.
     */
    dispose(): void {
        for (const element of this.elements) {
            element.dispose();
        }
        this.elements = [];
        this.isDisposed = true;
    }

    /**
     * Create initial pattern meshes based on line length
     * Phase 3: Updated to handle alternating patterns
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     */
    private createInitialMeshes(start: Vector3, end: Vector3): void {
        const length = this.lay([start, end]);
        this.lastLength = length;

        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        if (this.wave !== undefined) {
            this.fitWave(length);
        } else {
            const meshCount = this.calculateOptimalMeshCount(length, patternDef);

            // Phase 3: Create elements with alternating shapes for multi-shape patterns
            for (let i = 0; i < meshCount; i++) {
                this.elements.push(this.createPatternElement(i));
            }
        }

        this.placeElements();
    }

    /**
     * Take a route as the one the line is laid along: its points, without repeats, and their distances along it.
     * @param route - The route's points, in order; at least two.
     * @returns The route's length.
     */
    private lay(route: readonly Vector3[]): number {
        // A point that is not finite has no place on the line: it is passed over, as a repeat is, so
        // its length is never infinite and never sizes the pattern (issue #4257).
        const finite = route.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
        let last = (finite.at(0) ?? Vector3.Zero()).clone();
        let length = 0;
        const points = [last];
        const along = [0];
        for (const point of finite.slice(1)) {
            const step = Vector3.Distance(last, point);
            if (step > 0 && Number.isFinite(length + step)) {
                last = point.clone();
                length += step;
                points.push(last);
                along.push(length);
            }
        }

        // a route of one point is a line of length 0 between its two ends, as a straight line between one point
        if (points.length === 1) {
            points.push(last.clone());
            along.push(0);
        }

        this.laid = { points, along };
        this.lineDirection = last.subtract(points[0]).normalize();
        return length;
    }

    /**
     * Where a distance along the route the line was laid on falls, and the route's direction there. A distance before
     * the start or past the end runs on along the first or last segment.
     * @param distance - The distance from the route's start.
     * @param from - The segment to start looking from (1 is the first); a caller placing distances in increasing
     *     order passes back the `segment` it was given, so the whole run is one sweep along the route.
     * @returns The point, the unit direction there and the segment it is on.
     */
    private onRoute(distance: number, from = 1): { point: Vector3; direction: Vector3; segment: number } {
        const { points, along } = this.laid ?? { points: [Vector3.Zero(), Vector3.Zero()], along: [0, 0] };
        let i = Math.max(1, from);
        while (i < points.length - 1 && along[i] < distance) {
            i++;
        }

        const [a, b] = [points[i - 1], points[i]];
        const direction = b.subtract(a).normalize();
        return { point: a.add(direction.scale(distance - along[i - 1])), direction, segment: i };
    }

    /**
     * Put every element where it goes along the line, pointing along the route where it sits. The offsets run in
     * increasing order, so one sweep along the route places them all (issue #3094).
     */
    private placeElements(): void {
        const offsets = this.calculateOffsets();
        let segment = 1;
        for (let i = 0; i < this.elements.length; i++) {
            // a line shorter than its elements can put a later centre before an earlier one: search from the start
            const placed = this.onRoute(offsets[i], i > 0 && offsets[i] < offsets[i - 1] ? 1 : segment);
            ({ segment } = placed);
            const { point, direction } = placed;
            // In 3D the billboard shader faces the element to the camera about this direction; in
            // 2D its slot turns it along the line (issue #620). Either way, as an arrowhead is.
            this.elements[i].place(point, direction);
        }
    }

    /**
     * Check if mesh count needs adjustment based on line length change
     * Uses hysteresis (one mesh too few) to prevent thrashing; never one too many, which the
     * line has no room for: its elements overlap and draw it solid (`pajek-synth-lines` arc 2 -> 3,
     * laid out longer and then shortened, kept three dashes on a line with room for two)
     * @param newLength - New length of the line
     * @returns True if mesh count needs adjustment
     */
    private needsMeshCountAdjustment(newLength: number): boolean {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        const currentCount = this.elements.length;
        const optimalCount = this.calculateOptimalMeshCount(newLength, patternDef);

        return currentCount > optimalCount || optimalCount - currentCount > 1;
    }

    /**
     * Add or remove meshes to match optimal count
     * Phase 3: Updated to handle alternating patterns when adding meshes
     * @param newLength - New length of the line
     */
    private adjustMeshCount(newLength: number): void {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        const optimalCount = this.calculateOptimalMeshCount(newLength, patternDef);
        const currentCount = this.elements.length;

        // The segment that was last may have been clipped to the end of the line. Once it is no
        // longer last it has to be drawn whole again, or the line keeps a gap where its end was.
        if (!this.is2DMode && currentCount > 0) {
            this.elements[currentCount - 1].setClip(-1);
        }

        if (optimalCount > currentCount) {
            // Phase 3: Add elements with correct alternating shapes
            for (let i = 0; i < optimalCount - currentCount; i++) {
                // Use current count + i to get the next element index in sequence
                this.elements.push(this.createPatternElement(currentCount + i));
            }
        } else if (optimalCount < currentCount) {
            const toRemove = currentCount - optimalCount;
            for (let i = 0; i < toRemove; i++) {
                this.elements.pop()?.dispose();
            }
        }
    }

    /**
     * Where along the route each element's centre sits, as a distance from the route's start: a discrete pattern's
     * (dot, star, box, dash, diamond, dash-dot) first and last elements touch the route's two ends and the rest share
     * the room between them evenly ({@link discreteMeshOffsets}); a connected pattern's (sinewave, zigzag) segments
     * sit a fixed 0.75 apart (the last clipped, see clipLastSegment), or a wave's own period apart.
     *
     * IMPORTANT: the route's ends are ALREADY adjusted by the edge for the node surfaces and the arrowheads; nothing
     * is subtracted for those here.
     * @returns One distance per element, in order.
     */
    private calculateOffsets(): number[] {
        const totalLength = this.laid?.along.at(-1) ?? 0;
        if (PATTERN_DEFINITIONS[this.pattern].connected) {
            const step = this.pieceStep(totalLength);
            return this.elements.map((_unused, i) => i * step);
        }

        return discreteMeshOffsets(totalLength, this.getRenderedMeshSize(), this.elements.length);
    }

    /**
     * Get the actual rendered size of pattern meshes (parallel dimension along the line)
     *
     * PatternedLineRenderer scales meshes so their perpendicular dimension matches line width:
     *   shaderSize = width / geometryPerpendicularDiameter
     *
     * This method calculates the PARALLEL dimension (length along the line) after scaling.
     *
     * For circles/stars:
     *   - Geometry has diameter 2.0 in all directions
     *   - Rendered size = 2.0 × (width / 2.0) = width
     *
     * For boxes with aspectRatio:
     *   - Geometry has perpendicular width = 1.0/aspectRatio, parallel length = 1.0
     *   - Rendered parallel = 1.0 × (width / (1.0/aspectRatio)) = width × aspectRatio
     *
     * For diamonds/waves/zigzags:
     *   - Geometry has diameter 1.0 in both directions
     *   - Rendered size = 1.0 × (width / 1.0) = width
     * @returns The rendered mesh size parallel to the line
     */
    private getRenderedMeshSize(): number {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];

        // For alternating patterns, we need to handle both shapes
        // For now, use the first shape as representative (this is for spacing calculations)
        const shapeDef = patternDef.shapes[0];
        const aspectRatio = shapeDef.aspectRatio ?? 1;

        switch (shapeDef.type) {
            case "circle":
            case "star":
                // Circular shapes: rendered diameter = width
                return this.width;
            case "box":
                // Box: rendered parallel length = width × aspectRatio
                return this.width * aspectRatio;
            case "diamond":
            case "sinewave-segment":
            case "zigzag-segment":
                // These have 1:1 aspect ratio: rendered size = width
                return this.width;
            default:
                // a glyph is spaced by its aspect ratio in widths (an arrow, a chevron, two bars: 2)
                return this.width * aspectRatio;
        }
    }

    /**
     * Calculate optimal number of meshes for current line length
     * Algorithm: first/last meshes touch boundaries, interior meshes evenly distributed
     * @param lineLength - Length of the line
     * @param patternDef - Pattern definition containing spacing configuration
     * @returns Optimal number of meshes for the line
     */
    private calculateOptimalMeshCount(lineLength: number, patternDef: PatternDefinition): number {
        if (patternDef.connected && this.wave !== undefined) {
            return this.waveStretches(lineLength).length;
        }

        if (patternDef.connected) {
            // A connected pattern (zigzag, sinewave) tiles seamlessly, so its count follows the
            // fixed segment length; the last segment is clipped to the remainder (clipLastSegment).
            // `line.patternCount` does NOT apply here: segments sit at fixed intervals, so any
            // other count would stop the line short of its end or run it past the node.
            const segments = Math.ceil(lineLength / this.pieceStep(lineLength));
            return Math.min(MAX_PATTERN_PIECES, Math.max(1, segments));
        }

        // lineLength is ALREADY adjusted for node surface and arrow
        // (done by Edge.transformArrowCap()), so nothing is subtracted for those here.
        return discreteMeshCount(lineLength, this.getRenderedMeshSize(), this.patternCount);
    }

    /**
     * How far apart a connected pattern's pieces sit along a line of a length: a wave's own period, or
     * the fixed segment length, unless that would take more than {@link MAX_PATTERN_PIECES} pieces;
     * then the pieces spread out to fit the cap, gaps opening between them, so the pattern still reads.
     * @param length - The line's length.
     * @returns The step, in world units.
     */
    private pieceStep(length: number): number {
        if (this.wave !== undefined) {
            // a wave holds one piece more than its whole periods
            return Math.max(this.wave.period, length / (MAX_PATTERN_PIECES - 1));
        }

        return Math.max(PatternedLineMesh.SEGMENT_LENGTH, length / MAX_PATTERN_PIECES);
    }

    /**
     * The pieces of a wave with a period of its own over a line's length, as Cytoscape desktop draws
     * it: a sine wave's whole periods centered a period apart from the start while one still starts on
     * the line; a zigzag's turns a half period apart from a quarter period on while they fit, two to a
     * period, its last piece stopping at its last turn and the line capped square at both ends.
     * @param length - The line's length.
     * @returns How much of its period each piece draws, and its caps.
     */
    private waveStretches(length: number): ZigzagPiece[] {
        const period = this.pieceStep(length);
        if (this.pattern === "sinewave") {
            return Array.from({ length: Math.floor(length / period) + 1 }, () => ({ stretch: "period" }));
        }

        const turns = length >= period / 4 ? Math.floor((length - period / 4) / (period / 2)) + 1 : 1;
        const count = Math.ceil(turns / 2);
        const end: ZigzagPiece["stretch"] = turns % 2 === 1 ? "first-turn" : "second-turn";
        return Array.from({ length: count }, (_unused, i) => ({
            stretch: i < count - 1 ? "period" : end,
            startCap: i === 0,
            endCap: i === count - 1,
        }));
    }

    /**
     * Make this wave's elements the pieces its length holds, replacing any drawn as another piece.
     * @param length - The line's length.
     */
    private fitWave(length: number): void {
        const wanted = this.waveStretches(length);
        while (this.elements.length > wanted.length) {
            this.elements.pop()?.dispose();
        }
        wanted.forEach((piece, i) => {
            const held = this.stretches.at(i);
            if (i < this.elements.length && held !== undefined && zigzagPieceKey(held) === zigzagPieceKey(piece)) {
                return;
            }
            const element = this.createPatternElement(i, piece);
            if (i < this.elements.length) {
                this.elements[i].dispose();
                this.elements[i] = element;
            } else {
                this.elements.push(element);
            }
        });
        this.stretches = wanted;
    }

    /**
     * Where a wave with a period of its own runs, end to end along its line as it was last laid: from
     * the near end of its first piece to the far end of its last, as drawn (a sine wave's first period
     * is centered on the line's start; a zigzag's last piece stops at its last turn, capped).
     * @returns The two ends, or null for any other line.
     */
    drawnEnds(): [Vector3, Vector3] | null {
        const span = this.waveSpan();
        return span === null ? null : [this.onRoute(span[0]).point, this.onRoute(span[1]).point];
    }

    /**
     * The route this line is drawn along, as it was last laid: the route's points from end to end, or for a wave
     * with a period of its own from where its first piece starts to where its last ends ({@link drawnEnds}).
     * @returns The points, in order, as fresh vectors; null before the line was laid.
     */
    drawnRoute(): Vector3[] | null {
        if (this.laid === null) {
            return null;
        }

        const { points, along } = this.laid;
        const span = this.waveSpan();
        if (span === null) {
            return points.map((p) => p.clone());
        }

        // the route's corners the wave runs through; its two ends are the wave's own
        const [from, to] = span;
        const inside = points.slice(1, -1).filter((_p, i) => along[i + 1] > from && along[i + 1] < to);
        return [this.onRoute(from).point, ...inside.map((p) => p.clone()), this.onRoute(to).point];
    }

    /**
     * The middle of the route this line was last laid along, halfway along its length.
     * @returns The point.
     */
    routeMiddle(): Vector3 {
        return this.onRoute((this.laid?.along.at(-1) ?? 0) / 2).point;
    }

    /**
     * How far along its route a wave with a period of its own starts and ends, as drawn.
     * @returns The two distances from the route's start, or null for any other line.
     */
    private waveSpan(): [number, number] | null {
        const first = this.stretches.at(0);
        const last = this.stretches.at(-1);
        if (this.wave === undefined || this.laid === null || first === undefined || last === undefined) {
            return null;
        }

        const { wave } = this;
        const along = (piece: ZigzagPiece): number[] => {
            const { inner, outer } = PatternedLineRenderer.wavePiece(this.pattern, this.width, wave, piece);
            return [...inner, ...outer].map(([x]) => x);
        };
        return [
            Math.min(...along(first)),
            (this.stretches.length - 1) * this.pieceStep(this.laid.along.at(-1) ?? 0) + Math.max(...along(last)),
        ];
    }

    /**
     * Create a single pattern element
     * Phase 3: Updated to handle alternating patterns via element index
     * @param meshIndex - Index of the element in the sequence (for alternating patterns)
     * @param piece - How much of its period a wave's element draws, and its caps
     * @returns The element: a slot in its shape's batch
     */
    private createPatternElement(meshIndex: number, piece: ZigzagPiece = WHOLE_PERIOD): ArrowCap {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];

        // Phase 3: For multi-shape patterns, determine which shape to use based on index
        let shapeType: PatternShapeType | undefined;

        if (patternDef.shapes.length > 1) {
            // Alternating pattern: use modulo to cycle through shapes
            const shapeIndex = meshIndex % patternDef.shapes.length;
            shapeType = patternDef.shapes[shapeIndex].type;
        }

        // All connected segments use the same fixed 0.75 geometry; the last is clipped instead.
        return PatternedLineRenderer.createPatternElement(
            this.pattern,
            this.width,
            this.color,
            this.opacity,
            this.scene,
            { shapeType, is2DMode: this.is2DMode, wave: this.wave, piece },
        );
    }
}
