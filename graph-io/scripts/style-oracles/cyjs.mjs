// Cytoscape.js documents against real Cytoscape.js (headless, styles on). For every node and edge and every
// property below, the value graph-io resolves (with the defaults of the tool that wrote the file beneath) must be the
// value Cytoscape.js computes from the document's own stylesheet; where graph-io has no value, Cytoscape.js must
// draw what it draws with no stylesheet at all.
// Usage: node graph-io/scripts/style-oracles/cyjs.mjs [file or directory ...]
import { createRequire } from "node:module";
import { join } from "node:path";

import { importStyled, inputs, LOCAL, readInput, REPO, same, shown, Tally, toolColor, toolEnum } from "./common.mjs";

const require = createRequire(import.meta.url);
const cytoscape = require("cytoscape");

const DIRS = [
    join(REPO, "graph-io/test/conformance/fixtures/json"),
    join(REPO, "graph-io/test/corpus/styles/json"),
    join(REPO, "graph-io/test/corpus/styles/cyjs"),
    ...[
        "wild/json",
        "wild/round2/json",
        "review-1/adv/json",
        "review-1/adv/run/json",
        "spike/adv3/json",
        "spike/synth/json",
        "review-2/hostile/json",
        "review-2/hostile3/json",
        "final-check/adv/json",
        "final-check/adv3/json",
        "final-check/adv4/json",
        "final-check/adv5/json",
        "final-check/adv6/json",
        "final-check/adv7/json",
    ].map((d) => join(LOCAL, d)),
];
const files = inputs(DIRS, /\.(json|cyjs)$/i, 30e6);

// Every difference the run may show, with the reason it is not graph-io's error. See README.md.
const EXPLAINED = [
    {
        reason: "a Cytoscape desktop export without its style: graph-io draws Cytoscape desktop's defaults (it looks as it did in Cytoscape), Cytoscape.js with no stylesheet draws its own",
        test: (d) => d.kind === "default" && d.writer === "cytoscape",
    },
    {
        reason: "a width or height of `label` or in `em` depends on measured text, which headless Cytoscape.js does not have: it returns the value unresolved, so there is no size to compare",
        test: (d) =>
            /^node (width|height)$/.test(d.key) && d.tool === null && /^(label|-?[\d.]+em)$/.test(String(d.raw)),
    },
];

const DIALECT = "cytoscape-js";
const px = (v) => {
    const n = Number(String(v).replace(/px$/, ""));
    return Number.isFinite(n) ? n : null;
};
const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const col = (v) => toolColor(String(v), DIALECT);
const NODE = {
    fill: ["background-color", col],
    fillOpacity: ["background-opacity", num],
    opacity: ["opacity", num],
    borderColor: ["border-color", col],
    borderWidth: ["border-width", px],
    borderStyle: ["border-style", (v) => toolEnum("borderStyle", v, DIALECT)],
    shape: ["shape", (v) => toolEnum("shape", v, DIALECT)],
    width: ["width", px],
    height: ["height", px],
    label: ["label", String],
    labelColor: ["color", col],
    labelSize: ["font-size", px],
    labelWeight: ["font-weight", (v) => (v === "bold" || Number(v) >= 600 ? "bold" : "normal")],
    labelItalic: ["font-style", (v) => v === "italic" || v === "oblique"],
};
const EDGE = {
    color: ["line-color", col],
    width: ["width", px],
    opacity: ["opacity", num],
    lineStyle: ["line-style", (v) => toolEnum("lineStyle", v, DIALECT)],
    targetArrow: ["target-arrow-shape", (v) => toolEnum("arrow", v, DIALECT)],
    sourceArrow: ["source-arrow-shape", (v) => toolEnum("arrow", v, DIALECT)],
    targetArrowColor: ["target-arrow-color", col],
    sourceArrowColor: ["source-arrow-color", col],
    label: ["label", String],
    labelColor: ["color", col],
    labelSize: ["font-size", px],
};
// graph-io's weight is "normal" or "bold"; anything else it draws as normal
const canonical = (p, v) => (p === "labelWeight" && v !== null && v !== "bold" ? "normal" : v);

const tally = new Tally("Cytoscape.js documents against Cytoscape.js", EXPLAINED);
// Cytoscape.js warns about every mapping it cannot apply; the comparison is what counts
console.warn = () => {};
for (const file of files) {
    const { bytes, filename } = readInput(file);
    let doc;
    try {
        doc = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        continue;
    }
    const g = await importStyled(bytes, "json", filename);
    if (g === null || g.snapshot.meta.extra?.json?.dialect !== "cytoscape") {
        continue;
    }
    if (!g.styled) {
        tally.skip(file, "no styles");
        continue;
    }
    const s = g.snapshot;
    const style = Array.isArray(doc) ? [] : (doc.style ?? []);
    const elements = Array.isArray(doc) ? doc : doc.elements;
    const rules = Array.isArray(style) ? style.length : String(style).split("}").length;
    if (rules * Math.max(1, s.nodeCount + s.edgeCount) > 2e7) {
        tally.skip(file, "too large for Cytoscape.js's own cascade (rules x elements over 2e7)");
        continue;
    }
    let cy, cy0;
    try {
        cy = cytoscape({ headless: true, styleEnabled: true, elements, style });
        cy0 = cytoscape({ headless: true, styleEnabled: true, elements, style: [] });
    } catch (e) {
        tally.skip(file, `Cytoscape.js does not load it: ${String(e.message).slice(0, 80)}`);
        continue;
    }
    if (cy.nodes().length !== s.nodeCount || cy.edges().length !== s.edgeCount) {
        tally.skip(
            file,
            `Cytoscape.js holds ${cy.nodes().length} nodes and ${cy.edges().length} edges, graph-io ${s.nodeCount} and ${s.edgeCount}`,
        );
        continue;
    }
    tally.files++;
    const writer = g.extracted.styles.source.tool;
    const name = shown(file);
    let throws = 0;
    const cyEdges = cy.edges();
    const cy0Edges = cy0.edges();
    for (const [target, PROPS] of [
        ["node", NODE],
        ["edge", EDGE],
    ]) {
        const n = target === "node" ? s.nodeCount : s.edgeCount;
        for (let i = 0; i < n; i++) {
            let a, b;
            if (target === "node") {
                const id = String(s.ids.idOf(i));
                a = cy.getElementById(id);
                b = cy0.getElementById(id);
            } else {
                a = cyEdges[i];
                b = cy0Edges[i];
                if (String(a.source().id()) !== String(s.ids.idOf(s.edgeSource(i)))) {
                    tally.skip(file, "edges in another order");
                    break;
                }
            }
            if (!a || a.length === 0) {
                continue;
            }
            tally.elements++;
            for (const [p, [cp, conv]] of Object.entries(PROPS)) {
                let v, v0;
                try {
                    v = conv(a.style(cp));
                    v0 = conv(b.style(cp));
                } catch {
                    // Cytoscape.js itself throws on some hostile values (a color that is not a string)
                    throws++;
                    continue;
                }
                tally.compare(
                    `${target} ${p}`,
                    { file: name, element: target === "node" ? String(s.ids.idOf(i)) : i, writer, raw: a.style(cp) },
                    g.stated(target, p, i),
                    canonical(p, g.drawn(target, p, i)),
                    v,
                    v0,
                    same,
                );
            }
        }
    }
    cy.destroy();
    cy0.destroy();
    if (throws > 0) {
        tally.skip(file, `Cytoscape.js throws reading ${throws} of its values, which are not compared`);
    }
}
process.exit(tally.finish() ? 0 : 1);
