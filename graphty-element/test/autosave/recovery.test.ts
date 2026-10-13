/**
 * Recovery on the next load: the restore at the start picks this tab's own entry or the newest,
 * claims it, opens it into the session and adopts it. The earlier page loads are real writers over
 * real sessions; the environment is faked: the store underneath (and its faults), a clock the test
 * moves, and locks. A page load that died takes its locks with it, so every load gets fresh locks
 * unless the test says two loads are alive at once.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver, lockName } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { PageSource } from "../../src/autosave/recovery";
import type {
    AutosaveAvailable,
    AutosaveEntryMeta,
    AutosaveParts,
    AutosaveStore,
    AutosaveWrite,
} from "../../src/autosave/types";
import { faultAutosaveStore } from "../../src/testing/faultAutosaveStore";
import { baseSession, sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.recovery";

const STYLE = {
    name: "Dept 1 in orange",
    target: "node",
    selector: { match: "expression", where: "data.dept == `1`" },
    set: { "node.color": "#ff9900" },
} as const;

/** One page load: a session, its writer and its environment. */
interface Load {
    readonly session: GraphSession;
    readonly saver: Autosaver;
    readonly clock: FakeClock;
    readonly locks: FakeLocks;
    readonly available: AutosaveAvailable[];
}

/**
 * A page load over an empty session (its data is held until the restore is decided).
 * @param store - The origin's store.
 * @param locks - The origin's locks; fresh ones when every earlier load is gone.
 * @returns The load.
 */
function load(store: AutosaveStore, locks = new FakeLocks()): Load {
    const session = sessionWithRuns();
    const clock = new FakeClock();
    const saver = new Autosaver({ key: KEY, session, store, clock, locks });
    const available: AutosaveAvailable[] = [];
    saver.onAvailable((each) => available.push(each));
    return { session, saver, clock, locks, available };
}

/**
 * An earlier page load that wrote an entry and then went away.
 * @param store - The origin's store.
 * @param edit - The work it did.
 * @returns The entry it wrote, and the session it wrote from.
 */
async function earlier(
    store: AutosaveStore,
    edit: (session: GraphSession) => Promise<unknown>,
): Promise<{ id: string; session: GraphSession }> {
    const session = await baseSession();
    const saver = new Autosaver({ key: KEY, session, store, clock: new FakeClock(), locks: new FakeLocks() });
    await edit(session);
    await saver.flush();
    assert.strictEqual(saver.status.state, "saved");
    const id = saver.status.entry ?? "";
    saver.stop();
    return { id, session };
}

/**
 * The document a fresh whole save writes now, leaving the save point alone.
 * @param session - The session.
 * @returns The document.
 */
async function saveOf(session: GraphSession): Promise<unknown> {
    return JSON.parse((await session.project.save({ markSaved: false })).text) as unknown;
}

/**
 * An entry exactly as the store holds it.
 * @param store - The store.
 * @param id - The entry.
 * @returns Its meta and parts.
 */
async function raw(
    store: AutosaveStore,
    id: string,
): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined> {
    return structuredClone(await store.read(id));
}

/**
 * Rows the page assigns, replacing the graph.
 * @param names - The node ids.
 * @returns The source and the load that applies it.
 */
function rows(names: string[]): { source: PageSource; apply: (session: GraphSession) => () => Promise<void> } {
    const nodes = names.map((id) => ({ id }));
    return {
        source: { kind: "rows", nodes },
        apply: (session) => async () => {
            await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes }) } });
        },
    };
}

