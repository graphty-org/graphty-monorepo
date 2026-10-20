import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../stories/**/*.mdx"],
    addons: ["@storybook/addon-vitest", "@storybook/addon-docs"],
    staticDirs: [
        // the brand logo and favicon (manager.ts)
        { from: "./brand", to: "/" },
        // graph-samples' small datasets, from its build (the files graphty.app publishes), so the source
        // chooser story loads them with no network (stories/network-sources/SourceChooser.stories.ts)
        { from: "../../graph-samples/dist/data/v1", to: "/graph-samples-data/v1" },
    ],
    framework: {
        name: "@storybook/web-components-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config) {
        const path = await import("node:path");
        const { mergeConfig } = await import("vite");

        // Host, port and HTTPS come from the `storybook` npm script's CLI flags (--host, --https,
        // --ssl-cert, --ssl-key), which servherd fills in. Nothing here reads them.
        const merged = mergeConfig(config, {
            // Allow access from any host (needed when accessing via custom hostnames like dev.ato.ms)
            server: {
                allowedHosts: true,
            },
            optimizeDeps: {
                // Exclude @mlc-ai/web-llm from optimization - it's dynamically loaded at runtime
                exclude: ["@mlc-ai/web-llm"],
                // Pre-bundled rather than discovered: a story that reaches an element through a
                // lit directive pulls this in on first render, and a dependency discovered mid-run
                // makes Vite reload the page under the test that is running.
                include: [
                    "lit/directives/ref.js",
                    // The element's Babylon side-effect imports (test/packaging/babylon-side-effects.test.ts).
                    "@babylonjs/core/Meshes/instancedMesh",
                    "@babylonjs/core/Culling/ray",
                    "@babylonjs/core/Animations/animatable",
                    // The shaders src/meshes/bundledStandardShaders.ts loads with the element.
                    "@babylonjs/core/Shaders/default.vertex",
                    "@babylonjs/core/Shaders/default.fragment",
                    "@babylonjs/core/ShadersWGSL/default.vertex",
                    "@babylonjs/core/ShadersWGSL/default.fragment",
                    // Imported only by the Graphviz layouts' Worker, which a Layout/Graphviz story
                    // starts after the page has loaded.
                    "@hpcc-js/wasm-graphviz",
                ],
            },
            resolve: {
                alias: {
                    // Alias @mlc-ai/web-llm to a virtual module that will be loaded from CDN at runtime
                    "@mlc-ai/web-llm": path.join(__dirname, "webllm-stub.js"),
                },
            },
            build: {
                rollupOptions: {
                    external: ["@mlc-ai/web-llm"], // Dynamically loaded at runtime for in-browser LLM
                },
            },
        });
        // The library build leaves the Graphviz package out of the Worker it emits, for the
        // consumer's bundler to resolve. A Storybook is the application, so its Worker carries
        // the package; without this the built Storybook's Graphviz layouts report
        // graphviz.unavailable. Replaced rather than merged, since a merge keeps the external list.
        merged.worker = { format: "es" };
        return merged;
    },
};
export default config;
