import type { InspectedKindId } from "./inspected";

/**
 * The commands each kind's "..." holds (tier1-design.md section 2.7), the same list as its
 * context menu. A command another package has not built is left out, and a kind with none draws
 * no "..." (Selection, Everything, a group row).
 */
export const MENUS: Partial<Readonly<Record<InspectedKindId, readonly string[]>>> = {
    graph: ["layout.rerun", "layout.reshuffle", "notes.add"],
    node: ["selection.neighborhood", "analyze.path", "view.frame-selection", "style.layer-from-selection", "notes.add"],
    edge: ["selection.endpoints", "view.frame-selection", "style.layer-from-selection", "notes.add"],
    several: [
        "selection.neighborhood",
        "analyze.path",
        "view.frame-selection",
        "style.layer-from-selection",
        "notes.add",
    ],
    neighborhood: ["view.frame-selection", "style.layer-from-selection"],
    "layer-row": [
        "row.rename",
        "row.duplicate",
        "row.pin-top",
        "row.pin-bottom",
        "row.pin-none",
        "row.select-paints",
        "row.delete",
    ],
    "folder-row": [
        "row.rename",
        "row.pin-top",
        "row.pin-bottom",
        "row.pin-none",
        "row.select-paints",
        "row.ungroup",
        "row.delete",
    ],
};
