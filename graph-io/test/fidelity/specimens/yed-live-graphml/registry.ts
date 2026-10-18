/**
 * yEd Live GraphML's specimen sheets (`../sheets.ts` says what a sheet is). The yed family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/yed-live-graphml/Specimens.stories.ts`. Move a category out of `pending`
 * into `sheets` (a sheet file here) or `absent` (the format has no such setting, with the documentation that shows it).
 */
import { SHEET_CATEGORIES, type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "yed-live-graphml",
    title: "yEd Live GraphML",
    graphIoFormat: "graphml",
    family: "yed",
    sheets: [],
    absent: {},
    pending: [...SHEET_CATEGORIES],
};
