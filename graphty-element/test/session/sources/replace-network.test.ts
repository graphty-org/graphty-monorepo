/**
 * @file Seeing and editing a network load: `data.sourceSettings` shows what a load connects to and
 * fetches with every secret left out, and `data.replaceSource` with a network source reads the new
 * settings and replaces the load in place: same key, same styles, undoable, and a later refresh
 * still recognizes the rows it kept. The source is read in memory and records what it was asked.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, credentials, defineSource, type GraphSession, registerSource } from "../../../session";

/** The query each read of the source was given, in order. */
const asked: string[] = [];

/** The whole params each read was given, in order. */
const seen: Record<string, unknown>[] = [];

/** The node ids each query answers with: the source's whole content. */
const CONTENT: Readonly<Record<string, readonly string[]>> = { first: ["a", "b", "c"], second: ["b", "c", "d"] };

registerSource(
    defineSource({
        id: "edit-people",
        descriptor: {
            plainName: "People",
            defaultEndpoint: "https://people.example.test/",
            params: [{ name: "query", plainName: "Query", type: "query" }],
        },
        records: (params: Record<string, unknown>) => {
            const query = String(params.query);
            asked.push(query);
            seen.push(params);
            const ids = CONTENT[query] ?? [];
            return Promise.resolve({
                nodes: ids.map((id) => ({ id })),
                edges: ids.slice(1).map((id, at) => ({ source: ids[at], target: id })),
            });
        },
    }),
);

const sessions: GraphSession[] = [];

