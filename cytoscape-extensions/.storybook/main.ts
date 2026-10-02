import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.ts"],
    addons: ["@storybook/addon-docs"],
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
            // Allow access from any host (needed when accessing via custom hostnames)
            server: {
                allowedHosts: true,
            },
        });
    },
};
export default config;
