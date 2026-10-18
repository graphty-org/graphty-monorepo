import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
    // Listed one by one: Storybook keeps this order within a section, so each section reads from
    // its Overview through its stories in a deliberate order. The catch-all globs after them pick up
    // any new file (Storybook skips a file it already has), so a new story never goes missing.
    stories: [
        "../stories/docs/Welcome.mdx",
        "../stories/docs/GettingStarted.mdx",
        "../stories/docs/Centrality.mdx",
        "../stories/centrality/Degree.stories.ts",
        "../stories/centrality/Betweenness.stories.ts",
        "../stories/centrality/Closeness.stories.ts",
        "../stories/centrality/Eigenvector.stories.ts",
        "../stories/centrality/Katz.stories.ts",
        "../stories/centrality/PageRank.stories.ts",
        "../stories/centrality/HITS.stories.ts",
        "../stories/docs/Communities.mdx",
        "../stories/community/Louvain.stories.ts",
        "../stories/community/Leiden.stories.ts",
        "../stories/community/LabelPropagation.stories.ts",
        "../stories/community/GirvanNewman.stories.ts",
        "../stories/clustering/KCore.stories.ts",
        "../stories/clustering/Hierarchical.stories.ts",
        "../stories/clustering/Spectral.stories.ts",
        "../stories/clustering/MCL.stories.ts",
        "../stories/docs/ConnectedComponents.mdx",
        "../stories/components/ConnectedComponents.stories.ts",
        "../stories/docs/Paths.mdx",
        "../stories/traversal/BFS.stories.ts",
        "../stories/traversal/DFS.stories.ts",
        "../stories/shortest-path/Dijkstra.stories.ts",
        "../stories/shortest-path/BellmanFord.stories.ts",
        "../stories/pathfinding/AStar.stories.ts",
        "../stories/shortest-path/FloydWarshall.stories.ts",
        "../stories/docs/SpanningTrees.mdx",
        "../stories/mst/Kruskal.stories.ts",
        "../stories/mst/Prim.stories.ts",
        "../stories/docs/Flow.mdx",
        "../stories/flow/FordFulkerson.stories.ts",
        "../stories/flow/MinCut.stories.ts",
        "../stories/docs/Matching.mdx",
        "../stories/matching/Bipartite.stories.ts",
        "../stories/matching/Isomorphism.stories.ts",
        "../stories/docs/LinkPrediction.mdx",
        "../stories/link-prediction/CommonNeighbors.stories.ts",
        "../stories/link-prediction/AdamicAdar.stories.ts",
        "../stories/**/*.mdx",
        "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    ],
    addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
    // the brand logo and favicon (manager.ts)
    staticDirs: [{ from: "./brand", to: "/" }],
    framework: {
        name: "@storybook/html-vite",
        options: {},
    },
    core: {
        disableTelemetry: true,
        disableWhatsNewNotifications: true,
    },
    async viteFinal(config) {
        const { mergeConfig } = await import("vite");
        return mergeConfig(config, {
            // Allow access from any host (needed when accessing via custom hostnames like dev.ato.ms)
            server: {
                allowedHosts: true,
            },
        });
    },
};
export default config;
