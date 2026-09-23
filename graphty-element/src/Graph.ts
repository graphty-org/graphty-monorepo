// Force side-effect imports to not be tree-shaken
import "./data/index"; // register all internal data sources
import "./layout/index"; // register all internal layouts
import "./algorithms/index"; // register all internal algorithms
// Babylon.js installs scene.pick and scene.beginAnimation / stopAnimation only when these load.
// test/packaging/babylon-side-effects.test.ts requires them wherever those methods are called.
import "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Animations/animatable";

import {
    AbstractMesh,
    Animation,
    Camera,
    Color4,
    CubicEase,
    EasingFunction,
    Engine,
    PhotoDome,
    PointerEventTypes,
    Quaternion,
    Scene,
    Vector3,
    WebGPUEngine,
    WebXRDefaultExperience,
} from "@babylonjs/core";
import type { GraphSnapshot } from "@graphty/graph-format";

import { ACCELERATION_MIN_NODES_DEFAULT, ACCELERATION_POLICY_DEFAULT, AccelerationController } from "./acceleration";
import { VoiceInputAdapter } from "./ai/input/VoiceInputAdapter";
import type { ApiKeyManager } from "./ai/keys";
import { GraphtyLogger, type Logger } from "./logging";

const graphLogger: Logger = GraphtyLogger.getLogger(["graphty", "graph"]);

/** What the scene is cleared to when the configured background names no colour. Whitesmoke. */
const DEFAULT_BACKGROUND_COLOR = "#F5F5F5";

/**
 * How long {@link Graph.waitForStableFrame} waits before it gives up and says so.
 *
 * Generous, because it is not a pacing device: every graph this has been measured on reaches a
 * final picture inside two and a half seconds, and the cases that do not are broken rather than
 * slow -- a data source that never answers, a render loop nothing is driving. The wait exists to
 * name that failure out loud instead of handing back a moving picture.
 */
const DEFAULT_STABLE_FRAME_TIMEOUT_MS = 30000;
import { measureBounds } from "./camera/bounds.js";
import { type CameraViewContext, cameraViewIds, isCameraViewName, resolveCameraView } from "./camera/resolve.js";
import type { CameraState, DrawingMode, GraphBounds } from "./camera/types.js";
import { type CameraController, type CameraKey, CameraManager } from "./cameras/CameraManager";
import { algorithmByKey, algorithmByLegacyKey } from "./catalog/algorithms";
import { undetectedFormat } from "./catalog/detect";
import { registeredAlgorithmByKey } from "./catalog/registry";
import type { AlgorithmKey, Scope } from "./catalog/types";
import {
    AdHocData,
    DEFAULT_SELECTION_STYLE,
    DEFAULT_VIEW_MODE,
    defaultXRConfig,
    FetchEdgesFn,
    FetchNodesFn,
    GraphBackground,
    type GraphBackgroundConfig,
    type GraphBehaviorConfig,
    GraphBehaviorOpts,
    type GraphSelectionStyleInput,
    GraphSelectionStyleOpts,
    type ViewMode,
    type XRConfig,
} from "./config";
import type { AlgorithmOnLoad } from "./config/DataConfig";
import { type PartialXRConfig, xrConfigSchema } from "./config/xr-config-schema";
import { Edge } from "./Edge";
import { GraphtyError } from "./errors";
import { EventCallbackType, EventType } from "./events";
import {
    type AddEdgesOptions,
    AlgorithmManager,
    DataManager,
    DefaultGraphContext,
    EventManager,
    type GraphContext,
    type GraphContextConfig,
    InputManager,
    type InputManagerConfig,
    LayoutManager,
    LifecycleManager,
    type Manager,
    OperationQueueManager,
    type RecordedInputEvent,
    RenderManager,
    SelectionManager,
    StatsManager,
    StylePainter,
    UpdateManager,
    type ViewMasks,
} from "./managers";
import { MeshCache } from "./meshes/MeshCache";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";
import { Node, type NodeIdType } from "./Node";
import { ScreenshotCapture } from "./screenshot/ScreenshotCapture.js";
import type { ScreenshotOptions, ScreenshotResult } from "./screenshot/types.js";
import { createElementSession, type ElementSession, type GraphSession } from "./session";
import type { Run, StartOptions } from "./session/runs";
import type { SelectionDelta, SelectionTarget, SetOp } from "./session/selection";
import type { Layer, StyleSuggestion } from "./session/styles";

/** The namespace every algorithm this package ships is registered under. */
const BUILT_IN_ALGORITHM_NAMESPACE = "graphty";
import { Styles } from "./Styles";
import { XRUIManager } from "./ui/XRUIManager";
import type { QueueableOptions, RunAlgorithmOptions } from "./utils/queue-migration";
import { XRSessionManager } from "./xr/XRSessionManager";
// import {createXrButton} from "./xr-button";

/**
 * A catalogue key the element can start as a run, and the parameters that go with it.
 *
 * Deliberately narrower than a catalogue entry: the key and the parameters are all the run path
 * reads, and a registered plugin has no entry in the built-in table to offer.
 */
interface RunnableAlgorithm {
    /** The catalogue entry, of which only the key is read. */
    readonly descriptor: { readonly key: AlgorithmKey };
    /** The parameters that reproduce what the address being translated used to do. */
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * One edge's attribute bag as the session reads it: the raw record with the two keys that named
 * its endpoints taken out.
 *
 * The session writes `id`, `source` and `target` over the bag itself, so leaving the record's own
 * endpoint keys in would publish the same two facts twice under two spellings -- and a consumer
 * that derives its columns from the keys a record carries, as the application's data table does,
 * would render both.
 *
 * Only PLAIN property names are stripped. An endpoint named by a real JMESPath expression --
 * `endpoints.from`, say -- names no top-level key, so there is nothing to take out and nothing to
 * guess about.
 * @param data - the element's data manager
 * @param index - the dense (logical) edge index
 * @returns the attribute bag, or undefined when no render object holds that row
 */
function stripEndpointKeys(data: DataManager, index: number): Record<string, unknown> | undefined {
    const record = data.edgesByIndex[index]?.data;
    if (record === undefined) {
        return undefined;
    }

    const endpoints = data.lastImport?.endpoints;
    if (endpoints === undefined) {
        return record;
    }

    const dropped = new Set([endpoints.source, endpoints.target].filter((name) => PLAIN_KEY.test(name)));
    if (dropped.size === 0) {
        return record;
    }

    return Object.fromEntries(Object.entries(record).filter(([key]) => !dropped.has(key)));
}

/** A JMESPath expression that is nothing but a top-level property name. */
const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Main orchestrator class for graph visualization and interaction.
 * Integrates Babylon.js scene management, coordinates nodes, edges, layouts, and styling.
 */
export class Graph implements GraphContext {
    styles: Styles;
    // babylon
    element: Element;
    canvas: HTMLCanvasElement;
    engine: WebGPUEngine | Engine;
    scene: Scene;
    camera: CameraManager;
    private initialCameraState?: import("./screenshot/types.js").CameraState;
    private initialCameraStateCaptured = false;
    private userCameraPresets = new Map<string, import("./screenshot/types.js").CameraState>();
    skybox?: string;
    xrHelper: WebXRDefaultExperience | null = null;
    needRays = true;
    // graph engine - delegate to LayoutManager
    pinOnDrag?: boolean;
    // graph
    fetchNodes?: FetchNodesFn;
    fetchEdges?: FetchEdgesFn;
    initialized = false;
    runAlgorithmsOnLoad = false;
    enableDetailedProfiling?: boolean;
    private wasSettled = false; // Track previous settlement state
    private resizeHandler = (): void => {
        this.engine.resize();
        // If we've already zoomed to fit, re-zoom after resize to ensure content still fits
        // if (this.updateManager.zoomToFitCompleted) {
        //     this.updateManager.enableZoomToFit();
        // }
    };

    /**
     * The one acceleration controller this graph, its session and its element share.
     *
     * Built here because it is the earliest owner both the element's `acceleration` attribute and
     * the session can reach: the element builds its Graph in its own constructor, before Lit has
     * parsed an attribute, and the Graph builds the session in its. It is disposed by
     * {@link shutdown}, so it lives and dies with the graph.
     * @since 2.0.0
     */
    readonly acceleration: AccelerationController;

    /**
     * The snapshot the graph is showing, which an accelerator may hold device buffers for.
     *
     * Null until the first freeze and again once the dataset is cleared, so a graph that never
     * loaded anything releases nothing when it shuts down and a cleared one never hands an
     * accelerator a snapshot it was already told about. There is no "has frozen" flag to ask
     * instead: the store's `stale` is true both before the first freeze and after a later edit.
     */
    #resident: GraphSnapshot | null = null;

    // Managers
    /** Event manager for adding/removing event listeners */
    readonly eventManager: EventManager;
    private renderManager: RenderManager;
    private lifecycleManager: LifecycleManager;
    private dataManager: DataManager;
    private layoutManager: LayoutManager;
    private statsManager: StatsManager;
    private updateManager: UpdateManager;
    private algorithmManager: AlgorithmManager;
    private inputManager: InputManager;
    private selectionManager: SelectionManager;

    /**
     * What the session's style stack resolved for each element, and which stack owns the paint.
     *
     * The renderer's one door onto the new style engine. Node and Edge read through it; the
     * update loop drives it from the dirty set a pass hands back. See StylePainter for the rule
     * that decides whether it or the legacy `Styles` stack is drawing.
     */
    private readonly stylePainter: StylePainter;

    /**
     * The headless model this renderer draws.
     *
     * The graph data, the coordinates, the statistics, the catalogue, what is selected, what is
     * visible and what the machine can do belong to the session; the camera, the canvas and the
     * scene belong here. The split is what makes a graph usable without a renderer at all -- and
     * it is why every data question this class answers is forwarded rather than computed.
     */
    private readonly session: ElementSession;
    operationQueue: OperationQueueManager;

    // XR managers
    private xrSessionManager: XRSessionManager | null = null;
    private xrUIManager: XRUIManager | null = null;

    // GraphContext implementation
    private graphContext: DefaultGraphContext;

    // Active video capture for cancellation support
    private activeCapture: import("./video/MediaRecorderCapture.js").MediaRecorderCapture | null = null;

    // Storage for Z positions when switching from 3D to 2D mode
    private savedZPositions = new Map<NodeIdType, number>();

