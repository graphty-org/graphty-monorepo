/**
 * The autosave writer over a real session and the memory store, with the environment faked: a
 * clock the test moves, locks shared like a browser's, and a store that fails on demand. Every
 * assertion counts writes or reads the store back; none measures time.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { Autosaver, type AutosaverOptions, lockName } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { reassemble, stashOf } from "../../src/autosave/parts";
import type { AutosaveEntryMeta, AutosaveStore, AutosaveWrite } from "../../src/autosave/types";
import { dispatcherOf, laneOf } from "../../src/session/GraphSession";
import { type FaultAutosaveStore, faultAutosaveStore } from "../../src/testing/faultAutosaveStore";
import { baseSession } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.autosave";

/** A store that records every commit it was handed, and every close. */
interface Recorded extends FaultAutosaveStore {
    readonly log: (readonly AutosaveWrite[])[];
    closes: number;
}

/**
 * The fault store over the memory store, recording commits.
 * @param inner - The store underneath.
 * @returns The recording store.
 */
function recorded(inner: AutosaveStore = memoryAutosaveStore()): Recorded {
    const faults = faultAutosaveStore(inner);
    const log: (readonly AutosaveWrite[])[] = [];
    const store: Recorded = Object.assign(Object.create(faults) as FaultAutosaveStore, {
        log,
        closes: 0,
        commit: (writes: readonly AutosaveWrite[], options?: Parameters<AutosaveStore["commit"]>[1]) => {
            log.push(writes);
            return faults.commit(writes, options);
        },
        close: () => {
            store.closes += 1;
            return faults.close();
        },
    });
    return store;
}

interface Setup {
    readonly session: GraphSession;
    readonly store: Recorded;
    readonly clock: FakeClock;
    readonly locks: FakeLocks;
    readonly saver: Autosaver;
}

/**
 * A writer over a small session.
 * @param options - Overrides.
 * @returns The parts.
 */
async function setup(options: Partial<AutosaverOptions> = {}): Promise<Setup> {
    const session = options.session ?? (await baseSession());
    const store = (options.store as Recorded | undefined) ?? recorded();
    const clock = (options.clock as FakeClock | undefined) ?? new FakeClock();
    const locks = (options.locks as FakeLocks | undefined) ?? new FakeLocks();
    const saver = new Autosaver({ key: KEY, ...options, session, store, clock, locks });
    return { session, store, clock, locks, saver };
}

/**
 * A setup whose entry is already written once, so the next change is an ordinary one.
 * @param options - Overrides.
 * @returns The parts.
 */
async function written(options: Partial<AutosaverOptions> = {}): Promise<Setup> {
    const parts = await setup(options);
    await parts.session.config.set({ name: "Project" });
    await parts.saver.flush();
    assert.strictEqual(parts.saver.status.state, "saved");
    return parts;
}

/**
 * An entry, put back together.
 * @param store - The store.
 * @param id - The entry.
 * @returns The document and the meta.
 */
async function entryOf(
    store: AutosaveStore,
    id: string | null,
): Promise<{ document: Record<string, unknown>; meta: AutosaveEntryMeta }> {
    assert.isNotNull(id, "the entry has been written");
    const entry = await store.read(id ?? "");
    assert.isDefined(entry, `entry ${id ?? "(none)"} is in the store`);
    const { meta, parts } = entry ?? { meta: {} as AutosaveEntryMeta, parts: {} };
    return { document: reassemble(meta, parts), meta };
}

/**
 * The document a fresh whole save writes now, leaving the save point alone.
 * @param session - The session.
 * @returns The document.
 */
async function saveOf(session: GraphSession): Promise<Record<string, unknown>> {
    return JSON.parse((await session.project.save({ markSaved: false })).text) as Record<string, unknown>;
}

/**
 * The part names one write carried for one entry.
 * @param writes - A commit.
 * @param id - The entry.
 * @returns The names, sorted.
 */
function partsOf(writes: readonly AutosaveWrite[], id: string | null): string[] {
    return Object.keys(writes.find((write) => write.id === id)?.parts ?? {}).sort();
}

const STYLE = {
    name: "Dept 1 in orange",
    target: "node",
    selector: { match: "expression", where: "data.dept == `1`" },
    set: { "node.color": "#ff9900" },
} as const;

