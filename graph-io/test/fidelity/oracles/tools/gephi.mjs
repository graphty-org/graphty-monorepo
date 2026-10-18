#!/usr/bin/env node
// Re-creates the Gephi oracles: each GEXF sample loaded by the Gephi Toolkit 0.11.3 (headless) and
// drawn by Gephi's Preview, exported as SVG by Gephi's own ExportController (SVGExporter). It runs
// references/GephiExport.java with "labels noscale", the settings the gephi-noscale reference route
// uses: the importer keeps the file's own coordinates (Container.getLoader().setAutoScale(false)),
// the preview shows node labels (PreviewProperty.SHOW_NODE_LABELS = true), and every other preview
// property keeps Gephi's default (the file's own node colors and sizes, curved edges colored by
// their source, label overlap avoidance on). The SVG is copied exactly as Gephi wrote it; nothing is
// stripped (Gephi's SVG holds no timestamp or run-dependent data: two runs are byte-identical).
//
//   node gephi.mjs [sample-id ...]      (no ids: every sample below and every GEXF specimen page)
//
// The GEXF specimen pages (../../specimens/gexf/pages.json, written by
// ../../generators/specimens/gexf-gephi.mjs) are drawn the same way, each under its own Preview
// settings: every property a page names is set with GephiExport.java's set:<property>=<value>, after
// label overlap avoidance is turned off; the .oracle.json records them as previewProperties.
//
// JAVA_HOME: a JDK 17 (default <main checkout>/tmp/style-fidelity/tools/jre17/jdk-17*);
// GEPHI_JAR: gephi-toolkit-0.11.3-all.jar (default <main checkout>/tmp/style-fidelity/tools/gephi/).
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "../../../../../tools/isolated-git-env.mjs";
import { gunzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const repo = resolve(here, "../../../../..");
const testDir = resolve(here, "../../..");
const exporter = resolve(here, "../../references/GephiExport.java");
const mainCheckout = dirname(
    execFileSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
        encoding: "utf8",
        env: isolatedGitEnv(),
    }).trim(),
);
const tools = join(mainCheckout, "tmp/style-fidelity/tools");
const javaHome =
    process.env.JAVA_HOME ??
    join(
        tools,
        "jre17",
        readdirSync(join(tools, "jre17")).find((d) => d.startsWith("jdk-17")),
    );
const jar = process.env.GEPHI_JAR ?? join(tools, "gephi/gephi-toolkit-0.11.3-all.jar");

// The GEXF samples of samples.ts and corpus-samples.ts.
const GEXF = [
    ["gexf-miserables", "corpus/styles/gexf/gexfjs-miserables.gexf"],
    ["gexf-graphology-rio", "corpus/styles/gexf/fidelity/graphology-rio.gexf.gz"],
    ["gexf-gsa-fpki-certs", "corpus/styles/gexf/gsa-fpki-certs.gexf"],
    ["gexf-qvge-mine-airing", "corpus/styles/gexf/qvge-mine-airing.gexf"],
    ["gexf-sigma-ediaspora", "corpus/styles/gexf/sigma-moroccan-ediaspora.gexf.gz"],
    ["gexf-synth-nx-viz", "corpus/styles/gexf/fidelity/synth-nx-viz.gexf"],
    ["gexf-synth-13-hierarchy", "corpus/styles/gexf/fidelity/synth-13-hierarchy.gexf"],
    ["gexf-cns-wos", "corpus/styles/gexf/cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz"],
    ["gexf-hsk-chars", "corpus/styles/gexf/glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz"],
];

// The GEXF specimen pages: sample id gexf-<sheet>, file specimens/gexf/<file>, the Preview settings.
const PAGES = JSON.parse(readFileSync(join(testDir, "fidelity/specimens/gexf/pages.json"), "utf8")).pages;
const RUNS = [
    ...GEXF.map(([id, file]) => ({ id, file, preview: {} })),
    ...PAGES.map((p) => ({
        id: `gexf-${p.id}`,
        file: `fidelity/specimens/gexf/${p.file}`,
        preview: p.preview,
        varies: p.varies,
    })),
];

