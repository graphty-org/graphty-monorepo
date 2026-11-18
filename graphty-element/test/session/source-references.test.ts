/**
 * Saving a load as a reference (the `source-references` experiment): which loads can be one, a
 * save that leaves a referenced load's rows out of the data member, an open that reads them again
 * and gives the same graph, a missing or changed reference reported with nothing lost, and the
 * experiment off writing exactly what it wrote before.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, credentials, type GraphSession } from "../../session";
import { GraphtyError } from "../../src/errors/GraphtyError";
import { dataMember } from "../../src/session/projectFile";
import { sessionWithRuns } from "../helpers/project-session";

const URL_A = "https://data.example.com/graph.json";
const GRAPH = JSON.stringify({
    nodes: [
        { id: "a", label: "Ann" },
        { id: "b", label: "Bob" },
        { id: "c", label: "Cy" },
    ],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});
const EXTRA = JSON.stringify({ nodes: [{ id: "d", label: "Dee" }], edges: [{ source: "c", target: "d" }] });

/**
 * Stub fetch with a site: each URL answers its text, any other a 404.
 * @param site - URL to text.
 * @returns How many fetches each URL saw.
 */
function stubSite(site: Record<string, string>): Map<string, number> {
    const seen = new Map<string, number>();
    vi.stubGlobal("fetch", (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        seen.set(url, (seen.get(url) ?? 0) + 1);
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve(
            body === undefined ? new Response("", { status: 404 }) : new Response(body, { status: 200 }),
        );
    });
    return seen;
}

/**
 * A session with the experiment on, a URL load and an inline load merged onto it.
 * @returns The session.
 */
async function twoLoads(): Promise<GraphSession> {
    const session = createGraphSession({ features: ["source-references"] });
    session.network.setPolicy("allow");
    await session.data.import({ type: "json", config: { url: URL_A } });
    await session.data.import({ type: "json", name: "extra.json", config: { data: EXTRA } }, { mode: "merge" });
    return session;
}

/**
 * The saved data member's records.
 * @param text - The file.
 * @returns Its nodes and links.
 */
function dataOf(text: string): { nodes: Record<string, unknown>[]; links: Record<string, unknown>[] } {
    const document = JSON.parse(text) as { members: { kind: string; graph?: unknown }[] };
    return document.members.find((member) => member.kind === "graphty-data")?.graph as {
        nodes: Record<string, unknown>[];
        links: Record<string, unknown>[];
    };
}

/**
 * The saved sources member.
 * @param text - The file.
 * @returns It.
 */
function sourcesOf(text: string): { data?: string; loads: Record<string, unknown>[] } {
    const document = JSON.parse(text) as { members: { kind: string }[] };
    return document.members.find((member) => member.kind === "graphty-sources") as unknown as {
        data?: string;
        loads: Record<string, unknown>[];
    };
}

/**
 * Open a saved file in a new session that allows every host.
 * @param text - The file.
 * @returns The session and the open's problems.
 */
async function reopen(
    text: string,
): Promise<{ session: GraphSession; problems: readonly { code: string; params: unknown }[] }> {
    const session = createGraphSession({ features: ["source-references"] });
    session.network.setPolicy("allow");
    const report = await session.project.open(text);
    return { session, problems: report.problems };
}

/**
 * The graph's node values, by id.
 * @param session - The session.
 * @returns id to label.
 */
function labels(session: GraphSession): Record<string, unknown> {
    return Object.fromEntries(session.data.nodes({ scope: "graph" }).map((node) => [node.id, node.label]));
}

/**
 * What a call throws.
 * @param call - The call.
 * @returns The error, or undefined when it returned.
 */
