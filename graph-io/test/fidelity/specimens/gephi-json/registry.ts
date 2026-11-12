/**
 * Gephi JSON's specimen sheets (`../sheets.ts` says what a sheet is). The gephi-json family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/gephi-json/Specimens.stories.ts`. The sheets are written the way the
 * Gephi JSON Exporter plugin writes a file (Gson's output of its node and edge model) by
 * `../../generators/specimens/gephi-json.mjs`, from the plugin's own key list (`gephi-json-vocabulary.json` beside it),
 * and drawn by `../../oracles/tools/web/web-oracle.mjs sigma`: sigma.js with its default settings, the program these
 * exports are made for (Gephi itself never reads them back). The plugin writes only id, label, x, y, size and color for
 * a node and id, source, target, label, size and color for an edge, so most categories are absent.
 */
import { type SpecimenFormat } from "../sheets.js";

const DOC = "https://gephi.org/plugins/";

export const FORMAT: SpecimenFormat = {
    id: "gephi-json",
    title: "Gephi JSON",
    graphIoFormat: "json",
    family: "gephi-json",
    sheets: [
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.json" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.json" },
        { id: "specimen-labels", file: "specimen-labels.json" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.json" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.json" },
    ],
    absent: {
        "specimen-node-shapes": {
            reason: "The Gephi JSON exporter writes no node shape: every node is a disc of its size.",
            doc: DOC,
        },
        "specimen-arrows": {
            reason: "The Gephi JSON exporter writes no edge direction and no arrow setting, and sigma.js draws its edges without heads.",
            doc: DOC,
        },
        "specimen-groups": {
            reason: "The Gephi JSON exporter writes a flat list of nodes and edges, with no groups, clusters or hierarchy.",
            doc: DOC,
        },
        "specimen-images-charts": {
            reason: "The Gephi JSON exporter writes no node images or custom graphics.",
            doc: DOC,
        },
        "specimen-mappings-bypass": {
            reason: "The Gephi JSON exporter writes each element's own resolved size and color; it has no style defaults, mappings or classes to reach them another way.",
            doc: DOC,
        },
    },
    pending: [],
};