describe("choosing what to restore", () => {
    it("restores the newest entry into a fresh load, as it was saved", async () => {
        const store = memoryAutosaveStore();
        const { id, session: before } = await earlier(store, async (session) => {
            await session.config.set({ name: "Project" });
            await session.styles.add(STYLE);
            session.notes.add({ text: "kept", targets: [{ node: "a" }] });
        });

        const page = load(store);
        const restored = await page.saver.recover();

        assert.strictEqual(restored?.entry.id, id);
        assert.strictEqual(restored?.copiedFrom, null);
        assert.deepStrictEqual(await saveOf(page.session), await saveOf(before));
        assert.strictEqual(page.saver.restored, restored);
        assert.strictEqual(page.saver.status.entry, id, "the load keeps writing the entry it restored");
        assert.strictEqual((await store.list(KEY)).length, 1, "a restore makes no new entry");
        assert.strictEqual((await store.read(id))?.meta.restoreAttempts, 0, "the attempt is confirmed");
    });

    it("two loads claiming at once restore each entry exactly once", async () => {
        const store = memoryAutosaveStore();
        const first = await earlier(store, (session) => session.config.set({ name: "First" }));
        const second = await earlier(store, (session) => session.config.set({ name: "Second" }));

        // Two tabs reloading together share the origin's locks.
        const locks = new FakeLocks();
        const a = load(store, locks);
        const b = load(store, locks);
        const [ra, rb] = await Promise.all([a.saver.recover(), b.saver.recover()]);

        assert.sameMembers([ra?.entry.id, rb?.entry.id], [first.id, second.id]);
        assert.sameMembers([a.session.project.name, b.session.project.name], ["First", "Second"]);
    });

    it("this tab's own entry wins over a newer one another tab wrote", async () => {
        const store = memoryAutosaveStore();
        const own = await earlier(store, (session) => session.config.set({ name: "Mine" }));
        await earlier(store, (session) => session.config.set({ name: "Newer, from another tab" }));

        const page = load(store);
        const restored = await page.saver.recover({ own: own.id });

        assert.strictEqual(restored?.entry.id, own.id);
        assert.strictEqual(page.session.project.name, "Mine");
        assert.strictEqual(restored?.others, 1, "the other tab's unsaved work is counted");
    });

    it("an own entry another tab holds is copied, never shared", async () => {
        const store = memoryAutosaveStore();
        const own = await earlier(store, (session) => session.config.set({ name: "Mine" }));
        await earlier(store, (session) => session.config.set({ name: "Newer" }));
        const before = await raw(store, own.id);

        // A duplicated tab: the other tab is alive and writing the entry.
        const locks = new FakeLocks();
        locks.holdElsewhere(lockName(KEY, own.id));
        const page = load(store, locks);
        const restored = await page.saver.recover({ own: own.id });

        assert.strictEqual(restored?.copiedFrom, own.id);
        assert.notStrictEqual(restored?.entry.id, own.id);
        assert.strictEqual(page.session.project.name, "Mine", "never an unrelated entry");
        assert.deepStrictEqual(await raw(store, own.id), before, "the held entry is untouched");
        assert.strictEqual((await store.list(KEY)).length, 3);

        await page.session.styles.add(STYLE);
        await page.saver.flush();
        assert.strictEqual(page.saver.status.entry, restored?.entry.id, "the copy is written");
        assert.deepStrictEqual(await raw(store, own.id), before);
    });

    it("the newest entry held by a live tab is reported, not restored", async () => {
        const store = memoryAutosaveStore();
        const { id } = await earlier(store, (session) => session.config.set({ name: "Open elsewhere" }));
        const locks = new FakeLocks();
        locks.holdElsewhere(lockName(KEY, id));
        const page = load(store, locks);

        assert.isNull(await page.saver.recover());
        assert.deepStrictEqual(
            page.available.map((each) => [each.entry.id, each.reason, each.entry.live]),
            [[id, "held-by-other-tab", true]],
        );
    });

    it("manual restore reports the newest entry and restores nothing", async () => {
        const store = memoryAutosaveStore();
        const { id } = await earlier(store, (session) => session.config.set({ name: "Project" }));
        const page = load(store);

        assert.isNull(await page.saver.recover({ restore: "manual" }));
        assert.deepStrictEqual(
            page.available.map((each) => [each.entry.id, each.reason]),
            [[id, "manual"]],
        );
        assert.strictEqual(page.session.data.snapshot().nodeCount, 0);
    });
});

