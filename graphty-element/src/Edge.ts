import { AbstractMesh, Mesh, Quaternion, Ray, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import * as jmespath from "jmespath";
import _ from "lodash";

import type { AdHocData, EdgeStyleConfig } from "./config";
import { EDGE_CONSTANTS } from "./constants/meshConstants";
import { edgeIdOf } from "./data/edgeIdentity";
import type { Graph } from "./Graph";
import type { GraphContext } from "./managers/GraphContext";
import { bootstrapEdgePaint, type EdgePaint } from "./managers/StylePainter";
import { EdgeMesh } from "./meshes/EdgeMesh";
import { FilledArrowRenderer } from "./meshes/FilledArrowRenderer";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";
import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { Simple2DLineRenderer } from "./meshes/Simple2DLineRenderer";
import { Node, NodeIdType } from "./Node";

interface InterceptPoint {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
    newEndPoint: Vector3 | null;
}

interface EdgeLine {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
}

interface EdgeOpts {
    metadata?: object;
}

/**
 * Represents a directed edge between two nodes in the graph visualization.
 * Handles rendering of edge lines, arrow heads/tails, and labels with support for various styles.
 */
export class Edge {
    parentGraph: Graph | GraphContext;
    opts: EdgeOpts;
    srcId: NodeIdType;
    dstId: NodeIdType;

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
     */
    index: number = INVALID_INDEX;
    dstNode: Node;
    srcNode: Node;
    data: AdHocData;
    mesh: AbstractMesh | PatternedLineMesh; // PHASE 5: Support both solid lines and patterned lines
    arrowMesh: AbstractMesh | null = null;
    arrowTailMesh: AbstractMesh | null = null;

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
    private _arrowHeadTextOffset = 0.3;
    private _arrowTailTextOffset = 0.3;
    private _labelOffset = 0;
    private _labelAttachPosition: AttachPosition = "center";
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
     * Derived on every read from the data manager's edge cache rather than stored, so a removal
     * cannot leave it stale. Nothing draws with it yet -- two parallel edges still render as two
     * coincident lines -- but a style layer can read it, and the geometry work that eventually
     * separates parallel edges needs exactly this number.
     * @returns the rank, or -1 for an edge the cache no longer holds
     */
    get parallelRank(): number {
        return this.context.getDataManager().edgeCache.get(this.srcId, this.dstId).indexOf(this);
    }

    /**
     * How many edges share this edge's ordered endpoint pair, including this one.
     * @returns the count
     */
    get parallelCount(): number {
        return this.context.getDataManager().edgeCache.get(this.srcId, this.dstId).length;
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
        this.data = data;

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
        this.mesh = EdgeMesh.create(
            this.context.getMeshCache(),
            {
                styleId: paint.meshKey,
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.line?.color ?? "#FFFFFF",
            },

            style,
            this.context.getScene(),
        );

        this.mesh.isPickable = false;
        this.mesh.metadata = this.mesh.metadata ?? {};
        this.mesh.metadata.parentEdge = this;

        // Parent edge meshes to graph-root for XR gesture support (zoom, rotate, pan)
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            if (this.mesh instanceof PatternedLineMesh) {
                // PatternedLineMesh is a wrapper with an array of meshes
                for (const mesh of this.mesh.meshes) {
                    mesh.parent = graphRoot;
                }
            } else {
                this.mesh.parent = graphRoot;
            }

            if (this.arrowMesh) {
                this.arrowMesh.parent = graphRoot;
            }

            if (this.arrowTailMesh) {
                this.arrowTailMesh.parent = graphRoot;
            }
        }

        // create label if configured
        if (style.label?.enabled) {
            const { label, offset, attachPosition } = this.createLabel(style);
            this.label = label;
            this._labelOffset = offset;
            this._labelAttachPosition = attachPosition;
        }

        // create arrow head text if configured
        if (style.arrowHead?.text) {
            const { label, offset } = this.createArrowText(style.arrowHead.text, "arrowHead");
            this.arrowHeadText = label;
            this._arrowHeadTextOffset = offset;
        }

        // create arrow tail text if configured
        if (style.arrowTail?.text) {
            const { label, offset } = this.createArrowText(style.arrowTail.text, "arrowTail");
            this.arrowTailText = label;
            this._arrowTailTextOffset = offset;
        }
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
        // dataset was dropped. Without this guard the bezier branch below would build a brand new
        // line mesh for an edge nobody owns.
        if (this.disposed) {
            return;
        }

        // A hidden edge costs nothing per frame. It is also what keeps the arrow-cap branches
        // below from re-enabling an arrowhead on an edge the mask has taken off screen: those
        // branches call setEnabled(true) as part of recomputing a cap, and they run on any frame
        // an endpoint moves.
        if (!this.renderVisible) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Edge.update");

        const lnk = this.context.getLayoutManager().layoutEngine?.getEdgePosition(this);
        if (!lnk) {
            this.context.getStatsManager().endMeasurement("Edge.update");
            return;
        }

        // Dirty tracking: Check if nodes have moved significantly
        const srcPos = this.srcNode.mesh.position;
        const dstPos = this.dstNode.mesh.position;

        const srcMoved = !(this._lastSrcPos?.equalsWithEpsilon(srcPos, 0.001) ?? false);
        const dstMoved = !(this._lastDstPos?.equalsWithEpsilon(dstPos, 0.001) ?? false);

        if (!srcMoved && !dstMoved) {
            this.context.getStatsManager().endMeasurement("Edge.update");
            return;
        }

        const { srcPoint, dstPoint } = this.transformArrowCap();
        const finalSrcPoint = srcPoint ?? new Vector3(lnk.src.x, lnk.src.y, lnk.src.z);
        const finalDstPoint = dstPoint ?? new Vector3(lnk.dst.x, lnk.dst.y, lnk.dst.z);

        // PHASE 5: Bezier curves need geometry recreation (can't transform)
        const style = this.currentStyle;
        if (style.line?.bezier) {
            // Dispose old mesh
            if (this.mesh instanceof PatternedLineMesh) {
                this.mesh.dispose();
            } else if (!this.mesh.isDisposed()) {
                this.mesh.dispose();
            }

            // Create new bezier mesh with current positions
            this.mesh = EdgeMesh.create(
                this.context.getMeshCache(),
                {
                    styleId: this.meshKey,
                    width: style.line.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                    color: style.line.color ?? "#FFFFFF",
                },
                style,
                this.context.getScene(),
                finalSrcPoint,
                finalDstPoint,
            );

            this.mesh.isPickable = false;
            this.mesh.metadata = this.mesh.metadata ?? {};
            this.mesh.metadata.parentEdge = this;
        } else {
            // Non-bezier edges: Transform existing mesh
            this.transformEdgeMesh(finalSrcPoint, finalDstPoint);
        }

        // Update label position if exists
        if (this.label) {
            const midPoint = new Vector3(
                (lnk.src.x + lnk.dst.x) / 2,
                (lnk.src.y + lnk.dst.y) / 2,
                ((lnk.src.z ?? 0) + (lnk.dst.z ?? 0)) / 2,
            );
            this.label.attachTo(midPoint, this._labelAttachPosition, this._labelOffset);
        }

        // Update arrow head text position if exists
        if (this.arrowHeadText && this.arrowMesh) {
            this.arrowHeadText.attachTo(this.arrowMesh.position, "top", this._arrowHeadTextOffset);
        }

        // Update arrow tail text position if exists
        if (this.arrowTailText && this.arrowTailMesh) {
            this.arrowTailText.attachTo(this.arrowTailMesh.position, "top", this._arrowTailTextOffset);
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
        // PHASE 5: PatternedLineMesh doesn't have isDisposed(), check if it's AbstractMesh first
        const meshDisposed =
            this.mesh instanceof PatternedLineMesh
                ? false // PatternedLineMesh is always "alive" (check individual meshes if needed)
                : this.mesh.isDisposed();

        if (meshKey === this.meshKey && !meshDisposed) {
            return;
        }

        this.meshKey = meshKey;

        // Invalidate position cache to force edge redraw with new style
        this._lastSrcPos = null;
        this._lastDstPos = null;
        // PHASE 5: Dispose pattern lines or solid lines appropriately
        if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.dispose(); // PatternedLineMesh has its own dispose logic
        } else if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }

        // recreate arrow mesh if needed
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

        // recreate edge line mesh
        // PHASE 5: For bezier curves, need to pass current positions
        let srcPoint: Vector3 | undefined;
        let dstPoint: Vector3 | undefined;
        if (style.line?.bezier) {
            const lnk = this.context.getLayoutManager().layoutEngine?.getEdgePosition(this);
            if (lnk) {
                const { srcPoint: arrowSrc, dstPoint: arrowDst } = this.transformArrowCap();
                srcPoint = arrowSrc ?? new Vector3(lnk.src.x, lnk.src.y, lnk.src.z);
                dstPoint = arrowDst ?? new Vector3(lnk.dst.x, lnk.dst.y, lnk.dst.z);
            }
        }

        this.mesh = EdgeMesh.create(
            this.context.getMeshCache(),
            {
                styleId: meshKey,
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.line?.color ?? "#FFFFFF",
            },

            style,
            this.context.getScene(),
            srcPoint,
            dstPoint,
        );

        this.mesh.isPickable = false;
        this.mesh.metadata = this.mesh.metadata ?? {};
        this.mesh.metadata.parentEdge = this;

        // Parent edge meshes to graph-root for XR gesture support (zoom, rotate, pan)
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            if (this.mesh instanceof PatternedLineMesh) {
                // PatternedLineMesh is a wrapper with an array of meshes
                for (const mesh of this.mesh.meshes) {
                    mesh.parent = graphRoot;
                }
            } else {
                this.mesh.parent = graphRoot;
            }

            if (this.arrowMesh) {
                this.arrowMesh.parent = graphRoot;
            }

            if (this.arrowTailMesh) {
                this.arrowTailMesh.parent = graphRoot;
            }
        }

        // Update label if needed
        if (style.label?.enabled) {
            if (this.label) {
                this.label.dispose();
            }

            const { label, offset, attachPosition } = this.createLabel(style);
            this.label = label;
            this._labelOffset = offset;
            this._labelAttachPosition = attachPosition;
        } else if (this.label) {
            this.label.dispose();
            this.label = null;
        }

        // Update arrow head text if needed
        if (style.arrowHead?.text) {
            if (this.arrowHeadText) {
                this.arrowHeadText.dispose();
            }

            const { label, offset } = this.createArrowText(style.arrowHead.text, "arrowHead");
            this.arrowHeadText = label;
            this._arrowHeadTextOffset = offset;
        } else if (this.arrowHeadText) {
            this.arrowHeadText.dispose();
            this.arrowHeadText = null;
        }

        // Update arrow tail text if needed
        if (style.arrowTail?.text) {
            if (this.arrowTailText) {
                this.arrowTailText.dispose();
            }

            const { label, offset } = this.createArrowText(style.arrowTail.text, "arrowTail");
            this.arrowTailText = label;
            this._arrowTailTextOffset = offset;
        } else if (this.arrowTailText) {
            this.arrowTailText.dispose();
            this.arrowTailText = null;
        }

        // Every mesh above is new, so whatever the visibility mask said about this edge has to be
        // said again -- otherwise a restyle silently puts a filtered-out edge back on screen.
        this.applyRenderState();
    }

    /**
     * Tears down every Babylon resource this edge owns.
     *
     * THE DEFECT THIS CLOSES, and it was visible on screen: no Edge.dispose existed at all.
     * `DataManager.clear()` emptied its maps and called `meshCache.clear()`, which disposes the
     * cached SOURCE meshes -- and Babylon disposes a source mesh's instances with it. That is why
     * node spheres and 3D solid edge lines vanished on a dataset clear while roughly sixty grey
     * ARROWHEADS stayed on the canvas, in rosettes where the previous dataset's edges had
     * converged. Arrowheads are deliberately not cached (`EdgeMesh.createArrowHead` carries a
     * "PERFORMANCE FIX: Create individual meshes for all arrow types" note): they are built bare
     * against the scene and parented to the `graph-root` TransformNode, which outlives every
     * dataset, so nothing ever disposed them. The same was true of the patterned-line meshes
     * (dot/dash/star/...), 2D lines, bezier curves and all three RichTextLabels.
     *
     * Every dispose is guarded with `isDisposed()` -- matching the idiom already used in
     * `updateStyle` -- because the line mesh may be an instance whose SOURCE `meshCache.clear()`
     * is about to dispose, or has just disposed. `PatternedLineMesh` owns its own dispose logic
     * (it disposes a per-element ShaderMaterial that Babylon's default flags would leave behind),
     * so it is routed to that rather than to `AbstractMesh.dispose`.
     *
     * A DISPOSED EDGE STILL RECEIVES CALLS, which is why {@link Edge.disposed} exists: the layout
     * engine keeps its own edge list and `UpdateManager` walks it every frame regardless of what
     * DataManager holds. Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.dispose();
        } else if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }

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
     * ONE cached mesh per edge style (`EdgeMesh.create` interns it under `edge-style-<id>`), so a
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

        if (this.mesh instanceof PatternedLineMesh) {
            for (const segment of this.mesh.meshes) {
                if (!segment.isDisposed()) {
                    segment.setEnabled(drawn);
                }
            }
        } else if (!this.mesh.isDisposed()) {
            // setEnabled alone: a disabled mesh is not a pick candidate either, and writing
            // isPickable here would lose whatever the edge style asked for on the way back.
            this.mesh.setEnabled(drawn);
        }

        if (!drawn) {
            if (this.arrowMesh && !this.arrowMesh.isDisposed()) {
                this.arrowMesh.setEnabled(false);
            }

            if (this.arrowTailMesh && !this.arrowTailMesh.isDisposed()) {
                this.arrowTailMesh.setEnabled(false);
            }
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
     * Updates ray directions for all edges in the graph to enable accurate mesh intersections.
     * @param g - The graph or graph context containing the edges
     */
    static updateRays(g: Graph | GraphContext): void {
        const context = "getStyles" in g ? g : g;

        if (!context.needsRayUpdate()) {
            return;
        }

        const { layoutEngine } = context.getLayoutManager();
        if (!layoutEngine) {
            return;
        }

        // The node meshes the intersection tests below will read. Collected in a set so a node
        // shared by many edges is refreshed once per frame rather than once per incident edge.
        const touched = new Set<AbstractMesh>();

        for (const e of layoutEngine.edges) {
            const srcMesh = e.srcNode.mesh;
            const dstMesh = e.dstNode.mesh;

            const style = e.currentStyle;
            if (style.arrowHead?.type === undefined || style.arrowHead.type === "none") {
                // Performance: this could be optimized
                continue;
            }

            // RayHelper.CreateAndShow(ray, e.parentGraph.scene, Color3.Red());

            // Update ray origin and direction to match current mesh positions
            // The ray starts at the source node and points toward the destination node
            e.ray.origin = srcMesh.position;
            e.ray.direction = dstMesh.position.subtract(srcMesh.position);
            touched.add(srcMesh);
            touched.add(dstMesh);
        }

        // getInterceptPoints() calls ray.intersectsMeshes(), which reads each mesh's world matrix.
        // After the frame has moved a node, that matrix is stale until something recomputes it.
        //
        // This used to be `context.getScene().render()` -- a SECOND full render pass, every frame,
        // for every graph, because the `needRays` flag that was meant to gate it is initialised
        // true (Graph.ts) and never set false by anything. Rendering the scene does refresh world
        // matrices, but it also redraws every mesh, so the whole application ran at half the frame
        // rate it could. Computing the world matrix of exactly the meshes that get intersected is
        // the same guarantee at a fraction of the cost, and touches nothing else in the scene.
        for (const mesh of touched) {
            mesh.computeWorldMatrix(true);
        }
    }

    /**
     * Transforms the edge mesh to position it between source and destination points.
     * Handles different mesh types (solid, patterned, 2D, bezier).
     * @param srcPoint - The source point position
     * @param dstPoint - The destination point position
     */
    transformEdgeMesh(srcPoint: Vector3, dstPoint: Vector3): void {
        // PHASE 5: Check if mesh is PatternedLineMesh and route accordingly
        if (this.mesh instanceof PatternedLineMesh) {
            // Pattern lines: Update mesh positions in world space
            this.mesh.update(srcPoint, dstPoint);
        } else if (this.mesh.metadata?.is2DLine) {
            // PHASE 2: 2D solid lines use Simple2DLineRenderer position updates
            Simple2DLineRenderer.updatePositions(this.mesh as Mesh, srcPoint, dstPoint);
        } else if (this.mesh.metadata?.isBezierCurve) {
            // PHASE 5: Bezier curves have baked-in geometry, no transformation needed
            // The curve geometry is already in world coordinates from createBezierLine()
            // Transforming would move/rotate/scale the curve incorrectly
        } else {
            // Solid lines: Transform via position/rotation/scaling
            EdgeMesh.transformMesh(this.mesh, srcPoint, dstPoint);
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
                    this.arrowMesh.setEnabled(false);
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
                if (this.arrowMesh.metadata?.is2D && geometry.scaleFactor !== undefined) {
                    geometry.scaleFactor = 1.0;
                }

                this.arrowMesh.setEnabled(true);

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

                // Update arrow position directly (no thin instances)
                this.arrowMesh.position = arrowPosition;

                // PHASE 4: Handle 2D vs 3D arrow rotation
                if (this.arrowMesh.metadata?.is2D) {
                    // 2D: Simple Z-rotation to align with edge in XY plane
                    const angle = Math.atan2(direction.y, direction.x);
                    this.arrowMesh.rotation.z = angle;
                } else {
                    // 3D: Use billboarding or lookAt
                    if (
                        arrowType &&
                        [
                            "normal",
                            "inverted",
                            "diamond",
                            "box",
                            "dot",
                            "vee",
                            "tee",
                            "half-open",
                            "crow",
                            "open-normal",
                            "open-diamond",
                        ].includes(arrowType)
                    ) {
                        // Filled arrows use shader-based billboarding via lineDirection uniform
                        FilledArrowRenderer.setLineDirection(this.arrowMesh as Mesh, direction);
                    } else if (geometry.needsRotation) {
                        // CustomLineRenderer arrows need lookAt (like edge lines) instead of manual rotation
                        // Arrow geometry is along Z-axis, lookAt rotates it to point toward the edge direction
                        const lookAtPoint = arrowPosition.add(direction);
                        this.arrowMesh.lookAt(lookAtPoint);
                    }
                }

                return {
                    srcPoint: srcSurfacePoint,
                    dstPoint: lineEndPoint,
                };
            }

            this.arrowMesh.setEnabled(true);

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
            if (this.arrowMesh.metadata?.is2D && geometry.scaleFactor !== undefined) {
                geometry.scaleFactor = 1.0;
            }

            const direction = dstPoint.subtract(srcPoint).normalize();

            // Calculate arrow position using common function
            const arrowPosition = EdgeMesh.calculateArrowPosition(dstPoint, direction, arrowLength, geometry);
            this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.mainPath");

            // Update arrow position directly (no thin instances)
            this.arrowMesh.position = arrowPosition;

            // PHASE 4: Handle 2D vs 3D arrow rotation
            if (this.arrowMesh.metadata?.is2D) {
                // 2D: Use quaternion to properly compose rotations
                // The arrow geometry is in XZ plane with tip at origin pointing along +X
                // We need to: 1) rotate to XY plane (90 deg around X), 2) rotate to point at edge direction
                //
                // With Euler angles (YXZ order), setting rotation.x then rotation.z doesn't work because
                // after the X rotation, the local Z axis points toward world -Y, so Z rotation
                // spins the arrow in XZ plane instead of XY plane.
                //
                // Solution: Use quaternion composition with correct order
                const angle = Math.atan2(direction.y, direction.x);

                // Step 1: Rotation around X by 90 deg (brings arrow from XZ plane to XY plane)
                const qX = Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2);
                // Step 2: Rotation around Z by angle (aligns arrow with edge direction in XY plane)
                const qZ = Quaternion.RotationAxis(Vector3.Forward(), angle);

                // Compose rotations: for "apply qX first, then qZ", use qZ * qX
                this.arrowMesh.rotationQuaternion = qZ.multiply(qX);
            } else {
                // 3D: Use billboarding or lookAt
                if (
                    arrowType &&
                    [
                        "normal",
                        "inverted",
                        "diamond",
                        "box",
                        "dot",
                        "vee",
                        "tee",
                        "half-open",
                        "crow",
                        "open-normal",
                        "open-diamond",
                    ].includes(arrowType)
                ) {
                    // Filled arrows use shader-based billboarding via lineDirection uniform
                    FilledArrowRenderer.setLineDirection(this.arrowMesh as Mesh, direction);
                } else if (geometry.needsRotation) {
                    // CustomLineRenderer arrows need lookAt (like edge lines) instead of manual rotation
                    // Arrow geometry is along Z-axis, lookAt rotates it to point toward the edge direction
                    const lookAtPoint = arrowPosition.add(direction);
                    this.arrowMesh.lookAt(lookAtPoint);
                }
            }

            // Handle arrow tail if configured
            let adjustedSrcPoint = srcPoint;
            if (this.arrowTailMesh) {
                const tailStyle = this.currentStyle;
                const tailType = tailStyle.arrowTail?.type;

                if (tailType && tailType !== "none") {
                    this.arrowTailMesh.setEnabled(true);

                    // Reverse direction for tail (points away from source toward destination)
                    const tailDirection = dstPoint.subtract(srcPoint).normalize();

                    // Get tail arrow dimensions and geometry
                    const tailSize = tailStyle.arrowTail?.size ?? 1.0;
                    const tailLength = EdgeMesh.calculateArrowLength() * tailSize;
                    const tailGeometry = EdgeMesh.getArrowGeometry(tailType);

                    // PHASE 4: Override scaleFactor for 2D tail arrows
                    if (this.arrowTailMesh.metadata?.is2D && tailGeometry.scaleFactor !== undefined) {
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

                    // Update arrow tail position directly (no thin instances)
                    this.arrowTailMesh.position = tailPosition;

                    // PHASE 4: Handle 2D vs 3D arrow tail rotation
                    if (this.arrowTailMesh.metadata?.is2D) {
                        // 2D: Use quaternion to properly compose rotations (same as arrow head)
                        const angle = Math.atan2(reversedDirection.y, reversedDirection.x);
                        const qX = Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2);
                        const qZ = Quaternion.RotationAxis(Vector3.Forward(), angle);
                        this.arrowTailMesh.rotationQuaternion = qZ.multiply(qX);
                    } else {
                        // 3D: Use billboarding or explicit rotation
                        if (
                            [
                                "normal",
                                "inverted",
                                "diamond",
                                "box",
                                "dot",
                                "vee",
                                "tee",
                                "half-open",
                                "crow",
                                "open-normal",
                                "open-diamond",
                            ].includes(tailType)
                        ) {
                            // Filled arrows use shader-based billboarding via lineDirection uniform
                            FilledArrowRenderer.setLineDirection(this.arrowTailMesh as Mesh, reversedDirection);
                        } else if (tailGeometry.needsRotation) {
                            // Other arrow types need explicit rotation
                            // Triangle in XY plane with tip at origin, pointing in +X direction
                            // Z rotation: horizontal angle in XY plane
                            const angleZ = Math.atan2(reversedDirection.y, reversedDirection.x);

                            // Y rotation: tilt forward/back to match edge depth
                            const horizontalDist = Math.sqrt(
                                reversedDirection.x * reversedDirection.x + reversedDirection.y * reversedDirection.y,
                            );
                            const angleY = -Math.atan2(reversedDirection.z, horizontalDist);

                            // Apply rotations
                            this.arrowTailMesh.rotation.x = 0;
                            this.arrowTailMesh.rotation.y = angleY;
                            this.arrowTailMesh.rotation.z = angleZ;
                        }
                    }

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

        // ray is updated in updateRays to ensure intersections
        const dstHitInfo = this.ray.intersectsMeshes([dstMesh]);
        const srcHitInfo = this.ray.intersectsMeshes([srcMesh]);

        let srcPoint: Vector3 | null = null;
        let dstPoint: Vector3 | null = null;
        let newEndPoint: Vector3 | null = null;
        if (dstHitInfo.length && srcHitInfo.length) {
            const style = this.currentStyle;
            const hasArrowHead = style.arrowHead?.type && style.arrowHead.type !== "none";

            dstPoint = dstHitInfo[0].pickedPoint;
            srcPoint = srcHitInfo[0].pickedPoint;
            if (!srcPoint || !dstPoint) {
                throw new TypeError("error picking points");
            }

            // Only adjust endpoint if we have an arrow head
            if (hasArrowHead) {
                const arrowSize = style.arrowHead?.size ?? 1.0;
                const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;
                const arrowType = style.arrowHead?.type ?? "normal";
                const geometry = EdgeMesh.getArrowGeometry(arrowType);

                // PHASE 4: Override scaleFactor for 2D arrows in line endpoint calculation
                if (this.arrowMesh?.metadata?.is2D && geometry.scaleFactor !== undefined) {
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

    private createLabel(styleConfig: EdgeStyleConfig): {
        label: RichTextLabel;
        offset: number;
        attachPosition: AttachPosition;
    } {
        const labelText = this.extractLabelText(styleConfig.label);
        const labelOptions = this.createLabelOptions(labelText, styleConfig);
        const offset = styleConfig.label?.attachOffset ?? 0;
        const labelLocation = styleConfig.label?.location ?? "center";
        const attachPosition = (labelLocation === "automatic" ? "center" : labelLocation) as AttachPosition;
        return { label: new RichTextLabel(this.context.getScene(), labelOptions), offset, attachPosition };
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

    private createLabelOptions(labelText: string, styleConfig: EdgeStyleConfig): RichTextLabelOptions {
        const { label } = styleConfig;
        if (!label) {
            return {
                text: labelText,
                attachPosition: "center",
                attachOffset: 0,
            };
        }

        const labelLocation = label.location ?? "center";
        const attachPosition = labelLocation === "automatic" ? "center" : labelLocation;

        // Transform backgroundColor to string if it's an advanced color style
        let backgroundColor: string | undefined = undefined;
        if (label.backgroundColor) {
            if (typeof label.backgroundColor === "string") {
                ({ backgroundColor } = label);
            } else if (label.backgroundColor.colorType === "solid") {
                ({ value: backgroundColor } = label.backgroundColor);
            } else if (label.backgroundColor.colorType === "gradient") {
                // For gradients, use the first color as a fallback
                [backgroundColor] = label.backgroundColor.colors;
            }
        }

        // Filter out undefined values from backgroundGradientColors
        let backgroundGradientColors: string[] | undefined = undefined;
        if (label.backgroundGradientColors) {
            backgroundGradientColors = label.backgroundGradientColors.filter(
                (color): color is string => color !== undefined,
            );
            if (backgroundGradientColors.length === 0) {
                backgroundGradientColors = undefined;
            }
        }

        // Transform borders to ensure colors are strings
        let borders: { width: number; color: string; spacing: number }[] | undefined = undefined;
        if (label.borders && label.borders.length > 0) {
            const validBorders = label.borders
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

        // Create label options by spreading the entire label object
        const labelOptions: RichTextLabelOptions = {
            ...label,
            // Override with computed values
            text: labelText,
            attachPosition: attachPosition as AttachPosition,
            attachOffset: label.attachOffset ?? 0,
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

    private createArrowText(
        textConfig: Record<string, unknown>,
        source: "arrowHead" | "arrowTail",
    ): { label: RichTextLabel; offset: number } {
        // Extract text from config - either direct text or textPath.
        // The two arrow glyphs below are the only non-ASCII bytes in this file and they are
        // DELIBERATE: this is the rendered default for an arrow label the caller declared but
        // gave no text for, so it is UI content, not source punctuation. Replacing it with
        // "->" / "<-" would change what the scene draws, which is not a formatting fix.
        let labelText: string = source === "arrowHead" ? "→" : "←";

        if (textConfig.text !== undefined && textConfig.text !== null) {
            if (
                typeof textConfig.text === "string" ||
                typeof textConfig.text === "number" ||
                typeof textConfig.text === "boolean"
            ) {
                labelText = String(textConfig.text);
            }
        } else if (textConfig.textPath && typeof textConfig.textPath === "string") {
            try {
                const result = jmespath.search(this.data, textConfig.textPath);
                if (result !== null && result !== undefined) {
                    labelText = String(result);
                }
            } catch {
                // Ignore jmespath errors
            }
        }

        // Extract offset from config
        const offset = typeof textConfig.attachOffset === "number" ? textConfig.attachOffset : 0.3;

        // Build label options from text config
        const labelOptions: RichTextLabelOptions = {
            text: labelText,
            fontSize: typeof textConfig.fontSize === "number" ? textConfig.fontSize : 12,
            textColor: typeof textConfig.textColor === "string" ? textConfig.textColor : "#FFFFFF",
            backgroundColor: typeof textConfig.backgroundColor === "string" ? textConfig.backgroundColor : "#333333",
            attachPosition: "top" as AttachPosition,
            attachOffset: offset,
        };

        // Pass through additional styling options if provided
        if (typeof textConfig.cornerRadius === "number") {
            labelOptions.cornerRadius = textConfig.cornerRadius;
        }

        return { label: new RichTextLabel(this.context.getScene(), labelOptions), offset };
    }
}

/** The one empty array every miss answers with, so a lookup for an absent pair allocates nothing. */
const EMPTY_EDGES: readonly Edge[] = Object.freeze([]);

/**
 * Every edge the graph holds, indexed by its ordered endpoint pair.
 *
 * The inner value is an ARRAY, not one edge: two edges between the same ordered pair are two
 * edges. This class used to throw `"Attempting to create duplicate Edge"` on the second one, which
 * is why the data manager carried two separate guards that dropped a repeated record before it
 * could reach here -- and those drops are what pinned `statistics().repeatedEdgeCount` at zero for
 * every multigraph the element has ever loaded.
 *
 * Ask {@link EdgeMap.first} when the question genuinely has one answer, and {@link EdgeMap.get}
 * otherwise. Neither ever returns undefined for the pair itself: an absent pair is an empty array.
 */
export class EdgeMap {
    map = new Map<NodeIdType, Map<NodeIdType, Edge[]>>();

    /**
     * Whether any edge runs between the specified source and destination nodes.
     * @param srcId - The source node ID
     * @param dstId - The destination node ID
     * @returns True when at least one edge exists, false otherwise
     */
    has(srcId: NodeIdType, dstId: NodeIdType): boolean {
        return this.get(srcId, dstId).length > 0;
    }

    /**
     * Adds an edge to the map, alongside any edges already running between the same pair.
     * @param srcId - The source node ID
     * @param dstId - The destination node ID
     * @param e - The edge instance to store
     */
    set(srcId: NodeIdType, dstId: NodeIdType, e: Edge): void {
        let dstMap = this.map.get(srcId);
        if (!dstMap) {
            dstMap = new Map();
            this.map.set(srcId, dstMap);
        }

        const parallel = dstMap.get(dstId);
        if (parallel) {
            parallel.push(e);
            return;
        }

        dstMap.set(dstId, [e]);
    }

    /**
     * Every edge running from one node to another, in the order they were added.
     * @param srcId - The source node ID
     * @param dstId - The destination node ID
     * @returns The edges, which is an empty array when there are none
     */
    get(srcId: NodeIdType, dstId: NodeIdType): readonly Edge[] {
        return this.map.get(srcId)?.get(dstId) ?? EMPTY_EDGES;
    }

    /**
     * The first edge running from one node to another, for a caller whose question has one answer.
     * @param srcId - The source node ID
     * @param dstId - The destination node ID
     * @returns The oldest edge between the pair, or undefined when there is none
     */
    first(srcId: NodeIdType, dstId: NodeIdType): Edge | undefined {
        return this.get(srcId, dstId)[0];
    }

    /**
     * How many EDGES the map holds, which under parallel edges is more than the number of pairs.
     * @returns The total count of all edges
     */
    get size(): number {
        let sz = 0;
        for (const dstMap of this.map.values()) {
            for (const parallel of dstMap.values()) {
                sz += parallel.length;
            }
        }

        return sz;
    }

    /**
     * Removes ONE edge from the map, leaving any other edges between the same pair alone.
     * @param srcId - The source node ID
     * @param dstId - The destination node ID
     * @param e - The edge to remove
     * @returns True if that edge was removed, false if the map did not hold it
     */
    delete(srcId: NodeIdType, dstId: NodeIdType, e: Edge): boolean {
        const dstMap = this.map.get(srcId);
        if (!dstMap) {
            return false;
        }

        const parallel = dstMap.get(dstId);
        if (!parallel) {
            return false;
        }

        const at = parallel.indexOf(e);
        if (at === -1) {
            return false;
        }

        parallel.splice(at, 1);

        // Clean up empty levels, so `map.size` keeps meaning "pairs with an edge between them"
        // and an iteration over the map never visits an empty array.
        if (parallel.length === 0) {
            dstMap.delete(dstId);
        }

        if (dstMap.size === 0) {
            this.map.delete(srcId);
        }

        return true;
    }

    /**
     * Removes all edges from the map.
     */
    clear(): void {
        this.map.clear();
    }
}
