import {
    AbstractMesh,
    Color3,
    Color4,
    InstancedMesh,
    type Mesh,
    MeshBuilder,
    type Scene,
    StandardMaterial,
} from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import jmespath from "jmespath";
import _ from "lodash";

import type { Rgba } from "./catalog/types";
import { AdHocData, DEFAULT_SELECTION_STYLE, type GraphSelectionStyleConfig, NodeStyleConfig } from "./config";
import type { ElementPositions } from "./data/positions";
import type { Graph } from "./Graph";
import { GraphtyLogger } from "./logging/GraphtyLogger.js";
import type { GraphContext } from "./managers/GraphContext";
import { LabelDeclutter } from "./managers/LabelDeclutter";
import { bootstrapNodePaint, type NodePaint } from "./managers/StylePainter";
import { NodeEffects } from "./meshes/NodeEffects";
import { NodeMesh } from "./meshes/NodeMesh";
import { RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { NodeBehavior, type NodeDragHandler } from "./NodeBehavior";

export type NodeIdType = string | number;

/**
 * How the renderer is drawing one node.
 *
 * This comes from the visibility mask the session holds and NEVER from a style layer. "context"
 * is what a hidden node becomes while `showContext` is on: its own mesh is not drawn, and a faint
 * point stands in its place so the reader can still see the shape of what they hid. A context
 * node is still hidden -- it is outside every run's default scope and absent from the visible id
 * set -- so nothing about this state changes what "visible" means.
 */
export type NodeRenderState = "visible" | "hidden" | "context";

const logger = GraphtyLogger.getLogger(["graphty", "node"]);

/** The cached source mesh every selection halo is an instance of. */
const SELECTION_HALO_MESH = "graphty-selection-halo";

/** The cached source mesh every context point is an instance of. */
const CONTEXT_POINT_MESH = "graphty-context-point";

/*
 * The halo's colour, size and opacity are NOT constants any more: they are
 * `graph.selection` in the element's configuration, set through
 * `element.selectionStyle` or `graph.setSelectionStyle()`. The gold, the 1.45 and the 0.4 that
 * used to live here are the schema's defaults, in `src/config/GraphStyle.ts`, so an element
 * nobody has configured still draws exactly what it always drew.
 */

/** The context point's colour: neutral, so it never reads as a category. */
const CONTEXT_POINT_COLOR = "#8A8A8A";

/** How much of the node's size a context point is drawn at. */
const CONTEXT_POINT_SCALE = 0.3;

/** How transparent a context point is. Faint by design -- it is background, not content. */
const CONTEXT_POINT_ALPHA = 0.18;

/** The smallest size an overlay is drawn at, so a zero-sized style still leaves something to see. */
const MIN_OVERLAY_SIZE = 0.2;

interface NodeOpts {
    pinOnDrag?: boolean;
}

/**
 * Represents a node in the graph visualization with its mesh, label, and associated data.
 * Manages node rendering, styling, drag behavior, and interactions with the layout engine.
 */
export class Node {
    parentGraph: Graph | GraphContext;
    opts: NodeOpts;
    id: NodeIdType;

    /**
     * This node's index in the element's current GraphSnapshot, assigned at add time as
     * `builder.addNode(id)` and walked through `report.nodeRemap` on a renumbering freeze
     * (graph-format design 14.4 rule 5). INVALID_INDEX until the node reaches the builder.
     */
    index: number = INVALID_INDEX;

    data: AdHocData<string | number>;
    mesh: AbstractMesh;
    label?: RichTextLabel;

    /**
     * The tooltip on screen, and undefined whenever the pointer is not over this node.
     *
     * A tooltip is HOVER-ONLY, which is the whole difference between it and a label: a label is
     * part of the picture and a tooltip is an answer to pointing at something. So it exists only
     * between {@link Node.showTooltip} and {@link Node.hideTooltip}, and a graph of fifty
     * thousand nodes with a tooltip on every one of them carries at most one label mesh for
     * them.
     */
    tooltip?: RichTextLabel;

    /**
     * The tooltip block the style stack resolved for this node, or undefined when it has none.
     *
     * Kept rather than looked up on hover, because the pointer arriving is not a moment at which
     * a style pass can be run. The whole block is held -- not only the words -- so that a
     * tooltip drawn while the pointer is already resting on the node can be rebuilt when a layer
     * changes what it should say.
     */
    private wantedTooltip?: NodeStyleConfig["tooltip"];

    /**
     * The words the label on screen is drawing, and undefined when this node draws no label.
     *
     * WHY THIS EXISTS, which is the defect it closes. A label, a tooltip and a label's
     * typography are `role: "content"` in `src/session/styles/intern.ts`: they deliberately key
     * no source mesh, because keying one on free text would mint one source mesh per node and
     * gain nothing. So a paint that changes only the words arrives carrying the SAME mesh key as
     * the paint before it, and the geometry comparison in `paintFrom` -- which is right about
     * geometry -- cannot see it. Until now the label was built only inside the geometry rebuild,
     * so `styles.add({ set: { "node.label": "..." } })` on a graph already on screen resolved
     * the text, reported it from `nodePaint(index)`, and drew nothing at all. Every consumer
     * switching labels on from a settings panel had it.
     *
     * Held beside {@link drawnLabelStyle} so that {@link syncLabel} can be run on every paint
     * and still cost nothing when the label has not moved.
     */
    private drawnLabelText?: string;

    /**
     * The resolved label block the label on screen was built from.
     *
     * Deep-compared rather than compared by reference: `StylePainter.nodePaint` builds a fresh
     * paint on every call, so two paints that say the same thing are never the same object. See
     * {@link drawnLabelText} for why the comparison is needed at all.
     */
    private drawnLabelStyle?: NodeStyleConfig["label"];

    dragHandler?: NodeDragHandler;
    dragging = false;
    pinOnDrag!: boolean;
    size!: number;

    /**
     * The shape type of the mesh currently on screen, cached beside {@link Node.size}.
     *
     * It exists ONLY so that the repaint can tell a geometry change from a colour change; see the
     * invalidation block in `paintFrom` for the defect it fixes. It is read from
     * `style.shape.type`, so it is `undefined` for a style that names no shape.
     */
    shapeType?: NonNullable<NodeStyleConfig["shape"]>["type"];

    /**
     * What the visibility mask says about this node, as the renderer is currently drawing it.
     *
     * Held here rather than derived on every frame because the renderer applies the mask as a
     * DELTA: a pass that changes nothing touches no mesh at all, and the comparison that makes
     * that possible needs the state the mesh is actually in.
     */
    private renderState: NodeRenderState = "visible";

    /**
     * Whether this node is in the session's selection.
     *
     * The highlight this drives is drawn BY CONSTRUCTION -- a halo mesh the element owns -- and
     * not by a style layer. Selection used to be expressed by writing a flag onto this node's
     * result bag and letting a layer whose selector read that flag repaint it, which put the
     * element's own highlight into the reader's layer stack to fight for precedence with the
     * layers they had actually asked for.
     */
    private selected = false;

    /**
     * The source mesh this node is currently drawn from.
     *
     * A KEY, NOT A STYLE. It is the key the style interner minted -- built from the shape and the
     * size and deliberately NOT from the colour, because a colour is per-instance GPU state and
     * folding it in is what turns a continuous ramp into one source mesh per node.
     */
    private meshKey: string;

    /**
     * What the session's style stack resolved for this node, or null while no pass has resolved
     * one and the element's own defaults are what is drawn.
     *
     * Held rather than re-read because the renderer rebuilds a mesh at moments the style stack
     * knows nothing about -- a 2D/3D switch disposes every mesh -- and asking the stack again at
     * one of those moments costs a resolve for an answer that has not changed.
     */
    private sessionPaint: NodePaint | null = null;

    /** The halo instance drawn around this node while it is selected, or null when it is not. */
    private halo: AbstractMesh | null = null;

    /** The faint point drawn in this node's place while it is a context node, or null. */
    private contextPoint: AbstractMesh | null = null;

    /**
     * Set once {@link Node.dispose} has run. Guards every method that would otherwise rebuild
     * this node's mesh -- see the comment on `dispose` for why a disposed Node still receives
     * calls.
     */
    private disposed = false;

    /**
     * Helper to check if we're using GraphContext
     * @returns The GraphContext instance from the parent graph
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
     * Creates a new Node instance with mesh, label, and behaviors.
     *
     * THE PAINT IS HANDED IN RATHER THAN ASKED FOR, because at this moment there is nothing to
     * ask. The session's paint is addressed by the dense row index the store assigns AFTER the
     * node is constructed, so a node builds its first mesh from `bootstrapNodePaint()` and the
     * first style pass replaces it.
     * @param graph - The parent graph or graph context that owns this node
     * @param nodeId - Unique identifier for this node
     * @param paint - The source mesh, the style behind it and the per-instance colour to draw
     * @param data - Custom data associated with this node
     * @param opts - Optional configuration options for the node
     */
    constructor(
        graph: Graph | GraphContext,
        nodeId: NodeIdType,
        paint: NodePaint,
        data: AdHocData<string | number>,
        opts: NodeOpts = {},
    ) {
        this.parentGraph = graph;
        this.id = nodeId;
        this.opts = opts;
        this.data = data;

        this.meshKey = paint.meshKey;

        // create graph node
        // TODO: Node is added to layout engine by DataManager, not here

        // create mesh
        const o = paint.style;
        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        this.mesh = NodeMesh.create(
            this.context.getMeshCache(),
            { styleId: paint.meshKey, is2D: this.context.is2D(), size: this.size },
            { shape: o.shape, texture: o.texture, effect: o.effect },
            this.context.getScene(),
        );

        // Parent to graph-root for XR gesture support
        // This allows gestures to transform the entire graph by manipulating the root
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        // Add metadata for XR controller raycasting
        // IMPORTANT: For InstancedMesh, we must set metadata on the INSTANCE, not spread from source
        this.mesh.metadata = {
            graphNode: this,
            styleId: paint.meshKey,
            nodeId: this.id,
        };

        // create label
        this.syncLabel(o, true);
        this.syncTooltip(o);

        // Everything that lives on the instance rather than in its source: the colour, the
        // outline and the glow. See applyInstancePaint.
        this.applyInstancePaint(o, paint.color);

        NodeBehavior.addDefaultBehaviors(this, this.opts);
    }

    /**
     * Updates the node's mesh position and style based on layout engine and style changes.
     * Handles mesh recreation if disposed.
     */
    update(): void {
        // A DELIBERATELY disposed node must never be resurrected here. The recreate-on-disposed
        // branch below exists for the 2D/3D mode switch, which disposes meshes out from under
        // live nodes; it cannot tell that case apart from a node this graph has finished with.
        // Both the layout engine (which DataManager.clear does not notify -- see its TODO) and
        // SelectionManager.selectedNode keep hard references to Nodes after a dataset is dropped,
        // and both of them call update(), so without this guard clearing a dataset would silently
        // rebuild every node's mesh on the next frame or the next deselect.
        if (this.disposed) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Node.update");

        // Check if mesh was disposed (e.g., from 2D/3D mode switch) and recreate it.
        if (this.mesh.isDisposed()) {
            this.updateStyle();
        }

        if (this.dragging) {
            this.syncOverlayPositions();
            this.context.getStatsManager().endMeasurement("Node.update");
            return;
        }

        const layoutManager = this.context.getLayoutManager();
        const { layoutEngine } = layoutManager;

        const pos = layoutEngine?.getNodePosition(this);
        if (pos) {
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y;
            this.mesh.position.z = pos.z ?? 0;
        }

        this.syncOverlayPositions();

        this.context.getStatsManager().endMeasurement("Node.update");
    }

    /**
     * Rebuild this node's mesh, its label and its effects from the paint it is currently drawn
     * from, preserving its position and reattaching its behaviours.
     *
     * A REBUILD REQUEST, NOT A STYLE CHANGE. The 2D/3D switch calls this for exactly one reason
     * -- every mesh has just been disposed -- and `update()` calls it when it finds a mesh that
     * has gone. What to draw is the style stack's answer; WHETHER to draw is the caller's.
     */
    updateStyle(): void {
        // See update(): a disposed node is still reachable from the layout engine and from
        // SelectionManager, and this method builds a mesh. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        const paint = this.currentPaint();

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style, paint.color);
    }

    /**
     * What this node looks like right now.
     *
     * The painter is asked rather than only the field read, because the two do not become true
     * at the same moment: a session's paint exists from the instant it is bound, and the field is
     * filled by the first frame that drains the dirty set. A rebuild in between -- a 2D/3D switch
     * immediately after a load -- would otherwise find nothing and draw nothing.
     * @returns The session's paint when one is bound, and the element's own defaults otherwise.
     */
    private currentPaint(): NodePaint {
        const painter = this.context.getStylePainter?.();
        const painted = painter?.owns === true ? (this.sessionPaint ?? painter.nodePaint(this.index)) : null;

        return painted ?? bootstrapNodePaint();
    }

    /**
     * Draw this node as the session's style stack resolved it.
     * @param paint - The source mesh, the style behind it and the per-instance colour.
     */
    applySessionPaint(paint: NodePaint): void {
        if (this.disposed) {
            return;
        }

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style, paint.color);
    }

    /**
     * Write the colour the session resolved into this node's own instance.
     *
     * WHY THE COLOUR IS NOT IN THE MATERIAL. Every node drawn from one source mesh shares that
     * mesh's material, so a colour in the material is a colour in the mesh key -- and a key that
     * carries the colour mints one source mesh per distinct colour, which for a continuous ramp
     * is one per node. The instanced buffer is the per-instance state Babylon offers instead: one
     * buffer write against an instance that already exists.
     *
     * THE SOURCE MATERIAL IS UNFROZEN BEFORE THE BUFFER IS REGISTERED. Registering the buffer
     * adds a shader define, and a frozen material is a material that has stopped re-evaluating
     * its defines -- so registering behind a freeze compiles nothing and every instance draws in
     * the material's own colour, silently. Registration happens once per source mesh.
     * @param color - The colour, or null when no layer painted one.
     */
    private applyInstanceColor(color: Rgba | null): void {
        if (color === null || !(this.mesh instanceof InstancedMesh)) {
            return;
        }

        const source = this.mesh.sourceMesh;

        if (source.instancedBuffers?.color === undefined) {
            source.material?.unfreeze();
            source.registerInstancedBuffer("color", 4);
            source.instancedBuffers.color = new Color4(1, 1, 1, 1);
        }

        // Alpha is pinned to 1: transparency is `mesh.visibility`, which Babylon keeps on the
        // SOURCE mesh, so it is part of the key rather than of this buffer. An alpha here would
        // be inert without a VERTEXALPHA define and would read as opacity that does nothing.
        this.mesh.instancedBuffers.color = new Color4(color.r / 255, color.g / 255, color.b / 255, 1);
    }

    /**
     * Apply everything about this node that lives on the drawn mesh rather than in its geometry.
     *
     * THE ROLE DECIDES THE BRANCH, AND IT USED NOT TO. `CHANNEL_ROLES` in
     * `src/session/styles/intern.ts` is the one statement of what a channel costs to change on an
     * element already on screen: a `mesh` channel is part of the source mesh's identity, and an
     * `instance` channel is a write against a mesh that already exists. `paintFrom` restated that
     * contract in its own words and got it wrong in one direction -- it applied the node's
     * EFFECTS only on the branch that rebuilds the mesh, so an `instance` channel's edit reached
     * the screen only if some unrelated `mesh` channel happened to change in the same repaint.
     * That is why a glow was drawn when its colour was in the stack before the first frame and
     * ignored when a layer added it afterwards. (`node.glowStrength` is a `mesh` channel for a
     * different reason: a glow's strength is set per SOURCE mesh, like its colour.)
     *
     * So this method is everything the `instance` role promises, and `paintFrom` calls it on BOTH
     * of its branches -- once when it has just rebuilt the mesh, because every one of these lives
     * ON an instance and the instance is new, and once when it has not, because that is the whole
     * of what the role means. `test/browser/channel-paints.test.ts` is the gate: it edits a live
     * session and requires the picture to move.
     * @param style - The resolved style the effects are read from.
     * @param color - The per-instance colour, or null when no layer painted one.
     */
    private applyInstancePaint(style: NodeStyleConfig, color: Rgba | null): void {
        this.applyInstanceColor(color);
        NodeEffects.applyOutlineEffect(this.mesh, style.effect);
        NodeEffects.applyGlowEffect(this.mesh, style.effect);
    }

    /**
     * Build the mesh, the label and the effects one resolved style asks for.
     *
     * The one place a node's appearance is applied, whichever stack resolved it. It is keyed on
     * the SOURCE MESH rather than on a style, because that is what decides whether anything has
     * to be rebuilt: two nodes of one shape and size differing only in colour share a mesh, and
     * the colour is one buffer write on an instance that is already correct.
     * @param meshKey - Which source mesh this node is drawn from.
     * @param o - The resolved style the mesh, the label and the effects are built from.
     * @param color - The per-instance colour, or null when the style carries it itself.
     */
    private paintFrom(meshKey: string, o: NodeStyleConfig, color: Rgba | null): void {
        this.context.getStatsManager().startMeasurement("Node.updateMesh");

        // Only skip update if the source mesh is the same AND mesh is not disposed
        // (mesh can be disposed when switching 2D/3D modes via meshCache.clear())
        //
        // WHAT THIS RETURN MAY AND MAY NOT SKIP. The mesh key is minted from the channels whose
        // role is `mesh` alone, so an unchanged key means the GEOMETRY is unchanged and nothing
        // more. The two `instance` channels are compensated for by `StylePainter.nodePaintOf`,
        // which folds opacity into the key string, and by the colour write below. The `content`
        // channels -- the label and its typography -- are compensated for by nothing at all, so
        // they are applied here. See `drawnLabelText` for the defect that reached a consumer.
        if (meshKey === this.meshKey && !this.mesh.isDisposed()) {
            this.applyInstancePaint(o, color);
            this.syncLabel(o, false);
            this.syncTooltip(o);
            this.context.getStatsManager().endMeasurement("Node.updateMesh");
            return;
        }

        this.meshKey = meshKey;

        // Save the current position before disposing the mesh
        // This is critical for style changes when layout is settled,
        // because updateNodes() won't be called to restore positions
        const savedPosition = {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
        };

        // Only dispose if not already disposed
        if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }

        const oldSize = this.size;
        const oldShapeType = this.shapeType;
        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        // If the GEOMETRY changed -- size or shape -- invalidate connected edges so they
        // recalculate their endpoints against the new surface.
        //
        // THE DEFECT THIS FIXES, which is the product owner's report "when I change shapes the
        // edges are no longer touching the surface of the node": until now this test read
        // `this.size !== oldSize` alone. A shape change at constant size left `size` equal, so
        // nothing was invalidated; `Edge.update` then hit its dirty check (Edge.ts: "if
        // (!srcMoved && !dstMoved) return") and returned BEFORE `transformArrowCap()` could
        // re-shoot the ray at the new mesh, so the edge kept the endpoints it had computed
        // against the PREVIOUS geometry. Icosphere and box at the same declared size have
        // bounding radii of 0.75 and 0.866, so the gap is immediately visible.
        //
        // TO ANSWER THE QUESTION AS ASKED -- "I think that used to work in the old shell, did you
        // create a different code path that doesn't do that?": it DID used to work, and no, the
        // shell did not create a code path that skips this. The regression is entirely inside
        // graphty-element, and git dates it exactly:
        //
        //   973f1d96, 2025-11-11, "edge performance enhancements" -- introduced `_lastSrcPos` /
        //   `_lastDstPos` and the early return in `Edge.update`. BEFORE that commit `update()`
        //   called `transformArrowCap()` unconditionally on every frame, so an edge re-shot its
        //   ray at the node meshes continuously and a shape change reattached within one frame,
        //   for free. The dirty check bought back that per-frame ray cast and, with it, silently
        //   made every non-positional geometry change invisible to the edges.
        //
        //   a2cb98c5, 2026-01-04, "improved layer and selection management" -- added the
        //   invalidation block below, guarded on `this.size !== oldSize`, written for SELECTION
        //   (which grows a node). It restored the behaviour for size only. Shape was never
        //   covered, which is why the regression survived it.
        //
        // Every route into a repaint -- a style pass draining its dirty set, a 2D/3D switch, a
        // selection growing a node -- converges on this same method and this same guard, so no
        // route bypasses a recalculation another route performs. The old shell saw it work
        // because it predates 973f1d96, not because it called anything different.
        //
        // THIS STAYS A CONDITION, never an unconditional invalidation: the loop is O(E) per node
        // because a Node holds no incident-edge index, and a colour-only repaint reaches this
        // line too, so invalidating unconditionally would make a full repaint O(N*E). The cost
        // is unchanged for the size case and newly reachable for the shape case; if a repaint
        // that changes every node's shape ever hitches, the answer is a per-node edge index, not
        // removing the guard.
        if (this.size !== oldSize || this.shapeType !== oldShapeType) {
            const dataManager = this.context.getDataManager();
            for (const edge of dataManager.edges.values()) {
                if (edge.srcNode === this || edge.dstNode === this) {
                    edge.invalidatePositionCache();
                }
            }
        }

        this.mesh = NodeMesh.create(
            this.context.getMeshCache(),
            { styleId: meshKey, is2D: this.context.is2D(), size: this.size },
            { shape: o.shape, texture: o.texture, effect: o.effect },
            this.context.getScene(),
        );

        // Restore the saved position to the new mesh
        this.mesh.position.x = savedPosition.x;
        this.mesh.position.y = savedPosition.y;
        this.mesh.position.z = savedPosition.z;

        // Parent to graph-root for XR gesture support
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        // Add metadata for XR controller raycasting
        // IMPORTANT: For InstancedMesh, we must set metadata on the INSTANCE, not spread from source
        this.mesh.metadata = {
            graphNode: this,
            styleId: meshKey,
            nodeId: this.id,
        };

        // Restore position from layout engine after mesh recreation
        // This ensures the mesh doesn't reset to (0, 0, 0) when style changes
        const layoutManager = this.context.getLayoutManager();
        const pos = layoutManager.layoutEngine?.getNodePosition(this);
        if (pos) {
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y;
            this.mesh.position.z = pos.z ?? 0;
        }

        // recreate label if needed
        //
        // UNCONDITIONALLY, which is what the `true` says. A label's plane is PARENTED to the
        // node's mesh (`RichTextLabel._attachToTarget`), and Babylon disposes a mesh's children
        // with it -- so the label that was on screen a moment ago went with the mesh disposed
        // above, whatever the new style says about it.
        this.syncLabel(o, true);
        this.syncTooltip(o);

        // Dispose old drag handler before creating new one to prevent duplicate event listeners
        if (this.dragHandler) {
            this.dragHandler.dispose();
        }

        NodeBehavior.addDefaultBehaviors(this, this.opts);

        // The mesh above is a NEW instance, so everything that lives ON an instance rather than
        // in its source has to be said again: what the masks said about this node, and everything
        // the `instance` role covers. Otherwise a restyle silently un-hides a filtered node,
        // drops its halo, and repaints it in its source mesh's own colour.
        this.applyRenderState();
        this.applyInstancePaint(o, color);

        this.context.getStatsManager().endMeasurement("Node.updateMesh");
    }

    /**
     * Tears down every Babylon resource this node owns.
     *
     * THE DEFECT THIS CLOSES: no Node.dispose existed at all. `DataManager.clear()` emptied its
     * maps and called `meshCache.clear()`, which disposes the cached SOURCE meshes -- and Babylon
     * disposes a source's instances with it, which is the only reason node spheres vanished on a
     * dataset clear. Everything a node creates OUTSIDE the cache survived: its label
     * (RichTextLabel builds its own plane and dynamic texture) and its drag handler's observers.
     * See Edge.dispose for the visible half of the same bug, the arrowheads.
     *
     * ORDER MATTERS. The highlight layer is told first, because it keeps this mesh's uniqueId in
     * a list and does not watch for disposal; then the label and drag handler, which hold their
     * own meshes and scene observers; then the mesh itself last, so nothing is asked about a mesh
     * that is already gone.
     *
     * NEITHER EFFECT IS DELIBERATELY REMOVED HERE. Membership of both the glow layer and the
     * highlight layer is keyed by the SHARED source mesh that MeshCache hands out instances of --
     * one source per style id -- so calling `NodeEffects.applyGlowEffect(mesh, undefined)` from
     * here would darken every OTHER node that still uses this style, and resolving the source
     * before removing it from the highlight layer would take those nodes' outlines away too. The
     * source is owned by the cache, so it is freed when the cache is cleared, and the layer's
     * leftover uniqueId is inert: Babylon's uniqueIds are monotonic per scene and never reused,
     * so no future mesh can inherit a dead style's glow or its outline. The
     * `removeFromHighlight` call below is what is safe to do: it removes THIS mesh, which for an
     * instanced node the layer never held.
     *
     * A DISPOSED NODE STILL RECEIVES CALLS, which is why the private `disposed` flag exists rather than
     * this method simply freeing things. `DataManager.clear()` does not notify the layout engine
     * (its own standing TODO), so `UpdateManager` keeps iterating the engine's node and edge
     * lists; and `SelectionManager.selectedNode` holds a Node across a dataset boundary and calls
     * `updateStyle` + `update` on it when the selection is finally cleared. Both paths would have
     * hit `update()`'s recreate-if-disposed branch and rebuilt the mesh of a node nobody owns.
     * Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        NodeEffects.removeFromHighlight(this.mesh);

        if (this.dragHandler) {
            this.dragHandler.dispose();
            this.dragHandler = undefined;
        }

        if (this.label) {
            this.label.dispose();
            this.label = undefined;
        }

        // A tooltip outlives no node: its plane is not parented to the node's mesh, so nothing
        // else would take it down and a hovered node that is then removed would leave its words
        // floating over the graph.
        this.hideTooltip();
        this.wantedTooltip = undefined;

        // Cleared with it, so the cache never says a label is drawn that is not.
        this.drawnLabelText = undefined;
        this.drawnLabelStyle = undefined;

        if (this.halo) {
            if (!this.halo.isDisposed()) {
                this.halo.dispose();
            }

            this.halo = null;
        }

        if (this.contextPoint) {
            if (!this.contextPoint.isDisposed()) {
                this.contextPoint.dispose();
            }

            this.contextPoint = null;
        }

        if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
    }

    /**
     * Reports whether {@link Node.dispose} has run on this node.
     *
     * Note this is about the NODE, not about `node.mesh.isDisposed()`: a live node's mesh is
     * disposed and rebuilt on every style change and on a 2D/3D switch, so the mesh's own flag
     * says nothing about whether the node is still part of the graph.
     * @returns True once this node has been disposed
     */
    isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * How the renderer is currently drawing this node.
     * @returns The render state.
     */
    getRenderState(): NodeRenderState {
        return this.renderState;
    }

    /**
     * Say how the renderer should draw this node.
     *
     * HIDING IS NOT DELETION. The node keeps its row in the store, its dense index, its position,
     * its results and its place in the layout engine; only the meshes stop being drawn. Showing it
     * again re-enables the meshes it already has, so nothing is rebuilt and no layout runs.
     * @param state - What the visibility mask says about this node.
     * @returns True when this changed the state, which is what lets the renderer apply a mask as a
     *     delta and touch nothing that did not move.
     */
    setRenderState(state: NodeRenderState): boolean {
        if (this.renderState === state) {
            return false;
        }

        this.renderState = state;
        this.applyRenderState();

        return true;
    }

    /**
     * Whether this node is in the session's selection.
     * @returns True when it is selected.
     */
    isSelected(): boolean {
        return this.selected;
    }

    /**
     * Say whether this node is selected.
     * @param selected - What the selection mask says about this node.
     * @returns True when this changed the state.
     */
    setSelected(selected: boolean): boolean {
        if (this.selected === selected) {
            return false;
        }

        this.selected = selected;
        this.applyRenderState();

        return true;
    }

    /**
     * Put the meshes into the state the two masks describe.
     *
     * Every operation here is O(1) per node and touches no style, no material and no layer: a
     * node is drawn or it is not, and the two overlays are instances of ONE shared source mesh
     * each, so the halo and the context point cost no material of their own however many nodes
     * carry one.
     */
    private applyRenderState(): void {
        if (this.disposed) {
            return;
        }

        const drawn = this.renderState === "visible";

        if (!this.mesh.isDisposed()) {
            this.mesh.setEnabled(drawn);
            // A hidden node must not swallow a click meant for whatever is behind it, and a
            // context point is background rather than a target.
            this.mesh.isPickable = drawn;
        }

        const labelMesh = this.label?.labelMesh;
        if (labelMesh && !labelMesh.isDisposed()) {
            labelMesh.setEnabled(drawn);
        }

        // A node that has just been filtered out cannot be under the pointer any more, and a
        // tooltip left hanging over a node that is no longer drawn is words with nothing under
        // them. Taken down rather than disabled, on the same terms as leaving a node: a tooltip
        // carries a dynamic texture and is cheap to build again when the pointer comes back.
        if (!drawn) {
            this.hideTooltip();
        }

        this.showOverlay("context", this.renderState === "context");
        // A hidden node draws no halo: the selection is still the selection, but there is nothing
        // on screen for it to ring.
        this.showOverlay("halo", drawn && this.selected);
    }

    /**
     * What a selected node is configured to look like.
     *
     * Read on every overlay pass rather than cached, because a consumer can restyle the
     * selection while a selection is on screen and a cached answer would keep drawing the old
     * one until something else happened to rebuild the node.
     * @returns The configured colour, scale and opacity.
     */
    private selectionStyle(): GraphSelectionStyleConfig {
        return this.context.getStyles().config.graph.selection ?? DEFAULT_SELECTION_STYLE;
    }

    /**
     * Redraw this node's selection halo from the configuration as it now stands.
     *
     * Called for every node when `graph.setSelectionStyle()` changes it. A node that is not
     * selected has no halo and nothing happens.
     */
    refreshSelectionOverlay(): void {
        if (this.disposed) {
            return;
        }

        this.showOverlay("halo", this.renderState === "visible" && this.selected);
    }

    /**
     * Turn one of this node's two overlays on or off, building it the first time it is needed.
     * @param kind - Which overlay.
     * @param wanted - Whether it should be drawn.
     */
    private showOverlay(kind: "halo" | "context", wanted: boolean): void {
        const existing = kind === "halo" ? this.halo : this.contextPoint;

        if (!wanted) {
            if (existing && !existing.isDisposed()) {
                existing.setEnabled(false);
            }

            return;
        }

        const selection = this.selectionStyle();
        const overlay = existing && !existing.isDisposed() ? existing : this.createOverlay(kind);

        if (kind === "halo") {
            this.halo = overlay;
            // WRITTEN ON EVERY PASS, not only when the halo is built. Every halo in the graph is
            // an instance of ONE source mesh and shares ONE material, so a selection restyled
            // while a selection is on screen is this one write -- and it is the same write for
            // one selected node and for forty thousand. Minting a source mesh per appearance
            // instead would leave one behind in the cache for every colour a colour picker
            // passed through.
            Node.paintHalo(overlay, selection);
        } else {
            this.contextPoint = overlay;
        }

        const scale =
            kind === "halo"
                ? this.haloScale(selection.scale)
                : Math.max(this.size, MIN_OVERLAY_SIZE) * CONTEXT_POINT_SCALE;
        overlay.scaling.setAll(scale);
        overlay.position.copyFrom(this.mesh.position);
        overlay.setEnabled(true);
    }

    /**
     * How big to draw the selection halo, so that it really is a ring around the node.
     *
     * MEASURED FROM THE NODE ON SCREEN, and that is the fix. The halo used to be scaled by the
     * style's `size` NUMBER -- `size * 1.45` -- against a source sphere one unit across, giving a
     * halo of radius 0.725 for a node of size 1. The element draws a node of size 1 at radius
     * 0.75. So the halo was SMALLER than the node it was meant to ring and sat entirely inside
     * it: the selection highlight has never been visible, in this version of the package or any
     * earlier one, and no test could see it because the one assertion there was checked that the
     * halo OBJECT existed.
     *
     * Reading the drawn extent also makes the multiplier mean the same thing for every shape: a
     * box, a cone and a sphere of one size do not have one radius between them, and the largest
     * half-extent is the one a halo has to clear to be seen.
     * @param multiplier - The configured scale: how many times the node's own radius.
     * @returns The scaling for a unit-diameter overlay sphere.
     */
    private haloScale(multiplier: number): number {
        // THE NODE'S OWN EXTENT, not its world one. The halo is a sibling of the node under
        // `graph-root`, and an XR gesture scales that root -- so measuring in world space and
        // then writing a local scaling would count the gesture twice and the halo would grow away
        // from the node every time a reader pinched to zoom.
        const box = this.mesh.isDisposed() ? null : this.mesh.getBoundingInfo().boundingBox;
        const own = this.mesh.scaling;
        const radius =
            box === null
                ? 0
                : Math.max(box.extendSize.x, box.extendSize.y, box.extendSize.z) *
                  Math.max(Math.abs(own.x), Math.abs(own.y), Math.abs(own.z));

        // A mesh whose bounds have not been computed yet answers zero, which would collapse the
        // halo. Falling back to the style's own size keeps a halo on screen at roughly the right
        // place until the next pass measures it properly.
        const drawn = radius > 0 ? radius : Math.max(this.size, MIN_OVERLAY_SIZE) / 2;

        // Doubled because the source is a sphere of DIAMETER one, so a scaling of `s` draws a
        // radius of `s / 2`.
        return 2 * drawn * multiplier;
    }

    /**
     * Build one overlay instance for this node.
     *
     * The source mesh is interned in the mesh cache under a fixed name, so the whole graph shares
     * one sphere and one material per overlay kind: turning the context layer on for 40,000 hidden
     * nodes allocates 40,000 instances of one mesh, not 40,000 meshes.
     * @param kind - Which overlay.
     * @returns The instance, parented and ready to be positioned.
     */
    private createOverlay(kind: "halo" | "context"): AbstractMesh {
        const scene = this.context.getScene();
        const selection = this.selectionStyle();
        const name = kind === "halo" ? SELECTION_HALO_MESH : CONTEXT_POINT_MESH;
        const color = kind === "halo" ? selection.color : CONTEXT_POINT_COLOR;
        const alpha = kind === "halo" ? selection.opacity : CONTEXT_POINT_ALPHA;
        const overlay = this.context
            .getMeshCache()
            .get(name, () => Node.createOverlaySource(name, color, alpha, scene));

        // Never pickable: the halo sits OVER the node it rings, so a pickable halo would take
        // every click meant for the node underneath it and selection would stop working.
        overlay.isPickable = false;

        const graphRoot = scene.getTransformNodeByName("graph-root");
        if (graphRoot) {
            overlay.parent = graphRoot;
        }

        return overlay;
    }

    /**
     * Bring the shared halo material into line with the configured appearance.
     * @param overlay - Any halo instance; its material is the shared one.
     * @param selection - The configured colour and opacity.
     */
    private static paintHalo(overlay: AbstractMesh, selection: GraphSelectionStyleConfig): void {
        const {material} = overlay;

        if (!(material instanceof StandardMaterial)) {
            return;
        }

        material.emissiveColor = Color3.FromHexString(selection.color);
        material.alpha = selection.opacity;
    }

    /**
     * Build the one source mesh a kind of overlay is instanced from.
     * @param name - The mesh name, which is also its cache key.
     * @param color - The colour, as a hex string.
     * @param alpha - How opaque it is, in `[0, 1]`.
     * @param scene - The scene to build it in.
     * @returns The source mesh, with a unit diameter so an instance scales to the node's size.
     */
    private static createOverlaySource(name: string, color: string, alpha: number, scene: Scene): Mesh {
        const source = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 8 }, scene);
        const material = new StandardMaterial(`${name}-material`, scene);

        // Unlit on purpose: an overlay is a marker, and a marker that changes shade as the camera
        // orbits reads as another node rather than as an annotation on one.
        material.disableLighting = true;
        material.emissiveColor = Color3.FromHexString(color);
        material.diffuseColor = Color3.Black();
        material.specularColor = Color3.Black();
        material.alpha = alpha;
        // Both faces, so a halo drawn around a node is still a ring when the camera is inside it.
        material.backFaceCulling = false;
        source.material = material;

        return source;
    }

    /**
     * Move the overlays onto the node's current position.
     *
     * Called from the update loop rather than from a parent-child link, because the context point
     * stands in for a mesh that is DISABLED: Babylon disables a mesh's descendants with it, so an
     * overlay parented to the node's own mesh would vanish in exactly the case it exists for.
     */
    private syncOverlayPositions(): void {
        if (this.halo && !this.halo.isDisposed()) {
            this.halo.position.copyFrom(this.mesh.position);
        }

        if (this.contextPoint && !this.contextPoint.isDisposed()) {
            this.contextPoint.position.copyFrom(this.mesh.position);
        }
    }

    /**
     * Pins the node in place, so that no layout moves it again until it is released.
     *
     * THE ELEMENT OWNS THE PIN, in the byte beside this node's coordinates. It used to be owned by
     * whichever layout engine happened to be current, which meant every pin was lost the moment
     * the reader changed arrangement or switched between 2D and 3D -- and meant nothing at all
     * under fourteen of the sixteen engines, whose `pin()` does nothing. Recorded here it is one
     * fact that survives a layout change, a re-freeze and a renumbering, and the shared position
     * array refuses a layout step onto a pinned row whatever engine is running.
     *
     * THE ENGINE IS STILL TOLD, because a live simulation that knows a body is fixed stops
     * spending force on it -- ngraph's `pinNode`, d3's `fx`/`fy`/`fz`. That copy is a projection
     * of the element's bit and never a second source of truth. The order is load-bearing: the bit
     * is recorded FIRST, so an engine that calls back into {@link Node.isPinned} while being told
     * sees the pin.
     */
    pin(): void {
        if (!this.positionsLane?.setPinned(this.index, true)) {
            // A node the graph builder never took has no row to pin, and pinning happens from a
            // pointer gesture, so this says so rather than throwing inside the frame that reports
            // the drop.
            logger.debug("A node with no row in the graph cannot be pinned", { nodeId: this.id });
            return;
        }

        this.tellEngine("pin");
    }

    /**
     * Unpins the node, allowing the layout engine to move it again.
     *
     * The element's bit is cleared FIRST and the forward is guarded, so this cannot throw. It used
     * to: a node pinned under one engine and released after a layout change forwarded the release
     * to a DIFFERENT engine, which threw "Internal error: Node not found" for a node it had never
     * been told about.
     */
    unpin(): void {
        this.positionsLane?.setPinned(this.index, false);
        this.tellEngine("unpin");
    }

    /**
     * Tell the current layout engine about a pin the element has already recorded.
     *
     * GUARDED, and this is the whole reason it exists as a method. An engine may refuse a node it
     * has not been told about -- `NGraphLayoutEngine` and `D3GraphLayoutEngine` both throw for
     * one -- and the element's pin is already recorded by the time this runs, so a throw here
     * would abort the caller's gesture while leaving the pin in force with no way back out.
     * @param verb - which half of the projection to forward
     */
    private tellEngine(verb: "pin" | "unpin"): void {
        const engine = this.context.getLayoutManager().layoutEngine;
        if (!engine) {
            return;
        }

        try {
            engine[verb](this);
        } catch (error) {
            logger.debug("The layout engine did not accept the pin change", {
                nodeId: this.id,
                verb,
                reason: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * The element's position array, when this node belongs to a graph that keeps one.
     *
     * Resolved on every read rather than cached, for the same reason `LayoutEngine.positionsFor`
     * resolves on every call: the element REPLACES the array when a dataset is discarded, and a
     * cached reference would go on answering for a graph that no longer exists.
     * @returns the array, or undefined for a node built outside a graph
     */
    private get positionsLane(): ElementPositions | undefined {
        return this.context.getDataManager?.()?.positions;
    }

    /**
     * Bring the label on screen into line with what one resolved style asks for.
     *
     * SEPARATE FROM THE GEOMETRY REBUILD, and the separation is the whole point. `paintFrom`
     * skips the geometry when the source mesh has not changed, which is correct and is what
     * makes a colour change one buffer write; the label is not geometry and is not keyed by the
     * mesh, so it has to be looked at on every paint instead. Its own comparison is what keeps
     * that free: a repaint that leaves the words and their typography alone rebuilds nothing.
     *
     * NOT A STYLE DECISION. What the label says and how it is drawn is the style stack's answer,
     * resolved into `o.label` by `StylePainter` from the `node.label` and `node.labelStyle`
     * channels. This method only makes the scene agree with it.
     * @param o - The resolved style.
     * @param rebuild - True when the mesh the label hangs from has just been replaced, so a
     *     label asking for exactly what was drawn a moment ago must still be built again.
     */
    private syncLabel(o: NodeStyleConfig, rebuild: boolean): void {
        const wanted = o.label?.enabled === true ? o.label : undefined;
        const text = wanted === undefined ? undefined : this.extractLabelText(wanted);

        if (!rebuild && text === this.drawnLabelText && _.isEqual(wanted, this.drawnLabelStyle)) {
            return;
        }

        this.label?.dispose();
        this.label = wanted === undefined ? undefined : this.createLabel(o);
        this.drawnLabelText = text;

        // CLONED rather than held. The block belongs to a `NodePaint` that
        // `StylePainter.nodePaint` builds fresh on every call, and a comparison against a
        // reference somebody else can still write to is a comparison that silently starts
        // passing. Paid only when the label actually changes.
        this.drawnLabelStyle = wanted === undefined ? undefined : _.cloneDeep(wanted);
    }

    /**
     * Remember what this node's tooltip should say, and redraw it if one is on screen.
     *
     * A tooltip is not drawn by a paint. It is drawn when the pointer arrives, which is a moment
     * the style stack knows nothing about, so what a paint can do is record the answer for when
     * that happens. If the reader is already resting on this node, the tooltip in front of them
     * is rebuilt so it does not keep saying what a layer has just stopped saying.
     *
     * NOT A STYLE DECISION, on exactly the same terms as {@link Node.syncLabel}: what a tooltip
     * says and how it is drawn is resolved into `o.tooltip` by `StylePainter` from the
     * `node.tooltip` channel.
     * @param o - The resolved style.
     */
    private syncTooltip(o: NodeStyleConfig): void {
        const wanted = o.tooltip?.enabled === true ? o.tooltip : undefined;

        if (_.isEqual(wanted, this.wantedTooltip)) {
            return;
        }

        // CLONED for the reason `drawnLabelStyle` is cloned: the block belongs to a paint the
        // painter rebuilds on every call, and holding the reference makes the comparison above
        // start passing whenever somebody else writes through it.
        this.wantedTooltip = wanted === undefined ? undefined : _.cloneDeep(wanted);

        if (this.tooltip) {
            this.hideTooltip();
            this.showTooltip();
        }
    }

    /**
     * Draw this node's tooltip, if a layer gave it one.
     *
     * Called when the pointer arrives over the node. Does nothing at all when no layer has
     * written `node.tooltip`, which is the ordinary case, so hovering an unannotated graph costs
     * one comparison per node entered.
     */
    showTooltip(): void {
        if (this.disposed || this.tooltip || this.wantedTooltip === undefined || this.mesh.isDisposed()) {
            return;
        }

        const text = this.extractLabelText(this.wantedTooltip);
        this.tooltip = new RichTextLabel(this.mesh.getScene(), {
            ...this.createLabelOptions(text, this.wantedTooltip),
            onTop: true,
        });
    }

    /**
     * Take this node's tooltip off the screen.
     *
     * Called when the pointer leaves, and on dispose. Disposing rather than hiding, because a
     * tooltip's plane carries a dynamic texture of its own: keeping one per node that has ever
     * been hovered is a texture per node, which is the cost the hover-only rule exists to avoid.
     */
    hideTooltip(): void {
        this.tooltip?.dispose();
        this.tooltip = undefined;
    }

    /**
     * The words this node's tooltip draws, or undefined when no layer gave it one.
     * @returns The tooltip text.
     */
    get tooltipText(): string | undefined {
        return this.wantedTooltip === undefined ? undefined : this.extractLabelText(this.wantedTooltip);
    }

    private createLabel(styleConfig: NodeStyleConfig): RichTextLabel {
        const labelText = this.extractLabelText(styleConfig.label);
        const labelOptions = this.createLabelOptions(labelText, styleConfig.label);
        const scene = this.mesh.getScene();
        // Labels that would overlap on screen are thinned out when `labels.declutter` is on; see
        // LabelDeclutter.
        LabelDeclutter.track(scene, this.context, this);
        return new RichTextLabel(scene, labelOptions);
    }

    private extractLabelText(labelConfig?: Record<string, unknown>): string {
        if (!labelConfig) {
            return this.id.toString();
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

        return this.id.toString();
    }

    /**
     * Turn one rich-text block into the options the label renderer takes.
     *
     * TAKES THE BLOCK, not the whole style, because a node draws two of them: its label and its
     * tooltip. They are the same schema (`RichTextStyle`), they are drawn by the same class, and
     * the only difference is which key of the resolved style they came from and when they are on
     * screen.
     * @param labelText - The words to draw.
     * @param labelStyle - The resolved rich-text block: `style.label` or `style.tooltip`.
     * @returns The options, with this node's mesh as the thing they attach to.
     */
    private createLabelOptions(labelText: string, labelStyle: NodeStyleConfig["label"] = {}): RichTextLabelOptions {

        // Get attach position and offset
        const attachPosition = this.getAttachPosition(labelStyle.location ?? "top");
        const attachOffset = labelStyle.attachOffset ?? this.getDefaultAttachOffset(labelStyle.location ?? "top");

        // Transform backgroundColor to string if it's an advanced color style
        let backgroundColor: string | undefined = undefined;
        if (labelStyle.backgroundColor) {
            if (typeof labelStyle.backgroundColor === "string") {
                ({ backgroundColor } = labelStyle);
            } else if (labelStyle.backgroundColor.colorType === "solid") {
                ({ value: backgroundColor } = labelStyle.backgroundColor);
            } else if (labelStyle.backgroundColor.colorType === "gradient") {
                // For gradients, use the first color as a fallback
                [backgroundColor] = labelStyle.backgroundColor.colors;
            }
        }

        // Filter out undefined values from backgroundGradientColors
        let backgroundGradientColors: string[] | undefined = undefined;
        if (labelStyle.backgroundGradientColors) {
            backgroundGradientColors = labelStyle.backgroundGradientColors.filter(
                (color): color is string => color !== undefined,
            );
            if (backgroundGradientColors.length === 0) {
                backgroundGradientColors = undefined;
            }
        }

        // Transform borders to ensure colors are strings
        let borders: { width: number; color: string; spacing: number }[] | undefined = undefined;
        if (labelStyle.borders && labelStyle.borders.length > 0) {
            const validBorders = labelStyle.borders
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

        // Create label options by spreading the entire labelStyle object
        const labelOptions: RichTextLabelOptions = {
            ...labelStyle,
            // Override with computed values
            text: labelText,
            attachTo: this.mesh,
            attachPosition,
            attachOffset,
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

    private getAttachPosition(
        location: string,
    ): "top" | "top-left" | "top-right" | "left" | "center" | "right" | "bottom" | "bottom-left" | "bottom-right" {
        switch (location) {
            case "floating":
            case "automatic":
                return "top";
            case "top":
            case "top-left":
            case "top-right":
            case "left":
            case "center":
            case "right":
            case "bottom":
            case "bottom-left":
            case "bottom-right":
                return location;
            default:
                return "top";
        }
    }

    private getDefaultAttachOffset(location: string): number {
        // Return larger offsets for left/right positions to prevent overlap
        switch (location) {
            case "left":
            case "right":
                return 1.0; // Larger offset for horizontal positions
            case "center":
                return 0; // No offset for center
            default:
                return 0.5; // Standard offset for top/bottom positions
        }
    }

    // Test helper methods
    /**
     * Gets the current 3D position of the node's mesh.
     * @returns An object containing the x, y, and z coordinates of the node
     */
    getPosition(): { x: number; y: number; z: number } {
        return {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
        };
    }

    /**
     * Checks whether the node is currently pinned in place.
     *
     * Answers from the element's own position array, so the answer does not change because the
     * reader switched arrangement, switched between 2D and 3D, or applied a style template.
     * @returns True if the node is pinned, false otherwise
     */
    isPinned(): boolean {
        return this.positionsLane?.isPinned(this.index) ?? false;
    }
}
