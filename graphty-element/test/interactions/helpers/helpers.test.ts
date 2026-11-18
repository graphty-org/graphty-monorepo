/**
 * Tests for interaction test helpers
 *
 * These tests verify that the test utilities work correctly,
 * providing confidence that subsequent interaction tests have a solid foundation.
 */

import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { Graph } from "../../../src/Graph";
import {
    DEFAULT_TEST_EDGES,
    DEFAULT_TEST_NODES,
    dragNode,
    getNodeScreenPosition,
    setupTestGraph,
    teardownTestGraph,
    waitForGraphReady,
} from "./interaction-helpers";

describe("Interaction Test Helpers", () => {
    let graph: Graph | undefined;

    afterEach(() => {
        if (graph) {
            teardownTestGraph(graph);
            graph = undefined;
        }
    });

    describe("waitForGraphReady", () => {
        test("resolves when graph is initialized", async () => {
            graph = await setupTestGraph();

            // Should already be ready since setupTestGraph waits
            await waitForGraphReady(graph);

            assert.isTrue(graph.initialized, "Graph should be initialized");
            assert.isDefined(graph.scene, "Scene should be defined");
            assert.isDefined(graph.camera, "Camera should be defined");
        });
    });

    describe("getNodeScreenPosition", () => {
        beforeEach(async () => {
            graph = await setupTestGraph({
                mode: "3d",
                nodes: DEFAULT_TEST_NODES,
                edges: DEFAULT_TEST_EDGES,
            });
        });

        test("returns valid coordinates for existing node", () => {
            if (!graph) {
                throw new Error("Graph should be defined");
            }

            const pos = getNodeScreenPosition(graph, "node1");

            assert.isNotNull(pos, "Should return position for existing node");
            assert.isNumber(pos.x, "X coordinate should be a number");
            assert.isNumber(pos.y, "Y coordinate should be a number");
        });

        test("returns null for non-existent node", () => {
            if (!graph) {
                throw new Error("Graph should be defined");
            }

            const pos = getNodeScreenPosition(graph, "non-existent-node");

            assert.isNull(pos, "Should return null for non-existent node");
        });
    });

    describe("setupTestGraph", () => {
        test("creates graph with default 3D mode", async () => {
            graph = await setupTestGraph();

            assert.equal(graph.getViewMode(), "3d", "Default mode should be 3D");
        });

        test("creates graph with specified 2D mode", async () => {
            graph = await setupTestGraph({ mode: "2d" });

            assert.equal(graph.getViewMode(), "2d", "Should be in 2D mode");
        });

        test("creates graph with initial nodes", async () => {
            graph = await setupTestGraph({
                nodes: DEFAULT_TEST_NODES,
            });

            assert.equal(graph.getNodes().length, 3, "Should have 3 nodes");
        });

        test("creates graph with initial edges", async () => {
            graph = await setupTestGraph({
                nodes: DEFAULT_TEST_NODES,
                edges: DEFAULT_TEST_EDGES,
            });

            // Edges require nodes to exist
            assert.equal(graph.getNodes().length, 3, "Should have 3 nodes");
        });

        test("applies pinOnDrag setting", async () => {
            graph = await setupTestGraph({ pinOnDrag: false });
            assert.isDefined(graph, "Graph should be defined");

            // The setting is stored in the styles config
            assert.isFalse(graph.styles.config.behavior.node.pinOnDrag, "pinOnDrag should be false");
        });
    });

    describe("dragNode", () => {
        beforeEach(async () => {
            graph = await setupTestGraph({
                mode: "3d",
                nodes: [{ id: "test-node", x: 0, y: 0, z: 0 }],
            });
        });

        test("moves the node it drags", async () => {
            if (!graph) {
                throw new Error("Graph should be defined");
            }

            const before = graph.getNode("test-node")?.getPosition();
            assert.isDefined(before, "Node should exist");

            await dragNode(graph, "test-node", { dx: 50, dy: 50 });

            const after = graph.getNode("test-node")?.getPosition();
            assert.isDefined(after, "Node should still exist after drag");
            const moved = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
            assert.isAbove(moved, 0.1, "the drag moved the node");
        });

        test("throws error for non-existent node", async () => {
            if (!graph) {
                throw new Error("Graph should be defined");
            }

            try {
                await dragNode(graph, "non-existent", { dx: 10, dy: 10 });
                assert.fail("Should throw error for non-existent node");
            } catch (error) {
                assert.include((error as Error).message, "not found", "Error should mention node not found");
            }
        });
    });
});