describe("a restore that does not finish", () => {
    it("two restores that never confirm make the third load skip the entry and report restore-failed", async () => {
        const memory = memoryAutosaveStore();
        const { id } = await earlier(memory, (session) => session.config.set({ name: "Heavy" }));

        // The page dies while opening: the confirmation commit arrives and never lands.
        let confirming: () => void = () => undefined;
        const dying: AutosaveStore = Object.assign(Object.create(memory) as AutosaveStore, {
            commit: (writes: readonly AutosaveWrite[], options?: Parameters<AutosaveStore["commit"]>[1]) => {
                if (writes.some((write) => write.meta.restoreAttempts === 0)) {
                    confirming();
                    return new Promise<void>(() => {
                        // Killed: never settles.
                    });
                }

                return memory.commit(writes, options);
            },
        });
        for (const attempt of [1, 2]) {
            const reached = new Promise<void>((resolve) => {
                confirming = resolve;
            });
            void load(dying).saver.recover();
            await reached;
            // The attempt was on disk before the restore opened anything.
            assert.strictEqual((await memory.read(id))?.meta.restoreAttempts, attempt, `load ${attempt} recorded it`);
        }

        const before = await raw(memory, id);
        const third = load(memory);
        assert.isNull(await third.saver.recover());
        assert.deepStrictEqual(
            third.available.map((each) => [each.entry.id, each.reason, each.problem]),
            [[id, "restore-failed", { code: "E_AUTOSAVE_RESTORE_CRASHED", params: { attempts: 2 } }]],
        );
        assert.deepStrictEqual(await raw(memory, id), before, "nothing deleted or rewritten");
        assert.strictEqual(third.session.data.snapshot().nodeCount, 0, "the page loads without it");
    });
});

