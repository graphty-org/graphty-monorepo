/**
 * The Graphviz DOT specimen sheets: one story per sheet category, in the same order in every format's folder. A category
 * the format has no setting for, or one not built yet, shows a short placeholder saying so. A second page of a
 * category is one more story here (`NodeShapesP2` for `specimen-node-shapes-p2`); the sheets themselves are listed
 * in `graph-io/test/fidelity/specimens/dot/registry.ts`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/dot/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/dot/*", "!**/*.ts"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/Graphviz DOT/Specimens" };
export default meta;

export const NodeShapes: StoryObj = { ...specimenStory(FORMAT, "specimen-node-shapes", FILES), name: "node-shapes" };
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
export const NodeFillsBorders: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders", FILES),
    name: "node-fills-borders",
};
export const NodeFillsBordersP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p2", FILES),
    name: "node-fills-borders-p2",
};
export const NodeSizesOpacity: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity", FILES),
    name: "node-sizes-opacity",
};
export const NodeSizesOpacityP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p2", FILES),
    name: "node-sizes-opacity-p2",
};
export const NodeSizesOpacityP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p3", FILES),
    name: "node-sizes-opacity-p3",
};
export const NodeSizesOpacityP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p4", FILES),
    name: "node-sizes-opacity-p4",
};
export const Labels: StoryObj = { ...specimenStory(FORMAT, "specimen-labels", FILES), name: "labels" };
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
export const EdgesLines: StoryObj = { ...specimenStory(FORMAT, "specimen-edges-lines", FILES), name: "edges-lines" };
export const EdgesLinesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p2", FILES),
    name: "edges-lines-p2",
};
export const EdgesLinesP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p3", FILES),
    name: "edges-lines-p3",
};
export const EdgesLinesP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p4", FILES),
    name: "edges-lines-p4",
};
export const EdgesLinesP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p5", FILES),
    name: "edges-lines-p5",
};
export const EdgesLinesP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p6", FILES),
    name: "edges-lines-p6",
};
export const EdgesLinesP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p7", FILES),
    name: "edges-lines-p7",
};
export const EdgesLinesP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p8", FILES),
    name: "edges-lines-p8",
};
export const EdgesLinesP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p9", FILES),
    name: "edges-lines-p9",
};
export const EdgesLinesP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p10", FILES),
    name: "edges-lines-p10",
};
export const EdgesLinesP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p11", FILES),
    name: "edges-lines-p11",
};
export const Arrows: StoryObj = { ...specimenStory(FORMAT, "specimen-arrows", FILES), name: "arrows" };
export const ArrowsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p2", FILES),
    name: "arrows-p2",
};
export const ArrowsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p3", FILES),
    name: "arrows-p3",
};
export const ArrowsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p4", FILES),
    name: "arrows-p4",
};
export const EdgeLabels: StoryObj = { ...specimenStory(FORMAT, "specimen-edge-labels", FILES), name: "edge-labels" };
export const Groups: StoryObj = { ...specimenStory(FORMAT, "specimen-groups", FILES), name: "groups" };
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
export const GroupsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p5", FILES),
    name: "groups-p5",
};
export const GroupsP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p6", FILES),
    name: "groups-p6",
};
export const GroupsP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p7", FILES),
    name: "groups-p7",
};
export const GroupsP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p8", FILES),
    name: "groups-p8",
};
export const GroupsP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p9", FILES),
    name: "groups-p9",
};
export const GroupsP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p10", FILES),
    name: "groups-p10",
};
export const GroupsP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p11", FILES),
    name: "groups-p11",
};
export const GroupsP12: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p12", FILES),
    name: "groups-p12",
};
export const GroupsP13: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p13", FILES),
    name: "groups-p13",
};
export const GroupsP14: StoryObj = {
    ...specimenStory(FORMAT, "specimen-groups-p14", FILES),
    name: "groups-p14",
};
export const ImagesCharts: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts", FILES),
    name: "images-charts",
};
export const MappingsBypass: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass", FILES),
    name: "mappings-bypass",
};
