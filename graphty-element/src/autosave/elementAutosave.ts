/**
 * Autosave on the page: what `<graphty-element>` adds around the writer (`Autosaver`) once it is in
 * a document. The key, Web Locks, this tab's own entry, the page lifecycle (hide, close, freeze,
 * the back/forward cache), the unload guard, persistent storage, the storage facts and the four
 * DOM events. Everything here reaches the browser through an {@link AutosaveEnvironment}, so a
 * unit test can stand in for it.
 * @module autosave
 */

import { GraphtyError } from "../errors/GraphtyError";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import type { CameraState } from "../screenshot/types";
import type { CodedFact } from "../session/shared";
import type { GraphSession } from "../session/types";
import {
    type AutosaveClock,
    type AutosaveLocks,
    Autosaver,
    entryError,
    lockName,
    noLocks,
    realClock,
    type RecoverOptions,
} from "./Autosaver";
import { indexedDbAutosaveStore } from "./indexedDbStore";
import { entryOfMeta, type PageSource } from "./recovery";
import type {
    AutosaveApi,
    AutosaveAvailable,
    AutosaveEntry,
    AutosaveOptions,
    AutosaveRestored,
    AutosaveStatus,
    AutosaveStore,
} from "./types";

/** Facts about a page's autosave, for a reader of the logs: ids, counts and booleans, never data. */
const logger: Logger = GraphtyLogger.getLogger(["graphty", "autosave"]);

/** How often the storage estimate may be read after writes. */
const ESTIMATE_INTERVAL_MS = 60_000;

/** How long a load waits for the lock of the page it replaces. */
const LEAVING_WAIT_MS = 2000;

/** The detail of `graphty-autosave-at-risk`. */
export type AutosaveAtRisk = CodedFact<"W_AUTOSAVE_ORIGIN_EPHEMERAL">;

/** The locks autosave takes, plus a wait for one held by an element of this tab that is leaving. */
export interface PageLocks extends AutosaveLocks {
    /**
     * Wait until nobody holds a lock.
     * @param name - The lock.
     */
    wait(name: string): Promise<void>;
    /**
     * Whether this page holds a lock, taking it now when nobody does. A lock taken here is kept for
     * the first claim this page makes of it, so an element mounted later writes under it.
     * Optional: without it, every lock counts as this page's.
     * @param name - The lock.
     * @param waitMs - When set, wait this long for a holder to let go; for a page that left.
     * @returns True when this page holds it.
     */
    own?(name: string, waitMs?: number): Promise<boolean>;
    /**
     * Settle who has a lock this tab held before a reload: resolves once the lock is free (the page
     * that held it has gone), once a live page says it holds it (a duplicated tab's original), or
     * after {@link HANDOFF_MS} when the holder says nothing. Immediate when this page holds it.
     * Optional: without it, nothing is waited for.
     * @param name - The lock.
     */
    handoff?(name: string): Promise<void>;
}

/**
 * The longest a reloaded tab waits for its own entry's lock from a holder that neither lets go nor
 * answers (a tab running another copy of graphty-element, or one the browser froze). A page that is
 * unloading lets go as soon as the browser tears it down, and a live holder answers at once.
 */
export const HANDOFF_MS = 3000;

/** Where pages ask who holds a lock, and live holders answer. */
const LOCKS_CHANNEL = "graphty-autosave-locks";

/** What autosave needs from the page. `browserEnvironment()` is the real one. */
export interface AutosaveEnvironment {
    /** Where `pagehide`, `pageshow`, `beforeunload` and the gestures are heard. */
    readonly window: EventTarget;
    /** Where `visibilitychange`, `freeze` and `resume` are heard. */
    readonly document: EventTarget & { readonly visibilityState: string };
    /** The browser's storage manager, where there is one. */
    readonly storage: Partial<Pick<StorageManager, "persist" | "persisted" | "estimate" | "getDirectory">> | undefined;
    /**
     * This tab's session storage; it may throw (a sandboxed frame).
     * @returns The storage, or undefined.
     */
    sessionStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined;
    readonly locks: PageLocks;
    readonly clock: AutosaveClock;
    /**
     * Whether the reader has interacted with the page, where the browser says.
     * @returns True after a gesture.
     */
    userActivated(): boolean;
    /**
     * Whether the page runs in a frame of another site, whose storage the browser partitions.
     * @returns True in a third-party frame.
     */
    thirdParty(): boolean;
    /**
     * The default store, or undefined where IndexedDB is missing.
     * @returns The store.
     */
    defaultStore(): AutosaveStore | undefined;
}

/**
 * A Web Locks callback that hands back the lock's release, or null when the lock is taken.
 * @param resolve - Receives the release, or null.
 * @returns The callback.
 */
function holdLock(resolve: (release: (() => void) | null) => void): (lock: Lock | null) => Promise<void> | undefined {
    return (lock) => {
        if (lock === null) {
            resolve(null);
            return undefined;
        }

        // Held until released: the lock lives as long as this promise is pending.
        return new Promise<void>((release) => {
            resolve(release);
        });
    };
}

