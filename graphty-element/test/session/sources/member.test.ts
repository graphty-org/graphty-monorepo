/**
 * @file The `graphty-sources` member, version 2 (design/documents/sources.md): what a project save
 * writes about every load, the `_source.loads` column, what an open reads back closed entry by
 * entry, and version 1 upgraded. Each conformance row of conformance.md, "Sources", that this
 * release builds is one test, named by its row. Every network load answers from recorded
 * responses; nothing reaches the internet.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

import { credentials } from "@graphty/graph-io";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { afterEach, assert, describe, it, vi } from "vitest";

import {
    createGraphSession,
    defineSource,
    type GraphSession,
    registerSource,
    SOURCE_RECORD_VERSION,
    SOURCES_MEMBER_VERSION,
} from "../../../session";
import { redactUrl } from "../../../src/session/sources/member";
import type { SourceLoadOptions } from "../../../src/session/sources/types";
import { loadRecordedSeed } from "../../../stories/fixtures/expand/source";

const schemaDir = new URL("../../../../design/documents/", import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const name of readdirSync(schemaDir).filter((each) => each.endsWith(".schema.json"))) {
    ajv.addSchema(JSON.parse(readFileSync(new URL(name, schemaDir), "utf8")) as object);
}

const validateDocument = ajv.getSchema("https://graphty.app/schema/documents/graphty-document/v1.json");

/** A gene table: Valjean, whom the network source also brings, and two more. */
const GENES = "source,target,weight\nvaljean,fantine,1\nfantine,tholomyes,2\n";

/** A trip table whose endpoint columns no reader guesses. */
const TRIPS = "from_station,to_station,trips\nA,B,3\nB,C,1\n";

/** A JSON document, as parsed. */
type Doc = { members: Record<string, unknown>[] } & Record<string, unknown>;

const sessions: GraphSession[] = [];

