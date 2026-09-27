#!/usr/bin/env tsx

// Node.js K-Core Decomposition Performance Benchmark using Benchmark.js
import { kCoreDecomposition } from "../../src/clustering/k-core";
import { saveBenchmarkSession } from "../utils/benchmark-result";
import { CrossPlatformBenchmark } from "../utils/benchmark-runner";
import { convertToLibraryGraph } from "../utils/graph-adapter";
import { formatSystemInfo, getSystemInfo } from "../utils/system-info";
import { generateTestGraphs } from "../utils/test-data-generator";

// Configuration for Node.js benchmarks
const configs = {
    quick: {
        testType: "quick" as const,
        platform: "node" as const,
        sizes: [100, 500, 1000], // K-core is relatively efficient
        iterations: 10,
    },
    comprehensive: {
        testType: "comprehensive" as const,
        platform: "node" as const,
        sizes: [100, 500, 1000, 5000, 10000],
        iterations: 20,
    },
};

async function runKCoreBenchmark(configType: "quick" | "comprehensive") {
    console.log(`🚀 Running ${configType} K-Core Decomposition benchmarks in Node.js`);
    console.log(`=${  "=".repeat(50)}`);
    console.log(formatSystemInfo(getSystemInfo()));
    console.log("");

    const config = configs[configType];
    const benchmark = new CrossPlatformBenchmark(config, `K-Core ${configType} Performance`);

    // Pre-generate test graphs to avoid memory issues
    console.log("Pre-generating test graphs...");
    const testGraphs = new Map();

    for (const size of config.sizes) {
        try {
            console.log(`  Generating ${size} vertex sparse graph...`);
            const benchmarkGraph = generateTestGraphs.sparse(size);
            const graph = convertToLibraryGraph(benchmarkGraph);

            testGraphs.set(`sparse-${size}`, {
                graph,
                metadata: benchmarkGraph.metadata,
                edges: benchmarkGraph.edges.length,
                algorithm: "K-Core",
                graphType: "sparse",
                graphSize: size,
                graphGenerationAlgorithm: benchmarkGraph.metadata?.generationAlgorithm,
            });

            console.log(`    ✓ ${size} vertices, ${benchmarkGraph.edges.length} edges`);
        } catch (error) {
            console.error(`    ✗ Failed to generate ${size} vertex graph:`, error);
        }
    }

    // Add benchmark tests
    console.log("\nAdding benchmark tests...");
    for (const size of config.sizes) {
        const testKey = `sparse-${size}`;
        if (testGraphs.has(testKey)) {
            const testData = testGraphs.get(testKey);

            // Test with k=3 (common choice)
            benchmark.addTest(
                `K-Core ${size} vertices (k=3, sparse)`,
                () => {
                    const result = kCoreDecomposition(testData.graph);
                    // Verify result to prevent dead code elimination
                    if (!result || !result.cores) {
                        throw new Error("K-Core returned invalid result");
                    }
                },
                testData,
                {
                    minSamples: config.iterations,
                    initCount: 1,
                    minTime: 0.1,
                },
            );
        }
    }

    // For comprehensive tests, also test with RMAT graphs and different k values
    if (configType === "comprehensive") {
        const rmatSizes = config.sizes.filter((s) => s <= 5000);

        console.log("\nGenerating RMAT graphs for comprehensive testing...");
        for (const size of rmatSizes) {
            try {
                console.log(`  Generating ${size} vertex RMAT graph...`);
                const benchmarkGraph = generateTestGraphs.rmat(size);
                const graph = convertToLibraryGraph(benchmarkGraph);

                const testData = {
                    graph,
                    metadata: benchmarkGraph.metadata,
                    edges: benchmarkGraph.edges.length,
                    algorithm: "K-Core",
                    graphType: "rmat",
                    graphSize: size,
                    graphGenerationAlgorithm: benchmarkGraph.metadata?.generationAlgorithm,
                };

                // Test with k=5 for RMAT (power-law graphs often have higher k-cores)
                benchmark.addTest(
                    `K-Core ${size} vertices (k=5, RMAT)`,
                    () => {
                        const result = kCoreDecomposition(testData.graph);
                        if (!result || !result.cores) {
                            throw new Error("K-Core returned invalid result");
                        }
                    },
                    testData,
                    {
                        minSamples: Math.floor(config.iterations * 0.7),
                        initCount: 1,
                        minTime: 0.1,
                    },
                );

                console.log(`    ✓ ${size} vertices, ${benchmarkGraph.edges.length} edges`);
            } catch (error) {
                console.error(`    ✗ Failed to generate RMAT ${size} vertex graph:`, error);
            }
        }
    }

    // Run benchmarks
    console.log(`\nRunning ${configType} benchmarks...\n`);

    try {
        const session = await benchmark.run();

        // Display summary
        console.log(`\n${  "=".repeat(70)}`);
        console.log("BENCHMARK RESULTS SUMMARY");
        console.log("=".repeat(70));
        console.log("Size\tType\tK\tTime(ms)\tOps/sec\tCore Size\tMargin");
        console.log("-".repeat(70));

        session.results.forEach((result) => {
            const margin = result.metrics?.marginOfError || 0;
            const k = result.algorithm.includes("k=5") ? 5 : 3;

            // Run once more to get core size
            const testData = testGraphs.get(`${result.graphType}-${result.graphSize}`);
            let coreSize = "N/A";

            if (testData) {
                try {
                    const res = kCoreDecomposition(testData.graph);
                    const kCoreNodes = res.cores.get(k);
                    coreSize = kCoreNodes ? kCoreNodes.size.toString() : "0";
                } catch {
                    // The summary column stays "N/A" when the rerun fails
                }
            }

            console.log(
                `${result.graphSize}\t${result.graphType}\t${k}\t${result.executionTime.toFixed(2)}\t\t${result.metrics?.opsPerSecond?.toFixed(0) || "N/A"}\t${coreSize}\t\t±${margin.toFixed(1)}%`,
            );
        });

        // Save results
        const filename = await saveBenchmarkSession(session);
        console.log(`\n✅ Results saved to ${filename}`);

        return session;
    } catch (error) {
        console.error("❌ Benchmark failed:", error);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const configType = args.includes("--comprehensive") ? "comprehensive" : "quick";

    try {
        await runKCoreBenchmark(configType);
    } catch (error) {
        console.error("Benchmark execution failed:", error);
        process.exit(1);
    }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
