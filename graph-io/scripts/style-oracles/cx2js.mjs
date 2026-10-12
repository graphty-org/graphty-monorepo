// CX styles against an independent implementation of Cytoscape's visual style: cytoscape-cx2js, the NDEx team's
// CX-to-Cytoscape.js converter, drawn by real Cytoscape.js. cx2js shares no code with graph-io: it turns the CX
// defaults, mappings, dependencies and bypasses into a Cytoscape.js stylesheet, and Cytoscape.js evaluates it per
// element. Where graph-io has a value it must be drawn; where it has none, the element must look as cx2js draws the
// same network with its visual properties removed.
//
// Then the same NDEx network downloaded as CX and as CX2, parsed by different code from different syntaxes, must
// resolve to the same value for every property of every node and edge.
//
// cx2js is not a dependency of the repository: point CX2JS_DIR at an unpacked cytoscape-cx2js 0.6.6 with lodash in
// its node_modules (README.md says how). Default: <local corpora>/spike/vendor/cx2js.
// Usage: node graph-io/scripts/style-oracles/cx2js.mjs [file.cx or directory ...]
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";

import { STYLE_PROPERTIES } from "../../dist/styles.js";
import {
    importStyled,
    inputs,
    LOCAL,
    readInput,
    REPO,
    same,
    shown,
    Tally,
    toolColor,
    toolEnum,
    walk,
} from "./common.mjs";

const require = createRequire(import.meta.url);
const cytoscape = require("cytoscape");
const CX2JS = process.env.CX2JS_DIR ?? join(LOCAL, "spike/vendor/cx2js");
if (!existsSync(join(CX2JS, "src/index.js"))) {
    console.error(`cytoscape-cx2js not found in ${CX2JS}; set CX2JS_DIR (see README.md)`);
    process.exit(2);
}
const { CxToJs, CyNetworkUtils } = require(join(CX2JS, "src/index.js"));

const CX_DIRS = [
    join(REPO, "graph-io/test/conformance/fixtures/cx"),
    join(REPO, "graph-io/test/corpus/styles/cx"),
    ...["wild/ndex", "wild/round2/cx", "review-2/hostile/cx"].map((d) => join(LOCAL, d)),
];
const files = inputs(CX_DIRS, /\.cx$/i, 40e6);

// Every difference the run may show, with the reason it is not graph-io's error. See README.md.
const EXPLAINED = [
    {
        reason: "the network states nothing for the property: graph-io draws Cytoscape desktop's default, cx2js the default it lays under every network",
        test: (d) => d.kind === "default",
    },
    {
        reason: "the network's style states nothing for the property: graph-io draws Cytoscape desktop's default, cx2js leaves Cytoscape.js's own default (gray #999999, size 30 nodes, no label)",
        test: (d) => d.kind === "missed" && same(d.tool, d.cyjsDefault),
    },
    {
        reason: "cx2js takes a label's size from the size inside NODE_LABEL_FONT_FACE or EDGE_LABEL_FONT_FACE (`SansSerif,plain,12`); Cytoscape desktop, and graph-io, size labels by NODE_LABEL_FONT_SIZE and EDGE_LABEL_FONT_SIZE",
        test: (d) => /labelSize$/.test(d.key) && d.fromFace === true,
    },
    {
        reason: "Cytoscape's ARROW is read as `vee` by graph-io (Cytoscape draws a swept arrowhead) and as `triangle` by cx2js: a choice between two neutral names",
        test: (d) => d.key === "edge targetArrow" && d.graphio === "vee" && d.tool === "triangle",
    },
    {
        reason: "a label with whitespace or a line break at its end: Cytoscape.js trims it when cx2js hands it over; graph-io keeps the text as the file states it",
        test: (d) => / label$/.test(d.key) && typeof d.graphio === "string" && d.graphio.trim() === d.tool,
    },
    {
        reason: "a passthrough value Cytoscape cannot parse (an empty color, noted W_STYLE_BAD_VALUE): Cytoscape draws the style's default, as graph-io does; cx2js hands the bad value to Cytoscape.js, which keeps #999999",
        test: (d) => d.kind === "disagree" && d.noted.includes("W_STYLE_BAD_VALUE") && same(d.tool, d.cyjsDefault),
    },
    {
        reason: "a node the file marks selected: cx2js paints it with the style's selection color (NODE_SELECTED_PAINT); graph-io draws its unselected look, as graphty opens a file with nothing selected",
        test: (d) => d.key === "node fill" && d.selected === true,
    },
    {
        reason: "a file with several views of one network: graph-io reads the first view's style (noted W_STYLE_OTHER_VIEWS), cx2js merges every view's visual properties",
        test: (d) => d.fileNotes.includes("W_STYLE_OTHER_VIEWS"),
    },
    {
        reason: "a hostile mapping whose entry index is 1e8 or more (no real file has one): graph-io refuses the mapping (noted W_STYLE_BAD_MAPPING) and draws the style's default, cx2js applies it",
        test: (d) =>
            d.kind === "disagree" && d.fileNotes.includes("W_STYLE_BAD_MAPPING") && /mapping-sparse-index/.test(d.file),
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
    borderColor: ["border-color", col],
    borderWidth: ["border-width", px],
    shape: ["shape", (v) => toolEnum("shape", v, DIALECT)],
    width: ["width", px],
    height: ["height", px],
    label: ["label", String],
    labelColor: ["color", col],
    labelSize: ["font-size", px],
};
const EDGE = {
    color: ["line-color", col],
    width: ["width", px],
    lineStyle: ["line-style", (v) => toolEnum("lineStyle", v, DIALECT)],
    targetArrow: ["target-arrow-shape", (v) => toolEnum("arrow", v, DIALECT)],
    sourceArrow: ["source-arrow-shape", (v) => toolEnum("arrow", v, DIALECT)],
    targetArrowColor: ["target-arrow-color", col],
    sourceArrowColor: ["source-arrow-color", col],
    label: ["label", String],
    labelColor: ["color", col],
    labelSize: ["font-size", px],
};

/** What cx2js and Cytoscape.js draw for a CX document. */
function drawWithCx2js(raw) {
    const utils = new CyNetworkUtils();
    const nice = utils.rawCXtoNiceCX(raw);
    const cx = new CxToJs(utils);
    const map = {};
    const elements = cx.cyElementsFromNiceCX(nice, map);
    const style = cx.cyStyleFromNiceCX(nice, map);
    return cytoscape({ headless: true, styleEnabled: true, elements, style });
}

console.warn = () => {};
// what Cytoscape.js draws with no stylesheet at all
const plainCy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "e", source: "a", target: "b" } }],
});
const CYJS_DEFAULT = {
    node: Object.fromEntries(
        Object.entries(NODE).map(([p, [cp, conv]]) => [p, conv(plainCy.getElementById("a").style(cp))]),
    ),
    edge: Object.fromEntries(
        Object.entries(EDGE).map(([p, [cp, conv]]) => [p, conv(plainCy.getElementById("e").style(cp))]),
    ),
};

