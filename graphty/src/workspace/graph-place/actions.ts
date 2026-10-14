import type { GraphSession, LayerId, RowSpec, StyleRow, StyleRowPlace } from "@graphty/graphty-element/session";

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

/** The accessible name of the style tree's "+", where focus goes back after Undo of an added layer. */
export const ADD_ROW_LABEL = "Add a layer or a folder";

/**
 * Puts focus on the style tree's "+".
 */
export function focusAddButton(): void {
    document.querySelector<HTMLElement>(`[aria-label="${ADD_ROW_LABEL}"]`)?.focus();
}

/**
 * Every row name in the tree, at any depth.
 * @param rows - the rows.
 * @returns the names.
 */
function rowNames(rows: readonly StyleRow[]): string[] {
    return rows.flatMap((row) => [row.name, ...rowNames(row.children)]);
}

/**
 * A new layer's name: "Layer N", N the lowest number no row's name uses.
 * @param tree - the element's tree.
 * @returns the name.
 */
export function nextLayerName(tree: readonly StyleRow[]): string {
    const used = new Set(rowNames(tree));
    let n = 1;
    while (used.has(`Layer ${String(n)}`)) {
        n++;
    }
    return `Layer ${String(n)}`;
}

/**
 * Where a new layer lands (Figma inserts above the selection): directly above the row the
 * inspector shows when that row is unpinned, else at the top of the unpinned rows.
 * @param session - the element's session.
 * @param inspected - the store's `inspected`.
 * @returns the place, bottom first.
 */
function newLayerPlace(session: GraphSession, inspected: WorkspaceState["inspected"]): StyleRowPlace {
    const tree = session.styles.tree();
    const anchor =
        (inspected?.kind === "layer-row" || inspected?.kind === "folder-row") && inspected.id !== undefined
            ? findTreeRow(tree, inspected.id)
            : undefined;
    if (anchor !== undefined && anchor.row.pin === "none") {
        const parent = anchor.folders.at(-1);
        const siblings = parent?.children ?? tree;
        return { parent: parent?.id ?? null, index: siblings.findIndex((row) => row.id === anchor.row.id) + 1 };
    }
    return { parent: null, index: tree.length - tree.filter((row) => row.pin === "top").length };
}

/**
 * Add layer: a real layer at once, in one undo step, named "Layer N", on both kinds and every node
 * and edge, writing nothing yet. It opens in the inspector with its name ready to type; Escape or
 * a click away keeps it, and only Delete or Undo removes it. After an Undo takes it away, focus
 * goes back to the tree's "+".
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param afterMenu - how long to wait for a closing menu to hand focus back before renaming.
 * @returns the new row's id.
 */
export async function addLayer(session: GraphSession, store: WorkspaceStore, afterMenu = 0): Promise<string> {
    const name = nextLayerName(session.styles.tree());
    const place = newLayerPlace(session, store.get().inspected);
    const id = await session.transaction(`Add ${name}`, async (tx) => {
        const added = await tx.styles.addRow({ name, target: "both", selector: { match: "everything" } });
        await tx.styles.moveRow(added.id, place);
        return added.id;
    });
    // ponytail: listens until the row goes, however many steps later; one listener per added layer.
    const off = session.on("history:changed", () => {
        if (findTreeRow(session.styles.tree(), id) !== undefined) {
            return;
        }
        off();
        const active = document.activeElement;
        if (active === null || active === document.body || active.closest("[role=tree]") !== null) {
            focusAddButton();
        }
    });
    store.set({ page: "panels", place: "graph", inspected: { kind: "layer-row", id } });
    setTimeout(() => {
        // Focus the row first: the name field hands focus back to what held it when it opened,
        // so naming ends on the new row.
        document
            .querySelector<HTMLElement>(
                `[role="tree"][aria-label="Style layers"] .cm-tree-row[data-id="${CSS.escape(id)}"]`,
            )
            ?.focus();
        store.set({ renamingRow: id });
    }, afterMenu);
    return id;
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
