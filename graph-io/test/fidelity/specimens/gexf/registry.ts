/**
 * GEXF's specimen sheets (`../sheets.ts` says what a sheet is). The gexf-gephi family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/gexf/Specimens.stories.ts`.
 *
 * The sheets are the pages of `pages.json`, written by `../../generators/specimens/gexf-gephi.mjs` with the sheet
 * files: each category's file drawn by Gephi under its defaults (the first page), and again under one Gephi
 * Preview setting per further page (`-p2`, `-p3`, ...; `pages.json` names the setting). Preview settings are
 * Gephi's own, global, and not stored in a GEXF file, so a page's file is the same file as its first page's.
 */
import { SHEET_CATEGORIES, type SheetCategory, type SpecimenFormat, type SpecimenSheet } from "../sheets.js";
import PAGES from "./pages.json";

const sheets: SpecimenSheet[] = PAGES.pages.map((p) => ({ id: p.id, file: p.file }));

export const FORMAT: SpecimenFormat = {
    id: "gexf",
    title: "GEXF",
    graphIoFormat: "gexf",
    family: "gexf-gephi",
    sheets,
    absent: {
        "specimen-mappings-bypass": {
            reason: "GEXF stores each element's viz values on the element itself; it has no style defaults, mappings, classes or selectors to reach the same values another way.",
            doc: "https://gexf.net/viz.html",
        },
    },
    pending: SHEET_CATEGORIES.filter(
        (c: SheetCategory) => c !== "specimen-mappings-bypass" && !sheets.some((s) => s.id === c),
    ),
};
