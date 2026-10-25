#!/usr/bin/env node
/**
 * Turns the oracle comparison's reports (`tmp/oracle-report/<sample>.json`, written by
 * `test/fidelity/oracle-report.test.ts`) into report pages: one per sample (the program's own
 * SVG | graphty's canvas | the two overlaid | the property table with the worst elements) and an
 * index with every sample's pass rates and the owner's fidelity issues
 * (`graph-io/test/fidelity/oracles/ISSUES.md`), each with the oracle properties that judge it.
 *
 *     node scripts/oracle-report.mjs [out-dir]
 *
 * The default out-dir is the main checkout's `tmp/style-oracles/report`. No timestamps: the same
 * reports give the same pages.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const src = join(pkg, "tmp", "oracle-report");
const oracles = resolve(pkg, "..", "graph-io", "test", "fidelity", "oracles");
const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: pkg,
    encoding: "utf8",
}).trim();
const out = resolve(process.argv[2] ?? join(dirname(commonDir), "tmp", "style-oracles", "report"));
mkdirSync(out, { recursive: true });

/** The oracle properties that judge each kind of issue the owner named. */
const AREA_PROPERTIES = [
    [/arrowhead/, ["edge.arrowLength", "edge.arrowWidth", "edge.arrow"]],
    [/label rotation/, ["label.rotation"]],
    [/annotation/, ["stray.present"]],
    [/missing edges/, ["edge.present"]],
    [/font weight/, ["label.weight"]],
    [/layout/, ["node.position", "edge.route"]],
    [/styling/, ["node.fill", "node.stroke", "edge.color", "edge.width"]],
    [/graph content/, ["node.present", "edge.present"]],
    [/edge width/, ["edge.width"]],
    [/edge line style/, ["edge.dash"]],
    [/edge endpoints|edge routing/, ["edge.route"]],
    [/node fill/, ["node.fill"]],
    [/node outline/, ["node.stroke", "node.strokeWidth"]],
    [/edge curve/, ["edge.curve"]],
    [/label size/, ["label.size"]],
    [/edge color/, ["edge.color"]],
    [/node gradient/, ["node.gradient"]],
    [/group fill/, ["group.fill"]],
    [/group label/, ["group.label"]],
    [/groups/, ["group.present"]],
    [/node size/, ["node.width", "node.height"]],
    [/label visibility/, ["label.present"]],
    [/label draw order/, ["label.present"]],
    [/axis orientation/, ["node.position"]],
    [/group outline width/, ["group.strokeWidth"]],
    [/group count/, ["group.present"]],
    [/node shape/, ["node.shape"]],
    [/reference correctness/, []],
];

