/**
 * Pajek's specimen sheets (`../sheets.ts` says what a sheet is). The pajek family owns this file, the sheet files
 * beside it and `fidelity-stories/stories/pajek/Specimens.stories.ts`.
 *
 * The sheets are the pages of `pages.json`, written by `../../generators/specimens/pajek.py` with the `.net` files:
 * each category's file drawn by Pajek 6.02 under its defaults in a 1200 x 900 Draw window, and again under one Draw
 * window or export option per further page (`pages.json` names the option). Pajek keeps those options in its ini
 * file, not in the `.net` file, so a page's file is the same file as its category's first page. The mappings sheet is
 * a project file (`.paj`): its partition colors and its vector sizes the vertices when Pajek draws the network with
 * them (`pages.json` `draw`). A vertex is its number; `pages.json` `names` gives each vertex number's setting id.
 */
import { SHEET_CATEGORIES, type SheetCategory, type SpecimenFormat, type SpecimenSheet } from "../sheets.js";
import PAGES from "./pages.json";

const sheets: SpecimenSheet[] = PAGES.pages.map((p) => ({ id: p.id, file: p.file }));

const MANUAL = "https://mrvar.fdv.uni-lj.si/pajek/pajekman.pdf";

export const FORMAT: SpecimenFormat = {
    id: "pajek",
    title: "Pajek",
    graphIoFormat: "pajek",
    family: "pajek",
    sheets,
    absent: {
        "specimen-groups": {
            reason: "A Pajek network has no groups or compound vertices: clusters are a separate partition object, drawn only by recoloring the vertices (Draw > Network + Partition), never as a box around them.",
            doc: MANUAL,
        },
        "specimen-images-charts": {
            reason: "A Pajek vertex is one of nine built-in shapes (section 5.3 of the manual); the .net file has no images, custom graphics or charts.",
            doc: MANUAL,
        },
    },
    pending: SHEET_CATEGORIES.filter(
        (c: SheetCategory) =>
            !["specimen-groups", "specimen-images-charts"].includes(c) && !sheets.some((s) => s.id === c),
    ),
};
