import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.ts"],
    addons: ["@storybook/addon-docs"],
    staticDirs: [
        // the brand logo and favicon (manager.ts)
        { from: "./brand", to: "/" },
        // the sample datasets, from graph-samples' build (the files graphty.app publishes), so the stories and their
        // visual capture load them with no internet (stories/demo.ts, datasetOptions)
        { from: "../../graph-samples/dist/data/v1", to: "/graph-samples-data/v1" },
    ],
    framework: {
        name: "@storybook/html-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config) {
        const { mergeConfig } = await import("vite");
        return mergeConfig(config, {
            // the package's `imports` field maps "#gpu-platform" to dist/; the stories run the source
            resolve: {
                alias: { "#gpu-platform": fileURLToPath(new URL("../src/gpu-platform-browser.ts", import.meta.url)) },
            },
            // Allow access from any host (needed when accessing via custom hostnames)
            server: {
                allowedHosts: true,
            },
        });
    },
};
export default config;
