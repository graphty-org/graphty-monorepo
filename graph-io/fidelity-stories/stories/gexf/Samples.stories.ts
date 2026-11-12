/**
 * The GEXF style fidelity samples: real-world files and the older synthetic ones (../fidelity.ts draws each one).
 * The format's specimen sheets are in Specimens.stories.ts beside this file. README.md lists the samples left out
 * and why.
 */
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import gexfCnsWosUrl from "../../../test/corpus/styles/gexf/cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz?url";
import gexfGraphologyRioUrl from "../../../test/corpus/styles/gexf/fidelity/graphology-rio.gexf.gz?url";
import gexfSynthNxVizUrl from "../../../test/corpus/styles/gexf/fidelity/synth-nx-viz.gexf?url";
import gexfMiserablesUrl from "../../../test/corpus/styles/gexf/gexfjs-miserables.gexf?url";
import gexfHskCharsUrl from "../../../test/corpus/styles/gexf/glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz?url";
import gexfGsaFpkiCertsUrl from "../../../test/corpus/styles/gexf/gsa-fpki-certs.gexf?url";
import gexfQvgeMineAiringUrl from "../../../test/corpus/styles/gexf/qvge-mine-airing.gexf?url";
import gexfSigmaEdiasporaUrl from "../../../test/corpus/styles/gexf/sigma-moroccan-ediaspora.gexf.gz?url";
import { fidelityStory } from "../fidelity";

const meta: Meta = { title: "Style Fidelity/GEXF/Samples" };
export default meta;

export const Miserables: StoryObj = { ...fidelityStory("gexf-miserables", gexfMiserablesUrl), name: "miserables" };
export const GraphologyRio: StoryObj = {
    ...fidelityStory("gexf-graphology-rio", gexfGraphologyRioUrl),
    name: "graphology-rio",
};
export const GsaFpkiCerts: StoryObj = {
    ...fidelityStory("gexf-gsa-fpki-certs", gexfGsaFpkiCertsUrl),
    name: "gsa-fpki-certs",
};
export const QvgeMineAiring: StoryObj = {
    ...fidelityStory("gexf-qvge-mine-airing", gexfQvgeMineAiringUrl),
    name: "qvge-mine-airing",
};
export const SigmaEdiaspora: StoryObj = {
    ...fidelityStory("gexf-sigma-ediaspora", gexfSigmaEdiasporaUrl),
    name: "sigma-ediaspora",
};
export const SynthNxViz: StoryObj = { ...fidelityStory("gexf-synth-nx-viz", gexfSynthNxVizUrl), name: "synth-nx-viz" };
export const CnsWos: StoryObj = { ...fidelityStory("gexf-cns-wos", gexfCnsWosUrl), name: "cns-wos" };
export const HskChars: StoryObj = { ...fidelityStory("gexf-hsk-chars", gexfHskCharsUrl), name: "hsk-chars" };
