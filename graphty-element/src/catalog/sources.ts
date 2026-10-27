/**
 * @file The network sources a form can offer: every registered source with its descriptor (what
 * to ask for, which credentials it takes, its public samples) and what it can do beyond one load,
 * loading no source code.
 */

import { listSources } from "@graphty/graph-io";

import { ensureGraphSamplesSource } from "../data/graphSamplesSource";
import type { SourceCatalogEntry } from "../session/sources/types";

/**
 * Every network source the element can load from, built-in and registered, with its descriptor,
 * its public samples (graph-samples' datasets among them) and its `features`: whether it expands
 * a node (`expand`), pages a capped load (`more`) and reads a load again (`refresh`, every
 * source). Read from what each source declares, at each call, so a source registered later
 * appears; no source's code is loaded. Experimental.
 * @returns One entry per source: `id`, `descriptor`, whether its code is loaded, and `features`.
 */
export function sourceDescriptors(): readonly SourceCatalogEntry[] {
    ensureGraphSamplesSource();
    return Object.freeze(
        listSources().map((info) => {
            const declared = info.descriptor.features ?? [];
            return Object.freeze({
                ...info,
                features: Object.freeze({
                    expand: declared.includes("expand"),
                    more: declared.includes("page"),
                    refresh: true,
                }),
            });
        }),
    );
}