/**
 * Web Locks as autosave's locks.
 * @param locks - `navigator.locks`.
 * @returns The locks.
 */
function webLocks(locks: LockManager): PageLocks {
    // The locks this page holds, and those `own` took that no claim has picked up yet. A parked lock
    // is this page's: it counts as held for other tabs, and not for this page's own elements.
    // ponytail: per module copy; a page loading two copies of graphty-element hands no lock between them.
    const mine = new Set<string>();
    const parked = new Map<string, () => void>();
    const claiming = new Map<string, Promise<boolean>>();
    const request = (name: string): Promise<(() => void) | null> =>
        new Promise((resolve, reject) => {
            locks.request(name, { ifAvailable: true }, holdLock(resolve)).catch(reject);
        });
    // A reload can start before the browser has torn down the page it replaces, which still holds
    // this tab's lock; a duplicated tab finds the lock held by its live original. Holders answer
    // "who holds it?" until their page hides, so the two can be told apart.
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LOCKS_CHANNEL);
    let leaving = false;
    globalThis.addEventListener?.("pagehide", () => {
        leaving = true;
    });
    globalThis.addEventListener?.("pageshow", () => {
        leaving = false;
    });
    channel?.addEventListener("message", (event: MessageEvent<{ ask?: string }>) => {
        const name = event.data.ask;
        if (!leaving && name !== undefined && (mine.has(name) || parked.has(name))) {
            channel?.postMessage({ held: name });
        }
    });
    const handoff = (name: string): Promise<void> => {
        if (mine.has(name) || parked.has(name)) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const stop = new AbortController();
            const done = (): void => {
                stop.abort();
                clearTimeout(timer);
                channel?.removeEventListener("message", heard);
                resolve();
            };
            const heard = (event: MessageEvent<{ held?: string }>): void => {
                if (event.data.held === name) {
                    done();
                }
            };
            // ponytail: the bound covers only a holder that is silent; every other case ends on an event.
            const timer = setTimeout(done, HANDOFF_MS);
            channel?.addEventListener("message", heard);
            channel?.postMessage({ ask: name });
            locks.request(name, { signal: stop.signal }, () => undefined).then(done, done);
        });
    };
    // ponytail: a timer, because a holder that never lets go sends no event; reached only with a
    // leaving mark present and the lock held. A live holder saying so over a channel would still need it.
    const waited = (name: string, waitMs: number): Promise<(() => void) | null> =>
        new Promise((resolve) => {
            locks.request(name, { signal: AbortSignal.timeout(waitMs) }, holdLock(resolve)).catch(() => {
                resolve(null);
            });
        });
    const claim = async (name: string, waitMs?: number): Promise<(() => void) | null> => {
        const kept = parked.get(name);
        if (kept !== undefined) {
            parked.delete(name);
            return kept;
        }

        const release = (await request(name)) ?? (waitMs === undefined ? null : await waited(name, waitMs));
        if (release === null) {
            return null;
        }

        mine.add(name);
        return () => {
            mine.delete(name);
            release();
        };
    };
    return {
        claim,
        held: async () => {
            const { held } = await locks.query();
            return new Set((held ?? []).map((lock) => lock.name ?? "").filter((name) => !parked.has(name)));
        },
        wait: async (name) => {
            if (!parked.has(name)) {
                await locks.request(name, () => undefined);
            }
        },
        own: (name, waitMs) => {
            if (mine.has(name) || parked.has(name)) {
                return Promise.resolve(true);
            }

            // Two lookups at once (a React effect run twice) share one claim: otherwise the second
            // finds the lock the first is taking, and reports this page's own entry as another's.
            let owning = claiming.get(name);
            if (owning === undefined) {
                // With a wait, the holder is known to be the page that left; without one, ask who it is.
                owning = claim(name, waitMs)
                    .then((release) =>
                        release !== null || waitMs !== undefined ? release : handoff(name).then(() => claim(name)),
                    )
                    .then((release) => {
                        if (release === null) {
                            return false;
                        }

                        parked.set(name, release);
                        return true;
                    })
                    .finally(() => {
                        claiming.delete(name);
                    });
                claiming.set(name, owning);
            }

            return owning;
        },
        handoff,
    };
}

/** The real page, built once: the once-per-load facts hang off it. */
let browser: AutosaveEnvironment | undefined;

/**
 * The page this module runs in.
 * @returns Its environment.
 */
