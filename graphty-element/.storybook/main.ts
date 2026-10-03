import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../stories/**/*.mdx"],
    addons: ["@chromatic-com/storybook", "@storybook/addon-vitest", "@storybook/addon-docs"],
    framework: {
        name: "@storybook/web-components-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config) {
        const path = await import("path");
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
        return merged;
    },
};
export default config;
