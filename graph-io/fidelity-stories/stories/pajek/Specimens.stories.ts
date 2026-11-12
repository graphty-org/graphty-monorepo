/**
 * The Pajek specimen sheets: one story per sheet, in the same category order in every format's folder. A category's
 * first story is its .net file drawn by Pajek under its defaults (edge-labels: with Mark Lines / with Labels, without
 * which Pajek draws no line label); each further page is the same file drawn under one Draw window or export option,
 * named in the story's name. The mappings sheet is a project file (.paj) drawn with its partition and vector (Draw >
 * Network + First Partition + First Vector), again without them, and with its second vector as the height. A category the format has no setting for shows a
 * short placeholder saying so. The pages
 * are listed in `graph-io/test/fidelity/specimens/pajek/pages.json`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/pajek/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/pajek/*", "!**/*.ts", "!**/*.json"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/Pajek/Specimens" };
export default meta;

export const NodeShapes: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes", FILES),
    name: "node-shapes",
};
export const NodeShapesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p2", FILES),
    name: "node-shapes-p2 (SVG Vertices 3D Effect)",
};
export const NodeFillsBorders: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders", FILES),
    name: "node-fills-borders",
};
export const NodeFillsBordersP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p2", FILES),
    name: "node-fills-borders-p2 (named colors 49-96)",
};
export const NodeFillsBordersP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p3", FILES),
    name: "node-fills-borders-p3 (color syntaxes, bc and bw)",
};
export const NodeSizesOpacity: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity", FILES),
    name: "node-sizes-opacity",
};
export const NodeSizesOpacityP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p2", FILES),
    name: "node-sizes-opacity-p2 (Options / Size / of Vertices = 16)",
};
export const NodeSizesOpacityP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p3", FILES),
    name: "node-sizes-opacity-p3 (SVG Opacity of Vertices = 0.5)",
};
export const Labels: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels", FILES),
    name: "labels",
};
export const LabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p2", FILES),
    name: "labels-p2 (Options / Mark Vertices Using / Numbers)",
};
export const LabelsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p3", FILES),
    name: "labels-p3 (Options / Mark Vertices Using / No Labels)",
};
export const EdgesLines: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines", FILES),
    name: "edges-lines",
};
export const EdgesLinesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p2", FILES),
    name: "edges-lines-p2 (routes, loops, pairs and hooks)",
};
export const EdgesLinesP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p3", FILES),
    name: "edges-lines-p3 (SVG Opacity of Lines = 0.5)",
};
export const EdgesLinesP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p4", FILES),
    name: "edges-lines-p4 (Export Line Default / Straight Lines)",
};
export const EdgesLinesP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p5", FILES),
    name: "edges-lines-p5 (SVG Lines Color as Gradient of EndVertices)",
};
export const Arrows: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows", FILES),
    name: "arrows",
};
export const ArrowsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p2", FILES),
    name: "arrows-p2 (Options / Mark Vertices Using / No Labels no Arrows)",
};
export const ArrowsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p3", FILES),
    name: "arrows-p3 (Lines finished at Vertex Border)",
};
export const EdgeLabels: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels", FILES),
    name: "edge-labels (Options / Lines / Mark Lines / with Labels)",
};
export const EdgeLabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p2", FILES),
    name: "edge-labels-p2 (Pajek's default: Mark Lines / No)",
};
export const Groups: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups", FILES),
    name: "groups",
};
export const ImagesCharts: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts", FILES),
    name: "images-charts",
};
export const MappingsBypass: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass", FILES),
    name: "mappings-bypass",
};
export const MappingsBypassP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p2", FILES),
    name: "mappings-bypass-p2 (Draw > Network (no partition, no vector))",
};
export const MappingsBypassP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p3", FILES),
    name: "mappings-bypass-p3 (Draw > Network + First Partition + First Vector + Second Vector)",
};