export function browserEnvironment(): AutosaveEnvironment {
    if (browser !== undefined) {
        return browser;
    }

    const nav = globalThis.navigator as
        (Navigator & { userActivation?: { hasBeenActive?: boolean }; locks?: LockManager }) | undefined;
    const locks: PageLocks =
        nav?.locks === undefined
            ? { ...noLocks, wait: () => Promise.resolve(), own: () => Promise.resolve(true) }
            : webLocks(nav.locks);
    browser = {
        window: globalThis as unknown as EventTarget,
        document: globalThis.document,
        storage: nav?.storage,
        sessionStorage: () => globalThis.sessionStorage,
        locks,
        clock: realClock,
        userActivated: () => nav?.userActivation?.hasBeenActive === true,
        thirdParty: () => {
            if (globalThis.top === globalThis.self) {
                return false;
            }

            try {
                // A frame of the same site can read its top's address; another site's cannot.
                return globalThis.top?.location.href === undefined;
            } catch {
                return true;
            }
        },
        defaultStore: () => (typeof indexedDB === "undefined" ? undefined : indexedDbAutosaveStore()),
    };
    return browser;
}

/** Once-per-load facts, kept per environment. */
const askedPersist = new WeakSet<AutosaveEnvironment>();
const warnedAtRisk = new WeakSet<AutosaveEnvironment>();
const gestured = new WeakSet<AutosaveEnvironment>();
const listening = new WeakSet<AutosaveEnvironment>();

/** The entries elements of this tab write, by key, so an element remounted later finds its own. */
const ownEntries = new Map<string, string>();

/** The final writes of elements that left, by entry: a remount waits for them. */
const departing = new Map<string, Promise<void>>();

/** The session storage name of this tab's own entry of a key. */
const OWN_ITEM = "graphty-autosave:own:";

/** The session storage name of the entry a page was writing when it left for good. */
const LEAVING_ITEM = "graphty-autosave:leaving:";

/** The session storage name of the camera a page last showed. */
const CAMERA_ITEM = "graphty-autosave:camera:";

/**
 * The entry a page of this tab left behind, if one really left; the mark is used up. A duplicated
 * tab's copy of the mark can only name a lock its original still holds, and waits out the timer.
 * @param env - The page.
 * @param key - The key.
 * @returns The entry id, or null.
 */
function takeLeaving(env: AutosaveEnvironment, key: string): string | null {
    try {
        const storage = env.sessionStorage();
        const entry = storage?.getItem(LEAVING_ITEM + key) ?? null;
        storage?.removeItem(LEAVING_ITEM + key);
        return entry;
    } catch {
        return null;
    }
}

/**
 * How this page was reached, for the logs.
 * @returns `navigate`, `reload`, `back_forward`, or null where the browser does not say.
 */
function navigationType(): string | null {
    const [entry] = (globalThis.performance?.getEntriesByType?.("navigation") ?? []) as PerformanceNavigationTiming[];
    return entry?.type ?? null;
}

/**
 * This tab's own entry of a key, as session storage kept it across a reload or a discard.
 * @param env - The page.
 * @param key - The key.
 * @returns The entry id, or null.
 */
function readOwnItem(env: AutosaveEnvironment, key: string): string | null {
    try {
        return env.sessionStorage()?.getItem(OWN_ITEM + key) ?? null;
    } catch {
        return null;
    }
}

/** What `start` is told. */
export interface AutosaveStart {
    readonly session: GraphSession;
    /** The resolved key, or the reason there is none. */
    readonly key: string | CodedFact<"E_AUTOSAVE_KEY_AMBIGUOUS">;
    readonly options: Partial<AutosaveOptions>;
    readonly restore: "auto" | "manual";
    /** Every setting the page made, as it is now. */
    readonly pageConfig: Readonly<Record<string, unknown>>;
    /**
     * Puts the page's own data back, for `discard()`.
     * @returns Settles once it is back.
     */
    readonly reloadPage: () => Promise<void>;
    /** Reads and places the camera, for `keepCamera`. */
    readonly camera?: AutosaveCamera;
}

/** The element's camera, for `keepCamera`. */
export interface AutosaveCamera {
    /** @returns The camera now. */
    get(): CameraState;
    /**
     * Place the camera at once.
     * @param state - Where.
     * @returns Settles once it is placed.
     */
    set(state: CameraState): Promise<void>;
}

/**
 * The key a bare or valued `autosave` resolves to.
 * @param input - What the element knows.
 * @param input.optionKey - `autosaveOptions.key`.
 * @param input.attribute - The attribute's value; `""` for a bare attribute.
 * @param input.id - The element's `id`.
 * @param input.location - The page's address: path, query and fragment.
 * @param input.bareWithoutId - How many autosaving elements in the document have neither a key nor an id.
 * @returns The key, or the reason there is none.
 */
export function resolveAutosaveKey(input: {
    readonly optionKey: string | undefined;
    readonly attribute: string;
    readonly id: string;
    readonly location: string;
    readonly bareWithoutId: number;
}): string | CodedFact<"E_AUTOSAVE_KEY_AMBIGUOUS"> {
    if (input.optionKey !== undefined && input.optionKey !== "") {
        return input.optionKey;
    }

    if (input.attribute !== "") {
        return input.attribute;
    }

    if (input.id === "" && input.bareWithoutId > 1) {
        return { code: "E_AUTOSAVE_KEY_AMBIGUOUS", params: { elements: input.bareWithoutId } };
    }

    return `${input.location}#${input.id}`;
}

