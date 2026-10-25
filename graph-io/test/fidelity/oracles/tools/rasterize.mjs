#!/usr/bin/env node
// Rasterizes oracle SVGs to PNGs beside them with resvg (@resvg/resvg-js 2.6.2, pinned in graph-io's devDependencies):
//
//   node rasterize.mjs <oracle.svg> [...]
//
// Deterministic: system fonts are never loaded, only the repository's pinned fonts (visual-fonts/fonts),
// with the generic families set to the faces fontconfig picks there; white background; 1 SVG px = 1 PNG px.
// RESVG_DIR names another directory whose node_modules holds @resvg/resvg-js (default: graph-io).
// RASTER_IMAGE_DIR names the directory an SVG's relative <image> hrefs resolve in (default: the SVG's own
// directory): Graphviz writes a node's image= path as the DOT file spells it, relative to the sheet file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../..");
const require = createRequire(join(process.env.RESVG_DIR ?? resolve(here, "../../../.."), "package.json"));
const { Resvg } = require("@resvg/resvg-js");

const font = {
    loadSystemFonts: false,
    fontDirs: [join(repo, "visual-fonts/fonts")],
    defaultFontFamily: "DejaVu Sans",
    serifFamily: "DejaVu Serif",
    sansSerifFamily: "DejaVu Sans",
    monospaceFamily: "DejaVu Sans Mono",
};
// fontconfig's metric aliases (visual-fonts/conf.d/30-metric-aliases.conf), which the browser reading the same SVG
// applies and resvg does not: a family the pinned fonts lack is drawn in its metric twin, not the default face.
const METRIC_TWIN = new Map([
    ["arial", "Liberation Sans"],
    ["helvetica", "Liberation Sans"],
    ["arimo", "Liberation Sans"],
    ["times new roman", "Liberation Serif"],
    ["times", "Liberation Serif"],
    ["tinos", "Liberation Serif"],
    ["courier new", "Liberation Mono"],
    ["courier", "Liberation Mono"],
    ["cousine", "Liberation Mono"],
]);

/**
 * A font-family list with each name the pinned fonts lack replaced by its metric twin.
 * @param list - the family list as written
 * @returns the list resvg is given
 */
function withTwins(list) {
    return list
        .split(",")
        .map((name) => {
            const bare = name.trim().replace(/^(['"]|&quot;)|(['"]|&quot;)$/g, "");
            return METRIC_TWIN.get(bare.toLowerCase()) ?? name.trim();
        })
        .join(", ");
}
const MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
};
for (const svg of process.argv.slice(2)) {
    // resvg 2.6.2 reads a CSS url() with a quoted reference (draw.io writes style="fill:
    // url(&quot;#g&quot;)") as no paint and draws it black; the unquoted form means the same in CSS.
    // Only the bytes handed to resvg change, never the oracle SVG.
    const text = readFileSync(svg, "utf8")
        .replace(/url\(&quot;(#[^&]*)&quot;\)/g, "url($1)")
        .replace(/font-family="([^"]*)"/g, (_, list) => `font-family="${withTwins(list)}"`)
        .replace(/font-family:\s*([^;"]*)/g, (_, list) => `font-family: ${withTwins(list)}`);
    // resvg-js loads no relative file: inline each relative <image> href that exists in the image directory.
    const imageDir = process.env.RASTER_IMAGE_DIR ?? dirname(svg);
    const inlined = text.replace(/(xlink:href|href)="([^":]+)"/g, (whole, attr, href) => {
        const file = resolve(imageDir, href);
        if (href.startsWith("#") || !existsSync(file)) {
            return whole;
        }
        const type = MIME[extname(file).toLowerCase()];
        return type ? `${attr}="data:${type};base64,${readFileSync(file).toString("base64")}"` : whole;
    });
    const resvg = new Resvg(inlined, { font, background: "white", fitTo: { mode: "original" } });
    const png = resvg.render().asPng();
    const out = svg.replace(/\.svg$/, ".png");
    writeFileSync(out, png);
    console.log(out);
}
