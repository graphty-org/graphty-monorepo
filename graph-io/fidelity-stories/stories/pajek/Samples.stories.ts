/**
 * The Pajek style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import pajek1crnUrl from "../../../test/corpus/styles/pajek/fidelity/1crn.net?url";
import pajekCUrl from "../../../test/corpus/styles/pajek/fidelity/c.net?url";
import pajekFootballUrl from "../../../test/corpus/styles/pajek/fidelity/football.net?url";
import pajekKdorolaUrl from "../../../test/corpus/styles/pajek/fidelity/kdorola.net?url";
import pajekLinRel4Url from "../../../test/corpus/styles/pajek/fidelity/lin-rel4.net?url";
import pajekSynthLinesUrl from "../../../test/corpus/styles/pajek/fidelity/synth-lines.net?url";
import pajekSynthVerticesUrl from "../../../test/corpus/styles/pajek/fidelity/synth-vertices.net?url";
import pajekGraphstreamBUrl from "../../../test/corpus/styles/pajek/graphstream_gs-core__B.net?url";
import pajekIliadUrl from "../../../test/corpus/styles/pajek/kjhealy_kjhnet__iliad_killedby.net?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/Pajek/Samples" };
export default meta;

export const Iliad: StoryObj = { ...fidelityStory("pajek-iliad", pajekIliadUrl), name: "iliad" };
export const GraphstreamB: StoryObj = {
    ...fidelityStory("pajek-graphstream-b", pajekGraphstreamBUrl),
    name: "graphstream-b",
};
export const SynthVertices: StoryObj = {
    ...fidelityStory("pajek-synth-vertices", pajekSynthVerticesUrl),
    name: "synth-vertices",
};
export const SynthLines: StoryObj = { ...fidelityStory("pajek-synth-lines", pajekSynthLinesUrl), name: "synth-lines" };
export const Sample1crn: StoryObj = { ...fidelityStory("pajek-1crn", pajek1crnUrl), name: "1crn" };
export const C: StoryObj = { ...fidelityStory("pajek-c", pajekCUrl), name: "c" };
export const Football: StoryObj = { ...fidelityStory("pajek-football", pajekFootballUrl), name: "football" };
export const Kdorola: StoryObj = { ...fidelityStory("pajek-kdorola", pajekKdorolaUrl), name: "kdorola" };
export const LinRel4: StoryObj = { ...fidelityStory("pajek-lin-rel4", pajekLinRel4Url), name: "lin-rel4" };
