import type { GraphSession, LayerId, RowSpec, StyleRow, StyleRowPlace } from "@graphty/graphty-element/session";

import type { Notice, WorkspaceState, WorkspaceStore } from "../state/store";
import { findTreeRow, paintingParts } from "./rows";

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
function focusAddButton(): void {
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
function nextLayerName(tree: readonly StyleRow[]): string {
    const used = new Set(rowNames(tree));
    let n = 1;
    while (used.has(`Layer ${String(n)}`)) {
        n++;
    }
    return `Layer ${String(n)}`;
}

/**
 * Where a new layer lands (Figma inserts above the selection): inside the folder the inspector
 * shows, on top; directly above the layer row it shows when that row is unpinned; else at the
 * top of the unpinned rows.
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
    if (anchor?.row.kind === "folder") {
        // Into the folder the inspector shows, on top of its unpinned rows.
        const { children } = anchor.row;
        return { parent: anchor.row.id, index: children.length - children.filter((row) => row.pin === "top").length };
    }
    if (anchor?.row.pin === "none") {
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
    const id = await session.transaction(`adding ${name}`, async (tx) => {
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
    // A run's layer goes; the run and its results stay, and Analyze offers to add the layer back.
    const fromRun = layersOf(session, row).some((id) => session.styles.get(id)?.source.by === "run");
    await session.styles.deleteRow(row.id);
    const next = session.history.nextUndo;
    const step = next?.kind === "undo" ? next.step.id : undefined;
    const isNext = (): boolean => {
        const now = session.history.nextUndo;
        return step !== undefined && now?.kind === "undo" && now.step.id === step;
    };
    const kindWord = row.kind === "folder" ? "" : " layer";
    const notice: Notice = {
        message: fromRun ? `Deleted ${row.name}${kindWord}. Its results are kept.` : `Deleted ${row.name}.`,
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
    await session.transaction(`ungrouping ${folder.name}`, async (tx) => {
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
 * The layers a row paints with: the halves of a layer row that write a property, those of every
 * layer in a folder. A half that is on but writes nothing paints nothing, so it is left out.
 * @param session - the element's session.
 * @param row - the row.
 * @returns the layer ids.
 */
function paintingLayersOf(session: GraphSession, row: StyleRow): LayerId[] {
    if (row.kind === "folder") {
        return row.children.flatMap((child) => paintingLayersOf(session, child));
    }
    const { node, edge } = paintingParts(session, row.id);
    return [node, edge].filter((id): id is LayerId => id !== undefined);
}

/**
 * Select what it paints (Figma's Select matching layers): selects exactly the nodes and edges the
 * row's painting layers match, through graphty-element's `{ layer }` selection target. A row that
 * paints nothing leaves the selection as it was.
 * @param session - the element's session.
 * @param row - the row.
 * @returns how many nodes and edges it selected; both 0 when it selected nothing.
 */
export async function selectWhatItPaints(
    session: GraphSession,
    row: StyleRow,
): Promise<{ readonly nodes: number; readonly edges: number }> {
    const layers = paintingLayersOf(session, row);
    if (layers.every((layer) => session.styles.counts(layer).matched === 0)) {
        return { nodes: 0, edges: 0 };
    }
    for (const [at, layer] of layers.entries()) {
        await session.selection.apply({ layer }, at === 0 ? "replace" : "add");
    }
    return { nodes: session.selection.nodes.length, edges: session.selection.edges.length };
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
    return session.transaction(`duplicating ${row.name}`, async (tx) => {
        const added = await tx.styles.addRow(spec);
        await tx.styles.moveRow(added.id, { parent: parent?.id ?? null, index });
        return added.id;
    });
}

/** What a transaction's body is handed: the session's verbs, recorded as one step. */
type Scope = Parameters<Parameters<GraphSession["transaction"]>[1]>[0];

/**
 * Every row's id, the top of the tree first, as the tree draws them.
 * @param rows - the rows, bottom first.
 * @returns the ids.
 */
function topFirst(rows: readonly StyleRow[]): string[] {
    return [...rows].reverse().flatMap((row) => [row.id, ...topFirst(row.children)]);
}

/**
 * Moves rows into a folder, on top of its unpinned rows, or out of the folders holding them, each
 * to just above its folder; their order stays as the tree drew it. A row is never moved into
 * itself or a folder inside it.
 * @param tx - the transaction's verbs.
 * @param ids - the rows.
 * @param to - the folder, or null for out of their folders.
 */
async function moveRowsIn(tx: Scope, ids: readonly string[], to: string | null): Promise<void> {
    const order = topFirst(tx.styles.tree());
    const sorted = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    // Into a folder, bottom first, each to the top; out of one, top first, each just above it:
    // either way the last one moved lands below the ones before it.
    for (const id of to === null ? sorted : [...sorted].reverse()) {
        const tree = tx.styles.tree();
        const moving = findTreeRow(tree, id);
        // A row inside a folder that moves too goes with its folder.
        if (moving === undefined || moving.folders.some((row) => ids.includes(row.id))) {
            continue;
        }
        if (to === null) {
            const holder = moving.folders.at(-1);
            const outer = holder === undefined ? undefined : findTreeRow(tree, holder.id);
            if (holder === undefined || outer === undefined) {
                continue;
            }
            const parent = outer.folders.at(-1);
            const siblings = parent?.children ?? tree;
            await tx.styles.moveRow(id, {
                parent: parent?.id ?? null,
                index: siblings.findIndex((row) => row.id === holder.id) + 1,
            });
            continue;
        }
        const folder = findTreeRow(tree, to);
        if (folder === undefined || id === to || folder.folders.some((row) => row.id === id)) {
            continue;
        }
        const others = folder.row.children.filter((row) => row.id !== id);
        await tx.styles.moveRow(id, {
            parent: to,
            index: others.length - others.filter((row) => row.pin === "top").length,
        });
    }
}

/**
 * Moves several rows into a folder, or out of their folders (null), in one undo step.
 * @param session - the element's session.
 * @param ids - the rows.
 * @param to - the folder, or null.
 * @returns when they are moved.
 */
export async function moveRows(session: GraphSession, ids: readonly string[], to: string | null): Promise<void> {
    const words =
        ids.length === 1
            ? (findTreeRow(session.styles.tree(), ids[0])?.row.name ?? "a row")
            : `${String(ids.length)} rows`;
    await session.transaction(`moving ${words}`, (tx) => moveRowsIn(tx, ids, to));
}

/**
 * A new folder holding rows (Figma's group selection): it takes the place of the topmost of them
 * and they move into it, their order kept, in one undo step.
 * @param session - the element's session.
 * @param name - the folder's name.
 * @param ids - the rows; none makes an empty folder at the default place.
 * @returns the folder's id.
 */
export async function addFolderOf(session: GraphSession, name: string, ids: readonly string[]): Promise<string> {
    return session.transaction(`adding ${name}`, async (tx) => {
        const tree = tx.styles.tree();
        const order = topFirst(tree);
        const top = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
        const found = top === undefined ? undefined : findTreeRow(tree, top);
        const parent = found?.folders.at(-1);
        const place =
            found?.row.pin !== "none"
                ? undefined
                : {
                      parent: parent?.id ?? null,
                      index: (parent?.children ?? tree).findIndex((row) => row.id === found.row.id) + 1,
                  };
        const folder = await tx.styles.addFolder(name, place);
        await moveRowsIn(tx, ids, folder.id);
        return folder.id;
    });
}
