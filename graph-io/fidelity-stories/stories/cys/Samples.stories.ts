/**
 * The Cytoscape session style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cysAnnotationExampleUrl from "../../../test/corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys?url";
import cysAffinityPurificationUrl from "../../../test/corpus/styles/cys/fidelity/affinity-purification.cys?url";
import cysGalfilteredUrl from "../../../test/corpus/styles/cys/fidelity/galfiltered.cys?url";
import cysImportAndSaveUrl from "../../../test/corpus/styles/cys/fidelity/import-and-save.cys?url";
import cysLuadVestV2Url from "../../../test/corpus/styles/cys/fidelity/luad-vest-v2.cys?url";
import cysSynBypassUrl from "../../../test/corpus/styles/cys/fidelity/syn-bypass.cys?url";
import cysSynMappingsUrl from "../../../test/corpus/styles/cys/fidelity/syn-mappings.cys?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/Cytoscape session/Samples" };
export default meta;

export const AnnotationExample: StoryObj = {
    ...fidelityStory("cys-annotation-example", cysAnnotationExampleUrl),
    name: "annotation-example",
};
export const ImportAndSave: StoryObj = {
    ...fidelityStory("cys-import-and-save", cysImportAndSaveUrl),
    name: "import-and-save",
};
export const Galfiltered: StoryObj = { ...fidelityStory("cys-galfiltered", cysGalfilteredUrl), name: "galfiltered" };
export const AffinityPurification: StoryObj = {
    ...fidelityStory("cys-affinity-purification", cysAffinityPurificationUrl),
    name: "affinity-purification",
};
export const LuadVestV2: StoryObj = { ...fidelityStory("cys-luad-vest-v2", cysLuadVestV2Url), name: "luad-vest-v2" };
export const SynMappings: StoryObj = { ...fidelityStory("cys-syn-mappings", cysSynMappingsUrl), name: "syn-mappings" };
export const SynBypass: StoryObj = { ...fidelityStory("cys-syn-bypass", cysSynBypassUrl), name: "syn-bypass" };