/** The label sizes stated inside the file's font faces (`SansSerif,plain,12`). */
function faceSizes(raw) {
    const out = new Set();
    for (const aspect of raw) {
        for (const v of aspect?.cyVisualProperties ?? []) {
            for (const [k, x] of Object.entries(v?.properties ?? {})) {
                const m = /_LABEL_FONT_FACE$/.test(k) ? /,(\d+(?:\.\d+)?)$/.exec(String(x)) : null;
                if (m) {
                    out.add(Number(m[1]));
                }
            }
        }
    }
    return out;
}
const tally = new Tally("CX against cytoscape-cx2js", EXPLAINED);
for (const file of files) {
    const { bytes, filename } = readInput(file);
    const g = await importStyled(bytes, "cx", filename);
    if (g === null || !g.styled) {
        tally.skip(file, g === null ? "graph-io does not import it" : "no styles");
        continue;
    }
    let cy, bare, sizes;
    try {
        const raw = JSON.parse(new TextDecoder().decode(bytes));
        sizes = faceSizes(Array.isArray(raw) ? raw : []);
        cy = drawWithCx2js(raw);
        // the baseline: what cx2js draws for the same network with its visual properties removed
        bare = drawWithCx2js(raw.filter((a) => !(a && typeof a === "object" && "cyVisualProperties" in a)));
    } catch (e) {
        tally.skip(file, `cx2js does not convert it: ${String(e.message).slice(0, 80)}`);
        continue;
    }
    tally.files++;
    const s = g.snapshot;
    const name = shown(file);
    const byEnds = new Map();
    cy.edges().forEach((e) => {
        const k = `${e.source().id()}->${e.target().id()}`;
        byEnds.set(k, [...(byEnds.get(k) ?? []), e.id()]);
    });
    const seen = new Map();
    const fileNotes = [...new Set(g.extracted.styles.notes.map((n) => n.code))];
    for (const [target, PROPS] of [
        ["node", NODE],
        ["edge", EDGE],
    ]) {
        const n = target === "node" ? s.nodeCount : s.edgeCount;
        for (let i = 0; i < n; i++) {
            let id;
            const edgeId = target === "edge" && s.edges.has("id") ? s.edges.value("id", i) : null;
            if (target === "node") {
                id = String(s.ids.idOf(i));
            } else if (edgeId !== null && edgeId !== undefined && cy.getElementById(`e${edgeId}`).length > 0) {
                id = `e${edgeId}`;
            } else {
                const k = `${String(s.ids.idOf(s.edgeSource(i)))}->${String(s.ids.idOf(s.edgeTarget(i)))}`;
                const m = seen.get(k) ?? 0;
                seen.set(k, m + 1);
                id = byEnds.get(k)?.[m];
            }
            const a = id === undefined ? null : cy.getElementById(id);
            const b = id === undefined ? null : bare.getElementById(id);
            if (!a || a.length === 0 || !b || b.length === 0) {
                continue;
            }
            tally.elements++;
            for (const [p, [cp, conv]] of Object.entries(PROPS)) {
                let v, v0;
                try {
                    v = conv(a.style(cp));
                    v0 = conv(b.style(cp));
                } catch {
                    continue;
                }
                // cx2js draws Cytoscape's open arrows as the filled shape with a hollow fill
                if (/Arrow$/.test(p)) {
                    const side = p.startsWith("target") ? "target" : "source";
                    const open = (el, x) =>
                        el.style(`${side}-arrow-fill`) === "hollow" &&
                        typeof x === "string" &&
                        !x.endsWith("-open") &&
                        x !== "none"
                            ? `${x}-open`
                            : x;
                    v = open(a, v);
                    v0 = open(b, v0);
                }
                tally.compare(
                    `${target} ${p}`,
                    {
                        file: name,
                        element: id,
                        noted: g.notedAt(target, p, i),
                        selected: a.selected(),
                        fileNotes,
                        cyjsDefault: CYJS_DEFAULT[target][p],
                        fromFace: p === "labelSize" && sizes.has(v),
                    },
                    g.stated(target, p, i),
                    g.drawn(target, p, i),
                    v,
                    v0,
                    (x, y) => same(x, y, 1e-3),
                );
            }
        }
    }
    cy.destroy();
    bare.destroy();
}
const cx2jsOk = tally.finish();

