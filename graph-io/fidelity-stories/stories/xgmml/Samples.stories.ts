/**
 * The XGMML style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import xgmmlBasicdatavizUrl from "../../../test/corpus/styles/xgmml/BasicDataVizDemo.xgmml.gz?url";
import xgmmlAracneMycccnd1Url from "../../../test/corpus/styles/xgmml/fidelity/aracne-mycccnd1.xgmml.gz?url";
import xgmmlDream4SignalingUrl from "../../../test/corpus/styles/xgmml/fidelity/dream4-signaling.xgmml?url";
import xgmmlGcmodellerDemoUrl from "../../../test/corpus/styles/xgmml/fidelity/gcmodeller-demo.xgmml?url";
import xgmmlImagenetDogChildrenUrl from "../../../test/corpus/styles/xgmml/fidelity/imagenet-dog-children.xgmml?url";
import xgmmlNetworkportalNsoxphosUrl from "../../../test/corpus/styles/xgmml/fidelity/networkportal-nsoxphos.xgmml?url";
import xgmmlPathguideAllpathwaysdbUrl from "../../../test/corpus/styles/xgmml/fidelity/pathguide-allpathwaysdb.xgmml?url";
import xgmmlReproNameOnlyLabelsUrl from "../../../test/corpus/styles/xgmml/fidelity/repro-name-only-labels.xgmml?url";
import xgmmlSynBypassUrl from "../../../test/corpus/styles/xgmml/fidelity/syn-bypass.xgmml.gz?url";
import xgmmlSynMappingsUrl from "../../../test/corpus/styles/xgmml/fidelity/syn-mappings.xgmml.gz?url";
import xgmmlWp4271Cy3ExportUrl from "../../../test/corpus/styles/xgmml/fidelity/wp4271-cy3-export.xgmml.gz?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/XGMML/Samples" };
export default meta;

export const Basicdataviz: StoryObj = {
    ...fidelityStory("xgmml-basicdataviz", xgmmlBasicdatavizUrl),
    name: "basicdataviz",
};
export const SynMappings: StoryObj = {
    ...fidelityStory("xgmml-syn-mappings", xgmmlSynMappingsUrl),
    name: "syn-mappings",
};
export const SynBypass: StoryObj = { ...fidelityStory("xgmml-syn-bypass", xgmmlSynBypassUrl), name: "syn-bypass" };
export const Wp4271Cy3Export: StoryObj = {
    ...fidelityStory("xgmml-wp4271-cy3-export", xgmmlWp4271Cy3ExportUrl),
    name: "wp4271-cy3-export",
};
export const AracneMycccnd1: StoryObj = {
    ...fidelityStory("xgmml-aracne-mycccnd1", xgmmlAracneMycccnd1Url),
    name: "aracne-mycccnd1",
};
export const Dream4Signaling: StoryObj = {
    ...fidelityStory("xgmml-dream4-signaling", xgmmlDream4SignalingUrl),
    name: "dream4-signaling",
};
export const GcmodellerDemo: StoryObj = {
    ...fidelityStory("xgmml-gcmodeller-demo", xgmmlGcmodellerDemoUrl),
    name: "gcmodeller-demo",
};
export const ImagenetDogChildren: StoryObj = {
    ...fidelityStory("xgmml-imagenet-dog-children", xgmmlImagenetDogChildrenUrl),
    name: "imagenet-dog-children",
};
export const NetworkportalNsoxphos: StoryObj = {
    ...fidelityStory("xgmml-networkportal-nsoxphos", xgmmlNetworkportalNsoxphosUrl),
    name: "networkportal-nsoxphos",
};
export const PathguideAllpathwaysdb: StoryObj = {
    ...fidelityStory("xgmml-pathguide-allpathwaysdb", xgmmlPathguideAllpathwaysdbUrl),
    name: "pathguide-allpathwaysdb",
};
export const ReproNameOnlyLabels: StoryObj = {
    ...fidelityStory("xgmml-repro-name-only-labels", xgmmlReproNameOnlyLabelsUrl),
    name: "repro-name-only-labels",
};
