import { existsSync, readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "vitepress";
import { loadEnv } from "vite";

// Load environment variables from .env
const env = loadEnv("development", process.cwd(), "");

// Try to load typedoc sidebars if they exist
function loadTypedocSidebar(path: string): Array<{ text: string; link: string }> {
    // a file that is missing, or empty because a TypeDoc run was interrupted, gives no sidebar
    const text = existsSync(path) ? readFileSync(path, "utf-8").trim() : "";
    return text === "" ? [] : JSON.parse(text);
}

const graphtyTypedoc = loadTypedocSidebar("./docs/graphty-element/api/generated/typedoc-sidebar.json");
const algorithmsTypedoc = loadTypedocSidebar("./docs/algorithms/api/generated/typedoc-sidebar.json");
const layoutTypedoc = loadTypedocSidebar("./docs/layout/api/generated/typedoc-sidebar.json");
const cytoscapeTypedoc = loadTypedocSidebar("./docs/cytoscape-extensions/api/generated/typedoc-sidebar.json");
const graphIoTypedoc = loadTypedocSidebar("./docs/graph-io/api/generated/typedoc-sidebar.json");

// One sidebar entry per graph-io format page, titled by the page's own heading, so a format added to graph-io
// (whose page `npm run docs:reference` creates) appears here without an edit.
function graphIoFormatPages(): Array<{ text: string; link: string }> {
    const dir = "./docs/graph-io/guide/formats";
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir)
        .filter((f) => f.endsWith(".md") && f !== "index.md")
        .sort()
        .map((f) => ({
            text: /^# (.+)$/m.exec(readFileSync(`${dir}/${f}`, "utf-8"))?.[1] ?? f.slice(0, -3),
            link: `/graph-io/guide/formats/${f.slice(0, -3)}`,
        }));
}

