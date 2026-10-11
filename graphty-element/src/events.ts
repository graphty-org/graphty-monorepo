import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";

import type { AiStatus } from "./ai/AiStatus";
import type { CommandResult } from "./ai/commands/types";
import type { AiResultCode, AiResultParams } from "./catalog/ai";
import type { EdgeId, FormatId, NodeId } from "./catalog/types";
import type { NodeIdType } from "./config";
import type { ExportLoss } from "./data/export";
import type { ImportReport } from "./data/report";
import type { Edge } from "./Edge";
import type { Graph } from "./Graph";
import type { StatsManager } from "./managers/StatsManager";
import type { Node } from "./Node";
import type { StyleChange } from "./session/styles/StylesApi";
import type { HistoryCause } from "./session/types";

/**
 * Every event name a listener can subscribe to. OPEN UNION: event names may be added in a minor
 * release (the assistant's among them), so a `switch` over it needs a `default`.
 */
export type EventType = GraphEventType | NodeEventType | EdgeEventType | AiEventType;
export type EventCallbackType = (evt: GraphEvent | NodeEvent | EdgeEvent | AiEvent) => void;

type AnyEvent = GraphEvent | NodeEvent | EdgeEvent | AiEvent;

/**
 * The event a listener for `K` receives: every member of the event unions whose `type` admits `K`.
 * Not `Extract<AnyEvent, { type: K }>`, which drops a member whose `type` is itself a union --
 * the generic events -- and would hand their listeners `never`.
 */
export type EventOfType<K extends EventType> = AnyEvent extends infer E
    ? E extends AnyEvent
        ? K extends E["type"]
            ? E
            : never
        : never
    : never;

export type GraphEventType = GraphEvent["type"];
export type NodeEventType = NodeEvent["type"];
export type EdgeEventType = EdgeEvent["type"];
/** The name of an event the AI assistant emits. OPEN UNION: event names may be added in a minor release. */
export type AiEventType = AiEvent["type"];

/**
 * Event names graphty-element still emits with no declared event type. Each is forwarded to the
 * DOM as before, as a plain `Event` to a TypeScript listener, and none can be subscribed through
 * `graph.on`. They wait on the next major release (issue #1577), which stops forwarding the six
 * input bookkeeping events and gives `layout-updated` its own name back: today its payload's
 * `type: "incremental"` overwrites the name, so it actually arrives as an event named
 * `incremental`.
 *
 * Listed here only so the element's own emit sites still compile; a new name does not belong here.
 * @internal
 */
export type UndeclaredEventType =
    | "layout-updated"
    | "input-initialized"
    | "input-config-updated"
    | "input-pointer-lock-changed"
    | "input-recording-started"
    | "input-recording-stopped"
    | "input-playback-completed";

/** Every name the element's own emitter accepts: see `EventManager.emit`. */
export type EmittableEventType = GraphEventType | AiEventType | UndeclaredEventType;

// graph events
export type GraphEvent =
    | GraphSettledEvent
    | GraphErrorEvent
    | GraphDataLoadedEvent
    | GraphDataAddedEvent
    | GraphSnapshotReplacedEvent
    | GraphSnapshotDroppedEvent
    | GraphDataClearedEvent
    | GraphLayoutInitializedEvent
    | CameraStateChangedEvent
    | GraphGenericEvent
    | DataLoadingProgressEvent
    | DataLoadingErrorEvent
    | DataLoadingErrorSummaryEvent
    | DataLoadingCompleteEvent
    | ElementsRemovedEvent
    | StyleChangedEvent
    | SelectionChangedEvent
    | GraphStartedEvent
    | LayoutChangedEvent
    | OperationCancelledEvent
    | StatsUpdateEvent
    | InputEnabledChangedEvent
    | XRSessionStartedEvent
    | XRSessionEndedEvent
    | InputPointerEvent
    | InputWheelEvent
    | InputTouchEvent
    | InputTouchEndEvent
    | InputKeyEvent
    | InputShortcutEvent;

/** A graph event type that stays inside the element: see {@link INTERNAL_EVENT_TYPES}. */
export type InternalEventType = GraphSnapshotReplacedEvent["type"] | GraphSnapshotDroppedEvent["type"];

/**
 * The unprefixed events `<graphty-element>` forwards to the DOM, by name: every graph and AI event
 * except the element-internal ones, each a `CustomEvent` whose `detail` is the internal event.
 *
 * They are typed by the element's own `addEventListener` and `removeEventListener` rather than on
 * the global `HTMLElementEventMap`: the names carry no prefix, so a global declaration would type
 * `style-changed` on every element of the page, and `error` is already `ErrorEvent` there.
 */
