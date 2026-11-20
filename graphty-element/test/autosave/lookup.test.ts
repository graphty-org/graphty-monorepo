/**
 * listAutosaves and removeAutosave: the work kept under a key, read and deleted without an
 * element, for a page that offers it before it shows a graph.
 */

import { assert, describe, it, vi } from "vitest";

import { memoryAutosaveStore } from "../../extend";
import { LIST_TIMEOUT_MS } from "../../src/autosave/Autosaver";
import {
    type AutosaveEnvironment,
    listAutosaves,
    listAutosavesIn,
    removeAutosave,
} from "../../src/autosave/elementAutosave";
import { isGraphtyError } from "../../src/errors/GraphtyError";
import { FakeClock, FakeLocks } from "./fakes";
import { write } from "./store-contract";

describe("listAutosaves and removeAutosave", () => {
    it("lists a key's entries as autosaver.list() describes them, and deletes one", async () => {
        const store = memoryAutosaveStore();
        await store.commit([
            write("a", "k", 0, { rest: "a" }, { name: "Org chart", nodes: 3, edges: 2, dirty: true }),
            write("b", "other", 0, { rest: "b" }),
        ]);

        const entries = await listAutosaves("k", { store });
        assert.deepEqual(
            entries.map(({ id, name, nodes, edges, dirty, live }) => ({ id, name, nodes, edges, dirty, live })),
            [{ id: "a", name: "Org chart", nodes: 3, edges: 2, dirty: true, live: false }],
        );

        await removeAutosave("k", "a", { store });
        assert.deepEqual(await listAutosaves("k", { store }), []);
        assert.strictEqual((await listAutosaves("other", { store })).length, 1);
    });

    it("refuses an entry the key does not hold", async () => {
        const store = memoryAutosaveStore();
        await store.commit([write("b", "other", 0, { rest: "b" })]);
        const error: unknown = await removeAutosave("k", "b", { store }).then(
            () => null,
            (reason: unknown) => reason,
        );
        assert.isTrue(isGraphtyError(error) && error.code === "E_AUTOSAVE_UNKNOWN_ENTRY");
    });

    it("refuses with E_AUTOSAVE_STALLED when the store never answers, as behind another tab's unfinished write", async () => {
        vi.useFakeTimers();
        try {
            // Another tab holds a read-write transaction and is suspended: this read is queued behind it.
            const store = { ...memoryAutosaveStore(), list: () => new Promise<never>(() => undefined) };
            const outcome: { settled: unknown } = { settled: null };
            // Read through a call: the assertion below narrows the field to null for the compiler.
            const settledNow = (): unknown => outcome.settled;
            void listAutosaves("k", { store }).then(
                (entries) => {
                    outcome.settled = entries;
                },
                (reason: unknown) => {
                    outcome.settled = reason;
                },
            );
            await vi.advanceTimersByTimeAsync(LIST_TIMEOUT_MS - 1);
            assert.isNull(outcome.settled, "still waiting before the bound");
            await vi.advanceTimersByTimeAsync(1);
            const settled = settledNow();
            // Never an empty list: that says nothing is kept, and a page would open again work
            // another tab is writing.
            assert.isTrue(isGraphtyError(settled) && settled.code === "E_AUTOSAVE_STALLED", String(settled));
            assert.deepEqual(isGraphtyError(settled) ? settled.details : null, {
                afterMs: LIST_TIMEOUT_MS,
                step: "list",
            });
        } finally {
            vi.useRealTimers();
        }
    });
});

/**
 * A tab loaded again with its session storage gone, as Safari loads a tab it ended in the background:
 * the tab's record in `window.name` and, without it, the newest entry no live tab holds, find its
 * own work again. A new tab, and work another tab holds, never become its own.
 */
