/**
 * @file Counted-work scaling of the element's autosave doors that change the graph: restoring an
 * entry opens it into the session, and discarding the element's own entry puts the page's data
 * back. Each runs over an entry of n and of 4n nodes, and the elements it visits (see
 * `visitsDuring`) may grow no faster than the entry: 4x, never 16x (issue #1643). Counted, never
 * timed.
 *
 * The page is the test's own (see `element-autosave.test.ts`); the session, the writer and the
 * memory store are real. Strict state is off, as it is for a consumer.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { type AutosaveEnvironment, ElementAutosave, type PageLocks } from "../../src/autosave/elementAutosave";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { AutosaveStore } from "../../src/autosave/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { FakeClock, FakeLocks } from "./fakes";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [200, 800] as const;

const KEY = "test.autosave-scaling";

/**
 * A page the test owns, with locks every element on it shares.
 * @param locks - The page's locks.
 * @returns The page.
 */
function page(locks: PageLocks): AutosaveEnvironment {
    return {
        window: new EventTarget(),
        document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
        storage: {
            persist: () => Promise.resolve(true),
            persisted: () => Promise.resolve(false),
            estimate: () => Promise.resolve({ usage: 1000, quota: 2 ** 40 }),
        },
        sessionStorage: () => undefined,
        locks,
        clock: new FakeClock(),
        userActivated: () => false,
        thirdParty: () => false,
        defaultStore: () => undefined,
    };
}

/**
 * Run with strict state off, as a consumer's session is.
 * @param build - Builds the session.
 * @returns What it built.
 */
async function lenient<T>(build: () => Promise<T>): Promise<T> {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const strict = scope.__GRAPHTY_STRICT_STATE__;
    scope.__GRAPHTY_STRICT_STATE__ = false;
    try {
        return await build();
    } finally {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    }
}

/**
 * A session holding a path of `size` nodes.
 * @param size - The node count.
 * @returns The session.
 */
function pathSession(size: number): Promise<GraphSession> {
    return lenient(async () => {
        const session = createGraphSession();
        const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
        await session.data.addNodes(ids.map((id) => ({ id })));
        await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
        return session;
    });
}

/**
 * Autosave started on a page over a session.
 * @param session - The session.
 * @param store - The store.
 * @param locks - The page's locks.
 * @param restore - Whether it opens the newest entry by itself.
 * @returns The element's autosave.
 */
async function started(
    session: GraphSession,
    store: AutosaveStore,
    locks: PageLocks,
    restore: "auto" | "manual",
): Promise<ElementAutosave> {
    const autosave = new ElementAutosave(() => undefined, page(locks));
    await autosave.start({
        session,
        key: KEY,
        options: { store },
        restore,
        pageConfig: {},
        reloadPage: () => Promise.resolve(),
    });
    return autosave;
}

/**
 * Autosave that has written an entry holding a path of `size` nodes.
 * @param size - The node count.
 * @param store - The store.
 * @param locks - The page's locks.
 * @returns The autosave and its session.
 */
async function written(
    size: number,
    store: AutosaveStore,
    locks: PageLocks,
): Promise<{ autosave: ElementAutosave; session: GraphSession }> {
    const session = await pathSession(size);
    const autosave = await started(session, store, locks, "manual");
    await session.config.set({ name: "Saved" });
    await autosave.api.flush();
    assert.strictEqual(autosave.api.status.state, "saved");
    return { autosave, session };
}

/**
 * Locks every element on one page shares, which never make a caller wait.
 * @returns The locks.
 */
function sharedLocks(): PageLocks {
    return Object.assign(new FakeLocks(), { wait: () => Promise.resolve() });
}

describe("the autosave doors that change the graph do work in proportion to the entry", () => {
    it("AutosaveApi.restore: no more than linear in the entry", async () => {
        await assertScalesLinearly(
            async (size) => {
                const store = memoryAutosaveStore();
                const locks = sharedLocks();
                const writer = await written(size, store, locks);
                // The writer leaves, so its entry is free to open on another element.
                writer.autosave.depart();
                writer.session.dispose();
                const session = await lenient(() => Promise.resolve(createGraphSession()));
                const autosave = await started(session, store, locks, "manual");
                try {
                    const [entry] = await autosave.api.list();
                    assert.isDefined(entry, "the entry is listed");
                    const visits = await visitsDuring(() => autosave.api.restore(entry.id, { discard: true }));
                    assert.strictEqual(session.data.snapshot().nodeCount, size, "the entry was opened");
                    return visits;
                } finally {
                    autosave.depart();
                    session.dispose();
                }
            },
            { sizes: SIZES, counter: "elements visited by AutosaveApi.restore" },
        );
    });

    it("AutosaveApi.discard: no more than linear in the entry", async () => {
        await assertScalesLinearly(
            async (size) => {
                const store = memoryAutosaveStore();
                const { autosave, session } = await written(size, store, sharedLocks());
                try {
                    const visits = await visitsDuring(() => autosave.api.discard());
                    assert.deepEqual(await store.list(KEY), [], "the entry was deleted");
                    return visits;
                } finally {
                    autosave.depart();
                    session.dispose();
                }
            },
            { sizes: SIZES, counter: "elements visited by AutosaveApi.discard" },
        );
    });
});