afterEach(() => {
    vi.unstubAllGlobals();
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A fresh session, disposed after the test.
 * @returns the session
 */
function fresh(): GraphSession {
    const session = createGraphSession();
    sessions.push(session);
    return session;
}

/**
 * A session that loaded `genes.csv`, then merged the recorded network source's seed.
 * @param options - more options for the network load
 * @returns the session
 */
async function csvThenNetwork(options: SourceLoadOptions = {}): Promise<GraphSession> {
    const session = fresh();
    await session.data.import({
        type: "csv",
        config: { file: new File([GENES], "genes.csv", { type: "text/csv" }) },
        name: "genes.csv",
    });
    // `update`, so the seed the table also holds carries the network load's key.
    await loadRecordedSeed(session, "recorded", {}, { existing: "update", ...options });
    return session;
}

/**
 * Save a session, checking the file against the published schemas.
 * @param session - the session
 * @param checked - false for a file holding an entry it read and wrote back as it was, which the
 *     schema need not accept (an entry of a later kind, or one that asks to write)
 * @returns the text and what the save reported
 */
async function save(
    session: GraphSession,
    checked = true,
): Promise<{ text: string; doc: Doc; leftOut: readonly unknown[] }> {
    const { text, report } = await session.project.save();
    const doc = JSON.parse(text) as Doc;
    if (checked) {
        const valid = validateDocument?.(doc);
        assert.isTrue(
            valid,
            (validateDocument?.errors ?? []).map((error) => `${error.instancePath} ${error.message ?? ""}`).join("; "),
        );
    }

    return { text, doc, leftOut: report.leftOut };
}

/**
 * A document's member of a kind.
 * @param doc - the document
 * @param kind - the kind
 * @returns the member and its position
 */
function memberOf(doc: Doc, kind: string): { member: Record<string, unknown>; at: number } {
    const at = doc.members.findIndex((each) => each.kind === kind);
    assert.isAtLeast(at, 0, `the file holds a ${kind} member`);
    return { member: doc.members[at], at };
}

/**
 * The sources member's entries.
 * @param doc - the document
 * @returns the entries
 */
function entries(doc: Doc): Record<string, unknown>[] {
    return memberOf(doc, "graphty-sources").member.loads as Record<string, unknown>[];
}

/**
 * The data member's node records.
 * @param doc - the document
 * @returns the records, by id
 */
function nodeRecords(doc: Doc): Map<unknown, Record<string, unknown>> {
    const graph = memberOf(doc, "graphty-data").member.graph as { nodes: Record<string, unknown>[] };
    return new Map(graph.nodes.map((node) => [node.id, node]));
}

/**
 * Open a file into a fresh session.
 * @param text - the file
 * @returns the session and the open's problems
 */
async function open(
    text: string,
): Promise<{ session: GraphSession; problems: readonly { code: string; params: Record<string, unknown> }[] }> {
    const session = fresh();
    const report = await session.project.open(text);
    return { session, problems: report.problems };
}

/**
 * A file with its sources member's entries changed.
 * @param text - the file
 * @param change - changes the entries in place
 * @returns the changed file, the changed member and its position
 */
function edited(
    text: string,
    change: (loads: Record<string, unknown>[], member: Record<string, unknown>) => void,
): { text: string; member: Record<string, unknown>; at: number } {
    const doc = JSON.parse(text) as Doc;
    const { member, at } = memberOf(doc, "graphty-sources");
    change(member.loads as Record<string, unknown>[], member);
    return { text: JSON.stringify(doc), member, at };
}

/**
 * What a session says about where its data came from, comparable across a save and an open.
 * @param session - the session
 * @returns the facts
 */
function provenanceFacts(session: GraphSession): Record<string, unknown> {
    const loadKeys = new Set(session.data.loads().map((load) => load.key));
    return {
        sources: session.data.sources().map((each) => [each.key, each.kind, each.counts]),
        nodes: session.data
            .nodes()
            .map((node) => {
                const source = session.data.nodeSource(node.id);
                return [
                    node.id,
                    session.data.sourcesOf(node.id),
                    source === null ? null : loadKeys.has(source.loadKey),
                ];
            })
            .sort(),
        edges: session.data
            .edges()
            .map((edge) => [edge.source, edge.target, session.data.sourcesOf(edge.id, { kind: "edge" })])
            .sort(),
    };
}

describe("the sources member: writing", () => {
    it("exports the member's version beside the deprecated record version", () => {
        assert.strictEqual(SOURCES_MEMBER_VERSION, 2);
        assert.strictEqual(SOURCE_RECORD_VERSION, 1);
    });

    it("src-1: one version 2 member with a file entry and a network entry, in load order", async () => {
        const session = await csvThenNetwork();
        const { doc } = await save(session);
        const { member } = memberOf(doc, "graphty-sources");
        assert.strictEqual(member.version, 2);
        const [file, network] = entries(doc);
        assert.deepInclude(file, { id: "s1", kind: "file", name: "genes.csv", mode: "replace", format: "csv" });
        assert.deepEqual(file.file, {
            name: "genes.csv",
            size: GENES.length,
            sha256: createHash("sha256").update(GENES).digest("hex"),
            mediaType: "text/csv",
        });
        assert.deepInclude(network, { id: "s2", kind: "source", mode: "merge" });
        const part = network.source as Record<string, unknown>;
        assert.strictEqual(part.id, "recorded-people");
        assert.deepEqual(part.params, {});
        assert.strictEqual(part.pages, 1);
        assert.isNull(part.next);
        assert.deepEqual(part.validators, {});
        assert.notProperty(part, "credentialSlot", "no credential was used");
    });

    it("src-2: an undone network load leaves only the file's entry", async () => {
        const session = await csvThenNetwork();
        await session.undo();
        const { doc } = await save(session);
        assert.deepEqual(
            entries(doc).map((entry) => entry.id),
            ["s1"],
        );
    });

    it("src-3: a load replaced by a later load leaves only the later one", async () => {
        const session = fresh();
        await session.data.import({ type: "csv", config: { data: GENES }, name: "first.csv" });
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" }, name: "second.csv" });
        const { doc } = await save(session);
        assert.deepEqual(
            entries(doc).map((entry) => [entry.id, entry.name, entry.mode]),
            [["s2", "second.csv", "replace"]],
        );
    });

    it("src-5: a node both loads supplied lists both; a node added by hand lists none", async () => {
        const session = await csvThenNetwork();
        await session.data.addNodes([{ id: "hand" }]);
        const { doc } = await save(session);
        const nodes = nodeRecords(doc);
        assert.deepEqual(nodes.get("valjean")?.["_source.loads"], ["s1", "s2"]);
        assert.deepEqual(nodes.get("fantine")?.["_source.loads"], ["s1"]);
        assert.notProperty(nodes.get("hand"), "_source.loads");
        const graph = memberOf(doc, "graphty-data").member.graph as { links: Record<string, unknown>[] };
        assert.isTrue(
            graph.links.every((link) => Array.isArray(link["_source.loads"])),
            "every link a load supplied names it",
        );
    });

    it("src-6: a node the first expansion of s2 brought lists s2/x1", async () => {
        const session = await csvThenNetwork();
        await session.data.expand(["valjean"]);
        const { doc } = await save(session);
        assert.deepEqual(nodeRecords(doc).get("javert")?.["_source.loads"], ["s2/x1"]);
        const part = entries(doc)[1].source as { expansions: Record<string, unknown>[] };
        assert.deepEqual(
            part.expansions.map((expansion) => [expansion.id, expansion.ids]),
            [["s2/x1", ["valjean"]]],
        );
    });

    it("src-8: a load that used a basic credential names only its slot", async () => {
        const session = await csvThenNetwork({ credential: credentials.basic("ana-user", "pa55-SECRET-word") });
        const { text, doc } = await save(session);
        assert.strictEqual((entries(doc)[1].source as Record<string, unknown>).credentialSlot, "default");
        assert.notInclude(text, "pa55-SECRET-word");
        assert.notInclude(text, "ana-user");
        assert.notInclude(text, '"origin"');
        assert.notInclude(text, '"username"');
        assert.notInclude(text, '"credential"');
    });

    it("src-26: a URL load is written without its user name, password, fragment or key", async () => {
        const fetched: string[] = [];
        vi.stubGlobal("fetch", (url: string) => {
            fetched.push(url);
            return Promise.resolve(new Response("source,target\na,b\n"));
        });
        const session = fresh();
        await session.data.import({ config: { url: "https://u:p@example.org/a.csv?v=2&api_key=K#top" } });
        const { text, doc, leftOut } = await save(session);
        const [entry] = entries(doc);
        assert.strictEqual(entry.kind, "url");
        assert.deepInclude(entry.url as object, { address: "https://example.org/a.csv?v=2", dropped: ["api_key"] });
        assert.deepInclude(leftOut, { code: "W_SOURCE_URL_REDACTED", params: { id: "s1", names: ["api_key"] } });
        assert.notInclude(text, "api_key=K");
        assert.notInclude(text, "u:p@");
        assert.notInclude(text, "#top");
        assert.isAbove(fetched.length, 0, "the load read the stubbed URL, never the network");
    });

    it("src-38: the same session saved twice gives the same bytes", async () => {
        const session = await csvThenNetwork();
        await session.data.expand(["valjean"]);
        const first = await save(session);
        const second = await save(session);
        assert.strictEqual(second.text, first.text);
    });

    it("writes no sources member, and no _source.loads column, for a session that loaded nothing", async () => {
        const session = fresh();
        await session.data.addNodes([{ id: "a" }]);
        const { doc } = await save(session);
        assert.isFalse(doc.members.some((each) => each.kind === "graphty-sources"));
        assert.notProperty(nodeRecords(doc).get("a"), "_source.loads");
    });

    it("records a generated graph as a sample entry with its generator and params", async () => {
        const session = fresh();
        await session.data.generate("path", { n: 4 });
        const { doc } = await save(session);
        assert.deepInclude(entries(doc)[0], { kind: "sample", sample: { generator: "path", params: { n: 4 } } });
    });
});

describe("the sources member: reading", () => {
    it("round-trips a CSV load, a merged network load and an expansion", async () => {
        const session = await csvThenNetwork();
        await session.data.expand(["valjean"]);
        await session.visibility.set({ kind: "source", sources: ["s2"] });
        const before = provenanceFacts(session);
        const shownBefore = session.visibility.summary;
        const { text } = await save(session);

        const { session: reopened } = await open(text);
        assert.deepEqual(provenanceFacts(reopened), before);
        assert.deepEqual(
            reopened.data.sources().map((each) => each.key),
            ["s1", "s2"],
        );
        // src-4: the saved filter by source selects the same elements.
        assert.deepEqual(reopened.visibility.filter, { kind: "source", sources: ["s2"] });
        assert.deepEqual(
            [reopened.visibility.summary.visibleNodes, reopened.visibility.summary.visibleEdges],
            [shownBefore.visibleNodes, shownBefore.visibleEdges],
        );
        assert.strictEqual(reopened.data.nodeSource("javert")?.loadKey, reopened.data.loads()[0].key);
    });

    it("gives a file-only session no new attribute after a round trip", async () => {
        const session = fresh();
        await session.data.import({ type: "csv", config: { data: GENES }, name: "genes.csv" });
        const names = session.data.attributes().map((each) => each.name);
        const { text } = await save(session);
        const { session: reopened } = await open(text);
        assert.deepEqual(
            reopened.data.attributes().map((each) => each.name),
            names,
        );
        assert.notProperty(reopened.data.node("valjean"), "_source.loads");
        assert.deepEqual(reopened.data.sourcesOf("valjean"), ["s1"]);
    });

    it("src-7: a value naming no entry is kept as data and makes the node belong to no load", async () => {
        const session = await csvThenNetwork();
        await session.data.addNodes([{ id: "stray" }]);
        const doc = JSON.parse((await save(session)).text) as Doc;
        const stray = nodeRecords(doc).get("stray") as Record<string, unknown>;
        stray["_source.loads"] = ["s9"];
        const { session: reopened } = await open(JSON.stringify(doc));
        assert.deepEqual(reopened.data.node("stray")?.["_source.loads"], ["s9"]);
        assert.deepEqual(reopened.data.sourcesOf("stray"), []);
    });

    it("src-13: opens embedded data with two network entries offline, fetching nothing", async () => {
        const session = await csvThenNetwork();
        await loadRecordedSeed(session);
        const { text } = await save(session);
        const calls: unknown[] = [];
        vi.stubGlobal("fetch", (input: unknown) => {
            calls.push(input);
            return Promise.reject(new Error("offline"));
        });
        const { session: reopened } = await open(text);
        assert.strictEqual(reopened.data.nodes().length, session.data.nodes().length, "the graph shows at once");
        assert.deepEqual(
            reopened.data.pendingSourceLoads().map((each) => each.id),
            ["s2", "s3"],
        );
        assert.lengthOf(calls, 0, "opening fetched nothing");
    });

    it("lists the credential slot of a pending load, and running it merges", async () => {
        const session = await csvThenNetwork({ credential: credentials.basic("ana-user", "pa55-SECRET-word") });
        const { text } = await save(session);
        const { session: reopened } = await open(text);
        const [pending] = reopened.data.pendingSourceLoads();
        assert.strictEqual(pending.credentialSlot, "default");
        const nodes = reopened.data.nodes().length;
        await reopened.data.runPendingSourceLoad(pending.id);
        assert.strictEqual(reopened.data.nodes().length, nodes);
        assert.deepEqual(reopened.data.pendingSourceLoads(), []);
    });

    it("src-17: an entry of a source this release lacks is kept, not offered, and written back exactly", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            (loads[1].source as Record<string, unknown>).id = "gremlin";
        });
        const { session, problems } = await open(changed.text);
        assert.isAbove(session.data.nodes().length, 0, "the embedded elements show");
        assert.deepEqual(session.data.pendingSourceLoads(), []);
        assert.deepInclude(problems, {
            code: "W_SOURCE_UNREGISTERED",
            params: {
                kind: "graphty-sources",
                pointer: `/members/${String(changed.at)}/loads/1`,
                id: "s2",
                source: "gremlin",
            },
        });
        const { doc } = await save(session);
        assert.deepEqual(entries(doc)[1], (changed.member.loads as unknown[])[1]);
    });

    it("src-18: an entry whose options ask to write is never offered and is written back as read", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[1].options = { write: true };
        });
        const { session } = await open(changed.text);
        assert.deepEqual(session.data.pendingSourceLoads(), []);
        const { doc } = await save(session, false);
        assert.deepEqual(entries(doc)[1], (changed.member.loads as unknown[])[1]);
    });

    it("src-19: an entry with an unknown member cannot run; the others are offered", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[0].encoding = "latin1";
        });
        const { session, problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/loads/0/encoding` },
        });
        assert.deepEqual(
            session.data.pendingSourceLoads().map((each) => each.id),
            ["s2"],
        );
    });

    it("src-20: an option the importer does not know is not reported on open", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[0].options = { delimter: ";" };
        });
        const { problems } = await open(changed.text);
        assert.isFalse(problems.some((each) => String(each.params.pointer).includes("/options")));
    });

    it("src-21: a member with an unknown top-level member is skipped and kept in place", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (_loads, member) => {
            member.colour = 1;
        });
        const { session, problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/colour` },
        });
        assert.isAbove(session.data.nodes().length, 0, "the embedded data still opens");
        const saved = JSON.parse((await session.project.save()).text) as Doc;
        assert.deepEqual(memberOf(saved, "graphty-sources").member, changed.member);
    });

    it("src-22: an entry of an unknown kind is kept, reported, never run and written back exactly", async () => {
        const { text } = await save(await csvThenNetwork());
        const dbt = {
            id: "d1",
            kind: "dbt",
            loadedAt: "2026-10-20T09:00:00Z",
            mode: "merge",
            added: { nodes: 0, edges: 0 },
            dbt: { model: "genes" },
        };
        const changed = edited(text, (loads) => {
            loads.push(dbt);
        });
        const { session, problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "W_UNKNOWN_KIND",
            params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/loads/2`, found: "dbt" },
        });
        assert.deepEqual(
            session.data.pendingSourceLoads().map((each) => each.id),
            ["s2"],
        );
        const { doc } = await save(session, false);
        assert.deepEqual(entries(doc)[2], dbt);
    });

    it("src-23: two entries with one id skip the member", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[1].id = "s1";
        });
        const { session, problems } = await open(changed.text);
        assert.isTrue(
            problems.some((each) => each.code === "E_BAD_DOCUMENT" && each.params.kind === "graphty-sources"),
        );
        assert.deepEqual(session.data.pendingSourceLoads(), []);
    });

    it("src-24: an expansion whose id is not its position skips the member", async () => {
        const session = await csvThenNetwork();
        await session.data.expand(["valjean"]);
        const { text } = await save(session);
        const changed = edited(text, (loads) => {
            (loads[1].source as { expansions: Record<string, unknown>[] }).expansions[0].id = "s2/x3";
        });
        const { problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: {
                kind: "graphty-sources",
                pointer: `/members/${String(changed.at)}/loads/1/source/expansions/0/id`,
            },
        });
    });

    it("src-25: an entry naming a graph the file does not have cannot run", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[1].graph = "g2";
        });
        const { session, problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: {
                kind: "graphty-sources",
                pointer: `/members/${String(changed.at)}/loads/1/graph`,
                id: "s2",
                graph: "g2",
            },
        });
        assert.deepEqual(session.data.pendingSourceLoads(), []);
    });

    it("src-36: a version 2 member wins over legacy fields that disagree with it", async () => {
        const { text } = await save(await csvThenNetwork());
        const doc = JSON.parse(text) as Doc;
        const { member: data } = memberOf(doc, "graphty-data");
        data.sources = [{ key: "s7", kind: "file", name: "wrong.csv", tables: [], added: { nodes: 9, edges: 9 } }];
        data.provenance = { s7: { nodes: ["fantine"], edges: [] } };
        const { session } = await open(JSON.stringify(doc));
        assert.deepEqual(
            session.data.sources().map((each) => each.key),
            ["s1", "s2"],
        );
        assert.deepEqual(session.data.sourcesOf("fantine"), ["s1"]);
    });

    it("src-43: a member of 1,001 entries is skipped, naming the entry limit", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            const [file] = loads;
            loads.splice(
                0,
                loads.length,
                ...Array.from({ length: 1001 }, (_, at) => ({ ...file, id: `f${String(at)}` })),
            );
        });
        const { problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "E_TOO_LARGE",
            params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}`, limit: "entries" },
        });
    });

    it("src-45: a draft load's column roles are its entry's mapping, and come back on open", async () => {
        const session = fresh();
        const draft = await session.data.prepare({ type: "csv", config: { data: TRIPS }, name: "trips.csv" });
        const mapping = { source: "from_station", target: "to_station", weight: "trips" };
        await draft.load({ mapping });
        const { text, doc } = await save(session);
        assert.deepEqual(entries(doc)[0].mapping, mapping);

        const { session: reopened } = await open(text);
        assert.deepEqual(reopened.data.sources()[0].choices?.mapping, mapping);
        assert.deepEqual(entries((await save(reopened)).doc)[0].mapping, mapping);
    });

    it("src-46: a joined table keeps its join, the load it joined onto and its mapping on open", async () => {
        const session = fresh();
        await session.data.import({ type: "csv", config: { data: GENES }, name: "genes.csv" });
        const { text } = await save(session);
        const join = {
            shape: "node-values",
            choices: { keys: [{ incoming: "name", graph: "id" }], ignoreCase: true, shape: "node-values" },
            rows: 2,
            matched: 2,
            columns: ["region"],
            table: {
                name: "regions.csv",
                columns: ["name", "region"],
                rows: [
                    { name: "Valjean", region: "Paris" },
                    { name: "fantine", region: "Montreuil" },
                ],
            },
            before: { valjean: { region: null }, fantine: { region: null } },
        };
        const entry = {
            id: "s2",
            kind: "file",
            name: "regions.csv",
            loadedAt: "2026-10-20T09:20:00.000Z",
            mode: "merge",
            format: "csv",
            file: { name: "regions.csv", size: 40 },
            mapping: { rowsAre: "nodes", key: "name" },
            tables: ["regions.csv"],
            tableRows: ["nodes"],
            joinedOnto: "s1",
            join,
            added: { nodes: 0, edges: 0 },
        };
        const joined = edited(text, (loads) => {
            loads.push(entry);
        });

        const { session: reopened, problems } = await open(joined.text);
        assert.deepEqual(problems, []);
        const listed = reopened.data.sources()[1] as unknown as Record<string, unknown>;
        assert.strictEqual(listed.kind, "join");
        assert.strictEqual(listed.joinedOnto, "s1");
        assert.deepEqual(listed.join, { source: "s2", onto: "s1", ...join });
        assert.deepEqual((listed.choices as { mapping?: unknown } | undefined)?.mapping, entry.mapping);
        // Saved again, the entry is written as it was read.
        assert.deepEqual(entries((await save(reopened)).doc)[1], entry);
    });

    it("src-47: a join with an unknown member makes its entry not-runnable", async () => {
        const session = fresh();
        await session.data.import({ type: "csv", config: { data: GENES }, name: "genes.csv" });
        const { text } = await save(session);
        const joined = edited(text, (loads) => {
            loads.push({
                id: "s2",
                kind: "file",
                loadedAt: "2026-10-20T09:20:00.000Z",
                mode: "merge",
                file: { size: 1 },
                joinedOnto: "s1",
                join: { shape: "edges", choices: {}, rows: 0, matched: 0, columns: [], table: {}, colour: 1 },
                added: { nodes: 0, edges: 0 },
            });
        });
        const { problems } = await open(joined.text);
        const pointers = problems.filter((each) => each.code === "E_BAD_DOCUMENT").map((each) => each.params.pointer);
        assert.isTrue(
            pointers.some((pointer) => String(pointer).endsWith("/loads/1/join/colour")),
            JSON.stringify(problems),
        );
    });

    it("src-44: a time with an offset is kept as read", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads[0].loadedAt = "2026-10-20T11:12:03+02:00";
        });
        const { session } = await open(changed.text);
        const { doc } = await save(session);
        assert.strictEqual(entries(doc)[0].loadedAt, "2026-10-20T11:12:03+02:00");
    });
});

