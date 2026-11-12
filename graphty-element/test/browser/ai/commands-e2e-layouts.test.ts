/**
 * AI Layout Commands - Comprehensive Layout Testing
 *
 * Tests all supported layout types through the AI interface.
 * Verifies that each layout can be activated and produces valid results.
 *
 * @module test/browser/ai/commands-e2e-layouts
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { ExecutionResult } from "../../../src/ai/AiController";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph } from "../../helpers/e2e-graph-setup";

/**
 * Type for data returned by queryGraph command.
 */
interface QueryData {
    nodeCount?: number;
}

/**
 * Assert a command succeeded and ran a tool, naming its code when it did not.
 * @param result - The command's result.
 */
function assertSucceeded(result: ExecutionResult): void {
    assert.strictEqual(result.success, true, `${result.code}: ${result.message}`);
    assert.isAbove(Number(result.params?.toolCalls), 0, "no tool ran");
}

/**
 * Assert setLayout refused, with the session's own code as the cause.
 * @param result - The command's result.
 * @param cause - The session code the layout was refused with.
 */
function assertLayoutRefused(result: ExecutionResult, cause: string): void {
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, "AI_TOOL_FAILED");
    assert.deepInclude(result.params, { tool: "setLayout", cause });
}

describe("AI Layout Commands - All Layout Types", () => {
    /**
     * All supported layout types to test.
     * These should match the available layouts in the layout registry.
     */
    const layoutTypes = [
        "circular",
        "ngraph",
        "random",
        "d3",
        "spiral",
        "shell",
        "spring",
        "planar",
        "kamada-kawai",
        "forceatlas2",
        "arf",
        "spectral",
        "fixed",
    ];

    /**
     * Layouts that need an option the fixture's call does not pass (bfs a `start` node, the
     * partite layouts `groupBy`), so setLayout refuses them with the session's E_OPTION_RANGE.
     */
    const layoutsNeedingOptions = ["bfs", "bipartite", "multipartite"];

    let graph: Graph;

    beforeEach(async () => {
        // Create a graph with enough nodes for various layouts
        const result = await createE2EGraph({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
            edges: [
                { src: "A", dst: "B" },
                { src: "B", dst: "C" },
                { src: "C", dst: "D" },
                { src: "D", dst: "E" },
            ],
            enableAi: true,
        });
        ({ graph } = result);
    });

    afterEach(() => {
        cleanupE2EGraph();
    });

    /**
     * Get the mock provider from the graph's AI manager.
     */
    function getProvider(): MockLlmProvider {
        const aiManager = graph.getAiManager();
        if (!aiManager) {
            throw new Error("AI Manager not initialized");
        }

        const provider = aiManager.getProvider() as MockLlmProvider;

        return provider;
    }

    // Generate tests for each layout type
    for (const layoutType of layoutTypes) {
        it(`can switch to ${layoutType} layout`, async () => {
            const provider = getProvider();

            provider.setResponse(layoutType, {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: layoutType } }],
            });

            const result = await graph.aiCommand(layoutType);

            assertSucceeded(result);
            assert.strictEqual(graph.getLayoutManager().layoutEngine?.type, layoutType);
        });
    }

    for (const layoutType of layoutsNeedingOptions) {
        it(`refuses ${layoutType} layout without its required option`, async () => {
            const provider = getProvider();

            provider.setResponse(layoutType, {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: layoutType } }],
            });

            const result = await graph.aiCommand(layoutType);

            assertLayoutRefused(result, "E_OPTION_RANGE");
            assert.notStrictEqual(graph.getLayoutManager().layoutEngine?.type, layoutType);
        });
    }

    describe("layout switching sequences", () => {
        it("can switch between multiple layouts in sequence", async () => {
            const provider = getProvider();
            const layoutSequence = ["circular", "random", "spiral"];

            for (const layout of layoutSequence) {
                provider.setResponse(layout, {
                    text: "",
                    toolCalls: [{ id: "1", name: "setLayout", arguments: { type: layout } }],
                });

                const result = await graph.aiCommand(layout);

                assertSucceeded(result);
                assert.strictEqual(
                    graph.getLayoutManager().layoutEngine?.type,
                    layout,
                    `Expected layout to be ${layout}`,
                );
            }
        });

        it("maintains node count across layout changes", async () => {
            const provider = getProvider();

            // Get initial node count
            provider.setResponse("count", {
                text: "",
                toolCalls: [{ id: "1", name: "queryGraph", arguments: { query: "nodeCount" } }],
            });
            const initialResult = await graph.aiCommand("count nodes");
            assertSucceeded(initialResult);
            const initialNodeCount = (initialResult.data as QueryData).nodeCount;

            // Change layouts
            provider.setResponse("circular", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "circular" } }],
            });
            assertSucceeded(await graph.aiCommand("circular"));

            provider.setResponse("spiral", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "spiral" } }],
            });
            assertSucceeded(await graph.aiCommand("spiral"));

            // Check node count is preserved
            provider.setResponse("count after", {
                text: "",
                toolCalls: [{ id: "1", name: "queryGraph", arguments: { query: "nodeCount" } }],
            });
            const finalResult = await graph.aiCommand("count after change");
            assertSucceeded(finalResult);

            assert.strictEqual((finalResult.data as QueryData).nodeCount, initialNodeCount);
        });
    });

    describe("layout with dimension changes", () => {
        it("circular layout works in 2D mode", async () => {
            const provider = getProvider();

            // Switch to 2D
            provider.setResponse("2d", {
                text: "",
                toolCalls: [{ id: "1", name: "setDimension", arguments: { dimension: "2d" } }],
            });
            assertSucceeded(await graph.aiCommand("2d"));
            assert.strictEqual(graph.getViewMode() === "2d", true);

            // Apply circular layout
            provider.setResponse("circular", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "circular" } }],
            });
            const result = await graph.aiCommand("circular");

            assertSucceeded(result);
            const layoutManager = graph.getLayoutManager();
            assert.strictEqual(layoutManager.layoutEngine?.type, "circular");
        });

        it("spiral layout works in 3D mode", async () => {
            const provider = getProvider();

            // Ensure we're in 3D (default)
            assert.strictEqual(graph.getViewMode() === "2d", false);

            // Apply spiral layout
            provider.setResponse("spiral", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "spiral" } }],
            });
            const result = await graph.aiCommand("spiral");

            assertSucceeded(result);
            const layoutManager = graph.getLayoutManager();
            assert.strictEqual(layoutManager.layoutEngine?.type, "spiral");
        });

        it("can change dimension after layout is set", async () => {
            const provider = getProvider();

            // Set layout first (using circular which supports dimension changes)
            provider.setResponse("circular", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "circular" } }],
            });
            assertSucceeded(await graph.aiCommand("circular"));

            // Then change dimension
            provider.setResponse("2d", {
                text: "",
                toolCalls: [{ id: "1", name: "setDimension", arguments: { dimension: "2d" } }],
            });
            const result = await graph.aiCommand("2d");

            assertSucceeded(result);
            assert.strictEqual(graph.getViewMode() === "2d", true);
        });
    });

    describe("force-directed layouts", () => {
        const forceLayouts = ["ngraph", "d3", "forceatlas2"];

        for (const layout of forceLayouts) {
            it(`${layout} layout initializes correctly`, async () => {
                const provider = getProvider();

                provider.setResponse(layout, {
                    text: "",
                    toolCalls: [{ id: "1", name: "setLayout", arguments: { type: layout } }],
                });

                const result = await graph.aiCommand(layout);

                assertSucceeded(result);
                assert.strictEqual(graph.getLayoutManager().layoutEngine?.type, layout);
            });
        }
    });

    describe("hierarchical layouts", () => {
        it("bfs layout works with connected graph and a start node", async () => {
            const provider = getProvider();

            provider.setResponse("bfs", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "bfs", options: { start: "A" } } }],
            });

            const result = await graph.aiCommand("bfs");

            assertSucceeded(result);
            assert.strictEqual(graph.getLayoutManager().layoutEngine?.type, "bfs");
        });
    });

    describe("partitioning layouts", () => {
        it("bipartite layout refuses a graph without explicit partitions", async () => {
            const provider = getProvider();

            provider.setResponse("bipartite", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "bipartite" } }],
            });

            const result = await graph.aiCommand("bipartite");

            // The path graph is bipartite, but the layout reads its parts from groupBy, which no node carries.
            assertLayoutRefused(result, "E_OPTION_RANGE");
        });

        it("multipartite layout refuses a graph without explicit partitions", async () => {
            const provider = getProvider();

            provider.setResponse("multipartite", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "multipartite" } }],
            });

            const result = await graph.aiCommand("multipartite");

            assertLayoutRefused(result, "E_OPTION_RANGE");
        });
    });

    describe("special layouts", () => {
        it("fixed layout can be set", async () => {
            const provider = getProvider();

            provider.setResponse("fixed", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "fixed" } }],
            });

            const result = await graph.aiCommand("fixed");

            // Fixed layout uses the current positions
            assertSucceeded(result);
            assert.strictEqual(graph.getLayoutManager().layoutEngine?.type, "fixed");
        });

        it("planar layout embeds the planar path graph", async () => {
            const provider = getProvider();

            provider.setResponse("planar", {
                text: "",
                toolCalls: [{ id: "1", name: "setLayout", arguments: { type: "planar" } }],
            });

            const result = await graph.aiCommand("planar");

            assertSucceeded(result);
            assert.strictEqual(graph.getLayoutManager().layoutEngine?.type, "planar");
        });
    });
});
