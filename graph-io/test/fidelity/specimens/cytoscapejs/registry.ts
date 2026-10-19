/**
 * Cytoscape.js's specimen sheets (`../sheets.ts` says what a sheet is). The cytoscapejs family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/cytoscapejs/Specimens.stories.ts`. The sheets are cy.json() documents
 * written by Cytoscape.js 3.34.3 itself, built by `../../generators/specimens/cytoscapejs.mjs` from Cytoscape.js's own
 * style property table (`cytoscapejs-vocabulary.json` beside it; `cytoscapejs-coverage.json` says which specimen
 * draws each property and value), and drawn by `../../oracles/tools/web/web-oracle.mjs cyjs` (preset layout at the
 * stored positions). Pages: labels-p2, edges-lines-p2 and arrows-p2 continue their category; mappings-bypass-p2 holds how
 * a value is spelled (color syntaxes, property aliases, camelCase names, units), its rules written as authored.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "cytoscapejs",
    title: "Cytoscape.js",
    graphIoFormat: "json",
    family: "cytoscapejs",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.json" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.json" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.json" },
        { id: "specimen-labels", file: "specimen-labels.json" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.json" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.json" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.json" },
        { id: "specimen-arrows", file: "specimen-arrows.json" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.json" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.json" },
        { id: "specimen-groups", file: "specimen-groups.json" },
        { id: "specimen-images-charts", file: "specimen-images-charts.json" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.json" },
        { id: "specimen-mappings-bypass-p2", file: "specimen-mappings-bypass-p2.json" },
    ],
    absent: {},
    pending: [],
};
