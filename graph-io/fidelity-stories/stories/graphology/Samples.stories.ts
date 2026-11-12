/**
 * The graphology style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonGraphologySynthUrl from "../../../test/corpus/styles/json/fidelity/graphology-synth.json?url";
import jsonSigmaLesmisUrl from "../../../test/corpus/styles/json/fidelity/sigma-lesmis.json?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/graphology/Samples" };
export default meta;

export const SigmaLesmis: StoryObj = {
    ...fidelityStory("json-sigma-lesmis", jsonSigmaLesmisUrl),
    name: "sigma-lesmis",
};
export const GraphologySynth: StoryObj = {
    ...fidelityStory("json-graphology-synth", jsonGraphologySynthUrl),
    name: "graphology-synth",
};
