/**
 * Edge Performance Tests
 *
 * Uses StatsManager profiling to measure render time and identify bottlenecks:
 * - Edge counts: 10, 100, 1000, 10000
 * - Layout types: fixed (static), ngraph (physics-based)
 * - Line styles: solid, dot, dash, diamond, sinewave, zigzag
 * - Arrowhead types: none, normal, sphere-dot, diamond, tee, open-normal
 *
 * Leverages existing instrumentation:
 * - StatsManager.measure() for CPU timing
 * - StatsManager.getSnapshot() for comprehensive metrics
 * - StatsManager.getBlockingReport() for bottleneck identification
 * - BabylonJS EngineInstrumentation for GPU metrics
 * - BabylonJS SceneInstrumentation for scene metrics
 *
 * The timings are logged, never asserted: a stopwatch on a busy machine measures the machine.
 * What each test asserts is counted: every edge is in the graph and drawn in the style its
 * style layer asked for -- the line pattern, and one cap of one shape at each end that has one.
 */

import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { Graph } from "../../src/Graph";
import {
    BASELINES,
    extractMetricsFromSnapshot,
    generateEdges,
    generateNodes,
    getHeapUsed,
    identifyBottlenecks,
    type PerformanceMetrics,
    TEST_CONFIG,
    waitForLayoutSettle,
} from "../helpers/performance-utils";
import { cleanupTestGraph, createTestGraph, styleEveryEdge } from "../helpers/testSetup";

/** What the graph drew for a measurement, counted off its edges. */
interface DrawnEdges {
    /** Edges in the data manager. */
    edges: number;
    /** Edges drawn as a patterned line (dots, dashes, diamonds, ...). */
    patterned: number;
    /** Edges drawn with a head cap, and with a tail cap. */
    heads: number;
    tails: number;
    /** The distinct cap shapes drawn at the heads, and at the tails. */
    headShapes: string[];
    tailShapes: string[];
}

type Measurement = PerformanceMetrics & { arrowTailType?: string; drawn: DrawnEdges };

/**
 * Count what the graph drew for its edges.
 * @param graph - The loaded graph
 * @returns The counts
 */
function countDrawn(graph: Graph): DrawnEdges {
    const edges = [...graph.getDataManager().edges.values()];
    const capsAt = (end: string): string[][] =>
        edges.map((edge) => edge.drawnCaps.filter((cap) => cap.end === end).map((cap) => cap.name));
    const heads = capsAt("arrowHead");
    const tails = capsAt("arrowTail");

    return {
        edges: edges.length,
        // pattern elements, or a joined line whose shader draws its pattern (issue #7404)
        patterned: edges.filter(
            (edge) =>
                edge.drawnPattern.length > 0 ||
                (
                    (edge as unknown as { lineBatch: { mesh: { metadata: unknown } } | null }).lineBatch?.mesh
                        .metadata as {
                        pattern?: unknown;
                    } | null
                )?.pattern !== undefined,
        ).length,
        heads: heads.filter((caps) => caps.length === 1).length,
        tails: tails.filter((caps) => caps.length === 1).length,
        headShapes: [...new Set(heads.flat())],
        tailShapes: [...new Set(tails.flat())],
    };
}

/**
 * Assert that every edge was built and drawn in the style the measurement asked for: the line
 * pattern, and one cap of one shape at each end that asked for one.
 * @param result - The measurement
 */
function assertDrawnAsStyled(result: Measurement): void {
    const { drawn, edgeCount } = result;
    assert.strictEqual(drawn.edges, edgeCount, "every edge is in the graph");
    assert.strictEqual(drawn.patterned, result.lineStyle === "solid" ? 0 : edgeCount, `${result.lineStyle} lines`);
    const heads = result.arrowType === "none" ? 0 : edgeCount;
    assert.strictEqual(drawn.heads, heads, `${result.arrowType} heads`);
    assert.lengthOf(drawn.headShapes, heads > 0 ? 1 : 0, "every head is one shape");
    const tails = result.arrowTailType ? edgeCount : 0;
    assert.strictEqual(drawn.tails, tails, `${result.arrowTailType ?? "no"} tails`);
    assert.lengthOf(drawn.tailShapes, tails > 0 ? 1 : 0, "every tail is one shape");
}