export type GraphtyForwardedEventMap = {
    [K in Exclude<GraphEventType | AiEventType, InternalEventType>]: CustomEvent<EventOfType<K>>;
};

/**
 * The graph event types that stay INSIDE the element: emitted on the internal graph observable so
 * the element's own managers can react, and never re-dispatched to the DOM.
 *
 * `<graphty-element>` forwards every graph event it sees to the DOM verbatim -- the internal name
 * becomes the `CustomEvent` name and the internal event object becomes its `detail` -- so an event
 * meant for the element's own machinery escapes to consumers by default. Two rules decide what may
 * go out: a public DOM event name is prefixed and kebab-case, and its `detail` must survive
 * structured cloning. `snapshot-replaced` fails both. Its name carries no prefix, and its payload
 * is a `Graph` plus two `GraphSnapshot`s built on typed arrays, which a listener cannot clone,
 * post to a worker or serialise -- so the event would reach consumers as a name they must not rely
 * on carrying a value they cannot use.
 *
 * To keep a new internal event off the DOM, add its type to this set. Nothing else changes: the
 * forwarder asks {@link isDomForwardableEvent}, which is the only place the decision is made.
 */
// The literals stay in this initializer: scripts/dom-events.mjs reads them from here to leave these
// events out of the custom elements manifest.
export const INTERNAL_EVENT_TYPES: ReadonlySet<GraphEventType> = new Set<GraphEventType>([
    "snapshot-replaced",
    "snapshot-dropped",
] satisfies InternalEventType[]);

/**
 * Whether a graph event may leave the element as a DOM CustomEvent.
 * @param event - the internal graph event about to be forwarded
 * @returns false for an element-internal event, true for one consumers are meant to see
 */
export function isDomForwardableEvent(event: GraphEvent): boolean {
    return !INTERNAL_EVENT_TYPES.has(event.type);
}

export interface GraphSettledEvent {
    type: "graph-settled";
    graph: Graph;
}

export interface GraphErrorEvent {
    type: "error";
    graph: Graph | null;
    error: Error;
    context: "init" | "data-loading" | "layout" | "algorithm" | "xr" | "other";
    details?: Record<string, unknown>;
}

export interface GraphDataLoadedEvent {
    type: "data-loaded";
    graph: Graph;
    details: {
        chunksLoaded: number;
        dataSourceType: string;
        /** What the load did: the endpoint spelling it resolved, and the counts it produced. */
        report: ImportReport;
        /**
         * Which load this is about: the id `addDataFromSource`, `loadFromFile` and `loadFromUrl`
         * resolve to, and that every event about one load carries. Absent on a report about records
         * handed to a setter, which is not a load.
         */
        loadId?: number;
    };
    /** What loaded it; absent for a load that does not yet come through the session's history. */
    cause?: HistoryCause;
}

export interface GraphDataAddedEvent {
    type: "data-added";
    dataType: "nodes" | "edges";
    count: number;
    shouldStartLayout: boolean;
    shouldZoomToFit: boolean;
    /**
     * What added the rows: a command, or undo, redo or a rollback bringing them back. Absent for a
     * load that does not yet come through the session's history (a data source, a file, a URL).
     * The element starts a layout, frames the camera and runs the on-load algorithms only for
     * rows a command or such a load added, never for rows undo or redo brought back.
     */
    cause?: HistoryCause;
}

/**
 * Emitted by DataManager after every freeze, once the element's position column is attached to the
 * new snapshot (graph-format design 14.4 rule 11).
 *
 * Listeners release per-snapshot resources: `Graph` releases the accelerator's buffers for
 * `previous` and for its undirected copy when that is a distinct snapshot (the release list of the
 * WebGPU design 9.4 item 2), and caches drop their entries. Nothing a WeakMap can do for them --
 * GPU memory is not garbage collected. A dataset that is cleared rather than replaced has no
 * `next` to freeze and is announced by {@link GraphSnapshotDroppedEvent} instead.
 */
export interface GraphSnapshotReplacedEvent {
    type: "snapshot-replaced";
    /** The graph whose data changed. */
    graph: Graph;
    /** The superseded snapshot; null on the first freeze. */
    previous: GraphSnapshot | null;
    /** The snapshot every consumer must switch to. */
    next: GraphSnapshot;
    /** freezeWithReport's report, relative to the PREVIOUS freeze of the same builder. */
    report: FreezeReport;
}

/**
 * Emitted by DataManager when the dataset is cleared: the store and every snapshot it froze are
 * discarded without a replacement, so no `snapshot-replaced` ever carries that boundary.
 *
 * Listeners drop their per-snapshot resources exactly as they do on a replacement -- `Graph`
 * releases the accelerator's buffers for the snapshot it was showing. Emitted while the outgoing
 * store is still usable, so a listener can still ask it for a derived view of what it is freeing.
 */
