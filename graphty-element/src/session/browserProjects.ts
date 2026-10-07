/**
 * @file Projects kept in the browser: whole project files saved to IndexedDB and opened again.
 *
 * Nothing here touches IndexedDB or `navigator` until a method is called, so the module is safe to
 * import in Node. Every record is the exact project file `project.save` wrote, held as a `Blob`
 * so listing never reads a project's contents, plus the facts a list of projects shows.
 */

import { PROJECT_FILE } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import { projectFileName } from "./projectFile";
import type { GraphSession } from "./types";

/** The IndexedDB database the projects are kept in. */
const DATABASE = "graphty-projects";

/** The object store inside {@link DATABASE}, keyed by `id`. */
const STORE = "projects";

/** One project kept in the browser, as `browserProjects.list()` returns it. Frozen. */
export interface StoredProject {
    /** The project's id in browser storage: pass it to `get`, `remove`, or `save` to replace it. */
    readonly id: string;
    /** The project's name when it was saved, or null for an unnamed project. */
    readonly name: string | null;
    /** When it was saved, in milliseconds since the epoch (`new Date(savedAt)`). */
    readonly savedAt: number;
    /** Nodes in the graph when it was saved. */
    readonly nodes: number;
    /** Edges in the graph when it was saved. */
    readonly edges: number;
}

/** How `browserProjects.save` stores a project. */
export interface BrowserProjectSaveOptions {
    /** The id of a stored project to replace. Default: a new id, so a new entry. */
    readonly id?: string;
}

/** The record IndexedDB holds: the facts plus the project file. */
interface ProjectRecord extends StoredProject {
    readonly file: Blob;
}

/** Projects kept in this browser's own storage, for a host with no file system to save to. */
export interface BrowserProjects {
    /**
     * The stored projects, newest first.
     * @returns Their ids, names, save times and sizes; never their contents.
     * @throws A `GraphtyError` (as a rejection) with `E_UNSUPPORTED` when the browser has no
     *     IndexedDB or refuses to open it.
     */
    list(): Promise<StoredProject[]>;
    /**
     * Save the whole session into browser storage, as `project.save` writes it. `project.dirty`
     * clears only once the write has committed; a failed write leaves the project dirty. The first
     * save asks the browser to keep its storage (`navigator.storage.persist()`).
     * @param session - The session to save, such as `element.session`.
     * @param options - The id of a stored project to replace.
     * @returns What was stored.
     * @throws A `GraphtyError` (as a rejection): `E_UNSUPPORTED` with no usable IndexedDB,
     *     `E_TOO_LARGE` when the browser's storage quota is used up, and what `project.save`
     *     throws.
     */
    save(session: GraphSession, options?: BrowserProjectSaveOptions): Promise<StoredProject>;
    /**
     * A stored project as a file, named as a downloaded project is, ready for `project.open`.
     * @param id - The stored project's id.
     * @returns The file, or undefined when no project has that id.
     * @throws A `GraphtyError` (as a rejection) with `E_UNSUPPORTED` with no usable IndexedDB.
     */
    get(id: string): Promise<File | undefined>;
    /**
     * Delete a stored project. Deleting an id that is not stored does nothing.
     * @param id - The stored project's id.
     * @returns Settles once the delete has committed.
     * @throws A `GraphtyError` (as a rejection) with `E_UNSUPPORTED` with no usable IndexedDB.
     */
    remove(id: string): Promise<void>;
    /**
     * Whether the browser has promised to keep this site's storage rather than clear it when it
     * needs room or after a while without a visit. Never rejects.
     * @returns `navigator.storage.persisted()`, or false when the browser cannot say.
     */
    persisted(): Promise<boolean>;
}

/**
 * The failure a storage error stands for.
 * @param error - What IndexedDB threw or reported.
 * @returns `E_TOO_LARGE` for a used-up quota, `E_UNSUPPORTED` for anything else.
 */
