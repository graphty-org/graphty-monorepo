/**
 * A network source's preview, paging a chosen load, the change check and refresh through
 * `session.data`, and the features `sourceDescriptors()` lists: a preview reads a capped few rows
 * and changes nothing; `more({ load })` pages that load; a refresh applies only the difference as
 * one undoable step and reports zeros for a source that has not changed.
 */

import { assert, describe, it } from "vitest";

import { sourceDescriptors } from "../../../catalog";
import {
    createGraphSession,
    credentials,
    defineSource,
    type GraphSession,
    type GraphtyError,
    registerSource,
    replayFetch,
} from "../../../session";
import ndexRecordings from "../../../stories/fixtures/sources/ndex-wp5483.json";

const DEMO = "https://demo.neo4jlabs.com:7473";
const MOVIES_QUERY = "MATCH (m:Movie)<-[r]-(p) RETURN m, r, p";

/** The people a mutable source serves; a test changes it between a load and a refresh. */
let people: { id: string; name: string; knows: string[] }[] = [];

registerSource(
    defineSource({
        id: "people-live",
        descriptor: { plainName: "People (live)", params: [] },
        records: () =>
            Promise.resolve({
                nodes: people.map((p) => ({ id: p.id, name: p.name })),
                edges: people.flatMap((p) => p.knows.map((k) => ({ source: p.id, target: k }))),
            }),
    }),
);

// The same people, written into the sink with a content hash, so a load records what a check compares.
registerSource(
    defineSource({
        id: "people-hashed",
        descriptor: { plainName: "People (hashed)", params: [], features: ["validate"] },
        import(_params, sink, ctx) {
            for (const p of people) {
                sink.addNode(p.id);
            }
            ctx.report.counts.nodes += people.length;
            return Promise.resolve(ctx.finish({ validators: { contentHash: JSON.stringify(people) } }));
        },
        validate: (_params, seen) => {
            const hash = JSON.stringify(people);
            return Promise.resolve({
                status: seen.contentHash === hash ? ("current" as const) : ("changed" as const),
                via: "hash" as const,
                validators: { contentHash: hash },
            });
        },
    }),
);

// Pages of three people a load reads one at a time, by cursor.
registerSource(
    defineSource({
        id: "people-pages",
        descriptor: { plainName: "People (pages)", params: [], features: ["page"] },
        async *records(params: { prefix?: string }, ctx) {
            const prefix = params.prefix ?? "p";
            for (let page = Number(ctx.cursor?.page ?? 0); page < 3; page++) {
                yield await Promise.resolve({
                    nodes: [0, 1, 2].map((i) => ({ id: `${prefix}${String(page * 3 + i)}` })),
                    next: page < 2 ? { page: page + 1 } : null,
                });
            }
        },
    }),
);

// The pages again, behind a login its one sample publishes for everyone.
registerSource(
    defineSource({
        id: "people-public",
        descriptor: {
            plainName: "People (public login)",
            params: [],
            features: ["page"],
            authRequired: "required",
            auth: ["basic"],
            defaultEndpoint: "https://people.example.com",
            samples: [
                {
                    id: "people-public-sample",
                    plainName: "People",
                    params: {},
                    publicLogin: { username: "u", password: "p" },
                },
            ],
        },
        async *records(_params: Record<string, unknown>, ctx) {
            for (let page = Number(ctx.cursor?.page ?? 0); page < 2; page++) {
                yield await Promise.resolve({
                    nodes: [{ id: `q${String(page)}` }],
                    next: page < 1 ? { page: page + 1 } : null,
                });
            }
        },
    }),
);

/**
 * A Neo4j Query API node.
 * @param id - its element id
 * @param label - its label
 * @param name - its name property
 * @returns the node, as the Query API encodes it
 */
function neoNode(id: string, label: string, name: string): unknown {
    const value = Object.fromEntries([
        ["_element_id", id],
        ["_labels", [label]],
        ["_properties", { name: { $type: "String", _value: name } }],
    ]);
    return { $type: "Node", _value: value };
}