function thrown(call: () => unknown): unknown {
    try {
        call();
        return undefined;
    } catch (error) {
        return error;
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("session.data.copies and setCopy", () => {
    it("lists every load as a copy, refuses a reference for inline rows, and takes one for a URL", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const [url, extra] = session.data.sources();
        assert.deepEqual(
            session.data.copies().map((each) => [each.source, each.copy, each.refused?.params.reason]),
            [
                [url?.key, "copy", undefined],
                [extra?.key, "copy", "inline"],
            ],
        );

        const refused = session.data.setCopy(extra?.key ?? "", "reference");
        assert.strictEqual(refused.copy, "copy");
        assert.strictEqual(refused.refused?.code, "W_SOURCE_NO_PATH");

        const heard: unknown[] = [];
        session.on("source:copy", (detail) => heard.push(detail));
        await session.project.save();
        assert.isFalse(session.project.dirty);
        assert.strictEqual(session.data.setCopy(url?.key ?? "", "reference").copy, "reference");
        assert.deepEqual(heard, [{ source: url?.key, copy: "reference" }]);
        assert.strictEqual(session.data.sources()[0]?.copy, "reference");
        assert.isTrue(session.project.dirty);
        session.data.setCopy(url?.key ?? "", "copy");
        assert.isUndefined(session.data.sources()[0]?.copy);
    });

    it("refuses an unknown key, and refuses choosing while the experiment is off", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const unknown = thrown(() => session.data.setCopy("nope", "reference"));
        assert.instanceOf(unknown, GraphtyError);
        assert.strictEqual(unknown.code, "E_SOURCE_UNKNOWN");

        const off = createGraphSession();
        await off.data.import({ type: "json", config: { url: URL_A } });
        const refused = thrown(() => off.data.setCopy(off.data.sources()[0]?.key ?? "", "reference"));
        assert.instanceOf(refused, GraphtyError);
        assert.strictEqual(refused.code, "E_FEATURE_OFF");
        assert.deepEqual(refused.details, { feature: "source-references", key: "setCopy" });
    });

    it("takes a generated graph as a reference, and reopens it by generating it again", async () => {
        const session = createGraphSession({ features: ["source-references"] });
        await session.data.generate("barabasi-albert", { n: 30, seed: 7 });
        const key = session.data.sources()[0]?.key ?? "";
        assert.isUndefined(session.data.copies()[0]?.refused);
        session.data.setCopy(key, "reference");
        const saved = await session.project.save();
        assert.isTrue(dataOf(saved.text).nodes.every((node) => node["_source.ref"] === key));
        const { session: opened, problems } = await reopen(saved.text);
        assert.deepEqual(problems, []);
        assert.deepEqual(opened.data.nodes({ scope: "graph" }), session.data.nodes({ scope: "graph" }));
        assert.strictEqual(opened.data.edges({ scope: "graph" }).length, session.data.edges({ scope: "graph" }).length);
    });
});

