/**
 * @file `source:loaded`: every load door publishes one event per source it added, after the load
 * commits, with the kind `sources()` lists, the format, the ids and the caller's own `callerKey`,
 * and never a file name, URL or parameters. History moves, a project open and a waiting load run
 * again publish none.
 */

import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource, type SourceLoaded } from "../../session";

/** graph-samples' built dataset files, served the way graphty.app serves them. */
const DATA = resolve(__dirname, "../../../graph-samples/dist/data/v1");

const GRAPH = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });

// A network source with one example, answered by the fetch each test passes.
registerSource(
    defineSource({
        id: "loaded-people",
        descriptor: {
            plainName: "People",
            params: [],
            examples: [{ id: "loaded-demo", plainName: "The demo", params: { team: "SECRET_TEAM" } }],
        },
        async records(params: { team: string }, ctx) {
            return { nodes: await ctx.fetchJson<{ id: string }[]>(`https://people.example/${params.team}`) };
        },
    }),
);

/**
 * A fetch that answers two people.
 * @returns the fetch
 */
function people(): (input: string | URL | Request) => Promise<Response> {
    return () => Promise.resolve(Response.json([{ id: "p1" }, { id: "p2" }]));
}

/**
 * Collect every `source:loaded` a session publishes.
 * @param session - the session
 * @returns the events, in order
 */
function heard(session: GraphSession): SourceLoaded[] {
    const out: SourceLoaded[] = [];
    session.on("source:loaded", (loaded) => {
        out.push(loaded);
    });
    return out;
}

/**
 * Assert an event names a source `sources()` lists, with the same kind, and carries no contents.
 * @param session - the session
 * @param loaded - the event
 */
function agreesWithSources(session: GraphSession, loaded: SourceLoaded | undefined): void {
    const listed = session.data.sources().find((each) => each.key === loaded?.source);
    assert.isDefined(listed, "the event names a listed source");
    assert.strictEqual(loaded?.kind, listed?.kind, "the kind is the one sources() lists");
    for (const key of ["fileName", "url", "baseUrl", "params", "name", "config"]) {
        assert.notProperty(loaded, key);
    }
    assert.notInclude(JSON.stringify(loaded), "SECRET");
    assert.isTrue(Object.isFrozen(loaded));
}

describe("source:loaded from each load door", () => {
    it("import of inline text: kind file, its format and mode, and the caller's key", async () => {
        const session = createGraphSession();
        const events = heard(session);
        await session.data.import(
            { type: "json", name: "SECRET_NAME.json", config: { data: GRAPH } },
            { callerKey: "first" },
        );
        await session.data.import({ type: "json", config: { data: GRAPH } }, { mode: "merge" });

        assert.lengthOf(events, 2);
        assert.deepEqual(
            { ...events[0], source: undefined },
            { source: undefined, kind: "file", format: "json", mode: "replace", callerKey: "first" },
        );
        assert.deepInclude(events[1], { kind: "file", format: "json", mode: "merge" });
        assert.notProperty(events[1], "callerKey");
        agreesWithSources(session, events[0]);
        agreesWithSources(session, events[1]);
        session.dispose();
    });

    it("a draft's load echoes the key given to draft.load", async () => {
        const session = createGraphSession();
        const events = heard(session);
        const draft = await session.data.prepare({ type: "csv", config: { data: "source,target\na,b\n" } });
        await draft.load({ callerKey: "drafted" });

        assert.lengthOf(events, 1);
        assert.deepInclude(events[0], { kind: "file", format: "csv", mode: "replace", callerKey: "drafted" });
        agreesWithSources(session, events[0]);
        session.dispose();
    });

    it("a join onto the graph is kind join, merged, with the caller's key", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\nTP53,MDM2\n" } });
        const events = heard(session);
        const file = new File(["symbol,score\nTP53,2.5\n"], "SECRET_FILE.csv");
        const draft = await session.data.prepare({ config: { file } }, { onto: "graph" });
        await draft.load({ join: draft.suggestJoin(), callerKey: "joined" });

        assert.lengthOf(events, 1);
        assert.deepInclude(events[0], { kind: "join", mode: "merge", callerKey: "joined" });
        agreesWithSources(session, events[0]);
        session.dispose();
    });

    it("generate: kind sample with the generator's id and the caller's key, no params", async () => {
        const session = createGraphSession();
        const events = heard(session);
        await session.data.generate("cycle", { n: 5 }, { callerKey: "gen" });

        assert.lengthOf(events, 1);
        assert.deepEqual(
            { ...events[0], source: undefined },
            { source: undefined, kind: "sample", mode: "replace", sample: { generatorId: "cycle" }, callerKey: "gen" },
        );
        agreesWithSources(session, events[0]);
        session.dispose();
    });

    it("loadExample: kind server with the source id and the example id", async () => {
        const session = createGraphSession();
        const events = heard(session);
        await session.data.loadExample("loaded-people", "loaded-demo", { fetch: people(), callerKey: "ex" });

        assert.lengthOf(events, 1);
        assert.deepEqual(
            { ...events[0], source: undefined },
            {
                source: undefined,
                kind: "server",
                sourceId: "loaded-people",
                mode: "replace",
                sample: { exampleId: "loaded-demo" },
                callerKey: "ex",
            },
        );
        agreesWithSources(session, events[0]);
        session.dispose();
    });

    it("import of a readExample result keeps the example id; a plain network import has none", async () => {
        const session = createGraphSession();
        const events = heard(session);
        const read = await session.data.readExample("loaded-people", "loaded-demo", { fetch: people() });
        await session.data.import(read, { callerKey: "read" });
        await session.data.import(
            { source: "loaded-people", config: { team: "SECRET_OTHER" } },
            { fetch: people(), mode: "merge" },
        );

        assert.lengthOf(events, 2);
        assert.deepInclude(events[0], { kind: "server", sourceId: "loaded-people", callerKey: "read" });
        assert.deepEqual(events[0].sample, { exampleId: "loaded-demo" });
        assert.deepInclude(events[1], { kind: "server", sourceId: "loaded-people", mode: "merge" });
        assert.notProperty(events[1], "sample");
        agreesWithSources(session, events[0]);
        agreesWithSources(session, events[1]);
        session.dispose();
    });
});

