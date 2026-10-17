/**
 * @file The network sources a form can offer: every registered source with its descriptor (what
 * to ask for, which credentials it takes, its public samples), loading no source code.
 */

import { listSources, type SourceInfo } from "@graphty/graph-io";

/**
 * Every network source the element can load from, built-in and registered, with its descriptor.
 * Read at each call, so a source registered later appears. Experimental.
 * @returns One entry per source: `id`, `descriptor` and whether its code is loaded.
 */
export function sourceDescriptors(): readonly SourceInfo[] {
    return listSources();
}