describe("a project saved with a reference", () => {
    it("leaves the referenced load's own unedited rows out, and reopens to the same graph", async () => {
        const fetched = stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const key = session.data.sources()[0]?.key ?? "";
        session.data.setCopy(key, "reference");
        await session.data.updateNodes([{ id: "b", values: { label: "Bobby" } }]);
        await session.positions.set([{ id: "a", x: 1, y: 2, z: 3 }]);
        session.notes.add({ text: "first", targets: [{ node: "a" }] });

        const saved = await session.project.save();
        const graph = dataOf(saved.text);
        // a only came from the URL and is unchanged: a placeholder. b was edited, c is shared with
        // the inline load (its edge c-d names it), d is inline.
        assert.deepEqual(graph.nodes[0], { id: "a", "_source.ref": key });
        assert.strictEqual(graph.nodes[1]?.label, "Bobby");
        assert.strictEqual(graph.nodes[2]?.label, "Cy");
        assert.strictEqual(graph.nodes[3]?.label, "Dee");
        assert.deepEqual(graph.links[0], { source: "a", target: "b", "_source.ref": key });
        const member = sourcesOf(saved.text);
        assert.strictEqual(member.data, "references");
        assert.strictEqual(member.loads[0]?.copy, "reference");
        assert.match(String(member.loads[0]?.rowsSha256), /^[0-9a-f]{64}$/);
        assert.isUndefined(member.loads[1]?.copy);
        assert.deepEqual(saved.report.leftOut, []);

        // Autosave and export keep copies: every row is written.
        const full = dataMember(session) as { graph: { nodes: Record<string, unknown>[] } };
        assert.strictEqual(full.graph.nodes[0]?.label, "Ann");

        const before = fetched.get(URL_A) ?? 0;
        const { session: opened, problems } = await reopen(saved.text);
        assert.isAbove(fetched.get(URL_A) ?? 0, before);
        assert.deepEqual(problems, []);
        assert.deepEqual(labels(opened), labels(session));
        assert.strictEqual(opened.data.edges({ scope: "graph" }).length, 3);
        assert.deepEqual(opened.data.sourcesOf("a"), [key]);
        assert.strictEqual(opened.data.copies()[0]?.copy, "reference");
        assert.deepEqual(
            opened.notes.list().map((note) => note.text),
            ["first"],
        );
        const at = { x: 0, y: 0, z: 0 };
        opened.positions.read(0, at);
        assert.deepEqual(at, { x: 1, y: 2, z: 3 });
        assert.isFalse(opened.project.dirty);
    });

    it("brings back a finished run's node and edge values and a style over referenced rows", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = sessionWithRuns(["source-references"]);
        session.network.setPolicy("allow");
        await session.data.import({ type: "json", config: { url: URL_A } });
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        await session.runs.start("degree", undefined, { as: "links", style: false });
        await session.styles.add({ name: "red", target: "node", selector: { match: "everything" }, set: {} });
        const saved = await session.project.save();
        assert.isTrue(dataOf(saved.text).nodes.every((node) => typeof node["_source.ref"] === "string"));

        const opened = sessionWithRuns(["source-references"]);
        opened.network.setPolicy("allow");
        const report = await opened.project.open(saved.text);
        assert.deepEqual(report.problems, []);
        assert.strictEqual(opened.results.get("links")?.node("b")?.value, 2);
        assert.deepEqual(
            opened.data.edges({ scope: "graph" }).map((edge) => opened.results.get("links")?.edge(edge.id)?.from),
            session.data.edges({ scope: "graph" }).map((edge) => session.results.get("links")?.edge(edge.id)?.from),
        );
        assert.isTrue(opened.styles.list().some((layer) => layer.name === "red"));
    });

    it("keeps a node the reader deleted deleted", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        await session.data.removeNodes(["a"]);
        const saved = await session.project.save();
        const { session: opened } = await reopen(saved.text);
        assert.deepEqual(Object.keys(labels(opened)).sort(), ["b", "c", "d"]);
    });

    it("reports a missing reference, keeps its rows' places bare and writes the reference back", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const key = session.data.sources()[0]?.key ?? "";
        session.data.setCopy(key, "reference");
        const saved = await session.project.save();

        stubSite({});
        const { session: opened, problems } = await reopen(saved.text);
        // The load is not in the opened graph, so the fact names it and its address.
        assert.deepEqual(problems, [
            {
                code: "W_SOURCE_UNAVAILABLE",
                params: { source: key, reason: "not-found", name: "graph.json", url: URL_A },
            },
        ]);
        // a and b are held bare in their places, supplied by the unread load.
        assert.deepEqual(labels(opened), { a: undefined, b: undefined, c: "Cy", d: "Dee" });
        assert.deepEqual(opened.data.sourcesOf("a"), [key]);

        const again = await opened.project.save();
        assert.deepEqual(sourcesOf(again.text).loads[0], sourcesOf(saved.text).loads[0]);
        assert.strictEqual(sourcesOf(again.text).data, "references");
        assert.deepEqual(dataOf(again.text), dataOf(saved.text));

        stubSite({ [URL_A]: GRAPH });
        const { session: back, problems: none } = await reopen(again.text);
        assert.deepEqual(none, []);
        assert.deepEqual(labels(back), labels(session));
    });

    it("keeps positions, a run and notes on a missing reference's rows through a save", async () => {
        const URL_B = "https://data.example.com/other.json";
        const OTHER = JSON.stringify({ nodes: [{ id: "x" }, { id: "y" }], edges: [{ source: "x", target: "y" }] });
        stubSite({ [URL_A]: GRAPH, [URL_B]: OTHER });
        const session = sessionWithRuns(["source-references"]);
        session.network.setPolicy("allow");
        await session.data.import({ type: "json", config: { url: URL_A } });
        await session.data.import({ type: "json", config: { url: URL_B } }, { mode: "merge" });
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        await session.runs.start("degree", undefined, { as: "links", style: false });
        session.notes.add({ text: "on a", targets: [{ node: "a" }] });
        await session.positions.set([{ id: "a", x: 5, y: 6, z: 7 }]);
        const saved = await session.project.save();

        const open = async (text: string): Promise<GraphSession> => {
            const opened = sessionWithRuns(["source-references"]);
            opened.network.setPolicy("allow");
            await opened.project.open(text);
            return opened;
        };
        stubSite({ [URL_B]: OTHER });
        const missing = await open(saved.text);
        const again = await missing.project.save();

        stubSite({ [URL_A]: GRAPH, [URL_B]: OTHER });
        const back = await open(again.text);
        const at = { x: 0, y: 0, z: 0 };
        back.positions.read(
            back.data.nodes({ scope: "graph" }).findIndex((node) => node.id === "a"),
            at,
        );
        assert.deepEqual(at, { x: 5, y: 6, z: 7 });
        assert.strictEqual(back.results.get("links")?.node("b")?.value, 2);
        assert.deepEqual(
            back.notes.list().map((note) => note.text),
            ["on a"],
        );
        assert.strictEqual(labels(back).a, "Ann");
    });

    it("keeps a reader's edge between a missing reference's nodes without taking their values", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = createGraphSession({ features: ["source-references"] });
        session.network.setPolicy("allow");
        await session.data.import({ type: "json", config: { url: URL_A } });
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        await session.data.addEdges([{ source: "a", target: "c" }]);
        const saved = await session.project.save();

        stubSite({});
        const { session: missing } = await reopen(saved.text);
        const again = await missing.project.save();
        assert.deepEqual(dataOf(again.text).nodes, dataOf(saved.text).nodes);

        stubSite({ [URL_A]: GRAPH });
        const { session: back, problems } = await reopen(again.text);
        assert.deepEqual(problems, []);
        assert.deepEqual(labels(back), { a: "Ann", b: "Bob", c: "Cy" });
        assert.strictEqual(back.data.edges({ scope: "graph" }).length, 3);
    });

    it("keeps the selected edge when a changed reference no longer gives an edge before it", async () => {
        const URL_B = "https://data.example.com/more.json";
        const MORE = JSON.stringify({ nodes: [{ id: "c" }, { id: "d" }], edges: [{ source: "c", target: "d" }] });
        stubSite({ [URL_A]: GRAPH, [URL_B]: MORE });
        const session = createGraphSession({ features: ["source-references"] });
        session.network.setPolicy("allow");
        await session.data.import({ type: "json", config: { url: URL_A } });
        await session.data.import({ type: "json", config: { url: URL_B } }, { mode: "merge" });
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        const pairOf = (edge: { source: unknown; target: unknown }): string =>
            `${String(edge.source)}-${String(edge.target)}`;
        const bc = session.data.edges({ scope: "graph" }).find((edge) => pairOf(edge) === "b-c");
        await session.selection.apply({ nodes: [], edges: [bc?.id ?? ""] });
        const saved = await session.project.save();

        // The source no longer gives a-b, the edge saved before the selected one.
        const changed = JSON.parse(GRAPH) as { edges: unknown[] };
        stubSite({ [URL_A]: JSON.stringify({ ...changed, edges: changed.edges.slice(1) }), [URL_B]: MORE });
        const { session: opened, problems } = await reopen(saved.text);
        assert.deepEqual(
            problems.map((problem) => problem.code),
            ["W_SOURCE_CHANGED"],
        );
        const selected = opened.data
            .edges({ scope: "graph" })
            .filter((edge) => opened.selection.has(edge.id))
            .map((edge) => pairOf(edge));
        assert.deepEqual(selected, ["b-c"]);
    });

    it("reports a changed reference and reads its new values", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const key = session.data.sources()[0]?.key ?? "";
        session.data.setCopy(key, "reference");
        const saved = await session.project.save();

        stubSite({ [URL_A]: GRAPH.replace("Ann", "Anna") });
        const { session: opened, problems } = await reopen(saved.text);
        assert.deepEqual(problems, [{ code: "W_SOURCE_CHANGED", params: { source: key } }]);
        assert.strictEqual(labels(opened).a, "Anna");
    });

    it("asks the page before fetching a reference, and a denied one opens without its rows", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const key = session.data.sources()[0]?.key ?? "";
        session.data.setCopy(key, "reference");
        const saved = await session.project.save();

        const asking = createGraphSession({ features: ["source-references"] });
        const asked: { id: string; kind: string; by: string }[] = [];
        asking.on("network:pending", (request) => {
            asked.push(request.params);
            asking.network.deny(request.params.id);
        });
        const report = await asking.project.open(saved.text);
        assert.deepEqual(
            asked.map((each) => [each.kind, each.by]),
            [["data", "file"]],
        );
        assert.deepEqual(report.problems, [
            { code: "W_SOURCE_UNAVAILABLE", params: { source: key, reason: "denied", name: "graph.json", url: URL_A } },
        ]);
    });

    it("saves a load whose reference cannot be read as a copy, and says so", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = await twoLoads();
        const key = session.data.sources()[0]?.key ?? "";
        session.data.setCopy(key, "reference");
        stubSite({});
        const saved = await session.project.save();
        assert.deepEqual(saved.report.leftOut, [
            { code: "W_SOURCE_UNAVAILABLE", params: { source: key, reason: "not-found" } },
        ]);
        assert.strictEqual(dataOf(saved.text).nodes[0]?.label, "Ann");
        assert.isUndefined(sourcesOf(saved.text).data);
        assert.strictEqual(sourcesOf(saved.text).loads[0]?.copy, "reference");
    });
});

