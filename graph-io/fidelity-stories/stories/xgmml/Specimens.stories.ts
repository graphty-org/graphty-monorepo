/**
 * The XGMML specimen sheets: one story per sheet category, in the same order in every format's folder. A category
 * the format has no setting for, or one not built yet, shows a short placeholder saying so. A second page of a
 * category is one more story here (`NodeShapesP2` for `specimen-node-shapes-p2`); the sheets themselves are listed
 * in `graph-io/test/fidelity/specimens/xgmml/registry.ts`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/xgmml/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/xgmml/*", "!**/*.ts"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/XGMML/Specimens" };
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
export const NodeSizesOpacityP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p2", FILES),
    name: "node-sizes-opacity-p2",
};
export const Labels: StoryObj = { ...specimenStory(FORMAT, "specimen-labels", FILES), name: "labels" };
export const LabelsP2: StoryObj = { ...specimenStory(FORMAT, "specimen-labels-p2", FILES), name: "labels-p2" };
export const LabelsP3: StoryObj = { ...specimenStory(FORMAT, "specimen-labels-p3", FILES), name: "labels-p3" };
export const LabelsP4: StoryObj = { ...specimenStory(FORMAT, "specimen-labels-p4", FILES), name: "labels-p4" };
export const EdgesLines: StoryObj = { ...specimenStory(FORMAT, "specimen-edges-lines", FILES), name: "edges-lines" };
export const Arrows: StoryObj = { ...specimenStory(FORMAT, "specimen-arrows", FILES), name: "arrows" };
export const ArrowsP2: StoryObj = { ...specimenStory(FORMAT, "specimen-arrows-p2", FILES), name: "arrows-p2" };
export const EdgeLabels: StoryObj = { ...specimenStory(FORMAT, "specimen-edge-labels", FILES), name: "edge-labels" };
export const EdgeLabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p2", FILES),
    name: "edge-labels-p2",
};
export const Groups: StoryObj = { ...specimenStory(FORMAT, "specimen-groups", FILES), name: "groups" };
export const ImagesCharts: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts", FILES),
    name: "images-charts",
};
export const ImagesChartsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p2", FILES),
    name: "images-charts-p2",
};
export const ImagesChartsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p3", FILES),
    name: "images-charts-p3",
};
export const ImagesChartsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p4", FILES),
    name: "images-charts-p4",
};
export const ImagesChartsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p5", FILES),
    name: "images-charts-p5",
};
export const ImagesChartsP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p6", FILES),
    name: "images-charts-p6",
};
export const ImagesChartsP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p7", FILES),
    name: "images-charts-p7",
};
export const MappingsBypass: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass", FILES),
    name: "mappings-bypass",
};
export const MappingsBypassP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p2", FILES),
    name: "mappings-bypass-p2",
};
export const MappingsBypassP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p3", FILES),
    name: "mappings-bypass-p3",
};
export const MappingsBypassP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p4", FILES),
    name: "mappings-bypass-p4",
};
export const MappingsBypassP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p5", FILES),
    name: "mappings-bypass-p5",
};
export const MappingsBypassP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p6", FILES),
    name: "mappings-bypass-p6",
};
export const MappingsBypassP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p7", FILES),
    name: "mappings-bypass-p7",
};
export const MappingsBypassP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p8", FILES),
    name: "mappings-bypass-p8",
};
export const MappingsBypassP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p9", FILES),
    name: "mappings-bypass-p9",
};
export const MappingsBypassP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p10", FILES),
    name: "mappings-bypass-p10",
};
export const MappingsBypassP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p11", FILES),
    name: "mappings-bypass-p11",
};
export const MappingsBypassP12: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p12", FILES),
    name: "mappings-bypass-p12",
};
export const MappingsBypassP13: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p13", FILES),
    name: "mappings-bypass-p13",
};
export const MappingsBypassP14: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p14", FILES),
    name: "mappings-bypass-p14",
};
export const MappingsBypassP15: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p15", FILES),
    name: "mappings-bypass-p15",
};
export const MappingsBypassP16: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p16", FILES),
    name: "mappings-bypass-p16",
};
export const MappingsBypassP17: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p17", FILES),
    name: "mappings-bypass-p17",
};
export const MappingsBypassP18: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p18", FILES),
    name: "mappings-bypass-p18",
};
export const MappingsBypassP19: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p19", FILES),
    name: "mappings-bypass-p19",
};
export const MappingsBypassP20: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass-p20", FILES),
    name: "mappings-bypass-p20",
};
