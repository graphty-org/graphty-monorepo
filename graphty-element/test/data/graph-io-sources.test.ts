import { readFileSync } from "node:fs";

import { assert, describe, test } from "vitest";

import { CSVDataSource } from "../../src/data/CSVDataSource.js";
import type { DataSource } from "../../src/data/DataSource.js";
import { JsonDataSource } from "../../src/data/JsonDataSource.js";

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