describe("a sample read by URL, as an application opens its own samples", () => {
    it("takes a reference at its address resolved against the page, and reopens it", async () => {
        const SAMPLE = "https://app.example.com/samples/graph.json";
        vi.stubGlobal("document", { baseURI: "https://app.example.com/start/" });
        stubSite({ "/samples/graph.json": GRAPH, [SAMPLE]: GRAPH });
        const session = createGraphSession({ features: ["source-references"] });
        session.network.setPolicy("allow");
        await session.data.import(
            { type: "json", name: "Sample", config: { url: "/samples/graph.json" } },
            {
                origin: "sample",
            },
        );
        const key = session.data.sources()[0]?.key ?? "";
        assert.strictEqual(session.data.sources()[0]?.kind, "sample");
        assert.deepEqual(session.data.copies(), [{ source: key, copy: "copy" }]);
        session.data.setCopy(key, "reference");
        const saved = await session.project.save();
        assert.isTrue(dataOf(saved.text).nodes.every((node) => node["_source.ref"] === key));
        assert.strictEqual((sourcesOf(saved.text).loads[0]?.url as { address?: string }).address, SAMPLE);

        const { session: opened, problems } = await reopen(saved.text);
        assert.deepEqual(problems, []);
        assert.deepEqual(labels(opened), labels(session));
    });
});

