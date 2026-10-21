/**
 * Cytoscape session's specimen sheets (`../sheets.ts` says what a sheet is), every one saved by Cytoscape desktop itself from the
 * sheets `generators/specimens/cytoscape-desktop.mjs` builds over CyREST (the same build saved as XGMML, CX, CX2 and a
 * session). The cytoscape-desktop family owns this file, the sheet files beside it and
 * `fidelity-stories/stories/cys/Specimens.stories.ts`. specimen-mappings-bypass is the style-mapped page (defaults,
 * discrete, continuous and passthrough mappings, bypasses over mappings); its later pages replay the bypass sheets
 * with every bypass turned into a discrete mapping on the name column.
 */
import type { SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "cys",
    title: "Cytoscape session",
    graphIoFormat: "cys",
    family: "cytoscape-desktop",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.cys" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.cys" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.cys" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.cys" },
        { id: "specimen-labels", file: "specimen-labels.cys" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.cys" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.cys" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.cys" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.cys" },
        { id: "specimen-arrows", file: "specimen-arrows.cys" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.cys" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.cys" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.cys" },
        { id: "specimen-groups", file: "specimen-groups.cys" },
        { id: "specimen-images-charts", file: "specimen-images-charts.cys" },
        { id: "specimen-images-charts-p2", file: "specimen-images-charts-p2.cys" },
        { id: "specimen-images-charts-p3", file: "specimen-images-charts-p3.cys" },
        { id: "specimen-images-charts-p4", file: "specimen-images-charts-p4.cys" },
        { id: "specimen-images-charts-p5", file: "specimen-images-charts-p5.cys" },
        { id: "specimen-images-charts-p6", file: "specimen-images-charts-p6.cys" },
        { id: "specimen-images-charts-p7", file: "specimen-images-charts-p7.cys" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.cys" },
        { id: "specimen-mappings-bypass-p2", file: "specimen-mappings-bypass-p2.cys" }, // the node-shapes sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p3", file: "specimen-mappings-bypass-p3.cys" }, // the node-fills-borders sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p4", file: "specimen-mappings-bypass-p4.cys" }, // the node-sizes-opacity sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p5", file: "specimen-mappings-bypass-p5.cys" }, // the node-sizes-opacity-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p6", file: "specimen-mappings-bypass-p6.cys" }, // the labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p7", file: "specimen-mappings-bypass-p7.cys" }, // the labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p8", file: "specimen-mappings-bypass-p8.cys" }, // the labels-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p9", file: "specimen-mappings-bypass-p9.cys" }, // the labels-p4 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p10", file: "specimen-mappings-bypass-p10.cys" }, // the edges-lines sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p11", file: "specimen-mappings-bypass-p11.cys" }, // the arrows sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p12", file: "specimen-mappings-bypass-p12.cys" }, // the arrows-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p13", file: "specimen-mappings-bypass-p13.cys" }, // the edge-labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p14", file: "specimen-mappings-bypass-p14.cys" }, // the images-charts sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p15", file: "specimen-mappings-bypass-p15.cys" }, // the images-charts-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p16", file: "specimen-mappings-bypass-p16.cys" }, // the images-charts-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p17", file: "specimen-mappings-bypass-p17.cys" }, // the edge-labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p18", file: "specimen-mappings-bypass-p18.cys" }, // the images-charts-p5 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p19", file: "specimen-mappings-bypass-p19.cys" }, // more mapping kinds: a continuous step, Boolean and Double keys, passthrough numbers and names
        // a continuous mapping onto a shape, and values exactly at a point; Cytoscape cannot reopen its own CX2 of this page
        { id: "specimen-mappings-bypass-p20", file: "specimen-mappings-bypass-p20.cys" },
    ],
    absent: {},
    pending: [],
};
