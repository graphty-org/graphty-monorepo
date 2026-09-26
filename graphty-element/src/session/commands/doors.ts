/**
 * @file The door list: every public member of graphty-element that could change it, and what
 * each one does about undo.
 *
 * A door is a public method, accessor or field. Each is classified as one of:
 *
 * - `readOnly`: it changes nothing;
 * - `exempt`, with the reason: it changes something no project file saves (the camera, the
 *   selection, work in flight, a machine preference);
 * - `dispatches`: it dispatches the command in its row, and nothing else;
 * - `partial`: it dispatches, but one call of it is not yet one step, until the phase it names;
 * - `knownGap`: it changes project state without the dispatcher, until the phase it names ports
 *   it. With an `op` it will dispatch that op; without one it is a public escape (a writable
 *   field, a live array) that the phase narrows.
 *
 * The roots are the element, `Graph`, `Node`, `Edge`, the session and each of its parts, the
 * `Run` handle, the style layer, every manager, and every type a public member of one of them
 * hands back that has methods. `test/session/history/door-surface.test.ts` walks the declared
 * types of the roots with the TypeScript compiler and fails on any public member this list does
 * not classify, and on any handle type that is not a root, so nothing public can ship without a
 * decision about undo. `test/session/history/doors.test.ts` (the session's rows) and
 * `test/browser/doors.test.ts` (the renderer's rows) call every row that dispatches or will
 * dispatch, with a spy on the dispatcher, and enforce the ratchet: a `knownGap` or `partial` row
 * whose phase is at or below {@link PLAN_PHASE} fails, as does a `knownGap` door that dispatches.
 *
 * No entry point exports this module. The phases are those of design/undo/undo-plan.md.
 */

/** The phases of the undo plan, in order. */
export const PHASES = [
    "1",
    "2",
    "3",
    "4a",
    "4b",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16a",
    "16b",
    "17",
    "18a",
    "18b",
    "18c",
    "19a",
    "19b",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25a",
    "25b",
    "25c",
    "26",
] as const;

/** One phase of the undo plan. */
type PlanPhase = (typeof PHASES)[number];

/** The phase this branch has reached. Each phase's commit raises it. */
export const PLAN_PHASE: PlanPhase = "6";

/** How the doors tests call a door. */
export type DoorCall =
    | {
          readonly kind: "call";
          /** The arguments, or a function building them where they cannot be plain data. */
          readonly args: readonly unknown[] | (() => readonly unknown[]);
      }
    | { readonly kind: "set"; readonly value: unknown };

/** What one door does about undo. */
export type Door =
    | { readonly kind: "readOnly" }
    | { readonly kind: "exempt"; readonly reason: string }
    | {
          readonly kind: "dispatches";
          readonly op: string;
          readonly call: DoorCall;
          /** The commands the call must dispatch, in order. */
          readonly expect: readonly unknown[];
      }
    | {
          readonly kind: "partial";
          readonly phase: PlanPhase;
          readonly reason: string;
          readonly op: string;
          readonly call: DoorCall;
          readonly expect: readonly unknown[];
      }
    | {
          readonly kind: "knownGap";
          readonly phase: PlanPhase;
          /** The op it will dispatch once ported; absent for an escape the phase narrows. */
          readonly op?: string;
          /** How to call it; present exactly when `op` is. */
          readonly call?: DoorCall;
      };

/** A type whose public members are doors. */
export interface DoorRoot {
    /** The declared name of the class or interface. */
    readonly name: string;
    /** The file declaring it, relative to the package root. */
    readonly file: string;
    /** Which doors test calls its rows: the Node one on a session, or the browser one on a `Graph`. */
    readonly half: "session" | "renderer";
    /** One row per public member. */
    readonly doors?: Readonly<Record<string, Door>>;
    /** For a type every member of which has the same answer: that answer. */
    readonly whole?: Door;
}

const READ: Door = { kind: "readOnly" };

/**
 * An exempt door.
 * @param reason - Why it changes nothing a project file saves.
 * @returns The door.
 */
function exempt(reason: string): Door {
    return { kind: "exempt", reason };
}

/**
 * A door that will dispatch `op` once `phase` ports it, called as a method.
 * @param phase - The phase that ports it.
 * @param op - The op it will dispatch.
 * @param args - The arguments to call it with.
 * @returns The door.
 */
function gap(phase: PlanPhase, op: string, args: readonly unknown[] | (() => readonly unknown[]) = []): Door {
    return { kind: "knownGap", phase, op, call: { kind: "call", args } };
}

/**
 * A property door that will dispatch `op` once `phase` ports it, called by assignment.
 * @param phase - The phase that ports it.
 * @param op - The op it will dispatch.
 * @param value - The value to assign.
 * @returns The door.
 */
function gapSet(phase: PlanPhase, op: string, value: unknown): Door {
    return { kind: "knownGap", phase, op, call: { kind: "set", value } };
}

