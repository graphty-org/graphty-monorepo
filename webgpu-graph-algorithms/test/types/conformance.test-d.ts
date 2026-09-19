import type { LayoutAccelerator, LayoutSimulation } from "@graphty/layout";
import {
    createAccelerator,
    type ForceAtlas2Options,
    type ForceAtlas2Stats,
    type GpuAccelerator,
    type GpuContext,
    type GpuLayoutSimulation,
    type LayoutAccelerator as ReExportedLayoutAccelerator,
    type LayoutSimulation as ReExportedLayoutSimulation,
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

// ---- IDENTITY, not merely assignability: what this package re-exports IS layout's declaration (W1b: the D27
// mirrors are deleted). These two lines are what a re-introduced structural copy would break.
expectTypeOf<ReExportedLayoutAccelerator>().toEqualTypeOf<LayoutAccelerator>();
expectTypeOf<ReExportedLayoutSimulation>().toEqualTypeOf<LayoutSimulation>();

// ---- the option types travel the same way: layout's ForceAtlas2Options IS the one this package's methods take.
// The parameter is optional, so Parameters<...>[0] is `ForceAtlas2Options | undefined` and the union is what the
// assertion has to name -- measured, not assumed: the bare form is a TS2344 against expectTypeOf's constraint.
expectTypeOf<ForceAtlas2Options | undefined>().toEqualTypeOf<
    Parameters<NonNullable<LayoutAccelerator["forceAtlas2"]>>[0]
>();
