// GEXF and yEd GraphML styles against an independent reading of the same XML. Each file is parsed again with
// fast-xml-parser (no graph-io code), the program's own values are taken from it by the rules of that program, and
// for every node and edge graph-io's value (with the program's defaults beneath) must be that value; where the file
// has none, it must be the program's own default.
//   GEXF (Gephi): node fill and size (viz:color, viz:size; black and 10 when absent), edge color (viz:color, else
//     the source node's fill, as Gephi draws it) and width (viz:thickness, else the edge's weight, as Gephi draws it)
//   yEd: node fill (y:Fill, #FFCC00 when absent, none when transparent), label (the first visible label with
//     text), width and height (y:Geometry), edge color (y:LineStyle, black when absent) and label
// Usage: node graph-io/scripts/style-oracles/xml.mjs [file or directory ...]
import { join } from "node:path";

import { XMLParser } from "fast-xml-parser";

import { importStyled, inputs, LOCAL, readInput, REPO, same, shown, Tally, toolColor } from "./common.mjs";

const DIRS = [
    "graph-io/test/conformance/fixtures/gexf",
    "graph-io/test/conformance/fixtures/graphml",
    "graph-io/test/corpus/styles/gexf",
    "graph-io/test/corpus/styles/graphml",
].map((d) => join(REPO, d));
const LOCAL_DIRS = [
    "wild/gexf",
    "wild/graphml",
    "wild/round2/gexf",
    "wild/round2/graphml",
    "gexf",
    "graphml",
    "spike/adv3/gexf",
    "review-1/adv/run/gexf",
    "review-2/hostile/gexf",
    "review-2/hostile/graphml",
    "final-check/adv/gexf",
    "final-check/adv/graphml",
    "final-check/adv2/gexf",
].map((d) => join(LOCAL, d));
const files = inputs([...DIRS, ...LOCAL_DIRS], /\.(gexf|graphml)$/i, 60e6);

// Every difference the run may show, with the reason it is not graph-io's error. See README.md.
const EXPLAINED = [
    {
        reason: "a color drawn from a ramp graph-io recovered, within the writing program's rounding (2 of 255 per channel), noted W_STYLE_RAMP_ROUNDED for the element",
        test: (d) => d.noted.includes("W_STYLE_RAMP_ROUNDED") && within2(d.graphio, d.tool),
    },
    {
        reason: "a value the program never writes (a negative or infinite size, a channel that is not a number) in a hostile input: graph-io refuses it with W_STYLE_BAD_VALUE and draws the program's default",
        test: (d) => d.kind === "disagree" && d.noted.includes("W_STYLE_BAD_VALUE"),
    },
    {
        reason: "a color in a form yEd never writes (a CSS name such as `red`, a 3-digit `#ABC`) in a hand-made file: graph-io reads it as CSS does, the independent reading takes only the #RRGGBB yEd writes",
        test: (d) =>
            d.key === "yed node fill" &&
            !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(String(d.raw)) &&
            d.graphio === toolColor(d.raw),
    },
    {
        reason: "a node id written twice (a malformed file): graph-io reads one node whose later element's values win (W_DUPLICATE_NODE), the independent reading takes the first element",
        test: (d) => d.repeated === true,
    },
];

/** Two #rrggbb colors at most 2 of 255 apart in every channel. */
function within2(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }
    const channel = (c, k) => Number.parseInt(c.slice(k, k + 2), 16);
    return [1, 3, 5].every((k) => Math.abs(channel(a, k) - channel(b, k)) <= 2);
}

const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    trimValues: false,
    parseTagValue: false,
    parseAttributeValue: false,
    htmlEntities: true,
});

/** One parsed element: its local tag name, attributes and children, in document order. */
function element(raw) {
    const tag = Object.keys(raw).find((k) => k !== ":@");
    return {
        tag,
        attrs: raw[":@"] ?? {},
        kids: Array.isArray(raw[tag]) ? raw[tag] : [],
        text: tag === "#text" ? String(raw[tag]) : null,
    };
}
const children = (el, tag) => el.kids.map(element).filter((k) => tag === undefined || k.tag === tag);
const child = (el, tag) => children(el, tag)[0];
const textOf = (el) =>
    el.kids
        .map(element)
        .filter((k) => k.tag === "#text")
        .map((k) => k.text)
        .join("");

/** Every element of a tag, in document order (an explicit stack: no recursion on the file's depth). */
function all(roots, tag) {
    const out = [];
    const stack = [];
    const pushAll = (list) => {
        for (let k = list.length - 1; k >= 0; k--) {
            stack.push(list[k]);
        }
    };
    pushAll(roots);
    while (stack.length > 0) {
        const el = element(stack.pop());
        if (el.tag === tag) {
            out.push(el);
        }
        if (el.tag !== "#text") {
            pushAll(el.kids);
        }
    }
    return out;
}