function storageError(error: unknown): GraphtyError {
    if (error instanceof GraphtyError) {
        return error;
    }

    const name = (error as { name?: unknown } | null)?.name;
    if (name === "QuotaExceededError") {
        return new GraphtyError({
            code: "E_TOO_LARGE",
            message: "The browser's storage for this site is full.",
            source: "data",
            details: { reason: "quota" },
            cause: error,
        });
    }

    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "The browser's storage could not be used.",
        source: "data",
        details: { reason: "storage-failed", name: typeof name === "string" ? name : null },
        cause: error,
    });
}

/**
 * Open the database, creating its store the first time.
 * @returns The open database.
 */
function openDatabase(): Promise<IDBDatabase> {
    const factory = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (factory === undefined) {
        return Promise.reject(
            new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This host has no IndexedDB to keep projects in.",
                source: "data",
                details: { reason: "no-indexeddb" },
            }),
        );
    }

    return new Promise((resolve, reject) => {
        try {
            const request = factory.open(DATABASE, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(storageError(request.error));
            };
        } catch (error) {
            reject(storageError(error));
        }
    });
}

/**
 * Run one request against the store, settling once its transaction has committed.
 * @param mode - The transaction's mode.
 * @param use - Makes the request.
 * @returns The request's result.
 */
async function inStore<T>(mode: IDBTransactionMode, use: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDatabase();
    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            let result: T;
            transaction.oncomplete = () => {
                resolve(result);
            };
            transaction.onabort = () => {
                reject(storageError(transaction.error));
            };
            try {
                const request = use(transaction.objectStore(STORE));
                request.onsuccess = () => {
                    ({ result } = request);
                };
            } catch (error) {
                reject(storageError(error));
                transaction.abort();
            }
        });
    } finally {
        db.close();
    }
}

/** Whether `navigator.storage.persist()` has been asked this page load. */
let askedToPersist = false;

/** Ask the browser, once, to keep this site's storage. Its answer is read with `persisted()`. */
function askToPersist(): void {
    if (askedToPersist) {
        return;
    }

    askedToPersist = true;
    const storage = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage;
    storage?.persist?.().catch(() => undefined);
}

/**
 * The facts of a record, without its file.
 * @param record - The stored record.
 * @returns The frozen facts.
 */
function factsOf(record: ProjectRecord): StoredProject {
    const { id, name, savedAt, nodes, edges } = record;
    return Object.freeze({ id, name, savedAt, nodes, edges });
}

/**
 * Projects kept in this browser's IndexedDB (database `graphty-projects`), for a host that has
 * no file system to save to, such as a tablet.
 * @example
 * ```typescript
 * const stored = await browserProjects.save(element.session);
 * const file = await browserProjects.get(stored.id);
 * if (file) await element.session.project.open(file, { discard: true });
 * ```
 */
export const browserProjects: BrowserProjects = Object.freeze({
    async list() {
        const records = await inStore("readonly", (store) => store.getAll() as IDBRequest<ProjectRecord[]>);
        return records.sort((a, b) => b.savedAt - a.savedAt).map(factsOf);
    },
    async save(session: GraphSession, options: BrowserProjectSaveOptions = {}) {
        // Opened first, so a host with no IndexedDB is refused before anything is written.
        (await openDatabase()).close();
        askToPersist();
        const { nodes, edges } = session.status.counts;
        const saved = await session.project.save({ markSaved: false });
        const record: ProjectRecord = {
            id: options.id ?? crypto.randomUUID(),
            name: session.project.name,
            savedAt: Date.now(),
            nodes,
            edges,
            file: new Blob([saved.text], { type: PROJECT_FILE.mediaType }),
        };
        await inStore("readwrite", (store) => store.put(record));
        session.project.markSaved(saved);
        return factsOf(record);
    },
    async get(id: string) {
        const record = await inStore("readonly", (store) => store.get(id) as IDBRequest<ProjectRecord | undefined>);
        return record === undefined
            ? undefined
            : new File([record.file], projectFileName(record.name), { type: PROJECT_FILE.mediaType });
    },
    async remove(id: string) {
        await inStore("readwrite", (store) => store.delete(id));
    },
    async persisted() {
        const storage = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage;
        try {
            return (await storage?.persisted?.()) === true;
        } catch {
            return false;
        }
    },
});