/**
 * The Neo4j demo's answer to the movies query capped at `rows` rows: one person and one movie per
 * row, so the rows name twice as many nodes as there are rows.
 * @param rows - the cap the statement must carry
 * @returns the recording
 */
function cappedMovies(rows: number): Parameters<typeof replayFetch>[0][number] {
    const values = Array.from({ length: rows }, (_, i) => [
        neoNode(`4:m:${String(i)}`, "Movie", `Movie ${String(i)}`),
        {
            $type: "Relationship",
            _value: Object.fromEntries([
                ["_element_id", `5:r:${String(i)}`],
                ["_start_node_element_id", `4:p:${String(i)}`],
                ["_end_node_element_id", `4:m:${String(i)}`],
                ["_type", "ACTED_IN"],
                ["_properties", {}],
            ]),
        },
        neoNode(`4:p:${String(i)}`, "Person", `Person ${String(i)}`),
    ]);
    return {
        method: "POST",
        url: `${DEMO}/db/movies/query/v2`,
        requestBody: JSON.stringify({
            statement: `CALL {\n${MOVIES_QUERY}\n}\nRETURN * LIMIT ${String(rows)}`,
            parameters: {},
            accessMode: "Read",
        }),
        status: 202,
        headers: { "content-type": "application/vnd.neo4j.query.v1.1" },
        body: { data: { fields: ["m", "r", "p"], values } },
    };
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

describe("data.previewSource", () => {
    it("previews the Neo4j demo with the cap sent to the server, loading nothing", async () => {
        await withSession(async (session) => {
            const fetch = replayFetch([cappedMovies(25)]);
            const preview = await session.data.previewSource(
                { source: "neo4j", config: { database: "movies", query: MOVIES_QUERY } },
                { endpoint: DEMO, credential: credentials.basic("movies", "movies"), fetch },
            );
            assert.strictEqual(fetch.calls.length, 1, "the capped statement matched the one recording");
            assert.strictEqual(preview.nodes.length, 25);
            assert.isTrue(preview.edges.length > 0);
            const kept = new Set(preview.nodes.map((row) => String(row.id)));
            assert.isTrue(preview.edges.every((e) => kept.has(String(e.source)) && kept.has(String(e.target))));
            assert.isTrue(preview.more);
            assert.include(
                preview.columns.filter((c) => c.kind === "node").map((c) => c.name),
                "name",
            );
            assert.strictEqual(preview.facts.product, "Neo4j");
            assert.deepInclude(preview.serverFacts, { code: "source.product", params: { value: "Neo4j" } });
            assert.strictEqual(preview.rows.length, 25);
            assert.isTrue(preview.rows.every((row) => typeof row.name === "string"));
            assert.isFalse(
                preview.columns.some((c) => c.name.startsWith("_source.")),
                "no bookkeeping column in a preview",
            );
            // nothing changed: no rows, no step, no record
            assert.strictEqual(session.data.nodes().length, 0);
            assert.strictEqual(session.history.steps.length, 0);
            assert.strictEqual(session.data.loads().length, 0);
        });
    });

    it("takes a smaller cap, and says when the source holds no more", async () => {
        people = [
            { id: "a", name: "Ana", knows: ["b"] },
            { id: "b", name: "Bo", knows: [] },
        ];
        await withSession(async (session) => {
            const small = await session.data.previewSource({ source: "people-live", config: {} }, { maxNodes: 1 });
            assert.strictEqual(small.nodes.length, 1);
            assert.strictEqual(small.edges.length, 0);
            assert.isTrue(small.more);
            const whole = await session.data.previewSource({ source: "people-live", config: {} });
            assert.strictEqual(whole.nodes.length, 2);
            assert.isFalse(whole.more);
            assert.deepEqual(whole.issues, []);
        });
    });
});

describe("sourceDescriptors() features", () => {
    it("lists expand, more and refresh from what each source declares", () => {
        const byId = new Map(sourceDescriptors().map((entry) => [entry.id, entry.features]));
        assert.deepEqual(byId.get("neo4j"), { expand: true, more: true, refresh: true });
        assert.deepEqual(byId.get("ndex"), { expand: true, more: false, refresh: true });
        assert.deepEqual(byId.get("sparql"), { expand: true, more: true, refresh: true });
        assert.deepEqual(byId.get("people-pages"), { expand: false, more: true, refresh: true });
    });

    it("an NDEx load is whole: nothing to page", async () => {
        await withSession(async (session) => {
            const fetch = replayFetch(ndexRecordings);
            await session.data.import(
                { source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" } },
                { fetch },
            );
            const [load] = session.data.loads();
            assert.isNull(load.next);
            assert.strictEqual(load.total, session.data.nodes().length);
            const steps = session.history.steps.length;
            await session.data.more({ load: load.key, fetch });
            assert.strictEqual(session.history.steps.length, steps, "more on a whole load does nothing");
        });
    });
});

describe("data.more({ load })", () => {
    it("pages the chosen load, not the newest", async () => {
        await withSession(async (session) => {
            const capped = { limits: { maxNodes: 3, onLimit: "stop" as const } };
            await session.data.import({ source: "people-pages", config: { prefix: "a" } }, capped);
            await session.data.import(
                { source: "people-pages", config: { prefix: "b" } },
                { ...capped, mode: "merge" },
            );
            const [first, second] = session.data.loads();
            assert.strictEqual(session.data.nodes().length, 6);
            await session.data.more({ load: first.key });
            const after = new Map(session.data.loads().map((load) => [load.key, load.pages]));
            assert.strictEqual(after.get(first.key), 2);
            assert.strictEqual(after.get(second.key), 1);
            // the load's own cap applies again: one more page of three
            assert.strictEqual(session.data.nodes().length, 9);
            assert.isTrue(session.data.nodes().some((n) => n.id === "a3"));
        });
    });

    it("adds the page to the load's own source entry, not a second one", async () => {
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-pages", config: {}, name: "People" },
                { limits: { maxNodes: 3, onLimit: "stop" } },
            );
            const [before] = session.data.sources();
            await session.data.more({ load: before.loadKey });
            const after = session.data.sources();
            assert.strictEqual(after.length, 1);
            assert.strictEqual(after[0].key, before.key);
            assert.strictEqual(after[0].name, "People");
            assert.deepEqual(after[0].counts, { nodes: 6, edges: 0 });
            assert.deepEqual(after[0].added, { nodes: 6, edges: 0 });
            await session.undo();
            assert.deepEqual(session.data.sources()[0].counts, { nodes: 3, edges: 0 });
        });
    });

    it("pages a sample with the login it publishes, with nothing remembered", async () => {
        await withSession(async (session) => {
            await session.data.loadSample("people-public-sample", { limits: { maxNodes: 1, onLimit: "stop" } });
            assert.strictEqual(session.data.nodes().length, 1);
            await session.data.more({ load: session.data.loads()[0].key });
            assert.strictEqual(session.data.nodes().length, 2);
        });
    });

    it("refuses a key no load has", async () => {
        await withSession(async (session) => {
            const error = await session.data.more({ load: "load-9" }).then(
                () => null,
                (e: unknown) => e as GraphtyError,
            );
            assert.strictEqual(error?.code, "E_SOURCE_UNKNOWN");
        });
    });
});

