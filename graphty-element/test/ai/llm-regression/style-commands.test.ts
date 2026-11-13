/**
 * Style Commands LLM Regression Tests
 * @module test/ai/llm-regression/style-commands
 *
 * Tests that a real model styles nodes and edges with the `style` tool -- literal values on a
 * target, or an encoding -- and clears what it added, in response to natural language prompts.
 *
 * These tests run against real LLM APIs. Each styling test reads what the session paints after
 * the model's turn: the requested hue or size on exactly the requested nodes or edges, and the
 * others left as they were.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";
import { edgesPainted, nodesPainted } from "./red";

const NODES = serverNetworkFixture.nodes;
const ALL_NODE_IDS = NODES.map((node) => node.id);

/**
 * One channel of every node, as the session resolves it.
 * @param session - The session.
 * @param channel - The node channel.
 * @returns The value per node id.
 */
function nodeChannel(session: GraphSession, channel: string): Map<string, unknown> {
    return new Map(
        ALL_NODE_IDS.map((id) => [id, session.styles.explain({ node: id }).merged[channel as never] as unknown]),
    );
}

/**
 * The ids of the nodes whose channel differs from a snapshot taken before the prompt.
 * @param session - The session.
 * @param channel - The node channel.
 * @param before - The snapshot.
 * @returns Their ids, in the fixture's order.
 */
function changedNodes(session: GraphSession, channel: string, before: Map<string, unknown>): string[] {
    const after = nodeChannel(session, channel);
    return ALL_NODE_IDS.filter((id) => JSON.stringify(after.get(id)) !== JSON.stringify(before.get(id)));
}

/**
 * The id of the edge between two nodes.
 * @param session - The session.
 * @param source - The source node id.
 * @param target - The target node id.
 * @returns The edge's id.
 */
function edgeId(session: GraphSession, source: string, target: string): string {
    const edge = session.data.edges().find((e) => String(e.source) === source && String(e.target) === target);
    assert.ok(edge, `no edge ${source}->${target}`);
    return edge.id;
}

/**
 * The width the session gives an edge.
 * @param session - The session.
 * @param id - The edge id.
 * @returns The width.
 */
function edgeWidth(session: GraphSession, id: string): number {
    return session.styles.explain({ edge: id }).merged["edge.width" as never];
}

describe.skipIf(skipIfNoApiKey())("Style Commands LLM Regression", () => {
    let harness: LlmRegressionTestHarness;
    let session: GraphSession;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
        session = harness.getGraph().getSession();
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("style nodes", () => {
        it("calls style for 'Make all nodes red'", async () => {
            const result = await harness.testPrompt("Make all nodes red");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            assert.deepStrictEqual(nodesPainted(session, NODES, "red"), ALL_NODE_IDS, "every node is red");
        });

        it("calls style for 'Highlight server nodes in blue'", async () => {
            const colorBefore = nodeChannel(session, "node.color");
            const result = await harness.testPrompt("Highlight server nodes in blue");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            // The default node color may itself read as blue, so "only the server nodes change"
            // is what pins the target; the hue check pins the color.
            const blue = nodesPainted(session, NODES, "blue");
            assert.includeMembers(blue, ["1", "2"], "the server nodes are blue");
            assert.deepStrictEqual(
                changedNodes(session, "node.color", colorBefore),
                ["1", "2"],
                "only the server nodes change color",
            );
        });

        it("calls style for 'Make all nodes bigger'", async () => {
            const sizeBefore = nodeChannel(session, "node.size");
            const result = await harness.testPrompt("Make all nodes bigger");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            const sizeAfter = nodeChannel(session, "node.size");
            for (const id of ALL_NODE_IDS) {
                assert.isAbove(
                    sizeAfter.get(id) as number,
                    sizeBefore.get(id) as number,
                    `node ${id} is bigger than before`,
                );
            }
        });

        it("calls style for 'Make database nodes green and larger'", async () => {
            const colorBefore = nodeChannel(session, "node.color");
            const sizeBefore = nodeChannel(session, "node.size");
            const result = await harness.testPrompt("Make database nodes green and larger");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            // Both halves of the request, on the database node alone.
            assert.deepStrictEqual(nodesPainted(session, NODES, "green"), ["3"], "the database node is green");
            assert.deepStrictEqual(
                changedNodes(session, "node.color", colorBefore),
                ["3"],
                "only the database node changes color",
            );
            assert.deepStrictEqual(
                changedNodes(session, "node.size", sizeBefore),
                ["3"],
                "only the database node changes size",
            );
            assert.isAbove(
                nodeChannel(session, "node.size").get("3") as number,
                sizeBefore.get("3") as number,
                "the database node is larger",
            );
        });
    });

    describe("style edges", () => {
        it("calls style for 'Make all edges green'", async () => {
            const result = await harness.testPrompt("Make all edges green");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            assert.deepStrictEqual(
                edgesPainted(session, "green"),
                session.data.edges().map((edge) => edge.id),
                "every edge is green",
            );
        });

        it("calls style for 'Make high-weight edges thicker'", async () => {
            const result = await harness.testPrompt("Make high-weight edges thicker");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            // "High" names no threshold, so a filter at any cut or an encoding on weight both
            // answer it; either way the heaviest edge (2->3, weight 1.0) ends wider than the
            // lightest (4->1, weight 0.3), which all edges' default width does not.
            assert.isAbove(
                edgeWidth(session, edgeId(session, "2", "3")),
                edgeWidth(session, edgeId(session, "4", "1")),
                "the heaviest edge is wider than the lightest",
            );
        });

        it("calls style for 'Color edges with latency > 50 as red'", async () => {
            const result = await harness.testPrompt("Color edges with latency > 50 as red");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["add", "encode"]);
            assert.deepStrictEqual(
                edgesPainted(session, "red"),
                [edgeId(session, "4", "1")],
                "only the edge with latency 100 is red",
            );
        });
    });

    describe("clear styles", () => {
        it("calls style clear_mine for 'Remove all styling'", async () => {
            const result = await harness.testPrompt("Remove all styling");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);
        });

        it("calls style clear_mine for 'Clear the highlight style'", async () => {
            // A highlight the assistant added earlier, so there is one to clear.
            await harness
                .getGraph()
                .getSession()
                .styles.add({
                    name: "highlight",
                    target: "node",
                    kind: "custom",
                    selector: { match: "expression", where: "data.type == 'server'" },
                    set: { "node.color": "#ffcc00" },
                    source: { by: "plugin", name: "graphty-ai" },
                });
            const result = await harness.testPrompt("Clear the highlight style");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);
            // No highlight exists yet: clearing the assistant's layers, or naming one, both do.
        });
    });

    describe("command result validation", () => {
        it("returns command result for styling nodes", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Apply red color to all nodes");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["add", "encode"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("returns command result for styling edges", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Color all edges green");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["add", "encode"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("returns command result for clearing styles", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Clear all styles from the graph");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            // "All styles" fairly includes the element's own default layers, and a model that also
            // removes one is refused with E_PROTECTED: the element still protects them, which
            // #5905 removes ("any layer may be deleted"). Until then that refusal, and only that
            // one, is the element's defect, not the model's. Delete this allowance with #5905.
            const refusedProtected = result.code === "AI_TOOL_FAILED" && result.params?.cause === "E_PROTECTED";
            assert.ok(
                result.commandResult.success || refusedProtected,
                `Expected the change to succeed: ${result.code ?? ""} ${JSON.stringify(result.params ?? {})}`,
            );
        });
    });
});
