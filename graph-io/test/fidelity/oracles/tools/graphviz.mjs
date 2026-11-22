#!/usr/bin/env node
// Re-creates the Graphviz oracles: each DOT sample drawn by Graphviz in WebAssembly (@hpcc-js/wasm-graphviz, the
// build graphty-element lays DOT files out with, pinned in its package.json) as SVG, and each GML sample whose only other route was gml2gv drawn by gml2gv | neato -n2 -Tsvg (a
// stand-in: the program that wrote those files, yEd, cannot run here). The SVG is written as Graphviz
// printed it (Graphviz writes no timestamp or run-dependent data), but for one thing: a font-family that
// names no generic family gets sans-serif after it (withSansFallback), the face Graphviz measured it in.
//
//   node graphviz.mjs [sample-id ...]      (no ids: every sample below, every DOT specimen sheet and every GML
//                                          specimen sheet whose stand-in is gml2gv)
//
// The DOT specimen sheets (../../specimens/dot/*.gv, sample id dot-<sheet>) pin every node with pos="x,y!" and are
// drawn by neato -n2 in the sheet's own directory (so image= paths resolve as a user's would). Any Graphviz
// warning fails the sheet, except the ones in EXPECTED_WARNINGS, which the specimens exist to show.
//
// GRAPHVIZ_BIN: the directory holding dot, neato and gml2gv
// (default <main checkout>/tmp/style-fidelity/tools/conda-graphviz/bin). Text is measured with the
// repository's pinned fonts (visual-fonts/), so no host font changes a layout, and in the face a browser draws
// the SVG's text in (graphviz-fonts.conf), so each node is sized for the label its SVG shows.
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import console from "node:console";
import process from "node:process";

import { mainCheckout } from "./main-checkout.mjs";
import { graphvizFamilyFor } from "../../../../../graphty-element/src/layout/graphviz/fonts.ts";
import { graphvizFont } from "../../../../dist/dot.js";
import { isYedDrawing } from "./own-drawing.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const testDir = resolve(here, "../../..");
const bin = process.env.GRAPHVIZ_BIN ?? join(mainCheckout, "tmp/style-fidelity/tools/conda-graphviz/bin");
// graphviz-fonts.conf with its paths filled in, and a cache of its own: its scan rules change what is cached.
const fontDir = mkdtempSync(join(tmpdir(), "graphviz-fonts-"));
const fontconfig = join(fontDir, "fonts.conf");
process.on("exit", () => rmSync(fontDir, { recursive: true, force: true }));
writeFileSync(
    fontconfig,
    readFileSync(join(here, "graphviz-fonts.conf"), "utf8")
        .replaceAll("@VISUAL_FONTS@", join(repo, "visual-fonts"))
        .replaceAll("@TOOLS@", here)
        .replaceAll("@CACHE@", join(fontDir, "cache")),
);

// 1200 x 900 px at 96 px per inch: 12.5 x 9.375 in. "!" scales the finished drawing up or down
// to fit; size never changes a dot, neato or twopi layout, only the final scale.
const SIZE = "12.5,9.375!";
const gmlStandIn =
    "yEd, which wrote this file, cannot run on this machine; this is Graphviz's own drawing of " +
    "gml2gv's conversion (pinned at the file's x/y with neato -n2). gml2gv maps a GML fill to " +
    "the outline color (no style=filled), keeps GML's y-down coordinates in Graphviz's y-up " +
    "space (the drawing is mirrored top to bottom), and drops yEd label and edge graphics.";