/**
 * A public escape, a writable field or a live object, that `phase` makes read-only or private.
 * @param phase - The phase that narrows it.
 * @returns The door.
 */
function escape(phase: PlanPhase): Door {
    return { kind: "knownGap", phase };
}

/** A small graph document the JSON data source reads, for the load doors. */
const TINY_JSON = JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] });

/** The same document as a URL. */
const TINY_JSON_URL = `data:application/json,${encodeURIComponent(TINY_JSON)}`;

const CAMERA = exempt("The camera is view state, not saved in a project file.");
const XR = exempt("An XR device session is view state, not saved in a project file.");
const SELECTION = exempt("Selection is not a step; undo and redo select what they changed instead.");
const LISTEN = exempt("Subscribing observes changes and makes none.");
const LIFECYCLE = exempt("Lifecycle of the element or a part of it; the history is discarded with the session.");
const PROFILING = exempt("Profiling measures the renderer; it changes nothing a project file saves.");
const MACHINE = exempt("A preference about this machine's hardware, not about the graph.");
const CAPTURE = exempt("A capture reads the picture; it changes nothing.");
const TRANSPORT = exempt(
    "In-flight layout computation; where the layout comes to rest is recorded with the step that moved it.",
);
const RENDER = exempt(
    "A render object or render bookkeeping, derived from project state and rewritten by the derivation pass.",
);
const HISTORY = exempt("Moves through the history or groups commands into a step; it is not a step itself.");
const INPUT = exempt("Input handling and input preferences; the gestures it drives are doors of their own.");
const IN_FLIGHT = exempt("Stops or pauses work in flight; work in flight is not saved.");
const VIEW_SETTING = exempt("A rendering preference of this view, not saved in a project file.");
const HOST_HOOK = exempt("A function the host supplies; a project file cannot save it.");
const ASSISTANT = exempt(
    "The assistant's connection and status, not project state; what it does to the graph goes through the doors.",
);
const DERIVED = exempt("Derived from project state and rewritten whenever that state changes.");
const EXECUTE = exempt(
    "Runs a command; every op declares itself in COMMANDS, and the verb it reaches has its own row.",
);
const TOOLS = exempt("Registers or lists assistant tools; it runs none of them.");
const QUEUE = exempt("Schedules work; the doors that queue work have their own rows.");
const EVENTS = exempt("Publishes and subscribes to events; it changes no state.");
const KEYS = exempt("API keys are secrets of this machine, never saved in a project file.");
const TEST_INPUT = exempt("Synthetic input for tests; the gestures it drives are doors of their own.");
const MASK = exempt(
    "A live mask: the selection, which is not a step, or the visible set, derived from the visibility slice.",
);
const LLM = exempt("Talks to a language model; changes nothing in the graph.");
const BUDGET = exempt("The history's own budget, not project state.");

/** The rows of `GraphSession`, shared with the element's wider form of it. */
const SESSION: Readonly<Record<string, Door>> = {
    data: READ,
    runs: READ,
    results: READ,
    scope: READ,
    selection: READ,
    visibility: READ,
    styles: READ,
    positions: READ,
    seededNodeCount: READ,
    status: READ,
    catalog: READ,
    config: READ,
    capabilities: READ,
    acceleration: MACHINE,
    setAccelerator: MACHINE,
    snapshot: escape("18b"),
    fingerprint: READ,
    run: gap("15", "algo.run", [{ op: "algo.run", algorithm: "degree" }]),
    execute: EXECUTE,
    undo: HISTORY,
    redo: HISTORY,
    canUndo: READ,
    canRedo: READ,
    history: READ,
    transaction: HISTORY,
    estimate: READ,
    plan: READ,
    on: LISTEN,
    dispose: LIFECYCLE,
};

/** The rows of `SelectionApi`, shared with the element's wider form of it. */
const SELECTION_API: Readonly<Record<string, Door>> = {
    nodes: READ,
    edges: READ,
    size: READ,
    cap: READ,
    truncated: READ,
    has: READ,
    nodeMask: READ,
    edgeMask: READ,
    apply: SELECTION,
    clear: SELECTION,
    promote: gap("9", "scope.save", ["door set"]),
    statistics: READ,
};

/** The rows of `VisibilityApi`, shared with the element's wider form of it. */
const VISIBILITY_API: Readonly<Record<string, Door>> = {
    nodeMask: READ,
    edgeMask: READ,
    isVisible: READ,
    nodes: READ,
    edges: READ,
    summary: READ,
    filter: READ,
    window: READ,
    set: gap("8", "visibility.set", [{ kind: "degree", min: 1 }]),
    setWindow: gap("8", "visibility.window", [{ attribute: "data.t", from: 0, to: 1 }]),
    showContext: gapSet("8", "visibility.context", true),
};

