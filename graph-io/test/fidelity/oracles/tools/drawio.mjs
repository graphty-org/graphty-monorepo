#!/usr/bin/env node
// Re-creates the yEd GraphML stand-in oracles: draw.io 32.4.1's own SVG of each yEd GraphML sample.
// yEd itself cannot make them: its license (yEd Software License Agreement 1.2, section 1) says
// "The Software may not be used as part of an automated process", and yEd has no SVG export
// outside its UI by design. draw.io is what stands in.
//
// Two of draw.io's own steps, unmodified, in headless Chromium on draw.io's export page
// (src/main/webapp/export3.html, the page the draw.io desktop CLI `drawio -x -f svg` drives):
//   1. File > Import of a .graphml: EditorUi.doImportGraphML, which is
//      `new mxGraphMlCodec().decode(graphml, done, error)` -> a draw.io mxfile.
//   2. The desktop CLI's SVG export of that mxfile: render({ xml, format: "svg", w: 1200, h: 900,
//      border: 0, theme: "light" }) (the light theme writes plain colors instead of CSS light-dark()
//      pairs, which resvg cannot read), then the page's own "get-svg-data" handler (graph.getSvg), whose SVG text is
//      written byte for byte. The page talks to Electron through `window.electron`; that object is
//      provided here (it only passes messages) and the user agent names Electron so the page takes
//      the desktop path. One thing in draw.io is replaced: mxGraphMlCodec.createMxGraph, which in
//      32.4.1 builds a bare mxGraph that throws inside draw.io's own Graph.js; it gets draw.io's own
//      importer graph (the body of its Visio codec's createMxGraph, copied: a Graph whose parents never
//      grow to fit their children).
//
//   node drawio.mjs [sample-id ...]      (no ids: every sample below and every specimen sheet)
//
// Specimen sheets (graph-io/test/fidelity/specimens/yed-graphml/ and yed-live-graphml/) are named by their
// sample id, `<format>-<sheet id>`; their oracles stand in for yEd and yEd Live until the owner exports each
// sheet from the real program by hand (File > Export > SVG at 1200 x 900).
//
// DRAWIO_WEBAPP: draw.io 32.4.1's src/main/webapp (default <main checkout>/tmp/style-fidelity/
// tools/drawio/app/drawio/src/main/webapp). Fonts: Chromium runs with the repository's pinned fonts
// (visual-fonts/fonts.conf). The PNG beside each SVG comes from rasterize.mjs (resvg).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "../../../../../tools/isolated-git-env.mjs";
import { gunzipSync } from "node:zlib";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../..");
const main = dirname(
    execFileSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
        encoding: "utf8",
        env: isolatedGitEnv(),
    }).trim(),
);
const web = process.env.DRAWIO_WEBAPP ?? join(main, "tmp/style-fidelity/tools/drawio/app/drawio/src/main/webapp");
const W = 1200;
const H = 900;
const corpus = "graph-io/test/corpus/styles";

// id -> file under graph-io/test/corpus/styles (samples.ts and corpus-samples.ts, routes yed-file / drawio)
export const SAMPLES = {
    "graphml-yed-voctomix": "graphml/yed-shapenode/voc__voctomix__schema.graphml",
    "graphml-open-archaeo": "graphml/fidelity/open-archaeo.graphml",
    "graphml-galaxy-lcms-workflow": "graphml/fidelity/galaxy-lcms-workflow.graphml",
    "graphml-scala-collection-mutable": "graphml/fidelity/scala-collection-mutable.graphml",
    "graphml-libcitygml-mapping": "graphml/fidelity/libcitygml-mapping.graphml",
    "graphml-cla-checker-graph": "graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz",
    "graphml-stm32-func": "graphml/LTVA1_STM32CrapSynth__func.graphml.gz",
    "graphml-yfiles-html-ss13-tree": "graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz",
    "graphml-yfiles-html-stag-flowchart": "graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml",
    "graphml-synthetic-nodes": "graphml/fidelity/synthetic-nodes.graphml",
    "graphml-synthetic-edges": "graphml/fidelity/synthetic-edges.graphml",
    "graphml-magiclantern-architecture": "graphml/fidelity/magiclantern-architecture.graphml",
};