describe("the schedule", () => {
    it("writes nothing until the first change", async () => {
        const { store, clock, saver } = await setup();
        clock.advance(60_000);
        clock.goIdle();
        await saver.settled();
        assert.strictEqual(store.commitCalls, 0);
        assert.strictEqual(saver.status.state, "saved");
        assert.isNull(saver.status.entry);
    });

    it("writes a burst of changes once, after the debounce", async () => {
        const { session, store, clock, saver } = await written();
        const before = store.commitCalls;
        for (const name of ["a", "b", "c", "d", "e"]) {
            await session.config.set({ name });
            clock.advance(100);
        }

        clock.advance(300);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before, "no write while the changes keep coming");
        assert.strictEqual(saver.status.state, "pending");
        clock.advance(100);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 1);
        assert.strictEqual(saver.status.state, "saved");
    });

    it("forces a write at the maximum wait while changes keep coming", async () => {
        const { session, store, clock, saver } = await written();
        const before = store.commitCalls;
        for (let at = 0; at < 2000; at += 400) {
            await session.config.set({ name: `n${at}` });
            clock.advance(400);
            await saver.settled();
        }

        assert.strictEqual(store.commitCalls, before + 1, "one forced write, with no quiet half second");
        assert.strictEqual((await entryOf(store, saver.status.entry)).document.name, "n1600");
    });

    it("writes a change to the data when the page is idle", async () => {
        const { session, store, clock, saver } = await written();
        const before = store.commitCalls;
        await session.data.addNodes([{ id: "d", dept: 3 }]);
        clock.advance(5000);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before, "the debounce does not write the data");
        clock.goIdle();
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 1);
        assert.include(partsOf(store.log.at(-1) ?? [], saver.status.entry), "data");
    });

    it("writes a change to the data at dataMaxWaitMs when the page never goes idle", async () => {
        const { session, store, clock, saver } = await written({ dataMaxWaitMs: 10_000 });
        const before = store.commitCalls;
        await session.data.addNodes([{ id: "d", dept: 3 }]);
        await session.config.set({ name: "joins the data write" });
        clock.advance(9999);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before);
        clock.advance(1);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 1, "one write carries both changes");
        assert.deepStrictEqual(await saveOf(saver.session), (await entryOf(store, saver.status.entry)).document);
    });

    it("schedules exactly one more write for a change made during a write", async () => {
        const { session, store, clock, saver } = await written();
        const before = store.commitCalls;
        await session.config.set({ name: "first" });
        const held = store.hold();
        clock.advance(500);
        await held.reached;
        await session.config.set({ name: "during" });
        clock.advance(500);
        held.release();
        await saver.settled();
        clock.advance(5000);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 2);
        assert.strictEqual((await entryOf(store, saver.status.entry)).document.name, "during");
        assert.strictEqual(saver.status.state, "saved");
    });

    it("writes a finished run at once", async () => {
        const { session, store, saver } = await written();
        const before = store.commitCalls;
        await session.runs.start("degree", undefined, { as: "links", style: false });
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 1, "no timer had to fire");
        assert.include(partsOf(store.log.at(-1) ?? [], saver.status.entry), "run:links");
    });

    it("writes at layout rest and drag end, which change positions without a command", async () => {
        const { session, store, clock, saver } = await written();
        const before = store.commitCalls;
        laneOf(session).write(0, 7, 8, 9);
        dispatcherOf(session).arrangement.rest();
        clock.advance(500);
        await saver.settled();
        assert.deepStrictEqual(partsOf(store.log.at(-1) ?? [], saver.status.entry), ["arrangement"]);

        laneOf(session).write(1, 1, 2, 3);
        dispatcherOf(session).arrangement.seal();
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(store.commitCalls, before + 2);
        assert.deepStrictEqual(await saveOf(session), (await entryOf(store, saver.status.entry)).document);
    });

    it("flush writes at once, with the positions and the selection when asked", async () => {
        const { session, store, saver } = await written();
        await session.selection.apply({ nodes: ["b"], edges: [] });
        await saver.flush(true);
        assert.deepStrictEqual(partsOf(store.log.at(-1) ?? [], saver.status.entry), ["arrangement", "rest"]);
        assert.deepStrictEqual(await saveOf(session), (await entryOf(store, saver.status.entry)).document);
    });

    it("writes the stash on its own part", async () => {
        const { store, clock, saver } = await written();
        saver.stash("org.example.draft", { text: "half a note" });
        clock.advance(500);
        await saver.settled();
        assert.deepStrictEqual(partsOf(store.log.at(-1) ?? [], saver.status.entry), ["stash"]);
        const entry = await store.read(saver.status.entry ?? "");
        assert.deepStrictEqual(stashOf(entry?.parts ?? {}).get("org.example.draft"), { text: "half a note" });
        assert.deepStrictEqual(saver.stashed("org.example.draft"), { text: "half a note" });
    });
});

