/**
 * The whole @graphty/graphty-element/extend entry point, both tiers, as one declaration file, so a
 * single paths entry covers it: "@graphty/graphty-element/extend": ["design/extensions/extend.d.ts"].
 *
 * A plugin that uses only the simple tier needs only simple.d.ts, which reaches no other package.
 * The advanced declarations import @graphty/graph-format, which a plugin resolves from its own
 * node_modules (the package the element depends on), never from this repository's source.
 *
 * Log destinations are also reachable from ./logging (logging.d.ts).
 */
export * from "./simple";
export * from "./common";
export * from "./palette";
export * from "./camera";
export * from "./layout";
export * from "./file-format";
export * from "./algorithm";
export * from "./extend-snapshot";
