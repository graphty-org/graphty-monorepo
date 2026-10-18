#!/usr/bin/env node
// Rasterizes oracle SVGs to PNGs beside them with resvg (@resvg/resvg-js 2.6.2, pinned in web/package.json):
//
//   node rasterize.mjs <oracle.svg> [...]
//
// Deterministic: system fonts are never loaded, only the repository's pinned fonts (visual-fonts/fonts),
// with the generic families set to the faces fontconfig picks there; white background; 1 SVG px = 1 PNG px.
// RESVG_DIR names another directory whose node_modules holds @resvg/resvg-js (default: web/).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../..");
const require = createRequire(join(process.env.RESVG_DIR ?? join(here, "web"), "package.json"));
const { Resvg } = require("@resvg/resvg-js");

const font = {
    loadSystemFonts: false,
    fontDirs: [join(repo, "visual-fonts/fonts")],
    defaultFontFamily: "DejaVu Sans",
    serifFamily: "DejaVu Serif",
    sansSerifFamily: "DejaVu Sans",
    monospaceFamily: "DejaVu Sans Mono",
};
for (const svg of process.argv.slice(2)) {
    const png = new Resvg(readFileSync(svg), { font, background: "white", fitTo: { mode: "original" } })
        .render()
        .asPng();
    const out = svg.replace(/\.svg$/, ".png");
    writeFileSync(out, png);
    console.log(out);
}