const esc = (s) =>
    String(s).replaceAll(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** A verdict as words: "--" when none, the pass text, or "<count> <fail text>". */
function verdictText(verdict, passText, failText) {
    if (!verdict) {
        return "--";
    }
    return verdict.pass ? passText : `${verdict.failing} ${failText}`;
}
const pct = (r) => (r === null || r === undefined ? "--" : `${(r * 100).toFixed(1)}%`);
const tone = (r) => {
    if (r === null || r === undefined) {
        return "na";
    }
    if (r >= 0.999) {
        return "ok";
    }
    return r >= 0.8 ? "warn" : "bad";
};
/** A raster region's similarity as a pass rate for {@link tone}: 1 from 0.97, 0.9 from 0.9, else 0. */
const similarityRate = (v) => {
    if (v === null) {
        return null;
    }
    if (v >= 0.97) {
        return 1;
    }
    return v >= 0.9 ? 0.9 : 0;
};
const short = (v) => {
    const s = JSON.stringify(v);
    if (s === undefined) {
        return "";
    }
    return s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

const STYLE = `
:root { --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --line: #ddd; --ok: #1b7f3b; --warn: #a66b00; --bad: #b3261e; --na: #888; --panel: #f6f6f6; }
@media (prefers-color-scheme: dark) { :root { --bg: #161616; --fg: #eee; --muted: #aaa; --line: #333; --ok: #5cc27a; --warn: #e0a640; --bad: #ef6b62; --na: #888; --panel: #222; } }
body { background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; margin: 16px; }
a { color: inherit; }
table { border-collapse: collapse; margin: 8px 0 24px; }
th, td { border-bottom: 1px solid var(--line); padding: 3px 8px; text-align: left; vertical-align: top; }
td.ok { color: var(--ok); } td.warn { color: var(--warn); } td.bad { color: var(--bad); font-weight: 600; } td.na { color: var(--na); }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.grid figure { margin: 0; background: var(--panel); padding: 8px; }
.grid img { width: 100%; height: auto; background: #fff; display: block; }
figcaption { color: var(--muted); margin-top: 4px; }
code, .mono { font-family: ui-monospace, monospace; font-size: 12px; }
.scroll { overflow-x: auto; }
`;

const page = (title, body) =>
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${STYLE}</style></head><body>\n${body}\n</body></html>\n`;

const reports = existsSync(src)
    ? readdirSync(src)
          .filter((f) => f.endsWith(".json"))
          .sort()
          .map((f) => JSON.parse(readFileSync(join(src, f), "utf8")))
    : [];

for (const r of reports) {
    const id = r.sample;
    for (const [from, to] of [
        [join(oracles, `${id}.svg`), `${id}.oracle.svg`],
        [join(src, `${id}.graphty.png`), `${id}.graphty.png`],
        [join(src, `${id}.overlay.png`), `${id}.overlay.png`],
        [join(src, `${id}.aligned.png`), `${id}.aligned.png`],
        [join(src, `${id}.json`), `${id}.json`],
    ]) {
        if (existsSync(from)) {
            copyFileSync(from, join(out, to));
        }
    }
    const propsOf = (properties) =>
        Object.entries(properties)
            .map(
                ([p, v]) =>
                    `<tr><td class="mono">${esc(p)}</td><td>${v.n}</td><td class="${tone(v.passRate)}">${pct(v.passRate)}</td><td>${esc(v.tolerance)}</td><td class="mono">${v.worst
                        .slice(0, 5)
                        .map((w) => `${esc(w.id)}: oracle ${esc(short(w.oracle))}, graphty ${esc(short(w.graphty))}`)
                        .join("<br>")}</td></tr>`,
            )
            .join("\n");
    const props = propsOf(r.properties);
    // a sheet judged per setting: each reference scores only the properties of the settings it draws (judges.json)
    const references = (r.references ?? [])
        .map((ref) => {
            const who = ref.reference === "oracle" ? `the sheet's oracle, ${ref.meta?.program ?? "?"}` : ref.reference;
            let kind = ref.meta?.standIn ? "a stand-in program, scored apart" : "the file's own reading program";
            if (ref.reference === "specification") {
                kind = "the format's specification, not a program: each expectation cites its section in judges.json";
            }
            const judged = Object.fromEntries(Object.entries(ref.report.properties).filter(([, v]) => v.n > 0));
            const failing = Object.entries(ref.report.failures ?? {})
                .map(([p, ids]) => `${esc(p)}: ${esc(ids.join(", "))}`)
                .join("<br>");
            return `<h3>Judged by ${esc(who)} (${esc(kind)})</h3>
<div class="scroll"><table><tr><th>property</th><th>judged</th><th>pass</th><th>tolerance</th><th>worst elements</th></tr>
${propsOf(judged)}</table></div>
<p class="mono">${failing || "every element it judges passes"}</p>`;
        })
        .join("\n");
    const matchedProps = r.positionMatched ? propsOf(r.positionMatched.report.properties) : "";
    const failures = Object.entries(r.failures ?? {})
        .map(
            ([p, ids]) =>
                `<tr><td class="mono">${esc(p)}</td><td>${ids.length}</td><td class="mono">${esc(ids.slice(0, 60).join(", "))}${ids.length > 60 ? ", ..." : ""}</td></tr>`,
        )
        .join("\n");
    const raster = r.raster
        ? Object.entries(r.raster.regions)
              .map(
                  ([k, v]) =>
                      `<tr><td>${esc(k)}</td><td>${v.pixels}</td><td class="${tone(similarityRate(v.similarity))}">${v.similarity ?? "--"}</td></tr>`,
              )
              .join("\n")
        : "";
    const worstRaster = r.raster
        ? r.raster.worst
              .map(
                  (w) => `<tr><td>${esc(w.region)}</td><td class="mono">${esc(w.id)}</td><td>${w.similarity}</td></tr>`,
              )
              .join("\n")
        : "";
    const strays = r.strays
        .filter((s) => !s.matched)
        .slice(0, 50)
        .map(
            (s) =>
                `<tr><td>${esc(s.tag)}</td><td class="mono">${esc(short(s.box))}</td><td>${esc(s.fill ?? "")}</td><td>${esc(s.stroke ?? "")}</td><td>${esc(s.text ?? "")}</td></tr>`,
        )
        .join("\n");
    const meta = r.oracleMeta ?? {};
    const t = r.transform;
    const guide = r.association?.guide;
    const guided = guide ? ", guided by " + esc(guide.source) + " (" + guide.pairs + " pairs)" : "";
    const unrelated = t?.unrelatedLayout
        ? " (unrelated layouts: lengths judged at the size-fitted scale " + t.lengthScale + ")"
        : "";
    const reflected = t?.reflect ? ", reflected" : "";
    const fitText = t
        ? "scale " +
          t.scale +
          ", rotation " +
          t.rotationDeg +
          " deg" +
          reflected +
          ", residual " +
          t.rms +
          " of the diagonal over " +
          t.matched +
          " nodes" +
          unrelated
        : "none (fewer than two matched nodes)";
    const standIn = meta.standIn ? " (stand-in: " + esc(meta.standInReason ?? meta.standIn) + ")" : "";
    const body = `<p><a href="index.html">all samples</a></p>
<h1>${esc(id)}</h1>
<p>Oracle: <b>${esc(meta.program ?? "?")}</b> ${esc(meta.version ?? "")}${standIn}. Command: <code>${esc(meta.command ?? "")}</code></p>
<p>Association: ${esc(r.association?.method ?? "?")}${guided}.
Fit graphty to oracle: ${fitText}.</p>
<p>Nodes ${r.counts.matchedNodes} matched of ${r.counts.oracleNodes} oracle / ${r.counts.graphtyNodes} graphty; edges ${r.counts.matchedEdges} of ${r.counts.oracleEdges} / ${r.counts.graphtyEdges}; groups ${r.counts.oracleGroups} / ${r.counts.graphtyGroups}; unassociated oracle shapes ${r.counts.oracleStrays}, free oracle text ${r.counts.oracleTexts}.</p>
<div class="grid">
<figure><img src="${esc(id)}.oracle.svg" alt="the program's own SVG"><figcaption>${esc(meta.program ?? "oracle")} SVG (as the program wrote it)</figcaption></figure>
<figure><img src="${esc(id)}.graphty.png" alt="graphty's canvas"><figcaption>graphty-element canvas</figcaption></figure>
<figure>${existsSync(join(out, `${id}.overlay.png`)) ? `<img src="${esc(id)}.overlay.png" alt="overlay">` : "no raster oracle"}<figcaption>overlay: the rasterized oracle aligned into graphty's frame at 50%</figcaption></figure>
</div>
<p>Verdict: ${verdictText(r.verdict, "every element passes", "elements fail a property")}${r.standIn ? "; the oracle is a stand-in, scored apart" : ""}.</p>
<h2>Properties</h2>
<div class="scroll"><table><tr><th>property</th><th>judged</th><th>pass</th><th>tolerance</th><th>worst elements</th></tr>
${props}</table></div>
${references ? `<h2>Which reference judged each property</h2>\n<p>No one program draws every setting of this sheet, so each property of each setting is judged by the reference that draws it (graph-io/test/fidelity/specimens/gml/judges.json); the table above is the sheet's oracle's share.</p>\n${references}` : ""}
<h2>Failing elements, by property</h2>
<div class="scroll"><table><tr><th>property</th><th>failing</th><th>elements</th></tr>
${failures}</table></div>
<h2>With graphty's nodes at the program's own positions (style apart from layout)</h2>
${
    r.positionMatched
        ? `<div class="scroll"><table><tr><th>property</th><th>judged</th><th>pass</th><th>tolerance</th><th>worst elements</th></tr>
