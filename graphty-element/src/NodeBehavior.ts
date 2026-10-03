// Installs scene.pick and scene.createPickingRay; see test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Culling/ray";

import {
    ActionManager,
    ExecuteCodeAction,
    Matrix,
    type Observer,
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
import type { Node as GraphNode, NodeIdType } from "./Node";
import { dispatcherOf } from "./session/GraphSession";
import type { Dispatcher, DispatchFunction, TransactionScope } from "./session/project/Dispatcher";

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

// Click detection thresholds
const CLICK_MAX_DURATION_MS = 300; // Maximum time for a click (vs long press/drag)
const CLICK_MAX_MOVEMENT_PX = 5; // Maximum pixels of movement for a click

/**
 * Main drag handler class - unified for both desktop and XR
 */
export class NodeDragHandler {
    private node: GraphNode;
    private dragState: DragState;
    private clickState: ClickState | null = null;
    private gesture: DragGesture | null = null;
    private scene: Scene;
    private pointerObserver: Observer<PointerInfoPre> | null = null;
    private hoverObserver: Observer<PointerInfoPre> | null = null;
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

        this.zAxisAmplification = xrConfig?.input.zAxisAmplification ?? 10.0;
        this.enableZAmplificationInDesktop = xrConfig?.input.enableZAmplificationInDesktop ?? false;

        // Setup pointer event listeners
        this.setupPointerEvents();
        this.setupHoverEvents();
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
        this.node.mesh.position.copyFrom(newPosition);
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
        this.node.mesh.position.copyFrom(newPosition);
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
                { moves: true },
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
    private setupPointerEvents(): void {
        // Listen to pointer events for node dragging and clicking
        this.pointerObserver = this.scene.onPrePointerObservable.add((pointerInfo) => {
            // Skip desktop pointer handling in XR mode - XRInputHandler handles it
            // This prevents conflicts where XR generates pointer events that the
            // desktop handler would misinterpret with wrong world position calculations
            if (this.isXRMode()) {
                return;
            }

            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN: {
                    // Check if we clicked on this node
                    const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

                    // Use nodeId from mesh metadata for comparison
                    // This works with both regular and instanced meshes
                    const pickedNodeId = pickInfo.pickedMesh?.metadata?.nodeId;

                    if (pickedNodeId === this.node.id) {
                        // Initialize click tracking
                        this.clickState = {
                            pointerDownTime: Date.now(),
                            pointerDownPosition: {
                                x: this.scene.pointerX,
                                y: this.scene.pointerY,
                            },
                            hasMoved: false,
                            pointerEvent: pointerInfo.event as PointerEvent,
                        };

                        // Get world position from pointer
                        const ray = this.scene.createPickingRay(
                            this.scene.pointerX,
                            this.scene.pointerY,
                            Matrix.Identity(),
                            this.scene.activeCamera,
                        );
                        const worldPosition = this.getWorldPositionFromRay(ray);
                        this.onDragStart(worldPosition);
                    }

                    break;
                }

                case PointerEventTypes.POINTERMOVE:
                    if (this.dragState.dragging) {
                        // Track movement for click detection
                        if (this.clickState && !this.clickState.hasMoved) {
                            const dx = this.scene.pointerX - this.clickState.pointerDownPosition.x;
                            const dy = this.scene.pointerY - this.clickState.pointerDownPosition.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance > CLICK_MAX_MOVEMENT_PX) {
                                this.clickState.hasMoved = true;
                            }
                        }

                        const ray = this.scene.createPickingRay(
                            this.scene.pointerX,
                            this.scene.pointerY,
                            Matrix.Identity(),
                            this.scene.activeCamera,
                        );
                        const worldPosition = this.getWorldPositionFromRay(ray);
                        this.onDragUpdate(worldPosition);
                    }

                    break;

                case PointerEventTypes.POINTERUP:
                    if (this.dragState.dragging) {
                        // Check if this was a click (short duration, minimal movement)
                        const wasClick = this.isClick();

                        this.onDragEnd();

                        // If it was a click, select this node
                        if (wasClick) {
                            this.handleClick();
                        }
                    }

                    // Reset click state
                    this.clickState = null;
                    break;
                default:
                    // Ignore other pointer events
                    break;
            }
        });
    }

    /**
     * Setup hover detection for emitting node-hover events.
     */
    private setupHoverEvents(): void {
        this.hoverObserver = this.scene.onPrePointerObservable.add((pointerInfo) => {
            // Skip in XR mode
            if (this.isXRMode()) {
                return;
            }

            // Only process move events for hover detection
            if (pointerInfo.type !== PointerEventTypes.POINTERMOVE) {
                return;
            }

            // Skip if we're currently dragging
            if (this.dragState.dragging) {
                return;
            }

            // Check if we're hovering over this node
            const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            const pickedNodeId = pickInfo.pickedMesh?.metadata?.nodeId;
            const isOverThisNode = pickedNodeId === this.node.id;

            // Emit node-hover when entering the node (not when already hovering)
            if (isOverThisNode && !this.isHovered) {
                this.isHovered = true;

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
            } else if (!isOverThisNode && this.isHovered) {
                // Reset hover state when leaving
                this.isHovered = false;
                this.node.hideTooltip();
            }
        });
    }

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
     * @returns True if the interaction qualifies as a click
     */
    private isClick(): boolean {
        if (!this.clickState) {
            return false;
        }

        const duration = Date.now() - this.clickState.pointerDownTime;
        return duration < CLICK_MAX_DURATION_MS && !this.clickState.hasMoved;
    }

    /**
     * Handle a click on this node - select it and emit node-click event.
     */
    private handleClick(): void {
        // Get the selection manager from the graph context
        const context = this.getContext();
        const selectionManager = context.getSelectionManager?.();
        if (selectionManager) {
            selectionManager.select(this.node);
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
     * The scene pointer observers this handler holds. A bulk teardown drops many handlers' observers
     * from the scene in one pass before disposing them, because removing one at a time searches the
     * scene's whole observer list for each (issue #543).
     * @returns The observers, none once disposed.
     */
    get sceneObservers(): Observer<PointerInfoPre>[] {
        return [this.pointerObserver, this.hoverObserver].filter((observer) => observer !== null);
    }

    /**
     * Cleans up event observers and releases resources.
     */
    public dispose(): void {
        // A node removed mid-drag: its drag records nothing more, and leaves nothing pending.
        this.gesture?.finish();
        this.gesture = null;
        if (this.pointerObserver) {
            this.scene.onPrePointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }

        if (this.hoverObserver) {
            this.scene.onPrePointerObservable.remove(this.hoverObserver);
            this.hoverObserver = null;
        }
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

        // Create unified drag handler (replaces SixDofDragBehavior)
        const dragHandler = new NodeDragHandler(node);
        node.dragHandler = dragHandler;

        this.addClickBehavior(node);
    }

    /**
     * Add click behavior for node expansion
     *
     * REGISTERED UNCONDITIONALLY, and the pair of fetchers is looked up when the reader
     * double-clicks rather than when the node is built. A consumer switches expansion on by
     * setting `element.layoutBehavior`, which can happen at any moment -- before the data
     * arrives, after it, or from a settings panel while the graph is on screen. Deciding at
     * construction meant every node already drawn kept the answer it was born with, so a
     * consumer who loaded a graph and THEN turned expansion on had a graph of nodes that ignored
     * a double-click for ever.
     * @param node - The graph node to add click behavior to
     */
    private static addClickBehavior(node: GraphNode): void {
        // click behavior setup
        const context = this.getContext(node);
        const scene = context.getScene();
        node.mesh.actionManager = node.mesh.actionManager ?? new ActionManager(scene);

        // Available triggers:
        // ActionManager.OnDoublePickTrigger
        // ActionManager.OnRightPickTrigger
        // ActionManager.OnCenterPickTrigger
        // ActionManager.OnLongPressTrigger

        // Only Graph has fetchNodes/fetchEdges, not GraphContext
        // For now, check if parentGraph is the full Graph instance
        const graph = node.parentGraph as Graph & { fetchNodes?: unknown; fetchEdges?: unknown };

        node.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnDoublePickTrigger,
                    // trigger: ActionManager.OnLongPressTrigger,
                },
                () => {
                    const { fetchNodes, fetchEdges } = graph;

                    // No fetchers means no on-demand expansion, which is the default and is not
                    // an error: a graph that holds everything it is ever going to hold has
                    // nothing to expand.
                    if (!fetchNodes || !fetchEdges) {
                        return;
                    }

                    // make sure the graph is running, unless the consumer paused it
                    context.getLayoutManager().running = true;

                    // fetch all edges for current node
                    const edgeSet = fetchEdges(node, graph as unknown as Graph);
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

                    // TODO: fetch and add secondary edges
                },
            ),
        );
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
