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

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("data section version 2", () => {
    it("round-trips a session: state to section to state, and section to state to section byte for byte", async () => {
        const session = await sampleSession();
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, [EDIT_FOLDED]);
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
            { code: "W_SOURCE_NO_PATH", params: { source: friends } },
            EDIT_FOLDED,
        ]);

        // A referenced source cannot be fetched again yet: it supplies nothing, the rest builds, and
        // its record is written back as read.
        const referenced = structuredClone(full.document);
        const record = (referenced.sources as JsonObject[]).find((source) => source.id === friends) as JsonObject;
        delete record.copy;
        delete record.columns;
        (record.origin as JsonObject).path = "friends.csv";
        (record.origin as JsonObject).copy = `sha256:${"a".repeat(64)}`;
        assert.deepStrictEqual(invalid(referenced), []);
        const reopened = createGraphSession(ON);
        const read = await readBody(reopened, referenced);
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

    it("embeds a referenced source the reader edited, under a minted copy id, and keeps the edit through a reopen", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: "source,target\nAva,Ben\n" }, name: "people.csv" });
        const written = (await writeBody(session)).body;
        const file = (written.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject;
        (file.origin as JsonObject).path = "people.csv";
        const id = String(file.id);

        const opened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(opened, written), []);
        const untouched = await writeBody(opened, { [id]: "referenced" });
        const before = (untouched.body.sources as JsonObject[]).find((source) => source.id === id);
        assert.notProperty(before, "copy", "a file with a known path is referenced as asked");
        assert.deepStrictEqual(untouched.problems, []);

        await opened.data.updateNodes([{ id: "Ava", values: { mood: "calm" } }]);
        const { body, problems } = await writeBody(opened, { [id]: "referenced" });
        assert.deepStrictEqual(invalid(asSection(body)), []);
        assert.deepStrictEqual(problems, [EDIT_FOLDED]);
        const after = (body.sources as JsonObject[]).find((source) => source.id === id) as JsonObject;
        assert.property(after, "copy", "an edited source is embedded whatever was asked");
        assert.match(String((after.origin as JsonObject).copy), ULID);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
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

    it("keys a node whose id is empty as its keyless row, the same key on every save", async () => {
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
        assert.include(
            session.data.nodes().map((node) => node.id),
            "",
        );
        const first = (await writeBody(session)).body;
        assert.deepStrictEqual(invalid(asSection(first)), []);
        const graph = first.graph as { nodes: JsonObject[]; links: JsonObject[] };
        const blank = graph.nodes.find((node) => node.label === "Blank");
        const source = (first.sources as JsonObject[]).find((each) => each.kind === "file") as JsonObject;
        const copy = String((source.origin as JsonObject).copy);
        assert.deepStrictEqual(
            [blank?.["graphty.space"], blank?.["graphty.key"]],
            [`source:${String(source.id)}`, `${copy}#1`],
        );

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, first), []);
        assert.strictEqual(reopened.data.edges().length, 1, "the edge naming it keeps its end");
        assert.deepStrictEqual(keysOf((await writeBody(reopened)).body), keysOf(first));
        session.dispose();
        reopened.dispose();
    });

    it("declares a reader add's column types, so a non-finite number reopens as a number", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "Z", score: Number.POSITIVE_INFINITY, tag: "t" }]);
        const { body } = await writeBody(session);
        assert.deepStrictEqual(invalid(asSection(body)), []);
        const [add] = ((body.sources as JsonObject[])[0].copy as JsonObject).operations as JsonObject[];
        assert.deepStrictEqual(add.dtypes, { score: "f64", tag: "string" });

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
        assert.deepStrictEqual(problems, []);
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
                (from.sources as JsonObject[]).map((source) => [source.id, (source.origin as JsonObject).copy]),
            );
        const written = copies(body);
        const file = String((example.sources as JsonObject[]).find((source) => source.kind === "file")?.id);
        for (const [id, copy] of Object.entries(copies(example)).filter(([id]) => id !== "reader" && id !== file)) {
            assert.strictEqual(written[id], copy, id);
        }

        // The reader's edit is folded into the file's copy, so it no longer holds the bytes it hashed.
        assert.match(String(written[file]), ULID);

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
        assert.deepStrictEqual(named?.["_source.loads"], []);
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

    it("names a value a later source gives differently <column> (<source id>)", async () => {
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
                { op: "join.add", source: b },
            ],
            graph: { directed: false, multigraph: false, graph: {}, nodes: [], links: [] },
        };
        const session = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(session, body), []);
        const [ava] = session.data.nodes();
        assert.strictEqual(ava.label, "Ava");
        assert.strictEqual(ava[`label (${b})`], "Ava R.");
        session.dispose();
    });

    it("mints a new build when the open left part of the section out, and binds runs to the build read", async () => {
        const example: JsonObject = { ...readJson("examples/card-fraud.graphty-data.json"), repeatedEdges: "first" };
        const session = createGraphSession(ON);
        const problems = await readBody(session, example);
        assert.deepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: "/repeatedEdges" },
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

    it("makes a node row whose key cell is null or empty keyless, and keeps its row", async () => {
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
        assert.deepStrictEqual(await readBody(session, body), []);
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.name)
                .sort(),
            ["Ava", "Blank", "Null"],
        );
        const refs = elementRefsOf(session);
        assert.isDefined(refs.node({ space: "people", key: "ava" }));
        for (const row of [1, 2]) {
            assert.isDefined(
                refs.node({ space: `source:${id}`, key: `${copy}#${String(row)}` }),
                `row ${String(row)} is keyless, in the source's own space`,
            );
        }

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
        it(`loads a node row whose id is ${what} as a keyless node keyed <copy id>#<row>`, async () => {
            const session = createGraphSession(ON);
            const source = { type, config: { data }, name: `blank.${type}` };
            // A CSV node table is read through a load draft, which takes its rows as they are.
            await (type === "csv" ? (await session.data.prepare(source)).load() : session.data.import(source));
            assert.strictEqual(session.data.nodes().length, 2);
            assert.strictEqual(session.data.lastImport()?.counts.rejected, 0);
            const { body } = await writeBody(session);
            assert.deepStrictEqual(invalid(asSection(body)), []);
            const file = (body.sources as JsonObject[]).find((each) => each.kind === "file") as JsonObject;
            const copy = String((file.origin as JsonObject).copy);
            const blank = ((body.graph as JsonObject).nodes as JsonObject[]).find((node) => node.name === "Blank");
            assert.deepStrictEqual(
                [blank?.["graphty.space"], blank?.["graphty.key"]],
                [`source:${String(file.id)}`, `${copy}#1`],
            );
            const cell = ((file.copy as JsonObject).nodes as JsonObject).id as unknown[];
            assert.include([null, ""], cell[1], "the row keeps its null or empty key cell");

            const reopened = createGraphSession(ON);
            assert.deepStrictEqual(await readBody(reopened, body), []);
            assert.strictEqual(reopened.data.nodes().length, 2);
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
