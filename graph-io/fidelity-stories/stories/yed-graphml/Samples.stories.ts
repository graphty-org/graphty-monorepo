/**
 * The yEd GraphML style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import graphmlGalaxyLcmsWorkflowUrl from "../../../test/corpus/styles/graphml/fidelity/galaxy-lcms-workflow.graphml?url";
import graphmlLibcitygmlMappingUrl from "../../../test/corpus/styles/graphml/fidelity/libcitygml-mapping.graphml?url";
import graphmlMagiclanternArchitectureUrl from "../../../test/corpus/styles/graphml/fidelity/magiclantern-architecture.graphml?url";
import graphmlOpenArchaeoUrl from "../../../test/corpus/styles/graphml/fidelity/open-archaeo.graphml?url";
import graphmlScalaCollectionMutableUrl from "../../../test/corpus/styles/graphml/fidelity/scala-collection-mutable.graphml?url";
import graphmlSyntheticEdgesUrl from "../../../test/corpus/styles/graphml/fidelity/synthetic-edges.graphml?url";
import graphmlSyntheticNodesUrl from "../../../test/corpus/styles/graphml/fidelity/synthetic-nodes.graphml?url";
import graphmlStm32FuncUrl from "../../../test/corpus/styles/graphml/LTVA1_STM32CrapSynth__func.graphml.gz?url";
import graphmlClaCheckerGraphUrl from "../../../test/corpus/styles/graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz?url";
import graphmlYedVoctomixUrl from "../../../test/corpus/styles/graphml/yed-shapenode/voc__voctomix__schema.graphml?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/yEd GraphML/Samples" };
export default meta;

export const YedVoctomix: StoryObj = {
    ...fidelityStory("graphml-yed-voctomix", graphmlYedVoctomixUrl),
    name: "yed-voctomix",
};
export const OpenArchaeo: StoryObj = {
    ...fidelityStory("graphml-open-archaeo", graphmlOpenArchaeoUrl),
    name: "open-archaeo",
};
export const GalaxyLcmsWorkflow: StoryObj = {
    ...fidelityStory("graphml-galaxy-lcms-workflow", graphmlGalaxyLcmsWorkflowUrl),
    name: "galaxy-lcms-workflow",
};
export const ScalaCollectionMutable: StoryObj = {
    ...fidelityStory("graphml-scala-collection-mutable", graphmlScalaCollectionMutableUrl),
    name: "scala-collection-mutable",
};
export const LibcitygmlMapping: StoryObj = {
    ...fidelityStory("graphml-libcitygml-mapping", graphmlLibcitygmlMappingUrl),
    name: "libcitygml-mapping",
};
export const ClaCheckerGraph: StoryObj = {
    ...fidelityStory("graphml-cla-checker-graph", graphmlClaCheckerGraphUrl),
    name: "cla-checker-graph",
};
export const Stm32Func: StoryObj = { ...fidelityStory("graphml-stm32-func", graphmlStm32FuncUrl), name: "stm32-func" };
export const SyntheticNodes: StoryObj = {
    ...fidelityStory("graphml-synthetic-nodes", graphmlSyntheticNodesUrl),
    name: "synthetic-nodes",
};
export const SyntheticEdges: StoryObj = {
    ...fidelityStory("graphml-synthetic-edges", graphmlSyntheticEdgesUrl),
    name: "synthetic-edges",
};
export const MagiclanternArchitecture: StoryObj = {
    ...fidelityStory("graphml-magiclantern-architecture", graphmlMagiclanternArchitectureUrl),
    name: "magiclantern-architecture",
};
