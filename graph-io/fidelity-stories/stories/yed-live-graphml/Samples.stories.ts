/**
 * The yEd Live GraphML style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import graphmlYfilesHtmlStagFlowchartUrl from "../../../test/corpus/styles/graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml?url";
import graphmlYfilesHtmlSs13TreeUrl from "../../../test/corpus/styles/graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/yEd Live GraphML/Samples" };
export default meta;

export const YfilesHtmlSs13Tree: StoryObj = {
    ...fidelityStory("graphml-yfiles-html-ss13-tree", graphmlYfilesHtmlSs13TreeUrl),
    name: "yfiles-html-ss13-tree",
};
export const YfilesHtmlStagFlowchart: StoryObj = {
    ...fidelityStory("graphml-yfiles-html-stag-flowchart", graphmlYfilesHtmlStagFlowchartUrl),
    name: "yfiles-html-stag-flowchart",
};
