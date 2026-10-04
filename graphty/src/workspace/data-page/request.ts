/**
 * How a door opens the Data page (tier1-design.md section 2.10): every data door -- the start
 * screen's New from data..., Open project or file... with a data file, a drop, the empty canvas
 * card, Sources "+" -- calls `openDataPage` with what the reader already handed over, and the page
 * reads it once when it opens.
 */

import type { WorkspaceStore } from "../state/store";

/** What a door hands the Data page. */
export interface DataPageRequest {
    /**
     * `"new"` opens the data as a new graph ("Open as a new graph") and Cancel returns to the start
     * screen; `"add"` adds it to the open project ("Add to <project>") and Cancel returns to the
     * panels. The page reads `"new"` when no door said.
     */
    readonly intent: "new" | "add";
    /** Files the reader already chose or dropped: one, or a node table and an edge table. */
    readonly files?: readonly File[];
}

/** One request per store, read once by the page that opens on it. */
const requests = new WeakMap<WorkspaceStore, DataPageRequest>();

/**
 * Opens the Data page. With `intent: "new"` and no project open, a project is opened first,
 * named "Untitled" until the load names it after the file.
 * @param store - the workspace store.
 * @param request - what the door hands over.
 */
export function openDataPage(store: WorkspaceStore, request: DataPageRequest): void {
    requests.set(store, request);
    store.set((state) => ({
        project: state.project ?? { name: "Untitled", id: 1 },
        page: "data-page",
        dialog: null,
    }));
}

/**
 * The request the page opened on, taken so a later visit starts clean.
 * @param store - the workspace store.
 * @returns the request; `{ intent: "new" }` when the page was opened without one.
 */
export function takeDataPageRequest(store: WorkspaceStore): DataPageRequest {
    const request = requests.get(store) ?? { intent: "new" };
    requests.delete(store);
    return request;
}
