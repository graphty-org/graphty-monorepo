/**
 * @file What the assistant deliberately does not reach, each with a reason code. Everything else
 * graphty-element can do -- every op, every door that dispatches or is exempt, every read of the
 * session, every catalog entry and option -- is reached by some tool action, and
 * `test/ai/tools/coverage.test.ts` fails the build when a new one is neither. Deleting a row is how
 * a decision is reversed.
 */

import type { DoorRoot } from "../../session/commands/doors";

/** Why the assistant does not reach something. */
export type ExclusionReason =
    /** A manager, mesh, render object or id bookkeeping. */
    | "internal-handle"
    /** The assistant's own connection, keys, voice or status. */
    | "assistant-config"
    /** Acceleration, renderer, input, profiling, label decluttering, render on demand. */
    | "machine-preference"
    /** Connect, dispose, subscriptions, waiting for a frame. */
    | "lifecycle"
    /** A getter whose members are the operations. */
    | "namespace"
    /** Masks, snapshots, typed arrays, screen coordinates. */
    | "raw-data"
    /** Needs a `File`, a host download, a host file write or a whole document. */
    | "needs-host"
    /** Fetch settings a model must not choose (headers, credentials). */
    | "network"
    /** Replaces or discards the whole project or history. */
    | "replaces-project"
    /** Takes or returns a whole style or notes document. */
    | "whole-document"
    /** Computation in progress, not an operation. */
    | "in-flight"
    /** What the tools themselves call (`session.execute`, `session.transaction`). */
    | "mechanism"
    /** The same capability through another action, named in `by`. */
    | "covered-by";

/** One thing the assistant does not reach, and why. Names exactly one of root, door, op, catalog or option. */
export interface Exclusion {
    /** A door root of `doors.ts`; with `members`, those doors of it. */
    readonly root?: string;
    readonly members?: readonly string[];
    /** One door: `<root>.<member>`. */
    readonly door?: string;
    /** An op of the command vocabulary. */
    readonly op?: string;
    /** A catalog entry: `<table>/<id>`. */
    readonly catalog?: string;
    /** An option: `<table>/<id>/<option>`. */
    readonly option?: string;
    readonly reason: ExclusionReason;
    /** `by-design` stands; `defect` carries an owner and an expiry. */
    readonly kind: "by-design" | "defect";
    /** For `covered-by`: the tool, or `tool.action`, that reaches the same capability. */
    readonly by?: string;
    readonly owner?: string;
    readonly expires?: string;
}

/**
 * Whether a root may be excluded with no member list: it is answered whole, or every door of it
 * only reads.
 * @param root - The root.
 * @returns True when it may.
 */
export function isWholeRoot(root: DoorRoot): boolean {
    return root.whole !== undefined || Object.values(root.doors ?? {}).every((door) => door.kind === "readOnly");
}

/** A by-design row. */
const BY_DESIGN = "by-design" as const;

/** The camera verbs of the graph and the element, which the `view` tool covers. */
const CAMERA_VERBS = [
    "setCameraState",
    "setCameraPosition",
    "setCameraTarget",
    "setCameraZoom",
    "setCameraPan",
    "resetCamera",
    "zoomStep",
    "zoomToSelection",
    "loadCameraPreset",
    "setCameraMode",
] as const;

/** The assistant's own connection on the graph and the element. */
const ASSISTANT_VERBS = [
    "enableAiControl",
    "disableAiControl",
    "aiCommand",
    "onAiStatusChange",
    "cancelAiCommand",
    "resolveAiApproval",
    "retryLastAiCommand",
    "startVoiceInput",
    "stopVoiceInput",
] as const;

/** The data writes of the graph and the element, which `edit_data` covers. */
const DATA_VERBS = [
    "addNode",
    "addNodes",
    "addEdge",
    "addEdges",
    "updateNodes",
    "updateEdges",
    "removeEdges",
    "removeNodes",
    "batchOperations",
    "clearData",
] as const;

/**
 * What the assistant does not reach. The graph's and the element's own members are the session's
 * capabilities a second time, so most of their rows say which tool covers the same op.
 */