export interface GraphSnapshotDroppedEvent {
    type: "snapshot-dropped";
}

/**
 * Emitted once every time the graph's data is cleared -- by `clearData()`, and by a load that
 * replaces the dataset -- after every node and edge is gone. It carries nothing, so it survives
 * structured cloning; a consumer that wants the new counts reads them.
 */
export interface GraphDataClearedEvent {
    type: "data-cleared";
}

export interface GraphLayoutInitializedEvent {
    type: "layout-initialized";
    layoutType: string;
    shouldZoomToFit: boolean;
}

export interface CameraStateChangedEvent {
    type: "camera-state-changed";
    state: {
        position?: { x: number; y: number; z: number };
        target?: { x: number; y: number; z: number };
        zoom?: number;
        pan?: { x: number; y: number };
        [key: string]: unknown;
    };
}

// Generic events for internal manager communication
export interface GraphGenericEvent {
    type:
        | "render-initialized"
        | "manager-initialized"
        | "lifecycle-initialized"
        | "lifecycle-disposed"
        | "skybox-loaded"
        | "operation-queue-active"
        | "operation-queue-idle"
        | "operation-batch-complete"
        | "operation-start"
        | "operation-complete"
        | "operation-progress"
        // How far a layout on the snapshot contract has got: `layoutType`, `fraction` (0 to 1, or
        // null when the layout cannot say) and an optional `message`, as the layout reported them.
        | "layout-progress"
        | "operation-obsoleted"
        | "animation-progress"
        | "animation-cancelled"
        | "screenshot-enhancing"
        | "screenshot-ready"
        // Emitted when auto-framing has finished moving the camera around the whole graph. It
        // was emitted and not declared, so `addListener` could not name it and no consumer could
        // subscribe to an event the element was already sending.
        | "zoom-to-fit-complete"
        // Emitted when the PICTURE is final: the layout has converged, the camera has finished
        // framing it, and a frame has been drawn in that state. `graph-settled` fires one pass
        // earlier -- the instant the layout stops, before the final framing has even been asked
        // for -- so anything that photographs, records or measures the view wants this one.
        | "graph-frame-stable";
    [key: string]: unknown;
}

/**
 * Emitted after the style stack changed and the graph was repainted for it.
 *
 * The detail is counts and words, never layers, so it survives structured cloning; a consumer
 * that wants the stack itself reads `session.styles.list()`.
 */
export interface StyleChangedEvent {
    type: "style-changed";
    /** Which style verb produced the change. */
    reason: StyleChange["reason"];
    /** How many layers the change touched. */
    layers: number;
    /** How much was repainted, or null when no renderer is bound. */
    painted: StyleChange["painted"];
    /** The paths the changed layers read that nothing in the session answers yet. */
    unresolvedPaths: string[];
}

// Data loading events
export interface DataLoadingProgressEvent {
    type: "data-loading-progress";
    format: string;
    bytesProcessed: number;
    totalBytes?: number;
    percentage?: number;
    /**
     * How many node RECORDS the source has handed over so far.
     *
     * Named for records because that is what it counts, and because the number the load finishes
     * with is a different one: an edge naming a node the file never declares creates that node, so
     * the graph can hold more nodes than any source handed over.
     */
    nodeRecordsLoaded: number;
    /**
     * How many edge RECORDS the source has handed over so far.
     *
     * Mid-load is before the endpoint spelling has been settled for every chunk and before a
     * rejected or merged record has been resolved into an edge or into nothing, so this is the
     * only edge number that can honestly be published while a load is running. A load of three
     * records that produces two edges progresses to three here and completes at two.
     *
     * Both halves of this event used to be called `nodesLoaded` and `edgesLoaded`, the same names
     * `data-loading-complete` carries for two different numbers -- which is the confusion the
     * import report exists to end, repeated one level down.
     */
    edgeRecordsLoaded: number;
    chunksProcessed: number;
    /**
     * Which load this is about: the id `addDataFromSource`, `loadFromFile` and `loadFromUrl`
     * resolve to, and that every event about one load carries. Absent on a report about records
     * handed to a setter, which is not a load.
     */
    loadId?: number;
}

export interface DataLoadingErrorEvent {
    type: "data-loading-error";
    error: Error;
    context: "detection" | "validation" | "parsing";
    format?: string;
    line?: number;
    nodeId?: unknown;
    edgeId?: string;
    canContinue: boolean;
    /**
     * Which load this is about: the id `addDataFromSource`, `loadFromFile` and `loadFromUrl`
     * resolve to, and that every event about one load carries. Absent on a report about records
     * handed to a setter, which is not a load.
     */
    loadId?: number;
}

