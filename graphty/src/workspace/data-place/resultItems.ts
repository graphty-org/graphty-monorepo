/**
 * A result's Run again, Combine into a score and Copy items, shared by its row's "..." in the Data place and the
 * inspector's header "..." for it.
 */

import type { GraphSession, Run } from "@graphty/graphty-element/session";

import type { SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { methodsWords } from "./words";

/**
 * Puts a result's text on the clipboard and says so in the notice.
 * @param store - the workspace store, whose notice says what happened.
 * @param what - what was copied, as the notice names it.
 * @param text - the text, or a reason it cannot be copied.
 */
function copyText(store: WorkspaceStore, what: string, text: string): void {
    navigator.clipboard.writeText(text).then(
        () => {
            store.set({ notice: { message: `Copied ${what}` } });
        },
        () => {
            store.set({ notice: { message: `Could not copy ${what}` } });
        },
    );
}

/**
 * A result's own numeric column, as graphty-element lists it for a table: its primary field when
 * that holds a number per node (or else per edge).
 * @param session - the element's session.
 * @param run - the result.
 * @returns the column's kind and path, or null when the result has none.
 */
function numberColumnOf(session: GraphSession, run: Run): { kind: "node" | "edge"; path: string } | null {
    for (const kind of ["node", "edge"] as const) {
        const column = session.data.resultColumns(kind).find((each) => each.run === run.id);
        if (column !== undefined && (column.type === "number" || column.type === "integer")) {
            return { kind, path: column.path };
        }
    }
    return null;
}

/**
 * A result's Run again and Copy items: Run again with changes... opens Analyze on its algorithm
 * with its settings, so running it adds a new result; each Copy item puts one form of the result
 * on the clipboard, every form written by graphty-element or read from its record. The result
 * row's "..." and the inspector's header "..." for a result both hold them.
 * @param session - the element's session.
 * @param store - the workspace store.
 * @param run - the result.
 * @returns the items.
 */
export function resultItems(session: GraphSession, store: WorkspaceStore, run: Run): SelectionMenuItem[] {
    const { result } = run;
    const noResult = result === undefined ? "Not finished" : null;
    const command = run.journalId === null ? undefined : session.journal.get(run.journalId)?.command;
    const metric = numberColumnOf(session, run);
    return [
        {
            id: "run-again",
            label: "Run again with changes...",
            icon: "settings",
            group: "edit",
            onRun: () => {
                store.set({ dialog: "analyze", analyzeOn: run.algorithm, analyzeValues: run.params });
            },
        },
        {
            id: "combine-score",
            label: "Combine into a score...",
            icon: "measure",
            group: "edit",
            reason: metric === null ? "No number per node or edge" : null,
            onRun: () => {
                if (metric !== null) {
                    store.set({
                        dialog: "score",
                        scoreOn: { kind: metric.kind, terms: [{ path: metric.path, weight: 1 }] },
                    });
                }
            },
        },
        {
            id: "copy-json",
            label: "Copy as JSON",
            icon: "copy",
            group: "view",
            onRun: () => {
                copyText(store, "as JSON", JSON.stringify(run.record, null, 2));
            },
        },
        {
            id: "copy-command",
            label: "Copy as command",
            icon: "copy",
            group: "view",
            reason: command === undefined ? "Not finished" : null,
            onRun: () => {
                copyText(store, "as command", JSON.stringify(command, null, 2));
            },
        },
        {
            id: "copy-methods",
            label: "Copy methods text",
            icon: "copy",
            group: "view",
            onRun: () => {
                copyText(store, "methods text", methodsWords(session, run));
            },
        },
        {
            id: "copy-tsv",
            label: "Copy as TSV",
            icon: "copy",
            group: "view",
            reason: noResult,
            onRun: () => {
                copyText(store, "as TSV", result?.toTsv() ?? "");
            },
        },
        {
            id: "copy-members",
            label: "Copy member ids",
            icon: "copy",
            group: "view",
            reason: noResult,
            onRun: () => {
                copyText(store, "member ids", (result?.memberIds() ?? []).map(String).join("\n"));
            },
        },
    ];
}