describe("the parts a change writes", () => {
    it("a style edit writes no data part and builds no node or edge records", async () => {
        const { session, store, clock, saver } = await written();
        const nodes = vi.spyOn(session.data, "nodes");
        const edges = vi.spyOn(session.data, "edges");
        await session.styles.add(STYLE);
        clock.advance(500);
        await saver.settled();
        assert.deepStrictEqual(partsOf(store.log.at(-1) ?? [], saver.status.entry), ["rest"]);
        assert.strictEqual(nodes.mock.calls.length, 0);
        assert.strictEqual(edges.mock.calls.length, 0);
    });

    it("a change to the graph writes every part", async () => {
        const { session, store, clock, saver } = await written();
        await session.runs.start("degree", undefined, { as: "links", style: false });
        await saver.settled();
        await session.data.addNodes([{ id: "d", dept: 3 }]);
        clock.goIdle();
        await saver.settled();
        assert.deepStrictEqual(partsOf(store.log.at(-1) ?? [], saver.status.entry), [
            "arrangement",
            "data",
            "rest",
            "run:links",
            "sources",
            "stash",
        ]);
    });

    it("a removed run removes its part", async () => {
        const { session, store, clock, saver } = await written();
        await session.runs.start("degree", undefined, { as: "links", style: false });
        await saver.settled();
        session.runs.remove("links");
        clock.advance(500);
        await saver.settled();
        const entry = await store.read(saver.status.entry ?? "");
        assert.notProperty(entry?.parts ?? {}, "run:links");
        assert.deepStrictEqual(await saveOf(session), (await entryOf(store, saver.status.entry)).document);
    });
});

/** Each way the project is replaced, from the session's own API. */
const BOUNDARIES: Record<string, (session: GraphSession) => Promise<unknown>> = {
    "project.open": async (session) => {
        const other = createGraphSession();
        await other.data.addNodes([{ id: "x" }, { id: "y" }]);
        const { text } = await other.project.save();
        other.dispose();
        return session.project.open(text, { discard: true });
    },
    "a replacing load": (session) =>
        session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "p" }, { id: "q" }], edges: [] }) },
        }),
    "data.clear": (session) => session.data.clear(),
    "data.setSource": (session) =>
        session.execute({
            op: "data.setSource",
            source: { type: "json", name: "elsewhere", config: { url: "https://example.org/other.json" } },
        }),
};

describe("project boundaries", () => {
    for (const [path, cross] of Object.entries(BOUNDARIES)) {
        it(`${path} ends the old entry in the new entry's first commit`, async () => {
            const { session, store, clock, saver } = await written();
            const old = saver.status.entry;
            await session.styles.add(STYLE);
            const before = await saveOf(session);
            const commitsBefore = store.log.length;

            await cross(session);
            clock.advance(60_000);
            clock.goIdle();
            await saver.flush();

            const entries = await store.list(KEY);
            assert.strictEqual(entries.length, 2, "the old entry and the new one");
            const now = saver.status.entry;
            assert.notStrictEqual(now, old);
            const oldEntry = await entryOf(store, old);
            assert.strictEqual(oldEntry.meta.ended, "replaced");
            assert.deepStrictEqual(oldEntry.document, before, "the old entry keeps the work it replaced");
            assert.deepStrictEqual((await entryOf(store, now)).document, await saveOf(session));

            const after = store.log.slice(commitsBefore);
            const first = after.findIndex((writes) => writes.some((write) => write.id === now));
            assert.isAtLeast(first, 0);
            const ending = after[first].find((write) => write.id === old);
            assert.strictEqual(ending?.meta.ended, "replaced", "ended in the new entry's first commit");
            assert.isFalse(
                after.slice(0, first).some((writes) => writes.some((write) => write.meta.ended !== undefined)),
                "never ended before the new entry exists",
            );
        });
    }

    it("a rename of the source is not a boundary", async () => {
        const { session, saver, store } = await setup();
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes: [{ id: "a" }] }) } });
        await saver.flush();
        await session.data.renameSource("Renamed");
        await saver.flush();
        assert.strictEqual((await store.list(KEY)).length, 1);
    });

    it("clearing the history and disposing the session do not end the entry", async () => {
        const { session, store, clock, saver } = await written();
        session.history.clear();
        await session.styles.add(STYLE);
        await saver.flush();
        const id = saver.status.entry;
        session.notes.add({ text: "unwritten when the session goes", targets: [{ node: "a" }] });
        session.dispose();
        clock.advance(60_000);
        clock.goIdle();
        await saver.settled();
        saver.stop();
        const entries = await store.list(KEY);
        assert.deepStrictEqual(
            entries.map((meta) => [meta.id, meta.ended]),
            [[id, undefined]],
        );
        assert.strictEqual(saver.status.state, "off");
    });
});