const DOT = [
    ["dot-profile", "corpus/styles/dot/graphviz-gallery-directed-profile.gv"],
    ["dot-real-linux-kernel", "corpus/styles/dot/fidelity/real-linux-kernel.gv"],
    ["dot-real-crazy", "corpus/styles/dot/fidelity/real-crazy.gv"],
    ["dot-real-siblings", "corpus/styles/dot/fidelity/real-siblings.gv"],
    ["dot-real-softmaint", "corpus/styles/dot/fidelity/real-softmaint.gv"],
    ["dot-real-happiness", "corpus/styles/dot/fidelity/real-happiness.gv"],
    ["dot-real-depcruise", "corpus/styles/dot/fidelity/real-depcruise.gv"],
    ["dot-synth-nodes", "corpus/styles/dot/fidelity/synth-nodes.gv"],
    ["dot-synth-edges-clusters", "corpus/styles/dot/fidelity/synth-edges-clusters.gv"],
];
// gml-yed-pmodel is not here: its oracle is Cytoscape desktop's (tools/cytoscape*).
const GML = [
    ["gml-need4stacks261", "corpus/styles/gml/spupyrev_bob__need4stacks261.gml"],
    ["gml-synthetic-coverage", "corpus/styles/gml/fidelity/synthetic-coverage.gml"],
    ["gml-dunnart-autobahn", "corpus/styles/gml/fidelity/dunnart-autobahn.gml"],
    ["gml-dunnart-planar-orthogonal", "corpus/styles/gml/fidelity/dunnart-planar-orthogonal.gml"],
    ["gml-jgrapht-grid-territorio", "corpus/styles/gml/fidelity/jgrapht-grid-territorio.gml"],
    ["gml-visualgraph-tree30", "corpus/styles/gml/fidelity/visualgraph-tree30.gml"],
];

const SPECIMENS = join(testDir, "fidelity/specimens/dot");
// Warnings a specimen is there to show; anything else Graphviz prints fails the sheet.
const EXPECTED_WARNINGS = {
    "specimen-labels": ["Warning: node 'label-overflow', graph 'specimen-labels' size too small for label"],
    "specimen-node-sizes-opacity": [
        "Warning: node 'fixedsize-true-overflow', graph 'specimen-node-sizes-opacity' size too small for label",
    ],
    "specimen-node-fills-borders": ["Warning: More than 2 colors specified for a gradient - ignoring remaining"],
    // forcelabels=false drops the external label that has no room: the specimen exists to show it
    "specimen-labels-p4": ["Warning: 1 out of 2 exterior labels positioned."],
};

const env = { ...process.env, FONTCONFIG_FILE: fontconfig };
const run = (cmd, args, input) =>
    execFileSync(join(bin, cmd), args, { env, input, maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "pipe"] });
// dot -V prints to stderr.
const version = /version (\S+ \(\S+\))/.exec(
    spawnSync(join(bin, "dot"), ["-V"], { env, encoding: "utf8" }).stderr,
)?.[1];
if (!version) throw new Error(`no Graphviz at ${bin}`);
const wanted = new Set(process.argv.slice(2));

const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"]);
/**
 * The SVG with each font-family list that names no generic family followed by sans-serif. Graphviz writes a name it
 * has no PostScript alias for (Helvetica-Outline, Verdana) as it is, and a browser draws a name it does not know in
 * its standard font, a serif; but Graphviz measured it in fontconfig's default sans face (graphviz-fonts.conf), as
 * graph-io's reading of the fontname draws it. A fontconfig pattern (DejaVu Sans:bold) is left alone: graph-io reads
 * it as the viewer's default face, which the SVG as written is drawn in.
 * @param svg - the SVG as Graphviz printed it
 * @returns the SVG to write
 */
function withSansFallback(svg) {
    return svg.toString().replace(/font-family="([^"]*)"/g, (whole, list) => {
        const names = list.split(",").map((n) => n.trim().toLowerCase());
        return list.includes(":") || names.some((n) => GENERIC.has(n)) ? whole : `font-family="${list},sans-serif"`;
    });
}

function write(id, file, printed, fields, rasterEnv = "", path = id) {
    if (isYedDrawing(oracles, path)) {
        return;
    }
    const bytes = readFileSync(join(testDir, file));
    const svg = withSansFallback(printed);
    const [, w, h] = /<svg width="([\d.]+)pt" height="([\d.]+)pt"/.exec(svg) ?? [];
    writeFileSync(join(oracles, `${path}.svg`), svg);
    const meta = {
        sample: id,
        file: `graph-io/test/${file}`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        program: "Graphviz",
        version: `${version} (conda-forge graphviz, CLI)`,
        ...fields,
        canvas: {
            requested: 'fit within 1200 x 900 px (size="12.5,9.375!", 96 px per inch)',
            widthPt: Number(w),
            heightPt: Number(h),
            widthPx: Math.round((Number(w) * 96) / 72),
            heightPx: Math.round((Number(h) * 96) / 72),
        },
        fonts:
            "FONTCONFIG_FILE=graph-io/test/fidelity/oracles/tools/graphviz-fonts.conf (the repository's pinned fonts, " +
            "each font-family resolved to the face a browser draws it in, Verdana to the test pages' Inter)",
        ...(fields.fonts === undefined ? {} : { fonts: fields.fonts }),
        svgPostprocessing:
            "a font-family naming no generic family gets sans-serif after it, the face Graphviz measured it in; " +
            "otherwise Graphviz's output byte for byte",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && ${rasterEnv}node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, join(oracles, `${path}.svg`))}`,
    };
    writeFileSync(join(oracles, `${path}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(`${id}: ${meta.canvas.widthPx} x ${meta.canvas.heightPx} px`);
}

