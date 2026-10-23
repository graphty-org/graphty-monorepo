/**
 * The yEd Live GraphML specimen sheets: one story per sheet category, in the same order in every format's folder. A category
 * the format has no setting for, or one not built yet, shows a short placeholder saying so. A second page of a
 * category is one more story here (`NodeShapesP2` for `specimen-node-shapes-p2`); the sheets themselves are listed
 * in `graph-io/test/fidelity/specimens/yed-live-graphml/registry.ts`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/yed-live-graphml/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/yed-live-graphml/*", "!**/*.ts"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/yEd Live GraphML/Specimens" };
export default meta;

export const NodeShapes: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes", FILES),
    name: "node-shapes",
};
export const NodeShapesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p2", FILES),
    name: "node-shapes-p2",
};
export const NodeShapesP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p3", FILES),
    name: "node-shapes-p3",
};
export const NodeShapesP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p4", FILES),
    name: "node-shapes-p4",
};
export const NodeShapesP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p5", FILES),
    name: "node-shapes-p5",
};
export const NodeShapesP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p6", FILES),
    name: "node-shapes-p6",
};
export const NodeShapesP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p7", FILES),
    name: "node-shapes-p7",
};
export const NodeFillsBorders: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders", FILES),
    name: "node-fills-borders",
};
export const NodeSizesOpacity: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity", FILES),
    name: "node-sizes-opacity",
};
export const Labels: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels", FILES),
    name: "labels",
};
export const LabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p2", FILES),
    name: "labels-p2",
};
export const LabelsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p3", FILES),
    name: "labels-p3",
};
export const LabelsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p4", FILES),
    name: "labels-p4",
};
export const LabelsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p5", FILES),
    name: "labels-p5",
};
export const EdgesLines: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines", FILES),
    name: "edges-lines",
};
export const EdgesLinesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p2", FILES),
    name: "edges-lines-p2",
};
export const EdgesLinesP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p3", FILES),
    name: "edges-lines-p3",
};
export const Arrows: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows", FILES),
    name: "arrows",
};
export const ArrowsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p2", FILES),
    name: "arrows-p2",
};
export const EdgeLabels: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels", FILES),
    name: "edge-labels",
};
export const EdgeLabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p2", FILES),
    name: "edge-labels-p2",
};
export const Groups: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups", FILES),
    name: "groups",
};
export const GroupsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p2", FILES),
    name: "groups-p2",
};
export const GroupsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p3", FILES),
    name: "groups-p3",
};
export const GroupsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p4", FILES),
    name: "groups-p4",
};
export const ImagesCharts: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts", FILES),
    name: "images-charts",
};
export const MappingsBypass: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass", FILES),
    name: "mappings-bypass",
};
