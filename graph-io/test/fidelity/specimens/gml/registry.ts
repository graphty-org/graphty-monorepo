/**
 * GML's specimen sheets (`../sheets.ts` says what a sheet is). The gml family owns this file, the sheet files beside it
 * and `fidelity-stories/stories/gml/Specimens.stories.ts`. The sheets are written by
 * `../../generators/specimens/gml.py` from `gml-vocabulary.json` beside it (Himsolt's GML draft and Tk for the keys of
 * a file with no Creator line; yEd's own enumerations and files for yEd's keys; Cytoscape's GML reader and CyREST for
 * Cytoscape 2.x's keys; OGDF's headers and writer for OGDF's keys). The GML draft's sheets are drawn by OGDF as written
 * (`oracles/tools/ogdf.mjs`, route ogdf-draw), except edges-lines, which crashes OGDF's reader and keeps gml2gv as its
 * stand-in. The oracles of yEd's keys are stand-ins, since yEd cannot be automated here: Cytoscape desktop's GML reader
 * or gml2gv | neato -n2, whichever reads the sheet's keys (`oracle-routes.json`).
 * Pages: the first page of a category holds the GML draft's keys, p2 and p3 yEd's keys (node-shapes-p3 its flowchart
 * configurations, labels-p3 its label models, arrows-p2 / p3 target and source arrows); arrows-p4 and the p3 / p4
 * pages written under Creator "Cytoscape" (node-shapes-p4, node-fills-borders-p3, node-sizes-opacity-p3, labels-p4,
 * edges-lines-p3) hold Cytoscape 2.x's keys, drawn by Cytoscape's own GML reader; node-shapes-p5,
 * node-fills-borders-p4, node-sizes-opacity-p4, labels-p5, edges-lines-p4, arrows-p5, edge-labels-p3 and groups-p2
 * are OGDF's keys, written and drawn by OGDF itself (`oracles/tools/ogdf.mjs`); node-fills-borders-p5,
 * node-sizes-opacity-p5, labels-p6, edges-lines-p5, arrows-p6 and edge-labels-p4 are Gephi's keys, drawn by Gephi itself
 * (`oracles/tools/gephi.mjs`); node-shapes-p6 / p7, node-fills-borders-p6, node-sizes-opacity-p6, labels-p7 / p8 (p8
 * written by `gv2gml -y`), edges-lines-p6, arrows-p7 / p8 and edge-labels-p5 are written by Graphviz's gv2gml from the
 * DOT files in `graphviz/`, which Graphviz itself draws (`oracles/tools/graphviz.mjs`, `../../generators/specimens/gml_graphviz.py`).
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
        { id: "specimen-node-shapes-p4", file: "specimen-node-shapes-p4.gml" },
        { id: "specimen-node-shapes-p5", file: "specimen-node-shapes-p5.gml" },
        { id: "specimen-node-shapes-p6", file: "specimen-node-shapes-p6.gml" },
        { id: "specimen-node-shapes-p7", file: "specimen-node-shapes-p7.gml" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.gml" },
        { id: "specimen-node-fills-borders-p2", file: "specimen-node-fills-borders-p2.gml" },
        { id: "specimen-node-fills-borders-p3", file: "specimen-node-fills-borders-p3.gml" },
        { id: "specimen-node-fills-borders-p4", file: "specimen-node-fills-borders-p4.gml" },
        { id: "specimen-node-fills-borders-p5", file: "specimen-node-fills-borders-p5.gml" },
        { id: "specimen-node-fills-borders-p6", file: "specimen-node-fills-borders-p6.gml" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.gml" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.gml" },
        { id: "specimen-node-sizes-opacity-p3", file: "specimen-node-sizes-opacity-p3.gml" },
        { id: "specimen-node-sizes-opacity-p4", file: "specimen-node-sizes-opacity-p4.gml" },
        { id: "specimen-node-sizes-opacity-p5", file: "specimen-node-sizes-opacity-p5.gml" },
        { id: "specimen-node-sizes-opacity-p6", file: "specimen-node-sizes-opacity-p6.gml" },
        { id: "specimen-labels", file: "specimen-labels.gml" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.gml" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.gml" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.gml" },
        { id: "specimen-labels-p5", file: "specimen-labels-p5.gml" },
        { id: "specimen-labels-p6", file: "specimen-labels-p6.gml" },
        { id: "specimen-labels-p7", file: "specimen-labels-p7.gml" },
        { id: "specimen-labels-p8", file: "specimen-labels-p8.gml" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.gml" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.gml" },
        { id: "specimen-edges-lines-p3", file: "specimen-edges-lines-p3.gml" },
        { id: "specimen-edges-lines-p4", file: "specimen-edges-lines-p4.gml" },
        { id: "specimen-edges-lines-p5", file: "specimen-edges-lines-p5.gml" },
        { id: "specimen-edges-lines-p6", file: "specimen-edges-lines-p6.gml" },
        { id: "specimen-arrows", file: "specimen-arrows.gml" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.gml" },
        { id: "specimen-arrows-p3", file: "specimen-arrows-p3.gml" },
        { id: "specimen-arrows-p4", file: "specimen-arrows-p4.gml" },
        { id: "specimen-arrows-p5", file: "specimen-arrows-p5.gml" },
        { id: "specimen-arrows-p6", file: "specimen-arrows-p6.gml" },
        { id: "specimen-arrows-p7", file: "specimen-arrows-p7.gml" },
        { id: "specimen-arrows-p8", file: "specimen-arrows-p8.gml" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.gml" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.gml" },
        { id: "specimen-edge-labels-p3", file: "specimen-edge-labels-p3.gml" },
        { id: "specimen-edge-labels-p4", file: "specimen-edge-labels-p4.gml" },
        { id: "specimen-edge-labels-p5", file: "specimen-edge-labels-p5.gml" },
        { id: "specimen-groups", file: "specimen-groups.gml" },
        { id: "specimen-groups-p2", file: "specimen-groups-p2.gml" },
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
