import type {StorybookConfig} from "@storybook/react-vite";

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
    async viteFinal(config, {configType}) {
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");

        // SSL configuration via environment variables or default paths
        // Environment variables: SSL_KEY_PATH, SSL_CERT_PATH
        // Default paths: ~/ssl/atoms.key, ~/ssl/STAR_ato_ms.crt
        const sslDir = path.join(os.homedir(), "ssl");
        const sslKeyPath = process.env.SSL_KEY_PATH ?? path.join(sslDir, "atoms.key");
        const sslCertPath = process.env.SSL_CERT_PATH ?? path.join(sslDir, "STAR_ato_ms.crt");

        // Check if SSL files exist before trying to use them
        const sslKeyExists = fs.existsSync(sslKeyPath);
        const sslCertExists = fs.existsSync(sslCertPath);
        const useHttps = sslKeyExists && sslCertExists;

        const server: Record<string, unknown> = {
            host: true,
            allowedHosts: true,
        };

        if (useHttps) {
            server.https = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCertPath),
            };
        }

        const {mergeConfig} = await import("vite");

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