describe("what comes back", () => {
    it("restores the entry's dirty flag and revision, and continues from them", async () => {
        const store = memoryAutosaveStore();
        const { id } = await earlier(store, async (session) => {
            await session.config.set({ name: "Project" });
            await session.styles.add(STYLE);
            session.notes.add({ text: "unsaved", targets: [{ node: "a" }] });
        });
        const meta = (await store.read(id))?.meta;
        assert.strictEqual(meta?.revision, 3);
        assert.strictEqual(meta?.dirty, true);

        const page = load(store);
        const restored = await page.saver.recover();
        assert.strictEqual(restored?.revision, 3);
        assert.strictEqual(page.saver.status.revision, 3);
        assert.isTrue(page.session.project.dirty, "work never saved to a file stays unsaved");
        assert.isTrue(page.saver.status.unexported);

        await page.session.styles.add(STYLE);
        await page.session.undo();
        assert.isTrue(page.session.project.dirty, "undo back to the restored state is still unsaved");

        await page.session.config.set({ name: "Renamed" });
        await page.saver.flush();
        assert.strictEqual(page.saver.status.revision, 6);
        assert.strictEqual((await store.read(id))?.meta.revision, 6);
    });

    it("a restored run comes back without a write, and is not the reader's change", async () => {
        const memory = memoryAutosaveStore();
        const first = rows(["a", "b", "c"]);
        const visit = load(memory);
        await visit.saver.recover();
        await visit.saver.admit(first.source, first.apply(visit.session));
        await visit.session.runs.start("degree", undefined, { as: "links", style: false });
        await visit.saver.settled();
        const id = visit.saver.status.entry ?? "";
        visit.saver.stop();

        const store = faultAutosaveStore(memory);
        const reload = load(store);
        const restored = await reload.saver.recover();
        await reload.saver.settled();
        assert.strictEqual(restored?.entry.id, id);
        assert.deepStrictEqual(
            [...reload.session.runs.list()].map((run) => run.id),
            ["links"],
        );
        assert.strictEqual(store.commitCalls, 2, "only the attempt and its confirmation");
        assert.strictEqual(reload.saver.status.state, "saved");
        assert.strictEqual(await reload.saver.admit(first.source, first.apply(reload.session)), "absorbed");
    });

    it("a clean entry comes back clean", async () => {
        const store = memoryAutosaveStore();
        await earlier(store, async (session) => {
            await session.config.set({ name: "Saved" });
            await session.project.save();
        });
        const page = load(store);
        await page.saver.recover();
        assert.isFalse(page.session.project.dirty);
    });

    it("brings the stash back", async () => {
        const store = memoryAutosaveStore();
        const session = await baseSession();
        const saver = new Autosaver({ key: KEY, session, store, clock: new FakeClock(), locks: new FakeLocks() });
        saver.stash("org.example.draft", { text: "half a sentence" });
        await saver.flush();
        saver.stop();

        const page = load(store);
        await page.saver.recover();
        assert.deepStrictEqual(page.saver.stashed("org.example.draft"), { text: "half a sentence" });
    });

    it("an older-format entry is rewritten whole in one strict commit", async () => {
        const memory = memoryAutosaveStore();
        const { id, session: before } = await earlier(memory, (session) => session.config.set({ name: "Old" }));
        const entry = await memory.read(id);
        await memory.commit([
            {
                id,
                expectedGen: Number(entry?.meta.gen),
                meta: { ...entry?.meta, formatVersion: 0 } as AutosaveEntryMeta,
                parts: {},
            },
        ]);

        const durability: (string | undefined)[] = [];
        const store: AutosaveStore = Object.assign(Object.create(memory) as AutosaveStore, {
            commit: (writes: readonly AutosaveWrite[], options?: Parameters<AutosaveStore["commit"]>[1]) => {
                if (Object.keys(writes[0]?.parts ?? {}).length > 0) {
                    durability.push(options?.durability);
                }

                return memory.commit(writes, options);
            },
        });
        const page = load(store);
        await page.saver.recover();
        await page.saver.settled();

        const after = await memory.read(id);
        assert.strictEqual(after?.meta.formatVersion, 1);
        assert.deepStrictEqual(durability, ["strict"], "one write carried the parts, and it was strict");
        assert.deepStrictEqual(await saveOf(page.session), await saveOf(before));
        assert.strictEqual(page.saver.status.state, "saved");
    });
});

