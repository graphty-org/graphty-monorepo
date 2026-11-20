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
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import { refetchSources, rememberRefetch } from "../../../src/session/document2/codecs/dataFetch";
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
/** Where a test's file is opened from and saved to: a path read is written only when both are known. */
const AT = "https://example.test/p/x.graphty.json";
/** What a save reports for the reader's edit of a loaded node, which the reader source cannot hold yet. */
const EDIT_FOLDED: DocumentProblem = {
    code: "W_MEMBER_LEFT_OUT",
    params: { section: "data", pointer: "/sources/reader/copy/operations", field: "edit" },
};

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
    location?: string,
): Promise<{ body: JsonObject; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [];
    const context: WriteContext = {
        session,
        problems,
        refs: () => elementRefsOf(session),
        dataId: () => "data-1",
        sections: new Set<DocumentSection>(["data"]),
        embed,
        ...(location === undefined ? {} : { location }),
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

/**
 * The record keys a data body's graph gives its nodes and edges, in order.
 * @param body - The body.
 * @returns `[space or load, key]` per element.
 */
function keysOf(body: JsonObject): unknown[] {
    const graph = body.graph as { nodes: JsonObject[]; links: JsonObject[] };
    return [
        ...graph.nodes.map((node) => [node["graphty.space"], node["graphty.key"]]),
        ...graph.links.map((link) => [link["graphty.load"], link["graphty.key"]]),
    ];
}

/** Two embedded sources' ids, for the bodies built by hand below. */
const SRC_A = `src_${"A".repeat(26)}`;
const SRC_B = `src_${"B".repeat(26)}`;
/** The plainest type schema. */
const OBJECT = { type: "object" };

/**
 * An embedded source of node and edge rows in the space `p`, keyed by `id` and ends `source` and
 * `target` (and `eid` when it has that column), its edges weighted by `w` under the given meaning.
 * @param id - The source id.
 * @param tables - Its rows.
 * @param tables.nodes - Node columns.
 * @param tables.edges - Edge columns.
 * @param meaning - Its weight meaning.
 * @returns The record.
 */
function rowsSource(
    id: string,
    tables: { nodes?: Record<string, unknown[]>; edges?: Record<string, unknown[]> },
    meaning = "strength",
): JsonObject {
    const decls = (table: Record<string, unknown[]> | undefined): JsonObject =>
        Object.fromEntries(
            Object.entries(table ?? {}).map(([name, cells]) => [
                name,
                { name, dtype: cells.every((cell) => typeof cell === "number") ? "f64" : "string" },
            ]),
        );
    return {
        id,
        label: id,
        kind: "derived",
        origin: { copy: id.slice(4) },
        mapping: {
            nodes: { key: "id", space: "p" },
            edges: {
                source: "source",
                sourceSpace: "p",
                target: "target",
                targetSpace: "p",
                weight: "w",
                weightMeaning: meaning,
                ...(tables.edges?.eid === undefined ? {} : { edgeId: "eid" }),
            },
        },
        copy: tables,
        columns: {
            ...(tables.nodes === undefined ? {} : { nodes: decls(tables.nodes) }),
            ...(tables.edges === undefined ? {} : { edges: decls(tables.edges) }),
        },
    };
}

/**
 * A data body of embedded sources, one `join.add` each in order.
 * @param sources - The source records.
 * @param extra - Other members.
 * @returns The body.
 */
function rowsBody(sources: JsonObject[], extra: JsonObject = {}): JsonObject {
    return {
        build: "0".repeat(26),
        directed: true,
        sources,
        types: [],
        joins: sources.map((source) => ({ op: "join.add", source: source.id })),
        graph: { directed: true, multigraph: false, graph: {}, nodes: [], links: [] },
        ...extra,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * An open's problems without `W_NODE_NAMED_ONLY`, which a CSV edge list reports for the nodes its
 * ends only name (design 3.1), for tests about something else.
 * @param problems - The problems.
 * @returns The rest.
 */
const quiet = (problems: DocumentProblem[]): DocumentProblem[] =>
    problems.filter((problem) => problem.code !== "W_NODE_NAMED_ONLY");

describe("data section version 2", () => {
    it("round-trips a session: state to section to state, and section to state to section byte for byte", async () => {
        const session = await sampleSession();
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, [EDIT_FOLDED]);
        assert.deepStrictEqual(invalid(asSection(body)), []);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(reopened, body)), []);
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

        // The reader's node is an `add` keyed by its own id, the edge (no edge-id role) by a ULID.
        const operations = (sources[0].copy as JsonObject).operations as JsonObject[];
        assert.deepStrictEqual(
            operations.map((op) => op.op),
            ["add", "add"],
        );
        assert.match(String((operations[1].edge as JsonObject).key), ULID);
        const graph = body.graph as JsonObject;
        const zed = (graph.nodes as JsonObject[]).find((node) => node["graphty.space"] === "source:reader");
        assert.strictEqual(zed?.["graphty.key"], "Zed");
        assert.deepStrictEqual(zed?.["_source.loads"], ["reader"]);
        const ben = (graph.nodes as JsonObject[]).find((node) => node["graphty.key"] === "Ben");
        assert.strictEqual(ben?.score, "Infinity");
        assert.notInclude(ben?.["_source.loads"] as string[], "reader", "an edit never lists the reader");

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
                (first.sources as JsonObject[]).map((source): [string, unknown] => [
                    String(source.id),
                    (source.origin as JsonObject).copy,
                ]),
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

    it("writes a section the published schema accepts, embeds a file it has no path for, and keeps a source it cannot fetch", async () => {
        const session = await sampleSession();
        const full = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section" },
            () => false,
        );
        assert.deepStrictEqual(invalid(full.document), []);
        assert.isString(full.document.id, "the framing writes the data section's id");

        // A file whose path the session does not know cannot be referenced: it is embedded, and said.
        const friends = String((full.document.sources as JsonObject[])[1].id);
        const asked = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section", embed: { [friends]: "referenced" } },
            () => false,
        );
        assert.deepStrictEqual(asked.document.sources, full.document.sources);
        assert.deepStrictEqual(asked.problems, [
            { code: "W_SOURCE_NO_PATH", params: { source: friends, reason: "file" } },
            EDIT_FOLDED,
        ]);

        // A referenced source no open read again (no location to resolve its path against) supplies
        // nothing, the rest builds, and its record is written back as read.
        const referenced = structuredClone(full.document);
        const record = (referenced.sources as JsonObject[]).find((source) => source.id === friends) as JsonObject;
        delete record.copy;
        delete record.columns;
        (record.origin as JsonObject).path = "friends.csv";
        (record.origin as JsonObject).copy = `sha256:${"a".repeat(64)}`;
        assert.deepStrictEqual(invalid(referenced), []);
        const reopened = createGraphSession(ON);
        const read = await readBody(reopened, referenced);
        assert.deepInclude(read, { code: "W_SOURCE_UNAVAILABLE", params: { source: friends, reason: "needs-file" } });
        assert.isTrue(reopened.data.nodes().some((node) => node.id === 7));
        assert.isFalse(reopened.data.nodes().some((node) => node.id === "Cara"));
        rememberRefetch(reopened, { location: AT, limit: Number.MAX_SAFE_INTEGER });
        const { body } = await writeBody(reopened, {}, AT);
        assert.deepStrictEqual(
            (body.sources as JsonObject[]).find((source) => source.id === friends),
            record,
        );
        assert.notProperty((await dataBindingOf(reopened)).sources, friends, "an unavailable source has no copy id");
        session.dispose();
        reopened.dispose();
    });

    it("embeds a referenced source the reader edited, under a minted copy id, and keeps the edit through a reopen", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "people.csv" });
        const written = (await writeBody(session)).body;
        const file = (written.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject;
        (file.origin as JsonObject).path = "people.csv";
        const id = String(file.id);

        const opened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(opened, written)), []);
        rememberRefetch(opened, { location: AT, limit: Number.MAX_SAFE_INTEGER });
        const untouched = await writeBody(opened, { [id]: "referenced" }, AT);
        const before = (untouched.body.sources as JsonObject[]).find((source) => source.id === id);
        assert.notProperty(before, "copy", "a file with a known path is referenced as asked");
        assert.deepStrictEqual(untouched.problems, []);

        await opened.data.updateNodes([{ id: "Ava", values: { mood: "calm" } }]);
        const { body, problems } = await writeBody(opened, { [id]: "referenced" }, AT);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.deepStrictEqual(problems, [
            { code: "W_SOURCE_EMBEDDED", params: { source: id, reason: "edited" } },
            EDIT_FOLDED,
        ]);
        const after = (body.sources as JsonObject[]).find((source) => source.id === id) as JsonObject;
        assert.property(after, "copy", "an edited source is embedded whatever was asked, and said");
        assert.match(String((after.origin as JsonObject).copy), ULID);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(reopened, body)), []);
        assert.strictEqual(reopened.data.node("Ava")?.mood, "calm");
        session.dispose();
        opened.dispose();
        reopened.dispose();
    });

    it("writes two edges sharing an edge id under two keys, reports it, and keeps both through a reopen", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "a" }, { id: "b" }],
                    edges: [
                        { source: "a", target: "b", eid: "e1", n: 1 },
                        { source: "b", target: "a", eid: "e1", n: 2 },
                    ],
                }),
            },
            name: "calls.json",
        });
        await session.config.set({ data: { knownFields: { edgeIdPath: "eid" } } });
        assert.strictEqual(session.data.edges().length, 2);
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const links = (body.graph as JsonObject).links as JsonObject[];
        const keys = links.map((link) => link["graphty.key"]);
        assert.strictEqual(new Set(keys).size, 2, `two keys: ${JSON.stringify(keys)}`);
        assert.strictEqual(keys[0], "e1");
        const id = String((body.sources as JsonObject[]).find((source) => source.kind === "file")?.id);
        assert.deepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: `/sources/${id}/copy/edges/eid/1` },
        });

        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.sameMembers(
            reopened.data.edges().map((edge) => edge.n),
            [1, 2],
        );
        // The edge id the later row repeated was left out, as reported; every key holds.
        assert.deepStrictEqual(keysOf((await writeBody(reopened)).body), keysOf(body));
        session.dispose();
        reopened.dispose();
    });

    it("leaves out a node whose id is empty and an edge whose end is empty, and counts both", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "a" }, { id: "", label: "Blank" }],
                    edges: [{ source: "", target: "a" }],
                }),
            },
            name: "blank.json",
        });
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["a"],
        );
        assert.strictEqual(session.data.edges().length, 0);
        assert.strictEqual(session.data.lastImport()?.counts.rejected, 2, "the node row and the edge row");
        const first = (await writeBody(session)).body;
        assert.deepStrictEqual(invalid(asSection(first)), []);
        assert.deepStrictEqual(keysOf(first).length, 1);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, first), []);
        assert.deepStrictEqual(keysOf((await writeBody(reopened)).body), keysOf(first));
        session.dispose();
        reopened.dispose();
    });

    it("gives each element one type: a column rule beats a whole-source rule, then registry order, then the first step", async () => {
        const body = rowsBody(
            [
                rowsSource(SRC_A, { nodes: { id: ["ann", "box", "cat"], role: ["p", "x", "p"] } }),
                rowsSource(SRC_B, { nodes: { id: ["ann", "dot"], role: ["robot", "robot"] } }),
            ],
            {
                types: [
                    { name: "thing", kind: "node", rules: [{ source: SRC_A }], schema: OBJECT },
                    {
                        name: "person",
                        kind: "node",
                        rules: [{ source: SRC_A, column: "role", values: ["p"] }],
                        schema: OBJECT,
                    },
                    {
                        name: "human",
                        kind: "node",
                        rules: [{ source: SRC_A, column: "role", values: ["p"] }],
                        schema: OBJECT,
                    },
                    { name: "robot", kind: "node", rules: [{ source: SRC_B }], schema: OBJECT },
                ],
            },
        );
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const { body: written } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(written)), []);
        const typeOf = Object.fromEntries(
            ((written.graph as JsonObject).nodes as JsonObject[]).map((node) => [
                String(node["graphty.key"]),
                node["graphty.types"],
            ]),
        );
        assert.deepStrictEqual(typeOf, {
            ann: ["person"], // A's column rule beats its whole-source rule; A's step comes before B's
            box: ["thing"],
            cat: ["person"], // two column rules: the first in registry order
            dot: ["robot"],
        });
        session.dispose();
    });

    it("reduces repeated edges of one pair and type only, and combines weights only of one meaning", async () => {
        const edges = {
            eid: ["e1", "e2", "e3", "e4"],
            source: ["a", "a", "a", "b"],
            target: ["b", "b", "b", "c"],
            w: [1, 2, 5, 7],
            kind: ["call", "call", "text", "call"],
        };
        const types = [
            {
                name: "call",
                kind: "edge",
                rules: [
                    { source: SRC_A, column: "kind", values: ["call"] },
                    { source: SRC_B, column: "kind", values: ["call"] },
                ],
                schema: { type: "object" },
            },
            {
                name: "text",
                kind: "edge",
                rules: [{ source: SRC_A, column: "kind", values: ["text"] }],
                schema: { type: "object" },
            },
        ];
        const sources = (meaning: string): JsonObject[] => [
            rowsSource(SRC_A, { nodes: { id: ["a", "b", "c"] }, edges }),
            rowsSource(SRC_B, { edges: { source: ["a"], target: ["b"], w: [4], kind: ["call"] } }, meaning),
        ];
        const weights = (session: GraphSession): unknown[] =>
            session.data
                .edges()
                .map((edge) => [
                    edge.source,
                    edge.target,
                    edge.kind,
                    edge.w,
                    session.data.sourcesOf(edge.id, { kind: "edge" }).length,
                ])
                .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));

        // Under sum, the two calls from A fold (1 + 2); the text call and B's call, whose weight
        // means distance, stay edges of their own.
        const summed = createGraphSession(ON);
        // The session holds one weight meaning, so the two sources' meanings are reported.
        assert.deepStrictEqual(await readBody(summed, rowsBody(sources("distance"), { types, repeatedEdges: "sum" })), [
            {
                code: "W_ROLES_DIFFER",
                params: { table: "edges", role: "weightMeaning", sources: [SRC_A, SRC_B] },
            },
        ]);
        assert.deepStrictEqual(weights(summed), [
            ["p:a", "p:b", "call", 3, 1],
            ["p:a", "p:b", "call", 4, 1],
            ["p:a", "p:b", "text", 5, 1],
            ["p:b", "p:c", "call", 7, 1],
        ]);
        assert.strictEqual(summed.config.data.knownFields.repeatedEdges, "sum", "the graph's choice is the session's");
        const { body: written } = await writeBody(summed);
        assert.strictEqual(written.repeatedEdges, "sum");

        // A folded row's reference is an alias of the edge it folded into.
        const refs = elementRefsOf(summed);
        assert.isDefined(refs.edge({ load: SRC_A, key: "e1" }));
        assert.strictEqual(refs.edge({ load: SRC_A, key: "e2" }), refs.edge({ load: SRC_A, key: "e1" }));

        // Under first, meanings do not matter: B's call folds into A's, and both sources supply it.
        const first = createGraphSession(ON);
        await readBody(first, rowsBody(sources("distance"), { types, repeatedEdges: "first" }));
        assert.deepStrictEqual(weights(first), [
            ["p:a", "p:b", "call", 1, 2],
            ["p:a", "p:b", "text", 5, 1],
            ["p:b", "p:c", "call", 7, 1],
        ]);

        // Under error, a repeat holds the section.
        const refused = createGraphSession(ON);
        assert.deepInclude(
            (await readBody(refused, rowsBody(sources("strength"), { types, repeatedEdges: "error" }))).map(
                (problem) => problem.code,
            ),
            "W_SECTION_KEPT",
        );
        for (const each of [summed, first, refused]) {
            each.dispose();
        }
    });

    it("credits a node only edges name to the sources of those edges, and keeps it out of their copies", async () => {
        const body = rowsBody([
            rowsSource(SRC_A, { nodes: { id: ["a"] } }),
            rowsSource(SRC_B, { edges: { source: ["a"], target: ["z"], w: [1] } }),
        ]);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), [
            { code: "W_NODE_NAMED_ONLY", params: { source: SRC_B, count: 1 } },
        ]);
        assert.deepStrictEqual(session.data.sourcesOf("p:z"), [SRC_B], "the source leaf matches it for B");
        const { body: written } = await writeBody(session);
        const loads = Object.fromEntries(
            ((written.graph as JsonObject).nodes as JsonObject[]).map((node) => [
                String(node["graphty.key"]),
                node["_source.loads"],
            ]),
        );
        assert.deepStrictEqual(loads, { a: [SRC_A], z: [SRC_B] });
        const b = (written.sources as JsonObject[]).find((source) => source.id === SRC_B) as JsonObject;
        assert.notProperty(b.copy, "nodes", "z is no node row of B's copy");
        session.dispose();
    });

    it("keeps a node one source's rows give values out of the copy of a source whose edges only name it", async () => {
        const body = rowsBody([
            rowsSource(SRC_A, { nodes: { id: ["a"], tag: ["x"] } }),
            rowsSource(SRC_B, { edges: { source: ["a"], target: ["z"], w: [1] } }),
        ]);
        const session = createGraphSession(ON);
        await readBody(session, body);
        const { body: written } = await writeBody(session);
        const loads = Object.fromEntries(
            ((written.graph as JsonObject).nodes as JsonObject[]).map((node) => [
                String(node["graphty.key"]),
                node["_source.loads"],
            ]),
        );
        assert.deepStrictEqual(loads, { a: [SRC_A], z: [SRC_B] }, "B only names a");
        const b = (written.sources as JsonObject[]).find((source) => source.id === SRC_B) as JsonObject;
        assert.notProperty(b.copy, "nodes", "a is no node row of B's copy");
        session.dispose();
    });

    it("keeps a reduced edge's first key under last, and every row's key an alias of it", async () => {
        const body = rowsBody(
            [
                rowsSource(SRC_A, {
                    nodes: { id: ["a", "b"] },
                    edges: { eid: ["e1", "e2"], source: ["a", "a"], target: ["b", "b"], w: [1, 2] },
                }),
            ],
            { repeatedEdges: "last" },
        );
        const session = createGraphSession(ON);
        await readBody(session, body);
        const [edge] = session.data.edges();
        assert.strictEqual(edge.w, 2, "the last row's values");
        const refs = elementRefsOf(session);
        assert.strictEqual(refs.edge({ load: SRC_A, key: "e1" }), edge.id, "the first row's key");
        assert.strictEqual(refs.edge({ load: SRC_A, key: "e2" }), edge.id, "the last row's key is an alias");
        const { body: written } = await writeBody(session);
        const [link] = (written.graph as JsonObject).links as JsonObject[];
        assert.strictEqual(link["graphty.key"], "e1");
        const copy = ((written.sources as JsonObject[])[0].copy as JsonObject).edges as JsonObject;
        assert.deepStrictEqual(
            [copy.eid, copy.w],
            [
                ["e1", "e2"],
                [1, 2],
            ],
            "the copy holds both rows as read",
        );
        session.dispose();
    });

    it("keeps keyless row keys bound to the edge each row built or folded into", async () => {
        const body = rowsBody(
            [
                rowsSource(SRC_A, {
                    nodes: { id: ["a", "b", "c"] },
                    edges: { source: ["a", "a", "b"], target: ["b", "b", "c"], w: [1, 2, 7] },
                }),
            ],
            { repeatedEdges: "sum" },
        );
        const session = createGraphSession(ON);
        await readBody(session, body);
        const byEnds = new Map(session.data.edges().map((edge) => [`${edge.source}>${edge.target}`, edge.id]));
        const refs = elementRefsOf(session);
        const copy = "A".repeat(26);
        assert.strictEqual(refs.edge({ load: SRC_A, key: `${copy}#0` }), byEnds.get("p:a>p:b"));
        assert.strictEqual(refs.edge({ load: SRC_A, key: `${copy}#1` }), byEnds.get("p:a>p:b"));
        assert.strictEqual(refs.edge({ load: SRC_A, key: `${copy}#2` }), byEnds.get("p:b>p:c"));
        session.dispose();
    });

    it("writes a reduced edge's rows back as read, so a reduction survives save and reopen", async () => {
        const body = rowsBody(
            [
                rowsSource(SRC_A, {
                    nodes: { id: ["a", "b"] },
                    edges: { source: ["a", "a"], target: ["b", "b"], w: [1, 2] },
                }),
                rowsSource(SRC_B, { edges: { source: ["a"], target: ["b"], w: [4] } }),
            ],
            { repeatedEdges: "sum" },
        );
        const held = (session: GraphSession): unknown[] =>
            session.data.edges().map((edge) => [edge.w, session.data.sourcesOf(edge.id, { kind: "edge" })]);
        const session = createGraphSession(ON);
        await readBody(session, body);
        assert.deepStrictEqual(held(session), [[7, [SRC_A, SRC_B]]]);
        const { body: written } = await writeBody(session);
        const copies = Object.fromEntries(
            (written.sources as JsonObject[]).map((source) => [String(source.id), (source.copy as JsonObject).edges]),
        );
        assert.deepStrictEqual((copies[SRC_A] as JsonObject).w, [1, 2]);
        assert.deepStrictEqual((copies[SRC_B] as JsonObject).w, [4]);

        const reopened = createGraphSession(ON);
        await readBody(reopened, written);
        assert.deepStrictEqual(held(reopened), [[7, [SRC_A, SRC_B]]]);
        assert.strictEqual(JSON.stringify((await writeBody(reopened)).body), JSON.stringify(written));
        session.dispose();
        reopened.dispose();
    });

    it("builds a file opened with no repeatedEdges as keep, whatever the session held", async () => {
        const edges = { source: ["a", "a"], target: ["b", "b"], w: [1, 2] };
        const session = createGraphSession(ON);
        await readBody(
            session,
            rowsBody([rowsSource(SRC_A, { nodes: { id: ["a", "b"] }, edges })], { repeatedEdges: "sum" }),
        );
        await readBody(session, rowsBody([rowsSource(SRC_B, { nodes: { id: ["a", "b"] }, edges })]));
        assert.strictEqual(session.config.data.knownFields.repeatedEdges, "keep");
        assert.strictEqual(session.data.edges().length, 2);
        assert.notProperty((await writeBody(session)).body, "repeatedEdges");
        session.dispose();
    });

    it("manages a node an imported file's edges only name as a version 2 source's", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes: [{ id: "a" }] }) } });
        await session.data.import({ type: "csv", config: { data: "source,target\na,z\n" } }, { mode: "merge" });
        const { body } = await writeBody(session);
        const [json, csv] = (body.sources as JsonObject[]).map((source) => String(source.id));
        const loads = Object.fromEntries(
            ((body.graph as JsonObject).nodes as JsonObject[]).map((node) => [
                String(node["graphty.key"]),
                node["_source.loads"],
            ]),
        );
        assert.deepStrictEqual(loads, { a: [json], z: [csv] });
        const csvCopy = (body.sources as JsonObject[])[1].copy as JsonObject;
        assert.notProperty(csvCopy, "nodes", "the csv had no node rows");
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), [
            { code: "W_NODE_NAMED_ONLY", params: { source: csv, count: 1 } },
        ]);
        session.dispose();
        reopened.dispose();
    });

    it("keeps a node only edges named once no edge reaches it", async () => {
        const body = rowsBody([
            rowsSource(SRC_A, { nodes: { id: ["a"] } }),
            rowsSource(SRC_B, { edges: { source: ["a"], target: ["z"], w: [1] } }),
        ]);
        const session = createGraphSession(ON);
        await readBody(session, body);
        await session.data.removeEdges(session.data.edges().map((edge) => edge.id));
        const { body: written } = await writeBody(session);
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, written), []);
        assert.deepStrictEqual(
            reopened.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["p:a", "p:z"],
        );
        session.dispose();
        reopened.dispose();
    });

    it("declares a reader add's column types, so a non-finite number reopens as a number", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "Z", score: Number.POSITIVE_INFINITY, tag: "t" }]);
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const [add] = ((body.sources as JsonObject[])[0].copy as JsonObject).operations as JsonObject[];
        assert.deepStrictEqual(add.dtypes, { id: "string", score: "f64", tag: "string" });

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.strictEqual(reopened.data.nodes()[0].score, Number.POSITIVE_INFINITY);

        // An add without its declarations holds the section.
        const { dtypes: _dtypes, ...bare } = add;
        const without = structuredClone(body);
        ((without.sources as JsonObject[])[0].copy as JsonObject).operations = [bare];
        const held = createGraphSession(ON);
        assert.include(
            (await readBody(held, without)).map((problem) => problem.code),
            "W_SECTION_KEPT",
        );
        session.dispose();
        reopened.dispose();
        held.dispose();
    });

    it("gives a generated sample a minted copy id and always embeds it", async () => {
        const session = createGraphSession(ON);
        await session.data.generate("path", { n: 3 });
        const sourceId = String(
            ((await writeBody(session)).body.sources as JsonObject[]).find((each) => each.kind === "sample")?.id,
        );
        const { body, problems } = await writeBody(session, { [sourceId]: "referenced" });
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.deepStrictEqual(problems, [
            { code: "W_SOURCE_EMBEDDED", params: { source: sourceId, reason: "bytes" } },
        ]);
        const sample = (body.sources as JsonObject[]).find((each) => each.id === sourceId) as JsonObject;
        assert.match(String((sample.origin as JsonObject).copy), ULID);
        assert.strictEqual((sample.origin as JsonObject).generator, "path");
        assert.property(sample, "copy", "no bytes stand for it, so it is embedded");
        session.dispose();
    });

    it("writes a URL source's copy id, size and validators from the body it fetched", async () => {
        const text = "source,target\nAva,Ben\n";
        vi.stubGlobal("fetch", () =>
            Promise.resolve(
                new Response(text, { headers: { ETag: '"v1"', "Last-Modified": "Tue, 01 Sep 2026 00:00:00 GMT" } }),
            ),
        );
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: "https://example.org/people.csv" } });
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const origin = ((body.sources as JsonObject[]).find((each) => each.kind === "url") as JsonObject)
            .origin as JsonObject;
        const bytes = new TextEncoder().encode(text);
        const hex = Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
        assert.strictEqual(origin.copy, `sha256:${hex}`);
        assert.strictEqual(origin.size, bytes.byteLength);
        assert.strictEqual(origin.etag, '"v1"');
        assert.strictEqual(origin.lastModified, "Tue, 01 Sep 2026 00:00:00 GMT");
        session.dispose();
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
                (from.sources as JsonObject[]).map((source) => [String(source.id), (source.origin as JsonObject).copy]),
            );
        const written = copies(body);
        // The reader's edit is written back as read, so every copy keeps the bytes it hashed.
        for (const [id, copy] of Object.entries(copies(example))) {
            assert.strictEqual(written[id], copy, id);
        }

        const reader = (from: JsonObject): unknown =>
            ((from.sources as JsonObject[]).find((source) => source.kind === "reader")?.copy as JsonObject).operations;
        assert.deepStrictEqual(reader(body), reader(example));

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

    /**
     * An off `join.node-values` step of the section's first file source: kept and not built.
     * @param copy - The section.
     * @returns The step.
     */
    const offStep = (copy: JsonObject): JsonObject => ({
        op: "join.node-values",
        source: (copy.sources as JsonObject[])[1].id,
        off: true,
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
            ...(["compare", "membership", "action"] as const).map((member): [string, (copy: JsonObject) => void] => [
                `the reserved step member ${member}`,
                (copy) => (copy.joins as JsonObject[]).push({ ...offStep(copy), [member]: {} }),
            ]),
            [
                "the reserved mapping.many",
                (copy) => (copy.joins as JsonObject[]).push({ ...offStep(copy), mapping: { many: true } }),
            ],
            [
                "a space beginning graph:",
                (copy) =>
                    ((((copy.sources as JsonObject[])[1].mapping as JsonObject).edges as JsonObject).sourceSpace =
                        "graph:people"),
            ],
            [
                "the reserved reader merge",
                (copy) =>
                    (((copy.sources as JsonObject[])[0].copy as JsonObject).operations as JsonObject[]).push({
                        op: "merge",
                        into: { space: "s", key: "a" },
                        from: { space: "s", key: "b" },
                    }),
            ],
        ];
        // An off step without a reserved member is kept, never a refusal.
        const control = JSON.parse(JSON.stringify(body)) as JsonObject;
        (control.joins as JsonObject[]).push(offStep(control));
        const opened = createGraphSession(ON);
        assert.notInclude(
            (await readBody(opened, control)).map((problem) => problem.code),
            "W_SECTION_KEPT",
        );
        opened.dispose();
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
        );
        const reopened = createGraphSession(ON);
        const problems = quiet(await readBody(reopened, body));
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
        const cara = reopened.data.nodes().find((node) => node.id === "Cara");
        assert.strictEqual(cara?.mood, "calm", "the edit applied");
        session.dispose();
        reopened.dispose();
    });

    it("keeps a node only an edge names: no reader add, the same key after save and reopen", async () => {
        const example = structuredClone(readJson("examples/card-fraud.graphty-data.json"));
        const network = (example.sources as JsonObject[]).find((source) => source.kind === "network") as JsonObject;
        const nodes = (network.copy as JsonObject).nodes as Record<string, unknown[]>;
        for (const cells of Object.values(nodes)) {
            cells.splice(1, 1); // dev-9f3 is now named only by the device-login edges
        }

        const space = `source:${String(network.id)}`;
        const session = createGraphSession(ON);
        assert.include(
            (await readBody(session, example)).map((problem) => problem.code),
            "W_NODE_NAMED_ONLY",
        );
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const named = ((body.graph as JsonObject).nodes as JsonObject[]).find(
            (node) => node["graphty.key"] === "dev-9f3",
        );
        assert.deepStrictEqual(named?.["graphty.space"], space);
        // Supplied by no source's rows, it is supplied by the source whose edges reach it.
        assert.deepStrictEqual(named?.["_source.loads"], [network.id]);
        assert.notProperty(named, "id (column)");
        const written = (body.sources as JsonObject[]).find((source) => source.id === network.id) as JsonObject;
        assert.notInclude(
            ((written.copy as JsonObject).nodes as JsonObject).id as unknown[],
            "dev-9f3",
            "it is no row of the copy",
        );
        const reader = (body.sources as JsonObject[]).find((source) => source.id === "reader");
        const adds = ((reader?.copy as JsonObject | undefined)?.operations as JsonObject[] | undefined) ?? [];
        assert.isFalse(
            adds.some((operation) => operation.op === "add"),
            "a named-only node is not a reader add",
        );

        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.isDefined(elementRefsOf(reopened).node({ space, key: "dev-9f3" }));
        session.dispose();
        reopened.dispose();
    });

    it("writes every working column into the node-link graph, key, end and edge-id columns included", async () => {
        const session = createGraphSession(ON);
        await readBody(session, readJson("examples/card-fraud.graphty-data.json"));
        const { body } = await writeBody(session);
        const graph = body.graph as { nodes: JsonObject[]; links: JsonObject[] };
        const ana = graph.nodes.find((node) => node["graphty.key"] === "acct-1001");
        // The key column, though it repeats graphty.key.
        const keyColumn = "account_id";
        assert.strictEqual(ana?.[keyColumn], "acct-1001");
        const payment = graph.links.find((link) => link["graphty.key"] === "pay-881");
        // The example's own column names, as the file spells them.
        assert.deepStrictEqual(
            ["event_id", "account_id", "counterparty_id"].map((name) => payment?.[name]),
            ["pay-881", "acct-1001", "merch-77"],
        );
        session.dispose();
    });

    it("names a value a later source gives under clash both <column> (<source id>)", async () => {
        const source = (id: string, label: string): JsonObject => ({
            id,
            label: id,
            kind: "file",
            origin: { copy: `sha256:${"0".repeat(64)}` },
            mapping: { nodes: { key: "id", space: "shared:people" } },
            copy: { nodes: { id: ["ava"], label: [label] } },
            columns: { nodes: { id: { name: "id", dtype: "string" }, label: { name: "label", dtype: "string" } } },
        });
        const [a, b] = [`src_${"A".repeat(26)}`, `src_${"B".repeat(26)}`];
        const body: JsonObject = {
            build: "0".repeat(26),
            directed: false,
            sources: [source(a, "Ava"), source(b, "Ava R.")],
            types: [],
            joins: [
                { op: "join.add", source: a },
                { op: "join.add", source: b, clash: "both" },
            ],
            graph: { directed: false, multigraph: false, graph: {}, nodes: [], links: [] },
        };
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const [ava] = session.data.nodes();
        assert.strictEqual(ava.label, "Ava");
        assert.strictEqual(ava[`label (${b})`], "Ava R.");
        session.dispose();

        // No rule keeps the held value, and writes no second column.
        const kept = createGraphSession(ON);
        (body.joins as JsonObject[])[1] = { op: "join.add", source: b };
        assert.deepStrictEqual(await readBody(kept, body), []);
        const [held] = kept.data.nodes();
        assert.strictEqual(held.label, "Ava");
        assert.notProperty(held, `label (${b})`);
        kept.dispose();
    });

    it("mints a new build when the open left part of the section out, and binds runs to the build read", async () => {
        const example: JsonObject = { ...readJson("examples/card-fraud.graphty-data.json"), edgeIds: [] };
        const session = createGraphSession(ON);
        const problems = await readBody(session, example);
        assert.deepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: "/edgeIds" },
        });
        const { body } = await writeBody(session);
        assert.match(String(body.build), ULID);
        assert.notStrictEqual(body.build, example.build, "what is written differs from what was read");
        assert.strictEqual((await dataBindingOf(session)).build, example.build, "runs keep the build they ran on");
        session.dispose();
    });

    it("writes a network source's origin as its closed object, the ledger an open read kept", async () => {
        const example = structuredClone(readJson("examples/card-fraud.graphty-data.json"));
        const network = (example.sources as JsonObject[]).find((source) => source.kind === "network") as JsonObject;
        const ledger = { key: network.id, source: "org.example.bank", version: 1, config: {}, expansions: [] };
        Object.assign(network.origin as JsonObject, { ledger });
        const session = createGraphSession(ON);
        await readBody(session, example);
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const written = (body.sources as JsonObject[]).find((source) => source.id === network.id);
        assert.deepStrictEqual((written?.origin as JsonObject).ledger, ledger);
        assert.deepStrictEqual(written?.origin, network.origin, "url, credential slot and validators kept as read");
        session.dispose();
    });

    it("writes an integer too large to hold exactly as its decimal string, read back as a number, its row kept", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "a", big: 2 ** 60 },
                        { id: "b", big: 1 },
                    ],
                    edges: [],
                }),
            },
            name: "big.json",
        });
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const source = (body.sources as JsonObject[]).find((each) => each.kind !== "reader") as JsonObject;
        const cells = ((source.copy as JsonObject).nodes as JsonObject).big as unknown[];
        assert.deepStrictEqual(cells, ["1152921504606846976", 1]);
        assert.strictEqual((((source.columns as JsonObject).nodes as JsonObject).big as JsonObject).dtype, "f64");
        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.strictEqual(reopened.data.nodes().length, 2, "the row is never refused");
        assert.strictEqual(reopened.data.nodes().find((node) => node.id === "a")?.big, 2 ** 60);
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

    it("leaves out a node row whose key cell is null or empty and counts it, and keys rows of no key column", async () => {
        const id = `src_${"C".repeat(26)}`;
        const copy = `sha256:${"1".repeat(64)}`;
        const body: JsonObject = {
            build: "0".repeat(26),
            directed: false,
            sources: [
                {
                    id,
                    label: "people",
                    kind: "file",
                    origin: { copy },
                    mapping: { nodes: { key: "id", space: "people" } },
                    copy: { nodes: { id: ["ava", "", null], name: ["Ava", "Blank", "Null"] } },
                    columns: {
                        nodes: {
                            id: { name: "id", dtype: "string", nullable: true },
                            name: { name: "name", dtype: "string" },
                        },
                    },
                },
            ],
            types: [],
            joins: [{ op: "join.add", source: id }],
            graph: { directed: false, multigraph: false, graph: {}, nodes: [], links: [] },
        };
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), [
            { code: "W_KEY_EMPTY", params: { source: id, column: "id", rows: 2 } },
        ]);
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.name),
            ["Ava"],
        );
        assert.isDefined(elementRefsOf(session).node({ space: "people", key: "ava" }));

        // With no key column every row is keyless, keyed by its row in the source's own space.
        const unkeyed = structuredClone(body);
        const [record] = unkeyed.sources as JsonObject[];
        record.mapping = {};
        const keyless = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(keyless, unkeyed), []);
        const refs = elementRefsOf(keyless);
        for (const row of [0, 1, 2]) {
            assert.isDefined(
                refs.node({ space: `source:${id}`, key: `${copy}#${String(row)}` }),
                `row ${String(row)} is keyless, in the source's own space`,
            );
        }

        keyless.dispose();
        session.dispose();
    });

    it("keeps the reader's edit, remove and merge through a save and a reopen, and reports what it folds", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "csv",
            config: { data: "source,target\nAva,Ben\nBen,Cara\nCara,Dan\n" },
            name: "people.csv",
        });
        await session.data.updateNodes([{ id: "Ava", values: { mood: "calm" } }]);
        await session.data.removeNodes(["Dan"]);
        await session.data.mergeNodes(["Ben", "Cara"], { into: "Ben" });
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.sameMembers(
            problems.map((problem) => problem.params.field),
            ["edit", "remove", "merge"],
            "each is reported, never dropped silently",
        );

        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.sameMembers(
            reopened.data.nodes().map((node) => node.id),
            ["Ava", "Ben"],
        );
        assert.strictEqual(reopened.data.node("Ava")?.mood, "calm");
        assert.deepStrictEqual(stateOf(reopened), stateOf(session));
        session.dispose();
        reopened.dispose();
    });

    it("builds a node or an edge from several rows with the first row's values and type", async () => {
        const id = `src_${"D".repeat(26)}`;
        const body: JsonObject = {
            build: "0".repeat(26),
            directed: true,
            sources: [
                {
                    id,
                    label: "calls",
                    kind: "file",
                    origin: { copy: `sha256:${"2".repeat(64)}` },
                    mapping: {
                        nodes: { key: "id", space: "people" },
                        edges: {
                            edgeId: "call",
                            source: "from",
                            sourceSpace: "people",
                            target: "to",
                            targetSpace: "people",
                        },
                    },
                    settings: { duplicateIds: "merge" },
                    copy: {
                        nodes: { id: ["a", "b", "a"], role: ["x", null, "y"], team: [null, null, "blue"] },
                        edges: {
                            call: ["c1", "c1"],
                            from: ["a", "a"],
                            to: ["b", "b"],
                            kind: ["phone", "text"],
                            note: [null, "later"],
                        },
                    },
                    columns: {
                        nodes: {
                            id: { name: "id", dtype: "string" },
                            role: { name: "role", dtype: "string", nullable: true },
                            team: { name: "team", dtype: "string", nullable: true },
                        },
                        edges: {
                            call: { name: "call", dtype: "string" },
                            from: { name: "from", dtype: "string" },
                            to: { name: "to", dtype: "string" },
                            kind: { name: "kind", dtype: "string" },
                            note: { name: "note", dtype: "string", nullable: true },
                        },
                    },
                },
            ],
            types: [],
            joins: [{ op: "join.add", source: id }],
            graph: { directed: true, multigraph: false, graph: {}, nodes: [], links: [] },
        };
        const session = createGraphSession(ON);
        await readBody(session, body);
        const [edge] = session.data.edges();
        assert.strictEqual(session.data.edges().length, 1);
        assert.strictEqual(edge.kind, "phone", "the first row's value");
        assert.strictEqual(edge.note, "later", "a later row fills only what the first left unset");
        const a = session.data.nodes().find((node) => node.id === "people:a");
        assert.strictEqual(a?.role, "x", "a node keeps its first row's value too");
        assert.strictEqual(a?.team, "blue", "and a later row fills only what the first left unset");
        session.dispose();
    });

    it("loads repeated ids under merge with the first row's values, one node and one edge, as a reopen builds them", async () => {
        const session = createGraphSession(ON);
        await session.config.set({ data: { knownFields: { edgeIdPath: "eid" } } });
        await session.data.import(
            {
                type: "json",
                config: {
                    data: JSON.stringify({
                        nodes: [{ id: "a", role: "x" }, { id: "b" }, { id: "a", role: "y", team: "blue" }],
                        edges: [
                            { eid: "e1", source: "a", target: "b", kind: "phone" },
                            { eid: "e1", source: "a", target: "b", kind: "text", note: "later" },
                        ],
                    }),
                },
                name: "calls.json",
            },
            { duplicateIds: "merge" },
        );
        const a = session.data.node("a");
        assert.strictEqual(a?.role, "x", "the first row's value stands");
        assert.strictEqual(a?.team, "blue", "a later row fills only what the first left unset");
        assert.strictEqual(session.data.edges().length, 1);
        assert.strictEqual(session.data.edges()[0].kind, "phone");
        assert.strictEqual(session.data.edges()[0].note, "later");

        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const links = (body.graph as JsonObject).links as JsonObject[];
        assert.deepStrictEqual(
            links.map((link) => link["graphty.key"]),
            ["e1"],
        );
        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.strictEqual(reopened.data.edges().length, 1);
        assert.deepStrictEqual(keysOf((await writeBody(reopened)).body), keysOf(body));
        session.dispose();
        reopened.dispose();
    });

    for (const [what, type, data] of [
        ["JSON null", "json", JSON.stringify({ nodes: [{ id: "a" }, { id: null, name: "Blank" }], edges: [] })],
        ["JSON empty", "json", JSON.stringify({ nodes: [{ id: "a" }, { id: "", name: "Blank" }], edges: [] })],
        ["a CSV empty cell", "csv", "id,name\na,Ann\n,Blank\n"],
    ] as const) {
        it(`leaves out a node row whose id is ${what} and counts it, as a saved file's empty key`, async () => {
            const session = createGraphSession(ON);
            const source = { type, config: { data }, name: `blank.${type}` };
            await session.data.import(source);
            assert.strictEqual(session.data.nodes().length, 1);
            assert.strictEqual(session.data.lastImport()?.counts.rejected, 1);
            const { body } = await writeBody(session);
            assert.deepStrictEqual(invalid(asSection(body)), []);
            assert.isUndefined(
                ((body.graph as JsonObject).nodes as JsonObject[]).find((node) => node.name === "Blank"),
            );

            const reopened = createGraphSession(ON);
            assert.deepStrictEqual(await readBody(reopened, body), []);
            assert.strictEqual(reopened.data.nodes().length, 1);
            assert.deepStrictEqual(keysOf((await writeBody(reopened)).body), keysOf(body));
            session.dispose();
            reopened.dispose();
        });
    }

    it("keeps reserved-prefix columns out and reports them, writes handle-named columns as (column)", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "a", "graphty.mine": 1, "_source.theirs": 2 }, { id: "b" }],
                    edges: [{ source: "a", target: "b", key: "k1" }],
                }),
            },
            name: "odd.json",
        });
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.sameDeepMembers(
            problems.map((problem) => problem.params),
            [
                { section: "data", field: "node:graphty.mine" },
                { section: "data", field: "node:_source.theirs" },
            ],
        );
        const graph = body.graph as { nodes: JsonObject[]; links: JsonObject[] };
        assert.notProperty(graph.nodes[0], "graphty.mine");
        assert.strictEqual(graph.nodes[0]["id (column)"], "a");
        assert.strictEqual(graph.links[0]["key (column)"], "k1");
        assert.notProperty(graph.links[0], "key");
        session.dispose();
    });

    it("writes a big integer key as its exact decimal string, and reads only the number strings spec 11 names as numbers", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: { data: `{"nodes":[{"id":${String(2 ** 70)}}],"edges":[]}` },
            name: "big.json",
        });
        const { body } = await writeBody(session);
        const node = (body.graph as { nodes: JsonObject[] }).nodes[0];
        assert.strictEqual(node["graphty.key"], "1180591620717411303424");

        const id = `src_${"E".repeat(26)}`;
        const reopened = createGraphSession(ON);
        await readBody(reopened, {
            build: "0".repeat(26),
            directed: false,
            sources: [
                {
                    id,
                    label: "values",
                    kind: "file",
                    origin: { copy: `sha256:${"3".repeat(64)}` },
                    mapping: { nodes: { key: "id", space: "v" } },
                    copy: { nodes: { id: ["a", "b", "c", "d"], x: ["Infinity", "abc", "", "1180591620717411303424"] } },
                    columns: { nodes: { id: { name: "id", dtype: "string" }, x: { name: "x", dtype: "f64" } } },
                },
            ],
            types: [],
            joins: [{ op: "join.add", source: id }],
            graph: { directed: false, multigraph: false, graph: {}, nodes: [], links: [] },
        });
        assert.deepStrictEqual(
            ["a", "b", "c", "d"].map((key) => {
                const node = elementRefsOf(reopened).node({ space: "v", key });
                return node === undefined ? "missing" : reopened.data.node(node)?.x;
            }),
            [Number.POSITIVE_INFINITY, "abc", "", 2 ** 70],
        );
        session.dispose();
        reopened.dispose();
    });

    it("holds the section for a network origin outside its closed form, or a copy id of the wrong form", async () => {
        for (const change of [
            (network: JsonObject): void => {
                (network.origin as JsonObject).name = "extra.json";
            },
            (network: JsonObject): void => {
                (network.origin as JsonObject).copy = `sha256:${"4".repeat(64)}`;
            },
        ]) {
            const example = structuredClone(readJson("examples/card-fraud.graphty-data.json"));
            change((example.sources as JsonObject[]).find((source) => source.kind === "network") as JsonObject);
            const session = createGraphSession(ON);
            const codes = (await readBody(session, example)).map((problem) => problem.code);
            assert.include(codes, "W_SECTION_KEPT");
            assert.strictEqual(session.data.nodes().length, 0, "nothing applied");
            session.dispose();
        }
    });
});

