/**
 * The Cytoscape.js specimen sheets: one story per sheet category, in the same order in every format's folder. A category
 * the format has no setting for, or one not built yet, shows a short placeholder saying so. A second page of a
 * category is one more story here (`NodeShapesP2` for `specimen-node-shapes-p2`); the sheets themselves are listed
 * in `graph-io/test/fidelity/specimens/cytoscapejs/registry.ts`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/cytoscapejs/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/cytoscapejs/*", "!**/*.ts"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/Cytoscape.js/Specimens" };
export default meta;

export const NodeShapes: StoryObj = { ...specimenStory(FORMAT, "specimen-node-shapes", FILES), name: "node-shapes" };
export const NodeFillsBorders: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders", FILES),
    name: "node-fills-borders",
};
export const NodeSizesOpacity: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity", FILES),
    name: "node-sizes-opacity",
};
export const Labels: StoryObj = { ...specimenStory(FORMAT, "specimen-labels", FILES), name: "labels" };
export const LabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p2", FILES),
    name: "labels-p2",
};
export const EdgesLines: StoryObj = { ...specimenStory(FORMAT, "specimen-edges-lines", FILES), name: "edges-lines" };
export const EdgesLinesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p2", FILES),
    name: "edges-lines-p2",
};
export const Arrows: StoryObj = { ...specimenStory(FORMAT, "specimen-arrows", FILES), name: "arrows" };
export const ArrowsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p2", FILES),
    name: "arrows-p2",
};
export const EdgeLabels: StoryObj = { ...specimenStory(FORMAT, "specimen-edge-labels", FILES), name: "edge-labels" };
export const Groups: StoryObj = { ...specimenStory(FORMAT, "specimen-groups", FILES), name: "groups" };
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
    name: "mappings-bypass-p2",
};
