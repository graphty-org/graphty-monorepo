/**
 * Graphviz DOT's specimen sheets (`../sheets.ts` says what a sheet is). The graphviz-dot family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/dot/Specimens.stories.ts`. The sheets are written by
 * `../../generators/specimens/graphviz.py` from Graphviz's documented vocabulary (`graphviz-vocabulary.json` beside it)
 * and drawn by `../../oracles/tools/graphviz.mjs` (neato -n2 at the stored positions). Pages: node-shapes-p2 records and
 * polygon parameters; node-fills-borders-p2 borders; node-sizes-opacity-p2..p3 outputorder nodesfirst and
 * edgesfirst; labels-p2..p3 HTML-like labels; labels-p4 forcelabels=false; edges-lines-p2..p7 one per splines value
 * (spline, polyline, curved, ortho, line, none); arrows-p2 tails, dir, size and color; arrows-p3 an undirected graph;
 * arrows-p4 a strict digraph; groups-p2..p7 the root graph's background and label.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "dot",
    title: "Graphviz DOT",
    graphIoFormat: "dot",
    family: "graphviz-dot",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.gv" },
        { id: "specimen-node-shapes-p2", file: "specimen-node-shapes-p2.gv" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.gv" },
        { id: "specimen-node-fills-borders-p2", file: "specimen-node-fills-borders-p2.gv" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.gv" },
        { id: "specimen-node-sizes-opacity-p2", file: "specimen-node-sizes-opacity-p2.gv" },
        { id: "specimen-node-sizes-opacity-p3", file: "specimen-node-sizes-opacity-p3.gv" },
        { id: "specimen-labels", file: "specimen-labels.gv" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.gv" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.gv" },
        { id: "specimen-labels-p4", file: "specimen-labels-p4.gv" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.gv" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.gv" },
        { id: "specimen-edges-lines-p3", file: "specimen-edges-lines-p3.gv" },
        { id: "specimen-edges-lines-p4", file: "specimen-edges-lines-p4.gv" },
        { id: "specimen-edges-lines-p5", file: "specimen-edges-lines-p5.gv" },
        { id: "specimen-edges-lines-p6", file: "specimen-edges-lines-p6.gv" },
        { id: "specimen-edges-lines-p7", file: "specimen-edges-lines-p7.gv" },
        { id: "specimen-arrows", file: "specimen-arrows.gv" },
        { id: "specimen-arrows-p2", file: "specimen-arrows-p2.gv" },
        { id: "specimen-arrows-p3", file: "specimen-arrows-p3.gv" },
        { id: "specimen-arrows-p4", file: "specimen-arrows-p4.gv" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.gv" },
        { id: "specimen-groups", file: "specimen-groups.gv" },
        { id: "specimen-groups-p2", file: "specimen-groups-p2.gv" },
        { id: "specimen-groups-p3", file: "specimen-groups-p3.gv" },
        { id: "specimen-groups-p4", file: "specimen-groups-p4.gv" },
        { id: "specimen-groups-p5", file: "specimen-groups-p5.gv" },
        { id: "specimen-groups-p6", file: "specimen-groups-p6.gv" },
        { id: "specimen-groups-p7", file: "specimen-groups-p7.gv" },
        { id: "specimen-images-charts", file: "specimen-images-charts.gv" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.gv" },
    ],
    absent: {},
    pending: [],
};