export interface DataLoadingErrorSummaryEvent {
    type: "data-loading-error-summary";
    format: string;
    totalErrors: number;
    primaryCategory?: string;
    message: string;
    suggestion?: string;
    detailedReport: string;
    /**
     * Which load this is about: the id `addDataFromSource`, `loadFromFile` and `loadFromUrl`
     * resolve to, and that every event about one load carries. Absent on a report about records
     * handed to a setter, which is not a load.
     */
    loadId?: number;
}

export interface DataLoadingCompleteEvent {
    type: "data-loading-complete";
    format: string;
    /**
     * How many nodes the graph HOLDS after the load.
     *
     * It used to count the node records the source handed over, which is a different number
     * whenever an edge names a node the file never declares -- the graph creates that node, and
     * the event then disagreed with `session.status.counts.nodes` about a graph neither of them
     * was wrong about. Both numbers are still published: the record count is
     * `report.counts.nodeRecords`.
     */
    nodesLoaded: number;
    /**
     * How many edges the graph HOLDS after the load.
     *
     * It used to count edge records handed over, which is a different number and was wrong by the
     * whole file whenever the endpoint columns did not resolve: `miserables.json` reported 254
     * next to a graph holding zero. The record count is still published, under the name that says
     * what it is, as `report.counts.edgeRecords`.
     */
    edgesLoaded: number;
    duration: number; // milliseconds
    errors: number;
    warnings: number;
    success: boolean;
    /** What the load did: the endpoint spelling, the repeat policy, and every count. */
    report: ImportReport;
    /**
     * Which load this is about: the id `addDataFromSource`, `loadFromFile` and `loadFromUrl`
     * resolve to, and that every event about one load carries. Absent on a report about records
     * handed to a setter, which is not a load.
     */
    loadId?: number;
}

/**
 * Emitted once per `removeNodes` call, naming everything that went.
 *
 * Removing a node removes the edges attached to it, and before this event there was no removal
 * notification of any kind -- so a consumer watching the element saw its counts change underneath
 * it with nothing to say why, and a status bar built on the load events stayed stale until the
 * next load. The detail is ids only, so it survives structured cloning.
 */
export interface ElementsRemovedEvent {
    type: "elements-removed";
    /** The nodes the caller asked to remove, in the order they were removed. */
    nodes: NodeId[];
    /** Every edge that was attached to one of them, and therefore went with it. */
    edges: EdgeId[];
    /** What removed them; absent for a removal that does not yet come through the history. */
    cause?: HistoryCause;
}

/** Emitted once the render loop has started, after the element finished initializing. */
export interface GraphStartedEvent {
    type: "graph-started";
    /** When the loop started, in milliseconds since the epoch. */
    timestamp: number;
}

/** Emitted when a new layout engine has been built and is now the running layout. */
export interface LayoutChangedEvent {
    type: "layout-changed";
    /** The layout type that is now running, as `setLayout` was given it. */
    layoutType: string;
    /** The options the layout was built with: the caller's, filled in with the layout's defaults. */
    options: Record<string, unknown>;
}

/** Emitted when a queued operation is aborted before it finished. */
export interface OperationCancelledEvent {
    type: "operation-cancelled";
    /** The operation's id, as `operation-start` carried it. */
    id: string;
    /**
     * Why it was aborted, as the queue words it: `"Queue cleared"` when the whole queue was
     * cleared, `"Manual cancellation"` when this one operation was cancelled.
     */
    reason: string;
}

/** Emitted every 60 graph updates with the counters `getStatsManager().getStats()` returns. */
export interface StatsUpdateEvent {
    type: "stats-update";
    /** How many graph updates have run since the counters were last reset. */
    totalUpdates: number;
    /** The counters as they stand now. */
    stats: ReturnType<StatsManager["getStats"]>;
}

/** Emitted when user input on the canvas is switched on or off, by `setInputEnabled`. */
export interface InputEnabledChangedEvent {
    type: "input-enabled-changed";
    /** Whether the canvas now takes user input. */
    enabled: boolean;
}

/** Emitted when a VR or AR session has started and the graph is drawing into it. */
export interface XRSessionStartedEvent {
    type: "xr-session-started";
    /** Which kind of session: `"vr"` or `"ar"`, as `setViewMode` names them. */
    mode: "vr" | "ar";
    /** The reference space the configuration asked for (`xr.vr` or `xr.ar` `referenceSpaceType`). */
    requestedReferenceSpace: "local" | "local-floor" | "bounded-floor" | "unbounded";
    /**
     * The reference space the device granted: the requested one, or the first fallback it accepted
     * (`local-floor`, then `local`), or `"viewer"` when it refused all of them.
     */
    referenceSpace: "local" | "local-floor" | "bounded-floor" | "unbounded" | "viewer";
}

