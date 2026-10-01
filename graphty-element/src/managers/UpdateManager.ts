import type { AbstractMesh, EffectLayer, Mesh, Nullable, Observer, Scene, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { CameraManager } from "../cameras/CameraManager";
import type { EdgeId, NodeId } from "../catalog/types";
import type { NodeIdType } from "../config/GraphBehavior";
import { Edge } from "../Edge";
import { SimulationLayoutEngine } from "../layout/SimulationLayoutEngine";
import type { Node, NodeRenderState } from "../Node";
import type { ElementMask } from "../session/scope/index";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";
import type { LayoutManager } from "./LayoutManager";
import type { StatsManager } from "./StatsManager";

/** The corners of a box in world space. */
interface FramingBox {
    min: Vector3;
    max: Vector3;
}

/**
 * The box the nodes alone occupy: every visible node, where it is in world space, out to its size.
 * This is what the 2D/3D view-mode switch frames. Zoom-to-fit frames {@link framingBox}, which
 * grows this one by the labels.
 *
 * NO MARGIN on top. A fixed one is paid by every graph, labelled or not, and on a small graph it is
 * most of the picture: one world unit on each side moved a two-node graph's camera from 6.0 to 8.6
 * units out. The cameras pad the fit themselves.
 * @param nodes - The nodes to frame; hidden ones are skipped.
 * @returns The corners, or undefined when no node is visible.
 */
export function nodeFramingBox(nodes: Iterable<Node>): FramingBox | undefined {
    let min: Vector3 | undefined;
    let max: Vector3 | undefined;

    for (const node of nodes) {
        // A node the visibility mask has taken off screen keeps its position, but must not
        // stretch the box, or zooming to fit a filtered graph would frame what is hidden.
        if (node.getRenderState() !== "visible") {
            continue;
        }

        // WHERE THE NODE IS NOW, not where it was drawn last time. Babylon only refreshes a world
        // position while it renders, and this runs BEFORE that render, so `getAbsolutePosition()`
        // alone would hand back the previous frame's value. Computed rather than read off
        // `mesh.position`, because a node mesh is parented to the "graph-root" transform an XR
        // gesture moves, rotates and scales.
        node.mesh.computeWorldMatrix(true);

        const pos = node.mesh.getAbsolutePosition();
        const half = node.size / 2;

        min ??= pos.clone().setAll(Infinity);
        max ??= pos.clone().setAll(-Infinity);

        for (const axis of ["x", "y", "z"] as const) {
            min[axis] = Math.min(min[axis], pos[axis] - half);
            max[axis] = Math.max(max[axis], pos[axis] + half);
        }
    }

    return min && max ? { min, max } : undefined;
}

/**
 * Grow a box to take in a label plane, wherever it is anchored.
 *
 * Measured from the plane's WORLD bounds rather than from its anchor, so a label above, below,
 * beside or offset from its node -- every `location` and `attachOffset` the label style allows,
 * in 2D and 3D -- counts for exactly the room it takes. Those bounds are only refreshed when the
 * plane's world matrix is computed, and a node label is parented to the node it annotates, so
 * without the forced compute the label would stretch the box to where it was drawn last frame
 * rather than to where its node has just moved.
 * @param box - The box to grow.
 * @param labelMesh - The plane, or nothing.
 */
function growForLabel(box: FramingBox, labelMesh: Mesh | null | undefined): void {
    if (!labelMesh) {
        return;
    }

    labelMesh.computeWorldMatrix(true);

    const { minimumWorld, maximumWorld } = labelMesh.getBoundingInfo().boundingBox;

    for (const axis of ["x", "y", "z"] as const) {
        box.min[axis] = Math.min(box.min[axis], minimumWorld[axis]);
        box.max[axis] = Math.max(box.max[axis], maximumWorld[axis]);
    }
}

/**
 * The box zoom-to-fit frames: {@link nodeFramingBox} grown by every label on a visible node and
 * every label and arrow caption on a visible edge, so no label is cut off by the edge of the
 * viewport. A label's size depends on its text and font, which is why framing runs on data loads
 * and layout changes and NOT on label edits: see `Graph`, which asks for a framing only from
 * those.
 * @param nodes - The nodes to frame; hidden ones and their labels are skipped.
 * @param edges - The edges whose labels to frame; hidden ones are skipped.
 * @returns The corners, or undefined when no node is visible.
 */
export function framingBox(nodes: Iterable<Node>, edges: Iterable<Edge>): FramingBox | undefined {
    const box = nodeFramingBox(nodes);

    if (!box) {
        return undefined;
    }

    for (const node of nodes) {
        if (node.getRenderState() === "visible") {
            growForLabel(box, node.label?.labelMesh);
        }
    }

    for (const edge of edges) {
        if (edge.isRenderVisible()) {
            growForLabel(box, edge.label?.labelMesh);
            growForLabel(box, edge.arrowHeadText?.labelMesh);
            growForLabel(box, edge.arrowTailText?.labelMesh);
        }
    }

    return box;
}

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

/** The frame a layout step stands for: one step per frame at 60 Hz. See `updateLayout`. */
const NOMINAL_FRAME_MS = 1000 / 60;

/**
 * The most step rounds one frame takes to catch up: a frame of 200 ms or more owes 12. Above it,
 * as after a hidden tab's first frame, the rest of the time is dropped rather than owed.
 */
const MAX_CATCH_UP_ROUNDS = 12;

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

    /**
     * An outstanding request to frame the graph on the next frame that can.
     *
     * Separate from {@link UpdateManager.needsZoomToFit}, which only says that auto-framing is
     * switched on, and separate from the periodic cadence below, which asks whether enough layout
     * steps have gone by. Somebody ASKING -- a fresh data load, a layout change, the element's own
     * re-frame once the layout has truly settled, or a consumer calling `zoomToFit()` -- is not a
     * question about cadence, and answering it with the cadence's rules made every request that
     * arrived after the layout stopped silently do nothing.
     */
    private forceZoomToFit = false;
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
     * Whether the state the most recent update pass left behind is a finished picture: the layout
     * has stopped, no framing is outstanding that could still move the camera, no style work is
     * queued, and every drawn mesh has its shader. It says nothing about what is on screen -- a
     * pass computes the state, a render draws it -- which is why
     * {@link UpdateManager.frameIsStable} is a different flag.
     */
    private stateIsFinished = false;

    /**
     * Whether the frame most recently DRAWN drew that finished picture.
     *
     * This is the one a consumer waits on. It goes true only when a `scene.render()` completed
     * while the state was finished, so "the layout converged" and "the camera was framed" and
     * "somebody actually painted it" are all behind it.
     */
    private drawnFrameIsFinished = false;

    /**
     * Whether the outstanding framing request has nothing it could frame.
     *
     * A request survives a pass that finds no visible nodes, on purpose -- it waits for nodes to
     * appear rather than being spent on an empty graph. Without this flag that patient request
     * would read as "the camera is about to move", and an empty graph would never be reported
     * finished at all.
     */
    private framingHasNothingToFrame = false;

    /** Watches the scene for a frame being drawn, so a finished state can be promoted. */
    private drawWatcher: Nullable<Observer<Scene>>;

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

        // A picture is only final once it has been DRAWN in its final state, and the scene is the
        // only thing that knows a draw finished. Watching the scene -- rather than counting update
        // passes -- is what keeps the flag honest when frames are pumped by hand: `stepFrames`
        // draws nothing and promotes nothing, `renderFrames` draws and promotes.
        this.drawWatcher = this.graphContext.getScene().onAfterRenderObservable.add(() => {
            this.noteFrameDrawn();
        });
    }

    /**
     * Follows the graph onto the scene and camera of the renderer chosen at init, which replace
     * the ones this manager was built with. The old scene is disposed, and its watcher with it.
     * @param camera - The new scene's camera manager.
     */
    rebindScene(camera: CameraManager): void {
        this.camera = camera;
        this.drawWatcher = this.graphContext.getScene().onAfterRenderObservable.add(() => {
            this.noteFrameDrawn();
        });
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
        if (this.drawWatcher) {
            this.graphContext.getScene().onAfterRenderObservable.remove(this.drawWatcher);
        }
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

        // A mask has just hidden or revealed something, so the cached list of what is drawn is
        // out of date. See `settleActiveMeshFreeze`.
        this.sceneChanged = true;

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
            let revealed = false;

            for (const edge of this.dataManager.edges.values()) {
                const { index } = edge;
                // `!placed` now means only "this edge is mid-teardown", which is a state lasting
                // less than one statement. It used to mean "this edge outlived the node it was
                // attached to", and forcing those visible is what made a removed node's edges
                // permanently on screen with no filter able to reach them -- removing a node now
                // removes them instead.
                const placed = index !== INVALID_INDEX;

                const visible = edgeVisibility === null || !placed || edgeVisibility.has(index);

                if (edge.setRenderVisible(visible) && visible) {
                    revealed = true;
                }

                edge.setSelected(edgeSelection !== null && placed && edgeSelection.has(index));
            }

            // A REVEALED EDGE IS PLACED BY ITS NEXT UPDATE, not by being shown: hiding collapsed
            // its line slot and its caps, and showing only invalidates its endpoint cache. Nothing
            // moved, so without this the walk is skipped and the edge stays collapsed -- a filter
            // undone drew its edges as gone.
            if (revealed) {
                this.forceEdgeWalk();
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
     * An element whose paint has not changed still costs nothing: `Node.applySessionPaint` and
     * `Edge.applySessionPaint` compare the source mesh they are handed with the one already on
     * screen and rebuild only when it differs, so a colour change on a node is one buffer write
     * and no geometry at all.
     */
    syncStyles(): void {
        const painter = this.graphContext.getStylePainter?.();

        // NOT WHILE A PASS IS PAINTING. A pass yields to the event loop part way through, and
        // until it announces, the columns it is rewriting and the mesh keys it has not interned
        // yet disagree: an element read now is handed a key from before the pass and a style from
        // the middle of it. The mesh built from that pair is cached under the key, and the pass's
        // own announcement then finds the key unchanged and rebuilds nothing -- so a cap stayed
        // opaque, and a node drew another node's shape, for good (issue #440). What is pending
        // stays pending, and the frame after the pass announces draws all of it.
        if (painter === undefined || !painter.hasPending || painter.isPainting) {
            return;
        }

        // A repaint can change a node's SIZE, which moves where its edges have to stop without
        // moving the node at all, and it can change an edge's own appearance. Either way the
        // next frame has to visit every edge, whatever the node positions say.
        this.forceEdgeWalk();

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

        // Every element the pass moved has now left its old source mesh, so a mesh this left
        // with no instances is a look nothing on screen has any more.
        this.graphContext.getMeshCache().prune();
    }

    /**
     * Frame the whole graph on the next frame that has something to measure.
     *
     * The request is HONOURED rather than merely permitted. Everything below this line paces the
     * periodic re-framing that follows a moving layout around, and that pacing answers "no" to
     * every frame once the layout has stopped -- so routing an explicit request through it made
     * `Graph.zoomToFit()` silent from the first settlement onwards, and made the element's own
     * "re-frame now that the layout has truly settled" call dead on arrival.
     */
    enableZoomToFit(): void {
        this.needsZoomToFit = true;
        this.forceZoomToFit = true;
        // Whatever an earlier pass found to frame, this request has not been answered yet.
        this.framingHasNothingToFrame = false;
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
        // An outstanding request goes with it, so switching auto-framing back on later does not
        // spend a re-frame somebody asked for before it was switched off.
        this.forceZoomToFit = false;
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
     * Run a number of MODEL-UPDATE passes, drawing nothing.
     *
     * One pass is the half of a frame that happens before the picture: it steps the layout, moves
     * the meshes, applies queued style work and may re-frame the camera. It never puts a pixel on
     * screen, because that is `scene.render()` and this method does not call it. Use it when what
     * is being checked is the MODEL -- a mesh's material, a node's position, whether a framing
     * happened -- and use {@link UpdateManager.renderFrames} when a picture is needed.
     *
     * It was called `renderFixedFrames`, and every caller that read the name and wanted a picture
     * got layout steps and no frames instead.
     * @param count - How many update passes to run.
     */
    stepFrames(count: number): void {
        for (let i = 0; i < count; i++) {
            this.update();
        }
    }

    /**
     * Update AND draw a number of frames, the way the render loop does.
     *
     * The render loop is one update pass followed by one `scene.render()`, so this is that pair
     * repeated: after it returns, what is on the canvas is what the model says, and a frame drawn
     * while the picture was finished has been counted as such by
     * {@link UpdateManager.frameIsStable}.
     * @param count - How many frames to update and draw.
     */
    renderFrames(count: number): void {
        const scene = this.graphContext.getScene();

        for (let i = 0; i < count; i++) {
            this.update();
            scene.render();
        }
    }

    /**
     * Whether the picture on screen is the finished one.
     *
     * True only when the layout has converged, no framing is outstanding that could still move
     * the camera, no style work is queued, every drawn mesh has its shader, AND a frame has been
     * drawn since all of that became true. It is the difference between `graph-settled`, which fires the instant the LAYOUT
     * stops and one pass before the final framing is even requested, and a picture that will not
     * change again.
     *
     * It says nothing about a reader: somebody dragging the camera or a node changes the picture,
     * and the element does not call that instability.
     * @returns True when the last drawn frame drew the finished picture.
     */
    get frameIsStable(): boolean {
        // Asked of the state NOW as well as of the last pass: a style edit resolves with its
        // paint queued for the next pass, and until that pass runs the last frame drawn is the
        // picture from before the edit.
        return this.drawnFrameIsFinished && this.pictureIsFinished();
    }

    /**
     * Say that meshes were built outside a pass that moves anything, so the finished picture has
     * to be earned again.
     *
     * A new mesh can bring a shader variant nothing has compiled, or a texture still loading, and
     * a frame skips a mesh that is not ready. Most doors that build meshes also move something -- a
     * load starts the layout, a forward dimension change frames the camera -- and that clears the
     * finished flags on the next pass. An undo of a dimension change moves nothing, because the
     * layout stays at rest and the camera is the reader's; nor does a skybox. Without this the
     * last finished frame would still be called final while the new meshes are drawn as nothing:
     * an empty canvas after undoing 2D to 3D, and the old background after setting a skybox.
     */
    meshesAdded(): void {
        this.stateIsFinished = false;
        this.drawnFrameIsFinished = false;
    }

    /**
     * What is still keeping the picture from being final, in a consumer's words.
     *
     * Written for the message a timed-out wait carries, because "the frame never settled" on its
     * own sends the reader to a debugger.
     * @returns One phrase naming the thing that is still moving.
     */
    whyFrameIsNotStable(): string {
        if (this.layoutIsMoving()) {
            return "the layout is still running";
        }

        const painter = this.graphContext.getStylePainter?.();

        if (painter?.hasPending === true) {
            return "a style repaint is still queued";
        }

        if (painter?.isPainting === true) {
            return "a style repaint is still painting";
        }

        if (this.willZoomToFit() && !this.framingHasNothingToFrame) {
            return "the camera has not finished framing the graph";
        }

        if (!this.everyDrawnMeshIsReady()) {
            return "a mesh is still waiting for its shader";
        }

        if (!this.drawnFrameIsFinished) {
            return "nothing has drawn a frame since the graph stopped moving";
        }

        return "the picture is final";
    }

    /**
     * Whether the layout can still move anything on screen.
     *
     * A layout is built running whether or not the graph has nodes, and the frame loop stops it
     * only once it settles over a graph that HAS nodes -- an empty graph has nothing to settle and
     * announces nothing. So on an element nobody has loaded data into, `running` stays true for
     * good. That is not a moving picture: a layout with no nodes moves nothing, and an empty graph
     * is a finished one.
     * @returns True when the layout is running over at least one node.
     */
    private layoutIsMoving(): boolean {
        return this.layoutManager.running && this.dataManager.nodes.size > 0;
    }

    /**
     * Whether the state this pass leaves behind is a picture that will not change again.
     * @returns True when nothing the element drives is still going to move.
     */
    private pictureIsFinished(): boolean {
        if (this.layoutIsMoving()) {
            return false;
        }

        const painter = this.graphContext.getStylePainter?.();

        // Paint that has arrived and not been drawn, and paint that has not arrived yet: either
        // one changes the picture. See `willZoomToFit` for the second.
        if (painter?.hasPending === true || painter?.isPainting === true) {
            return false;
        }

        // An outstanding framing request only means the camera is about to move if there is
        // something for it to frame; see `framingHasNothingToFrame`.
        if (this.willZoomToFit() && !this.framingHasNothingToFrame) {
            return false;
        }

        // Walked only until a finished frame has been drawn, not on every idle frame: the walk is
        // one readiness question per mesh, and what brings a new shader variant -- a repaint, a
        // load, a layout -- clears that flag on its way in.
        return this.drawnFrameIsFinished || this.everyDrawnMeshIsReady();
    }

    /**
     * Whether every mesh the scene draws has the shader it is drawn with.
     *
     * A frame SKIPS a mesh whose shader is not ready, silently: no error, and nothing in the
     * scene graph says so. Babylon fetches a StandardMaterial's shader source with a dynamic
     * `import()` the first time a material needs a variant, and every node and every label is
     * drawn through one -- so until that import lands, a frame can hold the edges and nothing
     * else. When the module server was slow (the pre-push gate, where it shares a process with
     * the unit tests) the layout, the framing and the style pass all finished first, and a frame
     * with no nodes and no labels in it was called final. Asking the mesh also starts its compile.
     *
     * The same holds one level up for an effect layer -- the glow and the outline. A layer has a
     * render target, blur passes and a merge, each fetching its shader the same way, and until
     * they arrive the layer composes nothing: the node is drawn without its glow.
     *
     * Asked last and only once everything cheaper is finished. An instance is drawn with its
     * source's shader, so it is answered by the source rather than one by one.
     * @returns True when no drawn mesh and no drawn effect is waiting for a shader.
     */
    private everyDrawnMeshIsReady(): boolean {
        const scene = this.graphContext.getScene();
        const layers = scene.effectLayers.filter((layer) => layer.shouldRender());

        if (layers.some((layer) => !layer.isLayerReady())) {
            return false;
        }

        for (const mesh of scene.meshes) {
            if (mesh.getClassName() === "InstancedMesh" || !mesh.isEnabled()) {
                continue;
            }

            const instanced = (mesh as Mesh).instances.length > 0;

            if (!mesh.isVisible && !instanced) {
                continue;
            }

            if (!(mesh as Mesh).isReady(true, instanced)) {
                return false;
            }

            for (const layer of layers) {
                if (layer.hasMesh(mesh) && !UpdateManager.layerIsReadyFor(layer, mesh, instanced)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Whether an effect layer has the shader it draws one mesh into its own target with.
     *
     * Asked under the layer's render pass, because that is where the layer keeps the mesh's
     * shader -- which is what Babylon's own readiness check does before asking the same thing.
     * @param layer - The layer drawing the mesh.
     * @param mesh - The mesh.
     * @param instanced - Whether the mesh is drawn through instances.
     * @returns True when every part of the mesh is ready to be drawn into the layer.
     */
    private static layerIsReadyFor(layer: EffectLayer, mesh: AbstractMesh, instanced: boolean): boolean {
        const engine = mesh.getEngine();
        const pass = engine.currentRenderPassId;

        engine.currentRenderPassId = layer.mainTexture.renderPassId;

        try {
            return mesh.subMeshes.every((subMesh) => layer.isReady(subMesh, instanced));
        } finally {
            engine.currentRenderPassId = pass;
        }
    }

    /**
     * Called once per frame the scene actually drew.
     *
     * Promotes a finished state into a finished PICTURE, and announces it once per settlement so
     * a consumer can wait for the frame rather than for the layout.
     */
    private noteFrameDrawn(): void {
        if (!this.stateIsFinished || this.drawnFrameIsFinished) {
            return;
        }

        this.drawnFrameIsFinished = true;
        this.eventManager.emitGraphEvent("graph-frame-stable", { frames: this.frameCount });
    }

    /**
     * Main update method - called by RenderManager each frame
     */
    private frameCount = 0;

    /**
     * Update the graph for the current frame.
     *
     * The pass itself is the private `runUpdatePass()`; what is added here is the one
     * question a consumer cares about and the pass has several exits from -- whether the state it
     * leaves behind is a finished picture.
     * @param frameMs - How long the previous frame took. A running layout keeps to one step per
     *     nominal 60 Hz frame of that time, so it settles in the same seconds however slowly the
     *     frames are drawn. Omitted or 0 -- every hand-pumped pass -- it takes one step.
     */
    update(frameMs = 0): void {
        // Work waiting for this pass -- a style edit's paint, a layout, a framing -- changes what
        // the next frame draws, so it has to be announced again once that frame is drawn.
        if (!this.pictureIsFinished()) {
            this.drawnFrameIsFinished = false;
        }

        this.runUpdatePass(frameMs);

        // AFTER the pass and BEFORE the frame is drawn, so a change this pass made is drawn on
        // this frame rather than on the next one.
        this.settleActiveMeshFreeze();

        this.stateIsFinished = this.pictureIsFinished();

        if (!this.stateIsFinished) {
            // Something is moving again, so whatever was drawn before is no longer the last word.
            this.drawnFrameIsFinished = false;
        }
    }

    /**
     * One pass of the update loop: masks, styles, camera, layout, meshes and framing.
     * @param frameMs - How long the previous frame took; see {@link UpdateManager.update}.
     */
    private runUpdatePass(frameMs: number): void {
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
            if (this.willZoomToFit()) {
                this.updateNodes();
                this.updateEdges();

                // Handle zoom to fit
                this.applyZoomToFit(this.measure());

                // Update statistics
                this.updateStatistics();
            }

            return;
        }

        // Update layout engine (step the force-directed algorithm)
        this.updateLayout(frameMs);

        // ASKED BEFORE THE GRAPH IS MEASURED, because the answer decides how the measurement is
        // taken: reading a node's world position as of THIS instant costs a forced matrix per node
        // and per label, and there is no reason to pay it on a frame whose box nothing reads.
        // Asked ONCE, and carried, so the frame that measured is the frame that frames.
        const framing = this.willZoomToFit();

        // Update nodes and edges
        this.updateNodes();
        this.updateEdges();

        // Handle zoom to fit if needed
        if (framing) {
            this.applyZoomToFit(this.measure());
        }

        // Update statistics
        this.updateStatistics();
    }

    /**
     * Update the layout engine
     *
     * `minDelta` is the settle threshold: once one round of stepping (`stepMultiplier` steps, one
     * nominal frame's worth) moves every node less than that, the layout has arrived and is
     * stopped. It is measured per ROUND, not per drawn frame, so a slow frame that catches up
     * several rounds stops at the same step a fast one would. Zero -- the default -- switches the
     * threshold off and lets the engine decide for itself, which is what every graph did before,
     * because `minDelta` was published, documented as pacing the layout, set by eight test files,
     * and read by nothing at all.
     *
     * MEASURED FROM THE ENGINE rather than from the meshes, because the meshes are moved later in
     * the same frame and would lag the measurement by one. Paid only when a threshold is set: at
     * zero this reads no positions and allocates nothing.
     *
     * PACED BY TIME, NOT BY FRAMES. A layout converges after a fixed number of steps, and one step
     * a frame made the time to settle that count times the cost of a frame -- which is dominated
     * by moving the meshes and trimming every edge at its nodes, not by the step. The graphty
     * app's college-football sample settles after 162 steps: under 3 s at 60 Hz, over 30 s on a
     * software-rendered runner drawing a frame every 190 ms. So a slow frame takes the steps the
     * frames it stood in for would have taken, `frameMs` / 16.7 of them, and moves the meshes once.
     * The steps and where the layout ends are the same; only the number of drawn frames changes.
     *
     * Bounded twice, so a frame that is slow BECAUSE of stepping cannot feed itself: never more
     * than {@link MAX_CATCH_UP_ROUNDS} rounds, and no extra round once stepping has used half of
     * `frameMs`. A simulation layout keeps its one batch a frame (see below).
     * @param frameMs - How long the previous frame took; 0 takes one round.
     */
    private updateLayout(frameMs: number): void {
        this.statsManager.step();
        this.statsManager.graphStep.beginMonitoring();

        const { stepMultiplier, minDelta } = this.graphContext.getStyles().config.behavior.layout;

        if (this.layoutManager.layoutEngine instanceof SimulationLayoutEngine) {
            // ONE batch per frame. The simulation computes `iterationsPerStep` iterations inside
            // it, so this is the same amount of work the loop below does on the CPU -- and on an
            // accelerator it is the one shape that lets the device coalesce rather than queue.
            const before = minDelta > 0 ? this.enginePositions() : null;
            this.layoutManager.stepBatch();
            this.layoutStepCount++;

            if (before !== null && this.largestMove(before) < minDelta) {
                this.layoutManager.running = false;
            }
        } else {
            const rounds = Math.min(MAX_CATCH_UP_ROUNDS, Math.max(1, Math.floor(frameMs / NOMINAL_FRAME_MS)));
            const started = rounds > 1 ? performance.now() : 0;

            for (let round = 0; round < rounds; round++) {
                // A settled engine has nothing left to catch up on.
                const engine = this.layoutManager.layoutEngine;
                if (round > 0 && (!engine || engine.isSettled || performance.now() - started > frameMs / 2)) {
                    break;
                }

                const before = minDelta > 0 ? this.enginePositions() : null;

                for (let i = 0; i < stepMultiplier; i++) {
                    this.layoutManager.step();
                    this.layoutStepCount++;
                }

                if (before !== null && this.largestMove(before) < minDelta) {
                    this.layoutManager.running = false;
                    break;
                }
            }
        }

        this.statsManager.graphStep.endMonitoring();
    }

    /**
     * Where the layout engine currently has every node.
     * @returns One position per node, by node id.
     */
    private enginePositions(): Map<NodeIdType, { x: number; y: number; z: number }> {
        const engine = this.layoutManager.layoutEngine;
        const positions = new Map<NodeIdType, { x: number; y: number; z: number }>();

        if (!engine) {
            return positions;
        }

        for (const node of this.layoutManager.nodes) {
            const at = engine.getNodePosition(node);

            if (at) {
                positions.set(node.id, { x: at.x, y: at.y, z: at.z ?? 0 });
            }
        }

        return positions;
    }

    /**
     * How far the node that moved most has moved since the positions were taken.
     * @param before - The positions to measure against.
     * @returns The largest distance, or Infinity when there is nothing to compare -- a graph with
     *     no placed nodes has not settled, it has not started.
     */
    private largestMove(before: Map<NodeIdType, { x: number; y: number; z: number }>): number {
        const now = this.enginePositions();

        if (before.size === 0 || now.size === 0) {
            return Number.POSITIVE_INFINITY;
        }

        let largest = 0;

        for (const [id, at] of now) {
            const was = before.get(id);

            // A node that has only just arrived has no "before", and a graph that gained a node
            // this frame has certainly not settled.
            if (!was) {
                return Number.POSITIVE_INFINITY;
            }

            const dx = at.x - was.x;
            const dy = at.y - was.y;
            const dz = at.z - was.z;
            largest = Math.max(largest, Math.sqrt(dx * dx + dy * dy + dz * dz));
        }

        return largest;
    }

    /**
     * Move every node and edge to where the position array has it now, without stepping the
     * layout: how a restored arrangement reaches the picture while the layout is at rest.
     * @param moved - Whether any coordinate was written; when none was, the nodes are placed and
     *     the edges, whose endpoints are where they were, are left as they are drawn.
     */
    redrawArrangement(moved = true): void {
        this.updateNodes();
        if (moved) {
            this.updateEdges();
        }
    }

    /**
     * Update all nodes.
     */
    private updateNodes(): void {
        this.statsManager.nodeUpdate.beginMonitoring();

        for (const node of this.layoutManager.nodes) {
            // The mesh position is updated by node.update()
            node.update();
        }

        this.statsManager.nodeUpdate.endMonitoring();
    }

    /**
     * Measure the graph the camera is about to be framed on. Taken AFTER the nodes and edges have
     * updated, so the labels are where this frame's positions put them.
     * @returns The box, or undefined when nothing is visible.
     */
    private measure(): FramingBox | undefined {
        return framingBox(this.layoutManager.nodes, this.layoutManager.edges);
    }

    /**
     * Update all edges.
     */
    /** Set when something other than a node position means every edge has to be visited. */
    private edgeWalkForced = true;

    /** How many edges the last walk saw, so an added or removed one forces the next. */
    private lastWalkedEdgeCount = -1;

    /** Where each node's mesh sat at the last edge walk, as x, y, z per node index. */
    private lastNodePositions = new Float64Array(0);

    /** Set by anything in this frame that changed what is drawn. See `settleActiveMeshFreeze`. */
    private sceneChanged = true;

    /** Whether Babylon is currently drawing from a cached list of what is visible. */
    private activeMeshesFrozen = false;

    /** The camera's view and projection stamps at the last frame, or null before the first. */
    private lastCameraState: readonly number[] | null = null;

    /** How many meshes the scene held last frame, so one appearing or going unfreezes it. */
    private lastMeshCount = -1;

    private updateEdges(): void {
        this.statsManager.edgeUpdate.beginMonitoring();

        if (this.edgesNeedWalking()) {
            // Each edge aims its own ray, inside the branch that fires it, so an edge that has not
            // moved costs nothing here. A pass over the whole graph used to aim all of them first.
            for (const edge of this.layoutManager.edges) {
                edge.update();
            }
        }

        this.statsManager.edgeUpdate.endMonitoring();
    }

    /**
     * Whether this frame has to visit every edge at all.
     *
     * WHY THIS EXISTS. An edge that has not moved decides so in a few field reads, but the graph
     * is walked whether or not anything moved, and at the declared ceiling that walk is a million
     * edges: measured at 207 ms a frame on a graph standing perfectly still, against 41 ms for
     * everything Babylon does to draw it. The walk is the cost, not the decision inside it, so the
     * only fix is not to walk.
     *
     * WHY IT ASKS THE NODES RATHER THAN BEING TOLD. A flag set wherever something moves cannot be
     * trusted: a node's position is written by the layout, by a drag (which Babylon's own drag
     * behaviour writes straight onto the mesh, through no method of ours), by the two-dimensional
     * mode switch, and by a restore. Missing one of those would leave edges hanging in mid-air
     * with nothing in a test to catch which writer was forgotten. Reading the positions cannot
     * miss a writer, and it is a walk of the NODES -- a hundred thousand where the edges are a
     * million, and ten edges per node is the shape of every graph this is about.
     * @returns True when at least one endpoint may have moved, or the graph itself has changed.
     */
    private edgesNeedWalking(): boolean {
        if (this.edgeWalkForced) {
            this.edgeWalkForced = false;
            this.lastWalkedEdgeCount = -1;
            this.sceneChanged = true;

            return true;
        }

        // An edge added or removed since the last walk has never been placed, or has left a
        // neighbour's slot behind. Read off the array's own length -- COUNTING BY ITERATING would
        // be the million-edge walk this method exists to avoid. A layout engine that hands back
        // something that is not an array cannot be counted cheaply, so it always walks.
        const { edges } = this.layoutManager;
        const edgeCount = Array.isArray(edges) ? edges.length : -1;

        if (edgeCount < 0 || edgeCount !== this.lastWalkedEdgeCount) {
            this.lastWalkedEdgeCount = edgeCount;
            this.sceneChanged = true;

            return true;
        }

        if (this.anyNodeMoved()) {
            this.sceneChanged = true;

            return true;
        }

        return false;
    }

    /**
     * Whether any node's mesh sits somewhere other than where it sat at the last edge walk.
     *
     * The positions are kept in one typed array rather than a vector per node, so the scan is a
     * linear read of three floats against three floats and allocates nothing. A node whose index
     * is past the end of the array has never been seen, which counts as moved and grows the array.
     * @returns True when at least one node has moved.
     */
    private anyNodeMoved(): boolean {
        let moved = false;
        let highest = -1;

        for (const node of this.layoutManager.nodes) {
            const { index } = node;

            if (index === INVALID_INDEX) {
                moved = true;
                continue;
            }

            if (index > highest) {
                highest = index;
            }

            const at = index * 3;

            if (at + 2 >= this.lastNodePositions.length) {
                moved = true;
                continue;
            }

            const { position } = node.mesh;

            if (
                this.lastNodePositions[at] !== position.x ||
                this.lastNodePositions[at + 1] !== position.y ||
                this.lastNodePositions[at + 2] !== position.z
            ) {
                moved = true;
            }
        }

        if (!moved) {
            return false;
        }

        if ((highest + 1) * 3 > this.lastNodePositions.length) {
            const grown = new Float64Array(Math.max((highest + 1) * 3, this.lastNodePositions.length * 2, 96));
            grown.set(this.lastNodePositions);
            this.lastNodePositions = grown;
        }

        for (const node of this.layoutManager.nodes) {
            const { index } = node;

            if (index === INVALID_INDEX) {
                continue;
            }

            const at = index * 3;
            const { position } = node.mesh;

            this.lastNodePositions[at] = position.x;
            this.lastNodePositions[at + 1] = position.y;
            this.lastNodePositions[at + 2] = position.z;
        }

        return true;
    }

    /**
     * Make the next frame visit every edge, whatever the nodes say.
     *
     * Called when something other than a position has changed what an edge should draw: a style
     * pass has repainted, or the dataset has been replaced. A repaint can change a node's SIZE,
     * which moves where its edges have to stop without moving the node at all.
     */
    forceEdgeWalk(): void {
        this.edgeWalkForced = true;
        this.sceneChanged = true;
    }

    /**
     * Freeze or unfreeze Babylon's list of what is drawn, according to whether this frame changed
     * anything.
     *
     * WHAT FREEZING BUYS. Unfrozen, Babylon walks every mesh in the scene each frame to decide
     * what is visible, and then copies and uploads a world matrix for every instance whether or
     * not it moved -- at a hundred thousand nodes that is a walk of a hundred thousand meshes and
     * 6.4 MB of matrices, measured at 44.7 ms and about 12 ms a frame on a graph that is standing
     * perfectly still. Frozen, both are skipped.
     *
     * WHAT IT COSTS IF IT IS WRONG. A frozen scene draws the list it cached: a node that moves
     * appears stuck, one that is hidden stays on screen, one that is added never appears, and one
     * that the camera turns towards is missing because it was culled when the list was taken. So
     * everything that can change any of those has to say so, and this method trusts nothing it was
     * not told -- except movement, which it reads off the nodes themselves in `anyNodeMoved`, and
     * the camera, which it reads here. The frame is drawn AFTER this runs, so an unfreeze decided
     * here takes effect on the same frame that needed it.
     */
    private settleActiveMeshFreeze(): void {
        const scene = this.graphContext.getScene();

        // A MESH THAT APPEARED IS A CHANGE NOBODY TELLS US ABOUT. A tooltip, a label, a highlight
        // and an effect are all built on demand, by code that has no idea this manager exists, and
        // a frozen scene draws the list it cached -- so the new mesh is simply absent, or is drawn
        // in the wrong order because the cached render groups were sorted without it. That is not
        // hypothetical: it took `test/browser/label-drawn-over-edges.test.ts` red, with an edge
        // drawn over the tooltip it is meant to sit behind. Counting the scene's meshes is one
        // integer a frame and cannot miss one being made or disposed.
        const meshCount = scene.meshes.length;
        const structureChanged = meshCount !== this.lastMeshCount;

        this.lastMeshCount = meshCount;

        const changed = this.sceneChanged || structureChanged || this.cameraMoved();

        this.sceneChanged = false;

        if (changed) {
            if (this.activeMeshesFrozen) {
                scene.unfreezeActiveMeshes();
                this.activeMeshesFrozen = false;
            }

            return;
        }

        if (!this.activeMeshesFrozen) {
            scene.freezeActiveMeshes();
            this.activeMeshesFrozen = true;
        }
    }

    /**
     * Whether the camera is looking at something other than what it looked at last frame.
     *
     * Read rather than signalled, because a camera is moved by a reader's mouse, by an animation,
     * by zoom-to-fit and by the XR rig, and a frozen scene keeps whatever was inside the frustum
     * when it froze. Six numbers cover the orbit camera the element uses and the free cameras.
     * @returns True when the view has changed.
     */
    private cameraMoved(): boolean {
        const camera = this.graphContext.getScene().activeCamera;

        if (!camera) {
            return true;
        }

        // ASKED OF THE MATRICES, NOT OF THE CAMERA'S FIELDS. Which fields describe a camera
        // depends on which camera it is -- an arc-rotate camera has an angle, a radius and a
        // target, a universal camera has a position and a rotation -- and the element uses more
        // than one. Reading the wrong fields does not fail loudly: it reports a still camera
        // while the reader is orbiting, and a frozen scene then draws the list it cached. Babylon
        // stamps every matrix with an `updateFlag` that increments whenever it is rebuilt, so two
        // integers answer for every camera there is, and for a zoom as well as a turn.
        const view = camera.getViewMatrix().updateFlag;
        const projection = camera.getProjectionMatrix().updateFlag;
        const before = this.lastCameraState;

        this.lastCameraState = [view, projection];

        return before === null || before[0] !== view || before[1] !== projection;
    }

    /**
     * Whether the camera is going to be framed on the graph this frame.
     *
     * Asked twice per frame -- once before the graph is measured, to decide whether to take the
     * measurement at all and whether to take it from freshly computed world matrices, and once
     * when the framing is applied -- so it reads state and changes none.
     * @returns True when this frame will re-frame the camera, given a box to frame.
     */
    private willZoomToFit(): boolean {
        if (!this.needsZoomToFit) {
            return false;
        }

        // Somebody asked. See `enableZoomToFit`: the cadence below paces the element's own
        // periodic re-framing and has no opinion worth having about a request.
        //
        // But not while a style pass is on its way. A request is answered ONCE, and a pass can
        // change a node's size -- the box being framed. A graph loaded with its algorithms asks
        // for its final framing on the pass after the layout settles, while the run's own size
        // layer may still be painting; answered then, the camera frames every node at its
        // unstyled size, the sizes land a few frames later, and nothing frames them. Whether the
        // pass had finished first depended on how fast the machine was, so the same story drew
        // two pictures. The pass is waited for here, and `syncStyles` applies what it painted at
        // the top of the pass that then frames it.
        if (this.forceZoomToFit) {
            return !this.styleIsPainting();
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
            return false;
        }

        if (!this.layoutManager.running && !this.hasZoomedToFit && this.layoutStepCount === 0) {
            // Layout not running and no steps taken - allow immediate zoom
            return true;
        }

        // Otherwise only on the periodic beat, or on the step the layout arrived on
        return shouldZoomPeriodically || justSettled;
    }

    /**
     * Whether a style pass has been asked for and has not announced what it painted yet.
     * @returns True while the session's style stack is painting.
     */
    private styleIsPainting(): boolean {
        return this.graphContext.getStylePainter?.()?.isPainting === true;
    }

    /**
     * Frame the camera on a box {@link UpdateManager.willZoomToFit} has already approved.
     * @param box - The box to frame, or undefined when there is nothing to frame.
     */
    private applyZoomToFit(box: FramingBox | undefined): void {
        if (!box) {
            // Nothing to frame yet, so an outstanding request keeps waiting rather than being
            // spent on a graph with no visible nodes in it. It is still waiting for nodes and not
            // for the camera, which is what stops an empty graph reading as a moving one.
            this.framingHasNothingToFrame = true;
            return;
        }

        const isSettled = this.layoutManager.layoutEngine?.isSettled ?? false;

        // Update settled state for next frame
        this.wasSettled = isSettled;

        const { min: boundingBoxMin, max: boundingBoxMax } = box;
        const size = boundingBoxMax.subtract(boundingBoxMin);

        if (size.length() <= this.config.minBoundingBoxSize) {
            // A box too small to frame is the empty-graph case again: the request stays, and it is
            // waiting for a graph rather than for the camera.
            this.framingHasNothingToFrame = true;
            return;
        }

        this.camera.zoomToBoundingBox(boundingBoxMin, boundingBoxMax);

        this.hasZoomedToFit = true;
        this.forceZoomToFit = false;
        this.framingHasNothingToFrame = false;
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

    /**
     * Update statistics
     */
    private updateStatistics(): void {
        // What the store holds, so the stats panel and `statistics()` give one number.
        const { nodes, edges } = this.dataManager.heldCounts();
        this.statsManager.updateCounts(nodes, edges);

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
