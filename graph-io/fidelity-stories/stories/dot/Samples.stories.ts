/**
 * The Graphviz DOT style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import dotRealCrazyUrl from "../../../test/corpus/styles/dot/fidelity/real-crazy.gv?url";
import dotRealDepcruiseUrl from "../../../test/corpus/styles/dot/fidelity/real-depcruise.gv?url";
import dotRealHappinessUrl from "../../../test/corpus/styles/dot/fidelity/real-happiness.gv?url";
import dotRealLinuxKernelUrl from "../../../test/corpus/styles/dot/fidelity/real-linux-kernel.gv?url";
import dotRealSiblingsUrl from "../../../test/corpus/styles/dot/fidelity/real-siblings.gv?url";
import dotRealSoftmaintUrl from "../../../test/corpus/styles/dot/fidelity/real-softmaint.gv?url";
import dotSynthEdgesClustersUrl from "../../../test/corpus/styles/dot/fidelity/synth-edges-clusters.gv?url";
import dotSynthNodesUrl from "../../../test/corpus/styles/dot/fidelity/synth-nodes.gv?url";
import dotProfileUrl from "../../../test/corpus/styles/dot/graphviz-gallery-directed-profile.gv?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/Graphviz DOT/Samples" };
export default meta;

export const Profile: StoryObj = { ...fidelityStory("dot-profile", dotProfileUrl), name: "profile" };
export const RealLinuxKernel: StoryObj = {
    ...fidelityStory("dot-real-linux-kernel", dotRealLinuxKernelUrl),
    name: "real-linux-kernel",
};
export const RealCrazy: StoryObj = { ...fidelityStory("dot-real-crazy", dotRealCrazyUrl), name: "real-crazy" };
export const RealSiblings: StoryObj = {
    ...fidelityStory("dot-real-siblings", dotRealSiblingsUrl),
    name: "real-siblings",
};
export const RealSoftmaint: StoryObj = {
    ...fidelityStory("dot-real-softmaint", dotRealSoftmaintUrl),
    name: "real-softmaint",
};
export const RealHappiness: StoryObj = {
    ...fidelityStory("dot-real-happiness", dotRealHappinessUrl),
    name: "real-happiness",
};
export const RealDepcruise: StoryObj = {
    ...fidelityStory("dot-real-depcruise", dotRealDepcruiseUrl),
    name: "real-depcruise",
};
export const SynthNodes: StoryObj = { ...fidelityStory("dot-synth-nodes", dotSynthNodesUrl), name: "synth-nodes" };
export const SynthEdgesClusters: StoryObj = {
    ...fidelityStory("dot-synth-edges-clusters", dotSynthEdgesClustersUrl),
    name: "synth-edges-clusters",
};
