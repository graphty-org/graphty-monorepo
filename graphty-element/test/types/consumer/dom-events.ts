/**
 * @file The events guide's listeners, compiled against the published declarations with no cast.
 *
 * Every prefixed `graphty-*` event the element dispatches must reach a listener as a typed
 * `CustomEvent`, so `e.detail` compiles, and the detail types named after their events must be
 * importable. The unprefixed events the element forwards are typed by the element's own
 * `addEventListener`, and the prefixed ones on the document too. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type {
    Graphty,
    GraphtyCapabilitiesChangeDetail,
    GraphtyForwardedEventMap,
    GraphtyHistoryChangeDetail,
    GraphtyNoteChangeDetail,
    GraphtyRunChangeDetail,
} from "@graphty/graphty-element";

/** Each listener reads its detail's fields with no cast. */
export function listenToEveryPrefixedEvent(log: (...values: unknown[]) => void): void {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    element.addEventListener("graphty-run-change", (e) => {
        const { run, phase }: GraphtyRunChangeDetail = e.detail;
        log(run.label, phase, run.status);
    });
    element.addEventListener("graphty-progress-change", (e) => {
        const { task, phase, fraction } = e.detail;
        log(task, phase, fraction ?? 0);
    });
    element.addEventListener("graphty-selection-change", (e) => {
        const { added, removed, nodes, edges } = e.detail;
        log(added, removed, nodes + edges);
    });
    element.addEventListener("graphty-visibility-change", (e) => {
        const { visible, total, filterKind } = e.detail;
        log(visible.nodes, total.nodes, filterKind);
    });
    element.addEventListener("graphty-history-change", (e) => {
        const { reason, version, position, steps, canUndo, canRedo }: GraphtyHistoryChangeDetail = e.detail;
        log(reason, version, position, steps, canUndo, canRedo);
    });
    element.addEventListener("graphty-note-change", (e) => {
        const { id, change, fields, cause }: GraphtyNoteChangeDetail = e.detail;
        log(id, change, fields, cause);
    });
    element.addEventListener("graphty-project-status", (e) => {
        const { name, dirty } = e.detail;
        log(name, dirty);
    });
    element.addEventListener("graphty-capabilities-change", (e) => {
        const { capabilities }: GraphtyCapabilitiesChangeDetail = e.detail;
        const { state, reason } = capabilities.acceleration;
        log(state, reason);
    });
    element.addEventListener("graphty-label-change", (e) => {
        log(e.detail.labeled);
    });
    element.addEventListener("graphty-node-click", (e) => {
        const { nodeId, data, button, modifiers } = e.detail;
        log(nodeId, data, button, modifiers);
    });
    element.addEventListener("graphty-node-hover", (e) => {
        log(e.detail.nodeId);
    });
    element.addEventListener("graphty-node-drag-start", (e) => {
        log(e.detail.nodeId);
    });
    element.addEventListener("graphty-node-drag-end", (e) => {
        const { nodeId, position, pinned } = e.detail;
        log(nodeId, position, pinned);
    });
}

/** A detail is not `any`: reading a field the event does not carry fails to compile. */
export function aDetailIsNotAny(element: HTMLElement, log: (value: unknown) => void): void {
    element.addEventListener("graphty-history-change", (e) => {
        // @ts-expect-error -- the history detail has no `run`.
        log(e.detail.run);
    });
}

/** The prefixed events bubble and are composed, so a listener on the document is typed too. */
export function listenOnTheDocument(log: (...values: unknown[]) => void): void {
    document.addEventListener("graphty-selection-change", (e) => {
        log(e.detail.added);
    });
    document.addEventListener("graphty-node-click", (e) => {
        log(e.detail.nodeId);
    });
}

