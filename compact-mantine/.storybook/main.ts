import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
    // The first entry picks up the written documentation pages -- the
    // introduction and each section's overview. Without it only files named
    // `*.stories.*` are indexed, which is why those pages had never appeared in
    // the sidebar.
    stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|ts|tsx)"],
    // addon-docs gets remark-gfm for its MDX compiler: without it the Markdown tables in the .mdx
    // pages render as raw pipe text. addon-a11y runs axe-core against every story and reports
    // violations in the Accessibility panel, which is what catches a missing name, a bad role or
    // a contrast failure before it is published. Controls, actions, the toolbar and the viewport
    // are part of Storybook itself.
    addons: [
        {
            name: "@storybook/addon-docs",
            options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
        },
        "@storybook/addon-a11y",
    ],
    // the brand logo and favicon (manager.ts)
    staticDirs: [{ from: "./brand", to: "/" }],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    docs: {},
    typescript: {
        reactDocgen: "react-docgen-typescript",
    },
    core: {
        disableTelemetry: true,
        disableWhatsNewNotifications: true,
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
            server,
        });
        return merged;
    },
};

export default config;
