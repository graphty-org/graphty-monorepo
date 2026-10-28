/**
 * Every format's specimen registry, in Storybook folder order, and their sheets as fidelity samples. A format's
 * sheets are added in its own `<format>/registry.ts`; this list changes only when a format is added.
 */
import type { FidelitySample } from "../samples.js";
import { FORMAT as cx } from "./cx/registry.js";
import { FORMAT as cx2 } from "./cx2/registry.js";
import { FORMAT as cys } from "./cys/registry.js";
import { FORMAT as cytoscapejs } from "./cytoscapejs/registry.js";
import { FORMAT as dot } from "./dot/registry.js";
import { FORMAT as gephiJson } from "./gephi-json/registry.js";
import { FORMAT as gexf } from "./gexf/registry.js";
import { FORMAT as gml } from "./gml/registry.js";
import { FORMAT as graphology } from "./graphology/registry.js";
import { FORMAT as pajek } from "./pajek/registry.js";
import { type SpecimenFormat, specimenSamples } from "./sheets.js";
import { FORMAT as visNetwork } from "./vis-network/registry.js";
import { FORMAT as xgmml } from "./xgmml/registry.js";
import { FORMAT as yedGraphml } from "./yed-graphml/registry.js";
import { FORMAT as yedLiveGraphml } from "./yed-live-graphml/registry.js";

export const SPECIMEN_FORMATS: readonly SpecimenFormat[] = [
    cytoscapejs,
    visNetwork,
    graphology,
    gephiJson,
    dot,
    gexf,
    yedGraphml,
    yedLiveGraphml,
    gml,
    pajek,
    xgmml,
    cx,
    cx2,
    cys,
];

/** Every specimen sheet as a fidelity sample (id `<format>-<sheet>`). */
export const SPECIMEN_SAMPLES: readonly FidelitySample[] = SPECIMEN_FORMATS.flatMap(specimenSamples);