describe("the join history: steps that read sources (spec 4.1.8)", () => {
    const STAGED = "src_01JZ0000000000000000000000";

    /**
     * A sample session's body, the first loaded source's id, and the same body with a staged
     * source: a copy of that source's record under another id, which no step names.
     * @returns The body, the source and the staged body.
     */
    async function stagedBody(): Promise<{ body: JsonObject; first: string; staged: JsonObject }> {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        session.dispose();
        const record = (body.sources as JsonObject[]).find((source) => source.kind !== "reader") as JsonObject;
        const staged = structuredClone(body);
        (staged.sources as JsonObject[]).push({ ...structuredClone(record), id: STAGED });
        return { body, first: String(record.id), staged };
    }

    const recordOf = (body: JsonObject, id: string): JsonObject | undefined =>
        (body.sources as JsonObject[]).find((source) => source.id === id);

    it("keeps a source no step builds: stage, save, reopen, save, and it is still there, built by nothing", async () => {
        const { body, staged } = await stagedBody();
        const plain = createGraphSession(ON);
        await readBody(plain, body);
        const reopened = createGraphSession(ON);
        const problems = quiet(await readBody(reopened, staged));
        assert.deepStrictEqual(problems, [], "a staged source is no part left out");
        assert.strictEqual(reopened.data.nodes().length, plain.data.nodes().length, "it builds nothing");
        assert.notInclude(
            reopened.data.sources().map((load) => load.key),
            STAGED,
        );

        const saved = (await writeBody(reopened)).body;
        assert.deepStrictEqual(invalid(asSection(saved)), []);
        assert.deepStrictEqual(recordOf(saved, STAGED), recordOf(staged, STAGED), "written back as read");
        assert.strictEqual(saved.build, staged.build, "no build input, so no new build");
        assert.notProperty((await dataBindingOf(reopened)).sources, STAGED, "not in bindsTo.sources");

        const again = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(again, saved)), []);
        assert.deepStrictEqual(recordOf((await writeBody(again)).body, STAGED), recordOf(staged, STAGED));
        for (const each of [plain, reopened, again]) {
            each.dispose();
        }
    });

    it("keeps off steps, and a source whose only steps are off, without building them", async () => {
        const { body, first, staged } = await stagedBody();
        const edgesOff: JsonObject = {
            op: "join.edges",
            source: first,
            part: 1,
            read: { table: "edges", source: "source", sourceSpace: "x", target: "target", targetSpace: "y" },
            columns: [],
            repeated: "first",
            unmatchedRows: "leave-out",
            off: true,
        };
        const addOff: JsonObject = { op: "join.add", source: STAGED, off: true };
        staged.joins = [...(body.joins as JsonObject[]), edgesOff, addOff];
        assert.deepStrictEqual(invalid(asSection(staged)), []);

        const plain = createGraphSession(ON);
        await readBody(plain, body);
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(reopened, staged)), []);
        assert.strictEqual(reopened.data.edges().length, plain.data.edges().length, "an off step builds nothing");

        const saved = (await writeBody(reopened)).body;
        assert.deepStrictEqual(invalid(asSection(saved)), []);
        assert.deepStrictEqual(saved.joins, staged.joins, "written back as read");
        assert.deepStrictEqual(recordOf(saved, STAGED), recordOf(staged, STAGED));
        plain.dispose();
        reopened.dispose();
    });

    it("writes the join history back in the order it was read, with the same build", async () => {
        const { body, first } = await stagedBody();
        const edgesOff: JsonObject = { op: "join.edges", source: first, part: 1, off: true };
        const at = (body.joins as JsonObject[]).findIndex((step) => step.source === first);
        (body.joins as JsonObject[]).splice(at, 0, edgesOff);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(reopened, body)), []);
        const saved = (await writeBody(reopened)).body;
        assert.deepStrictEqual(saved.joins, body.joins);
        assert.strictEqual(saved.build, body.build);
        reopened.dispose();
    });

    it("keeps the type rules naming a staged source", async () => {
        const { staged } = await stagedBody();
        const later = { name: "later", kind: "node", rules: [{ source: STAGED }], schema: { type: "object" } };
        staged.types = [...(staged.types as JsonObject[]), later];
        assert.deepStrictEqual(invalid(asSection(staged)), []);
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(reopened, staged)), []);
        const saved = (await writeBody(reopened)).body;
        assert.deepInclude(saved.types as JsonObject[], later);
        assert.strictEqual(saved.build, staged.build);
        reopened.dispose();
    });

    it("applies a join.add step's own duplicateIds over its source's, and writes it back", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "a", role: "x" }, { id: "b" }], edges: [] }) },
            name: "people.json",
        });
        const { body } = await writeBody(session);
        session.dispose();
        const file = (body.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject;
        const nodes = (file.copy as JsonObject).nodes as Record<string, unknown[]>;
        for (const [column, cells] of Object.entries(nodes)) {
            cells.push({ id: "a", role: "y" }[column] ?? null);
        }

        file.settings = { duplicateIds: "refuse" };
        const refused = createGraphSession(ON);
        assert.deepInclude(await readBody(refused, body), {
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: `/sources/${String(file.id)}` },
        });
        refused.dispose();

        const step = (body.joins as JsonObject[]).find((each) => each.source === file.id) as JsonObject;
        step.duplicateIds = "first";
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.strictEqual(reopened.data.nodes().length, 2);
        assert.strictEqual(reopened.data.node("a")?.role, "x", "the step's first row stands");
        const saved = (await writeBody(reopened)).body;
        assert.deepInclude(saved.joins as JsonObject[], { op: "join.add", source: file.id, duplicateIds: "first" });
        reopened.dispose();
    });

    it("keeps a type rule naming a part", async () => {
        const { body, first } = await stagedBody();
        body.types = [
            {
                name: "contact",
                kind: "edge",
                plainName: "Contact",
                rules: [{ source: first, part: 1 }],
                schema: { type: "object" },
            },
        ];
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(session, body)), []);
        assert.deepInclude((await writeBody(session)).body.types as JsonObject[], (body.types as JsonObject[])[0]);
        session.dispose();
    });

    it("holds the section for a step this reader does not build, and for a step outside its shape", async () => {
        const { body, first } = await stagedBody();
        const edges = { op: "join.edges", source: first, part: 1 };
        const values = { op: "join.node-values", source: first, read: { table: "edges", key: "source", space: "x" } };
        // Steps the schema accepts that this reader does not build, or may not: held, never built another way.
        const unbuilt: [string, JsonObject[]][] = [
            ["join.merge (folds nodes an earlier step built)", [{ op: "join.merge", source: first }]],
            ["join.node-values", [values]],
            ["join.edge-values", [{ op: "join.edge-values", source: first, edges: first }]],
            ["join.edges", [edges]],
            ["join.add with columns", [{ op: "join.add", source: STAGED, columns: ["w"] }]],
            ["a second join.add of one source", [{ op: "join.add", source: first }]],
            // A rule no schema can state.
            [
                "a part repeated in one source",
                [
                    { ...edges, off: true },
                    { ...edges, off: true },
                ],
            ],
        ];
        // Steps outside the shape: the schema refuses them too.
        const malformed: [string, JsonObject[]][] = [
            ["read on join.add", [{ op: "join.add", source: STAGED, read: { table: "nodes" } }]],
            ["ignoreCase on join.add", [{ op: "join.add", source: STAGED, ignoreCase: true }]],
            ["join.edges with no part", [{ ...edges, part: undefined, off: true }]],
            ["part on a node step", [{ ...values, part: 2, off: true }]],
            ["viaEnd on a node step", [{ ...values, viaEnd: "target", off: true }]],
            ["repeated both on a node step", [{ ...values, repeated: "both", off: true }]],
            ["a weight role on a node step", [{ ...values, read: { table: "edges", weight: "w" }, off: true }]],
            ["a key without its space", [{ ...values, read: { key: "source" }, off: true }]],
            ["duplicateIds on a step but join.add", [{ ...edges, duplicateIds: "first", off: true }]],
            ["unmatchedRows on join.merge", [{ op: "join.merge", source: first, unmatchedRows: "add", off: true }]],
            ["off: false", [{ op: "join.add", source: STAGED, off: false }]],
            ["the refused keys", [{ ...values, keys: [], off: true }]],
            ["rows without values", [{ ...values, rows: { column: "kind" }, off: true }]],
            ["join.edge-values with no edges", [{ op: "join.edge-values", source: first, off: true }]],
            ["a via that is no column name", [{ ...values, via: 5, off: true }]],
            ["an empty role", [{ ...values, read: { key: "", space: "x" }, off: true }]],
            ["a column named twice", [{ ...values, columns: ["a", "a"], off: true }]],
        ];
        for (const [what, steps, schemaToo] of [
            ...unbuilt.map(([w, s]) => [w, s, false] as const),
            ...malformed.map(([w, s]) => [w, s, true] as const),
        ]) {
            const copy = structuredClone(body);
            (copy.sources as JsonObject[]).push({
                ...structuredClone(recordOf(body, first) as JsonObject),
                id: STAGED,
            });
            copy.joins = [...(copy.joins as JsonObject[]), ...(JSON.parse(JSON.stringify(steps)) as JsonObject[])];
            assert.strictEqual(invalid(asSection(copy)).length > 0, schemaToo, `${what}: schema`);
            const target = createGraphSession(ON);
            assert.deepStrictEqual(
                await readBody(target, copy),
                [{ code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } }],
                what,
            );
            assert.strictEqual(target.data.nodes().length, 0, `${what}: nothing applied`);
            target.dispose();
        }
    });

    it("holds the section for a referenced source whose parse options its parser does not read", async () => {
        const { body, first } = await stagedBody();
        // A CSV source: the CSV parser reads no sheet and no pointer, and missing takes a list.
        assert.strictEqual(recordOf(body, first)?.format, "csv");
        for (const name of ["pointer", "sheet", "missing"]) {
            const copy = structuredClone(body);
            const record = recordOf(copy, first) as JsonObject;
            delete record.copy;
            record.options = { ...(record.options as JsonObject | undefined), [name]: "x" };
            const target = createGraphSession(ON);
            assert.include(
                (await readBody(target, copy)).map((problem) => problem.code),
                "W_SECTION_KEPT",
                name,
            );
            target.dispose();
        }
    });
});

