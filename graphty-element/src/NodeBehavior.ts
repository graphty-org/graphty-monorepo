// Installs scene.pick and scene.createPickingRay; see test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Culling/ray";

import {
    type AbstractMesh,
    type ActionEvent,
    ActionManager,
    ExecuteCodeAction,
    Matrix,
    PointerEventTypes,
    type PointerInfoPre,
    Ray,
    Scene,
    Vector3,
} from "@babylonjs/core";

import { readEndpoint, resolveEndpoints } from "./data/endpoints";
import type { Graph } from "./Graph";
import { layoutEngineInternals } from "./layout/LayoutEngine";
import { SimulationLayoutEngine } from "./layout/SimulationLayoutEngine";
import type { GraphContext } from "./managers/GraphContext";
import { ON_TOP_RENDERING_GROUP } from "./meshes/RichTextLabel";
import type { Node as GraphNode, NodeIdType } from "./Node";
import { dispatcherOf } from "./session/GraphSession";
import type { Dispatcher, DispatchFunction, TransactionScope } from "./session/project/Dispatcher";
import { sourceLoadsOf } from "./session/sources/ids";

/**
 * The mesh a click at a canvas point lands on, as the reader sees the picture.
 *
 * Babylon's pick returns the hit nearest the camera, whatever group it is drawn in. A label drawn
 * on top (`ON_TOP_RENDERING_GROUP`, `onTop`) covers every node, even one nearer the camera, so the nearest
 * hit is the wrong answer there: a click on the card went to the node hidden under it. A mesh drawn
 * on top that is hit wins; otherwise the nearest hit does.
 * @param scene - The scene to pick in.
 * @param x - X in CSS pixels from the canvas's left edge.
 * @param y - Y in CSS pixels from the canvas's top edge.
 * @returns The mesh, or null when the point lands on nothing.
 */
export function pickAsDrawn(scene: Scene, x: number, y: number): AbstractMesh | null {
    const ray = scene.createPickingRay(x, y, null, null);
    const pickable = (mesh: AbstractMesh): boolean => mesh.isPickable && mesh.isVisible && mesh.isEnabled();
    const onTop = scene.pick(
        x,
        y,
        alongRay(scene, ray, (mesh) => mesh.renderingGroupId >= ON_TOP_RENDERING_GROUP && pickable(mesh)),
    );
    return onTop.hit ? onTop.pickedMesh : scene.pick(x, y, alongRay(scene, ray, pickable)).pickedMesh;
}

/**
 * A pick predicate that admits a mesh only when `admit` does AND the world-space ray can reach
 * its world bounding sphere.
 *
 * Babylon's pick builds a ray in each admitted mesh's own space -- a world x view x projection
 * multiply, an invert and two unprojects -- before it tests the mesh, and every node is a mesh of
 * its own, so a pick with no such filter cost one unproject per node (issue #3244). Testing the one
 * world ray against the sphere Babylon keeps in world space costs a few multiplies, and Babylon's
 * own test is against that same sphere in the mesh's space, so a mesh this rejects is one Babylon
 * would have rejected: the line test below drops Babylon's "behind the ray's origin" check and pads
 * the radius, so it only ever admits more. What is picked is unchanged.
 *
 * ponytail: Babylon's pick still walks every mesh in `scene.meshes` and calls this for each, about
 * 15-20 ms a pick at 100,000 nodes; a GPU id buffer or a spatial index over node positions is the
 * upgrade if that matters.
 * @param scene - The scene being picked.
 * @param ray - The pick's ray in world space.
 * @param admit - Which meshes may be picked at all.
 * @returns The predicate.
 */
