import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";

import type { Notice, WorkspaceStore } from "../state/store";
import { findTreeRow } from "./rows";

/**
 * Says why the element refused a tree verb, in a notice, rather than letting the promise reject
 * unseen.
 * @param store - the chrome store.
 * @param what - the verb in words, such as "move Key people".
 * @param work - the verb's run.
 */
export async function orNotice(store: WorkspaceStore, what: string, work: PromiseLike<unknown>): Promise<void> {
    try {
        await work;
    } catch (error) {
        const why = error instanceof Error ? ` ${error.message}` : "";
        store.set({ notice: { message: `Could not ${what}.${why}`, error: true } });
    }
}

/**
 * Deletes a row of the style tree (a layer, or a folder with everything in it), with an Undo
 * notice that lasts while the delete is still the step an undo would take back.
 * @param session - the element's session.
 * @param store - the chrome store, for the notice.
 * @param row - the row.
 */
export async function deleteRow(session: GraphSession, store: WorkspaceStore, row: StyleRow): Promise<void> {
    await session.styles.deleteRow(row.id);
    const next = session.history.nextUndo;
    const step = next?.kind === "undo" ? next.step.id : undefined;
    const isNext = (): boolean => {
        const now = session.history.nextUndo;
        return step !== undefined && now?.kind === "undo" && now.step.id === step;
    };
    const notice: Notice = {
        message: `Deleted ${row.name}.`,
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

/**
 * Takes a folder's rows out to where the folder sits, in their order, and deletes the empty
 * folder: one undo step.
 * @param session - the element's session.
 * @param folder - the folder.
 */
export async function ungroup(session: GraphSession, folder: StyleRow): Promise<void> {
    const found = findTreeRow(session.styles.tree(), folder.id);
    if (found === undefined) {
        return;
    }
    const parent = found.folders.at(-1);
    const siblings = parent?.children ?? session.styles.tree();
    const at = siblings.findIndex((row) => row.id === folder.id);
    await session.transaction(`Ungroup ${folder.name}`, async (tx) => {
        // Bottom first: each row goes in just below the folder, which moves up one each time.
        for (const [offset, child] of folder.children.entries()) {
            await tx.styles.moveRow(child.id, { parent: parent?.id ?? null, index: at + offset });
        }
        await tx.styles.deleteRow(folder.id);
    });
}