describe("data.checkSource and data.refresh", () => {
    it("reports zero changes for an unchanged source and dispatches nothing", async () => {
        people = [
            { id: "a", name: "Ana", knows: ["b"] },
            { id: "b", name: "Bo", knows: ["c"] },
            { id: "c", name: "Cy", knows: [] },
        ];
        await withSession(async (session) => {
            await session.data.import({ source: "people-live", config: {} });
            const [load] = session.data.loads();
            assert.deepEqual(await session.data.checkSource(load.key), { changed: null }, "no validators recorded yet");
            const steps = session.history.steps.length;
            const report = await session.data.refresh(load.key);
            assert.deepEqual(report, {
                added: { nodes: 0, edges: 0 },
                removed: { nodes: 0, edges: 0 },
                updated: { nodes: 0, edges: 0 },
                fact: { code: "I_SOURCE_UNCHANGED", params: { added: [0, 0], removed: [0, 0], updated: [0, 0] } },
            });
            assert.strictEqual(session.history.steps.length, steps);
        });
    });

    it("applies the difference as one undoable step", async () => {
        people = [
            { id: "a", name: "Ana", knows: ["b"] },
            { id: "b", name: "Bo", knows: ["c"] },
            { id: "c", name: "Cy", knows: [] },
        ];
        await withSession(async (session) => {
            await session.data.import({ source: "people-live", config: {} });
            const [load] = session.data.loads();
            const steps = session.history.steps.length;
            // c goes (and b-c with it), a is renamed, d arrives with a-d
            people = [
                { id: "a", name: "Ann", knows: ["b", "d"] },
                { id: "b", name: "Bo", knows: [] },
                { id: "d", name: "Di", knows: [] },
            ];
            const report = await session.data.refresh(load.key);
            assert.deepEqual(report, {
                added: { nodes: 1, edges: 1 },
                removed: { nodes: 1, edges: 1 },
                updated: { nodes: 1, edges: 0 },
                fact: { code: "I_SOURCE_REFRESHED", params: { added: [1, 1], removed: [1, 1], updated: [1, 0] } },
            });
            assert.strictEqual(session.history.steps.length, steps + 1);
            assert.strictEqual(session.history.steps.at(-1)?.fact.code, "data.replace-source");
            const ids = session.data
                .nodes()
                .map((n) => String(n.id))
                .sort();
            assert.deepEqual(ids, ["a", "b", "d"]);
            assert.strictEqual(session.data.node("a")?.name, "Ann");
            assert.strictEqual(session.data.edges().length, 2);
            assert.deepEqual(
                session.data.loads().map((l) => l.key),
                [load.key],
                "still one load",
            );
            assert.strictEqual(session.data.sources().length, 1, "the new rows count under the load's own entry");

            await session.undo();
            assert.deepEqual(
                session.data
                    .nodes()
                    .map((n) => String(n.id))
                    .sort(),
                ["a", "b", "c"],
            );
            assert.strictEqual(session.data.node("a")?.name, "Ana");
        });
    });

    it("checks a source with a cheap check without loading", async () => {
        people = [{ id: "a", name: "Ana", knows: [] }];
        await withSession(async (session) => {
            await session.data.import({ source: "people-hashed", config: {} });
            const [load] = session.data.loads();
            assert.deepEqual(await session.data.checkSource(load.key), { changed: false });
            people = [{ id: "a", name: "Ann", knows: [] }];
            const steps = session.history.steps.length;
            assert.deepEqual(await session.data.checkSource(load.key), { changed: true });
            assert.strictEqual(session.data.nodes().length, 1, "a check loads nothing");
            assert.strictEqual(session.history.steps.length, steps);
        });
    });

    it("answers null for a source that cannot check", async () => {
        await withSession(async (session) => {
            await session.data.import({ source: "people-pages", config: {} });
            assert.deepEqual(await session.data.checkSource(session.data.loads()[0].key), { changed: null });
        });
    });
});

describe("a load's own expand behavior", () => {
    it("is recorded with the load", async () => {
        people = [{ id: "a", name: "Ana", knows: [] }];
        await withSession(async (session) => {
            await session.data.import(
                { source: "people-live", config: {} },
                { expand: { trigger: "double-click", depth: 2 } },
            );
            assert.deepEqual(session.data.loads()[0].expand, { trigger: "double-click", depth: 2 });
        });
    });
});