/** Emitted when a VR or AR session has ended and the graph is back in its 3D view. */
export interface XRSessionEndedEvent {
    type: "xr-session-ended";
    /** Which kind of session ended: `"vr"` or `"ar"`. */
    mode: "vr" | "ar";
    /**
     * `"exit"` when the element left the session (`setViewMode("3d")`, `exitXR()`), `"device"`
     * when the headset or browser ended it (the system button, taking the headset off).
     */
    cause: "exit" | "device";
}

// Selection events
/**
 * Emitted for each pointer press, move and release on the canvas while input is enabled.
 *
 * Only the position is carried, not the button or the pointer id.
 */
export interface InputPointerEvent {
    type: "input:pointer-down" | "input:pointer-move" | "input:pointer-up";
    /** The DOM event's `clientX`. */
    x: number;
    /** The DOM event's `clientY`. */
    y: number;
}

/** Emitted for each wheel turn over the canvas while input is enabled. */
export interface InputWheelEvent {
    type: "input:wheel";
    deltaX: number;
    deltaY: number;
    deltaZ: number;
    /** The DOM `WheelEvent.deltaMode`: 0 pixels, 1 lines, 2 pages. */
    deltaMode: number;
}

/** Emitted when touches start or move on the canvas while input is enabled. */
export interface InputTouchEvent {
    type: "input:touch-start" | "input:touch-move";
    /** One position per touch point: the touch's `clientX` and `clientY`. */
    array: { x: number; y: number }[];
}

/** Emitted when touches end on the canvas while input is enabled. */
export interface InputTouchEndEvent {
    type: "input:touch-end";
    /** One entry per touch that ended, holding its touch id. */
    array: { value: number }[];
}

/** Emitted for each key press and release on the canvas while input is enabled. */
export interface InputKeyEvent {
    type: "input:key-down" | "input:key-up";
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}

/**
 * Emitted for the undo, redo and select-all keyboard shortcuts on the canvas while input is enabled.
 *
 * Undo is Ctrl+Z, redo Ctrl+Shift+Z or Ctrl+Y, select-all Ctrl+A; Cmd replaces Ctrl on macOS.
 */
export interface InputShortcutEvent {
    type: "input:undo" | "input:redo" | "input:select-all";
}

export interface SelectionChangedEvent {
    type: "selection-changed";
    previousNode: Node | null;
    currentNode: Node | null;
    previousNodeId: string | number | null;
    currentNodeId: string | number | null;
}

// node events
export type NodeEvent =
    NodeGenericEvent | NodeAddEvent | NodeClickEvent | NodeHoverEvent | NodeDragStartEvent | NodeDragEndEvent;

export interface NodeGenericEvent {
    type: "node-update-after" | "node-update-before";
    node: Node;
}

export interface NodeAddEvent {
    type: "node-add-before";
    nodeId: NodeIdType;
    metadata: object;
}

/**
 * Emitted when a node is clicked.
 * @since 1.5.0
 */
export interface NodeClickEvent {
    type: "node-click";
    node: Node;
    data: Record<string, unknown>;
    event: PointerEvent;
}

/**
 * Emitted when the pointer enters a node (hover start).
 * @since 1.5.0
 */
export interface NodeHoverEvent {
    type: "node-hover";
    node: Node;
    data: Record<string, unknown>;
}

/**
 * Emitted when a node drag operation starts.
 * @since 1.5.0
 */
export interface NodeDragStartEvent {
    type: "node-drag-start";
    node: Node;
    position: { x: number; y: number; z: number };
    /** Whether this node was already pinned when the drag began. */
    pinned: boolean;
}

/**
 * Emitted when a node drag operation ends.
 * @since 1.5.0
 */
export interface NodeDragEndEvent {
    type: "node-drag-end";
    node: Node;
    position: { x: number; y: number; z: number };
    /** Whether the node is pinned now the drag has finished, which `pinOnDrag` decides. */
    pinned: boolean;
}

/**
 * What a `graphty-node-click`, `graphty-node-hover`, `graphty-node-drag-start` or
 * `graphty-node-drag-end` DOM event carries.
 *
 * It is NOT the internal node event. The internal one carries a live `Node` -- a Babylon mesh, a
 * material and a scene -- and a `CustomEvent` detail crosses to listeners that may structure-clone
 * it or post it to a worker, where a live handle either throws on the way out or hands a listener
 * something the renderer is about to dispose. So the detail carries the node's ID, and a consumer
 * that wants the record looks it up. This is the same rule the selection and run mirrors follow.
 */
