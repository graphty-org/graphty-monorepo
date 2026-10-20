/**
 * The shader-lab Storybook: experimental shader stories in stories/shader-lab/, kept out of the
 * main Storybook (and so out of the story roster and the visual review), because they are
 * animated experiments. Story files end in ".story.ts", which the main Storybook's glob
 * (".stories.ts") does not match.
 */
import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
    stories: ["../stories/shader-lab/**/*.story.ts"],
    addons: [],
    framework: { name: "@storybook/web-components-vite", options: {} },
    core: { disableTelemetry: true },
    async viteFinal(config) {
        const { mergeConfig } = await import("vite");
        return mergeConfig(config, {
            server: { allowedHosts: true },
            optimizeDeps: { include: ["@babylonjs/core"] },
        });
    },
};
export default config;
