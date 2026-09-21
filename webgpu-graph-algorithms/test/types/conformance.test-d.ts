import type {
    AcceleratedAlgorithms,
    AlgorithmAccelerator,
    IndexedPageRankOptions,
    PageRankResultLike,
    ScoresResultLike,
} from "@graphty/algorithms";
import type {
    FruchtermanReingoldOptions,
    LayoutAccelerator,
    LayoutSimulation,
    SpringElectricalOptions,
} from "@graphty/layout";
import {
    type AlgorithmAccelerator as ReExportedAlgorithmAccelerator,
    createAccelerator,
    type ForceAtlas2Options,
    type ForceAtlas2Stats,
    type FruchtermanReingoldStats,
    type GpuAccelerator,
    type GpuContext,
    type GpuLayoutSimulation,
    type LayoutAccelerator as ReExportedLayoutAccelerator,
    type LayoutSimulation as ReExportedLayoutSimulation,
    type PageRankResultLike as ReExportedPageRankResultLike,
    type ScoresResultLike as ReExportedScoresResultLike,
    type SpringElectricalStats,
} from "@graphty/webgpu-graph-algorithms";
import { expectTypeOf } from "vitest";

// The W1b cross-compile (design 9.8's W1 row, G10; integration plan D-9). 9.8, the section-13 P10 row and D27 all
// say this file is "retired" at W1 because "the `implements` clauses do the checking" -- but nothing in src/
// carries an `implements LayoutAccelerator` clause (only src/layouts/force-simulation.ts implements the
// SIMULATION), so expectTypeOf is the only thing that checks the accelerator. The file is created here and stays.
//
// Compiled twice and never executed: by `tsc --noEmit -p tsconfig.json` (paths to the sources, layout to
// ../layout/dist/layout.d.ts) and by `tsc -p tsconfig.strict-consumer.json` (paths to dist/*.d.ts under
// exactOptionalPropertyTypes + noUncheckedIndexedAccess). Imports go through the PACKAGE NAMES, as the three
// sibling test-d files do: a relative `../../src/...` import would pull src/ into the strict-consumer program,
// which src/ does not satisfy. `declare const` stands in for every value.
//
// The strict-consumer leg is meaningless until `npm run build:all` has run IN THIS WORKTREE: with dist/ absent,
// `@graphty/webgpu-graph-algorithms` resolves up and out to whatever the sibling checkout last built.

declare const ctx: GpuContext;

// ---- forward: the GPU accelerator satisfies the REAL @graphty/layout interface, not a mirror of it
expectTypeOf(createAccelerator(ctx)).toMatchTypeOf<LayoutAccelerator>();
expectTypeOf<GpuAccelerator>().toMatchTypeOf<LayoutAccelerator>();
const injected: LayoutAccelerator = createAccelerator(ctx);
expectTypeOf(injected).toMatchTypeOf<LayoutAccelerator>();

// ---- the GPU simulation satisfies the real LayoutSimulation, and that is what the element sees back
expectTypeOf<GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf<ReturnType<NonNullable<LayoutAccelerator["forceAtlas2"]>>>().toEqualTypeOf<LayoutSimulation>();
// P5: the two other layout members route the same way (spec 9.3 lines 3018-3025; PD-19)
expectTypeOf<GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf<GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf<ReturnType<NonNullable<LayoutAccelerator["fruchtermanReingold"]>>>().toEqualTypeOf<LayoutSimulation>();
expectTypeOf<ReturnType<NonNullable<LayoutAccelerator["springElectrical"]>>>().toEqualTypeOf<LayoutSimulation>();
expectTypeOf(createAccelerator(ctx).fruchtermanReingold()).toMatchTypeOf<LayoutSimulation>();
expectTypeOf(createAccelerator(ctx).springElectrical()).toMatchTypeOf<LayoutSimulation>();

// ---- EQUALITY, not merely assignability: what this package re-exports IS layout's declaration (W1b: the D27
// mirrors are deleted). expectTypeOf compares structurally, so a VERBATIM structural copy would still pass these
// two lines; what they catch is a copy that has drifted from layout's declaration by so much as one member.
expectTypeOf<ReExportedLayoutAccelerator>().toEqualTypeOf<LayoutAccelerator>();
expectTypeOf<ReExportedLayoutSimulation>().toEqualTypeOf<LayoutSimulation>();

// ---- the option types travel the same way: layout's ForceAtlas2Options IS the one this package's methods take.
// The parameter is optional, so Parameters<...>[0] is `ForceAtlas2Options | undefined` and the union is what the
// assertion has to name -- measured, not assumed: the bare form is a TS2344 against expectTypeOf's constraint.
expectTypeOf<ForceAtlas2Options | undefined>().toEqualTypeOf<
    Parameters<NonNullable<LayoutAccelerator["forceAtlas2"]>>[0]
>();
expectTypeOf<FruchtermanReingoldOptions | undefined>().toEqualTypeOf<
    Parameters<NonNullable<LayoutAccelerator["fruchtermanReingold"]>>[0]
>();
expectTypeOf<SpringElectricalOptions | undefined>().toEqualTypeOf<
    Parameters<NonNullable<LayoutAccelerator["springElectrical"]>>[0]
>();

// ---- the algorithms half of W1b (design 9.8's W1 row, G10). Forward: the GPU accelerator satisfies
// the REAL @graphty/algorithms interface, not a mirror of it.
expectTypeOf(createAccelerator(ctx)).toMatchTypeOf<AlgorithmAccelerator>();
expectTypeOf<GpuAccelerator>().toMatchTypeOf<AlgorithmAccelerator & LayoutAccelerator>();
const injectedAlgorithms: AlgorithmAccelerator = createAccelerator(ctx);
expectTypeOf(injectedAlgorithms).toMatchTypeOf<AlgorithmAccelerator>();

// ---- IDENTITY, not merely assignability: what this package re-exports IS the algorithms
// declaration. These lines are what a re-introduced structural copy would break.
expectTypeOf<ReExportedAlgorithmAccelerator>().toEqualTypeOf<AlgorithmAccelerator>();
expectTypeOf<ReExportedScoresResultLike>().toEqualTypeOf<ScoresResultLike>();
expectTypeOf<ReExportedPageRankResultLike>().toEqualTypeOf<PageRankResultLike>();

// ---- the REVERSE compile G10 names: the CPU dispatcher accepts this package's accelerator, and the
// option type it hands the method is the CPU package's own.
declare const dispatch: (acc: AlgorithmAccelerator | null | undefined) => AcceleratedAlgorithms;
expectTypeOf(dispatch(createAccelerator(ctx))).toEqualTypeOf<AcceleratedAlgorithms>();
expectTypeOf<IndexedPageRankOptions | undefined>().toEqualTypeOf<
    Parameters<NonNullable<AlgorithmAccelerator["pageRank"]>>[1]
>();