    /**
     * Creates a new Graph instance and initializes the rendering engine and managers.
     * @param element - DOM element or element ID to attach the graph canvas to
     * @param useMockInput - Whether to use mock input for testing (defaults to false)
     */
    constructor(element: Element | string, useMockInput = false) {
        // Initialize EventManager first as other components depend on it
        this.eventManager = new EventManager();

        // Initialize OperationQueueManager
        this.operationQueue = new OperationQueueManager(this.eventManager, {
            concurrency: 1, // Sequential execution
            autoStart: true,
        });

        // The element's configuration document: id paths, view mode, background, layout and its
        // options, the run-on-load algorithms and the behaviour settings. It carries no style
        // layers -- those are `session.styles`.
        this.styles = Styles.default();

        this.stylePainter = new StylePainter();

        // get the element that we are going to use for placing our canvas
        if (typeof element === "string") {
            const e: Element | null = document.getElementById(element);
            if (!e) {
                throw new Error(`getElementById() could not find element '${element}'`);
            }

            this.element = e;
        } else if (element instanceof Element) {
            this.element = element;
        } else {
            throw new TypeError(
                "Graph constructor requires 'element' argument that is either a string specifying the ID of the HTML element or an Element",
            );
        }

        this.element.innerHTML = "";

        // get a canvas element for rendering
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("id", `graphty-canvas-${Date.now()}`);
        this.canvas.setAttribute("touch-action", "none");
        this.canvas.setAttribute("autofocus", "true");
        this.canvas.setAttribute("tabindex", "0");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.touchAction = "none";
        this.element.appendChild(this.canvas);

        // Initialize RenderManager
        this.renderManager = new RenderManager(this.canvas, this.eventManager);

        // Get references from RenderManager for backward compatibility
        this.engine = this.renderManager.engine;
        this.scene = this.renderManager.scene;
        this.camera = this.renderManager.camera;

        // Initialize StatsManager
        this.statsManager = new StatsManager(this.eventManager);
        this.statsManager.initializeBabylonInstrumentation(this.scene, this.engine);

        // Initialize DataManager
        this.dataManager = new DataManager(this.eventManager, this.styles);

        // ONE controller for the element, this graph and its session. Nothing is probed until
        // `start()` is called, which the element does from `connectedCallback`.
        this.acceleration = new AccelerationController({
            policy: ACCELERATION_POLICY_DEFAULT,
            minNodes: ACCELERATION_MIN_NODES_DEFAULT,
        });

        // The headless model, over the store the data manager already owns for the life of the
        // graph. It is handed that store rather than building one, because a second store would be
        // a second, disagreeing copy of the same graph -- and because the store's lifetime belongs
        // to whoever built it: disposing this session leaves the renderer's data untouched.
        //
        // The record source is the seam that will close. The store carries ids, coordinates and
        // weights; the arbitrary keys a record was imported with still live on the render objects,
        // so until an attribute column lands in the store the session reads them from here.
        this.session = createElementSession({
            acceleration: this.acceleration,
            store: this.dataManager,
            records: {
                nodeAttributes: (_index, id) => this.dataManager.getNode(id)?.data,
                // The endpoint keys are stripped HERE, at the one seam that builds the session's
                // attribute bag, rather than on the render object: `Edge.data` is the raw record
                // and that is its contract for anyone reaching through `element.graph`. Without
                // this a record pushed in spelled `src`/`dst` would show up in the data table as a
                // `src` column beside the canonical `source` one, saying the same thing twice.
                edgeAttributes: (index) => stripEndpointKeys(this.dataManager, index),
            },
            // Read, not captured: the configuration document is written in place by the
            // element's own property setters, so a captured copy would be the one that was in
            // force when the graph was built rather than the one a consumer has since set.
            config: { data: () => this.styles.config.data },
            runs: {
                // The element's own queue, so a run takes its turn among the loads, the layouts
                // and the style passes rather than interleaving with them.
                queue: this.operationQueue,
                // Late-bound on purpose: the algorithm manager is built after the session, and an
                // algorithm needs this Graph to read the data manager through. The session only
                // ever calls this once a run reaches the front of the queue.
                execute: (context) => this.algorithmManager.execute(context, algorithmByKey(context.algorithm)),
            },
        });

        // The renderer reads its paint from the session's stack from here on. Until the first
        // pass has run, an element draws itself from the element's own defaults; see
        // `bootstrapNodePaint` in StylePainter.
        this.stylePainter.bind(this.session.paint);

        // WHAT USED TO TAKE THE DIRTY SET HERE. A style edit repaints before it commits, so this
        // fired after the pass had worked out what moved -- but "after" is turns of the event
        // loop later, and the dirty set is one scratch array per element kind that the next pass
        // empties. Three passes run within a few milliseconds of each other on an ordinary load,
        // so what arrived here was routinely another pass's set. `StylePainter.bind` subscribes
        // to the pass's own announcement instead, which happens at the end of the pass and before
        // any other can begin, so no pass's elements can go missing on the way to the renderer.
        this.session.on("style:changed", (change) => {
            // TOLD, which is the other half. `style-changed` has been in the exported event
            // union and in `EventManager.addListener` throughout, and its only emitter was the
            // 1.x StyleManager, which is gone -- so a settings panel that repainted its layer
            // list when the stack moved subscribed to a documented event and waited for ever.
            //
            // The detail is COUNTS AND WORDS, never layers: it crosses to listeners that may
            // structure-clone it, and a consumer that wants the stack reads `styles.list()`.
            this.eventManager.emitGraphEvent("style-changed", {
                reason: change.reason,
                layers: change.layers.length,
                painted: change.painted,
                unresolvedPaths: [...change.unresolvedPaths],
            });
        });

        // Initialize LayoutManager
        this.layoutManager = new LayoutManager(this.eventManager, this.dataManager, this.styles);

        // The release list (WebGPU design 9.4 item 2). GPU memory is not garbage collected, so an
        // accelerator holding device buffers for a snapshot has to be TOLD when that snapshot stops
        // being the graph -- which is what a freeze does to the one before it.
        //
        // AFTER the layout manager's own subscription, deliberately: observers run in subscription
        // order, so the running simulation has already been handed the new snapshot by the time the
        // previous one's buffers are freed, and nothing ever steps a snapshot whose memory has gone.
        this.eventManager.onGraphEvent.add((event) => {
            if (event.type === "snapshot-replaced") {
                this.#resident = event.next;
                this.releaseSnapshot(event.previous);
                return;
            }

            // The other way a snapshot stops being the graph: clearing the data discards the store
            // and everything it froze WITHOUT freezing a replacement, so no `snapshot-replaced`
            // ever names it. Without this branch the snapshot that was on screen would keep its
            // device buffers for the accelerator's life -- the leak the release list exists to
            // close -- and the field would go on pointing into a store that no longer exists.
            if (event.type === "snapshot-dropped") {
                this.releaseSnapshot(this.#resident);
                this.#resident = null;
            }
        });

        // Bring the session's paint up to date once the rows a load added exist. A style pass is
        // over a dense index space, so it cannot paint a node the store has not taken yet; this is
        // the first moment it can, and it is the "everything changed, because the graph did"
        // boundary that no layer edit describes.
        this.operationQueue.registerTrigger("data-add", () => ({
            category: "style-apply",
            execute: async () => {
                await this.repaintFromSession();
            },
            description: "Repaint from the session style stack after data add",
        }));

        // Bring the paint up to date once a run has finished and its measurements exist. A layer
        // bound to `results.<runId>.<field>` reads a column the run has only just written, so the
        // run finishing is what the repaint hangs off -- and it hangs off it HERE, in the element's
        // own wiring, rather than being forced by the run executor at the end of every algorithm.
        //
        // OFF THE RUN, NOT OFF THE QUEUE CATEGORY, and the difference is a whole-graph pass per
        // edit. More than one feature queues work as "algorithm-run" -- algorithm runs today,
        // visibility changes too -- so a trigger on the category fired for every mask edit as
        // well, each of which had ALREADY repainted exactly the elements it touched, and put a
        // full pass over the graph on top of it. That is precisely the cost the dirty set exists
        // to avoid, paid on the commonest operation there is. The session announces a run
        // reaching its end, which is the fact this actually depends on, so it hangs off that
        // instead.
        this.session.on("run:changed", (change) => {
            if (change.phase !== "end") {
                return;
            }

            void this.repaintFromSession().catch((error: unknown) => {
                this.eventManager.emitGraphError(
                    this,
                    error instanceof Error ? error : new Error(String(error)),
                    "other",
                    { component: "Graph.repaintAfterRun" },
                );
            });
        });

        // Register layout-update trigger to handle positioning nodes when data is added
        this.operationQueue.registerTrigger("data-add", () => ({
            category: "layout-update",
            execute: async () => {
                // Get all nodes for positioning
                const nodes = Array.from(this.dataManager.nodes.values());
                if (nodes.length > 0 && this.layoutManager.layoutEngine) {
                    await this.layoutManager.updatePositions(nodes);
                }
            },
            description: "Update layout positions after data add",
        }));

        // Initialize UpdateManager
        this.updateManager = new UpdateManager(
            this.eventManager,
            this.statsManager,
            this.layoutManager,
            this.dataManager,
            this.camera,
            this, // GraphContext
            {
                layoutStepMultiplier: this.styles.config.behavior.layout.stepMultiplier,
                autoZoomToFit: true,
            },
        );

        // Initialize AlgorithmManager
        this.algorithmManager = new AlgorithmManager(this.eventManager, this);

        // Initialize SelectionManager
        this.selectionManager = new SelectionManager(this.eventManager);
        this.selectionManager.setDataManager(this.dataManager);
        this.selectionManager.bindSelection(this.session.selection);

        // The render loop honours the two masks from here on: what is drawn, and what is drawn as
        // selected, are answered by the model rather than by the style stack.
        const viewMasks: ViewMasks = {
            selection: {
                edges: () => this.session.selection.edgeMembers(),
                nodes: () => this.session.selection.nodeMembers(),
            },
            showContext: () => this.session.visibility.showContext,
            visibility: this.session.visibility.masks,
        };
        this.updateManager.bindViewMasks(viewMasks);

        // Set up background click handler for deselection
        this.setupBackgroundClickHandler();

        // Initialize InputManager
        const inputConfig: InputManagerConfig = {
            useMockInput: useMockInput,
            touchEnabled: true,
            keyboardEnabled: true,
            pointerLockEnabled: false,
            recordInput: false,
        };
        this.inputManager = new InputManager(
            {
                scene: this.scene,
                engine: this.engine,
                canvas: this.canvas,
                eventManager: this.eventManager,
            },
            inputConfig,
        );

        // Initialize GraphContext
        const contextConfig: GraphContextConfig = {
            pinOnDrag: this.pinOnDrag,
            enableDetailedProfiling: this.enableDetailedProfiling,
            xr: defaultXRConfig,
        };
        this.graphContext = new DefaultGraphContext(
            () => this.styles,
            this.dataManager,
            this.layoutManager,
            this.dataManager.meshCache,
            this.scene,
            this.statsManager,
            contextConfig,
            this.needRays,
        );

        // Set GraphContext on managers
        this.dataManager.setGraphContext(this);
        this.layoutManager.setGraphContext(this);

        // Setup lifecycle manager
        const managers = new Map<string, Manager>([
            ["event", this.eventManager],
            ["queue", this.operationQueue],
            ["stats", this.statsManager],
            ["render", this.renderManager],
            ["data", this.dataManager],
            ["layout", this.layoutManager],
            ["update", this.updateManager],
            ["algorithm", this.algorithmManager],
            ["input", this.inputManager],
            ["selection", this.selectionManager],
        ]);
        this.lifecycleManager = new LifecycleManager(managers, this.eventManager, [
            "event",
            "queue",
            "stats",
            "render",
            "data",
            "layout",
            "update",
            "algorithm",
            "input",
            "selection",
        ]);

        // Queue default layout early so user-specified layouts can obsolete it
        // This is queued now (in constructor) rather than in init() to ensure
        // it's the FIRST layout operation queued, allowing user operations to cancel it
        void this.setLayout("ngraph").catch((e: unknown) => {
            console.error("ERROR setting default layout:", e);
            // Emit error event for default layout failure
            this.eventManager.emitGraphError(this, e instanceof Error ? e : new Error(String(e)), "layout", {
                layoutType: "ngraph",
                isDefault: true,
            });
        });

        // Note: Algorithm running is handled in the data-added event listener below
        // rather than through operation queue triggers, because data sources bypass
        // the operation queue when adding data

        // Listen for data-added events to manage running state
        this.eventManager.addListener("data-added", (event) => {
            if (event.type === "data-added") {
                if (event.shouldStartLayout) {
                    this.layoutManager.running = true;
                    // Start tracking layout session performance
                    this.statsManager.startLayoutSession();
                }

                if (event.shouldZoomToFit) {
                    this.updateManager.enableZoomToFit();
                }

                // Run algorithms if runAlgorithmsOnLoad is true. Each is queued, not awaited.
                const { algorithms } = this.styles.config.data;
                if (this.runAlgorithmsOnLoad && algorithms && algorithms.length > 0) {
                    for (const entry of algorithms) {
                        void this.runOnLoad(entry).catch((error: unknown) => {
                            console.error(`[Graph] Error running algorithm ${JSON.stringify(entry)}:`, error);
                        });
                    }
                }
            }
        });

        // Listen for layout-initialized events to handle zoom to fit
        this.eventManager.addListener("layout-initialized", (event) => {
            if (event.type === "layout-initialized") {
                if (event.shouldZoomToFit) {
                    this.updateManager.enableZoomToFit();
                }
            }
        });

        // Default layout is now queued in constructor to ensure proper obsolescence ordering
    }

    private cleanup(): void {
        // Stop render loop if it's running
        try {
            this.engine.stopRenderLoop();
        } catch {
            // Ignore errors during cleanup
        }

        // Clean up event listeners
        window.removeEventListener("resize", this.resizeHandler);

        // Mark as not initialized
        this.initialized = false;
    }

    /**
     * Shuts down the graph, stopping animations and disposing all resources.
     */
    shutdown(): void {
        // Stop any running camera animations
        try {
            const controller = this.camera.getActiveController();
            if (controller && "pivot" in controller) {
                this.scene.stopAnimation((controller as { pivot: unknown }).pivot);
            }
            // Note: 2D animations use direct animation on dummy objects
            // and will be cleaned up when the scene is disposed
        } catch {
            // Ignore errors during animation cleanup
        }

        // Use cleanup for common operations
        this.cleanup();

        // The session goes first: it stops answering data questions, and it deliberately does NOT
        // touch the store, which belongs to the data manager the lifecycle manager is about to
        // dispose -- nor the controller, which is handed to it and released below.
        this.session.dispose();

        // The undirected copy of the resident snapshot is looked up HERE, while the data manager
        // still holds the store that cached it: disposing the managers below replaces that store,
        // and a lookup afterwards would build a fresh copy no accelerator had ever seen -- so the
        // release would free nothing and the real buffers would leak. It is looked up only when
        // there is an accelerator with a `release` to hand it to: deriving it is a full CSR
        // symmetrization of the whole edge list, and a graph that ran on the CPU must not pay for
        // one at teardown to feed a release that does nothing.
        const resident = this.#resident;
        let residentUndirected: GraphSnapshot | undefined;
        try {
            if (resident !== null && typeof this.acceleration.accelerator?.release === "function") {
                residentUndirected = this.dataManager.undirected(resident).snapshot;
            }
        } catch (error) {
            // Symmetrizing a whole edge list is the one step here that can throw, and a throw would
            // skip the manager teardown and the controller dispose below -- a leaked scene and a
            // device that is never destroyed, to avoid leaking one buffer. The release that follows
            // still frees the snapshot itself.
            console.warn("graphty: an undirected copy could not be derived for release", error);
        }

        // Dispose all managers through lifecycle manager
        this.lifecycleManager.dispose();

        // The buffers go after the managers, for the reason the controller goes after them too:
        // disposing the managers is what stops the running layout, so by now no simulation can be
        // reading the snapshot whose device memory this frees.
        this.releaseSnapshot(resident, residentUndirected);
        this.#resident = null;

        // The controller goes LAST. Disposing the managers is what stops the running layout
        // engine, and a simulation stepped after its accelerator's device had been destroyed
        // would run against a dead context.
        this.acceleration.dispose();
    }

    /**
     * Frees the accelerator's device buffers for a snapshot the graph has stopped showing.
     *
     * `release` is feature-tested, never required: `GraphAccelerator` declares it through the index
     * signature, so a third party may implement one layout and no residency at all. The undirected
     * copy is released beside the snapshot because that is the copy the device usually holds -- a
     * layout simulation loads the undirected view of every snapshot -- and is skipped when the
     * graph is undirected already, where the two are one object.
     * @param snapshot - The snapshot to release; null before the first freeze, and nothing is done.
     * @param undirected - Its undirected copy, when the caller already holds it. Left out, it is
     * looked up here -- and only once there is something to release it to, so a graph running on
     * the CPU never derives a copy nobody asked for.
     */
    private releaseSnapshot(snapshot: GraphSnapshot | null, undirected?: GraphSnapshot): void {
        const { accelerator } = this.acceleration;
        if (snapshot === null || accelerator === null) {
            return;
        }

        const { release } = accelerator;
        if (typeof release !== "function") {
            return;
        }

        // A third party's `release` is untrusted code on a teardown path: a throw here would skip
        // the controller dispose that destroys the device, so it is caught and reported, the way
        // the controller already treats `dispose()`.
        const free = (released: GraphSnapshot): void => {
            try {
                (release as (target: GraphSnapshot) => void).call(accelerator, released);
            } catch (error) {
                console.warn("graphty: an accelerator threw while releasing a snapshot", error);
            }
        };

        free(snapshot);

        const copy = undirected ?? this.dataManager.undirected(snapshot).snapshot;
        if (copy !== snapshot) {
            free(copy);
        }
    }

    /**
     * Executes all algorithms specified in the style template configuration.
     */
    async runAlgorithmsFromTemplate(): Promise<void> {
        const { algorithms } = this.styles.config.data;

        if (!this.runAlgorithmsOnLoad || !algorithms) {
            return;
        }

        const errors: Error[] = [];

        for (const entry of algorithms) {
            try {
                await this.runOnLoad(entry);
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }

        if (errors.length > 0) {
            const summaryError = new Error(
                `${errors.length} algorithm(s) failed during template execution: ${errors.map((e) => e.message).join(", ")}`,
            );

            this.eventManager.emitGraphError(this, summaryError, "algorithm", {
                errorCount: errors.length,
                component: "Graph.runAlgorithmsFromTemplate",
            });

            throw summaryError;
        }
    }

    /**
     * Run one entry of the load-time algorithm list.
     *
     * A 1.x "namespace:type" address takes the same road `runAlgorithm` does, so a plugin with no
     * catalogue descriptor still runs; a bare catalogue key goes straight to `session.runs.start`.
     * The entry's run options ride along either way, with no per-algorithm branch.
     * @param entry - An algorithm, or an algorithm with its run options.
     */
    private async runOnLoad(entry: AlgorithmOnLoad): Promise<void> {
        const { algorithm, params, ...start } = typeof entry === "string" ? { algorithm: entry } : entry;
        const separator = algorithm.indexOf(":");

        if (separator === -1) {
            await this.session.runs.start(algorithm, params, start);

            return;
        }

        await this.runLegacyAddress(
            algorithm.slice(0, separator).trim(),
            algorithm.slice(separator + 1).trim(),
            params === undefined ? undefined : { algorithmOptions: params },
            start,
        );
    }

    /**
     * Initializes the graph instance, setting up managers, styles, and rendering pipeline.
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Enable profiling if configured (needs to be done after statsManager is created but before use)
            if (this.enableDetailedProfiling) {
                this.statsManager.enableProfiling();
                // Reset measurements to only capture data from this point forward
                this.statsManager.resetMeasurements();
            }

            // The view the graph OPENS in reaches the scene here, before anything can be drawn in
            // the wrong one. See `applyOpeningViewMode` for why this line is where it is.
            this.applyOpeningViewMode();

            // The default layout is built in the constructor, before a consumer can have asked
            // for 2D, so it was given a Z axis. An opening 2D is not a transition and never
            // reaches the rebuild in `_setViewModeInternal`, so the engine is brought into line
            // here, before any data reaches it. Without this every node keeps a Z the
            // orthographic camera cannot show, and each flat 2D edge -- sized from the 3D
            // distance -- runs past its nodes into empty space.
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- applyOpeningViewMode keeps twoD in step
            await this.layoutManager.updateLayoutDimension(this.styles.config.graph.twoD);

            // Mark style-init as completed since styles are initialized in constructor
            // This satisfies cross-batch dependencies for operations like data-add
            this.operationQueue.markCategoryCompleted("style-init");

            // Initialize all managers through lifecycle manager
            await this.lifecycleManager.init();

            // The configured background reaches the scene here, whether it was set through
            // `element.background` before the element was attached or left at its default.
            if (this.styles.config.graph.background.backgroundType === "color") {
                const backgroundColor = this.styles.config.graph.background.color ?? DEFAULT_BACKGROUND_COLOR;
                this.scene.clearColor = Color4.FromHexString(backgroundColor);
            }

            // Start the graph system (render loop, etc.)
            this.lifecycleManager.startGraph(() => {
                this.update();
            });

            // Initialize XR (VR/AR) if enabled
            await this.initializeXR();

            // Watch for browser/canvas resize events
            window.addEventListener("resize", this.resizeHandler);

            this.initialized = true;

            // For layouts that settle immediately, start animations after a short delay
            setTimeout(() => {
                if (this.layoutManager.isSettled && !this.layoutManager.running) {
                    for (const node of this.dataManager.nodes.values()) {
                        node.label?.startAnimation();
                    }
                }
            }, 100);
        } catch (error) {
            // Emit error event for user handling
            this.eventManager.emitGraphError(this, error instanceof Error ? error : new Error(String(error)), "init", {
                component: "Graph",
            });

            // Clean up any partially initialized resources
            this.cleanup();

            // Re-throw with context
            throw new Error(`Failed to initialize graph: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Update method - kept for backward compatibility
     * All update logic is now handled by UpdateManager
     */
    update(): void {
        // Start frame profiling (tracks operations for blocking detection)
        this.statsManager.startFrameProfiling();

        this.statsManager.measure("Graph.update", () => {
            this.statsManager.measure("Graph.updateManager", () => {
                this.updateManager.update();
            });

            this.statsManager.measure("Graph.settlementCheck", () => {
                // Only process settlement events if there are nodes - an empty graph
                // has nothing to settle, so we shouldn't emit events or log
                if (this.dataManager.nodes.size > 0) {
                    // Check if layout has settled
                    if (this.layoutManager.isSettled && this.layoutManager.running) {
                        this.eventManager.emitGraphSettled(this);
                        this.layoutManager.running = false;

                        // Start label animations after layout has settled
                        for (const node of this.dataManager.nodes.values()) {
                            node.label?.startAnimation();
                        }

                        // Only zoom to fit on FIRST settlement after data load.
                        // Subsequent settlements (e.g., after node selection/style change)
                        // should NOT trigger zoom to fit - the user's camera position should be preserved.
                        if (!this.initialCameraStateCaptured) {
                            this.initialCameraStateCaptured = true;
                            // Force a final zoom to fit after layout has truly settled
                            this.updateManager.enableZoomToFit();

                            // Capture initial camera state after first settlement for resetCamera()
                            // Use setTimeout to allow zoom-to-fit to complete first
                            setTimeout(() => {
                                this.initialCameraState = this.getCameraState();
                            }, 100);
                        }
                    }

                    // Report performance when transitioning from unsettled to settled
                    if (this.layoutManager.isSettled && !this.wasSettled) {
                        this.wasSettled = true;
                        // End layout session tracking
                        this.statsManager.endLayoutSession();
                        const snapshot = this.statsManager.getSnapshot();
                        graphLogger.debug("Layout settled", {
                            updateCalls: snapshot.cpu.find((m) => m.label === "Graph.update")?.count ?? 0,
                        });
                        this.statsManager.reportDetailed();
                        // Reset measurements after reporting so next settlement shows fresh data
                        this.statsManager.resetMeasurements();
                    } else if (!this.layoutManager.isSettled && this.wasSettled) {
                        // Reset when layout becomes unsettled (so we can report next settlement)
                        this.wasSettled = false;
                        // Restart layout session tracking
                        this.statsManager.startLayoutSession();
                        graphLogger.debug("Layout became unsettled, will report on next settlement");
                    }
                }
            });
        });

        // End frame profiling (correlates operations with inter-frame time)
        this.statsManager.endFrameProfiling();
    }

    /**
     * Set what the graph is drawn against: a flat colour, or a photo-dome skybox.
     *
     * The colour reaches the scene's clear colour and a skybox builds a `PhotoDome` around the
     * graph, announcing `skybox-loaded` once its texture has arrived. The value is also written
     * into the configuration document, so a later read of `styles.config.graph.background` and a
     * rebuild of the scene both see what was asked for.
     * @param background - A colour (`{backgroundType: "color", color}`) or a skybox
     *     (`{backgroundType: "skybox", data}`), where `data` is an image URL or a base64 PNG.
     */
    setBackground(background: GraphBackgroundConfig): void {
        // Parsed rather than trusted, because this is a public door: a CSS colour name arrives
        // here and the renderer needs the hex the rest of the element works in.
        const parsed = GraphBackground.parse(background);

        this.styles.config.graph.background = parsed;

        if (parsed.backgroundType === "skybox") {
            const skyboxUrl = parsed.data;
            const photoDome = new PhotoDome("testdome", skyboxUrl, { resolution: 32, size: 500 }, this.scene);

            photoDome.texture.onLoadObservable.addOnce(() => {
                this.eventManager.emitGraphEvent("skybox-loaded", {
                    graph: this,
                    url: skyboxUrl,
                });
            });

            return;
        }

        this.scene.clearColor = Color4.FromHexString(parsed.color ?? DEFAULT_BACKGROUND_COLOR);
    }

    /**
     * Set what a selected node looks like: its halo's colour, how far it stands out past the
     * node, and how solid it is.
     *
     * MERGED, NOT REPLACED: naming the colour leaves the scale and the opacity where they were.
     * It takes effect immediately, on a selection that is already on screen as well as on the
     * next one.
     *
     * THE HALO IS NOT A STYLE LAYER, deliberately. A selection is what a person is pointing at
     * rather than a property of the data, so it is drawn by the renderer from the selection mask
     * and its appearance is configuration. See `GraphStyle`'s own note for why a layer would be
     * the wrong shape.
     * @param selection - The fields to change. Anything omitted keeps its current value.
     * @throws A Zod error when a value is outside what the schema allows -- a scale that is not
     *     positive, an opacity outside `[0, 1]`, a colour the element cannot read.
     */
    setSelectionStyle(selection: GraphSelectionStyleInput): void {
        const current = this.styles.config.graph.selection ?? DEFAULT_SELECTION_STYLE;

        this.styles.config.graph.selection = GraphSelectionStyleOpts.parse({ ...current, ...selection });

        for (const node of this.dataManager.nodes.values()) {
            node.refreshSelectionOverlay();
        }
    }

    /**
     * Set how the element drives the layout.
     *
     * MERGED, NOT REPLACED, and one level deep on purpose: a caller naming `layout.preSteps`
     * means that field and not "reset every other pacing setting to its default", which is what
     * parsing a partial document against a schema of defaults would do.
     *
     * The settings take effect on the next layout the element runs. `preSteps` is read when a
     * layout starts, so setting it after a graph has already settled changes nothing that is
     * already on screen.
     * @param behavior - The fields to change. Anything omitted keeps its current value.
     */
    setLayoutBehavior(behavior: GraphBehaviorConfig): void {
        const current = this.styles.config.behavior;

        const parsed = GraphBehaviorOpts.parse({
            ...current,
            ...behavior,
            layout: { ...current.layout, ...(behavior.layout ?? {}) },
            node: { ...current.node, ...(behavior.node ?? {}) },
        });

        this.styles.config.behavior = parsed;

        // ON-DEMAND EXPANSION IS SWITCHED ON HERE, and it is the only place it can be. The two
        // fetchers are declared in the behaviour schema, so a consumer sets them the same way
        // they set the pacing settings -- and `NodeBehavior` reads them off this object's own
        // fields. Nothing used to carry them across, so the setting parsed, was stored, and was
        // never read: double-clicking a node did nothing, in every version that published the
        // property.
        this.fetchNodes = parsed.fetchNodes as FetchNodesFn | undefined;
        this.fetchEdges = parsed.fetchEdges as FetchEdgesFn | undefined;
    }

    /**
     * Adds graph data from a registered data source.
     *
     * PAINTS WHAT IT LOADED, and that is not incidental. Data reaches the element two ways and a
     * consumer chooses between them by which method they call: records handed in through
     * `addNodes`/`setEdges`, which are queued operations, or a file, string or URL read by a data
     * source, which is this method and which deliberately bypasses the queue (`DataManager`
     * streams chunks straight into the store so a large file does not queue an operation per
     * chunk). The element's whole-graph repaint hangs off the QUEUED path, so a graph
     * loaded this way was never painted from the style stack at all: every node and edge kept the
     * bootstrap appearance `DataManager` gives it at construction, `styleOf` answered `{}`, and
     * `styles.explain(...)` truthfully reported that no layer -- not even the element's own
     * defaults -- had painted anything. The picture happened to resemble the default layer's
     * colour, so it read as success until a story asked for something else.
     *
     * The repaint is here, once per load, rather than on the `data-added` event, which fires per
     * chunk and per kind and would put a whole-graph pass behind each one.
     *
     * A load that fails part-way still paints: the rows that did arrive are in the store and on
     * screen, so leaving them unpainted would be the same defect with a smaller blast radius.
     * @param type - Type/name of the registered data source
     * @param opts - Options to pass to the data source
     * @returns Promise that resolves when data is loaded
     */
    async addDataFromSource(type: string, opts: object = {}): Promise<void> {
        try {
            await this.dataManager.addDataFromSource(type, opts);
        } finally {
            // The load's own failure is the one a caller is told about, so a repaint that throws
            // is reported on the error channel rather than replacing it.
            await this.repaintFromSession().catch((error: unknown) => {
                this.eventManager.emitGraphError(
                    this,
                    error instanceof Error ? error : new Error(String(error)),
                    "other",
                    { component: "Graph.addDataFromSource", dataSourceType: type },
                );
            });
        }
    }

    /**
     * Load graph data from a File object with auto-format detection
     * @param file - File object from file input
     * @param options - Loading options
     * @param options.format - Explicit format override (e.g., "graphml", "json")
     * @param options.nodeIdPath - JMESPath for node ID extraction
     * @param options.edgeSource - Where the node an edge starts at is named in the record. Left
     *     unset, the element reads `source`, then `src`, then `from`
     * @param options.edgeTarget - Where the node an edge ends at is named in the record
     */
    async loadFromFile(
        file: File,
        options?: {
            format?: string;
            nodeIdPath?: string;
            edgeSource?: string;
            edgeTarget?: string;
        },
    ): Promise<void> {
        const { detectFormat } = await import("./data/format-detection.js");

        // Detect format if not explicitly provided
        let format = options?.format;

        if (!format) {
            // Read first 2KB for format detection
            const sample = await file.slice(0, 2048).text();
            const detected = detectFormat(file.name, sample);

            if (!detected) {
                throw undetectedFormat(file.name, 'loadFromFile(file, { format: "graphml" })');
            }

            format = detected;
        }

        // Read full file content
        const content = await file.text();

        // Load using appropriate DataSource
        await this.addDataFromSource(format, {
            data: content,
            filename: file.name,
            size: file.size,
            ...options,
        });
    }

    /**
     * Load graph data from a URL with auto-format detection
     * @remarks
     * This method attempts to detect the format from the URL extension first.
     * If the extension is not recognized (e.g., `.txt`), it fetches the content
     * and uses content-based detection. The content is then passed directly to
     * the data source to avoid a double-fetch.
     * @param url - URL to fetch graph data from
     * @param options - Loading options
     * @param options.format - Explicit format override (e.g., "graphml", "json")
     * @param options.nodeIdPath - JMESPath for node ID extraction
     * @param options.edgeSource - Where the node an edge starts at is named in the record. Left
     *     unset, the element reads `source`, then `src`, then `from`
     * @param options.edgeTarget - Where the node an edge ends at is named in the record
     * @example
     * ```typescript
     * // Auto-detect format from extension
     * await graph.loadFromUrl("https://example.com/data.graphml");
     *
     * // Auto-detect from content when extension doesn't match
     * await graph.loadFromUrl("https://example.com/data.txt");
     *
     * // Explicitly specify format
     * await graph.loadFromUrl("https://example.com/data.txt", { format: "graphml" });
     * ```
     */
    async loadFromUrl(
        url: string,
        options?: {
            format?: string;
            nodeIdPath?: string;
            edgeSource?: string;
            edgeTarget?: string;
        },
    ): Promise<void> {
        const { detectFormat } = await import("./data/format-detection.js");

        let format = options?.format;
        let fetchedContent: string | undefined;

        if (!format) {
            // First try extension-based detection (no fetch needed)
            const detectedFromExtension = detectFormat(url, "");

            if (detectedFromExtension) {
                format = detectedFromExtension;
            } else {
                // Extension didn't match - fetch content for detection
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL '${url}': ${response.status} ${response.statusText}`);
                }

                fetchedContent = await response.text();

                const sample = fetchedContent.slice(0, 2048);
                const detectedFromContent = detectFormat(url, sample);

                if (!detectedFromContent) {
                    throw undetectedFormat(url, 'loadFromUrl(url, { format: "graphml" })');
                }

                format = detectedFromContent;
            }
        }

        // Merge graph config with explicit options (explicit options take precedence)
        // A key is only carried when there is something to say. `edgeSource: undefined` would
        // reach the load as a declared-and-empty override and turn the probe off for a file that
        // named nothing, which is the failure this release exists to remove.
        const configured = this.styles.config.data.knownFields;
        const edgeSource = options?.edgeSource ?? configured.edgeSrcIdPath;
        const edgeTarget = options?.edgeTarget ?? configured.edgeDstIdPath;
        const mergedOptions = {
            nodeIdPath: options?.nodeIdPath ?? configured.nodeIdPath,
            ...(edgeSource === null ? {} : { edgeSource }),
            ...(edgeTarget === null ? {} : { edgeTarget }),
        };

        // If we already fetched content for detection, pass it as data to avoid double-fetch
        // Otherwise pass URL and let DataSource handle the fetch
        if (fetchedContent !== undefined) {
            await this.addDataFromSource(format, {
                data: fetchedContent,
                ...mergedOptions,
            });
        } else {
            await this.addDataFromSource(format, {
                url,
                ...mergedOptions,
            });
        }
    }

    /**
     * Add a single node to the graph.
     * @param node - Node data object to add
     * @param idPath - Key to use for node ID (default: "id")
     * @param options - Queue options for operation ordering
     */
    async addNode(node: AdHocData, idPath?: string, options?: QueueableOptions): Promise<void> {
        await this.addNodes([node], idPath, options);
    }

    /**
     * Add nodes to the graph incrementally.
     * @remarks
     * This method ADDS nodes to the existing graph without removing existing nodes.
     * For complete replacement, use the `nodeData` property on the web component instead.
     *
     * Nodes are added to the current layout and will animate into position if
     * a force-directed layout is active.
     * @param nodes - Array of node data objects to add
     * @param idPath - Key to use for node IDs (default: "id")
     * @param options - Queue options for operation ordering
     * @returns Promise that resolves when nodes are added
     * @since 1.0.0
     * @see {@link addEdges} for adding edges
     * @see {@link https://graphty.app/storybook/element/?path=/story/data--default | Data Loading Examples}
     * @example
     * ```typescript
     * // Add nodes with default ID field
     * await graph.addNodes([
     *   { id: 'node-1', label: 'First Node', category: 'A' },
     *   { id: 'node-2', label: 'Second Node', category: 'B' }
     * ]);
     *
     * // Add nodes with custom ID field
     * await graph.addNodes(
     *   [{ nodeId: 'n1', name: 'Node One' }],
     *   'nodeId'
     * );
     *
     * // Wait for layout to settle after adding
     * await graph.addNodes(newNodes);
     * await graph.waitForSettled();
     * graph.zoomToFit();
     * ```
     */
    async addNodes(
        nodes: Record<string | number, unknown>[],
        idPath?: string,
        options?: QueueableOptions,
    ): Promise<void> {
        if (options?.skipQueue) {
            this.dataManager.addNodes(nodes, idPath);
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "data-add",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                this.dataManager.addNodes(nodes, idPath);
            },
            {
                description: `Adding ${nodes.length} nodes`,
                ...options,
            },
        );
    }

    /**
     * Add a single edge to the graph.
     * @param edge - Edge data object to add
     * @param options - The endpoint expressions, the repeat policy, and queue ordering
     */
    async addEdge(edge: AdHocData, options?: AddEdgesOptions & QueueableOptions): Promise<void> {
        await this.addEdges([edge], options);
    }

    /**
     * Add edges to the graph incrementally.
     * @remarks
     * This method ADDS edges to the existing graph without removing existing edges.
     * Source and target nodes should exist before adding edges, otherwise the edges
     * will reference non-existent nodes.
     *
     * Edges connect nodes and can optionally store additional data accessible
     * via `edge.data`.
     * @param edges - Array of edge data objects to add
     * @param options - The endpoint expressions, the repeat policy, and queue ordering. With no
     *     `source` and `target` named, the element reads `source`/`target`, then `src`/`dst`, then
     *     `from`/`to`, deciding once for the whole batch and throwing
     *     `E_EDGE_ENDPOINTS_UNRESOLVED` when none of them answers
     * @returns Promise that resolves when edges are added
     * @since 1.0.0
     * @see {@link addNodes} for adding nodes first
     * @see {@link https://graphty.app/storybook/element/?path=/story/data--default | Data Loading Examples}
     * @example
     * ```typescript
     * // Add edges with default source/target fields
     * await graph.addEdges([
     *   { source: 'node-1', target: 'node-2', weight: 1.5 },
     *   { source: 'node-2', target: 'node-3', weight: 2.0 }
     * ]);
     *
     * // Add edges naming the endpoint fields explicitly
     * await graph.addEdges(
     *   [{ start: 'a', end: 'b', label: 'connects' }],
     *   { source: 'start', target: 'end' }
     * );
     *
     * // Add nodes and edges together
     * await graph.addNodes([{id: 'a'}, {id: 'b'}]);
     * await graph.addEdges([{source: 'a', target: 'b'}]);
     * ```
     */
    async addEdges(
        edges: Record<string | number, unknown>[],
        options?: AddEdgesOptions & QueueableOptions,
    ): Promise<void> {
        if (options?.skipQueue) {
            this.dataManager.addEdges(edges, options);
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "data-add",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                this.dataManager.addEdges(edges, options);
            },
            {
                description: `Adding ${edges.length} edges`,
                ...options,
            },
        );
    }

    /**
     * Replace every edge in the graph with a new set.
     *
     * This is what the `edge-data` property does, and it has to REPLACE rather than append. Under
     * the repeat policy's `keep` default, an additive setter would double every edge already
     * present each time a host re-assigned the property -- and a host that re-renders on state
     * change re-assigns it constantly. The old drop guard was silently doing this job; deleting the
     * guard without this would have turned "assign the same edges twice" into "hold them twice".
     * @param edges - the edges the graph should hold afterwards
     * @param options - The endpoint expressions, the repeat policy, and queue ordering
     * @returns Promise that resolves once the graph holds exactly these edges
     */
    async setEdges(
        edges: Record<string | number, unknown>[],
        options?: AddEdgesOptions & QueueableOptions,
    ): Promise<void> {
        const replace = (): void => {
            for (const id of [...this.dataManager.edges.keys()]) {
                this.dataManager.removeEdge(id);
            }

            this.dataManager.addEdges(edges, options);
        };

        if (options?.skipQueue) {
            replace();
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "data-add",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                replace();
            },
            {
                description: `Replacing the graph's edges with ${edges.length}`,
                ...options,
            },
        );
    }

    /**
     * Set the layout algorithm and configuration.
     * @remarks
     * Available layouts:
     * - `ngraph`: Force-directed (3D optimized, recommended for general use)
     * - `d3-force`: Force-directed (2D, web standard)
     * - `circular`: Nodes arranged in a circle
     * - `grid`: Nodes arranged in a grid
     * - `hierarchical`: Tree/DAG layout
     * - `random`: Random positions (useful for testing)
     * - `fixed`: Use pre-defined positions from node data
     *
     * Layout changes are queued and execute in order. The layout will
     * animate nodes from their current positions to new positions.
     * @param type - Layout algorithm name
     * @param opts - Layout-specific configuration options
     * @param options - Options for operation queue behavior
     * @returns Promise that resolves when layout is initialized
     * @since 1.0.0
     * @see {@link waitForSettled} to wait for layout completion
     * @see {@link https://graphty.app/storybook/element/?path=/story/layout--default | 3D Layout Examples}
     * @see {@link https://graphty.app/storybook/element/?path=/story/layout2d--default | 2D Layout Examples}
     * @example
     * ```typescript
     * // Use force-directed layout with custom settings
     * await graph.setLayout('ngraph', {
     *   springLength: 100,
     *   springCoefficient: 0.0008,
     *   gravity: -1.2,
     *   dimensions: 3
     * });
     *
     * // Wait for layout to settle then zoom to fit
     * await graph.waitForSettled();
     * graph.zoomToFit();
     *
     * // Switch to circular layout
     * await graph.setLayout('circular', { radius: 5 });
     * ```
     */
    async setLayout(type: string, opts: object = {}, options?: QueueableOptions): Promise<void> {
        if (options?.skipQueue) {
            await this.layoutManager.setLayout(type, opts);
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "layout-set",
            async (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                await this.layoutManager.setLayout(type, opts);
            },
            {
                description: `Setting layout to ${type}`,
                ...options,
            },
        );
    }

    /**
     * Run a graph algorithm, addressed the 1.10 way.
     * @remarks
     * Algorithms are identified by namespace and type (e.g., `graphty:degree`). What the run
     * produces is published on the run itself and addressed at `results.<runId>.<field>`, which
     * is what a style selector reads; nothing is written onto a node.
     *
     * Available algorithms by category:
     * - **Centrality**: degree, betweenness, closeness, pagerank, eigenvector
     * - **Community**: louvain, label-propagation, leiden
     * - **Components**: connected-components, strongly-connected
     * - **Traversal**: bfs, dfs
     * - **Shortest Path**: dijkstra, bellman-ford
     * - **Spanning Tree**: prim, kruskal
     * - **Flow**: max-flow, min-cut
     * @deprecated Since 2.0. Use {@link Graph.run}, which returns a `Run`: the result is on the
     *   object the call hands back, the work reports progress and can be cancelled, and the
     *   result is addressed at `results.<runId>.<field>`. This method still works and is
     *   expressed in terms of `run`, so it produces the same run and the same result; what it
     *   cannot give back is the run object those three things hang off.
     * @param namespace - Algorithm namespace (e.g., "graphty")
     * @param type - Algorithm type (e.g., "degree", "pagerank")
     * @param options - Algorithm options and queue settings
     * @returns Promise that resolves when algorithm completes
     * @since 1.0.0
     * @see {@link Graph.run} for the verb that replaces this one
     * @see {@link applySuggestedStyles} to visualize results
     * @see {@link https://graphty.app/storybook/element/?path=/story/algorithms-centrality--degree | Centrality Examples}
     * @see {@link https://graphty.app/storybook/element/?path=/story/algorithms-community--louvain | Community Detection}
     * @example
     * ```typescript
     * // This entry point starts the work and hands nothing back. Everything below reads the
     * // result through the session, which is where a run publishes what it measured.
     * await graph.runAlgorithm('graphty', 'degree');
     *
     * const session = graph.getSession();
     * const [run] = session.runs.list();
     *
     * // What it measured, per node and as a whole
     * console.log(run.result?.node('node-1'));
     * console.log(run.result?.summary().max);
     *
     * // Paint from it. The selector is written by the element, scoped to the elements the run
     * // measured, so a node the run never reached is not painted.
     * await session.styles.encode({ run: run.id, channel: 'node.color' });
     * ```
     */
    async runAlgorithm(namespace: string, type: string, options?: RunAlgorithmOptions): Promise<void> {
        await this.runLegacyAddress(namespace, type, options);
    }

    /**
     * Run an algorithm addressed the 1.10 way, through the 2.0 run machinery where it reaches.
     *
     * Private, and called both by the deprecated public {@link Graph.runAlgorithm} and by the
     * `runAlgorithmsOnLoad` template path, so that the internal caller is not reaching for a
     * method the element is telling consumers to stop using.
     * @param namespace - Algorithm namespace.
     * @param type - Algorithm type, which is the 1.10 registry key.
     * @param options - Algorithm options and queue settings.
     * @param start - Run options for a catalogue run, such as `style`; a plugin without a
     *     descriptor has no run to give them to.
     */
    private async runLegacyAddress(
        namespace: string,
        type: string,
        options?: RunAlgorithmOptions,
        start?: StartOptions,
    ): Promise<void> {
        const mapping = namespace === BUILT_IN_ALGORITHM_NAMESPACE ? algorithmByLegacyKey(type) : undefined;

        if (mapping !== undefined) {
            await this.runLegacyAsRun(mapping, namespace, type, options, start);

            return;
        }

        /* A PLUGIN THAT PUBLISHED A DESCRIPTOR IS STARTED AS A RUN, exactly as a built-in is.
           That is what declaring one buys: progress, cancellation, a cost estimate before the
           click, a result object with a ranking and a summary and a reading, and the styling the
           element derives from the result's shape. None of it was reachable while the catalogue
           was closed, so a plugin could compute something and nothing could ask for it. */
        const registered = registeredAlgorithmByKey(`${namespace}:${type}`) ?? registeredAlgorithmByKey(type);

        if (registered !== undefined) {
            await this.runLegacyAsRun(
                { descriptor: registered.descriptor, params: {} },
                namespace,
                type,
                options,
                start,
            );

            return;
        }

        // A key nothing in the catalogue carries: a plugin registered through `Algorithm.register`
        // that declared no descriptor. It takes the 1.10 path, which addresses the registry
        // directly, and gets none of what a run offers -- which is the trade its author made by
        // not declaring one.
        /* A PLUGIN'S WRITES NEED THE REPAINT ASKED FOR HERE. A catalogue algorithm runs as a
           session run, and the session announcing that run's end is what brings the picture up
           to date. A plugin has no run to announce: it writes straight onto the element's node
           and edge records, which the session reads as attributes, so a layer selecting on one
           of those paths would go on showing the picture from before the algorithm without this.
           Asked for HERE, where a plugin is known to have just written, rather than from a
           trigger on the whole queue category -- visibility edits share that category, and each
           had already repainted exactly what it touched. */
        if (options?.skipQueue) {
            await this.algorithmManager.runAlgorithm(namespace, type, options.algorithmOptions);

            if (options.applySuggestedStyles) {
                this.applySuggestedStyles(`${namespace}:${type}`);
            }

            await this.repaintFromSession();

            return;
        }

        await this.operationQueue.queueOperationAsync(
            "algorithm-run",
            async (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                await this.algorithmManager.runAlgorithm(namespace, type, options?.algorithmOptions);
                if (options?.applySuggestedStyles) {
                    this.applySuggestedStyles(`${namespace}:${type}`);
                }

                await this.repaintFromSession();
            },
            {
                description: `Running ${namespace}:${type} algorithm`,
                ...options,
            },
        );
    }

    /**
     * Start an algorithm and get back something a caller can watch, stop and read.
     *
     * This is the verb {@link Graph.runAlgorithm} should have been. It returns a `Run`: an object
     * with an identity, a label, live progress, a `cancel()` and a promise that resolves to the
     * result. Awaiting it gives the result; not awaiting it is safe, because a run is a
     * `PromiseLike` rather than a `Promise` subclass and a failure nobody awaited cannot reach
     * the window as an unhandled rejection.
     * @param algorithm - Which algorithm to run, by its catalogue key such as "betweenness".
     * @param params - Its parameters, as the catalogue declares them.
     * @param options - The scope, the seed, the id, the signal and the progress handler.
     * @returns The run.
     * @since 2.0.0
     * @example
     * ```typescript
     * const run = graph.run("betweenness");
     * run.cancel();                                   // a Cancel button, wired
     * const result = await graph.run("degree");
     * console.log(result.summary().top);              // the ten highest, already ranked
     * ```
     */
    run(algorithm: AlgorithmKey, params?: Record<string, unknown>, options?: StartOptions): Run {
        return this.session.runs.start(algorithm, params, options);
    }

    /**
     * Run a 1.10 algorithm key through the run machinery.
     *
     * One implementation, reached three ways: a built-in's old address translated into the
     * catalogue key and the parameters that reproduce what that address used to do -- `scc` is
     * `components` at `{ strength: "strong" }`, not a rename -- and a registered plugin, whose
     * key needs no translation. Everything after that is an ordinary run.
     *
     * Takes the KEY and the parameters rather than a built-in catalogue entry, because those two
     * are all it reads and a plugin has no entry in that table to offer.
     * @param mapping - The catalogue key to start, and the parameters it needs.
     * @param namespace - The 1.10 namespace, for the error event and the suggested styles.
     * @param type - The 1.10 type, for the same two.
     * @param options - What the caller passed.
     * @param start - Run options to start it with, such as `style`.
     */
    private async runLegacyAsRun(
        mapping: RunnableAlgorithm,
        namespace: string,
        type: string,
        options?: RunAlgorithmOptions,
        start?: StartOptions,
    ): Promise<void> {
        try {
            const run = this.session.runs.start(
                mapping.descriptor.key,
                { ...mapping.params, ...options?.algorithmOptions },
                { ...start, queue: options?.skipQueue === true ? "now" : "append" },
            );

            // Inside `batchOperations`, the queue holds everything until the batch closes -- which
            // happens AFTER the batching function returns. Awaiting the run here would wait for
            // work that cannot start until this call has already returned, so the 1.10 contract is
            // kept instead: the call resolves, the work lands with the batch, and
            // `batchOperations` is what the caller awaits. `graph.run()` hands back the run
            // itself, so a caller that wants the result awaits that and gets it either way.
            if (!this.operationQueue.isInBatchMode()) {
                await run;
            }
        } catch (error) {
            const algorithmError = error instanceof Error ? error : new Error(String(error));

            this.eventManager.emitGraphError(this, algorithmError, "algorithm", {
                algorithm: `${namespace}:${type}`,
                component: "AlgorithmManager",
            });

            throw algorithmError;
        }

        if (options?.applySuggestedStyles) {
            this.applySuggestedStyles(`${namespace}:${type}`);
        }
    }

    /**
     * Paint what an algorithm's finished runs suggest be drawn from them.
     *
     * DERIVED, NOT WRITTEN OUT. A run already declares its result shape and its fields, and that
     * is everything a first picture needs: a node metric suggests a sequential colour over the
     * nodes it measured, a community suggests a categorical one, a route or a chosen set suggests
     * a highlight, and a table of pairs suggests nothing at all. There is one derivation for
     * every algorithm rather than a block per algorithm, so there is no per-algorithm branch that
     * can paint the elements its own run measured nothing about.
     *
     * CALLING THIS IS USUALLY UNNECESSARY, and never harmful. A run paints itself on its FIRST
     * completion through the session's auto-apply policy, and applying a suggestion again
     * replaces the layer already bound to that run and channel rather than stacking a second one
     * on it. So this is the verb for a run that was started with `{ style: false }`, or for
     * putting a picture back after a reader cleared it.
     *
     * THE LAST ALGORITHM NAMED IS THE ONE A READER SEES. Two algorithms of the same shape suggest
     * the same channel -- a node metric and a community both paint `node.color` -- so which of
     * them makes the picture is decided by which layer sits higher in the stack, and nothing
     * else. This call puts the layers it applied on top in the order they were named, which is
     * the order the argument reads in. Without that, a suggestion that replaced an
     * already-applied layer kept that layer's place, and the place it had was the order the RUNS
     * FINISHED in -- so `applySuggestedStyles(["pagerank", "louvain"])` painted a PageRank
     * picture whenever PageRank happened to finish last, and a Louvain one whenever it did not.
     * @param algorithmKey - A catalogue key such as "degree", a 1.10 address such as
     *     "graphty:degree", or an array of either.
     * @returns True when at least one suggestion was applied, false when no finished run of that
     *     algorithm has anything per element to paint.
     */
    applySuggestedStyles(algorithmKey: string | string[]): boolean {
        const keys = Array.isArray(algorithmKey) ? algorithmKey : [algorithmKey];
        const applied: PromiseLike<readonly Layer[]>[] = [];

        for (const key of keys) {
            for (const suggestion of this.getSuggestedStyles(key)) {
                const edit =
                    suggestion.as === "highlight"
                        ? this.session.styles.highlight(suggestion.spec)
                        : this.session.styles.encode(suggestion.spec).then((layer) => [layer]);

                // Fire and forget with the refusal reported, for the reason the auto-apply policy
                // gives: a style edit is a queued run, and a caller must not have to await the
                // picture in order to have started the work. A refusal that reached nobody is what
                // this whole system replaces, so it is announced rather than swallowed.
                applied.push(
                    edit.then(
                        (layers) => layers,
                        (error: unknown) => {
                            this.eventManager.emitGraphError(
                                this,
                                error instanceof Error ? error : new Error(String(error)),
                                "other",
                                { algorithm: key, component: "Graph.applySuggestedStyles" },
                            );

                            return [];
                        },
                    ),
                );
            }
        }

        if (applied.length > 0) {
            void this.#stackSuggestionsInOrder(applied);
        }

        return applied.length > 0;
    }

    /**
     * Put the layers one `applySuggestedStyles` call produced on top of the stack, in call order.
     *
     * Waits for every edit rather than moving each as it lands, because the layers only have to
     * be ordered once they all exist -- and because a call whose layers are ALREADY the top of
     * the stack in the right order must cost nothing. That is the common case: a first
     * application appends, so there is nothing to move and no second repaint to pay for.
     * @param applied - What each edit produced, in the order the caller named the algorithms.
     */
    async #stackSuggestionsInOrder(applied: readonly PromiseLike<readonly Layer[]>[]): Promise<void> {
        const produced = (await Promise.all(applied)).flat().map((layer) => layer.id);
        const current = this.session.styles.list().map((layer) => layer.id);
        const present = new Set(current);

        // A LAYER CAN BE GONE BY THE TIME EVERY EDIT HAS LANDED, and that is ordinary rather than
        // an error: `highlight()` is exclusive, so two algorithms suggesting a highlight in one
        // call leaves only the second one's layers in the stack. Moving a layer that is no longer
        // there would report a refusal for something the element itself did on purpose.
        const wanted = produced.filter((id) => present.has(id));

        if (wanted.length < 1) {
            return;
        }

        const top = current.slice(current.length - wanted.length);

        if (top.length === wanted.length && top.every((id, at) => id === wanted[at])) {
            return;
        }

        for (const id of wanted) {
            try {
                await this.session.styles.move(id, null);
            } catch (error: unknown) {
                this.eventManager.emitGraphError(
                    this,
                    error instanceof Error ? error : new Error(String(error)),
                    "other",
                    { component: "Graph.applySuggestedStyles" },
                );
            }
        }
    }

    /**
     * What an algorithm's finished runs suggest be drawn from them, without painting any of it.
     * @param algorithmKey - A catalogue key such as "degree", or a 1.10 address such as
     *     "graphty:degree".
     * @returns One suggestion per channel a run of that algorithm would paint, empty when it has
     *     finished no run or its result is read rather than painted.
     */
    getSuggestedStyles(algorithmKey: string): readonly StyleSuggestion[] {
        const suggestions: StyleSuggestion[] = [];

        for (const run of this.#finishedRunsOf(algorithmKey)) {
            suggestions.push(...run.suggestEncodings());
        }

        return suggestions;
    }

    /**
     * The finished runs an algorithm address names.
     *
     * Two addresses reach the same runs: the catalogue key a run records, and the 1.10
     * "namespace:type" address the deprecated entry points still take. Translating here rather
     * than at each caller is what keeps "one capability, one picture" true of the old door as
     * well as the new one.
     * @param algorithmKey - The catalogue key or the 1.10 address.
     * @returns The runs of that algorithm that succeeded, oldest first.
     */
    #finishedRunsOf(algorithmKey: string): readonly Run[] {
        const [namespace, type] = algorithmKey.includes(":") ? algorithmKey.split(":") : ["", algorithmKey];
        const mapped = namespace === BUILT_IN_ALGORITHM_NAMESPACE ? algorithmByLegacyKey(type) : undefined;
        const wanted = mapped?.descriptor.key ?? (namespace === "" ? algorithmKey : type);

        return this.session.runs.list().filter((run) => run.algorithm === wanted && run.status === "succeeded");
    }

