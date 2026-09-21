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
import { AdHocData, NodeStyleConfig } from "./config";
import type { Graph } from "./Graph";
import type { LayoutEngine } from "./layout/LayoutEngine";
import type { GraphContext } from "./managers/GraphContext";
import type { NodePaint } from "./managers/StylePainter";
import { NodeEffects } from "./meshes/NodeEffects";
import { NodeMesh } from "./meshes/NodeMesh";
import { RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { NodeBehavior, type NodeDragHandler } from "./NodeBehavior";
import { NodeStyleId, Styles } from "./Styles";

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

/** The cached source mesh every selection halo is an instance of. */
const SELECTION_HALO_MESH = "graphty-selection-halo";

/** The cached source mesh every context point is an instance of. */
const CONTEXT_POINT_MESH = "graphty-context-point";

/** The halo colour. Gold, which is the colour selection has always been drawn in here. */
const SELECTION_HALO_COLOR = "#FFD700";

/** How much of the node's size the halo is drawn at, so it reads as a ring around the node. */
const SELECTION_HALO_SCALE = 1.45;

/** How transparent the halo is. Low enough to read as a highlight rather than as a new node. */
const SELECTION_HALO_ALPHA = 0.4;

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
    dragHandler?: NodeDragHandler;
    dragging = false;
    styleId: NodeStyleId;
    pinOnDrag!: boolean;
    size!: number;

    /**
     * The shape type of the mesh currently on screen, cached beside {@link Node.size}.
     *
     * It exists ONLY so that {@link Node.updateStyle} can tell a geometry change from a colour
     * change; see the invalidation block there for the defect it fixes. It is read from
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
     * A KEY, NOT A STYLE, and that is the whole reason it is a string rather than a `NodeStyleId`.
     * Under the legacy stack it is the style id, because a legacy style id keys a source mesh.
     * Under the session's stack it is the key the style interner minted -- built from the shape
     * and the size and deliberately NOT from the colour, because a colour is per-instance GPU
     * state and folding it in is what turns a continuous ramp into one source mesh per node.
     */
    private meshKey: string;

    /**
     * What the session's style stack resolved for this node, or null while the legacy stack owns
     * its paint.
     *
     * Held rather than re-read because the renderer rebuilds a mesh at moments the style stack
     * knows nothing about -- a 2D/3D switch disposes every mesh -- and rebuilding from the legacy
     * style id at one of those moments would silently hand the node back to the other system.
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
     * The layout engine this node's pin was handed to, or undefined when the node is not pinned.
     *
     * A pin is the engine's to hold -- ngraph's `pinNode`, d3's `fx`/`fy`/`fz` -- and LayoutManager
     * constructs a fresh engine on every `setLayout` and re-adds the nodes to it, so a pin does not
     * survive a layout change. Holding the engine rather than a bare boolean is what lets
     * {@link Node.isPinned} say so: the answer is "yes" only while the engine that was told about
     * the pin is still the current one.
     *
     * The element does NOT own pin state yet. When the pinning surface lands -- `pin`, `unpin`,
     * `pinnedMask()` and `isPinned(id)` on the element's own position column -- a pin becomes
     * session state that outlives a layout change, and this field goes away with the engines'
     * copies becoming a projection of it. Until then an element-owned flag would only make a pin
     * permanent with nothing in the element able to release it.
     */
    private pinnedIn: LayoutEngine | undefined;

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
     * @param graph - The parent graph or graph context that owns this node
     * @param nodeId - Unique identifier for this node
     * @param styleId - Style identifier determining the node's visual appearance
     * @param data - Custom data associated with this node
     * @param opts - Optional configuration options for the node
     */
    constructor(
        graph: Graph | GraphContext,
        nodeId: NodeIdType,
        styleId: NodeStyleId,
        data: AdHocData<string | number>,
        opts: NodeOpts = {},
    ) {
        this.parentGraph = graph;
        this.id = nodeId;
        this.opts = opts;
        this.data = data;

        // copy nodeMeshOpts
        this.styleId = styleId;
        this.meshKey = String(styleId);

        // create graph node
        // TODO: Node is added to layout engine by DataManager, not here

        // create mesh
        const o = Styles.getStyleForNodeStyleId(styleId);
        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        this.mesh = NodeMesh.create(
            this.context.getMeshCache(),
            { styleId: String(styleId), is2D: this.context.is2D(), size: this.size },
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
            styleId: String(styleId),
            nodeId: this.id,
        };

        // Apply outline and glow effects if configured in style
        NodeEffects.applyOutlineEffect(this.mesh, o.effect);
        NodeEffects.applyGlowEffect(this.mesh, o.effect);

        // create label
        if (o.label?.enabled) {
            this.label = this.createLabel(o);
        }

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
        // Rebuilt from whichever stack owns this node's paint: a 2D/3D switch happens at a moment
        // the style stack knows nothing about, and rebuilding from the legacy style id while the
        // session owns the paint would hand the node to the other system without saying so.
        if (this.mesh.isDisposed()) {
            this.updateStyle(this.styleId);
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
     * Updates the node's visual style by recreating the mesh with the specified style.
     * Preserves the node's position and reattaches behaviors and labels.
     * @param styleId - The new style identifier to apply to the node
     */
    updateStyle(styleId: NodeStyleId): void {
        // See update(): a disposed node is still reachable from the layout engine and from
        // SelectionManager, and this method builds a mesh. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        this.styleId = styleId;

        // THE OWNERSHIP RULE, AT THE WRITE. While the session's style stack owns this graph's
        // paint, the legacy stack does not draw: it still resolves a style id, and that id is
        // still kept above so that everything reading `node.styleId` keeps its answer, but the
        // paint belongs to the other system and a second writer here would make the picture
        // last-writer-wins. See StylePainter for which system owns what, and when.
        //
        // IT IS STILL A REBUILD REQUEST, and that is why this answers rather than refusing. The
        // 2D/3D switch calls this method for exactly one reason -- every mesh has just been
        // disposed -- and a refusal there would leave the graph with no meshes at all. What the
        // owner draws is the owner's answer; WHETHER to draw is still the caller's.
        const paint = this.ownedPaint();

        if (paint !== null) {
            this.sessionPaint = paint;
            this.paintFrom(paint.meshKey, paint.style, paint.color);

            return;
        }

        // Ownership has moved back, so the paint the session resolved is no longer this node's.
        // Dropped rather than kept, because a kept one would be drawn again at the next rebuild
        // and the two systems would take turns.
        this.sessionPaint = null;
        this.paintFrom(String(styleId), Styles.getStyleForNodeStyleId(styleId), null);
    }

    /**
     * What the session's style stack says this node looks like, when it is the owner.
     *
     * Asked of the painter rather than only read off the field, because the two do not become
     * true at the same moment: the session owns the paint from the instant it is bound, and the
     * field is filled by the first frame that drains the dirty set. A rebuild in between -- a
     * 2D/3D switch immediately after a load -- would otherwise find nothing and draw nothing.
     * @returns The paint, or null when the legacy stack owns this node.
     */
    private ownedPaint(): NodePaint | null {
        const painter = this.context.getStylePainter?.();

        if (painter?.owns !== true) {
            return null;
        }

        return this.sessionPaint ?? painter.nodePaint(this.index);
    }

    /**
     * Draw this node as the session's style stack resolved it.
     *
     * The session's half of the door {@link Node.updateStyle} is the legacy half of. Only one of
     * the two is the owner at a time, and the owner is the whole graph's rather than this node's,
     * so the two can never be applying to one element at once.
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
        if (meshKey === this.meshKey && !this.mesh.isDisposed()) {
            this.applyInstanceColor(color);
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
        // Both style routes -- Graph.ts's style-changed handler and
        // DataManager.applyStylesToExistingNodes, which is what the shell repaints through --
        // converge on this same method and this same guard, so no route bypassed a recalculation
        // that another route performed. The old shell saw it work because it predates 973f1d96,
        // not because it called anything different.
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

        // Apply outline and glow effects if configured in style
        NodeEffects.applyOutlineEffect(this.mesh, o.effect);
        NodeEffects.applyGlowEffect(this.mesh, o.effect);

        // recreate label if needed
        if (o.label?.enabled) {
            this.label?.dispose();
            this.label = this.createLabel(o);
        } else if (this.label) {
            this.label.dispose();
            this.label = undefined;
        }

        // Dispose old drag handler before creating new one to prevent duplicate event listeners
        if (this.dragHandler) {
            this.dragHandler.dispose();
        }

        NodeBehavior.addDefaultBehaviors(this, this.opts);

        // The mesh above is a NEW instance, so both of the things that live ON an instance rather
        // than in its source have to be said again: what the masks said about this node, and the
        // colour the session's stack resolved for it. Otherwise a restyle silently un-hides a
        // filtered node, drops its halo, and repaints it in its source mesh's own colour.
        this.applyRenderState();
        this.applyInstanceColor(color);

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
     * GLOW IS DELIBERATELY NOT REMOVED HERE. Glow membership is keyed by the SHARED source mesh
     * that MeshCache hands out instances of -- one source per style id -- so calling
     * `NodeEffects.applyGlowEffect(mesh, undefined)` from here would darken every OTHER node that
     * still uses this style. The source is owned by the cache, so it is freed when the cache is
     * cleared, and the layer's leftover uniqueId is inert: Babylon's uniqueIds are monotonic per
     * scene and never reused, so no future mesh can inherit a dead style's glow.
     *
     * A DISPOSED NODE STILL RECEIVES CALLS, which is why {@link Node.disposed} exists rather than
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

        this.showOverlay("context", this.renderState === "context");
        // A hidden node draws no halo: the selection is still the selection, but there is nothing
        // on screen for it to ring.
        this.showOverlay("halo", drawn && this.selected);
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

        const overlay = existing && !existing.isDisposed() ? existing : this.createOverlay(kind);

        if (kind === "halo") {
            this.halo = overlay;
        } else {
            this.contextPoint = overlay;
        }

        const scale = Math.max(this.size, MIN_OVERLAY_SIZE) * (kind === "halo" ? SELECTION_HALO_SCALE : CONTEXT_POINT_SCALE);
        overlay.scaling.setAll(scale);
        overlay.position.copyFrom(this.mesh.position);
        overlay.setEnabled(true);
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
        const name = kind === "halo" ? SELECTION_HALO_MESH : CONTEXT_POINT_MESH;
        const color = kind === "halo" ? SELECTION_HALO_COLOR : CONTEXT_POINT_COLOR;
        const alpha = kind === "halo" ? SELECTION_HALO_ALPHA : CONTEXT_POINT_ALPHA;
        const overlay = this.context.getMeshCache().get(name, () => Node.createOverlaySource(name, color, alpha, scene));

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
     * Pins the node in place, preventing the layout engine from moving it.
     *
     * A static layout has nothing to pin, so `SimpleLayoutEngine.pin` is a no-op and the node does
     * not report itself pinned there either -- the pin exists exactly as long as the engine holding
     * it does.
     */
    pin(): void {
        const engine = this.context.getLayoutManager().layoutEngine;
        this.pinnedIn = engine;
        engine?.pin(this);
    }

    /**
     * Unpins the node, allowing the layout engine to move it again.
     */
    unpin(): void {
        this.pinnedIn = undefined;
        this.context.getLayoutManager().layoutEngine?.unpin(this);
    }

    private createLabel(styleConfig: NodeStyleConfig): RichTextLabel {
        const labelText = this.extractLabelText(styleConfig.label);
        const labelOptions = this.createLabelOptions(labelText, styleConfig);
        return new RichTextLabel(this.mesh.getScene(), labelOptions);
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

    private createLabelOptions(labelText: string, styleConfig: NodeStyleConfig): RichTextLabelOptions {
        const labelStyle = styleConfig.label ?? {};

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
     * Answers from the layout engine that holds the pin: a `setLayout` builds a new engine and the
     * old one's pins go with it, so a node pinned under the previous layout reports itself free
     * again, which is what the engine underneath actually does.
     * @returns True if the node is pinned in the current layout, false otherwise
     */
    isPinned(): boolean {
        return this.pinnedIn !== undefined && this.pinnedIn === this.context.getLayoutManager().layoutEngine;
    }
}
