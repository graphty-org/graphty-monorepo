/**
 * Edge Performance Report Generator
 *
 * Comprehensive benchmark testing edge rendering performance across:
 * - Edge counts: 500 to 2000
 * - Line styles: solid, dash, dot, star, diamond
 * - Arrow types: none, normal, crow, open-diamond, open-dot
 * - Modes: 2D and 3D
 * - Scenarios: camera rotation and zoom
 *
 * Prints a markdown report to the console when the run ends. Run it with:
 * npx vitest run --project=browser-bench test/browser/edge-performance-report.bench.test.ts
 *
 * A REPORT, NOT A GATE ON TIME. Frame rates, frame times, jank and load times are measured and
 * printed, and never asserted: a stopwatch on a busy machine measures the machine. What each test
 * asserts is counted: the graph is in the view mode the scenario asked for, the scenario drew
 * exactly the frames it steps through, the camera moved once per drawn frame, and the load built
 * every edge it was handed.
 */

import { afterAll, afterEach, assert, describe, test } from "vitest";

import type { CameraState } from "../../src/camera/types";
import type { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph, styleEveryEdge } from "../helpers/testSetup";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Frames drawn per scenario: as many as a 60fps display shows in half a second
    // Significantly reduced to prevent p-queue stack overflow in vitest browser mode
    FRAMES_PER_SCENARIO: 31,

    // Edge counts to test
    // Minimized to work within vitest browser mode limits
    EDGE_COUNTS: {
        PHASE1: [500, 1000],
        PHASE2: [500],
        PHASE3: [500],
        PHASE4: [1000],
        // Each doubles the last, so a linear load shows a ratio of 2 between neighbours
        LOAD_SCALING: [500, 1000, 2000],
    },

    // Line styles to test (baseline to most complex)
    LINE_STYLES: ["solid", "dash", "dot", "star", "diamond"] as const,

    // Arrow types to test (baseline to most complex)
    ARROW_TYPES: ["none", "normal", "crow", "open-diamond", "open-dot"] as const,

    // Target FPS threshold
    TARGET_FPS: 30,
    JANK_THRESHOLD_MS: 33, // Below 30fps

    // Node count calculation: edgeCount / EDGE_TO_NODE_RATIO
    EDGE_TO_NODE_RATIO: 50,

    // Loads of each size in the load scaling phase; the report takes their median
    LOAD_SCALING_ROUNDS: 3,
};

/** Arrow types the load scaling phase compares: one mesh per edge, and one more per arrowhead. */
const LOAD_SCALING_ARROWS = ["none", "normal"] as const;

// ============================================================================
// TYPES
// ============================================================================

interface TestConfig {
    edgeCount: number;
    lineStyle: string;
    arrowType: string;
    mode: "2d" | "3d";
    scenario: "rotation" | "zoom";
}

interface TestResult {
    config: TestConfig;
    avgFps: number;
    minFps: number;
    maxFps: number;
    p95FrameTimeMs: number;
    jankFrameCount: number;
    jankPercent: number;
    /** Frames the scenario stepped the camera through, one per drawn frame. */
    totalFrames: number;
    /** Frames the scene drew while the scenario ran, counted by the scene itself. */
    framesDrawn: number;
    /** Steps after which the camera's state differed from the step before. */
    cameraMoves: number;
    /** The view mode the graph was in while the scenario ran. */
    viewMode: string;
    drawCalls: number;
    passesTarget: boolean;
}

interface PhaseResults {
    phase: string;
    results: TestResult[];
}

// ============================================================================
// GLOBALS
// ============================================================================

const allResults: PhaseResults[] = [];
let currentGraph: Graph | null = null;

/** Time from `setData` to the first finished frame, per edge count and arrow type. */
const loadResults: { edgeCount: number; arrowType: string; loadMs: number }[] = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateGridNodes(nodeCount: number, mode: "2d" | "3d"): { id: string; x: number; y: number; z: number }[] {
    const nodes: { id: string; x: number; y: number; z: number }[] = [];
    const gridSize = Math.ceil(Math.sqrt(nodeCount));
    const spacing = 10;

    for (let i = 0; i < nodeCount; i++) {
        const x = (i % gridSize) * spacing - (gridSize * spacing) / 2;
        const y = Math.floor(i / gridSize) * spacing - (gridSize * spacing) / 2;
        const z = mode === "3d" ? (Math.random() - 0.5) * spacing * 2 : 0;
        nodes.push({ id: `node-${i}`, x, y, z });
    }

    return nodes;
}

