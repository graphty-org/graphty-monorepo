import type {StorybookConfig} from "@storybook/react-vite";
import {loadEnv} from "vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: [
        "@storybook/addon-docs",
        "@chromatic-com/storybook",
    ],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config, {configType}) {
        // Load env file based on mode in the current working directory
        const env = loadEnv(configType.toLowerCase(), process.cwd(), "");

        const server = {
            host: true,
            allowedHosts: true,
        };

        // Apply HOST environment variable if set
        if (env.HOST) {
            server.host = env.HOST;
        }

        const {mergeConfig} = await import("vite");

        if (configType === "DEVELOPMENT") {
            // Your development configuration goes here
        }

        if (configType === "PRODUCTION") {
            // Your production configuration goes here.
        }

        const merged = mergeConfig(config, {
            server,
        });

        return merged;
    },
};

export default config;
