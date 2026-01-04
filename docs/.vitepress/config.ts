import { readFileSync, existsSync } from "node:fs";
import { defineConfig } from "vitepress";
import { loadEnv } from "vite";

// Load environment variables from .env
const env = loadEnv("development", process.cwd(), "");

// Try to load typedoc sidebars if they exist
function loadTypedocSidebar(path: string): Array<{ text: string; link: string }> {
    if (existsSync(path)) {
        return JSON.parse(readFileSync(path, "utf-8"));
    }
    return [];
}

const graphtyTypedoc = loadTypedocSidebar("./docs/graphty-element/api/generated/typedoc-sidebar.json");
const algorithmsTypedoc = loadTypedocSidebar("./docs/algorithms/api/generated/typedoc-sidebar.json");
const layoutTypedoc = loadTypedocSidebar("./docs/layout/api/generated/typedoc-sidebar.json");

export default defineConfig({
    vite: {
        server: {
            host: env.HOST || true,
            port: env.DOCS_PORT ? parseInt(env.DOCS_PORT) : 9080,
            https:
                env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH
                    ? {
                          key: readFileSync(env.HTTPS_KEY_PATH),
                          cert: readFileSync(env.HTTPS_CERT_PATH),
                      }
                    : undefined,
        },
    },

    title: "Graphty",
    description: "Modular graph visualization ecosystem",
    base: "/docs/",

    // Ignore dead links during build
    ignoreDeadLinks: true,

    vue: {
        template: {
            compilerOptions: {
                isCustomElement: (tag) => tag.includes(">"),
            },
        },
    },

    themeConfig: {
        nav: [
            { text: "Home", link: "/" },
            {
                text: "Packages",
                items: [
                    { text: "graphty-element", link: "/graphty-element/" },
                    { text: "algorithms", link: "/algorithms/" },
                    { text: "layout", link: "/layout/" },
                ],
            },
        ],

        sidebar: {
            "/": [
                {
                    text: "Packages",
                    items: [
                        { text: "graphty-element", link: "/graphty-element/" },
                        { text: "algorithms", link: "/algorithms/" },
                        { text: "layout", link: "/layout/" },
                    ],
                },
                {
                    text: "Quick Links",
                    items: [
                        { text: "Storybook Examples", link: "https://graphty.app/storybook/element/" },
                        { text: "Algorithm Demos", link: "https://graphty.app/algorithms/" },
                        { text: "Layout Demos", link: "https://graphty.app/layout/examples/index.html" },
                        { text: "GitHub", link: "https://github.com/graphty-org/graphty-monorepo" },
                    ],
                },
            ],
            "/graphty-element/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Overview", link: "/graphty-element/" },
                        { text: "Getting Started", link: "/graphty-element/guide/getting-started" },
                        { text: "Installation", link: "/graphty-element/guide/installation" },
                    ],
                },
                {
                    text: "Usage",
                    items: [
                        { text: "Web Component API", link: "/graphty-element/guide/web-component" },
                        { text: "JavaScript API", link: "/graphty-element/guide/javascript-api" },
                        { text: "Styling", link: "/graphty-element/guide/styling" },
                        { text: "Style Helpers & Palettes", link: "/graphty-element/guide/style-helpers" },
                        { text: "Layouts", link: "/graphty-element/guide/layouts" },
                        { text: "Algorithms", link: "/graphty-element/guide/algorithms" },
                        { text: "Data Sources", link: "/graphty-element/guide/data-sources" },
                        { text: "Events", link: "/graphty-element/guide/events" },
                        { text: "Camera", link: "/graphty-element/guide/camera" },
                        { text: "Screenshots & Video", link: "/graphty-element/guide/screenshots" },
                        { text: "VR/AR", link: "/graphty-element/guide/vr-ar" },
                    ],
                },
                {
                    text: "Extending",
                    items: [
                        { text: "Custom Layouts", link: "/graphty-element/guide/extending/custom-layouts" },
                        { text: "Custom Algorithms", link: "/graphty-element/guide/extending/custom-algorithms" },
                        { text: "Custom Data Sources", link: "/graphty-element/guide/extending/custom-data-sources" },
                    ],
                },
                {
                    text: "API",
                    items: [
                        { text: "Overview", link: "/graphty-element/api/" },
                        { text: "Web Component API", link: "/graphty-element/api/web-component" },
                        { text: "JavaScript API", link: "/graphty-element/api/javascript" },
                    ],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: graphtyTypedoc,
                },
            ],
            "/algorithms/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Overview", link: "/algorithms/" },
                        { text: "Getting Started", link: "/algorithms/guide/getting-started" },
                        { text: "Installation", link: "/algorithms/guide/installation" },
                    ],
                },
                {
                    text: "Core Concepts",
                    items: [
                        { text: "Graph Data Structure", link: "/algorithms/guide/graph" },
                        { text: "Traversal Algorithms", link: "/algorithms/guide/traversal" },
                        { text: "Shortest Path", link: "/algorithms/guide/shortest-path" },
                        { text: "Centrality", link: "/algorithms/guide/centrality" },
                    ],
                },
                {
                    text: "Advanced",
                    items: [
                        { text: "Community Detection", link: "/algorithms/guide/community" },
                        { text: "Clustering", link: "/algorithms/guide/clustering" },
                        { text: "Flow Algorithms", link: "/algorithms/guide/flow" },
                        { text: "Link Prediction", link: "/algorithms/guide/link-prediction" },
                        { text: "Performance", link: "/algorithms/guide/performance" },
                    ],
                },
                {
                    text: "API",
                    items: [
                        { text: "Overview", link: "/algorithms/api/" },
                    ],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: algorithmsTypedoc,
                },
            ],
            "/layout/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Overview", link: "/layout/" },
                        { text: "Getting Started", link: "/layout/guide/getting-started" },
                        { text: "Installation", link: "/layout/guide/installation" },
                    ],
                },
                {
                    text: "Layouts",
                    items: [
                        { text: "Force-Directed", link: "/layout/guide/force-directed" },
                        { text: "Geometric", link: "/layout/guide/geometric" },
                        { text: "Hierarchical", link: "/layout/guide/hierarchical" },
                        { text: "Spectral", link: "/layout/guide/spectral" },
                    ],
                },
                {
                    text: "Advanced",
                    items: [
                        { text: "3D Layouts", link: "/layout/guide/3d-layouts" },
                        { text: "Graph Generators", link: "/layout/guide/generators" },
                        { text: "Layout Helpers", link: "/layout/guide/helpers" },
                    ],
                },
                {
                    text: "API",
                    items: [
                        { text: "Overview", link: "/layout/api/" },
                    ],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: layoutTypedoc,
                },
            ],
        },

        socialLinks: [{ icon: "github", link: "https://github.com/graphty-org/graphty-monorepo" }],

        search: {
            provider: "local",
        },

        editLink: {
            pattern: "https://github.com/graphty-org/graphty-monorepo/edit/master/docs/:path",
        },
    },
});