describe("fencing", () => {
    it("rejects a stale held write; the entry holds one writer's state and the other's work moves", async () => {
        const store = recorded();
        const clock = new FakeClock();
        const locks = new FakeLocks();
        const a = await written({ store, clock, locks });
        const id = a.saver.status.entry;
        const meta = (await store.read(id ?? ""))?.meta;

        // A second tab took the entry over (A lost its lock while frozen), from the same state.
        const sessionB = createGraphSession();
        await sessionB.project.open((await a.session.project.save({ markSaved: false })).text);
        const b = await setup({ session: sessionB, store, clock, locks });
        b.saver.adopt(meta ?? ({} as AutosaveEntryMeta));

        a.session.notes.add({ text: "written by A", targets: [{ node: "a" }] });
        const held = store.hold();
        clock.advance(500);
        await held.reached;

        await sessionB.styles.add(STYLE);
        await b.saver.flush();

        held.release();
        await a.saver.settled();

        assert.deepStrictEqual(
            (await entryOf(store, id)).document,
            await saveOf(sessionB),
            "the entry holds B's state alone",
        );
        const moved = a.saver.status.entry;
        assert.notStrictEqual(moved, id, "A moved to a new entry");
        assert.deepStrictEqual((await entryOf(store, moved)).document, await saveOf(a.session), "A's work is whole");
        assert.strictEqual(a.saver.status.state, "saved");
    });
});

describe("the back/forward cache", () => {
    it("releases the lock at once on entering it, and resume and pageshow together take it back once", async () => {
        const { saver, locks } = await written();
        const id = saver.status.entry ?? "";
        const name = lockName(KEY, id);
        assert.isTrue((await locks.held()).has(name), "a writing page holds its entry's lock");

        saver.releaseLockNow();
        assert.isFalse((await locks.held()).has(name), "the lock is released before the page is frozen");

        // Chrome sends `resume` and `pageshow` back to back; both reclaim.
        await Promise.all([saver.reclaim(), saver.reclaim()]);
        assert.strictEqual(saver.status.entry, id, "the page keeps its own entry");
        assert.isTrue((await locks.held()).has(name), "and holds its lock again");
    });
});

