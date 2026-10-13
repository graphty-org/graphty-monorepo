import type { GraphSession, LayerId, RowSpec, StyleRow } from "@graphty/graphty-element/session";

import type { Notice, WorkspaceState, WorkspaceStore } from "../state/store";
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

/** The accessible name of the style tree's "+", where focus goes back when a draft is discarded. */
export const ADD_ROW_LABEL = "Add a layer or a folder";

/**
 * The row a new layer lands directly above (Figma inserts above the selection): the row the
 * inspector showed when the draft opened, unless it is pinned, since an unpinned layer cannot
 * sit inside a pin band. Undefined puts it at the top of the unpinned rows.
 * @param session - the element's session.
 * @param inspected - the store's `inspected` while the draft is open.
 * @returns the row's id, or undefined.
 */
export function draftAnchor(session: GraphSession, inspected: WorkspaceState["inspected"]): string | undefined {
    const back = inspected?.kind === "draft-row" ? inspected.back : undefined;
    if ((back?.kind !== "layer-row" && back?.kind !== "folder-row") || back.id === undefined) {
        return undefined;
    }
    const row = findTreeRow(session.styles.tree(), back.id)?.row;
    return row?.pin === "none" ? row.id : undefined;
}

/**
 * Opens a new layer's draft, remembering what the inspector showed so discarding it goes back.
 * Its kind is the selected layer row's (it lands just above that row), else what is selected on
 * the canvas (nodes, edges or both), else nodes.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function openDraft(session: GraphSession, store: WorkspaceStore): void {
    const now = store.get().inspected;
    const back = now?.kind === "draft-row" ? (now.back ?? null) : now;
    const { nodes, edges } = session.selection;
    let paints: "node" | "edge" | "both" = "node";
    const rowTarget =
        back?.kind === "layer-row" && back.id !== undefined ? session.styles.parts(back.id)?.target : undefined;
    if (rowTarget !== undefined) {
        paints = rowTarget;
    } else if (nodes.length > 0) {
        paints = edges.length > 0 ? "both" : "node";
    } else if (edges.length > 0) {
        paints = "edge";
    }
    store.set({ inspected: { kind: "draft-row", id: paints, back } });
}

/**
 * Discards the draft: the inspector shows again what it showed before the draft opened, the
 * status line says so, and focus goes back to the tree's "+".
 * @param store - the chrome store.
 */
export function discardDraft(store: WorkspaceStore): void {
    store.set({ inspected: store.get().inspected?.back ?? null, announcement: "New layer discarded" });
    requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[aria-label="${ADD_ROW_LABEL}"]`)?.focus();
    });
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

/**
 * The layers a row holds: both parts of a two-kind layer row, every layer in a folder.
 * @param session - the element's session.
 * @param row - the row.
 * @returns the layer ids.
 */
function layersOf(session: GraphSession, row: StyleRow): LayerId[] {
    if (row.kind === "folder") {
        return row.children.flatMap((child) => layersOf(session, child));
    }
    const parts = session.styles.parts(row.id);
    return [parts?.node, parts?.edge].filter((id): id is LayerId => id !== undefined);
}

/**
 * Select what it paints (Figma's Select matching layers): selects exactly the nodes and edges the
 * row's layers match, through graphty-element's `{ layer }` selection target.
 * @param session - the element's session.
 * @param row - the row.
 */
export async function selectWhatItPaints(session: GraphSession, row: StyleRow): Promise<void> {
    const layers = layersOf(session, row);
    if (layers.length === 0) {
        session.selection.clear();
        return;
    }
    for (const [at, layer] of layers.entries()) {
        await session.selection.apply({ layer }, at === 0 ? "replace" : "add");
    }
}

/**
 * Duplicates a layer row just above itself, named "<name> copy": one undo step.
 * TEMPORARY: graphty-element has no `styles.duplicateRow`, so this rebuilds the row from its
 * parts' specs; owed in the element as an additive verb (design/ui/studio/owner-decisions.md),
 * after which this composes nothing.
 * @param session - the element's session.
 * @param row - the layer row.
 * @returns the new row's id.
 */
export async function duplicateRow(session: GraphSession, row: StyleRow): Promise<string | undefined> {
    const parts = session.styles.parts(row.id);
    const node = parts?.node === undefined ? undefined : session.styles.get(parts.node);
    const edge = parts?.edge === undefined ? undefined : session.styles.get(parts.edge);
    const first = node ?? edge;
    const found = findTreeRow(session.styles.tree(), row.id);
    if (parts === undefined || first === undefined || found === undefined) {
        return undefined;
    }
    const parent = found.folders.at(-1);
    const siblings = parent?.children ?? session.styles.tree();
    const index = siblings.findIndex((sibling) => sibling.id === row.id) + 1;
    const spec: RowSpec = {
        name: `${row.name} copy`,
        target: parts.target,
        kind: first.kind,
        selector: first.selector,
        enabled: first.enabled,
        set: { ...node?.set, ...edge?.set },
        encode: { ...node?.encode, ...edge?.encode },
    };
    return session.transaction(`Duplicate ${row.name}`, async (tx) => {
        const added = await tx.styles.addRow(spec);
        await tx.styles.moveRow(added.id, { parent: parent?.id ?? null, index });
        return added.id;
    });
}