${matchedProps}</table></div>`
        : "<p>not run (fewer than two nodes paired)</p>"
}
<h2>Raster regions (second signal)</h2>
<p>Label ink, graphty over oracle: ${r.raster?.labelInkRatio ?? "--"} (over 1 draws heavier text).</p>
<table><tr><th>region</th><th>pixels</th><th>similarity</th></tr>${raster}</table>
<table><tr><th>region</th><th>element</th><th>similarity</th></tr>${worstRaster}</table>
<h2>Unassociated oracle primitives</h2>
<table><tr><th>tag</th><th>box</th><th>fill</th><th>stroke</th><th>text</th></tr>${strays}</table>
<h2>Unmatched</h2>
<p class="mono">oracle nodes: ${esc(r.unmatched.oracleNodes.slice(0, 40).join(", "))}<br>graphty nodes: ${esc(r.unmatched.graphtyNodes.slice(0, 40).join(", "))}<br>oracle edges: ${esc(r.unmatched.oracleEdges.slice(0, 40).join(", "))}<br>graphty edges: ${esc(r.unmatched.graphtyEdges.slice(0, 40).join(", "))}</p>
<p><a href="${esc(id)}.json">report JSON</a></p>`;
    writeFileSync(join(out, `${id}.html`), page(`${id} oracle`, body));
}

