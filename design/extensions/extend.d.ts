/**
 * The whole @graphty/graphty-element/extend entry point, both tiers, as one declaration file, so a
 * single paths entry covers it: "@graphty/graphty-element/extend": ["design/extensions/extend.d.ts"].
 *
 * A plugin that uses only the simple tier (every define* verb) maps the path to simple.d.ts
 * instead: it reaches no other package and needs no lib setting beyond ES2020 and no skipLibCheck.
 * Map to this file only for the advanced tier.
 * The advanced declarations import @graphty/graph-format, which a plugin resolves from its own
 * node_modules (the package the element depends on), never from this repository's source.
 *
 * The advanced declarations need `lib` ES2024 or later (graph-format's resizable ArrayBuffer); the
 * simple tier needs ES2020 or later.
 *
 * Import log destinations from ./extend, the recommended path; ./logging (logging.d.ts) exports the
 * advanced logging surface too. Neither pulls in @graphty/graph-format at run time, Babylon.js or
 * Lit: ./extend is one of the entry points that stay free of them.
 */
export * from "./simple";
export * from "./common";
export * from "./palette";
export * from "./camera";
export * from "./layout";
export * from "./file-format";
export * from "./algorithm";
export * from "./extend-snapshot";