    /**
     * Remove nodes from the graph by their IDs, and with them every edge attached to one.
     *
     * One `elements-removed` event is emitted per call, naming the nodes and every edge
     * that went with them. A removal used to be silent, so a consumer watching the element saw its
     * counts change with nothing to say why; cascading the incident edges made that gap bigger,
     * which is why the notification lands with the cascade rather than after it.
     * @param nodeIds - Array of node IDs to remove
     * @param options - Queue options for operation ordering
     */
    async removeNodes(nodeIds: (string | number)[], options?: QueueableOptions): Promise<void> {
        const removeAll = (): void => {
            // THE SELECTION IS TOLD FIRST, and that ordering is the whole of it. The session's
            // masks are keyed by dense index; an id is resolved to an index through the current
            // snapshot. Once the builder has tombstoned these rows, the next freeze compacts and
            // every surviving edge slides down -- so a mask still holding the dead indices would
            // silently be holding the SURVIVORS instead, and a removal would leave two edges the
            // reader never selected highlighted on screen.
            const doomedNodes = new Set<string | number>(nodeIds);
            const doomedEdges: string[] = [];
            for (const edge of this.dataManager.edges.values()) {
                if (doomedNodes.has(edge.srcId) || doomedNodes.has(edge.dstId)) {
                    doomedEdges.push(edge.id);
                }
            }

            this.selectionManager.onEdgesRemoved(doomedEdges);

            const removedNodes: NodeIdType[] = [];
            const removedEdges: string[] = [];

            for (const id of nodeIds) {
                // Check if the node being removed is selected
                const node = this.dataManager.getNode(id);
                if (node) {
                    this.selectionManager.onNodeRemoved(node);
                }

                const edges = this.dataManager.removeNodeAndIncidentEdges(id);
                if (edges === null) {
                    continue;
                }

                removedNodes.push(id);
                removedEdges.push(...edges);
            }

            if (removedNodes.length > 0 || removedEdges.length > 0) {
                this.eventManager.emitElementsRemoved(removedNodes, removedEdges);
            }
        };

        if (options?.skipQueue) {
            removeAll();
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "data-remove",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                removeAll();
            },
            {
                description: `Removing ${nodeIds.length} nodes`,
                ...options,
            },
        );
    }