// ---- the index: every sample's pass rates, then the owner's issues against them
const columns = [
    "node.present",
    "node.extra",
    "node.position",
    "node.width",
    "node.sizeToSpacing",
    "node.fill",
    "node.stroke",
    "label.size",
    "label.weight",
    "label.rotation",
    "edge.present",
    "edge.extra",
    "edge.route",
    "edge.curve",
    "edge.width",
    "edge.dash",
    "edge.arrowLength",
    "group.present",
    "stray.present",
    "frame.zoom",
];
// a stand-in oracle (another program's drawing, or a raster) says how close graphty is to that program, not to the
// file's own: its rows are a table of their own
const rateCell = (rate) => `<td class="${tone(rate)}">${pct(rate)}</td>`;
const rowOf = (r) => {
    const verdictClass = r.verdict?.pass ? "ok" : "bad";
    const rates = columns.map((c) => rateCell(r.properties[c]?.passRate)).join("");
    return `<tr><td><a href="${esc(r.sample)}.html">${esc(r.sample)}</a></td><td>${esc(r.oracleMeta?.program ?? "")}</td><td class="${verdictClass}">${verdictText(r.verdict, "pass", "failing")}</td>${rates}</tr>`;
};
const rowsOf = (list) => list.map(rowOf).join("\n");
const header = columns.map((c) => `<th class="mono">${esc(c)}</th>`).join("");
const byId = new Map(reports.map((r) => [r.sample, r]));
const ledger = existsSync(join(oracles, "ISSUES.md")) ? readFileSync(join(oracles, "ISSUES.md"), "utf8") : "";
const issues = ledger
    .split("\n")
    .filter((l) => /^\|\s*I\d+/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()))
    .map((c) => ({ id: c[1], sample: c[3].replaceAll("`", ""), words: c[4], area: c[5] }));
