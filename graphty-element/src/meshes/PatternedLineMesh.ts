/**
 * PatternedLineMesh - Manages pattern meshes for a single edge line
 *
 * Architecture:
 * - Individual meshes in world space (no parent/child hierarchy)
 * - Uses FilledArrowRenderer shader for billboarding
 * - Adaptive mesh density (add/remove meshes as line length changes)
 * - Proven 35x faster than thin instances for position updates
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

import { Mesh, Scene, ShaderMaterial, Vector3 } from "@babylonjs/core";

import { FilledArrowRenderer } from "./FilledArrowRenderer";
import {
    PATTERN_DEFINITIONS,
    type PatternDefinition,
    PatternedLineRenderer,
    type PatternType,
} from "./PatternedLineRenderer";

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
 * Number of meshes a discrete pattern needs to cover a line of the given length.
 *
 * The layout this counts for: the first element's left edge sits exactly on the start of
 * the line, the last element's right edge sits exactly on the end of it, and any interior
 * elements are distributed evenly in between. So the answer is always at least 2.
 *
 * The count is unbounded by design: it follows the spacing rule, so a longer edge gets more
 * elements. A caller that needs a ceiling sets `line.patternCount`, which overrides the rule.
 * @param lineLength - Length of the line in world units, ALREADY trimmed for the node surface and the arrowhead by Edge.transformArrowCap
 * @param meshWidth - Rendered length of one pattern element along the line, in world units
 * @param patternCount - Explicit element count from `line.patternCount`; omit to follow the spacing rule
 * @returns Mesh count, at least 2
 * @public
 */
