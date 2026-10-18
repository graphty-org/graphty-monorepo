/**
 * Build GitHub Pages Script
 *
 * Creates graphty.app/algorithms/ in gh-pages/. Its landing page redirects to the package's documentation
 * (graphty.app/docs/algorithms/); the interactive demos are the package's Storybook, which deploy-pages.yml
 * publishes beside it. The HTML examples that
 * graphty.app/algorithms/examples/ served called the Graph class that algorithms 3.0.0 removed; every
 * URL they had becomes a redirect page to the story that shows the same algorithm, so old links keep
 * working.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Every page the examples had, and the story that replaces it (null: the Storybook's front page). */
const EXAMPLE_REDIRECTS = {
    "index.html": null,
    "algorithms/centrality/betweenness.html": "centrality--betweenness",
    "algorithms/centrality/closeness.html": "centrality--closeness",
    "algorithms/centrality/degree.html": "centrality--degree",
    "algorithms/centrality/eigenvector.html": "centrality--eigenvector",
    "algorithms/centrality/hits.html": "centrality--hits",
    "algorithms/centrality/katz.html": "centrality--katz",
    "algorithms/centrality/pagerank.html": "centrality--page-rank",
    "algorithms/clustering/hierarchical.html": "clustering--hierarchical",
    "algorithms/clustering/k-core.html": "clustering--k-core",
    "algorithms/clustering/mcl.html": "clustering--mcl",
    "algorithms/clustering/spectral.html": "clustering--spectral",
    "algorithms/community/girvan-newman.html": "community--girvan-newman",
    "algorithms/community/label-propagation.html": "community--label-propagation",
    "algorithms/community/leiden.html": "community--leiden",
    "algorithms/community/louvain.html": "community--louvain",
    "algorithms/components/connected-components.html": "components--connected",
    "algorithms/flow/ford-fulkerson.html": "flow--ford-fulkerson",
    "algorithms/flow/min-cut.html": "flow--min-cut",
    "algorithms/link-prediction/adamic-adar.html": "linkprediction--adamic-adar",
    "algorithms/link-prediction/common-neighbors.html": "linkprediction--common-neighbors",
    "algorithms/matching/bipartite.html": "matching--bipartite",
    "algorithms/matching/isomorphism.html": "matching--isomorphism",
    "algorithms/mst/kruskal.html": "mst--kruskal",
    "algorithms/mst/prim.html": "mst--prim",
    "algorithms/pathfinding/astar.html": "pathfinding--a-star",
    "algorithms/research/grsbm.html": null,
    "algorithms/research/sync.html": null,
    "algorithms/research/terahac.html": null,
    "algorithms/shortest-path/bellman-ford.html": "shortestpath--bellman-ford",
    "algorithms/shortest-path/dijkstra.html": "shortestpath--dijkstra",
    "algorithms/shortest-path/floyd-warshall.html": "shortestpath--floyd-warshall",
    "algorithms/traversal/bfs.html": "traversal--bfs",
    "algorithms/traversal/dfs.html": "traversal--dfs",
};

const EXAMPLES_MOVED = {
    title: "The algorithms examples have moved",
    body: "The algorithms examples are now stories in the",
    linkText: "algorithms Storybook",
};

const LANDING_MOVED = {
    title: "The algorithms page has moved",
    body: "The algorithms package is documented at",
    linkText: "graphty.app/docs/algorithms",
};

function redirectPage(target, { title, body, linkText } = EXAMPLES_MOVED) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>${body} <a href="${target}">${linkText}</a>.</p>
</body>
</html>
`;
}

async function ensureDirectoryExists(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {
        // Directory already exists
    }
}

async function buildGitHubPages() {
    const rootDir = path.resolve(__dirname, "..");
    const ghPagesDir = path.join(rootDir, "gh-pages");

    try {
        console.log("Building GitHub Pages site...");
        await fs.rm(ghPagesDir, { recursive: true, force: true });
        await ensureDirectoryExists(ghPagesDir);

        // The landing page: the package's documentation replaced it
        await fs.writeFile(path.join(ghPagesDir, "index.html"), redirectPage("/docs/algorithms/", LANDING_MOVED));

        // A redirect at every URL the removed HTML examples had
        for (const [page, story] of Object.entries(EXAMPLE_REDIRECTS)) {
            const target = story === null ? "/storybook/algorithms/" : `/storybook/algorithms/?path=/story/${story}`;
            const dest = path.join(ghPagesDir, "examples", page);
            await ensureDirectoryExists(path.dirname(dest));
            await fs.writeFile(dest, redirectPage(target));
        }

        // Keep GitHub Pages from processing the files
        await fs.writeFile(path.join(ghPagesDir, ".nojekyll"), "");
        console.log(`GitHub Pages site built in ${ghPagesDir}`);
    } catch (error) {
        console.error("Error building GitHub Pages site:", error);
        process.exit(1);
    }
}

buildGitHubPages();
