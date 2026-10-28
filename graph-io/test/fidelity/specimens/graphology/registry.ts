/**
 * graphology's specimen sheets (`../sheets.ts` says what a sheet is). The graphology-sigma family owns this file, the
 * sheet files beside it and `fidelity-stories/stories/graphology/Specimens.stories.ts`.
 *
 * The sheets are the pages of `pages.json`, written with the sheet files by
 * `../../generators/specimens/graphology.mjs` (graphology's own `graph.export()`), which sweeps what sigma.js 4 reads
 * of a graphology file (`graphology-vocabulary.json` beside it; `graphology-coverage.json` names the specimen of each
 * entry), and drawn by `../../oracles/tools/web/web-oracle.mjs sigma` with sigma's default settings. sigma settings
 * are the application's, never part of the file, so a page drawn under one more setting (`edge-labels-p2`:
 * renderEdgeLabels, `-p3`: also edgeLabelAnchors "allNodes") shares its first page's file. node-fills-borders-p2 to
 * -p6 are sigma's 148 color names.
 */
import { type SpecimenFormat, type SpecimenSheet } from "../sheets.js";
import PAGES from "./pages.json";

const sheets: SpecimenSheet[] = PAGES.pages.map((p) => ({ id: p.id, file: p.file }));

export const FORMAT: SpecimenFormat = {
    id: "graphology",
    title: "graphology",
    graphIoFormat: "json",
    family: "graphology-sigma",
    sheets,
    absent: PAGES.absent,
    pending: [],
};
