/**
 * @file The version 2 `data` section codec (spec/README.md 4.1, 6, 11), behind the
 * `save-files-v2` experiment: a session written and read back, the written section valid against
 * the published schema, the worked example read, bound and written back with its build stamp and
 * copy ids, element references binding both ways by (space, key) and (load, key), and a section
 * that cannot be built whole applying nothing.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import { canonicalJson, dataBindingOf, elementRefsOf } from "../../../src/session/document2/codecs/dataRefs";
import { saveDocument2 } from "../../../src/session/document2/document";
import { schemaUrl } from "../../../src/session/document2/framing";
import type {
    DocumentProblem,
    DocumentSection,
    JsonObject,
    ReadContext,
    ReadSection,
    WriteContext,
} from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ON = { features: ["save-files-v2"] };
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const file of ["common/v2.json", "graphty-data/v2.json"]) {
    ajv.addSchema(readJson(`schemas/${file}`));
}

/**
 * The schema errors of a data section.
 * @param section - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(section: JsonObject): string[] {
    const validate = ajv.getSchema(schemaUrl("graphty-data", 2));
    assert.isDefined(validate);
    return validate(section) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${String(e.message)}`);
}

/**
 * A data body as a section the schema checks: the header members the framing writes, around it.
 * @param body - The body.
 * @returns The section.
 */
const asSection = (body: JsonObject): JsonObject => ({
    kind: "graphty-data",
    version: 2,
    generator: { name: "graphty-element", version: "0.0.0" },
    id: "data-1",
    ...body,
});

/**
 * Write a session's data body through the codec.
 * @param session - The session.
 * @param embed - Embedded or referenced per source.
 * @returns The body and the problems.
 */
async function writeBody(
    session: GraphSession,
    embed: WriteContext["embed"] = {},
): Promise<{ body: JsonObject; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [];
    const context: WriteContext = {
        session,
        problems,
        refs: () => elementRefsOf(session),
        dataId: () => "data-1",
        sections: new Set<DocumentSection>(["data"]),
        embed,
        isDerived: () => false,
        bindsTo: () => Promise.resolve(undefined),
    };
    const { body } = await dataCodec.write(context);
    return { body: body, problems };
}

/**
 * Read a data body into a session through the codec, in one transaction.
 * @param session - The session.
 * @param body - The body.
 * @param dataMode - Replace or add.
 * @returns The problems.
 */
async function readBody(
    session: GraphSession,
    body: JsonObject,
    dataMode: "replace" | "add" = "replace",
): Promise<DocumentProblem[]> {
    const problems: DocumentProblem[] = [];
    const section: ReadSection = { header: { kind: "graphty-data", version: 2 }, body, pointer: "" };
    await session.transaction("Open data", async (tx) => {
        const context: ReadContext = {
            session,
            problems,
            refs: () => elementRefsOf(session),
            dataId: () => "data-1",
            sections: new Set<DocumentSection>(["data"]),
            tx,
            rerun: true,
            dataMode,
            restored: new Set(),
            other: () => undefined,
            canned: new Map(),
            restoreDerived: () => undefined,
        };
        await dataCodec.read(section, context);
    });
    return problems;
}

/** Two loads that share a node, a hand-added node and edge, and values JSON cannot carry. */
async function sampleSession(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.import({
        type: "csv",
        config: { data: "source,target,w\nAva,Ben,1\nBen,Cara,2\nAva,Ben,1\n" },
        name: "friends.csv",
    });
    await session.data.import(
        {
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "Ava", kind: "person" },
                        { id: 7, kind: "dog", tags: ["a", null] },
                    ],
                    edges: [{ source: "Ava", target: 7, kind: "owns" }],
                }),
            },
            name: "pets.json",
        },
        { mode: "merge" },
    );
    await session.data.addNodes([{ id: "Zed" }]);
    await session.data.updateNodes([{ id: "Ben", values: { score: Number.POSITIVE_INFINITY } }]);
    await session.data.addEdges([{ source: "Zed", target: "Ava" }]);
    return session;
}