// the specimen formats this route draws: format id -> the program its oracle stands in for
const SPECIMEN_FORMATS = {
    "yed-graphml": "yEd",
    "yed-live-graphml": "yEd Live",
};
const specimens = "graph-io/test/fidelity/specimens";

/**
 * The repository path of a sample's file.
 * @param {string} id - a sample id or a specimen sample id
 * @returns {string | undefined} the path, relative to the repository
 */
function sourceOf(id) {
    if (SAMPLES[id]) {
        return `${corpus}/${SAMPLES[id]}`;
    }
    const format = Object.keys(SPECIMEN_FORMATS).find((f) => id.startsWith(`${f}-specimen-`));
    return format ? `${specimens}/${format}/${id.slice(format.length + 1)}.graphml` : undefined;
}

const SPECIMEN_IDS = Object.keys(SPECIMEN_FORMATS).flatMap((f) =>
    readdirSync(join(repo, specimens, f))
        .filter((n) => n.endsWith(".graphml"))
        .map((n) => `${f}-${n.slice(0, -".graphml".length)}`)
        .sort(),
);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(SAMPLES), ...SPECIMEN_IDS];
const version = readFileSync(join(web, "../../../VERSION"), "utf8").trim();
const { chromium } = createRequire(join(repo, "graphty-element/package.json"))("playwright");
const browser = await chromium.launch({
    env: { ...process.env, FONTCONFIG_FILE: join(repo, "visual-fonts/fonts.conf") },
});
try {
    for (const id of ids) {
        const rel = sourceOf(id);
        if (!rel) {
            throw new Error(`drawio.mjs: unknown sample ${id}`);
        }
        const file = join(repo, rel);
        const bytes = readFileSync(file);
        const graphml = (rel.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8");
        const context = await browser.newContext({
            viewport: { width: W, height: H },
            deviceScaleFactor: 1,
            userAgent:
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) draw.io/32.4.1 Chrome/138.0.0.0 Electron/37.0.0 Safari/537.36",
        });
        await context.addInitScript(() => {
            // draw.io names the SVG and its gradients from Math.random (Editor.guid): seeded
            // (mulberry32, seed 1) so every run writes the same bytes
            let a = 1;
            Math.random = () => {
                a = (a + 0x6d2b79f5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            const listeners = {};
            globalThis.__msgs = [];
            globalThis.electron = {
                registerMsgListener: (name, fn) => {
                    listeners[name] = fn;
                },
                sendMessage: (name, arg) => globalThis.__msgs.push([name, arg]),
                request: () => {},
            };
            globalThis.__listeners = listeners;
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => console.error(`${id}: pageerror ${e.message}`));
        await page.goto(`file://${web}/export3.html`);
        await page.waitForFunction(
            () => globalThis.shapesLoaded === true && typeof globalThis.mxGraphMlCodec === "function",
        );
        const svg = await page.evaluate(
            ([text, w, h]) =>
                new Promise((resolveSvg, reject) => {
                    const wait = (name) =>
                        new Promise((ok, fail) => {
                            const t0 = Date.now();
                            const poll = () => {
                                const m = globalThis.__msgs.find((x) => x[0] === name || x[0] === "export-error");
                                if (m) {
                                    return m[0] === "export-error" ? fail(new Error(String(m[1]))) : ok(m[1]);
                                }
                                // a hung page is an error, not a wait: draw.io answers within seconds
                                return Date.now() - t0 > 120000 ? fail(new Error(`no ${name}`)) : setTimeout(poll, 50);
                            };
                            poll();
                        });
                    // draw.io 32.4.1's mxGraphMlCodec builds a bare mxGraph, which throws
                    // "this.graph.isRoundedPerimeter is not a function" once draw.io's Graph.js is
                    // loaded (as it is in every draw.io page); it is given draw.io's own importer
                    // graph instead: this body is copied verbatim from draw.io 32.4.1's Visio codec
                    // (mxVsdxCodec.prototype.createMxGraph in js/extensions.min.js), which is not global.
                    globalThis.mxGraphMlCodec.prototype.createMxGraph = function createMxGraph() {
                        const c = new globalThis.Graph();
                        c.setExtendParents(false);
                        c.setExtendParentsOnAdd(false);
                        c.setConstrainChildren(false);
                        c.setHtmlLabels(true);
                        c.getModel().maintainEdgeParent = false;
                        return c;
                    };
                    new globalThis.mxGraphMlCodec().decode(
                        text,
                        (xml) => {
                            globalThis.render({ xml, format: "svg", w, h, border: 0, theme: "light" });
                            wait("render-finished")
                                .then(() => {
                                    globalThis.__listeners["get-svg-data"]();
                                    return wait("svg-data");
                                })
                                .then(resolveSvg, (e) => reject(String(e)));
                        },
                        (e) => reject(String(e?.message ?? e)),
                    );
                }),
            [graphml, W, H],
        );
        await context.close();
        const svgPath = join(here, "..", `${id}.svg`);
        writeFileSync(svgPath, svg);
        const size = /<svg[^>]*\bwidth="([\d.]+)px"[^>]*\bheight="([\d.]+)px"/.exec(svg);
        const program = Object.entries(SPECIMEN_FORMATS).find(([f]) => id.startsWith(`${f}-`))?.[1];
        const meta = {
            sample: id,
            file: rel,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            program: "draw.io (jgraph/drawio)",
            version,
            command:
                "export3.html (the draw.io desktop CLI's export page): new mxGraphMlCodec().decode(<file>) (draw.io's File > Import), then render({ xml, format: 'svg', w: 1200, h: 900, border: 0, theme: 'light' }) and the page's get-svg-data handler (graph.getSvg), as `drawio -x -f svg --width 1200 --height 900` does, with draw.io's light theme",
            standIn: true,
            ...(program ? { standInFor: program } : {}),
            standInReason: program
                ? `${program}, whose format this specimen sheet is written in, may not be automated: the yEd Software License Agreement 1.2 says 'The Software may not be used as part of an automated process' (yEd Live's terms are treated the same), and neither has an SVG export outside its UI. This is draw.io's drawing of draw.io's own import of the sheet (mxGraphMlCodec), which re-maps yEd shapes, label models, arrows and fonts to draw.io's own; it stands in until the owner exports the sheet from ${program} by hand (File > Export > SVG, 1200 x 900).`
                : "yEd, which wrote this file, may not be automated: the yEd Software License Agreement 1.2 says 'The Software may not be used as part of an automated process', and yEd has no SVG export outside its UI. This is draw.io's drawing of draw.io's own import of the file (mxGraphMlCodec), which re-maps yEd shapes, label models, arrows and fonts to draw.io's own.",
            canvas: {
                requested: "fit within 1200 x 900 px (draw.io's --width 1200 --height 900: one scale, aspect kept)",
                widthPx: size ? +size[1] : null,
                heightPx: size ? +size[2] : null,
            },
            fonts: "Chromium with FONTCONFIG_FILE=visual-fonts/fonts.conf (the repository's pinned fonts)",
            determinism:
                "Math.random seeded (mulberry32, seed 1) before draw.io loads: draw.io names the SVG root and its gradients from it",
            svgPostprocessing: "none: the SVG is draw.io's output byte for byte",
            date: new Date().toISOString().slice(0, 10),
            regenerate: `node graph-io/test/fidelity/oracles/tools/drawio.mjs ${id} && node graph-io/test/fidelity/oracles/tools/rasterize.mjs graph-io/test/fidelity/oracles/${id}.svg`,
        };
        writeFileSync(join(here, "..", `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
        console.log(svgPath);
    }
} finally {
    await browser.close();
}