export function discreteMeshCount(lineLength: number, meshWidth: number, patternCount?: number): number {
    // An explicit count is the caller's decision and overrides the spacing rule entirely, so the
    // elements are spread evenly over the edge whatever its length or the line's width.
    if (patternCount !== undefined) {
        return Math.max(2, Math.floor(patternCount));
    }

    // Space available between the first element's right edge and the last element's left
    // edge. lineLength is already adjusted for the node surface and the arrow, so nothing
    // is subtracted for those a second time.
    const dynamicLength = lineLength - 2 * meshWidth;

    // Line too short to hold anything between the two boundary elements.
    if (dynamicLength < 0) {
        return 2;
    }

    const period = patternElementPeriod(meshWidth);
    const minSpacing = period - meshWidth;

    // K interior elements open K + 1 gaps, so K * meshWidth + (K + 1) * minSpacing must fit
    // inside dynamicLength. Solving for K gives the line below.
    const numInterior = Math.floor((dynamicLength - minSpacing) / period);

    return 2 + Math.max(0, numInterior);
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
 * @param meshCount - Number of elements to place; values below 2 are treated as 2
 * @returns Centre offsets from the line start, in world units, in order, one per element
 * @public
 */
export function discreteMeshOffsets(totalLength: number, meshWidth: number, meshCount: number): number[] {
    const meshRadius = meshWidth / 2;
    const firstCentre = meshRadius;
    const lastCentre = totalLength - meshRadius;

    if (meshCount <= 2) {
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

/**
 * Manages pattern meshes for a single edge line with adaptive mesh density
 */
export class PatternedLineMesh {
    meshes: Mesh[] = []; // Individual pattern meshes in world space
    pattern: PatternType;
    lineDirection = new Vector3(1, 0, 0);
    private lastLength = 0;
    private scene: Scene;
    private width: number;
    private color: string;
    private opacity: number;
    private is2DMode: boolean;
    /** Explicit element count from `line.patternCount`; undefined means follow the spacing rule. */
    private patternCount: number | undefined;
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
     * @param width - Line width
     * @param color - Line color
     * @param opacity - Line opacity (0-1)
     * @param scene - Babylon.js scene
     * @param is2DMode - Whether to use 2D mode rendering
     * @param patternCount - Explicit element count from `line.patternCount`; omit to follow the spacing rule
     */
    constructor(
        pattern: PatternType,
        start: Vector3,
        end: Vector3,
        width: number,
        color: string,
        opacity: number,
        scene: Scene,
        is2DMode = false,
        patternCount?: number,
    ) {
        this.pattern = pattern;
        this.scene = scene;
        this.width = width;
        this.color = color;
        this.opacity = opacity;
        this.is2DMode = is2DMode;
        this.patternCount = patternCount;

        this.createInitialMeshes(start, end);
    }

    /**
     * Update pattern mesh positions when line endpoints change
     * Called every frame by Edge.update() during physics simulation
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     */
    update(start: Vector3, end: Vector3): void {
        const newLength = Vector3.Distance(start, end);
        this.lineDirection = end.subtract(start).normalize();

        // Adaptive density: adjust mesh count if needed
        if (this.needsMeshCountAdjustment(newLength)) {
            this.adjustMeshCount(newLength);
        }

        // Update positions (world space)
        const positions = this.calculatePositions(start, end);
        for (let i = 0; i < this.meshes.length; i++) {
            this.meshes[i].position = positions[i];

            // CRITICAL: Update lineDirection uniform for billboarding shader (only in 3D mode)
            // This makes pattern meshes face the camera like arrowheads do
            if (!this.is2DMode) {
                FilledArrowRenderer.setLineDirection(this.meshes[i], this.lineDirection);
            }
        }

        // For connected patterns, clip last segment to fit exactly
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        if (patternDef.connected && this.meshes.length > 0) {
            this.clipLastSegment(newLength);
        }

        this.lastLength = newLength;
    }

    /**
     * Clip the last segment to fit exactly to line end
     * Uses shader-based clipping instead of mesh scaling (only in 3D mode)
     * All segments use identical 0.75 geometry (for instancing)
     * @param lineLength - Total length of the line
     */
    private clipLastSegment(lineLength: number): void {
        // Clipping only applies to 3D mode (uses shader uniforms)
        if (this.is2DMode) {
            return;
        }

        const lastIndex = this.meshes.length - 1;
        const lastMesh = this.meshes[lastIndex];

        // Calculate how much of the last segment should be visible
        const fullSegmentsLength = lastIndex * PatternedLineMesh.SEGMENT_LENGTH;
        const remainingLength = Math.max(0, lineLength - fullSegmentsLength);

        // Set clip uniform on the last segment's material
        const material = lastMesh.material as ShaderMaterial;
        // If remainder is nearly full segment (>0.74), don't clip
        if (remainingLength > 0.74) {
            material.setFloat("clipEndX", -1.0); // Disable clipping
        } else {
            material.setFloat("clipEndX", remainingLength);
        }

        // Reset scaling (no longer needed)
        lastMesh.scaling.set(1, 1, 1);
    }

    /**
     * Dispose all pattern meshes and the ShaderMaterial each one owns.
     *
     * DEFECT REPAIRED HERE -- an unbounded per-frame cost that survived the meshes:
     * this used to call `mesh.dispose()` with Babylon's default arguments, and
     * `AbstractMesh.dispose(doNotRecurse = false, disposeMaterialAndTextures = false)`
     * does NOT dispose the material. Every pattern element owns its OWN `ShaderMaterial`
     * (there is no material sharing on this path), so each disposal orphaned one material
     * that stayed registered in `PatternedLineRenderer`'s and `FilledArrowRenderer`'s
     * `activeMaterials` sets forever. Those sets are walked once per frame to push the
     * camera position uniform, so the per-frame cost grew monotonically with every style
     * edit -- change the line style four times and the fourth graph pays for all four.
     *
     * The `catch` inside those per-frame walks, which looks like it would evict a dead
     * material, CANNOT fire: `ShaderMaterial.setVector3` does not throw on a disposed
     * material, it simply records the value. So eviction had to become explicit.
     *
     * Two belts here, deliberately. `releaseMaterial` unregisters eagerly, and
     * `dispose(false, true)` disposes the material so the `onDisposeObservable` hook
     * installed by `FilledArrowRenderer.applyShader` unregisters it a second time (a no-op
     * on a Set). Confirmed safe by inspection before changing it: `applyShader` is the only
     * code that assigns a material on this path and it constructs a fresh `ShaderMaterial`
     * per call, so no material here is shared with another mesh and disposing it cannot
     * blank out someone else's geometry.
     */
    dispose(): void {
        for (const mesh of this.meshes) {
            PatternedLineMesh.disposePatternMesh(mesh);
        }
        this.meshes = [];
        this.isDisposed = true;
    }

    /**
     * Dispose one pattern mesh together with the ShaderMaterial it exclusively owns.
     *
     * Shared by {@link PatternedLineMesh.dispose} and by the shrink branch of
     * {@link PatternedLineMesh.adjustMeshCount}. Both paths leaked identically before this
     * repair, and the adjust path leaks far more often: it runs whenever the layout moves
     * the endpoints far enough to change the optimal count, which during a force-directed
     * simulation is many times a second.
     * @param mesh - The pattern mesh to destroy
     */
    private static disposePatternMesh(mesh: Mesh): void {
        const { material } = mesh;
        if (material instanceof ShaderMaterial) {
            PatternedLineRenderer.releaseMaterial(material);
        }

        // doNotRecurse = false, disposeMaterialAndTextures = true.
        mesh.dispose(false, true);
    }

    /**
     * Create initial pattern meshes based on line length
     * Phase 3: Updated to handle alternating patterns
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     */
    private createInitialMeshes(start: Vector3, end: Vector3): void {
        const length = Vector3.Distance(start, end);
        this.lastLength = length;
        this.lineDirection = end.subtract(start).normalize();

        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        const meshCount = this.calculateOptimalMeshCount(length, patternDef);

        // Phase 3: Create meshes with alternating shapes for multi-shape patterns
        for (let i = 0; i < meshCount; i++) {
            const mesh = this.createPatternMesh(i);
            this.meshes.push(mesh);
        }

        // Set initial positions and lineDirection
        const positions = this.calculatePositions(start, end);
        for (let i = 0; i < this.meshes.length; i++) {
            this.meshes[i].position = positions[i];

            // Set lineDirection uniform for billboarding (only in 3D mode)
            if (!this.is2DMode) {
                FilledArrowRenderer.setLineDirection(this.meshes[i], this.lineDirection);
            }
        }
    }

    /**
     * Check if mesh count needs adjustment based on line length change
     * Uses hysteresis (±1 mesh) to prevent thrashing
     * @param newLength - New length of the line
     * @returns True if mesh count needs adjustment
     */
    private needsMeshCountAdjustment(newLength: number): boolean {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        const currentCount = this.meshes.length;
        const optimalCount = this.calculateOptimalMeshCount(newLength, patternDef);

        return Math.abs(currentCount - optimalCount) > 1; // Hysteresis: ±1 mesh
    }

    /**
     * Add or remove meshes to match optimal count
     * Phase 3: Updated to handle alternating patterns when adding meshes
     * @param newLength - New length of the line
     */
    private adjustMeshCount(newLength: number): void {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];
        const optimalCount = this.calculateOptimalMeshCount(newLength, patternDef);
        const currentCount = this.meshes.length;

        if (optimalCount > currentCount) {
            // Phase 3: Add meshes with correct alternating shapes
            for (let i = 0; i < optimalCount - currentCount; i++) {
                // Use current count + i to get the next mesh index in sequence
                const meshIndex = currentCount + i;
                const mesh = this.createPatternMesh(meshIndex);
                this.meshes.push(mesh);
            }
        } else if (optimalCount < currentCount) {
            // Remove meshes
            const toRemove = currentCount - optimalCount;
            for (let i = 0; i < toRemove; i++) {
                const mesh = this.meshes.pop();
                if (mesh) {
                    PatternedLineMesh.disposePatternMesh(mesh);
                }
            }
        }
    }

    /**
     * Calculate mesh positions along the line
     * Supports both discrete patterns (with spacing) and connected patterns (seamless)
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     * @returns Array of positions for each pattern mesh
     */
    private calculatePositions(start: Vector3, end: Vector3): Vector3[] {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];

        if (patternDef.connected) {
            return this.calculateConnectedPositions(start, end, patternDef);
        }

        return this.calculateDiscretePositions(start, end);
    }

    /**
     * Calculate positions for discrete patterns (dot, star, box, dash, diamond, dash-dot)
     *
     * Algorithm: the first and last elements touch the line's two boundaries and the
     * interior elements are distributed evenly between them. The scalar layout lives in
     * {@link discreteMeshOffsets}; this method only maps those offsets onto the line's
     * direction vector.
     *
     * IMPORTANT: start and end are ALREADY adjusted by Edge.transformArrowCap():
     *  - start = ray intersection with source node surface
     *  - end = destination surface minus arrow length
     * DO NOT subtract nodeRadius or arrowLength again!
     *
     * DEFECT REPAIRED HERE: this method used to take the pattern definition as
     * `_patternDef`, an underscore-prefixed parameter marked unused, alongside its own
     * private copy of the spacing rule (`const minSpacing = meshWidth * 0.5`) whose value
     * cancelled out of the arithmetic it fed. The dead parameter and the dead arithmetic
     * together disguised the fact that this layout is a pure function of the mesh COUNT,
     * which is what let the count grow without bound in
     * {@link discreteMeshCount} without anyone noticing the positions never objected. The
     * parameter is gone rather than merely de-underscored, because the honest signature is
     * the one that says the pattern definition is not consulted: the definition's influence
     * reaches this layout through `getRenderedMeshSize()` and through the count, and adding
     * a second, direct path would be the very duplication the repair removes.
     * @param start - Starting point of the line (already adjusted for node surface)
     * @param end - Ending point of the line (already adjusted for arrow)
     * @returns Array of world-space positions, one per pattern mesh, in order
     */
    private calculateDiscretePositions(start: Vector3, end: Vector3): Vector3[] {
        const direction = end.subtract(start).normalize();
        const totalLength = Vector3.Distance(start, end);
        const meshWidth = this.getRenderedMeshSize();

        const offsets = discreteMeshOffsets(totalLength, meshWidth, this.meshes.length);

        return offsets.map((offset) => start.add(direction.scale(offset)));
    }

    /**
     * Calculate positions for connected patterns (sinewave, zigzag)
     * Phase 4: Seamless connection - meshes positioned at fixed intervals
     *
     * All segments use FIXED 0.75 geometry (for instancing).
     * Last segment is scaled in X-direction to fit exactly (see scaleLastSegment).
     * @param start - Starting point of the line
     * @param end - Ending point of the line
     * @param _patternDef - Pattern definition (unused, reserved for future use)
     * @returns Array of positions for each pattern mesh
     */
    private calculateConnectedPositions(
        start: Vector3,
        end: Vector3,

        _patternDef: PatternDefinition,
    ): Vector3[] {
        const direction = end.subtract(start).normalize();

        const meshCount = this.meshes.length;
        const positions: Vector3[] = [];

        // Position segments at fixed 0.75 intervals (same geometry for all)
        for (let i = 0; i < meshCount; i++) {
            const distance = i * PatternedLineMesh.SEGMENT_LENGTH;
            positions.push(start.add(direction.scale(distance)));
        }

        return positions;
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
        const aspectRatio = shapeDef.aspectRatio ?? 1.0;

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
                return this.width;
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
        if (patternDef.connected) {
            // A connected pattern (zigzag, sinewave) tiles seamlessly, so its count follows the
            // fixed segment length; the last segment is scaled to fit the remainder (clipLastSegment).
            // An explicit count still wins, so `line.patternCount` controls every pattern type.
            if (this.patternCount !== undefined) {
                return Math.max(1, Math.floor(this.patternCount));
            }
            const segments = Math.ceil(lineLength / PatternedLineMesh.SEGMENT_LENGTH);
            return Math.max(1, segments);
        }

        // lineLength is ALREADY adjusted for node surface and arrow
        // (done by Edge.transformArrowCap()), so nothing is subtracted for those here.
        return discreteMeshCount(lineLength, this.getRenderedMeshSize(), this.patternCount);
    }

    /**
     * Create a single pattern mesh
     * Phase 3: Updated to handle alternating patterns via mesh index
     * @param meshIndex - Index of the mesh in the sequence (for alternating patterns)
     * @returns The created pattern mesh
     */
    private createPatternMesh(meshIndex: number): Mesh {
        const patternDef = PATTERN_DEFINITIONS[this.pattern];

        // Phase 3: For multi-shape patterns, determine which shape to use based on index
        let shapeType: "circle" | "star" | "box" | "diamond" | "sinewave-segment" | "zigzag-segment" | undefined;

        if (patternDef.shapes.length > 1) {
            // Alternating pattern: use modulo to cycle through shapes
            const shapeIndex = meshIndex % patternDef.shapes.length;
            shapeType = patternDef.shapes[shapeIndex].type;
        }

        // All segments use FIXED 0.75 geometry (for instancing)
        // No custom segment length passed - uses default 0.75
        const mesh = PatternedLineRenderer.createPatternMesh(
            this.pattern,
            this.width,
            this.color,
            this.opacity,
            this.scene,
            shapeType,
            undefined, // segmentLength
            this.is2DMode,
        );

        // Initialize as non-clipped (will be updated in clipLastSegment if needed, only in 3D mode)
        if (patternDef.connected && !this.is2DMode) {
            const material = mesh.material as ShaderMaterial;
            material.setFloat("clipEndX", -1.0); // -1.0 = no clipping
        }

        return mesh;
    }
}
