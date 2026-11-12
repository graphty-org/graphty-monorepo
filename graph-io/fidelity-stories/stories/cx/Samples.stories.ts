/**
 * The CX style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import cxDdramUrl from "../../../test/corpus/styles/cx/fidelity/ddram.cx?url";
import cxLianheAffiliationUrl from "../../../test/corpus/styles/cx/fidelity/lianhe-affiliation.cx.gz?url";
import cxNciPidRhoaUrl from "../../../test/corpus/styles/cx/fidelity/nci-pid-rhoa.cx?url";
import cxPolygenicSleUrl from "../../../test/corpus/styles/cx/fidelity/polygenic-sle.cx.gz?url";
import cxRadiationBibliographyUrl from "../../../test/corpus/styles/cx/fidelity/radiation-bibliography.cx.gz?url";
import cxReproLockedOwnSizeUrl from "../../../test/corpus/styles/cx/fidelity/repro-locked-own-size.cx?url";
import cxReproUnplacedBoxesUrl from "../../../test/corpus/styles/cx/fidelity/repro-unplaced-boxes.cx?url";
import cxSynBypassUrl from "../../../test/corpus/styles/cx/fidelity/syn-bypass.cx?url";
import cxSynMappingsUrl from "../../../test/corpus/styles/cx/fidelity/syn-mappings.cx?url";
import cxNdex90f78bcdUrl from "../../../test/corpus/styles/cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/CX/Samples" };
export default meta;

export const Ndex90f78bcd: StoryObj = {
    ...fidelityStory("cx-ndex-90f78bcd", cxNdex90f78bcdUrl),
    name: "ndex-90f78bcd",
};
export const SynMappings: StoryObj = { ...fidelityStory("cx-syn-mappings", cxSynMappingsUrl), name: "syn-mappings" };
export const SynBypass: StoryObj = { ...fidelityStory("cx-syn-bypass", cxSynBypassUrl), name: "syn-bypass" };
export const Ddram: StoryObj = { ...fidelityStory("cx-ddram", cxDdramUrl), name: "ddram" };
export const LianheAffiliation: StoryObj = {
    ...fidelityStory("cx-lianhe-affiliation", cxLianheAffiliationUrl),
    name: "lianhe-affiliation",
};
export const NciPidRhoa: StoryObj = { ...fidelityStory("cx-nci-pid-rhoa", cxNciPidRhoaUrl), name: "nci-pid-rhoa" };
export const PolygenicSle: StoryObj = {
    ...fidelityStory("cx-polygenic-sle", cxPolygenicSleUrl),
    name: "polygenic-sle",
};
export const RadiationBibliography: StoryObj = {
    ...fidelityStory("cx-radiation-bibliography", cxRadiationBibliographyUrl),
    name: "radiation-bibliography",
};
export const ReproLockedOwnSize: StoryObj = {
    ...fidelityStory("cx-repro-locked-own-size", cxReproLockedOwnSizeUrl),
    name: "repro-locked-own-size",
};
export const ReproUnplacedBoxes: StoryObj = {
    ...fidelityStory("cx-repro-unplaced-boxes", cxReproUnplacedBoxesUrl),
    name: "repro-unplaced-boxes",
};