describe("a source saved by reference, read again", () => {
    const LOCATION = "https://example.test/p/x.graphty.json";
    const CSV = "source,target\nAva,Ben\n";
    const scratch = (): GraphSession => createGraphSession(ON);
    /** What an open the caller lets fetch gives the fetch. */
    const how = { fetch: true, limit: 1 << 20, builds: (): boolean => true, scratch };

    /**
     * friends.csv saved by its path beside the file, as a data body.
     * @returns The body, its source's id and the source's place in the body.
     */
    async function referencedFriends(): Promise<{ body: JsonObject; id: string; at: number }> {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: CSV }, name: "friends.csv" });
        const { body } = await writeBody(session);
        session.dispose();
        const sources = body.sources as JsonObject[];
        const at = sources.findIndex((source) => source.kind === "file");
        delete sources[at].copy;
        (sources[at].origin as JsonObject).path = "friends.csv";
        assert.deepStrictEqual(invalid(asSection(body)), []);
        return { body, id: String(sources[at].id), at };
    }

    it("publishes a referenced source the schema accepts, its columns without its copy", () => {
        assert.deepStrictEqual(invalid(readJson("examples/minimal/minimal-referenced.graphty-data.json")), []);
    });

    it("fetches a path-only source beside the file it was saved in, and reads a file the reader picked instead", async () => {
        const fetched = vi.fn((_url: string) => Promise.resolve(new Response(CSV)));
        vi.stubGlobal("fetch", fetched);
        const beside = await referencedFriends();
        await refetchSources(beside.body, { location: LOCATION, ...how });
        assert.deepStrictEqual(
            fetched.mock.calls.map(([url]) => url),
            ["https://example.test/p/friends.csv"],
        );
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, beside.body), []);
        assert.deepStrictEqual(
            reopened.data.nodes().map((node) => node.id),
            ["Ava", "Ben"],
        );

        fetched.mockClear();
        const picked = await referencedFriends();
        await refetchSources(picked.body, { files: { [picked.id]: new File([CSV], "friends.csv") }, ...how });
        assert.strictEqual(fetched.mock.calls.length, 0);
        const fromFile = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(fromFile, picked.body), []);
        assert.strictEqual(fromFile.data.edges().length, 1);
        reopened.dispose();
        fromFile.dispose();
    });

    it("needs a file for a path with no location to resolve it against, and fetches nothing", async () => {
        const fetched = vi.fn((_url: string) => Promise.resolve(new Response(CSV)));
        vi.stubGlobal("fetch", fetched);
        const { body, id } = await referencedFriends();
        await refetchSources(body, how);
        const reopened = createGraphSession(ON);
        assert.deepInclude(await readBody(reopened, body), {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "needs-file" },
        });
        assert.strictEqual(fetched.mock.calls.length, 0);
        reopened.dispose();
    });

    it("reports a saved column the rows read again lack", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(CSV)));
        const { body, at } = await referencedFriends();
        const record = (body.sources as JsonObject[])[at];
        ((record.columns as JsonObject).edges as JsonObject).mood = { name: "mood", dtype: "string", nullable: true };
        await refetchSources(body, { location: LOCATION, ...how });
        const reopened = createGraphSession(ON);
        assert.deepInclude(await readBody(reopened, body), {
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: `/sources/${String(at)}/columns/edges/mood` },
        });
        reopened.dispose();
    });

    it("follows a join.add step's own duplicateIds over its source's, as for a copy", async () => {
        const json = JSON.stringify({
            nodes: [{ id: "a", role: "x" }, { id: "b" }, { id: "a", role: "y" }],
            edges: [],
        });
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(json)));
        const session = createGraphSession(ON);
        await session.data.import({ type: "json", config: { data: json }, name: "people.json" });
        const { body } = await writeBody(session);
        session.dispose();
        const record = (body.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject;
        delete record.copy;
        (record.origin as JsonObject).path = "people.json";
        const step = (body.joins as JsonObject[]).find((each) => each.source === record.id) as JsonObject;
        for (const [settings, own, nodes] of [
            ["refuse", "first", 2],
            ["first", "refuse", 0],
        ] as const) {
            const copy = structuredClone(body);
            const each = (copy.sources as JsonObject[]).find((source) => source.id === record.id) as JsonObject;
            each.settings = { ...(each.settings as JsonObject), duplicateIds: settings };
            (copy.joins as JsonObject[])[(body.joins as JsonObject[]).indexOf(step)].duplicateIds = own;
            assert.deepStrictEqual(invalid(asSection(copy)), []);
            await refetchSources(copy, { location: LOCATION, ...how });
            const reopened = createGraphSession(ON);
            const problems = await readBody(reopened, copy);
            assert.strictEqual(reopened.data.nodes().length, nodes, `${own} over ${settings}`);
            if (own === "refuse") {
                assert.deepInclude(problems, {
                    code: "W_MEMBER_LEFT_OUT",
                    params: { section: "data", pointer: `/sources/${String(record.id)}` },
                });
            } else {
                assert.deepStrictEqual(problems, []);
                assert.strictEqual(reopened.data.node("a")?.role, "x", "the first row stands");
            }

            reopened.dispose();
        }
    });

    it("reads two collections of one JSON file by their pointers, fetched once and refreshed together", async () => {
        const json = JSON.stringify({
            graph: {
                people: [{ id: "ava" }, { id: "ben", team: "N/A" }],
                knows: [{ source: "ava", target: "ben" }],
            },
        });
        const fetched = vi.fn((_url: string) => Promise.resolve(new Response(json)));
        vi.stubGlobal("fetch", fetched);
        const session = createGraphSession(ON);
        const config = { data: json, missing: ["N/A"] };
        await session.data.import({ type: "json", config: { ...config, pointer: "/graph/people" }, name: "org.json" });
        await session.data.import(
            { type: "json", config: { ...config, pointer: "/graph/knows" }, name: "org.json" },
            { mode: "merge" },
        );
        const { body } = await writeBody(session);
        session.dispose();
        const files = (body.sources as JsonObject[]).filter((source) => source.kind === "file");
        assert.deepStrictEqual(
            files.map((record) => (record.options as JsonObject).pointer),
            ["/graph/people", "/graph/knows"],
        );
        assert.deepStrictEqual((files[0].options as JsonObject).missing, ["N/A"]);
        assert.strictEqual((files[0].origin as JsonObject).copy, (files[1].origin as JsonObject).copy, "one copy id");
        for (const record of files) {
            delete record.copy;
            (record.origin as JsonObject).path = "org.json";
        }

        assert.deepStrictEqual(invalid(asSection(body)), []);
        await refetchSources(body, { location: LOCATION, ...how });
        assert.strictEqual(fetched.mock.calls.length, 1, "the shared bytes are fetched once");
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.deepStrictEqual(
            reopened.data.nodes().map((node) => node.id),
            ["ava", "ben"],
        );
        assert.strictEqual(reopened.data.edges().length, 1);
        assert.isUndefined(reopened.data.node("ben")?.team, "missing is read again");
        const saved = (await writeBody(reopened)).body;
        assert.deepStrictEqual(
            (saved.sources as JsonObject[]).flatMap((record) =>
                record.kind === "file" ? [(record.options as JsonObject).pointer] : [],
            ),
            ["/graph/people", "/graph/knows"],
            "kept on a second save",
        );
        reopened.dispose();
    });

    it("reads a referenced workbook's second sheet again by its name, and a first sheet it read by default", async () => {
        const book = new Uint8Array(
            readFileSync(new URL("../../../../graph-io/test/formats/xlsx/fixtures/two-sheets.xlsx", import.meta.url)),
        );
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(book)));
        const session = createGraphSession(ON);
        await session.data.import({ type: "xlsx", config: { data: book, sheet: "Links" }, name: "org.xlsx" });
        await session.data.import({ type: "xlsx", config: { data: book }, name: "org.xlsx" }, { mode: "merge" });
        const { body } = await writeBody(session);
        session.dispose();
        const files = (body.sources as JsonObject[]).filter((source) => source.kind === "file");
        // the sheet a load read is recorded even when the load named none
        assert.deepStrictEqual(
            files.map((record) => (record.options as JsonObject).sheet),
            ["Links", "People"],
        );
        for (const record of files) {
            delete record.copy;
            (record.origin as JsonObject).path = "org.xlsx";
        }

        assert.deepStrictEqual(invalid(asSection(body)), []);
        await refetchSources(body, { location: LOCATION, ...how });
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), [], "the section is read, not held");
        assert.strictEqual(reopened.data.edges().length, 3);
        assert.strictEqual(reopened.data.node("ava")?.code, "007");
        reopened.dispose();
    });

    it("reads a referenced CSV again with its missing option", async () => {
        const csv = "id,team\nava,core\nben,N/A\n";
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(csv)));
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: csv, missing: ["N/A"] }, name: "team.csv" });
        assert.isUndefined(session.data.node("ben")?.team);
        const { body } = await writeBody(session);
        session.dispose();
        const record = (body.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject;
        assert.deepStrictEqual((record.options as JsonObject).missing, ["N/A"]);
        delete record.copy;
        (record.origin as JsonObject).path = "team.csv";
        await refetchSources(body, { location: LOCATION, ...how });
        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.strictEqual(reopened.data.node("ava")?.team, "core");
        assert.isUndefined(reopened.data.node("ben")?.team);
        reopened.dispose();
    });

    it("embeds a source another load also supplied rows to, and says why", async () => {
        const session = createGraphSession(ON);
        // A node table: an edge list's ends only name their nodes, so they would share no row.
        await session.data.import({ type: "csv", config: { data: "id,age\nAva,30\nBen,40\n" }, name: "friends.csv" });
        await session.data.import(
            {
                type: "json",
                config: { data: JSON.stringify({ nodes: [{ id: "Ava", kind: "person" }], edges: [] }) },
                name: "pets.json",
            },
            { mode: "merge" },
        );
        const { body } = await writeBody(session);
        for (const source of body.sources as JsonObject[]) {
            (source.origin as JsonObject).path = String(source.label);
        }

        const opened = createGraphSession(ON);
        assert.deepStrictEqual(quiet(await readBody(opened, body)), []);
        const pets = String((body.sources as JsonObject[]).find((source) => source.label === "pets.json")?.id);
        rememberRefetch(opened, { location: AT, limit: Number.MAX_SAFE_INTEGER });
        const { problems } = await writeBody(opened, { [pets]: "referenced" }, AT);
        assert.deepStrictEqual(problems, [{ code: "W_SOURCE_EMBEDDED", params: { source: pets, reason: "rows" } }]);
        session.dispose();
        opened.dispose();
    });
});