describe("failures", () => {
    it("an aborted write carrying the data leaves its parts unwritten; the next write carries them", async () => {
        const { session, store, clock, saver } = await written();
        const committed = await entryOf(store, saver.status.entry);
        store.abortDataWrites();
        await session.data.addNodes([{ id: "d", dept: 3 }]);
        clock.goIdle();
        await saver.settled();
        assert.deepStrictEqual(saver.status.problem, { code: "E_AUTOSAVE_FAILED", params: { name: "AbortError" } });
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, committed.document);

        store.abortDataWrites(false);
        await session.styles.add(STYLE);
        clock.goIdle();
        await saver.settled();
        assert.include(partsOf(store.log.at(-1) ?? [], saver.status.entry), "data");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
        assert.isNull(saver.status.problem);
    });

    it("a full quota is retried once after retention, then reported; the next change recovers", async () => {
        const { session, store, clock, saver } = await written();
        const committed = await entryOf(store, saver.status.entry);
        store.quota(2);
        await session.styles.add(STYLE);
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.problem?.code, "E_AUTOSAVE_QUOTA");
        assert.strictEqual(saver.status.state, "failing");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, committed.document);

        await session.config.set({ name: "room again" });
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a stuck write is aborted by the watchdog, the store reopened and the write retried once", async () => {
        const { session, store, clock, saver } = await written();
        const calls = store.commitCalls;
        store.stall();
        await session.styles.add(STYLE);
        clock.advance(500);
        clock.advance(10_000);
        await vi.waitFor(() => {
            assert.strictEqual(store.commitCalls, calls + 2, "the retry reached the store");
        });
        assert.deepStrictEqual(saver.status.problem, {
            code: "E_AUTOSAVE_STALLED",
            params: { afterMs: 10_000, step: "write" },
        });
        clock.advance(10_000);
        await saver.settled();
        assert.strictEqual(store.closes, 1, "reopened once");
        assert.strictEqual(store.commitCalls, calls + 2, "retried once, not again");
        assert.strictEqual(saver.status.state, "failing");

        store.heal();
        await session.config.set({ name: "unstuck" });
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a write held up by a blocked main thread is never called stalled", async () => {
        const inner = memoryAutosaveStore();
        let hold = false;
        let release = (): void => undefined;
        let reached = (): void => undefined;
        const arrived = new Promise<void>((resolve) => {
            reached = resolve;
        });
        const store: AutosaveStore = {
            list: (key) => inner.list(key),
            read: (id) => inner.read(id),
            remove: (id) => inner.remove(id),
            commit: async (writes, options) => {
                if (hold) {
                    reached();
                    await new Promise<void>((resolve) => {
                        release = resolve;
                    });
                }

                return inner.commit(writes, options);
            },
        };
        const { session, clock, saver } = await written({ store });
        hold = true;
        await session.styles.add(STYLE);
        clock.advance(500);
        await arrived;
        // A 27 s frame: the watchdog's timer and the store's callbacks both wait behind it, and
        // the timer gets its turn first, late.
        clock.block(27_000);
        clock.advance(0);
        assert.isNull(saver.status.problem, "a late watchdog is not a stall");
        release();
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a slow write that keeps making progress is never called stalled", async () => {
        const inner = memoryAutosaveStore();
        let slow = false;
        let progress: (() => void) | undefined;
        let release = (): void => undefined;
        let reached = (): void => undefined;
        const arrived = new Promise<void>((resolve) => {
            reached = resolve;
        });
        const store: AutosaveStore = {
            list: (key) => inner.list(key),
            read: (id) => inner.read(id),
            remove: (id) => inner.remove(id),
            commit: async (writes, options) => {
                if (slow) {
                    // A page whose main thread is busy: every step of the write waits a long frame.
                    progress = options?.onProgress;
                    reached();
                    await new Promise<void>((resolve) => {
                        release = resolve;
                    });
                }

                return inner.commit(writes, options);
            },
        };
        const { session, clock, saver } = await written({ store });
        slow = true;
        await session.styles.add(STYLE);
        clock.advance(500);
        await arrived;
        assert.isDefined(progress, "the writer asks the store to report progress");
        for (let step = 0; step < 4; step++) {
            clock.advance(9_000);
            progress?.();
        }

        assert.isNull(saver.status.problem, "36 s in all, never 10 s without progress: not stalled");
        release();
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a lost connection is reopened once, then reported; the next change recovers", async () => {
        const { session, store, clock, saver } = await written();
        store.loseConnection();
        await session.styles.add(STYLE);
        clock.advance(500);
        await saver.settled();
        assert.deepStrictEqual(saver.status.problem, { code: "E_AUTOSAVE_CONNECTION_LOST", params: {} });
        assert.strictEqual(store.closes, 1);

        store.heal();
        await session.config.set({ name: "back" });
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a transaction the browser aborts is written again at once, with no change needed", async () => {
        const inner = memoryAutosaveStore();
        let aborts = 0;
        let closes = 0;
        const store: AutosaveStore = {
            list: (key) => inner.list(key),
            read: (id) => inner.read(id),
            remove: (id) => inner.remove(id),
            close: () => {
                closes++;
                return Promise.resolve();
            },
            commit: (writes, options) =>
                aborts-- > 0
                    ? Promise.reject(new DOMException("The transaction was aborted", "AbortError"))
                    : inner.commit(writes, options),
        };
        const { session, clock, saver } = await written({ store });
        aborts = 1;
        await session.styles.add(STYLE);
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved", "the aborted write was retried");
        assert.isNull(saver.status.problem);
        assert.strictEqual(closes, 1, "the connection was reopened for the retry");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a part too large to build is reported; the next change recovers", async () => {
        const { session, store, clock, saver } = await written();
        const committed = await entryOf(store, saver.status.entry);
        const toDocument = vi.spyOn(session.styles, "toDocument").mockImplementationOnce(() => {
            throw new RangeError("Invalid string length");
        });
        await session.styles.add(STYLE);
        clock.advance(500);
        await saver.settled();
        assert.deepStrictEqual(saver.status.problem, { code: "E_AUTOSAVE_TOO_LARGE", params: { part: "rest" } });
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, committed.document);
        toDocument.mockRestore();

        await session.config.set({ name: "smaller" });
        clock.advance(500);
        await saver.settled();
        assert.strictEqual(saver.status.state, "saved");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, await saveOf(session));
    });

    it("a run that throws midway changes neither the model nor the entry", async () => {
        const { session, store, clock, saver } = await written();
        const before = await saveOf(session);
        let threw = false;
        try {
            await session.transaction("Half done", async (tx) => {
                await tx.styles.add(STYLE);
                await tx.config.set({ name: "half" });
                throw new Error("the operation failed midway");
            });
        } catch {
            threw = true;
        }

        assert.isTrue(threw);
        clock.advance(60_000);
        clock.goIdle();
        await saver.flush();
        assert.deepStrictEqual(await saveOf(session), before, "the model is unchanged");
        assert.deepStrictEqual((await entryOf(store, saver.status.entry)).document, before, "so is the entry");
    });
});

