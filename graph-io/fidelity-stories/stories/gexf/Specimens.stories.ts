/**
 * The GEXF specimen sheets: one story per sheet, in the same category order in every format's folder. A category's
 * first story is its file drawn under Gephi's defaults; each further page (`-p2`, ...) is the same file drawn by
 * Gephi under one Preview setting, named in the story's name. A category the format has no setting for shows a
 * short placeholder saying so. The pages are listed in `graph-io/test/fidelity/specimens/gexf/pages.json`.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FORMAT } from "../../../test/fidelity/specimens/gexf/registry";
import { specimenStory } from "../fidelity";

/** Every sheet file of this format, by path, as the build serves it. */
const FILES = import.meta.glob<string>(["../../../test/fidelity/specimens/gexf/*", "!**/*.ts", "!**/*.json"], {
    query: "?url",
    import: "default",
    eager: true,
});

const meta: Meta = { title: "Style Fidelity/GEXF/Specimens" };
export default meta;

export const NodeShapes: StoryObj = { ...specimenStory(FORMAT, "specimen-node-shapes", FILES), name: "node-shapes" };
export const NodeShapesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-shapes-p2", FILES),
    name: "node-shapes-p2 (node.per.node.opacity=true)",
};
export const NodeFillsBorders: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders", FILES),
    name: "node-fills-borders",
};
export const NodeFillsBordersP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p2", FILES),
    name: "node-fills-borders-p2 (node.border.fixed=true node.border.width=0.0)",
};
export const NodeFillsBordersP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p3", FILES),
    name: "node-fills-borders-p3 (node.border.fixed=true node.border.width=4.0)",
};
export const NodeFillsBordersP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p4", FILES),
    name: "node-fills-borders-p4 (node.border.color=#ff0000)",
};
export const NodeFillsBordersP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p5", FILES),
    name: "node-fills-borders-p5 (node.border.color=parent)",
};
export const NodeFillsBordersP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p6", FILES),
    name: "node-fills-borders-p6 (node.border.color=lighter)",
};
export const NodeFillsBordersP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p7", FILES),
    name: "node-fills-borders-p7 (node.border.fixed=true)",
};
export const NodeFillsBordersP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p8", FILES),
    name: "node-fills-borders-p8 (GEXF 1.2draft namespaces)",
};
export const NodeFillsBordersP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-fills-borders-p9", FILES),
    name: "node-fills-borders-p9 (GEXF 1.1draft namespaces)",
};
export const NodeSizesOpacity: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity", FILES),
    name: "node-sizes-opacity",
};
export const NodeSizesOpacityP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p2", FILES),
    name: "node-sizes-opacity-p2 (node.per.node.opacity=true)",
};
export const NodeSizesOpacityP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p3", FILES),
    name: "node-sizes-opacity-p3 (node.opacity=40.0)",
};
export const NodeSizesOpacityP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p4", FILES),
    name: "node-sizes-opacity-p4 (mode=dynamic: time intervals and timed viz values)",
};
export const NodeSizesOpacityP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p5", FILES),
    name: "node-sizes-opacity-p5 (timerepresentation=timestamp: timestamps and timestamped viz values)",
};
export const NodeSizesOpacityP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p6", FILES),
    name: "node-sizes-opacity-p6 (GEXF 1.2draft open interval bounds (startopen, endopen))",
};
export const NodeSizesOpacityP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-node-sizes-opacity-p7", FILES),
    name: "node-sizes-opacity-p7 (mode=slice (graph timestamp 3))",
};
export const Labels: StoryObj = { ...specimenStory(FORMAT, "specimen-labels", FILES), name: "labels" };
export const LabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p2", FILES),
    name: "labels-p2 (node.label.show=false)",
};
export const LabelsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p3", FILES),
    name: "labels-p3 (node.label.proportinalSize=false)",
};
export const LabelsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p4", FILES),
    name: "labels-p4 (node.label.color=parent)",
};
export const LabelsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p5", FILES),
    name: "labels-p5 (node.label.color=original)",
};
export const LabelsP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p6", FILES),
    name: "labels-p6 (node.label.color=#ff0000)",
};
export const LabelsP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p7", FILES),
    name: "labels-p7 (node.label.shorten=true)",
};
export const LabelsP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p8", FILES),
    name: "labels-p8 (node.label.shorten=true node.label.max-char=8)",
};
export const LabelsP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p9", FILES),
    name: "labels-p9 (node.label.outline.size=4.0 node.label.outline.color=#ff8000)",
};
export const LabelsP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p10", FILES),
    name: "labels-p10 (node.label.outline.size=4.0 node.label.outline.color=#ff8000 node.label.outline.opacity=30.0)",
};
export const LabelsP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p11", FILES),
    name: "labels-p11 (node.label.box=true)",
};
export const LabelsP12: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p12", FILES),
    name: "labels-p12 (node.label.box=true node.label.box.color=#ffff00)",
};
export const LabelsP13: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p13", FILES),
    name: "labels-p13 (node.label.box=true node.label.box.opacity=40.0)",
};
export const LabelsP14: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p14", FILES),
    name: "labels-p14 (node.label.customFont=true node.label.font=DejaVu Serif,bold,12)",
};
export const LabelsP15: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p15", FILES),
    name: "labels-p15 (node.label.avoidOverlap=true)",
};
export const LabelsP16: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p16", FILES),
    name: "labels-p16 (node.label.avoidOverlap=true node.label.overlapGridSize=40)",
};
export const LabelsP17: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p17", FILES),
    name: "labels-p17 (node.label.outline.size=4.0 node.label.outline.color=parent)",
};
export const LabelsP18: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p18", FILES),
    name: "labels-p18 (node.label.outline.size=4.0 node.label.outline.color=darker)",
};
export const LabelsP19: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p19", FILES),
    name: "labels-p19 (node.label.outline.size=4.0 node.label.outline.color=lighter)",
};
export const LabelsP20: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p20", FILES),
    name: "labels-p20 (node.label.box=true node.label.box.color=darker)",
};
export const LabelsP21: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p21", FILES),
    name: "labels-p21 (node.label.box=true node.label.box.color=lighter)",
};
export const LabelsP22: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p22", FILES),
    name: "labels-p22 (node.label.customFont=true node.label.font=DejaVu Serif,italic,12)",
};
export const LabelsP23: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p23", FILES),
    name: "labels-p23 (node.label.customFont=true node.label.font=DejaVu Serif,bolditalic,12)",
};
export const LabelsP24: StoryObj = {
    ...specimenStory(FORMAT, "specimen-labels-p24", FILES),
    name: "labels-p24 (node.label.customFont=true node.label.font=DejaVu Serif,plain,24)",
};
export const EdgesLines: StoryObj = { ...specimenStory(FORMAT, "specimen-edges-lines", FILES), name: "edges-lines" };
export const EdgesLinesP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p2", FILES),
    name: "edges-lines-p2 (edge.curved=false)",
};
export const EdgesLinesP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p3", FILES),
    name: "edges-lines-p3 (edge.color=source)",
};
export const EdgesLinesP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p4", FILES),
    name: "edges-lines-p4 (edge.color=target)",
};
export const EdgesLinesP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p5", FILES),
    name: "edges-lines-p5 (edge.color=original)",
};
export const EdgesLinesP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p6", FILES),
    name: "edges-lines-p6 (edge.color=#ff0000)",
};
export const EdgesLinesP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p7", FILES),
    name: "edges-lines-p7 (edge.opacity=40.0)",
};
export const EdgesLinesP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p8", FILES),
    name: "edges-lines-p8 (edge.use-weight=false)",
};
export const EdgesLinesP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p9", FILES),
    name: "edges-lines-p9 (edge.thickness=3.0)",
};
export const EdgesLinesP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p10", FILES),
    name: "edges-lines-p10 (edge.rescale-weight=true)",
};
export const EdgesLinesP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p11", FILES),
    name: "edges-lines-p11 (edge.rescale-weight=true edge.rescale-weight.min=2.0 edge.rescale-weight.max=4.0)",
};
export const EdgesLinesP12: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p12", FILES),
    name: "edges-lines-p12 (edge.show=false)",
};
export const EdgesLinesP13: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p13", FILES),
    name: "edges-lines-p13 (weights 0 and -2 on one sheet)",
};
export const EdgesLinesP14: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p14", FILES),
    name: "edges-lines-p14 (GEXF 1.2draft namespaces)",
};
export const EdgesLinesP15: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edges-lines-p15", FILES),
    name: "edges-lines-p15 (dynamic edge weight (timed attvalues))",
};
export const Arrows: StoryObj = { ...specimenStory(FORMAT, "specimen-arrows", FILES), name: "arrows" };
export const ArrowsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p2", FILES),
    name: "arrows-p2 (arrow.size=8.0)",
};
export const ArrowsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p3", FILES),
    name: "arrows-p3 (arrow.size=0.0)",
};
export const ArrowsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p4", FILES),
    name: "arrows-p4 (edge.radius=10.0)",
};
export const ArrowsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p5", FILES),
    name: "arrows-p5 (edge.curved=false)",
};
export const ArrowsP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p6", FILES),
    name: "arrows-p6 (defaultedgetype=undirected)",
};
export const ArrowsP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-arrows-p7", FILES),
    name: "arrows-p7 (defaultedgetype=mutual)",
};
export const EdgeLabels: StoryObj = { ...specimenStory(FORMAT, "specimen-edge-labels", FILES), name: "edge-labels" };
export const EdgeLabelsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p2", FILES),
    name: "edge-labels-p2 (edge.label.show=true)",
};
export const EdgeLabelsP3: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p3", FILES),
    name: "edge-labels-p3 (edge.label.show=true edge.label.color=#ff0000)",
};
export const EdgeLabelsP4: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p4", FILES),
    name: "edge-labels-p4 (edge.label.show=true edge.label.color=parent)",
};
export const EdgeLabelsP5: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p5", FILES),
    name: "edge-labels-p5 (edge.label.show=true edge.label.outline.size=3.0 edge.label.outline.color=#ff8000)",
};
export const EdgeLabelsP6: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p6", FILES),
    name: "edge-labels-p6 (edge.label.show=true edge.label.outline.size=3.0 edge.label.outline.color=#ff8000 edge.label.outline.opacity=30.0)",
};
export const EdgeLabelsP7: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p7", FILES),
    name: "edge-labels-p7 (edge.label.show=true edge.label.shorten=true edge.label.max-char=8)",
};
export const EdgeLabelsP8: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p8", FILES),
    name: "edge-labels-p8 (edge.label.show=true edge.label.customFont=true edge.label.font=DejaVu Serif,italic,14)",
};
export const EdgeLabelsP9: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p9", FILES),
    name: "edge-labels-p9 (edge.label.show=true edge.label.outline.size=3.0 edge.label.outline.color=parent)",
};
export const EdgeLabelsP10: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p10", FILES),
    name: "edge-labels-p10 (edge.label.show=true edge.label.outline.size=3.0 edge.label.outline.color=darker)",
};
export const EdgeLabelsP11: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p11", FILES),
    name: "edge-labels-p11 (edge.label.show=true edge.label.outline.size=3.0 edge.label.outline.color=lighter)",
};
export const EdgeLabelsP12: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p12", FILES),
    name: "edge-labels-p12 (edge.label.show=true edge.curved=false)",
};
export const EdgeLabelsP13: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p13", FILES),
    name: "edge-labels-p13 (edge.label.show=true edge.label.customFont=true edge.label.font=DejaVu Serif,bold,14)",
};
export const EdgeLabelsP14: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p14", FILES),
    name: "edge-labels-p14 (edge.label.show=true edge.label.customFont=true edge.label.font=DejaVu Serif,bolditalic,14)",
};
export const EdgeLabelsP15: StoryObj = {
    ...specimenStory(FORMAT, "specimen-edge-labels-p15", FILES),
    name: "edge-labels-p15 (edge.label.show=true edge.label.customFont=true edge.label.font=DejaVu Serif,plain,20)",
};
export const Groups: StoryObj = { ...specimenStory(FORMAT, "specimen-groups", FILES), name: "groups" };
export const ImagesCharts: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts", FILES),
    name: "images-charts",
};
export const ImagesChartsP2: StoryObj = {
    ...specimenStory(FORMAT, "specimen-images-charts-p2", FILES),
    name: "images-charts-p2 (node.per.node.opacity=true)",
};
export const MappingsBypass: StoryObj = {
    ...specimenStory(FORMAT, "specimen-mappings-bypass", FILES),
    name: "mappings-bypass",
};