export function alongRay(
    scene: Scene,
    ray: Ray,
    admit: (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean,
): (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean {
    // With several active cameras Babylon recomputes a camera-dependent mesh's world matrix for the
    // pointer's camera, so the sphere read here could be the other camera's: filter nothing then.
    const cameraDependent =
        (scene.activeCameras?.length ?? 0) > 1 && scene.cameraToUseForPointers !== scene.activeCamera;
    const { origin, direction } = ray;
    const usable = !cameraDependent && direction.lengthSquared() > 0;
    return (mesh, thinInstanceIndex = -1) => {
        if (thinInstanceIndex >= 0) {
            return admit(mesh, thinInstanceIndex);
        }

        if (!admit(mesh, thinInstanceIndex)) {
            return false;
        }

        if (!usable || mesh.hasThinInstances) {
            return true;
        }

        mesh.computeWorldMatrix();
        const { centerWorld, radiusWorld } = mesh.getBoundingInfo().boundingSphere;
        const dx = centerWorld.x - origin.x;
        const dy = centerWorld.y - origin.y;
        const dz = centerWorld.z - origin.z;
        const along = dx * direction.x + dy * direction.y + dz * direction.z;
        // Babylon widens the test by a line mesh's own threshold; no other mesh has one.
        const threshold =
            "intersectionThreshold" in mesh && typeof mesh.intersectionThreshold === "number"
                ? mesh.intersectionThreshold
                : 0;
        const radius = radiusWorld * (1 + 1e-5) + threshold;
        return dx * dx + dy * dy + dz * dz - along * along <= radius * radius;
    };
}

/** Babylon's own pointer picks, each made with the predicate the scene holds under this name. */
const POINTER_PICK_PREDICATES = ["pointerMovePredicate", "pointerDownPredicate", "pointerUpPredicate"] as const;

/** A pick predicate as Babylon calls it: the mesh, and a thin instance's index or -1. */
type PickPredicate = (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean;

/**
 * Put {@link alongRay} in front of the predicates Babylon picks with on a pointer move, press and
 * release.
 *
 * Babylon picks the scene itself on every pointer move -- for the cursor and the action manager's
 * triggers, which every node mesh carries -- with `scene.pointerMovePredicate`, so a move cost one
 * unproject per node there too, besides the element's own picks. Babylon sets its default
 * predicates on the first event, and a consumer may set its own at any time, so each property is
 * replaced on this scene by one that wraps whatever is stored in it. A pick tests
 * `scene.meshes[0]` first, so the wrapper builds the pick's world ray there, from the pointer and
 * camera Babylon's own pointer picks use.
 * @param scene - The scene.
 */
function filterPointerPicks(scene: Scene): void {
    for (const key of POINTER_PICK_PREDICATES) {
        const wrap = (base: PickPredicate | null | undefined): PickPredicate | null | undefined => {
            if (!base) {
                return base;
            }

            const ray = Ray.Zero();
            let test = base;
            return (mesh, thinInstanceIndex = -1) => {
                if (thinInstanceIndex < 0 && mesh === scene.meshes[0]) {
                    const pointer = scene.unTranslatedPointer;
                    scene.createPickingRayToRef(pointer.x, pointer.y, null, ray, scene.cameraToUseForPointers);
                    test = alongRay(scene, ray, base);
                }

                return test(mesh, thinInstanceIndex);
            };
        };
        let held = wrap(scene[key]);
        Object.defineProperty(scene, key, {
            configurable: true,
            enumerable: true,
            get: () => held,
            set: (base: PickPredicate | null | undefined) => {
                held = wrap(base);
            },
        });
    }
}

/**
 * The id of the node a click at a canvas point lands on, or `undefined` when it lands on none.
 *
 * Every pointer handler that asks "which node is under the pointer" and `elementAt` ask it here,
 * so the public answer and what a click selects cannot drift apart.
 * @param scene - The scene to pick in.
 * @param x - X in CSS pixels from the canvas's left edge.
 * @param y - Y in CSS pixels from the canvas's top edge.
 * @returns The node's id, or `undefined`.
 */
export function pickNodeId(scene: Scene, x: number, y: number): NodeIdType | undefined {
    const metadata = pickAsDrawn(scene, x, y)?.metadata as { nodeId?: NodeIdType } | null | undefined;
    return metadata?.nodeId;
}

/**
 * When a pointer event HAPPENED, on the `performance.now()` clock.
 *
 * A click is told from a long press by how long the button was down, and that has to be read from
 * the events' own time stamps, not from when the page got round to handling them. A pointerup
 * waits in the queue while the page is busy -- a long frame, a layout step, the browser
 * descheduled -- and measured at handling time a quick click made then read as a long press and
 * selected nothing. An event without a usable stamp (one built by hand) is stamped now.
 * @param event - The pointer event Babylon passed on, if any.
 * @returns The event's time stamp in milliseconds.
 */
export function pointerEventTime(event: object | null | undefined): number {
    // Babylon types the event as its own IMouseEvent, which does not declare the DOM's stamp.
    const stamp: unknown = event && "timeStamp" in event ? event.timeStamp : undefined;
    return typeof stamp === "number" && Number.isFinite(stamp) && stamp > 0 ? stamp : performance.now();
}

interface NodeBehaviorOptions {
    pinOnDrag?: boolean;
}

// Define drag state interface
interface DragState {
    dragging: boolean;
    dragStartMeshPosition: Vector3 | null;
    dragStartWorldPosition: Vector3 | null;
    dragPlaneNormal: Vector3 | null;
    /** The pointer moved the node during this drag (set with or without a session). */
    moved: boolean;
}

/**
 * One drag as one undoable step: the transaction the drag opens at drag start and records at the
 * drop (design/undo/undo-design.md section 5.3).
 */
interface DragGesture {
    readonly dispatcher: Dispatcher;
    /** The drag's transaction; what is dispatched through it joins the drag's step. */
    scope: TransactionScope | null;
    /** Let the transaction's body settle: the drop has dispatched everything it will. */
    readonly finish: () => void;
    /** An undo aborted the drag: the rest of the gesture does nothing. */
    aborted: boolean;
    /** The pointer moved the node, so the drop places it. */
    moved: boolean;
}

// Click detection state
interface ClickState {
    pointerDownTime: number;
    pointerDownPosition: { x: number; y: number };
    hasMoved: boolean;
    pointerEvent: PointerEvent | null;
}

/**
 * The nodes of one scene that a pointer event can concern, behind the one observer they share.
 *
 * An event reaches only the nodes it can change, never every node: the one under the pointer
 * (found by ONE pick per event), the ones with a press or a drag in progress, and the ones the
 * pointer was over until now. Asking every node "is the pointer over you?" made each node pick
 * the scene, and each pick tests every mesh, so one mouse move over n nodes cost about n x n mesh
 * tests (issue #2941). A node joins and leaves these in constant time instead of adding and
 * removing observers of its own, whose `remove` searches every observer the scene holds (issue
 * #2894).
 */
export interface NodePointerRoster {
    /** Each node's handler, by node id. */
    readonly byId: Map<NodeIdType, NodeDragHandler>;
    /** Handlers with a press or a drag in progress: they hear every move and every release. */
    readonly engaged: Set<NodeDragHandler>;
    /** Handlers whose node the pointer is over: they hear the move that leaves it. */
    readonly hovered: Set<NodeDragHandler>;
}

/** The roster of each scene; see {@link nodePointerRosterOf}. */
const nodePointerRosters = new WeakMap<Scene, NodePointerRoster>();

/**
 * Whether the scene is in an XR session, whose input XRInputHandler handles instead.
 * @param scene - The scene.
 * @returns True in XR.
 */
function inXR(scene: Scene): boolean {
    const xrHelper = scene.metadata?.xrHelper;
    return xrHelper?.baseExperience?.state === 2; // WebXRState.IN_XR
}

/**
 * Deliver one pointer event to the nodes it concerns.
 * @param scene - The scene.
 * @param roster - The scene's nodes.
 * @param pointerInfo - The event.
 */
function deliverPointerEvent(scene: Scene, roster: NodePointerRoster, pointerInfo: PointerInfoPre): void {
    // Skip desktop pointer handling in XR mode - XRInputHandler handles it. This prevents
    // conflicts where XR generates pointer events that the desktop handler would misinterpret
    // with wrong world position calculations.
    if (inXR(scene)) {
        return;
    }

    switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
            // nodeId from mesh metadata works with both regular and instanced meshes
            const pickedId = pickNodeId(scene, scene.pointerX, scene.pointerY);
            if (pickedId !== undefined) {
                roster.byId.get(pickedId)?.onPointerDown(pointerInfo);
            }

            break;
        }
        case PointerEventTypes.POINTERMOVE: {
            for (const handler of roster.engaged) {
                handler.onPointerMove();
            }

            // Picked AFTER the drags above have moved their nodes, so the hover reads where things
            // are now.
            const pickedId = pickNodeId(scene, scene.pointerX, scene.pointerY);
            for (const handler of roster.hovered) {
                handler.onHover(pickedId);
            }

            const target = pickedId === undefined ? undefined : roster.byId.get(pickedId);
            if (target && !roster.hovered.has(target)) {
                target.onHover(pickedId);
            }

            break;
        }
        case PointerEventTypes.POINTERUP:
            for (const handler of roster.engaged) {
                handler.onPointerUp(pointerInfo);
            }

            break;
        default:
            // Ignore other pointer events
            break;
    }
}

/**
 * The roster of a scene's nodes, created with its one `onPrePointerObservable` observer on first
 * use. The graph creates it when it sets up its scene, so the shared observer sits where the
 * first node's own observers used to.
 * @param scene - The scene.
 * @returns The scene's roster.
 */
export function nodePointerRosterOf(scene: Scene): NodePointerRoster {
    let roster = nodePointerRosters.get(scene);
    if (!roster) {
        const created: NodePointerRoster = { byId: new Map(), engaged: new Set(), hovered: new Set() };
        scene.onPrePointerObservable.add((pointerInfo) => {
            deliverPointerEvent(scene, created, pointerInfo);
        });
        filterPointerPicks(scene);
        nodePointerRosters.set(scene, created);
        roster = created;
    }

    return roster;
}

/** The one action manager the nodes of each scene share; see {@link nodeActionManagerOf}. */
const nodeActionManagers = new WeakMap<Scene, ActionManager>();

/**
 * The action manager every node mesh of a scene carries, with the double-click that expands a node.
 *
 * ONE PER SCENE, NOT ONE PER NODE. Babylon keeps every action manager in `scene.actionManagers`, and
 * disposing a mesh disposes its own manager, which takes it out of that list by `indexOf` and
 * walks `scene.meshes` twice for other owners: repainting or disposing one node cost the size of the
 * graph (issue #2894). The shared manager is never disposed with a mesh (`disposeWhenUnowned` is
 * off, which also skips the owner search); it goes with the scene. Which node was double-clicked
 * is read from the picked mesh, whose metadata names it.
 *
 * REGISTERED UNCONDITIONALLY, and the pair of fetchers is looked up when the reader double-clicks
 * rather than when the node is built. A consumer switches expansion on by setting
 * `element.layoutBehavior`, which can happen at any moment -- before the data arrives, after it, or
 * from a settings panel while the graph is on screen. Deciding at construction meant every node
 * already drawn kept the answer it was born with, so a consumer who loaded a graph and THEN turned
 * expansion on had a graph of nodes that ignored a double-click for ever.
 * @param scene - The scene.
 * @returns The scene's node action manager, created on first use.
 */
export function nodeActionManagerOf(scene: Scene): ActionManager {
    let manager = nodeActionManagers.get(scene);
    if (!manager) {
        manager = new ActionManager(scene);
        manager.disposeWhenUnowned = false;
        manager.registerAction(
            new ExecuteCodeAction({ trigger: ActionManager.OnDoublePickTrigger }, (event?: ActionEvent) => {
                const metadata = (event?.source as { metadata?: { graphNode?: GraphNode } } | undefined)?.metadata;
                const node = metadata?.graphNode;
                if (node && !node.isDisposed()) {
                    expandNode(node);
                }
            }),
        );
        manager.registerAction(
            new ExecuteCodeAction({ trigger: ActionManager.OnPickTrigger }, (event?: ActionEvent) => {
                const metadata = (event?.source as { metadata?: { graphNode?: GraphNode } } | undefined)?.metadata;
                const node = metadata?.graphNode;
                const graph = node?.parentGraph as (Graph & { fetchNodes?: unknown; fetchEdges?: unknown }) | undefined;
                if (node && !node.isDisposed() && (!graph?.fetchNodes || !graph.fetchEdges)) {
                    expandFromSource(node, "click");
                }
            }),
        );
        nodeActionManagers.set(scene, manager);
    }

    return manager;
}

/**
 * Expand a double-clicked node: fetch its neighbourhood through the layout behaviour's fetchers
 * and add it as one step.
 * @param node - The node.
 */
function expandNode(node: GraphNode): void {
    const context: GraphContext = node.parentGraph;
    // Only Graph has fetchNodes/fetchEdges, not GraphContext
    const graph = node.parentGraph as Graph & { fetchNodes?: unknown; fetchEdges?: unknown };

    const { fetchNodes, fetchEdges } = graph;

    // No fetchers: the node's own network source expands it, when the consumer
    // switched that on (`behavior.expand.trigger`). Neither is the default, and
    // neither is an error: a graph that holds everything it is ever going to
    // hold has nothing to expand.
    if (!fetchNodes || !fetchEdges) {
        expandFromSource(node, "double-click");
        return;
    }

    // make sure the graph is running, unless the consumer paused it
    context.getLayoutManager().running = true;

    // fetch all edges for current node
    const edgeSet = fetchEdges(node, graph);
    const edges = Array.from(edgeSet);

    // Which keys name this batch's endpoints is decided ONCE, by the same
    // resolver the data manager uses, and the answer is then passed to
    // `addEdges` so both halves of the expansion read the same columns.
    //
    // Reading `e.src` and `e.dst` here, as this handler used to, made the
    // expansion work for exactly one spelling -- and not the canonical one. A
    // `fetchEdges` written the way every guide teaches, returning
    // `{source, target}`, yielded a set of `undefined` neighbours: nothing was
    // fetched, and the edges queued as pending for ever.
    const endpoints = resolveEndpoints(edges, { source: null, target: null });
    const nodeIds = new Set<NodeIdType>();
    edges.forEach((e) => {
        nodeIds.add(readEndpoint(e, endpoints.source) as NodeIdType);
        nodeIds.add(readEndpoint(e, endpoints.target) as NodeIdType);
    });
    nodeIds.delete(node.id);

    // fetch all nodes from associated edges
    const nodes = fetchNodes(nodeIds, graph);

    // Add what was fetched as one step. The records ride in the command, so a
    // redo puts them back without asking the consumer again; the command adds
    // the edges under `repeated: "first"`, because a neighbourhood legitimately
    // names edges the graph already holds.
    void dispatcherOf(graph.getSession())
        .dispatch({
            op: "data.expand",
            seed: node.id,
            nodes: [...nodes],
            edges,
            source: endpoints.source,
            target: endpoints.target,
        })
        .catch((error: unknown) => {
            console.error("[graphty] Expanding a node failed:", error);
        });
}

/**
 * Expand a node from the network source that loaded it, when `behavior.expand.trigger` names
 * the gesture that just happened. A failure is published as `source:expand-failed`, so nothing
 * more is done with it here.
 * @param node - the node
 * @param gesture - what the reader did
 */
function expandFromSource(node: GraphNode, gesture: "click" | "double-click"): void {
    const context: GraphContext = node.parentGraph;
    const session = context.getSession?.();
    if (session === undefined) {
        return;
    }

    // The load that brought the node may carry its own expand behavior, which wins over the config.
    const keys = sourceLoadsOf(session.data.node(node.id)).map((key) => key.split("/")[0]);
    // ponytail: loads() walks every node; only a node a source brought pays for it, once per click.
    const own = keys.length === 0 ? undefined : session.data.loads().find((load) => keys.includes(load.key))?.expand;
    const { trigger, ...options } = { ...context.getStyles().config.behavior.expand, ...own };
    if (trigger !== gesture) {
        return;
    }

    session.data.expand([node.id], options).catch(() => undefined);
}

// Click detection thresholds
const CLICK_MAX_DURATION_MS = 300; // Maximum time for a click (vs long press/drag)
const CLICK_MAX_MOVEMENT_PX = 5; // Maximum pixels of movement for a click

/**
 * Main drag handler class - unified for both desktop and XR
 */
export class NodeDragHandler {
    private readonly node: GraphNode;
    private readonly dragState: DragState;
    private clickState: ClickState | null = null;
    private gesture: DragGesture | null = null;
    private readonly scene: Scene;
    private readonly roster: NodePointerRoster;
    private isHovered = false;
    private readonly zAxisAmplification: number;
    private readonly enableZAmplificationInDesktop: boolean;

    /**
     * Creates a new drag handler for a node.
     * @param node - The graph node to enable dragging on
     */
    constructor(node: GraphNode) {
        this.node = node;
        this.scene = node.mesh.getScene();
        this.dragState = {
            dragging: false,
            dragStartMeshPosition: null,
            dragStartWorldPosition: null,
            dragPlaneNormal: null,
            moved: false,
        };

        // Read config from graph context
        const context = this.getContext();
        const xrConfig = context.getConfig().xr;

        this.zAxisAmplification = xrConfig?.input.zAxisAmplification ?? 10;
        this.enableZAmplificationInDesktop = xrConfig?.input.enableZAmplificationInDesktop ?? false;

        // A restyle rebuilds the node's mesh and this handler with it, often while the pointer is
        // over the node (a hover layer restyles the node it hovers). Starting from the session's
        // answer, not from false, is what lets the next move off the node end the hover.
        this.isHovered = context.getSelectionManager?.()?.isHovered(node.id) ?? false;

        // Join the scene's pointer roster; see nodePointerRosterOf.
        this.roster = nodePointerRosterOf(this.scene);
        this.roster.byId.set(node.id, this);
        if (this.isHovered) {
            this.roster.hovered.add(this);
        }
    }

    // Public API for both desktop and XR
    /**
     * Initiates a drag operation for the node.
     * @param worldPosition - World space position where drag started
     */
    public onDragStart(worldPosition: Vector3): void {
        // Debug: console.log("🔍 [Drag] Drag Start:", {
        //     nodeId: this.node.id,
        //     isXRMode: this.isXRMode(),
        // });

        // Opened FIRST, so its before-arrangement is taken before the layout is reheated and
        // before anything has moved: undoing the drag puts every node back where it was now. A
        // drag that never saw its drop is closed with what it did.
        this.gesture?.finish();
        this.gesture = this.openGesture();

        this.dragState.dragging = true;
        this.dragState.moved = false;
        this.roster.engaged.add(this);
        this.dragState.dragStartMeshPosition = this.node.mesh.position.clone();
        this.dragState.dragStartWorldPosition = worldPosition.clone();
        this.node.dragging = true;

        // Capture the drag plane orientation at drag start
        // This prevents the plane from rotating with camera during drag
        const camera = this.scene.activeCamera;
        if (camera) {
            this.dragState.dragPlaneNormal = camera.getForwardRay().direction.clone();

            // Disable camera input handler during node drag
            // This prevents OrbitInputController from rotating camera while dragging nodes
            const cameraManager = this.scene.metadata?.cameraManager;
            if (cameraManager) {
                // Debug: console.log("📷 Disabling camera input during node drag");
                cameraManager.temporarilyDisableInput();
            }
        }

        // Make sure graph is running -- through the INTERNAL write, which a consumer's pause
        // refuses: a drag moves the node without resuming a paused layout.
        const context = this.getContext();
        context.getLayoutManager().running = true;

        // HOLD THE NODE STILL WHILE THE POINTER HAS IT. A simulation layout keeps arranging the
        // row and publishing where it put it, so without a fixed bit the forces would fight the
        // pointer. The bit is temporary: `onDragEnd` gives it back unless the drop pins the node.
        const { layoutEngine } = context.getLayoutManager();
        if (layoutEngine instanceof SimulationLayoutEngine) {
            layoutEngine.beginDrag(this.node);
        }

        // Emit node-drag-start event
        const eventManager = context.getEventManager?.();
        if (eventManager) {
            const pos = this.node.mesh.position;
            eventManager.emitNodeEvent("node-drag-start", {
                node: this.node,
                position: { x: pos.x, y: pos.y, z: pos.z },
                // As it was when the drag BEGAN. A pin now survives a layout change, so "was this
                // node already fixed before I touched it?" is a question a consumer can act on --
                // an inspector showing a Pinned badge, a handler that refuses to move one.
                pinned: this.node.isPinned(),
            });
        }
    }

    /**
     * Updates node position during drag operation.
     * @param worldPosition - Current world space position of the drag pointer
     */
    public onDragUpdate(worldPosition: Vector3): void {
        if (
            !this.dragState.dragging ||
            !this.dragState.dragStartWorldPosition ||
            !this.dragState.dragStartMeshPosition ||
            this.gesture?.aborted === true
        ) {
            return;
        }

        // Calculate delta from drag start
        const delta = worldPosition.subtract(this.dragState.dragStartWorldPosition);

        // TODO: Add back delta validation with appropriate threshold for XR mode
        // The previous MAX_REASONABLE_DELTA of 5.0 was too small for 10x amplification
        // and was blocking ALL movement in XR

        // Apply movement amplification in XR mode
        // In VR, all controller movements are physically constrained (not just Z-axis)
        // so we amplify all axes to make node manipulation practical
        const shouldAmplify = this.isXRMode() || this.enableZAmplificationInDesktop;

        if (shouldAmplify) {
            delta.x *= this.zAxisAmplification;
            delta.y *= this.zAxisAmplification;
            delta.z *= this.zAxisAmplification;
        }

        // Calculate new position
        const newPosition = this.dragState.dragStartMeshPosition.add(delta);

        // Update mesh position (triggers edge updates automatically)
        this.node.setMeshPosition(newPosition.x, newPosition.y, newPosition.z);
        // Bring the selection halo along now: the update loop visits nodes only while a layout runs,
        // so over a settled layout the halo stayed where the drag began until the drop.
        this.node.update();
        this.dragState.moved = true;
        if (this.gesture !== null) {
            this.gesture.moved = true;
        }

        // Update layout engine
        const context = this.getContext();
        const engine = context.getLayoutManager().layoutEngine;
        if (engine !== undefined) {
            layoutEngineInternals.setNodePosition(engine, this.node, {
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z,
            });
        }
    }

    /**
     * Completes a drag operation and updates node state.
     */
    public onDragEnd(): void {
        if (!this.dragState.dragging) {
            return;
        }

        const context = this.getContext();
        const { gesture } = this;
        this.gesture = null;
        const pins = this.node.pinOnDrag && this.placedByPointer();
        // An undo during the drag already released the node, put everything back and stopped
        // the layout: the drop of that gesture does nothing.
        if (gesture?.aborted !== true) {
            // Make sure graph is running -- through the INTERNAL write, which a consumer's pause
            // refuses: a drag moves the node without resuming a paused layout.
            context.getLayoutManager().running = true;

            // BEFORE THE PIN, so the fixed bit is never cleared and set again inside one frame: a
            // drop that pins keeps the bit it has been holding, and a drop that does not gives the
            // row back to the simulation.
            const { layoutEngine } = context.getLayoutManager();
            if (layoutEngine instanceof SimulationLayoutEngine) {
                layoutEngine.endDrag(this.node, pins);
            }

            this.drop(gesture, pins);
            this.releaseCamera();
        }

        // Emit node-drag-end event before resetting drag state
        const eventManager = context.getEventManager?.();
        if (eventManager) {
            const pos = this.node.mesh.position;
            eventManager.emitNodeEvent("node-drag-end", {
                node: this.node,
                position: { x: pos.x, y: pos.y, z: pos.z },
                // Read AFTER the pin above, so this reports what the drop actually did rather
                // than what it was about to do.
                pinned: this.node.isPinned(),
            });
        }

        // Reset drag state
        this.node.dragging = false;
        this.dragState.dragging = false;
        this.dragState.dragStartMeshPosition = null;
        this.dragState.dragStartWorldPosition = null;
        this.dragState.dragPlaneNormal = null;
        this.settle();
    }

    /** Leave the engaged handlers once no press or drag is left in progress. */
    private settle(): void {
        if (!this.dragState.dragging && this.clickState === null) {
            this.roster.engaged.delete(this);
        }
    }

    /**
     * Set node position directly (for XR mode).
     * XRInputHandler calculates the position with pivot transform and amplification,
     * then calls this method to update the node and layout engine.
     *
     * This bypasses the delta calculation in onDragUpdate() which doesn't account
     * for pivot rotation changes during drag.
     * @param newPosition - New position to set for the node
     */
    public setPositionDirect(newPosition: Vector3): void {
        if (!this.dragState.dragging || this.gesture?.aborted === true) {
            return;
        }

        // Update mesh position
        this.node.setMeshPosition(newPosition.x, newPosition.y, newPosition.z);
        // Bring the selection halo along now: the update loop visits nodes only while a layout runs,
        // so over a settled layout the halo stayed where the drag began until the drop.
        this.node.update();
        this.dragState.moved = true;
        if (this.gesture !== null) {
            this.gesture.moved = true;
        }

        // Update layout engine
        const context = this.getContext();
        const engine = context.getLayoutManager().layoutEngine;
        if (engine !== undefined) {
            layoutEngineInternals.setNodePosition(engine, this.node, {
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z,
            });
        }
    }

    /**
     * Open the drag's transaction. Its body waits for the drop; an undo while it is open aborts
     * it, which ends the drag (design/undo/undo-design.md section 5.3).
     * @returns The gesture, or null for a graph with no session.
     */
    private openGesture(): DragGesture | null {
        const session = this.getContext().getSession?.();
        if (session === undefined) {
            return null;
        }

        let finish: () => void = () => undefined;
        const dropped = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const gesture: DragGesture = {
            dispatcher: dispatcherOf(session),
            scope: null,
            finish: () => {
                finish();
            },
            aborted: false,
            moved: false,
        };
        gesture.dispatcher
            .transaction(
                `Dragged node ${String(this.node.id)}`,
                (tx, signal) => {
                    gesture.scope = tx;
                    signal.addEventListener(
                        "abort",
                        () => {
                            this.abortGesture(gesture);
                        },
                        { once: true },
                    );
                    return dropped;
                },
                { moves: true, fact: { code: "node.drag", params: { node: this.node.id } } },
            )
            // An aborted drag rejects; the abort has already ended it.
            .catch(() => undefined);
        return gesture;
    }

    /**
     * The drop: place the node where the pointer left it and, when it pins, pin it, both
     * through the drag's transaction, then let the transaction record.
     * @param gesture - The drag's gesture, or null for a graph with no session.
     * @param pins - Whether the drop pins: `pinOnDrag` and the pointer placed the node.
     */
    private drop(gesture: DragGesture | null, pins: boolean): void {
        const { scope } = gesture ?? {};
        if (gesture === null || scope === null || scope === undefined) {
            if (pins) {
                this.node.pin();
            }

            return;
        }

        if (gesture.moved) {
            const { x, y, z } = this.node.mesh.position;
            scope.dispatch({ op: "positions.set", entries: [{ id: this.node.id, x, y, z }] }).catch(() => undefined);
        }

        if (pins) {
            // Through `pin` itself, routed into the drag, so there is one way a node is pinned.
            const via: DispatchFunction = (command, options) => scope.dispatch(command, options);
            gesture.dispatcher.routed(via, () => {
                this.node.pin();
            });
        }

        gesture.finish();
    }

    /**
     * An undo aborted the drag: the dispatcher has rolled it back, restoring where everything
     * was at drag start and stopping the layout. Release the node in the engine and give the
     * camera its input back; the rest of the gesture is ignored until the pointer is released.
     * @param gesture - The aborted gesture.
     */
    private abortGesture(gesture: DragGesture): void {
        gesture.aborted = true;
        if (this.gesture !== gesture) {
            return;
        }

        this.node.dragging = false;
        const { layoutEngine } = this.getContext().getLayoutManager();
        if (layoutEngine instanceof SimulationLayoutEngine) {
            layoutEngine.endDrag(this.node, false);
        }

        this.releaseCamera();
    }

    /** Give the camera its input back after a drag. */
    private releaseCamera(): void {
        const cameraManager = this.scene.metadata?.cameraManager;
        if (cameraManager) {
            cameraManager.temporarilyEnableInput();
        }
    }

    /**
     * Get the node being dragged.
     * Used by XRInputHandler to access the node's mesh for position calculations.
     * @returns The graph node associated with this drag handler
     */
    public getNode(): GraphNode {
        return this.node;
    }

    // Internal methods
    /**
     * A press on this node: start a drag. The scene's roster calls it for the node it picked.
     * @param pointerInfo - The event.
     */
    public onPointerDown(pointerInfo: PointerInfoPre): void {
        // Initialize click tracking
        this.clickState = {
            pointerDownTime: pointerEventTime(pointerInfo.event),
            pointerDownPosition: {
                x: this.scene.pointerX,
                y: this.scene.pointerY,
            },
            hasMoved: false,
            pointerEvent: pointerInfo.event as PointerEvent,
        };

        this.onDragStart(this.pointerWorldPosition());
    }

    /** A move: carry this node along while it is being dragged. Called for engaged handlers. */
    public onPointerMove(): void {
        if (!this.dragState.dragging) {
            return;
        }

        // Track movement for click detection
        if (this.clickState && !this.clickState.hasMoved) {
            const dx = this.scene.pointerX - this.clickState.pointerDownPosition.x;
            const dy = this.scene.pointerY - this.clickState.pointerDownPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > CLICK_MAX_MOVEMENT_PX) {
                this.clickState.hasMoved = true;
            }
        }

        this.onDragUpdate(this.pointerWorldPosition());
    }

    /**
     * A release: end this node's drag, and select it when the drag was a click. Called for engaged
     * handlers.
     * @param pointerInfo - The event.
     */
    public onPointerUp(pointerInfo: PointerInfoPre): void {
        if (this.dragState.dragging) {
            // Check if this was a click (short duration, minimal movement)
            const wasClick = this.isClick(pointerEventTime(pointerInfo.event));

            this.onDragEnd();

            // If it was a click, select this node
            if (wasClick) {
                this.handleClick();
            }
        }

        // Reset click state
        this.clickState = null;
        this.settle();
    }

    /**
     * Where the pointer is in the world, on this node's drag plane.
     * @returns The point.
     */
    private pointerWorldPosition(): Vector3 {
        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            Matrix.Identity(),
            this.scene.activeCamera,
        );
        return this.getWorldPositionFromRay(ray);
    }

    /**
     * A move: emit node-hover when the pointer arrives on this node, and hide its tooltip when it
     * leaves. The scene's roster calls it for the node under the pointer and the hovered ones.
     * @param pickedNodeId - The node under the pointer, if any.
     */
    public onHover(pickedNodeId: NodeIdType | undefined): void {
        // Skip if we're currently dragging
        if (this.dragState.dragging) {
            return;
        }

        const isOverThisNode = pickedNodeId === this.node.id;

        // Tell the session which node is under the pointer, for `{ match: "hover" }` layers.
        // Asked on every move over the node, not only on arrival, because the pointer can
        // leave the canvas and come back onto the same node without this node seeing it go.
        if (isOverThisNode) {
            this.getContext().getSelectionManager?.()?.hover(this.node.id);
        }

        // Emit node-hover when entering the node (not when already hovering)
        if (isOverThisNode && !this.isHovered) {
            this.isHovered = true;
            this.roster.hovered.add(this);

            // THE TOOLTIP IS DRAWN HERE, and this is the only moment it can be. A tooltip is
            // an answer to pointing at something, so no style pass knows when to draw one:
            // the paint records what this node's tooltip should say and the pointer arriving
            // is what puts it on screen. The channel has been published as `renderable` and
            // documented as "the words to show on hover" since before there were channels,
            // and until this line nothing drew one in any version of the package.
            this.node.showTooltip();

            const context = this.getContext();
            const eventManager = context.getEventManager?.();
            if (eventManager) {
                eventManager.emitNodeEvent("node-hover", {
                    node: this.node,
                    data: this.node.data,
                });
            }

            // The scene hears the pointer only while it is over the canvas, so leaving the
            // canvas -- for a panel, a menu, another window -- is heard here or never.
            this.pointerArea()?.addEventListener("pointerleave", this.endHover);
        } else if (!isOverThisNode && this.isHovered) {
            this.endHover();
        }
    }

    /**
     * The element the scene takes pointer events from.
     * @returns The canvas, or null when the engine has none (a headless engine).
     */
    private pointerArea(): HTMLElement | null {
        const engine = this.scene.getEngine();
        return engine.getInputElement() ?? engine.getRenderingCanvas();
    }

    /**
     * The pointer left this node, or the canvas: the tooltip goes and the node is no longer
     * hovered, so the next arrival on it starts a hover again.
     */
    private readonly endHover = (): void => {
        this.pointerArea()?.removeEventListener("pointerleave", this.endHover);
        this.roster.hovered.delete(this);
        if (!this.isHovered) {
            return;
        }

        this.isHovered = false;
        this.node.hideTooltip();
        this.getContext().getSelectionManager?.()?.leave(this.node.id);
    };

    /**
     * Whether the pointer placed the node, which is what `pinOnDrag` pins for.
     * @returns True for a real drag; false for a click, however the hand shook during it.
     */
    private placedByPointer(): boolean {
        // A mouse press carries click state, and moving under the click tolerance is a click the
        // hand shook through, not a placement. XR and direct callers have no click state; for
        // them any move counts.
        return this.clickState === null ? this.dragState.moved : this.clickState.hasMoved;
    }

    /**
     * Check if the current pointer interaction qualifies as a click.
     * A click is defined as a short duration interaction with minimal movement.
     * @param pointerUpTime - When the pointer went up, from {@link pointerEventTime}.
     * @returns True if the interaction qualifies as a click
     */
    private isClick(pointerUpTime: number): boolean {
        if (!this.clickState) {
            return false;
        }

        const duration = pointerUpTime - this.clickState.pointerDownTime;
        return duration < CLICK_MAX_DURATION_MS && !this.clickState.hasMoved;
    }

    /**
     * Handle a click on this node - select it (shift-click adds it to the selection, or takes it
     * out) and emit node-click event.
     */
    private handleClick(): void {
        const context = this.getContext();
        // Shift adds the node to the selection, as Shift on an edge does (Graph.ts); a plain click
        // replaces it. XR's select() has no pointer event, so it always replaces.
        const selectionManager = context.getSelectionManager?.();
        // A right-click is a request for a menu about the selection, so on a node already in it
        // the selection stays whole; on any other node it selects that node, as a click does.
        const secondary = this.clickState?.pointerEvent?.button === 2;
        if (selectionManager && !(secondary && selectionManager.isSelected(this.node))) {
            if (this.clickState?.pointerEvent?.shiftKey === true && !secondary) {
                selectionManager.toggle(this.node);
            } else {
                selectionManager.select(this.node);
            }
        }

        // A click does NOT pin. `pinOnDrag` means what it says: a node is fixed because the user
        // placed it, and placing is dragging. Pinning here as well made every node a reader merely
        // clicked on permanently fixed -- nothing in the element releases a pin, so a session spent
        // inspecting nodes ended with the layout frozen one node at a time, and the reader had no
        // way to tell which nodes were stuck or why. It was done to stop the layout drifting under
        // the selection styling; a moving node keeps its own highlight, so what that bought was a
        // still node, at the price of a pin the reader never asked for.
        //
        // Emit node-click event
        const eventManager = context.getEventManager?.();
        if (eventManager && this.clickState?.pointerEvent) {
            eventManager.emitNodeEvent("node-click", {
                node: this.node,
                data: this.node.data,
                event: this.clickState.pointerEvent,
            });
        }
    }

    /**
     * Public API to select this node.
     * Called by XRInputHandler when user taps on a node without dragging.
     */
    public select(): void {
        this.handleClick();
    }

    private getWorldPositionFromRay(ray: Ray): Vector3 {
        // Strategy: Plane intersection parallel to camera view
        // This maintains predictable drag behavior
        const camera = this.scene.activeCamera;
        if (!camera) {
            return this.node.mesh.position.clone();
        }

        const nodePosition = this.node.mesh.position;

        // Use stored plane normal from drag start if available
        // Otherwise fall back to current camera forward (for initial calculation)
        const cameraForward = camera.getForwardRay().direction;
        const planeNormal = this.dragState.dragPlaneNormal ?? cameraForward;

        // Calculate distance from camera to node along plane normal
        const cameraToNode = nodePosition.subtract(camera.position);
        const depth = Vector3.Dot(cameraToNode, planeNormal);

        // Create plane at node depth, with orientation from drag start
        const planePoint = camera.position.add(planeNormal.scale(depth));

        // Ray-plane intersection
        const denominator = Vector3.Dot(ray.direction, planeNormal);
        if (Math.abs(denominator) < 0.0001) {
            // Ray parallel to plane, return current position
            return this.node.mesh.position.clone();
        }

        const t = Vector3.Dot(planePoint.subtract(ray.origin), planeNormal) / denominator;

        return ray.origin.add(ray.direction.scale(t));
    }

    private isXRMode(): boolean {
        // Check if we're in an XR session
        // The scene has an xrSession property when XR is active
        const xrHelper = this.scene.metadata?.xrHelper;
        return xrHelper?.baseExperience?.state === 2; // WebXRState.IN_XR
    }

    private getContext(): GraphContext {
        // Check if parentGraph has GraphContext methods
        if ("getStyles" in this.node.parentGraph) {
            return this.node.parentGraph;
        }

        // Otherwise, it's a Graph instance which implements GraphContext
        return this.node.parentGraph;
    }

    /**
     * Cleans up event observers and releases resources.
     */
    public dispose(): void {
        // A node removed mid-drag: its drag records nothing more, and leaves nothing pending.
        this.gesture?.finish();
        this.gesture = null;
        // Leaving the roster, not searching the scene's observers: see nodePointerRosterOf.
        if (this.roster.byId.get(this.node.id) === this) {
            this.roster.byId.delete(this.node.id);
        }

        this.roster.engaged.delete(this);

        // A node removed under the pointer is no longer hovered.
        this.endHover();
    }
}

