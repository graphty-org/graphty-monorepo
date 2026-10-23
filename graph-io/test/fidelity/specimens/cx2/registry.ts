/**
 * CX2's specimen sheets (`../sheets.ts` says what a sheet is), every one saved by Cytoscape desktop itself from the
 * sheets `generators/specimens/cytoscape-desktop.mjs` builds over CyREST (the same build saved as XGMML, CX, CX2 and a
 * session). The cytoscape-desktop family owns this file, the sheet files beside it and
 * `fidelity-stories/stories/cx2/Specimens.stories.ts`. specimen-mappings-bypass is the style-mapped page (defaults,
 * discrete, continuous and passthrough mappings, bypasses over mappings); its later pages replay the bypass sheets
 * with every bypass turned into a discrete mapping on the name column.
 */
import type { SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "cx2",
    title: "CX2",
    graphIoFormat: "cx2",
    family: "cytoscape-desktop",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.cx2" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.cx2" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.cx2" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.cx2" },
        { id: "specimen-labels", file: "specimen-labels.cx2" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.cx2" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.cx2" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.cx2" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.cx2" },
        { id: "specimen-arrows", file: "specimen-arrows.cx2" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.cx2" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.cx2" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.cx2" },
        { id: "specimen-groups", file: "specimen-groups.cx2" },
        { id: "specimen-images-charts", file: "specimen-images-charts.cx2" },
        { id: "specimen-images-charts-p2", file: "specimen-images-charts-p2.cx2" },
        { id: "specimen-images-charts-p3", file: "specimen-images-charts-p3.cx2" },
        { id: "specimen-images-charts-p4", file: "specimen-images-charts-p4.cx2" },
        { id: "specimen-images-charts-p5", file: "specimen-images-charts-p5.cx2" },
        { id: "specimen-images-charts-p6", file: "specimen-images-charts-p6.cx2" },
        { id: "specimen-images-charts-p7", file: "specimen-images-charts-p7.cx2" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.cx2" },
        { id: "specimen-mappings-bypass-p2", file: "specimen-mappings-bypass-p2.cx2" }, // the node-shapes sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p3", file: "specimen-mappings-bypass-p3.cx2" }, // the node-fills-borders sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p4", file: "specimen-mappings-bypass-p4.cx2" }, // the node-sizes-opacity sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p5", file: "specimen-mappings-bypass-p5.cx2" }, // the node-sizes-opacity-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p6", file: "specimen-mappings-bypass-p6.cx2" }, // the labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p7", file: "specimen-mappings-bypass-p7.cx2" }, // the labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p8", file: "specimen-mappings-bypass-p8.cx2" }, // the labels-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p9", file: "specimen-mappings-bypass-p9.cx2" }, // the labels-p4 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p10", file: "specimen-mappings-bypass-p10.cx2" }, // the edges-lines sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p11", file: "specimen-mappings-bypass-p11.cx2" }, // the arrows sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p12", file: "specimen-mappings-bypass-p12.cx2" }, // the arrows-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p13", file: "specimen-mappings-bypass-p13.cx2" }, // the edge-labels sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p14", file: "specimen-mappings-bypass-p14.cx2" }, // the images-charts sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p15", file: "specimen-mappings-bypass-p15.cx2" }, // the images-charts-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p16", file: "specimen-mappings-bypass-p16.cx2" }, // the images-charts-p3 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p17", file: "specimen-mappings-bypass-p17.cx2" }, // the edge-labels-p2 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p18", file: "specimen-mappings-bypass-p18.cx2" }, // the images-charts-p5 sheet through discrete mappings on name
        { id: "specimen-mappings-bypass-p19", file: "specimen-mappings-bypass-p19.cx2" }, // more mapping kinds: a continuous step, Boolean and Double keys, passthrough numbers and names
    ],
    absent: {},
    pending: [],
};