/**
 * A project file as graphty-element 3.29 wrote it: a CSV load, a network load and one expansion,
 * the network load's record in a version 1 member and the loads in the data member's legacy fields.
 * @param claimed - whether the data member's `sources` lists the network load
 * @returns the file
 */
function version1File(claimed = true): Record<string, unknown> {
    return {
        kind: "graphty-document",
        version: 1,
        generator: { name: "graphty-element", version: "3.29.3" },
        requires: ["graphty-data", "graphty-session", "graphty-results"],
        members: [
            {
                kind: "graphty-data",
                version: 1,
                format: "json",
                dialect: "node-link",
                graph: {
                    nodes: [
                        {
                            id: "valjean",
                            name: "Jean Valjean",
                            "_source.loads": ["load-1"],
                            "_source.expansion": "partial",
                        },
                        { id: "fantine" },
                        { id: "tholomyes" },
                        { id: "javert", name: "Javert", "_source.loads": ["load-1/x1"], "_source.expansion": "none" },
                    ],
                    links: [
                        { source: "valjean", target: "fantine", weight: 1 },
                        { source: "fantine", target: "tholomyes", weight: 2 },
                        { source: "valjean", target: "javert", "_source.loads": ["load-1/x1"] },
                    ],
                },
                source: { type: "source:recorded-people", config: {} },
                sources: [
                    {
                        type: "csv",
                        name: "genes.csv",
                        size: 52,
                        config: {},
                        key: "s1",
                        kind: "file",
                        tables: [],
                        added: { nodes: 3, edges: 2 },
                    },
                    ...(claimed
                        ? [
                              {
                                  type: "source:recorded-people",
                                  config: {},
                                  key: "s2",
                                  kind: "server",
                                  tables: [],
                                  added: { nodes: 0, edges: 0 },
                              },
                          ]
                        : []),
                ],
                provenance: {
                    s1: { nodes: ["valjean", "fantine", "tholomyes"], edges: [0, 1] },
                    ...(claimed ? { s2: { nodes: ["valjean"], edges: [] } } : {}),
                },
            },
            { kind: "graphty-session", version: 1, config: {} },
            { kind: "graphty-results", version: 1, runs: [] },
            {
                kind: "graphty-sources",
                version: 1,
                loads: [
                    {
                        key: "load-1",
                        source: "recorded-people",
                        version: 1,
                        config: {},
                        endpoint: "https://people.example.test/api/",
                        options: { mode: "merge" },
                        loadedAt: "2026-10-19T08:00:00.000Z",
                        pages: 1,
                        next: null,
                        validators: {},
                        credential: { kind: "basic", origin: "https://db.example.org", username: "ana" },
                        expansions: [
                            {
                                key: "load-1/x1",
                                ids: ["valjean"],
                                depth: 1,
                                direction: "both",
                                at: "2026-10-19T08:01:00.000Z",
                                next: { page: 2 },
                                validators: {},
                            },
                        ],
                        total: 1,
                    },
                ],
            },
        ],
    };
}

