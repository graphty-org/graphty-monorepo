#!/usr/bin/env node
// Re-creates the Graphviz oracles: each DOT sample drawn by the Graphviz 14.1.2 CLI with -Tsvg,
// and each GML sample whose only other route was gml2gv drawn by gml2gv | neato -n2 -Tsvg (a
// stand-in: the program that wrote those files, yEd, cannot run here). The SVG is written exactly
// as Graphviz printed it; nothing is stripped (Graphviz writes no timestamp or run-dependent data).
//
//   node graphviz.mjs [sample-id ...]      (no ids: every sample below)
//
// GRAPHVIZ_BIN: the directory holding dot, neato and gml2gv
// (default <repo>/tmp/style-fidelity/tools/conda-graphviz/bin). Text is measured with the
// repository's pinned fonts (visual-fonts/fonts.conf), so no host font changes a layout.
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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

const env = { ...process.env, FONTCONFIG_FILE: fontconfig };
const run = (cmd, args, input) =>
    execFileSync(join(bin, cmd), args, { env, input, maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "pipe"] });
// dot -V prints to stderr.
const version = /version (\S+ \(\S+\))/.exec(
    spawnSync(join(bin, "dot"), ["-V"], { env, encoding: "utf8" }).stderr,
)?.[1];
if (!version) throw new Error(`no Graphviz at ${bin}`);
const wanted = new Set(process.argv.slice(2));

function write(id, file, svg, fields) {
    const bytes = readFileSync(join(testDir, file));
    const [, w, h] = /<svg width="([\d.]+)pt" height="([\d.]+)pt"/.exec(svg.toString()) ?? [];
    writeFileSync(join(oracles, `${id}.svg`), svg);
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
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, join(oracles, `${id}.svg`))}`,
    };
    writeFileSync(join(oracles, `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
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
