/**
 * Autosave and the load records (design/documents/sources.md, "Writing" rule 6 and "Embedded data
 * and steps only" rule 4): a session loaded from a network source -- a real HTTP server on the
 * loopback address answering recorded responses -- autosaves its `graphty-sources` member, every
 * change to the records leaves that part unwritten, and recovery restores the records with nothing
 * fetched. The clock and the locks are faked; the session, the writer and the store are real.
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { defineSource, listSources, registerSource } from "@graphty/graph-io";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { reassemble } from "../../src/autosave/parts";
import type { AutosaveStore, AutosaveWrite } from "../../src/autosave/types";
import { sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.autosave-sources";
const SOURCE = "autosave-people";

/** The recorded responses, by path and query. */
const RECORDED: Readonly<Record<string, unknown>> = {
    "/people?page=0": [{ id: "ana" }, { id: "bo" }, { id: "cy" }],
    "/people?page=1": [{ id: "dee" }, { id: "eli" }],
    "/neighbors?id=ana": [{ id: "fay" }, { id: "gus" }],
};

let server: Server;
let endpoint = "";
/** Every request the server answered, in order. */
const requests: string[] = [];

beforeAll(async () => {
    server = createServer((request, response) => {
        const path = request.url ?? "";
        requests.push(path);
        const body = RECORDED[path];
        response.writeHead(body === undefined ? 404 : 200, { "content-type": "application/json" });
        response.end(JSON.stringify(body ?? {}));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;

    if (!listSources().some((info) => info.id === SOURCE)) {
        registerSource(
            defineSource({
                id: SOURCE,
                descriptor: { plainName: "People", params: [], features: ["expand"] },
                async *records(_params: Record<string, never>, ctx) {
                    for (let page = Number(ctx.cursor?.page ?? 0); page < 2; page++) {
                        const rows = await ctx.fetchJson<{ id: string }[]>(`/people?page=${String(page)}`);
                        yield { nodes: rows, next: page < 1 ? { page: page + 1 } : null };
                    }
                },
                async expand(request, sink, ctx) {
                    for (const id of request.ids) {
                        const rows = await ctx.fetchJson<{ id: string }[]>(
                            `/neighbors?id=${encodeURIComponent(String(id))}`,
                        );
                        sink.addNodeRecord(String(id), {});
                        for (const row of rows) {
                            sink.addNodeRecord(row.id, {});
                            sink.addEdgeRecord(String(id), row.id, {});
                        }
                    }

                    return ctx.finish({ next: null });
                },
            }),
        );
    }
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** A store that records every commit it was handed. */
interface Recorded extends AutosaveStore {
    readonly log: (readonly AutosaveWrite[])[];
}

/**
 * The memory store, recording commits.
 * @returns The store.
 */
function recorded(): Recorded {
    const inner = memoryAutosaveStore();
    const log: (readonly AutosaveWrite[])[] = [];
    return Object.assign(Object.create(inner) as AutosaveStore, {
        log,
        commit: (writes: readonly AutosaveWrite[], options?: Parameters<AutosaveStore["commit"]>[1]) => {
            log.push(writes);
            return inner.commit(writes, options);
        },
    });
}

/** One page load: a session and its writer. */
interface Page {
    readonly session: GraphSession;
    readonly saver: Autosaver;
}

/**
 * A page load writing to a store.
 * @param store - The store.
 * @returns The page.
 */
function page(store: AutosaveStore): Page {
    const session = sessionWithRuns();
    const saver = new Autosaver({ key: KEY, session, store, clock: new FakeClock(), locks: new FakeLocks() });
    return { session, saver };
}

/**
 * Load the source's first page, capped so a next page waits.
 * @param session - The session.
 * @returns Settles once loaded.
 */
async function loadPeople(session: GraphSession): Promise<void> {
    await session.data.import({ source: SOURCE, config: {} }, { endpoint, limits: { maxNodes: 3, onLimit: "stop" } });
}

/**
 * The text a whole save writes now, leaving the save point alone.
 * @param session - The session.
 * @returns The text.
 */
async function saveText(session: GraphSession): Promise<string> {
    return (await session.project.save({ markSaved: false })).text;
}

/**
 * The writer's entry, put back together as text.
 * @param store - The store.
 * @param saver - The writer.
 * @returns The text.
 */
async function entryText(store: AutosaveStore, saver: Autosaver): Promise<string> {
    const entry = await store.read(saver.status.entry ?? "");
    assert.isDefined(entry, "the entry is in the store");
    return JSON.stringify(reassemble(entry?.meta ?? { id: "" }, entry?.parts ?? {}));
}

/**
 * The part names the last commit carried.
 * @param store - The store.
 * @returns The names, sorted.
 */
function lastParts(store: Recorded): string[] {
    return Object.keys(store.log.at(-1)?.[0]?.parts ?? {}).sort();
}

/**
 * What recovery must bring back.
 * @param session - The session.
 * @returns Its loads, sources and pending loads.
 */
function recordsOf(session: GraphSession): unknown {
    return {
        loads: session.data.loads(),
        sources: session.data.sources(),
        pending: session.data.pendingSourceLoads(),
    };
}

/**
 * Load records without their keys, which an opened project renames to its entry ids.
 * @param loads - The records.
 * @returns The records, keys left out.
 */
function unkeyed(loads: ReturnType<GraphSession["data"]["loads"]>): unknown {
    return loads.map(({ key: _key, expansions, ...rest }) => ({
        ...rest,
        expansions: expansions.map(({ key: _x, ...expansion }) => expansion),
    }));
}

describe("autosave and the source records", () => {
    it("src-40: after a network load and an expansion the parts reassemble to project.save()'s text", async () => {
        const store = recorded();
        const before = page(store);
        await loadPeople(before.session);
        await before.session.data.expand(["ana"]);
        await before.saver.flush();

        assert.strictEqual(await entryText(store, before.saver), await saveText(before.session));
        before.saver.stop();
    });

    it("recovery restores the loads, sources and pending loads with zero fetches", async () => {
        const store = recorded();
        const before = page(store);
        await loadPeople(before.session);
        await before.session.data.expand(["ana"]);
        await before.saver.flush();
        before.saver.stop();
        // The saving tab's records, as a project file opened there would list them.
        const reopened = sessionWithRuns();
        await reopened.project.open(await saveText(before.session), { discard: true });

        const fetched = requests.length;
        const after = page(store);
        const restored = await after.saver.recover();

        assert.isNotNull(restored, "the entry was restored");
        assert.strictEqual(requests.length, fetched, "recovery fetched nothing");
        assert.lengthOf(after.session.data.loads(), 1);
        assert.lengthOf(after.session.data.loads()[0]?.expansions ?? [], 1);
        assert.deepStrictEqual(recordsOf(after.session), recordsOf(reopened));
        assert.lengthOf(after.session.data.pendingSourceLoads(), 1, "the network load waits for a refresh");
        // An opened load is keyed by its entry id; everything else it records is the saving tab's.
        assert.deepStrictEqual(unkeyed(after.session.data.loads()), unkeyed(before.session.data.loads()));
    });

    it("data.more, an expansion and a refresh rewrite the sources part; a style change does not touch data", async () => {
        const store = recorded();
        const { session, saver } = page(store);
        await loadPeople(session);
        await saver.flush();

        await session.data.more({ endpoint });
        await saver.flush();
        assert.include(lastParts(store), "sources", "data.more rewrote the sources part");
        assert.strictEqual(await entryText(store, saver), await saveText(session));

        await session.data.expand(["ana"]);
        await saver.flush();
        assert.include(lastParts(store), "sources", "the expansion rewrote the sources part");
        assert.strictEqual(await entryText(store, saver), await saveText(session));

        // A refresh that finds nothing new changes only the record: when it ran.
        const [load] = session.data.loads();
        const report = await session.data.refresh(load?.key ?? "", { endpoint });
        assert.strictEqual(report.fact.code, "I_SOURCE_UNCHANGED");
        await saver.flush();
        assert.include(lastParts(store), "sources", "the refresh rewrote the sources part");
        assert.strictEqual(await entryText(store, saver), await saveText(session));

        await session.config.set({ name: "Styled" });
        await saver.flush();
        assert.notInclude(lastParts(store), "data", "a change outside the graph leaves the data part alone");
        assert.notInclude(lastParts(store), "sources");
        saver.stop();
    });

    it("an undone network load leaves no record of it in the recovered session", async () => {
        const store = recorded();
        const before = page(store);
        await loadPeople(before.session);
        await before.saver.flush();
        await before.session.undo();
        await before.saver.flush();
        before.saver.stop();

        const after = page(store);
        assert.isNotNull(await after.saver.recover());
        assert.deepStrictEqual(after.session.data.loads(), []);
        assert.deepStrictEqual(after.session.data.pendingSourceLoads(), []);
        assert.notInclude(await saveText(after.session), SOURCE);
    });
});
