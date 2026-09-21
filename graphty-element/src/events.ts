import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";

import type { AiStatus } from "./ai/AiStatus";
import type { CommandResult } from "./ai/commands/types";
import type { NodeIdType } from "./config";
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
    | GraphLayoutInitializedEvent
    | CameraStateChangedEvent
    | GraphGenericEvent
    | DataLoadingProgressEvent
    | DataLoadingErrorEvent
    | DataLoadingErrorSummaryEvent
    | DataLoadingCompleteEvent
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
export const INTERNAL_EVENT_TYPES: ReadonlySet<GraphEventType> = new Set<GraphEventType>(["snapshot-replaced"]);

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
 * Listeners release per-snapshot resources: at E1 `Graph` releases the accelerator's GPU buffers for
 * `previous` and its derived views, and caches drop their entries. Nothing a WeakMap can do for
 * them -- GPU memory is not garbage collected.
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
        | "style-changed";
    [key: string]: unknown;
}

// Data loading events
export interface DataLoadingProgressEvent {
    type: "data-loading-progress";
    format: string;
    bytesProcessed: number;
    totalBytes?: number;
    percentage?: number;
    nodesLoaded: number;
    edgesLoaded: number;
    chunksProcessed: number;
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
}

export interface DataLoadingErrorSummaryEvent {
    type: "data-loading-error-summary";
    format: string;
    totalErrors: number;
    primaryCategory?: string;
    message: string;
    suggestion?: string;
    detailedReport: string;
}

export interface DataLoadingCompleteEvent {
    type: "data-loading-complete";
    format: string;
    nodesLoaded: number;
    edgesLoaded: number;
    duration: number; // milliseconds
    errors: number;
    warnings: number;
    success: boolean;
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
}

/**
 * Emitted when a node drag operation ends.
 * @since 1.5.0
 */
export interface NodeDragEndEvent {
    type: "node-drag-end";
    node: Node;
    position: { x: number; y: number; z: number };
}

// edge events
export type EdgeEvent = EdgeGenericEvent | EdgeAddEvent | EdgeClickEvent;

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
 * Emitted when an edge is clicked.
 * @since 1.5.0
 */
export interface EdgeClickEvent {
    type: "edge-click";
    edge: Edge;
    data: Record<string, unknown>;
    event: PointerEvent;
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