/**
 * Which commit a status reports.
 * @param status - The status.
 * @returns Its commit, as text.
 */
function commitOf(status: AutosaveStatus): string {
    return `${String(status.savedAt)} ${String(status.revision)}`;
}

/**
 * A status for an element that does not autosave.
 * @param problem - Why, when something stopped it.
 * @returns The status.
 */
function offStatus(problem: AutosaveStatus["problem"]): AutosaveStatus {
    return {
        state: "off",
        savedAt: null,
        revision: 0,
        entry: null,
        unexported: false,
        persisted: null,
        storage: null,
        ephemeral: "unknown",
        problem,
    };
}

/** Autosave for one element: started once its key is known, departed when the element is removed. */
export class ElementAutosave {
    readonly #dispatch: (type: string, detail: unknown) => void;
    readonly #env: AutosaveEnvironment;
    #saver: Autosaver | null = null;
    #store: AutosaveStore | undefined;
    #options: Partial<AutosaveOptions> = {};
    #status: AutosaveStatus = offStatus(null);
    #told = "";
    readonly #ready: Promise<AutosaveRestored | null>;
    #settle: (restored: AutosaveRestored | null) => void = () => undefined;
    #settled = false;
    readonly #stops: (() => void)[] = [];
    #guarding = false;
    #estimatedAt = Number.NEGATIVE_INFINITY;
    #lastSaved: string | null = null;
    #departed = false;
    #reloadPage: () => Promise<void> = () => Promise.resolve();
    #camera: AutosaveCamera | undefined;

    /** The API the element hands out as `autosaver`. */
    readonly api: AutosaveApi;

