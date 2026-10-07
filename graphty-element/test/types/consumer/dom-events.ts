/**
 * @file The events guide's listeners, compiled against the published declarations with no cast.
 *
 * Every prefixed `graphty-*` event the element dispatches must reach a listener as a typed
 * `CustomEvent`, so `e.detail` compiles, and the detail types named after their events must be
 * importable. Nothing here runs; `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type {
    GraphtyCapabilitiesChangeDetail,
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
