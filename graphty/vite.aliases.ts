import { resolve } from "node:path";

import type { Alias } from "vite";

/**
 * Module aliases shared by the dev server and build (vite.config.ts), the tests
 * (vitest.config.ts) and Storybook (which loads vite.config.ts), so all three run the same
 * graphty-element and compact-mantine.
 *
 * An ordered list, not a map: the graphty-element rules must be tried before the bare "@"
 * rule, and the root entry point before the subpath one.
 */
export const aliases: Alias[] = [
    // graphty-element is read from SOURCE rather than from its published dist, so element
    // changes show up without a rebuild. Its exports map names one file per entry point at the
    // package root (index.ts, schema.ts, catalog.ts, extend.ts, format.ts, logging.ts,
    // session.ts, commands.ts, ai.ts, webgpu.ts, react.ts, jsx.ts), so a subpath maps to the file of the
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
    // compact-mantine is read from source too, for the same reason: a dev server built against
    // a stale compact-mantine dist fails at boot when app code imports a component the old
    // build lacks (issue #6112). tsconfig.json carries the same rule.
    {
        find: /^@graphty\/compact-mantine$/,
        replacement: resolve(__dirname, "../compact-mantine/src/index.ts"),
    },
    { find: "@", replacement: resolve(__dirname, "./src") },
];
