/**
 * How a door opens the Data page (tier1-design.md section 2.10): every data door -- the start
 * screen's New from data..., Open project or file... with a data file, a drop, the empty canvas
 * card, Sources "+" -- calls `openDataPage` with what the reader already handed over, and the page
 * reads it once when it opens.
 */

import type { GraphSession, LoadChoices, LoadedSource, SourceKey } from "@graphty/graphty-element/session";

import { newProjectId, type WorkspaceStore } from "../state/store";

/** What a door hands the Data page. */
export interface DataPageRequest {
    /**
     * `"new"` opens the data as a new graph ("Open as a new graph") and Cancel returns to the start
     * screen; `"add"` adds it to the open project ("Add to <project>") and Cancel returns to the
     * panels. Inside a project the page never opens a new graph (section 2.10), so `"new"` with a
     * project open is read as `"add"`. `"replace"` loads the file in place of one load, `replaces`
     * ("Replace: <file>", tier2-design.md section 7): runs, styles, notes and every other load stay.
     */
    readonly intent: "new" | "add" | "replace";
    /** Files the reader already chose or dropped: one, or a node table and an edge table. */
    readonly files?: readonly File[];
    /** The choices the load being replaced was read with (`LoadedSource.choices`). */
    readonly choices?: LoadChoices;
    /** With `intent: "replace"`, the load the page's Load replaces. */
    readonly replaces?: SourceKey;
}

/**
 * The files graphty-element read a load from, when it read them itself this session.
 * @param session - the session.
 * @param key - the load.
 * @returns the files, or none: a load from a reopened project, a URL or text has none to give.
 */
function filesOf(session: GraphSession, key: SourceKey): File[] {
    const config = session.data.sourceInput(key)?.config ?? {};
    return [config.file, config.nodeFile, config.edgeFile].filter((each): each is File => each instanceof File);
}

/**
 * The request that replaces a load, on its own choices.
 * @param loaded - the load.
 * @param files - the files to read in its place.
 * @returns the request.
 */
function replaceRequest(loaded: LoadedSource, files: readonly File[]): DataPageRequest {
    return {
        intent: "replace",
        replaces: loaded.key,
        ...(files.length > 0 ? { files } : {}),
        ...(loaded.choices === undefined ? {} : { choices: loaded.choices }),
    };
}

/**
 * Opens the Data page to replace one load on its own files and roles (Edit source...), so Load
 * swaps that load rather than adding a second copy. A load whose files graphty-element does not
 * hold (one from a reopened project) opens the page empty, to choose its files again, and the
 * roles it was read with are laid onto them.
 * @param store - the workspace store.
 * @param session - the session.
 * @param loaded - the load.
 */
export function editSource(store: WorkspaceStore, session: GraphSession, loaded: LoadedSource): void {
    openDataPage(store, replaceRequest(loaded, filesOf(session, loaded.key)));
}

/**
 * Opens the Data page to replace one load with a file the reader already chose, read with the
 * roles that load was read with.
 * @param store - the workspace store.
 * @param loaded - the load being replaced.
 * @param file - the new file.
 */
export function replaceSource(store: WorkspaceStore, loaded: LoadedSource, file: File): void {
    openDataPage(store, replaceRequest(loaded, [file]));
}

/** One request per store, read once by the page that opens on it. */
const requests = new WeakMap<WorkspaceStore, DataPageRequest>();

/** The open Data page's way to take a request that arrives while it is open. */
const openPages = new WeakMap<WorkspaceStore, (request: DataPageRequest) => void>();

/**
 * Hands the open Data page every request made while it is open.
 * @param store - the workspace store.
 * @param take - what the page does with the request.
 * @returns a function that stops it, for when the page closes.
 */
export function whileDataPageOpen(store: WorkspaceStore, take: (request: DataPageRequest) => void): () => void {
    openPages.set(store, take);
    return () => {
        if (openPages.get(store) === take) {
            openPages.delete(store);
        }
    };
}

/**
 * Opens the Data page. With `intent: "new"` and no project open, a project is opened first,
 * named "Untitled" until the load names it after the file. With a project open the intent is
 * always `"add"`: the page never renames or closes a project it did not open.
 * @param store - the workspace store.
 * @param request - what the door hands over.
 */
export function openDataPage(store: WorkspaceStore, request: DataPageRequest): void {
    // Already open (Open project or file... from the page itself): the page takes the files as
    // a drop, rather than the request waiting for a page that never opens again.
    // A replace from the open page (its "Replace <source>") reopens the page on the request.
    const open = openPages.get(store);
    if (open !== undefined) {
        if (request.intent === "replace") {
            requests.set(store, request);
        }
        open(request);
        return;
    }
    const intent = store.get().project === null || request.intent === "replace" ? request.intent : "add";
    requests.set(store, { ...request, intent });
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
