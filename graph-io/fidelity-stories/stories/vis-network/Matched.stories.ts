/**
 * The vis-network samples drawn at vis-network's own node positions, with the elements failing there outlined
 * (../matched.ts draws each one). The `sample` arg picks any vis-network sample with an oracle.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonVisLesmiserablesUrl from "../../../test/corpus/styles/json/fidelity/vis-lesmiserables.json?url";
import jsonVisNodelegendUrl from "../../../test/corpus/styles/json/fidelity/vis-nodelegend.json?url";
import jsonVisSiblingsUrl from "../../../test/corpus/styles/json/fidelity/vis-siblings.json?url";
import jsonVisSynthUrl from "../../../test/corpus/styles/json/fidelity/vis-synth.json?url";
import jsonVisTransparencyUrl from "../../../test/corpus/styles/json/fidelity/vis-transparency.json?url";
import jsonVisUnixUrl from "../../../test/corpus/styles/json/fidelity/vis-unix.json?url";
import jsonVisWorldUrl from "../../../test/corpus/styles/json/fidelity/vis-world.json?url";
import { matchedStory } from "../matched";

const FILES = {
    "json-vis-lesmiserables": jsonVisLesmiserablesUrl,
    "json-vis-siblings": jsonVisSiblingsUrl,
    "json-vis-transparency": jsonVisTransparencyUrl,
    "json-vis-unix": jsonVisUnixUrl,
    "json-vis-world": jsonVisWorldUrl,
    "json-vis-synth": jsonVisSynthUrl,
    "json-vis-nodelegend": jsonVisNodelegendUrl,
};

const meta: Meta = { title: "Style Fidelity/vis-network/Matched" };
export default meta;

export const VisLesmiserables: StoryObj = {
    ...matchedStory(FILES, "json-vis-lesmiserables"),
    name: "vis-lesmiserables",
};
export const VisSiblings: StoryObj = { ...matchedStory(FILES, "json-vis-siblings"), name: "vis-siblings" };
export const VisTransparency: StoryObj = {
    ...matchedStory(FILES, "json-vis-transparency"),
    name: "vis-transparency",
};
