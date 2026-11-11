import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type DefaultTheme, defineConfig, type HeadConfig } from "vitepress";
import { loadEnv } from "vite";
import { FAVICON_PACKAGES, packageOf } from "./theme/package-brand";

// Load environment variables from .env
const env = loadEnv("development", process.cwd(), "");

// Try to load typedoc sidebars if they exist
function loadTypedocSidebar(path: string): Array<{ text: string; link: string }> {
    // a file that is missing, or empty because a TypeDoc run was interrupted, gives no sidebar
    const text = existsSync(path) ? readFileSync(path, "utf-8").trim() : "";
    const sidebar = text === "" ? [] : JSON.parse(text);
    // DOCS_API_SIDEBARS=off (a pull request's Docs check, whose site nobody publishes) still parses the file
    // and renders every page, but without the API sidebars: each holds up to ~1,500 entries that VitePress
    // renders again on every one of ~2,500 pages, which is most of the "rendering pages" time.
    return process.env.DOCS_API_SIDEBARS === "off" ? [] : sidebar;
}

const graphtyTypedoc = loadTypedocSidebar("./docs/graphty-element/api/generated/typedoc-sidebar.json");
const algorithmsTypedoc = loadTypedocSidebar("./docs/algorithms/api/generated/typedoc-sidebar.json");
const layoutTypedoc = loadTypedocSidebar("./docs/layout/api/generated/typedoc-sidebar.json");
const cytoscapeTypedoc = loadTypedocSidebar("./docs/cytoscape-extensions/api/generated/typedoc-sidebar.json");
const graphIoTypedoc = loadTypedocSidebar("./docs/graph-io/api/generated/typedoc-sidebar.json");
const webgpuTypedoc = loadTypedocSidebar("./docs/webgpu-graph-algorithms/api/generated/typedoc-sidebar.json");

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

// Every page carries its sidebar in its own HTML, and a package's API sidebar lists up to ~1,500 pages. Rendered on
// each of ~2,500 pages, that made the published site 2.8 GB, which GitHub Pages took over 10 minutes to sync (#6498).
// So a page under one API module gets a sidebar where only that module lists its members, and every other page gets
// one that lists the modules alone; each module's own page lists all of its members.
type Sidebar = Record<string, DefaultTheme.SidebarItem[]>;

