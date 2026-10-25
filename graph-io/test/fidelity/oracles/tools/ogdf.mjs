#!/usr/bin/env node
// Re-creates the oracles of the GML specimen sheets OGDF draws (../../specimens/gml/oracle-routes.json, sample id
// gml-<sheet>), with OGDF itself. The SVG is OGDF's output byte for byte.
//
//   route "ogdf"       a sheet written in OGDF's dialect: read and written again by OGDF's GraphIO::readGML /
//                      writeGML, so the committed sheet is OGDF's own writing, then drawn by GraphIO::drawSVG
//   route "ogdf-draw"  a sheet of the GML draft's own keys (plain GML, no Creator): read as written by
//                      GraphIO::readGML and drawn by GraphIO::drawSVG, OGDF's reading of the draft. One change is
//                      made to the copy OGDF reads, recorded in the oracle.json: a Line holding only two points (the
//                      draft's straight edge, its two end points) is left out, which the draft says means the same
//                      straight line (A.4, Line, note 1); OGDF's reader crashes on such a Line (GmlParser pops the
//                      end points, then reads the back of the empty list)
//
//   node ogdf.mjs [sample-id ...]      (no ids: every sheet whose route is ogdf or ogdf-draw)
//
// OGDF_DIR: an OGDF install (holding include/ and lib/libOGDF.a). Without it OGDF is cloned at the release tag below
// and built from source with cmake into <main checkout>/tmp/ogdf/ (src/, build/, install/; no root needed).
// ogdf-gml.cpp beside this script is compiled against it with g++ (once, and again when the source changes).
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const sheets = resolve(here, "../../specimens/gml");
const mainCheckout = resolve(repo, "../..");
const TAG = "foxglove-202510";
const VERSION = "2025.10";
const tools = join(mainCheckout, "tmp/ogdf");
const layout = JSON.parse(readFileSync(resolve(here, "../../generators/sheet-layout.json"), "utf8"));

/** The OGDF install, building the release from source when there is none. */
function ogdfDir() {
    if (process.env.OGDF_DIR) return process.env.OGDF_DIR;
    const install = join(tools, "install");
    if (!existsSync(join(install, "lib/libOGDF.a"))) {
        const src = join(tools, "src");
        const build = join(tools, "build");
        if (!existsSync(src)) {
            mkdirSync(tools, { recursive: true });
            const url = "https://github.com/ogdf/ogdf.git";
            execFileSync("git", ["clone", "--depth", "1", "--branch", TAG, url, src], { stdio: "inherit" });
        }
        // CMAKE: the cmake to run (default: cmake on the PATH)
        const cmake = process.env.CMAKE ?? "cmake";
        const config = ["-DCMAKE_BUILD_TYPE=Release", `-DCMAKE_INSTALL_PREFIX=${install}`, "-DBUILD_SHARED_LIBS=OFF"];
        execFileSync(cmake, ["-S", src, "-B", build, ...config, "-DOGDF_WARNING_ERRORS=OFF"], { stdio: "inherit" });
        execFileSync(cmake, ["--build", build, "-j", "16", "--target", "OGDF"], { stdio: "inherit" });
        execFileSync(cmake, ["--install", build], { stdio: "inherit" });
    }
    return install;
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
                "-pthread",
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
// drawSVG's own default font family (SVGSettings: "Arial"): a font is a setting of the drawing the file cannot carry,
// so the oracle keeps OGDF's default, which rasterize.mjs draws in Arial's metric twin, Liberation Sans
const font = "Arial";

for (const [sheet, r] of Object.entries(routes)) {
    const id = `gml-${sheet}`;
    if (!["ogdf", "ogdf-draw"].includes(r.route) || (wanted.size && !wanted.has(id))) continue;
    const own = r.route === "ogdf";
    const file = join(sheets, `${sheet}.gml`);
    if (own) {
        execFileSync(bin, ["rewrite", file, `${file}.tmp`]);
        execFileSync("mv", [`${file}.tmp`, file]);
    }
    const svg = join(oracles, `${id}.svg`);
    // a Line of two points alone (the draft's straight edge) left out of the copy OGDF reads: OGDF crashes on it
    const twoPointLine = /\n(\t+)Line\n\1\[\n(\1\tpoint\n\1\t\[\n[^\]]*\]\n){2}\1\]\n/g;
    const text = readFileSync(file, "utf8");
    const dropped = own ? 0 : (text.match(twoPointLine) ?? []).length;
    const work = mkdtempSync(join(tmpdir(), "ogdf-draw-"));
    const read = dropped === 0 ? file : join(work, `${sheet}.gml`);
    if (dropped > 0) writeFileSync(read, text.replace(twoPointLine, "\n"));
    try {
        execFileSync(bin, ["draw", read, svg, String(margin), `${width}px`, `${height}px`, font]);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
    const meta = {
        sample: id,
        file: relative(repo, file),
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
        program: "OGDF (Open Graph Drawing Framework)",
        version: `${VERSION} (release tag ${TAG}, built from source, libOGDF.a)`,
        route: r.route,
        command:
            (own ? "ogdf-gml rewrite <file> (GraphIO::readGML, GraphIO::writeGML); " : "") +
            "ogdf-gml draw <file> (GraphIO::readGML, then GraphIO::drawSVG, SVGSettings margin " +
            `${margin}, width ${width}px, height ${height}px, font family "${font}" (OGDF's default), every other ` +
            "setting OGDF's default)",
        standIn: false,
        about: own
            ? "OGDF writes these files (the sheet is OGDF's own readGML / writeGML of the generated sheet) and this " +
              "is OGDF's own drawing of them. drawSVG draws every label in one font size (SVGSettings, 10 px) and " +
              "ignores fill patterns."
            : "A plain GML file (the GML draft's keys, no Creator) as OGDF reads and draws it, unchanged. OGDF " +
              "reads graphics x, y, w, h, fill, outline, type (rectangle alone of the draft's types), Line, arrow " +
              "and label; it ignores the draft's width, image, bitmap, smooth and the Tk keys, reads a color only " +
              "as #RGB or #RRGGBB, and draws every label centered in one 10 px font. ISSUES.md (Specimen sheets: " +
              "GML) lists it key by key.",
        canvas: { widthPx: width, heightPx: height },
        fonts: `OGDF's default font family "${font}" is written into the SVG; rasterize.mjs draws it with visual-fonts/ (Liberation Sans, Arial's metric twin)`,
        ...(dropped > 0
            ? {
                  preprocessing:
                      `${dropped} Line holding only its edge's two end points left out of the copy OGDF reads (the ` +
                      "draft's straight edge, which the draft says an omitted Line also means: A.4, Line, note 1); " +
                      "OGDF's reader crashes on it",
              }
            : {}),
        svgPostprocessing: "none: the SVG is OGDF's output byte for byte",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, svg)}`,
    };
    writeFileSync(join(oracles, `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(`${id}: ${relative(repo, svg)}`);
}
