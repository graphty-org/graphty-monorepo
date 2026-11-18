/**
 * @file Writes and checks `src/catalog/engine-facts.json`, the snapshot of the static fields the
 * catalog reads from the built-in algorithm and layout classes (#890).
 *
 * The catalog reads the snapshot so `./session` and `./catalog` carry no algorithm or layout
 * implementation. The classes stay the source: this test computes the snapshot from them and fails
 * when the committed file disagrees. Run it with `UPDATE_ENGINE_FACTS=1` to rewrite the file.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { AStarAlgorithm } from "../../src/algorithms/AStarAlgorithm";
import { BellmanFordAlgorithm } from "../../src/algorithms/BellmanFordAlgorithm";
import { BetweennessCentralityAlgorithm } from "../../src/algorithms/BetweennessCentralityAlgorithm";
import { BFSAlgorithm } from "../../src/algorithms/BFSAlgorithm";
import { BipartiteMatchingAlgorithm } from "../../src/algorithms/BipartiteMatchingAlgorithm";
import { ClosenessCentralityAlgorithm } from "../../src/algorithms/ClosenessCentralityAlgorithm";
import { ClusteringCoefficientAlgorithm } from "../../src/algorithms/ClusteringCoefficientAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../src/algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../../src/algorithms/DegreeAlgorithm";
import { DFSAlgorithm } from "../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { EdgeBetweennessCentralityAlgorithm } from "../../src/algorithms/EdgeBetweennessCentralityAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../src/algorithms/EigenvectorCentralityAlgorithm";
import { FloydWarshallAlgorithm } from "../../src/algorithms/FloydWarshallAlgorithm";
import { GirvanNewmanAlgorithm } from "../../src/algorithms/GirvanNewmanAlgorithm";
import { HierarchicalClusteringAlgorithm } from "../../src/algorithms/HierarchicalClusteringAlgorithm";
import { HITSAlgorithm } from "../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../src/algorithms/KatzCentralityAlgorithm";
import { KCoreAlgorithm } from "../../src/algorithms/KCoreAlgorithm";
import { KruskalAlgorithm } from "../../src/algorithms/KruskalAlgorithm";
import { LabelPropagationAlgorithm } from "../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../src/algorithms/LeidenAlgorithm";
import { LinkPredictionAlgorithm } from "../../src/algorithms/LinkPredictionAlgorithm";
import { LouvainAlgorithm } from "../../src/algorithms/LouvainAlgorithm";
import { MarkovClusteringAlgorithm } from "../../src/algorithms/MarkovClusteringAlgorithm";
import { MaxFlowAlgorithm } from "../../src/algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../../src/algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../../src/algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../../src/algorithms/PrimAlgorithm";
import { RemovalImpactAlgorithm } from "../../src/algorithms/RemovalImpactAlgorithm";
import { SpectralClusteringAlgorithm } from "../../src/algorithms/SpectralClusteringAlgorithm";
import { StronglyConnectedComponentsAlgorithm } from "../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import type { EngineFacts } from "../../src/catalog/engineFacts";
import { optionsFromZod } from "../../src/catalog/optionsFromZod";
import { ArfLayout } from "../../src/layout/ArfLayoutEngine";
import { BfsLayout } from "../../src/layout/BfsLayoutEngine";
import { BipartiteLayout } from "../../src/layout/BipartiteLayoutEngine";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { FixedLayout } from "../../src/layout/FixedLayoutEngine";
import { ForceAtlas2Layout } from "../../src/layout/ForceAtlas2LayoutEngine";
import { GRAPHVIZ_LAYOUTS } from "../../src/layout/GraphvizLayoutEngine";
import { GridLayout } from "../../src/layout/GridLayoutEngine";
import { KamadaKawaiLayout } from "../../src/layout/KamadaKawaiLayoutEngine";
import { LocationMapLayout } from "../../src/layout/LocationMapLayoutEngine";
import { MultipartiteLayout } from "../../src/layout/MultipartiteLayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { PlanarLayout } from "../../src/layout/PlanarLayoutEngine";
import { RadialLayout } from "../../src/layout/RadialLayoutEngine";
import { RandomLayout } from "../../src/layout/RandomLayoutEngine";
import { ShellLayout } from "../../src/layout/ShellLayoutEngine";
import { SpectralLayout } from "../../src/layout/SpectralLayoutEngine";
import { SpiralLayout } from "../../src/layout/SpiralLayoutEngine";
import { SpringElectricalLayout } from "../../src/layout/SpringElectricalLayoutEngine";
import { SpringLayout } from "../../src/layout/SpringLayoutEngine";

const FACTS_FILE = fileURLToPath(new URL("../../src/catalog/engine-facts.json", import.meta.url));

const ALGORITHMS = [
    AStarAlgorithm,
    BellmanFordAlgorithm,
    BetweennessCentralityAlgorithm,
    BFSAlgorithm,
    BipartiteMatchingAlgorithm,
    ClosenessCentralityAlgorithm,
    ClusteringCoefficientAlgorithm,
    ConnectedComponentsAlgorithm,
    DegreeAlgorithm,
    DFSAlgorithm,
    DijkstraAlgorithm,
    EdgeBetweennessCentralityAlgorithm,
    EigenvectorCentralityAlgorithm,
    FloydWarshallAlgorithm,
    GirvanNewmanAlgorithm,
    HierarchicalClusteringAlgorithm,
    HITSAlgorithm,
    KatzCentralityAlgorithm,
    KCoreAlgorithm,
    KruskalAlgorithm,
    LabelPropagationAlgorithm,
    LeidenAlgorithm,
    LinkPredictionAlgorithm,
    LouvainAlgorithm,
    MarkovClusteringAlgorithm,
    MaxFlowAlgorithm,
    MinCutAlgorithm,
    PageRankAlgorithm,
    PrimAlgorithm,
    RemovalImpactAlgorithm,
    SpectralClusteringAlgorithm,
    StronglyConnectedComponentsAlgorithm,
];

const LAYOUTS = [
    ArfLayout,
    BfsLayout,
    BipartiteLayout,
    CircularLayout,
    D3GraphEngine,
    FixedLayout,
    ForceAtlas2Layout,
    GridLayout,
    KamadaKawaiLayout,
    LocationMapLayout,
    MultipartiteLayout,
    NGraphEngine,
    PlanarLayout,
    RadialLayout,
    RandomLayout,
    ShellLayout,
    SpectralLayout,
    SpiralLayout,
    SpringElectricalLayout,
    SpringLayout,
    ...Object.values(GRAPHVIZ_LAYOUTS),
];

/**
 * The snapshot, computed from the classes.
 * @returns What engine-facts.json must hold.
 */
