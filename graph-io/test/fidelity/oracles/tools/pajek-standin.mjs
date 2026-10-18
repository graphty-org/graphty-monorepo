#!/usr/bin/env node
// Writes the Pajek stand-in "oracles". They are NOT Pajek's output: Pajek is a Windows program and
// needs Wine on this Linux machine, which is not installed (installing it needs root). Each SVG
// holds the existing reference sketch (graph-io/fidelity-stories/references/<id>.png, "a sketch of
// the file's own values") unchanged as an embedded PNG, under a banner that says it is a stand-in,
// so nothing reads it as the program's drawing. Replace each one with Pajek's own SVG export
// (Export > 2D > SVG) once Pajek can run.
//
//   node pajek-standin.mjs [sample-id ...]      (no ids: every sample below)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../..");
const corpus = "graph-io/test/corpus/styles";
const sketches = "graph-io/fidelity-stories/references";

// id -> file under graph-io/test/corpus/styles (corpus-samples.ts, route pajek-file). pajek-iliad
// (samples.ts) has no sketch, so it has no stand-in either.
export const SAMPLES = {
    "pajek-graphstream-b": "pajek/graphstream_gs-core__B.net",
    "pajek-synth-vertices": "pajek/fidelity/synth-vertices.net",
    "pajek-synth-lines": "pajek/fidelity/synth-lines.net",
    "pajek-1crn": "pajek/fidelity/1crn.net",
    "pajek-c": "pajek/fidelity/c.net",
    "pajek-football": "pajek/fidelity/football.net",
    "pajek-kdorola": "pajek/fidelity/kdorola.net",
    "pajek-lin-rel4": "pajek/fidelity/lin-rel4.net",
};
const W = 1200;
const H = 900;
const BANNER = 40;
const sha = (b) => createHash("sha256").update(b).digest("hex");

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SAMPLES);
for (const id of ids) {
    const rel = SAMPLES[id];
    if (!rel) {
        throw new Error(`pajek-standin.mjs: unknown sample ${id}`);
    }
    const png = readFileSync(join(repo, sketches, `${id}.png`));
    // the sketch is 800 x 600; scaled to fit under the banner, centered
    const pw = png.readUInt32BE(16);
    const ph = png.readUInt32BE(20);
    const s = Math.min(W / pw, (H - BANNER) / ph);
    const iw = Math.round(pw * s);
    const ih = Math.round(ph * s);
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
        `<title>STAND-IN, not Pajek's drawing: ${id}</title>`,
        `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
        `<rect width="${W}" height="${BANNER}" fill="#b00020"/>`,
        `<text x="12" y="27" font-family="DejaVu Sans" font-size="18" fill="#ffffff">STAND-IN -- not Pajek's drawing (Pajek never ran: it needs Wine). A sketch of the file's own values.</text>`,
        `<image x="${(W - iw) / 2}" y="${BANNER + (H - BANNER - ih) / 2}" width="${iw}" height="${ih}" xlink:href="data:image/png;base64,${png.toString("base64")}"/>`,
        `</svg>`,
        "",
    ].join("\n");
    writeFileSync(join(here, "..", `${id}.svg`), svg);
    const meta = {
        sample: id,
        file: `${corpus}/${rel}`,
        sha256: sha(readFileSync(join(repo, corpus, rel))),
        program: "none (stand-in for Pajek)",
        version: null,
        command: `node graph-io/test/fidelity/oracles/tools/pajek-standin.mjs ${id}: embeds ${sketches}/${id}.png (sha256 ${sha(png)}) unchanged under a STAND-IN banner`,
        standIn: true,
        standInReason:
            "Pajek is a Windows program; on this Linux machine it needs Wine, which is not installed and needs root to install. The picture is the earlier reference sketch of the file's own coordinates and colors, drawn by this project, not by Pajek, so it shows our reading of the file, not Pajek's.",
        canvas: { requested: "1200 x 900 px", widthPx: W, heightPx: H, sketchPx: [pw, ph] },
        fonts: "banner text only: DejaVu Sans",
        svgPostprocessing: "not a program's SVG: written by pajek-standin.mjs",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node graph-io/test/fidelity/oracles/tools/pajek-standin.mjs ${id} && node graph-io/test/fidelity/oracles/tools/rasterize.mjs graph-io/test/fidelity/oracles/${id}.svg`,
        toGetARealOracle:
            "Install Wine (sudo apt install wine64), then Pajek 6 (free, http://mrvar.fdv.uni-lj.si/pajek/), open the .net file, Draw > Network, and Export > 2D > SVG at 1200 x 900.",
    };
    writeFileSync(join(here, "..", `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(id);
}
