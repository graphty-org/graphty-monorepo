import { readFileSync } from "node:fs";

import { assert, describe, test } from "vitest";

import { CSVDataSource } from "../../src/data/CSVDataSource.js";
import type { DataSource } from "../../src/data/DataSource.js";
import { DOTDataSource } from "../../src/data/DOTDataSource.js";
import { GMLDataSource } from "../../src/data/GMLDataSource.js";
import { JsonDataSource } from "../../src/data/JsonDataSource.js";
import { PajekDataSource } from "../../src/data/PajekDataSource.js";
import { type GraphtyError, isGraphtyError } from "../../src/errors/index.js";

/**
 * Read a source to the end.
 * @param source - the data source
 * @returns every node and edge record it yielded
 */
async function collect(
    source: DataSource,
): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as unknown as Record<string, unknown>[]));
        edges.push(...(chunk.edges as unknown as Record<string, unknown>[]));
    }

    return { nodes, edges };
}

describe("CSV read through graph-io", () => {
    test("hands the rows of a file whose header names no endpoint to the element unread", async () => {
        const source = new CSVDataSource({ data: "a,b,weight\nn1,n2,1.5\nn2,n3,2\n" });
        const { nodes, edges } = await collect(source);

        assert.deepStrictEqual(nodes, []);
        assert.deepStrictEqual(edges, [
            { a: "n1", b: "n2", weight: 1.5 },
            { a: "n2", b: "n3", weight: 2 },
        ]);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("records an unclosed quote as a parse error and yields nothing", async () => {
        const source = new CSVDataSource({ data: 'source,target\n"a,b\nc,d\n' });
        const { nodes, edges } = await collect(source);

        assert.strictEqual(nodes.length + edges.length, 0);
        const errors = source.getErrorAggregator().getErrors();
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].category, "parse-error");
    });

    test("keeps a Neo4j node's labels as the one label cell it was written as", async () => {
        const source = new CSVDataSource({
            data: "id:ID,:LABEL\nu1,User;Admin\n:START_ID,:END_ID,:TYPE\nu1,u1,SELF\n",
        });
        const { nodes, edges } = await collect(source);

        assert.strictEqual(nodes[0].id, "u1");
        assert.strictEqual(nodes[0].label, "User;Admin");
        assert.notProperty(nodes[0], "labels");
        assert.strictEqual(edges[0].type, "SELF");
    });

    test("carries an adjacency list's weights under weight", async () => {
        const { edges } = await collect(new CSVDataSource({ data: "a,b:0.1\n", variant: "adjacency-list" }));

        assert.deepStrictEqual(edges, [{ source: "a", target: "b", weight: 0.1 }]);
    });

    test("carries adjacency weights that f32 holds exactly", async () => {
        const { edges } = await collect(new CSVDataSource({ data: "a,b:2,c:3.5\n", variant: "adjacency-list" }));

        assert.deepStrictEqual(edges, [
            { source: "a", target: "b", weight: 2 },
            { source: "a", target: "c", weight: 3.5 },
        ]);
    });

    test("reads row 1 as the header when every cell of the file is a word", async () => {
        const source = new CSVDataSource({
            data: "user,friend\nalice,bob\ncarol,dave\n",
            edgeSource: "user",
            edgeTarget: "friend",
        });
        const { edges } = await collect(source);

        assert.deepStrictEqual(edges, [
            { source: "alice", target: "bob" },
            { source: "carol", target: "dave" },
        ]);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    const unread: [string, Record<string, unknown>[]][] = [
        ["person,knows", [{ person: "alice", knows: "bob" }]],
        ["a,b", [{ a: "n1", b: "n2" }]],
        ["name,friend", [{ name: "alice", friend: "bob" }]],
        ["source,dest", [{ source: "alice", dest: "bob" }]],
    ];
    for (const [header, rows] of unread) {
        test(`hands the rows of a ${header} file, which names no endpoint pair, to the element unread`, async () => {
            const values = rows.map((row) => Object.values(row).join(",")).join("\n");
            const source = new CSVDataSource({ data: `${header}\n${values}\n` });
            const { nodes, edges } = await collect(source);

            assert.deepStrictEqual(nodes, []);
            assert.deepStrictEqual(edges, rows);
            assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
        });
    }

    test("keeps every row handed over unread, however often a cell repeats", async () => {
        const { edges } = await collect(new CSVDataSource({ data: "name,friend\nalice,bob\nalice,carol\n" }));

        assert.deepStrictEqual(edges, [
            { name: "alice", friend: "bob" },
            { name: "alice", friend: "carol" },
        ]);
    });

    test("takes both endpoints from one pair of columns", async () => {
        const { edges } = await collect(new CSVDataSource({ data: "from,to,source\na,b,web\n" }));

        assert.strictEqual(edges.length, 1);
        assert.strictEqual(edges[0].source, "a");
        assert.strictEqual(edges[0].target, "b");
    });

    test("records a configured column the file does not have, instead of throwing", async () => {
        const edgeList = new CSVDataSource({ data: "source,target\na,b\n", edgeSource: "sourc" });
        const nodeList = new CSVDataSource({ data: "id,x\na,1\n", variant: "node-list", idColumn: "ident" });

        for (const source of [edgeList, nodeList]) {
            const { nodes, edges } = await collect(source);
            assert.strictEqual(nodes.length + edges.length, 0);
            assert.strictEqual(source.getErrorAggregator().getErrorCount(), 1);
        }
    });

    test("keeps a Neo4j node's id when the file also has a property named id", async () => {
        const { nodes, edges } = await collect(
            new CSVDataSource({
                data: "id:ID(Person),name\n1,Ann\n2,Bo\n:START_ID(Person),:END_ID(Person)\n1,2\n",
            }),
        );

        const ids = nodes.map((node) => node.id);
        assert.include(ids, edges[0].source);
        assert.include(ids, edges[0].target);
    });

    test("types each cell on its own, so one text cell leaves a column's numbers numbers", async () => {
        const source = new CSVDataSource({
            data: "source,target,weight,ok\na,b,2.5,true\nb,c,NA,FALSE\nc,d,4,maybe\n",
        });
        const { edges } = await collect(source);

        assert.deepStrictEqual(
            edges.map((edge) => [edge.weight, edge.ok]),
            [
                [2.5, true],
                ["NA", false],
                [4, "maybe"],
            ],
        );
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("types each cell of a node list on its own, and leaves the ids as written", async () => {
        const { nodes } = await collect(new CSVDataSource({ data: "id,size\n1,3\n2,unknown\n", variant: "node-list" }));

        assert.deepStrictEqual(nodes, [
            { id: "1", size: 3 },
            { id: "2", size: "unknown" },
        ]);
    });

    for (const header of ["Id", "ID"]) {
        test(`reads a file whose header has an ${header} column and no endpoint pair as a node list`, async () => {
            const { nodes, edges } = await collect(new CSVDataSource({ data: `${header},Label\na,A\nb,B\n` }));

            assert.deepStrictEqual(
                nodes.map((node) => [node.id, node.Label]),
                [
                    ["a", "A"],
                    ["b", "B"],
                ],
            );
            assert.deepStrictEqual(edges, []);
        });
    }

    test("reads an empty file as an empty graph", async () => {
        const source = new CSVDataSource({ data: "" });
        const { nodes, edges } = await collect(source);

        assert.strictEqual(nodes.length + edges.length, 0);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });
});

describe("JSON read through graph-io", () => {
    test("keeps every value as the file typed it, however a key's type varies between records", async () => {
        const data = JSON.stringify({
            nodes: [
                { id: "a", value: 42, tags: ["x"] },
                { id: "b", value: "n/a", nested: { deep: true } },
            ],
            edges: [{ from: "a", to: "b", weight: 0.1 }],
        });
        const { nodes, edges } = await collect(new JsonDataSource({ data }));

        assert.deepStrictEqual(nodes, [
            { id: "a", value: 42, tags: ["x"] },
            { id: "b", value: "n/a", nested: { deep: true } },
        ]);
        assert.deepStrictEqual(edges, [{ from: "a", to: "b", weight: 0.1 }]);
    });

    test("yields no record for a node only an edge names", async () => {
        const data = JSON.stringify({ nodes: [{ id: "a" }], edges: [{ source: "a", target: "ghost" }] });
        const { nodes, edges } = await collect(new JsonDataSource({ data }));

        assert.deepStrictEqual(nodes, [{ id: "a" }]);
        assert.strictEqual(edges.length, 1);
    });

    test("keeps a node's id under the key it was read from", async () => {
        const data = JSON.stringify({ nodes: [{ name: "a", group: 1 }], links: [] });
        const { nodes } = await collect(new JsonDataSource({ data, edge: { path: "links" } }));

        assert.deepStrictEqual(nodes, [{ name: "a", group: 1 }]);
    });

    test("keeps a value the file carries under the key the element reads the id from", async () => {
        const data = JSON.stringify({
            nodes: [
                { name: "a", id: 5 },
                { name: "b", id: 6 },
            ],
            edges: [],
        });
        const { nodes } = await collect(new JsonDataSource({ data, nodeIdPath: "name" }));

        assert.deepStrictEqual(nodes, [
            { name: "a", id: 5 },
            { name: "b", id: 6 },
        ]);
    });

    test("keeps a value the file carries under the key the element reads an endpoint from", async () => {
        const data = JSON.stringify({ nodes: [], edges: [{ src: "a", dst: "b", source: "web" }] });
        const { edges } = await collect(new JsonDataSource({ data, edgeSrcIdPath: "src", edgeDstIdPath: "dst" }));

        assert.deepStrictEqual(edges, [{ src: "a", dst: "b", source: "web" }]);
    });

    test("hands a repeated node id over twice, in file order, rather than merging the two", async () => {
        // The element keeps the first record of an id, by the id key IT is configured with, which
        // need not be the key the reader chose. graph-io would merge the two, later values winning.
        const data = JSON.stringify({
            nodes: [
                { id: "a", v: 1 },
                { id: "a", v: 2 },
            ],
            edges: [],
        });
        const { nodes } = await collect(new JsonDataSource({ data }));

        assert.deepStrictEqual(nodes, [
            { id: "a", v: 1 },
            { id: "a", v: 2 },
        ]);
    });

    test("reads the endpoints from the keys the element names with edgeSource and edgeTarget", async () => {
        // The records also carry source/target keys, which name something else here.
        const data = JSON.stringify({
            nodes: [{ id: "x" }, { id: "y" }, { id: "z" }],
            edges: [
                { a: "x", b: "y", source: "feedA", target: "feedB" },
                { a: "y", b: "z", source: "feedA" },
            ],
        });
        const source = new JsonDataSource({ data, edgeSource: "a", edgeTarget: "b" });
        const { edges } = await collect(source);

        assert.deepStrictEqual(
            edges.map((edge) => [edge.a, edge.b]),
            [
                ["x", "y"],
                ["y", "z"],
            ],
        );
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("hands an edge whose endpoints are not both under the chosen keys to the element as written", async () => {
        const data = JSON.stringify({
            nodes: [],
            edges: [
                { source: "a", target: "b" },
                { source: "b", to: "c" },
            ],
        });
        const source = new JsonDataSource({ data });
        const { edges } = await collect(source);

        assert.deepStrictEqual(edges, [
            { source: "a", target: "b" },
            { source: "b", to: "c" },
        ]);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("drops and merges no node the element might read with another id key", async () => {
        const data = JSON.stringify({ nodes: [{ id: 1, name: "a" }, { id: 1, name: "b" }, { name: "c" }], edges: [] });
        const source = new JsonDataSource({ data });
        const { nodes } = await collect(source);

        assert.deepStrictEqual(nodes, [{ id: 1, name: "a" }, { id: 1, name: "b" }, { name: "c" }]);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("names the file's own index of a node it refuses", async () => {
        const data = JSON.stringify({ nodes: [{ id: "a" }, { id: "a" }, { id: "b" }, { idx: 1 }], edges: [] });
        const source = new JsonDataSource({ data });
        await collect(source);

        const errors = source.getErrorAggregator().getErrors();
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].line, 3);
        assert.include(errors[0].message, "index 3");
    });

    test("reads arrays a JMESPath expression selects", async () => {
        const data = JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a" } }, { data: { id: "b" } }],
                edges: [{ data: { source: "a", target: "b" } }],
            },
        });
        const { nodes, edges } = await collect(
            new JsonDataSource({
                data,
                node: { path: "elements.nodes[*].data" },
                edge: { path: "elements.edges[*].data" },
            }),
        );

        assert.deepStrictEqual(nodes, [{ id: "a" }, { id: "b" }]);
        assert.deepStrictEqual(edges, [{ source: "a", target: "b" }]);
    });
});

describe("the CSV parser dependency", () => {
    test("is gone: CSV is read by graph-io", () => {
        const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
            dependencies: Record<string, string>;
            devDependencies: Record<string, string>;
        };

        assert.notProperty(manifest.dependencies, "papaparse");
        assert.notProperty(manifest.devDependencies, "@types/papaparse");
        assert.strictEqual(manifest.dependencies["@graphty/graph-io"], "workspace:^");
    });
});

/**
 * Read a source that is expected to refuse its input.
 * @param source - the data source
 * @returns what it threw
 */
async function failure(source: DataSource): Promise<GraphtyError> {
    let thrown: unknown = null;
    try {
        await collect(source);
    } catch (error) {
        thrown = error;
    }

    assert.isTrue(isGraphtyError(thrown), "the source read its input");
    return thrown as GraphtyError;
}

describe("GML, DOT and Pajek read through graph-io", () => {
    test("GML keeps the first declaration of a repeated node id, as the element keeps a repeated record", async () => {
        const { nodes } = await collect(
            new GMLDataSource({ data: 'graph [ node [ id 1 label "a" ] node [ id 1 label "b" size 2 ] ]' }),
        );

        assert.deepStrictEqual(nodes, [{ id: 1, label: "a" }]);
    });

    test("Pajek keeps the first line of a vertex written twice", async () => {
        const { nodes } = await collect(new PajekDataSource({ data: '*Vertices 2\n1 "a"\n2 "b"\n1 "again"\n' }));

        assert.deepStrictEqual(
            nodes.map((node) => [node.id, node.label]),
            [
                ["1", "a"],
                ["2", "b"],
            ],
        );
    });

    test("Pajek with no line section declares no direction", async () => {
        const source = new PajekDataSource({ data: '*Vertices 2\n1 "a"\n2 "b"\n' });
        await collect(source);

        assert.isNull(source.declaredDirection);
    });

    test("DOT gives a cluster's members no parent key, and keeps one the file wrote", async () => {
        const { nodes } = await collect(
            new DOTDataSource({ data: 'digraph { subgraph cluster_x { a; b [parent="mine"] } }' }),
        );

        assert.deepStrictEqual(nodes, [{ id: "a" }, { id: "b", parent: "mine" }]);
    });

    test("DOT draws a cluster as a node only when an edge names it", async () => {
        const named = await collect(new DOTDataSource({ data: "digraph { subgraph cluster_x { a } b -> cluster_x }" }));
        const unnamed = await collect(new DOTDataSource({ data: "digraph { subgraph cluster_x { a } b -> a }" }));

        assert.includeMembers(
            named.nodes.map((node) => node.id),
            ["cluster_x"],
        );
        assert.notInclude(
            unnamed.nodes.map((node) => node.id),
            "cluster_x",
        );
    });

    test("DOT keeps pos as the text the file wrote", async () => {
        const { nodes } = await collect(new DOTDataSource({ data: 'graph { a [pos="1,2!"] }' }));

        assert.deepStrictEqual(nodes, [{ id: "a", pos: "1,2!" }]);
    });

    test("DOT reads a body with no keyword by its edge operators", async () => {
        const { edges } = await collect(new DOTDataSource({ data: "{ a -> b; b -- c }" }));

        assert.deepStrictEqual(
            edges.map((edge) => [edge.source, edge.target]),
            [
                ["a", "b"],
                ["b", "c"],
            ],
        );
    });

    // GML is read as NetworkX reads it. These three loaded in the element's own 2.x reader and are
    // refused now, each naming its line: none of them is GML that NetworkX, igraph or Gephi write.
    const refused: [string, string][] = [
        ["a bare-word id", "graph [ node [ id A ] node [ id B ] edge [ source A target B ] ]"],
        ["directed written as a word", "graph [ directed true node [ id 1 ] ]"],
        ["a string that runs onto the next line", 'graph [ node [ id 1 label "a\nb" ] ]'],
    ];
    for (const [what, data] of refused) {
        test(`GML refuses ${what} with E_PARSE_FAILED naming the line`, async () => {
            const error = await failure(new GMLDataSource({ data }));

            assert.strictEqual(error.code, "E_PARSE_FAILED");
            assert.match(error.message, /at line 1/);
        });
    }
});
