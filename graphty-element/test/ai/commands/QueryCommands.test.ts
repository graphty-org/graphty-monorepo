/**
 * QueryCommands Tests - Tests for graph query commands.
 * @module test/ai/commands/QueryCommands.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import { findNodes, getSchema, queryGraph } from "../../../src/ai/commands/QueryCommands";
import type { CommandContext } from "../../../src/ai/commands/types";
import type { Graph } from "../../../src/Graph";
import { createCommandContext, createCommandGraph } from "../../helpers/session-graph";

describe("QueryCommands", () => {
    let graph: Graph;
    let context: CommandContext;

    beforeEach(async () => {
        graph = await createCommandGraph({ nodeCount: 25, edgeCount: 40 });
        context = createCommandContext(graph);
    });

    describe("queryGraph", () => {
        it("returns node count", async () => {
            const result = await queryGraph.execute(graph, { query: "nodeCount" }, context);
            assert.strictEqual(result.success, true);
            assert.strictEqual((result.data as { nodeCount: number }).nodeCount, 25);
        });

        it("returns edge count", async () => {
            const result = await queryGraph.execute(graph, { query: "edgeCount" }, context);
            assert.strictEqual(result.success, true);
            assert.strictEqual((result.data as { edgeCount: number }).edgeCount, 40);
        });

        it("returns current layout", async () => {
            const result = await queryGraph.execute(graph, { query: "currentLayout" }, context);
            assert.strictEqual(result.success, true);
            const data = result.data as { layout: string };
            assert.ok(typeof data.layout === "string");
        });

        it("returns all stats when query is 'all' or 'summary'", async () => {
            const result = await queryGraph.execute(graph, { query: "all" }, context);
            assert.strictEqual(result.success, true);
            const data = result.data as { nodeCount: number; edgeCount: number; layout: string };
            assert.strictEqual(data.nodeCount, 25);
            assert.strictEqual(data.edgeCount, 40);
            assert.ok(typeof data.layout === "string");
        });

        it("handles invalid query gracefully", async () => {
            const result = await queryGraph.execute(graph, { query: "invalidQuery" }, context);
            // Should either succeed with partial data or fail with helpful message
            assert.ok(result.message.length > 0);
        });
    });

    describe("queryGraph metadata", () => {
        it("has correct name", () => {
            assert.strictEqual(queryGraph.name, "queryGraph");
        });

        it("has description", () => {
            assert.ok(queryGraph.description.length > 0);
        });

        it("has parameters schema", () => {
            assert.ok(queryGraph.parameters);
        });

        it("has examples", () => {
            assert.ok(Array.isArray(queryGraph.examples));
            assert.ok(queryGraph.examples.length > 0);
        });
    });

    describe("findNodes", () => {
        interface FindNodesData {
            total: number;
            returned: number;
            count: number;
            truncated: boolean;
            nodeIds: string[];
        }

        it("caps an unlimited query at the default and reports the total", async () => {
            const big = await createCommandGraph({ nodeCount: 1000, edgeCount: 0 });
            const result = await findNodes.execute(big, { selector: "" }, createCommandContext(big));
            assert.strictEqual(result.success, true);

            const data = result.data as FindNodesData;
            assert.strictEqual(data.nodeIds.length, 50);
            assert.strictEqual(data.returned, 50);
            assert.strictEqual(data.count, 50);
            assert.strictEqual(data.total, 1000);
            assert.strictEqual(data.truncated, true);
            assert.strictEqual(result.affectedNodes?.length, 50);
            assert.include(result.message, "1000");
        });

        it("reports the total when a limit is passed", async () => {
            const big = await createCommandGraph({ nodeCount: 1000, edgeCount: 0 });
            const result = await findNodes.execute(big, { selector: "*", limit: 10 }, createCommandContext(big));
            const data = result.data as FindNodesData;
            assert.strictEqual(data.returned, 10);
            assert.strictEqual(data.total, 1000);
            assert.strictEqual(data.truncated, true);
        });

        it("is not truncated when every match fits", async () => {
            const small = await createCommandGraph({ nodeCount: 5, edgeCount: 0 });
            const result = await findNodes.execute(small, { selector: "" }, createCommandContext(small));
            const data = result.data as FindNodesData;
            assert.strictEqual(data.total, 5);
            assert.strictEqual(data.returned, 5);
            assert.strictEqual(data.truncated, false);
        });

        it("tells the model the cap exists", () => {
            assert.include(findNodes.description, "50");
        });
    });

    describe("getSchema", () => {
        /**
         * A graph whose nodes carry two types and a numeric score, and whose edges carry a
         * weight and no type.
         * @returns The graph.
         */
        function typedGraph(): Promise<Graph> {
            return createCommandGraph({
                nodeCount: 6,
                edgeCount: 4,
                nodeData: (i) => ({ type: i % 2 === 0 ? "person" : "place", score: i }),
                edgeData: (i) => ({ weight: i }),
            });
        }

        it("lists the node types", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "nodeTypes" }, context);
            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(result.data, { nodeTypes: ["person", "place"] });
            assert.strictEqual(result.message, "Found 2 node types: person, place");
        });

        it("says there are no edge types when edges carry none", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "edgeTypes" }, context);
            assert.strictEqual(result.success, true);
            assert.deepStrictEqual(result.data, { edgeTypes: [] });
            assert.include(result.message, "No distinct edge types found");
        });

        it("describes each node property as a line", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "nodeProperties" }, context);
            assert.strictEqual(result.success, true);
            assert.match(result.message, /^Node properties:\n- /);
            assert.match(result.message, /- score: (number|integer)/);
        });

        it("describes each edge property as a line", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "edgeProperties" }, context);
            assert.strictEqual(result.success, true);
            assert.match(result.message, /^Edge properties:\n- /);
            assert.match(result.message, /- weight: (number|integer)/);
        });

        it("summarizes the whole schema", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "all" }, context);
            assert.strictEqual(result.success, true);
            assert.match(
                result.message,
                /^Graph Schema Summary:\n- 6 nodes with \d+ properties\n- 4 edges with \d+ properties/,
            );
            assert.include(result.message, "\n\nNode types: person, place");
            assert.notInclude(result.message, "Edge types:");
            assert.include(result.message, "\n\nEdge properties: ");
            const data = result.data as { nodeTypes: string[]; edgeTypes: string[]; nodeCount: number };
            assert.deepStrictEqual(data.nodeTypes, ["person", "place"]);
            assert.deepStrictEqual(data.edgeTypes, []);
            assert.strictEqual(data.nodeCount, 6);
        });

        it("refuses an unknown query", async () => {
            const result = await getSchema.execute(await typedGraph(), { query: "nope" }, context);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.message, "Unknown schema query type: nope");
        });
    });
});
