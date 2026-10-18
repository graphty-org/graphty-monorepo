#!/usr/bin/env node
// Re-creates the oracles of the GML specimen sheets written in OGDF's dialect (route "ogdf" in
// ../../specimens/gml/oracle-routes.json, sample id gml-<sheet>), with OGDF itself: each sheet is read and written
// again by OGDF's GraphIO::readGML / writeGML, so the committed sheet is OGDF's own writing, and then drawn by
// GraphIO::drawSVG. No stand-in: OGDF is the program that writes these files. The SVG is OGDF's output byte for byte.
//
//   node ogdf.mjs [sample-id ...]      (no ids: every sheet whose route is ogdf)
//
// OGDF_DIR: the data directory of PyPI's ogdf-wheel 2025.10 (holding include/ and lib/). Without it the wheel is
// downloaded with pip into <main checkout>/tmp/style-fidelity/tools/ogdf/ and unpacked there. ogdf-gml.cpp beside
// this script is compiled against it with g++ (once, and again when the source changes).
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const sheets = resolve(here, "../../specimens/gml");
const mainCheckout = resolve(repo, "../..");
const VERSION = "2025.10";
const tools = join(mainCheckout, "tmp/style-fidelity/tools/ogdf");
const layout = JSON.parse(readFileSync(resolve(here, "../../generators/sheet-layout.json"), "utf8"));

/** The unpacked wheel's data directory, downloading the wheel when there is none. */
function ogdfDir() {
    if (process.env.OGDF_DIR) return process.env.OGDF_DIR;
    const data = join(tools, `ogdf_wheel-${VERSION}.data/data`);
    if (!existsSync(join(data, "lib/libOGDF.so"))) {
        mkdirSync(tools, { recursive: true });
        execFileSync("pip3", ["download", `ogdf-wheel==${VERSION}`, "--no-deps", "-d", tools], { stdio: "inherit" });
        const wheel = execFileSync("ls", [tools], { encoding: "utf8" })
            .split("\n")
            .find((f) => f.startsWith(`ogdf_wheel-${VERSION}`) && f.endsWith(".whl"));
        execFileSync("python3", ["-I", "-m", "zipfile", "-e", join(tools, wheel), tools], { stdio: "inherit" });
    }
    return data;
}

/** The compiled ogdf-gml program, rebuilt when its source is newer. */
function program(data) {
    const source = join(here, "ogdf-gml.cpp");
    const bin = join(tools, "ogdf-gml");
    if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(source).mtimeMs) {
        mkdirSync(tools, { recursive: true });
        execFileSync(
            "g++",
            [
                "-std=c++17",
                "-O1",
                `-I${join(data, "include/ogdf-release")}`,
                `-I${join(data, "include")}`,
                source,
                `-L${join(data, "lib")}`,
                "-lOGDF",
                "-lCOIN",
                `-Wl,-rpath,${join(data, "lib")}`,
                "-o",
                bin,
            ],
            { stdio: "inherit" },
        );
    }
    return bin;
}

const routes = JSON.parse(readFileSync(join(sheets, "oracle-routes.json"), "utf8")).sheets;
const wanted = new Set(process.argv.slice(2));
const bin = program(ogdfDir());
const { width, height } = layout.canvas;
// the anchors' outer edges (and their 1 px outline) sit at the canvas edges: drawSVG's view box is the drawing's
// bounding box plus the margin
const margin = layout.anchors.nodes["anchor-nw"][0] - layout.anchors.size / 2 - 0.5;
const font = layout.neutral.fontFamily;

for (const [sheet, r] of Object.entries(routes)) {
    const id = `gml-${sheet}`;
    if (r.route !== "ogdf" || (wanted.size && !wanted.has(id))) continue;
    const file = join(sheets, `${sheet}.gml`);
    execFileSync(bin, ["rewrite", file, `${file}.tmp`]);
    execFileSync("mv", [`${file}.tmp`, file]);
    const svg = join(oracles, `${id}.svg`);
    execFileSync(bin, ["draw", file, svg, String(margin), `${width}px`, `${height}px`, font]);
    const meta = {
        sample: id,
        file: relative(repo, file),
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
        program: "OGDF (Open Graph Drawing Framework)",
        version: `${VERSION} (PyPI ogdf-wheel ${VERSION}, libOGDF.so)`,
        route: "ogdf",
        command:
            "ogdf-gml rewrite <file> (GraphIO::readGML, GraphIO::writeGML); ogdf-gml draw <file> " +
            `(GraphIO::drawSVG, SVGSettings margin ${margin}, width ${width}px, height ${height}px, font family ` +
            `"${font}", every other setting OGDF's default)`,
        standIn: false,
        about:
            "OGDF writes these files (the sheet is OGDF's own readGML / writeGML of the generated sheet) and this " +
            "is OGDF's own drawing of them. drawSVG draws every label in one font size (SVGSettings, 10 px) and " +
            "ignores fill patterns.",
        canvas: { widthPx: width, heightPx: height },
        fonts: `the font family "${font}" (the repository's pinned font) is written into the SVG; rasterize.mjs draws it with visual-fonts/`,
        svgPostprocessing: "none: the SVG is OGDF's output byte for byte",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, svg)}`,
    };
    writeFileSync(join(oracles, `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(`${id}: ${relative(repo, svg)}`);
}