    /**
     * Update node data for existing nodes in the graph.
     * @param updates - Array of update objects containing node ID and properties to update
     * @param options - Queue options for operation ordering
     */
    async updateNodes(
        updates: { id: string | number; [key: string]: unknown }[],
        options?: QueueableOptions,
    ): Promise<void> {
        if (options?.skipQueue) {
            updates.forEach((update) => {
                const node = this.dataManager.getNode(update.id);
                if (node) {
                    Object.assign(node.data, update);
                }
            });

            // A layer can select on any of the values that just changed, so the whole stack is
            // asked again rather than each node being re-resolved by hand.
            await this.repaintFromSession();

            return;
        }

        await this.operationQueue.queueOperationAsync(
            "data-update",
            async (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                updates.forEach((update) => {
                    const node = this.dataManager.getNode(update.id);
                    if (node) {
                        Object.assign(node.data, update);
                    }
                });

                // See the skipQueue branch above: the values a layer selects on have moved, so
                // the stack is asked again rather than each node being re-resolved by hand.
                await this.repaintFromSession();
            },
            {
                description: `Updating ${updates.length} nodes`,
                ...options,
            },
        );
    }

    /**
     * Set the active camera mode (e.g., "arcRotate", "universal").
     * @param mode - Camera mode key to activate
     * @param options - Queue options for operation ordering
     */
    async setCameraMode(mode: CameraKey, options?: QueueableOptions): Promise<void> {
        if (options?.skipQueue) {
            this.camera.activateCamera(mode);
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "camera-update",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                this.camera.activateCamera(mode);
            },
            {
                description: `Setting camera mode to ${mode}`,
                ...options,
            },
        );
    }

    /**
     * Update rendering settings for the graph visualization.
     * @param _settings - Object containing rendering configuration options (reserved for future use)
     * @param options - Queue options for operation ordering
     */
    async setRenderSettings(_settings: Record<string, unknown>, options?: QueueableOptions): Promise<void> {
        if (options?.skipQueue) {
            // Apply render settings directly
            // TODO: Add render settings support when available
            return;
        }

        await this.operationQueue.queueOperationAsync(
            "render-update",
            (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                // TODO: Add render settings support when available
            },
            {
                description: "Updating render settings",
                ...options,
            },
        );
    }

    /**
     * Execute multiple operations as a batch
     * Operations will be queued and executed in dependency order
     * @param fn - Function containing operations to batch
     */
    async batchOperations(fn: () => Promise<void> | void): Promise<void> {
        this.operationQueue.enterBatchMode();

        try {
            await fn();
        } catch (error) {
            await this.operationQueue.exitBatchMode();
            throw error;
        }

        // Exit batch mode and wait for all operations to complete
        await this.operationQueue.exitBatchMode();
    }

    /**
     * The headless model behind this renderer: the graph data, the coordinates, the statistics,
     * the catalogue, the configuration and what this machine can do.
     *
     * Everything about the graph that needs no screen is answered from here, so a consumer asking
     * "how dense is this?" or "what attributes does it carry?" asks the session rather than
     * walking the render objects.
     * @returns The session
     */
    getSession(): GraphSession {
        return this.session;
    }

    /**
     * Get the total number of nodes in the graph.
     *
     * This is the count in the graph data, which mid-load can be AHEAD of the nodes that have been
     * drawn: an edge whose endpoints have not arrived materialises them in the store while its
     * render objects wait. The data is the authority, so the data is what is counted.
     * @returns The number of nodes
     */
    getNodeCount(): number {
        return this.session.status.counts.nodes;
    }

    /**
     * Get the total number of edges in the graph.
     *
     * As with the node count, this is the count in the graph data rather than the count of edges
     * that have a mesh yet.
     * @returns The number of edges
     */
    getEdgeCount(): number {
        return this.session.status.counts.edges;
    }

    /**
     * Listen for a graph event, and get back the way to stop listening.
     *
     * THE RETURN VALUE IS THE POINT. `on` used to hand back nothing, and the events guide taught
     * `graph.off(type, handler)` to undo it -- a method that has never existed in any version of
     * this package. So a consumer who subscribed could not unsubscribe at all: the element's own
     * unsubscribe takes the id that `addListener` now returns, and `on` threw that id away. A
     * component that mounted, subscribed and unmounted leaked a listener per mount.
     *
     * The shape is the session's: `session.on(...)` returns a function that undoes it, and this
     * is the same promise for the renderer's events.
     * @param type - Event type to listen for
     * @param cb - Callback function to execute when event fires
     * @returns A function that removes this listener. Calling it twice is harmless.
     * @since 2.0.0
     * @example
     * ```typescript
     * const stop = graph.on("graph-settled", () => console.log("settled"));
     * stop();
     * ```
     */
    on(type: EventType, cb: EventCallbackType): () => void {
        const id = this.addListener(type, cb);

        return () => {
            this.eventManager.removeListener(id);
        };
    }

    /**
     * Add an event listener for graph events.
     * @param type - Event type to listen for
     * @param cb - Callback function to execute when event fires
     * @returns The listener's id, which `removeListener` takes. It used to be dropped here, so
     *     nothing a consumer could reach was able to undo an `addListener`.
     */
    addListener(type: EventType, cb: EventCallbackType): symbol {
        // Delegate to EventManager
        return this.eventManager.addListener(type, cb);
    }

    /**
     * Stop listening, given the id `addListener` handed back.
     * @param id - The id to remove.
     * @returns True when a listener was removed, false when that id is not registered.
     * @since 2.0.0
     */
    removeListener(id: symbol): boolean {
        return this.eventManager.removeListener(id);
    }

    /**
     * Remove every node and edge, leaving the graph empty and ready for the next dataset.
     *
     * The verb the data guide has always taught -- as `graph.clear()`, which has never existed.
     * `<graphty-element>` has had `clearData()` throughout; a consumer holding a `Graph` had to
     * reach through `graph.getDataManager().clear()`, which is the element's own internals.
     * @since 2.0.0
     * @example
     * ```typescript
     * graph.clearData();
     * ```
     */
    clearData(): void {
        this.dataManager.clear();
    }

    /**
     * Get the total number of registered event listeners.
     * Useful for debugging and testing to ensure listeners are properly cleaned up.
     * @returns The number of registered listeners
     */
    listenerCount(): number {
        return this.eventManager.listenerCount();
    }

    /**
     * Zoom the camera to fit all nodes in view.
     * @remarks
     * This operation executes immediately and does not go through the
     * operation queue. It may race with queued camera updates.
     *
     * For better coordination, consider using batchOperations.
     * @since 1.0.0
     * @see {@link waitForSettled} to wait for layout before zooming
     * @see {@link setCameraState} for manual camera control
     * @example
     * ```typescript
     * // Zoom to fit after data loads
     * await graph.addNodes(nodes);
     * await graph.waitForSettled();
     * graph.zoomToFit();
     *
     * // Zoom to fit within batch operations
     * await graph.batchOperations(async () => {
     *     await graph.setViewMode("2d");
     *     graph.zoomToFit(); // Will execute after the mode switch
     * });
     * ```
     */
    zoomToFit(): void {
        this.updateManager.enableZoomToFit();
    }

    // GraphContext implementation methods

    /**
     * Get the Styles instance for the graph.
     * @returns The Styles instance
     */
    getStyles(): Styles {
        return this.styles;
    }

    /**
     * Get the painter that answers what the session's style stack resolved for one element.
     *
     * Part of this class's `GraphContext` half: Node and Edge reach it through here, and it is
     * what tells them which of the two style systems owns their paint.
     * @returns The painter.
     */
    getStylePainter(): StylePainter {
        return this.stylePainter;
    }

    /**
     * Paint every element from the session's style stack, and queue the result for the renderer.
     *
     * THE BOUNDARY NO EDIT DESCRIBES. A layer edit hands the pass what changed; a dataset load
     * changes the elements themselves, and "everything changed, because the graph did" is not an
     * edit. So this is the one place the whole stack is applied to the whole graph, and it runs
     * on the queue beside the loads and the layouts rather than beside them.
     *
     * It does nothing while no style pass is bound: a pass whose answer nothing draws is a pass
     * over the graph for no picture.
     * @returns A promise that settles when the pass has finished.
     */
    private async repaintFromSession(): Promise<void> {
        if (!this.stylePainter.owns) {
            return;
        }

        // The elements this pass paints reach the renderer through the pass's own announcement,
        // which `StylePainter.bind` subscribes to. Taking them here, after the await, is what
        // handed the renderer somebody else's dirty set.
        await this.session.paint.repaintAll(this.session.styles.compiled(), {
            signal: new AbortController().signal,
            report: () => undefined,
        });
    }

    /**
     * Get the DataManager instance.
     * @returns The DataManager instance
     */
    getDataManager(): DataManager {
        return this.dataManager;
    }

    /**
     * Get the LayoutManager instance.
     * @returns The LayoutManager instance
     */
    getLayoutManager(): LayoutManager {
        return this.layoutManager;
    }

    /**
     * Get the UpdateManager instance.
     * @returns The UpdateManager instance
     */
    getUpdateManager(): UpdateManager {
        return this.updateManager;
    }

    /**
     * Get the MeshCache instance used for mesh instancing.
     * @returns The MeshCache instance
     */
    getMeshCache(): MeshCache {
        return this.dataManager.meshCache;
    }

    /**
     * Get the Babylon.js Scene instance.
     * @returns The Scene instance
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * Get the StatsManager instance for performance metrics.
     * @returns The StatsManager instance
     */
    getStatsManager(): StatsManager {
        return this.statsManager;
    }

    /**
     * Get the SelectionManager instance for handling node selection.
     * @returns The SelectionManager instance
     */
    getSelectionManager(): SelectionManager {
        return this.selectionManager;
    }

    /**
     * Get the EventManager instance for event handling.
     * @returns The EventManager instance
     */
    getEventManager(): EventManager {
        return this.eventManager;
    }

    /**
     * Get the acceleration controller this graph owns, for a manager reached through GraphContext.
     * @returns The acceleration controller
     * @since 2.0.0
     */
    getAcceleration(): AccelerationController {
        return this.acceleration;
    }

    // ============================================================================
    // SELECTION API
    // ============================================================================

    /**
     * Get the currently selected node.
     *
     * Superseded by `session.selection.nodes`, which is the whole selection rather than the first
     * node of it: this answers with one render object, and a selection now holds any number of
     * nodes and edges. It keeps working, and returns the first selected node.
     * @returns The first selected node, or null if nothing is selected.
     * @see {@link Graph.select} to change the selection.
     */
    getSelectedNode(): Node | null {
        return this.selectionManager.getSelectedNode();
    }

    /**
     * Select a node by its ID, replacing whatever was selected before.
     *
     * Superseded by {@link Graph.select}, which takes the same five set operations over every way
     * of naming elements. This is `select({ nodes: [nodeId] }, "replace")` with a render-object
     * lookup in front of it, and it keeps working because it is what a click has always done.
     * @remarks
     * Selection triggers a `selection-changed` event. Only one node is selected by this call;
     * it replaces any previous selection.
     *
     * Selection is often used to:
     * - Show a details panel with node information
     * - Highlight the node and its connections
     * - Enable context-specific actions
     * @param nodeId - The ID of the node to select
     * @returns True if the node was found and selected, false if not found
     * @since 1.0.0
     * @see {@link deselectNode} to clear selection
     * @see {@link getSelectedNode} to get current selection
     * @see {@link https://graphty.app/storybook/element/?path=/story/selection--default | Selection Examples}
     * @example
     * ```typescript
     * // Select a node and show its details
     * if (graph.selectNode('node-123')) {
     *   const node = graph.getSelectedNode();
     *   console.log('Selected:', node.data);
     *   showDetailsPanel(node);
     * }
     *
     * // Handle click events for selection
     * graph.on('node-click', ({ node }) => {
     *   graph.selectNode(node.id);
     * });
     * ```
     */
    selectNode(nodeId: string | number): boolean {
        return this.selectionManager.selectById(nodeId);
    }

    /**
     * Deselect the currently selected node.
     *
     * Superseded by `session.selection.clear()`, which empties both sets. This clears the node
     * half through the same model and keeps working.
     * @remarks
     * Clears the current selection and triggers a `selection-changed` event.
     * If no node is selected, this is a no-op.
     * @since 1.0.0
     * @see {@link selectNode} to select a node
     * @see {@link getSelectedNode} to check current selection
     * @example
     * ```typescript
     * // Clear selection programmatically
     * graph.selectNode("node-123");
     * graph.deselectNode();
     * console.log(graph.getSelectedNode()); // null
     *
     * // Clear selection on escape key
     * document.addEventListener('keydown', (e) => {
     *   if (e.key === 'Escape') {
     *     graph.deselectNode();
     *   }
     * });
     * ```
     */
    deselectNode(): void {
        this.selectionManager.deselect();
    }

    /**
     * Check if a specific node is currently selected.
     *
     * Answered from the selection masks, so it is one array read and it is true for EVERY
     * selected node rather than only the first one. Superseded by `session.selection.has`, which
     * answers the same question for an edge too.
     * @param nodeId - The ID of the node to check.
     * @returns True if the node is selected, false otherwise.
     */
    isNodeSelected(nodeId: string | number): boolean {
        return this.session.selection.has(nodeId);
    }

    /**
     * Change what is selected.
     *
     * The one selection verb: five set operations over every way of naming elements -- a list of
     * ids, a pasted column, a neighbourhood, a scope, the top twenty of a finished run. Selecting
     * a second node, selecting an edge and inverting a selection are all this call, which is why
     * it supersedes {@link Graph.selectNode} and {@link Graph.deselectNode}.
     * @param target - What to select.
     * @param op - What to do with it; replaces the selection when absent, which is what a click
     *     does.
     * @returns What changed: what joined, what left, and what the selection holds now.
     */
    select(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta> {
        return this.session.selection.apply(target, op);
    }

    /**
     * Set up a scene pointer observer to handle background clicks for deselection.
     * When the user clicks on an area with no node, the current selection is cleared.
     */
    private setupBackgroundClickHandler(): void {
        // Track click state to distinguish from drags
        let clickStartTime = 0;
        let clickStartPos = { x: 0, y: 0 };
        const CLICK_MAX_DURATION_MS = 300;
        const CLICK_MAX_MOVEMENT_PX = 5;

        this.scene.onPrePointerObservable.add((pointerInfo) => {
            // Skip in XR mode - XR has its own input handling
            const xrHelper = this.scene.metadata?.xrHelper;
            if (xrHelper?.baseExperience?.state === 2) {
                // WebXRState.IN_XR
                return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                clickStartTime = Date.now();
                clickStartPos = {
                    x: this.scene.pointerX,
                    y: this.scene.pointerY,
                };
            } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                // Check if this was a click (short duration, minimal movement)
                const duration = Date.now() - clickStartTime;
                const dx = this.scene.pointerX - clickStartPos.x;
                const dy = this.scene.pointerY - clickStartPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (duration < CLICK_MAX_DURATION_MS && distance < CLICK_MAX_MOVEMENT_PX) {
                    // This was a click - check if we hit anything
                    const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

                    // If we didn't hit anything or hit something without a nodeId, deselect
                    if (!pickResult.hit || !pickResult.pickedMesh?.metadata?.nodeId) {
                        this.selectionManager.deselect();
                    }
                }
            }
        });
    }

    /**
     * Check if the graph is in 2D mode (deprecated - use getViewMode instead).
     * @returns True if in 2D mode, false otherwise
     * @deprecated Use getViewMode() === "2d" instead
     */
    is2D(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Supporting backward compatibility
        return this.styles.config.graph.twoD;
    }

    /**
     * Get the current view mode.
     * Returns the viewMode from config (always set due to default value).
     * @returns The current view mode ("2d", "3d", "ar", or "vr")
     */
    getViewMode(): ViewMode {
        return this.styles.config.graph.viewMode;
    }

    /**
     * Put the scene into the view the graph was CONFIGURED to open in, as opposed to switching it
     * out of the one it is already drawing.
     *
     * WHY THE ELEMENT NEEDED THIS AT ALL. `setupCameras` ends with an unconditional
     * `activateCamera("orbit")` and RenderManager is handed no configuration, so a freshly built
     * scene was always perspective 3D no matter what `config.graph.viewMode` said. The only route
     * to the orthographic camera was `_setViewModeInternal`, which is a TRANSITION: it clears the
     * mesh cache, rebuilds every node and edge, saves and restores Z, and reframes the camera. A
     * graph whose opening state is 2D has nothing to transition from -- there are no meshes yet
     * and no Z to save -- and a consumer who wrote `<graphty-element view-mode="2d">` or set
     * `config.graph.viewMode` on a bare `Graph` got a graph that reported "2d" from every property
     * while drawing through a perspective camera, spreading the layout through three dimensions
     * and building every edge as a 3D tube.
     *
     * WHY HERE. This runs immediately before `markCategoryCompleted("style-init")`, and the
     * position is load-bearing: `data-add` depends on `style-init`, so no node or edge mesh can be
     * built until that line runs, and `EdgeMesh.is2DMode` needs BOTH the orthographic camera and
     * `scene.metadata.twoD` already in place when the first edge mesh is created. It is also
     * where the configured background reaches the scene, a few lines below, for the same reason:
     * a setting the consumer made before the element was attached becomes real once, at init.
     *
     * IT ESTABLISHES A STATE RATHER THAN CHANGING ONE, which is why it does none of the
     * transition's work.
     *
     * AR AND VR OPEN AS 3D, deliberately. Entering an immersive session is `requestSession`,
     * which browsers only grant inside a user gesture, so it cannot happen during init; the
     * XR session manager is merely constructed later in `init()`. An opening `viewMode` of "ar"
     * or "vr" therefore gets the perspective camera and is recorded in the scene metadata, and
     * the session begins when a consumer calls `setViewMode` from a click.
     */
    private applyOpeningViewMode(): void {
        const config = this.styles.config.graph;

        // The deprecated flag still decides when `viewMode` was never set: a document carrying
        // `twoD: true` and nothing else meant 2D, and `viewMode` at its default cannot
        // distinguish "the consumer asked for 3D" from "the consumer said nothing". Any explicit
        // `viewMode` wins over it.
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- reconciling the old spelling
        const askedForTwoDTheOldWay = config.viewMode === DEFAULT_VIEW_MODE && config.twoD;
        const mode: ViewMode = askedForTwoDTheOldWay ? "2d" : config.viewMode;
        const isTwoD = mode === "2d";

        config.viewMode = mode;
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- keeping the old spelling true
        config.twoD = isTwoD;

        this.scene.metadata = this.scene.metadata ?? {};
        this.scene.metadata.twoD = isTwoD;
        this.scene.metadata.viewMode = mode;

        this.camera.activateCamera(isTwoD ? "2d" : "orbit");
    }

    /**
     * Set the view mode.
     * This controls the camera type, input handling, and rendering approach.
     * @param mode - The view mode to set: "2d", "3d", "ar", or "vr"
     * @param options - Optional queueing options
     * @returns Promise that resolves when view mode is set
     * @example
     * ```typescript
     * // Switch to 2D orthographic view
     * await graph.setViewMode("2d");
     *
     * // Switch to VR mode
     * await graph.setViewMode("vr");
     * ```
     */
    async setViewMode(mode: ViewMode, options?: QueueableOptions): Promise<void> {
        // "view-mode", not "camera-update": `layout-set` obsoletes a pending `camera-update`, so
        // while this switch shared that category `element.viewMode = "2d"` followed by
        // `element.layout = "circular"` cancelled itself. See the category's own comment in
        // `src/managers/OperationQueueManager.ts` and the rule in `src/constants/obsolescence-rules.ts`.

        // ASKED FOR BEFORE THERE IS A GRAPH, this is the OPENING view mode rather than a switch,
        // so it is recorded now and applied by `applyOpeningViewMode` when `init()` runs. Two
        // things read the configuration before the queue could possibly drain: `init()` itself,
        // and `LayoutManager._setLayoutInternal`, which reads `viewMode` to decide whether the
        // layout engine gets a Z axis -- which is why `element.viewMode = "2d"` beside
        // `element.layout = "circular"` used to produce a flat picture of a three-dimensional
        // layout. The queued operation below still runs; it finds the scene already in the mode
        // it was going to ask for and returns without rebuilding a single mesh.
        //
        // Only the two views that exist without a session are recorded this way. "ar" and "vr"
        // keep the queued path, because entering XR needs the session manager `init()` builds.
        if (!this.initialized && (mode === "2d" || mode === "3d")) {
            this.styles.config.graph.viewMode = mode;
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- keeping the old spelling true
            this.styles.config.graph.twoD = mode === "2d";
        }

        return this.operationQueue.queueOperationAsync(
            "view-mode",
            async (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                await this._setViewModeInternal(mode);
            },
            {
                description: `Setting view mode to ${mode}`,
                ...options,
            },
        );
    }

    /**
     * Internal method for setting view mode - bypasses queue
     * Used by operations that are already queued
     *
     * WHAT "PREVIOUS" MEANS HERE IS THE SCENE, NOT THE CONFIGURATION, and the distinction is the
     * whole reason an opening 2D used to be impossible. This method's job is to move the scene
     * from the view it is drawing to the view that was asked for, so the only honest reading of
     * "the view it is drawing" is the scene itself -- which camera is active and what
     * `scene.metadata` records. The configuration is a statement of what the graph should be,
     * written by `applyOpeningViewMode` at init and by the public `setViewMode` before its
     * operation is queued, so diffing against it answers "has anyone asked for this yet" rather
     * than "is it already so", and those are different questions the moment a mode is asked for
     * before there is a scene to put it in.
     *
     * Reading the scene also makes the method idempotent and self-repairing: a redundant switch
     * to the mode already on screen costs nothing, and a scene that has drifted out of step with
     * its configuration is brought back rather than declared fine.
     * @param mode - The view mode to set
     */
    private async _setViewModeInternal(mode: ViewMode): Promise<void> {
        // What the scene is drawing right now. Undefined on a graph whose `init()` has not run,
        // which is a legitimate state: a switch asked for then is the first thing to touch the
        // scene, and must not be mistaken for a switch that has already happened.
        const sceneMode = this.scene.metadata?.viewMode as ViewMode | undefined;
        const sceneIsTwoD = this.scene.metadata?.twoD === true;

        // Skip if the scene already draws what was asked for
        if (sceneMode === mode) {
            return;
        }

        // Update the config
        this.styles.config.graph.viewMode = mode;

        // Sync twoD for backward compatibility
        const isTwoD = mode === "2d";
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Supporting backward compatibility
        this.styles.config.graph.twoD = isTwoD;

        // Handle mode switching
        const modeSwitchingBetween2D3D = sceneIsTwoD !== isTwoD;

        if (modeSwitchingBetween2D3D) {
            // Clear mesh cache if switching between 2D and 3D modes
            this.dataManager.meshCache.clear();

            // Update scene metadata for 2D mode detection
            this.scene.metadata = this.scene.metadata ?? {};
            this.scene.metadata.twoD = isTwoD;
            this.scene.metadata.viewMode = mode;

            // Activate camera BEFORE mesh recreation so that is2DMode() checks
            // in EdgeMesh.create() work correctly (camera.mode must be ORTHOGRAPHIC for 2D)
            const cameraType: CameraKey = isTwoD ? "2d" : "orbit";
            this.camera.activateCamera(cameraType);

            // Reset flag so initial camera state gets re-captured after layout settles
            this.initialCameraStateCaptured = false;

            // Force all nodes to recreate their meshes (they were disposed when cache was cleared)
            for (const node of this.getNodes()) {
                node.updateStyle();
            }

            // Force all edges to recreate their meshes
            // Note: Edge meshes from Simple2DLineRenderer are NOT tracked by MeshCache,
            // so we must explicitly dispose them before calling updateStyle()
            for (const edge of this.dataManager.edges.values()) {
                // Dispose edge mesh if not already disposed (handles non-cached meshes like Simple2DLineRenderer)
                if (edge.mesh instanceof PatternedLineMesh) {
                    edge.mesh.dispose();
                } else if (!edge.mesh.isDisposed()) {
                    edge.mesh.dispose();
                }

                // Dispose arrow meshes too
                if (edge.arrowMesh && !edge.arrowMesh.isDisposed()) {
                    edge.arrowMesh.dispose();
                }

                if (edge.arrowTailMesh && !edge.arrowTailMesh.isDisposed()) {
                    edge.arrowTailMesh.dispose();
                }

                edge.updateStyle();
            }

            // Save Z positions before any layout changes (3D->2D only)
            // We save here to capture the true 3D positions before layout is recreated
            if (isTwoD && !sceneIsTwoD) {
                // Switching from 3D to 2D: save current Z positions
                for (const node of this.getNodes()) {
                    this.savedZPositions.set(node.id, node.mesh.position.z);
                }
            }
        }

        // Update scene metadata for any mode change
        this.scene.metadata = this.scene.metadata ?? {};
        this.scene.metadata.viewMode = mode;

        // Handle XR modes (ar/vr)
        if (mode === "ar" || mode === "vr") {
            // For AR/VR, we need to initialize XR session
            if (!this.xrSessionManager) {
                // XR not available
                console.warn(`[Graph] Cannot switch to ${mode} mode: XR session manager not initialized`);
                // Fall back to 3D mode
                this.styles.config.graph.viewMode = "3d";
                this.scene.metadata.viewMode = "3d";
                return;
            }

            try {
                // Enter XR mode
                await this.enterXR(mode === "vr" ? "immersive-vr" : "immersive-ar");
            } catch (error) {
                console.warn(`[Graph] Failed to enter ${mode} mode:`, error);
                // Fall back to 3D mode
                this.styles.config.graph.viewMode = "3d";
                this.scene.metadata.viewMode = "3d";
            }
        } else if (sceneMode === "ar" || sceneMode === "vr") {
            // Exiting XR mode - return to 3D or 2D. The scene is asked, not the configuration:
            // leaving an immersive session is only right when a session is actually running, and
            // the scene is what records that it is.
            try {
                await this.exitXR();
            } catch (error) {
                console.warn("[Graph] Failed to exit XR mode:", error);
            }
        }

        // Activate appropriate camera based on mode
        if (mode !== "ar" && mode !== "vr") {
            // For 2D/3D, activate the appropriate camera
            const cameraType: CameraKey = mode === "2d" ? "2d" : "orbit";
            this.camera.activateCamera(cameraType);
        }

        // Update layout dimension if needed
        await this.layoutManager.updateLayoutDimension(isTwoD);

        // After mode switch, update node positions and edges
        // The goal is to preserve the current view - just render it in the new mode
        if (modeSwitchingBetween2D3D) {
            // Handle Z-coordinate flattening/restoration BEFORE updating edges
            // This ensures edges connect to the correct 2D/3D positions
            if (isTwoD) {
                // 3D→2D: flatten Z to 0 (positions were saved earlier)
                for (const node of this.getNodes()) {
                    node.mesh.position.z = 0;
                }
            } else {
                // 2D→3D: restore saved Z positions
                for (const node of this.getNodes()) {
                    const savedZ = this.savedZPositions.get(node.id);
                    if (savedZ !== undefined) {
                        node.mesh.position.z = savedZ;
                    }
                }
                this.savedZPositions.clear();
            }

            // Now update edges to connect to the updated node positions
            Edge.updateRays(this);
            for (const edge of this.dataManager.edges.values()) {
                edge.update();
            }

            // Calculate bounding box and zoom camera to fit the graph
            // This ensures the graph is visible after the mode switch
            const nodes = this.getNodes();
            if (nodes.length > 0) {
                let minX = Infinity,
                    minY = Infinity,
                    minZ = Infinity;
                let maxX = -Infinity,
                    maxY = -Infinity,
                    maxZ = -Infinity;

                for (const node of nodes) {
                    const pos = node.mesh.position;
                    const sz = node.size / 2;
                    minX = Math.min(minX, pos.x - sz);
                    minY = Math.min(minY, pos.y - sz);
                    minZ = Math.min(minZ, pos.z - sz);
                    maxX = Math.max(maxX, pos.x + sz);
                    maxY = Math.max(maxY, pos.y + sz);
                    maxZ = Math.max(maxZ, pos.z + sz);
                }

                this.camera.zoomToBoundingBox(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
            }
        }
    }

    /**
     * Check if ray updates are needed for edge arrows.
     * @returns True if rays need updating
     */
    needsRayUpdate(): boolean {
        return this.needRays;
    }

    /**
     * Get the current graph context configuration.
     * @returns The graph context configuration
     */
    getConfig(): GraphContextConfig {
        return {
            pinOnDrag: this.pinOnDrag,
            enableDetailedProfiling: this.enableDetailedProfiling,
            xr: this.graphContext.getConfig().xr,
        };
    }

    /**
     * Check if the layout engine is currently running.
     * @returns True if layout is running
     */
    isRunning(): boolean {
        return this.layoutManager.running;
    }

    /**
     * Set whether the layout engine should run.
     *
     * Resuming a simulation layout that had settled restarts it, so "play" moves nodes again;
     * pausing stops the per-frame stepping and nothing else.
     * @param running - True to start the layout, false to stop it
     */
    setRunning(running: boolean): void {
        this.layoutManager.running = running;
    }

    /**
     * Get the current XR configuration.
     * @returns The XR configuration if set
     */
    getXRConfig(): XRConfig | undefined {
        return this.graphContext.getConfig().xr;
    }

    /**
     * Set XR configuration.
     * Merges with defaults and updates the graph context.
     * @param config - Partial XR configuration to apply
     */
    setXRConfig(config: PartialXRConfig): void {
        // Parse through zod schema to apply defaults
        const fullConfig = xrConfigSchema.parse(config);
        this.graphContext.updateConfig({ xr: fullConfig });
    }

    /**
     * Get the XR session manager instance.
     * @returns The XR session manager if XR is initialized
     */
    getXRSessionManager(): XRSessionManager | undefined {
        return this.xrSessionManager ?? undefined;
    }

    /**
     * Check if VR mode is supported on this device/browser.
     * Returns true if WebXR is available and VR sessions are supported.
     * @returns Promise resolving to true if VR is supported
     * @example
     * ```typescript
     * const vrSupported = await graph.isVRSupported();
     * if (!vrSupported) {
     *   console.log("VR not available on this device");
     * }
     * ```
     */
    async isVRSupported(): Promise<boolean> {
        if (!this.xrSessionManager) {
            return false;
        }

        return this.xrSessionManager.isVRSupported();
    }

    /**
     * Check if AR mode is supported on this device/browser.
     * Returns true if WebXR is available and AR sessions are supported.
     * @returns Promise resolving to true if AR is supported
     * @example
     * ```typescript
     * const arSupported = await graph.isARSupported();
     * if (!arSupported) {
     *   console.log("AR not available on this device");
     * }
     * ```
     */
    async isARSupported(): Promise<boolean> {
        if (!this.xrSessionManager) {
            return false;
        }

        return this.xrSessionManager.isARSupported();
    }

    // Input manager access
    /**
     * Get the input manager
     * @returns The input manager instance
     */
    get input(): InputManager {
        return this.inputManager;
    }

    /**
     * Enable or disable input
     * @param enabled - True to enable input, false to disable
     */
    setInputEnabled(enabled: boolean): void {
        this.inputManager.setEnabled(enabled);
    }

    /**
     * Start recording input for testing/automation
     */
    startInputRecording(): void {
        this.inputManager.startRecording();
    }

    /**
     * Stop recording and get recorded events
     * @returns Array of recorded input events
     */
    stopInputRecording(): RecordedInputEvent[] {
        return this.inputManager.stopRecording();
    }

    /**
     * Convert 3D world coordinates to 2D screen coordinates.
     * @param worldPos - World position to convert
     * @param worldPos.x - X coordinate in world space
     * @param worldPos.y - Y coordinate in world space
     * @param worldPos.z - Z coordinate in world space
     * @returns Screen coordinates {x, y}
     */
    worldToScreen(worldPos: { x: number; y: number; z: number }): { x: number; y: number } {
        const engine = this.scene.getEngine();
        const viewport = this.scene.activeCamera?.viewport;
        const view = this.scene.getViewMatrix();
        const projection = this.scene.getProjectionMatrix();

        if (!viewport) {
            return { x: 0, y: 0 };
        }

        // Create transformation matrix manually
        const viewProjection = view.multiply(projection);
        const worldVec = new Vector3(worldPos.x, worldPos.y, worldPos.z);

        // Transform to clip space
        const clipSpace = Vector3.TransformCoordinates(worldVec, viewProjection);

        // Convert to screen space
        const screenX = (clipSpace.x + 1) * 0.5 * engine.getRenderWidth();
        const screenY = (1 - clipSpace.y) * 0.5 * engine.getRenderHeight();

        return { x: screenX, y: screenY };
    }

    /**
     * Convert 2D screen coordinates to 3D world coordinates via raycasting.
     * @param screenPos - Screen position to convert
     * @param screenPos.x - X coordinate in screen space
     * @param screenPos.y - Y coordinate in screen space
     * @returns World coordinates {x, y, z} or null if no intersection
     */
    screenToWorld(screenPos: { x: number; y: number }): { x: number; y: number; z: number } | null {
        const pickInfo = this.scene.pick(screenPos.x, screenPos.y);

        if (pickInfo?.pickedPoint) {
            return {
                x: pickInfo.pickedPoint.x,
                y: pickInfo.pickedPoint.y,
                z: pickInfo.pickedPoint.z,
            };
        }

        return null;
    }

    /**
     * Get the active camera controller.
     * @returns The active camera controller or null if none active
     */
    getCameraController(): CameraController | null {
        return this.camera.getActiveController();
    }

    /**
     * Get the Babylon.js mesh for a node by its ID.
     * @param nodeId - ID of the node
     * @returns The node's mesh or null if not found
     */
    getNodeMesh(nodeId: string): AbstractMesh | null {
        // Through `getNode`, not the raw map, so an id printed as text still finds a node the
        // file supplied as a number. Reading the map directly is what made Locate and Zoom to
        // selection silent no-ops on every sample with numeric ids.
        const node = this.dataManager.getNode(nodeId);
        return node?.mesh ?? null;
    }

    /**
     * Wait for every queued graph operation to finish.
     * @remarks
     * This waits for the operation QUEUE -- data loading, layout changes, algorithm runs -- and
     * for nothing else. When it resolves, everything asked for has been carried out; the layout
     * may still be running and the camera may still be moving, because neither of those is a
     * queued operation.
     *
     * For a picture that will not change again -- a screenshot, a video frame, a visual
     * regression snapshot -- wait for {@link Graph.waitForStableFrame} instead, which waits for
     * this queue AND for the layout to converge AND for the camera to finish framing AND for a
     * frame to be drawn in that state.
     * @returns Promise that resolves when all operations are complete
     * @since 1.0.0
     * @see {@link zoomToFit} to zoom after settling
     * @see {@link captureScreenshot} for capturing stable views
     * @example
     * ```typescript
     * // Wait for layout to settle before zooming
     * await graph.addNodes(nodes);
     * await graph.addEdges(edges);
     * await graph.waitForSettled();
     * graph.zoomToFit();
     *
     * // Wait before taking a screenshot
     * await graph.setLayout('circular');
     * await graph.waitForSettled();
     * const screenshot = await graph.captureScreenshot();
     *
     * // Chain operations with settle
     * await graph.runAlgorithm('graphty', 'pagerank');
     * await graph.waitForSettled();
     * console.log('Algorithm complete, results available');
     * ```
     */
    async waitForSettled(): Promise<void> {
        // Wait for operation queue to complete all operations
        await this.operationQueue.waitForCompletion();
    }

    /**
     * Whether the picture on screen is the finished one.
     * @remarks
     * True only when the layout has converged, the camera has finished framing the graph, no
     * style work is queued, AND a frame has been drawn in that state. False again the moment any
     * of that stops being true -- new data, a new layout, a re-frame.
     *
     * It is deliberately silent about the reader: someone dragging the camera or a node changes
     * the picture, and the element does not call that unstable.
     * @returns True when the last frame drawn is the last frame that will change.
     * @since 2.0.0
     * @example
     * ```typescript
     * if (graph.isFrameStable) {
     *   const screenshot = await graph.captureScreenshot();
     * }
     * ```
     */
    get isFrameStable(): boolean {
        return this.updateManager.frameIsStable;
    }

    /**
     * Wait until the picture is final.
     * @remarks
     * Resolves when all four of these are true, in this order: every queued operation has run,
     * the layout has converged, the camera has finished framing what the layout arrived at, and a
     * frame has been drawn showing it.
     *
     * The `graph-settled` event is NOT that moment. It fires the instant the layout engine
     * reports convergence, in the same update pass that merely ASKS for the final framing, so a
     * consumer who photographs on that event photographs a camera that is still moving -- by
     * tens of thousands of projected pixels on a force layout. This is the method that means what
     * that event is usually mistaken for.
     *
     * It rejects rather than resolving when the picture has not come to rest in time, and the
     * error names what was still moving. A wait for a final frame that quietly gives up and
     * returns a moving one is worse than no wait at all: the caller cannot tell the two apart.
     * @param options - How the wait is bounded.
     * @param options.timeoutMs - How long to wait before giving up; 30 seconds by default.
     * @returns Promise that resolves once a frame of the finished picture has been drawn.
     * @throws Error when the picture is still changing when the timeout expires.
     * @since 2.0.0
     * @example
     * ```typescript
     * await graph.addNodes(nodes);
     * await graph.addEdges(edges);
     * await graph.waitForStableFrame();
     * const screenshot = await graph.captureScreenshot();
     * ```
     */
    async waitForStableFrame(options: { timeoutMs?: number } = {}): Promise<void> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_STABLE_FRAME_TIMEOUT_MS;
        let listenerId: symbol | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            await Promise.race([
                this.untilFrameIsStable((id) => {
                    listenerId = id;
                }),
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => {
                        reject(
                            new Error(
                                `The graph was still changing ${String(timeoutMs)} ms after ` +
                                    `waitForStableFrame() was called: ${this.whyTheFrameIsNotStable()}.`,
                            ),
                        );
                    }, timeoutMs);
                }),
            ]);
        } finally {
            if (timer !== undefined) {
                clearTimeout(timer);
            }

            if (listenerId !== undefined) {
                this.eventManager.removeListener(listenerId);
            }
        }
    }

    /**
     * The unbounded half of {@link Graph.waitForStableFrame}.
     * @param track - Told the listener id, so the caller can remove it if it stops waiting.
     * @returns Promise that resolves once a frame of the finished picture has been drawn.
     */
    private async untilFrameIsStable(track: (id: symbol) => void): Promise<void> {
        // The queue first: a layout change or a data load that has not run yet is going to move
        // the picture, so a frame that is final right now is final about the wrong graph.
        await this.operationQueue.waitForCompletion();

        if (this.updateManager.frameIsStable) {
            return;
        }

        await new Promise<void>((resolve) => {
            const id = this.eventManager.addListener("graph-frame-stable", () => {
                this.eventManager.removeListener(id);
                resolve();
            });

            track(id);

            // A frame can be drawn between the check above and the listener being attached, and
            // an event nobody was listening for is not coming back.
            if (this.updateManager.frameIsStable) {
                this.eventManager.removeListener(id);
                resolve();
            }
        });
    }

    /**
     * What is still moving, for the message a timed-out wait carries.
     * @returns One phrase naming what has not finished.
     */
    private whyTheFrameIsNotStable(): string {
        const queue = this.operationQueue.getStats();

        if (queue.pending > 0 || queue.size > 0) {
            return `${String(queue.pending + queue.size)} queued operations have not finished`;
        }

        return this.updateManager.whyFrameIsNotStable();
    }

    /**
     * Capture a screenshot of the current graph visualization.
     * @param options - Screenshot options (format, resolution, destinations, etc.)
     * @returns Promise resolving to ScreenshotResult with blob and metadata
     * @example
     * ```typescript
     * // Basic PNG screenshot
     * const result = await graph.captureScreenshot();
     *
     * // High-res JPEG with download
     * const result = await graph.captureScreenshot({
     *   format: 'jpeg',
     *   multiplier: 2,
     *   destination: { download: true }
     * });
     *
     * // Copy to clipboard
     * const result = await graph.captureScreenshot({
     *   destination: { clipboard: true }
     * });
     * ```
     */
    async captureScreenshot(options?: ScreenshotOptions): Promise<ScreenshotResult> {
        const screenshotCapture = new ScreenshotCapture(this.engine, this.scene, this.canvas, this);
        return screenshotCapture.captureScreenshot(options);
    }

    /**
     * Check if screenshot can be captured with given options.
     * @param options - Screenshot options to validate
     * @returns Promise<CapabilityCheck> - Result indicating whether screenshot is supported
     * @example
     * ```typescript
     * // Check if 4x multiplier is supported
     * const check = await graph.canCaptureScreenshot({ multiplier: 4 });
     * if (!check.supported) {
     *   console.error('Cannot capture:', check.reason);
     * } else if (check.warnings) {
     *   console.warn('Warnings:', check.warnings);
     * }
     *
     * // Check 8K resolution
     * const check8k = await graph.canCaptureScreenshot({
     *   width: 7680,
     *   height: 4320
     * });
     * console.log(`Memory: ${check8k.estimatedMemoryMB.toFixed(0)}MB`);
     * ```
     */
    async canCaptureScreenshot(
        options?: ScreenshotOptions,
    ): Promise<import("./screenshot/capability-check.js").CapabilityCheck> {
        const { canCaptureScreenshot } = await import("./screenshot/capability-check.js");
        return canCaptureScreenshot(this.canvas, options ?? {});
    }

    /**
     * Capture an animation as a video (stationary or animated camera)
     * @param options - Animation capture options
     * @returns Promise resolving to AnimationResult with blob and metadata
     * @example
     * ```typescript
     * // Basic 5-second video at 30fps
     * const result = await graph.captureAnimation({
     *   duration: 5000,
     *   fps: 30,
     *   cameraMode: 'stationary'
     * });
     *
     * // High-quality 60fps video with download
     * const result = await graph.captureAnimation({
     *   duration: 10000,
     *   fps: 60,
     *   cameraMode: 'stationary',
     *   download: true,
     *   downloadFilename: 'graph-video.webm'
     * });
     *
     * // Animated camera path (camera tour)
     * const result = await graph.captureAnimation({
     *   duration: 5000,
     *   fps: 30,
     *   cameraMode: 'animated',
     *   cameraPath: [
     *     { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
     *     { position: { x: 0, y: 20, z: 0 }, target: { x: 0, y: 0, z: 0 }, duration: 2500 },
     *     { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 2500 }
     *   ],
     *   easing: 'easeInOut',
     *   download: true
     * });
     * ```
     */
    async captureAnimation(
        options: import("./video/VideoCapture.js").AnimationOptions,
    ): Promise<import("./video/VideoCapture.js").AnimationResult> {
        const { MediaRecorderCapture } = await import("./video/MediaRecorderCapture.js");

        const capture = new MediaRecorderCapture();

        // Store reference for cancellation
        this.activeCapture = capture;

        // Set up progress event handler
        const onProgress = (progress: number): void => {
            this.eventManager.emitGraphEvent("animation-progress", { progress });
        };

        try {
            // Handle animated camera mode
            if (options.cameraMode === "animated") {
                return await this.captureAnimatedCameraVideo(options, capture, onProgress);
            }

            // Capture stationary video
            const result = await capture.captureRealtime(this.canvas, options, onProgress);

            // Handle download if requested
            this.handleVideoDownload(result, options);

            return result;
        } finally {
            // Clear reference when done
            this.activeCapture = null;
        }
    }

    /**
     * Capture video with animated camera path
     * @param options - Animation configuration options
     * @param capture - Media recorder capture instance
     * @param onProgress - Progress callback function
     * @returns Promise resolving to animation result with video blob
     */
    private async captureAnimatedCameraVideo(
        options: import("./video/VideoCapture.js").AnimationOptions,
        capture: import("./video/MediaRecorderCapture.js").MediaRecorderCapture,
        onProgress: (progress: number) => void,
    ): Promise<import("./video/VideoCapture.js").AnimationResult> {
        const { CameraPathAnimator } = await import("./video/CameraPathAnimator.js");

        // Validate cameraPath is provided
        if (!options.cameraPath || options.cameraPath.length < 2) {
            throw new Error("Animated camera mode requires at least 2 waypoints in cameraPath");
        }

        const camera = this.scene.activeCamera;
        if (!camera) {
            throw new Error("No active camera available for animated capture");
        }

        const fps = options.fps ?? 30;

        // Create camera path animator
        const animator = new CameraPathAnimator(camera, this.scene, {
            fps,
            duration: options.duration,
            easing: options.easing,
        });

        // Create animations from waypoints
        animator.createCameraAnimations(options.cameraPath);

        // Start recording and animation simultaneously
        const recordingPromise = capture.captureRealtime(this.canvas, options, onProgress);

        // Start camera animation (will run concurrently with recording)
        const animationPromise = animator.startRealtimeAnimation();

        // Wait for both to complete
        // Recording duration is controlled by options.duration
        // Animation should complete around the same time
        const [result] = await Promise.all([recordingPromise, animationPromise]);

        // Handle download if requested
        this.handleVideoDownload(result, options);

        return result;
    }

    /**
     * Handle video download if requested
     * @param result - Animation result containing the video blob
     * @param options - Animation options including download settings
     */
    private handleVideoDownload(
        result: import("./video/VideoCapture.js").AnimationResult,
        options: import("./video/VideoCapture.js").AnimationOptions,
    ): void {
        if (options.download) {
            let filename = options.downloadFilename ?? `animation-${Date.now()}.webm`;

            // Auto-fix extension based on actual format when using auto-detect
            if (!options.format || options.format === "auto") {
                const correctExtension = result.metadata.format;
                // Replace any existing video extension with the correct one
                filename = filename.replace(/\.(webm|mp4)$/i, `.${correctExtension}`);
                // If no extension exists, add the correct one
                if (!/\.(webm|mp4)$/i.exec(filename)) {
                    filename += `.${correctExtension}`;
                }
            }

            const url = URL.createObjectURL(result.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Cancel ongoing animation capture
     * @returns true if a capture was cancelled, false if no capture was in progress
     * @example
     * ```typescript
     * // Start a capture
     * const capturePromise = graph.captureAnimation({
     *   duration: 10000,
     *   fps: 30,
     *   cameraMode: 'stationary'
     * });
     *
     * // Cancel it after 2 seconds
     * setTimeout(() => {
     *   const wasCancelled = graph.cancelAnimationCapture();
     *   console.log('Cancelled:', wasCancelled);
     * }, 2000);
     *
     * // The promise will reject with AnimationCancelledError
     * try {
     *   await capturePromise;
     * } catch (error) {
     *   if (error.name === 'AnimationCancelledError') {
     *     console.log('Capture was cancelled');
     *   }
     * }
     * ```
     */
    cancelAnimationCapture(): boolean {
        if (!this.activeCapture) {
            return false;
        }

        const cancelled = this.activeCapture.cancel();

        // Emit cancellation event
        if (cancelled) {
            this.eventManager.emitGraphEvent("animation-cancelled", {});
        }

        return cancelled;
    }

    /**
     * Check if an animation capture is currently in progress
     * @returns True if currently capturing an animation
     */
    isAnimationCapturing(): boolean {
        return this.activeCapture?.isCapturing() ?? false;
    }

    /**
     * Estimate performance and potential issues for animation capture
     * @param options - Animation options to estimate
     * @returns Promise resolving to CaptureEstimate
     * @example
     * ```typescript
     * const estimate = await graph.estimateAnimationCapture({
     *   duration: 5000,
     *   fps: 60,
     *   width: 3840,
     *   height: 2160
     * });
     *
     * if (estimate.likelyToDropFrames) {
     *   console.warn(`May drop frames. Recommended: ${estimate.recommendedFps}fps`);
     * }
     * ```
     */
    async estimateAnimationCapture(
        options: Pick<import("./video/VideoCapture.js").AnimationOptions, "duration" | "fps" | "width" | "height">,
    ): Promise<import("./video/estimation.js").CaptureEstimate> {
        const { estimateAnimationCapture } = await import("./video/estimation.js");
        return estimateAnimationCapture(options);
    }

    /**
     * Get the current camera state
     * @returns Camera state including position, target, and rotation
     */
    getCameraState(): import("./screenshot/types.js").CameraState {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return {};
        }

        const state: import("./screenshot/types.js").CameraState = {};

        // Get the active camera controller (OrbitCameraController or TwoDCameraController)
        const controller = this.camera.getActiveController();

        if (controller && "pivot" in controller && "cameraDistance" in controller) {
            // OrbitCameraController - get world position and pivot position
            const orbitController = controller as unknown as {
                pivot: {
                    position: Vector3;
                    rotation: Vector3;
                    rotationQuaternion: Quaternion | null;
                    computeWorldMatrix: (force: boolean) => void;
                };
                cameraDistance: number;
                camera: { position: Vector3; parent: unknown; computeWorldMatrix: (force: boolean) => void };
            };

            // Get camera's world position
            // Compute world matrix first
            orbitController.pivot.computeWorldMatrix(true);
            orbitController.camera.computeWorldMatrix(true);

            // Extract world position from world matrix
            const worldMatrix = camera.getWorldMatrix();
            const worldPosition = Vector3.TransformCoordinates(Vector3.Zero(), worldMatrix);
            state.position = {
                x: worldPosition.x,
                y: worldPosition.y,
                z: worldPosition.z,
            };

            // Pivot position is the "target" (what camera looks at)
            state.target = {
                x: orbitController.pivot.position.x,
                y: orbitController.pivot.position.y,
                z: orbitController.pivot.position.z,
            };

            // Store pivot rotation and distance for restoration
            // PivotController uses rotationQuaternion, so convert to Euler for storage
            if (orbitController.pivot.rotationQuaternion) {
                const euler = orbitController.pivot.rotationQuaternion.toEulerAngles();
                state.pivotRotation = {
                    x: euler.x,
                    y: euler.y,
                    z: euler.z,
                };
            } else {
                state.pivotRotation = {
                    x: orbitController.pivot.rotation.x,
                    y: orbitController.pivot.rotation.y,
                    z: orbitController.pivot.rotation.z,
                };
            }

            state.cameraDistance = orbitController.cameraDistance;
        } else if (controller && "velocity" in controller) {
            // TwoDCameraController - get zoom and pan
            const twoDController = controller as unknown as {
                camera: {
                    position: Vector3;
                    orthoLeft: number | null;
                    orthoRight: number | null;
                    orthoTop: number | null;
                    orthoBottom: number | null;
                };
                config: {
                    initialOrthoSize: number;
                };
            };

            // Calculate current zoom from ortho bounds
            const currentSize = (twoDController.camera.orthoRight ?? 1) - (twoDController.camera.orthoLeft ?? -1);
            const halfSize = currentSize / 2;
            const initialSize = twoDController.config.initialOrthoSize;
            state.zoom = initialSize / halfSize;

            // Get pan from camera position
            state.pan = {
                x: twoDController.camera.position.x,
                y: twoDController.camera.position.y,
            };
        } else if ("position" in camera) {
            // Fallback for other camera types
            state.position = {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z,
            };

            // Check if camera has a target (ArcRotateCamera)
            if ("target" in camera && camera.target instanceof Vector3) {
                state.target = {
                    x: camera.target.x,
                    y: camera.target.y,
                    z: camera.target.z,
                };
            }
        }

        return state;
    }

    /**
     * Set the camera state (Phase 4: with animation support)
     * @param state - Camera state or preset name to apply
     * @param options - Optional animation configuration
     */
    async setCameraState(
        state: import("./screenshot/types.js").CameraState | { preset: string },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        // Resolve preset if needed
        const resolvedState = "preset" in state ? this.resolveCameraPreset(state.preset) : state;

        // For immediate (non-animated) updates or skipQueue, apply directly
        if (!options || !options.animate || options.skipQueue) {
            this.applyCameraStateImmediate(resolvedState);
            // Emit event
            this.eventManager.emitGraphEvent("camera-state-changed", { state: resolvedState });

            return;
        }

        // Queue animated camera transitions through operation queue
        await this.operationQueue.queueOperationAsync(
            "camera-update",
            async (context) => {
                if (context.signal.aborted) {
                    throw new Error("Operation cancelled");
                }

                // Animated transitions
                const controller = this.camera.getActiveController();

                try {
                    if (controller && "pivot" in controller && "cameraDistance" in controller) {
                        // OrbitCameraController (3D)
                        await this.animateOrbitCamera(resolvedState, options, context.signal);
                    } else if (
                        controller &&
                        "velocity" in controller &&
                        typeof (controller as { velocity?: unknown }).velocity === "object"
                    ) {
                        // TwoDCameraController (2D) - has velocity object
                        await this.animate2DCamera(resolvedState, options, context.signal);
                    } else {
                        // Unknown controller, apply immediately
                        this.applyCameraStateImmediate(resolvedState);
                        this.eventManager.emitGraphEvent("camera-state-changed", { state: resolvedState });
                    }
                } catch (error) {
                    // Check if error is due to cancellation
                    if (error instanceof Error && error.message === "Operation cancelled") {
                        throw error; // Re-throw cancellation
                    }

                    console.error("Camera animation failed:", error);
                    // Fallback to immediate
                    this.applyCameraStateImmediate(resolvedState);
                    this.eventManager.emitGraphEvent("camera-state-changed", { state: resolvedState });
                }
            },
            {
                description:
                    options.description ?? `Animating camera to ${resolvedState.position ? "position" : "state"}`,
            },
        );
    }

    /**
     * Apply camera state immediately without animation
     * @param state - Camera state to apply
     */
    private applyCameraStateImmediate(state: import("./screenshot/types.js").CameraState): void {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        // Get the active camera controller
        const controller = this.camera.getActiveController();

        if (controller && "pivot" in controller && "cameraDistance" in controller) {
            // OrbitCameraController - work with pivot system
            const orbitController = controller as unknown as {
                pivot: {
                    position: Vector3;
                    rotation: Vector3;
                    rotationQuaternion: Quaternion | null;
                    computeWorldMatrix: (force: boolean) => void;
                };
                cameraDistance: number;
                updateCameraPosition: () => void;
            };

            // Set pivot position (target)
            if (state.target) {
                orbitController.pivot.position.set(state.target.x, state.target.y, state.target.z);
            }

            // Set pivot rotation if provided (for exact state restoration)
            // Must use rotationQuaternion because PivotController initializes with quaternion
            // In Babylon.js, when rotationQuaternion is set (not null), it takes precedence over Euler rotation
            if (state.pivotRotation) {
                // Convert Euler angles to quaternion
                const quat = Quaternion.RotationYawPitchRoll(
                    state.pivotRotation.y, // yaw
                    state.pivotRotation.x, // pitch
                    state.pivotRotation.z, // roll
                );
                orbitController.pivot.rotationQuaternion = quat;
            } else if (state.position && state.target) {
                // Calculate pivot rotation from position and target
                // Camera should look from position towards target
                const direction = new Vector3(
                    state.position.x - state.target.x,
                    state.position.y - state.target.y,
                    state.position.z - state.target.z,
                );
                const distance = direction.length();

                // Calculate rotation angles to orient pivot so camera looks at target
                // Add π to yaw because OrbitController's camera points in the opposite direction
                const yaw = Math.atan2(direction.x, direction.z) + Math.PI;
                const pitch = Math.asin(direction.y / distance);

                // Convert Euler angles to quaternion
                const quat = Quaternion.RotationYawPitchRoll(yaw, pitch, 0);
                orbitController.pivot.rotationQuaternion = quat;
            }

            // Set camera distance if provided
            if (state.cameraDistance !== undefined) {
                orbitController.cameraDistance = state.cameraDistance;
            } else if (state.position && state.target) {
                // Calculate distance from position to target
                const dx = state.position.x - state.target.x;
                const dy = state.position.y - state.target.y;
                const dz = state.position.z - state.target.z;
                orbitController.cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            }

            // Update the pivot's world matrix and camera position
            orbitController.pivot.computeWorldMatrix(true);
            orbitController.updateCameraPosition();
        } else if (controller && "velocity" in controller) {
            // TwoDCameraController - handle zoom and pan
            const twoDController = controller as unknown as {
                camera: {
                    position: Vector3;
                    orthoLeft: number | null;
                    orthoRight: number | null;
                    orthoTop: number | null;
                    orthoBottom: number | null;
                };
                config: {
                    initialOrthoSize: number;
                };
                updateOrtho: (size: number) => void;
            };

            // Set zoom (ortho bounds)
            if (state.zoom !== undefined) {
                const initialSize = twoDController.config.initialOrthoSize;
                const targetSize = initialSize / state.zoom;
                twoDController.updateOrtho(targetSize); // Reuse controller method
            }

            // Set pan (camera position)
            if (state.pan) {
                // Reuse controller's pan method for consistency
                const dx = state.pan.x - twoDController.camera.position.x;
                const dy = state.pan.y - twoDController.camera.position.y;

                // Use controller's pan method (adds delta)
                const panMethod = twoDController as unknown as { pan: (dx: number, dy: number) => void };
                panMethod.pan(dx, dy);
            }
        } else {
            // Fallback for other camera types
            if (state.position && "position" in camera) {
                camera.position.set(state.position.x, state.position.y, state.position.z);
            }

            if (state.target && "setTarget" in camera && typeof camera.setTarget === "function") {
                camera.setTarget(new Vector3(state.target.x, state.target.y, state.target.z));
            }
        }
    }

    /**
     * Apply easing function to animation
     * @param animation - Babylon.js animation to apply easing to
     * @param easing - Easing function name (linear, easeIn, easeOut, easeInOut)
     */
    private applyEasing(animation: Animation, easing?: string): void {
        if (!easing || easing === "linear") {
            return; // No easing
        }

        let easingFunction: CubicEase;

        switch (easing) {
            case "easeInOut":
                easingFunction = new CubicEase();
                easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
                break;
            case "easeIn":
                easingFunction = new CubicEase();
                easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
                break;
            case "easeOut":
                easingFunction = new CubicEase();
                easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
                break;
            default:
                return; // Unknown easing, use linear
        }

        animation.setEasingFunction(easingFunction);
    }

    /**
     * Animate camera distance using dummy object pattern
     * Required because cameraDistance is not a scene node property
     * @param orbitController - Orbit camera controller instance
     * @param orbitController.cameraDistance - Current camera distance from pivot
     * @param orbitController.updateCameraPosition - Function to update camera position
     * @param targetDistance - Target camera distance to animate to
     * @param frameCount - Number of frames for the animation
     * @param fps - Frames per second for the animation
     * @param easing - Optional easing function name
     */
    private async animateCameraDistance(
        orbitController: {
            cameraDistance: number;
            updateCameraPosition: () => void;
        },
        targetDistance: number,
        frameCount: number,
        fps: number,
        easing?: string,
    ): Promise<void> {
        // Create dummy object to animate
        const dummy = { value: orbitController.cameraDistance };

        const distAnim = new Animation(
            "camera_distance",
            "value",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );

        distAnim.setKeys([
            { frame: 0, value: orbitController.cameraDistance },
            { frame: frameCount, value: targetDistance },
        ]);

        this.applyEasing(distAnim, easing);

        return new Promise((resolve) => {
            // Create observer to update controller during animation
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                orbitController.cameraDistance = dummy.value;
                orbitController.updateCameraPosition();
            });

            // Animate the dummy object
            this.scene.beginDirectAnimation(dummy, [distAnim], 0, frameCount, false, 1.0, () => {
                // Cleanup observer
                this.scene.onBeforeRenderObservable.remove(observer);

                // Ensure final value
                orbitController.cameraDistance = targetDistance;
                orbitController.updateCameraPosition();

                resolve();
            });
        });
    }

    /**
     * Animate OrbitCameraController to target state
     * Handles pivot-based camera system with custom distance animation
     * @param targetState - Target camera state to animate to
     * @param options - Animation configuration options
     * @param signal - Optional abort signal to cancel animation
     */
    private async animateOrbitCamera(
        targetState: import("./screenshot/types.js").CameraState,
        options: import("./screenshot/types.js").CameraAnimationOptions,
        signal?: AbortSignal,
    ): Promise<void> {
        const controller = this.camera.getActiveController();

        // Type guard - ensure we have OrbitCameraController
        if (!controller || !("pivot" in controller) || !("cameraDistance" in controller)) {
            // Fallback to immediate if controller doesn't match
            this.applyCameraStateImmediate(targetState);
            return;
        }

        const orbitController = controller as unknown as {
            pivot: {
                position: Vector3;
                rotation: Vector3;
                animations?: Animation[];
                computeWorldMatrix: (force: boolean) => void;
            };
            cameraDistance: number;
            updateCameraPosition: () => void;
        };

        const fps = 60;
        const duration = options.duration ?? 1000;
        const frameCount = Math.floor(duration / (1000 / fps));
        const animations: Animation[] = [];

        // Animation 1: Pivot Position (target)
        if (targetState.target) {
            const posAnim = new Animation(
                "pivot_position",
                "position",
                fps,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );

            posAnim.setKeys([
                {
                    frame: 0,
                    value: orbitController.pivot.position.clone(),
                },
                {
                    frame: frameCount,
                    value: new Vector3(targetState.target.x, targetState.target.y, targetState.target.z),
                },
            ]);

            this.applyEasing(posAnim, options.easing);
            animations.push(posAnim);
        }

        // Animation 2: Pivot Rotation (view direction)
        if (targetState.pivotRotation) {
            const rotAnim = new Animation(
                "pivot_rotation",
                "rotation",
                fps,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );

            rotAnim.setKeys([
                {
                    frame: 0,
                    value: orbitController.pivot.rotation.clone(),
                },
                {
                    frame: frameCount,
                    value: new Vector3(
                        targetState.pivotRotation.x,
                        targetState.pivotRotation.y,
                        targetState.pivotRotation.z,
                    ),
                },
            ]);

            this.applyEasing(rotAnim, options.easing);
            animations.push(rotAnim);
        } else if (targetState.position && targetState.target) {
            // Calculate pivot rotation from position and target
            const direction = new Vector3(
                targetState.position.x - targetState.target.x,
                targetState.position.y - targetState.target.y,
                targetState.position.z - targetState.target.z,
            );
            const distance = direction.length();
            const yaw = Math.atan2(direction.x, direction.z) + Math.PI;
            const pitch = Math.asin(direction.y / distance);

            const rotAnim = new Animation(
                "pivot_rotation",
                "rotation",
                fps,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );

            rotAnim.setKeys([
                {
                    frame: 0,
                    value: orbitController.pivot.rotation.clone(),
                },
                {
                    frame: frameCount,
                    value: new Vector3(pitch, yaw, 0),
                },
            ]);

            this.applyEasing(rotAnim, options.easing);
            animations.push(rotAnim);
        }

        // Animation 3: Camera Distance (custom property)
        let distanceAnimation: Promise<void> | undefined;
        if (targetState.cameraDistance !== undefined) {
            distanceAnimation = this.animateCameraDistance(
                orbitController,
                targetState.cameraDistance,
                frameCount,
                fps,
                options.easing,
            );
        } else if (targetState.position && targetState.target) {
            // Calculate distance from position to target
            const dx = targetState.position.x - targetState.target.x;
            const dy = targetState.position.y - targetState.target.y;
            const dz = targetState.position.z - targetState.target.z;
            const calculatedDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            distanceAnimation = this.animateCameraDistance(
                orbitController,
                calculatedDistance,
                frameCount,
                fps,
                options.easing,
            );
        }

        // Apply animations to pivot
        if (animations.length > 0) {
            orbitController.pivot.animations = animations;

            await new Promise<void>((resolve) => {
                let settled = false;

                const safeSettle = (): void => {
                    if (!settled) {
                        settled = true;
                        resolve();
                    }
                };

                this.scene.beginAnimation(orbitController.pivot, 0, frameCount, false, 1.0, () => {
                    // Wait for distance animation to complete
                    const finalize = async (): Promise<void> => {
                        if (distanceAnimation) {
                            await distanceAnimation;
                        }

                        // Ensure final state is applied exactly
                        if (targetState.target) {
                            orbitController.pivot.position.set(
                                targetState.target.x,
                                targetState.target.y,
                                targetState.target.z,
                            );
                        }

                        if (targetState.pivotRotation) {
                            orbitController.pivot.rotation.set(
                                targetState.pivotRotation.x,
                                targetState.pivotRotation.y,
                                targetState.pivotRotation.z,
                            );
                        } else if (targetState.position && targetState.target) {
                            const direction = new Vector3(
                                targetState.position.x - targetState.target.x,
                                targetState.position.y - targetState.target.y,
                                targetState.position.z - targetState.target.z,
                            );
                            const distance = direction.length();
                            const yaw = Math.atan2(direction.x, direction.z) + Math.PI;
                            const pitch = Math.asin(direction.y / distance);
                            orbitController.pivot.rotation.set(pitch, yaw, 0);
                        }

                        orbitController.pivot.computeWorldMatrix(true);
                        orbitController.updateCameraPosition();

                        // Emit completion event
                        this.eventManager.emitGraphEvent("camera-state-changed", {
                            state: targetState,
                        });

                        safeSettle();
                    };

                    void finalize();
                });

                // Handle cancellation via AbortSignal - just resolve (don't reject)
                // to avoid unhandled promise rejections during cleanup
                if (signal) {
                    signal.addEventListener(
                        "abort",
                        () => {
                            // Stop the animation
                            this.scene.stopAnimation(orbitController.pivot);
                            // Resolve instead of reject to prevent unhandled rejection during cleanup
                            // The operation queue will handle the abort signal separately
                            safeSettle();
                        },
                        { once: true },
                    );
                }
            });
        } else if (distanceAnimation) {
            // Only distance animation
            await distanceAnimation;
            this.eventManager.emitGraphEvent("camera-state-changed", {
                state: targetState,
            });
        }
    }

    /**
     * Animate 2D camera (zoom and pan)
     * @param targetState - Target camera state to animate to
     * @param options - Animation configuration options
     * @param signal - Optional abort signal to cancel animation
     */
    private async animate2DCamera(
        targetState: import("./screenshot/types.js").CameraState,
        options: import("./screenshot/types.js").CameraAnimationOptions,
        signal?: AbortSignal,
    ): Promise<void> {
        const controller = this.camera.getActiveController();

        // Type guard for 2D controller
        if (!controller || !("velocity" in controller)) {
            this.applyCameraStateImmediate(targetState);
            return;
        }

        const twoDController = controller as unknown as {
            camera: {
                position: Vector3;
                orthoLeft: number | null;
                orthoRight: number | null;
                orthoTop: number | null;
                orthoBottom: number | null;
            };
            config: {
                initialOrthoSize: number;
            };
        };

        const fps = 60;
        const duration = options.duration ?? 1000;
        const frameCount = Math.floor(duration / (1000 / fps));

        // Create dummy object to animate camera properties
        const dummy = {
            posX: twoDController.camera.position.x,
            posY: twoDController.camera.position.y,
            orthoLeft: twoDController.camera.orthoLeft ?? -1,
            orthoRight: twoDController.camera.orthoRight ?? 1,
            orthoTop: twoDController.camera.orthoTop ?? 1,
            orthoBottom: twoDController.camera.orthoBottom ?? -1,
        };

        const animations: Animation[] = [];

        // Animate zoom (ortho bounds)
        if (targetState.zoom !== undefined) {
            // Calculate target ortho bounds based on zoom factor
            // Zoom is absolute: 1.0 = initial size, 2.0 = half size (zoomed in), 0.5 = double size (zoomed out)
            const initialSize = twoDController.config.initialOrthoSize;
            const targetSize = initialSize / targetState.zoom;

            const orthoLeftAnim = new Animation(
                "ortho_left",
                "orthoLeft",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            orthoLeftAnim.setKeys([
                { frame: 0, value: dummy.orthoLeft },
                { frame: frameCount, value: -targetSize },
            ]);
            this.applyEasing(orthoLeftAnim, options.easing);
            animations.push(orthoLeftAnim);

            const orthoRightAnim = new Animation(
                "ortho_right",
                "orthoRight",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            orthoRightAnim.setKeys([
                { frame: 0, value: dummy.orthoRight },
                { frame: frameCount, value: targetSize },
            ]);
            this.applyEasing(orthoRightAnim, options.easing);
            animations.push(orthoRightAnim);

            // Calculate aspect ratio to maintain proportions
            const aspect = (dummy.orthoTop - dummy.orthoBottom) / (dummy.orthoRight - dummy.orthoLeft);
            const orthoTopAnim = new Animation(
                "ortho_top",
                "orthoTop",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            orthoTopAnim.setKeys([
                { frame: 0, value: dummy.orthoTop },
                { frame: frameCount, value: targetSize * aspect },
            ]);
            this.applyEasing(orthoTopAnim, options.easing);
            animations.push(orthoTopAnim);

            const orthoBottomAnim = new Animation(
                "ortho_bottom",
                "orthoBottom",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            orthoBottomAnim.setKeys([
                { frame: 0, value: dummy.orthoBottom },
                { frame: frameCount, value: -targetSize * aspect },
            ]);
            this.applyEasing(orthoBottomAnim, options.easing);
            animations.push(orthoBottomAnim);
        }

        // Animate pan (camera position)
        if (targetState.pan?.x !== undefined) {
            const panXAnim = new Animation(
                "camera_pan_x",
                "posX",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );

            panXAnim.setKeys([
                { frame: 0, value: twoDController.camera.position.x },
                { frame: frameCount, value: targetState.pan.x },
            ]);

            this.applyEasing(panXAnim, options.easing);
            animations.push(panXAnim);
        }

        if (targetState.pan?.y !== undefined) {
            const panYAnim = new Animation(
                "camera_pan_y",
                "posY",
                fps,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );

            panYAnim.setKeys([
                { frame: 0, value: twoDController.camera.position.y },
                { frame: frameCount, value: targetState.pan.y },
            ]);

            this.applyEasing(panYAnim, options.easing);
            animations.push(panYAnim);
        }

        if (animations.length === 0) {
            return;
        }

        await new Promise<void>((resolve) => {
            let settled = false;
            let observer: ReturnType<typeof this.scene.onBeforeRenderObservable.add> | null = null;

            const safeSettle = (): void => {
                if (!settled) {
                    settled = true;
                    // Cleanup observer
                    if (observer) {
                        this.scene.onBeforeRenderObservable.remove(observer);
                    }

                    resolve();
                }
            };

            // Create observer to update controller
            observer = this.scene.onBeforeRenderObservable.add(() => {
                twoDController.camera.position.x = dummy.posX;
                twoDController.camera.position.y = dummy.posY;
                twoDController.camera.orthoLeft = dummy.orthoLeft;
                twoDController.camera.orthoRight = dummy.orthoRight;
                twoDController.camera.orthoTop = dummy.orthoTop;
                twoDController.camera.orthoBottom = dummy.orthoBottom;
            });

            // Animate dummy object
            const animatable = this.scene.beginDirectAnimation(dummy, animations, 0, frameCount, false, 1.0, () => {
                // Apply final values exactly from dummy (already calculated during animation)
                if (targetState.pan) {
                    twoDController.camera.position.x = dummy.posX;
                    twoDController.camera.position.y = dummy.posY;
                }

                if (targetState.zoom !== undefined) {
                    twoDController.camera.orthoLeft = dummy.orthoLeft;
                    twoDController.camera.orthoRight = dummy.orthoRight;
                    twoDController.camera.orthoTop = dummy.orthoTop;
                    twoDController.camera.orthoBottom = dummy.orthoBottom;
                }

                this.eventManager.emitGraphEvent("camera-state-changed", {
                    state: targetState,
                });

                safeSettle();
            });

            // Handle cancellation via AbortSignal - just resolve (don't reject)
            // to avoid unhandled promise rejections during cleanup
            if (signal) {
                signal.addEventListener(
                    "abort",
                    () => {
                        // Stop the animation
                        animatable.stop();
                        // Resolve instead of reject to prevent unhandled rejection during cleanup
                        // The operation queue will handle the abort signal separately
                        safeSettle();
                    },
                    { once: true },
                );
            }
        });
    }

    /**
     * Phase 4 Convenience Methods
     */

    /**
     * Set camera position (3D)
     * @param position - Camera position coordinates
     * @param position.x - X coordinate
     * @param position.y - Y coordinate
     * @param position.z - Z coordinate
     * @param options - Optional animation configuration
     * @returns Promise that resolves when camera position is set
     */
    async setCameraPosition(
        position: { x: number; y: number; z: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        // Get current state to preserve target only
        // Don't copy pivotRotation/cameraDistance - let them be recalculated
        const currentState = this.getCameraState();
        return this.setCameraState({ position, target: currentState.target }, options);
    }

    /**
     * Set camera target (3D)
     * @param target - Camera target coordinates
     * @param target.x - X coordinate
     * @param target.y - Y coordinate
     * @param target.z - Z coordinate
     * @param options - Optional animation configuration
     * @returns Promise that resolves when camera target is set
     */
    async setCameraTarget(
        target: { x: number; y: number; z: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        // Get current state to preserve position only
        // Don't copy pivotRotation/cameraDistance - let them be recalculated
        const currentState = this.getCameraState();
        return this.setCameraState({ position: currentState.position, target }, options);
    }

    /**
     * Set camera zoom (2D)
     * @param zoom - Zoom level (1.0 = default, >1 = zoomed in, <1 = zoomed out)
     * @param options - Optional animation configuration
     * @returns Promise that resolves when zoom is set
     */
    async setCameraZoom(zoom: number, options?: import("./screenshot/types.js").CameraAnimationOptions): Promise<void> {
        return this.setCameraState({ zoom }, options);
    }

    /**
     * Set camera pan (2D)
     * @param pan - Pan offset coordinates
     * @param pan.x - X offset
     * @param pan.y - Y offset
     * @param options - Optional animation configuration
     * @returns Promise that resolves when pan is set
     */
    async setCameraPan(
        pan: { x: number; y: number },
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.setCameraState({ pan }, options);
    }

    /**
     * Reset camera to default state
     * @param options - Optional animation configuration
     * @returns Promise that resolves when camera is reset
     */
    async resetCamera(options?: import("./screenshot/types.js").CameraAnimationOptions): Promise<void> {
        // Get default camera state from current controller
        const defaultState = this.getDefaultCameraState();
        return this.setCameraState(defaultState, options);
    }

    /**
     * Get default camera state for current camera type
     * Lazily captures the initial state on first use, or returns captured state
     * @returns The default camera state
     */
    private getDefaultCameraState(): import("./screenshot/types.js").CameraState {
        // If we haven't captured initial state yet, capture it now
        // This happens on the first call to resetCamera()
        this.initialCameraState ??= this.getCameraState();

        return this.initialCameraState;
    }

    /**
     * The box the camera is being asked to frame, measured over whatever is in scope.
     * @param nodeIds - The nodes to measure over. Undefined means every node in the graph.
     * @returns The box, marked with how many nodes it was measured over.
     */
    private boundsToFrame(nodeIds?: Iterable<string | number>): GraphBounds {
        const nodes =
            nodeIds === undefined
                ? this.getNodes()
                : [...nodeIds].map((id) => this.getNode(id)).filter((node): node is Node => node !== undefined);

        return measureBounds(nodes.map((node) => node.getPosition()));
    }

    /**
     * Everything a camera view is told: the box, the drawing mode, the viewport and where the
     * camera is now.
     * @param bounds - The box to frame.
     * @param options - The view's own options, as the caller passed them.
     * @returns The context to resolve a view against.
     * @throws A plain `Error` when there is no camera to read the mode and the viewport from.
     */
    private cameraViewContext(bounds: GraphBounds, options?: Readonly<Record<string, unknown>>): CameraViewContext {
        const camera = this.scene.activeCamera;
        if (!camera) {
            throw new Error("No active camera");
        }

        const engine = camera.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const mode: DrawingMode = camera.mode === Camera.ORTHOGRAPHIC_CAMERA ? "2d" : "3d";

        // A perspective camera is the only one with a field of view to report. Passing the
        // orthographic camera's inherited `fov` would hand a flat view a number that means
        // nothing there, and a plugin would have no way to tell it was meaningless.
        const fov = mode === "3d" && "fov" in camera && typeof camera.fov === "number" ? camera.fov : undefined;

        return {
            bounds,
            mode,
            aspect: height === 0 ? 1 : width / height,
            viewport: { width, height },
            ...(fov === undefined ? {} : { fov }),
            current: this.getCameraState(),
            ...(options === undefined ? {} : { options }),
        };
    }

    /**
     * Work out where a named camera view would put the viewer, without moving anything.
     *
     * The name is resolved against the views the element ships and then the views a third party
     * registered, so a plugin's view is named exactly the way `"isometric"` is. A name that is
     * neither, and is not a snapshot this graph saved, is refused with `E_UNKNOWN_CAMERA`.
     * @param preset - The view's name, or the name of a snapshot saved with `saveCameraPreset`.
     * @param options - What to frame and how to configure the view.
     * @param options.nodes - The nodes to measure the box over. Absent frames the whole graph.
     * @param options.params - The view's own options, filled in from its declared defaults.
     * @returns The camera state the view computed.
     * @throws A `GraphtyError` with `E_UNKNOWN_CAMERA` when nothing answers to the name,
     * `E_UNSUPPORTED` when the view does not work in the drawing mode the element is in, or
     * `E_UNKNOWN_OPTION` / `E_OPTION_RANGE` when `params` is not what the view declared.
     */
    resolveCameraPreset(
        preset: string,
        options?: { nodes?: Iterable<string | number>; params?: Readonly<Record<string, unknown>> },
    ): CameraState {
        /* A VIEW IS ASKED FIRST, AND ONLY THEN A SNAPSHOT. `saveCameraPreset` refuses a name a
           view holds AT THE MOMENT OF SAVING, which leaves one order of events open: a consumer
           saves "acme-corner" on Monday, a plugin registers a view under that name on Tuesday,
           and from then on the name means a fixed position where a rule was intended -- with
           nothing thrown and nothing logged. A built-in name is reserved from process start and
           can never be shadowed this way, so asking the views first is what gives a registered
           view the same protection the element's own five have. A snapshot whose name no view
           holds is still reached by the name its author chose. */
        if (!isCameraViewName(preset)) {
            const snapshot = this.userCameraPresets.get(preset);
            if (snapshot) {
                return snapshot;
            }
        }

        const context = this.cameraViewContext(this.boundsToFrame(options?.nodes), options?.params);

        return resolveCameraView(preset, context);
    }

    /**
     * Put the viewer where a named camera view says they should stand.
     *
     * This is the route that can frame a SUBSET. The element measures the box over whatever the
     * scope covers and hands the smaller box to the view, so every view -- the element's own and
     * a third party's alike -- frames a selection with no code of its own.
     * @param id - The view's name.
     * @param options - The scope to frame, the view's own options, and how to get there.
     *   Animation follows the same rules as `setCameraState`.
     * @param options.scope - What to frame. Absent frames the whole graph.
     * @param options.params - The view's own options, filled in from its declared defaults.
     * @returns A promise that resolves once the camera has arrived.
     * @throws A `GraphtyError` with `E_UNKNOWN_CAMERA`, `E_UNSUPPORTED`, `E_UNKNOWN_OPTION` or
     * `E_OPTION_RANGE`, exactly as `resolveCameraPreset` does.
     */
    async applyCameraView(
        id: string,
        options?: {
            scope?: Scope;
            params?: Readonly<Record<string, unknown>>;
        } & import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        const scope = options?.scope;
        const nodes = scope === undefined ? undefined : (await this.getSession().scope.resolve(scope)).nodes;
        const state = this.resolveCameraPreset(id, {
            ...(nodes === undefined ? {} : { nodes }),
            ...(options?.params === undefined ? {} : { params: options.params }),
        });

        return this.setCameraState(state, options);
    }

    /**
     * Save where the camera is now under a name of the consumer's choosing.
     *
     * A snapshot records a POSITION, not a rule: it cannot re-derive itself for a different graph
     * the way a camera view does. Which is why a name a view already holds -- the element's own
     * or a registered one -- is refused rather than shadowed.
     * @param name - The name to save it under.
     * @throws A `GraphtyError` with `E_PROTECTED` when a camera view already answers to the name.
     */
    saveCameraPreset(name: string): void {
        if (isCameraViewName(name)) {
            throw new GraphtyError({
                code: "E_PROTECTED",
                message:
                    `"${name}" is a camera view, and a view recomputes itself for whatever is on screen. ` +
                    "Saving a fixed position under the same name would silently replace a rule with a snapshot.",
                source: "view",
                details: { name, available: cameraViewIds() },
            });
        }

        const currentState = this.getCameraState();
        this.userCameraPresets.set(name, currentState);
    }

    /**
     * Load a camera preset (built-in or user-defined)
     * @param name - Name of the preset to load
     * @param options - Optional animation configuration
     * @returns Promise that resolves when camera state is applied
     */
    async loadCameraPreset(
        name: string,
        options?: import("./screenshot/types.js").CameraAnimationOptions,
    ): Promise<void> {
        return this.setCameraState({ preset: name } as { preset: string }, options);
    }

    /**
     * Every name `loadCameraPreset` will answer to: the camera views, then this graph's snapshots.
     *
     * `{ builtin: true }` marks a name that is a VIEW -- a rule recomputed against whatever is on
     * screen -- as against a snapshot, which is a fixed state and is returned as one. A view a
     * third party registered is listed on the same terms as one the element ships, because a
     * picker built from this list would otherwise offer the element's own views and silently omit
     * everybody else's. What each view is called in plain words, and which drawing modes it works
     * in, is in `session.catalog.cameras()`.
     * @returns Every name, mapped to the snapshot it holds or to the computed-view marker.
     */
    getCameraPresets(): Record<string, import("./screenshot/types.js").CameraState | { builtin: true }> {
        const presets: Record<string, import("./screenshot/types.js").CameraState | { builtin: true }> = {};

        for (const name of cameraViewIds()) {
            presets[name] = { builtin: true };
        }

        // User-defined presets
        for (const [name, state] of this.userCameraPresets.entries()) {
            presets[name] = state;
        }

        return presets;
    }

    /**
     * Export user-defined presets as JSON
     * @returns Object mapping preset names to camera states
     */
    exportCameraPresets(): Record<string, import("./screenshot/types.js").CameraState> {
        const exported: Record<string, import("./screenshot/types.js").CameraState> = {};
        for (const [name, state] of this.userCameraPresets.entries()) {
            exported[name] = state;
        }
        return exported;
    }

    /**
     * Import user-defined presets from JSON
     * @param presets - Object mapping preset names to camera states
     */
    importCameraPresets(presets: Record<string, import("./screenshot/types.js").CameraState>): void {
        for (const [name, state] of Object.entries(presets)) {
            // A registered view is skipped for the same reason a built-in one is: the imported
            // entry is a fixed position, and overwriting a view with it would quietly turn a rule
            // that recomputes itself for the graph on screen into one that does not.
            if (isCameraViewName(name)) {
                console.warn(`Skipping import of camera preset "${name}": a camera view already answers to that name`);
                continue;
            }

            this.userCameraPresets.set(name, state);
        }
    }

    /**
     * Set graph data (delegates to data manager)
     * @param data - Graph data object
     * @param data.nodes - Array of node data objects
     * @param data.edges - Array of edge data objects
     */
    setData(data: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }): void {
        // Add nodes
        for (const nodeData of data.nodes) {
            this.addNode(nodeData as AdHocData).catch((e: unknown) => {
                console.error("Error adding node:", e);
            });
        }

        // Add edges
        for (const edgeData of data.edges) {
            this.addEdge(edgeData as AdHocData).catch((e: unknown) => {
                console.error("Error adding edge:", e);
            });
        }
    }

    /**
     * Get a specific node
     * @param nodeId - ID of the node to retrieve
     * @returns The node instance or undefined if not found
     */
    getNode(nodeId: string | number): Node | undefined {
        return this.dataManager.getNode(nodeId);
    }

    /**
     * Get all nodes
     * @returns Array of all node instances
     */
    getNodes(): Node[] {
        return Array.from(this.dataManager.nodes.values());
    }

    /**
     * Render method (public for testing)
     */
    render(): void {
        this.scene.render();
    }

    // ===========================================
    // AI Control Methods (Phase 3)
    // ===========================================

    // AI Manager instance (lazy-initialized)
    private aiManager: import("./ai/AiManager").AiManager | null = null;

    /**
     * Enable AI-powered natural language control of the graph.
     * @param config - AI configuration including provider and optional API key
     * @returns Promise resolving when AI is ready
     * @example
     * ```typescript
     * // Enable with mock provider (for testing)
     * await graph.enableAiControl({ provider: 'mock' });
     *
     * // Enable with OpenAI
     * await graph.enableAiControl({
     *   provider: 'openai',
     *   apiKey: 'sk-...'
     * });
     *
     * // Now you can send commands
     * const result = await graph.aiCommand('Show me the graph summary');
     * ```
     */
    async enableAiControl(config: import("./ai/AiManager").AiManagerConfig): Promise<void> {
        // Dynamically import to avoid loading AI code when not needed
        const { AiManager } = await import("./ai/AiManager");

        // Create and initialize AI manager
        this.aiManager = new AiManager();
        this.aiManager.init(this, config);
    }

    /**
     * Disable AI control and clean up resources.
     * @example
     * ```typescript
     * graph.disableAiControl();
     * // AI commands will no longer work
     * ```
     */
    disableAiControl(): void {
        if (this.aiManager) {
            this.aiManager.dispose();
            this.aiManager = null;
        }
    }

    /**
     * Send a natural language command to the AI controller.
     * @param input - Natural language command (e.g., "switch to circular layout")
     * @returns Promise resolving to command result
     * @example
     * ```typescript
     * // Query graph info
     * const result = await graph.aiCommand('How many nodes are there?');
     * console.log(result.message);
     *
     * // Change layout
     * await graph.aiCommand('Use circular layout');
     *
     * // Switch dimension
     * await graph.aiCommand('Show in 2D');
     * ```
     */
    async aiCommand(input: string): Promise<import("./ai/AiController").ExecutionResult> {
        if (!this.aiManager) {
            return {
                success: false,
                message: "AI control is not enabled. Call enableAiControl() first.",
            };
        }

        return this.aiManager.execute(input);
    }

    /**
     * Get the current AI status synchronously.
     * @returns Current AI status or null if AI is not enabled
     * @example
     * ```typescript
     * const status = graph.getAiStatus();
     * if (status?.state === 'executing') {
     *   console.log('AI is processing a command...');
     * }
     * ```
     */
    getAiStatus(): import("./ai/AiStatus").AiStatus | null {
        return this.aiManager?.getStatus() ?? null;
    }

    /**
     * Subscribe to AI status changes.
     * @param callback - Function called when status changes
     * @returns Unsubscribe function
     * @example
     * ```typescript
     * const unsubscribe = graph.onAiStatusChange((status) => {
     *   console.log('AI state:', status.state);
     *   if (status.streamedText) {
     *     console.log('Response:', status.streamedText);
     *   }
     * });
     *
     * // Later: stop listening
     * unsubscribe();
     * ```
     */
    onAiStatusChange(callback: import("./ai/AiStatus").StatusChangeCallback): () => void {
        if (!this.aiManager) {
            // Return no-op unsubscribe if AI not enabled
            return (): void => undefined;
        }

        return this.aiManager.onStatusChange(callback);
    }

    /**
     * Cancel any in-progress AI command.
     * @example
     * ```typescript
     * // Start a long-running command
     * const promise = graph.aiCommand('complex query');
     *
     * // Cancel it
     * graph.cancelAiCommand();
     * ```
     */
    cancelAiCommand(): void {
        this.aiManager?.cancel();
    }

    /**
     * Get the AI manager for advanced configuration.
     * Returns null if AI is not enabled.
     * @returns The AI manager or null
     * @example
     * ```typescript
     * const manager = graph.getAiManager();
     * if (manager) {
     *   // Register custom command
     *   manager.registerCommand(myCustomCommand);
     * }
     * ```
     */
    getAiManager(): import("./ai/AiManager").AiManager | null {
        return this.aiManager;
    }

    /**
     * Check if AI control is currently enabled.
     * @returns True if AI is enabled
     */
    isAiEnabled(): boolean {
        return this.aiManager !== null;
    }

    /**
     * Retry the last AI command.
     * Useful for retrying after transient errors.
     * @returns Promise resolving to command result
     * @throws Error if AI not enabled or no previous command
     * @example
     * ```typescript
     * // After a failed command
     * try {
     *   const result = await graph.retryLastAiCommand();
     *   console.log('Retry succeeded:', result);
     * } catch (error) {
     *   console.error('Retry failed:', error);
     * }
     * ```
     */
    retryLastAiCommand(): Promise<import("./ai/AiController").ExecutionResult> {
        if (!this.aiManager) {
            return Promise.reject(new Error("AI not enabled. Call enableAiControl() first."));
        }

        return this.aiManager.retry();
    }

    /**
     * Get the API key manager for configuring keys before enabling AI.
     * Returns null if AI has never been enabled.
     * @returns The API key manager or null
     * @example
     * ```typescript
     * const keyManager = graph.getApiKeyManager();
     * if (keyManager) {
     *   const providers = keyManager.getConfiguredProviders();
     *   console.log('Configured providers:', providers);
     * }
     * ```
     */
    getApiKeyManager(): ApiKeyManager | null {
        return this.aiManager?.getApiKeyManager() ?? null;
    }

    /**
     * Create a standalone ApiKeyManager for key management without enabling AI.
     * Useful for settings UIs that configure keys before AI activation.
     *
     * ASYNCHRONOUS, AND THE REASON IS THE BUNDLE. The key store encrypts what it persists, so it
     * imports `encrypt-storage`. This method used to construct one directly, which made that a
     * STATIC import of `Graph` -- and `Graph` is what the root entry point pulls in. The result
     * was that an encryption library shipped to every consumer who drew a graph and never touched
     * the AI layer, which is exactly what the separate `./ai` entry point exists to prevent. The
     * entry point's own comment claimed no such cost; for the three LLM SDKs that was true, and
     * for this one it was not.
     *
     * A consumer who wants it synchronously imports `ApiKeyManager` from
     * `@graphty/graphty-element/ai` and constructs it themselves -- which is the honest shape,
     * because they are then choosing to load the encryption library.
     * @returns A new ApiKeyManager instance
     * @example
     * ```typescript
     * // In a settings UI component
     * const keyManager = await Graph.createApiKeyManager();
     * keyManager.enablePersistence({
     *   encryptionKey: userSecret,
     *   storage: 'localStorage',
     * });
     * keyManager.setKey('openai', apiKey);
     * ```
     */
    static async createApiKeyManager(): Promise<ApiKeyManager> {
        const { ApiKeyManager: KeyManager } = await import("./ai/keys");

        return new KeyManager();
    }

    // ===========================================
    // Voice Input Methods (Phase 6)
    // ===========================================

    // Voice input adapter instance (lazy-initialized)
    private voiceAdapter: VoiceInputAdapter | null = null;

    /**
     * Get the voice input adapter.
     * Creates the adapter on first use.
     * @returns The voice input adapter
     * @example
     * ```typescript
     * const adapter = graph.getVoiceAdapter();
     * if (adapter.isSupported) {
     *   adapter.start({ continuous: true });
     * }
     * ```
     */
    getVoiceAdapter(): VoiceInputAdapter {
        this.voiceAdapter ??= new VoiceInputAdapter();

        return this.voiceAdapter;
    }

    /**
     * Start voice input and execute commands.
     * @param options - Voice input options
     * @param options.continuous - Whether to continuously listen for input
     * @param options.interimResults - Whether to return interim transcription results
     * @param options.language - BCP 47 language tag (e.g., "en-US", "fr-FR")
     * @param options.onTranscript - Callback for transcription events
     * @param options.onStart - Callback when voice input starts
     * @returns True if voice input started successfully
     * @example
     * ```typescript
     * graph.startVoiceInput({
     *   continuous: true,
     *   interimResults: true,
     *   onTranscript: (text, isFinal) => {
     *     console.log('Transcript:', text, isFinal ? '(final)' : '(interim)');
     *     if (isFinal) {
     *       graph.aiCommand(text);
     *     }
     *   },
     * });
     * ```
     */
    startVoiceInput(options?: {
        continuous?: boolean;
        interimResults?: boolean;
        language?: string;
        onTranscript?: (text: string, isFinal: boolean) => void;
        onStart?: (started: boolean, error?: string) => void;
    }): boolean {
        const adapter = this.getVoiceAdapter();

        if (!adapter.isSupported) {
            console.warn("Voice input is not supported in this browser");
            return false;
        }

        // Register transcript callback if provided
        if (options?.onTranscript) {
            adapter.onInput(options.onTranscript);
        }

        // Register start callback if provided
        if (options?.onStart) {
            adapter.onStart(options.onStart);
        }

        // Start listening
        adapter.start({
            continuous: options?.continuous ?? false,
            interimResults: options?.interimResults ?? true,
            language: options?.language ?? "en-US",
        });

        // Return true because permission is being requested
        // Actual start/failure will be notified via onStart callback
        return true;
    }

    /**
     * Stop voice input.
     * @example
     * ```typescript
     * graph.stopVoiceInput();
     * ```
     */
    stopVoiceInput(): void {
        this.voiceAdapter?.stop();
    }

    /**
     * Check if voice input is currently active.
     * @returns True if voice input is active
     */
    isVoiceActive(): boolean {
        return this.voiceAdapter?.isActive ?? false;
    }

    // ===========================================
    // XR (VR/AR) Methods
    // ===========================================

    /**
     * Initialize XR (VR/AR) system
     * Creates session manager and UI buttons based on configuration
     */
    private async initializeXR(): Promise<void> {
        const xrConfig = this.graphContext.getConfig().xr;
        if (!xrConfig?.enabled) {
            return;
        }

        // Create XR session manager
        this.xrSessionManager = new XRSessionManager(this.scene, {
            vr: xrConfig.vr,
            ar: xrConfig.ar,
            handTracking: xrConfig.input.handTracking,
        });

        // Determine which modes are available by actually checking device support
        const vrAvailable = xrConfig.vr.enabled && (await this.xrSessionManager.isVRSupported());
        const arAvailable = xrConfig.ar.enabled && (await this.xrSessionManager.isARSupported());

        // Create XR UI manager
        this.xrUIManager = new XRUIManager(this.element as HTMLElement, vrAvailable, arAvailable, xrConfig.ui);

        // Wire up button click handlers
        this.xrUIManager.onEnterXR = (mode) => {
            void (async () => {
                try {
                    await this.enterXR(mode);
                } catch (error) {
                    console.error("Failed to enter XR mode:", error);

                    // Show user-friendly alert on error
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    alert(`XR Session Failed:\n${errorMsg}\n\nCheck console for details.`);

                    // Emit error event
                    this.eventManager.emitGraphError(
                        this,
                        error instanceof Error ? error : new Error(String(error)),
                        "xr",
                        { mode },
                    );
                }
            })();
        };
    }

    /**
     * Enter XR mode (VR or AR)
     * @param mode - The XR mode to enter ('immersive-vr' or 'immersive-ar')
     */
    public async enterXR(mode: "immersive-vr" | "immersive-ar"): Promise<void> {
        if (!this.xrSessionManager) {
            throw new Error("XR is not initialized");
        }

        const previousCamera = this.camera.getActiveController()?.camera;

        if (mode === "immersive-vr") {
            await this.xrSessionManager.enterVR(previousCamera ?? undefined);
        } else {
            await this.xrSessionManager.enterAR(previousCamera ?? undefined);
        }

        // Phase 3: Set up XR camera controller and input handler
        const xrHelper = this.xrSessionManager.getXRHelper();
        if (!xrHelper) {
            throw new Error("XR helper not available after session creation");
        }

        // Store XR helper in scene metadata for isXRMode() detection
        this.scene.metadata = this.scene.metadata ?? {};
        this.scene.metadata.xrHelper = xrHelper;

        // Create XR pivot camera controller (handles input via pivot-based system)
        const { XRPivotCameraController } = await import("./cameras/XRPivotCameraController");
        const xrCameraController = new XRPivotCameraController(this.scene, xrHelper);

        // Note: XRPivotCameraController automatically enables input when XR state changes
        // We just need to call update() every frame for input processing

        // Hook into render loop to update XR input
        const xrUpdateObserver = this.scene.onBeforeRenderObservable.add(() => {
            xrCameraController.update();
        });

        // Store for cleanup
        this.scene.metadata.xrCameraController = xrCameraController;
        this.scene.metadata.xrUpdateObserver = xrUpdateObserver;
    }

    /**
     * Exit XR mode and return to previous camera
     */
    public async exitXR(): Promise<void> {
        if (!this.xrSessionManager) {
            return;
        }

        // Clean up XR camera controller
        if (this.scene.metadata?.xrCameraController) {
            this.scene.metadata.xrCameraController.dispose();
            this.scene.metadata.xrCameraController = null;
        }

        // Remove render loop observer
        if (this.scene.metadata?.xrUpdateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.scene.metadata.xrUpdateObserver);
            this.scene.metadata.xrUpdateObserver = null;
        }

        // Clear XR helper from metadata
        if (this.scene.metadata?.xrHelper) {
            this.scene.metadata.xrHelper = null;
        }

        await this.xrSessionManager.exitXR();
    }

    /**
     * Dispose all graph resources including voice, AI, XR, and Babylon.js components.
     */
    dispose(): void {
        // Clean up voice adapter if created
        this.voiceAdapter?.dispose();
        this.voiceAdapter = null;

        // Clean up AI manager if enabled
        this.disableAiControl();

        // Clean up XR resources
        this.xrUIManager?.dispose();
        this.xrSessionManager?.dispose();
        this.shutdown();
    }
}
