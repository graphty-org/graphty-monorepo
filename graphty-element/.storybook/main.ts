import type { StorybookConfig } from "@storybook/web-components-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
    // A title several files share lists its files in the order given here, so the file holding a
    // title's Default story comes before the glob that picks up the rest.
    stories: [
        "../stories/NodeStyles.stories.ts",
        "../stories/EdgeStyles.stories.ts",
        "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
        "../stories/**/*.mdx",
    ],
    // addon-docs gets remark-gfm so the Markdown tables in the .mdx pages render as tables rather
    // than raw pipe text. addon-a11y runs axe-core against every story and reports violations in
    // the Accessibility panel and in the storybook test project (preview.ts sets the level).
    addons: [
        "@storybook/addon-vitest",
        {
            name: "@storybook/addon-docs",
            options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
        },
        "@storybook/addon-a11y",
    ],
    // the brand logo and favicon (manager.ts)
    staticDirs: [{ from: "./brand", to: "/" }],
    framework: {
        name: "@storybook/web-components-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
        disableWhatsNewNotifications: true,
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
