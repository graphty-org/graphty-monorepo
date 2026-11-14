import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/html-vite";

// The framework by its install directory, not its bare name: Storybook loads the framework's preset from
// its own install directory, where a bare name resolves only through the root node_modules link pnpm
// hoists, and an incremental `pnpm install` can drop that link (issue #7754).
const framework = dirname(createRequire(import.meta.url).resolve("@storybook/html-vite/package.json"));

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
        name: framework,
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