/** The rows of `StylesApi`, shared with the element's wider form of it. */
const STYLES_API: Readonly<Record<string, Door>> = {
    list: READ,
    get: READ,
    validate: READ,
    add: gap("7", "style.patch", [
        { name: "door layer", target: "node", selector: "", set: { "node.color": "#ff0000" } },
    ]),
    update: gap("7", "style.patch", ["no-such-layer", { name: "renamed" }]),
    remove: gap("7", "style.patch", ["no-such-layer"]),
    move: gap("7", "style.patch", ["no-such-layer", null]),
    removeBySource: gap("7", "style.patch", [() => false]),
    encode: gap("7", "style.encode", [{ field: "data.weight", channel: "node.color" }]),
    highlight: gap("7", "style.patch", [{ nodes: ["n1"] }]),
    legend: READ,
    settled: READ,
    explain: READ,
    resolveToStatic: gap("7", "style.patch", ["no-such-layer", "node.color"]),
    applyTemplate: gap("7", "style.template", [{ layers: [] }]),
    toDocument: READ,
};

/** Every root, and the door of every public member. */
export const DOOR_ROOTS: readonly DoorRoot[] = [
    {
        name: "Graphty",
        file: "src/graphty-element.ts",
        half: "renderer",
        doors: {
            session: READ,
            run: gap("15", "algo.run", ["degree"]),
            select: SELECTION,
            connectedCallback: LIFECYCLE,
            firstUpdated: LIFECYCLE,
            asyncFirstUpdated: LIFECYCLE,
            render: LIFECYCLE,
            disconnectedCallback: LIFECYCLE,
            nodeData: gapSet("14", "data.apply", [{ id: "x1" }]),
            edgeData: gapSet("14", "batch", [{ src: "n1", dst: "n2" }]),
            dataSource: gapSet("14", "data.import", "json"),
            dataSourceConfig: gapSet("14", "data.import", { data: TINY_JSON }),
            clearData: gap("13", "data.apply", []),
            nodeIdPath: gapSet("10", "config.set", "id"),
            edgeSrcIdPath: gapSet("10", "config.set", "src"),
            edgeDstIdPath: gapSet("10", "config.set", "dst"),
            edgeIdPath: gapSet("10", "config.set", "id"),
            repeatedEdges: gapSet("10", "config.set", "keep"),
            nodeLabelPath: gapSet("10", "config.set", "label"),
            edgeWeightPath: gapSet("10", "config.set", "weight"),
            positionScale: gapSet("10", "config.set", 2),
            directed: gapSet("10", "config.set", true),
            layout: gapSet("17", "layout.set", "circular"),
            layoutConfig: gapSet("17", "layout.set", {}),
            layoutBehavior: gapSet("10", "config.set", { layout: { preSteps: 0 } }),
            selectionStyle: gapSet("10", "config.set", { color: "#ff0000" }),
            algorithmsOnLoad: gapSet("10", "config.set", []),
            viewMode: gapSet("17", "view.dimension", "2d"),
            layout2d: gapSet("17", "view.dimension", true),
            background: gapSet("10", "config.set", { backgroundType: "color", color: "#101010" }),
            startingCameraDistance: CAMERA,
            runAlgorithmsOnLoad: gapSet("10", "config.set", false),
            enableDetailedProfiling: PROFILING,
            xr: XR,
            captureScreenshot: CAPTURE,
            canCaptureScreenshot: READ,
            captureAnimation: CAPTURE,
            cancelAnimationCapture: CAPTURE,
            isAnimationCapturing: READ,
            estimateAnimationCapture: READ,
            getViewMode: READ,
            setViewMode: gap("17", "view.dimension", ["2d"]),
            isVRSupported: READ,
            isARSupported: READ,
            getCameraState: READ,
            setCameraState: CAMERA,
            setCameraPosition: CAMERA,
            setCameraTarget: CAMERA,
            setCameraZoom: CAMERA,
            setCameraPan: CAMERA,
            resetCamera: CAMERA,
            saveCameraPreset: gap("9", "view.save", ["door view"]),
            loadCameraPreset: CAMERA,
            getCameraPresets: READ,
            exportCameraPresets: READ,
            importCameraPresets: gap("9", "view.save", [{}]),
            graph: READ,
            addNode: gap("12", "data.apply", [{ id: "door-a" }]),
            addNodes: gap("12", "data.apply", [[{ id: "door-b" }]]),
            addEdge: gap("12", "data.apply", [{ src: "n1", dst: "n3" }]),
            addEdges: gap("12", "data.apply", [[{ src: "n3", dst: "n1" }]]),
            removeNodes: gap("13", "data.apply", [["n3"]]),
            updateNodes: gap("12", "data.apply", [[{ id: "n1", weight: 2 }]]),
            addDataFromSource: gap("14", "data.import", ["json", { data: TINY_JSON }]),
            loadFromUrl: gap("14", "data.import", [TINY_JSON_URL]),
            loadFromFile: gap("14", "data.import", () => [
                new File([TINY_JSON], "door.json", { type: "application/json" }),
            ]),
            pin: gap("16a", "positions.pin", [["n1"]]),
            unpin: gap("16a", "positions.pin", [["n1"]]),
            isPinned: READ,
            pinnedNodes: READ,
            getNode: READ,
            getNodes: READ,
            getNodeCount: READ,
            getEdgeCount: READ,
            selectNode: SELECTION,
            deselectNode: SELECTION,
            getSelectedNode: READ,
            isNodeSelected: READ,
            runAlgorithm: gap("15", "algo.run", ["graphty", "degree"]),
            applySuggestedStyles: gap("15", "style.patch", ["graphty:degree"]),
            getSuggestedStyles: READ,
            setLayout: gap("17", "layout.set", ["circular"]),
            zoomToFit: CAMERA,
            waitForSettled: READ,
            waitForStableFrame: READ,
            isFrameStable: READ,
            batchOperations: escape("19a"),
            on: LISTEN,
            addListener: LISTEN,
            listenerCount: READ,
            is2D: READ,
            setXRConfig: XR,
            getXRConfig: READ,
            exitXR: XR,
            resolveCameraPreset: READ,
            applyCameraView: CAMERA,
            setInputEnabled: INPUT,
            shutdown: LIFECYCLE,
            isRunning: READ,
            setRunning: IN_FLIGHT,
            worldToScreen: READ,
            screenToWorld: READ,
            setData: gap("14", "batch", [{ nodes: [{ id: "d1" }], edges: [] }]),
            getStyles: escape("10"),
            getDataManager: READ,
            getLayoutManager: READ,
            getUpdateManager: READ,
            getStatsManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getScene: READ,
            getMeshCache: READ,
            setCameraMode: CAMERA,
            getCameraController: READ,
            setRenderSettings: VIEW_SETTING,
            getNodeMesh: READ,
            getXRSessionManager: READ,
            enableAiControl: ASSISTANT,
            disableAiControl: ASSISTANT,
            aiCommand: escape("19a"),
            getAiStatus: READ,
            onAiStatusChange: LISTEN,
            cancelAiCommand: IN_FLIGHT,
            getAiManager: READ,
            isAiEnabled: READ,
            retryLastAiCommand: escape("19a"),
            getApiKeyManager: READ,
            getVoiceAdapter: READ,
            startVoiceInput: INPUT,
            stopVoiceInput: INPUT,
            isVoiceActive: READ,
            acceleration: MACHINE,
            accelerationMinNodes: MACHINE,
        },
    },
    {
        name: "Graph",
        file: "src/Graph.ts",
        half: "renderer",
        doors: {
            styles: escape("18c"),
            element: RENDER,
            canvas: RENDER,
            engine: RENDER,
            scene: RENDER,
            camera: CAMERA,
            skybox: RENDER,
            xrHelper: XR,
            needRays: RENDER,
            pinOnDrag: INPUT,
            fetchNodes: HOST_HOOK,
            fetchEdges: HOST_HOOK,
            initialized: LIFECYCLE,
            runAlgorithmsOnLoad: gapSet("10", "config.set", false),
            enableDetailedProfiling: PROFILING,
            acceleration: READ,
            eventManager: READ,
            operationQueue: escape("18c"),
            shutdown: LIFECYCLE,
            runAlgorithmsFromTemplate: gap("18a", "algo.legacy", []),
            init: LIFECYCLE,
            update: RENDER,
            setBackground: gap("10", "config.set", [{ backgroundType: "color", color: "#202020" }]),
            setSelectionStyle: gap("10", "config.set", [{ color: "#00ff00" }]),
            setLayoutBehavior: gap("10", "config.set", [{ layout: { preSteps: 0 } }]),
            addDataFromSource: gap("14", "data.import", ["json", { data: TINY_JSON }]),
            loadFromFile: gap("14", "data.import", () => [
                new File([TINY_JSON], "door.json", { type: "application/json" }),
            ]),
            loadFromUrl: gap("14", "data.import", [TINY_JSON_URL]),
            addNode: gap("12", "data.apply", [{ id: "door-a" }]),
            addNodes: gap("12", "data.apply", [[{ id: "door-b" }]]),
            addEdge: gap("12", "data.apply", [{ src: "n1", dst: "n3" }]),
            addEdges: gap("12", "data.apply", [[{ src: "n3", dst: "n1" }]]),
            setEdges: gap("14", "batch", [[{ src: "n1", dst: "n2" }]]),
            setLayout: gap("17", "layout.set", ["circular"]),
            runAlgorithm: gap("15", "algo.run", ["graphty", "degree"]),
            run: gap("15", "algo.run", ["degree"]),
            applySuggestedStyles: gap("15", "style.patch", ["graphty:degree"]),
            getSuggestedStyles: READ,
            removeNodes: gap("13", "data.apply", [["n3"]]),
            updateNodes: gap("12", "data.apply", [[{ id: "n1", weight: 2 }]]),
            setCameraMode: CAMERA,
            setRenderSettings: VIEW_SETTING,
            batchOperations: escape("19a"),
            getSession: READ,
            getNodeCount: READ,
            getEdgeCount: READ,
            on: LISTEN,
            addListener: LISTEN,
            removeListener: LISTEN,
            clearData: gap("13", "data.apply", []),
            listenerCount: READ,
            zoomToFit: CAMERA,
            getStyles: escape("10"),
            getStylePainter: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getUpdateManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getAcceleration: READ,
            getSelectedNode: READ,
            selectNode: SELECTION,
            deselectNode: SELECTION,
            isNodeSelected: READ,
            select: SELECTION,
            is2D: READ,
            getViewMode: READ,
            setStartingCameraDistance: CAMERA,
            setViewMode: gap("17", "view.dimension", ["2d"]),
            needsRayUpdate: READ,
            getConfig: escape("10"),
            isRunning: READ,
            setRunning: IN_FLIGHT,
            getXRConfig: READ,
            setXRConfig: XR,
            getXRSessionManager: READ,
            isVRSupported: READ,
            isARSupported: READ,
            input: INPUT,
            setInputEnabled: INPUT,
            startInputRecording: INPUT,
            stopInputRecording: INPUT,
            worldToScreen: READ,
            screenToWorld: READ,
            getCameraController: READ,
            getNodeMesh: READ,
            waitForSettled: READ,
            isFrameStable: READ,
            waitForStableFrame: READ,
            captureScreenshot: CAPTURE,
            canCaptureScreenshot: READ,
            captureAnimation: CAPTURE,
            cancelAnimationCapture: CAPTURE,
            isAnimationCapturing: READ,
            estimateAnimationCapture: READ,
            getCameraState: READ,
            setCameraState: CAMERA,
            setCameraPosition: CAMERA,
            setCameraTarget: CAMERA,
            setCameraZoom: CAMERA,
            setCameraPan: CAMERA,
            resetCamera: CAMERA,
            resolveCameraPreset: READ,
            applyCameraView: CAMERA,
            saveCameraPreset: gap("9", "view.save", ["door view"]),
            loadCameraPreset: CAMERA,
            getCameraPresets: READ,
            exportCameraPresets: READ,
            importCameraPresets: gap("9", "view.save", [{}]),
            setData: gap("14", "batch", [{ nodes: [{ id: "d1" }], edges: [] }]),
            getNode: READ,
            getNodes: READ,
            render: RENDER,
            enableAiControl: ASSISTANT,
            disableAiControl: ASSISTANT,
            aiCommand: escape("19a"),
            getAiStatus: READ,
            onAiStatusChange: LISTEN,
            cancelAiCommand: IN_FLIGHT,
            getAiManager: READ,
            isAiEnabled: READ,
            retryLastAiCommand: escape("19a"),
            getApiKeyManager: READ,
            getVoiceAdapter: READ,
            startVoiceInput: INPUT,
            stopVoiceInput: INPUT,
            isVoiceActive: READ,
            enterXR: XR,
            exitXR: XR,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "Node",
        file: "src/Node.ts",
        half: "renderer",
        doors: {
            parentGraph: RENDER,
            opts: RENDER,
            id: escape("18c"),
            index: escape("18c"),
            data: escape("12"),
            mesh: RENDER,
            label: RENDER,
            tooltip: RENDER,
            dragHandler: INPUT,
            dragging: IN_FLIGHT,
            pinOnDrag: INPUT,
            size: RENDER,
            shapeType: RENDER,
            update: RENDER,
            updateStyle: RENDER,
            applySessionPaint: RENDER,
            dispose: RENDER,
            isDisposed: READ,
            getRenderState: READ,
            setRenderState: RENDER,
            isSelected: READ,
            setSelected: SELECTION,
            refreshSelectionOverlay: RENDER,
            pin: gap("16a", "positions.pin", []),
            unpin: gap("16a", "positions.pin", []),
            showTooltip: RENDER,
            hideTooltip: RENDER,
            tooltipText: READ,
            getPosition: READ,
            isPinned: READ,
        },
    },
    {
        name: "Edge",
        file: "src/Edge.ts",
        half: "renderer",
        doors: {
            parentGraph: RENDER,
            opts: RENDER,
            srcId: escape("18c"),
            dstId: escape("18c"),
            id: READ,
            index: escape("18c"),
            dstNode: RENDER,
            srcNode: RENDER,
            data: escape("12"),
            mesh: RENDER,
            arrowMesh: RENDER,
            arrowTailMesh: RENDER,
            ray: RENDER,
            label: RENDER,
            arrowHeadText: RENDER,
            arrowTailText: RENDER,
            parallelRank: RENDER,
            parallelCount: RENDER,
            invalidatePositionCache: RENDER,
            update: RENDER,
            updateStyle: RENDER,
            applySessionPaint: RENDER,
            dispose: RENDER,
            isDisposed: READ,
            isRenderVisible: READ,
            setRenderVisible: RENDER,
            isSelected: READ,
            setSelected: SELECTION,
            transformEdgeMesh: RENDER,
            transformArrowCap: RENDER,
            getInterceptPoints: READ,
        },
    },
    {
        name: "GraphSession",
        file: "src/session/types.ts",
        half: "session",
        doors: SESSION,
    },
    {
        name: "ElementSession",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            ...SESSION,
            paint: READ,
        },
    },
    {
        name: "Run",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            id: READ,
            label: READ,
            algorithm: READ,
            params: READ,
            scope: READ,
            status: READ,
            progress: READ,
            determinate: READ,
            cancellable: READ,
            queuePosition: READ,
            startedAt: READ,
            durationMs: READ,
            partial: READ,
            stale: READ,
            engine: READ,
            fields: READ,
            shape: READ,
            caveats: READ,
            result: READ,
            error: READ,
            record: READ,
            journalId: READ,
            cancel: IN_FLIGHT,
            rerun: gap("15", "algo.run", []),
            suggestEncodings: READ,
        },
    },
    {
        name: "DataManager",
        file: "src/managers/DataManager.ts",
        half: "renderer",
        doors: {
            nodes: escape("18c"),
            edges: escape("18c"),
            edgeVersion: RENDER,
            nodeCache: RENDER,
            edgeCache: escape("18c"),
            edgesByIndex: escape("18c"),
            graphResults: escape("18a"),
            meshCache: RENDER,
            getSnapshot: escape("18b"),
            undirected: READ,
            positions: READ,
            seededNodeCount: READ,
            directionSettledBy: READ,
            lastImport: READ,
            updateStyles: RENDER,
            setGraphContext: LIFECYCLE,
            setLayoutEngine: LIFECYCLE,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            addNode: gap("12", "data.apply", [{ id: "door-c" }]),
            addNodes: gap("12", "data.apply", [[{ id: "door-d" }]]),
            getNode: READ,
            removeNodeAndIncidentEdges: gap("13", "data.apply", ["n2"]),
            addEdge: gap("12", "data.apply", [{ src: "n1", dst: "n3" }]),
            addEdges: gap("12", "data.apply", [[{ src: "n3", dst: "n2" }]]),
            getEdge: READ,
            getEdgesBetween: READ,
            setEdges: gap("14", "batch", [[{ src: "n1", dst: "n2" }]]),
            removeEdge: gap("13", "data.apply", ["no-such-edge"]),
            addDataFromSource: gap("14", "data.import", ["json", { data: TINY_JSON }]),
            clear: gap("13", "data.apply", []),
            startLabelAnimations: RENDER,
            getStats: READ,
        },
    },
    {
        name: "LayoutManager",
        file: "src/managers/LayoutManager.ts",
        half: "renderer",
        doors: {
            layoutEngine: escape("17"),
            running: IN_FLIGHT,
            setGraphContext: LIFECYCLE,
            updateStyles: RENDER,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            setLayout: gap("17", "layout.set", ["circular"]),
            step: TRANSPORT,
            stepBatch: TRANSPORT,
            getNodePosition: READ,
            isSettled: READ,
            nodes: READ,
            edges: READ,
            layoutType: READ,
            updateLayoutDimension: gap("17", "view.dimension", [true]),
            applyTemplateLayout: gap("17", "layout.set", ["circular"]),
            getStats: READ,
            hasLayoutEngine: READ,
            updatePositions: TRANSPORT,
        },
    },
    {
        name: "UpdateManager",
        file: "src/managers/UpdateManager.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "StatsManager",
        file: "src/managers/StatsManager.ts",
        half: "renderer",
        whole: PROFILING,
    },
    {
        name: "SelectionManager",
        file: "src/managers/SelectionManager.ts",
        half: "renderer",
        whole: SELECTION,
    },
    {
        name: "EventManager",
        file: "src/managers/EventManager.ts",
        half: "renderer",
        whole: EVENTS,
    },
    {
        name: "MeshCache",
        file: "src/meshes/MeshCache.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "CameraController",
        file: "src/cameras/CameraManager.ts",
        half: "renderer",
        whole: CAMERA,
    },
    {
        name: "XRSessionManager",
        file: "src/xr/XRSessionManager.ts",
        half: "renderer",
        whole: XR,
    },
    {
        name: "AiManager",
        file: "src/ai/AiManager.ts",
        half: "renderer",
        doors: {
            init: LIFECYCLE,
            registerCommand: TOOLS,
            getRegisteredCommands: READ,
            execute: escape("19a"),
            setApiKey: KEYS,
            getStatus: READ,
            onStatusChange: LISTEN,
            cancel: IN_FLIGHT,
            retry: escape("19a"),
            getCommandRegistry: READ,
            getController: READ,
            getProvider: READ,
            getSchemaManager: READ,
            getApiKeyManager: READ,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "ApiKeyManager",
        file: "src/ai/keys/ApiKeyManager.ts",
        half: "renderer",
        whole: KEYS,
    },
    {
        name: "VoiceInputAdapter",
        file: "src/ai/input/VoiceInputAdapter.ts",
        half: "renderer",
        whole: INPUT,
    },
    {
        name: "CameraManager",
        file: "src/cameras/CameraManager.ts",
        half: "renderer",
        whole: CAMERA,
    },
    {
        name: "AccelerationController",
        file: "src/acceleration/AccelerationController.ts",
        half: "renderer",
        whole: MACHINE,
    },
    {
        name: "OperationQueueManager",
        file: "src/managers/OperationQueueManager.ts",
        half: "renderer",
        whole: QUEUE,
    },
    {
        name: "StylePainter",
        file: "src/managers/StylePainter.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "InputManager",
        file: "src/managers/InputManager.ts",
        half: "renderer",
        whole: INPUT,
    },
    {
        name: "GraphContext",
        file: "src/managers/GraphContext.ts",
        half: "renderer",
        doors: {
            getStyles: escape("10"),
            getStylePainter: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            is2D: READ,
            needsRayUpdate: READ,
            getConfig: escape("10"),
            isRunning: READ,
            setRunning: IN_FLIGHT,
            getXRConfig: READ,
            getXRSessionManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getAcceleration: READ,
        },
    },
    {
        name: "RichTextLabel",
        file: "src/meshes/RichTextLabel.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "NodeDragHandler",
        file: "src/NodeBehavior.ts",
        half: "renderer",
        doors: {
            onDragStart: escape("19a"),
            onDragUpdate: escape("19a"),
            onDragEnd: escape("19a"),
            setPositionDirect: escape("19a"),
            getNode: READ,
            select: SELECTION,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "PatternedLineMesh",
        file: "src/meshes/PatternedLineMesh.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "SessionDataApi",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            store: escape("18c"),
            snapshot: escape("18b"),
            undirected: READ,
            node: escape("18b"),
            edge: escape("18b"),
            lastImport: READ,
            attributes: READ,
            statistics: READ,
            fingerprint: READ,
        },
    },
    {
        name: "RunsApi",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            start: gap("15", "algo.run", ["degree"]),
            batch: gap("15", "algo.run", [[{ algorithm: "degree" }]]),
            get: READ,
            list: READ,
            remove: gap("15", "algo.remove", ["door-run"]),
            bindings: READ,
            queue: READ,
        },
    },
    {
        name: "ResultsApi",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "ScopeApi",
        file: "src/session/scope/ScopeApi.ts",
        half: "session",
        doors: {
            resolve: READ,
            count: READ,
            save: gap("9", "scope.save", ["door scope", "graph"]),
            list: READ,
            remove: gap("9", "scope.remove", ["door-scope"]),
        },
    },
    {
        name: "SelectionApi",
        file: "src/session/selection/SelectionApi.ts",
        half: "session",
        doors: SELECTION_API,
    },
    {
        name: "VisibilityApi",
        file: "src/session/visibility/VisibilityApi.ts",
        half: "session",
        doors: VISIBILITY_API,
    },
    {
        name: "StylesApi",
        file: "src/session/styles/StylesApi.ts",
        half: "session",
        doors: STYLES_API,
    },
    {
        name: "ElementPositions",
        file: "src/data/positions.ts",
        half: "session",
        doors: {
            components: READ,
            capacity: READ,
            count: READ,
            placedCount: READ,
            view: escape("18c"),
            grow: escape("18c"),
            remap: escape("18c"),
            isPinned: READ,
            setPinned: escape("18c"),
            pinnedCount: READ,
            pinnedView: escape("18c"),
            isPlaced: READ,
            read: READ,
            write: escape("18c"),
            fillUnplaced: escape("18c"),
        },
    },
    {
        name: "SelectionOwner",
        file: "src/session/selection/SelectionApi.ts",
        half: "session",
        doors: {
            ...SELECTION_API,
            applyNow: SELECTION,
            nodeMembers: READ,
            edgeMembers: READ,
            remapNodes: SELECTION,
            remapEdges: SELECTION,
        },
    },
    {
        name: "SessionVisibilityApi",
        file: "src/session/visibility/VisibilityApi.ts",
        half: "session",
        doors: {
            ...VISIBILITY_API,
            masks: READ,
        },
    },
    {
        name: "SessionStylesApi",
        file: "src/session/styles/StylesApi.ts",
        half: "session",
        doors: {
            ...STYLES_API,
            compiled: READ,
        },
    },
    {
        name: "ElementPaint",
        file: "src/session/styles/repaint.ts",
        half: "session",
        whole: DERIVED,
    },
    {
        name: "GraphtyError",
        file: "src/errors/GraphtyError.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "EdgeMap",
        file: "src/Edge.ts",
        half: "renderer",
        doors: {
            map: escape("18c"),
            has: READ,
            set: escape("18c"),
            get: READ,
            first: READ,
            size: READ,
            delete: escape("18c"),
            clear: escape("18c"),
        },
    },
    {
        name: "LayoutEngine",
        file: "src/layout/LayoutEngine.ts",
        half: "renderer",
        doors: {
            config: escape("17"),
            init: LIFECYCLE,
            addNode: DERIVED,
            addEdge: DERIVED,
            getNodePosition: READ,
            setNodePosition: escape("18c"),
            getEdgePosition: READ,
            step: TRANSPORT,
            pin: escape("18c"),
            unpin: escape("18c"),
            nodes: READ,
            edges: READ,
            isSettled: READ,
            addNodes: DERIVED,
            addEdges: DERIVED,
            removeNode: DERIVED,
            removeEdge: DERIVED,
            updatePositions: TRANSPORT,
            dispose: LIFECYCLE,
            nodePositions: TRANSPORT,
            attachPositions: TRANSPORT,
            publishPositions: TRANSPORT,
            readNodePosition: READ,
            type: READ,
        },
    },
    {
        name: "CommandRegistry",
        file: "src/ai/commands/CommandRegistry.ts",
        half: "renderer",
        doors: {
            register: TOOLS,
            get: READ,
            has: READ,
            getAll: READ,
            getNames: READ,
            unregister: TOOLS,
            clear: TOOLS,
            toToolDefinitions: READ,
        },
    },
    {
        name: "AiController",
        file: "src/ai/AiController.ts",
        half: "renderer",
        doors: {
            execute: escape("19a"),
            getLastInput: READ,
            getLastError: READ,
            clearLastError: ASSISTANT,
            getStatus: READ,
            onStatusChange: LISTEN,
            cancel: IN_FLIGHT,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "LlmProvider",
        file: "src/ai/providers/types.ts",
        half: "renderer",
        whole: LLM,
    },
    {
        name: "SchemaManager",
        file: "src/ai/schema/SchemaManager.ts",
        half: "renderer",
        whole: ASSISTANT,
    },
    {
        name: "MockDeviceInputSystem",
        file: "src/input/mock-device-input-system.ts",
        half: "renderer",
        whole: TEST_INPUT,
    },
    {
        name: "SessionGraphStore",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            getSnapshot: escape("18b"),
            undirected: READ,
            positions: READ,
            seededNodeCount: READ,
            directionSettledBy: READ,
            lastImport: READ,
        },
    },
    {
        name: "RunResult",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "ElementMask",
        file: "src/session/scope/ElementMask.ts",
        half: "session",
        whole: MASK,
    },
    {
        name: "ScopeVisibilitySource",
        file: "src/session/scope/ScopeApi.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "GraphCommand",
        file: "src/ai/commands/types.ts",
        half: "renderer",
        doors: {
            name: READ,
            description: READ,
            parameters: READ,
            examples: READ,
            execute: escape("19a"),
        },
    },
    {
        name: "NumericColumnView",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "AlgorithmManager",
        file: "src/managers/AlgorithmManager.ts",
        half: "renderer",
        doors: {
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            execute: escape("15"),
            runAlgorithmsFromTemplate: gap("18a", "algo.legacy", [["graphty:degree"]]),
            runAlgorithm: gap("18a", "algo.legacy", ["graphty", "degree"]),
            hasAlgorithm: READ,
            getAvailableAlgorithms: READ,
        },
    },
    {
        name: "LifecycleManager",
        file: "src/managers/LifecycleManager.ts",
        half: "renderer",
        whole: LIFECYCLE,
    },
    {
        name: "RenderManager",
        file: "src/managers/RenderManager.ts",
        half: "renderer",
        doors: {
            engine: RENDER,
            scene: RENDER,
            camera: CAMERA,
            graphRoot: RENDER,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            startRenderLoop: RENDER,
            stopRenderLoop: RENDER,
            holdFrames: RENDER,
            setBackgroundColor: escape("10"),
            getRenderStats: READ,
        },
    },
    {
        name: "DefaultGraphContext",
        file: "src/managers/GraphContext.ts",
        half: "renderer",
        doors: {
            getStylePainter: READ,
            getStyles: escape("10"),
            getDataManager: READ,
            getLayoutManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            is2D: READ,
            needsRayUpdate: READ,
            setRayUpdateNeeded: RENDER,
            getConfig: escape("10"),
            updateConfig: escape("10"),
            isRunning: READ,
            setRunning: IN_FLIGHT,
        },
    },
    {
        name: "LabelDeclutter",
        file: "src/managers/LabelDeclutter.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "Layer",
        file: "src/session/styles/Layer.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "SessionHistory",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            version: READ,
            steps: READ,
            position: READ,
            pending: READ,
            nextUndo: READ,
            bytes: READ,
            limitBytes: BUDGET,
            limitSteps: BUDGET,
            restoreTo: HISTORY,
            cancel: IN_FLIGHT,
            clear: HISTORY,
        },
    },
    {
        name: "Manager",
        file: "src/managers/interfaces.ts",
        half: "renderer",
        whole: LIFECYCLE,
    },
];