describe("the sources member: reading version 1", () => {
    it("src-33: upgrades a version 1 member joined with the data member's legacy fields", async () => {
        await loadRecordedSeed(fresh()); // registers the recorded source
        const { session, problems } = await open(JSON.stringify(version1File()));
        assert.deepInclude(problems, {
            code: "W_VERSION_UPGRADED",
            params: { kind: "graphty-sources", pointer: "/members/3", found: 1, version: 2 },
        });
        assert.deepEqual(
            session.data.sources().map((each) => [each.key, each.kind, each.counts]),
            [
                ["s1", "file", { nodes: 3, edges: 2 }],
                ["s2", "server", { nodes: 1, edges: 0 }],
            ],
        );
        assert.deepEqual(session.data.pendingSourceLoads(), [
            {
                id: "s2",
                source: "recorded-people",
                endpoint: "https://people.example.test/api/",
                params: {},
                hasQuery: false,
                isLocalNetwork: false,
                authRequired: "none",
                credentialSlot: "default",
            },
        ]);
        assert.deepEqual(session.data.node("javert")?.["_source.loads"], ["s2/x1"]);
        assert.strictEqual(session.data.nodeSource("javert")?.loadKey, "s2");
        assert.strictEqual(session.data.nodeSource("valjean")?.loadKey, "s2");
        assert.deepEqual(session.data.sourcesOf("valjean"), ["s1", "s2"]);
        assert.deepEqual(session.data.sourcesOf("javert"), []);

        const { doc } = await save(session);
        const { member } = memberOf(doc, "graphty-sources");
        assert.strictEqual(member.version, 2, "it saves back as version 2");
        const [file, network] = entries(doc);
        assert.deepInclude(file, { id: "s1", kind: "file", format: "csv", file: { name: "genes.csv", size: 52 } });
        assert.notProperty(file.file, "sha256", "a version 1 file entry was never hashed");
        assert.deepInclude(network.source as object, {
            id: "recorded-people",
            sourceVersion: 1,
            credentialSlot: "default",
        });
        assert.deepEqual(nodeRecords(doc).get("javert")?.["_source.loads"], ["s2/x1"]);
    });

    it("src-34: a version 1 credential becomes the default slot and leaves no user name or origin", async () => {
        await loadRecordedSeed(fresh());
        const { session } = await open(JSON.stringify(version1File()));
        const { text } = await save(session);
        assert.notInclude(text, '"ana"');
        assert.notInclude(text, "db.example.org");
    });

    it("src-35: a version 1 record no data member item claims becomes an entry of its own", async () => {
        await loadRecordedSeed(fresh());
        const { session } = await open(JSON.stringify(version1File(false)));
        assert.deepEqual(
            session.data.sources().map((each) => each.key),
            ["s1", "load-1"],
        );
        assert.deepEqual(
            session.data.pendingSourceLoads().map((each) => each.id),
            ["load-1"],
        );
    });
});