export default defineConfig({
    vite: {
        server: {
            host: env.HOST || true,
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
                    { text: "layout", link: "/layout/api/generated/" },
                    { text: "cytoscape-extensions", link: "/cytoscape-extensions/" },
                    { text: "graph-io", link: "/graph-io/" },
                    { text: "visual-review", link: "/visual-review/" },
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
                        { text: "layout", link: "/layout/api/generated/" },
                        { text: "cytoscape-extensions", link: "/cytoscape-extensions/" },
                        { text: "graph-io", link: "/graph-io/" },
                        { text: "visual-review", link: "/visual-review/" },
                    ],
                },
                {
                    text: "Quick Links",
                    items: [
                        { text: "graphty-element Storybook", link: "https://graphty.app/storybook/graphty-element/" },
                        { text: "algorithms Storybook", link: "https://graphty.app/storybook/algorithms/" },
                        { text: "layout Storybook", link: "https://graphty.app/storybook/layout/" },
                        {
                            text: "cytoscape-extensions demo",
                            link: "https://graphty.app/storybook/cytoscape-extensions/",
                        },
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
                        { text: "Migrating to 3.0", link: "/graphty-element/guide/migrating-to-3" },
                    ],
                },
                {
                    text: "Usage",
                    items: [
                        { text: "Web Component API", link: "/graphty-element/guide/web-component" },
                        { text: "JavaScript API", link: "/graphty-element/guide/javascript-api" },
                        { text: "Styling", link: "/graphty-element/guide/styling" },
                        { text: "Coloring by a Column", link: "/graphty-element/guide/column-encoding" },
                        { text: "Style Helpers & Palettes", link: "/graphty-element/guide/style-helpers" },
                        { text: "Layouts", link: "/graphty-element/guide/layouts" },
                        { text: "Acceleration", link: "/graphty-element/guide/acceleration" },
                        { text: "Algorithms", link: "/graphty-element/guide/algorithms" },
                        { text: "Data Sources", link: "/graphty-element/guide/data-sources" },
                        { text: "Events", link: "/graphty-element/guide/events" },
                        { text: "Columns, Runs & Progress", link: "/graphty-element/guide/vocabulary" },
                        { text: "Undo & History", link: "/graphty-element/guide/undo" },
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
                        { text: "Migrating to 3.0", link: "/algorithms/guide/migrating-to-3" },
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
                    items: [{ text: "Overview", link: "/algorithms/api/" }],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: algorithmsTypedoc,
                },
            ],
            "/graph-io/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Overview", link: "/graph-io/" },
                        { text: "Quick start", link: "/graph-io/guide/quick-start" },
                    ],
                },
                {
                    text: "Using graph-io",
                    items: [
                        { text: "Loading graphs", link: "/graph-io/guide/loading" },
                        { text: "Reading the graph", link: "/graph-io/guide/reading" },
                        { text: "Saving graphs", link: "/graph-io/guide/saving" },
                        { text: "The import report and errors", link: "/graph-io/guide/report" },
                        { text: "Format detection", link: "/graph-io/guide/detection" },
                        { text: "Options reference", link: "/graph-io/guide/options" },
                    ],
                },
                {
                    text: "Formats",
                    items: [{ text: "All formats", link: "/graph-io/guide/formats/" }, ...graphIoFormatPages()],
                },
                {
                    text: "Extending",
                    items: [
                        { text: "Writing a format plugin", link: "/graph-io/guide/extending/new-format" },
                        { text: "Extending an existing format", link: "/graph-io/guide/extending/existing-format" },
                    ],
                },
                {
                    text: "Reference",
                    items: [{ text: "Issue and loss codes", link: "/graph-io/guide/codes" }],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: graphIoTypedoc,
                },
            ],
            // layout has no guide pages yet (there is no layout/docs/): its section is the
            // generated TypeDoc reference alone.
            "/layout/": [
                {
                    text: "API",
                    items: [{ text: "Overview", link: "/layout/api/generated/" }, ...layoutTypedoc],
                },
            ],
            "/cytoscape-extensions/": [
                {
                    text: "Guide",
                    items: [
                        { text: "Overview", link: "/cytoscape-extensions/" },
                        { text: "Getting Started", link: "/cytoscape-extensions/guide/getting-started" },
                        { text: "Installation", link: "/cytoscape-extensions/guide/installation" },
                        { text: "Layouts", link: "/cytoscape-extensions/guide/layouts" },
                        { text: "Algorithms", link: "/cytoscape-extensions/guide/algorithms" },
                        { text: "WebGPU", link: "/cytoscape-extensions/guide/webgpu" },
                        { text: "Graphs In and Out", link: "/cytoscape-extensions/guide/graphs-in-and-out" },
                        { text: "Calling graphty functions directly", link: "/cytoscape-extensions/guide/snapshot" },
                        { text: "Limits", link: "/cytoscape-extensions/guide/limits" },
                        {
                            text: "Migrating from Cytoscape",
                            link: "/cytoscape-extensions/guide/migrating-from-cytoscape",
                        },
                        { text: "Troubleshooting", link: "/cytoscape-extensions/guide/troubleshooting" },
                    ],
                },
                {
                    text: "Recipes",
                    items: [
                        {
                            text: "Color Nodes by PageRank",
                            link: "/cytoscape-extensions/guide/recipes/color-by-pagerank",
                        },
                        { text: "Size Nodes by Degree", link: "/cytoscape-extensions/guide/recipes/size-by-degree" },
                        { text: "Find Communities", link: "/cytoscape-extensions/guide/recipes/find-communities" },
                        {
                            text: "Highlight a Shortest Path",
                            link: "/cytoscape-extensions/guide/recipes/highlight-shortest-path",
                        },
                        { text: "Load a GraphML File", link: "/cytoscape-extensions/guide/recipes/load-graphml-file" },
                        {
                            text: "Animate a Force Layout",
                            link: "/cytoscape-extensions/guide/recipes/animate-force-layout",
                        },
                    ],
                },
                {
                    text: "Reference",
                    items: [
                        { text: "Layouts", link: "/cytoscape-extensions/reference/layouts" },
                        { text: "Algorithms", link: "/cytoscape-extensions/reference/algorithms" },
                        { text: "Generators, Datasets and Formats", link: "/cytoscape-extensions/reference/graphs" },
                        { text: "Demo", link: "https://graphty.app/storybook/cytoscape-extensions/" },
                    ],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: cytoscapeTypedoc,
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