export interface NodeEventDetail {
    /** The node the pointer was on, as `session.data.node()` takes it. */
    nodeId: NodeIdType;
    /** The node's own record data, as the importer supplied it. Absent on the drag events. */
    data?: Record<string, unknown>;
    /** Where the node is in world space. Present on the drag events only. */
    position?: { x: number; y: number; z: number };
    /**
     * Whether the node is pinned. On `graphty-node-drag-start` this is the pin as it was when the
     * drag began; on `graphty-node-drag-end` it is the pin after `pinOnDrag` has acted.
     */
    pinned?: boolean;
    /** Which pointer button produced a click, in the DOM's own numbering. */
    button?: number;
    /** The modifier keys held during a click, for a consumer distinguishing shift-click. */
    modifiers?: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
}

/** The DOM event name one internal node event is mirrored under. */
export const NODE_EVENT_DOM_NAMES: Readonly<Record<string, string>> = {
    "node-click": "graphty-node-click",
    "node-hover": "graphty-node-hover",
    "node-drag-start": "graphty-node-drag-start",
    "node-drag-end": "graphty-node-drag-end",
};

/**
 * Reduce one internal node event to a detail that can leave the element.
 * @param event - the internal node event about to be mirrored
 * @returns the detail, or null for an internal node event that does not go to the DOM
 */
export function nodeEventDetail(event: NodeEvent): NodeEventDetail | null {
    switch (event.type) {
        case "node-click":
            return {
                nodeId: event.node.id,
                data: event.data,
                button: event.event.button,
                modifiers: {
                    shift: event.event.shiftKey,
                    ctrl: event.event.ctrlKey,
                    alt: event.event.altKey,
                    meta: event.event.metaKey,
                },
            };
        case "node-hover":
            return { nodeId: event.node.id, data: event.data };
        case "node-drag-start":
        case "node-drag-end":
            return { nodeId: event.node.id, position: event.position, pinned: event.pinned };
        default:
            // node-add-before, node-update-before and node-update-after are the element's own
            // update pipeline. They fire once per node per repaint and carry render objects, so
            // they stay inside.
            return null;
    }
}

// edge events
// There is deliberately no edge-click event. Edge meshes are unpickable in three places, so
// nothing could emit one, and the type that used to be declared here described a detail carrying a
// live `Edge` -- a Babylon mesh -- which cannot be structure-cloned and so could never have left
// the element. A declared event that never fires is a documented lie; it comes back, with a
// serialisable detail, when edge picking lands.
//
// The same fact took the edge TOOLTIP with it in 2.0. A tooltip is drawn when the pointer lands
// on the thing it belongs to, so an unpickable edge can never show one, and `edge.tooltip` was
// published as something the element draws for the whole of 1.x and drawn by nothing. The
// channel and the tooltip block on `EdgeStyle` are withdrawn, recorded in
// `WITHDRAWN_CAPABILITIES` in `src/catalog/unreachable.ts`. Both come back together.
export type EdgeEvent = EdgeGenericEvent | EdgeAddEvent;

export interface EdgeGenericEvent {
    type: "edge-update-after" | "edge-update-before";
    edge: Edge;
}

export interface EdgeAddEvent {
    type: "edge-add-before";
    srcNodeId: NodeIdType;
    dstNodeId: NodeIdType;
    metadata: object;
}

/**
 * Every event the AI assistant emits. OPEN UNION: events may be added in a minor release, so a
 * `switch` over `type` needs a `default`; a listener subscribed by name never receives one it
 * did not ask for.
 */
export type AiEvent =
    | AiStatusChangeEvent
    | AiCommandStartEvent
    | AiCommandCompleteEvent
    | AiCommandErrorEvent
    | AiCommandCancelledEvent
    | AiStreamChunkEvent
    | AiStreamToolCallEvent
    | AiStreamToolResultEvent
    | AiVoiceStartEvent
    | AiVoiceTranscriptEvent
    | AiVoiceEndEvent
    | AiApprovalRequestedEvent
    | AiExportReadyEvent
    | AiConversationChangedEvent
    | AiPendingResolvedEvent
    | AiQuestionAskedEvent
    | AiAgentStartEvent
    | AiAgentEndEvent;

/** Main event for UI binding - single source of truth for AI status */
export interface AiStatusChangeEvent {
    type: "ai-status-change";
    status: AiStatus;
}

/** Emitted when an AI command starts processing */
export interface AiCommandStartEvent {
    type: "ai-command-start";
    input: string;
    timestamp: number;
}

