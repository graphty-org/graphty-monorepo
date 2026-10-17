/**
 * The JSON style fidelity samples (stories/fidelity.ts draws each one). README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonCyjsGraphmakerUrl from "../../test/corpus/styles/json/fidelity/cyjs-graphmaker.json?url";
import jsonCyjsPerfUrl from "../../test/corpus/styles/json/fidelity/cyjs-perf.json.gz?url";
import jsonCyjsSbgnScilunaUrl from "../../test/corpus/styles/json/fidelity/cyjs-sbgn-sciluna.json?url";
import jsonCyjsSynthEdgesSavedUrl from "../../test/corpus/styles/json/fidelity/cyjs-synth-edges-saved.json?url";
import jsonCyjsSynthNodesUrl from "../../test/corpus/styles/json/fidelity/cyjs-synth-nodes.json?url";
import jsonCyjsTokyoUrl from "../../test/corpus/styles/json/fidelity/cyjs-tokyo.json.gz?url";
import jsonCyjsWinecheeseUrl from "../../test/corpus/styles/json/fidelity/cyjs-winecheese.json.gz?url";
import jsonGephiWorldcupUrl from "../../test/corpus/styles/json/fidelity/gephi-worldcup.json.gz?url";
import jsonGraphologySynthUrl from "../../test/corpus/styles/json/fidelity/graphology-synth.json?url";
import jsonSigmaLesmisUrl from "../../test/corpus/styles/json/fidelity/sigma-lesmis.json?url";
import jsonVisLesmiserablesUrl from "../../test/corpus/styles/json/fidelity/vis-lesmiserables.json?url";
import jsonVisNodelegendUrl from "../../test/corpus/styles/json/fidelity/vis-nodelegend.json?url";
import jsonVisSiblingsUrl from "../../test/corpus/styles/json/fidelity/vis-siblings.json?url";
import jsonVisSynthUrl from "../../test/corpus/styles/json/fidelity/vis-synth.json?url";
import jsonVisTransparencyUrl from "../../test/corpus/styles/json/fidelity/vis-transparency.json?url";
import jsonVisUnixUrl from "../../test/corpus/styles/json/fidelity/vis-unix.json?url";
import jsonVisWorldUrl from "../../test/corpus/styles/json/fidelity/vis-world.json?url";
import cyjsGlycolysisUrl from "../../test/corpus/styles/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json?url";
import cyjsGenemaniaUrl from "../../test/fidelity/samples/cyjs-genemania.json?url";
import { fidelityStory } from "./fidelity";

const meta: Meta = { title: "Style Fidelity/JSON" };
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
export const SigmaLesmis: StoryObj = {
    ...fidelityStory("json-sigma-lesmis", jsonSigmaLesmisUrl),
    name: "sigma-lesmis",
};
export const GraphologySynth: StoryObj = {
    ...fidelityStory("json-graphology-synth", jsonGraphologySynthUrl),
    name: "graphology-synth",
};
export const VisUnix: StoryObj = { ...fidelityStory("json-vis-unix", jsonVisUnixUrl), name: "vis-unix" };
export const VisSiblings: StoryObj = {
    ...fidelityStory("json-vis-siblings", jsonVisSiblingsUrl),
    name: "vis-siblings",
};
export const VisTransparency: StoryObj = {
    ...fidelityStory("json-vis-transparency", jsonVisTransparencyUrl),
    name: "vis-transparency",
};
export const VisWorld: StoryObj = { ...fidelityStory("json-vis-world", jsonVisWorldUrl), name: "vis-world" };
export const VisLesmiserables: StoryObj = {
    ...fidelityStory("json-vis-lesmiserables", jsonVisLesmiserablesUrl),
    name: "vis-lesmiserables",
};
export const VisSynth: StoryObj = { ...fidelityStory("json-vis-synth", jsonVisSynthUrl), name: "vis-synth" };
export const CyjsPerf: StoryObj = { ...fidelityStory("json-cyjs-perf", jsonCyjsPerfUrl), name: "cyjs-perf" };
export const CyjsSbgnSciluna: StoryObj = {
    ...fidelityStory("json-cyjs-sbgn-sciluna", jsonCyjsSbgnScilunaUrl),
    name: "cyjs-sbgn-sciluna",
};
export const GephiWorldcup: StoryObj = {
    ...fidelityStory("json-gephi-worldcup", jsonGephiWorldcupUrl),
    name: "gephi-worldcup",
};
export const VisNodelegend: StoryObj = {
    ...fidelityStory("json-vis-nodelegend", jsonVisNodelegendUrl),
    name: "vis-nodelegend",
};
