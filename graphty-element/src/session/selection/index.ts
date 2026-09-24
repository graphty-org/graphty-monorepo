/**
 * @file Selection: which elements a person is pointing at.
 *
 * Two things live here. `./SelectionApi` owns the two sets -- the selected nodes and the selected
 * edges, each held as one byte per element -- and the five operations that change them: replace,
 * add, remove, toggle and intersect. `./targets` turns the description of what to select into the
 * elements it names, whether that is a list of ids, a predicate, a pasted column out of a
 * spreadsheet, the neighbourhood of a node or the top twenty of a finished run.
 *
 * There is ONE selection per session, not one per view. Every view of a dataset, the data table,
 * the inspector and a headset read and write the same two sets, and none of that is expressible
 * if a selection belongs to the thing that draws it.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

export {
    createSelectionApi,
    DEFAULT_SELECTION_CAP,
    type SelectionApi,
    type SelectionAttributeStatistics,
    type SelectionCause,
    type SelectionDelta,
    type SelectionOwner,
    type SelectionSources,
    type SelectionStatistics,
    SET_OPS,
    type SetOp,
} from "./SelectionApi";
export {
    type ElementIdTarget,
    type NeighborhoodTarget,
    resolveTarget,
    type SelectionDirection,
    type SelectionMatch,
    type SelectionSearchHit,
    type SelectionTarget,
    type SelectionTextMode,
    type TargetContext,
    type TargetMembers,
} from "./targets";