    /**
     * Autosave for one element, off until started.
     * @param dispatch - Dispatches a DOM event on the element.
     * @param env - The page; the browser's by default.
     */
    constructor(dispatch: (type: string, detail: unknown) => void, env: AutosaveEnvironment = browserEnvironment()) {
        this.#dispatch = dispatch;
        this.#env = env;
        this.#ready = new Promise((resolve) => {
            this.#settle = resolve;
        });
        const methods: Omit<AutosaveApi, "status" | "ready" | "restored"> = {
            flush: () => this.#saver?.flush() ?? Promise.resolve(),
            list: () => this.#saver?.list() ?? Promise.resolve([]),
            restore: async (id, options) => {
                await this.#ready;
                const report = await this.#need().restore(id, options?.discard === true);
                this.#placeCamera(id);
                return report;
            },
            remove: async (id) => {
                await this.#ready;
                return this.#need().remove(id);
            },
            removeAll: async () => {
                await this.#ready;
                return this.#saver?.removeAll();
            },
            discard: async () => {
                await this.#ready;
                const saver = this.#saver;
                if (saver !== null) {
                    await saver.discard(this.#reloadPage);
                    this.#forgetOwn(saver.key);
                }
            },
            stash: (name, value) => {
                this.#saver?.stash(name, value);
            },
            stashed: (name) => this.#saver?.stashed(name),
            requestPersistence: () => this.#requestPersistence(),
        };
        this.api = Object.defineProperties(methods, {
            status: { enumerable: true, get: () => this.#saver?.status ?? this.#status },
            ready: { enumerable: true, get: () => this.#ready },
            restored: { enumerable: true, get: () => this.#saver?.restored ?? null },
        }) as AutosaveApi;
    }

    /** The element connected with autosave on: until it starts, it reports nothing to write. */
    connect(): void {
        if (this.#saver === null && !this.#settled) {
            this.#status = { ...offStatus(null), state: "saved" };
        }
    }

    /**
     * Whether data inputs wait: autosave was started or is about to be, and the restore is not
     * decided yet.
     * @returns True while they wait.
     */
    get holding(): boolean {
        return !this.#settled && !this.#departed;
    }

    /**
     * Settles once the restore is decided (or autosave stopped).
     * @returns The `ready` promise.
     */
    get ready(): Promise<AutosaveRestored | null> {
        return this.#ready;
    }

    /**
     * Run a page-supplied load through the writer, which may absorb it (5.5).
     * @param source - What the load came from.
     * @param load - Runs it.
     * @param work - The page cannot repeat it by itself, so it starts an entry.
     * @returns Settles once it ran or was skipped.
     */
    async admit(source: PageSource, load: () => Promise<void>, work = false): Promise<void> {
        const saver = this.#saver;
        if (saver === null || this.#departed) {
            await load();
            return;
        }

        await saver.admit(source, load, work);
    }

    /**
     * The writer, which exists only while autosave runs.
     * @returns The writer.
     * @throws {GraphtyError} `E_UNSUPPORTED` (`details.reason: "autosave-off"`) when autosave is off.
     */
    #need(): Autosaver {
        if (this.#saver === null) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "Autosave is off for this element, so it has no entries to restore or remove.",
                source: "data",
                details: { reason: "autosave-off" },
            });
        }

        return this.#saver;
    }

    /**
     * Autosave does not start (it is off, or the element left first): the restore is decided as
     * nothing, and held inputs go on.
     * @param problem - Why, when something stopped it.
     */
    off(problem: AutosaveStatus["problem"] = null): void {
        this.#status = offStatus(problem);
        this.#finish(null);
    }

    #finish(restored: AutosaveRestored | null): void {
        if (!this.#settled) {
            this.#settled = true;
            this.#settle(restored);
        }
    }

    /**
     * Start: resolve the store, gather the storage facts, restore, and listen to the page.
     * @param start - The session, the key, the options and the page's settings.
     */
    async start(start: AutosaveStart): Promise<void> {
        if (this.#departed || this.#settled) {
            return;
        }

        if (typeof start.key !== "string") {
            this.off(start.key);
            return;
        }

        const store = start.options.store ?? this.#env.defaultStore();
        if (store === undefined) {
            this.off({ code: "E_AUTOSAVE_UNAVAILABLE", params: { api: "indexedDB" } });
            return;
        }

        const { key, options } = start;
        this.#options = options;
        this.#store = store;
        this.#reloadPage = start.reloadPage;
        this.#camera = start.camera;
        const saver = new Autosaver({
            session: start.session,
            store,
            key,
            ...(options.delayMs === undefined ? {} : { delayMs: options.delayMs }),
            ...(options.maxWaitMs === undefined ? {} : { maxWaitMs: options.maxWaitMs }),
            ...(options.dataMaxWaitMs === undefined ? {} : { dataMaxWaitMs: options.dataMaxWaitMs }),
            ...(options.keep === undefined ? {} : { keep: options.keep }),
            clock: this.#env.clock,
            locks: this.#env.locks,
            hidden: () => this.#env.document.visibilityState === "hidden",
            onEntryStart: (id) => {
                this.#noteOwn(key, id);
            },
        });
        this.#saver = saver;
        this.#stops.push(
            saver.onAvailable((available: AutosaveAvailable) => {
                this.#dispatch("graphty-autosave-available", available);
            }),
        );

        // This tab's own entry: an element of this tab that just left (a remount), else what
        // session storage kept across a reload or a discard.
        const own = ownEntries.get(key) ?? this.#readOwn(key);
        if (own !== null) {
            await this.#waitForOwn(key, own);
        }

        saver.setFacts(await this.#gatherFacts(), true);
        const recover: RecoverOptions = {
            own,
            restore: options.restore ?? start.restore,
            pageConfig: start.pageConfig,
        };
        const restored = this.#departed ? null : await saver.recover(recover);
        if (this.#departed) {
            this.#finish(null);
            return;
        }

        // A change made while the start waited (a page's setup right after connect) may already be
        // written: that is a change of the status, told now. A restore is told by its own event.
        const writtenWhileStarting = restored === null && saver.status.entry !== null;
        if (!writtenWhileStarting) {
            this.#told = JSON.stringify(saver.status);
            this.#lastSaved = commitOf(saver.status);
        }

        this.#noteOwn(key, saver.status.entry);
        this.#stops.push(
            saver.onStatus((status) => {
                this.#onStatus(status);
            }),
        );
        if (writtenWhileStarting) {
            this.#onStatus(saver.status);
        }
        this.#listen();
        // From here a hidden or closed page writes what is outstanding; before, nothing can be written.
        logger.info("listening", { entry: saver.entryId, restored: restored !== null, started: saver.started });
        this.#updateGuard(saver.status);
        if (restored !== null) {
            this.#placeCamera(restored.entry.id);
            this.#dispatch("graphty-autosave-restored", restored);
        }

        this.#finish(restored);
        this.#checkAtRisk(saver.status);
    }

    /**
     * Wait until the page or element that last wrote this tab's own entry has let go of it.
     * @param key - The autosave key.
     * @param own - This tab's own entry.
     */
    async #waitForOwn(key: string, own: string): Promise<void> {
        const leaving = departing.get(own);
        if (leaving !== undefined) {
            await leaving;
            await this.#env.locks.wait(lockName(key, own));
        }

        // A reload: the page before it may still hold the lock for its final write.
        if (takeLeaving(this.#env, key) === own) {
            await this.#env.locks.own?.(lockName(key, own), LEAVING_WAIT_MS);
        }

        // After a reload with no leaving mark, the page it replaced may not have let go yet.
        await this.#env.locks.handoff?.(lockName(key, own));
    }

    /**
     * The element is removed: build its final write now, before the session is shut down, and let
     * a remount in this tab wait for it.
     */
    depart(): void {
        if (this.#departed) {
            return;
        }

        this.#departed = true;
        for (const stop of this.#stops.splice(0)) {
            stop();
        }

        this.#setGuard(false);
        const saver = this.#saver;
        if (saver === null) {
            this.#finish(null);
            return;
        }

        const done = saver.depart().then(
            () => this.#store?.close?.(),
            () => this.#store?.close?.(),
        );
        // The entry's id even before its first commit: the final write may be that commit, and a
        // remount in this tab must find it. Read after `depart()`, which starts the entry when an
        // edit made while the page's own load ran was still held (issues #5038, #5039).
        const entry = saver.started ? saver.entryId : null;
        if (entry !== null) {
            ownEntries.set(saver.key, entry);
        }

        if (entry !== null) {
            departing.set(entry, done);
            void done.finally(() => {
                if (departing.get(entry) === done) {
                    departing.delete(entry);
                }
            });
        }

        this.#finish(null);
    }

    /**
     * What the page says about its storage at the start.
     * @returns The facts.
     */
    async #gatherFacts(): Promise<Pick<AutosaveStatus, "persisted" | "ephemeral" | "storage">> {
        const persisted = await this.#persisted();
        const storage = await this.#storageNow();
        let ephemeral: AutosaveStatus["ephemeral"] = "unknown";
        if (this.#env.thirdParty()) {
            ephemeral = "likely";
        } else if (this.#env.storage?.getDirectory !== undefined) {
            try {
                // Safari's and Firefox's private windows refuse the origin private file system.
                await this.#env.storage.getDirectory();
            } catch {
                ephemeral = "likely";
            }
        }

        // The quota is never a signal. Chrome sizes an Incognito origin's quota from memory and a
        // normal one from the disk, so a small quota is also what a normal profile on a small disk
        // has. Incognito reads "unknown"; its storage is never persisted, so it still warns.
        this.#estimatedAt = this.#env.clock.now();
        return { persisted, ephemeral, storage };
    }

    /**
     * Whether the browser granted persistent storage.
     * @returns True, false, or null where it does not say.
     */
    async #persisted(): Promise<boolean | null> {
        try {
            const persisted = await this.#env.storage?.persisted?.();
            return typeof persisted === "boolean" ? persisted : null;
        } catch {
            return null;
        }
    }

    /**
     * The origin's storage use and this key's share of it.
     * @returns The figures, or null where the browser does not report them.
     */
    async #storageNow(): Promise<AutosaveStatus["storage"]> {
        try {
            const estimate = await this.#env.storage?.estimate?.();
            if (estimate?.usage === undefined || estimate.quota === undefined || this.#store === undefined) {
                return null;
            }

            const metas = await this.#store.list(this.#saver?.key ?? "");
            const bytes = metas.reduce((sum, meta) => sum + (typeof meta.bytes === "number" ? meta.bytes : 0), 0);
            return { usage: estimate.usage, quota: estimate.quota, entries: metas.length, bytes };
        } catch {
            return null;
        }
    }

    /**
     * Ask for persistent storage now.
     * @returns Whether the origin's storage is persisted now.
     */
    async #requestPersistence(): Promise<boolean> {
        askedPersist.add(this.#env);
        try {
            await this.#env.storage?.persist?.();
        } catch {
            // Refused or unsupported: the answer is read below either way.
        }

        const persisted = await this.#persisted();
        this.#saver?.setFacts({ persisted });
        return persisted === true;
    }

    /**
     * React to a status change: tell the page, keep this tab's own entry, arm or disarm the
     * guard, and do what follows a commit.
     * @param status - The status.
     */
    #onStatus(status: AutosaveStatus): void {
        const told = JSON.stringify(status);
        if (told !== this.#told) {
            this.#told = told;
            this.#dispatch("graphty-autosave-status", status);
        }

        const saver = this.#saver;
        if (saver === null) {
            return;
        }

        this.#noteOwn(saver.key, status.entry);
        this.#updateGuard(status);
        if (status.state === "pending" && this.#env.document.visibilityState === "hidden") {
            // Timers are throttled or stopped while hidden: a change made then is written at once.
            void saver.flush();
        }

        if (status.savedAt !== null && commitOf(status) !== this.#lastSaved) {
            this.#lastSaved = commitOf(status);
            this.#afterCommit();
        }

        this.#checkAtRisk(status);
    }

    /** What follows a commit: the persistence request a consumer asked for, and the estimate. */
    #afterCommit(): void {
        if (
            this.#options.persist === true &&
            !askedPersist.has(this.#env) &&
            (gestured.has(this.#env) || this.#env.userActivated())
        ) {
            void this.#requestPersistence();
        }

        const now = this.#env.clock.now();
        if (now - this.#estimatedAt >= ESTIMATE_INTERVAL_MS) {
            this.#estimatedAt = now;
            void this.#storageNow().then((storage) => {
                this.#saver?.setFacts({ storage });
            });
        }
    }

    /**
     * Fire the at-risk fact once per page load: work never saved to a file, in storage the browser
     * may delete.
     * @param status - The status.
     */
    #checkAtRisk(status: AutosaveStatus): void {
        if (
            warnedAtRisk.has(this.#env) ||
            !status.unexported ||
            (status.persisted !== false && status.ephemeral !== "likely")
        ) {
            return;
        }

        warnedAtRisk.add(this.#env);
        const detail: AutosaveAtRisk = {
            code: "W_AUTOSAVE_ORIGIN_EPHEMERAL",
            params: { persisted: status.persisted, ephemeral: status.ephemeral, unexported: true },
        };
        this.#dispatch("graphty-autosave-at-risk", detail);
    }

    /**
     * Read this tab's own entry of a key from session storage.
     * @param key - The key.
     * @returns The entry id, or null.
     */
    #readOwn(key: string): string | null {
        return readOwnItem(this.#env, key);
    }

    /**
     * Remember this tab's own entry of a key, for a remount and for the next load.
     * @param key - The key.
     * @param entry - The entry, or null before its first write.
     */
    #noteOwn(key: string, entry: string | null): void {
        if (entry === null || ownEntries.get(key) === entry) {
            return;
        }

        ownEntries.set(key, entry);
        try {
            this.#env.sessionStorage()?.setItem(OWN_ITEM + key, entry);
        } catch {
            // No session storage here: the registry still serves a remount.
        }
    }

    /**
     * Forget this tab's own entry of a key: it was discarded.
     * @param key - The key.
     */
    #forgetOwn(key: string): void {
        ownEntries.delete(key);
        try {
            this.#env.sessionStorage()?.removeItem(OWN_ITEM + key);
        } catch {
            // Nothing kept.
        }
    }

    /** Listen to the page lifecycle. No `unload` listener: it blocks the back/forward cache. */
    #listen(): void {
        const saver = this.#saver;
        if (saver === null) {
            return;
        }

        const { window, document } = this.#env;
        const on = (target: EventTarget, type: string, listener: (event: Event) => void): void => {
            target.addEventListener(type, listener);
            this.#stops.push(() => {
                target.removeEventListener(type, listener);
            });
        };
        const close = (): Promise<void> => this.#store?.close?.() ?? Promise.resolve();
        const flushLogged = (): Promise<void> =>
            saver.flush(true).then(() => {
                logger.info("flush finished", { entry: saver.entryId });
            });
        on(document, "visibilitychange", () => {
            logger.info("visibility", { state: document.visibilityState });
            if (document.visibilityState === "hidden") {
                this.#keepCamera(saver);
                void flushLogged();
            }
        });
        on(window, "pagehide", (event) => {
            const { persisted } = event as PageTransitionEvent;
            logger.info("pagehide", { persisted });
            this.#keepCamera(saver);
            if (!persisted) {
                // Written before anything else can end the page: only a page that really left writes it.
                try {
                    this.#env.sessionStorage()?.setItem(LEAVING_ITEM + saver.key, saver.entryId);
                } catch {
                    // No session storage here: a reload cannot wait for this page's lock.
                }
            }

            const flushed = flushLogged();
            if (persisted) {
                // Into the back/forward cache, which a held Web Lock keeps the page out of. Released
                // now, not after the write: the write finishes only once the page is shown again,
                // when the lock it would release is the one `pageshow` took back.
                saver.releaseLockNow();
                void flushed.then(close);
                return;
            }

            void flushed.then(() => saver.releaseLock()).then(close);
        });
        on(document, "freeze", () => {
            logger.info("freeze");
            void flushLogged().then(close);
        });
        on(window, "pageshow", (event) => {
            if ((event as PageTransitionEvent).persisted) {
                void saver.reclaim();
            }
        });
        on(document, "resume", () => {
            logger.info("resume");
            void saver.reclaim();
        });

        if (!listening.has(this.#env)) {
            // Once per page: whether the reader has made a gesture, for `persist: true`.
            listening.add(this.#env);
            const gesture = (): void => {
                gestured.add(this.#env);
            };
            window.addEventListener("pointerdown", gesture, { capture: true, once: true });
            window.addEventListener("keydown", gesture, { capture: true, once: true });
        }
    }

    /**
     * Keep where the camera is, with the entry it belongs to, when the consumer asked for it.
     * @param saver - The writer.
     */
    #keepCamera(saver: Autosaver): void {
        if (this.#options.keepCamera !== true || this.#camera === undefined) {
            return;
        }

        try {
            const item = JSON.stringify({ entry: saver.entryId, state: this.#camera.get() });
            this.#env.sessionStorage()?.setItem(CAMERA_ITEM + saver.key, item);
        } catch {
            // No session storage here, or no camera yet: the graph is framed as on any load.
        }
    }

    /**
     * Put the camera back where this tab left it, when it is the restored entry's.
     * @param entry - The restored entry.
     */
    #placeCamera(entry: string): void {
        const camera = this.#camera;
        const key = this.#saver?.key;
        if (this.#options.keepCamera !== true || camera === undefined || key === undefined) {
            return;
        }

        try {
            const text = this.#env.sessionStorage()?.getItem(CAMERA_ITEM + key) ?? null;
            const kept = text === null ? null : (JSON.parse(text) as { entry: string; state: CameraState });
            if (kept?.entry === entry) {
                void camera.set(kept.state).catch(() => undefined);
            }
        } catch {
            // Nothing readable kept: the graph is framed as on any load.
        }
    }

    /**
     * The `beforeunload` listener: ask before closing, and write.
     * @param event - The event.
     */
    readonly #guard = (event: Event): void => {
        event.preventDefault();
        void this.#saver?.flush(true);
    };

    /**
     * Arm the guard while it is needed, and only then: a `beforeunload` listener keeps a page out
     * of some browsers' back/forward cache.
     * @param status - The status.
     */
    #updateGuard(status: AutosaveStatus): void {
        const mode = this.#options.unloadGuard ?? "pending";
        let wanted = false;
        if (mode === "pending") {
            // A pending write of layout positions only (the layout came to rest) holds no change.
            wanted = status.state === "failing" || (status.state === "pending" && this.#saver?.unsavedChanges === true);
        } else if (mode === "unexported") {
            wanted = status.unexported;
        }

        this.#setGuard(wanted && !this.#departed);
    }

    #setGuard(on: boolean): void {
        if (on === this.#guarding) {
            return;
        }

        this.#guarding = on;
        if (on) {
            this.#env.window.addEventListener("beforeunload", this.#guard);
        } else {
            this.#env.window.removeEventListener("beforeunload", this.#guard);
        }
    }
}