describe("clash rules, per-source roles and picks (spec 4.1.3 rule 7, 4.1.4, 4.1.8 rule 11)", () => {
    const SRC_C = `src_${"C".repeat(26)}`;

    /**
     * An embedded source of one node row keyed `id` in the space `p`.
     * @param id - The source id.
     * @param nodes - Its node columns, one row.
     * @param roles - More node mapping members.
     * @returns The record.
     */
    function nodeSource(id: string, nodes: Record<string, unknown[]>, roles: JsonObject = {}): JsonObject {
        const record = rowsSource(id, { nodes: { id: ["ava"], ...nodes } });
        record.mapping = { nodes: { key: "id", space: "p", ...roles } };
        return record;
    }

    it('computes min, max, mean and vote over every source\'s own value, by column with "*" for the rest', async () => {
        const body = rowsBody([
            nodeSource(SRC_A, { amount: [10], city: ["x"], when: ["2026-01-02"] }),
            nodeSource(SRC_B, { amount: [30], city: ["y"], when: ["2026-01-01"] }),
            nodeSource(SRC_C, { amount: [20], city: ["x"], when: ["2026-01-03"] }),
        ]);
        (body.joins as JsonObject[])[2].clash = { "*": "vote", amount: "mean", when: "min" };
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const [ava] = session.data.nodes();
        // B kept A's values (no rule); C's rules read all three sources, not only the held value.
        assert.strictEqual(ava.amount, 20);
        assert.strictEqual(ava.city, "x");
        assert.strictEqual(ava.when, "2026-01-01");

        // The rules are written back on the step that carried them.
        const { body: saved } = await writeBody(session);
        assert.deepInclude(saved.joins as JsonObject[], {
            op: "join.add",
            source: SRC_C,
            clash: { "*": "vote", amount: "mean", when: "min" },
        });
        session.dispose();
    });

    it("overwrites, and keeps the held value where a number rule meets a value it cannot read", async () => {
        const body = rowsBody([
            nodeSource(SRC_A, { amount: ["lots"], city: ["x"] }),
            nodeSource(SRC_B, { amount: [5], city: ["y"] }),
        ]);
        (body.joins as JsonObject[])[1].clash = { amount: "max", city: "overwrite" };
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), [
            { code: "W_CLASH_RULE_TYPE", params: { step: 1, column: "amount", rule: "max", cells: 1 } },
        ]);
        const [ava] = session.data.nodes();
        assert.strictEqual(ava.amount, "lots");
        assert.strictEqual(ava.city, "y");
        session.dispose();
    });

    it("holds the section for a clash rule it does not know", async () => {
        for (const clash of ["newest", { amount: "sum" }, {}]) {
            const body = rowsBody([nodeSource(SRC_A, {}), nodeSource(SRC_B, {})]);
            (body.joins as JsonObject[])[1].clash = clash;
            assert.isNotEmpty(invalid(asSection(body)), JSON.stringify(clash));
            const session = createGraphSession(ON);
            assert.deepStrictEqual(await readBody(session, body), [
                { code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } },
            ]);
            session.dispose();
        }
    });

    it("sets the time settings from a source's roles, and writes them back as its roles", async () => {
        const roles = { time: "when", timeUnit: "year", timeEnd: "until", timeParseZone: "Europe/Paris" };
        const body = rowsBody([nodeSource(SRC_A, { when: [1990], until: [2000] }, roles)]);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const known = session.config.data.knownFields;
        assert.strictEqual(known.nodeTimePath, "when");
        assert.strictEqual(known.nodeTimeUnit, "year");
        assert.strictEqual(known.nodeTimeEndPath, "until");
        assert.strictEqual(known.nodeTimeParseZone, "Europe/Paris");
        assert.isNull(known.edgeWeightPath, "an absent role means none");

        const { body: saved, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, []);
        assert.deepStrictEqual(invalid(asSection(saved)), []);
        const [record] = saved.sources as JsonObject[];
        assert.deepInclude((record.mapping as JsonObject).nodes as JsonObject, roles);
        session.dispose();
    });

    it("reports a role two sources name differently, leaves its setting null, and writes each back", async () => {
        const body = rowsBody([
            nodeSource(SRC_A, { when: [1990] }, { time: "when" }),
            nodeSource(SRC_B, { id: ["ben"], at: [1991] }, { time: "at" }),
        ]);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), [
            { code: "W_ROLES_DIFFER", params: { table: "nodes", role: "time", sources: [SRC_A, SRC_B] } },
        ]);
        assert.isNull(session.config.data.knownFields.nodeTimePath);
        const { body: saved } = await writeBody(session);
        const timeOf = (id: string): unknown =>
            (
                ((saved.sources as JsonObject[]).find((each) => each.id === id)?.mapping as JsonObject)
                    .nodes as JsonObject
            ).time;
        assert.strictEqual(timeOf(SRC_A), "when");
        assert.strictEqual(timeOf(SRC_B), "at");

        // A setting chosen since is the role of each source carrying the column; one that does not
        // carry it keeps its own.
        await session.config.set({ data: { knownFields: { nodeTimePath: "when" } } });
        const { body: chosen } = await writeBody(session);
        const mappings = (chosen.sources as JsonObject[]).map(
            (each) => (each.mapping as JsonObject).nodes as JsonObject,
        );
        assert.deepStrictEqual(
            mappings.map((each) => each.time),
            ["when", "at"],
        );
        session.dispose();
    });

    it("writes no role onto a source whose file never named it, though its rows carry the column", async () => {
        const body = rowsBody([
            nodeSource(SRC_A, { when: [1990] }, { time: "when" }),
            nodeSource(SRC_B, { id: ["ben"], when: [1991] }),
        ]);
        // Both sources' edges carry the weight column, but only A's mapping names it.
        const [a, b] = [
            rowsSource(SRC_A, {
                nodes: { id: ["ava"], when: [1990] },
                edges: { source: ["ava"], target: ["ben"], w: [2] },
            }),
            rowsSource(SRC_B, {
                nodes: { id: ["ben"], when: [1991] },
                edges: { source: ["ben"], target: ["ava"], w: [3] },
            }),
        ];
        ((a.mapping as JsonObject).nodes as JsonObject).time = "when";
        const edges = (b.mapping as JsonObject).edges as JsonObject;
        delete edges.weight;
        delete edges.weightMeaning;
        body.sources = [a, b];
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        assert.strictEqual(session.config.data.knownFields.nodeTimePath, "when");
        assert.strictEqual(session.config.data.knownFields.edgeWeightPath, "w");
        const { body: saved, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, []);
        const mappingOf = (id: string): JsonObject =>
            (saved.sources as JsonObject[]).find((each) => each.id === id)?.mapping as JsonObject;
        assert.strictEqual((mappingOf(SRC_A).nodes as JsonObject).time, "when");
        assert.notProperty(mappingOf(SRC_B).nodes as JsonObject, "time");
        assert.strictEqual((mappingOf(SRC_A).edges as JsonObject).weight, "w");
        assert.notProperty(mappingOf(SRC_B).edges as JsonObject, "weight");
        assert.notProperty(mappingOf(SRC_B).edges as JsonObject, "weightMeaning");
        session.dispose();
    });

    it("reports the location settings no mapping member holds instead of dropping them", async () => {
        const body = rowsBody([nodeSource(SRC_A, { city: ["Paris"], ctry: ["FR"] }, { city: "city" })]);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        await session.config.set({
            data: {
                knownFields: { nodeLocationWithinPath: "ctry", nodeLocationWithin: "FR", nodeLocationRole: "none" },
            },
        });
        const { body: saved, problems } = await writeBody(session);
        assert.deepStrictEqual(
            problems,
            ["nodeLocationWithinPath", "nodeLocationWithin", "nodeLocationRole"].map((field) => ({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", field: `data.knownFields.${field}` },
            })),
        );
        const [record] = saved.sources as JsonObject[];
        assert.strictEqual(((record.mapping as JsonObject).nodes as JsonObject).city, "city");
        session.dispose();
    });

    /**
     * A saved source's node column, by source id.
     * @param body - The saved body.
     * @param id - The source id.
     * @param column - The column.
     * @returns Its cells.
     */
    const cellsOf = (body: JsonObject, id: string, column: string): unknown =>
        (((body.sources as JsonObject[]).find((each) => each.id === id)?.copy as JsonObject).nodes as JsonObject)[
            column
        ];

    it("keeps every source's own value through a save whatever a clash rule shows", async () => {
        for (const [rule, shown] of [
            [undefined, 10],
            ["keep", 10],
            ["overwrite", 30],
            ["max", 30],
            ["mean", 20],
            ["vote", 10],
        ] as const) {
            const body = rowsBody([nodeSource(SRC_A, { amount: [10] }), nodeSource(SRC_B, { amount: [30] })]);
            if (rule !== undefined) {
                (body.joins as JsonObject[])[1].clash = rule;
            }

            const session = createGraphSession(ON);
            assert.deepStrictEqual(await readBody(session, body), []);
            assert.strictEqual(session.data.nodes()[0].amount, shown, String(rule));
            const { body: saved, problems } = await writeBody(session);
            assert.deepStrictEqual(problems, []);
            assert.deepStrictEqual(cellsOf(saved, SRC_A, "amount"), [10], String(rule));
            assert.deepStrictEqual(cellsOf(saved, SRC_B, "amount"), [30], String(rule));

            // Opened again, the rule shows the same, and a second save writes the same file.
            const again = createGraphSession(ON);
            assert.deepStrictEqual(await readBody(again, saved), []);
            assert.strictEqual(again.data.nodes()[0].amount, shown, String(rule));
            assert.strictEqual(canonicalJson((await writeBody(again)).body), canonicalJson(saved), String(rule));
            session.dispose();
            again.dispose();
        }
    });

    it("writes a value the reader changed since the open into every source that supplies the node", async () => {
        const body = rowsBody([nodeSource(SRC_A, { amount: [10] }), nodeSource(SRC_B, { amount: [30] })]);
        (body.joins as JsonObject[])[1].clash = "mean";
        const session = createGraphSession(ON);
        await readBody(session, body);
        await session.data.updateNodes([{ id: session.data.nodes()[0].id, values: { amount: 99 } }]);
        const { body: saved } = await writeBody(session);
        assert.deepStrictEqual(cellsOf(saved, SRC_A, "amount"), [99]);
        assert.deepStrictEqual(cellsOf(saved, SRC_B, "amount"), [99]);
        session.dispose();
    });

    it("round-trips clash both: no clash column is saved or doubled, and none for the key", async () => {
        const body = rowsBody([nodeSource(SRC_A, { amount: [10] }), nodeSource(SRC_B, { amount: [30] })]);
        (body.joins as JsonObject[])[1].clash = "both";
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const [ava] = session.data.nodes();
        assert.strictEqual(ava.amount, 10);
        assert.strictEqual(ava[`amount (${SRC_B})`], 30);
        assert.notProperty(ava, `id (${SRC_B})`, "the key column never clashes");
        const { body: saved } = await writeBody(session);
        assert.deepStrictEqual(cellsOf(saved, SRC_A, "amount"), [10]);
        assert.deepStrictEqual(cellsOf(saved, SRC_B, "amount"), [30]);
        assert.isUndefined(cellsOf(saved, SRC_A, `amount (${SRC_B})`));

        const again = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(again, saved), []);
        assert.deepStrictEqual(again.data.nodes(), session.data.nodes());
        assert.strictEqual(canonicalJson((await writeBody(again)).body), canonicalJson(saved));
        session.dispose();
        again.dispose();
    });

    it("writes the weight setting as the role of the source whose edges carry it, and reads it back", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "csv",
            config: { data: "source,target,cost\nAva,Ben,2\n" },
            name: "trips.csv",
        });
        await session.config.set({ data: { knownFields: { edgeWeightPath: "cost", edgeWeightMeaning: "distance" } } });
        const { body } = await writeBody(session);
        const [record] = (body.sources as JsonObject[]).filter((each) => each.kind !== "reader");
        assert.deepInclude((record.mapping as JsonObject).edges as JsonObject, {
            weight: "cost",
            weightMeaning: "distance",
        });
        const reopened = createGraphSession(ON);
        await readBody(reopened, body);
        assert.strictEqual(reopened.config.data.knownFields.edgeWeightPath, "cost");
        assert.strictEqual(reopened.config.data.knownFields.edgeWeightMeaning, "distance");
        session.dispose();
        reopened.dispose();
    });

    it("applies a pick like any edit, and holds the section for a pick naming no source", async () => {
        const reader = {
            id: "reader",
            label: "Edits",
            kind: "reader",
            origin: { copy: "0".repeat(26) },
            copy: {
                operations: [
                    {
                        op: "edit",
                        node: { space: "p", key: "ava" },
                        column: "city",
                        value: "y",
                        was: "x",
                        picked: SRC_B,
                    },
                ],
            },
        };
        const body = rowsBody([nodeSource(SRC_A, { city: ["x"] }), nodeSource(SRC_B, { city: ["y"] })]);
        (body.sources as JsonObject[]).push(reader);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        assert.strictEqual(session.data.nodes()[0].city, "y");

        // The pick is written back as read, and each source's copy keeps its own value.
        const { body: saved, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, []);
        assert.deepStrictEqual(cellsOf(saved, SRC_A, "city"), ["x"]);
        assert.deepStrictEqual(cellsOf(saved, SRC_B, "city"), ["y"]);
        const written = (saved.sources as JsonObject[]).find((each) => each.kind === "reader");
        assert.deepStrictEqual((written?.copy as JsonObject).operations, reader.copy.operations);
        const again = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(again, saved), []);
        assert.strictEqual(again.data.nodes()[0].city, "y");
        assert.strictEqual(canonicalJson((await writeBody(again)).body), canonicalJson(saved));
        again.dispose();

        // Changed since, the cell is the session's again: written into the copies, the edit reported.
        await session.data.updateNodes([{ id: session.data.nodes()[0].id, values: { city: "z" } }]);
        const changed = await writeBody(session);
        assert.deepStrictEqual(changed.problems, [EDIT_FOLDED]);
        assert.deepStrictEqual(cellsOf(changed.body, SRC_A, "city"), ["z"]);
        session.dispose();

        const operation = (reader.copy.operations as JsonObject[])[0];
        operation.picked = SRC_C;
        const held = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(held, body), [
            { code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } },
        ]);
        held.dispose();
    });
});
