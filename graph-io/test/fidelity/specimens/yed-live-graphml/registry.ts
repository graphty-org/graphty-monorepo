/**
 * yEd Live GraphML's specimen sheets (`../sheets.ts` says what a sheet is). The yed family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/yed-live-graphml/Specimens.stories.ts`. The sheets are written by
 * `../../generators/specimens/yed.py` in yFiles for HTML 3's markup (what yEd Live writes) from the vocabulary in
 * `yed-vocabulary.json` beside it (the yFiles for HTML API reference). Their oracles are draw.io's drawings of them
 * (`../../oracles/tools/drawio.mjs`), stand-ins until the owner exports each sheet from yEd Live by hand. Pages:
 * labels-p2 wrapping and label models; groups-p2 and -p3 more GroupNodeStyle settings, nested and collapsed groups.
 * mappings-bypass: the same styles inline, by SharedData reference and by a key's default. Pages in yFiles for HTML
 * 2.6 markup, as yEd Live wrote files before its yFiles for HTML 3 update (most yEd Live files in the corpus):
 * node-shapes-p2 2.6 ShapeNodeStyle shapes, BevelNodeStyle, ShinyPlateNodeStyle, PanelNodeStyle; node-shapes-p3 the
 * flowchart palette's FlowchartNodeStyle types; labels-p3 DefaultLabelStyle; labels-p4 the 2.6 label models;
 * edges-lines-p2 and arrows-p2 the 2.6 PolylineEdgeStyle strokes and ArrowType values; node-shapes-p4 to -p6 yEd
 * Live's BPMN palette (bpmn: styles, from the yFiles for HTML 2.6 BPMN demo); node-shapes-p7 the Graphviz, UML and
 * colored-icon palette styles; labels-p5 MarkupLabelStyle, CompositeLabelModel and the BPMN label styles; groups-p4
 * GroupNodeLabelModel and a collapsed group's FolderNodeState; edge-labels-p2 the 2.6 edge label models;
 * edges-lines-p3 BpmnEdgeStyle and edges at node ports.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "yed-live-graphml",
    title: "yEd Live GraphML",
    graphIoFormat: "graphml",
    family: "yed",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.graphml" },
        { id: "specimen-node-shapes-p2", file: "specimen-node-shapes-p2.graphml" },
        { id: "specimen-node-shapes-p3", file: "specimen-node-shapes-p3.graphml" },
        { id: "specimen-node-shapes-p4", file: "specimen-node-shapes-p4.graphml" },
        { id: "specimen-node-shapes-p5", file: "specimen-node-shapes-p5.graphml" },
        { id: "specimen-node-shapes-p6", file: "specimen-node-shapes-p6.graphml" },
        { id: "specimen-node-shapes-p7", file: "specimen-node-shapes-p7.graphml" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.graphml" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.graphml" },
        { id: "specimen-labels", file: "specimen-labels.graphml" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.graphml" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.graphml" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.graphml" },
        { id: "specimen-labels-p5", file: "specimen-labels-p5.graphml" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.graphml" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.graphml" },
        { id: "specimen-edges-lines-p3", file: "specimen-edges-lines-p3.graphml" },
        { id: "specimen-arrows", file: "specimen-arrows.graphml" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.graphml" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.graphml" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.graphml" },
        { id: "specimen-groups", file: "specimen-groups.graphml" },
        { id: "specimen-groups-p2", file: "specimen-groups-p2.graphml" },
        { id: "specimen-groups-p3", file: "specimen-groups-p3.graphml" },
        { id: "specimen-groups-p4", file: "specimen-groups-p4.graphml" },
        { id: "specimen-images-charts", file: "specimen-images-charts.graphml" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.graphml" },
    ],
    absent: {},
    pending: [],
};
