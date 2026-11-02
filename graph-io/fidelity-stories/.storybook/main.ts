import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/web-components-vite";

/** graphty-element's Storybook settings, which the stories' copy of the element needs too. */
const element = (path: string): string => fileURLToPath(new URL(`../../../graphty-element/${path}`, import.meta.url));

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.ts"],
    addons: [],
    // the brand logo and favicon (manager.ts); the oracle pictures are imported by the stories. The specimen
    // sheets that name pictures beside them (DOT, GML) are served with them by their own file names
    // (stories/fidelity.ts, #5344).
    staticDirs: [
        { from: "./brand", to: "/" },
        ...["dot", "gml"].map((f) => ({ from: `../../test/fidelity/specimens/${f}`, to: `/fidelity/specimens/${f}` })),
    ],
    framework: {
        name: "@storybook/web-components-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config) {
        const { mergeConfig } = await import("vite");
        // Host, port and HTTPS come from the `storybook` npm script's CLI flags, which servherd fills in.
        return mergeConfig(config, {
            server: {
                allowedHosts: true,
                // graphty-element's source and graph-io's samples sit outside this package
                fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] },
            },
            optimizeDeps: {
                exclude: ["@mlc-ai/web-llm"],
                // Pre-bundled rather than discovered mid-run (graphty-element/.storybook/main.ts says why).
                // The DOT stories load Graphviz on first use, which the start-up scan does not see: found
                // mid-run, it reloaded the test page in every story-test run (#4145).
                include: ["lit/directives/ref.js", "@hpcc-js/wasm-graphviz"],
            },
            resolve: {
                // graphty-element loads the in-browser LLM from a CDN at run time; the stories never use it
                alias: { "@mlc-ai/web-llm": element(".storybook/webllm-stub.js") },
            },
            build: {
                rollupOptions: { external: ["@mlc-ai/web-llm"] },
            },
        });
    },
};
export default config;
