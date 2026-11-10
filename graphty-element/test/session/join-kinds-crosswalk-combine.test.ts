/**
 * @file The join operations that name kinds, translate keys and compare two graphs: kinds for the
 * ends an edges join makes (`JoinChoices.endKinds`, `kindIds`), a membership table making a new
 * kind of node, a loaded mapping table used as a crosswalk (`via`, `mapping`), and union,
 * intersection and difference of two graphs (`compare`, `membership`), and the names a join writes
 * (`names`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { GraphtyError } from "../../src/errors/GraphtyError";

/**
 * A session holding one CSV of nodes.
 * @param name - the file's name
 * @param data - its CSV text
 * @returns the session
 */
async function graphOf(name: string, data: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data }, name });
    return session;
}

/**
 * Prepare a table onto the graph.
 * @param session - the session
 * @param name - the table's name
 * @param data - its CSV text
 * @returns the draft
 */
function table(session: GraphSession, name: string, data: string): ReturnType<GraphSession["data"]["prepare"]> {
    return session.data.prepare({ config: { data }, name }, { onto: "graph" });
}

/** People P1, P2 and a person whose id is 7. */
const PEOPLE = "id,name\nP1,Ann\nP2,Bo\n7,Cy\n";

/** Door entries: who entered which building; building 7 shares its id with a person. */
const ENTRIES = "person,building\nP1,B1\nP2,B1\nP1,7\n";

describe("kinds in a join (endKinds, kindIds)", () => {
    const keys = [
        { file: "person", graph: "id" },
        { file: "building", graph: "id" },
    ];

    it("gives the ends a join makes the kind named for their side", async () => {
        const session = await graphOf("people.csv", PEOPLE);
        const draft = await table(session, "door-entries.csv", ENTRIES);
        const choices = { keys, shape: "edges" as const, endKinds: { target: "building" } };
        assert.deepInclude(draft.joinReport(choices), { newNodes: 1, newEdges: 3 });
        await draft.load({ join: choices });
        assert.strictEqual(session.data.node("B1")?.kind, "building");
        assert.isUndefined(session.data.node("P1")?.kind, "a matched end is left as it is");
        assert.isOk(
            session.data.edges().some((edge) => edge.source === "P1" && edge.target === "7"),
            "shared ids: building 7 is the person 7",
        );

        const [, joined] = session.data.sources();
        await session.data.removeSource(joined.key);
        assert.isUndefined(session.data.node("B1"));
        session.dispose();
    });

    it("keeps an id apart across kinds when scoped", async () => {
        const session = await graphOf("people.csv", PEOPLE);
        const draft = await table(session, "door-entries.csv", ENTRIES);
        const choices = { keys, shape: "edges" as const, endKinds: { target: "building" }, kindIds: "scoped" as const };
        // No node is a building, so both buildings are new; 7 is a person's id, so it is kept apart.
        assert.deepInclude(draft.joinReport(choices), { newNodes: 2 });
        // The people carry no kind, so a scoped person end matches none of them.
        assert.deepInclude(draft.joinReport({ ...choices, endKinds: { source: "person", target: "building" } }), {
            newNodes: 4,
        });

        await draft.load({ join: choices });
        assert.deepInclude(session.data.node("building:7"), { kind: "building" });
        assert.strictEqual(session.data.node("7")?.name, "Cy", "the person 7 is left alone");
        assert.isOk(session.data.edges().some((edge) => edge.source === "P1" && edge.target === "building:7"));
        session.dispose();
    });
});

describe("a membership table as a new kind of node", () => {
    it("makes each term a node of the kind named, linked to its members", async () => {
        const session = await graphOf("genes.csv", "id,symbol\nG1,TP53\nG2,BRCA1\n");
        const draft = await table(session, "go-terms.csv", "gene,term\nG1,GO:1\nG2,GO:1\nG1,GO:2\n");
        const choices = {
            keys: [
                { file: "gene", graph: "id" },
                { file: "term", graph: "id" },
            ],
            shape: "edges" as const,
            endKinds: { target: "go-term" },
        };
        assert.deepInclude(draft.joinReport(choices), { newNodes: 2, newEdges: 3, matched: 0 });
        await draft.load({ join: choices });
        assert.deepEqual(
            session.data
                .nodes()
                .filter((node) => node.kind === "go-term")
                .map((node) => node.id),
            ["GO:1", "GO:2"],
        );
        await session.undo();
        assert.lengthOf(session.data.nodes(), 2);
        session.dispose();
    });
});

/** Genes by their Ensembl id. */
const GENES = "id,chrom\nENSG1,17\nENSG2,13\nENSG3,1\nENSG4,2\n";

/** Symbol to Ensembl id; MULTI names two genes. */
const MAPPING = "symbol,ensembl\nTP53,ENSG1\nBRCA1,ENSG2\nMULTI,ENSG3\nMULTI,ENSG4\n";

