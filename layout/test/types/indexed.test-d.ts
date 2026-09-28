import type { GraphSnapshot } from "@graphty/graph-format";
import { expectTypeOf } from "vitest";

import { indexed, type LayoutResult } from "../../src";

// Every index-based layout takes a snapshot first and an optional options object last, and returns a LayoutResult.
// Pinned per layout, with each layout's own options type, so a changed parameter list or return type fails here.
type Layout<O> = (g: GraphSnapshot, options?: O) => LayoutResult;

expectTypeOf(indexed.arf).toEqualTypeOf<Layout<indexed.ArfOptions>>();
expectTypeOf(indexed.bfs).toEqualTypeOf<Layout<indexed.BfsLayoutOptions>>();
expectTypeOf(indexed.bipartite).toEqualTypeOf<Layout<indexed.BipartiteLayoutOptions>>();
expectTypeOf(indexed.circular).toEqualTypeOf<Layout<indexed.CommonLayoutOptions>>();
expectTypeOf(indexed.forceAtlas2).toEqualTypeOf<Layout<indexed.IndexedForceAtlas2Options>>();
expectTypeOf(indexed.fruchtermanReingold).toEqualTypeOf<Layout<indexed.IndexedFruchtermanReingoldOptions>>();
expectTypeOf(indexed.grid).toEqualTypeOf<Layout<indexed.GridLayoutOptions>>();
expectTypeOf(indexed.kamadaKawai).toEqualTypeOf<Layout<indexed.KamadaKawaiOptions>>();
expectTypeOf(indexed.multipartite).toEqualTypeOf<Layout<indexed.MultipartiteLayoutOptions>>();
expectTypeOf(indexed.planar).toEqualTypeOf<Layout<indexed.CommonLayoutOptions>>();
expectTypeOf(indexed.radial).toEqualTypeOf<Layout<indexed.RadialLayoutOptions>>();
expectTypeOf(indexed.random).toEqualTypeOf<Layout<indexed.CommonLayoutOptions>>();
expectTypeOf(indexed.shell).toEqualTypeOf<Layout<indexed.ShellLayoutOptions>>();
expectTypeOf(indexed.spectral).toEqualTypeOf<Layout<indexed.CommonLayoutOptions>>();
expectTypeOf(indexed.spiral).toEqualTypeOf<Layout<indexed.SpiralLayoutOptions>>();

// The namespace holds exactly these fifteen layouts: a layout added or removed must be pinned here too.
expectTypeOf<keyof typeof indexed>().toEqualTypeOf<
    | "arf"
    | "bfs"
    | "bipartite"
    | "circular"
    | "forceAtlas2"
    | "fruchtermanReingold"
    | "grid"
    | "kamadaKawai"
    | "multipartite"
    | "planar"
    | "radial"
    | "random"
    | "shell"
    | "spectral"
    | "spiral"
>();