function factsFromClasses(): EngineFacts {
    return {
        algorithms: Object.fromEntries(
            ALGORITHMS.map((cls) => [
                cls.type,
                {
                    options: optionsFromZod(cls.getZodOptionsSchema()),
                    ...(cls.scopeInput === undefined ? {} : { scopeInput: cls.scopeInput }),
                    weightMeaning: cls.weightMeaning,
                    loadedWeightByDefault: cls.loadedWeightByDefault,
                },
            ]),
        ),
        layouts: Object.fromEntries(
            LAYOUTS.map((cls) => [
                cls.type,
                {
                    options: optionsFromZod(cls.zodOptionsSchema ?? {}),
                    honoursWeights: cls.honoursWeights,
                    scoped: cls.scoped,
                },
            ]),
        ),
    };
}

describe("engine-facts.json", () => {
    const facts = factsFromClasses();

    it("has one entry per class", () => {
        assert.strictEqual(Object.keys(facts.algorithms).length, ALGORITHMS.length);
        assert.strictEqual(Object.keys(facts.layouts).length, LAYOUTS.length);
    });

    it("loses nothing when written as JSON", () => {
        assert.deepStrictEqual(JSON.parse(JSON.stringify(facts)), facts);
    });

    it("matches what the classes declare", () => {
        if (process.env.UPDATE_ENGINE_FACTS === "1") {
            writeFileSync(FACTS_FILE, `${JSON.stringify(facts, null, 4)}\n`);
        }

        assert.deepStrictEqual(JSON.parse(readFileSync(FACTS_FILE, "utf8")), facts);
    });
});
