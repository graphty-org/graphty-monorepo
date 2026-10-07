/**
 * How a door opens the Data page (tier1-design.md section 2.10): every data door -- the start
 * screen's New from data..., Open project or file... with a data file, a drop, the empty canvas
 * card, Sources "+" -- calls `openDataPage` with what the reader already handed over, and the page
 * reads it once when it opens.
 */

import type { GraphSession, LoadedSource } from "@graphty/graphty-element/session";

import { newProjectId, type WorkspaceStore } from "../state/store";
import type { PageChoices } from "./choices";

/** What a door hands the Data page. */
export interface DataPageRequest {
    /**
     * `"new"` opens the data as a new graph ("Open as a new graph") and Cancel returns to the start
     * screen; `"add"` adds it to the open project ("Add to <project>") and Cancel returns to the
     * panels. Inside a project the page never opens a new graph (section 2.10), so `"new"` with a
     * project open is read as `"add"`.
     */
    readonly intent: "new" | "add";
    /** Files the reader already chose or dropped: one, or a node table and an edge table. */
    readonly files?: readonly File[];
    /** The roles and the rest the reader chose last time, when the page reopens a load (Edit source...). */
    readonly choices?: PageChoices;
}

/** What a load read: the reader's files and the choices it loaded with. */
interface LoadInput {
    readonly files: readonly File[];
    readonly choices?: PageChoices;
}

/**
 * The files and choices behind each load this page made, keyed by the element's own entry in
 * `data.sources()`, so Edit source... can open the Data page on them again.
 * ponytail: the element keeps neither a load's input nor the roles it loaded with (a
 * `LoadedSource` names its tables only), so a load from a reopened project, or one made outside
 * the app, opens Edit source... without its files. Move this into the element when a consumer
 * needs it there.
 */
const inputs = new WeakMap<LoadedSource, LoadInput>();

/**
 * Remembers what the load just made read, against the newest entry in `data.sources()`.
 * @param session - the session the load went into.
 * @param input - the files and the choices.
 */
export function rememberLoad(session: GraphSession, input: LoadInput): void {
    const loaded = session.data.sources().at(-1);
    if (loaded !== undefined) {
        inputs.set(loaded, input);
    }
}

/**
 * Opens the Data page on one load's own files and roles (Edit source...); a load the app did not
 * see opens the page empty, to choose its files again.
 * @param store - the workspace store.
 * @param loaded - the load, an entry of `data.sources()`.
 */
export function editSource(store: WorkspaceStore, loaded: LoadedSource | undefined): void {
    const input = loaded === undefined ? undefined : inputs.get(loaded);
    openDataPage(store, { intent: "add", ...input });
}

/** One request per store, read once by the page that opens on it. */
const requests = new WeakMap<WorkspaceStore, DataPageRequest>();

/**
 * Opens the Data page. With `intent: "new"` and no project open, a project is opened first,
 * named "Untitled" until the load names it after the file. With a project open the intent is
 * always `"add"`: the page never renames or closes a project it did not open.
 * @param store - the workspace store.
 * @param request - what the door hands over.
 */
export function openDataPage(store: WorkspaceStore, request: DataPageRequest): void {
    requests.set(store, store.get().project === null ? request : { ...request, intent: "add" });
    store.set((state) => ({
        project: state.project ?? { name: "Untitled", id: newProjectId(state) },
        page: "data-page",
        dialog: null,
    }));
}

/**
 * The request the page opened on, taken so a later visit starts clean.
 * @param store - the workspace store.
 * @returns the request; when the page was opened without one, `"add"` to the open project, or
 *     `"new"` when none is open.
 */
export function takeDataPageRequest(store: WorkspaceStore): DataPageRequest {
    const request = requests.get(store) ?? { intent: store.get().project === null ? "new" : "add" };
    requests.delete(store);
    return request;
}
