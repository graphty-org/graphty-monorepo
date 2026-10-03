import { AbstractMesh, Ray, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import * as jmespath from "jmespath";
import cloneDeep from "lodash/cloneDeep.js";
import isEqual from "lodash/isEqual.js";

import type { AdHocData, EdgeStyleConfig, RichTextStyleType } from "./config";
import { EDGE_CONSTANTS } from "./constants/meshConstants";
import { edgeIdOf } from "./data/edgeIdentity";
import type { Graph } from "./Graph";
import type { GraphContext } from "./managers/GraphContext";
import { bootstrapEdgePaint, type EdgePaint } from "./managers/StylePainter";
import type { ArrowCap } from "./meshes/ArrowCapBatch";
import type { EdgeLineBatch } from "./meshes/EdgeLineBatch";
import { EdgeMesh } from "./meshes/EdgeMesh";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";
import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { Node, NodeIdType } from "./Node";
import { frozenRecord } from "./session/project/draft";

interface InterceptPoint {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
    newEndPoint: Vector3 | null;
}

interface EdgeLine {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
}

/**
 * Where an edge's own label hangs when its block does not say, and how far off.
 *
 * The middle of the line, touching it. A label's block always carries a `location` once the
 * schema has parsed it, so this is what a caller who assembled a block by hand falls back to.
 */
const EDGE_LABEL_LOCATION: AttachPosition = "center";

/** How far an edge's own label sits from the middle of the line when its block does not say. */
const EDGE_LABEL_OFFSET = 0;

/**
 * Where a caption hangs from the cap it belongs to, when its own block does not say.
 *
 * Above the cap and a little clear of it, which is where the 1.x arrow captions sat. Unlike a
 * label's block, an arrow caption's is optional in the schema and carries no parsed defaults, so
 * this is the ordinary case rather than the fallback.
 */
const ARROW_CAPTION_LOCATION: AttachPosition = "top";

/** How far a caption sits from its cap when its own block does not say. */
const ARROW_CAPTION_OFFSET = 0.3;

/**
 * The caption one end of an edge should be drawing, or undefined when it should draw none.
 *
 * TWO WAYS TO GET NOTHING, AND THEY MEAN DIFFERENT THINGS.
 *
 * Words are what switch a caption on, exactly as they switch a label on: `StylePainter` sets a
 * rich-text block's `enabled` whenever a layer writes the words that land in it, so a layer that
 * wrote only the APPEARANCE -- `edge.arrowHeadTextStyle` with no `edge.arrowHeadText` beneath it
 * -- has said how a caption should look without ever asking for one, and gets none. That is the
 * same rule `node.labelStyle` follows beside `node.label`, and it is what lets a theme carry a
 * caption's typeface for every edge while only the edges a layer names actually carry a caption.
 *
 * And a caption hangs from the cap at its end: `Edge.update` positions it against that cap's
 * mesh. An end drawn with no arrow has no mesh to hang one from, and a caption built anyway
 * would never be positioned at all -- it would be drawn at the middle of the scene, which is
 * what a reader would see rather than a missing caption.
 * @param block - The resolved rich-text block at that end of the edge, if there is one.
 * @param cap - The arrow mesh at that end, which is null when the end is drawn with no arrow.
 * @returns The block when a caption should be drawn from it, and undefined otherwise.
 */
function captionWanted(block: RichTextStyleType | undefined, cap: ArrowCap | null): RichTextStyleType | undefined {
    return cap !== null && block?.enabled === true ? block : undefined;
}

/**
 * The frame each node mesh's world matrix was last recomputed for.
 *
 * Keyed on the MESH rather than on the node, so a node that is given a new mesh -- a reshape --
 * starts with no entry and is recomputed rather than skipped on a stamp its old mesh earned.
 */
const worldMatrixFrame = new WeakMap<AbstractMesh, number>();

/** Scratch ends of one curve segment, so placing a curve allocates nothing per segment. */
const curveFrom = new Vector3();
const curveTo = new Vector3();

/**
 * Make sure a node mesh's world matrix is this frame's, and only compute it once per frame.
 *
 * WHY IT HAS TO BE FRESH. Trimming an edge at the node surface intersects a ray with the node's
 * mesh, and that test reads the mesh's world matrix -- which is stale from the moment the frame
 * moved the node until something recomputes it.
 *
 * WHY IT IS COUNTED. A node with twenty edges on it would otherwise be recomputed twenty times a
 * frame. This used to be paid for by a separate pass over every edge in the graph that collected
 * the meshes into a set first, which cost a set of its own and a walk of every edge whether or
 * not any of them had moved. Asking here means it is paid once per node, and only for the nodes
 * an edge that actually moved is about to intersect.
 * @param mesh - The node mesh about to be intersected.
 * @param frame - The scene's current frame id.
 */
function freshenWorldMatrix(mesh: AbstractMesh, frame: number): void {
    if (worldMatrixFrame.get(mesh) === frame) {
        return;
    }

    worldMatrixFrame.set(mesh, frame);
    mesh.computeWorldMatrix(true);
}

interface EdgeOpts {
    metadata?: object;
}

/** Writes an edge's row; see {@link placeEdgeRow}. */
let writeEdgeRow: (edge: Edge, row: number) => void;

/**
 * Move an edge to a row of the current snapshot. Only the data manager calls it, as an edge is
 * added, removed or renumbered by a compacting freeze.
 * @param edge - The edge.
 * @param row - Its logical edge index, or INVALID_INDEX.
 */
export function placeEdgeRow(edge: Edge, row: number): void {
    writeEdgeRow(edge, row);
}

/** Writes an edge's record; see {@link adoptEdgeRecord}. */
let writeRecord: (edge: Edge, record: AdHocData) => void;

/**
 * Hand an edge the record the graph now holds for it. Only the data manager calls it, from the
 * render half of the graph's derivation, when a command, an undo or a redo changed the record;
 * no entry point exports it, so `edge.data` is always the graph's record.
 * @param edge - The edge.
 * @param record - The record.
 */
export function adoptEdgeRecord(edge: Edge, record: AdHocData): void {
    writeRecord(edge, record);
}

/**
 * Represents a directed edge between two nodes in the graph visualization.
 * Handles rendering of edge lines, arrow heads/tails, and labels with support for various styles.
 */
export class Edge {
    parentGraph: Graph | GraphContext;
    opts: EdgeOpts;
    readonly srcId: NodeIdType;
    readonly dstId: NodeIdType;

    /**
     * This edge's identity: the element-assigned counter the store stamped into its
     * `graphty.edgeId` column, printed as a string.
     *
     * It used to be the `"srcId:dstId"` pair string, which could not name two edges between the
     * same pair at all -- so parallel edges were dropped -- and which collided for any node id
     * containing a colon: an edge `a:b -> c` and an edge `a -> b:c` had the same id. The counter
     * is unique by construction, so both of those are now two distinct edges.
     */
    readonly id: string;

    /**
     * This edge's LOGICAL edge index in the element's current GraphSnapshot, assigned at add time
     * and re-keyed through `report.edgeRemap` on a compacting freeze.
     *
     * Every Edge has one. An edge whose endpoint ids graph-format will not store is REJECTED
     * before a render object is built for it, so there is no such thing as an Edge with no row --
     * which is what makes `index` safe to read without a guard everywhere downstream.
     * @returns The row.
     */
    get index(): number {
        return this.row;
    }

    private set index(row: number) {
        this.row = row;
    }

    private row: number = INVALID_INDEX;

    static {
        writeEdgeRow = (edge, row) => {
            edge.index = row;
        };
        writeRecord = (edge, record) => {
            edge.#record = frozenRecord(record);
        };
    }
    dstNode: Node;
    srcNode: Node;
    /**
     * The record this edge carries, as the graph holds it: deep-frozen, so a write to it throws. A
     * change goes through the graph (`updateNodes`, `session.data.updateNodes`, ...), which is what undo sees.
     * @returns The record.
     */
    get data(): AdHocData {
        return this.#record;
    }

    /** The record, as the graph last handed it over. */
    #record: AdHocData;
    /**
     * The mesh this edge's line is drawn by.
     *
     * NOT ALWAYS THIS EDGE'S OWN MESH ANY MORE. Every line but a patterned one -- straight or
     * curved, 2D or 3D -- is drawn as thin instances of a batch shared by every edge of the same
     * appearance, and this then points at
     * the batch's mesh -- so it still answers what the line is drawn as, and it is still the
     * thing to ask whether the renderer's geometry has been disposed under it, but disposing it
     * or enabling it would reach every other edge in the batch. This edge's private `lineBatch` says
     * which of the two an edge is, and every write below is routed through it.
     */
    mesh: AbstractMesh | PatternedLineMesh; // PHASE 5: Support both solid lines and patterned lines
    /**
     * This edge's head cap, as a slot in the batch that draws every cap of its appearance, and
     * null when the style asks for none.
     *
     * NOT A MESH ANY MORE. A cap was a `Mesh` with a `ShaderMaterial` of its own, then an
     * `InstancedMesh` of a shared source, and is now sixteen floats in a shared array plus the
     * seven the billboard shader reads -- so there is nothing per cap in the scene to position,
     * enable or dispose. An `ArrowCap` -- a slot in `ArrowCapBatch` -- is what an edge holds instead,
     * and every question the renderer asks of a cap is answered off its batch.
     */
    arrowMesh: ArrowCap | null = null;

    /** This edge's tail cap, the same way. */
    arrowTailMesh: ArrowCap | null = null;

    /**
     * The batch this edge's line is drawn from, or null for a patterned line, whose elements are
     * slots in batches of their own (see `PatternedLineMesh`). See {@link EdgeMesh.lineBatch}.
     */
    private lineBatch: EdgeLineBatch | null = null;

    /**
     * Which slots of {@link Edge.lineBatch} draw this edge: one for a straight line, and one per
     * segment of a curve, which is a run of straight segments. Empty when there is no batch.
     */
    private lineSlots: number[] = [];

    /** Whether this edge's line is a curve, drawn as a run of slots rebuilt as its ends move. */
    private lineIsCurve = false;

    /**
     * The source mesh this edge is currently drawn from.
     *
     * The interner's key with the colour put back in, because the edge renderer has no
     * per-instance state to carry one. See `EdgePaint`.
     */
    private meshKey: string;

    /**
     * What the session's style stack resolved for this edge, or null while no pass has resolved
     * one and the element's own defaults are what is drawn.
     *
     * READ FOR EVERY DRAWING DECISION, not only for the mesh: whether the line bows, which arrow
     * caps it carries and how wide it is are all read again on frames the style stack knows
     * nothing about.
     */
    private sessionPaint: EdgePaint | null = null;
    // XXX: performance impact when not needed?
    ray: Ray;
    label: RichTextLabel | null = null;
    arrowHeadText: RichTextLabel | null = null;
    arrowTailText: RichTextLabel | null = null;
    private _arrowHeadTextOffset = ARROW_CAPTION_OFFSET;
    private _arrowTailTextOffset = ARROW_CAPTION_OFFSET;
    private _arrowHeadTextAttachPosition: AttachPosition = ARROW_CAPTION_LOCATION;
    private _arrowTailTextAttachPosition: AttachPosition = ARROW_CAPTION_LOCATION;
    private _labelOffset = EDGE_LABEL_OFFSET;
    private _labelAttachPosition: AttachPosition = EDGE_LABEL_LOCATION;

    /**
     * The words the label on screen is drawing, and undefined when this edge draws no label.
     *
     * WHY THIS EXISTS, which is the defect it closes. `edge.label`, `edge.labelStyle` and the
     * four arrow-caption channels are `role: "content"` in `src/session/styles/intern.ts` and
     * deliberately key no source mesh. So a paint that changes only an edge's words arrives carrying the same
     * mesh key as the paint before it, and the comparison at the top of `paintFrom` -- which
     * returns having applied NOTHING at all, an edge having no per-instance state to write --
     * discarded it. `styles.add({ set: { "edge.label": "..." } })` over a graph already on
     * screen resolved the text, reported it, and drew nothing.
     *
     * Held beside {@link drawnLabelStyle} so {@link syncContent} can run on every paint and
     * still cost nothing when the text has not moved.
     */
    private drawnLabelText?: string;

    /** The style the current line and caps were built from; see `paintFrom`. */
    private drawnStyle: EdgeStyleConfig | null = null;

    /**
     * The resolved label block the label on screen was built from.
     *
     * Deep-compared rather than compared by reference: `StylePainter.edgePaint` builds a fresh
     * paint on every call, so two paints that say the same thing are never the same object.
     */
    private drawnLabelStyle?: EdgeStyleConfig["label"];

    /** The arrow-head text block the glyph on screen was built from. See {@link syncContent}. */
    private drawnArrowHeadText?: NonNullable<EdgeStyleConfig["arrowHead"]>["text"];

    /** The arrow-tail text block the glyph on screen was built from. See {@link syncContent}. */
    private drawnArrowTailText?: NonNullable<EdgeStyleConfig["arrowTail"]>["text"];
    // Debug flag for logging lineDirection (reserved for future use)
    private _loggedLineDirection: boolean = false;

    // Dirty tracking: Cache last node positions to skip unnecessary updates
    private _lastSrcPos: Vector3 | null = null;
    private _lastDstPos: Vector3 | null = null;

    /**
     * Set once {@link Edge.dispose} has run. Guards the two methods that would otherwise rebuild
     * this edge's meshes -- see the comment on `dispose` for why a disposed Edge still receives
     * calls every frame.
     */
    private disposed = false;

    /**
     * Whether the visibility mask says this edge is part of the graph on screen.
     *
     * Held rather than derived so the renderer can apply a mask as a DELTA: an edge whose
     * visibility did not move costs no mesh operation at all.
     */
    private renderVisible = true;

    /**
     * Whether this edge is in the session's selection.
     *
     * Tracked here so the renderer owns the answer; see {@link Edge.setSelected} for what is and
     * is not drawn from it today.
     */
    private selected = false;

    /**
     * Helper to check if we're using GraphContext
     * @returns The GraphContext instance
     */
    private get context(): GraphContext {
        // Check if parentGraph has GraphContext methods
        if ("getStyles" in this.parentGraph) {
            return this.parentGraph;
        }

        // Otherwise, it's a Graph instance which implements GraphContext
        return this.parentGraph;
    }

    /**
     * Where this edge sits among the edges sharing its ordered endpoint pair, counting from zero.
     *
     * Derived on every read from the graph store rather than stored, so a removal cannot leave it
     * stale. Nothing draws with it yet -- two parallel edges still render as two
     * coincident lines -- but a style layer can read it, and the geometry work that eventually
     * separates parallel edges needs exactly this number.
     * @returns the rank, or -1 for an edge the store no longer holds
     */
    get parallelRank(): number {
        return this.context.getDataManager().getEdgesBetween(this.srcId, this.dstId).indexOf(this);
    }

    /**
     * What this edge's line is drawn as, when it is drawn from a shared batch.
     *
     * THE ONLY READING OF A BATCHED LINE THERE IS. A line drawn as a thin instance has no mesh of
     * its own in the scene and no material of its own, so the scene walk that reads an edge's
     * appearance off `scene.meshes` -- which is how the story assertions have always read it --
     * finds one batch where it used to find one mesh per edge. The edge itself is where the
     * answer moved to: the batch's name carries the interned appearance, exactly as the instance
     * name did, and the length is the drawn extent the bounding box used to carry.
     * @returns The appearance, or null for a patterned line, whose elements are read through
     *     {@link Edge.drawnPattern}.
     */
    get drawnLine(): { name: string; length: number; visibility: number; centre: Vector3 } | null {
        if (this.lineBatch === null) {
            return null;
        }

        const batch = this.lineBatch;

        return {
            name: batch.name,
            // A curve's length is its whole run's.
            length: this.lineSlots.reduce((sum, slot) => sum + batch.lengthOf(slot), 0),
            visibility: batch.mesh.visibility,
            centre: this.curveMiddle(batch),
        };
    }

    /**
     * The middle of this edge's run of slots: the middle of its one slot for a straight line, and
     * for a curve the middle of its middle segment, or the joint between its two middle ones.
     * @param batch - The batch the slots are in.
     * @returns The point, as a fresh vector.
     */
    private curveMiddle(batch: EdgeLineBatch): Vector3 {
        const n = this.lineSlots.length;

        return n % 2 === 1 ? batch.centreOf(this.lineSlots[(n - 1) / 2]) : batch.endsOf(this.lineSlots[n / 2])[0];
    }

    /**
     * The points this edge's curve is drawn through, or null when its line is not a curve.
     *
     * A curve is a run of slots in a shared batch and has no mesh of its own whose vertices say
     * how far it bows, so the points are read back out of the slots: where each segment starts,
     * and where the last one ends.
     * @returns The points, in order along the curve, as fresh vectors.
     */
    get drawnCurve(): Vector3[] | null {
        const batch = this.lineBatch;

        if (batch === null || !this.lineIsCurve) {
            return null;
        }

        const points = this.lineSlots.map((slot) => batch.endsOf(slot)[0]);
        points.push(batch.endsOf(this.lineSlots[this.lineSlots.length - 1])[1]);

        return points;
    }

    /**
     * The elements a patterned line is drawn as -- each dash, dot or segment, in order along the
     * line -- and none for any other line. Each is a slot in a batch shared by every element of
     * its shape, so this is the only place to ask which shapes an edge draws.
     * @returns The elements.
     */
    get drawnPattern(): readonly ArrowCap[] {
        return this.mesh instanceof PatternedLineMesh ? this.mesh.elements : [];
    }

    /**
     * Where this edge's line is drawn, as the middle of the segment on screen.
     *
     * ONE ANSWER FOR BOTH RENDERERS, which is the point of it. A patterned line carries the
     * middle of its segment in its wrapper's position, and an edge drawn as slots in a batch
     * carries it in the slots' matrices -- for a curve, the middle of the curve, not of its first
     * segment. Asking the edge rather than its mesh gets the right number either way, and is the
     * only way to get it for a batched edge, whose mesh sits at the origin and is shared with
     * every other edge of the same appearance.
     * @returns The middle of the drawn line.
     */
    get drawnCentre(): Vector3 {
        return this.drawnLine?.centre ?? this.mesh.position;
    }

    /**
     * What this edge's arrow caps are drawn as.
     *
     * THE ONLY READING OF A CAP THERE IS. A cap drawn as a thin instance has no mesh of its own
     * in the scene and no material of its own, so the scene walk that read a cap's shape off
     * `scene.meshes` by name -- which is how the story assertions have always read one -- finds
     * one batch where it used to find one mesh per cap, and a batch's name deliberately does not
     * say "arrow". The edge is where the answer moved to: the shape is the name the cap's mesh
     * carried, the span is the reading a story used to take off its bounding box, and the
     * visibility is the opacity the cap is drawn at.
     * @returns One entry per cap this edge draws, head before tail.
     */
    get drawnCaps(): { end: "arrowHead" | "arrowTail"; name: string; span: number; visibility: number }[] {
        const caps: { end: "arrowHead" | "arrowTail"; cap: ArrowCap | null }[] = [
            { end: "arrowHead", cap: this.arrowMesh },
            { end: "arrowTail", cap: this.arrowTailMesh },
        ];

        return caps.flatMap(({ end, cap }) =>
            cap === null || cap.isDisposed()
                ? []
                : [{ end, name: cap.name, span: cap.span, visibility: cap.visibility }],
        );
    }

    /**
     * How many edges share this edge's ordered endpoint pair, including this one.
     * @returns the count
     */
    get parallelCount(): number {
        return this.context.getDataManager().getEdgesBetween(this.srcId, this.dstId).length;
    }

    /**
     * Creates a new Edge instance connecting two nodes.
     * @param graph - The parent graph or graph context
     * @param srcNodeId - The ID of the source node
     * @param dstNodeId - The ID of the destination node
     * @param edgeId - The element-assigned counter the store stamped into this edge's
     *     `graphty.edgeId` column. It becomes {@link Edge.id}, and it is what makes two edges
     *     between the same pair of nodes two different edges
     * @param paint - The source mesh and the style to draw this edge from. Handed in rather than
     *     asked for: the session's paint is addressed by the dense index the store assigns after
     *     construction, so an edge starts from `bootstrapEdgePaint()` and the first style pass
     *     replaces it
     * @param data - Custom data associated with the edge
     * @param opts - Optional configuration options
     */
    constructor(
        graph: Graph | GraphContext,
        srcNodeId: NodeIdType,
        dstNodeId: NodeIdType,
        edgeId: number,
        paint: EdgePaint,
        data: AdHocData,
        opts: EdgeOpts = {},
    ) {
        this.parentGraph = graph;
        this.srcId = srcNodeId;
        this.dstId = dstNodeId;
        this.id = edgeIdOf(edgeId);
        this.opts = opts;
        this.#record = frozenRecord(data);

        // make sure both srcNode and dstNode already exist
        const srcNode = this.context.getDataManager().nodeCache.get(srcNodeId);
        if (!srcNode) {
            throw new Error(
                `Attempting to create edge '${srcNodeId}->${dstNodeId}', Node '${srcNodeId}' hasn't been created yet.`,
            );
        }

        const dstNode = this.context.getDataManager().nodeCache.get(dstNodeId);
        if (!dstNode) {
            throw new Error(
                `Attempting to create edge '${srcNodeId}->${dstNodeId}', Node '${dstNodeId}' hasn't been created yet.`,
            );
        }

        this.srcNode = srcNode;
        this.dstNode = dstNode;

        // create ray for direction / intercept finding
        // Ray constructor expects (origin, direction), not (origin, destination)
        this.ray = new Ray(this.srcNode.mesh.position, this.dstNode.mesh.position.subtract(this.srcNode.mesh.position));

        this.meshKey = paint.meshKey;

        // create ngraph link
        // TODO: Edge is added to layout engine by DataManager, not here

        // create mesh
        const { style } = paint;
        this.drawnStyle = style;

        // create arrow mesh if needed
        this.arrowMesh = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            paint.meshKey,
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            this.context.getScene(),
        );

        // create arrow tail mesh if needed
        this.arrowTailMesh = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            `${paint.meshKey}-tail`,
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowTail?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            this.context.getScene(),
        );

        // create edge line mesh
        // Note: Edge.transformArrowCap() provides start/end positions already adjusted for node surfaces and arrows
        this.mesh = this.createLine(paint.meshKey, style);

        // Nothing is parented to graph-root here. Every line, pattern element and cap is a slot in
        // a batch, and a batch parents its one mesh when it is built, which puts every edge in it
        // under the graph's transform for XR gestures.

        // create the label and the arrow glyphs if configured
        this.syncContent(style, true);
    }

    /**
     * Invalidates the position cache, forcing the edge to be recalculated on the next update.
     * Call this when a connected node's size changes (e.g., due to selection).
     */
    invalidatePositionCache(): void {
        this._lastSrcPos = null;
        this._lastDstPos = null;
    }

    /**
     * The style this edge is currently drawn from.
     *
     * ONE READER FOR ONE FACT. An edge asks what it looks like on nearly every frame -- to decide
     * whether to bow, where to cut its line for an arrow cap, how wide to draw it -- and each of
     * those questions used to go straight to a static style table keyed by a style id, which was
     * a second door into an answer the session's stack may already have given. There is now one
     * door.
     * @returns The resolved style.
     */
    private get currentStyle(): EdgeStyleConfig {
        return this.sessionPaint?.style ?? bootstrapEdgePaint().style;
    }

    /**
     * Updates the edge's visual representation based on current node positions and style changes.
     * Performs dirty checking to skip updates when nodes haven't moved.
     */
    update(): void {
        // A DELIBERATELY disposed edge must never rebuild itself. UpdateManager iterates the
        // LAYOUT ENGINE's edge list every frame, and DataManager.clear() does not notify the
        // layout engine (its own standing TODO), so this method keeps being called on edges whose
        // dataset was dropped. Without this guard the style branch below would take a brand new
        // slot (or build a patterned line) for an edge nobody owns.
        if (this.disposed) {
            return;
        }

        // A hidden edge costs nothing per frame. It is also what keeps the arrow-cap branches
        // below from putting an arrowhead back on screen for an edge the mask has taken off it:
        // placing a cap IS showing it -- the collapsed matrix the mask wrote is overwritten by
        // the placement -- and those branches run on any frame an endpoint moves.
        if (!this.renderVisible) {
            return;
        }

        // DIRTY TRACKING FIRST, BEFORE ANYTHING THAT COSTS. On a still graph this comparison is
        // the whole of an edge's frame, and the update pass walks every edge in the graph on
        // every frame -- so whatever sits above this line is paid a million times a second at the
        // render ceiling for edges that are not going to move. It used to sit below a timing call
        // and a lookup into the layout engine, neither of which the early exit needs: the
        // engine's answer is only read further down, for an edge that IS moving.
        const srcPos = this.srcNode.mesh.position;
        const dstPos = this.dstNode.mesh.position;

        const srcMoved = !(this._lastSrcPos?.equalsWithEpsilon(srcPos, 0.001) ?? false);
        const dstMoved = !(this._lastDstPos?.equalsWithEpsilon(dstPos, 0.001) ?? false);

        if (!srcMoved && !dstMoved) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Edge.update");

        const lnk = this.context.getLayoutManager().layoutEngine?.getEdgePosition(this);
        if (!lnk) {
            this.context.getStatsManager().endMeasurement("Edge.update");
            return;
        }

        const { srcPoint, dstPoint } = this.transformArrowCap();
        const finalSrcPoint = srcPoint ?? new Vector3(lnk.src.x, lnk.src.y, lnk.src.z);
        const finalDstPoint = dstPoint ?? new Vector3(lnk.dst.x, lnk.dst.y, lnk.dst.z);

        this.transformEdgeMesh(finalSrcPoint, finalDstPoint);

        // Update label position if exists
        if (this.label) {
            const midPoint = new Vector3(
                (lnk.src.x + lnk.dst.x) / 2,
                (lnk.src.y + lnk.dst.y) / 2,
                ((lnk.src.z ?? 0) + (lnk.dst.z ?? 0)) / 2,
            );
            this.label.attachTo(midPoint, this._labelAttachPosition, this._labelOffset);
        }

        // Update arrow head caption position if exists
        if (this.arrowHeadText && this.arrowMesh) {
            this.arrowHeadText.attachTo(
                this.arrowMesh.position,
                this._arrowHeadTextAttachPosition,
                this._arrowHeadTextOffset,
            );
        }

        // Update arrow tail caption position if exists
        if (this.arrowTailText && this.arrowTailMesh) {
            this.arrowTailText.attachTo(
                this.arrowTailMesh.position,
                this._arrowTailTextAttachPosition,
                this._arrowTailTextOffset,
            );
        }

        // Cache positions for next frame
        this._lastSrcPos = srcPos.clone();
        this._lastDstPos = dstPos.clone();

        this.context.getStatsManager().endMeasurement("Edge.update");
    }

    /**
     * Rebuild this edge's line, arrow caps and label from the paint it is currently drawn from.
     *
     * A REBUILD REQUEST, NOT A STYLE CHANGE: the 2D/3D switch makes it with every mesh already
     * disposed. What to draw is the style stack's answer; WHETHER to draw is the caller's.
     */
    updateStyle(): void {
        // See update(): a disposed edge is still reachable from the layout engine, and this
        // method builds meshes. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        const paint = this.currentPaint();

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style);
    }

    /**
     * What this edge looks like right now.
     *
     * See Node.currentPaint: the painter is asked rather than the field read, because a rebuild
     * can arrive between the session being bound and the first frame that drains its dirty set.
     * @returns The session's paint when one is bound, and the element's own defaults otherwise.
     */
    private currentPaint(): EdgePaint {
        const painter = this.context.getStylePainter?.();
        const painted = painter?.owns === true ? (this.sessionPaint ?? painter.edgePaint(this.index)) : null;

        return painted ?? bootstrapEdgePaint();
    }

    /**
     * Draw this edge as the session's style stack resolved it.
     * @param paint - The source mesh and the style behind it.
     */
    applySessionPaint(paint: EdgePaint): void {
        if (this.disposed) {
            return;
        }

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style);
    }

    /**
     * Build the line, the arrow caps and the label one resolved style asks for.
     * @param meshKey - Which source mesh this edge is drawn from.
     * @param style - The resolved style everything below is built from.
     */
    private paintFrom(meshKey: string, style: EdgeStyleConfig): void {
        // Only skip update if the source mesh is the same AND mesh is not disposed
        // (mesh can be disposed when switching 2D/3D modes via meshCache.clear())
        // A patterned line says so with a flag rather than a method. It used to be read as always
        // alive, so a view-mode switch -- which disposes it and repaints the edge with the same
        // style -- skipped the rebuild and left the line disposed.
        const meshDisposed = this.mesh instanceof PatternedLineMesh ? this.mesh.isDisposed : this.mesh.isDisposed();

        // WHAT THIS RETURN MAY AND MAY NOT SKIP. The mesh key is minted from the channels whose
        // role is `mesh`, with the colour and the opacity folded back into the string by
        // `StylePainter.edgePaintOf` because an edge has no per-instance state to write them
        // into -- so an unchanged key means the line, its caps and its colour are all unchanged.
        // The `content` channels are keyed by nothing, so they are applied here. See
        // `drawnLabelText` for the defect that reached a consumer.
        // A DIFFERENT KEY FOR THE SAME STYLE IS NOT A REBUILD. Every element is constructed from
        // the bootstrap paint, whose key is a sentinel no session key ever equals, and the first
        // style pass then hands it the session's key -- for the same style, whenever no layer
        // touches the element, which is every element of a plain load. Comparing keys alone
        // rebuilt every node and edge once: dispose the placeholder mesh, build the same mesh
        // again. Babylon's dispose is a linear search of the scene's mesh list and of the parent's
        // children, so that rebuild cost the size of the scene per element and the load grew as
        // its square (issue #388: 4,000 nodes took 28 s, 10,000 never finished). A style that is
        // deep-equal to the one the current mesh was built from means the same geometry, the same
        // colour and the same content by construction, so the key is adopted and nothing is
        // touched.
        const sameGeometry = meshKey === this.meshKey || isEqual(style, this.drawnStyle);

        if (sameGeometry && !meshDisposed) {
            this.meshKey = meshKey;
            this.drawnStyle = style;
            this.syncContent(style, false);
            return;
        }

        this.meshKey = meshKey;
        this.drawnStyle = style;

        // Invalidate position cache to force edge redraw with new style
        this._lastSrcPos = null;
        this._lastDstPos = null;
        // PHASE 5: Dispose pattern lines or solid lines appropriately
        this.releaseLine();

        // recreate arrow mesh if needed. A cap is an instance of its scene's batch, and the batch
        // owns the material: disposing an instance's material would dispose the material every
        // other cap in the batch draws with. The batch disposes it with its last instance
        // (FilledArrowRenderer.instanceOf).
        if (this.arrowMesh && !this.arrowMesh.isDisposed()) {
            this.arrowMesh.dispose();
        }

        this.arrowMesh = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            meshKey,
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            this.context.getScene(),
        );

        // recreate arrow tail mesh if needed
        if (this.arrowTailMesh && !this.arrowTailMesh.isDisposed()) {
            this.arrowTailMesh.dispose();
        }

        this.arrowTailMesh = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            `${meshKey}-tail`,
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowTail?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            this.context.getScene(),
        );

        // recreate edge line mesh; the next update places it, because the endpoint cache was
        // invalidated above
        this.mesh = this.createLine(meshKey, style);

        // Nothing is parented to graph-root here. Every line, pattern element and cap is a slot in
        // a batch, and a batch parents its one mesh when it is built, which puts every edge in it
        // under the graph's transform for XR gestures.

        // Update the label and the arrow glyphs.
        //
        // UNCONDITIONALLY, which is what the `true` says: the arrow meshes the two glyphs are
        // positioned against were replaced above, so a glyph asking for exactly what was drawn
        // a moment ago is still pointing at a mesh that is gone.
        this.syncContent(style, true);

        // Every mesh above is new, so whatever the visibility mask said about this edge has to be
        // said again -- otherwise a restyle silently puts a filtered-out edge back on screen.
        this.applyRenderState();
    }

    /**
     * Build this edge's line, as a slot in a shared batch when the style allows one and as a mesh
     * of this edge's own otherwise.
     *
     * {@link EdgeMesh.lineBatch} makes the choice, and it makes it from the style and the scene,
     * so one call site cannot get a different answer from another. What comes back is what
     * {@link Edge.mesh} points at either way: the batch's mesh, or the pattern's own wrapper.
     * @param meshKey - Which appearance this edge is drawn with.
     * @param style - The resolved style to draw from.
     * @returns What the line is drawn by.
     */
    private createLine(meshKey: string, style: EdgeStyleConfig): AbstractMesh | PatternedLineMesh {
        const options = {
            styleId: meshKey,
            width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
            color: style.line?.color ?? "#FFFFFF",
        };

        this.lineBatch = EdgeMesh.lineBatch(this.context.getMeshCache(), options, style, this.context.getScene());

        if (this.lineBatch) {
            // A curve's run of slots is sized to its length when it is first placed.
            this.lineIsCurve = style.line?.bezier === true;
            this.lineSlots = [this.lineBatch.acquire()];

            // No per-edge mesh to make unpickable and nothing to hang `parentEdge` on: the batch
            // is unpickable as a whole, and the back-reference was only ever written and never
            // read -- reproducing it would be an array of Edge references one per edge, which is
            // the kind of per-edge object a batch exists to remove.
            return this.lineBatch.mesh;
        }

        return EdgeMesh.createPatternedLine(options, style, this.context.getScene());
    }

    /**
     * Stop drawing this edge's line, whichever of the two it is.
     *
     * A BATCH IS SHARED, so a batched line is handed its slot back rather than disposed -- calling
     * `dispose()` on what {@link Edge.mesh} points at would take every other edge of the same
     * appearance off the screen with it.
     */
    private releaseLine(): void {
        if (this.lineBatch) {
            for (const slot of this.lineSlots) {
                this.lineBatch.release(slot);
            }

            this.lineBatch = null;
            this.lineSlots = [];
            return;
        }

        if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.dispose(); // PatternedLineMesh has its own dispose logic
        } else if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
    }

    /**
     * Bring the text this edge draws into line with what one resolved style asks for.
     *
     * SEPARATE FROM THE GEOMETRY REBUILD, and the separation is the whole point. `paintFrom`
     * skips its work when the source mesh has not changed, which is correct for a line and its
     * caps; an edge's words are not keyed by that mesh, so they have to be looked at on every
     * paint instead. Each of the three has its own comparison, so a repaint that leaves the
     * text alone rebuilds nothing.
     *
     * WHY A REBUILD INVALIDATES THE POSITION CACHE. A `RichTextLabel` built here is at the
     * origin until `update()` places it, and `update()` returns early when neither endpoint has
     * moved -- so on a settled layout, which is exactly when a reader switches labels on, the
     * label would be built and then left in the middle of the scene. Clearing the cached
     * endpoints is what asks the next frame to place it.
     * @param style - The resolved style.
     * @param rebuild - True when the meshes the text is positioned against have just been
     *     replaced, so text asking for what was drawn a moment ago must still be built again.
     */
    private syncContent(style: EdgeStyleConfig, rebuild: boolean): void {
        let rebuilt = false;

        const wantedLabel = style.label?.enabled === true ? style.label : undefined;
        const labelText = wantedLabel === undefined ? undefined : this.extractLabelText(wantedLabel);

        if (rebuild || labelText !== this.drawnLabelText || !isEqual(wantedLabel, this.drawnLabelStyle)) {
            this.label?.dispose();
            this.label = null;

            if (wantedLabel !== undefined) {
                const { label, offset, attachPosition } = this.createLabel(style);
                this.label = label;
                this._labelOffset = offset;
                this._labelAttachPosition = attachPosition;
            }

            this.drawnLabelText = labelText;
            // CLONED rather than held: the block belongs to an `EdgePaint` that
            // `StylePainter.edgePaint` builds fresh on every call, and a comparison against a
            // reference somebody else can still write to silently starts passing.
            this.drawnLabelStyle = wantedLabel === undefined ? undefined : cloneDeep(wantedLabel);
            rebuilt = true;
        }

        const wantedHead = captionWanted(style.arrowHead?.text, this.arrowMesh);

        if (rebuild || !isEqual(wantedHead, this.drawnArrowHeadText)) {
            this.arrowHeadText?.dispose();
            this.arrowHeadText = null;

            if (wantedHead !== undefined) {
                const { label, offset, attachPosition } = this.createArrowText(wantedHead, "arrowHead");
                this.arrowHeadText = label;
                this._arrowHeadTextOffset = offset;
                this._arrowHeadTextAttachPosition = attachPosition;
            }

            this.drawnArrowHeadText = wantedHead === undefined ? undefined : cloneDeep(wantedHead);
            rebuilt = true;
        }

        const wantedTail = captionWanted(style.arrowTail?.text, this.arrowTailMesh);

        if (rebuild || !isEqual(wantedTail, this.drawnArrowTailText)) {
            this.arrowTailText?.dispose();
            this.arrowTailText = null;

            if (wantedTail !== undefined) {
                const { label, offset, attachPosition } = this.createArrowText(wantedTail, "arrowTail");
                this.arrowTailText = label;
                this._arrowTailTextOffset = offset;
                this._arrowTailTextAttachPosition = attachPosition;
            }

            this.drawnArrowTailText = wantedTail === undefined ? undefined : cloneDeep(wantedTail);
            rebuilt = true;
        }

        if (rebuilt) {
            this.invalidatePositionCache();
        }
    }

    /**
     * Tears down every Babylon resource this edge owns.
     *
     * THE DEFECT THIS CLOSES, and it was visible on screen: no Edge.dispose existed at all.
     * `DataManager.clear()` emptied its maps and called `meshCache.clear()`, which disposes the
     * cached SOURCE meshes -- and Babylon disposes a source mesh's instances with it. That is why
     * node spheres and 3D solid edge lines vanished on a dataset clear while roughly sixty grey
     * ARROWHEADS stayed on the canvas, in rosettes where the previous dataset's edges had
     * converged. Arrowheads are not in the MeshCache (today each is an instance of a per-scene
     * batch that `FilledArrowRenderer.instanceOf` frees with its last head): they are parented
     * to the `graph-root` TransformNode, which outlives every dataset, so nothing but this
     * dispose frees them. The same was true of the patterned-line meshes
     * (dot/dash/star/...), 2D lines, bezier curves and all three RichTextLabels.
     *
     * Every dispose is guarded with `isDisposed()` -- matching the idiom already used in
     * `updateStyle` -- because the line mesh may be an instance whose SOURCE `meshCache.clear()`
     * is about to dispose, or has just disposed. `PatternedLineMesh` owns its own dispose logic
     * (it disposes a per-element ShaderMaterial that Babylon's default flags would leave behind),
     * so it is routed to that rather than to `AbstractMesh.dispose`.
     *
     * A DISPOSED EDGE STILL RECEIVES CALLS, which is why {@link Edge.isDisposed} exists: the layout
     * engine keeps its own edge list and `UpdateManager` walks it every frame regardless of what
     * DataManager holds. Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.releaseLine();

        if (this.arrowMesh && !this.arrowMesh.isDisposed()) {
            this.arrowMesh.dispose();
        }

        this.arrowMesh = null;

        if (this.arrowTailMesh && !this.arrowTailMesh.isDisposed()) {
            this.arrowTailMesh.dispose();
        }

        this.arrowTailMesh = null;

        this.label?.dispose();
        this.label = null;
        this.arrowHeadText?.dispose();
        this.arrowHeadText = null;
        this.arrowTailText?.dispose();
        this.arrowTailText = null;

        // Cleared with them, so the caches never say text is drawn that is not.
        this.drawnLabelText = undefined;
        this.drawnLabelStyle = undefined;
        this.drawnArrowHeadText = undefined;
        this.drawnArrowTailText = undefined;
    }

    /**
     * Reports whether {@link Edge.dispose} has run on this edge.
     *
     * Note this is about the EDGE, not about `edge.mesh.isDisposed()`: a live edge's line mesh is
     * disposed and rebuilt on every style change, so the mesh's own flag says nothing about
     * whether the edge is still part of the graph.
     * @returns True once this edge has been disposed
     */
    isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * Whether the renderer is currently drawing this edge.
     * @returns True when it is drawn.
     */
    isRenderVisible(): boolean {
        return this.renderVisible;
    }

    /**
     * Say whether the renderer should draw this edge.
     *
     * HIDING IS NOT DELETION: the edge keeps its row in the store, its dense index, its endpoints
     * and its style. Showing it again re-enables the meshes it already has and invalidates the
     * endpoint cache so the next frame recomputes where the line meets the two node surfaces --
     * which is a ray cast, not a layout.
     * @param visible - What the visibility mask says about this edge.
     * @returns True when this changed the state.
     */
    setRenderVisible(visible: boolean): boolean {
        if (this.renderVisible === visible) {
            return false;
        }

        this.renderVisible = visible;
        this.applyRenderState();

        return true;
    }

    /**
     * Whether this edge is in the session's selection.
     * @returns True when it is selected.
     */
    isSelected(): boolean {
        return this.selected;
    }

    /**
     * Say whether this edge is selected.
     *
     * The state is recorded and nothing is drawn from it yet. An edge line in 3D is an instance of
     * ONE batch per edge style (`EdgeMesh.lineBatch` interns it under `edge-style-<id>`), so a
     * per-edge colour or alpha is not available without giving the selected edge a mesh of its
     * own; see the report accompanying this change for what that needs. Recording it here rather
     * than dropping it is what lets the renderer draw it the moment that lands, and what keeps the
     * element -- rather than a style layer -- the owner of the answer.
     * @param selected - What the selection mask says about this edge.
     * @returns True when this changed the state.
     */
    setSelected(selected: boolean): boolean {
        if (this.selected === selected) {
            return false;
        }

        this.selected = selected;

        return true;
    }

    /**
     * Enable or disable every mesh this edge owns, to match {@link Edge.renderVisible}.
     *
     * The arrowheads are only ever DISABLED here. Whether an edge has an arrowhead at all, and
     * where it sits, is decided while the endpoints are recomputed, so re-enabling one from here
     * would show a cap on an edge whose style asks for none. Invalidating the endpoint cache hands
     * that decision back to the next update, which is the code that owns it.
     */
    private applyRenderState(): void {
        if (this.disposed) {
            return;
        }

        const drawn = this.renderVisible;

        if (this.lineBatch) {
            for (const slot of this.lineSlots) {
                this.lineBatch.setDrawn(slot, drawn);
            }
        } else if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.setDrawn(drawn);
        } else if (!this.mesh.isDisposed()) {
            // setEnabled alone: a disabled mesh is not a pick candidate either, and writing
            // isPickable here would lose whatever the edge style asked for on the way back.
            this.mesh.setEnabled(drawn);
        }

        if (!drawn) {
            this.arrowMesh?.setDrawn(false);
            this.arrowTailMesh?.setDrawn(false);
        }

        for (const text of [this.label, this.arrowHeadText, this.arrowTailText]) {
            const labelMesh = text?.labelMesh;

            if (labelMesh && !labelMesh.isDisposed()) {
                labelMesh.setEnabled(drawn);
            }
        }

        if (drawn) {
            this.invalidatePositionCache();
        }
    }

    /**
     * Transforms the edge mesh to position it between source and destination points.
     * Handles different mesh types (solid, patterned, 2D, bezier).
     * @param srcPoint - The source point position
     * @param dstPoint - The destination point position
     */
    transformEdgeMesh(srcPoint: Vector3, dstPoint: Vector3): void {
        // A batched line is sixteen floats in a shared buffer, and this is the write that moves
        // it. The whole buffer reaches the GPU once a frame, from the batch itself.
        if (this.lineBatch && this.lineIsCurve) {
            this.placeCurve(this.lineBatch, srcPoint, dstPoint);
        } else if (this.lineBatch) {
            this.lineBatch.place(this.lineSlots[0], srcPoint, dstPoint);
        } else if (this.mesh instanceof PatternedLineMesh) {
            // Pattern lines: Update element positions in world space
            this.mesh.update(srcPoint, dstPoint);
        }
    }

    /**
     * Draw this edge's curve as a run of straight segments, one slot each, between two points.
     *
     * A CURVE IS A RUN OF THE SAME SLOTS A STRAIGHT LINE TAKES (issue #444). The curve renderer
     * already drew a curve as a strip of independent straight quads -- no joins between them -- so
     * one slot per quad draws the same segments. It used to dispose and rebuild a mesh of its own
     * every time an endpoint moved; now the run grows or shrinks to the curve's point count and
     * each segment is a matrix write.
     * @param batch - The batch the run is in.
     * @param srcPoint - Where the curve starts.
     * @param dstPoint - Where it ends.
     */
    private placeCurve(batch: EdgeLineBatch, srcPoint: Vector3, dstPoint: Vector3): void {
        const flat = EdgeMesh.createBezierLine(srcPoint, dstPoint);
        const segments = flat.length / 3 - 1;

        // Grow before shrinking, and never below one slot: the batch disposes itself when its last
        // slot goes, which must not happen in the middle of re-sizing a run.
        while (this.lineSlots.length < segments) {
            this.lineSlots.push(batch.acquire());
        }

        while (this.lineSlots.length > Math.max(1, segments)) {
            const slot = this.lineSlots.pop();

            if (slot !== undefined) {
                batch.release(slot);
            }
        }

        for (let i = 0; i < this.lineSlots.length; i++) {
            curveFrom.fromArray(flat, i * 3);
            curveTo.fromArray(flat, i * 3 + 3);
            batch.place(this.lineSlots[i], curveFrom, curveTo);
        }
    }

    /**
     * Calculates and applies transformations for arrow head and tail meshes.
     * Adjusts edge line endpoints to create gaps for arrows.
     * @returns Edge line positions adjusted for arrow placement
     */
    transformArrowCap(): EdgeLine {
        if (this.arrowMesh) {
            const { srcPoint, dstPoint, newEndPoint } = this.getInterceptPoints();

            // If we can't find intercept points, fall back to approximate positions
            if (!srcPoint || !dstPoint || !newEndPoint) {
                const fallbackSrc = this.srcNode.mesh.position;
                const fallbackDst = this.dstNode.mesh.position;

                // Hide arrow if nodes are too close or at same position
                if (fallbackSrc.equalsWithEpsilon(fallbackDst, 0.01)) {
                    this.arrowMesh.setDrawn(false);
                    return {
                        srcPoint: fallbackSrc,
                        dstPoint: fallbackDst,
                    };
                }

                // Pure geometric positioning (same as main path, but using node centers/radii)
                const direction = fallbackDst.subtract(fallbackSrc).normalize();

                // Get arrow length (including size multiplier)
                this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.styleAndGeometry");
                const style = this.currentStyle;
                const arrowSize = style.arrowHead?.size ?? 1.0;
                const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;

                // Use actual bounding sphere radii
                const dstNodeRadius = this.dstNode.mesh.getBoundingInfo().boundingSphere.radiusWorld;
                const srcNodeRadius = this.srcNode.mesh.getBoundingInfo().boundingSphere.radiusWorld;
                this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.styleAndGeometry");

                // Calculate surface intersection points
                this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.vectorMath");
                const srcSurfacePoint = fallbackSrc.add(direction.scale(srcNodeRadius));
                const dstSurfacePoint = fallbackDst.subtract(direction.scale(dstNodeRadius));

                // Use common arrow geometry functions for positioning
                const arrowType = style.arrowHead?.type;
                const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal");

                // PHASE 4: Override scaleFactor for 2D arrows
                // In 2D mode, sphere-dot and open-dot use full-size circles (not tiny 0.25x spheres)
                // so their scaleFactor should be 1.0, not 0.25
                if (this.arrowMesh.is2D && geometry.scaleFactor !== undefined) {
                    geometry.scaleFactor = 1.0;
                }

                // Calculate arrow position using common function
                const arrowPosition = EdgeMesh.calculateArrowPosition(
                    dstSurfacePoint,
                    direction,
                    arrowLength,
                    geometry,
                );

                // Calculate line endpoint using common function
                const lineEndPoint = EdgeMesh.calculateLineEndpoint(dstSurfacePoint, direction, arrowLength, geometry);
                this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.vectorMath");

                this.arrowMesh.place(arrowPosition, direction);

                return {
                    srcPoint: srcSurfacePoint,
                    dstPoint: lineEndPoint,
                };
            }

            // Use common arrow geometry functions for positioning
            this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.mainPath");
            const arrowStyle = this.currentStyle;
            const arrowType = arrowStyle.arrowHead?.type;
            const arrowSize = arrowStyle.arrowHead?.size ?? 1.0;
            const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;
            const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal");

            // PHASE 4: Override scaleFactor for 2D arrows
            // In 2D mode, sphere-dot and open-dot use full-size circles (not tiny 0.25x spheres)
            // so their scaleFactor should be 1.0, not 0.25
            if (this.arrowMesh.is2D && geometry.scaleFactor !== undefined) {
                geometry.scaleFactor = 1.0;
            }

            const direction = dstPoint.subtract(srcPoint).normalize();

            // Calculate arrow position using common function
            const arrowPosition = EdgeMesh.calculateArrowPosition(dstPoint, direction, arrowLength, geometry);
            this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.mainPath");

            this.arrowMesh.place(arrowPosition, direction);

            // Handle arrow tail if configured
            let adjustedSrcPoint = srcPoint;
            if (this.arrowTailMesh) {
                const tailStyle = this.currentStyle;
                const tailType = tailStyle.arrowTail?.type;

                if (tailType && tailType !== "none") {
                    // Reverse direction for tail (points away from source toward destination)
                    const tailDirection = dstPoint.subtract(srcPoint).normalize();

                    // Get tail arrow dimensions and geometry
                    const tailSize = tailStyle.arrowTail?.size ?? 1.0;
                    const tailLength = EdgeMesh.calculateArrowLength() * tailSize;
                    const tailGeometry = EdgeMesh.getArrowGeometry(tailType);

                    // PHASE 4: Override scaleFactor for 2D tail arrows
                    if (this.arrowTailMesh.is2D && tailGeometry.scaleFactor !== undefined) {
                        tailGeometry.scaleFactor = 1.0;
                    }

                    // Calculate tail position using common function
                    // For tail, we negate the direction since it points away from source
                    const tailPosition = EdgeMesh.calculateArrowPosition(
                        srcPoint,
                        tailDirection.scale(-1), // Reverse direction for tail
                        tailLength,
                        tailGeometry,
                    );

                    // Tail points in opposite direction (away from source)
                    const reversedDirection = direction.scale(-1);

                    this.arrowTailMesh.place(tailPosition, reversedDirection);

                    // Adjust line start point to create gap for tail arrow
                    adjustedSrcPoint = EdgeMesh.calculateLineEndpoint(
                        srcPoint,
                        tailDirection.scale(-1), // Reverse direction for tail
                        tailLength,
                        tailGeometry,
                    );
                }
            }

            return {
                srcPoint: adjustedSrcPoint,
                dstPoint: newEndPoint, // Line ends before arrow to create gap for arrow to fill
            };
        }

        return {
            srcPoint: null,
            dstPoint: null,
        };
    }

    /**
     * Calculates ray intersection points with source and destination node meshes.
     * Used to position edges at node surfaces rather than centers.
     * @returns Intersection points for source, destination, and adjusted endpoint
     */
    getInterceptPoints(): InterceptPoint {
        const srcMesh = this.srcNode.mesh;
        const dstMesh = this.dstNode.mesh;

        let srcPoint: Vector3 | null = null;
        let dstPoint: Vector3 | null = null;
        let newEndPoint: Vector3 | null = null;

        const srcRadius = this.srcNode.roundRadius;
        const dstRadius = this.dstNode.roundRadius;

        if (srcRadius !== null && dstRadius !== null) {
            // WORKED OUT RATHER THAN SEARCHED FOR. Where a straight line crosses a sphere is one
            // multiply away from the centre and the radius, and this is the answer for the shapes
            // the element draws by default. The search it replaces -- two ray-against-mesh
            // intersections per edge, each walking the triangles of a node's geometry -- measured
            // 137 ms of a 151 ms frame on a graph of two thousand nodes with a live layout, which
            // was the whole of what a moving graph cost. It also needed both endpoint meshes to
            // have a freshly computed world matrix; a radius does not move when a node does, so
            // that is gone too.
            const srcCentre = srcMesh.position;
            const dstCentre = dstMesh.position;
            const dx = dstCentre.x - srcCentre.x;
            const dy = dstCentre.y - srcCentre.y;
            const dz = dstCentre.z - srcCentre.z;
            const span = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Two nodes closer than their own surfaces have no line between them to trim, which
            // is the same case the intersection search reported by finding no hit.
            if (span > srcRadius + dstRadius) {
                const ux = dx / span;
                const uy = dy / span;
                const uz = dz / span;

                srcPoint = new Vector3(
                    srcCentre.x + ux * srcRadius,
                    srcCentre.y + uy * srcRadius,
                    srcCentre.z + uz * srcRadius,
                );
                dstPoint = new Vector3(
                    dstCentre.x - ux * dstRadius,
                    dstCentre.y - uy * dstRadius,
                    dstCentre.z - uz * dstRadius,
                );
            }
        } else {
            // AIMED HERE, BY THE ONE EDGE THAT IS ABOUT TO FIRE IT. A pass over every edge in the
            // graph used to do this, once a frame, whether or not the edge had moved.
            this.ray.origin = srcMesh.position;
            dstMesh.position.subtractToRef(srcMesh.position, this.ray.direction);

            const frame = this.context.getScene().getFrameId();

            freshenWorldMatrix(srcMesh, frame);
            freshenWorldMatrix(dstMesh, frame);

            const dstHitInfo = this.ray.intersectsMeshes([dstMesh]);
            const srcHitInfo = this.ray.intersectsMeshes([srcMesh]);

            if (dstHitInfo.length && srcHitInfo.length) {
                dstPoint = dstHitInfo[0].pickedPoint;
                srcPoint = srcHitInfo[0].pickedPoint;

                if (!srcPoint || !dstPoint) {
                    throw new TypeError("error picking points");
                }
            }
        }

        if (srcPoint !== null && dstPoint !== null) {
            const style = this.currentStyle;
            const hasArrowHead = style.arrowHead?.type && style.arrowHead.type !== "none";

            // Only adjust endpoint if we have an arrow head
            if (hasArrowHead) {
                const arrowSize = style.arrowHead?.size ?? 1.0;
                const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;
                const arrowType = style.arrowHead?.type ?? "normal";
                const geometry = EdgeMesh.getArrowGeometry(arrowType);

                // PHASE 4: Override scaleFactor for 2D arrows in line endpoint calculation
                if (this.arrowMesh?.is2D && geometry.scaleFactor !== undefined) {
                    geometry.scaleFactor = 1.0;
                }

                // Use common function to calculate line endpoint
                // Direction points FROM source TO destination (forward direction)
                const direction = dstPoint.subtract(srcPoint).normalize();
                newEndPoint = EdgeMesh.calculateLineEndpoint(dstPoint, direction, arrowLength, geometry);
            } else {
                // No arrow head, edge goes all the way to the node surface
                newEndPoint = dstPoint;
            }
        }

        return {
            srcPoint,
            dstPoint,
            newEndPoint,
        };
    }

    /**
     * Where one of this edge's three pieces of text hangs, and how far off.
     *
     * ONE PLACE FOR BOTH ANSWERS, because they were worked out twice and could disagree: the
     * label's builder resolved `location` into an attach position, and its caller resolved the
     * same field again to decide where `update()` would hang the plane every frame. A block that
     * says "automatic" falls back to whatever the caller's own default is -- the renderer has no
     * rule for choosing a side of an edge, so "automatic" here means "wherever this piece of text
     * normally sits" rather than a computation.
     * @param block - The resolved rich-text block, if there is one.
     * @param fallbackLocation - Where this piece of text sits when its block does not say.
     * @param fallbackOffset - How far off it sits when its block does not say.
     * @returns The side it hangs from and the distance, in world units.
     */
    private placementOf(
        block: RichTextStyleType | undefined,
        fallbackLocation: AttachPosition,
        fallbackOffset: number,
    ): { attachPosition: AttachPosition; attachOffset: number } {
        const location = block?.location ?? fallbackLocation;

        return {
            attachPosition: location === "automatic" ? fallbackLocation : location,
            attachOffset: block?.attachOffset ?? fallbackOffset,
        };
    }

    private createLabel(styleConfig: EdgeStyleConfig): {
        label: RichTextLabel;
        offset: number;
        attachPosition: AttachPosition;
    } {
        const labelText = this.extractLabelText(styleConfig.label);
        const placement = this.placementOf(styleConfig.label, EDGE_LABEL_LOCATION, EDGE_LABEL_OFFSET);
        const labelOptions = this.createLabelOptions(labelText, styleConfig.label, placement);

        return {
            label: new RichTextLabel(this.context.getScene(), labelOptions),
            offset: placement.attachOffset,
            attachPosition: placement.attachPosition,
        };
    }

    /**
     * The text this edge's label draws, which is the empty string when nothing configured one.
     *
     * There used to be a fallback to `this.id`, so an unlabelled edge read `"alice:bob"` on
     * screen. Under an element-assigned counter that same fallback would read `"17"` -- an
     * internal number with no meaning to a reader -- so it is gone: an unlabelled edge draws no
     * label at all.
     * @param labelConfig - the label block of the resolved edge style, if there is one
     * @returns the text, or "" for an edge nothing named
     */
    private extractLabelText(labelConfig?: Record<string, unknown>): string {
        if (!labelConfig) {
            return "";
        }

        // Check if text is directly provided
        if (labelConfig.text !== undefined && labelConfig.text !== null) {
            // Only convert to string if it's a primitive type
            if (
                typeof labelConfig.text === "string" ||
                typeof labelConfig.text === "number" ||
                typeof labelConfig.text === "boolean"
            ) {
                return String(labelConfig.text);
            }
        } else if (labelConfig.textPath && typeof labelConfig.textPath === "string") {
            try {
                const result = jmespath.search(this.data, labelConfig.textPath);
                if (result !== null && result !== undefined) {
                    return String(result);
                }
            } catch {
                // Ignore jmespath errors
            }
        }

        return "";
    }

    /**
     * Turn one rich-text block into the options the label renderer takes.
     *
     * TAKES THE BLOCK, not the whole edge style, because an edge draws three of them: its own
     * label at the middle of the line, and a caption at each end of it. They are the same schema
     * (`RichTextStyle`), the same class draws all three, and the only difference is which key of
     * the resolved style they came from and where they hang. The node's equivalent has taken the
     * block since it grew a tooltip beside its label, for the same reason.
     *
     * WHAT THIS REPLACED FOR A CAPTION. The captions used to be built by a mapping of their own
     * that read seven fields of the block -- the words, the font size, the text and background
     * colours, the corner radius and the offset -- and dropped the other fifty. A caption could
     * not be given a typeface, a border, a shadow, a badge or a margin by any route at all, not
     * even by a caller writing the style out by hand, and nothing said so.
     * @param labelText - The words to draw.
     * @param block - The resolved rich-text block: `style.label`, `style.arrowHead.text` or
     *     `style.arrowTail.text`.
     * @param placement - Where it hangs, from {@link placementOf}.
     * @param placement.attachPosition - Which side of its anchor it sits on.
     * @param placement.attachOffset - How far off, in world units.
     * @returns The options, with the placement the caller worked out already applied.
     */
    private createLabelOptions(
        labelText: string,
        block: RichTextStyleType | undefined,
        placement: { attachPosition: AttachPosition; attachOffset: number },
    ): RichTextLabelOptions {
        if (!block) {
            return {
                text: labelText,
                attachPosition: placement.attachPosition,
                attachOffset: placement.attachOffset,
            };
        }

        // Transform backgroundColor to string if it's an advanced color style
        let backgroundColor: string | undefined = undefined;
        if (block.backgroundColor) {
            if (typeof block.backgroundColor === "string") {
                ({ backgroundColor } = block);
            } else if (block.backgroundColor.colorType === "solid") {
                ({ value: backgroundColor } = block.backgroundColor);
            } else if (block.backgroundColor.colorType === "gradient") {
                // For gradients, use the first color as a fallback
                [backgroundColor] = block.backgroundColor.colors;
            }
        }

        // Filter out undefined values from backgroundGradientColors
        let backgroundGradientColors: string[] | undefined = undefined;
        if (block.backgroundGradientColors) {
            backgroundGradientColors = block.backgroundGradientColors.filter(
                (color): color is string => color !== undefined,
            );
            if (backgroundGradientColors.length === 0) {
                backgroundGradientColors = undefined;
            }
        }

        // Transform borders to ensure colors are strings
        let borders: { width: number; color: string; spacing: number }[] | undefined = undefined;
        if (block.borders && block.borders.length > 0) {
            const validBorders = block.borders
                .filter((border): border is typeof border & { color: string } => border.color !== undefined)
                .map((border) => ({
                    width: border.width,
                    color: border.color,
                    spacing: border.spacing,
                }));
            // Only set borders if we have valid borders, otherwise leave it undefined
            // so the default empty array is used
            if (validBorders.length > 0) {
                borders = validBorders;
            }
        }

        // Create label options by spreading the entire block
        const labelOptions: RichTextLabelOptions = {
            ...block,
            // Override with computed values
            text: labelText,
            attachPosition: placement.attachPosition,
            attachOffset: placement.attachOffset,
            backgroundColor,
            backgroundGradientColors,
            ...(borders !== undefined && { borders }),
        };

        // Handle special case for transparent background
        if (labelOptions.backgroundColor === "transparent") {
            labelOptions.backgroundColor = undefined;
        }

        // Remove properties that shouldn't be passed to RichTextLabel
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { location, textPath, enabled, ...finalLabelOptions } = labelOptions as RichTextLabelOptions & {
            location?: string;
            textPath?: string;
            enabled?: boolean;
        };

        return finalLabelOptions;
    }

    /**
     * Build the caption that hangs from the cap at one end of this edge.
     *
     * THE SAME BUILDER AS THE EDGE'S OWN LABEL, which is the whole of what changed here: the
     * caption is a `RichTextLabel` written in the same schema, so every field the label
     * vocabulary publishes reaches it, rather than the seven a mapping of its own used to copy.
     * @param textConfig - The resolved rich-text block at this end.
     * @param source - Which end it is, which decides the glyph an unworded caption falls back to.
     * @returns The caption, and where to hang it from the cap.
     */
    private createArrowText(
        textConfig: RichTextStyleType,
        source: "arrowHead" | "arrowTail",
    ): { label: RichTextLabel; offset: number; attachPosition: AttachPosition } {
        // The two arrow glyphs below are the only non-ASCII bytes in this file and they are
        // DELIBERATE: this is what is drawn for a caption that was switched on and given no
        // words, so it is UI content, not source punctuation. Replacing it with "->" / "<-"
        // would change what the scene draws, which is not a formatting fix.
        const glyph = source === "arrowHead" ? "→" : "←";
        const words = this.extractLabelText(textConfig);
        const labelText = words === "" ? glyph : words;
        const placement = this.placementOf(textConfig, ARROW_CAPTION_LOCATION, ARROW_CAPTION_OFFSET);
        const labelOptions = this.createLabelOptions(labelText, textConfig, placement);

        return {
            label: new RichTextLabel(this.context.getScene(), labelOptions),
            offset: placement.attachOffset,
            attachPosition: placement.attachPosition,
        };
    }
}