/**
 * Manages node interaction behaviors including dragging and clicking.
 * This class uses static methods to provide utility functions for node behavior management.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static utility class pattern for node behavior management
export class NodeBehavior {
    /**
     * Add default interaction behaviors to a node
     * @param node - The graph node to add behaviors to
     * @param options - Configuration options for node behaviors
     */
    static addDefaultBehaviors(node: GraphNode, options: NodeBehaviorOptions = {}): void {
        node.mesh.isPickable = true;

        // Set pinOnDrag config
        node.pinOnDrag = options.pinOnDrag ?? true;

        // ONE HANDLER FOR THE NODE'S LIFE, kept when a restyle rebuilds the mesh: it reads
        // `node.mesh` whenever it acts, so it needs nothing from the new mesh, and it holds what the
        // pointer is in the middle of. Rebuilding it on every restyle dropped a hover without
        // telling the selection, so a Hovered layer kept painting a node the pointer had left.
        node.dragHandler ??= new NodeDragHandler(node);

        this.addClickBehavior(node);
    }

    /**
     * Add click behavior for node expansion: the scene's shared action manager, see
     * {@link nodeActionManagerOf}.
     * @param node - The graph node to add click behavior to
     */
    private static addClickBehavior(node: GraphNode): void {
        node.mesh.actionManager = nodeActionManagerOf(this.getContext(node).getScene());
    }

    /**
     * Helper to get GraphContext from a Node
     * @param node - The graph node to get context from
     * @returns The graph context for the node
     */
    private static getContext(node: GraphNode): GraphContext {
        // Check if parentGraph has GraphContext methods
        if ("getStyles" in node.parentGraph) {
            return node.parentGraph;
        }

        // Otherwise, it's a Graph instance which implements GraphContext
        return node.parentGraph;
    }
}