describe("source:loaded from loadDataset", () => {
    let server: Server;
    let baseUrl = "";

    beforeAll(async () => {
        server = createServer((request, response) => {
            const name = (request.url ?? "").replace(/^\//, "");
            if (!/^[a-z0-9-]+\.gsnp\.gz$/.test(name) || !existsSync(resolve(DATA, name))) {
                response.statusCode = 404;
                response.end();
                return;
            }
            response.end(readFileSync(resolve(DATA, name)));
        });
        await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
        baseUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
    });

    afterAll(async () => {
        await new Promise((done) => server.close(done));
    });

    it("kind sample with the dataset's id and the caller's key, never the base URL", async () => {
        const session = createGraphSession();
        const events = heard(session);
        await session.data.loadDataset("karate", { baseUrl, callerKey: "ds" });

        assert.lengthOf(events, 1);
        assert.deepEqual(
            { ...events[0], source: undefined },
            { source: undefined, kind: "sample", mode: "replace", sample: { datasetId: "karate" }, callerKey: "ds" },
        );
        assert.notInclude(JSON.stringify(events[0]), "127.0.0.1");
        agreesWithSources(session, events[0]);
        session.dispose();
    });
});

describe("what publishes no source:loaded", () => {
    it("undo, redo and a restore", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: GRAPH } });
        await session.data.generate("cycle", { n: 4 }, { mode: "merge" });
        const events = heard(session);

        await session.undo();
        await session.redo();
        await session.history.restoreTo(null);

        assert.lengthOf(events, 0);
        session.dispose();
    });

    it("opening a project with two saved sources, as a file or as the reader's own work", async () => {
        const saved = createGraphSession();
        await saved.data.import({ type: "json", config: { data: GRAPH } });
        await saved.data.generate("cycle", { n: 4 }, { mode: "merge" });
        assert.lengthOf(saved.data.sources(), 2);
        const { text } = await saved.project.save();
        saved.dispose();

        const session = createGraphSession();
        const events = heard(session);
        await session.project.open(text);
        await session.project.open(text, { discard: true, ownWork: true });

        assert.lengthOf(session.data.sources(), 2, "the open listed both sources");
        assert.lengthOf(events, 0);
        session.dispose();
    });

    it("running a waiting network load of an opened project", async () => {
        const saved = createGraphSession();
        await saved.data.loadExample("loaded-people", "loaded-demo", { fetch: people() });
        const { text } = await saved.project.save();
        saved.dispose();

        const session = createGraphSession();
        const events = heard(session);
        await session.project.open(text);
        const [pending] = session.data.pendingSourceLoads();
        await session.data.runPendingSourceLoad(pending.id, { fetch: people() });

        assert.lengthOf(session.data.pendingSourceLoads(), 0, "the waiting load ran");
        assert.lengthOf(events, 0);
        session.dispose();
    });
});
