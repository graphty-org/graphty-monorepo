import {
    type AbstractEngine,
    type AbstractMesh,
    Camera,
    type EffectLayer,
    Frustum,
    type Mesh,
    type Nullable,
    type Observer,
    Quaternion,
    type Scene,
    type TransformNode,
    Vector3,
} from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { CameraManager } from "../cameras/CameraManager";
import { type FramingSpot, OrbitCameraController } from "../cameras/OrbitCameraController";
import type { EdgeId, NodeId } from "../catalog/types";
import type { NodeIdType } from "../config/GraphBehavior";
import { Edge } from "../Edge";
import { mapDepth, screenNodeScale } from "../layout/locationMap/nodeScale";
import type { LocationMapFrame } from "../layout/locationMap/place";
import { SimulationLayoutEngine } from "../layout/SimulationLayoutEngine";
import { EdgeShaderDrawing } from "../meshes/EdgeShaderDrawing";
import { disposeLabelsTogether } from "../meshes/LabelBatch";
import { NodeShaderDrawing } from "../meshes/NodeShaderDrawing";
import { modelsFreeing, modelsLoading } from "../models/ModelCache";
import { texturesLoading } from "../models/TextureCache";
import { collectResizedNodes, type Node, nodeRebuildsFor, type NodeRenderState, releaseNodeMesh } from "../Node";
import type { ElementMask } from "../session/scope/index";
import { transitionsOf } from "../transitions/LayoutTransitionRunner";
import { mapCorners } from "./BasemapManager";
import { type DataManager, disposeReleased } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";
import type { LayoutManager } from "./LayoutManager";
import { attachPendingWork, PendingWork } from "./PendingWork";
import type { StatsManager } from "./StatsManager";
import type { NodePaint, StylePainter } from "./StylePainter";

/** How much room a framed globe leaves around itself, as a share of its radius: its air's glow. */
const GLOBE_FRAMING = 1.1;

/**
 * How a flat map in 3D is first seen: turned from straight on toward the south by 45 degrees, so
 * the camera looks north across the map and the edges' arcs rise above it.
 */
const FLAT_MAP_TILT = Quaternion.FromUnitVectorsToRef(
    new Vector3(0, 0, -1),
    new Vector3(0, -Math.SQRT1_2, -Math.SQRT1_2),
    new Quaternion(),
);

/** The corners of a box in world space, and what it holds. */
interface FramingBox {
    min: Vector3;
    max: Vector3;
    /** Every node (with half its size) and every label corner (half 0) inside the box. */
    spots: FramingSpot[];
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
    const spots: FramingSpot[] = [];

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
        // A spot is as wide as the node's widest half, so the turning fit keeps all of it in view.
        spots.push({ pos, half: Math.max(node.framingHalf("x"), node.framingHalf("y"), node.framingHalf("z")) });

        min ??= pos.clone().setAll(Infinity);
        max ??= pos.clone().setAll(-Infinity);

        for (const axis of ["x", "y", "z"] as const) {
            const half = node.framingHalf(axis);
            min[axis] = Math.min(min[axis], pos[axis] - half);
            max[axis] = Math.max(max[axis], pos[axis] + half);
        }
    }

    return min && max ? { min, max, spots } : undefined;
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

    const { minimumWorld, maximumWorld, vectorsWorld } = labelMesh.getBoundingInfo().boundingBox;
    for (const corner of vectorsWorld) {
        box.spots.push({ pos: corner, half: 0 });
    }

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
    /**
     * Whether `visibility` is drawing ghosts now (elements outside the time window kept on screen).
     * Read on every pass: switching it swaps which mask `visibility` answers with, so the next pass
     * walks everything rather than trusting a version from the other mask.
     * @returns True while ghosts are drawn.
     */
    readonly ghost?: () => boolean;
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

/**
 * The most time one frame spends on layout catch-up rounds, however slow the frame before it was.
 *
 * Half the previous frame was the only bound before, and it feeds itself on a slow CPU: a frame of
 * 1 s owes 12 rounds and may spend 500 ms on them, which keeps the next frame at 1 s. An iPad
 * running a 3,000 node force layout drew a frame a second that way. With an absolute budget the
 * page keeps drawing and answering input, and the layout takes longer in wall time to settle --
 * at the same step and in the same place, because whole rounds are only ever deferred.
 */
const LAYOUT_FRAME_BUDGET_MS = 40;

/**
 * How long one frame spends applying a repaint before it leaves the rest for the next frame.
 *
 * A finished run's layer repaints every node, and building and applying 3,214 nodes' paint took
 * one 450 ms frame at a 6x CPU throttle, the stand-in for an iPad. The session's style pass already
 * yields between slices; this is the renderer's half of the same rule. The picture is not final
 * (`graph-frame-stable` waits) until every batch is drawn.
 */
const STYLE_FRAME_BUDGET_MS = 16;

/** How many nodes are painted between two looks at the clock. */
const NODE_PAINT_BATCH = 128;

