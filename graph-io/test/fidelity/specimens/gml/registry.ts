/**
 * GML's specimen sheets (`../sheets.ts` says what a sheet is). The gml family owns this file, the sheet files beside it
 * and `fidelity-stories/stories/gml/Specimens.stories.ts`. The sheets are written by
 * `../../generators/specimens/gml.py` from `gml-vocabulary.json` beside it (Himsolt's GML draft and Tk for the keys of
 * a file with no Creator line; yEd's own enumerations and files for yEd's keys; Cytoscape's GML reader for Cytoscape
 * 2.x's numbered arrows). Every oracle is a stand-in, since no program that writes GML can be automated here:
 * Cytoscape desktop's GML reader or gml2gv | neato -n2, whichever reads the sheet's keys (`oracle-routes.json`).
 * Pages: p2 and later are yEd's keys (node-shapes-p3 its flowchart configurations, labels-p3 its label models,
 * arrows-p2 / p3 target and source arrows); arrows-p4 is Cytoscape 2.x's numbered arrows.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "gml",
    title: "GML",
    graphIoFormat: "gml",
    family: "gml",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.gml" },
        { id: "specimen-node-shapes-p2", file: "specimen-node-shapes-p2.gml" },
        { id: "specimen-node-shapes-p3", file: "specimen-node-shapes-p3.gml" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.gml" },
        { id: "specimen-node-fills-borders-p2", file: "specimen-node-fills-borders-p2.gml" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.gml" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.gml" },
        { id: "specimen-labels", file: "specimen-labels.gml" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.gml" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.gml" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.gml" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.gml" },
        { id: "specimen-arrows", file: "specimen-arrows.gml" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.gml" },
        { id: "specimen-arrows-p3", file: "specimen-arrows-p3.gml" },
        { id: "specimen-arrows-p4", file: "specimen-arrows-p4.gml" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.gml" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.gml" },
        { id: "specimen-groups", file: "specimen-groups.gml" },
        { id: "specimen-images-charts", file: "specimen-images-charts.gml" },
    ],
    absent: {
        "specimen-mappings-bypass": {
            reason: "GML has no style defaults, mappings or classes: every graphics key is written on its own node or edge.",
            doc: "http://web.archive.org/web/20190718030537/http://www.fim.uni-passau.de:80/fileadmin/files/lehrstuhl/brandenburg/projekte/gml/gml-technical-report.pdf",
        },
    },
    pending: [],
};