function apiLinks(item: DefaultTheme.SidebarItem): string[] {
    const own = item.link === undefined ? [] : [item.link.replace(/^(\/\.\.)*\/docs\//, "/")];
    return [...own, ...(item.items ?? []).flatMap(apiLinks)];
}

// the directory every link of a module shares, as a sidebar key: /graphty-element/api/generated/ai/
function moduleKey(module: DefaultTheme.SidebarItem): string {
    const dirs = apiLinks(module).map((link) => link.slice(0, link.lastIndexOf("/") + 1));
    return dirs.reduce((common, dir) => {
        while (!dir.startsWith(common)) {
            common = common.slice(0, common.lastIndexOf("/", common.length - 2) + 1);
        }
        return common;
    });
}

function splitApiSidebars(sidebar: Sidebar, apis: DefaultTheme.SidebarItem[][]): Sidebar {
    const split: Sidebar = {};
    const withApi = (
        sections: DefaultTheme.SidebarItem[],
        open?: DefaultTheme.SidebarItem,
    ): DefaultTheme.SidebarItem[] =>
        sections.map((section) =>
            section.items !== undefined && apis.includes(section.items)
                ? {
                      ...section,
                      items: section.items.map((module) =>
                          module === open ? module : { ...module, items: undefined },
                      ),
                  }
                : section,
        );
    for (const [key, sections] of Object.entries(sidebar)) {
        split[key] = withApi(sections);
        const api = sections.find((section) => section.items !== undefined && apis.includes(section.items));
        for (const module of api?.items ?? []) {
            if (module.items !== undefined && module.items.length > 0) {
                split[moduleKey(module)] = withApi(sections, module);
            }
        }
    }
    return split;
}

const config = defineConfig({
    vite: {
        resolve: {
            // the nav bar shows the lockup of the package a page documents (theme/NavBarTitle.vue)
            alias: [
                {
                    find: /^.*\/VPNavBarTitle\.vue$/,
                    replacement: fileURLToPath(new URL("./theme/NavBarTitle.vue", import.meta.url)),
                },
            ],
        },
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

    title: "graphty",
    description: "Modular graph visualization ecosystem",
    base: "/docs/",
    // the site data (with every sidebar) and the page hash map load once as a script, not inline in every page
    metaChunk: true,

    // head hrefs are not rewritten by `base`, so they carry /docs/ themselves
    head: [
        ["meta", { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#ffffff" }],
        ["meta", { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#14161f" }],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:site_name", content: "graphty" }],
        ["meta", { property: "og:title", content: "graphty documentation" }],
        ["meta", { property: "og:description", content: "Modular graph visualization ecosystem" }],
        ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ],

    // Each page gets the favicon of the package it documents (the graphty favicon while the package has none of its
    // own), and pages about graphty as a whole get the graphty link-preview image. A package page has no
    // link-preview image until the package has one of its own.
    transformPageData(pageData) {
        const pkg = packageOf(pageData.relativePath);
        const dir = pkg !== undefined && FAVICON_PACKAGES.includes(pkg) ? `/docs/brand/${pkg}` : "/docs";
        const head: HeadConfig[] = [
            ["link", { rel: "icon", href: `${dir}/favicon.ico`, sizes: "48x48" }],
            ["link", { rel: "icon", href: `${dir}/favicon.svg`, type: "image/svg+xml" }],
        ];
        if (pkg === undefined) {
            const image = "https://graphty.app/docs/open-graph-1200x630.png";
            head.push(
                ["meta", { property: "og:image", content: image }],
                ["meta", { name: "twitter:image", content: image }],
            );
        }
        pageData.frontmatter.head = [...(pageData.frontmatter.head ?? []), ...head];
    },

    vue: {
        template: {
            compilerOptions: {
                isCustomElement: (tag) => tag.includes(">"),
            },
        },
    },

    themeConfig: {
        // the lockup already spells the name, so the typed site title is hidden
        logo: {
            light: "/brand/graphty-lockup-color-on-light.svg",
            dark: "/brand/graphty-lockup-color-on-dark.svg",
            alt: "graphty",
        },
        siteTitle: false,
        nav: [
            { text: "Home", link: "/" },
            {
                text: "Packages",
                items: [
                    { text: "graphty-element", link: "/graphty-element/" },
                    { text: "algorithms", link: "/algorithms/" },
                    { text: "layout", link: "/layout/" },
                    { text: "cytoscape-extensions", link: "/cytoscape-extensions/" },
                    { text: "graph-io", link: "/graph-io/" },
                    { text: "webgpu-graph-algorithms", link: "/webgpu-graph-algorithms/" },
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
                        { text: "layout", link: "/layout/" },
                        { text: "cytoscape-extensions", link: "/cytoscape-extensions/" },
                        { text: "graph-io", link: "/graph-io/" },
                        { text: "webgpu-graph-algorithms", link: "/webgpu-graph-algorithms/" },
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
                        { text: "Styles from Files", link: "/graphty-element/guide/file-styles" },
                        { text: "Style Helpers & Palettes", link: "/graphty-element/guide/style-helpers" },
                        { text: "Layouts", link: "/graphty-element/guide/layouts" },
                        { text: "Graphviz Layouts", link: "/graphty-element/guide/graphviz-layouts" },
                        { text: "Acceleration", link: "/graphty-element/guide/acceleration" },
                        { text: "Algorithms", link: "/graphty-element/guide/algorithms" },
                        { text: "Data Sources", link: "/graphty-element/guide/data-sources" },
                        { text: "Network Sources", link: "/graphty-element/guide/network-sources" },
                        { text: "Events", link: "/graphty-element/guide/events" },
                        { text: "Columns, Runs & Progress", link: "/graphty-element/guide/vocabulary" },
                        { text: "Undo & History", link: "/graphty-element/guide/undo" },
                        { text: "Camera", link: "/graphty-element/guide/camera" },
                        { text: "Screenshots & Video", link: "/graphty-element/guide/screenshots" },
                        { text: "VR/AR", link: "/graphty-element/guide/vr-ar" },
                        { text: "AI Assistant", link: "/graphty-element/guide/ai-assistant" },
                        {
                            text: "The Conversation Format",
                            link: "/graphty-element/guide/ai-conversation-format",
                        },
                    ],
                },
                {
                    text: "Extending",
                    items: [
                        { text: "Custom Layouts", link: "/graphty-element/guide/extending/custom-layouts" },
                        { text: "Custom Algorithms", link: "/graphty-element/guide/extending/custom-algorithms" },
                        { text: "Custom Data Sources", link: "/graphty-element/guide/extending/custom-data-sources" },
                        { text: "Writing Shaders", link: "/graphty-element/guide/shaders" },
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
                        { text: "Loading from a service", link: "/graph-io/guide/loading-from-a-service" },
                        { text: "Cypher: Neo4j and Neptune", link: "/graph-io/guide/sources/cypher" },
                        { text: "Reading the graph", link: "/graph-io/guide/reading" },
                        { text: "Saving graphs", link: "/graph-io/guide/saving" },
                        { text: "Styles", link: "/graph-io/guide/styles" },
                        { text: "The import report and errors", link: "/graph-io/guide/report" },
                        { text: "Format detection", link: "/graph-io/guide/detection" },
                        { text: "Reading stored positions", link: "/graph-io/guide/positions" },
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
                        { text: "Writing a source", link: "/graph-io/guide/writing-a-source" },
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
                    text: "Core Concepts",
                    items: [
                        { text: "Results and Options", link: "/layout/guide/results" },
                        { text: "2D and 3D", link: "/layout/guide/dimensions" },
                    ],
                },
                {
                    text: "Layouts",
                    items: [
                        { text: "Geometric", link: "/layout/guide/geometric" },
                        { text: "Structural", link: "/layout/guide/structural" },
                        { text: "Force-Directed and Spectral", link: "/layout/guide/force-directed" },
                        { text: "Steppable Simulations", link: "/layout/guide/simulations" },
                        { text: "Performance", link: "/layout/guide/performance" },
                    ],
                },
                {
                    text: "API",
                    items: [{ text: "Overview", link: "/layout/api/" }],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: layoutTypedoc,
                },
            ],
            "/webgpu-graph-algorithms/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Overview", link: "/webgpu-graph-algorithms/" },
                        { text: "Getting Started", link: "/webgpu-graph-algorithms/guide/getting-started" },
                        { text: "Node and Browser Setup", link: "/webgpu-graph-algorithms/guide/setup" },
                    ],
                },
                {
                    text: "Guides",
                    items: [
                        { text: "Algorithms", link: "/webgpu-graph-algorithms/guide/algorithms" },
                        { text: "Layouts", link: "/webgpu-graph-algorithms/guide/layouts" },
                        { text: "Errors", link: "/webgpu-graph-algorithms/guide/errors" },
                        { text: "With graphty-element", link: "/webgpu-graph-algorithms/guide/graphty-element" },
                    ],
                },
                {
                    text: "API",
                    items: [{ text: "Overview", link: "/webgpu-graph-algorithms/api/" }],
                },
                {
                    text: "Generated TypeDoc",
                    collapsed: true,
                    items: webgpuTypedoc,
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

config.themeConfig!.sidebar = splitApiSidebars(config.themeConfig!.sidebar as Sidebar, [
    graphtyTypedoc,
    algorithmsTypedoc,
    layoutTypedoc,
    cytoscapeTypedoc,
    graphIoTypedoc,
    webgpuTypedoc,
]);

export default config;