function generateRandomEdges(nodes: { id: string }[], edgeCount: number): { source: string; target: string }[] {
    const edges: { source: string; target: string }[] = [];
    const nodeCount = nodes.length;

    // Ensure connected graph with spanning tree first
    for (let i = 1; i < nodeCount && edges.length < edgeCount; i++) {
        const sourceIdx = Math.floor(Math.random() * i);
        edges.push({ source: nodes[sourceIdx].id, target: nodes[i].id });
    }

    // Fill remaining with random edges
    while (edges.length < edgeCount && nodeCount > 1) {
        const srcIdx = Math.floor(Math.random() * nodeCount);
        let dstIdx = Math.floor(Math.random() * nodeCount);
        if (srcIdx === dstIdx) {
            dstIdx = (dstIdx + 1) % nodeCount;
        }

        edges.push({ source: nodes[srcIdx].id, target: nodes[dstIdx].id });
    }

    return edges;
}

function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Resolve once the graph's scene has drawn its next frame.
 *
 * The benchmark is paced on FRAMES, not on a timer. The render loop draws on every animation
 * frame, and a frame of 1000 edges on a software rasteriser keeps the main thread busy from one
 * frame to the next; Chrome runs rendering ahead of timer tasks, so a `setTimeout(16)` there
 * waited through many frames instead of one. Paced on a timer, the 31 steps of one scenario took
 * about six seconds locally and past fifteen on a slower CI runner, and what was recorded as a
 * "frame time" was the timer's delay. One step per drawn frame costs 31 frames and measures them.
 * @param graph - The graph whose scene is rendering.
 * @returns A promise that resolves after the next render.
 */