const issueRows = issues
    .map((iss) => {
        const props = [...new Set(AREA_PROPERTIES.filter(([re]) => re.test(iss.area)).flatMap(([, ps]) => ps))];
        const samples = iss.sample.startsWith("all ")
            ? reports.filter((r) => r.sample.startsWith(iss.sample.replace(/^all (\w+)-\* samples$/, "$1-")))
            : [byId.get(iss.sample)].filter(Boolean);
        if (samples.length === 0) {
            return `<tr><td>${esc(iss.id)}</td><td class="mono">${esc(iss.sample)}</td><td>${esc(iss.words)}</td><td class="mono">${esc(props.join(", "))}</td><td class="na">no oracle yet</td></tr>`;
        }
        const cells = props.map((p) => {
            const rates = samples.map((s) => s.properties[p]?.passRate).filter((v) => v !== null && v !== undefined);
            const rate = rates.length === 0 ? null : rates.reduce((a, b) => a + b, 0) / rates.length;
            return { p, rate };
        });
        const judged = cells.filter((c) => c.rate !== null);
        const sketch = samples.every(
            (s) => s.oracleMeta?.standIn === true && String(s.oracleMeta?.program ?? "").startsWith("none"),
        );
        const weak = samples.some(
            (s) => s.counts.oracleNodes > 0 && s.counts.matchedNodes / s.counts.oracleNodes < 0.5,
        );
        const ink = samples.map((s) => s.raster?.labelInkRatio).filter((v) => typeof v === "number");
        const inkNote =
            /font weight/.test(iss.area) && ink.length > 0
                ? `; label ink graphty/oracle ${ink.map((v) => v.toFixed(2)).join(", ")}`
                : "";
        let verdict;
        if (sketch) {
            verdict = "not judged: the oracle is a stand-in sketch, the program never ran";
        } else if (props.length === 0) {
            verdict = "the oracle is the program's own drawing of the file: judge the reference by looking at it";
        } else if (weak) {
            verdict =
                "not judged reliably: under half of the oracle's nodes could be matched (different graph or layout)";
        } else if (judged.length === 0) {
            verdict = "not judged on this sample";
        } else if (judged.some((c) => c.rate < 0.999)) {
            verdict = "reproduced: the oracle comparison fails it";
        } else {
            verdict = "not reproduced: graphty matches the program's drawing here";
        }
        verdict += inkNote;
        const links = samples.map((s) => '<a href="' + esc(s.sample) + '.html">' + esc(s.sample) + "</a>").join(", ");
        const rates = cells.map((c) => esc(c.p) + " " + pct(c.rate)).join("<br>");
        return `<tr><td>${esc(iss.id)}</td><td class="mono">${links}</td><td>${esc(iss.words)}</td><td class="mono">${rates}</td><td>${esc(verdict)}</td></tr>`;
    })
    .join("\n");
writeFileSync(
    join(out, "index.html"),
    page(
        "Style oracle report",
        `<h1>Style import against the programs' own SVG drawings</h1>
<p>Each sample's oracle is the program's own SVG export of the committed file (graph-io/test/fidelity/oracles/); graphty-element's drawing of the same file is compared with it property by property after one similarity fit on matched node centers. ${reports.length} samples.</p>
<div class="scroll"><table><tr><th>sample</th><th>program</th><th>elements</th>${header}</tr>
${rowsOf(reports.filter((r) => !r.standIn))}</table></div>
<h2>Stand-in oracles (another program's drawing, or a raster), scored apart</h2>
<div class="scroll"><table><tr><th>sample</th><th>stand-in program</th><th>elements</th>${header}</tr>
${rowsOf(reports.filter((r) => r.standIn))}</table></div>
<h2>The owner's issues, judged by the oracles</h2>
<div class="scroll"><table><tr><th>issue</th><th>sample</th><th>owner's words</th><th>oracle properties</th><th>verdict</th></tr>
${issueRows}</table></div>`,
    ),
);
console.log(`${reports.length} sample pages and index.html in ${out}`);