describe("Edge Performance Tests", () => {
    let graph: Graph | null = null;
    let metrics: PerformanceMetrics[] = [];

    beforeEach(() => {
        metrics = [];
    });

    afterEach(() => {
        // Log metrics for analysis
        if (metrics.length > 0) {
            console.table(
                metrics.map((m) => ({
                    Edges: m.edgeCount,
                    Layout: m.layoutType,
                    Line: m.lineStyle,
                    Arrow: m.arrowType,
                    FPS: m.fps.toFixed(1),
                    "Draw Calls": m.drawCallsCount,
                    "Memory (KB)": Math.round(m.memoryDelta / 1024),
                })),
            );
        }

        if (graph) {
            cleanupTestGraph(graph);
            graph = null;
        }
    });

    /**
     * Measures edge performance for a given configuration
     */
    async function measureEdgePerformance(options: {
        edgeCount: number;
        layoutType: string;
        lineStyle: string;
        arrowType: string;
        arrowTailType?: string;
    }): Promise<Measurement> {
        const { edgeCount, layoutType, lineStyle, arrowType, arrowTailType } = options;

        // Capture memory before
        const heapUsedBefore = getHeapUsed();

        // Create graph, after disposing the one an earlier measurement in this test made
        if (graph) {
            cleanupTestGraph(graph);
        }

        graph = await createTestGraph();

        // Generate test data
        const nodeCount = Math.ceil(Math.sqrt(edgeCount * 2));
        const nodes = generateNodes(nodeCount, layoutType === "fixed");
        const edges = generateEdges(nodes, edgeCount);

        // Style every edge through a style layer: fields on an edge's data are data, not style
        await styleEveryEdge(graph, {
            "edge.style": lineStyle,
            "edge.width": 0.5,
            "edge.color": "#FFFFFF",
            "edge.arrowHead": arrowType,
            "edge.arrowHeadColor": "#FF0000",
            ...(arrowTailType ? { "edge.arrowTail": arrowTailType, "edge.arrowTailColor": "#00FF00" } : {}),
        });

        // Get StatsManager
        const statsManager = graph.getStatsManager();

        // Enable profiling
        statsManager.enableProfiling();
        statsManager.enableFrameProfiling();

        // Start layout session tracking
        statsManager.startLayoutSession();

        await graph.setLayout(layoutType);
        graph.setData({
            nodes: nodes.map((n) => ({
                id: n.id,
                position: n.x !== undefined ? { x: n.x, y: n.y ?? 0, z: n.z ?? 0 } : undefined,
            })),
            edges: edges.map((e, i) => ({ id: `edge-${i}`, source: e.source, target: e.target })),
        });

        // Wait until every edge is built and drawn (a physics layout also settles first)
        await waitForLayoutSettle(graph);

        // End layout session
        statsManager.endLayoutSession();

        // Get comprehensive snapshot from StatsManager
        const snapshot = statsManager.getSnapshot();
        const blockingReport = statsManager.getBlockingReport();

        // Capture memory after
        const heapUsedAfter = getHeapUsed();
        const memoryDelta = heapUsedAfter - heapUsedBefore;

        // Extract metrics from snapshot
        const result = extractMetricsFromSnapshot(
            snapshot,
            blockingReport,
            { edgeCount, layoutType, lineStyle, arrowType },
            { heapUsedBefore, heapUsedAfter, memoryDelta },
        );

        // Cleanup profiling
        statsManager.disableProfiling();
        statsManager.disableFrameProfiling();

        return { ...result, arrowTailType, drawn: countDrawn(graph) };
    }

    // =========================================================
    // SECTION 1: Edge Count Scaling Tests (baseline: solid line, no arrows)
    // =========================================================
    describe("Edge Count Scaling", () => {
        describe("Static Layout (Fixed Positions)", () => {
            // Test smallest edge count as a quick sanity check
            test("10 edges with fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: 10,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);

                assertDrawnAsStyled(result);
            });

            test("100 edges with fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: 100,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);

                assertDrawnAsStyled(result);
            });
        });

        describe("Physics Layout (NGraph Force-Directed)", () => {
            test("10 edges with ngraph physics", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: 10,
                    layoutType: "ngraph",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);

                assertDrawnAsStyled(result);
            });
        });
    });

    // =========================================================
    // SECTION 2: Line Style Performance (compare renderers)
    // =========================================================
    describe("Line Style Performance", () => {
        const BENCHMARK_EDGE_COUNT = 100; // Reduced for faster tests

        describe("Solid Line (CustomLineRenderer)", () => {
            test("solid line with fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);
                assertDrawnAsStyled(result);
            });
        });

        describe("Patterned Lines (PatternedLineRenderer - Instanced Meshes)", () => {
            const patterns = ["dot", "dash", "diamond"];

            patterns.forEach((pattern) => {
                test(`${pattern} pattern with fixed layout`, async () => {
                    const result = await measureEdgePerformance({
                        edgeCount: BENCHMARK_EDGE_COUNT,
                        layoutType: "fixed",
                        lineStyle: pattern,
                        arrowType: "none",
                    });

                    metrics.push(result);
                    assertDrawnAsStyled(result);
                });
            });
        });

        describe("Line Style Comparison", () => {
            test("compare solid vs patterned at 100 edges", async () => {
                const solidResult = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                const patternedResult = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "diamond",
                    arrowType: "none",
                });

                metrics.push(solidResult, patternedResult);

                assertDrawnAsStyled(solidResult);
                assertDrawnAsStyled(patternedResult);
            });
        });
    });

    // =========================================================
    // SECTION 3: Arrowhead Performance (compare arrow types)
    // =========================================================
    describe("Arrowhead Performance", () => {
        const BENCHMARK_EDGE_COUNT = 100;

        describe("No Arrows (Baseline)", () => {
            test("no arrows with fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);
                assertDrawnAsStyled(result);
            });
        });

        describe("Filled Arrows (FilledArrowRenderer)", () => {
            const filledArrows = ["normal", "diamond"];

            filledArrows.forEach((arrowType) => {
                test(`${arrowType} filled arrow with fixed layout`, async () => {
                    const result = await measureEdgePerformance({
                        edgeCount: BENCHMARK_EDGE_COUNT,
                        layoutType: "fixed",
                        lineStyle: "solid",
                        arrowType,
                    });

                    metrics.push(result);
                    assertDrawnAsStyled(result);
                });
            });
        });

        describe("Outline Arrows (CustomLineRenderer Path)", () => {
            const outlineArrows = ["tee", "open-normal"];

            outlineArrows.forEach((arrowType) => {
                test(`${arrowType} outline arrow with fixed layout`, async () => {
                    const result = await measureEdgePerformance({
                        edgeCount: BENCHMARK_EDGE_COUNT,
                        layoutType: "fixed",
                        lineStyle: "solid",
                        arrowType,
                    });

                    metrics.push(result);
                    assertDrawnAsStyled(result);
                });
            });
        });

        describe("Arrowhead Type Comparison", () => {
            test("compare no arrow vs normal arrow at 100 edges", async () => {
                const noArrowResult = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                const withArrowResult = await measureEdgePerformance({
                    edgeCount: BENCHMARK_EDGE_COUNT,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "normal",
                });

                metrics.push(noArrowResult, withArrowResult);

                assertDrawnAsStyled(noArrowResult);
                assertDrawnAsStyled(withArrowResult);
            });
        });
    });

    // =========================================================
    // SECTION 4: Bidirectional Arrows
    // =========================================================
    describe("Bidirectional Arrow Performance", () => {
        const BENCHMARK_EDGE_COUNT = 50;

        test("bidirectional normal arrows with fixed layout", async () => {
            const result = await measureEdgePerformance({
                edgeCount: BENCHMARK_EDGE_COUNT,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "normal",
                arrowTailType: "normal",
            });

            metrics.push(result);
            assertDrawnAsStyled(result);
        });

        test("mixed arrow types (normal head, tee tail)", async () => {
            const result = await measureEdgePerformance({
                edgeCount: BENCHMARK_EDGE_COUNT,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "normal",
                arrowTailType: "tee",
            });

            metrics.push(result);
            assertDrawnAsStyled(result);
            assert.notDeepEqual(
                result.drawn.tailShapes,
                result.drawn.headShapes,
                "the tee tail is not the head's shape",
            );
        });
    });

    // =========================================================
    // SECTION 5: Combined Configurations (realistic scenarios)
    // =========================================================
    describe("Combined Configuration Performance", () => {
        describe("Realistic Graph Configurations", () => {
            test("50 edges: solid line + normal arrows + fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: 50,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "normal",
                });

                metrics.push(result);
                assertDrawnAsStyled(result);
            });

            test("100 edges: dash line + diamond arrows + fixed layout", async () => {
                const result = await measureEdgePerformance({
                    edgeCount: 100,
                    layoutType: "fixed",
                    lineStyle: "dash",
                    arrowType: "diamond",
                });

                metrics.push(result);
                assertDrawnAsStyled(result);
            });
        });
    });

    // =========================================================
    // SECTION 6: Memory Usage Tests
    // =========================================================
    describe("Memory Usage", () => {
        const EDGE_COUNTS = [50, 100];

        EDGE_COUNTS.forEach((edgeCount) => {
            test(`memory usage for ${edgeCount} edges (solid, no arrows)`, async () => {
                const result = await measureEdgePerformance({
                    edgeCount,
                    layoutType: "fixed",
                    lineStyle: "solid",
                    arrowType: "none",
                });

                metrics.push(result);

                assertDrawnAsStyled(result);
            });
        });

        test("memory comparison: solid vs patterned lines", async () => {
            const solidResult = await measureEdgePerformance({
                edgeCount: 100,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "none",
            });

            const patternedResult = await measureEdgePerformance({
                edgeCount: 100,
                layoutType: "fixed",
                lineStyle: "diamond",
                arrowType: "none",
            });

            metrics.push(solidResult, patternedResult);

            assertDrawnAsStyled(solidResult);
            assertDrawnAsStyled(patternedResult);
        });
    });

    // =========================================================
    // SECTION 7: Bottleneck Detection Tests
    // =========================================================
    describe("Bottleneck Detection", () => {
        test("identifies bottlenecks from metrics", async () => {
            const result = await measureEdgePerformance({
                edgeCount: 100,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "normal",
            });

            assertDrawnAsStyled(result);
            const report = identifyBottlenecks(result);

            // Validate report structure
            assert.isArray(report.bottlenecks);
            assert.isString(report.overallHealth);
            assert.isString(report.summary);

            // Health should be one of the valid values
            assert.oneOf(report.overallHealth, ["good", "fair", "poor"]);
        });

        test("bottleneck report includes summary", async () => {
            const result = await measureEdgePerformance({
                edgeCount: 50,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "none",
            });

            assertDrawnAsStyled(result);
            const report = identifyBottlenecks(result);

            // Summary should contain edge count
            assert.include(report.summary, "50 edges");
        });
    });
});

