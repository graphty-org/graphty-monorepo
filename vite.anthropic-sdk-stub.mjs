// A Vite plugin for every build that compiles graphty-element's source: graphty-element's own
// library and ./bundle builds, its Storybook and browser tests, and the graphty app, which reads
// graphty-element from source. A consumer of the published package gets graphty-element's built
// chunks and needs none of this.
//
// Plain JavaScript beside a .d.mts, at the root: graphty type-checks its Vite config inside a
// composite TypeScript project, which refuses a .ts source file outside the package.

const STUB = "\0graphty-empty-anthropic-toolset";

/**
 * Stubs the Anthropic SDK's Node-only agent toolset. `@anthropic-ai/sdk` (0.97.1, and still 0.133.0)
 * loads it with `import()` from its environment code, and its named imports from `node:crypto`,
 * `node:child_process` and `node:stream` fail a browser build. A page never reaches it (it runs
 * only for the SDK's own agent tools), so the stub is an empty module
 * (design/ai/tanstack-ai-harness-design.md, section 3.2).
 * @returns The plugin.
 */
export function stubAnthropicNodeToolset() {
    return {
        name: "graphty-stub-anthropic-node-toolset",
        enforce: "pre",
        resolveId: (id) => (id.endsWith("/tools/agent-toolset/node.mjs") ? STUB : null),
        load: (id) => (id === STUB ? "export {};" : null),
    };
}