describe("retention", () => {
    it("never deletes a dirty, held, own or newest entry", async () => {
        const store = recorded();
        const locks = new FakeLocks();
        const old = (id: string, extra: Record<string, unknown>): AutosaveWrite => ({
            id,
            expectedGen: 0,
            meta: { id, key: KEY, gen: 0, seq: 0, formatVersion: 1, dirty: false, ...extra },
            parts: {},
        });
        await store.commit([old("clean", {})]);
        await store.commit([old("clean-ended", { ended: "replaced" })]);
        await store.commit([old("dirty", { dirty: true })]);
        await store.commit([old("held", {})]);
        await store.commit([old("newer-format", { formatVersion: 2 })]);
        locks.holdElsewhere(lockName(KEY, "held"));

        const { session, saver } = await setup({ store, locks, keep: 2 });
        await session.config.set({ name: "mine" });
        await saver.flush();

        const left = (await store.list(KEY)).map((meta) => meta.id);
        assert.sameMembers(left, ["dirty", "held", "newer-format", saver.status.entry ?? ""]);
    });

    it("deletes only beyond keep, ended entries first", async () => {
        const store = recorded();
        const old = (id: string, extra: Record<string, unknown>): AutosaveWrite => ({
            id,
            expectedGen: 0,
            meta: { id, key: KEY, gen: 0, seq: 0, formatVersion: 1, dirty: false, ...extra },
            parts: {},
        });
        await store.commit([old("oldest", {})]);
        await store.commit([old("ended", { ended: "replaced" })]);
        await store.commit([old("recent", {})]);

        const { session, saver } = await setup({ store, keep: 3 });
        await session.config.set({ name: "mine" });
        await saver.flush();

        assert.sameMembers(
            (await store.list(KEY)).map((meta) => meta.id),
            ["oldest", "recent", saver.status.entry ?? ""],
        );
    });
});

describe("status", () => {
    it("is told on every change of state, and reports the revision and the dirty flag", async () => {
        const { session, clock, saver } = await setup();
        const states: string[] = [];
        saver.onStatus((status) => {
            if (states.at(-1) !== status.state) {
                states.push(status.state);
            }
        });
        await session.config.set({ name: "one" });
        await session.styles.add(STYLE);
        clock.goIdle();
        await saver.settled();
        assert.deepStrictEqual(states, ["pending", "saved"]);
        assert.strictEqual(saver.status.revision, 2);
        assert.isTrue(saver.status.unexported);
        assert.isString(saver.status.savedAt);
    });
});

describe("timeline playback", () => {
    it("writes nothing while time plays, and once after the pause", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "csv",
            config: { data: "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,E,2026-01-04\n" },
        });
        const { store, clock, saver } = await written({ session });
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.setSettings({ step: "day" });
        await saver.flush();
        const before = store.log.length;

        const steps: number[] = [];
        await new Promise<void>((resolve) => {
            session.on("time:step", (step) => {
                steps.push(step.index);
                // Every timer autosave could have armed falls due between two steps.
                clock.advance(60_000);
            });
            session.on("time:pause", () => {
                resolve();
            });
            session.time.play({ interval: 0 });
        });

        assert.isAbove(steps.length, 2);
        assert.strictEqual(store.log.length, before, "no write while playing");
        clock.advance(60_000);
        await vi.waitFor(() => {
            assert.strictEqual(store.log.length, before + 1, "one write after the pause");
        });
        session.dispose();
    });
});