/** A node's index in graph-io's graph: its id as written, or as the number graph-io may have read it as. */
function indexOf(s, id) {
    if (id === undefined) {
        return -1;
    }
    let i = s.ids.indexOf(id);
    if (!(i >= 0 && i < s.nodeCount) && id.trim() !== "" && Number.isFinite(Number(id))) {
        i = s.ids.indexOf(Number(id));
    }
    return i >= 0 && i < s.nodeCount ? i : -1;
}

// graph-io keeps 6 significant digits of a number (its canonical form): equal within 1e-5 relative
const eq = (a, b) => same(a, b, 1e-5);

const hex6 = (c) =>
    typeof c === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c) ? c.slice(0, 7).toLowerCase() : null;
const number = (v) => {
    const n = Number(v);
    return v !== undefined && v !== "" && Number.isFinite(n) ? n : null;
};

/**
 * A GEXF viz:color as Gephi reads it: r, g and b (and an optional a) attributes, each a number, clamped to its range;
 * or, without r, the GEXF 1.3 hex attribute (#rgb, #rrggbb or #rrggbbaa, the # optional). A color with an attribute
 * that is not a number is no color.
 */
function gexfColor(el) {
    if (el === undefined) {
        return null;
    }
    if (el.attrs.r === undefined && el.attrs.hex !== undefined) {
        const m = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(el.attrs.hex.trim());
        if (m === null) {
            return null;
        }
        const h = m[1].length <= 4 ? m[1].slice(0, 3).replaceAll(/./g, "$&$&") : m[1].slice(0, 6);
        return `#${h.toLowerCase()}`;
    }
    const rgb = ["r", "g", "b"].map((k) => number(el.attrs[k]));
    if (rgb.includes(null) || (el.attrs.a !== undefined && number(el.attrs.a) === null)) {
        return null;
    }
    return `#${rgb
        .map((v) =>
            Math.round(Math.max(0, Math.min(255, v)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/**
 * Compares one value, with the notes graph-io made about that element's property.
 * `ctx` is { tally, g }; `where` is { target, property, i, notedAs? } (notedAs: the property the notes name).
 */
function check(ctx, key, at, where, stated, expected, toolDefault) {
    const { target, property, i, notedAs = property } = where;
    ctx.tally.compare(
        key,
        { ...at, noted: ctx.g.notedAt(target, notedAs, i) },
        stated,
        ctx.g.drawn(target, property, i),
        expected,
        toolDefault,
        eq,
    );
}

function gexf(doc, g, tally, name) {
    const s = g.snapshot;
    const ctx = { tally, g };
    const fills = new Map();
    const nodes = all(doc, "node");
    const times = new Map();
    for (const el of nodes) {
        times.set(el.attrs.id, (times.get(el.attrs.id) ?? 0) + 1);
    }
    for (const el of nodes) {
        const i = indexOf(s, el.attrs.id);
        // a repeated id is one node, read here from its first element
        if (i < 0 || fills.has(el.attrs.id)) {
            continue;
        }
        tally.elements++;
        const at = { file: name, id: el.attrs.id, repeated: times.get(el.attrs.id) > 1 };
        // the last viz:color is the one Gephi keeps
        const colors = children(el, "color");
        const fill = gexfColor(colors[colors.length - 1]);
        fills.set(el.attrs.id, fill ?? "#000000");
        check(ctx, "gexf node fill", at, { target: "node", property: "fill", i }, fill, fill ?? "#000000", "#000000");
        const sizes = children(el, "size");
        const size = number(sizes[sizes.length - 1]?.attrs.value);
        for (const p of ["width", "height"]) {
            // one viz:size gives both, noted once, as the width
            check(
                ctx,
                `gexf node ${p}`,
                at,
                { target: "node", property: p, i, notedAs: "width" },
                size,
                size ?? 10,
                10,
            );
        }
    }
    const weightIds = new Set(
        all(doc, "attributes")
            .filter((a) => a.attrs.class === "edge")
            .flatMap((a) => children(a, "attribute"))
            .filter((a) => a.attrs.title === "weight")
            .map((a) => a.attrs.id),
    );
    const edges = all(doc, "edge").filter((el) => el.attrs.source !== undefined);
    if (edges.length !== s.edgeCount) {
        tally.skip(name, `graph-io holds ${s.edgeCount} edges, the file ${edges.length}: edges not compared`);
        return;
    }
    edges.forEach((el, e) => {
        tally.elements++;
        const at = { file: name, edge: e };
        const colors = children(el, "color");
        const color = gexfColor(colors[colors.length - 1]);
        const fromSource = fills.get(el.attrs.source) ?? "#000000";
        check(
            ctx,
            "gexf edge color",
            at,
            { target: "edge", property: "color", i: e },
            color,
            color ?? fromSource,
            fromSource,
        );
        const thickness = number(children(el, "thickness").at(-1)?.attrs.value);
        // Gephi draws an edge as thick as its weight: a static attvalue of the attribute titled "weight" over the
        // weight attribute, 1 when there is none. A weight of 0 or below is drawn 1 wide (style-tool-defaults.md).
        const static_ = children(el, "attvalues")
            .flatMap((a) => children(a, "attvalue"))
            .filter((a) => weightIds.has(a.attrs.for) && a.attrs.start === undefined && a.attrs.end === undefined);
        const w = number(static_.at(-1)?.attrs.value ?? el.attrs.weight);
        const weight = w !== null && w > 0 && Number.isFinite(w) ? w : 1;
        check(
            ctx,
            "gexf edge width",
            at,
            { target: "edge", property: "width", i: e },
            thickness,
            thickness ?? weight,
            weight,
        );
    });
}

/** A group node's active realizer, or its first. */
function activeRealizer(proxy) {
    const rs = child(proxy, "Realizers");
    const kids = rs === undefined ? [] : children(rs).filter((k) => k.tag !== "#text");
    const active = Number(rs?.attrs.active ?? 0);
    return kids[active] ?? kids[0] ?? null;
}

/** An element's yEd realizer: the graphics inside its data, the active one of a group's. */
function realizer(el, edge) {
    const suffix = edge ? "Edge" : "Node";
    for (const r of children(el, "data").flatMap((data) => children(data))) {
        if (r.tag === "ProxyAutoBoundsNode") {
            return activeRealizer(r);
        }
        if (r.tag !== "#text" && r.tag.endsWith(suffix)) {
            return r;
        }
    }
    return null;
}

/** The first visible label with text, trimmed, or null. */
function firstLabel(r, tag) {
    for (const l of children(r, tag)) {
        const t = textOf(l).trim();
        if (t !== "" && l.attrs.visible !== "false" && l.attrs.hasText !== "false") {
            return t;
        }
    }
    return null;
}

/** Compares one yEd node with the independent reading of its realizer. */
function yedNode(ctx, el, i, name) {
    const r = realizer(el, false);
    const at = { file: name, id: el.attrs.id };
    const fill = r === null ? undefined : child(r, "Fill");
    if (fill !== undefined && (fill.attrs.hasColor === "false" || fill.attrs.transparent === "true")) {
        check(ctx, "yed node fill", at, { target: "node", property: "fillOpacity", i }, 0, 0, null);
    } else {
        const color = fill === undefined ? null : hex6(fill.attrs.color);
        const where = { target: "node", property: "fill", i };
        check(ctx, "yed node fill", { ...at, raw: fill?.attrs.color }, where, color, color ?? "#ffcc00", "#ffcc00");
    }
    const label = r === null ? null : firstLabel(r, "NodeLabel");
    check(ctx, "yed node label", at, { target: "node", property: "label", i }, label, label, null);
    const geometry = r === null ? undefined : child(r, "Geometry");
    for (const p of ["width", "height"]) {
        const v = number(geometry?.attrs[p]);
        check(ctx, `yed node ${p}`, at, { target: "node", property: p, i }, v, v, null);
    }
}

function yed(doc, g, tally, name) {
    const s = g.snapshot;
    const ctx = { tally, g };
    const seen = new Set();
    for (const el of all(doc, "node")) {
        const i = indexOf(s, el.attrs.id);
        if (i < 0 || seen.has(i)) {
            continue;
        }
        seen.add(i);
        tally.elements++;
        yedNode(ctx, el, i, name);
    }
    const edges = all(doc, "edge");
    if (edges.length !== s.edgeCount) {
        tally.skip(name, `graph-io holds ${s.edgeCount} edges, the file ${edges.length}: edges not compared`);
        return;
    }
    edges.forEach((el, e) => {
        tally.elements++;
        const r = realizer(el, true);
        const at = { file: name, edge: el.attrs.id ?? e };
        const line = r === null ? undefined : child(r, "LineStyle");
        const color = hex6(line?.attrs.color);
        check(
            ctx,
            "yed edge color",
            at,
            { target: "edge", property: "color", i: e },
            color,
            color ?? "#000000",
            "#000000",
        );
        const label = r === null ? null : firstLabel(r, "EdgeLabel");
        check(ctx, "yed edge label", at, { target: "edge", property: "label", i: e }, label, label, null);
    });
}

const tally = new Tally("GEXF and yEd against an independent XML reading", EXPLAINED);
for (const file of files) {
    const { bytes, filename } = readInput(file);
    const format = /\.gexf$/i.test(filename) ? "gexf" : "graphml";
    const g = await importStyled(bytes, format, filename);
    if (g === null || !g.styled) {
        continue;
    }
    const tool = g.extracted.styles.source.tool;
    if ((format === "gexf" && tool !== "gephi") || (format === "graphml" && tool !== "yed")) {
        continue;
    }
    let doc;
    try {
        doc = parser.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        tally.skip(file, `fast-xml-parser does not parse it: ${String(e.message).slice(0, 80)}`);
        continue;
    }
    tally.files++;
    (format === "gexf" ? gexf : yed)(doc, g, tally, shown(file));
}
process.exit(tally.finish() ? 0 : 1);
