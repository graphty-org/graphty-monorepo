#!/usr/bin/env node
// Re-creates the Pajek oracles: each Pajek sample drawn by Pajek 6.02 (Windows, under Wine on a
// headless X server) and exported with Pajek's own SVG export (Draw > Export > 2D > SVG > General).
// Nothing is clicked: Pajek runs the startup log file Pajek.log beside Pajek.exe, and the log holds
// the same commands Pajek writes to its own session log when a person does those steps by hand:
//
//   LOADINI "C:\pj\oracle.ini"                      Pajek's own defaults, Draw window 500 x 500
//   N 1 RDN "C:\pj\in\<file>.net" (<vertices>)      File > Network > Read
//   E 1 DRAW 0 0 0 0 0                              Draw > Network
//   E 1 SVG 0 0 0 0 0 "C:\pj\out\<id>.svg" 1 0      Export > 2D > SVG > General, "SVG with Controls"
//   EXIT
//
// oracle.ini is written by Pajek itself (SAVEINI) on a first run, with only the Draw window's size
// changed, so every other option is Pajek's default. The exported SVG takes the Draw window's
// size.
//
//   node pajek.mjs [sample-id ...]      (no ids: every sample below)
//
// PAJEK_PREFIX: the Wine prefix holding Pajek 6.02 at drive_c/pj (Pajek64.zip from
// http://mrvar.fdv.uni-lj.si/pajek/ unpacked there; default <main checkout>/tmp/pajek/prefix).
// Needs wine (9.0) and xvfb-run. Then run rasterize.mjs on the written SVGs for the PNGs.
//
// The changes made to Pajek's SVG: its "CreationDate" comment (the clock time of the run) is
// replaced with a fixed text, so a rerun writes the same bytes, and its Windows line ends become
// "\n", as the repository stores text.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const mainCheckout = resolve(repo, "../..");
const prefix = process.env.PAJEK_PREFIX ?? join(mainCheckout, "tmp/pajek/prefix");
const pj = join(prefix, "drive_c/pj");
const corpus = "graph-io/test/corpus/styles";

// id -> file under graph-io/test/corpus/styles (route pajek-file in samples.ts and corpus-samples.ts)
const SAMPLES = {
    "pajek-iliad": "pajek/kjhealy_kjhnet__iliad_killedby.net",
    "pajek-graphstream-b": "pajek/graphstream_gs-core__B.net",
    "pajek-synth-vertices": "pajek/fidelity/synth-vertices.net",
    "pajek-synth-lines": "pajek/fidelity/synth-lines.net",
    "pajek-1crn": "pajek/fidelity/1crn.net",
    "pajek-c": "pajek/fidelity/c.net",
    "pajek-football": "pajek/fidelity/football.net",
    "pajek-kdorola": "pajek/fidelity/kdorola.net",
    "pajek-lin-rel4": "pajek/fidelity/lin-rel4.net",
};
// Pajek draws a file's coordinates (0..1 on each axis) across the whole Draw window, one axis
// at a time, but vertex sizes, line widths and fonts in fixed pixels, so the window's size sets
// their proportions. 500 x 500 is the square Pajek's own EPS export maps the coordinates to
// ([0,1] -> [0,500] points, http://mrvar.fdv.uni-lj.si/pajek/DrawEPS.htm), the scale graph-io
// reads Pajek's sizes in; a square keeps the file's own proportions.
const W = 500;
const H = 500;
const STAMP = "<!-- CreationDate: (the run's clock time, removed by tools/pajek.mjs) -->";

if (!existsSync(join(pj, "Pajek.exe"))) {
    throw new Error(`pajek.mjs: no Pajek.exe in ${pj} (set PAJEK_PREFIX)`);
}
const env = { ...process.env, WINEPREFIX: prefix, WINEDEBUG: "-all" };

// Runs Pajek once on a startup log (CRLF lines) and waits for its EXIT.
function runPajek(lines) {
    writeFileSync(join(pj, "Pajek.log"), `${[...lines, "EXIT"].join("\r\n")}\r\n`);
    execFileSync("xvfb-run", ["-a", "-s", "-screen 0 1600x1200x24", "wine", "Pajek.exe"], {
        cwd: pj,
        env,
        stdio: "ignore",
        timeout: 120_000,
    });
}