/**
 * What a session holds, named by record key so two sessions compare whatever ids they minted.
 * @param session - The session.
 * @returns Nodes, edges, loads and the direction, sorted.
 */
function stateOf(session: GraphSession): unknown {
    const refs = elementRefsOf(session);
    const names = new Map(session.data.sources().map((load) => [load.key, load.name]));
    const sorted = (list: unknown[]): string[] => list.map((each) => canonicalJson(each)).sort();
    const nodes = session.data.nodes().map(({ id, ...node }) => ({
        ...node,
        ref: refs.nodeRef(id),
        loads: session.data.sourcesOf(id).map((key) => names.get(key)),
    }));
    const edges = session.data.edges().map(({ id, source, target, ...edge }) => ({
        ...edge,
        ref: refs.edgeRef(id),
        from: refs.nodeRef(source),
        to: refs.nodeRef(target),
        loads: session.data.sourcesOf(id, { kind: "edge" }).map((key) => names.get(key)),
    }));
    const loads = session.data.sources().map((load) => [load.kind, load.name, load.type]);
    return { nodes: sorted(nodes), edges: sorted(edges), loads, directed: session.status.directed };
}

describe("data section version 2", () => {
    it("round-trips a session: state to section to state, and section to state to section byte for byte", async () => {
        const session = await sampleSession();
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, []);
        assert.deepStrictEqual(invalid(asSection(body)), []);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.deepStrictEqual(stateOf(reopened), stateOf(session));

        const again = await writeBody(reopened);
        assert.strictEqual(JSON.stringify(again.body), JSON.stringify(body));

        // Source ids are src_ plus a ULID; both loads share the first one's space, so Ava is one node.
        const sources = body.sources as JsonObject[];
        assert.deepStrictEqual(
            sources.map((source) => source.kind),
            ["reader", "file", "file"],
        );
        const [, friends, pets] = sources;
        assert.match(String(friends.id), /^src_[0-9A-HJKMNP-TV-Z]{26}$/);
        const space = `source:${String(friends.id)}`;
        assert.deepStrictEqual((pets.mapping as JsonObject).nodes, { key: "id", space });
        assert.deepStrictEqual(
            (body.joins as JsonObject[]).map((step) => [step.op, step.source]),
            [
                ["join.add", friends.id],
                ["join.add", pets.id],
            ],
        );
        assert.match(String(body.build), ULID);
        assert.strictEqual(body.directed, session.status.directed);

        // The reader's node and edge are `add` operations keyed by minted ULIDs.
        const operations = ((sources[0].copy as JsonObject).operations as JsonObject[]).map((op) => op.op);
        assert.deepStrictEqual(operations, ["add", "add"]);
        const graph = body.graph as JsonObject;
        const zed = (graph.nodes as JsonObject[]).find((node) => node["graphty.space"] === "source:reader");
        assert.match(String(zed?.["graphty.key"]), ULID);
        assert.deepStrictEqual(zed?.["_source.loads"], ["reader"]);
        const ben = (graph.nodes as JsonObject[]).find((node) => node["graphty.key"] === "Ben");
        assert.strictEqual(ben?.score, "Infinity");

        // A keyless edge row's key is "<copy id>#<row>"; the types come from the kind column.
        const links = graph.links as JsonObject[];
        const copy = String((friends.origin as JsonObject).copy);
        assert.deepStrictEqual(
            links.filter((link) => link["graphty.load"] === friends.id).map((link) => link["graphty.key"]),
            [`${copy}#0`, `${copy}#1`, `${copy}#2`],
        );
        assert.isTrue(graph.multigraph);
        const owns = links.find((link) => link["graphty.load"] === pets.id);
        assert.deepStrictEqual(owns?.["graphty.types"], ["owns"]);
        session.dispose();
        reopened.dispose();
    });

    it("keeps the build stamp and copy ids while nothing changes, and mints new ones when it does", async () => {
        const session = await sampleSession();
        const first = (await writeBody(session)).body;
        const second = (await writeBody(session)).body;
        assert.strictEqual(second.build, first.build);
        assert.deepStrictEqual(await dataBindingOf(session), {
            build: first.build,
            sources: Object.fromEntries(
                (first.sources as JsonObject[]).map((source) => [source.id, (source.origin as JsonObject).copy]),
            ),
        });

        await session.data.addNodes([{ id: "Yan" }]);
        const third = (await writeBody(session)).body;
        assert.notStrictEqual(third.build, first.build);
        const copyOf = (body: JsonObject, kind: string): unknown =>
            ((body.sources as JsonObject[]).find((source) => source.kind === kind)?.origin as JsonObject).copy;
        assert.notStrictEqual(copyOf(third, "reader"), copyOf(first, "reader"), "the reader's copy changed");
        assert.strictEqual(copyOf(third, "file"), copyOf(first, "file"), "the files did not");
        session.dispose();
    });

    it("writes a section the published schema accepts, embedded or referenced, and keeps a source it cannot fetch", async () => {
        const session = await sampleSession();
        const full = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section" },
            () => false,
        );
        assert.deepStrictEqual(invalid(full.document), []);
        assert.isString(full.document.id, "the framing writes the data section's id");

        const friends = String((full.document.sources as JsonObject[])[1].id);
        const referenced = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section", embed: { [friends]: "referenced" } },
            () => false,
        );
        assert.deepStrictEqual(invalid(referenced.document), []);
        const record = (referenced.document.sources as JsonObject[]).find((source) => source.id === friends);
        assert.notProperty(record, "copy");
        assert.notProperty(record, "columns");
        assert.deepStrictEqual(referenced.problems, [{ code: "W_SOURCE_NO_PATH", params: { source: friends } }]);

        // A referenced source cannot be fetched again yet: it supplies nothing, the rest builds, and
        // its record is written back as read.
        const reopened = createGraphSession(ON);
        const read = await readBody(reopened, referenced.document);
        assert.deepInclude(read, { code: "W_SOURCE_UNAVAILABLE", params: { source: friends } });
        assert.isTrue(reopened.data.nodes().some((node) => node.id === 7));
        assert.isFalse(reopened.data.nodes().some((node) => node.id === "Cara"));
        const { body } = await writeBody(reopened);
        assert.deepStrictEqual(
            (body.sources as JsonObject[]).find((source) => source.id === friends),
            record,
        );
        assert.notProperty((await dataBindingOf(reopened)).sources, friends, "an unavailable source has no copy id");
        session.dispose();
        reopened.dispose();
    });

    it("reads the worked example and writes it back with its build stamp, copy ids, keys and types", async () => {
        const example = readJson("examples/card-fraud.graphty-data.json");
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, example), []);
        assert.strictEqual(session.data.nodes().length, 5);
        assert.strictEqual(session.data.edges().length, 5);
        assert.isTrue(session.status.directed);
        const cy = session.data.nodes().find((node) => node.id === "account:acct-1003");
        assert.strictEqual(cy?.label, "Cy Lam", "copies are keyed by working name");
        assert.strictEqual(cy?.country, "NG", "the reader's edit wins");

        // Every node and edge of the example's graph binds by its record key.
        const refs = elementRefsOf(session);
        const graph = example.graph as { nodes: JsonObject[]; links: JsonObject[] };
        for (const node of graph.nodes) {
            assert.isDefined(refs.node({ space: node["graphty.space"], key: node["graphty.key"] }), String(node.id));
        }

        for (const link of graph.links) {
            const ref = { load: link["graphty.load"], key: link["graphty.key"] };
            assert.isDefined(refs.edge(ref), JSON.stringify(ref));
        }

        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.strictEqual(body.build, example.build, "nothing changed since the open");
        const copies = (from: JsonObject): Record<string, unknown> =>
            Object.fromEntries(
                (from.sources as JsonObject[]).map((source) => [source.id, (source.origin as JsonObject).copy]),
            );
        const written = copies(body);
        for (const [id, copy] of Object.entries(copies(example)).filter(([id]) => id !== "reader")) {
            assert.strictEqual(written[id], copy, id);
        }

        assert.deepStrictEqual(body.types, example.types);
        const typesOf = (from: JsonObject): string[] =>
            ((from.graph as JsonObject).links as JsonObject[]).map((link) =>
                canonicalJson([link["graphty.key"], link["graphty.types"]]),
            );
        assert.deepStrictEqual(typesOf(body), typesOf(example));
        session.dispose();
    });

    it("binds element references both ways: nodes by (space, key), edges by (load, key)", async () => {
        const session = await sampleSession();
        await session.config.set({ data: { knownFields: { edgeIdPath: "eid" } } });
        await session.data.addEdges([
            { source: "Ben", target: "Cara", eid: "x" },
            { source: "Cara", target: "Ava", eid: "y" },
        ]);
        const refs = elementRefsOf(session);
        for (const node of session.data.nodes()) {
            const ref = refs.nodeRef(node.id);
            assert.isDefined(ref);
            assert.strictEqual(refs.node(JSON.parse(JSON.stringify(ref)) as unknown), node.id);
        }

        for (const edge of session.data.edges()) {
            const ref = refs.edgeRef(edge.id);
            assert.isDefined(ref);
            assert.deepStrictEqual(Object.keys(ref ?? {}), ["load", "key"]);
            assert.strictEqual(refs.edge(JSON.parse(JSON.stringify(ref)) as unknown), edge.id);
        }

        const ava = refs.nodeRef("Ava");
        assert.strictEqual(refs.node(ava), "Ava");
        assert.isUndefined(refs.node({ space: ava?.space, key: "Nobody" }));
        assert.isUndefined(refs.node({ ...ava, extra: 1 }), "a reference is closed");
        assert.isUndefined(refs.node("Ava"));
        assert.isUndefined(refs.edge({ load: "reader", key: "nope" }));
        assert.isUndefined(refs.edge({ load: "reader", key: "nope", from: ava }), "an edge reference is closed");
        assert.isUndefined(refs.edge(null));
        session.dispose();
    });

    it("saves and restores the ignored issues and the conversions", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "csv",
            config: { data: "source,target,note,w\nA,B, hi ,1\nB,C,ok,2\nB,C,ok,3\n" },
            name: "padded.csv",
        });
        await session.data.setType({ kind: "edge", name: "w" }, "text");
        const issues = session.data.issues();
        assert.isAbove(issues.length, 0, "the padded note is an issue");
        await session.data.ignoreIssues(issues);
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.deepStrictEqual(body.conversions, [{ kind: "edge", name: "w", type: "text" }]);
        const ignored = (body.issues as JsonObject | undefined)?.ignored as JsonObject[] | undefined;
        assert.strictEqual(ignored?.length ?? 0, issues.length);

        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        const again = await writeBody(reopened);
        assert.deepStrictEqual(again.body.conversions, body.conversions);
        assert.deepStrictEqual(again.body.issues, body.issues);
        session.dispose();
        reopened.dispose();
    });

    it("applies nothing and reports W_SECTION_KEPT when the section cannot be built whole", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const broken: [string, (copy: JsonObject) => void][] = [
            ["an unknown join op", (copy) => ((copy.joins as JsonObject[])[0].op = "join.teleport")],
            ["a join shape this reader does not build", (copy) => ((copy.joins as JsonObject[])[0].op = "join.edges")],
            ["the removed join.link", (copy) => ((copy.joins as JsonObject[])[0].op = "join.link")],
            ["an unknown source kind", (copy) => ((copy.sources as JsonObject[])[1].kind = "carrier-pigeon")],
            ["an unknown copy form", (copy) => ((copy.sources as JsonObject[])[1].copy = { rows: [] })],
            ["the removed copy: graph", (copy) => ((copy.sources as JsonObject[])[1].copy = "graph")],
            ["a hand-chosen source id", (copy) => ((copy.sources as JsonObject[])[1].id = "friends")],
            [
                "an unknown mapping member",
                (copy) => (((copy.sources as JsonObject[])[1].mapping as JsonObject).weird = true),
            ],
            [
                "an unwritten end space",
                (copy) =>
                    delete (((copy.sources as JsonObject[])[1].mapping as JsonObject).edges as JsonObject).sourceSpace,
            ],
            [
                "a per-source direction",
                (copy) => (((copy.sources as JsonObject[])[1].settings as JsonObject).directed = true),
            ],
            ["an unknown join step member", (copy) => ((copy.joins as JsonObject[])[0].extra = 1)],
            [
                "an unknown reader operation",
                (copy) =>
                    ((((copy.sources as JsonObject[])[0].copy as JsonObject).operations as JsonObject[])[0].op =
                        "teleport"),
            ],
            ["no build stamp", (copy) => delete copy.build],
            ["the removed issues.fixed", (copy) => (copy.issues = { fixed: [] })],
        ];
        for (const [what, breakIt] of broken) {
            const copy = JSON.parse(JSON.stringify(body)) as JsonObject;
            breakIt(copy);
            const target = createGraphSession(ON);
            await target.data.import({ type: "csv", config: { data: "source,target\nP,Q\n" }, name: "kept.csv" });
            const problems = await readBody(target, copy);
            assert.deepStrictEqual(
                problems,
                [{ code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } }],
                what,
            );
            assert.deepStrictEqual(
                target.data.nodes().map((node) => node.id),
                ["P", "Q"],
                `${what}: the open data stays`,
            );
            target.dispose();
        }

        session.dispose();
    });

    it("reports an operation naming an absent element and applies the rest", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const reader = (body.sources as JsonObject[])[0];
        const operations = (reader.copy as JsonObject).operations as JsonObject[];
        const friends = (body.sources as JsonObject[])[1];
        const space = `source:${String(friends.id)}`;
        operations.push(
            { op: "edit", node: { space, key: "Cara" }, column: "mood", value: "calm", was: null },
            { op: "remove", node: { space, key: "Nobody" } },
            { op: "merge", into: { space, key: "Ava" }, from: { space, key: "Cara" } },
        );
        const reopened = createGraphSession(ON);
        const problems = await readBody(reopened, body);
        assert.deepStrictEqual(problems, [
            {
                code: "W_REFERENCE_UNBOUND",
                params: {
                    section: "data",
                    pointer: "/sources/reader/copy/operations/3",
                    ref: canonicalJson({ space, key: "Nobody" }),
                },
            },
        ]);
        const ava = reopened.data.nodes().find((node) => node.id === "Ava");
        assert.strictEqual(ava?.mood, "calm", "the edit, then the merge, carried Cara's value onto Ava");
        assert.isFalse(reopened.data.nodes().some((node) => node.id === "Cara"));
        session.dispose();
        reopened.dispose();
    });

    it("refuses a data section added to open data", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const target = createGraphSession(ON);
        await target.data.import({ type: "csv", config: { data: "source,target\nP,Q\n" }, name: "s1.csv" });
        const problems = await readBody(target, body, "add");
        assert.deepStrictEqual(problems, [
            { code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "add" } },
        ]);
        assert.deepStrictEqual(
            target.data.nodes().map((node) => node.id),
            ["P", "Q"],
        );
        session.dispose();
        target.dispose();
    });
});
