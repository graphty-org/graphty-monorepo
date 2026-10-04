import type { GraphSession } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
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
    const groups = row.children?.length ?? 0;
    store.set({
        inspected: null,
        notice: {
            message: groups > 0 ? `Deleted ${row.name} and ${String(groups)} groups.` : `Deleted ${row.name}.`,
            action: {
                label: "Undo",
                run: () => {
                    void session.undo();
                },
            },
        },
    });
}