afterEach(() => {
    asked.length = 0;
    seen.length = 0;
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session with the first query loaded.
 * @returns the session and the load's key
 */
async function loaded(): Promise<{ session: GraphSession; key: string }> {
    const session = createGraphSession({ features: ["network-data"] });
    sessions.push(session);
    await session.data.import({ source: "edit-people", config: { query: "first" }, name: "My people" });
    return { session, key: session.data.sources()[0].key };
}

/**
 * The graph's node ids, sorted.
 * @param session - the session
 * @returns the ids
 */
function ids(session: GraphSession): string[] {
    return session.data
        .nodes()
        .map((node) => String(node.id))
        .sort();
}

describe("data.sourceSettings", () => {
    it("says what a load fetches, and nothing about a file", async () => {
        const { session, key } = await loaded();
        const settings = session.data.sourceSettings(key);
        assert.strictEqual(settings?.source, "edit-people");
        assert.deepEqual(settings?.config, { query: "first" });
        assert.strictEqual(settings?.endpoint, "https://people.example.test/");

        const file = createGraphSession();
        sessions.push(file);
        await file.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        assert.isUndefined(file.data.sourceSettings(file.data.sources()[0].key));
    });

    it("leaves out secret query params, a mapping's relative path secret and the credential", async () => {
        const session = createGraphSession({ features: ["network-data"] });
        sessions.push(session);
        await session.data.import(
            {
                source: "edit-people",
                config: {
                    query: "first",
                    link: "https://people.example.test/list?api_key=sekrit-one&page=1",
                    mapping: { requests: { nodes: { path: "/people?token=sekrit-two&page=1" } } },
                },
            },
            { credential: credentials.basic("reader", "sekrit-three") },
        );
        const text = JSON.stringify(session.data.sourceSettings(session.data.sources()[0].key));
        assert.notInclude(text, "sekrit");
        assert.notInclude(text, "reader");
        assert.include(text, "page=1");
    });
});

describe("data.replaceSource with a network source", () => {
    it("replaces the load in place, keeps its key and name, and Undo brings the old query back", async () => {
        const { session, key } = await loaded();
        await session.styles.addRow({ name: "Mine", target: "both", selector: { match: "everything" } });
        const layers = session.styles.list().length;

        const report = await session.data.replaceSource(key, { source: "edit-people", config: { query: "second" } });

        assert.deepEqual(ids(session), ["b", "c", "d"]);
        assert.strictEqual(report.nodes.added, 1);
        assert.strictEqual(report.nodes.removed, 1);
        assert.strictEqual(report.nodes.changed, 0, "unchanged rows are not reported as changed");
        const [entry] = session.data.sources();
        assert.strictEqual(entry.key, key);
        assert.strictEqual(entry.name, "My people");
        assert.deepEqual(session.data.sourceSettings(key)?.config, { query: "second" });
        assert.strictEqual(session.styles.list().length, layers);

        await session.undo();
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.deepEqual(session.data.sourceSettings(key)?.config, { query: "first" });
        asked.length = 0;
        const [restored] = session.data.sources();
        await session.data.refresh(restored.loadKey ?? "");
        assert.deepEqual(asked, ["first"], "a refresh after Undo reads the old query");
    });

    it("keeps the rows recognized: a refresh after the replace removes nothing", async () => {
        const { session, key } = await loaded();
        await session.data.replaceSource(key, { source: "edit-people", config: { query: "second" } });
        const [entry] = session.data.sources();
        const report = await session.data.refresh(entry.loadKey ?? "");
        assert.deepEqual(report.removed, { nodes: 0, edges: 0 });
        assert.deepEqual(report.added, { nodes: 0, edges: 0 });
        assert.deepEqual(ids(session), ["b", "c", "d"]);
    });

    it("saves one live load, and a reopened project waits only on that one", async () => {
        const { session, key } = await loaded();
        await session.data.replaceSource(key, { source: "edit-people", config: { query: "second" } });
        assert.lengthOf(session.data.loads(), 1);
        const { text } = await session.project.save();

        const reopened = createGraphSession({ features: ["network-data"] });
        sessions.push(reopened);
        await reopened.project.open(text);
        assert.lengthOf(reopened.data.loads(), 1);
        assert.deepEqual(reopened.data.sourceSettings(reopened.data.sources()[0].key)?.config, { query: "second" });
        assert.lengthOf(reopened.data.pendingSourceLoads(), 1);
        assert.deepEqual(reopened.data.pendingSourceLoads()[0].params, { query: "second" });
    });

    it("leaves the graph and the ledger as they were when the read fails", async () => {
        const { session, key } = await loaded();
        const records = session.data.loads().length;
        const failed = await session.data
            .replaceSource(key, { source: "edit-people", config: { query: "first" } }, { signal: AbortSignal.abort() })
            .then(
                () => false,
                () => true,
            );
        assert.isTrue(failed);
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.loads(), records);
    });
});

describe("two network loads that share nodes", () => {
    it("each shows and edits its own settings, and an edit leaves the other whole", async () => {
        const { session } = await loaded();
        await session.data.import(
            { source: "edit-people", config: { query: "second" }, name: "More people" },
            { mode: "merge" },
        );
        const [one, two] = session.data.sources();
        assert.notStrictEqual(one.loadKey, two.loadKey);
        assert.deepEqual(session.data.sourceSettings(one.key)?.config, { query: "first" });
        assert.deepEqual(session.data.sourceSettings(two.key)?.config, { query: "second" });

        await session.data.replaceSource(two.key, { source: "edit-people", config: { query: "first" } });
        const after = session.data.sources();
        assert.isDefined(after[0].loadKey, "the first load is still a network load");
        assert.deepEqual(session.data.sourceSettings(after[0].key)?.config, { query: "first" });
    });
});

describe("secrets in an edited load's params", () => {
    it("are never shown, and a load read again with what was shown keeps them", async () => {
        const session = createGraphSession({ features: ["network-data"] });
        sessions.push(session);
        await session.data.import({
            source: "edit-people",
            config: {
                query: "first",
                ...Object.fromEntries([["api_key", "top-secret"]]),
                link: "https://x.test/a?api_key=url-secret&page=1",
            },
        });
        const [{ key }] = session.data.sources();
        const shown = session.data.sourceSettings(key)?.config ?? {};
        assert.notInclude(JSON.stringify(shown), "secret");

        await session.data.replaceSource(key, { source: "edit-people", config: { ...shown, query: "second" } });
        const sent = seen.at(-1) ?? {};
        assert.strictEqual(sent.query, "second");
        assert.strictEqual(sent.api_key, "top-secret");
        assert.strictEqual(sent.link, "https://x.test/a?api_key=url-secret&page=1");
        assert.notInclude(JSON.stringify(session.data.sourceSettings(key)?.config), "secret");

        await session.data.replaceSource(key, {
            source: "edit-people",
            config: { ...shown, query: "first", link: "https://x.test/a?page=2" },
        });
        assert.strictEqual(seen.at(-1)?.link, "https://x.test/a?page=2&api_key=url-secret");
    });
});

registerSource(
    defineSource({
        id: "mode-people",
        descriptor: {
            plainName: "Moded people",
            defaultEndpoint: "https://moded.example.test/",
            params: [
                { name: "query", plainName: "Query", type: "query" },
                {
                    name: "mode",
                    plainName: "Mode",
                    type: "enum",
                    values: [
                        { value: "query", label: "Query" },
                        { value: "all", label: "Everything" },
                        { value: "neighborhood", label: "Seed nodes" },
                    ],
                },
                { name: "ids", plainName: "Seed ids", type: "node-id" },
            ],
        },
        records: (params: Record<string, unknown>) =>
            Promise.resolve({ nodes: [{ id: params.query === undefined ? "a" : "q" }], edges: [] }),
    }),
);

describe("a query source's settings", () => {
    it("say the mode it read in when its params leave it out", async () => {
        const session = createGraphSession({ features: ["network-data"] });
        sessions.push(session);
        await session.data.import({ source: "mode-people", config: { ids: ["a"] } });
        await session.data.import(
            { source: "mode-people", config: { query: "MATCH (n) RETURN n" } },
            { mode: "merge" },
        );
        const [seeds, query] = session.data.sources();
        assert.strictEqual(session.data.sourceSettings(seeds.key)?.config.mode, "all");
        assert.strictEqual(session.data.sourceSettings(query.key)?.config.mode, "query");
    });
});

describe("an edit that names the load", () => {
    it("renames it; one that does not keeps its name", async () => {
        const { session, key } = await loaded();
        await session.data.replaceSource(key, { source: "edit-people", config: { query: "first" } });
        assert.strictEqual(session.data.sources()[0].name, "My people");
        await session.data.replaceSource(key, { source: "edit-people", config: { query: "second" }, name: "Others" });
        assert.strictEqual(session.data.sources()[0].name, "Others");
    });
});