// =========================================================
// SECTION 9: Standalone Performance Utilities Tests
// =========================================================
describe("Performance Utilities", () => {
    describe("generateNodes", () => {
        test("generates correct number of grid nodes", () => {
            const nodes = generateNodes(16, true);
            assert.strictEqual(nodes.length, 16);
            // Grid nodes should have positions
            assert.isDefined(nodes[0].x);
            assert.isDefined(nodes[0].y);
        });

        test("generates correct number of random nodes", () => {
            const nodes = generateNodes(10, false);
            assert.strictEqual(nodes.length, 10);
            // Random nodes may not have positions (let layout engine place them)
            assert.isString(nodes[0].id);
        });
    });

    describe("generateEdges", () => {
        test("generates correct number of edges", () => {
            const nodes = generateNodes(10, true);
            const edges = generateEdges(nodes, 15);
            assert.strictEqual(edges.length, 15);
        });

        test("generates valid edge connections", () => {
            const nodes = generateNodes(5, true);
            const edges = generateEdges(nodes, 10);

            edges.forEach((edge) => {
                assert.isString(edge.source);
                assert.isString(edge.target);
                // Source and target should be different (no self-loops)
                assert.notStrictEqual(edge.source, edge.target);
            });
        });
    });

    describe("identifyBottlenecks", () => {
        test("returns valid report structure", () => {
            // Create minimal mock metrics
            const mockMetrics: PerformanceMetrics = {
                edgeCount: 100,
                layoutType: "fixed",
                lineStyle: "solid",
                arrowType: "none",
                edgeCreationTime: 10,
                edgeUpdateTime: 5,
                arrowCapUpdateTime: 0,
                intersectCalcTime: 0,
                graphStepTime: 0,
                edgeUpdateP95: 1,
                edgeUpdateP99: 2,
                frameTimeAvg: 16.67,
                frameTimeP95: 0,
                renderTimeAvg: 10,
                interFrameTimeAvg: 16.67,
                drawCallsCount: 100,
                activeMeshesEvalTime: 1,
                gpuFrameTimeAvg: 5,
                shaderCompilationTime: 50,
                layoutTotalTime: 100,
                layoutCpuPercent: 60,
                layoutGpuPercent: 30,
                layoutBlockingPercent: 10,
                layoutFrameCount: 10,
                fps: 60,
                edgesPerSecond: 10000,
                heapUsedBefore: 0,
                heapUsedAfter: 0,
                memoryDelta: 0,
                topBlockingOperations: [],
            };

            const report = identifyBottlenecks(mockMetrics);

            assert.isArray(report.bottlenecks);
            assert.isString(report.overallHealth);
            assert.isString(report.summary);
        });

        test("identifies CPU-bound layout", () => {
            const mockMetrics: PerformanceMetrics = {
                edgeCount: 100,
                layoutType: "ngraph",
                lineStyle: "solid",
                arrowType: "none",
                edgeCreationTime: 10,
                edgeUpdateTime: 5,
                arrowCapUpdateTime: 0,
                intersectCalcTime: 0,
                graphStepTime: 0,
                edgeUpdateP95: 1,
                edgeUpdateP99: 2,
                frameTimeAvg: 16.67,
                frameTimeP95: 0,
                renderTimeAvg: 10,
                interFrameTimeAvg: 16.67,
                drawCallsCount: 100,
                activeMeshesEvalTime: 1,
                gpuFrameTimeAvg: 5,
                shaderCompilationTime: 50,
                layoutTotalTime: 100,
                layoutCpuPercent: 85, // High CPU
                layoutGpuPercent: 10,
                layoutBlockingPercent: 5,
                layoutFrameCount: 10,
                fps: 60,
                edgesPerSecond: 10000,
                heapUsedBefore: 0,
                heapUsedAfter: 0,
                memoryDelta: 0,
                topBlockingOperations: [],
            };

            const report = identifyBottlenecks(mockMetrics);

            // Should identify CPU-bound bottleneck
            const cpuBottleneck = report.bottlenecks.find((b) => b.type === "cpu-bound");
            assert.isDefined(cpuBottleneck);
            assert.strictEqual(cpuBottleneck.severity, "high");
        });

        test("identifies high draw calls", () => {
            const mockMetrics: PerformanceMetrics = {
                edgeCount: 1000,
                layoutType: "fixed",
                lineStyle: "diamond",
                arrowType: "none",
                edgeCreationTime: 10,
                edgeUpdateTime: 5,
                arrowCapUpdateTime: 0,
                intersectCalcTime: 0,
                graphStepTime: 0,
                edgeUpdateP95: 1,
                edgeUpdateP99: 2,
                frameTimeAvg: 16.67,
                frameTimeP95: 0,
                renderTimeAvg: 10,
                interFrameTimeAvg: 16.67,
                drawCallsCount: 1500, // High draw calls
                activeMeshesEvalTime: 1,
                gpuFrameTimeAvg: 5,
                shaderCompilationTime: 50,
                layoutTotalTime: 100,
                layoutCpuPercent: 50,
                layoutGpuPercent: 40,
                layoutBlockingPercent: 10,
                layoutFrameCount: 10,
                fps: 60,
                edgesPerSecond: 10000,
                heapUsedBefore: 0,
                heapUsedAfter: 0,
                memoryDelta: 0,
                topBlockingOperations: [],
            };

            const report = identifyBottlenecks(mockMetrics);

            // Should identify draw calls bottleneck
            const drawCallsBottleneck = report.bottlenecks.find((b) => b.type === "draw-calls");
            assert.isDefined(drawCallsBottleneck);
            assert.strictEqual(drawCallsBottleneck.severity, "high");
        });
    });

    describe("TEST_CONFIG", () => {
        test("has valid edge counts", () => {
            assert.isArray(TEST_CONFIG.EDGE_COUNTS);
            assert.isAbove(TEST_CONFIG.EDGE_COUNTS.length, 0);
            TEST_CONFIG.EDGE_COUNTS.forEach((count) => {
                assert.isNumber(count);
                assert.isAbove(count, 0);
            });
        });

        test("has valid layout types", () => {
            assert.isArray(TEST_CONFIG.LAYOUT_TYPES);
            assert.isAbove(TEST_CONFIG.LAYOUT_TYPES.length, 0);
            TEST_CONFIG.LAYOUT_TYPES.forEach((layout) => {
                assert.isString(layout.name);
                assert.isString(layout.type);
                assert.isBoolean(layout.isPhysics);
            });
        });

        test("has valid line styles", () => {
            assert.isArray(TEST_CONFIG.LINE_STYLES);
            assert.isAbove(TEST_CONFIG.LINE_STYLES.length, 0);
            TEST_CONFIG.LINE_STYLES.forEach((style) => {
                assert.isString(style.name);
                assert.isString(style.type);
            });
        });

        test("has valid arrow types", () => {
            assert.isArray(TEST_CONFIG.ARROW_TYPES);
            assert.isAbove(TEST_CONFIG.ARROW_TYPES.length, 0);
            TEST_CONFIG.ARROW_TYPES.forEach((arrow) => {
                assert.isString(arrow.name);
                assert.isString(arrow.type);
            });
        });
    });

    describe("BASELINES", () => {
        test("has valid baseline entries", () => {
            assert.isObject(BASELINES);
            Object.entries(BASELINES).forEach(([key, value]) => {
                assert.isString(key);
                assert.isNumber(value.fps);
                assert.isNumber(value.creationTime);
                assert.isAbove(value.fps, 0);
                assert.isAbove(value.creationTime, 0);
            });
        });
    });
});
