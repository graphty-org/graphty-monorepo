/**
 * CX2's specimen sheets (`../sheets.ts` says what a sheet is). The cytoscape-desktop family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/cx2/Specimens.stories.ts`. Move a category out of `pending`
 * into `sheets` (a sheet file here) or `absent` (the format has no such setting, with the documentation that shows it).
 */
import { SHEET_CATEGORIES, type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "cx2",
    title: "CX2",
    graphIoFormat: "cx2",
    family: "cytoscape-desktop",
    sheets: [],
    absent: {},
    pending: [...SHEET_CATEGORIES],
};