/** How many edges are painted between two looks at the clock. */
const EDGE_PAINT_BATCH = 1024;

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
    /** Whether this pass moved the camera towards the selection; see `followSelection`. */
    private followingSelection = false;
    /**
     * Whether `camera.autoRotate` turned the camera on the last pass. It keeps a graph drawn on
     * demand drawing, and nothing else: the picture is finished when the layout and the styles
     * are, however the camera moves, so `graph-frame-stable` is not held back by it.
     */
    autoTurning = false;
    /** The longest frame the auto-rotation turns for, so a tab coming back does not jump. */
    private static readonly MAX_TURN_MS = 100;
    private hasZoomedToFit = false;

    /**
     * Whether the session's derivation lane has a pass running or waiting: a change written to
     * project state that has not reached the picture yet. Its hooks are awaited one by one, the
     * graph and layout hooks before the styles hook asks for the repaint, so for frames on end a
     * style stack can be written while no style pass says it is painting. Set by the graph that
     * owns the lane; a context with no session has nothing on its way.
     * @returns True while a pass is running or waiting to run.
     */
    deriving: () => boolean = () => false;

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
    /** Whether the outstanding request came from a consumer's `zoomToFit()`, not the element. */
    private explicitZoomToFit = false;
    private readonly config: Required<UpdateManagerConfig>;
    private layoutStepCount = 0;
    private readonly minLayoutStepsBeforeZoom = 10;
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
    private appliedGhost = false;
    private appliedAnything = false;

    /** The node and edge sets (`DataManager.nodeVersion`, `edgeVersion`) the masks were applied to. */
    private appliedNodeSet = NO_MASK_VERSION;
    private appliedEdgeSet = NO_MASK_VERSION;

    /**
     * The nodes and edges the last pass drew as selected. A pass where only the selection moved
     * un-selects these and selects the mask's members, so its cost is the size of the two
     * selections rather than of the graph (issue #2899).
     */
    private drawnSelectedNodes = new Set<Node>();
    private drawnSelectedEdges = new Set<Edge>();

    /**
     * Whether the state the most recent update pass left behind is a finished picture: the layout
     * has stopped, no framing is outstanding that could still move the camera, no style work is
     * queued, and every drawn mesh has its shader. It says nothing about what is on screen -- a
     * pass computes the state, a render draws it -- which is why
     * {@link UpdateManager.frameIsStable} is a different flag.
     */
    private stateIsFinished = false;

    /**
     * The record of work that will still change the picture, and its picture counter (issue
     * #3546). Every source of such work is entered here, as a token or a watch; see PendingWork.
     */
    readonly pending = new PendingWork();

    /** The picture counter at the last frame drawn while nothing was pending; -1 before one. */
    private finishedEpoch = -1;

    /** How many meshes the scene held when {@link UpdateManager.finishedEpoch} was taken. */
    private finishedMeshCount = -1;

    /**
     * Whether the frame most recently DRAWN drew the finished picture: one was drawn while nothing
     * was pending, and nothing has changed the picture since (the counter has not moved).
     *
     * This is the one a consumer waits on, so "the layout converged" and "the camera was framed"
     * and "somebody actually painted it" are all behind it.
     * @returns True when the frame on screen was drawn at the current picture counter.
     */
    private get drawnFrameIsFinished(): boolean {
        // The mesh count as well as the counter: Babylon announces a new mesh a timer AFTER it is
        // built (`Scene.addMesh` defers `onNewMeshAddedObservable` with `setTimeout`), so a wait
        // asked for in that gap -- a tooltip the pointer just brought up -- found the counter
        // unmoved and resolved on the frame from before the mesh (issue #5139). A removal is
        // announced at once and moves the counter, so a count that only grew cannot be missed.
        return (
            this.finishedEpoch === this.pending.epoch &&
            this.finishedMeshCount === this.graphContext.getScene().meshes.length
        );
    }

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
    private drawWatcher: Nullable<Observer<Scene>> = null;
    private drawPhaseWatcher: Nullable<Observer<Scene>> = null;
    /**
     * Whether every drawn mesh had its shader when the frame now being drawn started drawing.
     *
     * Asked at the start of the draw, not after it: work done inside the frame before the draw --
     * a `node.texture` picture landing repaints its nodes with a fresh material from
     * `onBeforeRenderObservable` -- can hand a mesh a shader that is not compiled yet, so the
     * frame silently skips it, and by the time the frame has drawn the shader is ready and the
     * frame without the mesh would be called final (issue #4237).
     */
    private drewWithEveryShader = false;

    /** Watches the engine for a new canvas size; see {@link UpdateManager.viewMoved}. */
    private resizeWatcher: Nullable<Observer<AbstractEngine>> = null;

    /** Watch the scene for meshes built or taken down; see {@link UpdateManager.watchFrames}. */
    private meshAddedWatcher: Nullable<Observer<AbstractMesh>> = null;
    private meshRemovedWatcher: Nullable<Observer<AbstractMesh>> = null;

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
        private readonly eventManager: EventManager,
        private readonly statsManager: StatsManager,
        private readonly layoutManager: LayoutManager,
        private readonly dataManager: DataManager,
        private camera: CameraManager,
        private readonly graphContext: GraphContext,
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
        this.watchOwnWork();
        this.watchFrames();
    }

    /**
     * Lend the scene's node shader drawing the bulk repaint, so nodes waking on a shader that
     * became drawable are rebuilt together rather than one dispose at a time.
     */
    private lendShaderRepaint(): void {
        NodeShaderDrawing.lendRepaint(this.graphContext.getScene(), (nodes) => {
            this.repaintNodes(nodes as readonly Node[]);
        });
        // An edge drawn again because a shader became drawable takes new slots, which only an
        // edge walk places.
        EdgeShaderDrawing.lendWalk(this.graphContext.getScene(), () => {
            this.forceEdgeWalk();
        });
    }

    /**
     * Draw nodes again from the paints the session holds for them, as a style pass does: every
     * mesh about to be rebuilt disposed together first, the edges of the resized nodes found in
     * one walk. For a change the style stack did not make -- a shader a node names became drawable.
     * @param nodes - The nodes.
     * @internal
     */
    repaintNodes(nodes: readonly Node[]): void {
        const painter = this.graphContext.getStylePainter?.();
        if (painter?.owns !== true) {
            return;
        }

        const painted: [Node, NodePaint][] = [];
        for (const node of nodes) {
            const paint = node.isDisposed() ? null : painter.nodePaint(node.index);
            if (paint !== null) {
                painted.push([node, paint]);
            }
        }

        this.paintNodes(painted);
        this.graphContext.getMeshCache().prune();
        this.sceneChanged = true;
    }

    /**
     * Follows the graph onto the scene and camera of the renderer chosen at init, which replace
     * the ones this manager was built with. The old scene is disposed, and its watcher with it.
     * @param camera - The new scene's camera manager.
     */
    rebindScene(camera: CameraManager): void {
        this.camera = camera;
        this.watchFrames();
    }

    /**
     * Watch the current scene for drawn frames and its engine for a new canvas size. A canvas of a
     * new size draws the graph at a new aspect, so the frame drawn before it is no longer final.
     */
    private watchFrames(): void {
        const scene = this.graphContext.getScene();
        attachPendingWork(scene, this.pending);
        this.drawWatcher = scene.onAfterRenderObservable.add(() => {
            this.noteFrameDrawn();
        });
        this.drawPhaseWatcher = scene.onBeforeDrawPhaseObservable.add(() => {
            this.drewWithEveryShader =
                !this.stateIsFinished || this.drawnFrameIsFinished || this.everyDrawnMeshIsReady();
        });
        this.resizeWatcher = scene.getEngine().onResizeObservable.add(() => {
            this.viewMoved();
        });
        // A mesh built or taken down changes the picture wherever it happens -- in a pass, or
        // outside one, as a tooltip the pointer brings up does (issue #3287) -- so the frame drawn
        // before it is not the final one. A new mesh's shader is then waited for as well.
        const pictureChanged = (): void => {
            this.pending.changed();
        };
        this.meshAddedWatcher = scene.onNewMeshAddedObservable.add(pictureChanged);
        this.meshRemovedWatcher = scene.onMeshRemovedObservable.add(pictureChanged);
        this.lendShaderRepaint();
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
        const scene = this.graphContext.getScene();
        scene.onAfterRenderObservable.remove(this.drawWatcher);
        scene.onBeforeDrawPhaseObservable.remove(this.drawPhaseWatcher);
        scene.getEngine().onResizeObservable.remove(this.resizeWatcher);
        scene.onNewMeshAddedObservable.remove(this.meshAddedWatcher);
        scene.onMeshRemovedObservable.remove(this.meshRemovedWatcher);
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
     * The pass calls this itself whenever a node or edge render object was added or removed --
     * a load, a clear, an undo -- because a new object starts drawn and unselected whatever the
     * masks say, and a mask's version does not move when it merely grows by rows outside the set
     * (issue #2953). A 2D/3D switch needs nothing: it rebuilds the meshes of the same objects,
     * and each one puts its own render state back on its new mesh.
     */
    invalidateViewMasks(): void {
        this.appliedNodeSelection = NO_MASK_VERSION;
        this.appliedEdgeSelection = NO_MASK_VERSION;
        this.appliedNodeVisibility = NO_MASK_VERSION;
        this.appliedEdgeVisibility = NO_MASK_VERSION;
        this.appliedAnything = false;
        this.drawnSelectedNodes.clear();
        this.drawnSelectedEdges.clear();
    }

    /**
     * Invalidate the masks when the set of render objects has changed since they were applied.
     */
    private followElementSets(): void {
        const { nodeVersion, edgeVersion } = this.dataManager;
        if (nodeVersion !== this.appliedNodeSet || edgeVersion !== this.appliedEdgeSet) {
            this.invalidateViewMasks();
            this.appliedNodeSet = nodeVersion;
            this.appliedEdgeSet = edgeVersion;
        }
    }

    /**
     * Bring the meshes into line with the two masks.
     *
     * THE WHOLE POINT IS THE DELTA. A pass costs one integer comparison when nothing has moved,
     * and when something has it walks the render objects and writes ONLY the ones whose state
     * actually changed -- `Node.setRenderState` and `Edge.setRenderVisible` return false and touch
     * no mesh when handed what they already hold. So scrubbing a time window that moves 200 nodes
     * costs 200 mesh operations and not 50,000, and re-running a filter that lands on the same
     * answer costs none. When ONLY the selection moved, the pass does not walk at all: it touches
     * the elements it last drew selected and the selection's members, so a click costs the size of
     * the selection and not of the graph.
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
        this.followElementSets();

        const nodeSelection = masks.selection?.nodes() ?? null;
        const edgeSelection = masks.selection?.edges() ?? null;
        const nodeVisibility = masks.visibility?.nodes() ?? null;
        const edgeVisibility = masks.visibility?.edges() ?? null;
        const showContext = masks.showContext?.() ?? false;
        const ghost = masks.ghost?.() ?? false;

        const nodeSelectionVersion = nodeSelection?.version ?? NO_MASK_VERSION;
        const edgeSelectionVersion = edgeSelection?.version ?? NO_MASK_VERSION;
        const nodeVisibilityVersion = nodeVisibility?.version ?? NO_MASK_VERSION;
        const edgeVisibilityVersion = edgeVisibility?.version ?? NO_MASK_VERSION;

        const { nodesMoved, edgesMoved } = this.viewMasksMoved(
            nodeSelectionVersion,
            edgeSelectionVersion,
            nodeVisibilityVersion,
            edgeVisibilityVersion,
            showContext,
            ghost,
        );

        if (!nodesMoved && !edgesMoved) {
            return;
        }

        // A mask has just hidden or revealed something, so the cached list of what is drawn is
        // out of date. See `settleActiveMeshFreeze`.
        this.sceneChanged = true;

        // With what is drawn unchanged, only the selection moved: touch the elements that leave
        // it and the ones in it, not the whole graph. A visibility or context change rewrites its
        // mask wholesale, so that one still walks everything.
        const nodeSelectionOnly =
            this.appliedAnything &&
            nodeVisibilityVersion === this.appliedNodeVisibility &&
            showContext === this.appliedShowContext &&
            ghost === this.appliedGhost;
        const edgeSelectionOnly =
            this.appliedAnything && edgeVisibilityVersion === this.appliedEdgeVisibility && ghost === this.appliedGhost;

        if (nodesMoved && nodeSelectionOnly) {
            this.applyNodeSelection(nodeSelection);
        } else if (nodesMoved) {
            this.applyNodeMasks(nodeVisibility, nodeSelection, showContext);
        }

        if (edgesMoved && edgeSelectionOnly) {
            this.applyEdgeSelection(edgeSelection);
        } else if (edgesMoved) {
            this.applyEdgeMasks(edgeVisibility, edgeSelection);
        }

        this.appliedNodeSelection = nodeSelectionVersion;
        this.appliedEdgeSelection = edgeSelectionVersion;
        this.appliedNodeVisibility = nodeVisibilityVersion;
        this.appliedEdgeVisibility = edgeVisibilityVersion;
        this.appliedShowContext = showContext;
        this.appliedGhost = ghost;
        this.appliedAnything = true;
    }

    /**
     * Show, hide, select and deselect every node to match the masks.
     * @param nodeVisibility - The visible nodes, or null when nothing hides.
     * @param nodeSelection - The selected nodes, or null when nothing is selected.
     * @param showContext - Whether hidden nodes are drawn faintly.
     */
    private applyNodeMasks(
        nodeVisibility: ElementMask<NodeId> | null,
        nodeSelection: ElementMask<NodeId> | null,
        showContext: boolean,
    ): void {
        const hiddenState: NodeRenderState = showContext ? "context" : "hidden";
        this.drawnSelectedNodes.clear();

        for (const node of this.dataManager.nodes.values()) {
            const { index } = node;
            const placed = index !== INVALID_INDEX;
            const visible = nodeVisibility === null || !placed || nodeVisibility.has(index);
            const selected = nodeSelection !== null && placed && nodeSelection.has(index);

            node.setRenderState(visible ? "visible" : hiddenState);
            node.setSelected(selected);
            if (selected) {
                this.drawnSelectedNodes.add(node);
            }
        }
    }

    /**
     * Bring only the selected state of the nodes into line with the selection mask: the nodes
     * drawn selected last time and the mask's members, the same states a full walk would write.
     * @param nodeSelection - The selected nodes, or null when nothing is selected.
     */
    private applyNodeSelection(nodeSelection: ElementMask<NodeId> | null): void {
        const next = new Set<Node>();

        // `ids()` reads the bytes with an indexed loop, the same reach as the write that moved
        // the mask; the per-element work below is one lookup per member.
        for (const id of nodeSelection?.ids() ?? []) {
            const node = this.dataManager.nodes.get(id);
            if (node && node.index !== INVALID_INDEX && nodeSelection?.has(node.index) === true) {
                next.add(node);
            }
        }

        for (const node of this.drawnSelectedNodes) {
            if (!next.has(node)) {
                node.setSelected(false);
            }
        }

        for (const node of next) {
            node.setSelected(true);
        }

        this.drawnSelectedNodes = next;
    }

    /**
     * Bring only the selected state of the edges into line with the selection mask; see
     * {@link UpdateManager.applyNodeSelection}.
     * @param edgeSelection - The selected edges, or null when nothing is selected.
     */
    private applyEdgeSelection(edgeSelection: ElementMask<EdgeId> | null): void {
        const next = new Set<Edge>();

        edgeSelection?.forEachMember((index) => {
            const edge = this.dataManager.edgesByIndex[index];
            if (edge) {
                next.add(edge);
            }
        });

        let changed = false;
        for (const edge of this.drawnSelectedEdges) {
            if (!next.has(edge) && edge.setSelected(false)) {
                changed = true;
            }
        }

        for (const edge of next) {
            if (edge.setSelected(true)) {
                changed = true;
            }
        }

        this.drawnSelectedEdges = next;

        // Selecting redraws the edge marked, from a band batch of its own, and only the walk places
        // that band: with nothing moving, the walk is skipped and the band was never drawn.
        if (changed) {
            this.forceEdgeWalk();
        }
    }

    /**
     * Show, hide, select and deselect every edge to match the masks, and force the next edge walk
     * when any edge was revealed.
     * @param edgeVisibility - The visible edges, or null when nothing hides.
     * @param edgeSelection - The selected edges, or null when nothing is selected.
     */
    private applyEdgeMasks(
        edgeVisibility: ElementMask<EdgeId> | null,
        edgeSelection: ElementMask<EdgeId> | null,
    ): void {
        let revealed = false;
        this.drawnSelectedEdges.clear();

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

            // Selecting redraws the edge marked, from a different batch: placed by the walk too.
            const selected = edgeSelection !== null && placed && edgeSelection.has(index);
            if (edge.setSelected(selected)) {
                revealed = true;
            }
            if (selected) {
                this.drawnSelectedEdges.add(edge);
            }
        }

        // A REVEALED EDGE IS PLACED BY ITS NEXT UPDATE, not by being shown: hiding collapsed
        // its line slot and its caps, and showing only invalidates its endpoint cache. Nothing
        // moved, so without this the walk is skipped and the edge stays collapsed -- a filter
        // undone drew its edges as gone.
        if (revealed) {
            this.forceEdgeWalk();
        }
    }

    /**
     * Which halves of the scene the masks have moved since they were last applied.
     * @param nodeSelection - The node selection mask's version now.
     * @param edgeSelection - The edge selection mask's version now.
     * @param nodeVisibility - The node visibility mask's version now.
     * @param edgeVisibility - The edge visibility mask's version now.
     * @param showContext - Whether hidden nodes are drawn faintly now.
     * @param ghost - Whether ghosts are drawn now.
     * @returns Whether the nodes and whether the edges need the masks applied again.
     */
    private viewMasksMoved(
        nodeSelection: number,
        edgeSelection: number,
        nodeVisibility: number,
        edgeVisibility: number,
        showContext: boolean,
        ghost: boolean,
    ): { nodesMoved: boolean; edgesMoved: boolean } {
        return {
            nodesMoved:
                !this.appliedAnything ||
                nodeSelection !== this.appliedNodeSelection ||
                nodeVisibility !== this.appliedNodeVisibility ||
                showContext !== this.appliedShowContext ||
                ghost !== this.appliedGhost,
            edgesMoved:
                !this.appliedAnything ||
                edgeSelection !== this.appliedEdgeSelection ||
                edgeVisibility !== this.appliedEdgeVisibility ||
                ghost !== this.appliedGhost,
        };
    }

    /**
     * Whether a filter, a time window or a selection has changed since the last pass drew it.
     *
     * The masks reach the meshes on the NEXT pass, so between `visibility.set` resolving and that
     * pass the frame on screen still shows the old answer. Without this the picture read as final
     * the whole time, and `waitForStableFrame()` returned with the filtered-out nodes still drawn.
     * Reading a mask resyncs it, the same read the next pass makes.
     * @returns True when the masks hold an answer the meshes do not show yet.
     */
    private viewMasksPending(): boolean {
        const masks = this.viewMasks ?? EMPTY_MASKS;
        this.followElementSets();
        const { nodesMoved, edgesMoved } = this.viewMasksMoved(
            masks.selection?.nodes().version ?? NO_MASK_VERSION,
            masks.selection?.edges().version ?? NO_MASK_VERSION,
            masks.visibility?.nodes().version ?? NO_MASK_VERSION,
            masks.visibility?.edges().version ?? NO_MASK_VERSION,
            masks.showContext?.() ?? false,
            masks.ghost?.() ?? false,
        );

        return nodesMoved || edgesMoved;
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
     * @param budgetMs - How long this frame may spend applying paint before it leaves the rest
     *     for the next frame; each kind of element paints at least one batch. Unbounded when absent.
     */
    syncStyles(budgetMs = Number.POSITIVE_INFINITY): void {
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

        // IN BATCHES, WITHIN A BUDGET: each kind paints at least one batch a frame, and more while
        // the frame has time; what is left stays pending for the next frame. See
        // STYLE_FRAME_BUDGET_MS.
        const deadline = performance.now() + budgetMs;

        if (painter.hasPendingNodes) {
            this.syncNodeStyles(painter, deadline);
        }

        if (painter.hasPendingEdges) {
            this.syncEdgeStyles(painter, deadline);
        }

        // Every element the pass moved has now left its old source mesh, so a mesh this left
        // with no instances is a look nothing on screen has any more.
        this.graphContext.getMeshCache().prune();
    }

    /**
     * Paint the pending edges, batch by batch, until none is left or the frame's time is up.
     * @param painter - Where the paint is read from.
     * @param deadline - When this frame stops starting batches; the first always runs.
     */
    private syncEdgeStyles(painter: StylePainter, deadline: number): void {
        // A repainted edge's own appearance changed: the frame visits every edge.
        this.forceEdgeWalk();

        do {
            for (const index of painter.takeEdges(EDGE_PAINT_BATCH)) {
                const edge = this.dataManager.edgesByIndex[index];
                const paint = edge === undefined ? null : painter.edgePaint(index);

                if (edge !== undefined && paint !== null) {
                    edge.applySessionPaint(paint);
                }
            }
        } while (painter.hasPendingEdges && performance.now() < deadline);
    }

    /**
     * Take one batch of pending nodes and the paint each is to be drawn with.
     * @param painter - Where the paint is read from.
     * @param pending - The nodes that were pending when the frame began, by index.
     * @returns Each node of the batch and its paint.
     */
    private takeNodeBatch(painter: StylePainter, pending: ReadonlyMap<number, Node>): [Node, NodePaint][] {
        const painted: [Node, NodePaint][] = [];

        for (const index of painter.takeNodes(NODE_PAINT_BATCH)) {
            const node = pending.get(index);
            const paint = node === undefined ? null : painter.nodePaint(index);

            if (node !== undefined && paint !== null) {
                painted.push([node, paint]);
            }
        }

        return painted;
    }

    /**
     * Paint the pending nodes, batch by batch, until none is left or the frame's time is up.
     * @param painter - Where the paint is read from.
     * @param deadline - When this frame stops starting batches; the first always runs.
     */
    private syncNodeStyles(painter: StylePainter, deadline: number): void {
        // Walked once a frame rather than indexed, because the data manager keeps its nodes by id.
        // The membership test is one hash lookup per node and touches no mesh; every rebuild is
        // still bounded by the batches taken.
        const pending = new Map<number, Node>();

        for (const node of this.dataManager.nodes.values()) {
            if (painter.isNodePending(node.index)) {
                pending.set(node.index, node);
            }
        }

        const resized = new Set<Node>();

        do {
            for (const node of this.paintNodes(this.takeNodeBatch(painter, pending))) {
                resized.add(node);
            }
        } while (painter.hasPendingNodes && performance.now() < deadline);

        if (resized.size > 0) {
            for (const group of this.redrawGroups()) {
                resized.add(group);
            }
        }

        // A repaint can change how a node is drawn in ways that move where its edges stop without
        // moving the node, so the frame that finishes the repaint visits every edge. So does any
        // frame that resized a node, and the edges of those nodes, found in one walk however many
        // batches ran, measure again. The frames in between walk no edge: on a graph of 36,906
        // edges that walk was most of every frame a repaint was spread over.
        if (resized.size > 0 || !painter.hasPendingNodes) {
            this.forceEdgeWalk();
        }

        if (resized.size === 0) {
            return;
        }

        for (const edge of this.dataManager.edges.values()) {
            if (resized.has(edge.srcNode) || resized.has(edge.dstNode)) {
                edge.invalidatePositionCache();
            }
        }
    }

    /**
     * Draw again each group grown for a camera other than the one now looking: a group's face is
     * sized for the perspective it is seen in, and nothing else redraws it once the layout rests,
     * so the framing's last camera move left it sized for the camera before (issue #4088). Run last
     * in a pass, after anything in it that moves the camera, so the frame drawn next is consistent.
     */
    private redrawGroupsForCamera(): void {
        for (const { group } of this.dataManager.groups) {
            const node = this.dataManager.nodes.get(group);
            if (node?.groupDrawnForAnotherCamera === true) {
                node.update();
                // An edge to a group ends on its outline, which just moved.
                this.forceEdgeWalk();
            }
        }
    }

    /**
     * Place the groups that follow their members on the box the members now make, and draw each
     * over it. A frame that places no node -- the layout stopped, nothing framing -- still applies
     * paint, and paint that resizes a member moves its group's box, while paint that rebuilds a
     * group's mesh leaves the new mesh unstretched until the group is drawn again (issue #3478).
     * @returns The group nodes drawn again, whose edges have to be measured again.
     */
    private redrawGroups(): Node[] {
        const { groups } = this.dataManager;
        if (groups.length === 0) {
            return [];
        }

        this.layoutManager.placeGroups();
        const drawn: Node[] = [];
        for (const { group } of groups) {
            const node = this.dataManager.nodes.get(group);
            if (node !== undefined) {
                node.update();
                drawn.push(node);
            }
        }

        return drawn;
    }

    /**
     * Hand each node its paint, at a cost in proportion to the nodes rather than to the scene.
     *
     * A node whose paint changes its source mesh disposes its mesh, its label and its drag
     * handler, and Babylon takes each of those out of scene-wide lists one search at a time; a
     * node whose size or shape changes also used to walk every edge to find its own. Restyling
     * every node's shape cost the size of the graph per node (issue #2749). So the meshes about to
     * go are all disposed first, inside the bulk teardown the data manager removes nodes with, the
     * new ones are built after it, and the caller finds the edges of the resized nodes in one walk.
     * @param painted - Each node and the paint it is to be drawn with.
     * @returns The nodes whose size or shape changed, or whose mesh was rebuilt.
     */
    private paintNodes(painted: readonly [Node, NodePaint][]): ReadonlySet<Node> {
        const rebuilt = painted.filter(([node, paint]) => nodeRebuildsFor(node, paint)).map(([node]) => node);
        disposeReleased(rebuilt, [], () => {
            for (const node of rebuilt) {
                releaseNodeMesh(node);
            }
        });
        const resized = collectResizedNodes(() => {
            for (const [node, paint] of painted) {
                node.applySessionPaint(paint);
            }
        });

        for (const node of rebuilt) {
            resized.add(node);
        }

        return resized;
    }

    /**
     * Frame the whole graph on the next frame that has something to measure.
     *
     * The request is HONOURED rather than merely permitted. Everything below this line paces the
     * periodic re-framing that follows a moving layout around, and that pacing answers "no" to
     * every frame once the layout has stopped -- so routing an explicit request through it made
     * `Graph.zoomToFit()` silent from the first settlement onwards, and made the element's own
     * "re-frame now that the layout has truly settled" call dead on arrival.
     * @param explicit - True when a consumer asked, so {@link UpdateManager.stopAutoZoomToFit}
     *   leaves the request standing.
     */
    enableZoomToFit(explicit = false): void {
        this.needsZoomToFit = true;
        this.forceZoomToFit = true;
        this.explicitZoomToFit ||= explicit;
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
        this.explicitZoomToFit = false;
    }

    /**
     * Stop the element's own framing -- the follow of a moving layout and any request the element
     * made itself -- but keep a consumer's outstanding `zoomToFit()`, which is answered once.
     */
    stopAutoZoomToFit(): void {
        this.needsZoomToFit = false;
        if (!this.explicitZoomToFit) {
            this.forceZoomToFit = false;
        }
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
        this.pending.changed();
    }

    /**
     * Say that the element moved what the canvas shows without moving anything a pass tracks -- a
     * camera placed without animation, a canvas resized -- so the next frame drawn is the final one
     * and the frame before it is not (issue #3377). Nothing else here would notice: the layout is
     * at rest, no framing is owed, and no style work is queued. A reader's own drag is not counted,
     * on purpose; see {@link UpdateManager.frameIsStable}.
     */
    viewMoved(): void {
        this.pending.changed();
    }

    /**
     * Whether a picture the scene draws is still loading, so the frame on screen does not show it yet: an image
     * annotation, painted onto its texture when the image arrives (issue #3383), or a background tinted by group
     * outlines laid out after it drew (issue #4243). Null when nothing loads that way. Asked as one entry of
     * {@link UpdateManager.pending}; new work enters that record itself (`begin`, `track` or `watch`).
     */
    picturesLoading: (() => boolean) | null = null;

    /**
     * Whether an operation is queued or running, so the graph is about to change. Null when nothing queues
     * operations. Kept for code that set it, and asked as one `wait` entry of {@link UpdateManager.pending}; new
     * work enters that record itself.
     */
    operationsPending: (() => boolean) | null = null;

    /** Callers of {@link UpdateManager.onceNothingIsOwed} still waiting. */
    private readonly owedWaiters = new Set<() => void>();

    /**
     * Whether nothing is still owed to the picture: nothing in {@link UpdateManager.pending} is
     * pending, a queued operation included, and the frame drawn is the finished one. The one question `waitForStableFrame()` asks.
     * @returns True when the picture on screen is final and nothing queued will change it.
     */
    nothingIsOwed(): boolean {
        // `wait` work (a queued operation, issue #3528) too: the frame on screen is final about
        // the graph it shows, so `frameIsStable`, the frame announcement and the on-demand loop's
        // rest do not ask it, but a wait for the final picture does.
        return this.pending.firstPending("wait") === null && this.frameIsStable;
    }

    /**
     * Call back once {@link UpdateManager.nothingIsOwed} is true: at once when it already is, else
     * on the first pass or drawn frame that finds it so.
     *
     * Level-triggered, unlike `graph-frame-stable`, which fires only when a drawn frame turns the
     * picture final. Work that starts and ends between two frames without changing the picture --
     * a derivation pass that paints nothing -- turns nothing final, so a waiter that attached while
     * it ran heard no event and waited out its timeout (issue #3527). Asked again after every
     * pass, which the render loop runs on every tick it does not hold, drawn or rested, a waiter
     * wakes on the first one that finds nothing owed.
     * @param callback - Called once, in a microtask of its own, so one that throws stops no pass and
     *   no other waiter.
     * @returns Stops waiting; a no-op once called back.
     */
    onceNothingIsOwed(callback: () => void): () => void {
        if (this.nothingIsOwed()) {
            queueMicrotask(callback);
            return () => undefined;
        }

        this.owedWaiters.add(callback);
        return () => {
            this.owedWaiters.delete(callback);
        };
    }

    /** Calls back every {@link UpdateManager.onceNothingIsOwed} waiter when nothing is owed now. */
    private wakeOwedWaiters(): void {
        if (this.owedWaiters.size === 0 || !this.nothingIsOwed()) {
            return;
        }

        for (const callback of this.owedWaiters) {
            queueMicrotask(callback);
        }
        this.owedWaiters.clear();
    }

    /**
     * What is still keeping the picture from being final, in a consumer's words.
     *
     * Written for the message a timed-out wait carries, because "the frame never settled" on its
     * own sends the reader to a debugger.
     * @returns One phrase naming the thing that is still moving.
     */
    whyFrameIsNotStable(): string {
        const first = this.pending.firstPending();
        if (first !== null) {
            return first.reason;
        }

        return this.drawnFrameIsFinished
            ? "the picture is final"
            : "nothing has drawn a frame since the graph stopped moving";
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
     * Whether the state this pass leaves behind is a picture that will not change again: nothing
     * in {@link UpdateManager.pending} is pending, asked live.
     * @returns True when nothing the element drives is still going to move.
     */
    private pictureIsFinished(): boolean {
        return this.pending.idle;
    }

    /**
     * Enter the work this manager can see in {@link UpdateManager.pending}, in the order a
     * timed-out wait names it. Each is a live question, asked every time completion is asked.
     */
    private watchOwnWork(): void {
        const work = this.pending;
        const scene = (): Scene => this.graphContext.getScene();
        const painter = (): StylePainter | undefined => this.graphContext.getStylePainter?.();

        work.watch("layout", "the layout is still running", () => this.layoutIsMoving());
        work.watch(
            "layout",
            "the layout's pre-steps are still being computed",
            () => this.layoutManager.preStepsInFlight,
        );
        work.watch(
            "layout",
            "a layout transition is still moving the nodes",
            () => transitionsOf(this.layoutManager)?.moving === true,
        );
        // Paint that has arrived and not been drawn, and paint that has not arrived yet: either
        // one changes the picture. See `willZoomToFit` for the second.
        work.watch("style", "a style repaint is still queued", () => painter()?.hasPending === true);
        work.watch("style", "a style repaint is still painting", () => painter()?.isPainting === true);
        work.watch("style", "a change has not reached the picture yet, so its style repaint is still to come", () =>
            this.deriving(),
        );
        // An outstanding framing request only means the camera is about to move if there is
        // something for it to frame; see `framingHasNothingToFrame`.
        work.watch(
            "framing",
            "the camera has not finished framing the graph",
            () => this.willZoomToFit() && !this.framingHasNothingToFrame,
        );
        // The depth-independent size switched on or off and not yet applied to the meshes, or the
        // screen size on a map changed with the camera since the meshes were scaled.
        work.watch(
            "sizing",
            "node sizes have not been fitted to the view yet",
            () =>
                (this.depthSizingPivot() !== null || this.screenSizingScale() !== null) !== this.depthScaled ||
                this.screenSizingScale() !== this.screenScaled,
        );
        // An edge on screen not yet cut back to the nodes at the scale the zoom stopped at.
        work.watch(
            "sizing",
            "an edge has not been trimmed to its nodes at the new scale yet",
            () => this.retrimPending,
        );
        work.watch("view", "a filter or a selection has not been drawn yet", () => this.viewMasksPending());
        work.watch("view", "the camera is still moving to the selection", () => this.followingSelection);
        work.watch(
            "curves",
            "the curves through their support points are still settling",
            () => !this.dataManager.supportPoints.resting,
        );
        // A model still loading replaces its nodes' placeholder shapes when it lands; a picture
        // read and not yet on its nodes is painted onto them when it does.
        work.watch("model", "a node's 3D model is still loading", () => modelsLoading(scene()));
        work.watch("picture", "a node's picture is still loading", () => texturesLoading(scene()));
        // A template nothing uses is freed by counting frames, which a graph drawing on demand
        // stops making once the picture is finished.
        work.watch("model", "an unused 3D model is still being freed", () => modelsFreeing(scene()));
        // Set from outside by older code; see the two properties.
        work.watch("picture", "a picture is still loading", () => this.picturesLoading?.() === true);
        work.watch(
            "operation",
            "a queued operation has not finished",
            () => this.operationsPending?.() === true,
            "wait",
        );
        // Walked only until a finished frame has been drawn, not on every idle frame: the walk is
        // one readiness question per mesh, and what brings a new shader variant -- a repaint, a
        // load, a layout -- moves the picture counter on its way in. Entered last: it is the most
        // expensive question and the others usually answer first.
        work.watch(
            "shader",
            "a mesh is still waiting for its shader",
            () => !this.drawnFrameIsFinished && !this.everyDrawnMeshIsReady(),
        );
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

        // `stateIsFinished` is the last pass's answer, and work can arrive between that pass and
        // this frame: a load that brings nodes and starts the layout, then a resize that calls
        // `viewMoved()`, drew a frame of unplaced meshes and called it final (issue #3517).
        if (!this.pictureIsFinished()) {
            this.stateIsFinished = false;
            return;
        }

        // A mesh this frame skipped for want of a shader: the next frame draws it.
        if (!this.drewWithEveryShader) {
            return;
        }

        this.finishedEpoch = this.pending.epoch;
        this.finishedMeshCount = this.graphContext.getScene().meshes.length;
        this.eventManager.emit("graph-frame-stable", { frames: this.frameCount });
        this.wakeOwedWaiters();
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
            this.pending.changed();
        }

        // One clock reading for the whole pass, so every node of a layout transition is placed at
        // the same moment; the move ends after the pass that placed its last frame.
        const transitions = transitionsOf(this.layoutManager);
        transitions?.beginPass();
        this.runUpdatePass(frameMs);
        transitions?.endPass();

        // After the nodes have moved for this pass, so a node's depth is the one it is drawn at.
        const scaled = this.sizeNodesForDepth();
        if (this.screenScaled !== null && this.depthSizingPivot() === null) {
            this.retrimForScreenScale(this.screenScaled, scaled);
        } else {
            this.trimmedAt = new WeakMap();
            this.retrimPending = false;
            if (scaled) {
                this.statsManager.incrementCounter(UpdateManager.RETRIM_COUNTER, this.dataManager.edges.size);
                for (const edge of this.dataManager.edges.values()) {
                    edge.invalidatePositionCache();
                }
                this.forceEdgeWalk();
                this.updateEdges();
            }
        }
        this.refreshScreenBorders();

        // AFTER the pass and BEFORE the frame is drawn, so a change this pass made is drawn on
        // this frame rather than on the next one.
        this.settleActiveMeshFreeze();

        this.stateIsFinished = this.pictureIsFinished();

        if (!this.stateIsFinished) {
            // Something is moving again, so whatever was drawn before is no longer the last word.
            this.pending.changed();
        }

        // A pass that finds the drawn frame still final wakes its waiters even when it draws
        // nothing new: work that came and went since the last frame owes nothing (issue #3527).
        this.wakeOwedWaiters();
    }

    /** The selection the reader moved the camera away from, which the camera then stops following. */
    private heldSelection: string | null = null;

    /**
     * The reader moved the camera themselves (a pan, a zoom, a turn): stop following the selection
     * there is now, so the camera stays where they put it, until the selection changes.
     */
    holdSelectionFollow(): void {
        const nodes = this.graphContext.getSelectionManager?.()?.getSelectedNodes() ?? [];
        this.heldSelection = nodes.length === 0 ? null : selectionKey(nodes);
        this.followingSelection = false;
    }

    /**
     * With `camera.pivotOnSelection` on, hands the camera the plain average of the selected
     * nodes' positions to pivot on, every frame, so it follows them while they move.
     *
     * Not while the element is still framing the graph, which places the camera itself until it
     * is done, and not while a selected node is being dragged: a camera following the node under
     * the pointer would carry the drag along with it.
     *
     * The glide keeps to the clock, as the layout does: a pass stands for the nominal 60 Hz frames
     * `frameMs` took, so a page drawing slowly arrives in the same time rather than over seconds.
     * @param frameMs - How long the previous frame took; 0 glides one frame's share.
     */
    private followSelection(frameMs: number): void {
        this.followingSelection = false;
        if (!this.graphContext.getStyles().config.behavior.camera.pivotOnSelection) {
            return;
        }

        const nodes = this.graphContext.getSelectionManager?.()?.getSelectedNodes() ?? [];
        if (nodes.length === 0 || nodes.some((node) => node.dragging)) {
            return;
        }

        // The reader moved the camera since this selection was made: a pan or a zoom elsewhere is
        // theirs to keep, until they select something else.
        const key = selectionKey(nodes);
        if (key === this.heldSelection) {
            return;
        }

        this.heldSelection = null;

        if (this.willZoomToFit()) {
            // The glide starts on the pass after the framing ends, so the frame the framing ends
            // on is not the final one: without this, a stable frame was reported in between, with
            // the pivot on the graph's middle rather than on the selection.
            this.followingSelection = !this.framingHasNothingToFrame;
            return;
        }

        const center = nodes[0].mesh.position.clone();
        for (const node of nodes.slice(1)) {
            center.addInPlace(node.mesh.position);
        }

        // A camera still gliding to the selection is a picture that is not final yet.
        const frames = Math.min(MAX_CATCH_UP_ROUNDS, frameMs / NOMINAL_FRAME_MS);
        this.followingSelection = this.camera.followPoint(center.scaleInPlace(1 / nodes.length), frames);
    }

    /**
     * Bring the meshes into line with the masks and the style paint that has arrived: what every
     * frame does first, and what a layout that reads node sizes asks for before it reads them
     * (`LayoutManager.drawArrivedPaint`), so it reads the sizes about to be drawn whether or not a
     * frame has run since the paint arrived.
     * @param frameMs - How long the previous frame took, when the render loop runs this pass. A
     *     layout asking for the sizes states none, so the whole repaint is applied first.
     */
    drawArrivedPaint(frameMs = 0): void {
        // Before anything is drawn or measured: the masks decide what IS drawn, so a node that a
        // filter has just hidden must not contribute to this frame's bounding box or be picked.
        this.syncViewMasks();

        // And before the bounding box is measured for a second reason: a style pass can change a
        // node's SIZE, and zooming to fit a graph whose sizes have just changed must frame what
        // is about to be drawn rather than what was drawn last frame. A repaint that takes a label
        // off, or rebuilds, every element releases all those labels in one pass (issue #2762).
        disposeLabelsTogether(() => {
            // A pass the render loop runs keeps to the frame budget. One pumped by hand states no
            // frame time (`Graph.update()` with no argument), so it has no frame to keep short and
            // applies the whole repaint, as a caller drawing one frame to read the result expects.
            this.syncStyles(frameMs > 0 ? STYLE_FRAME_BUDGET_MS : Number.POSITIVE_INFINITY);
        });
    }

    /**
     * One pass of the update loop: masks, styles, camera, layout, meshes and framing.
     * @param frameMs - How long the previous frame took; see {@link UpdateManager.update}.
     */
    private runUpdatePass(frameMs: number): void {
        this.frameCount++;

        this.drawArrivedPaint(frameMs);
        // Nothing painted is left to apply: a frame drawn now shows every element's style.
        if (this.graphContext.getStylePainter?.()?.hasPending !== true) {
            this.dataManager.notePaintDrawn();
        }

        this.followSelection(frameMs);

        const { camera } = this.graphContext.getStyles().config.behavior;
        this.camera.setFitInsets(camera.fitInsets);
        this.camera.setFitBounds(camera.fitBounds);
        this.autoTurning = this.camera.autoTurn(
            (camera.autoRotate * Math.min(frameMs, UpdateManager.MAX_TURN_MS)) / 1000,
        );

        // Always update camera
        this.camera.update();

        // Check if layout is running
        if (!this.layoutManager.running) {
            // Even if layout is not running, we still need to:
            // 1. Update edges (for manual node dragging)
            // 2. Handle zoom if requested

            // A layout transition keeps moving the nodes after the layout itself has finished.
            if (transitionsOf(this.layoutManager)?.active === true) {
                this.updateNodes();
            }

            // Always update edges to handle manual node dragging
            // Edges have built-in dirty tracking, so they won't do unnecessary work
            this.updateEdges();
            this.frameTransition();

            // Handle zoom to fit if requested; a running transition frames where it lands, once
            // it has landed, rather than the moving picture.
            if (this.willZoomToFit() && transitionsOf(this.layoutManager)?.moving !== true) {
                this.updateNodes();
                this.updateEdges();

                // Handle zoom to fit
                this.applyZoomToFit(this.measure());

                // Update statistics
                this.updateStatistics();
            }

            this.redrawGroupsForCamera();
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
        this.frameTransition();

        // Handle zoom to fit if needed
        if (framing && transitionsOf(this.layoutManager)?.moving !== true) {
            this.applyZoomToFit(this.measure());
        }

        // Update statistics
        this.updateStatistics();
        this.redrawGroupsForCamera();
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
     * Bounded three times, so a frame that is slow BECAUSE of stepping cannot feed itself: never
     * more than {@link MAX_CATCH_UP_ROUNDS} rounds, and no extra round that would take stepping past
     * half of `frameMs` or past {@link LAYOUT_FRAME_BUDGET_MS}, judged by what the rounds so far
     * cost. The first round always runs. An accelerated simulation layout keeps its one batch a
     * frame (see below).
     * @param frameMs - How long the previous frame took; 0 takes one round.
     */
    private updateLayout(frameMs: number): void {
        this.statsManager.step();
        this.statsManager.graphStep.beginMonitoring();

        const { stepMultiplier, minDelta } = this.graphContext.getStyles().config.behavior.layout;

        // A simulation computes a whole round's `iterationsPerStep` iterations in ONE batch, so a
        // round is one call. On an accelerator it keeps ONE batch per frame, the one shape that
        // lets the device coalesce rather than queue; on the CPU a batch is synchronous and catches
        // up like any other engine, or a 100-iteration ForceAtlas2 drawn at six frames a second
        // took 17 s to settle.
        const { layoutEngine } = this.layoutManager;
        const simulation = layoutEngine instanceof SimulationLayoutEngine;
        const accelerated = simulation && layoutEngine.isAccelerated;
        const rounds = accelerated
            ? 1
            : Math.min(MAX_CATCH_UP_ROUNDS, Math.max(1, Math.floor(frameMs / NOMINAL_FRAME_MS)));
        const started = rounds > 1 ? performance.now() : 0;
        const budget = Math.min(frameMs / 2, LAYOUT_FRAME_BUDGET_MS);

        for (let round = 0; round < rounds; round++) {
            if (round > 0 && this.catchUpEnds(started, round, budget)) {
                break;
            }

            if (this.stepRound(simulation, stepMultiplier, minDelta)) {
                this.layoutManager.running = false;
                break;
            }
        }

        this.statsManager.graphStep.endMonitoring();
    }

    /**
     * Take one round of layout steps: one batch of a simulation, `stepMultiplier` steps of any
     * other engine.
     * @param simulation - Whether the engine is a simulation.
     * @param stepMultiplier - How many steps a round of a non-simulation engine takes.
     * @param minDelta - The settle threshold; 0 switches it off.
     * @returns True when the round moved no node as far as `minDelta`: the layout has arrived.
     */
    private stepRound(simulation: boolean, stepMultiplier: number, minDelta: number): boolean {
        const before = minDelta > 0 ? this.enginePositions() : null;

        if (simulation) {
            this.layoutManager.stepBatch();
            this.layoutStepCount++;
        } else {
            for (let i = 0; i < stepMultiplier; i++) {
                this.layoutManager.step();
                this.layoutStepCount++;
            }
        }

        return before !== null && this.largestMove(before) < minDelta;
    }

    /**
     * Whether this frame takes no more catch-up rounds: the engine has settled or gone, or one
     * more round would take the frame's stepping past its budget, guessing the next round costs
     * what the rounds so far cost on average.
     * @param started - When the frame's first round began.
     * @param done - How many rounds have run; at least one.
     * @param budget - The most stepping time this frame may take.
     * @returns True when the next round should wait for the next frame.
     */
    private catchUpEnds(started: number, done: number, budget: number): boolean {
        // A settled engine has nothing left to catch up on.
        const engine = this.layoutManager.layoutEngine;
        if (!engine || engine.isSettled) {
            return true;
        }

        const spent = performance.now() - started;

        return spent + spent / done > budget;
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

        // Groups following their members are placed on the box their members now make, before
        // anything is drawn.
        this.layoutManager.placeGroups();

        for (const node of this.layoutManager.nodes) {
            // The mesh position is updated by node.update()
            node.update();
        }

        this.statsManager.nodeUpdate.endMonitoring();
    }

    /** Set while a layout transition runs with a framing owed: the camera follows the move. */
    private framingTransition = false;

    /**
     * While a layout transition moves the nodes and the camera owes a framing, frame the move
     * every frame: the old layout's box eased into the new one's, grown to take in every node on
     * its way. The request itself is left for the frame after the move, which then frames the
     * same box it ended on, so the camera never jumps when the move ends.
     */
    private frameTransition(): void {
        // A held move is a still picture, framed as one by the ordinary framing.
        const transitions = transitionsOf(this.layoutManager);
        if (transitions?.moving !== true) {
            this.framingTransition = false;
            return;
        }

        this.framingTransition ||= this.willZoomToFit();
        const box = this.framingTransition ? this.measure() : undefined;
        if (box !== undefined) {
            const { min, max } = transitions.framing(box);
            this.camera.zoomToBoundingBox(new Vector3(min.x, min.y, min.z), new Vector3(max.x, max.y, max.z));
        }
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

    /** Whether a freeze of the list of what is visible was asked for and not withdrawn since. */
    private activeMeshesFrozen = false;

    /** Counts freeze requests and changes, so a freeze Babylon runs late knows it was withdrawn. */
    private freezeRequest = 0;

    /** The camera's view and projection stamps at the last frame, or null before the first. */
    private lastCameraState: readonly number[] | null = null;

    /** How many meshes the scene held last frame, so one appearing or going unfreezes it. */
    private lastMeshCount = -1;

    private updateEdges(): void {
        this.statsManager.edgeUpdate.beginMonitoring();

        const walk = this.edgesNeedWalking();
        // support points move after their nodes stop, until they come to rest, and their edges with them
        const bowed = this.dataManager.supportPoints.update(
            () => Array.from(this.layoutManager.nodes, (node) => node.mesh.position),
            this.layoutManager.edges,
            (edge) => edge.supportEdge(),
            walk,
        );
        this.sceneChanged ||= bowed;
        if (walk || bowed) {
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

    /** The screen scale the node meshes were last given on a map with `nodeScale: "screen"`. */
    private screenScaled: number | null = null;

    /** The screen scale each edge was last cut back to its nodes' surfaces at. */
    private trimmedAt = new WeakMap<Edge, number>();

    /**
     * The counter (`StatsManager`, when profiling) of edges cut back to their nodes' surfaces
     * because the nodes' scale changed: the work a zoom step costs.
     */
    static readonly RETRIM_COUNTER = "edges.retrimmedForNodeScale";

    /**
     * How far the nodes' screen scale may drift, as a ratio, while a zoom is under way before an
     * edge is cut back to its nodes' new surfaces. Between, an edge ends up to this share of a
     * node's radius short of it or inside it, about a pixel at the sizes nodes are drawn on a map;
     * once the zoom stops each edge on screen is cut exactly.
     */
    private static readonly RETRIM_BAND = 0.5;

    /** Whether an edge on screen was left cut at a scale near, not at, the nodes' own. */
    private retrimPending = false;

    /** Passes in a row the view and the nodes' scale held still. */
    private stillPasses = 0;

    /** How many passes in a row the view holds still before edges are cut exactly. */
    private static readonly STILL_PASSES = 8;

    /** The view matrix the last pass saw, to tell a view that moved from one holding still. */
    private readonly lastView = new Float32Array(16);

    /**
     * Cut edges back to their nodes' surfaces after `nodeScale: "screen"` scaled the nodes. Every
     * zoom step scales every node, and cutting all 36,906 routes of the OpenFlights sample (each
     * a raised arc) on every one took about 300 ms a step, so zooming was slow and choppy while
     * turning, which keeps the scale, stayed smooth. Only an edge with an end on screen is cut (an
     * end off screen shows no gap), and while the zoom is under way only once the scale has
     * drifted past {@link RETRIM_BAND} from the one it was cut at; once the view holds still,
     * exactly. An edge left uncut off screen is cut when the view brings an end of it on screen.
     *
     * ponytail: O(nodes + edges) a frame while the option is on, a test per node and a look-up per
     * edge; an index of edges by node would make it O(edges of the nodes on screen).
     * @param scale - The nodes' screen scale now.
     * @param scaled - Whether the scale changed this pass.
     */
    private retrimForScreenScale(scale: number, scaled: boolean): void {
        const camera = this.graphContext.getScene().activeCamera;
        if (camera === null) {
            return;
        }

        const view = camera.getViewMatrix().m;
        let moved = scaled;
        for (let i = 0; i < 16; i++) {
            if (this.lastView[i] !== Math.fround(view[i])) {
                moved = true;
                this.lastView[i] = view[i];
            }
        }

        // A wheel's notches come a few frames apart: the view counts as still only after it held
        // for STILL_PASSES passes, so a zoom by notches is not cut exactly between each two.
        this.stillPasses = moved ? 0 : this.stillPasses + 1;
        const moving = this.stillPasses < UpdateManager.STILL_PASSES;

        const planes = Frustum.GetPlanes(camera.getViewMatrix().multiply(camera.getProjectionMatrix()));
        const onScreen = new Set<Node>();
        for (const node of this.layoutManager.nodes) {
            if (node.mesh.isInFrustum(planes)) {
                onScreen.add(node);
            }
        }

        const tolerance = moving ? UpdateManager.RETRIM_BAND : 0;
        let cut = 0;
        this.retrimPending = false;
        for (const edge of this.dataManager.edges.values()) {
            if (!onScreen.has(edge.srcNode) && !onScreen.has(edge.dstNode)) {
                continue;
            }

            const at = this.trimmedAt.get(edge);
            const drift = at === undefined ? Infinity : Math.abs(scale / at - 1);
            if (drift <= tolerance) {
                // Within the band while moving: cut exactly once the view holds still.
                this.retrimPending ||= drift > 0;
                continue;
            }

            edge.invalidatePositionCache();
            this.trimmedAt.set(edge, scale);
            cut++;
        }

        if (cut > 0) {
            this.statsManager.incrementCounter(UpdateManager.RETRIM_COUNTER, cut);
            this.forceEdgeWalk();
            this.updateEdges();
        }
    }

    /** The map frame the camera last turned to face, so a new map is faced once. */
    private facedFrame: LocationMapFrame | null = null;

    /** Whether a node mesh currently carries a depth-independent scale. */
    private depthScaled = false;

    /**
     * The point whose depth every node is drawn at, when depth-independent size applies: the
     * option is on and the active camera is the perspective orbit camera.
     * @returns The orbit's pivot, or null when sizes follow the perspective.
     */
    private depthSizingPivot(): TransformNode | null {
        const camera = this.graphContext.getScene().activeCamera;
        const orbit = this.camera.getActiveController();
        return this.graphContext.getStyles().config.behavior.node.depthIndependentSize === true &&
            camera?.mode === Camera.PERSPECTIVE_CAMERA &&
            orbit instanceof OrbitCameraController
            ? orbit.pivot
            : null;
    }

    /**
     * The scale that holds every node at one size on screen while the location map layout runs
     * with `nodeScale: "screen"`: a node of size 1 is drawn as one scene unit is when the map's
     * extent fills the view's height, whatever the zoom, on a flat map and on a globe alike. Null when the layout does not ask for it.
     * @returns The scale, or null.
     */
    private screenSizingScale(): number | null {
        const engine = this.layoutManager.layoutEngine as
            { geoFrame?: LocationMapFrame | null; config?: { nodeScale?: string } } | undefined;
        const frame = engine?.geoFrame;
        const camera = this.graphContext.getScene().activeCamera;
        if (frame === undefined || frame === null || engine?.config?.nodeScale !== "screen" || camera === null) {
            return null;
        }

        // The data's extent as drawn, on either map: a globe's radius is set so it spans `size` too.
        // A map drawn `mapScale` times larger keeps its nodes their size on screen, so they spread
        // apart rather than grow with it.
        const extent = frame.size / frame.mapScale;
        if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
            return screenNodeScale({ orthoHeight: (camera.orthoTop ?? 0) - (camera.orthoBottom ?? 0) }, extent);
        }

        // Nodes stand on the map's surface: the flat map at the point the camera turns about, the
        // globe's face under the camera, its height above the globe.
        const orbit = this.camera.getActiveController();
        const globe = frame.surface === "globe";
        const target =
            orbit instanceof OrbitCameraController && !globe ? orbit.pivot.getAbsolutePosition() : Vector3.Zero();
        const eye = Vector3.Distance(camera.globalPosition, target);
        return screenNodeScale({ fov: camera.fov, depth: mapDepth(eye, globe ? frame.radius : 0) }, extent);
    }

    /**
     * Draw every node at the size it would have at the orbit's pivot depth when
     * `layoutBehavior.node.depthIndependentSize` is on, so two drawn sizes compare as the two style
     * sizes at any angle. Each node mesh is scaled by its view depth over the pivot's: perspective
     * divides by the depth, so the drawn size is world size over the pivot depth for every node.
     * On a map with `nodeScale: "screen"` every node is scaled too, so it keeps its size on screen
     * as the camera zooms. Off, in 2D (orthographic) or in XR, every node goes back to scale 1.
     *
     * ponytail: O(nodes) every frame while on, plus a walk of every edge whenever a scale changes
     * (an orbit drag); a per-node edge index would make that O(changed nodes' edges).
     * @returns Whether any node's scale changed, so the edges have to stop at the new surfaces.
     */
    private sizeNodesForDepth(): boolean {
        const camera = this.graphContext.getScene().activeCamera;
        const pivot = this.depthSizingPivot();
        const screen = this.screenSizingScale();
        this.screenScaled = screen;
        const on = pivot !== null || screen !== null;

        if (!on && !this.depthScaled) {
            return false;
        }

        let changed = false;
        if (!on) {
            for (const node of this.layoutManager.nodes) {
                if (node.mesh.scaling.x !== 1) {
                    node.mesh.scaling.setAll(1);
                    changed = true;
                }
            }
            this.depthScaled = false;

            return changed;
        }

        const view = camera?.getViewMatrix().m;
        const depthOf = (p: Vector3): number => (view ? p.x * view[2] + p.y * view[6] + p.z * view[10] + view[14] : 0);
        this.depthScaled = true;
        const reference = pivot === null ? 1 : depthOf(pivot.getAbsolutePosition());
        if (Number.isNaN(reference) || reference <= 0) {
            return false;
        }

        for (const node of this.layoutManager.nodes) {
            const { mesh } = node;
            let scale = screen ?? 1;
            if (pivot !== null) {
                const depth = depthOf(mesh.getAbsolutePosition());
                scale *= depth > 0 ? depth / reference : 1;
            }

            if (Math.abs(mesh.scaling.x - scale) > 1e-4) {
                mesh.scaling.setAll(scale);
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Say that a mesh was shown or hidden outside a pass, so the next frame re-reads what is drawn
     * instead of drawing the frozen list (see `settleActiveMeshFreeze`).
     */
    meshesShownOrHidden(): void {
        this.sceneChanged = true;
    }

    /**
     * Unfreeze Babylon's list of what is drawn now, for a draw made outside the frame loop.
     *
     * A frozen scene draws the list it cached, so a mesh built for a draw of its own -- a node
     * thumbnail, drawn by its own camera into a render target -- is not in it and comes out as
     * nothing. The next quiet frame freezes the list again (see `settleActiveMeshFreeze`).
     */
    thawActiveMeshes(): void {
        // Withdraws a freeze Babylon has not run yet; see `settleActiveMeshFreeze`.
        this.freezeRequest++;

        if (this.activeMeshesFrozen) {
            this.graphContext.getScene().unfreezeActiveMeshes();
            this.activeMeshesFrozen = false;
        }
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
            this.thawActiveMeshes();
            return;
        }

        if (!this.activeMeshesFrozen) {
            // A NEW RENDER ID FIRST. Freezing walks the scene and registers every instance in the
            // list of visible instances kept under the CURRENT render id. Between frames that id is
            // still the last frame's, whose list already holds every instance, so without this each
            // instance is listed twice and every frozen frame draws it twice -- invisible on an
            // opaque node, a doubled blend on a translucent one. Babylon bumps the id the same way
            // before it evaluates the scene outside a render (`Scene._checkIsReady`).
            scene.incrementRenderId();
            this.activeMeshesFrozen = true;

            // A FREEZE CAN LAND LATER THAN IT WAS ASKED FOR. Babylon freezes inside
            // `executeWhenReady`, which waits for its next 100 ms poll whenever the scene is not
            // ready -- a shader still compiling, or another caller's poll already pending -- and
            // `unfreezeActiveMeshes` does not cancel a freeze that is still waiting. So a change
            // made in between unfroze nothing, the poll then froze the list as it stood, and this
            // manager, believing the scene unfrozen, never unfroze it: the next mesh the scene
            // built was missing from the list and was not drawn. A layer taken off an edge lost
            // the edge's rebuilt line that way (test/browser/a-late-freeze-does-not-hide-a-rebuilt-mesh.test.ts).
            // A freeze that lands after a change withdrew it is undone at once.
            //
            // AND ITS WALK IS RETIRED WITH IT. The freeze asked for after the change waits on the
            // same poll and walks the scene right after the withdrawn one, under the same render
            // id -- into the list the withdrawn walk just filled -- so the frozen frames after it
            // drew instances twice (test/browser/frozen-frame-draws-each-instance-once.test.ts).
            // A new render id gives the next walk a list of its own.
            const request = ++this.freezeRequest;
            scene.freezeActiveMeshes(false, () => {
                if (request !== this.freezeRequest) {
                    scene.unfreezeActiveMeshes();
                    scene.incrementRenderId();
                }
            });
        }
    }

    /** The camera's matrices when screen-width borders were last checked; see `refreshScreenBorders`. */
    private screenBorderCamera: [number, number] | null = null;

    /**
     * Keep every border drawn in screen pixels (`border.screenWidth`) at its width on screen: on a
     * frame the camera's view or projection changed, each such node rebuilds its ring if the zoom
     * moved its width. A node with no such border answers at once.
     */
    private refreshScreenBorders(): void {
        const camera = this.graphContext.getScene().activeCamera;
        if (!camera) {
            return;
        }

        const now: [number, number] = [camera.getViewMatrix().updateFlag, camera.getProjectionMatrix().updateFlag];
        const before = this.screenBorderCamera;
        this.screenBorderCamera = now;
        if (before?.[0] === now[0] && before[1] === now[1]) {
            return;
        }

        const resized = new Set<Node>();
        for (const node of this.dataManager.nodes.values()) {
            if (node.refreshScreenBorder()) {
                resized.add(node);
            }
        }

        if (resized.size === 0) {
            return;
        }

        // An edge ends at its node's border, so a ring rebuilt wider or narrower moves the edge's
        // ends (#3532). Only the edges of the nodes whose ring changed, and only on a zoom that
        // crossed one of the ring's 1/16-doubling steps.
        for (const edge of this.dataManager.edges.values()) {
            if (resized.has(edge.srcNode) || resized.has(edge.dstNode)) {
                edge.invalidatePositionCache();
            }
        }

        this.forceEdgeWalk();
        this.updateEdges();
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

        return before?.[0] !== view || before[1] !== projection;
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
        if (!this.needsZoomToFit && !this.forceZoomToFit) {
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
        // the top of the pass that then frames it -- all of it, which on a slow frame takes more
        // than one pass: the paint is applied in batches within a frame budget, and a framing
        // answered between two batches measured the nodes of the later ones at their old size
        // (issue #3479).
        if (this.forceZoomToFit) {
            return !this.paintIsOutstanding();
        }

        // Check if we should zoom:
        // 1. Wait for minimum steps on first zoom
        // 2. Zoom every N steps during layout (based on zoomStepInterval)
        // 3. Zoom when layout settles
        const isSettled = this.layoutManager.layoutEngine?.isSettled ?? false;

        // The framing taken once the layout has arrived is the LAST one -- it stops the following
        // -- so it waits for a style pass on its way, as a request does. After the first load
        // nothing forces a framing at settlement, so a later load or layout change ended on this
        // one, taken with the nodes at their unstyled sizes whenever its size layer was still
        // painting (issue #3378). A framing while the layout moves is followed by another and
        // does not wait.
        if (isSettled && this.paintIsOutstanding()) {
            return false;
        }

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
     * Whether a style pass has been asked for and has not announced what it painted yet, or a
     * change is still on its way through the derivation lane to the pass that will paint it.
     * @returns True while the session's style stack is painting or about to.
     */
    private styleIsPainting(): boolean {
        return this.graphContext.getStylePainter?.()?.isPainting === true || this.deriving();
    }

    /**
     * Whether paint can still change the box a framing measures: a style pass on its way, or paint
     * that has arrived and is not applied to every element yet (`syncStyles` applies it in batches).
     * @returns True while some element is still to be drawn with paint it does not have yet.
     */
    private paintIsOutstanding(): boolean {
        return this.graphContext.getStylePainter?.()?.hasPending === true || this.styleIsPainting();
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

        let { min: boundingBoxMin, max: boundingBoxMax } = box;
        // On a map the map is framed too, and a new map is faced: seen from behind it is a mirror.
        const engine = this.layoutManager.layoutEngine as { geoFrame?: LocationMapFrame | null } | undefined;
        const frame = engine?.geoFrame ?? null;
        if (frame !== null) {
            // The whole map: a globe opens as the whole sphere, the flat map as its whole box.
            for (const corner of mapCorners(frame)) {
                boundingBoxMin = Vector3.Minimize(boundingBoxMin, corner);
                boundingBoxMax = Vector3.Maximize(boundingBoxMax, corner);
            }

            const orbit = this.camera.getActiveController();
            if (frame !== this.facedFrame && frame.dimensions === 3 && orbit instanceof OrbitCameraController) {
                // A globe is faced straight on. A flat map in 3D is seen from the south at a slant,
                // so its edges read as arcs above it: straight down, an arc looks like a line.
                orbit.pivot.rotationQuaternion =
                    frame.surface === "flat" ? FLAT_MAP_TILT.clone() : Quaternion.Identity();
            }

            this.facedFrame = frame;
        }

        const size = boundingBoxMax.subtract(boundingBoxMin);
        const active = this.camera.getActiveController();
        // A globe is framed as the sphere it is, filling the view, not as the box around its nodes
        // and the arcs above it, which drew the earth half the size.
        const sphere = frame?.surface === "globe" && active instanceof OrbitCameraController ? frame.radius : null;

        if (sphere === null && size.length() <= this.config.minBoundingBoxSize) {
            // A box too small to frame is the empty-graph case again: the request stays, and it is
            // waiting for a graph rather than for the camera.
            this.framingHasNothingToFrame = true;
            return;
        }

        if (sphere !== null && active instanceof OrbitCameraController) {
            active.zoomToSphere(Vector3.Zero(), sphere * GLOBE_FRAMING);
        } else {
            this.camera.zoomToBoundingBox(boundingBoxMin, boundingBoxMax, box.spots);
        }

        this.hasZoomedToFit = true;
        this.forceZoomToFit = false;
        this.explicitZoomToFit = false;
        this.framingHasNothingToFrame = false;
        this.lastZoomStep = this.layoutStepCount;

        // Only clear needsZoomToFit if layout is settled
        if (isSettled) {
            this.needsZoomToFit = false;
        }

        // Emit zoom complete event
        this.eventManager.emit("zoom-to-fit-complete", {
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

/**
 * A selection as text, to tell one selection from another.
 * @param nodes - The selected nodes.
 * @returns Their ids, joined.
 */
function selectionKey(nodes: readonly Node[]): string {
    return nodes.map((node) => String(node.id)).join("\u0000");
}