/** Each unprefixed forwarded event's detail is the internal event, read with no cast. */
export function listenToEveryForwardedEvent(element: Graphty, log: (...values: unknown[]) => void): void {
    element.addEventListener("graph-settled", (e) => {
        log(e.detail.type);
    });
    element.addEventListener("error", (e) => {
        const { error, context } = e.detail;
        log(error.message, context);
    });
    element.addEventListener("data-loaded", (e) => {
        log(e.detail.details.chunksLoaded);
    });
    element.addEventListener("data-added", (e) => {
        const { dataType, count } = e.detail;
        log(dataType, count);
    });
    element.addEventListener("data-cleared", (e) => {
        log(e.detail.type);
    });
    element.addEventListener("layout-initialized", (e) => {
        log(e.detail.layoutType);
    });
    element.addEventListener("camera-state-changed", (e) => {
        log(e.detail.state.zoom);
    });
    element.addEventListener("style-changed", (e) => {
        const { reason, layers, unresolvedPaths } = e.detail;
        log(reason, layers, unresolvedPaths);
    });
    element.addEventListener("data-loading-progress", (e) => {
        log(e.detail.bytesProcessed);
    });
    element.addEventListener("data-loading-error", (e) => {
        log(e.detail.canContinue);
    });
    element.addEventListener("data-loading-error-summary", (e) => {
        log(e.detail.totalErrors);
    });
    element.addEventListener("data-loading-complete", (e) => {
        const { nodesLoaded, edgesLoaded, success } = e.detail;
        log(nodesLoaded, edgesLoaded, success);
    });
    element.addEventListener("elements-removed", (e) => {
        log(e.detail.nodes, e.detail.edges);
    });
    element.addEventListener("selection-changed", (e) => {
        const { currentNodeId, previousNodeId } = e.detail;
        log(currentNodeId, previousNodeId);
    });
    element.addEventListener("graph-started", (e) => {
        log(e.detail.timestamp);
    });
    element.addEventListener("layout-changed", (e) => {
        const { layoutType, options } = e.detail;
        log(layoutType, options);
    });
    element.addEventListener("operation-cancelled", (e) => {
        const { id, reason } = e.detail;
        log(id, reason.length);
    });
    element.addEventListener("stats-update", (e) => {
        const { totalUpdates, stats } = e.detail;
        log(totalUpdates, stats.numNodes, stats.meshCacheHits);
    });
    element.addEventListener("input-enabled-changed", (e) => {
        const { enabled }: { enabled: boolean } = e.detail;
        log(enabled);
    });
    element.addEventListener("ai-status-change", (e) => {
        log(e.detail.status);
    });
    element.addEventListener("ai-command-start", (e) => {
        log(e.detail.input);
    });
    element.addEventListener("ai-command-complete", (e) => {
        log(e.detail.duration);
    });
    element.addEventListener("ai-command-error", (e) => {
        log(e.detail.canRetry);
    });
    element.addEventListener("ai-stream-chunk", (e) => {
        log(e.detail.accumulated);
    });
    element.addEventListener("ai-stream-tool-result", (e) => {
        log(e.detail.success);
    });

    // The rest carry a type and whatever the emitter added; each is still a typed CustomEvent.
    const rest = [
        "ai-command-cancelled",
        "ai-stream-tool-call",
        "ai-voice-start",
        "ai-voice-transcript",
        "ai-voice-end",
        "render-initialized",
        "manager-initialized",
        "lifecycle-initialized",
        "lifecycle-disposed",
        "skybox-loaded",
        "operation-queue-active",
        "operation-queue-idle",
        "operation-batch-complete",
        "operation-start",
        "operation-complete",
        "operation-progress",
        "layout-progress",
        "operation-obsoleted",
        "animation-progress",
        "animation-cancelled",
        "screenshot-enhancing",
        "screenshot-ready",
        "zoom-to-fit-complete",
        "graph-frame-stable",
    ] as const satisfies readonly (keyof GraphtyForwardedEventMap)[];
    for (const name of rest) {
        element.addEventListener(name, (e) => {
            log(e.detail.type);
        });
    }

    // Removing takes the same typed listener.
    const onStyle = (e: GraphtyForwardedEventMap["style-changed"]): void => {
        log(e.detail.layers);
    };
    element.addEventListener("style-changed", onStyle);
    element.removeEventListener("style-changed", onStyle);

    // Any other name still compiles as on any element.
    element.addEventListener("click", (e) => {
        log(e.clientX);
    });
    element.addEventListener("some-app-event", (e) => {
        log(e.type);
    });
}

/** A forwarded detail is not `any`: reading a field the event does not carry fails to compile. */
export function aForwardedDetailIsNotAny(element: Graphty, log: (value: unknown) => void): void {
    element.addEventListener("style-changed", (e) => {
        // @ts-expect-error -- a style change has no `nodesLoaded`.
        log(e.detail.nodesLoaded);
    });
}