/** Where {@link listAutosaves} and {@link removeAutosave} look. */
export interface AutosaveLookupOptions {
    /** The store the elements write to; the browser's IndexedDB by default. */
    readonly store?: AutosaveStore;
}

/**
 * Runs something against the store a lookup names, closing the default store afterwards.
 * @param options - The lookup's options.
 * @param act - What to do; receives no store where IndexedDB is missing.
 * @returns What `act` returned.
 */
async function withLookupStore<T>(
    options: AutosaveLookupOptions,
    act: (store: AutosaveStore | undefined, env: AutosaveEnvironment) => Promise<T>,
): Promise<T> {
    const env = browserEnvironment();
    const store = options.store ?? env.defaultStore();
    try {
        return await act(store, env);
    } finally {
        if (options.store === undefined) {
            await store?.close?.();
        }
    }
}

/**
 * The work kept under an autosave key, read without an element: for a page that offers it before
 * it shows a graph, such as a start screen. The same list as `autosaver.list()`, oldest first;
 * `live` is true for an entry an element (in any tab) is writing now. Empty where the browser
 * keeps no storage. Open an entry with `autosaver.restore(id)` on an element with the same key.
 *
 * `own` is true for the one entry this tab was writing (after a reload, or after the browser
 * discarded the tab and loaded it again) once this tab holds its lock: the call takes the lock and
 * keeps it for the element this page mounts next with the same key. After a reload it waits, up
 * to two seconds, for the page that left to let go of the lock. A duplicated tab inherits the
 * session storage naming the entry, but while the original tab holds the lock it gets `own: false`
 * at once, and its element writes to a copy.
 * @param key - The autosave key.
 * @param options - Where to look.
 * @returns The entries.
 */