/** Expression by symbol; FOO is in no mapping. */
const EXPRESSION = "symbol,logFC\nTP53,1.5\nBRCA1,2\nFOO,3\nMULTI,4\n";

describe("a loaded mapping table as a crosswalk (via, mapping)", () => {
    /**
     * A session holding the genes and the mapping table, loaded as edges from symbol to gene.
     * @returns the session and the mapping's key
     */
    async function withMapping(): Promise<{ session: GraphSession; mapping: string }> {
        const session = await graphOf("genes.csv", GENES);
        await session.data.import(
            { type: "csv", config: { data: MAPPING }, name: "mapping.csv" },
            { mode: "merge", mapping: { rowsAre: "edges", source: "symbol", target: "ensembl" } },
        );
        const mapping = session.data.sources().at(-1)?.key ?? "";
        return { session, mapping };
    }

    const keys = [{ file: "symbol", graph: "id" }];

    it("translates keys through any loaded source and counts the keys it cannot map", async () => {
        const { session, mapping } = await withMapping();
        const draft = await table(session, "expression.csv", EXPRESSION);
        const report = draft.joinReport({ keys, shape: "node-values", via: mapping });
        assert.deepInclude(report, { unmapped: 1, mappedToMany: 1 });
        assert.deepEqual(report.rowMatches.map((ids) => [...ids]).slice(0, 2), [["ENSG1"], ["ENSG2"]]);
        assert.deepEqual([...report.rowMatches[3]], ["ENSG3"], "one-to-many takes the first by default");

        const list = draft.joinReport({ keys, shape: "node-values", via: mapping, mapping: { many: "list" } });
        assert.deepEqual([...list.rowMatches[3]], ["ENSG3", "ENSG4"]);

        await draft.load({ join: { keys, shape: "node-values", via: mapping, mapping: { many: "list" } } });
        assert.strictEqual(session.data.node("ENSG1")?.logFC, 1.5);
        assert.strictEqual(session.data.node("ENSG4")?.logFC, 4);
        session.dispose();
    });

    it("reads the mapping's columns the reader names", async () => {
        const { session, mapping } = await withMapping();
        const draft = await table(session, "expression.csv", EXPRESSION);
        // Read backwards, the mapping holds none of the incoming symbols.
        const report = draft.joinReport({
            keys,
            shape: "node-values",
            via: mapping,
            mapping: { columns: ["target", "source"] },
        });
        assert.deepInclude(report, { unmapped: 4 });
        assert.throws(() => draft.joinReport({ keys, via: mapping, mapping: { columns: ["nope", "source"] } }), /nope/);
        session.dispose();
    });

    it("translates keys through a mapping table read as a lookup, never adding it to the graph", async () => {
        const session = await graphOf("genes.csv", GENES);
        const crosswalk = await session.data.prepare({ config: { data: MAPPING }, name: "mapping.csv" });
        const lookup = crosswalk.lookup();
        crosswalk.dispose();
        assert.deepInclude(lookup, { name: "mapping.csv", columns: ["symbol", "ensembl"] });

        const draft = await table(session, "expression.csv", EXPRESSION);
        assert.deepInclude(draft.joinReport({ keys, shape: "node-values", lookup }), {
            unmapped: 1,
            mappedToMany: 1,
        });
        await draft.load({ join: { keys, shape: "node-values", lookup } });
        assert.strictEqual(session.data.node("ENSG1")?.logFC, 1.5);
        assert.lengthOf(session.data.nodes(), 4, "the mapping adds no node");
        assert.lengthOf(session.data.edges(), 0, "the mapping adds no edge");
        assert.lengthOf(session.data.sources(), 2, "the mapping is no source");

        const [join] = session.data.joins();
        await session.data.editJoin(join.source, { ...join.choices, mapping: { many: "list" } });
        assert.strictEqual(session.data.node("ENSG4")?.logFC, 4, "editing the join reads the same lookup");
        assert.strictEqual(session.data.joins()[0].choices.lookup?.name, "mapping.csv", "the join saves the lookup");
        assert.isUndefined(session.data.joins()[0].choices.via);
        session.dispose();
    });

    it("refuses a mapping table given both as via and as lookup", async () => {
        const { session, mapping } = await withMapping();
        const crosswalk = await session.data.prepare({ config: { data: MAPPING }, name: "mapping.csv" });
        const lookup = crosswalk.lookup();
        crosswalk.dispose();
        const draft = await table(session, "expression.csv", EXPRESSION);
        const refused = (() => {
            try {
                draft.joinReport({ keys, shape: "node-values", via: mapping, lookup });
            } catch (error) {
                return error;
            }

            return undefined;
        })();
        assert.instanceOf(refused, GraphtyError);
        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.strictEqual(refused.details.reason, "via-and-lookup");
        session.dispose();
    });

    it("keeps a source key in via as a plain string, saved and edited as before", async () => {
        const { session, mapping } = await withMapping();
        const draft = await table(session, "expression.csv", EXPRESSION);
        await draft.load({ join: { keys, shape: "node-values", via: mapping } });
        const [join] = session.data.joins();
        assert.strictEqual(join.choices.via, mapping);
        assert.isUndefined(join.choices.lookup);
        assert.strictEqual(session.data.node("ENSG3")?.logFC, 4);

        await session.data.editJoin(join.source, { ...join.choices, mapping: { many: "list" } });
        assert.strictEqual(session.data.joins()[0].choices.via, mapping);
        assert.strictEqual(session.data.node("ENSG4")?.logFC, 4);
        session.dispose();
    });

    it("counts nothing unmapped without a mapping table", async () => {
        const session = await graphOf("genes.csv", GENES);
        const draft = await table(session, "chrom.csv", "gene,band\nENSG1,p13\n");
        assert.deepInclude(draft.joinReport({ keys: [{ file: "gene", graph: "id" }] }), {
            unmapped: 0,
            mappedToMany: 0,
        });
        session.dispose();
    });
});

