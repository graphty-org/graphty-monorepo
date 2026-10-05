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

    test("keeps the first row of a repeated node id, as the element does", async () => {
        const nodeList = await collect(new CSVDataSource({ data: "id,name\n1,a\n1,b\n2,c\n" }));
        assert.deepStrictEqual(nodeList.nodes, [
            { id: "1", name: "a" },
            { id: "2", name: "c" },
        ]);

        const neo4j = await collect(new CSVDataSource({ data: "i:ID,name\n1,a\n1,b\n" }));
        assert.strictEqual(neo4j.nodes.length, 1);
        assert.strictEqual(neo4j.nodes[0].name, "a");

        const pair = await collect(
            new CSVDataSource({
                nodeFile: new File(["id,label\n1,A\n1,B\n"], "nodes.csv"),
                edgeFile: new File(["source,target\n1,1\n"], "edges.csv"),
            }),
        );
        assert.deepStrictEqual(pair.nodes, [{ id: "1", label: "A" }]);
    });

    test("types every cell on its own, whatever else its column holds", async () => {
        const { edges } = await collect(
            new CSVDataSource({ data: "source,target,weight,v\n1,2,1.5,1e3\n2,3,n/a,Infinity\n" }),
        );

        assert.deepStrictEqual(
            edges.map(({ weight, v }) => [weight, v]),
            [
                [1.5, 1000],
                ["n/a", "Infinity"],
            ],
        );
    });

    test("numbers the rows of a node list with no id column, keeping every column", async () => {
        const { nodes } = await collect(new CSVDataSource({ data: "name,age\nann,3\nbob,4\n", variant: "node-list" }));

        assert.deepStrictEqual(nodes, [
            { id: "0", name: "ann", age: 3 },
            { id: "1", name: "bob", age: 4 },
        ]);
    });

    test("reads a file whose header has an id column and no endpoints as a node list", async () => {
        const { nodes, edges } = await collect(new CSVDataSource({ data: "Id,label\n1,a\n2,b\n" }));

        assert.deepStrictEqual(
            nodes.map((node) => node.id),
            ["1", "2"],
        );
        assert.deepStrictEqual(edges, []);
    });

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

    test("keeps an id with more digits than a number holds exactly, and the edges naming it", async () => {
        const data =
            '{"nodes":[{"id":1234567890123456789},{"id":2}],"edges":[{"source":1234567890123456789,"target":2}]}';
        const { nodes, edges } = await collect(new JsonDataSource({ data }));
        const big = JSON.parse("1234567890123456789") as number;

        assert.deepStrictEqual(nodes, [{ id: big }, { id: 2 }]);
        assert.deepStrictEqual(edges, [{ source: big, target: 2 }]);
    });

    test("keeps a null value and any key the file wrote", async () => {
        const data = JSON.stringify({
            nodes: [{ id: 1, color: null, "": 2, "a.b": 3 }],
            edges: [{ source: 1, target: 1, weight: null }],
        });
        const source = new JsonDataSource({ data });
        const { nodes, edges } = await collect(source);

        assert.deepStrictEqual(nodes, [{ id: 1, color: null, "": 2, "a.b": 3 }]);
        assert.deepStrictEqual(edges, [{ source: 1, target: 1, weight: null }]);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 0);
    });

    test("keeps the first record of a repeated node id, as the element does", async () => {
        const data = JSON.stringify({
            nodes: [
                { id: "a", v: 1 },
                { id: "a", v: 2 },
            ],
            edges: [],
        });
        const { nodes } = await collect(new JsonDataSource({ data }));

        assert.deepStrictEqual(nodes, [{ id: "a", v: 1 }]);
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

    test("Pajek merges a vertex written twice, the first line's values winning", async () => {
        const { nodes } = await collect(
            new PajekDataSource({ data: '*Vertices 2\n1 0.1 0.2\n1 "z" 0.9 0.9\n2\n*Edges\n1 2' }),
        );

        assert.deepStrictEqual(nodes, [{ id: "1", label: "z", x: 0.1, y: 0.2 }, { id: "2" }]);
    });

    test("Pajek drops edges 2.x kept: an undeclared vertex, a word weight, ends named by label", async () => {
        const { edges } = await collect(
            new PajekDataSource({ data: '*Vertices 2\n1 "a"\n2 "b"\n*Edges\n1 5\n1 2 abc\n"a" "b"\n1 2' }),
        );

        assert.deepStrictEqual(edges, [{ source: "1", target: "2", directed: false }]);
    });

    test("Pajek stores coordinates as 32-bit floats and reads an unquoted word as the label", async () => {
        const { nodes } = await collect(new PajekDataSource({ data: "*Vertices 2\n1 5\n2 0.123456789 0.5\n" }));

        assert.deepStrictEqual(nodes, [
            { id: "1", label: "5" },
            { id: "2", x: 0.12345679, y: 0.5 },
        ]);
    });

    test("DOT strict graphs merge parallel edges, as Graphviz does", async () => {
        const { edges } = await collect(new DOTDataSource({ data: "strict digraph { a -> b; a -> b }" }));

        assert.deepStrictEqual(edges, [{ source: "a", target: "b" }]);
    });

    test("DOT concatenates quoted ids and names nodes in first-mention order", async () => {
        const { nodes } = await collect(new DOTDataSource({ data: 'digraph { "x" + "y"; {a b} -> {c d} }' }));

        assert.deepStrictEqual(
            nodes.map((node) => node.id),
            ["xy", "a", "b", "c", "d"],
        );
    });

    test("DOT with no graph keyword states no direction and gives its edges none", async () => {
        const source = new DOTDataSource({ data: "{ a -> b; b -- c }" });
        const { edges } = await collect(source);

        assert.isNull(source.declaredDirection);
        assert.deepStrictEqual(edges, [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
    });

    test("GML leaves out a node whose id is not an integer or a string", async () => {
        const { nodes } = await collect(new GMLDataSource({ data: "graph [ node [ id 1.5 ] node [ id 2 ] ]" }));

        assert.deepStrictEqual(nodes, [{ id: 2 }]);
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

    test("GML keeps a string that runs onto the next line", async () => {
        const { nodes } = await collect(new GMLDataSource({ data: 'graph [ node [ id 1 label "a\nb" ] ]' }));

        assert.deepStrictEqual(nodes, [{ id: 1, label: "a\nb" }]);
    });

    // GML is read as NetworkX reads it. These two loaded in the element's own 2.x reader and are
    // refused now, each naming its line: neither is GML that NetworkX, igraph or Gephi write.
    const refused: [string, string][] = [
        ["a bare-word id", "graph [ node [ id A ] node [ id B ] edge [ source A target B ] ]"],
        ["directed written as a word", "graph [ directed true node [ id 1 ] ]"],
    ];
    for (const [what, data] of refused) {
        test(`GML refuses ${what} with E_PARSE_FAILED naming the line`, async () => {
            const error = await failure(new GMLDataSource({ data }));

            assert.strictEqual(error.code, "E_PARSE_FAILED");
            assert.match(error.message, /at line 1/);
        });
    }
});
