import { resolve } from "path";
import type { Alias } from "vite";

/**
 * Module aliases shared by the dev server and build (vite.config.ts), the tests
 * (vitest.config.ts) and Storybook (which loads vite.config.ts), so all three run the same
 * graphty-element.
 *
 * An ordered list, not a map: the graphty-element rules must be tried before the bare "@"
 * rule, and the root entry point before the subpath one.
 */
export const aliases: Alias[] = [
    // graphty-element is read from SOURCE rather than from its published dist, so element
    // changes show up without a rebuild. Its exports map names one file per entry point at the
    // package root (index.ts, schema.ts, catalog.ts, extend.ts, format.ts, logging.ts,
    // session.ts, commands.ts, ai.ts, webgpu.ts, react.ts), so a subpath maps to the file of the
    // same name. tsconfig.json carries the same two rules; change them together or the editor
    // and the bundler will disagree about what @graphty/graphty-element/schema means.
    {
        find: /^@graphty\/graphty-element$/,
        replacement: resolve(__dirname, "../graphty-element/index.ts"),
    },
    {
        find: /^@graphty\/graphty-element\/(.+)$/,
        replacement: resolve(__dirname, "../graphty-element/$1.ts"),
    },
    // @mlc-ai/web-llm is an optional peer of graphty-element, loaded by a dynamic import inside
    // its WebLlmProvider and nowhere else. It is not a dependency of this app, but it IS
    // installed in graphty-element/node_modules, so without this rule the source alias above
    // would pull the whole package into the bundle. The stub throws an install instruction if
    // that path is ever taken.
    {
        find: "@mlc-ai/web-llm",
        replacement: resolve(__dirname, "./src/stubs/web-llm-stub.ts"),
    },
    { find: "@", replacement: resolve(__dirname, "./src") },
];