// ------------------------------------------------------------------ the same network as CX and as CX2
const pairs = [];
for (const [cxDir, cx2Dir] of [
    [join(REPO, "graph-io/test/corpus/styles/cx"), join(REPO, "graph-io/test/corpus/styles/cx2")],
    [join(LOCAL, "wild/ndex"), join(LOCAL, "wild/ndex")],
    [join(LOCAL, "wild/round2/cx"), join(LOCAL, "wild/round2/cx2")],
]) {
    const twins = new Map(walk([cx2Dir], /\.cx2$/i).map((f) => [basename(f).replace(/\.cx2(\.gz)?$/, ""), f]));
    for (const f of walk([cxDir], /\.cx$/i)) {
        const twin = twins.get(basename(f).replace(/\.cx(\.gz)?$/, ""));
        if (twin !== undefined && dirname(f) === cxDir) {
            pairs.push([f, twin]);
        }
    }
}
const twinTally = new Tally("the same network as CX and as CX2", [
    {
        reason: "NDEx's CX-to-CX2 conversion of network 821a7310 carries NODE_WIDTH and NODE_HEIGHT mappings that Cytoscape ignores in the CX file (nodeSizeLocked with NODE_SIZE 12) and folds NODE_SIZE into NODE_WIDTH: the two files state different sizes",
        test: (d) => /821a7310-beb6-11ed-a79c-005056ae23aa/.test(d.file) && /^node (width|height)$/.test(d.key),
    },
    {
        reason: "NDEx's CX-to-CX2 conversion writes the label font as the generic family `sans-serif` in place of the CX file's font name: the two files state different fonts",
        test: (d) => d.key === "node labelFont" && d.tool === "sans-serif",
    },
]);
const ID_COLUMNS = { edge: "id" };
for (const [cxFile, cx2File] of pairs) {
    const a = readInput(cxFile);
    const b = readInput(cx2File);
    const A = await importStyled(a.bytes, "cx", a.filename);
    const B = await importStyled(b.bytes, "cx2", b.filename);
    if (!A?.styled || !B?.styled) {
        twinTally.skip(cxFile, "one of the two does not import with styles");
        continue;
    }
    twinTally.files++;
    for (const target of ["node", "edge"]) {
        const key = (g, i) =>
            target === "node" ? String(g.snapshot.ids.idOf(i)) : String(g.snapshot.edges.value(ID_COLUMNS.edge, i));
        const n = (g) => (target === "node" ? g.snapshot.nodeCount : g.snapshot.edgeCount);
        const index = new Map();
        for (let j = 0; j < n(B); j++) {
            index.set(key(B, j), j);
        }
        for (let i = 0; i < n(A); i++) {
            const j = index.get(key(A, i));
            if (j === undefined) {
                continue;
            }
            twinTally.elements++;
            for (const p of STYLE_PROPERTIES[target].keys()) {
                let va = A.drawn(target, p, i);
                let vb = B.drawn(target, p, j);
                if (p === "visible") {
                    va = va === true ? null : va;
                    vb = vb === true ? null : vb;
                }
                // a difference is a "disagree" against the CX2 file's value
                twinTally.compare(
                    `${target} ${p}`,
                    { file: shown(cxFile), element: key(A, i) },
                    va,
                    va,
                    vb,
                    vb,
                    (x, y) => same(x, y, 5e-6),
                );
            }
        }
    }
}
const twinsOk = twinTally.finish();
process.exit(cx2jsOk && twinsOk ? 0 : 1);
