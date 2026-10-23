/**
 * yEd GraphML's specimen sheets (`../sheets.ts` says what a sheet is). The yed family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/yed-graphml/Specimens.stories.ts`. The sheets are written by
 * `../../generators/specimens/yed.py` in yEd's own markup from the vocabulary in `yed-vocabulary.json` beside it
 * (ygraphics.xsd, yFiles 2.19's shape and arrow constants, what yEd writes in the corpus). Their oracles are draw.io's
 * drawings of them (`../../oracles/tools/drawio.mjs`), stand-ins until the owner exports each sheet from yEd by hand:
 * yEd's license forbids automating it. Pages: node-shapes-p2 and -p3 GenericNode configurations and UML nodes;
 * node-shapes-p4 to -p6 the BPMN palette's style properties (event, gateway, task, artifact, data object, activity and
 * conversation types, event characteristics, activity types, markers, icon colors; values from the yFiles BPMN
 * javadoc); labels-p2 label models and positions; groups-p2 table lane style, section color, header height, lane labels, BPMN pools and the SBGN complex.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "yed-graphml",
    title: "yEd GraphML",
    graphIoFormat: "graphml",
    family: "yed",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.graphml" },
        { id: "specimen-node-shapes-p2", file: "specimen-node-shapes-p2.graphml" },
        { id: "specimen-node-shapes-p3", file: "specimen-node-shapes-p3.graphml" },
        { id: "specimen-node-shapes-p4", file: "specimen-node-shapes-p4.graphml" },
        { id: "specimen-node-shapes-p5", file: "specimen-node-shapes-p5.graphml" },
        { id: "specimen-node-shapes-p6", file: "specimen-node-shapes-p6.graphml" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.graphml" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.graphml" },
        { id: "specimen-labels", file: "specimen-labels.graphml" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.graphml" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.graphml" },
        { id: "specimen-arrows", file: "specimen-arrows.graphml" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.graphml" },
        { id: "specimen-groups", file: "specimen-groups.graphml" },
        { id: "specimen-groups-p2", file: "specimen-groups-p2.graphml" },
        { id: "specimen-images-charts", file: "specimen-images-charts.graphml" },
    ],
    absent: {
        "specimen-mappings-bypass": {
            reason: "yEd GraphML stores each element's final style in its own realizer: yEd's Properties Mapper applies data-driven styles in the editor and saves only their results, so a file has no mappings or defaults layer.",
            doc: "https://yed.yworks.com/support/manual/properties_mapper.html",
        },
    },
    pending: [],
};
