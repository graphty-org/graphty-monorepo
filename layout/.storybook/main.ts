import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/html-vite";

// The framework by its install directory, not its bare name: Storybook loads the framework's preset from
// its own install directory, where a bare name resolves only through the root node_modules link pnpm
// hoists, and an incremental `pnpm install` can drop that link (issue #7754).
const framework = dirname(createRequire(import.meta.url).resolve("@storybook/html-vite/package.json"));

const config: StorybookConfig = {
    stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: ["@storybook/addon-docs"],
    // the brand logo and favicon (manager.ts)
    staticDirs: [{ from: "./brand", to: "/" }],
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
            // Allow access from any host (needed when accessing via custom hostnames like dev.ato.ms)
            server: {
                allowedHosts: true,
            },
        });
    },
};
export default config;
