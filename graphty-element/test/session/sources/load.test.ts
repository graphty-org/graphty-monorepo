/**
 * Loading from a network source through `session.data.import`: the source is read outside the
 * command with the credential, the rows go into one undoable `data.import-source` step, undo and
 * redo never fetch, no credential reaches anything the session records, and a saved project
 * reopens with its loads waiting and nothing fetched.
 */

import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    credentials,
    defineSource,
    type GraphSession,
    type GraphtyError,
    registerSource,
    replayFetch,
} from "../../../session";
import { attachCredentials } from "../../../src/session/sources/credentialLookup";
import peopleRecordings from "../../../stories/fixtures/sources/people.json";

const ENDPOINT = "https://people.example.com";
const SENTINEL = "SENTINEL-6f1c2a-never-recorded";

// The design's first custom source (section 4.1), registered once for every test here.
registerSource(
    defineSource({
        id: "people-load",
        descriptor: {
            plainName: "People",
            version: 2,
            params: [{ name: "team", plainName: "Team", type: "string", required: true }],
            migrateParams: (params, from) => (from === 1 ? { team: params.group } : params),
        },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
                `/api/people?team=${encodeURIComponent(params.team)}`,
            );
            return {
                nodes: rows.map((r) => ({ id: r.id, name: r.name })),
                edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
            };
        },
    }),
);