// The DOT samples are drawn by the Graphviz build graphty-element runs (issue #8195): the native CLI sizes labels
// through pango and routes splines=ortho with another release, so its node places and routes differ from any
// graphty-element drawing for reasons that are not graphty-element's. The WebAssembly build has no fonts and sizes
// each label from its built-in width tables, picked by fontname; so, as graphty-element's layout does
// (src/layout/graphviz/fonts.ts, graphvizFamilyFor), each fontname is handed to Graphviz as the table family nearest
// the face Chromium draws it in, and the written SVG keeps the file's own font names.
// size= goes in as the graph's last statement, so it wins over a size the file sets itself, as the CLI's -G does.
// A fresh instance draws each layout: one instance laying out several files in a row fails on a later one
// ("table index is out of bounds").
const elementRequire = createRequire(join(repo, "graphty-element/package.json"));
const wasmPkg = JSON.parse(
    readFileSync(join(dirname(elementRequire.resolve("@hpcc-js/wasm-graphviz")), "../package.json"), "utf8"),
);
const { Graphviz } = await import(pathToFileURL(elementRequire.resolve("@hpcc-js/wasm-graphviz")).href);
async function wasmLayout(dot, engine) {
    Graphviz.unload();
    const graphviz = await Graphviz.load();
    return { svg: graphviz.layout(dot, "svg", engine), version: graphviz.version() };
}
const FONT_ATTR = /\s(font-family|font-weight|font-style)="[^"]*"/g;
const textTags = (svg) => svg.match(/<text\b[^>]*>/g) ?? [];
const fontAttrs = (tag) => (tag.match(FONT_ATTR) ?? []).join("");

/**
 * The Graphviz family each fontname is sized as, chosen as graphty-element chooses it (graphvizFamilyFor): the face
 * graph-io says a fontname is drawn in, measured on a canvas in Chromium, with "Verdana" registered as the Inter the
 * test pages draw it in (graphty-element/test/helpers/pin-label-font.ts).
 * @param fontnames - the fontnames, as the file gives them
 * @returns each fontname's family
 */
async function sizingFamilies(fontnames) {
    const pairs = new Map();
    const record = (css, text) => {
        pairs.set(`${css}\n${text}`, [css, text]);
        return 1;
    };
    for (const name of fontnames) graphvizFamilyFor(graphvizFont(name), record);
    const { chromium } = elementRequire("playwright");
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        const woff = readFileSync(join(repo, "graphty-element/test/fonts/inter-latin.woff2")).toString("base64");
        await page.setContent(
            `<style>@font-face{font-family:"Verdana";src:url(data:font/woff2;base64,${woff})}</style>`,
        );
        const widths = await page.evaluate(
            async (list) => {
                // runs in the page, where globalThis is the window
                await globalThis.document.fonts.load("14px Verdana");
                const context = globalThis.document.createElement("canvas").getContext("2d");
                return list.map(([css, text]) => {
                    context.font = css;
                    return context.measureText(text).width;
                });
            },
            [...pairs.values()],
        );
        const measured = new Map([...pairs.keys()].map((key, i) => [key, widths[i]]));
        const measure = (css, text) => measured.get(`${css}\n${text}`);
        return new Map(fontnames.map((name) => [name, graphvizFamilyFor(graphvizFont(name), measure)]));
    } finally {
        await browser.close();
    }
}