// A source that takes any params, as the generic REST source does, and continues at a next-page
// link holding a key, as a service's Link header may.
registerSource(
    defineSource({
        id: "member-any-params",
        descriptor: {
            plainName: "Any params",
            params: [],
            features: ["page"],
            defaultEndpoint: "https://api.example.test/",
        },
        async *records(_params: Record<string, unknown>, ctx) {
            const page = ctx.cursor === null ? 0 : 1;
            yield await Promise.resolve({
                nodes: [{ id: `r${String(page)}` }],
                next: page === 0 ? { at: "https://api.example.test/p2?api_key=SECRET-4&page=2" } : null,
            });
        },
    }),
);

describe("the sources member: what a save leaves out", () => {
    it("src-56: writes no key a network load's mapping, endpoint query or cursor held", async () => {
        const session = fresh();
        const mapping = {
            version: 1,
            endpoint: "https://api.example.test/?api_key=SECRET-1",
            load: "works",
            requests: {
                works: {
                    path: "/works",
                    query: Object.fromEntries([
                        ["api_key", "SECRET-2"],
                        ["filter", "cites:{work}"],
                        ["access_token", "{token}"],
                    ]),
                    body: Object.fromEntries([
                        ["client_secret", "SECRET-3"],
                        ["page", 1],
                    ]),
                    records: "results",
                    entity: "work",
                },
            },
            entities: { work: { id: "id" } },
        };
        await session.data.import(
            { source: "member-any-params", config: { mapping, work: "W1" } },
            { limits: { maxNodes: 1, onLimit: "stop" } },
        );
        const { text, doc, leftOut } = await save(session);
        for (const secret of ["SECRET-1", "SECRET-2", "SECRET-3", "SECRET-4"]) {
            assert.notInclude(text, secret);
        }

        type Written = { query?: unknown; body?: unknown };
        const part = entries(doc)[0].source as {
            params: { mapping: { endpoint: string; requests: { works: Written } } };
            next: { at: string };
        };
        assert.strictEqual(part.params.mapping.endpoint, "https://api.example.test/");
        assert.deepEqual(
            part.params.mapping.requests.works.query,
            Object.fromEntries([
                ["filter", "cites:{work}"],
                ["access_token", "{token}"],
            ]),
        );
        assert.deepEqual(part.params.mapping.requests.works.body, { page: 1 });
        assert.strictEqual(part.next.at, "https://api.example.test/p2?page=2");
        const redacted = leftOut.find((each) => (each as { code: string }).code === "W_SOURCE_URL_REDACTED") as
            { params: { id: string; names: string[] } } | undefined;
        assert.strictEqual(redacted?.params.id, "s1");
        assert.sameMembers(redacted?.params.names ?? [], ["api_key", "client_secret"]);
    });

    it("src-57: leaves out the credential-bearing parameters of signed and token URLs", () => {
        const signed = redactUrl(
            "https://storage.googleapis.com/b/o.csv?X-Goog-Algorithm=A&X-Goog-Credential=C&X-Goog-Signature=S&v=1",
        );
        assert.strictEqual(signed.address, "https://storage.googleapis.com/b/o.csv?v=1");
        assert.sameMembers(signed.dropped, ["X-Goog-Algorithm", "X-Goog-Credential", "X-Goog-Signature"]);
        const cloudfront = redactUrl("https://d.cloudfront.net/a.csv?Policy=P&Key-Pair-Id=K&Signature=S");
        assert.strictEqual(cloudfront.address, "https://d.cloudfront.net/a.csv");
        const tokens = redactUrl(
            "https://x.example/a?refresh_token=1&id_token=2&private_token=3&jwt=4&code=5&sid=6&session=7&passwd=8&q=gene",
        );
        assert.strictEqual(tokens.address, "https://x.example/a?q=gene");
    });

    it("src-57: redacts a relative URL too, keeping its path as written", () => {
        assert.deepEqual(redactUrl("data/a.csv?token=T&v=2#top"), { address: "data/a.csv?v=2", dropped: ["token"] });
        assert.deepEqual(redactUrl("../a.csv?v=2#top"), { address: "../a.csv?v=2", dropped: [] });
        assert.deepEqual(redactUrl("//u:p@cdn.example/a.csv?sig=S"), {
            address: "//cdn.example/a.csv",
            dropped: ["sig"],
        });
    });
});

