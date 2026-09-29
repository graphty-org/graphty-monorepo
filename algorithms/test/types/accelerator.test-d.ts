// Compiled by `tsc -p tsconfig.typecheck.json` inside `npm run lint`, never executed. Imports go
// through the package barrel, as the GPU package's equivalent files do, so what is pinned here is
// the PUBLIC surface rather than a source path.
import type { AdjacencyView, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";
import { expectTypeOf } from "vitest";

import {
    accelerated,
    type AcceleratedAlgorithms,
    type AlgorithmAccelerator,
    allPairsShortestPath,
    type ApspCycleResultLike,
    type BfsResultLike,
    type CommunityResultLike,
    connectedComponents,
    type CorenessResultLike,
    dijkstra,
    hits,
    type HitsResultLike,
    katzCentrality,
    kCoreDecomposition,
    kruskalMST,
    labelPropagation,
    type LabelResultLike,
    louvain,
    type MstResultLike,
    type PageRankResultLike,
    type ScoresResultLike,
    type SsspResult,
    type SsspResultLike,
} from "../../src/index.js";

declare const s: GraphSnapshot;
declare const acc: AlgorithmAccelerator;

// ---- the shapes design 9.2 fixes
expectTypeOf<ScoresResultLike["scores"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<PageRankResultLike>().toMatchTypeOf<ScoresResultLike>();
expectTypeOf<PageRankResultLike["danglingMass"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<LabelResultLike["labels"]>().toEqualTypeOf<U32>();
expectTypeOf<LabelResultLike["groups"]>().returns.toEqualTypeOf<U32[]>();
expectTypeOf<BfsResultLike["depth"]>().toEqualTypeOf<U32>();
expectTypeOf<SsspResultLike["dist"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<MstResultLike["edges"]>().toEqualTypeOf<U32>();

// ---- every accelerator member is optional but `kind`
expectTypeOf<AlgorithmAccelerator["kind"]>().toBeString();
expectTypeOf<AlgorithmAccelerator>().toMatchTypeOf<{ readonly kind: string }>();
// `kind` is the ONLY required member: an accelerator with nothing else still satisfies the type.
const minimal: AlgorithmAccelerator = { kind: "fake" };
expectTypeOf(minimal).toMatchTypeOf<AlgorithmAccelerator>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().parameter(0).toEqualTypeOf<GraphSnapshot>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().returns.resolves.toEqualTypeOf<PageRankResultLike>();

// ---- the dispatcher: six methods, and sssp returns the DECORATED result (plan decisions PD-3, DEP-8A-E)
expectTypeOf(accelerated).parameter(0).toEqualTypeOf<AlgorithmAccelerator | null | undefined>();
expectTypeOf(accelerated).returns.toEqualTypeOf<AcceleratedAlgorithms>();
expectTypeOf(accelerated(acc).accelerator).toEqualTypeOf<AlgorithmAccelerator | null>();
expectTypeOf(accelerated(acc).sssp(s, 0)).resolves.toEqualTypeOf<SsspResult>();
expectTypeOf<SsspResult["pathEdges"]>().returns.toEqualTypeOf<U32>();
expectTypeOf(accelerated(null).pageRank(s)).resolves.toMatchTypeOf<ScoresResultLike>();

// ---- the CPU port's own result satisfies the shared shape, with no adapter
expectTypeOf(connectedComponents(s)).toMatchTypeOf<LabelResultLike>();
expectTypeOf(kruskalMST(s)).toMatchTypeOf<MstResultLike>();
expectTypeOf(dijkstra(s, 0)).toMatchTypeOf<SsspResultLike>();
expectTypeOf(kCoreDecomposition(s)).toMatchTypeOf<CorenessResultLike>();
expectTypeOf(katzCentrality(s)).toMatchTypeOf<ScoresResultLike>();
expectTypeOf(hits(s)).toMatchTypeOf<HitsResultLike>();
expectTypeOf(louvain(s)).toMatchTypeOf<CommunityResultLike>();
expectTypeOf(allPairsShortestPath(s)).toMatchTypeOf<ApspCycleResultLike>();
expectTypeOf(accelerated(null).allPairsShortestPath(s)).resolves.toMatchTypeOf<ApspCycleResultLike>();
expectTypeOf(labelPropagation(s)).toMatchTypeOf<LabelResultLike>();
expectTypeOf(accelerated(acc).labelPropagation(s)).resolves.toEqualTypeOf<LabelResultLike>();

// ---- depth-first search walks any adjacency view, as its port does; degrees are the declared halves
expectTypeOf<AcceleratedAlgorithms["depthFirstSearch"]>().parameter(0).toEqualTypeOf<AdjacencyView>();
expectTypeOf(accelerated(null).degrees(s)).resolves.toEqualTypeOf<{ readonly inDegree: U32; readonly outDegree: U32 }>();