describe("union, intersection and difference of two graphs (compare)", () => {
    const TUMOR = "id,logFC\nG1,1\nG2,2\nG3,3\n";
    const NORMAL = "gene,logFC\nG2,5\nG3,3\nG4,7\n";
    const keys = [{ file: "gene", graph: "id" }];

    it("counts the three regions", async () => {
        const session = await graphOf("tumor.csv", TUMOR);
        const draft = await table(session, "normal.csv", NORMAL);
        const report = draft.joinReport({ keys, shape: "merge", compare: true });
        assert.deepEqual(report.regions, { nodes: { "only-from": 1, both: 2, "only-onto": 1 } });
        assert.isUndefined(draft.joinReport({ keys, shape: "merge" }).regions);
        assert.throws(() => draft.joinReport({ keys, shape: "node-values", compare: true }), /compare/);
        session.dispose();
    });

    it("marks each node's region and keeps both graphs' values side by side, taken back as one step", async () => {
        const session = await graphOf("tumor.csv", TUMOR);
        const draft = await table(session, "normal.csv", NORMAL);
        await draft.load({ join: { keys, shape: "merge", compare: true, membership: "set" } });
        assert.deepInclude(session.data.node("G1"), { set: "only-onto", logFC: 1 });
        assert.deepInclude(session.data.node("G2"), { set: "both", logFC: 2, "logFC (normal.csv)": 5 });
        const g4 = session.data.node("G4");
        assert.deepInclude(g4, { set: "only-from", "logFC (normal.csv)": 7 });
        assert.isUndefined(g4?.logFC, "the incoming graph's values stay in its own column");
        assert.isTrue(session.data.joins()[0].choices.compare);

        await session.undo();
        assert.isUndefined(session.data.node("G1")?.set);
        assert.isUndefined(session.data.node("G4"));

        await session.redo();
        const joined = session.data.sources().at(-1)?.key ?? "";
        await session.data.removeSource(joined);
        assert.isUndefined(session.data.node("G1")?.set, "removing the join takes its column back");
        assert.isUndefined(session.data.node("G2")?.["logFC (normal.csv)"]);
        session.dispose();
    });

    it("counts as the compared graph's only the nodes it holds, not the ones it marks only-onto", async () => {
        const session = await graphOf("tumor.csv", TUMOR);
        const draft = await table(session, "normal.csv", NORMAL);
        await draft.load({ join: { keys, shape: "merge", compare: true } });
        const joined = session.data.sources().at(-1);
        assert.strictEqual(joined?.counts.nodes, 3, "G2, G3 and G4: the three nodes normal.csv holds");
        assert.deepEqual(session.data.sourcesOf("G1"), [session.data.sources()[0].key]);
        assert.strictEqual(session.data.node("G1")?.membership, "only-onto");
        await session.data.removeSource(joined?.key ?? "");
        assert.isUndefined(session.data.node("G1")?.membership, "removing the join takes the mark back");
        assert.isOk(session.data.node("G1"), "and keeps the node");
        session.dispose();
    });

    it("names the column membership by default", async () => {
        const session = await graphOf("tumor.csv", TUMOR);
        const draft = await table(session, "normal.csv", NORMAL);
        await draft.load({ join: { keys, shape: "merge", compare: true } });
        assert.strictEqual(session.data.node("G3")?.membership, "both");
        session.dispose();
    });

    it("writes a clashing column under the name the reader gives", async () => {
        const session = await graphOf("tumor.csv", TUMOR);
        const draft = await table(session, "normal.csv", NORMAL);
        await draft.load({ join: { keys, shape: "merge", compare: true, names: { "logFC (normal.csv)": "normal" } } });
        assert.deepInclude(session.data.node("G2"), { logFC: 2, normal: 5 });
        assert.deepInclude(session.data.node("G4"), { normal: 7 });
        assert.isUndefined(session.data.node("G2")?.["logFC (normal.csv)"]);
        session.dispose();
    });
});
