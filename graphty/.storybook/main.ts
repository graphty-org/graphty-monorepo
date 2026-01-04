import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: ["@storybook/addon-docs", "@chromatic-com/storybook"],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    typescript: {
        // Disable react-docgen entirely to avoid parsing graphty-element source files.
        // graphty-element uses Lit decorators (@customElement) which are not compatible
        // with react-docgen's Babel parser. Since we alias @graphty/graphty-element to
        // source files for proper tree-shaking, react-docgen would try to parse those
        // files and fail with "Decorators must be placed *after* the 'export' keyword".
        // See: https://github.com/storybookjs/storybook/issues/26780
        reactDocgen: false,
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config, { configType }) {
        const fs = await import("fs");
        const path = await import("path");
        const { mergeConfig, loadEnv } = await import("vite");

        // Load env file from monorepo root (one level up from this package)
        const monorepoRoot = path.resolve(__dirname, "../..");
        const env = loadEnv(configType === "DEVELOPMENT" ? "development" : "production", monorepoRoot, "");

        // SSL configuration via environment variables
        const sslKeyPath = env.HTTPS_KEY_PATH;
        const sslCertPath = env.HTTPS_CERT_PATH;
        const useHttps = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

        const server: Record<string, unknown> = {
            host: env.HOST ?? true,
            allowedHosts: true,
        };

        if (env.PORT) {
            server.port = parseInt(env.PORT);
        }

        if (useHttps) {
            server.https = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCertPath),
            };
        }

        if (configType === "DEVELOPMENT") {
            // Your development configuration goes here
        }

        if (configType === "PRODUCTION") {
            // Your production configuration goes here.
        }

        const merged = mergeConfig(config, {
            // Your environment configuration here
            server,
        });
        return merged;
    },
};
export default config;
