import type { GraphSession } from "@graphty/graphty-element/session";

import type { Notice, WorkspaceStore } from "../state/store";
import type { PaintRow } from "./rows";

/**
 * Shows or hides a row's paint as one undoable step: every layer the row owns is switched on or
 * off together. Nothing is removed from the layout and nothing is recomputed.
 * @param session - the element's session.
 * @param row - the row.
 * @param hide - true to hide.
 */
export async function setRowHidden(session: GraphSession, row: PaintRow, hide: boolean): Promise<void> {
    await session.transaction(`${hide ? "Hide" : "Show"} ${row.name}`, async (tx) => {
        for (const id of row.layerIds) {
            await tx.styles.update(id, { enabled: !hide });
        }
    });
}

/**
 * Deletes a run row or one of the reader's own layer rows, with an Undo notice. The fixed rows,
 * a group row and a run still running are not deleted.
 * @param session - the element's session.
 * @param store - the chrome store, for the notice.
 * @param row - the row.
 */
export async function deleteRow(session: GraphSession, store: WorkspaceStore, row: PaintRow): Promise<void> {
    if (row.kind === "layer-row") {
        await session.styles.remove(row.id);
    } else if (row.runId !== undefined && row.kind !== "group-row" && row.state !== "running") {
        session.runs.remove(row.runId);
    } else {
        return;
    }
    // Undo takes back this delete only while it is still the step an undo would take back; once
    // the history moves on, the notice goes.
    const next = session.history.nextUndo;
    const step = next?.kind === "undo" ? next.step.id : undefined;
    const isNext = (): boolean => {
        const now = session.history.nextUndo;
        return step !== undefined && now?.kind === "undo" && now.step.id === step;
    };
    const groups = row.children?.length ?? 0;
    const noun = groups === 1 ? "group" : "groups";
    const notice: Notice = {
        message: groups > 0 ? `Deleted ${row.name} and ${String(groups)} ${noun}.` : `Deleted ${row.name}.`,
        action: {
            label: "Undo",
            run: () => {
                if (isNext()) {
                    void session.undo();
                }
            },
        },
    };
    const off = session.on("history:changed", () => {
        if (!isNext()) {
            off();
            store.set((state) => (state.notice === notice ? { notice: null } : {}));
        }
    });
    store.set({ inspected: null, notice });
}