mkdirSync(join(pj, "in"), { recursive: true });
mkdirSync(join(pj, "out"), { recursive: true });

// Pajek's own defaults, with the Draw window (Form8) sized so the export is 500 x 500.
runPajek(['SAVEINI "C:\\pj\\defaults.ini"']);
const ini = readFileSync(join(pj, "defaults.ini"), "latin1")
    .replace(/^Form8\.Width .*$/m, `Form8.Width ${W}`)
    .replace(/^Form8\.Height .*$/m, `Form8.Height ${H}`)
    .replace(/^Form8\.ClientWidth .*$/m, `Form8.ClientWidth ${W - 8}`)
    .replace(/^Form8\.ClientHeight .*$/m, `Form8.ClientHeight ${H - 71}`);
writeFileSync(join(pj, "oracle.ini"), ini, "latin1");
const version = /Creator: (Pajek [\d.]+)/;

const wanted = process.argv.slice(2);
for (const id of wanted.length ? wanted : Object.keys(SAMPLES)) {
    const rel = SAMPLES[id];
    if (!rel) throw new Error(`pajek.mjs: unknown sample ${id}`);
    const src = join(repo, corpus, rel);
    const name = rel.split("/").pop();
    copyFileSync(src, join(pj, "in", name));
    const bytes = readFileSync(src);
    const vertices = Number(/^\*Vertices\s+(\d+)/im.exec(bytes.toString("latin1"))?.[1] ?? 0);
    const out = join(pj, "out", `${id}.svg`);
    runPajek([
        'LOADINI "C:\\pj\\oracle.ini"',
        "NETBEGIN 1",
        `N 1 RDN "C:\\pj\\in\\${name}" (${vertices})`,
        "E 1 DRAW 0 0 0 0 0",
        `E 1 SVG 0 0 0 0 0 "C:\\pj\\out\\${id}.svg" 1 0`,
    ]);
    const svg = readFileSync(out, "utf8")
        .replace(/<!-- CreationDate: [^>]*-->/, STAMP)
        .replaceAll("\r\n", "\n");
    const [, vw, vh] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
    if (Number(vw) !== W || Number(vh) !== H) {
        throw new Error(`pajek.mjs: ${id} was exported ${vw} x ${vh}, not ${W} x ${H}`);
    }
    writeFileSync(join(oracles, `${id}.svg`), svg);
    const meta = {
        sample: id,
        file: `${corpus}/${rel}`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        program: "Pajek",
        version: `${version.exec(svg)?.[1] ?? "Pajek"} (64-bit, Pajek64.zip of 2025-12-31) under Wine 9.0 on Xvfb`,
        command:
            "Pajek.exe running the startup log Pajek.log: LOADINI oracle.ini (Pajek's SAVEINI defaults, Draw window 500 x 500); " +
            `N 1 RDN "<file>" (${vertices}); E 1 DRAW 0 0 0 0 0 (Draw > Network); ` +
            'E 1 SVG 0 0 0 0 0 "<out>.svg" 1 0 (Draw > Export > 2D > SVG > General, SVG with Controls); EXIT',
        standIn: false,
        canvas: {
            requested: `${W} x ${H} px (the Draw window's size: the 0..1 square of the file's coordinates at 500 per unit, as Pajek's EPS export maps it; vertex sizes, line widths and fonts are fixed pixels whatever the window)`,
            widthPx: W,
            heightPx: H,
        },
        fonts: "as Pajek writes them (its default label font, Arial); the PNG maps them to the pinned fonts",
        svgPostprocessing:
            "the CreationDate comment (the run's clock time) is replaced with a fixed text and Windows line ends become Unix ones; nothing else changes. " +
            "Pajek always adds its signature layer (id PajekSig: the spider logo and the word Pajek, bottom left), which is not part of the network.",
        date: new Date().toISOString().slice(0, 10),
        regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, join(oracles, `${id}.svg`))}`,
    };
    writeFileSync(join(oracles, `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
    console.log(`${id}: ${vertices} vertices`);
}
