/**
 * XGMML's specimen sheets (`../sheets.ts` says what a sheet is), every one saved by Cytoscape desktop itself from the
 * sheets `generators/specimens/cytoscape-desktop.mjs` builds over CyREST (the same build saved as XGMML, CX, CX2 and a
 * session). The cytoscape-desktop family owns this file, the sheet files beside it and
 * `fidelity-stories/stories/xgmml/Specimens.stories.ts`. specimen-mappings-bypass is the style-mapped page (defaults,
 * discrete, continuous and passthrough mappings, bypasses over mappings); its later pages replay the bypass sheets
 * with every bypass turned into a discrete mapping on the name column.
 */
import type { SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "xgmml",
    title: "XGMML",
    graphIoFormat: "xgmml",
    family: "cytoscape-desktop",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.xgmml" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.xgmml.gz" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.xgmml" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.xgmml" },
        { id: "specimen-labels", file: "specimen-labels.xgmml.gz" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.xgmml.gz" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.xgmml.gz" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.xgmml" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.xgmml.gz" },
        { id: "specimen-arrows", file: "specimen-arrows.xgmml.gz" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.xgmml.gz" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.xgmml.gz" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.xgmml" },
        { id: "specimen-groups", file: "specimen-groups.xgmml.gz" },
        { id: "specimen-images-charts", file: "specimen-images-charts.xgmml.gz" },
        { id: "specimen-images-charts-p2", file: "specimen-images-charts-p2.xgmml" },
        { id: "specimen-images-charts-p3", file: "specimen-images-charts-p3.xgmml.gz" },
        { id: "specimen-images-charts-p4", file: "specimen-images-charts-p4.xgmml" },
        { id: "specimen-images-charts-p5", file: "specimen-images-charts-p5.xgmml" },
        { id: "specimen-images-charts-p6", file: "specimen-images-charts-p6.xgmml.gz" },
        { id: "specimen-images-charts-p7", file: "specimen-images-charts-p7.xgmml" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.xgmml.gz" },
        { id: "specimen-mappings-bypass-p2", file: "specimen-mappings-bypass-p2.xgmml" }, // the node-shapes sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p3", file: "specimen-mappings-bypass-p3.xgmml.gz" }, // the node-fills-borders sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p4", file: "specimen-mappings-bypass-p4.xgmml" }, // the node-sizes-opacity sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p5", file: "specimen-mappings-bypass-p5.xgmml" }, // the node-sizes-opacity-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p6", file: "specimen-mappings-bypass-p6.xgmml.gz" }, // the labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p7", file: "specimen-mappings-bypass-p7.xgmml.gz" }, // the labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p8", file: "specimen-mappings-bypass-p8.xgmml.gz" }, // the labels-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p9", file: "specimen-mappings-bypass-p9.xgmml" }, // the labels-p4 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p10", file: "specimen-mappings-bypass-p10.xgmml.gz" }, // the edges-lines sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p11", file: "specimen-mappings-bypass-p11.xgmml.gz" }, // the arrows sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p12", file: "specimen-mappings-bypass-p12.xgmml.gz" }, // the arrows-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p13", file: "specimen-mappings-bypass-p13.xgmml.gz" }, // the edge-labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p14", file: "specimen-mappings-bypass-p14.xgmml.gz" }, // the images-charts sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p15", file: "specimen-mappings-bypass-p15.xgmml" }, // the images-charts-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p16", file: "specimen-mappings-bypass-p16.xgmml.gz" }, // the images-charts-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p17", file: "specimen-mappings-bypass-p17.xgmml" }, // the edge-labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p18", file: "specimen-mappings-bypass-p18.xgmml" }, // the images-charts-p5 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p19", file: "specimen-mappings-bypass-p19.xgmml" }, // more mapping kinds: a continuous step, Boolean and Double keys, passthrough numbers and names
        // a continuous mapping onto a shape, and values exactly at a point; Cytoscape cannot reopen its own CX2 of this page
        { id: "specimen-mappings-bypass-p20", file: "specimen-mappings-bypass-p20.xgmml" },
    ],
    absent: {},
    pending: [],
};