/** Emitted when an AI command completes successfully */
export interface AiCommandCompleteEvent {
    type: "ai-command-complete";
    result: CommandResult;
    duration: number;
}

/** Emitted when an AI command encounters an error */
export interface AiCommandErrorEvent {
    type: "ai-command-error";
    error: Error;
    input: string;
    canRetry: boolean;
}

/** Emitted when an AI command is cancelled */
interface AiCommandCancelledEvent {
    type: "ai-command-cancelled";
    input: string;
    reason: "user" | "timeout";
}

/**
 * Emitted once for each piece of text the provider streams, not throttled.
 *
 * OpenAI and Anthropic stream in small pieces, so one answer can send many.
 */
export interface AiStreamChunkEvent {
    type: "ai-stream-chunk";
    /** The piece of text that just arrived. */
    text: string;
    /** The message's text so far, every turn of it. */
    accumulated: string;
}

/** Emitted when the LLM makes a tool call */
interface AiStreamToolCallEvent {
    type: "ai-stream-tool-call";
    name: string;
    params: unknown;
}

/** Emitted when a tool call completes */
export interface AiStreamToolResultEvent {
    type: "ai-stream-tool-result";
    name: string;
    result: unknown;
    success: boolean;
}

/** Emitted when voice input starts */
interface AiVoiceStartEvent {
    type: "ai-voice-start";
}

/** Emitted when voice transcript is available */
interface AiVoiceTranscriptEvent {
    type: "ai-voice-transcript";
    transcript: string;
    isFinal: boolean;
}

/**
 * The assistant held a batch of its changes for the reader's approval: it was large, slow,
 * replaced the graph, could not be undone or fetched a URL the reader did not give. Nothing it
 * asked for has happened. Answer with `resolveAiApproval(request.id, { approve })`; the id expires
 * at the reader's next message. A host that listens for none of these never runs a held batch.
 */
export interface AiApprovalRequestedEvent {
    /** The event's name. */
    type: "ai-approval-requested";
    /** What the reader is asked to approve. */
    request: AiApprovalRequest;
    /**
     * True when the request was made earlier and is asked again: the assistant reopened a saved
     * conversation still waiting on it (after a reload, in a new element). Draw it as any other.
     */
    replayed: boolean;
}

/** What the assistant asks the reader to approve. */
export interface AiApprovalRequest {
    /** The single-use id `resolveAiApproval` takes. */
    readonly id: string;
    /**
     * Why it was held; `"policy"` when the host's approval policy asked, `"plan"` for a hand-off
     * to a helper while `confirmPlans` is set. OPEN UNION.
     */
    readonly gate: "slow" | "large" | "replaces" | "irreversible" | "network" | "policy" | "plan" | (string & {}); // NOSONAR(S4335): the open-union idiom
    /** The tool calls held, as the model made them. */
    readonly calls: readonly { readonly tool: string; readonly arguments: Readonly<Record<string, unknown>> }[];
    /** What the reader is shown before approving; empty for a `"policy"` hold. */
    readonly preview: AiApprovalPreview;
    /** The saved conversation it belongs to, when the assistant keeps `history`. */
    readonly conversationId?: string;
    /** The conversation message whose calls are held. */
    readonly messageId?: string;
    /** When it was held, as an ISO 8601 time. */
    readonly createdAt?: string;
    /** The helper (`AiAgentRole.name`) whose calls are held, when a helper made them. */
    readonly agent?: string;
}

/**
 * The model asked the reader a question with a few choices, and the message waits for the answer
 * (the command resolved `AI_QUESTION_ASKED`). Draw the question and its choices; answer with
 * `answerAiQuestion(request.id, choice)`, by the choice's value. Only with `questions: true`.
 */
export interface AiQuestionAskedEvent {
    /** The event's name. */
    type: "ai-question-asked";
    /** What the reader is asked. */
    request: AiQuestionRequest;
    /** True when the question was asked earlier and is asked again, as for an approval. */
    replayed: boolean;
}

/** A question the model asks the reader. */
export interface AiQuestionRequest {
    /** The single-use id `answerAiQuestion` takes. */
    readonly id: string;
    /** The question, as the model wrote it, in the reader's language. */
    readonly question: string;
    /** The answers the reader may give, as the model wrote them: two to ten. */
    readonly choices: readonly string[];
    /** Whether the reader may pick more than one. */
    readonly multiple: boolean;
    /** The saved conversation it belongs to, when the assistant keeps `history`. */
    readonly conversationId?: string;
    /** The conversation message that asked. */
    readonly messageId?: string;
    /** When it was asked, as an ISO 8601 time. */
    readonly createdAt?: string;
}

