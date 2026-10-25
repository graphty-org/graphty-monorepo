#!/usr/bin/env node
// Re-creates the Graphviz oracles: each DOT sample drawn by the Graphviz 14.1.2 CLI with -Tsvg,
// and each GML sample whose only other route was gml2gv drawn by gml2gv | neato -n2 -Tsvg (a
// stand-in: the program that wrote those files, yEd, cannot run here). The SVG is written exactly
// as Graphviz printed it; nothing is stripped (Graphviz writes no timestamp or run-dependent data).
//
//   node graphviz.mjs [sample-id ...]      (no ids: every sample below, every DOT specimen sheet and every GML
//                                          specimen sheet whose stand-in is gml2gv)
//
// The DOT specimen sheets (../../specimens/dot/*.gv, sample id dot-<sheet>) pin every node with pos="x,y!" and are
// drawn by neato -n2 in the sheet's own directory (so image= paths resolve as a user's would). Any Graphviz
// warning fails the sheet, except the ones in EXPECTED_WARNINGS, which the specimens exist to show.
//
// GRAPHVIZ_BIN: the directory holding dot, neato and gml2gv
// (default <repo>/tmp/style-fidelity/tools/conda-graphviz/bin). Text is measured with the
// repository's pinned fonts (visual-fonts/fonts.conf), so no host font changes a layout.
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const testDir = resolve(here, "../../..");
const mainCheckout = resolve(repo, "../..");
const bin = process.env.GRAPHVIZ_BIN ?? join(mainCheckout, "tmp/style-fidelity/tools/conda-graphviz/bin");
const fontconfig = join(repo, "visual-fonts/fonts.conf");

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

function write(id, file, svg, fields, rasterEnv = "", path = id) {
    const bytes = readFileSync(join(testDir, file));
    const [, w, h] = /<svg width="([\d.]+)pt" height="([\d.]+)pt"/.exec(svg.toString()) ?? [];
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
        fonts: "FONTCONFIG_FILE=visual-fonts/fonts.conf (the repository's pinned fonts)",
        svgPostprocessing: "none: the SVG is Graphviz's output byte for byte",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && ${rasterEnv}node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, join(oracles, `${path}.svg`))}`,
    };
    writeFileSync(join(oracles, `${path}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(`${id}: ${meta.canvas.widthPx} x ${meta.canvas.heightPx} px`);
}

for (const [id, file] of DOT) {
    if (wanted.size && !wanted.has(id)) continue;
    const src = readFileSync(join(testDir, file), "utf8");
    const engine = /\blayout\s*=\s*"?(\w+)/.exec(src)?.[1] ?? "dot";
    const args = [`-K${engine}`, "-Tsvg", `-Gsize=${SIZE}`, join(testDir, file)];
    write(id, file, run("dot", args), {
        engine,
        command: `dot -K${engine} -Tsvg -Gsize="${SIZE}" <file>`,
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
