/**
 * The vis-network style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonVisLesmiserablesUrl from "../../../test/corpus/styles/json/fidelity/vis-lesmiserables.json?url";
import jsonVisNodelegendUrl from "../../../test/corpus/styles/json/fidelity/vis-nodelegend.json?url";
import jsonVisSiblingsUrl from "../../../test/corpus/styles/json/fidelity/vis-siblings.json?url";
import jsonVisSynthUrl from "../../../test/corpus/styles/json/fidelity/vis-synth.json?url";
import jsonVisTransparencyUrl from "../../../test/corpus/styles/json/fidelity/vis-transparency.json?url";
import jsonVisUnixUrl from "../../../test/corpus/styles/json/fidelity/vis-unix.json?url";
import jsonVisWorldUrl from "../../../test/corpus/styles/json/fidelity/vis-world.json?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/vis-network/Samples" };
export default meta;

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
export const VisNodelegend: StoryObj = {
    ...fidelityStory("json-vis-nodelegend", jsonVisNodelegendUrl),
    name: "vis-nodelegend",
};