for (const [id, file] of DOT) {
    if (wanted.size && !wanted.has(id)) continue;
    const src = readFileSync(join(testDir, file), "utf8");
    const engine = /\blayout\s*=\s*"?(\w+)/.exec(src)?.[1] ?? "dot";
    const end = src.lastIndexOf("}");
    const sized = `${src.slice(0, end)}size="${SIZE}";\n${src.slice(end)}`;
    const FONTNAME = /\bfontname\s*=\s*("(?:[^"\\]|\\.)*"|[\w.-]+)/g;
    const unquote = (value) => (value.startsWith('"') ? JSON.parse(value) : value);
    const names = [...new Set([...sized.matchAll(FONTNAME)].map(([, value]) => unquote(value)))];
    const families = await sizingFamilies(names);
    // Graphviz's default fontname, Times-Roman, is already the Times table; a text with no fontname keeps it
    const mapped = sized.replace(FONTNAME, (_, value) => `fontname="${families.get(unquote(value))}"`);
    const own = await wasmLayout(sized, engine);
    const laid = await wasmLayout(mapped, engine);
    const ownTags = textTags(own.svg);
    const laidTags = textTags(laid.svg);
    if (ownTags.length !== laidTags.length) throw new Error(`${id}: the two layouts write different texts`);
    let i = 0;
    const svg = laid.svg.replace(/<text\b[^>]*>/g, (tag) => {
        const attrs = fontAttrs(ownTags[i++]);
        return tag.replace(FONT_ATTR, "").replace(/<text\b/, `<text${attrs}`);
    });
    write(id, file, svg, {
        engine,
        version: `${laid.version} (@hpcc-js/wasm-graphviz ${wasmPkg.version}, WebAssembly, as graphty-element runs it)`,
        command: `Graphviz.layout(<file with size="${SIZE}" as its last statement, each fontname as its sizing family>, "svg", "${engine}")`,
        fonts:
            "Graphviz in WebAssembly has no fonts: each fontname is laid out as the built-in width table nearest the " +
            "face Chromium draws the fontname in, as graphty-element chooses it (graphvizFamilyFor): " +
            JSON.stringify(Object.fromEntries(families)),
        engineSource:
            engine === "dot"
                ? "the file names no layout, so dot (Graphviz's default)"
                : `the file's own layout=${engine}`,
        standIn: false,
    });
}

for (const [id, file] of GML) {
    if (wanted.size && !wanted.has(id)) continue;
    const dot = run("gml2gv", [join(testDir, file)]);
    write(id, file, run("neato", ["-n2", "-Tsvg", `-Gsize=${SIZE}`], dot), {
        engine: "neato -n2",
        command: `gml2gv <file> | neato -n2 -Tsvg -Gsize="${SIZE}"`,
        standIn: true,
        standInReason: gmlStandIn,
        // the oracle comparison fits graphty's drawing to this one with a mirror allowed
        mirrored: true,
    });
}

// The GML specimen sheets whose stand-in is gml2gv (../../specimens/gml/oracle-routes.json, written by
// generators/specimens/gml.py; the others are Cytoscape's). gml2gv writes no label for a node whose GML label is
// empty or absent, and Graphviz then draws the node's id, so -Nlabel= keeps such a node's text empty, as GML means;
// -Gpad=0.2361 (17 pt) puts the corner anchors' outer edges 17 px inside the canvas, as on the DOT sheets.
// Warnings are recorded, not fatal: they are gml2gv's and Graphviz's own reading of keys they do not know.
const GML_SPECIMENS = join(testDir, "fidelity/specimens/gml");
const gmlRoutes = JSON.parse(readFileSync(join(GML_SPECIMENS, "oracle-routes.json"), "utf8")).sheets;
// A sheet whose oracle draws only part of its keys is also drawn by gml2gv, as a stand-in for the settings the oracle
// does not draw (specimens/gml/judges.json), into oracles/stand-ins/.
for (const [sheet, { route, standIns }] of Object.entries(gmlRoutes).sort()) {
    const id = `gml-${sheet}`;
    const standIn = route !== "gml2gv";
    if ((standIn && !standIns?.includes("gml2gv")) || (wanted.size && !wanted.has(id))) continue;
    const file = `fidelity/specimens/gml/${sheet}.gml`;
    const conv = spawnSync(join(bin, "gml2gv"), [join(testDir, file)], { env, maxBuffer: 1 << 28 });
    if (conv.status !== 0) throw new Error(`${id}: gml2gv exited ${conv.status}: ${conv.stderr}`);
    const r = spawnSync(join(bin, "neato"), ["-n2", "-Nlabel=", "-Gpad=0.2361", "-Tsvg", `-Gsize=${SIZE}`], {
        env,
        input: conv.stdout,
        maxBuffer: 1 << 28,
    });
    if (r.status !== 0) throw new Error(`${id}: neato exited ${r.status}: ${r.stderr}`);
    const warnings = [...new Set(`${conv.stderr}${r.stderr}`.split("\n").map((l) => l.trim()))].filter(Boolean).sort();
    write(
        id,
        file,
        r.stdout,
        {
            engine: "neato -n2",
            command: `gml2gv <file> | neato -n2 -Nlabel= -Gpad=0.2361 -Tsvg -Gsize="${SIZE}"`,
            standIn: true,
            standInReason:
                "yEd (and Graphlet, for the GML draft's keys) cannot run on this machine; this is Graphviz's own drawing " +
                "of gml2gv's conversion, pinned at the file's x/y with neato -n2. gml2gv maps fill to the outline color " +
                "(no style=filled), keeps GML's y-down coordinates in Graphviz's y-up space (mirrored top to bottom), " +
                "files LabelGraphics fontSize as a font name (so every label is 14 pt), reads Line points as spline " +
                "control points, copies yEd's style names (line, dashed_dotted) that Graphviz does not know, and reads " +
                "no arrow, anchor, model, fill2, fontStyle or group key.",
            mirrored: true,
            warnings,
        },
        "",
        standIn ? `stand-ins/${id}.gml2gv` : id,
    );
}

