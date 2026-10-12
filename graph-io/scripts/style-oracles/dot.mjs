// DOT styles against Graphviz itself. Every file is drawn by `dot -Txdot` and `dot -Tplain`, and for every node and
// edge the value graph-io resolves (with Graphviz's defaults beneath) must be what Graphviz draws:
//   node: fill (xdot C), outline (xdot c), label text and label color (_ldraw_), shape (-Tplain), width and height
//         (-Tplain; exact, or a minimum where graph-io notes W_STYLE_SIZE_MINIMUM)
//   edge: line color (xdot c), line style (-Tplain), head and tail arrows drawn or not (_hdraw_, _tdraw_)
// Usage: node graph-io/scripts/style-oracles/dot.mjs [file or directory ...]   (needs `dot` on the PATH)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { importStyled, inputs, LOCAL, readInput, REPO, shown, Tally, toolColor, toolEnum } from "./common.mjs";

const { importGraph } = await import(join(REPO, "graph-io/dist/graph-io.js"));

const FIXTURES = join(REPO, "graph-io/test/conformance/fixtures/dot");
const LOCAL_DIRS = [
    "wild/dot",
    "wild/round2/dot",
    "review-1/adv/dot",
    "review-1/adv/run/dot",
    "spike/adv3/dot",
    "spike/synth/dot",
    "final-check/adv/dot",
    "review-2/hostile/dot",
].map((d) => join(LOCAL, d));

let files;
if (process.argv.length > 2) {
    files = inputs([], /\.(gv|dot)$/, 5e6);
} else {
    files = JSON.parse(readFileSync(join(FIXTURES, "manifest.json"), "utf8"))
        .fixtures.filter((fx) => fx.expected.outcome === "pass")
        .map((fx) => join(FIXTURES, fx.file));
    files.push(...inputs([join(REPO, "graph-io/test/corpus/styles/dot"), ...LOCAL_DIRS], /\.(gv|dot)$/, 5e6));
}

// Every difference the run may show, with the reason it is not graph-io's error. See README.md.
const EXPLAINED = [
    {
        reason: "Graphviz 2.43 writes a Latin-1 or windows-1252 label into -Txdot as its raw bytes read as UTF-8 (its own charset bug): graph-io's label is the text the file means",
        test: (d) => d.key === "node label" && /latin1|cp1252/i.test(d.file),
    },
    {
        reason: "a node with peripheries=2 or more (a doublecircle has 2) is drawn 8 points wider and taller per extra outline; the neutral vocabulary has one outline, so graph-io's size is the inner shape's",
        test: (d) =>
            /^node (width|height)/.test(d.key) &&
            d.peripheries > 1 &&
            Math.abs(d.tool - d.graphio - 8 * (d.peripheries - 1)) <= 0.75,
    },
    {
        reason: "width=NaN and fontsize=1e308 put a NaN size and an overflowed text position into Graphviz's own layout (a hostile input): Graphviz draws a 24-point node and its label off the page",
        test: (d) => d.file.endsWith("d13b-hostile-numbers.gv") && d.id === "a" && /^node (width|label)/.test(d.key),
    },
    {
        reason: "Graphviz 2.43 draws no tail arrow on an edge whose tail is clipped away by a compound edge (issue 2437's reproduction)",
        test: (d) => d.key === "edge sourceArrow drawn" && d.file.endsWith("graphviz-issues/2437.dot"),
    },
];