export function listAutosaves(key: string, options: AutosaveLookupOptions = {}): Promise<readonly AutosaveEntry[]> {
    return withLookupStore(options, async (store, env) => {
        if (store === undefined) {
            return [];
        }

        const candidate = ownEntries.get(key) ?? readOwnItem(env, key);
        const leaving = takeLeaving(env, key);
        const waited = candidate !== null && leaving === candidate;
        // Before the list: the page that left may still be writing this entry's final commit.
        if (waited) {
            await env.locks.own?.(lockName(key, candidate), LEAVING_WAIT_MS);
        }

        const metas = await store.list(key);
        const exists = metas.some((meta) => meta.id === candidate);
        const owned = candidate !== null && exists && ((await env.locks.own?.(lockName(key, candidate))) ?? true);
        const held = await env.locks.held();
        logger.info("kept work listed", {
            noted: candidate !== null,
            exists,
            own: owned,
            waited,
            leavingMark: leaving !== null,
            entries: metas.length,
            navigationType: navigationType(),
        });
        return metas.map((meta) => ({
            ...entryOfMeta(meta, held.has(lockName(key, meta.id))),
            own: owned && meta.id === candidate,
        }));
    });
}

/**
 * Delete an entry of an autosave key that no element is writing, without an element: the
 * reader declined to reopen it.
 * @param key - The autosave key.
 * @param id - The entry.
 * @param options - Where to look.
 * @returns Settles once the entry is deleted.
 * @throws A `GraphtyError` (as a rejection): `E_AUTOSAVE_UNKNOWN_ENTRY` or `E_AUTOSAVE_ENTRY_TAKEN`.
 */
export function removeAutosave(key: string, id: string, options: AutosaveLookupOptions = {}): Promise<void> {
    return withLookupStore(options, async (store, env) => {
        const metas = store === undefined ? [] : await store.list(key);
        if (store === undefined || !metas.some((meta) => meta.id === id)) {
            throw entryError("E_AUTOSAVE_UNKNOWN_ENTRY", id);
        }

        if ((await env.locks.held()).has(lockName(key, id))) {
            throw entryError("E_AUTOSAVE_ENTRY_TAKEN", id);
        }

        await store.remove(id);
    });
}
