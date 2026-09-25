import { assert, describe, test } from "vitest";

import { CSVDataSource } from "../../src/data/CSVDataSource.js";

describe("CSVDataSource", () => {
    test("parses simple edge list", async () => {
        const csv = `source,target
n1,n2
n2,n3
n1,n3`;

        const source = new CSVDataSource({ data: csv });
        const chunks = [];

        for await (const chunk of source.getData()) {
            chunks.push(chunk);
        }

        assert.strictEqual(chunks[0].edges.length, 3);
        assert.strictEqual(chunks[0].edges[0].source, "n1");
        assert.strictEqual(chunks[0].edges[0].target, "n2");
    });

    test("parses weighted edges", async () => {
        const csv = `source,target,weight
n1,n2,1.5
n2,n3,2.0
n1,n3,0.8`;

        const source = new CSVDataSource({ data: csv });
        const chunks = [];

        for await (const chunk of source.getData()) {
            chunks.push(chunk);
        }

        assert.strictEqual(chunks[0].edges[0].weight, 1.5);
        assert.strictEqual(chunks[0].edges[1].weight, 2.0);
    });

    test("parses edges with additional attributes", async () => {
        const csv = `source,target,type,color
n1,n2,friend,#ff0000
n2,n3,colleague,#00ff00`;

        const source = new CSVDataSource({ data: csv });
        const chunks = [];

        for await (const chunk of source.getData()) {
            chunks.push(chunk);
        }

        assert.strictEqual(chunks[0].edges[0].type, "friend");
        assert.strictEqual(chunks[0].edges[0].color, "#ff0000");
    });

    test("handles different delimiters", async () => {
        const tsv = `source\ttarget\tweight
n1\tn2\t1.0
n2\tn3\t2.0`;

        const source = new CSVDataSource({
            data: tsv,
            delimiter: "\t",
        });
        const chunks = [];

        for await (const chunk of source.getData()) {
            chunks.push(chunk);
        }

        assert.strictEqual(chunks[0].edges.length, 2);
    });

    describe("delimiter detection when none is given", () => {
        async function collect(config: ConstructorParameters<typeof CSVDataSource>[0]) {
            const nodes = [];
            const edges = [];
            for await (const chunk of new CSVDataSource(config).getData()) {
                nodes.push(...chunk.nodes);
                edges.push(...chunk.edges);
            }

            return { nodes, edges };
        }

        for (const [name, delimiter] of [
            ["tab", "\t"],
            ["semicolon", ";"],
            ["pipe", "|"],
        ] as const) {
            test(`reads a ${name}-separated edge list`, async () => {
                const { edges } = await collect({ data: `source${delimiter}target\na${delimiter}b\n` });

                assert.strictEqual(edges.length, 1);
                assert.strictEqual(edges[0].source, "a");
                assert.strictEqual(edges[0].target, "b");
            });
        }

        test("ignores a delimiter inside a quoted header field", async () => {
            const { edges } = await collect({ data: '"source;x",target\na,b\n', edgeSource: "source;x" });

            assert.strictEqual(edges.length, 1);
            assert.strictEqual(edges[0].source, "a");
        });

        test("detects the delimiter when the variant is given explicitly", async () => {
            const { edges } = await collect({ data: "source\ttarget\na\tb\n", variant: "edge-list" });

            assert.strictEqual(edges.length, 1);
            assert.strictEqual(edges[0].target, "b");
        });

        test("an explicit delimiter still wins over the file's own", async () => {
            const { edges } = await collect({ data: "source\ttarget\na\tb\n", delimiter: "," });

            // Read with a comma, the one column is named "source\ttarget": no endpoints, no edges.
            assert.notStrictEqual(edges[0]?.target, "b");
        });

        test("detects the delimiter of each file of a node and edge pair", async () => {
            const { nodes, edges } = await collect({
                nodeFile: new File(["id\tlabel\nn1\tOne\nn2\tTwo"], "nodes.tsv"),
                edgeFile: new File(["source;target\nn1;n2"], "edges.csv"),
            });

            assert.deepEqual(
                nodes.map((node) => node.id),
                ["n1", "n2"],
            );
            assert.strictEqual(edges.length, 1);
            assert.strictEqual(edges[0].source, "n1");
            assert.strictEqual(edges[0].target, "n2");
        });
    });

    test("yields in chunks for large files", async () => {
        let csv = "source,target\n";
        for (let i = 0; i < 5000; i++) {
            csv += `n${i},n${i + 1}\n`;
        }

        const source = new CSVDataSource({ data: csv });
        const chunks = [];

        for await (const chunk of source.getData()) {
            chunks.push(chunk);
        }

        // Should have multiple chunks
        assert.isTrue(chunks.length > 1);

        // Total edges should be 5000
        const totalEdges = chunks.reduce((sum, c) => sum + c.edges.length, 0);
        assert.strictEqual(totalEdges, 5000);
    });

    describe("CSV Variants", () => {
        test("parses Neo4j format with nodes and edges", async () => {
            const csv = `nodeId:ID,:LABEL,name,type
person-1,Person,Alice,user
person-2,Person,Bob,user
:START_ID,:END_ID,:TYPE,since
person-1,person-2,KNOWS,2020`;

            const source = new CSVDataSource({ data: csv, variant: "neo4j" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            // Should have nodes
            const nodes = chunks.flatMap((c) => c.nodes);
            assert.strictEqual(nodes.length, 2);
            assert.strictEqual(nodes[0].id, "person-1");
            assert.strictEqual(nodes[0].label, "Person");
            assert.strictEqual(nodes[0].name, "Alice");

            // Should have edges
            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 1);
            assert.strictEqual(edges[0].source, "person-1");
            assert.strictEqual(edges[0].target, "person-2");
            assert.strictEqual(edges[0].type, "KNOWS");
        });

        test("auto-detects Neo4j format", async () => {
            const csv = `userId:ID,:LABEL
u1,User
u2,User
:START_ID,:END_ID,:TYPE
u1,u2,FOLLOWS`;

            const source = new CSVDataSource({ data: csv });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const nodes = chunks.flatMap((c) => c.nodes);
            assert.strictEqual(nodes.length, 2);

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 1);
        });

        test("parses Gephi format", async () => {
            const csv = `Source,Target,Type,Weight,Label
n1,n2,Directed,1.5,Connection
n2,n3,Directed,2.0,Link`;

            const source = new CSVDataSource({ data: csv, variant: "gephi" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 2);
            assert.strictEqual(edges[0].source, "n1");
            assert.strictEqual(edges[0].target, "n2");
            assert.strictEqual(edges[0].Weight, 1.5);
        });

        test("auto-detects Gephi format", async () => {
            const csv = `Source,Target,Weight
n1,n2,1.0
n2,n3,2.0`;

            const source = new CSVDataSource({ data: csv });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 2);
            assert.strictEqual(edges[0].source, "n1");
        });

        test("parses Cytoscape format with interaction column", async () => {
            const csv = `source,target,interaction,weight
protein1,protein2,binds,0.95
protein2,protein3,inhibits,0.75`;

            const source = new CSVDataSource({ data: csv, variant: "cytoscape" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 2);
            assert.strictEqual(edges[0].source, "protein1");
            assert.strictEqual(edges[0].target, "protein2");
            assert.strictEqual(edges[0].interaction, "binds");
            assert.strictEqual(edges[0].weight, 0.95);
        });

        test("auto-detects Cytoscape format", async () => {
            const csv = `source,target,interaction
gene1,gene2,regulates
gene2,gene3,activates`;

            const source = new CSVDataSource({ data: csv });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 2);
            assert.strictEqual(edges[0].interaction, "regulates");
        });

        test("parses adjacency list format", async () => {
            const csv = `n1,n2,n3
n2,n3,n4
n3,n1`;

            const source = new CSVDataSource({ data: csv, variant: "adjacency-list" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 5);
            assert.strictEqual(edges[0].source, "n1");
            assert.strictEqual(edges[0].target, "n2");
            assert.strictEqual(edges[1].source, "n1");
            assert.strictEqual(edges[1].target, "n3");
        });

        test("parses adjacency list with weights", async () => {
            const csv = `n1,n2:1.5,n3:2.0
n2,n3:0.8`;

            const source = new CSVDataSource({ data: csv, variant: "adjacency-list" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const edges = chunks.flatMap((c) => c.edges);
            assert.strictEqual(edges.length, 3);
            assert.strictEqual(edges[0].source, "n1");
            assert.strictEqual(edges[0].target, "n2");
            assert.strictEqual(edges[0].weight, 1.5);
            assert.strictEqual(edges[1].target, "n3");
            assert.strictEqual(edges[1].weight, 2.0);
        });

        test("parses node list format", async () => {
            const csv = `id,label,type,score
n1,Node 1,server,95.5
n2,Node 2,client,88.3
n3,Node 3,database,99.9`;

            const source = new CSVDataSource({ data: csv, variant: "node-list" });
            const chunks = [];

            for await (const chunk of source.getData()) {
                chunks.push(chunk);
            }

            const nodes = chunks.flatMap((c) => c.nodes);
            assert.strictEqual(nodes.length, 3);
            assert.strictEqual(nodes[0].id, "n1");
            assert.strictEqual(nodes[0].label, "Node 1");
            assert.strictEqual(nodes[0].type, "server");
            assert.strictEqual(nodes[0].score, 95.5);
        });
    });
});