// xdot drawing operations: "c 7 -#ff0000" pen color, "C 7 -#ff0000" fill color, "S 15 -setlinewidth(0)" pen style,
// "T x y j w n -text"; the number
// before "-" is the byte length of what follows.
function ops(s) {
    const o = [];
    if (typeof s !== "string") {
        return o;
    }
    const bytes = Buffer.from(s, "utf8");
    let i = 0;
    while (i < bytes.length) {
        const head = bytes.subarray(i, i + 128).toString("latin1");
        const c = /^\s*([cCS])\s+(\d+)\s+-/.exec(head);
        if (c) {
            const start = i + c[0].length;
            const len = Number(c[2]);
            const text = bytes.subarray(start, start + len).toString("utf8");
            o.push(c[1] === "S" ? { op: "S", style: text } : { op: c[1], color: text });
            i = start + len;
            continue;
        }
        const t = /^\s*T\s+\S+\s+\S+\s+\S+\s+\S+\s+(\d+)\s+-/.exec(head);
        if (t) {
            const start = i + t[0].length;
            const len = Number(t[1]);
            o.push({ op: "T", text: bytes.subarray(start, start + len).toString("utf8") });
            i = start + len;
            continue;
        }
        i++;
    }
    return o;
}
// a gradient is "[x0 y0 x1 y1 n offset len -#color ...]" (or "(...)" radial): its first stop
const firstStop = (c) => (/^[[(]/.test(c) ? (/\d+\s+-(#[0-9a-fA-F]{6,8})/.exec(c)?.[1] ?? c) : c);
const rgb = (c) => toolColor(firstStop(c), "graphviz");
const transparent = (c) => /^#[0-9a-f]{6}00$/i.test(firstStop(c));

/** -Tplain lines, tokenized (quoted names and labels kept whole). */
function plain(text) {
    const nodes = new Map();
    const edges = [];
    for (const line of text.split("\n")) {
        const t = [];
        for (let i = 0; i < line.length;) {
            if (line[i] === " ") {
                i++;
                continue;
            }
            if (line[i] === '"') {
                let j = i + 1;
                let v = "";
                while (j < line.length && line[j] !== '"') {
                    if (line[j] === "\\" && j + 1 < line.length) {
                        v += line[j] + line[j + 1];
                        j += 2;
                        continue;
                    }
                    v += line[j++];
                }
                t.push(v);
                i = j + 1;
                continue;
            }
            if (line[i] === "<") {
                let depth = 0;
                let j = i;
                for (; j < line.length; j++) {
                    if (line[j] === "<") {
                        depth++;
                    } else if (line[j] === ">" && --depth === 0) {
                        break;
                    }
                }
                t.push(line.slice(i, j + 1));
                i = j + 1;
                continue;
            }
            let j = i;
            while (j < line.length && line[j] !== " ") {
                j++;
            }
            t.push(line.slice(i, j));
            i = j;
        }
        // read from the end: the label in the middle may hold spaces or markup
        if (t[0] === "node" && t.length >= 11) {
            nodes.set(t[1], {
                width: Number(t[4]),
                height: Number(t[5]),
                style: t[t.length - 4],
                shape: t[t.length - 3],
            });
        }
        if (t[0] === "edge") {
            const n = Number(t[3]);
            const rest = t.slice(4 + 2 * n);
            edges.push({ tail: t[1], head: t[2], style: rest.length >= 2 ? rest[rest.length - 2] : null });
        }
    }
    return { nodes, edges };
}
const lineOf = (st) => {
    const s = (st ?? "").split(",");
    return s.includes("dashed") ? "dashed" : s.includes("dotted") ? "dotted" : "solid";
};
const cell = (table, name, i) => (table.has(name) ? (table.value(name, i) ?? null) : null);

const tally = new Tally("DOT against Graphviz", EXPLAINED);
for (const file of files) {
    const { bytes, filename } = readInput(file);
    const g = await importStyled(bytes, "dot", filename);
    if (g === null || !g.styled) {
        tally.skip(file, g === null ? "graph-io does not import it" : "no styles");
        continue;
    }
    const run = (fmt) =>
        execFileSync("sh", ["-c", `ulimit -c 0; exec dot -T${fmt}`], {
            input: bytes,
            timeout: 180000,
            stdio: ["pipe", "pipe", "ignore"],
            maxBuffer: 1 << 28,
        });
    let xdot, pl, x;
    try {
        xdot = run("xdot");
        pl = plain(run("plain").toString("utf8"));
    } catch (e) {
        tally.skip(file, `Graphviz does not draw it (${e.signal ?? `exit ${e.status}`})`);
        continue;
    }
    for (const encoding of ["utf-8", undefined]) {
        try {
            // dot writes UTF-8 whatever the input's charset attribute says
            x ??= (
                await importGraph(new Uint8Array(xdot), {
                    format: "dot",
                    filename: "x.gv",
                    encoding,
                    errorLimit: Infinity,
                })
            ).snapshot;
        } catch {
            // tried next without the encoding
        }
    }
    if (x === undefined) {
        tally.skip(file, "graph-io does not read Graphviz's xdot output of it");
        continue;
    }
    tally.files++;
    const s = g.snapshot;
    const name = shown(file);
    for (let i = 0; i < s.nodeCount; i++) {
        if (cell(s.nodes, "graphty.cluster", i) === true || g.drawn("node", "visible", i) === false) {
            continue;
        }
        const id = String(s.ids.idOf(i));
        const xi = x.ids.indexOf(s.ids.idOf(i));
        if (!(xi >= 0 && xi < x.nodeCount)) {
            continue;
        }
        tally.elements++;
        const at = { file: name, id };
        const both = (p) => [g.stated("node", p, i), g.drawn("node", p, i)];
        const dr = ops(cell(x.nodes, "_draw_", xi));
        const ld = ops(cell(x.nodes, "_ldraw_", xi));
        const C = dr.find((o) => o.op === "C");
        const c = dr.find((o) => o.op === "c");
        // a fill Graphviz draws transparent is no fill; graph-io says so with fillOpacity 0
        const [tFill, dFill] = both("fill");
        const unfilled = dFill === null || g.drawn("node", "fillOpacity", i) === 0;
        const gFill = C && !transparent(C.color) ? rgb(C.color) : null;
        tally.compare("node fill", at, tFill, unfilled ? null : dFill, gFill, null);
        const [tLine, dLine] = both("borderColor");
        const outline = g.drawn("node", "borderWidth", i) === 0 ? null : dLine;
        // a pen of width 0 draws no outline
        const noPen = dr.some((o) => o.op === "S" && /^setlinewidth\(0(\.0*)?\)$/.test(o.style));
        tally.compare(
            "node outline",
            at,
            tLine,
            outline,
            c && !noPen && !transparent(c.color) ? rgb(c.color) : null,
            null,
        );
        const xlabel = cell(s.nodes, "xlabel", i) !== null;
        const markup =
            g.covers("W_STYLE_HTML_LABEL", "node", "label", i) || g.covers("W_STYLE_RECORD_LABEL", "node", "label", i);
        if (!markup && !xlabel) {
            // Graphviz draws each line as its own text operation; an empty line draws nothing
            const [tl, dl] = both("label");
            const lines = (v) =>
                v === null
                    ? ""
                    : String(v)
                          .split("\n")
                          .filter((l) => l !== "")
                          .join("\n");
            const drawn = ld
                .filter((o) => o.op === "T")
                .map((o) => o.text)
                .join("\n");
            tally.compare("node label", at, tl, lines(dl), drawn, "");
            const lc = ld.find((o) => o.op === "c");
            if (ld.length > 0 && !(lc && transparent(lc.color))) {
                const [tc, dc] = both("labelColor");
                tally.compare("node label color", at, tc, dc, lc ? rgb(lc.color) : "#000000", "#000000");
            }
        }
        const pn = pl.nodes.get(id);
        if (pn) {
            // rounded corners are a style in Graphviz and part of the shape in the neutral vocabulary
            const rounded =
                (pn.style ?? "").split(",").includes("rounded") && /^(box|rect|rectangle|square)$/.test(pn.shape);
            const gs = rounded ? "round-rectangle" : toolEnum("shape", pn.shape, "graphviz");
            const [ts, ds] = both("shape");
            if ((gs !== null && !gs.startsWith("other:")) || String(ds).startsWith("other:")) {
                tally.compare("node shape", { ...at, plain: pn.shape }, ts, ds, gs, "ellipse");
            }
            // Graphviz's default size is a minimum too: the node grows to fit its label
            const minimum =
                g.covers("W_STYLE_SIZE_MINIMUM", "node", "width,height", i) || g.stated("node", "width", i) === null;
            const shapeName = String(cell(s.nodes, "shape", i) ?? "").toLowerCase();
            const peripheries = Number(cell(s.nodes, "peripheries", i) ?? (shapeName === "doublecircle" ? 2 : 1));
            for (const [p, gv] of [
                ["width", pn.width * 72],
                ["height", pn.height * 72],
            ]) {
                const [tv, dv] = both(p);
                if (dv === null) {
                    continue;
                }
                const ok = minimum ? gv >= dv - 0.75 : Math.abs(gv - dv) <= 0.75;
                if (ok) {
                    tally.record(minimum ? `node ${p} (minimum)` : `node ${p}`, "ok");
                } else {
                    tally.record(minimum ? `node ${p} (minimum)` : `node ${p}`, tv === null ? "default" : "disagree", {
                        ...at,
                        graphio: dv,
                        tool: gv,
                        peripheries,
                    });
                }
            }
        }
    }
    // edges: matched by (tail, head, occurrence); concentrate=true merges parallel edges into one drawn edge, a
    // layout choice graphty does not make, so the edges of such graphs are not compared
    if (/^true$/i.test(String(cell(s.graph, "concentrate", 0)))) {
        continue;
    }
    const key = (snap, e) =>
        `${String(snap.ids.idOf(snap.edgeSource(e)))}->${String(snap.ids.idOf(snap.edgeTarget(e)))}`;
    const xByKey = new Map();
    const plByKey = new Map();
    for (let e = 0; e < x.edgeCount; e++) {
        const k = key(x, e);
        xByKey.set(k, [...(xByKey.get(k) ?? []), e]);
    }
    for (const pe of pl.edges) {
        const k = `${pe.tail}->${pe.head}`;
        plByKey.set(k, [...(plByKey.get(k) ?? []), pe]);
    }
    const seen = new Map();
    for (let e = 0; e < s.edgeCount; e++) {
        const k = key(s, e);
        const n = seen.get(k) ?? 0;
        seen.set(k, n + 1);
        const xi = xByKey.get(k)?.[n];
        if (xi === undefined || g.drawn("edge", "visible", e) === false) {
            continue;
        }
        tally.elements++;
        const at = { file: name, edge: k };
        const both = (p) => [g.stated("edge", p, e), g.drawn("edge", p, e)];
        const dr = ops(cell(x.edges, "_draw_", xi));
        const c = dr.find((o) => o.op === "c");
        if (dr.length > 0) {
            const [t, d] = both("color");
            tally.compare("edge color", at, t, d, c ? rgb(c.color) : "#000000", "#000000");
        }
        const pe = plByKey.get(k)?.[n];
        if (pe) {
            const [t, d] = both("lineStyle");
            tally.compare("edge line style", { ...at, plain: pe.style }, t, d, lineOf(pe.style), "solid");
        }
        const drawnOp = (col) => {
            const v = cell(x.edges, col, xi);
            return v !== null && String(v).trim() !== "";
        };
        for (const [p, gv] of [
            ["targetArrow", drawnOp("_hdraw_")],
            ["sourceArrow", drawnOp("_tdraw_")],
        ]) {
            const [t, d] = both(p);
            tally.compare(`edge ${p} drawn`, { ...at, arrow: d }, t, d !== null && d !== "none", gv, false);
        }
    }
}
process.exit(tally.finish() ? 0 : 1);
