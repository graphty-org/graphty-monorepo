/**
 * The CX2 style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cx2ImatinibSmpdbUrl from "../../../test/corpus/styles/cx2/fidelity/imatinib-smpdb.cx2?url";
import cx2ReproSharedInteractionUrl from "../../../test/corpus/styles/cx2/fidelity/repro-shared-interaction.cx2?url";
import cx2SignorAmlUrl from "../../../test/corpus/styles/cx2/fidelity/signor-aml.cx2?url";
import cx2SynBypassUrl from "../../../test/corpus/styles/cx2/fidelity/syn-bypass.cx2?url";
import cx2SynMappingsUrl from "../../../test/corpus/styles/cx2/fidelity/syn-mappings.cx2?url";
import cx2SyntheticLethalUrl from "../../../test/corpus/styles/cx2/fidelity/synthetic-lethal.cx2?url";
import cx2U2osHierarchyUrl from "../../../test/corpus/styles/cx2/fidelity/u2os-hierarchy.cx2?url";
import cx2UsReturnedStudentsUrl from "../../../test/corpus/styles/cx2/fidelity/us-returned-students.cx2?url";
import cx2Wp1449TlrUrl from "../../../test/corpus/styles/cx2/fidelity/wp1449-tlr.cx2?url";
import cx2Ndex90f78bcdUrl from "../../../test/corpus/styles/cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/CX2/Samples" };
export default meta;

export const Ndex90f78bcd: StoryObj = {
    ...fidelityStory("cx2-ndex-90f78bcd", cx2Ndex90f78bcdUrl),
    name: "ndex-90f78bcd",
};
export const SynMappings: StoryObj = { ...fidelityStory("cx2-syn-mappings", cx2SynMappingsUrl), name: "syn-mappings" };
export const SynBypass: StoryObj = { ...fidelityStory("cx2-syn-bypass", cx2SynBypassUrl), name: "syn-bypass" };
export const Wp1449Tlr: StoryObj = { ...fidelityStory("cx2-wp1449-tlr", cx2Wp1449TlrUrl), name: "wp1449-tlr" };
export const ImatinibSmpdb: StoryObj = {
    ...fidelityStory("cx2-imatinib-smpdb", cx2ImatinibSmpdbUrl),
    name: "imatinib-smpdb",
};
export const SignorAml: StoryObj = { ...fidelityStory("cx2-signor-aml", cx2SignorAmlUrl), name: "signor-aml" };
export const SyntheticLethal: StoryObj = {
    ...fidelityStory("cx2-synthetic-lethal", cx2SyntheticLethalUrl),
    name: "synthetic-lethal",
};
export const U2osHierarchy: StoryObj = {
    ...fidelityStory("cx2-u2os-hierarchy", cx2U2osHierarchyUrl),
    name: "u2os-hierarchy",
};
export const UsReturnedStudents: StoryObj = {
    ...fidelityStory("cx2-us-returned-students", cx2UsReturnedStudentsUrl),
    name: "us-returned-students",
};
export const ReproSharedInteraction: StoryObj = {
    ...fidelityStory("cx2-repro-shared-interaction", cx2ReproSharedInteractionUrl),
    name: "repro-shared-interaction",
};
