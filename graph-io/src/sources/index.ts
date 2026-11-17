/**
 * `@graphty/graph-io/sources`: the default list of network sources, listed and added to without
 * loading any format's importer or any source's code. The root entry exports the same functions;
 * a page that only offers the sources (a start page, a form) imports them from here.
 */

export { listSources, registerSource } from "./catalog.js";
export type { GraphSource, LazySource, SourceDescriptor, SourceInfo } from "./types.js";