describe("the page's own data and settings", () => {
    it("absorbs a same-source load; a different source replaces the work; the next reload absorbs it", async () => {
        const store = memoryAutosaveStore();
        const first = rows(["a", "b"]);

        // The first visit: the page loads its rows, and the reader changes something.
        const visit = load(store);
        await visit.saver.recover();
        assert.strictEqual(await visit.saver.admit(first.source, first.apply(visit.session)), "applied");
        await visit.saver.flush();
        assert.strictEqual((await store.list(KEY)).length, 0, "the page's own data starts no entry");
        await visit.session.config.set({ name: "Edited" });
        await visit.saver.flush();
        const id = visit.saver.status.entry ?? "";
        visit.saver.stop();

        // A reload: the same rows arrive again and are absorbed.
        const reload = load(store);
        await reload.saver.recover();
        let ran = false;
        assert.strictEqual(
            await reload.saver.admit(first.source, async () => {
                ran = true;
                await first.apply(reload.session)();
            }),
            "absorbed",
        );
        assert.isFalse(ran);
        await reload.saver.flush();
        assert.strictEqual(reload.session.project.name, "Edited");
        assert.deepStrictEqual(
            (await store.list(KEY)).map((meta) => meta.id),
            [id],
            "no new entry",
        );
        reload.saver.stop();

        // The page now serves different rows: they replace the work, which stays listed.
        const second = rows(["x", "y", "z"]);
        const changed = load(store);
        await changed.saver.recover();
        assert.strictEqual(await changed.saver.admit(second.source, second.apply(changed.session)), "applied");
        await changed.saver.flush();
        assert.deepStrictEqual(
            changed.available.map((each) => [each.entry.id, each.reason]),
            [[id, "page-data-changed"]],
        );
        assert.strictEqual(changed.session.data.snapshot().nodeCount, 3);
        const metas = await store.list(KEY);
        assert.strictEqual(metas.find((meta) => meta.id === id)?.ended, "replaced");
        const replacement = changed.saver.status.entry;
        assert.notStrictEqual(replacement, id);
        changed.saver.stop();

        // The next reload restores the new entry and absorbs the same new rows.
        const next = load(store);
        assert.strictEqual((await next.saver.recover())?.entry.id, replacement);
        assert.strictEqual(await next.saver.admit(second.source, second.apply(next.session)), "absorbed");
        await next.saver.flush();
        assert.strictEqual((await store.list(KEY)).length, 2, "reloads pile up no entries");
    });

    it("keeps a change the reader makes while a page load is still finishing", async () => {
        const store = memoryAutosaveStore();
        const page = load(store);
        await page.saver.recover();
        const first = rows(["a", "b"]);
        // The load's rows are in, but its promise has not settled (a large graph still being drawn)
        // when the reader's change runs: it must not be taken for part of the load.
        await page.saver.admit(first.source, async () => {
            await first.apply(page.session)();
            await page.session.config.set({ name: "Edited while loading" });
            await page.session.styles.add(STYLE);
        });
        await page.saver.flush();
        assert.strictEqual(page.saver.status.state, "saved");
        assert.isNotNull(page.saver.status.entry, "the reader's change started an entry");
        assert.strictEqual(page.saver.status.revision, 2, "each of the reader's changes counted once");
        page.saver.stop();

        const reload = load(store);
        await reload.saver.recover();
        assert.strictEqual(reload.session.config.name, "Edited while loading");
    });

    it("a page load alone, however long it takes to finish, starts no entry", async () => {
        const store = memoryAutosaveStore();
        const page = load(store);
        await page.saver.recover();
        const first = rows(["a", "b"]);
        await page.saver.admit(first.source, first.apply(page.session));
        await page.saver.flush();
        assert.isNull(page.saver.status.entry);
        assert.deepStrictEqual(await store.list(KEY), []);
    });

    it("a load after the reader's first change is not absorbed", async () => {
        const store = memoryAutosaveStore();
        const first = rows(["a", "b"]);
        const visit = load(store);
        await visit.saver.recover();
        await visit.saver.admit(first.source, first.apply(visit.session));
        await visit.session.config.set({ name: "Edited" });
        await visit.saver.flush();
        visit.saver.stop();

        const reload = load(store);
        await reload.saver.recover();
        await reload.session.config.set({ name: "Edited again" });
        assert.strictEqual(await reload.saver.admit(first.source, first.apply(reload.session)), "applied");
    });

    it("names the page settings that changed since the entry was written", async () => {
        const store = memoryAutosaveStore();
        const visit = load(store);
        await visit.saver.recover({ pageConfig: { layout: "circular", theme: { dark: true } } });
        await visit.saver.admit(rows(["a"]).source, rows(["a"]).apply(visit.session));
        await visit.session.config.set({ name: "Edited" });
        await visit.saver.flush();
        visit.saver.stop();

        const unchanged = load(store);
        assert.deepStrictEqual(
            (await unchanged.saver.recover({ pageConfig: { theme: { dark: true }, layout: "circular" } }))
                ?.pageOverrides,
            [],
        );
        unchanged.saver.stop();

        const changed = load(store);
        assert.deepStrictEqual(
            (await changed.saver.recover({ pageConfig: { layout: "ngraph", theme: { dark: true } } }))?.pageOverrides,
            ["layout"],
        );
    });
});

