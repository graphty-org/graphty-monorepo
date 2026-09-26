import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { LAYOUT_DESCRIPTORS } from "../../src/catalog/layouts";
import { GraphtyError, isGraphtyError } from "../../src/errors";
import { Graph } from "../../src/Graph";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, EventManager, LayoutManager } from "../../src/managers";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("LayoutManager", () => {
    let graph: Graph;
    let layoutManager: LayoutManager;

    beforeEach(async () => {
        graph = await createTestGraph();
        layoutManager = graph.getLayoutManager();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    describe("initialization", () => {
        it("should initialize without errors", async () => {
            await layoutManager.init();
            assert.isNotNull(layoutManager);
        });

        it("should dispose without errors", () => {
            layoutManager.dispose();
            assert.isNotNull(layoutManager);
        });

        it("should dispose layout engine on dispose", async () => {
            await layoutManager.setLayout("ngraph", {});
            layoutManager.dispose();

            // LayoutEngine doesn't have a dispose method in the abstract interface
            // This test just ensures dispose() doesn't throw
            assert.isNotNull(layoutManager);
        });
    });

    describe("layout management", () => {
        it("should set layout engine", async () => {
            await layoutManager.setLayout("ngraph", {});

            assert.isNotNull(layoutManager.layoutEngine);
            assert.equal(layoutManager.layoutEngine?.type, "ngraph");
            assert.isTrue(layoutManager.running);
        });

        it("should run pre-steps when setting layout", async () => {
            // Add some nodes first so we have something to layout
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
            ] as Record<string, unknown>[]);

            await layoutManager.setLayout("ngraph", {});

            // Verify layout was initialized
            assert.isNotNull(layoutManager.layoutEngine);
            assert.isTrue(layoutManager.running);
        });

        it("should run configured number of pre-steps when setting layout", async () => {
            // Configure pre-steps in styles
            graph.styles.config.behavior.layout.preSteps = 10;

            // Add some nodes
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
                { id: "node3", label: "Node 3" },
            ] as Record<string, unknown>[]);
            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
            ] as Record<string, unknown>[]);

            // Track the number of steps called during layout initialization
            let stepCount = 0;

            // Mock the LayoutEngine.get method to return a layout with instrumented step method
            const originalGet = LayoutEngine.get;
            LayoutEngine.get = (type: string, opts: object) => {
                const engine = originalGet(type, opts);
                if (engine) {
                    const originalStep = engine.step.bind(engine);
                    engine.step = () => {
                        stepCount++;
                        originalStep();
                    };
                    // Ensure the layout doesn't settle during pre-steps
                    Object.defineProperty(engine, "isSettled", {
                        get: () => stepCount >= 10,
                        configurable: true,
                    });
                }

                return engine;
            };

            try {
                // Set layout which should trigger pre-steps
                await layoutManager.setLayout("ngraph", {});

                // Verify that pre-steps were run
                assert.equal(stepCount, 10, "Layout engine should have been stepped 10 times for pre-steps");

                // Verify layout is still running after pre-steps
                assert.isTrue(layoutManager.running);
            } finally {
                // Restore original method
                LayoutEngine.get = originalGet;
            }
        });

        it("should report an unknown layout name as a coded failure", async () => {
            // A bare TypeError left a consumer parsing a message to find out what went wrong, and
            // told it nothing about what it could have asked for instead.
            await expect(layoutManager.setLayout("unknown", {})).rejects.toThrow(GraphtyError);

            let thrown: unknown;
            try {
                await layoutManager.setLayout("unknown", {});
            } catch (error) {
                thrown = error;
            }

            assert.isTrue(isGraphtyError(thrown), "an unknown layout fails as a GraphtyError");
            const failure = thrown as GraphtyError;
            assert.strictEqual(failure.code, "E_UNKNOWN_LAYOUT");
            assert.include(failure.details.available as readonly string[], "ngraph", "and it says what is available");
        });

        it("should handle zero pre-steps configuration", async () => {
            // Configure zero pre-steps
            graph.styles.config.behavior.layout.preSteps = 0;

            // Add some nodes
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
            ] as Record<string, unknown>[]);

            // Track the number of steps called during layout initialization
            let stepCount = 0;

            // Mock the LayoutEngine.get method to return a layout with instrumented step method
            const originalGet = LayoutEngine.get;
            LayoutEngine.get = (type: string, opts: object) => {
                const engine = originalGet(type, opts);
                if (engine) {
                    const originalStep = engine.step.bind(engine);
                    engine.step = () => {
                        stepCount++;
                        originalStep();
                    };
                }

                return engine;
            };

            try {
                // Set layout which should NOT trigger any pre-steps
                await layoutManager.setLayout("ngraph", {});

                // Verify that NO pre-steps were run
                assert.equal(stepCount, 0, "Layout engine should not have been stepped when preSteps is 0");

                // Verify layout is still running
                assert.isTrue(layoutManager.running);
            } finally {
                // Restore original method
                LayoutEngine.get = originalGet;
            }
        });

        it("should ensure pre-steps affect node positions", async () => {
            // Configure pre-steps in styles
            graph.styles.config.behavior.layout.preSteps = 50;

            // Add some nodes in a connected graph
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
                { id: "node3", label: "Node 3" },
                { id: "node4", label: "Node 4" },
            ] as Record<string, unknown>[]);
            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
                { id: "edge3", src: "node3", dst: "node4" },
                { id: "edge4", src: "node4", dst: "node1" },
            ] as Record<string, unknown>[]);

            // Set layout which should trigger pre-steps
            await layoutManager.setLayout("ngraph", {});

            // Get positions after pre-steps
            const nodes = Array.from(layoutManager.nodes);
            const positions: ([number, number, number] | undefined)[] = nodes.map((node) =>
                layoutManager.getNodePosition(node),
            );

            // Verify that nodes have positions
            positions.forEach((pos, i) => {
                assert.isDefined(pos, `Node ${i} should have a position after pre-steps`);
                 
                if (pos) {
                    assert.isArray(pos);
                    assert.equal(pos.length, 3);
                }
            });

            // For force-directed layouts, pre-steps should spread nodes apart
            // Check that not all nodes are at the same position
            const uniquePositions = new Set(positions.map((p) => p?.join(",")));
            assert.isAbove(uniquePositions.size, 1, "Pre-steps should result in nodes having different positions");

            // Verify layout is still running after pre-steps
            assert.isTrue(layoutManager.running);
        });

        it("should dispose previous layout when setting new one", async () => {
            // Set first layout
            await layoutManager.setLayout("ngraph", {});
            const firstEngine = layoutManager.layoutEngine;

            // Set second layout
            await layoutManager.setLayout("random", {});

            // LayoutEngine doesn't have a dispose method, so we just check that layout was set
            assert.isNotNull(firstEngine);
            assert.equal(layoutManager.layoutEngine?.type, "random");
        });
    });

    describe("layout stepping", () => {
        beforeEach(async () => {
            await layoutManager.setLayout("ngraph", {});
        });

        it("should step layout when running", () => {
            layoutManager.step();
            // Should not throw
            assert.isNotNull(layoutManager);
        });

        it("should not step when not running", () => {
            layoutManager.running = false;
            layoutManager.step();
            // Should not throw
            assert.isNotNull(layoutManager);
        });

        it("should not step when no layout engine", async () => {
            // Create new manager without layout
            const container = document.createElement("div");
            document.body.appendChild(container);
            const newGraph = new Graph(container);
            await newGraph.init();
            const newManager = newGraph.getLayoutManager();

            newManager.step();
            // Should not throw
            assert.isNotNull(newManager);

            // Cleanup
            newGraph.shutdown();
            container.remove();
        });
    });

    describe("node and edge management", () => {
        it("should get nodes from layout engine", async () => {
            // Add some test data
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
            ] as Record<string, unknown>[]);

            await layoutManager.setLayout("ngraph", {});

            const nodes = Array.from(layoutManager.nodes);
            assert.equal(nodes.length, 2);
            assert.equal(nodes[0].id, "node1");
            assert.equal(nodes[1].id, "node2");
        });

        it("should get edges from layout engine", async () => {
            // Add some test data
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
            ] as Record<string, unknown>[]);
            dataManager.addEdges([{ id: "edge1", src: "node1", dst: "node2" }] as Record<string, unknown>[]);

            await layoutManager.setLayout("ngraph", {});

            const edges = Array.from(layoutManager.edges);
            assert.equal(edges.length, 1);
            assert.equal(edges[0].id, "0", "the engine holds the same Edge, under the element's own id");
        });
    });

    describe("position management", () => {
        beforeEach(async () => {
            // Add some test data
            const dataManager = graph.getDataManager();
            dataManager.addNodes([{ id: "node1", label: "Node 1" }] as Record<string, unknown>[]);

            await layoutManager.setLayout("ngraph", {});
        });

        it("should get node position from layout engine", () => {
            const nodes = Array.from(layoutManager.nodes);
            const node = nodes[0];

            const position = layoutManager.getNodePosition(node);

            assert.isDefined(position);
            assert.isArray(position);
            assert.equal(position.length, 3);
        });

        it("should handle undefined position", () => {
            const nodes = Array.from(layoutManager.nodes);
            const node = nodes[0];

            const position = layoutManager.getNodePosition(node);

            assert.isDefined(position);
            assert.isArray(position);
        });

        it("should handle position without z coordinate", () => {
            const nodes = Array.from(layoutManager.nodes);
            const node = nodes[0];

            const position = layoutManager.getNodePosition(node);

            assert.isDefined(position);
            assert.equal(position.length, 3);
            // Z coordinate should default to 0 if not provided
            assert.isNumber(position[2]);
        });

        it("should return undefined when no layout engine", async () => {
            // Create new manager without layout
            const container = document.createElement("div");
            document.body.appendChild(container);
            const newGraph = new Graph(container);
            await newGraph.init();
            const newManager = newGraph.getLayoutManager();

            // Add a node to the new graph so we have a node to test with
            const newDataManager = newGraph.getDataManager();
            newDataManager.addNodes([{ id: "testNode", label: "Test Node" }] as Record<string, unknown>[]);

            const nodes = Array.from(newDataManager.nodes.values());
            const node = nodes[0];

            // Clear the layout engine to make it return undefined
             
            (newManager as any).layoutEngine = undefined;

            const position = newManager.getNodePosition(node);

            assert.isUndefined(position);

            // Cleanup
            newGraph.shutdown();
            container.remove();
        });
    });

    describe("layout state", () => {
        it("should report settled state from layout engine", async () => {
            await layoutManager.setLayout("ngraph", {});

            // ngraph layout might or might not be settled immediately
            assert.isBoolean(layoutManager.isSettled);
        });

        it("should report as settled when no layout engine", () => {
            // Get styles from current test graph
            const currentStyles = graph.styles;

            // Create a fresh layout manager without a graph (to avoid default layout)
            const eventManager = new EventManager();
            const dataManager = new DataManager(eventManager, currentStyles);
            const freshLayoutManager = new LayoutManager(eventManager, dataManager, currentStyles);

            // Should be settled when no layout engine is set
            assert.isTrue(freshLayoutManager.isSettled);

            // Cleanup
            freshLayoutManager.dispose();
        });

        it("a layout stopped before it converged is paused, not settled, and emits no graph-settled", async () => {
            graph.getDataManager().addNodes([{ id: "a" }, { id: "b" }] as Record<string, unknown>[]);
            await layoutManager.setLayout("ngraph", {});
            const engine = layoutManager.layoutEngine;
            assert.isDefined(engine);
            // Still arranging: the engine has not converged.
            Object.defineProperty(engine, "isSettled", { get: () => false });

            let settledEvents = 0;
            graph.getEventManager().addListener("graph-settled", () => {
                settledEvents += 1;
            });

            graph.setRunning(false);
            graph.update();

            assert.isFalse(layoutManager.isSettled, "a stop is not convergence");
            assert.isTrue(layoutManager.isPaused, "the stop is readable as its own state");
            assert.isTrue(layoutManager.getStats().isPaused);
            assert.isFalse(layoutManager.getStats().isSettled);
            assert.strictEqual(settledEvents, 0, "graph-settled is not emitted for a stop");
        });

        it("a converged layout is settled and not paused", async () => {
            graph.getDataManager().addNodes([{ id: "a" }] as Record<string, unknown>[]);
            await layoutManager.setLayout("circular", {});
            layoutManager.running = false;

            assert.isTrue(layoutManager.isSettled);
            assert.isFalse(layoutManager.isPaused);
        });
    });

    describe("consumer pause", () => {
        it("holds through every internal restart until the consumer resumes", async () => {
            const dataManager = graph.getDataManager();
            dataManager.addNodes([{ id: "a" }, { id: "b" }] as Record<string, unknown>[]);
            await layoutManager.setLayout("ngraph", {});

            graph.setRunning(false);
            assert.isFalse(graph.isRunning());

            // What the element's own paths write: data arriving, a drag, a new layout.
            layoutManager.running = true;
            assert.isFalse(graph.isRunning(), "an internal restart does not undo the pause");

            dataManager.addNodes([{ id: "late" }] as Record<string, unknown>[]);
            await layoutManager.updatePositions([dataManager.getNode("late")!]);
            assert.isFalse(graph.isRunning(), "new data does not resume a paused layout");
            const late = layoutManager.getNodePosition(dataManager.getNode("late")!);
            assert.isDefined(late, "but the new node is placed");

            await layoutManager.setLayout("circular", {});
            assert.isFalse(graph.isRunning(), "neither does setting another layout");

            graph.setRunning(true);
            assert.isTrue(graph.isRunning(), "the consumer's resume runs it again");
        });
    });

    describe("catalogue ids", () => {
        it("setLayout accepts every id catalog.layouts() publishes, and engine names still work", async () => {
            graph.getDataManager().addNodes([{ id: "a" }, { id: "b" }] as Record<string, unknown>[]);
            graph.getDataManager().addEdges([{ src: "a", dst: "b" }] as Record<string, unknown>[]);
            // The options each layout requires; everything else runs on its defaults.
            const required: Record<string, object> = {
                hierarchical: { start: "a" },
                bipartite: { nodes: ["a"] },
                layers: { subsetKey: { first: ["a"], second: ["b"] } },
            };

            for (const { id, engine } of LAYOUT_DESCRIPTORS) {
                await layoutManager.setLayout(id, required[id] ?? {});
                assert.strictEqual(layoutManager.layoutType, engine, `"${id}" runs its default engine`);
            }

            await layoutManager.setLayout("ngraph", {});
            assert.strictEqual(layoutManager.layoutType, "ngraph");
        });
    });

    describe("2D layout dimension support", () => {
        it("should use 2D mode for NGraphEngine when twoD is set in styles", async () => {
            // Configure 2D mode in styles (testing deprecated API for backward compatibility)
             
            graph.styles.config.graph.twoD = true;

            // Add some nodes
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
                { id: "node3", label: "Node 3" },
            ] as Record<string, unknown>[]);
            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
            ] as Record<string, unknown>[]);

            // Set ngraph layout which should respect 2D configuration
            await layoutManager.setLayout("ngraph", {});

            // Run some steps to let layout settle
            for (let i = 0; i < 100; i++) {
                layoutManager.step();
            }

            // Get positions for all nodes
            const nodes = Array.from(layoutManager.nodes);
            const positions = nodes.map((node) => layoutManager.getNodePosition(node));

            // Verify all nodes have positions with z=0 in 2D mode
            positions.forEach((pos, i) => {
                assert.isDefined(pos, `Node ${i} should have a position`);
                 
                if (pos) {
                    assert.equal(pos[2], 0, `Node ${i} Z coordinate should be 0 in 2D mode`);
                }
            });
        });

        it("should use 3D mode for NGraphEngine when twoD is not set", async () => {
            // Ensure 3D mode (testing deprecated API for backward compatibility)
             
            graph.styles.config.graph.twoD = false;

            // Add some nodes
            const dataManager = graph.getDataManager();
            dataManager.addNodes([
                { id: "node1", label: "Node 1" },
                { id: "node2", label: "Node 2" },
                { id: "node3", label: "Node 3" },
            ] as Record<string, unknown>[]);
            dataManager.addEdges([
                { id: "edge1", src: "node1", dst: "node2" },
                { id: "edge2", src: "node2", dst: "node3" },
            ] as Record<string, unknown>[]);

            // Set ngraph layout in 3D mode
            await layoutManager.setLayout("ngraph", { seed: 12345 });

            // Run some steps to let layout settle
            for (let i = 0; i < 100; i++) {
                layoutManager.step();
            }

            // Get positions for all nodes
            const nodes = Array.from(layoutManager.nodes);
            const positions = nodes.map((node) => layoutManager.getNodePosition(node));

            // In 3D mode, at least one node should have a non-zero z coordinate
            const hasNonZeroZ = positions.some((pos) => pos && Math.abs(pos[2]) > 0.001);
            assert.isTrue(hasNonZeroZ, "In 3D mode, nodes should have non-zero Z coordinates");
        });
    });
});