describe("the sources member: reading rules", () => {
    it("src-32: data steps in a file that also embeds the graph opens embedded, naming the graph", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (_loads, member) => {
            member.data = "steps";
        });
        const { session, problems } = await open(changed.text);
        assert.deepInclude(problems, {
            code: "W_SOURCE_STEPS_IGNORED",
            params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/data`, graph: null },
        });
        assert.isAbove(session.data.nodes().length, 0);
    });

    it("src-48: a steps-only file with no data member is refused, naming the sources member", async () => {
        const { text } = await save(await csvThenNetwork());
        const doc = JSON.parse(text) as Doc;
        doc.members = doc.members.filter((each) => each.kind !== "graphty-data");
        const { member } = memberOf(doc, "graphty-sources");
        member.data = "steps";
        const error = await fresh()
            .project.open(JSON.stringify(doc))
            .then(
                () => null,
                (e: unknown) => e as { code: string; details: unknown },
            );
        assert.strictEqual(error?.code, "E_UNSUPPORTED");
        assert.deepEqual(error?.details, { kind: "graphty-sources", data: "steps" });
    });

    it("src-49: an id that is missing or not an id skips the member", async () => {
        const { text } = await save(await csvThenNetwork());
        for (const id of [undefined, "-bad", 7]) {
            const changed = edited(text, (loads) => {
                loads[1].id = id;
            });
            const { session, problems } = await open(changed.text);
            assert.deepInclude(problems, {
                code: "E_BAD_DOCUMENT",
                params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/loads/1/id` },
            });
            assert.deepEqual(session.data.pendingSourceLoads(), []);
        }
    });

    it("src-15, src-50: a missing required member, a date the calendar lacks or an endpoint with a user name cannot run", async () => {
        const { text } = await save(await csvThenNetwork());
        const cases: [(entry: Record<string, unknown>) => void, string][] = [
            [(entry) => delete entry.loadedAt, "loadedAt"],
            [(entry) => (entry.loadedAt = "2026-02-30T00:00:00Z"), "loadedAt"],
            [
                (entry) => ((entry.source as Record<string, unknown>).endpoint = "https://u:p@db.example/"),
                "source/endpoint",
            ],
            [
                (entry) => ((entry.source as Record<string, unknown>).endpoint = "https://db.example/?k=1"),
                "source/endpoint",
            ],
            [(entry) => (entry.tableRows = ["nodes"]), "tableRows"],
            [(entry) => (entry.name = ""), "name"],
            [(entry) => (entry.joinedOnto = "s2"), "joinedOnto"],
            [(entry) => (entry.approved = true), "approved"],
        ];
        for (const [change, at] of cases) {
            const changed = edited(text, (loads) => change(loads[1]));
            const { session, problems } = await open(changed.text);
            assert.deepInclude(problems, {
                code: "E_BAD_DOCUMENT",
                params: { kind: "graphty-sources", pointer: `/members/${String(changed.at)}/loads/1/${at}` },
            });
            assert.deepEqual(session.data.pendingSourceLoads(), [], at);
        }
    });

    it("src-51: an entry of a later kind still needs the members every kind shares", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            loads.push({ id: "d1", kind: "dbt", mode: "merge", added: { nodes: 0, edges: 0 }, dbt: {} });
        });
        const { problems } = await open(changed.text);
        const pointer = `/members/${String(changed.at)}/loads/2`;
        assert.deepInclude(problems, {
            code: "W_UNKNOWN_KIND",
            params: { kind: "graphty-sources", pointer, found: "dbt" },
        });
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { kind: "graphty-sources", pointer: `${pointer}/loadedAt` },
        });
    });

    it("src-52: a version 1 member past the entry limit is skipped before it is joined", async () => {
        const file = version1File();
        const members = file.members as Record<string, unknown>[];
        const v1 = members[3] as { loads: Record<string, unknown>[] };
        const [record] = v1.loads;
        v1.loads = Array.from({ length: 1001 }, (_, at) => ({ ...record, key: `load-${String(at + 1)}` }));
        const { problems } = await open(JSON.stringify(file));
        assert.deepInclude(problems, {
            code: "E_TOO_LARGE",
            params: { kind: "graphty-sources", pointer: "/members/3", limit: "entries" },
        });
    });

    it("src-53: version 1 items upgrade with a generator's params, no invented size and a redacted URL", async () => {
        await loadRecordedSeed(fresh());
        const file = version1File();
        const data = (file.members as Record<string, unknown>[])[0] as { sources: Record<string, unknown>[] };
        data.sources = [
            {
                type: "csv",
                name: "genes.csv",
                config: {},
                key: "s1",
                kind: "file",
                tables: [],
                added: { nodes: 3, edges: 2 },
            },
            {
                type: "csv",
                name: "remote.csv",
                config: { url: "https://example.org/r.csv?token=T&v=1" },
                key: "s3",
                kind: "file",
                tables: [],
                added: { nodes: 0, edges: 0 },
            },
            { name: "path", config: { n: 4 }, key: "s4", kind: "sample", tables: [], added: { nodes: 0, edges: 0 } },
        ];
        const { session } = await open(JSON.stringify(file));
        const { doc, text } = await save(session);
        const byId = new Map(entries(doc).map((entry) => [entry.id, entry]));
        assert.deepEqual(byId.get("s1")?.file, { name: "genes.csv" });
        assert.deepInclude(byId.get("s3")?.url as object, {
            address: "https://example.org/r.csv?v=1",
            dropped: ["token"],
        });
        assert.deepEqual(byId.get("s4")?.sample, { generator: "path", params: { n: 4 } });
        assert.notInclude(text, "token=T");
    });

    it("src-54: a REST load whose endpoint is the mapping's own lists and marks that endpoint", async () => {
        const session = fresh();
        const mapping = { version: 1, endpoint: "http://192.168.1.20/api", load: "a", requests: {}, entities: {} };
        await session.data.import({ source: "member-any-params", config: { mapping } });
        const { text } = await save(session);
        const changed = edited(text, (loads) => {
            (loads[0].source as Record<string, unknown>).endpoint = null;
        });
        const { session: reopened } = await open(changed.text);
        const [pending] = reopened.data.pendingSourceLoads();
        assert.strictEqual(pending.endpoint, "http://192.168.1.20/api");
        assert.isTrue(pending.isLocalNetwork);
        assert.deepEqual(pending.params, { mapping });
    });

    it("src-55: a member of another data value or a later version is skipped", async () => {
        const { text } = await save(await csvThenNetwork());
        const other = edited(text, (_loads, member) => {
            member.data = "elsewhere";
        });
        const { problems } = await open(other.text);
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { kind: "graphty-sources", pointer: `/members/${String(other.at)}/data` },
        });
        const later = edited(text, (_loads, member) => {
            member.version = 3;
        });
        const opened = await open(later.text);
        assert.deepInclude(opened.problems, {
            code: "E_UNSUPPORTED_VERSION",
            params: { index: later.at, kind: "graphty-sources", found: 3 },
        });
        assert.deepEqual(opened.session.data.pendingSourceLoads(), []);
    });

    it("src-39: a plain document holding the member applies none of it", async () => {
        const { doc } = await save(await csvThenNetwork());
        doc.members = doc.members.filter((each) => each.kind !== "graphty-session");
        const session = fresh();
        const report = await session.project.open(JSON.stringify(doc));
        assert.strictEqual(report.opened, "document");
        assert.deepInclude(report.problems, { code: "E_UNSUPPORTED", params: { kind: "graphty-sources" } });
        assert.deepEqual(session.data.pendingSourceLoads(), []);
        assert.deepEqual(session.data.loads(), []);
    });

    it("src-16: a pending load on the reader's own machine is offered marked local", async () => {
        const { text } = await save(await csvThenNetwork());
        const changed = edited(text, (loads) => {
            (loads[1].source as Record<string, unknown>).endpoint = "http://localhost:7474/db";
        });
        const { session } = await open(changed.text);
        assert.deepInclude(session.data.pendingSourceLoads()[0], {
            endpoint: "http://localhost:7474/db",
            isLocalNetwork: true,
        });
    });
});
