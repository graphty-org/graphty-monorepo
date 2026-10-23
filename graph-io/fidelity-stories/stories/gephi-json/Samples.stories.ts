/**
 * The Gephi JSON style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import jsonGephiWorldcupUrl from "../../../test/corpus/styles/json/fidelity/gephi-worldcup.json.gz?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/Gephi JSON/Samples" };
export default meta;

export const GephiWorldcup: StoryObj = {
    ...fidelityStory("json-gephi-worldcup", jsonGephiWorldcupUrl),
    name: "gephi-worldcup",
};
