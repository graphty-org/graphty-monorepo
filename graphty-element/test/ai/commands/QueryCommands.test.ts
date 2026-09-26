/**
 * QueryCommands Tests - Tests for graph query commands.
 * @module test/ai/commands/QueryCommands.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import { findNodes, queryGraph } from "../../../src/ai/commands/QueryCommands";
import type { CommandContext } from "../../../src/ai/commands/types";
import type { Graph } from "../../../src/Graph";
import { createMockContext, createTestGraph } from "../../helpers/test-graph";

describe("QueryCommands", () => {
    let graph: Graph;
    let context: CommandContext;

    beforeEach(() => {
        graph = createTestGraph({ nodes: 25, edges: 40 });
        context = createMockContext(graph);
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
            const big = createTestGraph({ nodes: 1000, edges: 0 });
            const result = await findNodes.execute(big, { selector: "" }, createMockContext(big));
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
            const big = createTestGraph({ nodes: 1000, edges: 0 });
            const result = await findNodes.execute(big, { selector: "*", limit: 10 }, createMockContext(big));
            const data = result.data as FindNodesData;
            assert.strictEqual(data.returned, 10);
            assert.strictEqual(data.total, 1000);
            assert.strictEqual(data.truncated, true);
        });

        it("is not truncated when every match fits", async () => {
            const small = createTestGraph({ nodes: 5, edges: 0 });
            const result = await findNodes.execute(small, { selector: "" }, createMockContext(small));
            const data = result.data as FindNodesData;
            assert.strictEqual(data.total, 5);
            assert.strictEqual(data.returned, 5);
            assert.strictEqual(data.truncated, false);
        });

        it("tells the model the cap exists", () => {
            assert.include(findNodes.description, "50");
        });
    });
});
