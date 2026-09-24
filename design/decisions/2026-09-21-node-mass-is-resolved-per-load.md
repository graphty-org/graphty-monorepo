# A reader's nodeMass record is resolved to an array at every load; nodeSize is not offered at all

Date: 2026-09-21
Decided by: the owner, in the M6 plan
(`design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md`, departure DEP-M6-D and plan
decision PD-14)
Changes: `design/webgpu/webgpu-acceleration-plan.md` 9.4 item 10 (`:3230-3236`), which resolves
`nodeMass` and `nodeSize` ONCE at engine creation and writes each as a node column with role
`mass` / `size` on the builder, `replaceRole: true`, so that both simulations find them by role.
That section is NOT edited; this record supersedes it.

## The decision

A reader's `nodeMass` has three forms, and the published option schema offers exactly those three:
a number per node id, the name of a numeric node column, or nothing
(`graphty-element/src/layout/ForceAtlas2LayoutEngine.ts`,
`z.record(z.string(), z.number()).or(z.string()).or(z.null())`).

The FIRST is resolved by the element, at EVERY load of the simulation: `resolveNodeMass`
(`graphty-element/src/layout/SimulationLayoutEngine.ts`) turns the record into a `Float32Array`
over the dense row space with `@graphty/layout`'s `resolveNodeVector` and hands it to
`createSimulation` as `nodeMass`. The other two reach the simulation untouched -- `resolveNodeMass`
returns null for them, and the simulation reads the named column itself or applies its own default
of one more than the degree. No column is written and the reader's data is not mutated.

The array the simulation's own `SimulationOptions` would also accept
(`layout/src/simulation/types.ts:32`) is not a form a reader can supply: the schema does not offer
it, so the only array that reaches a simulation is the one the element resolved.

`nodeSize` is not a layout option. The published option schema never carried one, and the resolved
options pass `nodeSize: null` unconditionally
(`graphty-element/src/managers/LayoutManager.ts:121`).

## Why

The record form has to be resolved by the element whatever happens. The GPU package rejects it --
`webgpu-graph-algorithms/src/layouts/inputs.ts` refuses "the Record form of nodeMass", because an
accelerator never sees a node id, only a row -- so a mass given as `{ "alice": 3 }` must become an
array before either simulation is built. Once the element is doing that resolution, the column is
not buying the thing it was there for.

What the role column WAS buying is survival across a re-freeze: the snapshot is rebuilt and the
rows are renumbered when the data changes, and a value attached to a row would otherwise be wrong
afterwards. Resolving at every load buys the same thing more directly -- the bridge re-resolves
over the new index space each time it loads -- and it stays correct when the reader's mass is a
record keyed by id, which a renumbering invalidates and a column cannot repair.

The third reason is ownership. Writing a builder column from the layout manager makes a layout
option a mutation of the reader's data: it appears in an export, it survives a layout change, and
removing the layout does not remove it. A layout input should not outlive the layout.

`nodeSize` is dropped rather than passed because passing it would be the two-path divergence WebGPU
design 9.4 item 3 forbids. The CPU simulation accepts it and ignores it (its size-adjustment term
is deferred); the GPU factory throws `E_UNSUPPORTED { option: "nodeSize" }` for any value but
`null`. A graph that laid out on the CPU would fail the moment an accelerator attached.

## The argument that was rejected

Writing the role columns, as 9.4 item 10 specifies. It is the more general mechanism: any consumer
of the snapshot, including an algorithm, could then read the mass the layout resolved, and the
resolution happens once per freeze rather than once per load. Rejected because the generality has
no second consumer -- nothing but the force layouts reads a mass -- and because it pays for that
generality by writing into the reader's data from a layout option.

A load is also not an expensive event. The bridge loads when the layout is set, when the snapshot
is replaced and when the simulation is swapped between the CPU and an accelerator; a
`resolveNodeVector` over n rows is one pass, and it is dwarfed by the upload it precedes.

## What we are giving up

`resolveNodeVector`'s role-`mass` fallback is still live -- a consumer who writes a `mass` role
column themselves still gets it, because the resolver applies the column when the option is null.
What is gone is the element WRITING that column: the value the element resolved is not visible to
an algorithm, an exporter or a second layout, and a consumer who wants it visible attaches the
column to their own data.

The simulation's string form of `weight` (a numeric edge column by name) is likewise not exposed;
the element's snapshot has one weight column and `weighted: true` names it. That narrowing is
recorded in the G6 record's findings, not here.

## What would reverse this

A second consumer of the resolved mass. If an algorithm, an exporter or a style layer needs the
same vector, the resolution belongs on the builder after all and 9.4 item 10 comes back as written.
