/**
 * Recent projects (tier1-design.md section 2.11): the projects this browser opened or saved,
 * newest first, kept in IndexedDB because a File System Access file handle can be stored there
 * and nowhere else. Each entry is what the reader needs to recognize the project (its name, the
 * node count the element reported, when) and, where the browser has file handles, the handle that
 * reopens the file. Nothing about the graph is computed here.
 */

import { useSyncExternalStore } from "react";

/** One remembered project. */
export interface RecentProject {
    /** This list's own id for the entry. */
    readonly id: string;
    /** The project's name. */
    readonly name: string;
    /** The node count the element reported when the project was last saved or opened. */
    readonly nodes: number | null;
    /** When it was last saved or opened, in ms since the epoch. */
    readonly at: number;
    /** The file, where the browser keeps file handles (Chromium); absent where Save downloads. */
    readonly handle?: FileSystemFileHandle;
}

/** How many projects the list keeps. */
const KEEP = 12;

const DB_NAME = "graphty-workspace";
const STORE = "recent-projects";

let entries: readonly RecentProject[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

/**
 * Opens the database, creating its one object store.
 * @returns the database.
 */
function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE, { keyPath: "id" });
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("IndexedDB did not open"));
        };
    });
}

/**
 * Runs one request against the object store and settles with its result.
 * @param mode - read or write.
 * @param act - makes the request.
 * @returns the request's result.
 */
async function withStore<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const request = act(db.transaction(STORE, mode).objectStore(STORE));
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(request.error ?? new Error("IndexedDB request failed"));
            };
        });
    } finally {
        db.close();
    }
}

/**
 * Replaces the list in memory and tells every listener.
 * @param next - the list.
 */
function publish(next: readonly RecentProject[]): void {
    entries = [...next].sort((a, b) => b.at - a.at);
    listeners.forEach((listener) => {
        listener();
    });
}

/**
 * Reads the list from the database once. A browser that refuses IndexedDB (a private window in
 * some browsers) leaves the list empty for this visit.
 * @returns settles once read.
 */
function loadRecent(): Promise<void> {
    loaded ??= withStore<RecentProject[]>("readonly", (store) => store.getAll() as IDBRequest<RecentProject[]>)
        .then(publish)
        .catch(() => undefined);
    return loaded;
}

/**
 * Remembers a project, replacing the entry with the same id, and drops the oldest past twelve.
 * @param entry - the entry.
 * @returns settles once stored.
 */
export async function rememberRecent(entry: RecentProject): Promise<void> {
    await loadRecent();
    const next = [entry, ...entries.filter((held) => held.id !== entry.id)].sort((a, b) => b.at - a.at);
    publish(next.slice(0, KEEP));
    try {
        await withStore("readwrite", (store) => store.put(entry));
        for (const dropped of next.slice(KEEP)) {
            await withStore("readwrite", (store) => store.delete(dropped.id));
        }
    } catch {
        // Kept for this visit only; the list still works.
    }
}

/**
 * Removes a project from the list (Remove from list). The file itself is not touched.
 * @param id - the entry's id.
 * @returns settles once removed.
 */
export async function forgetRecent(id: string): Promise<void> {
    publish(entries.filter((held) => held.id !== id));
    try {
        await withStore("readwrite", (store) => store.delete(id));
    } catch {
        // Gone for this visit; nothing else to do.
    }
}

/**
 * Empties the list, in memory and in the database. For tests and stories.
 * @returns settles once emptied.
 */
export async function clearRecent(): Promise<void> {
    loaded = Promise.resolve();
    publish([]);
    try {
        await withStore("readwrite", (store) => store.clear());
    } catch {
        // Nothing stored.
    }
}

/**
 * The entry that holds this file already, so saving the same file twice keeps one entry.
 * @param handle - the file.
 * @returns its entry, or undefined.
 */
export async function entryForHandle(handle: FileSystemFileHandle): Promise<RecentProject | undefined> {
    await loadRecent();
    for (const entry of entries) {
        if (entry.handle !== undefined && (await entry.handle.isSameEntry(handle))) {
            return entry;
        }
    }
    return undefined;
}

/**
 * Recent projects, newest first, re-rendering on every change. Reads the database on first use.
 * @returns the list.
 */
export function useRecentProjects(): readonly RecentProject[] {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            void loadRecent();
            return () => {
                listeners.delete(listener);
            };
        },
        () => entries,
    );
}