/** The assistant handed a task to a helper (`AiAgentRole`), which starts on it. */
export interface AiAgentStartEvent {
    /** The event's name. */
    type: "ai-agent-start";
    /** The helper's name. */
    agent: string;
    /** The task it was handed, as the main model or the plan wrote it. */
    task: string;
}

/** A helper finished its task. */
export interface AiAgentEndEvent {
    /** The event's name. */
    type: "ai-agent-end";
    /** The helper's name. */
    agent: string;
    /** How it ended, as an AI command's result code. */
    code: AiResultCode;
    /** The facts behind `code`, with the tokens it used (`inputTokens`, `outputTokens`). */
    params: AiResultParams;
}

/**
 * Something the assistant waited on the reader for ended: an approval was answered, superseded
 * by a new message or a new conversation (`AI_APPROVAL_STALE` with `reason: "superseded"`),
 * cancelled (`AI_CANCELLED`) or undone (`AI_UNDONE`). Remove what was drawn for it.
 */
export interface AiPendingResolvedEvent {
    /** The event's name. */
    type: "ai-pending-resolved";
    /** The request's id, as `ai-approval-requested` or `ai-question-asked` gave it. */
    id: string;
    /** What was waiting. OPEN UNION. */
    kind: "approval" | "question" | (string & {}); // NOSONAR(S4335): the open-union idiom
    /**
     * How it ended: `AI_COMPLETED` (approved), `AI_APPROVAL_DENIED`, `AI_APPROVAL_STALE`,
     * `AI_CANCELLED` or `AI_UNDONE`.
     */
    code: AiResultCode;
    /** The facts behind `code` (`reason` for a stale request). */
    params: AiResultParams;
}

/**
 * What a held change would do, for the reader to judge. Each gate sets the fields it measured:
 * `large` the counts and the first affected nodes, `slow` the algorithm and its seconds, `replaces`
 * and `network` what an import or a clear would replace and from where, `irreversible` the run it
 * would cancel. OPEN: fields may be added in a minor release.
 */
export interface AiApprovalPreview {
    /** Nodes the message would remove in all. */
    readonly removeNodes?: number;
    /** Edges the message would remove in all. */
    readonly removeEdges?: number;
    /** Attribute values the message would change in all. */
    readonly changedValues?: number;
    /** The first nodes it would change, at most ten, with their labels. */
    readonly ids?: readonly { readonly id: string; readonly label: string }[];
    /** The algorithm a slow run or a cancel names, by its catalog key. */
    readonly algorithm?: string;
    /** How long a slow run is estimated to take, or `"unbounded"`. */
    readonly seconds?: number | "unbounded";
    /** The run's cost class (`"linear"`, `"iterative"`, ...). */
    readonly costClass?: string;
    /** The run a cancel would stop. */
    readonly run?: string;
    /** Nodes the graph holds, which a replacing import or a clear discards. */
    readonly nodes?: number;
    /** Edges the graph holds, which a clear discards. */
    readonly edges?: number;
    /** How an import treats the graph there: `"merge"` or `"replace"`. */
    readonly mode?: "merge" | "replace";
    /** The URL an import would fetch, which the reader did not give. */
    readonly url?: string;
}

/**
 * The assistant exported the graph or captured a picture or a video: the document is handed to
 * the application, which saves or shows it. The model receives only its size.
 */
export interface AiExportReadyEvent {
    /** The event's name. */
    type: "ai-export-ready";
    /** The format: a graph format's id (`graphml`), or a picture's or a video's (`png`, `webm`). */
    format: FormatId;
    /** The document: text for a graph format, a `Blob` for a picture or a video. */
    data: string | Blob;
    /** What the format could not carry, as coded facts. */
    losses: readonly ExportLoss[];
}

/**
 * The open conversation changed: it was saved, reopened, switched to, started anew
 * (`newAiConversation`, `clearAiHistory`) or changed by another tab, or its store failed. Read it
 * again with `getAiConversation()`. Only with `history` set.
 */
export interface AiConversationChangedEvent {
    /** The event's name. */
    type: "ai-conversation-changed";
    /** The open conversation's id. */
    conversationId: string;
    /**
     * Set when the store failed: `AI_STORAGE_FAILED` (a write failed; the conversation carries on
     * in memory) or `AI_HISTORY_UNAVAILABLE` (the browser's storage could not open).
     */
    code?: AiResultCode;
    /** The facts behind `code`. */
    params?: AiResultParams;
}

/** Emitted when voice input ends */
interface AiVoiceEndEvent {
    type: "ai-voice-end";
    reason: "user" | "timeout" | "error";
}