describe("with the experiment off", () => {
    it("writes no copy choice, placeholder or references marker", async () => {
        stubSite({ [URL_A]: GRAPH });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { url: URL_A } });
        const saved = await session.project.save();
        assert.notInclude(saved.text, "_source.ref");
        assert.notInclude(saved.text, '"copy"');
        assert.notInclude(saved.text, "rowsSha256");
        assert.isUndefined(sourcesOf(saved.text).data);
    });
});

describe("a network source's load", () => {
    const URL_N = "https://files.example.com/data/graph.csv";
    const CSV = "source,target\na,b\nb,c\n";

    it("can be a reference, leaves its rows out, and reopens by reading the source again", async () => {
        const fetched = stubSite({ [URL_N]: CSV });
        const session = createGraphSession({ features: ["source-references"] });
        await session.data.import({ source: "url", config: { url: URL_N } });
        const [load] = session.data.sources();
        assert.strictEqual(load?.kind, "server");
        assert.isUndefined(session.data.copies()[0]?.refused);
        assert.strictEqual(session.data.setCopy(load?.key ?? "", "reference").copy, "reference");

        const saved = await session.project.save();
        assert.notInclude(saved.text, "a,b");
        const graph = dataOf(saved.text);
        assert.isTrue(graph.nodes.every((node) => node["_source.ref"] === load?.key));
        assert.isTrue(graph.links.every((link) => link["_source.ref"] === load?.key));
        assert.strictEqual(sourcesOf(saved.text).loads[0]?.copy, "reference");

        const before = fetched.get(URL_N) ?? 0;
        const { session: opened, problems } = await reopen(saved.text);
        assert.deepEqual(problems, []);
        assert.isAbove(fetched.get(URL_N) ?? 0, before);
        assert.deepEqual(Object.keys(labels(opened)).sort(), ["a", "b", "c"]);
        assert.strictEqual(opened.data.edges({ scope: "graph" }).length, 2);
        assert.strictEqual(opened.data.copies()[0]?.copy, "reference");
    });

    it("stays a copy when it was read with a credential", async () => {
        stubSite({ [URL_N]: CSV });
        const session = createGraphSession({ features: ["source-references"] });
        await session.data.import(
            { source: "url", config: { url: URL_N } },
            { credential: credentials.bearer("typed") },
        );
        assert.strictEqual(session.data.copies()[0]?.refused?.params.reason, "secret-url");
        assert.strictEqual(session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference").copy, "copy");
    });
});
