/**
 * The Cytoscape.js style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonCyjsGraphmakerUrl from "../../../test/corpus/styles/json/fidelity/cyjs-graphmaker.json?url";
import jsonCyjsPerfUrl from "../../../test/corpus/styles/json/fidelity/cyjs-perf.json.gz?url";
import jsonCyjsSbgnScilunaUrl from "../../../test/corpus/styles/json/fidelity/cyjs-sbgn-sciluna.json?url";
import jsonCyjsSynthEdgesSavedUrl from "../../../test/corpus/styles/json/fidelity/cyjs-synth-edges-saved.json?url";
import jsonCyjsSynthNodesUrl from "../../../test/corpus/styles/json/fidelity/cyjs-synth-nodes.json?url";
import jsonCyjsTokyoUrl from "../../../test/corpus/styles/json/fidelity/cyjs-tokyo.json.gz?url";
import jsonCyjsWinecheeseUrl from "../../../test/corpus/styles/json/fidelity/cyjs-winecheese.json.gz?url";
import cyjsGlycolysisUrl from "../../../test/corpus/styles/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json?url";
import cyjsGenemaniaUrl from "../../../test/fidelity/samples/cyjs-genemania.json?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/Cytoscape.js/Samples" };
export default meta;

export const CyjsGenemania: StoryObj = { ...fidelityStory("cyjs-genemania", cyjsGenemaniaUrl), name: "cyjs-genemania" };
export const CyjsGlycolysis: StoryObj = {
    ...fidelityStory("cyjs-glycolysis", cyjsGlycolysisUrl),
    name: "cyjs-glycolysis",
};
export const CyjsWinecheese: StoryObj = {
    ...fidelityStory("json-cyjs-winecheese", jsonCyjsWinecheeseUrl),
    name: "cyjs-winecheese",
};
export const CyjsTokyo: StoryObj = { ...fidelityStory("json-cyjs-tokyo", jsonCyjsTokyoUrl), name: "cyjs-tokyo" };
export const CyjsGraphmaker: StoryObj = {
    ...fidelityStory("json-cyjs-graphmaker", jsonCyjsGraphmakerUrl),
    name: "cyjs-graphmaker",
};
export const CyjsSynthNodes: StoryObj = {
    ...fidelityStory("json-cyjs-synth-nodes", jsonCyjsSynthNodesUrl),
    name: "cyjs-synth-nodes",
};
export const CyjsSynthEdgesSaved: StoryObj = {
    ...fidelityStory("json-cyjs-synth-edges-saved", jsonCyjsSynthEdgesSavedUrl),
    name: "cyjs-synth-edges-saved",
};
export const CyjsPerf: StoryObj = { ...fidelityStory("json-cyjs-perf", jsonCyjsPerfUrl), name: "cyjs-perf" };
export const CyjsSbgnSciluna: StoryObj = {
    ...fidelityStory("json-cyjs-sbgn-sciluna", jsonCyjsSbgnScilunaUrl),
    name: "cyjs-sbgn-sciluna",
};
