/**
 * The vis-network samples drawn at vis-network's own node positions, with the elements failing there outlined
 * (../matched.ts draws each one). The `sample` arg picks any vis-network sample with an oracle.
 * vis-siblings has no story of its own: laid out, settled and compared twice at 200 nodes and 284 curved edges it
 * takes over 30 s on a CI runner, past the story tests' limit; pick it with the `sample` arg (graphty-element's oracle
 * tests judge its `@matched` drawing on every run).
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
export const VisTransparency: StoryObj = {
    ...matchedStory(FILES, "json-vis-transparency"),
    name: "vis-transparency",
};
