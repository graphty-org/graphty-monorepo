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
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
// The GML specimen sheets written in Gephi's own GML dialect (route "gephi" in ../../specimens/gml/oracle-routes.json,
// written by ../../generators/specimens/gml.py): sample id gml-<sheet>, drawn with node labels shown and label
// overlap avoidance off, as the GEXF pages are.
const GML_ROUTES = JSON.parse(readFileSync(join(testDir, "fidelity/specimens/gml/oracle-routes.json"), "utf8")).sheets;
const RUNS = [
    ...GEXF.map(([id, file]) => ({ id, file, preview: {} })),
    ...PAGES.map((p) => ({
        id: `gexf-${p.id}`,
        file: `fidelity/specimens/gexf/${p.file}`,
        preview: p.preview,
        varies: p.varies,
    })),
    ...Object.entries(GML_ROUTES)
        .filter(([, r]) => r.route === "gephi")
        .map(([sheet]) => ({
            id: `gml-${sheet}`,
            file: `fidelity/specimens/gml/${sheet}.gml`,
            preview: { "node.label.show": "true", "node.label.avoidOverlap": "false" },
        })),
];

/**
 * Gephi's labels as its Preview draws them. Gephi's SVG writer drops the whitespace before an entity reference in a
 * text: the label "a & b <c>" is written "a&amp; b&lt;c&gt;", while the Preview, its PNG export and the preview items
 * (NODE_LABEL and EDGE_LABEL "label") all keep "a & b <c>" (probe: tmp/style-specimens/fix-gexf-r2/ent). Each text in
 * the label groups whose words match its item's label once the spaces are taken out is written as that label.
 * @param {string} svg - Gephi's SVG
 * @param {Record<string, Record<string, string>[]>} items - GephiExport.java's preview items
 * @returns {{ svg: string, restored: number }} the SVG and how many texts were changed
 */
function restoreLabelText(svg, items) {
    const esc = (t) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const labels = {
        node: new Map((items.node_label ?? []).map((it) => [it._id, it.label])),
        edge: new Map((items.edge_label ?? []).map((it) => [it._edge, it.label])),
    };
    let restored = 0;
    const out = svg.replace(
        /(<g id="(node|edge)-labels(?:-outline)?"[^>]*>)([\s\S]*?)(<\/g>)/g,
        (_, open, kind, body, close) => {
            const fixed = body.replace(
                /(<text[^>]*class="id_([^"]*)"[^>]*>)(\s*)([^<]*?)(\s*<\/text>)/g,
                (whole, tag, id, lead, text, tail) => {
                    const label = labels[kind].get(id);
                    if (typeof label !== "string") return whole;
                    const want = esc(label.replaceAll(/[\r\n]/g, "").trim());
                    if (want === text || want.replace(/\s+/g, "") !== text.replace(/\s+/g, "")) return whole;
                    restored++;
                    return `${tag}${lead}${want}${tail}`;
                },
            );
            return `${open}${fixed}${close}`;
        },
    );
    return { svg: out, restored };
}

/**
 * A label box at its opacity once. Gephi's SVG writer gives an unfilled label box `opacity` and `stroke-opacity` both set
 * to node.label.box.opacity, so an SVG viewer strokes it at the square of it; Gephi's Preview and PNG export stroke it
 * at the opacity itself (labels-p13, box opacity 40: a black box on white is drawn 162 of 255 in the PNG, 0.36, not
 * 0.16; probe: tmp/style-specimens/fix-gexf-r2/ent). Each such box keeps its stroke-opacity and is given opacity 1.
 * @param {string} svg - Gephi's SVG
 * @returns {{ svg: string, boxes: number }} the SVG and how many boxes were changed
 */
function singleBoxOpacity(svg) {
    let boxes = 0;
    const out = svg.replace(/(<g id="node-labels"[^>]*>)([\s\S]*?)(<\/g>)/, (_, open, body, close) => {
        const fixed = body.replace(/<rect\b[^>]*\/>/g, (rect) => {
            const op = /\sopacity="([^"]*)"/.exec(rect)?.[1];
            const stroke = /stroke-opacity="([^"]*)"/.exec(rect)?.[1];
            if (!/fill="none"/.test(rect) || op === undefined || op !== stroke || Number(op) >= 1) return rect;
            boxes++;
            return rect.replace(/(\s)opacity="[^"]*"/, '$1opacity="1.0"');
        });
        return `${open}${fixed}${close}`;
    });
    return { svg: out, boxes };
}

const wanted = new Set(process.argv.slice(2));
const failed = [];
const work = mkdtempSync(join(tmpdir(), "gephi-oracle-"));
try {
    for (const { id, file, preview, varies } of RUNS) {
        if (wanted.size && !wanted.has(id)) continue;
        const stored = readFileSync(join(testDir, file));
        // Gephi is handed the plain file: a .gz sample is unpacked first (the sha256 is the stored file's). Its
        // importer is chosen by the file's extension.
        const input = join(work, `${id}.${file.endsWith(".gml") ? "gml" : "gexf"}`);
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
        const items = JSON.parse(readFileSync(`${prefix}.items.json`, "utf8"));
        const read = restoreLabelText(readFileSync(`${prefix}.svg`, "utf8"), items);
        const { svg, boxes } = singleBoxOpacity(read.svg);
        const { restored } = read;
        writeFileSync(join(oracles, `${id}.svg`), svg);
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
            svgPostprocessing:
                restored === 0 && boxes === 0
                    ? "none: the SVG is Gephi's output byte for byte"
                    : [
                          restored === 0
                              ? null
                              : `${restored} label text(s) put back to the label Gephi draws (restoreLabelText): Gephi's SVG writer drops the space before an entity reference ("a & b <c>" is written "a&amp; b&lt;c&gt;") and a line break, where its Preview, its PNG export and its preview items keep the space and draw the break as nothing`,
                          boxes === 0
                              ? null
                              : `${boxes} label box(es) drawn at their opacity once (singleBoxOpacity): Gephi's SVG writer puts node.label.box.opacity on a box both as opacity and as stroke-opacity, which an SVG viewer multiplies (0.4 x 0.4), where its Preview and PNG export stroke the box at 0.4`,
                          "nothing else changed",
                      ]
                          .filter((x) => x !== null)
                          .join("; "),
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
