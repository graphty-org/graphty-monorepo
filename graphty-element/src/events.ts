import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";

import type { AiStatus } from "./ai/AiStatus";
import type { CommandResult } from "./ai/commands/types";
import type { EdgeId, NodeId } from "./catalog/types";
import type { NodeIdType } from "./config";
import type { ImportReport } from "./data/report";
import type { Edge } from "./Edge";
import type { Graph } from "./Graph";
import type { Node } from "./Node";

export type EventType = GraphEventType | NodeEventType | EdgeEventType | AiEventType;
export type EventCallbackType = (evt: GraphEvent | NodeEvent | EdgeEvent | AiEvent) => void;

export type GraphEventType = GraphEvent["type"];
export type NodeEventType = NodeEvent["type"];
export type EdgeEventType = EdgeEvent["type"];
type AiEventType = AiEvent["type"];

// graph events
export type GraphEvent =
    | GraphSettledEvent
    | GraphErrorEvent
    | GraphDataLoadedEvent
    | GraphDataAddedEvent
    | GraphSnapshotReplacedEvent
    | GraphSnapshotDroppedEvent
    | GraphLayoutInitializedEvent
    | CameraStateChangedEvent
    | GraphGenericEvent
    | DataLoadingProgressEvent
    | DataLoadingErrorEvent
    | DataLoadingErrorSummaryEvent
    | DataLoadingCompleteEvent
    | ElementsRemovedEvent
    | SelectionChangedEvent;

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
export const INTERNAL_EVENT_TYPES: ReadonlySet<GraphEventType> = new Set<GraphEventType>([
    "snapshot-replaced",
    "snapshot-dropped",
]);

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
}

export interface GraphDataAddedEvent {
    type: "data-added";
    dataType: "nodes" | "edges";
    count: number;
    shouldStartLayout: boolean;
    shouldZoomToFit: boolean;
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
        | "operation-obsoleted"
        | "animation-progress"
        | "animation-cancelled"
        | "screenshot-enhancing"
        | "screenshot-ready"
        | "style-changed"
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
}

// Selection events
export interface SelectionChangedEvent {
    type: "selection-changed";
    previousNode: Node | null;
    currentNode: Node | null;
    previousNodeId: string | number | null;
    currentNodeId: string | number | null;
}

// node events
export type NodeEvent =
    | NodeGenericEvent
    | NodeAddEvent
    | NodeClickEvent
    | NodeHoverEvent
    | NodeDragStartEvent
    | NodeDragEndEvent;

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

// AI events (Phase 7)
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
    | AiVoiceEndEvent;

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

/** Emitted during streaming when text chunks arrive (throttled) */
export interface AiStreamChunkEvent {
    type: "ai-stream-chunk";
    text: string;
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

/** Emitted when voice input ends */
interface AiVoiceEndEvent {
    type: "ai-voice-end";
    reason: "user" | "timeout" | "error";
}