const wanted = new Set(process.argv.slice(2));
const failed = [];
const work = mkdtempSync(join(tmpdir(), "gephi-oracle-"));
try {
    for (const { id, file, preview, varies } of RUNS) {
        if (wanted.size && !wanted.has(id)) continue;
        const stored = readFileSync(join(testDir, file));
        // Gephi is handed the plain file: a .gz sample is unpacked first (the sha256 is the stored file's).
        const input = join(work, `${id}.gexf`);
        writeFileSync(input, file.endsWith(".gz") ? gunzipSync(stored) : stored);
        const prefix = join(work, id);
        const java = spawnSync(
            join(javaHome, "bin/java"),
            [
                "-Djava.awt.headless=true",
                "-cp",
                jar,
                exporter,
                input,
                prefix,
                "labels",
                "noscale",
                ...Object.entries(preview).map(([k, v]) => `set:${k}=${v}`),
            ],
            { encoding: "utf8", maxBuffer: 1 << 28 },
        );
        if (java.status !== 0) {
            // Gephi cannot open the file (gexf-synth-13-hierarchy: its importer reads only viz:color r/g/b,
            // not GEXF 1.3's hex, and throws). No oracle is written; the failure is the finding.
            const cause = /Caused by: (.*)/.exec(java.stderr)?.[1] ?? `exit ${java.status}`;
            failed.push(id);
            console.error(`${id}: Gephi failed: ${cause}`);
            continue;
        }
        const out = java.stdout;
        const [, nodes, edges] = /nodes=(\d+) edges=(\d+)/.exec(out) ?? [];
        if (!nodes) throw new Error(`${id}: GephiExport printed no counts: ${out}`);
        copyFileSync(`${prefix}.svg`, join(oracles, `${id}.svg`));
        const svg = readFileSync(`${prefix}.svg`, "utf8");
        const [, w, h] = /width="([\d.]+)"[\s\S]*?height="([\d.]+)"/.exec(svg) ?? [];
        const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
        const meta = {
            sample: id,
            file: `graph-io/test/${file}`,
            sha256: createHash("sha256").update(stored).digest("hex"),
            program: "Gephi Toolkit",
            version: "0.11.3 (gephi-toolkit-0.11.3-all.jar) on Temurin JDK 17",
            command: `java -Djava.awt.headless=true -cp gephi-toolkit-0.11.3-all.jar graph-io/test/fidelity/references/GephiExport.java <file> <out> labels noscale${Object.entries(
                preview,
            )
                .map(([k, v]) => ` "set:${k}=${v}"`)
                .join("")}`,
            apiCalls: [
                "ImportController.importFile(file)",
                "container.getLoader().setAutoScale(false)  (noscale: keep the file's coordinates)",
                "ImportController.process(container, new DefaultProcessor(), workspace)",
                "PreviewModel.getProperties().putValue(PreviewProperty.SHOW_NODE_LABELS, true)  (every other preview property: Gephi's default, unless previewProperties sets it)",
                "PreviewController.refreshPreview()",
                'ExportController.exportFile(new File(out + ".svg"))  (SVGExporter, default settings)',
            ],
            input: file.endsWith(".gz")
                ? "the stored .gz unpacked with zlib, then handed to Gephi as .gexf"
                : "the stored file as is",
            ...(varies === undefined ? {} : { previewProperties: preview, varies }),
            previewItems: { nodes: Number(nodes), edges: Number(edges) },
            canvas: {
                requested:
                    "1200 x 900 px is not available: Gephi's SVG render target sizes the canvas to the drawing's own bounds, and SVGExporter has no canvas setting (only margin and scaleStrokes)",
                width: Number(w),
                height: Number(h),
                viewBox,
            },
            fonts: "Gephi writes font-family=\"Dialog\" (Java's logical font); rasterize.mjs draws it with the repository's pinned fonts",
            svgPostprocessing: "none: the SVG is Gephi's output byte for byte",
            date: new Date().toISOString().slice(0, 10),
            standIn: false,
            regenerate: `node ${relative(repo, fileURLToPath(import.meta.url))} ${id} && node ${relative(repo, join(here, "rasterize.mjs"))} ${relative(repo, join(oracles, `${id}.svg`))}`,
        };
        writeFileSync(join(oracles, `${id}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
        console.log(`${id}: nodes=${nodes} edges=${edges} canvas ${w} x ${h}`);
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
if (failed.length) {
    console.error(`no oracle for: ${failed.join(", ")}`);
    process.exitCode = 1;
}