describe("entries that cannot be restored", () => {
    it("a newer-format entry and a corrupt one stay byte for byte, and are reported", async () => {
        const memory = memoryAutosaveStore();
        const newer = await earlier(memory, (session) => session.config.set({ name: "From a newer deploy" }));
        const corrupt = await earlier(memory, (session) => session.config.set({ name: "Torn" }));
        const before = [await raw(memory, newer.id), await raw(memory, corrupt.id)];

        const store = faultAutosaveStore(memory);
        store.newerFormat(newer.id, 2);
        store.corruptPart(corrupt.id, "rest");
        const page = load(store);

        assert.isNull(await page.saver.recover());
        assert.deepStrictEqual(
            page.available.map((each) => [each.entry.id, each.reason, each.problem?.code]),
            [
                [corrupt.id, "restore-failed", "E_BAD_DOCUMENT"],
                [newer.id, "restore-failed", "E_AUTOSAVE_FORMAT_NEWER"],
            ],
        );
        assert.deepStrictEqual(page.available[1]?.problem?.params, { formatVersion: 2 });
        assert.deepStrictEqual([await raw(memory, newer.id), await raw(memory, corrupt.id)], before);
        assert.strictEqual(store.commitCalls, 0, "nothing was written");
    });
});

describe("a listing that does not return", () => {
    it("resolves ready with null and writes nothing until a later listing succeeds", async () => {
        const memory = memoryAutosaveStore();
        await earlier(memory, (session) => session.config.set({ name: "Behind a stuck database" }));
        let stuck = true;
        const store = faultAutosaveStore(
            Object.assign(Object.create(memory) as AutosaveStore, {
                list: (key: string) =>
                    stuck
                        ? new Promise<readonly AutosaveEntryMeta[]>(() => {
                              // A wedged database: never answers.
                          })
                        : memory.list(key),
            }),
        );
        const page = load(store);

        const ready = page.saver.recover();
        page.clock.advance(3000);
        assert.isNull(await ready);
        assert.deepStrictEqual(page.saver.status.problem, {
            code: "E_AUTOSAVE_STALLED",
            params: { afterMs: 3000, step: "list" },
        });
        assert.strictEqual(page.saver.status.state, "failing");

        // The held page data loads; the reader works; nothing may be written yet.
        await page.session.data.addNodes([{ id: "n" }]);
        page.clock.advance(500);
        page.clock.goIdle();
        page.clock.advance(3000);
        await page.saver.settled();
        assert.strictEqual(store.commitCalls, 0);
        assert.strictEqual(page.saver.status.state, "failing");

        stuck = false;
        await page.session.config.set({ name: "Later" });
        await page.saver.flush();
        assert.strictEqual(store.commitCalls, 1);
        assert.strictEqual(page.saver.status.state, "saved");
        assert.strictEqual((await memory.list(KEY)).length, 2, "the stuck entry is still there, beside the new one");
    });

    it("restores the work when the listing is only held up by a blocked main thread", async () => {
        const memory = memoryAutosaveStore();
        await earlier(memory, (session) => session.config.set({ name: "Behind a long frame" }));
        let answer = (): void => undefined;
        let asked = (): void => undefined;
        const listing = new Promise<void>((resolve) => {
            asked = resolve;
        });
        const store = faultAutosaveStore(
            Object.assign(Object.create(memory) as AutosaveStore, {
                list: (key: string) =>
                    new Promise<readonly AutosaveEntryMeta[]>((resolve) => {
                        answer = () => {
                            void memory.list(key).then(resolve);
                        };
                        asked();
                    }),
            }),
        );
        const page = load(store);

        const ready = page.saver.recover();
        await listing;
        // A 5 s frame: the listing's timer and its answer both wait behind it; the timer runs first.
        page.clock.block(5000);
        page.clock.advance(0);
        answer();
        const restored = await ready;
        assert.isNotNull(restored, "the work was restored");
        assert.isNull(page.saver.status.problem);
    });
});
