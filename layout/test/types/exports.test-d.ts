import type { GraphSnapshot } from "@graphty/graph-format";
import { expectTypeOf } from "vitest";

import type {
    ArfOptions,
    BfsLayoutOptions,
    BipartiteLayoutOptions,
    CommonLayoutOptions,
    GridLayoutOptions,
    IndexedForceAtlas2Options,
    IndexedFruchtermanReingoldOptions,
    KamadaKawaiOptions,
    LayoutResult,
    MultipartiteLayoutOptions,
    RadialLayoutOptions,
    ShellLayoutOptions,
    SpiralLayoutOptions,
} from "../../src";
import * as layout from "../../src";

// Every layout takes a snapshot first and an optional options object last, and returns a LayoutResult. Pinned per
// layout, with each layout's own options type, so a changed parameter list or return type fails here.
type Layout<O> = (g: GraphSnapshot, options?: O) => LayoutResult;

expectTypeOf(layout.arf).toEqualTypeOf<Layout<ArfOptions>>();
expectTypeOf(layout.bfs).toEqualTypeOf<Layout<BfsLayoutOptions>>();
expectTypeOf(layout.bipartite).toEqualTypeOf<Layout<BipartiteLayoutOptions>>();
expectTypeOf(layout.circular).toEqualTypeOf<Layout<CommonLayoutOptions>>();
expectTypeOf(layout.forceAtlas2).toEqualTypeOf<Layout<IndexedForceAtlas2Options>>();
expectTypeOf(layout.fruchtermanReingold).toEqualTypeOf<Layout<IndexedFruchtermanReingoldOptions>>();
expectTypeOf(layout.grid).toEqualTypeOf<Layout<GridLayoutOptions>>();
expectTypeOf(layout.kamadaKawai).toEqualTypeOf<Layout<KamadaKawaiOptions>>();
expectTypeOf(layout.multipartite).toEqualTypeOf<Layout<MultipartiteLayoutOptions>>();
expectTypeOf(layout.planar).toEqualTypeOf<Layout<CommonLayoutOptions>>();
expectTypeOf(layout.radial).toEqualTypeOf<Layout<RadialLayoutOptions>>();
expectTypeOf(layout.random).toEqualTypeOf<Layout<CommonLayoutOptions>>();
expectTypeOf(layout.shell).toEqualTypeOf<Layout<ShellLayoutOptions>>();
expectTypeOf(layout.spectral).toEqualTypeOf<Layout<CommonLayoutOptions>>();
expectTypeOf(layout.spiral).toEqualTypeOf<Layout<SpiralLayoutOptions>>();

// The 1.x `indexed` namespace, deprecated in 2.0.0, is gone: every layout is a top-level export.
expectTypeOf<typeof layout>().not.toHaveProperty("indexed");

// The positional layouts and the graph generators of layout 1.x are gone.
type Removed =
    | "arfLayout"
    | "bfsLayout"
    | "bipartiteLayout"
    | "circularLayout"
    | "forceatlas2Layout"
    | "fruchtermanReingoldLayout"
    | "gridLayout"
    | "kamadaKawaiLayout"
    | "multipartiteLayout"
    | "planarLayout"
    | "radialLayout"
    | "randomLayout"
    | "shellLayout"
    | "spectralLayout"
    | "spiralLayout"
    | "springLayout"
    | "bipartiteGraph"
    | "completeGraph"
    | "cycleGraph"
    | "gridGraph"
    | "randomGraph"
    | "scaleFreeGraph"
    | "starGraph"
    | "wheelGraph";
expectTypeOf<Extract<keyof typeof layout, Removed>>().toEqualTypeOf<never>();

// The unused 1.x `Embedding` type is gone as well.
// @ts-expect-error -- layout 2.0.0 exports no Embedding type
export type NoEmbedding = layout.Embedding;

// The ForceAtlas2Simulation constructor's options type is exported, so a caller (and the API docs) can name it.
expectTypeOf<ConstructorParameters<typeof layout.ForceAtlas2Simulation>[0]>().toEqualTypeOf<
    layout.ForceAtlas2SimulationOptions | undefined
>();
