/**
 * Cytoscape session's specimen sheets (`../sheets.ts` says what a sheet is). The cytoscape-desktop family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/cys/Specimens.stories.ts`. Move a category out of `pending`
 * into `sheets` (a sheet file here) or `absent` (the format has no such setting, with the documentation that shows it).
 */
import { SHEET_CATEGORIES, type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "cys",
    title: "Cytoscape session",
    graphIoFormat: "cys",
    family: "cytoscape-desktop",
    sheets: [],
    absent: {},
    pending: [...SHEET_CATEGORIES],
};
