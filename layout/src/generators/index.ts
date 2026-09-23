/**
 * Re-export all graph generation functions. Every one is a deprecated alias of a function in
 * `@graphty/graph-samples/generators` (export * keeps the re-export itself from counting as a use
 * of a deprecated name).
 */

export * from "./basic";
export * from "./bipartite";
export * from "./grid";
export * from "./random";
export * from "./scale-free";
