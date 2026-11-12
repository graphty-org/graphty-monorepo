import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: ["@storybook/addon-docs"],
    staticDirs: [
        // the brand logo and favicon (manager.ts)
        { from: "./brand", to: "/" },
        // the sample datasets and their pictures, from graph-samples' build (the files graphty.app
        // publishes), so the start page's library reads them with no internet (open.ts)
        { from: "../../graph-samples/dist/data/v1", to: "/data/graph-samples/v1" },
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
    async viteFinal(config, { configType }) {
        const { mergeConfig, loadEnv } = await import("vite");
        // The sample datasets and their pictures are served beside the Storybook (staticDirs, and
        // vite.sample-data.ts under vitest), not read from graphty.app, in every build of the
        // stories: the vitest story tests run in production mode too, where DEV is false (open.ts).
        const localData = { define: { "import.meta.env.VITE_LOCAL_SAMPLE_DATA": JSON.stringify("true") } };

        // Under vitest (the `storybook` test project) vitest serves the stories itself, on its own
        // host and port: the dev server's host and certificate below would point the test browser
        // at a name it cannot reach.
        if (process.env.VITEST !== undefined) {
            return mergeConfig(config, localData);
        }

        const fs = await import("node:fs");
        const path = await import("node:path");

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

        if (useHttps) {
            server.https = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCertPath),
            };
        }

        if (configType === "DEVELOPMENT") {
            // Your development configuration goes here
        }

        // Rolldown (Vite 8) does not keep module execution order across chunks by default. Storybook's
        // preview entry imports storybook/internal/preview/runtime first, which defines the
        // __STORYBOOK_MODULE_*__ globals; Rolldown kept that module in the entry chunk but moved the
        // preview annotations that read those globals into a shared chunk the entry imports, so they
        // ran first and threw "__STORYBOOK_MODULE_CLIENT_LOGGER__ is not defined".
        const build = { rolldownOptions: { output: { strictExecutionOrder: true } } };

        return mergeConfig(config, { ...localData, server, build });
    },
};
export default config;