async function nextRenderedFrame(graph: Graph): Promise<void> {
    return new Promise((resolve) => {
        graph.scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
}

// ============================================================================
// CAMERA ANIMATION
// ============================================================================

/**
 * Step the camera once per drawn frame, through a whole scenario, and time each frame.
 *
 * The camera is moved by frame, not by elapsed time, so every run draws the same frames from the
 * same camera positions however fast the machine is; only the recorded frame times differ.
 * @param graph - The graph whose scene is rendering.
 * @param place - The camera state at a fraction of the scenario, 0 to 1.
 * @returns How long each drawn frame took, one entry per frame, and how many steps moved the camera.
 */
async function animate(
    graph: Graph,
    place: (progress: number) => CameraState,
): Promise<{ frameTimes: number[]; cameraMoves: number }> {
    const frameTimes: number[] = [];
    const frameCount = CONFIG.FRAMES_PER_SCENARIO;
    let lastFrameTime = performance.now();
    let lastState = JSON.stringify(graph.getCameraState());
    let cameraMoves = 0;

    for (let i = 0; i < frameCount; i++) {
        await nextRenderedFrame(graph);

        const now = performance.now();
        frameTimes.push(now - lastFrameTime);
        lastFrameTime = now;

        await graph.setCameraState(place((i + 1) / frameCount));
        const state = JSON.stringify(graph.getCameraState());
        if (state !== lastState) {
            cameraMoves++;
        }

        lastState = state;
    }

    return { frameTimes, cameraMoves };
}

/**
 * Turn the view one full turn: about the graph in 3D, and the drawing on screen in 2D.
 * @param graph - The loaded graph.
 * @returns The frame times and camera moves.
 */
async function animateRotation(graph: Graph): Promise<{ frameTimes: number[]; cameraMoves: number }> {
    const start = graph.getCameraState();
    const turn = (progress: number): number => progress * Math.PI * 2;

    if (graph.getViewMode() === "2d") {
        const rotation = start.rotation ?? 0;
        return animate(graph, (progress) => ({ rotation: rotation + turn(progress) }));
    }

    const pivot = start.pivotRotation ?? { x: 0, y: 0, z: 0 };
    return animate(graph, (progress) => ({
        target: start.target,
        cameraDistance: start.cameraDistance,
        pivotRotation: { ...pivot, y: pivot.y + turn(progress) },
    }));
}

/**
 * Zoom out to 1.75x and in to 0.25x the starting distance, and back.
 * @param graph - The loaded graph.
 * @returns The frame times and camera moves.
 */
async function animateZoom(graph: Graph): Promise<{ frameTimes: number[]; cameraMoves: number }> {
    const start = graph.getCameraState();
    const factor = (progress: number): number => 1 + Math.sin(progress * Math.PI * 2) * 0.75;

    if (graph.getViewMode() === "2d") {
        const zoom = start.zoom ?? 1;
        return animate(graph, (progress) => ({ zoom: zoom / factor(progress) }));
    }

    const distance = start.cameraDistance ?? 1;
    return animate(graph, (progress) => ({
        target: start.target,
        pivotRotation: start.pivotRotation,
        cameraDistance: distance * factor(progress),
    }));
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

/**
 * Create a graph, hand it the benchmark's nodes and edges, and wait for its first finished frame.
 * @param config - The edge count, line and arrow styles and mode to load.
 * @returns The loaded graph and the time from `setData` to the first finished frame, in ms.
 */
async function loadGraph(config: TestConfig): Promise<{ graph: Graph; loadMs: number }> {
    // Calculate node count (sparser graph as requested)
    const nodeCount = Math.max(10, Math.ceil(config.edgeCount / CONFIG.EDGE_TO_NODE_RATIO));

    // Create graph
    currentGraph = await createTestGraph();
    const graph = currentGraph;

    // Generate test data
    const nodes = generateGridNodes(nodeCount, config.mode);
    const edges = generateRandomEdges(nodes, config.edgeCount);

    // Style every edge through a style layer: fields on an edge's data are data, not style
    await styleEveryEdge(graph, {
        "edge.style": config.lineStyle,
        "edge.width": 0.5,
        "edge.color": "#FFFFFF",
        "edge.arrowHead": config.arrowType,
        "edge.arrowHeadColor": "#FF0000",
    });
    await graph.setLayout("fixed");
    await graph.setViewMode(config.mode);

    // Add data
    const graphData = {
        nodes: nodes.map((n) => ({
            id: n.id,
            position: { x: n.x, y: n.y, z: n.z },
        })),
        edges: edges.map((e, i) => ({
            id: `edge-${i}`,
            source: e.source,
            target: e.target,
        })),
    };

    const loadStart = performance.now();
    graph.setData(graphData);

    // Warm up until the graph is fully drawn -- every mesh has its shader -- so the measured
    // frames are steady-state ones. A fixed sleep here was a timer too, and was starved the same way.
    await graph.waitForStableFrame();

    return { graph, loadMs: performance.now() - loadStart };
}

async function runBenchmark(config: TestConfig): Promise<TestResult> {
    const { graph } = await loadGraph(config);

    // Get initial draw calls
    const statsManager = graph.getStatsManager();
    const perfSummary = statsManager.getPerformanceSummary();
    const { drawCalls } = perfSummary;

    // Run animation and collect frame times
    // Count the frames the scene draws while the scenario runs, independently of the stepping
    let framesDrawn = 0;
    const drawn = graph.scene.onAfterRenderObservable.add(() => {
        framesDrawn++;
    });
    const viewMode = graph.getViewMode();
    let frameTimes: number[];
    let cameraMoves: number;
    try {
        ({ frameTimes, cameraMoves } =
            config.scenario === "rotation" ? await animateRotation(graph) : await animateZoom(graph));
    } finally {
        graph.scene.onAfterRenderObservable.remove(drawn);
    }

    // Calculate metrics
    // Every drawn frame counts, however slow: dropping frames over a second reported 0 FPS for them
    const validFrameTimes = frameTimes.filter((t) => t > 0);
    const fps = validFrameTimes.map((t) => 1000 / t);

    const avgFps = fps.length > 0 ? fps.reduce((a, b) => a + b, 0) / fps.length : 0;
    const minFps = fps.length > 0 ? Math.min(...fps) : 0;
    const maxFps = fps.length > 0 ? Math.max(...fps) : 0;
    const p95FrameTimeMs = calculatePercentile(validFrameTimes, 95);
    const jankFrameCount = validFrameTimes.filter((t) => t > CONFIG.JANK_THRESHOLD_MS).length;
    const jankPercent = validFrameTimes.length > 0 ? (jankFrameCount / validFrameTimes.length) * 100 : 0;

    // Cleanup
    cleanupTestGraph(graph);
    currentGraph = null;

    return {
        config,
        avgFps,
        minFps,
        maxFps,
        p95FrameTimeMs,
        jankFrameCount,
        jankPercent,
        totalFrames: frameTimes.length,
        framesDrawn,
        cameraMoves,
        viewMode,
        drawCalls,
        passesTarget: avgFps >= CONFIG.TARGET_FPS && jankPercent < 10,
    };
}

/**
 * Assert, by count, that a scenario drew the frames it measured in the mode it asked for: one
 * camera step per drawn frame, each one moving the camera, with draw calls issued. The frame times
 * themselves go in the report only.
 * @param result - The scenario's result.
 */
function assertDrewEveryFrame(result: TestResult): void {
    assert.strictEqual(result.viewMode, result.config.mode, "the graph is in the scenario's view mode");
    assert.strictEqual(result.totalFrames, CONFIG.FRAMES_PER_SCENARIO, "one camera step per drawn frame");
    assert.strictEqual(result.framesDrawn, CONFIG.FRAMES_PER_SCENARIO, "the scene drew every stepped frame");
    assert.strictEqual(result.cameraMoves, CONFIG.FRAMES_PER_SCENARIO, "every step moved the camera");
    assert.isAbove(result.drawCalls, 0, "the graph issued draw calls");
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(): string {
    const timestamp = new Date().toISOString();

    let report = `# Edge Performance Report

Generated: ${timestamp}

## Test Configuration

- **Target FPS:** ${CONFIG.TARGET_FPS}
- **Jank Threshold:** ${CONFIG.JANK_THRESHOLD_MS}ms (below ${Math.round(1000 / CONFIG.JANK_THRESHOLD_MS)}fps)
- **Frames per scenario:** ${CONFIG.FRAMES_PER_SCENARIO}
- **Node Density:** 1 node per ${CONFIG.EDGE_TO_NODE_RATIO} edges

## Executive Summary

`;

    // Find limits for each configuration
    const phase1 = allResults.find((p) => p.phase === "Phase 1: 3D Rotation");
    if (phase1) {
        const configs = new Map<string, TestResult[]>();
        for (const r of phase1.results) {
            const key = `${r.config.lineStyle}/${r.config.arrowType}`;
            let arr = configs.get(key);
            if (!arr) {
                arr = [];
                configs.set(key, arr);
            }

            arr.push(r);
        }

        report += `### Maximum Edges at ${CONFIG.TARGET_FPS}fps (3D Rotation)\n\n`;
        report += "| Line Style | Arrow Type | Max Edges | Notes |\n";
        report += "|------------|------------|-----------|-------|\n";

        for (const [key, results] of configs) {
            const [lineStyle, arrowType] = key.split("/");
            const passing = results.filter((r) => r.passesTarget);
            const maxEdges =
                passing.length > 0
                    ? Math.max(...passing.map((r) => r.config.edgeCount))
                    : `<${results[0]?.config.edgeCount ?? 0}`;
            const note = passing.length === results.length ? "All tested counts pass" : "";
            report += `| ${lineStyle} | ${arrowType} | ${maxEdges} | ${note} |\n`;
        }
    }

    // Detailed results for each phase
    for (const phase of allResults) {
        report += `\n## ${phase.phase}\n\n`;

        if (phase.results.length === 0) {
            report += "*No results*\n";
            continue;
        }

        report +=
            "| Edges | Line | Arrow | Mode | Scenario | Avg FPS | Min FPS | P95 Frame | Jank % | Draw Calls | Pass |\n";
        report +=
            "|-------|------|-------|------|----------|---------|---------|-----------|--------|------------|------|\n";

        for (const r of phase.results) {
            const pass = r.passesTarget ? "yes" : "no";
            report += `| ${r.config.edgeCount} | ${r.config.lineStyle} | ${r.config.arrowType} | ${r.config.mode} | ${r.config.scenario} | ${r.avgFps.toFixed(1)} | ${r.minFps.toFixed(1)} | ${r.p95FrameTimeMs.toFixed(1)}ms | ${r.jankPercent.toFixed(1)}% | ${r.drawCalls} | ${pass} |\n`;
        }
    }

    // Analysis sections
    report += "\n## Scaling Analysis\n\n";

    if (phase1) {
        // Find baseline config (solid/none)
        const baseline = phase1.results.filter((r) => r.config.lineStyle === "solid" && r.config.arrowType === "none");

        if (baseline.length > 0) {
            report += "### Edge Count Impact (solid/none, 3D rotation)\n\n";
            report += "| Edge Count | Avg FPS | Change |\n";
            report += "|------------|---------|--------|\n";

            let prevFps = baseline[0].avgFps;
            for (const r of baseline) {
                const change = r === baseline[0] ? "-" : `${(((r.avgFps - prevFps) / prevFps) * 100).toFixed(1)}%`;
                report += `| ${r.config.edgeCount} | ${r.avgFps.toFixed(1)} | ${change} |\n`;
                prevFps = r.avgFps;
            }
        }
    }

    // Load time scaling: a ratio near 2 means the load grows linearly with the edge count
    if (loadResults.length > 0) {
        report += `\n### Load Time Scaling (median time to first finished frame of ${CONFIG.LOAD_SCALING_ROUNDS} loads, 3D, solid lines)\n\n`;
        report += `| Arrow | ${CONFIG.EDGE_COUNTS.LOAD_SCALING.map((n) => `${n} edges`).join(" | ")} | Ratios |\n`;
        report += `|-------|${CONFIG.EDGE_COUNTS.LOAD_SCALING.map(() => "------").join("|")}|--------|\n`;

        for (const arrowType of LOAD_SCALING_ARROWS) {
            const times = CONFIG.EDGE_COUNTS.LOAD_SCALING.map((n) => {
                const samples = loadResults.filter((r) => r.edgeCount === n && r.arrowType === arrowType);
                return samples.length > 0
                    ? calculatePercentile(
                          samples.map((r) => r.loadMs),
                          50,
                      )
                    : undefined;
            });
            const ratios = CONFIG.EDGE_COUNTS.LOAD_SCALING.slice(1).map((n, i) => {
                const [prev, cur] = [times[i], times[i + 1]];
                const ratio = prev && cur ? (cur / prev).toFixed(2) : "-";
                return `${n}/${CONFIG.EDGE_COUNTS.LOAD_SCALING[i]}: ${ratio}`;
            });
            report += `| ${arrowType} | ${times.map((t) => (t === undefined ? "-" : `${t.toFixed(0)}ms`)).join(" | ")} | ${ratios.join(", ")} |\n`;
        }
    }

    // Feature cost analysis
    report += "\n## Feature Cost Analysis\n\n";

    if (phase1) {
        const at5000 = phase1.results.filter((r) => r.config.edgeCount === 5000);

        if (at5000.length > 0) {
            const baselineFps =
                at5000.find((r) => r.config.lineStyle === "solid" && r.config.arrowType === "none")?.avgFps ?? 0;

            report += "### At 5000 edges (3D rotation)\n\n";
            report += "| Configuration | Avg FPS | Cost vs Baseline |\n";
            report += "|---------------|---------|------------------|\n";

            for (const r of at5000) {
                const cost = baselineFps > 0 ? `${(((baselineFps - r.avgFps) / baselineFps) * 100).toFixed(1)}%` : "-";
                report += `| ${r.config.lineStyle}/${r.config.arrowType} | ${r.avgFps.toFixed(1)} | ${cost} |\n`;
            }
        }
    }

    // Recommendations
    report += "\n## Recommendations\n\n";
    report += "Based on the benchmark results:\n\n";

    if (phase1) {
        const solidNone = phase1.results.filter(
            (r) => r.config.lineStyle === "solid" && r.config.arrowType === "none" && r.passesTarget,
        );
        const maxSolidNone = solidNone.length > 0 ? Math.max(...solidNone.map((r) => r.config.edgeCount)) : "unknown";

        const diamondCrow = phase1.results.filter(
            (r) => r.config.lineStyle === "diamond" && r.config.arrowType === "crow" && r.passesTarget,
        );
        const maxDiamondCrow =
            diamondCrow.length > 0 ? Math.max(...diamondCrow.map((r) => r.config.edgeCount)) : "unknown";

        report += `1. **For maximum performance (solid lines, no arrows):** Up to ${maxSolidNone} edges at ${CONFIG.TARGET_FPS}fps\n`;
        report += `2. **For complex styling (diamond + crow arrows):** Up to ${maxDiamondCrow} edges at ${CONFIG.TARGET_FPS}fps\n`;
    }

    report += "\n---\n*Report generated by edge-performance-report.bench.test.ts*\n";

    return report;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Edge Performance Report", () => {
    afterEach(async () => {
        if (currentGraph) {
            cleanupTestGraph(currentGraph);
            currentGraph = null;
        }

        // Allow event loop to clear between tests
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    afterAll(() => {
        console.log(`\nEdge Performance Report:\n\n${generateMarkdownReport()}`);
    });

    // ========================================================================
    // PHASE 1: 3D Rotation Limits
    // ========================================================================

    describe("Phase 1: 3D Rotation Limits", () => {
        const phaseResults: TestResult[] = [];

        afterAll(() => {
            allResults.push({ phase: "Phase 1: 3D Rotation", results: phaseResults });
        });

        // Test key configurations
        const keyConfigs = [
            { line: "solid", arrow: "none" }, // Baseline
            { line: "solid", arrow: "normal" }, // + simple arrow
            { line: "diamond", arrow: "none" }, // + pattern
            { line: "diamond", arrow: "crow" }, // Worst case
        ];

        for (const cfg of keyConfigs) {
            for (const edgeCount of CONFIG.EDGE_COUNTS.PHASE1) {
                test(`${edgeCount} edges - ${cfg.line}/${cfg.arrow} - 3D rotation`, async () => {
                    const result = await runBenchmark({
                        edgeCount,
                        lineStyle: cfg.line,
                        arrowType: cfg.arrow,
                        mode: "3d",
                        scenario: "rotation",
                    });

                    phaseResults.push(result);

                    console.log(
                        `[${cfg.line}/${cfg.arrow}] ${edgeCount} edges: ${result.avgFps.toFixed(1)} FPS, ${result.jankPercent.toFixed(1)}% jank`,
                    );

                    assertDrewEveryFrame(result);
                });
            }
        }
    });

    // ========================================================================
    // PHASE 2: Zoom Comparison
    // ========================================================================

    describe("Phase 2: 3D Zoom Comparison", () => {
        const phaseResults: TestResult[] = [];

        afterAll(() => {
            allResults.push({ phase: "Phase 2: 3D Zoom", results: phaseResults });
        });

        const configs = [
            { line: "solid", arrow: "none" },
            { line: "diamond", arrow: "crow" },
        ];

        for (const cfg of configs) {
            for (const edgeCount of CONFIG.EDGE_COUNTS.PHASE2) {
                test(`${edgeCount} edges - ${cfg.line}/${cfg.arrow} - 3D zoom`, async () => {
                    const result = await runBenchmark({
                        edgeCount,
                        lineStyle: cfg.line,
                        arrowType: cfg.arrow,
                        mode: "3d",
                        scenario: "zoom",
                    });

                    phaseResults.push(result);

                    console.log(`[ZOOM ${cfg.line}/${cfg.arrow}] ${edgeCount} edges: ${result.avgFps.toFixed(1)} FPS`);

                    assertDrewEveryFrame(result);
                });
            }
        }
    });

    // ========================================================================
    // PHASE 3: 2D vs 3D Comparison
    // ========================================================================

    describe("Phase 3: 2D Rotation Comparison", () => {
        const phaseResults: TestResult[] = [];

        afterAll(() => {
            allResults.push({ phase: "Phase 3: 2D Rotation", results: phaseResults });
        });

        const configs = [
            { line: "solid", arrow: "none" },
            { line: "diamond", arrow: "crow" },
        ];

        for (const cfg of configs) {
            for (const edgeCount of CONFIG.EDGE_COUNTS.PHASE3) {
                test(`${edgeCount} edges - ${cfg.line}/${cfg.arrow} - 2D rotation`, async () => {
                    const result = await runBenchmark({
                        edgeCount,
                        lineStyle: cfg.line,
                        arrowType: cfg.arrow,
                        mode: "2d",
                        scenario: "rotation",
                    });

                    phaseResults.push(result);

                    console.log(`[2D ${cfg.line}/${cfg.arrow}] ${edgeCount} edges: ${result.avgFps.toFixed(1)} FPS`);

                    assertDrewEveryFrame(result);
                });
            }
        }
    });

    // ========================================================================
    // PHASE 4: Extreme Stress Test
    // ========================================================================

    describe("Phase 4: Extreme Limits", () => {
        const phaseResults: TestResult[] = [];

        afterAll(() => {
            allResults.push({ phase: "Phase 4: Extreme", results: phaseResults });
        });

        for (const edgeCount of CONFIG.EDGE_COUNTS.PHASE4) {
            test(`${edgeCount} edges - solid/none - 3D rotation (extreme)`, async () => {
                const result = await runBenchmark({
                    edgeCount,
                    lineStyle: "solid",
                    arrowType: "none",
                    mode: "3d",
                    scenario: "rotation",
                });

                phaseResults.push(result);

                console.log(
                    `[EXTREME] ${edgeCount} edges: ${result.avgFps.toFixed(1)} FPS, ${result.jankPercent.toFixed(1)}% jank`,
                );

                assertDrewEveryFrame(result);
            });
        }
    });

    // ========================================================================
    // PHASE 5: Additional Line/Arrow Variations
    // ========================================================================

    describe("Phase 5: Additional Variations", () => {
        const phaseResults: TestResult[] = [];

        afterAll(() => {
            allResults.push({ phase: "Phase 5: Variations", results: phaseResults });
        });

        // Test additional line styles at 1000 edges (reduced to prevent queue overflow)
        // Testing only one representative from each category
        const additionalLines = ["star"]; // Most complex line pattern
        const additionalArrows = ["open-diamond"]; // Representative open arrow

        for (const lineStyle of additionalLines) {
            test(`1000 edges - ${lineStyle}/none - 3D rotation`, async () => {
                const result = await runBenchmark({
                    edgeCount: 1000,
                    lineStyle,
                    arrowType: "none",
                    mode: "3d",
                    scenario: "rotation",
                });

                phaseResults.push(result);

                console.log(`[VAR ${lineStyle}/none] 1000 edges: ${result.avgFps.toFixed(1)} FPS`);

                assertDrewEveryFrame(result);
            });
        }

        for (const arrowType of additionalArrows) {
            test(`1000 edges - solid/${arrowType} - 3D rotation`, async () => {
                const result = await runBenchmark({
                    edgeCount: 1000,
                    lineStyle: "solid",
                    arrowType,
                    mode: "3d",
                    scenario: "rotation",
                });

                phaseResults.push(result);

                console.log(`[VAR solid/${arrowType}] 1000 edges: ${result.avgFps.toFixed(1)} FPS`);

                assertDrewEveryFrame(result);
            });
        }
    });

    // ========================================================================
    // PHASE 6: Load Time Scaling
    // ========================================================================

    // Records how the time to the first finished frame grows as the edge count doubles (#27).
    // The ratios go in the report and are never asserted: they are wall-clock derived.
    // One load varies by up to 2x from the next, so each size is loaded in several rounds, the
    // sizes interleaved within a round, and the report takes the median.
    describe("Phase 6: Load Time Scaling", () => {
        for (let round = 1; round <= CONFIG.LOAD_SCALING_ROUNDS; round++) {
            for (const arrowType of LOAD_SCALING_ARROWS) {
                for (const edgeCount of CONFIG.EDGE_COUNTS.LOAD_SCALING) {
                    test(`${edgeCount} edges - solid/${arrowType} - load to first finished frame (round ${round})`, async () => {
                        const { graph, loadMs } = await loadGraph({
                            edgeCount,
                            lineStyle: "solid",
                            arrowType,
                            mode: "3d",
                            scenario: "rotation",
                        });

                        loadResults.push({ edgeCount, arrowType, loadMs });

                        console.log(`[LOAD solid/${arrowType}] ${edgeCount} edges: ${loadMs.toFixed(0)}ms`);

                        assert.strictEqual(graph.getDataManager().edges.size, edgeCount);
                    });
                }
            }
        }
    });
});