// A source that needs a credential, so a missing one is refused before any request.
registerSource(
    defineSource({
        id: "people-locked",
        descriptor: {
            plainName: "People (locked)",
            authRequired: "required",
            auth: ["bearer"],
            params: [{ name: "team", plainName: "Team", type: "string", required: true }],
        },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${encodeURIComponent(params.team)}`);
            return { nodes: rows.map((r) => ({ id: r.id })) };
        },
    }),
);

/**
 * A fetch answering from the people recordings, counting what it answered.
 * @returns the fetch
 */
function peopleFetch(): ReturnType<typeof replayFetch> {
    return replayFetch(peopleRecordings);
}

/**
 * Run a test against a fresh headless session, disposed afterwards.
 * @param body - the test
 * @returns settles when it is done
 */
async function withSession(body: (session: GraphSession) => Promise<void>): Promise<void> {
    const session = createGraphSession();
    try {
        await body(session);
    } finally {
        session.dispose();
    }
}

/**
 * What a promise rejects with.
 * @param work - the promise
 * @returns the error, or null when it resolved
 */
async function rejection(work: Promise<unknown>): Promise<GraphtyError | null> {
    return work.then(
        () => null,
        (error: unknown) => error as GraphtyError,
    );
}

describe("session.data.import from a network source", () => {
    it("loads the rows as one data.import-source step and records the load", async () => {
        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-load", config: { team: "core" }, name: "Core team" },
                { endpoint: ENDPOINT, fetch },
            );
            assert.strictEqual(session.data.nodes().length, 8);
            assert.strictEqual(session.data.edges().length, 13);
            assert.strictEqual(session.data.node("ana")?.name, "Ana");
            assert.strictEqual(fetch.calls.length, 1);
            const [step] = session.history.steps;
            assert.deepEqual(step.fact, {
                code: "data.import-source",
                params: { source: "people-load", name: "Core team" },
            });
            const [record] = session.data.loads();
            assert.strictEqual(record.source, "people-load");
            assert.strictEqual(record.version, 2);
            assert.deepEqual(record.config, { team: "core" });
            assert.strictEqual(record.endpoint, `${ENDPOINT}/`);
            assert.strictEqual(record.credential, null);
            assert.strictEqual(session.data.source()?.type, "source:people-load");
            assert.isDefined(session.data.node("ana")?.["_source.loads"], "the node keeps its source facts");
            assert.deepEqual(
                session.data.attributes().filter((column) => column.name.startsWith("_source.")),
                [],
                "the source facts are bookkeeping, not columns",
            );
        });
    });

    it("undoes and redoes with zero extra fetches", async () => {
        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch },
            );
            assert.strictEqual(fetch.calls.length, 1);
            await session.undo();
            assert.strictEqual(session.data.nodes().length, 0);
            await session.redo();
            assert.strictEqual(session.data.nodes().length, 8);
            await session.undo();
            await session.redo();
            assert.strictEqual(session.data.nodes().length, 8);
            assert.strictEqual(fetch.calls.length, 1, "undo and redo replay the rows and never fetch");
        });
    });

    it("keeps data.loads() in step with undo and redo", async () => {
        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch },
            );
            const [first] = session.data.loads();
            await session.data.import(
                { source: "people-load", config: { team: "core" }, name: "Again" },
                { endpoint: ENDPOINT, fetch },
            );
            const [second] = session.data.loads();
            assert.notStrictEqual(second.key, first.key, "a replacing load replaces the record");
            assert.lengthOf(session.data.loads(), 1);

            await session.undo();
            assert.deepEqual(
                session.data.loads().map((record) => record.key),
                [first.key],
                "undoing a replacing load brings back the load it replaced",
            );
            await session.undo();
            assert.deepEqual(session.data.loads(), [], "undoing the first load leaves no record");
            const { text } = await session.project.save();
            assert.notInclude(text, '"people-load"', "nor does the saved project offer it");

            await session.redo();
            assert.deepEqual(
                session.data.loads().map((record) => record.key),
                [first.key],
            );
            await session.redo();
            assert.deepEqual(
                session.data.loads().map((record) => record.key),
                [second.key],
            );
        });
    });

    it("writes _source.expansion none on every node a load brings", async () => {
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch: peopleFetch() },
            );
            for (const node of session.data.nodes()) {
                assert.strictEqual(node["_source.expansion"], "none", `node ${String(node.id)}`);
            }
        });
    });

    it("keeps a sentinel credential out of the journal, data.source(), events, the records and the project file", async () => {
        await withSession(async (session) => {
            const seen: unknown[] = [];
            const events = [
                "history:changed",
                "journal:appended",
                "progress:changed",
                "project:changed",
                "project:status",
            ] as const;
            const offs = events.map((event) => session.on(event, (detail: unknown) => seen.push(detail)));
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch, credential: credentials.bearer(SENTINEL), write: true },
            );
            assert.isTrue(fetch.calls[0].credential, "the credential was sent");
            const saved = await session.project.save();
            const places: Record<string, unknown> = {
                journal: session.journal.entries,
                source: session.data.source(),
                loads: session.data.loads(),
                history: session.history.steps,
                events: seen,
                project: saved.text,
            };
            for (const [where, value] of Object.entries(places)) {
                const text = typeof value === "string" ? value : JSON.stringify(value);
                assert.notInclude(text, SENTINEL, `the secret leaked into ${where}`);
                assert.notInclude(text, '"write"', `the write flag leaked into ${where}`);
            }
            const [record] = session.data.loads();
            assert.deepEqual(record.credential, { kind: "bearer", origin: ENDPOINT });
            for (const off of offs) {
                off();
            }
        });
    });

    it("updates the attributes of nodes already there with existing: update", async () => {
        await withSession(async (session) => {
            await session.data.addNodes([{ id: "ana", name: "old", keep: 1 }]);
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch, mode: "merge", existing: "update" },
            );
            assert.strictEqual(session.data.node("ana")?.name, "Ana");
            assert.strictEqual(session.data.node("ana")?.keep, 1);
        });
    });

    it("keeps the attributes of nodes already there by default", async () => {
        await withSession(async (session) => {
            await session.data.addNodes([{ id: "ana", name: "old" }]);
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch: peopleFetch(), mode: "merge" },
            );
            assert.strictEqual(session.data.node("ana")?.name, "old");
        });
    });
});

describe("credentials for a source load", () => {
    it("refuses a source that requires one before any request, with stored: false", async () => {
        await withSession(async (session) => {
            const fetch = peopleFetch();
            const error = await rejection(
                session.data.import(
                    { source: "people-locked", config: { team: "core" } },
                    { endpoint: ENDPOINT, fetch },
                ),
            );
            assert.strictEqual(error?.code, "E_SOURCE_AUTH");
            assert.strictEqual(error?.details.stored, false);
            assert.strictEqual(error?.details.origin, ENDPOINT);
            assert.strictEqual(fetch.calls.length, 0);
        });
    });

    it("uses the remembered credential for the origin, and says stored: true when it fails", async () => {
        await withSession(async (session) => {
            const asked: string[] = [];
            attachCredentials(session.data, (source, origin) => {
                asked.push(`${source} ${origin}`);
                return Promise.resolve(credentials.bearer("remembered"));
            });
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-locked", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch },
            );
            assert.deepEqual(asked, [`people-locked ${ENDPOINT}`]);
            assert.isTrue(fetch.calls[0].credential);
            assert.strictEqual(session.data.loads()[0].credential?.kind, "bearer");

            const error = await rejection(
                session.data.import(
                    { source: "people-locked", config: { team: "locked" } },
                    { endpoint: ENDPOINT, fetch, retry: false },
                ),
            );
            assert.strictEqual(error?.code, "E_SOURCE_AUTH");
            assert.strictEqual(error?.details.stored, true);
        });
    });
});

describe("a saved project with source loads", () => {
    it("reopens offline with its loads waiting, and fetches only when one is run", async () => {
        let text = "";
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch: peopleFetch(), credential: credentials.bearer(SENTINEL) },
            );
            ({ text } = await session.project.save());
        });
        assert.notInclude(text, SENTINEL);
        assert.include(text, '"graphty-sources"');

        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.project.open(text);
            assert.strictEqual(session.data.nodes().length, 8, "the rows render offline");
            const edges = session.data.edges().length;
            const pending = session.data.pendingSourceLoads();
            assert.strictEqual(pending.length, 1);
            assert.deepEqual(pending[0], {
                id: session.data.loads()[0].key,
                source: "people-load",
                endpoint: `${ENDPOINT}/`,
                hasQuery: false,
                isLocalNetwork: false,
                authRequired: "none",
                credentialSlot: "default",
            });
            assert.strictEqual(fetch.calls.length, 0, "opening fetched nothing");

            await session.data.runPendingSourceLoad(pending[0].id, { fetch });
            assert.strictEqual(fetch.calls.length, 1);
            assert.deepEqual(session.data.pendingSourceLoads(), []);
            assert.strictEqual(session.data.nodes().length, 8);
            assert.strictEqual(session.data.edges().length, edges, "a rerun adds no second copy of an edge");
            assert.deepEqual(session.data.nodes()[0]["_source.loads"], [session.data.loads()[0].key]);
            assert.strictEqual(session.data.loads().length, 1, "the load keeps its record and key");
        });
    });

    it("forgets the load records when the graph is cleared", async () => {
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch: peopleFetch() },
            );
            assert.strictEqual(session.data.loads().length, 1);
            await session.data.clear();
            assert.deepEqual(session.data.loads(), []);
            const { text } = await session.project.save();
            assert.notInclude(text, '"people-load"');
        });
    });

    it("upgrades an older record with migrateParams, and refuses a newer one as stale-params", async () => {
        let text = "";
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-load", config: { team: "core" } },
                { endpoint: ENDPOINT, fetch: peopleFetch() },
            );
            ({ text } = await session.project.save());
        });
        const part = (version: number, params: string): string =>
            `"source":{"id":"people-load","sourceVersion":${String(version)},"endpoint":"${ENDPOINT}/","params":${params}`;
        const record = part(2, '{"team":"core"}');
        assert.include(text, record);
        const older = text.replace(record, part(1, '{"group":"core"}'));
        const newer = text.replace(record, part(9, '{"team":"core"}'));

        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.project.open(older);
            const [{ id }] = session.data.pendingSourceLoads();
            await session.data.runPendingSourceLoad(id, { fetch });
            assert.strictEqual(fetch.calls.length, 1, "the migrated params asked for team=core");
        });

        await withSession(async (session) => {
            await session.project.open(newer);
            const [{ id }] = session.data.pendingSourceLoads();
            const error = await rejection(session.data.runPendingSourceLoad(id, { fetch: peopleFetch() }));
            assert.strictEqual(error?.code, "E_SOURCE_PARAM");
            assert.strictEqual(error?.details.reason, "stale-params");
        });
    });
});

describe("the rest of the source surface", () => {
    it("loads the next page after a capped load with data.more", async () => {
        registerSource(
            defineSource({
                id: "people-paged",
                async *records(_params: Record<string, never>, ctx) {
                    for (let page = Number(ctx.cursor?.page ?? 0); page < 3; page++) {
                        const rows = await ctx.fetchJson<{ id: string }[]>("/api/people?team=core");
                        yield {
                            nodes: rows.slice(page * 3, page * 3 + 3).map((r) => ({ id: r.id })),
                            next: page < 2 ? { page: page + 1 } : null,
                        };
                    }
                },
            }),
        );
        await withSession(async (session) => {
            const fetch = peopleFetch();
            await session.data.import(
                { source: "people-paged", config: {} },
                { endpoint: ENDPOINT, fetch, limits: { maxNodes: 3, onLimit: "stop" } },
            );
            const capped = session.data.nodes().length;
            assert.isBelow(capped, 8);
            assert.isNotNull(session.data.loads()[0].next);
            await session.data.more({ fetch });
            assert.isAbove(session.data.nodes().length, capped);
            assert.strictEqual(session.data.loads()[0].pages, 2);
        });
    });

    it("probes and lists through the source, changing nothing", async () => {
        registerSource(
            defineSource({
                id: "people-probe",
                records: () => Promise.resolve({ nodes: [] }),
                probe: () => Promise.resolve({ ok: true as const, counts: { nodes: 8 } }),
                list: () => Promise.resolve({ items: [{ params: { team: "core" }, name: "Core" }], next: null }),
            }),
        );
        await withSession(async (session) => {
            const probe = await session.data.testSource({ source: "people-probe", config: {} }, { endpoint: ENDPOINT });
            assert.deepEqual(probe, { ok: true, counts: { nodes: 8 } });
            const listing = await session.data.listSource(
                { source: "people-probe", config: {} },
                { search: "co" },
                { endpoint: ENDPOINT },
            );
            assert.strictEqual(listing.items[0].name, "Core");
            assert.strictEqual(session.history.steps.length, 0);
        });
    });
});
