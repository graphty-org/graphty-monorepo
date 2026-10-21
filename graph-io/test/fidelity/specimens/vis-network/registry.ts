/**
 * vis-network's specimen sheets (`../sheets.ts` says what a sheet is). The vis-network family owns this file, the sheet
 * files beside it and `fidelity-stories/stories/vis-network/Specimens.stories.ts`. The sheets are the
 * `{ nodes, edges, options }` documents a page hands to `new vis.Network(container, { nodes, edges }, options)`
 * (vis-network has no file writer), built by `../../generators/specimens/vis-network.mjs` from vis-network 9.1.9's own
 * option table (`vis-network-vocabulary.json` beside it; `vis-network-coverage.json` says which specimen draws each
 * option and value), with physics off and every position stored, and drawn by
 * `../../oracles/tools/web/web-oracle.mjs vis`. Pages: labels-p2 continues the labels; labels-p3 and edge-labels-p2
 * hold the multi-font modifiers given as text (`font.bold: "18px arial green"`); edges-lines-p2 holds the edges
 * with a `value` (vis-network resets every other edge's width once one edge has a value); edges-lines-p3 holds the
 * curved-edge background, shadow, roundness and color-syntax sweeps; groups-p2 is the groups sheet
 * again under `groups.useDefaultGroups: false`, which vis-network 9.1.9 ignores. vis-network has no charts or custom
 * graphics a document can hold (the `custom` shape draws with a function), so images-charts holds images and icons.
 */
import { type SpecimenFormat } from "../sheets.js";

export const FORMAT: SpecimenFormat = {
    id: "vis-network",
    title: "vis-network",
    graphIoFormat: "json",
    family: "vis-network",
    sheets: [
        { id: "specimen-node-shapes", file: "specimen-node-shapes.json" },
        { id: "specimen-node-fills-borders", file: "specimen-node-fills-borders.json" },
        { id: "specimen-node-sizes-opacity", file: "specimen-node-sizes-opacity.json" },
        { id: "specimen-labels", file: "specimen-labels.json" },
        { id: "specimen-labels-p2", file: "specimen-labels-p2.json" },
        { id: "specimen-labels-p3", file: "specimen-labels-p3.json" },
        { id: "specimen-edges-lines", file: "specimen-edges-lines.json" },
        { id: "specimen-edges-lines-p2", file: "specimen-edges-lines-p2.json" },
        { id: "specimen-edges-lines-p3", file: "specimen-edges-lines-p3.json" },
        { id: "specimen-arrows", file: "specimen-arrows.json" },
        { id: "specimen-edge-labels", file: "specimen-edge-labels.json" },
        { id: "specimen-edge-labels-p2", file: "specimen-edge-labels-p2.json" },
        { id: "specimen-groups", file: "specimen-groups.json" },
        { id: "specimen-groups-p2", file: "specimen-groups-p2.json" },
        { id: "specimen-images-charts", file: "specimen-images-charts.json" },
        { id: "specimen-mappings-bypass", file: "specimen-mappings-bypass.json" },
    ],
    absent: {},
    pending: [],
};