// The GML specimen sheets Graphviz itself wrote (route "graphviz"): gv2gml converted the laid-out DOT file
// ../../specimens/gml/graphviz/<sheet>.gv (generators/specimens/gml_graphviz.py), so Graphviz's drawing of that DOT
// file is the program's own drawing of the GML sheet. No stand-in.
for (const [sheet, { route }] of Object.entries(gmlRoutes).sort()) {
    const id = `gml-${sheet}`;
    if (route !== "graphviz" || (wanted.size && !wanted.has(id))) continue;
    const r = spawnSync(
        join(bin, "neato"),
        ["-n2", "-Tsvg", `-Gsize=${SIZE}`, join(GML_SPECIMENS, "graphviz", `${sheet}.gv`)],
        {
            env,
            maxBuffer: 1 << 28,
        },
    );
    // a label larger than its fixed-size node is drawn anyway: the label specimens show it
    const warnings = r.stderr
        .toString()
        .split("\n")
        .filter((l) => l.trim() !== "");
    if (r.status !== 0 || warnings.some((l) => !l.includes("size too small for label"))) {
        throw new Error(`${id}: neato exited ${r.status}: ${warnings.join(" | ")}`);
    }
    write(id, `fidelity/specimens/gml/${sheet}.gml`, r.stdout, {
        engine: "neato -n2",
        command: `neato -n2 -Tsvg -Gsize="${SIZE}" graphviz/<sheet>.gv (the DOT file gv2gml converted to the sheet)`,
        standIn: false,
        source: `graph-io/test/fidelity/specimens/gml/graphviz/${sheet}.gv`,
        warnings,
    });
}

for (const name of readdirSync(SPECIMENS)
    .filter((f) => f.endsWith(".gv"))
    .sort()) {
    const sheet = name.slice(0, -3);
    const id = `dot-${sheet}`;
    if (wanted.size && !wanted.has(id)) continue;
    const args = ["-n2", "-Tsvg", `-Gsize=${SIZE}`, name];
    const r = spawnSync(join(bin, "neato"), args, { env, cwd: SPECIMENS, maxBuffer: 1 << 28 });
    const expected = new Set(EXPECTED_WARNINGS[sheet] ?? []);
    const warnings = r.stderr
        .toString()
        .split("\n")
        .filter((l) => l.trim() !== "");
    const unexpected = warnings.filter((l) => !expected.has(l.trim()));
    if (r.status !== 0 || unexpected.length > 0) {
        throw new Error(`${id}: neato exited ${r.status}: ${unexpected.join(" | ")}`);
    }
    const hasImages = /\bimage=|<IMG /.test(readFileSync(join(SPECIMENS, name), "utf8"));
    write(
        id,
        `fidelity/specimens/dot/${name}`,
        r.stdout,
        {
            engine: "neato -n2",
            command: `neato -n2 -Tsvg -Gsize="${SIZE}" <file> (run in the sheet's directory)`,
            engineSource: "specimen sheet: every node pinned with pos, so neato -n2 draws it where the file says",
            standIn: false,
            expectedWarnings: [...expected],
        },
        hasImages ? "RASTER_IMAGE_DIR=graph-io/test/fidelity/specimens/dot " : "",
    );
}
