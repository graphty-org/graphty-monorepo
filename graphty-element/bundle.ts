/**
 * @file The entry of the self-contained bundle (`@graphty/graphty-element/bundle`), for a page
 * with a script tag and no build step.
 *
 * It is the root entry plus `GraphtyLogger`. A page with a bundler imports the logger from
 * `@graphty/graphty-element/logging`; a page loading this one file has no second address to
 * import from, and without the logger it could define a log destination and never switch
 * logging on.
 */

export * from "./index";
export { GraphtyLogger } from "./logging";
