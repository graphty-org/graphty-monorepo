/**
 * The GML style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import gmlDunnartAutobahnUrl from "../../../test/corpus/styles/gml/fidelity/dunnart-autobahn.gml?url";
import gmlDunnartPlanarOrthogonalUrl from "../../../test/corpus/styles/gml/fidelity/dunnart-planar-orthogonal.gml?url";
import gmlJgraphtGridTerritorioUrl from "../../../test/corpus/styles/gml/fidelity/jgrapht-grid-territorio.gml?url";
import gmlSyntheticCoverageUrl from "../../../test/corpus/styles/gml/fidelity/synthetic-coverage.gml?url";
import gmlVisualgraphTree30Url from "../../../test/corpus/styles/gml/fidelity/visualgraph-tree30.gml?url";
import gmlYedPmodelUrl from "../../../test/corpus/styles/gml/ImperialCollegeLondon_pyrealm__pmodel.gml?url";
import gmlNeed4stacks261Url from "../../../test/corpus/styles/gml/spupyrev_bob__need4stacks261.gml?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/GML/Samples" };
export default meta;

export const YedPmodel: StoryObj = { ...fidelityStory("gml-yed-pmodel", gmlYedPmodelUrl), name: "yed-pmodel" };
export const Need4stacks261: StoryObj = {
    ...fidelityStory("gml-need4stacks261", gmlNeed4stacks261Url),
    name: "need4stacks261",
};
export const SyntheticCoverage: StoryObj = {
    ...fidelityStory("gml-synthetic-coverage", gmlSyntheticCoverageUrl),
    name: "synthetic-coverage",
};
export const DunnartAutobahn: StoryObj = {
    ...fidelityStory("gml-dunnart-autobahn", gmlDunnartAutobahnUrl),
    name: "dunnart-autobahn",
};
export const DunnartPlanarOrthogonal: StoryObj = {
    ...fidelityStory("gml-dunnart-planar-orthogonal", gmlDunnartPlanarOrthogonalUrl),
    name: "dunnart-planar-orthogonal",
};
export const JgraphtGridTerritorio: StoryObj = {
    ...fidelityStory("gml-jgrapht-grid-territorio", gmlJgraphtGridTerritorioUrl),
    name: "jgrapht-grid-territorio",
};
export const VisualgraphTree30: StoryObj = {
    ...fidelityStory("gml-visualgraph-tree30", gmlVisualgraphTree30Url),
    name: "visualgraph-tree30",
};