export const NOT_FOR_THE_ASSISTANT: readonly Exclusion[] = [
    // The command vocabulary.
    { op: "batch", reason: "mechanism", kind: BY_DESIGN },
    { op: "data.expand", reason: "needs-host", kind: BY_DESIGN },
    { op: "style.template", reason: "whole-document", kind: BY_DESIGN },
    { op: "note.merge", reason: "whole-document", kind: BY_DESIGN },
    { op: "layout.transport", reason: "in-flight", kind: BY_DESIGN },

    // The session.
    {
        root: "GraphSession",
        members: [
            "data",
            "runs",
            "results",
            "scope",
            "sets",
            "notes",
            "journal",
            "selection",
            "visibility",
            "styles",
            "views",
            "layout",
            "positions",
            "config",
            "capabilities",
            "history",
            "project",
        ],
        reason: "namespace",
        kind: BY_DESIGN,
    },
    {
        root: "GraphSession",
        members: ["acceleration", "setAccelerator"],
        reason: "machine-preference",
        kind: BY_DESIGN,
    },
    { root: "GraphSession", members: ["snapshot", "fingerprint"], reason: "raw-data", kind: BY_DESIGN },
    { root: "GraphSession", members: ["run"], reason: "covered-by", by: "run_algorithm", kind: BY_DESIGN },
    { root: "GraphSession", members: ["execute", "transaction", "plan"], reason: "mechanism", kind: BY_DESIGN },
    { root: "GraphSession", members: ["on", "dispose"], reason: "lifecycle", kind: BY_DESIGN },
    { root: "ElementSession", members: ["paint"], reason: "internal-handle", kind: BY_DESIGN },
    {
        root: "ElementSession",
        members: [
            "data",
            "runs",
            "results",
            "scope",
            "sets",
            "notes",
            "journal",
            "selection",
            "visibility",
            "styles",
            "views",
            "layout",
            "positions",
            "config",
            "capabilities",
            "history",
            "project",
        ],
        reason: "namespace",
        kind: BY_DESIGN,
    },
    {
        root: "ElementSession",
        members: ["acceleration", "setAccelerator"],
        reason: "machine-preference",
        kind: BY_DESIGN,
    },
    { root: "ElementSession", members: ["snapshot", "fingerprint"], reason: "raw-data", kind: BY_DESIGN },
    { root: "ElementSession", members: ["run"], reason: "covered-by", by: "run_algorithm", kind: BY_DESIGN },
    { root: "ElementSession", members: ["execute", "transaction", "plan"], reason: "mechanism", kind: BY_DESIGN },
    { root: "ElementSession", members: ["on", "dispose"], reason: "lifecycle", kind: BY_DESIGN },
    {
        root: "Run",
        members: ["label", "distinguishedBy", "siblingsDifferBy", "determinate", "engine", "record", "journalId"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    { root: "RunsApi", members: ["batch"], reason: "covered-by", by: "run_algorithm", kind: BY_DESIGN },
    { root: "RunsApi", members: ["bindings", "painting"], reason: "covered-by", by: "style.list", kind: BY_DESIGN },
    { root: "ScopeApi", members: ["resolve"], reason: "covered-by", by: "query.count", kind: BY_DESIGN },
    { root: "ScopeApi", members: ["remove"], reason: "covered-by", by: "sets.remove", kind: BY_DESIGN },
    { root: "SetsApi", members: ["pathKind"], reason: "covered-by", by: "sets.get", kind: BY_DESIGN },
    { root: "NotesApi", members: ["toDocument", "mergeDocument"], reason: "whole-document", kind: BY_DESIGN },
    { root: "ProjectApi", members: ["save", "markSaved"], reason: "needs-host", kind: BY_DESIGN },
    { root: "ProjectApi", members: ["open"], reason: "replaces-project", kind: BY_DESIGN },
    { root: "SessionConfig", members: ["acceleration"], reason: "machine-preference", kind: BY_DESIGN },
    {
        root: "SessionDataApi",
        members: ["store", "snapshot", "undirected", "fingerprint"],
        reason: "raw-data",
        kind: BY_DESIGN,
    },
    { root: "SessionDataApi", members: ["nodes", "edges"], reason: "covered-by", by: "query.nodes", kind: BY_DESIGN },
    { root: "SessionDataApi", members: ["prepare"], reason: "needs-host", kind: BY_DESIGN },
    {
        root: "LoadDraft",
        members: ["type", "tables", "mapping", "missing", "resolve", "report", "rows", "load", "dispose"],
        reason: "needs-host",
        kind: BY_DESIGN,
    },
    { root: "SessionGraphStore", reason: "raw-data", kind: BY_DESIGN },
    { root: "JournalApi", members: ["entries", "get"], reason: "covered-by", by: "results.list", kind: BY_DESIGN },
    { root: "JournalApi", members: ["subscribe"], reason: "lifecycle", kind: BY_DESIGN },
    { root: "JournalApi", members: ["clear"], reason: "replaces-project", kind: BY_DESIGN },
    { root: "JournalApi", members: ["cap"], reason: "machine-preference", kind: BY_DESIGN },
    {
        root: "SessionHistory",
        members: ["version", "pending", "bytes"],
        reason: "covered-by",
        by: "undo.recent",
        kind: BY_DESIGN,
    },
    { root: "SessionHistory", members: ["limitBytes", "limitSteps"], reason: "machine-preference", kind: BY_DESIGN },
    { root: "SessionHistory", members: ["restoreTo", "clear"], reason: "replaces-project", kind: BY_DESIGN },
    { root: "SessionHistory", members: ["cancel"], reason: "in-flight", kind: BY_DESIGN },
    {
        root: "SessionPositions",
        members: ["capacity", "count", "placedCount", "pinnedCount", "generation", "isPlaced", "isPinned", "read"],
        reason: "raw-data",
        kind: BY_DESIGN,
    },
    { root: "ReadonlyElementPositions", reason: "raw-data", kind: BY_DESIGN },
    { root: "SelectionApi", members: ["nodeMask", "edgeMask"], reason: "raw-data", kind: BY_DESIGN },
    { root: "SelectionApi", members: ["promote"], reason: "covered-by", by: "select.save_as_set", kind: BY_DESIGN },
    { root: "SelectionOwner", members: ["promote"], reason: "covered-by", by: "select.save_as_set", kind: BY_DESIGN },
    {
        root: "SelectionApi",
        members: ["cap", "origin", "has", "statistics"],
        reason: "covered-by",
        by: "query.overview",
        kind: BY_DESIGN,
    },
    { root: "SelectionOwner", members: ["nodeMask", "edgeMask"], reason: "raw-data", kind: BY_DESIGN },
    {
        root: "SelectionOwner",
        members: ["cap", "origin", "has", "statistics"],
        reason: "covered-by",
        by: "query.overview",
        kind: BY_DESIGN,
    },
    {
        root: "SelectionOwner",
        members: ["applyNow", "applyAtNextRead", "nodeMembers", "edgeMembers", "remapNodes", "remapEdges"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    { root: "VisibilityApi", members: ["nodeMask", "edgeMask", "nodes", "edges"], reason: "raw-data", kind: BY_DESIGN },
    { root: "VisibilityApi", members: ["isVisible"], reason: "covered-by", by: "query.overview", kind: BY_DESIGN },
    {
        root: "SessionVisibilityApi",
        members: ["nodeMask", "edgeMask", "nodes", "edges", "masks"],
        reason: "raw-data",
        kind: BY_DESIGN,
    },
    {
        root: "SessionVisibilityApi",
        members: ["isVisible"],
        reason: "covered-by",
        by: "query.overview",
        kind: BY_DESIGN,
    },
    { root: "StylesApi", members: ["proposeEncoding"], reason: "covered-by", by: "style.encode", kind: BY_DESIGN },
    { root: "StylesApi", members: ["agreement"], reason: "covered-by", by: "style.explain", kind: BY_DESIGN },
    { root: "StylesApi", members: ["resolveToStatic"], reason: "covered-by", by: "style.update", kind: BY_DESIGN },
    { root: "StylesApi", members: ["settled"], reason: "lifecycle", kind: BY_DESIGN },
    { root: "StylesApi", members: ["applyTemplate", "toDocument"], reason: "whole-document", kind: BY_DESIGN },
    { root: "StylesApi", members: ["setDefaultPalettes"], reason: "machine-preference", kind: BY_DESIGN },
    {
        root: "SessionStylesApi",
        members: ["proposeEncoding"],
        reason: "covered-by",
        by: "style.encode",
        kind: BY_DESIGN,
    },
    { root: "SessionStylesApi", members: ["agreement"], reason: "covered-by", by: "style.explain", kind: BY_DESIGN },
    {
        root: "SessionStylesApi",
        members: ["resolveToStatic"],
        reason: "covered-by",
        by: "style.update",
        kind: BY_DESIGN,
    },
    { root: "SessionStylesApi", members: ["settled"], reason: "lifecycle", kind: BY_DESIGN },
    { root: "SessionStylesApi", members: ["applyTemplate", "toDocument"], reason: "whole-document", kind: BY_DESIGN },
    { root: "SessionStylesApi", members: ["setDefaultPalettes"], reason: "machine-preference", kind: BY_DESIGN },
    { root: "SessionStylesApi", members: ["compiled"], reason: "internal-handle", kind: BY_DESIGN },
    { root: "ElementPaint", reason: "internal-handle", kind: BY_DESIGN },
    { root: "ElementMask", reason: "raw-data", kind: BY_DESIGN },
    { root: "RunResult", reason: "covered-by", by: "results.summary", kind: BY_DESIGN },
    { root: "ScopeVisibilitySource", reason: "internal-handle", kind: BY_DESIGN },
    { root: "NumericColumnView", reason: "raw-data", kind: BY_DESIGN },
    { root: "Layer", reason: "covered-by", by: "style.list", kind: BY_DESIGN },
    { root: "GraphtyError", reason: "internal-handle", kind: BY_DESIGN },

    // The element and the graph: the session's capabilities a second time.
    ...(["Graphty", "Graph"] as const).flatMap((root): Exclusion[] => [
        { root, members: ["run", "runAlgorithm"], reason: "covered-by", by: "run_algorithm", kind: BY_DESIGN },
        { root, members: [...DATA_VERBS], reason: "covered-by", by: "edit_data", kind: BY_DESIGN },
        {
            root,
            members: ["addDataFromSource", "loadFromUrl", "loadFromFile"],
            reason: "covered-by",
            by: "import_data",
            kind: BY_DESIGN,
        },
        { root, members: ["setLayout"], reason: "covered-by", by: "layout", kind: BY_DESIGN },
        {
            root,
            members: ["setViewMode", "saveCameraPreset", "removeCameraPreset", "importCameraPresets"],
            reason: "covered-by",
            by: "view",
            kind: BY_DESIGN,
        },
        { root, members: ["applySuggestedStyles"], reason: "covered-by", by: "style", kind: BY_DESIGN },
        { root, members: ["setData"], reason: "replaces-project", kind: BY_DESIGN },
        { root, members: [...CAMERA_VERBS], reason: "covered-by", by: "view", kind: BY_DESIGN },
        {
            root,
            members: ["select", "selectNode", "deselectNode"],
            reason: "covered-by",
            by: "select",
            kind: BY_DESIGN,
        },
        { root, members: ["exitXR", "setXRConfig"], reason: "covered-by", by: "immersive", kind: BY_DESIGN },
        { root, members: [...ASSISTANT_VERBS], reason: "assistant-config", kind: BY_DESIGN },
        { root, members: ["on", "addListener", "shutdown", "render"], reason: "lifecycle", kind: BY_DESIGN },
        {
            root,
            members: ["setRunning", "setRenderSettings", "setInputEnabled", "enableDetailedProfiling"],
            reason: "machine-preference",
            kind: BY_DESIGN,
        },
    ]),
    {
        root: "Graphty",
        members: ["nodeData", "edgeData", "dataSource", "dataSourceConfig"],
        reason: "replaces-project",
        kind: BY_DESIGN,
    },
    {
        root: "Graphty",
        members: [
            "nodeIdPath",
            "edgeSrcIdPath",
            "edgeDstIdPath",
            "edgeIdPath",
            "repeatedEdges",
            "nodeLabelPath",
            "edgeWeightPath",
            "positionScale",
            "directed",
            "layoutBehavior",
            "selectionStyle",
            "algorithmsOnLoad",
            "background",
            "runAlgorithmsOnLoad",
        ],
        reason: "covered-by",
        by: "project",
        kind: BY_DESIGN,
    },
    {
        root: "Graphty",
        members: ["layout", "layoutConfig", "layoutScope"],
        reason: "covered-by",
        by: "layout",
        kind: BY_DESIGN,
    },
    { root: "Graphty", members: ["viewMode", "layout2d"], reason: "covered-by", by: "view", kind: BY_DESIGN },
    { root: "Graphty", members: ["pin", "unpin"], reason: "covered-by", by: "layout", kind: BY_DESIGN },
    { root: "Graphty", members: ["xr"], reason: "covered-by", by: "immersive", kind: BY_DESIGN },
    { root: "Graphty", members: ["downloadProject"], reason: "needs-host", kind: BY_DESIGN },
    {
        root: "Graphty",
        members: [
            "connectedCallback",
            "firstUpdated",
            "asyncFirstUpdated",
            "disconnectedCallback",
            "addEventListener",
            "removeEventListener",
        ],
        reason: "lifecycle",
        kind: BY_DESIGN,
    },
    {
        root: "Graphty",
        members: [
            "setDefaultPalettes",
            "labelDeclutter",
            "renderOnDemand",
            "startingCameraDistance",
            "autoFrame",
            "historyKeys",
            "acceleration",
            "accelerationMinNodes",
            "renderer",
        ],
        reason: "machine-preference",
        kind: BY_DESIGN,
    },
    {
        root: "Graph",
        members: ["runAlgorithmsFromTemplate"],
        reason: "covered-by",
        by: "run_algorithm",
        kind: BY_DESIGN,
    },
    {
        root: "Graph",
        members: ["runAlgorithmsOnLoad", "setBackground", "setSelectionStyle", "setLayoutBehavior"],
        reason: "covered-by",
        by: "project",
        kind: BY_DESIGN,
    },
    { root: "Graph", members: ["setLayoutScope"], reason: "covered-by", by: "layout", kind: BY_DESIGN },
    { root: "Graph", members: ["setNodes", "setEdges"], reason: "replaces-project", kind: BY_DESIGN },
    { root: "Graph", members: ["enterXR"], reason: "covered-by", by: "immersive", kind: BY_DESIGN },
    {
        root: "Graph",
        members: [
            "element",
            "canvas",
            "engine",
            "scene",
            "camera",
            "skybox",
            "xrHelper",
            "needRays",
            "initialized",
            "input",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    { root: "Graph", members: ["fetchNodes", "fetchEdges"], reason: "needs-host", kind: BY_DESIGN },
    {
        root: "Graph",
        members: [
            "pinOnDrag",
            "setRenderer",
            "setStartingCameraDistance",
            "setAutoFrame",
            "startInputRecording",
            "stopInputRecording",
        ],
        reason: "machine-preference",
        kind: BY_DESIGN,
    },
    { root: "Graph", members: ["init", "update", "removeListener", "dispose"], reason: "lifecycle", kind: BY_DESIGN },

    // The renderer's parts.
    {
        root: "DataManager",
        members: ["addNode", "addNodes", "removeNodeAndIncidentEdges", "addEdge", "removeEdge", "addEdges", "clear"],
        reason: "covered-by",
        by: "edit_data",
        kind: BY_DESIGN,
    },
    { root: "DataManager", members: ["addDataFromSource"], reason: "covered-by", by: "import_data", kind: BY_DESIGN },
    { root: "DataManager", members: ["setNodes", "setEdges"], reason: "replaces-project", kind: BY_DESIGN },
    {
        root: "DataManager",
        members: [
            "edgeVersion",
            "nodeCache",
            "meshCache",
            "getSnapshot",
            "positions",
            "updateStyles",
            "setGraphContext",
            "setLayoutEngine",
            "bindSession",
            "reconcile",
            "beginLoad",
            "supersedeLoads",
            "startLabelAnimations",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    { root: "DataManager", members: ["init", "dispose"], reason: "lifecycle", kind: BY_DESIGN },
    { root: "Node", members: ["pin", "unpin"], reason: "covered-by", by: "layout", kind: BY_DESIGN },
    {
        root: "Node",
        members: [
            "parentGraph",
            "opts",
            "mesh",
            "label",
            "tooltip",
            "dragHandler",
            "dragging",
            "pinOnDrag",
            "size",
            "shapeType",
            "update",
            "setMeshPosition",
            "updateStyle",
            "applySessionPaint",
            "dispose",
            "setRenderState",
            "setSelected",
            "refreshSelectionOverlay",
            "showTooltip",
            "hideTooltip",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "Edge",
        members: [
            "parentGraph",
            "opts",
            "dstNode",
            "srcNode",
            "mesh",
            "arrowCap",
            "arrowTailCap",
            "arrowMesh",
            "arrowTailMesh",
            "ray",
            "label",
            "arrowHeadText",
            "arrowTailText",
            "parallelRank",
            "parallelCount",
            "invalidatePositionCache",
            "update",
            "updateStyle",
            "applySessionPaint",
            "dispose",
            "setRenderVisible",
            "setSelected",
            "transformEdgeMesh",
            "transformArrowCap",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "LayoutManager",
        members: [
            "running",
            "setPaused",
            "setGraphContext",
            "updateStyles",
            "init",
            "dispose",
            "loadArrangement",
            "step",
            "stepBatch",
            "updatePositions",
            "onRest",
            "restoring",
            "replacing",
            "graphWritesWaiting",
            "setScopeSource",
            "releaseDetachedScope",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "RenderManager",
        members: [
            "engine",
            "scene",
            "camera",
            "graphRoot",
            "init",
            "dispose",
            "startRenderLoop",
            "stopRenderLoop",
            "holdFrames",
            "requestFrame",
            "applyBackground",
        ],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "ElementPositions",
        members: ["view", "grow", "remap", "setPinned", "pinnedView", "moved", "write", "fillUnplaced"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "LayoutEngine",
        members: ["init", "step", "updatePositions", "dispose", "publishPositions", "loadArrangement", "setHoldMask"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "NodeDragHandler",
        members: ["onDragStart", "onDragUpdate", "onDragEnd", "setPositionDirect", "select", "dispose"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    {
        root: "AlgorithmManager",
        members: ["runAlgorithmsFromTemplate", "runAlgorithm", "runLegacy"],
        reason: "covered-by",
        by: "run_algorithm",
        kind: BY_DESIGN,
    },
    { root: "AlgorithmManager", members: ["init", "dispose", "execute"], reason: "internal-handle", kind: BY_DESIGN },
    {
        root: "DefaultGraphContext",
        members: ["getConfig", "updateConfig", "setRunning"],
        reason: "internal-handle",
        kind: BY_DESIGN,
    },
    { root: "GraphContext", members: ["getConfig", "setRunning"], reason: "internal-handle", kind: BY_DESIGN },
    ...[
        "UpdateManager",
        "StatsManager",
        "SelectionManager",
        "EventManager",
        "MeshCache",
        "CameraController",
        "XRSessionManager",
        "CameraManager",
        "AccelerationController",
        "OperationQueueManager",
        "StylePainter",
        "InputManager",
        "RichTextLabel",
        "PatternedLineMesh",
        "EdgeLineBatch",
        "ArrowCap",
        "MockDeviceInputSystem",
        "LifecycleManager",
        "LabelDeclutter",
        "Manager",
    ].map((root): Exclusion => ({ root, reason: "internal-handle", kind: BY_DESIGN })),

    // The assistant itself.
    ...["ApiKeyManager", "VoiceInputAdapter", "LlmProvider", "SchemaManager"].map((root): Exclusion => ({
        root,
        reason: "assistant-config",
        kind: BY_DESIGN,
    })),
    {
        root: "AiManager",
        members: [
            "init",
            "registerCommand",
            "execute",
            "setApiKey",
            "onStatusChange",
            "cancel",
            "retry",
            "resolveAiApproval",
            "dispose",
        ],
        reason: "assistant-config",
        kind: BY_DESIGN,
    },
    {
        root: "AiController",
        members: ["execute", "resolveAiApproval", "clearLastError", "onStatusChange", "cancel", "dispose"],
        reason: "assistant-config",
        kind: BY_DESIGN,
    },
    {
        root: "CommandRegistry",
        members: ["register", "unregister", "clear"],
        reason: "assistant-config",
        kind: BY_DESIGN,
    },
    { root: "GraphCommand", members: ["execute"], reason: "mechanism", kind: BY_DESIGN },
];
