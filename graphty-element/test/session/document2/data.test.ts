/**
 * @file The version 2 `data` section codec (spec/README.md 4.1, 6, 11), behind the
 * `save-files-v2` experiment: a session written and read back, the written section valid against
 * the published schema, the worked example's hashes and fingerprint recomputed, element references
 * binding both ways, and a section that cannot be built whole applying nothing.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import {
    bindingOfBody,
    byCanonical,
    edgeRowHash,
    elementRefsOf,
    hashOf,
} from "../../../src/session/document2/codecs/dataRefs";
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
 * @param options - The mode and another section to lend.
 * @param options.dataMode - Replace or add.
 * @param options.recipe - A recipe body `context.other("recipe")` returns.
 * @returns The problems.
 */
async function readBody(
    session: GraphSession,
    body: JsonObject,
    options: { dataMode?: "replace" | "add"; recipe?: JsonObject } = {},
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
            dataMode: options.dataMode ?? "replace",
            restored: new Set(),
            other: (name) =>
                name === "recipe" && options.recipe !== undefined
                    ? { header: { kind: "graphty-recipe", version: 2 }, body: options.recipe, pointer: "" }
                    : undefined,
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
 * What a session holds, in a form two sessions can be compared by.
 * @param session - The session.
 * @returns Nodes, edges, loads and provenance, sorted.
 */
function stateOf(session: GraphSession): unknown {
    const nodes = session.data
        .nodes()
        .map((node) => ({ ...node, loads: session.data.sourcesOf(node.id) }))
        .sort(byCanonical);
    const edges = session.data
        .edges()
        .map(({ id, ...edge }) => ({ ...edge, loads: session.data.sourcesOf(id, { kind: "edge" }) }))
        .sort(byCanonical);
    const loads = session.data.sources().map((load) => [load.key, load.kind, load.name, load.type]);
    return { nodes, edges, loads, directed: session.status.directed };
}

describe("data section version 2", () => {
    it("round-trips a session: state to section to state, and section to state to section byte for byte", async () => {
        const session = await sampleSession();
        const { body, problems } = await writeBody(session);
        assert.deepStrictEqual(problems, []);

        const reopened = createGraphSession(ON);
        assert.deepStrictEqual(await readBody(reopened, body), []);
        assert.deepStrictEqual(stateOf(reopened), stateOf(session));

        const again = await writeBody(reopened);
        assert.strictEqual(JSON.stringify(again.body), JSON.stringify(body));

        // Each node's record key, and an infinite score written as its string form.
        const graph = body.graph as JsonObject;
        const zed = (graph.nodes as JsonObject[]).find((node) => node["graphty.key"] === "Zed");
        assert.strictEqual(zed?.["graphty.space"], "source:reader");
        const ben = (graph.nodes as JsonObject[]).find((node) => node["graphty.key"] === "Ben");
        assert.strictEqual(ben?.score, "Infinity");
        assert.deepStrictEqual(
            (body.joins as JsonObject[]).map((step) => step.op),
            ["join.add", "join.merge"],
        );
        session.dispose();
        reopened.dispose();
    });

    it("writes a section the published schema accepts, embedded or referenced", async () => {
        const session = await sampleSession();
        const full = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section" },
            () => false,
        );
        assert.deepStrictEqual(invalid(full.document), []);
        assert.isString(full.document.id, "the framing writes the data section's id");

        const referenced = await saveDocument2(
            session,
            { data: dataCodec },
            { sections: ["data"], form: "section", embed: { s1: "referenced" } },
            () => false,
        );
        assert.deepStrictEqual(invalid(referenced.document), []);
        const s1 = (referenced.document.sources as JsonObject[]).find((source) => source.id === "s1");
        assert.notProperty(s1, "copy");
        assert.notProperty(s1, "columns");
        assert.deepStrictEqual(referenced.problems, [{ code: "W_SOURCE_NO_PATH", params: { source: "s1" } }]);

        // A referenced source cannot be fetched again yet: the section is not built whole, so it is
        // held and nothing of it is applied.
        const reopened = createGraphSession(ON);
        const read = await readBody(reopened, referenced.document);
        assert.deepInclude(read, { code: "W_SOURCE_UNAVAILABLE", params: { source: "s1" } });
        assert.deepInclude(read, { code: "W_SECTION_KEPT", params: { section: "data", version: 2, reason: "data" } });
        assert.lengthOf(reopened.data.nodes(), 0);
        session.dispose();
        reopened.dispose();
    });

    it("recomputes the worked example's hashes and fingerprint", () => {
        const data = readJson("examples/card-fraud.graphty-data.json");
        const results = readJson("examples/card-fraud.graphty-results.json");
        const view = readJson("examples/card-fraud.graphty-view.json");
        const sources = data.sources as JsonObject[];
        const byId = new Map(sources.map((source) => [String(source.id), source]));
        const hash = (source: JsonObject | undefined): unknown => (source?.origin as JsonObject).hash;

        const reader = byId.get("reader") as JsonObject;
        const copy = reader.copy as Record<string, JsonObject[]>;
        const sorted = Object.fromEntries(
            Object.entries(copy).map(([list, rows]) => [
                list,
                [...rows].sort((a, b) => byCanonical(a.node ?? a.edge ?? a.nodes, b.node ?? b.edge ?? b.nodes)),
            ]),
        );
        assert.strictEqual(hash(reader), hashOf(sorted));
        const activity = byId.get("activity") as JsonObject;
        assert.strictEqual(hash(activity), hashOf(activity.copy));

        const bindsTo = results.bindsTo as JsonObject;
        const binding = bindingOfBody(data);
        assert.strictEqual(binding.fingerprint, bindsTo.fingerprint);
        assert.deepStrictEqual(binding.sources, bindsTo.sources);

        // The view's unkeyed edge is the hash of its activity row without its ends and id.
        const edges = (activity.copy as JsonObject).edges as Record<string, unknown[]>;
        const row = Object.fromEntries(Object.entries(edges).map(([name, cells]) => [name, cells[2]]));
        const selected = ((view.selection as JsonObject).edges as JsonObject[])[0];
        assert.strictEqual(
            edgeRowHash("activity", row, new Set(["event_id", "account_id", "counterparty_id"])),
            selected.h,
        );
    });

    it("reads the worked example: spaces from types, renames, an edge's key and a reader edit", async () => {
        const session = createGraphSession(ON);
        const problems = await readBody(session, readJson("examples/card-fraud.graphty-data.json"));
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(session.data.nodes().length, 5);
        assert.strictEqual(session.data.edges().length, 5);
        const cy = session.data.nodes().find((node) => node.id === "account:acct-1003");
        assert.strictEqual(cy?.label, "Cy Lam", "holder is renamed label");
        assert.strictEqual(cy?.country, "NG", "the reader's edit wins");
        assert.isDefined(session.data.nodes().find((node) => node.id === "merchant:merch-77"));
        assert.isTrue(session.status.directed);
        session.dispose();
    });

    it("binds element references both ways, by key when unique and by h and n otherwise", async () => {
        const session = await sampleSession();
        await session.config.set({ data: { knownFields: { edgeIdPath: "eid" } } });
        await session.data.addEdges([
            { source: "Ben", target: "Cara", eid: "x" },
            { source: "Cara", target: "Ava", eid: "y" },
            { source: "Cara", target: "Ava", eid: "y" },
        ]);
        const refs = elementRefsOf(session);
        for (const node of session.data.nodes()) {
            const ref = refs.nodeRef(node.id);
            assert.isDefined(ref);
            assert.strictEqual(refs.node(JSON.parse(JSON.stringify(ref)) as unknown), node.id);
        }

        const byEid = new Map<string, string[]>();
        for (const edge of session.data.edges()) {
            const ref = refs.edgeRef(edge.id);
            assert.isDefined(ref);
            assert.strictEqual(refs.edge(JSON.parse(JSON.stringify(ref)) as unknown), edge.id);
            if (typeof edge.eid === "string") {
                byEid.set(edge.eid, [...(byEid.get(edge.eid) ?? []), JSON.stringify(ref)]);
            }
        }

        assert.include(byEid.get("x")?.[0], '"key":"x"', "a key unique among its ends names the edge");
        // The ends are node references, which hold a `key` of their own: look at the edge's members.
        assert.notProperty(JSON.parse(byEid.get("y")?.[0] ?? "{}") as object, "key", "a repeated key does not");
        assert.include(byEid.get("y")?.[1], '"n":1');

        assert.strictEqual(refs.node(refs.nodeRef("Ava")), "Ava");
        assert.isUndefined(refs.node({ space: "source:s1", key: "Nobody" }));
        assert.isUndefined(refs.node({ space: "source:s1", key: "Ava", extra: 1 }), "a reference is closed");
        assert.isUndefined(refs.node("Ava"));
        assert.isUndefined(refs.edge({ from: refs.nodeRef("Ava"), to: refs.nodeRef("Ben"), key: "z", n: 0 }));
        assert.isUndefined(refs.edge(null));
        session.dispose();
    });

    it("applies nothing and reports W_SECTION_KEPT when the section cannot be built whole", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const broken: [string, (copy: JsonObject) => void][] = [
            ["an unknown join op", (copy) => ((copy.joins as JsonObject[])[0].op = "join.teleport")],
            ["a join shape this reader does not build", (copy) => ((copy.joins as JsonObject[])[0].op = "join.link")],
            ["an unknown source kind", (copy) => ((copy.sources as JsonObject[])[1].kind = "carrier-pigeon")],
            ["an unknown copy form", (copy) => ((copy.sources as JsonObject[])[1].copy = "elsewhere")],
            [
                "an unknown mapping member",
                (copy) => (((copy.sources as JsonObject[])[1].mapping as JsonObject).weird = true),
            ],
            [
                "an unknown space prefix",
                (copy) =>
                    ((((copy.sources as JsonObject[])[1].mapping as JsonObject).nodes as JsonObject).space = "moon:x"),
            ],
            ["an unknown join step member", (copy) => ((copy.joins as JsonObject[])[0].extra = 1)],
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

    it("adds the sources beside the open data in add mode", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const target = createGraphSession(ON);
        await target.data.import({ type: "csv", config: { data: "source,target\nP,Q\n" }, name: "s1.csv" });
        await readBody(target, body, { dataMode: "add" });
        const keys = target.data.sources().map((load) => load.key);
        assert.strictEqual(keys.length, 3);
        assert.strictEqual(new Set(keys).size, 3, "an incoming source id an open load has is renamed");
        assert.isTrue(target.data.nodes().some((node) => node.id === "P"));
        assert.isTrue(target.data.nodes().some((node) => node.id === "Cara"));
        session.dispose();
        target.dispose();
    });

    it("reports a recipe whose combine steps differ from the join history", async () => {
        const session = await sampleSession();
        const { body } = await writeBody(session);
        const target = createGraphSession(ON);
        const problems = await readBody(target, body, {
            recipe: { commands: [{ op: "join.add", source: "elsewhere" }] },
        });
        assert.deepInclude(problems, { code: "W_JOIN_HISTORY_DIFFERS", params: { section: "data" } });
        const same = createGraphSession(ON);
        assert.notDeepInclude(await readBody(same, body, { recipe: { commands: body.joins } }), {
            code: "W_JOIN_HISTORY_DIFFERS",
            params: { section: "data" },
        });
        session.dispose();
        target.dispose();
        same.dispose();
    });
});
