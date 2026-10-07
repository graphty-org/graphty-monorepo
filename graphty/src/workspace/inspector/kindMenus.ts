import type { InspectedKindId } from "./inspected";

/**
 * The commands each kind's "..." holds (tier1-design.md section 2.7), the same list as its
 * context menu. A command another package has not built is left out, and a kind with none draws
 * no "..." (Selection, Everything, a group row).
 */
export const MENUS: Partial<Readonly<Record<InspectedKindId, readonly string[]>>> = {
    graph: ["layout.rerun", "layout.reshuffle", "notes.add"],
    node: ["selection.neighborhood", "analyze.path", "view.frame-selection", "notes.add"],
    edge: ["selection.endpoints", "view.frame-selection", "notes.add"],
    several: ["selection.neighborhood", "analyze.path", "view.frame-selection", "notes.add"],
    neighborhood: ["selection.grow-neighborhood", "view.frame-selection"],
    "measure-row": ["row.move-up", "row.move-down", "row.delete"],
    "run-row": ["row.move-up", "row.move-down", "row.delete"],
    "layer-row": ["row.rename", "row.move-up", "row.move-down", "row.delete"],
};
