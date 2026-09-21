import type { Mesh, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { CameraManager } from "../cameras/CameraManager";
import type { EdgeId, NodeId } from "../catalog/types";
import { Edge } from "../Edge";
import type { NodeRenderState } from "../Node";
import type { ElementMask } from "../session/scope/index";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";
import type { LayoutManager } from "./LayoutManager";
import type { StatsManager } from "./StatsManager";

/**
 * One set of elements the renderer honours, as the session holds it.
 *
 * A MASK, not a list of ids: membership is one array read per element, the bytes are bounded at
 * the element count however many elements are in the set, and the `version` counter is what lets
 * a render loop decide in ONE integer comparison that nothing has moved. An id list would cost a
 * hash lookup per element per frame and would have to be rebuilt every time the set changed.
 */
export interface ViewMaskSource {
    /**
     * The nodes in the set.
     * @returns The live mask.
     */
    nodes(): ElementMask<NodeId>;
    /**
     * The edges in the set.
     * @returns The live mask.
     */
    edges(): ElementMask<EdgeId>;
}

/**
 * What the renderer reads to decide what is drawn, and what is drawn as selected.
 *
 * Both members are optional and an absent one means "this session says nothing about it": no
 * visibility source draws the whole graph, and no selection source draws no highlight. That is
 * the honest default rather than a guess, because a renderer that invented a mask would hide
 * elements nobody asked it to hide.
 */
export interface ViewMasks {
    /** What is selected, or absent when nothing in this session owns a selection. */
    readonly selection?: ViewMaskSource;
    /** What is visible -- the DATA scope, never the render set -- or absent when nothing hides. */
    readonly visibility?: ViewMaskSource;
    /**
     * Whether hidden nodes should still be drawn faintly instead of vanishing.
     *
     * Read on every pass rather than captured, because it is a flag a reader toggles and the
     * renderer has to notice the toggle without being told twice.
     * @returns True when hidden nodes are drawn as context.
     */
    readonly showContext?: () => boolean;
}

/** The version a mask that is not there reports, which no real mask can hold. */
const NO_MASK_VERSION = -1;

/** What an unbound renderer reads: no selection, no filter, nothing hidden. */
const EMPTY_MASKS: ViewMasks = Object.freeze({});

/**
 * Configuration for the UpdateManager
 */
interface UpdateManagerConfig {
    /**
     * Number of layout steps to perform per update
     */
    layoutStepMultiplier?: number;

    /**
     * Whether to automatically zoom to fit on first load
     */
    autoZoomToFit?: boolean;

    /**
     * Minimum bounding box size to trigger zoom to fit
     */
    minBoundingBoxSize?: number;
}

/**
 * Manages the update loop logic for the graph
 * Coordinates updates across nodes, edges, layout, and camera
 */
export class UpdateManager implements Manager {
    private needsZoomToFit = false;
    private hasZoomedToFit = false;
    private config: Required<UpdateManagerConfig>;
    private layoutStepCount = 0;
    private minLayoutStepsBeforeZoom = 10;
    private lastZoomStep = 0;
    private wasSettled = false;

    /** Where the two masks are read from, or null while nothing has been bound. */
    private viewMasks: ViewMasks | null = null;

    /** The mask versions the meshes on screen were last brought into line with. */
    private appliedNodeSelection = NO_MASK_VERSION;
    private appliedEdgeSelection = NO_MASK_VERSION;
    private appliedNodeVisibility = NO_MASK_VERSION;
    private appliedEdgeVisibility = NO_MASK_VERSION;
    private appliedShowContext = false;
    private appliedAnything = false;

    /**
     * Creates a new update manager
     * @param eventManager - Event manager for emitting update events
     * @param statsManager - Stats manager for performance tracking
     * @param layoutManager - Layout manager for graph layout
     * @param dataManager - Data manager for nodes and edges
     * @param camera - Camera manager for view control
     * @param graphContext - Graph context for accessing shared resources
     * @param config - Optional configuration
     */
    constructor(
        private eventManager: EventManager,
        private statsManager: StatsManager,
        private layoutManager: LayoutManager,
        private dataManager: DataManager,
        private camera: CameraManager,
        private graphContext: GraphContext,
        config: UpdateManagerConfig = {},
    ) {
        this.config = {
            layoutStepMultiplier: config.layoutStepMultiplier ?? 1,
            autoZoomToFit: config.autoZoomToFit ?? true,
            minBoundingBoxSize: config.minBoundingBoxSize ?? 0.1,
        };
    }

    /**
     * Initialize the update manager
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        // UpdateManager doesn't need async initialization
        return Promise.resolve();
    }

    /**
     * Dispose the update manager
     */
    dispose(): void {
        // UpdateManager doesn't hold resources to dispose
    }

    /**
     * Say where the renderer reads the selection and visibility masks from.
     *
     * Binding is how the element's own model reaches the render loop: the masks belong to the
     * session, one per dataset, and every view of that dataset honours the same two. Passing null
     * unbinds them, which draws the whole graph with no highlight.
     * @param masks - The two mask sources, or null.
     */
    bindViewMasks(masks: ViewMasks | null): void {
        this.viewMasks = masks;
        this.invalidateViewMasks();
    }

    /**
     * Forget which mask versions the meshes are in line with, so the next pass writes all of them.
     *
     * Call this when the render objects have changed under the masks -- a dataset load, a clear, a
     * 2D/3D switch -- because the versions would otherwise say "nothing moved" about elements that
     * are not the elements those versions were measured against.
     */
    invalidateViewMasks(): void {
        this.appliedNodeSelection = NO_MASK_VERSION;
        this.appliedEdgeSelection = NO_MASK_VERSION;
        this.appliedNodeVisibility = NO_MASK_VERSION;
        this.appliedEdgeVisibility = NO_MASK_VERSION;
        this.appliedAnything = false;
    }

    /**
     * Bring the meshes into line with the two masks.
     *
     * THE WHOLE POINT IS THE DELTA. A pass costs one integer comparison when nothing has moved,
     * and when something has it walks the render objects and writes ONLY the ones whose state
     * actually changed -- `Node.setRenderState` and `Edge.setRenderVisible` return false and touch
     * no mesh when handed what they already hold. So scrubbing a time window that moves 200 nodes
     * costs 200 mesh operations and not 50,000, and re-running a filter that lands on the same
     * answer costs none.
     *
     * Mesh instancing is what bounds the rest: a node is one `InstancedMesh` of a source shared by
     * every node of its style, so hiding one is a flag on that instance rather than a geometry
     * change. Babylon offers no way to hide a SUBSET of a source's instances in one call, so the
     * first application of a large filter is one flag write per element that moved; that is the
     * floor, and the delta above is what keeps every later pass off it.
     *
     * An element the store has no row for -- `INVALID_INDEX`, which is what a record that never
     * reached the builder carries -- is drawn and is not selected. The element has always drawn
     * such a record, and a mask cannot answer for a row that does not exist.
     *
     * READING A MASK RESYNCS IT against the current graph, which is the one cost this pass cannot
     * avoid and must not: a mask that was not regrown answers "not a member" for every node that
     * arrived since it was last evaluated, so skipping the resync would silently hide every newly
     * loaded node while a filter is on. The resync is an identity comparison whenever the graph has
     * not moved, so the cost lands only while records are actually arriving.
     */
    syncViewMasks(): void {
        // An unbound renderer is not a renderer that stops honouring the masks: it is one whose
        // session says nothing about them, which means the whole graph is drawn and nothing is
        // highlighted. Returning early here instead would freeze the last answer on screen after
        // an unbind, which is the one state nobody asked for.
        const masks = this.viewMasks ?? EMPTY_MASKS;

        const nodeSelection = masks.selection?.nodes() ?? null;
        const edgeSelection = masks.selection?.edges() ?? null;
        const nodeVisibility = masks.visibility?.nodes() ?? null;
        const edgeVisibility = masks.visibility?.edges() ?? null;
        const showContext = masks.showContext?.() ?? false;

        const nodeSelectionVersion = nodeSelection?.version ?? NO_MASK_VERSION;
        const edgeSelectionVersion = edgeSelection?.version ?? NO_MASK_VERSION;
        const nodeVisibilityVersion = nodeVisibility?.version ?? NO_MASK_VERSION;
        const edgeVisibilityVersion = edgeVisibility?.version ?? NO_MASK_VERSION;

        const nodesMoved =
            !this.appliedAnything ||
            nodeSelectionVersion !== this.appliedNodeSelection ||
            nodeVisibilityVersion !== this.appliedNodeVisibility ||
            showContext !== this.appliedShowContext;
        const edgesMoved =
            !this.appliedAnything ||
            edgeSelectionVersion !== this.appliedEdgeSelection ||
            edgeVisibilityVersion !== this.appliedEdgeVisibility;

        if (!nodesMoved && !edgesMoved) {
            return;
        }

        if (nodesMoved) {
            const hiddenState: NodeRenderState = showContext ? "context" : "hidden";

            for (const node of this.dataManager.nodes.values()) {
                const { index } = node;
                const placed = index !== INVALID_INDEX;
                const visible = nodeVisibility === null || !placed || nodeVisibility.has(index);

                node.setRenderState(visible ? "visible" : hiddenState);
                node.setSelected(nodeSelection !== null && placed && nodeSelection.has(index));
            }
        }

        if (edgesMoved) {
            for (const edge of this.dataManager.edges.values()) {
                const { index } = edge;
                const placed = index !== INVALID_INDEX;

                edge.setRenderVisible(edgeVisibility === null || !placed || edgeVisibility.has(index));
                edge.setSelected(edgeSelection !== null && placed && edgeSelection.has(index));
            }
        }

        this.appliedNodeSelection = nodeSelectionVersion;
        this.appliedEdgeSelection = edgeSelectionVersion;
        this.appliedNodeVisibility = nodeVisibilityVersion;
        this.appliedEdgeVisibility = edgeVisibilityVersion;
        this.appliedShowContext = showContext;
        this.appliedAnything = true;
    }

    /**
     * Bring the meshes into line with what the session's style stack painted.
     *
     * THE DIRTY SET IS THE WHOLE POINT, and it is the renderer's half of the repaint's cost
     * contract. A style pass bounds its own work to the elements an edit touched; without this
     * the renderer would then rebuild every mesh in the graph to find them, and the pass's bound
     * would buy nothing. So the painter hands back exactly the indices the pass repainted, and a
     * layer over 300 elements costs 300 elements whatever the graph's size.
     *
     * NOTHING HAPPENS WHILE THE LEGACY STACK OWNS THE PAINT. Two style systems are alive during
     * the migration and exactly one of them draws; see StylePainter for the rule. This is the
     * read side of it, and it is why an element is never written by both.
     *
     * An element whose paint has not changed still costs nothing: `Node.applySessionPaint` and
     * `Edge.applySessionPaint` compare the source mesh they are handed with the one already on
     * screen and rebuild only when it differs, so a colour change on a node is one buffer write
     * and no geometry at all.
     */
    syncStyles(): void {
        const painter = this.graphContext.getStylePainter?.();

        if (painter === undefined || !painter.owns || !painter.hasPending) {
            return;
        }

        const nodes = painter.takeNodes();
        const edges = painter.takeEdges();

        if (nodes.length > 0) {
            // Walked rather than indexed because the data manager keeps its nodes by id. The
            // membership test is one hash lookup per node and touches no mesh; every rebuild
            // below it is still bounded by the dirty set. A dense index array beside
            // `edgesByIndex` would remove even the walk.
            const wanted = new Set(nodes);

            for (const node of this.dataManager.nodes.values()) {
                if (!wanted.has(node.index)) {
                    continue;
                }

                const paint = painter.nodePaint(node.index);

                if (paint !== null) {
                    node.applySessionPaint(paint);
                }
            }
        }

        for (const index of edges) {
            const edge = this.dataManager.edgesByIndex[index];

            if (edge === undefined) {
                continue;
            }

            const paint = painter.edgePaint(index);

            if (paint !== null) {
                edge.applySessionPaint(paint);
            }
        }
    }

    /**
     * Enable zoom to fit on next update
     */
    enableZoomToFit(): void {
        this.needsZoomToFit = true;
        // Only reset the layout step count if we haven't zoomed yet
        // This prevents the counter from being reset when enableZoomToFit is called multiple times
        if (!this.hasZoomedToFit) {
            this.layoutStepCount = 0;
            this.lastZoomStep = 0;
            this.wasSettled = false;
        }
    }

    /**
     * Disable zoom to fit
     */
    disableZoomToFit(): void {
        this.needsZoomToFit = false;
    }

    /**
     * Get current zoom to fit state
     * @returns True if zoom to fit is enabled
     */
    isZoomToFitEnabled(): boolean {
        return this.needsZoomToFit;
    }

    /**
     * Get the current render frame count
     * @returns Total number of frames rendered
     */
    getRenderFrameCount(): number {
        return this.frameCount;
    }

    /**
     * Render a fixed number of frames (for testing)
     * This ensures deterministic rendering similar to Babylon.js testing approach
     * @param count - Number of frames to render
     */
    renderFixedFrames(count: number): void {
        for (let i = 0; i < count; i++) {
            this.update();
        }
    }

    /**
     * Main update method - called by RenderManager each frame
     */
    private frameCount = 0;

    /**
     * Update the graph for the current frame
     */
    update(): void {
        this.frameCount++;

        // Before anything is drawn or measured: the masks decide what IS drawn, so a node that a
        // filter has just hidden must not contribute to this frame's bounding box or be picked.
        this.syncViewMasks();

        // And before the bounding box is measured for a second reason: a style pass can change a
        // node's SIZE, and zooming to fit a graph whose sizes have just changed must frame what
        // is about to be drawn rather than what was drawn last frame.
        this.syncStyles();

        // Always update camera
        this.camera.update();

        // Check if layout is running
        if (!this.layoutManager.running) {
            // Even if layout is not running, we still need to:
            // 1. Update edges (for manual node dragging)
            // 2. Handle zoom if requested

            // Always update edges to handle manual node dragging
            // Edges have built-in dirty tracking, so they won't do unnecessary work
            this.updateEdges();

            // Handle zoom to fit if requested
            if (this.needsZoomToFit && !this.hasZoomedToFit) {
                // Check if we have nodes to calculate bounds from
                const nodeCount = Array.from(this.layoutManager.nodes).length;
                if (nodeCount > 0) {
                    // Calculate bounding box and update nodes
                    const { boundingBoxMin, boundingBoxMax } = this.updateNodes();

                    // Update edges (also expands bounding box for edge labels)
                    this.updateEdges(boundingBoxMin, boundingBoxMax);

                    // Handle zoom to fit
                    this.handleZoomToFit(boundingBoxMin, boundingBoxMax);

                    // Update statistics
                    this.updateStatistics();
                }
            }

            return;
        }

        // Update layout engine (step the force-directed algorithm)
        this.updateLayout();

        // Update nodes and edges
        const { boundingBoxMin, boundingBoxMax } = this.updateNodes();

        // Update edges (also expands bounding box for edge labels)
        this.updateEdges(boundingBoxMin, boundingBoxMax);

        // Handle zoom to fit if needed
        this.handleZoomToFit(boundingBoxMin, boundingBoxMax);

        // Update statistics
        this.updateStatistics();
    }

    /**
     * Update the layout engine
     */
    private updateLayout(): void {
        this.statsManager.step();
        this.statsManager.graphStep.beginMonitoring();

        const { stepMultiplier } = this.graphContext.getStyles().config.behavior.layout;
        for (let i = 0; i < stepMultiplier; i++) {
            this.layoutManager.step();
            this.layoutStepCount++;
        }

        this.statsManager.graphStep.endMonitoring();
    }

    /**
     * Update all nodes and calculate bounding box
     * @returns Object containing minimum and maximum bounding box vectors
     */
    private updateNodes(): { boundingBoxMin?: Vector3; boundingBoxMax?: Vector3 } {
        let boundingBoxMin: Vector3 | undefined;
        let boundingBoxMax: Vector3 | undefined;

        this.statsManager.nodeUpdate.beginMonitoring();

        for (const node of this.layoutManager.nodes) {
            node.update();

            // The mesh position is already updated by node.update()

            // A node the visibility mask has taken off screen is still updated -- it keeps its
            // position so showing it again needs no layout -- but it must not stretch the
            // bounding box, or zooming to fit a filtered graph would frame what is hidden.
            if (node.getRenderState() !== "visible") {
                continue;
            }

            // Update bounding box
            const pos = node.mesh.getAbsolutePosition();
            const sz = node.size;

            if (!boundingBoxMin || !boundingBoxMax) {
                boundingBoxMin = pos.clone();
                boundingBoxMax = pos.clone();
            }

            this.updateBoundingBoxAxis(pos, boundingBoxMin, boundingBoxMax, sz, "x");
            this.updateBoundingBoxAxis(pos, boundingBoxMin, boundingBoxMax, sz, "y");
            this.updateBoundingBoxAxis(pos, boundingBoxMin, boundingBoxMax, sz, "z");

            // Include node label in bounding box
            if (node.label?.labelMesh) {
                this.expandBoundingBoxForLabel(node.label.labelMesh, boundingBoxMin, boundingBoxMax);
            }
        }

        this.statsManager.nodeUpdate.endMonitoring();

        return { boundingBoxMin, boundingBoxMax };
    }

    /**
     * Update bounding box for a single axis
     * @param pos - Position vector
     * @param min - Minimum bounds vector
     * @param max - Maximum bounds vector
     * @param size - Node size
     * @param axis - Axis to update (x, y, or z)
     */
    private updateBoundingBoxAxis(pos: Vector3, min: Vector3, max: Vector3, size: number, axis: "x" | "y" | "z"): void {
        const value = pos[axis];
        const halfSize = size / 2;

        min[axis] = Math.min(min[axis], value - halfSize);
        max[axis] = Math.max(max[axis], value + halfSize);
    }

    /**
     * Expand bounding box to include a label mesh
     * @param labelMesh - The label mesh to include
     * @param min - Minimum bounds vector
     * @param max - Maximum bounds vector
     */
    private expandBoundingBoxForLabel(labelMesh: Mesh, min: Vector3, max: Vector3): void {
        const labelBoundingInfo = labelMesh.getBoundingInfo();
        const labelMin = labelBoundingInfo.boundingBox.minimumWorld;
        const labelMax = labelBoundingInfo.boundingBox.maximumWorld;

        min.x = Math.min(min.x, labelMin.x);
        min.y = Math.min(min.y, labelMin.y);
        min.z = Math.min(min.z, labelMin.z);
        max.x = Math.max(max.x, labelMax.x);
        max.y = Math.max(max.y, labelMax.y);
        max.z = Math.max(max.z, labelMax.z);
    }

    /**
     * Update all edges and expand bounding box for edge labels
     * @param boundingBoxMin - Minimum bounds (optional)
     * @param boundingBoxMax - Maximum bounds (optional)
     */
    private updateEdges(boundingBoxMin?: Vector3, boundingBoxMax?: Vector3): void {
        this.statsManager.edgeUpdate.beginMonitoring();

        // Update rays for all edges (static method on Edge class)
        Edge.updateRays(this.graphContext);

        // Update individual edges
        for (const edge of this.layoutManager.edges) {
            edge.update();

            // Include edge labels in bounding box if we have one
            if (boundingBoxMin && boundingBoxMax && edge.isRenderVisible()) {
                // Edge label (at midpoint)
                if (edge.label?.labelMesh) {
                    this.expandBoundingBoxForLabel(edge.label.labelMesh, boundingBoxMin, boundingBoxMax);
                }

                // Arrow head text label
                if (edge.arrowHeadText?.labelMesh) {
                    this.expandBoundingBoxForLabel(edge.arrowHeadText.labelMesh, boundingBoxMin, boundingBoxMax);
                }

                // Arrow tail text label
                if (edge.arrowTailText?.labelMesh) {
                    this.expandBoundingBoxForLabel(edge.arrowTailText.labelMesh, boundingBoxMin, boundingBoxMax);
                }
            }
        }

        this.statsManager.edgeUpdate.endMonitoring();
    }

    /**
     * Handle zoom to fit logic
     * @param boundingBoxMin - Minimum bounds (optional)
     * @param boundingBoxMax - Maximum bounds (optional)
     */
    private handleZoomToFit(boundingBoxMin?: Vector3, boundingBoxMax?: Vector3): void {
        if (!this.needsZoomToFit) {
            return;
        }

        if (!boundingBoxMin || !boundingBoxMax) {
            return;
        }

        // Check if we should zoom:
        // 1. Wait for minimum steps on first zoom
        // 2. Zoom every N steps during layout (based on zoomStepInterval)
        // 3. Zoom when layout settles
        const isSettled = this.layoutManager.layoutEngine?.isSettled ?? false;
        const { zoomStepInterval } = this.graphContext.getStyles().config.behavior.layout;
        const shouldZoomPeriodically =
            this.layoutStepCount > 0 && this.layoutStepCount >= this.lastZoomStep + zoomStepInterval;
        const justSettled = isSettled && !this.wasSettled && this.layoutStepCount > 0;

        if (
            !this.hasZoomedToFit &&
            this.layoutManager.running &&
            this.layoutStepCount < this.minLayoutStepsBeforeZoom
        ) {
            // First zoom - wait for minimum steps
            return;
        } else if (!this.layoutManager.running && !this.hasZoomedToFit && this.layoutStepCount === 0) {
            // Layout not running and no steps taken - allow immediate zoom
        } else if (!shouldZoomPeriodically && !justSettled) {
            // Not time for periodic zoom and didn't just settle
            return;
        }

        // Update settled state for next frame
        this.wasSettled = isSettled;

        const size = boundingBoxMax.subtract(boundingBoxMin);

        if (size.length() > this.config.minBoundingBoxSize) {
            this.camera.zoomToBoundingBox(boundingBoxMin, boundingBoxMax);

            this.hasZoomedToFit = true;
            this.lastZoomStep = this.layoutStepCount;

            // Only clear needsZoomToFit if layout is settled
            if (isSettled) {
                this.needsZoomToFit = false;
            }

            // Emit zoom complete event
            this.eventManager.emitGraphEvent("zoom-to-fit-complete", {
                boundingBoxMin,
                boundingBoxMax,
            });
        }
    }

    /**
     * Update statistics
     */
    private updateStatistics(): void {
        this.statsManager.updateCounts(this.dataManager.nodeCache.size, this.dataManager.edgeCache.size);

        // Update mesh cache stats
        const meshCache = this.graphContext.getMeshCache();
        this.statsManager.updateCacheStats(meshCache.hits, meshCache.misses);
    }

    /**
     * Check if zoom to fit has been completed
     * @returns True if zoom to fit has completed at least once
     */
    get zoomToFitCompleted(): boolean {
        return this.hasZoomedToFit;
    }

    /**
     * Update configuration
     * @param config - Partial configuration to merge
     */
    updateConfig(config: Partial<UpdateManagerConfig>): void {
        Object.assign(this.config, config);
    }
}
