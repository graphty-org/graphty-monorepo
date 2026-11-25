/**
 * @file The browser file handles a version 2 save references file sources by (spec 4.1.2 rule 6,
 * 8.3): a handle cannot be written into a file, so graphty-element keeps it in the browser's
 * IndexedDB, keyed by source id and copy id, and the saved source has no `path`. An open reads it
 * back and checks its permission without prompting.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * A File System Access file handle, as much of it as graphty-element reads: its name, its file,
 * and its read permission where the browser has the permission calls.
 */
export interface ProjectFileHandle {
    /** The file's name. */
    readonly name: string;
    /** The file as it is now. */
    getFile(): Promise<Blob>;
    /** The read permission now, never prompting. Absent: granted. */
    queryPermission?(descriptor: { mode: "read" }): Promise<"granted" | "denied" | "prompt">;
    /** Ask for the read permission; called only inside a refresh, the reader's own click. */
    requestPermission?(descriptor: { mode: "read" }): Promise<"granted" | "denied" | "prompt">;
}

const DATABASE = "graphty-file-handles";
const STORE = "handles";

/** Every handle kept or read in this page, by key: what IndexedDB holds, without the round trip. */
const KEPT = new Map<string, ProjectFileHandle>();

/** The handle each source was last kept or read with, whatever its copy: a refresh changes the copy, not the file. */
const LATEST = new Map<string, ProjectFileHandle>();

/** The writes to IndexedDB not yet settled. */
const PENDING = new Set<Promise<void>>();

const keyOf = (source: string, copy: string): string => `${source} ${copy}`;

/**
 * Run one request against the store, or settle with undefined where the browser has no IndexedDB
 * (Node, a private window that refuses it).
 * @param mode - The transaction's mode.
 * @param use - Makes the request.
 * @returns The request's result.
 */
async function withStore<T>(
    mode: IDBTransactionMode,
    use: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
    const factory = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (factory === undefined) {
        return undefined;
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = factory.open(DATABASE, 1);
        open.onupgradeneeded = (): void => {
            open.result.createObjectStore(STORE);
        };
        open.onsuccess = (): void => {
            resolve(open.result);
        };
        open.onerror = (): void => {
            reject(open.error ?? new Error(DATABASE));
        };
    });
    try {
        return await new Promise<T>((resolve, reject) => {
            const request = use(db.transaction(STORE, mode).objectStore(STORE));
            request.onsuccess = (): void => {
                resolve(request.result);
            };
            request.onerror = (): void => {
                reject(request.error ?? new Error(STORE));
            };
        });
    } finally {
        db.close();
    }
}

/**
 * Keep a source's handle for its copy, in this page at once and in IndexedDB once `flushHandles`
 * settles.
 * @param source - The source id.
 * @param copy - Its copy id.
 * @param handle - The handle.
 */
export function keepHandle(source: string, copy: string, handle: ProjectFileHandle): void {
    const key = keyOf(source, copy);
    if (KEPT.get(key) === handle) {
        return;
    }

    KEPT.set(key, handle);
    LATEST.set(source, handle);
    // A browser that refuses the write (a private window) keeps the handle for this page only: a
    // later visit finds none and the open lists the source as needing a file.
    const write = withStore("readwrite", (store) => store.put(handle, key)).then(
        () => undefined,
        () => undefined,
    );
    PENDING.add(write);
    void write.finally(() => PENDING.delete(write));
}

/**
 * A source's handle, if this page keeps one (given to a save, or read by an open): the one for its
 * copy, else the one it was last kept or read with.
 * @param source - The source id.
 * @param copy - Its copy id.
 * @returns The handle, or undefined.
 */
export function keptHandle(source: string, copy: string): ProjectFileHandle | undefined {
    return KEPT.get(keyOf(source, copy)) ?? LATEST.get(source);
}

/**
 * Wait until every handle kept is in IndexedDB, or refused.
 * @returns Settles when they are.
 */
export async function flushHandles(): Promise<void> {
    await Promise.all([...PENDING]);
}

/**
 * A source's handle for its copy: kept in this page, else read from IndexedDB.
 * @param source - The source id.
 * @param copy - Its copy id.
 * @returns The handle, or undefined when none is kept (saved in another browser).
 */
export async function handleOf(source: string, copy: string): Promise<ProjectFileHandle | undefined> {
    const key = keyOf(source, copy);
    const kept = KEPT.get(key);
    if (kept !== undefined) {
        LATEST.set(source, kept);
        return kept;
    }

    try {
        const read = (await withStore("readonly", (store) => store.get(key))) as ProjectFileHandle | undefined;
        if (read !== undefined) {
            KEPT.set(key, read);
            LATEST.set(source, read);
        }

        return read;
    } catch {
        return undefined;
    }
}

/**
 * A handle's bytes, or why there are none: an open only checks the permission, so a handle that
 * needs it is `needs-permission`; a refresh (`ask`) asks during the reader's click.
 * @param handle - The handle.
 * @param ask - Whether to ask for the permission.
 * @returns The file, or `needs-permission`.
 */
export async function fileOf(handle: ProjectFileHandle, ask: boolean): Promise<Blob | "needs-permission"> {
    const descriptor = { mode: "read" } as const;
    let permission = (await handle.queryPermission?.(descriptor)) ?? "granted";
    if (permission === "prompt" && ask) {
        permission = (await handle.requestPermission?.(descriptor)) ?? "denied";
    }

    return permission === "granted" ? handle.getFile() : "needs-permission";
}
