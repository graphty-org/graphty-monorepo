/**
 * Build GitHub Pages Script
 *
 * The HTML examples that graphty.app/layout/examples/ served called the positional layouts that
 * layout 2.0.0 removed; the Storybook replaces them. This writes gh-pages/ with a redirect page at
 * every URL the examples had, each pointing at the story that shows the same layout, so old links
 * keep working.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ghPagesDir = path.resolve(__dirname, "../gh-pages");

/** Every page the examples had, and the story that replaces it (null: the Storybook's front page). */
const REDIRECTS = {
    "index.html": null,
    "3d-forceatlas2.html": "layout3d--force-atlas-2-3-d",
    "3d-kamada-kawai.html": "layout3d--kamada-kawai-3-d",
    "3d-spherical-layout.html": "layout3d--spherical",
    "3d-spring.html": "layout3d--spring-3-d",
    "arf-layout.html": "layout2d--arf",
    "bfs-layout.html": "layout2d--bfs",
    "bipartite-layout.html": "layout2d--bipartite",
    "circular-layout.html": "layout2d--circular",
    "forceatlas2-layout.html": "layout2d--force-atlas-2",
    "kamada-kawai-layout.html": "layout2d--kamada-kawai",
    "multipartite-layout.html": "layout2d--multipartite",
    "planar-layout.html": "layout2d--planar",
    "random-layout.html": "layout2d--random",
    "shell-layout.html": "layout2d--shell",
    "spectral-layout.html": "layout2d--spectral",
    "spiral-layout.html": "layout2d--spiral",
    "spring-layout.html": "layout2d--spring",
};

function redirectPage(target) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The layout examples have moved</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>The layout examples are now stories in the <a href="${target}">layout Storybook</a>.</p>
</body>
</html>
`;
}

await fs.rm(ghPagesDir, { recursive: true, force: true });
await fs.mkdir(path.join(ghPagesDir, "examples"), { recursive: true });
for (const [page, story] of Object.entries(REDIRECTS)) {
    const target = story === null ? "/storybook/layout/" : `/storybook/layout/?path=/story/${story}`;
    await fs.writeFile(path.join(ghPagesDir, "examples", page), redirectPage(target));
}
await fs.writeFile(path.join(ghPagesDir, "index.html"), redirectPage("/storybook/layout/"));
// keep GitHub Pages from running the site through Jekyll
await fs.writeFile(path.join(ghPagesDir, ".nojekyll"), "");
console.log(`Wrote ${Object.keys(REDIRECTS).length + 1} redirect pages to gh-pages/`);