describe("listAutosaves after the tab lost its session storage", () => {
    /**
     * A page with empty session storage.
     * @param navigationType - How the load came about.
     * @param name - The tab's window name.
     * @returns The page, its locks and its window.
     */
    const lostPage = (
        navigationType: string,
        name = "",
    ): { env: AutosaveEnvironment; locks: FakeLocks; tab: { name: string } } => {
        const items = new Map<string, string>();
        const locks = new FakeLocks();
        const tab = { name };
        const env: AutosaveEnvironment = {
            window: new EventTarget(),
            document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
            storage: undefined,
            sessionStorage: () => ({
                getItem: (item: string) => items.get(item) ?? null,
                setItem: (item: string, value: string) => items.set(item, value),
                removeItem: (item: string) => items.delete(item),
            }),
            locks: Object.assign(locks, {
                wait: () => Promise.resolve(),
                own: async (lock: string) => (await locks.claim(lock)) !== null,
            }),
            clock: new FakeClock(),
            userActivated: () => false,
            thirdParty: () => false,
            defaultStore: () => undefined,
            tab,
            navigationType: () => navigationType,
        };
        return { env, locks, tab };
    };
    let keys = 0;
    /**
     * A store holding a closed tab's older work and this tab's newer work, under a fresh key.
     * @returns The store and the key.
     */
    const kept = async (): Promise<{ store: ReturnType<typeof memoryAutosaveStore>; key: string }> => {
        keys += 1;
        const key = `lost-${String(keys)}`;
        const store = memoryAutosaveStore();
        await store.commit([
            write(`closed-${key}`, key, 0, { rest: "a" }, { savedAt: "2026-11-19T10:00:00.000Z" }),
            write(`mine-${key}`, key, 0, { rest: "b" }, { savedAt: "2026-11-20T15:44:36.000Z" }),
        ]);
        return { store, key };
    };
    const ownIds = (entries: readonly { id: string; own?: boolean }[]): string[] =>
        entries.filter((entry) => entry.own === true).map((entry) => entry.id);

    it.each(["reload", "back_forward"])("a %s with no record reopens the newest entry no tab holds", async (type) => {
        const { store, key } = await kept();
        const { env, tab } = lostPage(type);
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), [`mine-${key}`]);
        assert.strictEqual(env.sessionStorage()?.getItem(`graphty-autosave:own:${key}`), `mine-${key}`);
        assert.strictEqual(tab.name, `graphty-autosave:mine-${key}`, "the tab's record names it");
    });

    it("the tab's record finds its own entry, not the newer one another tab holds", async () => {
        const { store, key } = await kept();
        await store.commit([write(`other-${key}`, key, 0, { rest: "c" }, { savedAt: "2026-11-20T16:00:00.000Z" })]);
        const { env, locks } = lostPage("back_forward", `graphty-autosave:unrelated,mine-${key}`);
        locks.holdElsewhere(`graphty-autosave:${key}:other-${key}`);
        const listed = await listAutosavesIn(env, key, { store });
        assert.deepEqual(ownIds(listed), [`mine-${key}`]);
        assert.isTrue(listed.find((entry) => entry.id === `other-${key}`)?.live);
    });

    it("without a record, takes no older entry when another tab holds the newest", async () => {
        const { store, key } = await kept();
        const { env, locks } = lostPage("reload");
        locks.holdElsewhere(`graphty-autosave:${key}:mine-${key}`);
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), []);
    });

    it("a record naming none of the key's entries takes nothing: a closed tab's work is offered", async () => {
        const { store, key } = await kept();
        const { env } = lostPage("reload", "graphty-autosave:");
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), []);
    });

    it("a new tab owns nothing, and starts its record", async () => {
        const { store, key } = await kept();
        const { env, tab } = lostPage("navigate");
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), []);
        assert.strictEqual(tab.name, "graphty-autosave:");
    });

    it("a replaced entry is never taken: the newest open one is", async () => {
        const { store, key } = await kept();
        await store.commit([
            write(`gone-${key}`, key, 0, { rest: "c" }, { savedAt: "2026-11-20T16:00:00.000Z", ended: "replaced" }),
        ]);
        const { env } = lostPage("reload");
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), [`mine-${key}`]);
    });

    it("looks for a lost note once per page load: a later lookup of the key adopts nothing", async () => {
        const { store, key } = await kept();
        // A window name the page set, so no record starts and only the guard keeps the guess out.
        const { env } = lostPage("reload", "checkout");
        // The first lookup, while the key holds nothing yet, finds nothing to adopt.
        assert.deepEqual(await listAutosavesIn(env, key, { store: memoryAutosaveStore() }), []);
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), []);
    });

    it("never overwrites a window name the page set itself", async () => {
        const { store, key } = await kept();
        const { env, tab } = lostPage("reload", "checkout");
        assert.deepEqual(ownIds(await listAutosavesIn(env, key, { store })), [`mine-${key}`]);
        assert.strictEqual(tab.name, "checkout");
    });
});
