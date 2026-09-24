/**
 * The generative layer of the conformance suite: property-based round trips.
 *
 * For every target (a format graph-io exports, with the options that select a dialect or a
 * version) fast-check generates graphs -- 0..MAX_NODES nodes, directed or undirected, self-loops,
 * parallel edges, isolated nodes, explicit and implicit weights (integers, floats, 1e-300, 1e300,
 * -0, the infinities), node and edge attributes of every scalar dtype (i32, f64, string, bool) and
 * ids made of Unicode, quotes, spaces, delimiters, XML / DOT / GML / CSV special characters, the
 * empty string and very long strings. Each graph is exported, re-imported from BYTES through
 * importGraph() and compared with the original.
 *
 * The documented losses are the exporter's own check() notes: NOTE_RELAX maps each note code to
 * the one difference it announces (ids read back by the canonical text rule, a non-finite number
 * written as null, ...), and only the notes check() returned FOR THIS GRAPH relax the comparison.
 * Any other difference is a failure, and fast-check shrinks it to a minimal graph. An export may
 * throw only when check() returned an E_ note for the graph (a documented refusal: a text XML 1.0
 * forbids, a DOT text ending in a backslash, a Pajek label holding a quote...).
 *
 * Every bug found this way is committed as its minimal graph in fixtures/generative/cases.json:
 * a fixed bug as a regression case, an open one with a `knownFailure` marker (it runs as an
 * expected failure) and a KNOWN_FAILURES entry below that keeps such graphs out of the property,
 * so the property keeps covering everything else.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import fc from "fast-check";

import { importGraph, registry } from "../../src/registry.js";
import { type CommonExportOptions, type GraphExporter } from "../../src/types.js";

/** A scalar column dtype the generator writes. */
type GenDtype = "i32" | "f64" | "string" | "bool";

/** A cell value; undefined is an unset cell. */
type GenValue = number | string | boolean | undefined;

/** A generated column. */
interface GenColumn {
    readonly name: string;
    readonly dtype: GenDtype;
}

/** A generated edge: endpoint indices, the weight (undefined: implicit) and one value per edge column. */
interface GenEdge {
    readonly s: number;
    readonly t: number;
    readonly w: number | undefined;
    readonly values: readonly GenValue[];
}

/** A generated graph. */
interface GenGraph {
    readonly directed: boolean;
    readonly ids: readonly NodeId[];
    readonly nodeColumns: readonly GenColumn[];
    /** One row per node, one value per node column. */
    readonly nodeValues: readonly (readonly GenValue[])[];
    readonly edgeColumns: readonly GenColumn[];
    readonly edges: readonly GenEdge[];
}

// ============================================================ the generator

/** The largest node count generated. */
const MAX_NODES = 12;
/** The largest edge count generated. */
const MAX_EDGES = 20;

const ch = (...codes: number[]): string => String.fromCharCode(...codes);

/** Characters that break some format's quoting: every class the task list names. */
const TRICKY_UNITS: readonly string[] = [
    "a",
    "b",
    "Z",
    "0",
    "7",
    " ",
    '"',
    "'",
    ",",
    ";",
    "\t",
    "|",
    "<",
    ">",
    "&",
    "{",
    "}",
    "[",
    "]",
    "=",
    "-",
    "#",
    "%",
    "*",
    ":",
    "\\",
    "\n",
    "\r",
    ".",
    "_",
    ch(0xe9), // e acute
    ch(0x4e2d), // CJK
    ch(0xd83d, 0xde00), // an emoji: a surrogate pair
    ch(0xa0), // no-break space
];

/** Whole strings with a meaning in some format. */
const TRICKY_STRINGS: readonly string[] = [
    "",
    "12",
    "-3",
    "1.5",
    "-0",
    "1e5",
    "true",
    "false",
    "null",
    "NaN",
    "Infinity",
    "node",
    "edge",
    "graph",
    "id",
    "*Vertices",
    "&amp;",
    "<b>x</b>",
    "a->b",
    "x".repeat(2000),
    `a${ch(0x1)}b`, // a control character XML 1.0 forbids (rare: every XML export refuses it)
];

const trickyString = (): fc.Arbitrary<string> =>
    fc.oneof(
        { weight: 3, arbitrary: fc.string({ unit: fc.constantFrom(...TRICKY_UNITS), maxLength: 8 }) },
        { weight: 1, arbitrary: fc.constantFrom(...TRICKY_STRINGS) },
        { weight: 1, arbitrary: fc.string({ unit: "grapheme", maxLength: 6 }) },
    );

const idArb: fc.Arbitrary<NodeId> = fc.oneof(
    { weight: 1, arbitrary: fc.integer({ min: -1000, max: 1_000_000 }) },
    { weight: 2, arbitrary: trickyString() },
);

/** Finite and infinite doubles with the extremes the task names; never NaN (graph-format refuses a NaN weight). */
const weightArb: fc.Arbitrary<number> = fc.oneof(
    fc.integer({ min: -1000, max: 1000 }),
    fc.double({ noNaN: true }),
    fc.constantFrom(1e-300, 1e300, -0, 0, 0.1, 5e-324, Infinity, -Infinity, 2 ** 53 + 2),
);

const f64Arb: fc.Arbitrary<number> = fc.oneof(
    fc.double(),
    fc.constantFrom(1e-300, 1e300, -0, 0.5, NaN, Infinity, -Infinity, 3),
);

const valueArb = (dtype: GenDtype): fc.Arbitrary<GenValue> => {
    let arb: fc.Arbitrary<GenValue>;
    switch (dtype) {
        case "i32":
            arb = fc.integer({ min: -(2 ** 31), max: 2 ** 31 - 1 });
            break;
        case "f64":
            arb = f64Arb;
            break;
        case "bool":
            arb = fc.boolean();
            break;
        default:
            arb = trickyString();
    }
    return fc.option(arb, { nil: undefined, freq: 4 });
};

const NODE_COLUMNS: readonly GenColumn[] = [
    { name: "nInt", dtype: "i32" },
    { name: "nReal", dtype: "f64" },
    { name: "nText", dtype: "string" },
    { name: "nFlag", dtype: "bool" },
];

const EDGE_COLUMNS: readonly GenColumn[] = [
    { name: "eInt", dtype: "i32" },
    { name: "eReal", dtype: "f64" },
    { name: "eText", dtype: "string" },
    { name: "eFlag", dtype: "bool" },
];

const columnsArb = (all: readonly GenColumn[]): fc.Arbitrary<GenColumn[]> => fc.subarray([...all]);

/** The arbitrary of a whole graph. */
export const graphArb: fc.Arbitrary<GenGraph> = fc
    .record({
        directed: fc.boolean(),
        ids: fc.uniqueArray(idArb, { maxLength: MAX_NODES, selector: (id) => String(id) }),
        nodeColumns: columnsArb(NODE_COLUMNS),
        edgeColumns: columnsArb(EDGE_COLUMNS),
    })
    .chain(({ directed, ids, nodeColumns, edgeColumns }) => {
        const n = ids.length;
        const row = (cols: readonly GenColumn[]): fc.Arbitrary<GenValue[]> =>
            fc.tuple(...cols.map((c) => valueArb(c.dtype)));
        const edge: fc.Arbitrary<GenEdge> =
            n === 0
                ? fc.constant({ s: 0, t: 0, w: undefined, values: [] })
                : fc.record({
                      s: fc.nat(n - 1),
                      t: fc.nat(n - 1),
                      w: fc.option(weightArb, { nil: undefined, freq: 3 }),
                      values: row(edgeColumns),
                  });
        return fc.record({
            directed: fc.constant(directed),
            ids: fc.constant(ids),
            nodeColumns: fc.constant(nodeColumns),
            nodeValues: fc.array(row(nodeColumns), { minLength: n, maxLength: n }),
            edgeColumns: fc.constant(edgeColumns),
            edges: n === 0 ? fc.constant([]) : fc.array(edge, { maxLength: MAX_EDGES }),
        });
    });

// ============================================================ graph <-> snapshot

/**
 * Build the snapshot of a generated graph. Weights are staged as f64, so the freeze writes the
 * explicit ones to the `graphty.weight` shadow column at full precision, as every importer does.
 * @param g - the generated graph
 * @returns the frozen snapshot
 */
export function buildSnapshot(g: GenGraph): GraphSnapshot {
    const b = new GraphBuilder({ directed: g.directed, weightDtype: "f64" });
    b.addNodes(g.ids);
    for (const c of g.nodeColumns) {
        b.declareNodeColumn({ name: c.name, dtype: c.dtype });
    }
    g.nodeValues.forEach((row, i) => {
        row.forEach((v, c) => {
            if (v !== undefined) {
                b.setNodeValue(g.nodeColumns[c].name, i, v);
            }
        });
    });
    for (const c of g.edgeColumns) {
        b.declareEdgeColumn({ name: c.name, dtype: c.dtype });
    }
    for (const e of g.edges) {
        const index = b.addEdge(g.ids[e.s], g.ids[e.t], e.w);
        e.values.forEach((v, c) => {
            if (v !== undefined) {
                b.setEdgeValue(g.edgeColumns[c].name, index, v);
            }
        });
    }
    return b.freeze();
}

/** The comparable form of a graph: what a round trip must keep. */
interface Canon {
    directed: boolean;
    /** Node ids in order, each with its attributes (column name -> value; unset cells absent). */
    nodes: { id: NodeId; attrs: Record<string, GenValue> }[];
    /** Edges in order: endpoint ids, the explicit weight (absent: implicit), attributes. */
    edges: { s: NodeId; t: NodeId; w?: number; attrs: Record<string, GenValue> }[];
}

/**
 * The canonical form of a generated graph.
 * @param g - the generated graph
 * @returns the canonical form
 */
function canonOf(g: GenGraph): Canon {
    const attrs = (cols: readonly GenColumn[], row: readonly GenValue[]): Record<string, GenValue> => {
        const out: Record<string, GenValue> = {};
        row.forEach((v, c) => {
            if (v !== undefined) {
                out[cols[c].name] = v;
            }
        });
        return out;
    };
    return {
        directed: g.directed,
        nodes: g.ids.map((id, i) => ({ id, attrs: attrs(g.nodeColumns, g.nodeValues[i]) })),
        edges: g.edges.map((e) => ({
            s: g.ids[e.s],
            t: g.ids[e.t],
            ...(e.w === undefined ? {} : { w: e.w }),
            attrs: attrs(g.edgeColumns, e.values),
        })),
    };
}

/**
 * The canonical form of an imported snapshot, reading only the generator's column names.
 * @param s - the snapshot
 * @returns the canonical form
 */
function canonOfSnapshot(s: GraphSnapshot): Canon {
    const ids = s.ids.toArray();
    const cells = (
        table: GraphSnapshot["nodes"],
        names: readonly GenColumn[],
        row: number,
    ): Record<string, GenValue> => {
        const out: Record<string, GenValue> = {};
        for (const { name } of names) {
            const column = table.get(name);
            if (column?.isSet(row) === true) {
                out[name] = column.value(row) as GenValue;
            }
        }
        return out;
    };
    const { src, dst, weights } = s.edgeList();
    const shadow = s.edges.byRole("weight");
    return {
        directed: s.directed,
        nodes: ids.map((id, i) => ({ id, attrs: cells(s.nodes, NODE_COLUMNS, i) })),
        edges: Array.from(src, (u, e) => {
            let w: number | undefined;
            if (shadow !== null) {
                w = shadow.isSet(e) ? Number(shadow.value(e)) : undefined;
            } else if (weights !== null && s.flags.weighted) {
                w = weights[e];
            }
            return {
                s: ids[u],
                t: ids[dst[e]],
                ...(w === undefined ? {} : { w }),
                attrs: cells(s.edges, EDGE_COLUMNS, e),
            };
        }),
    };
}

// ============================================================ the targets and the documented losses

/**
 * A documented loss, as the comparison relaxation it allows:
 * - idText: ids follow the canonical text rule (integer text reads back as a number and back)
 * - idString: every id reads back as its text
 * - nodeOrder: the order of the nodes is not kept
 * - direction: the file carries no direction; the re-import has the reader's default
 * - nonFiniteUnset: a non-finite number is written as null and reads back unset
 * - nonFiniteText: a non-finite number reads back as text
 * - negativeZero: -0 reads back as 0
 * - textInferred: cells are untyped; text that looks like a number or a boolean reads back as one
 * - boolAsInt: a boolean is written as 1 / 0
 *
 * Every difference the property found in a correct export is announced by a check() note, so the
 * per-format "lossy" table IS this note table; a format-wide loss without a note would be a check()
 * defect.
 */
export type Relax =
    | "idText"
    | "idString"
    | "nodeOrder"
    | "direction"
    | "nonFiniteUnset"
    | "nonFiniteText"
    | "negativeZero"
    | "textInferred"
    | "boolAsInt";

/**
 * The documented losses, one per check() note code (the codes are one per concept across the
 * formats, src/common/codes.ts): a note announces the loss for this graph, the relaxation lets the
 * comparison accept exactly that difference. A note code outside this table relaxes nothing.
 */
export const NOTE_RELAX: Readonly<Record<string, readonly Relax[]>> = {
    W_ID_TEXT_TYPE: ["idText"],
    W_NUMERIC_IDS_STRINGIFIED: ["idString"],
    W_NODE_ORDER: ["nodeOrder"],
    W_CSV_NODE_ORDER: ["nodeOrder"],
    W_DIRECTION_DROPPED: ["direction"],
    W_CSV_DIRECTION_DROPPED: ["direction"],
    W_NEO4J_UNDIRECTED_AS_DIRECTED: ["direction"],
    W_NONFINITE_AS_NULL: ["nonFiniteUnset"],
    // a non-finite cell reads back as text, so its column reads back as a string column (5.1 grammar)
    W_DOT_NON_FINITE: ["nonFiniteText", "textInferred"],
    W_PAJEK_NONFINITE_AS_TEXT: ["nonFiniteText", "textInferred"],
    W_CSV_NONFINITE: ["nonFiniteText", "textInferred"],
    // a column of numeric text reads back as a number column; an i32 column cannot hold -0
    W_TEXT_INFERRED: ["textInferred", "negativeZero"],
    W_DTYPE_UNSUPPORTED: ["boolAsInt"],
    // an i32 column cannot hold -0
    W_INTEGRAL_F64_AS_I32: ["negativeZero"],
};

/** One exporter configuration under test. */
interface Target {
    /** The report name: the format, or format + dialect / version. */
    readonly name: string;
    readonly format: string;
    readonly exportOptions: Readonly<Record<string, unknown>>;
}

/** The exporter configurations. */
export const TARGETS: readonly Target[] = [
    { name: "gexf", format: "gexf", exportOptions: {} },
    { name: "gexf 1.2", format: "gexf", exportOptions: { version: "1.2" } },
    { name: "graphml", format: "graphml", exportOptions: { sanitizeIds: "mangle" } },
    { name: "gml", format: "gml", exportOptions: { sanitizeIds: "mangle" } },
    { name: "dot", format: "dot", exportOptions: {} },
    { name: "pajek", format: "pajek", exportOptions: { sanitizeIds: "mangle" } },
    { name: "csv", format: "csv", exportOptions: {} },
    { name: "neo4j", format: "neo4j", exportOptions: {} },
    { name: "json node-link", format: "json", exportOptions: { dialect: "node-link" } },
    { name: "json jgf", format: "json", exportOptions: { dialect: "jgf" } },
    { name: "json cytoscape", format: "json", exportOptions: { dialect: "cytoscape" } },
    { name: "json graphology", format: "json", exportOptions: { dialect: "graphology" } },
];

/**
 * The relaxations that apply to one graph: those its check() notes announce.
 * @param notes - the note codes check() returned
 * @returns the relaxations
 */
function relaxationsFor(notes: readonly string[]): Set<Relax> {
    const out = new Set<Relax>();
    for (const code of notes) {
        for (const r of NOTE_RELAX[code] ?? []) {
            out.add(r);
        }
    }
    return out;
}

// ============================================================ the comparison

const INTEGER_TEXT = /^-?(0|[1-9][0-9]*)$/;
const NUMBER_TEXT = /^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][-+]?[0-9]+)?$/;

/**
 * A value's comparable key under the relaxations (unset: "unset").
 * @param raw - the value
 * @param relax - the relaxations
 * @returns the key
 */
function valueKey(raw: GenValue, relax: ReadonlySet<Relax>): string {
    let v = raw;
    if (typeof v === "number" && !Number.isFinite(v)) {
        if (relax.has("nonFiniteUnset")) {
            v = undefined;
        } else if (relax.has("nonFiniteText")) {
            return `nonfinite:${String(v).toLowerCase()}`;
        }
    }
    if (typeof v === "string" && relax.has("nonFiniteText") && /^[-+]?(inf|infinity|nan)$/i.test(v)) {
        return `nonfinite:${v
            .toLowerCase()
            .replace(/^\+/, "")
            .replace(/^(-?)inf$/, "$1infinity")}`;
    }
    if (typeof v === "boolean" && relax.has("boolAsInt")) {
        v = v ? 1 : 0;
    }
    if (relax.has("textInferred")) {
        // the 5.1 grammar types a column by its widest cell: numeric text reads back as a number,
        // and a boolean in a numeric column as 1 / 0; compare by that value
        if (typeof v === "string" && NUMBER_TEXT.test(v)) {
            v = Number(v);
        } else if (v === "true" || v === "false") {
            v = v === "true";
        }
        if (typeof v === "boolean") {
            v = v ? 1 : 0;
        }
    }
    if (typeof v === "number" && Object.is(v, -0)) {
        return relax.has("negativeZero") ? "number:0" : "number:-0";
    }
    return v === undefined ? "unset" : `${typeof v}:${String(v)}`;
}

/**
 * An id's comparable key under the relaxations.
 * @param id - the id
 * @param relax - the relaxations
 * @returns the key
 */
function idKey(id: NodeId, relax: ReadonlySet<Relax>): string {
    if (relax.has("idString")) {
        return `string:${String(id)}`;
    }
    if (relax.has("idText") && typeof id === "string" && INTEGER_TEXT.test(id) && Number.isSafeInteger(Number(id))) {
        return `number:${id}`;
    }
    return `${typeof id}:${String(id)}`;
}

const attrsKey = (attrs: Record<string, GenValue>, relax: ReadonlySet<Relax>): string =>
    Object.keys(attrs)
        .map((k) => [k, valueKey(attrs[k], relax)])
        .filter(([, v]) => v !== "unset")
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([k, v]) => `${k}=${v}`)
        .join(",");

/**
 * The comparable lines of a canonical graph: one per node, one per edge.
 * @param c - the canonical form
 * @param directed - the direction to read the edges with
 * @param relax - the relaxations
 * @returns the node lines and the edge lines
 */
function lines(c: Canon, directed: boolean, relax: ReadonlySet<Relax>): { nodes: string[]; edges: string[] } {
    const nodes = c.nodes.map((n) => `${idKey(n.id, relax)} {${attrsKey(n.attrs, relax)}}`);
    const edges = c.edges.map((e) => {
        let [s, t] = [idKey(e.s, relax), idKey(e.t, relax)];
        if (!directed && t < s) {
            [s, t] = [t, s];
        }
        const weight = e.w === undefined ? "unset" : valueKey(e.w, relax);
        const w = weight === "unset" ? "implicit" : weight;
        return `${s} ${directed ? "->" : "--"} ${t} w=${w} {${attrsKey(e.attrs, relax)}}`;
    });
    if (relax.has("nodeOrder")) {
        nodes.sort();
    }
    return { nodes, edges };
}

/**
 * The differences between the original and the re-import under the relaxations (empty: equal).
 * @param original - the generated graph's canonical form
 * @param back - the re-import's canonical form
 * @param relax - the documented losses that apply
 * @returns the first few differences
 */
function diffCanon(original: Canon, back: Canon, relax: ReadonlySet<Relax>): string[] {
    const out: string[] = [];
    const directed = relax.has("direction") ? back.directed : original.directed;
    if (directed !== back.directed) {
        out.push(`directed: expected ${directed}, got ${back.directed}`);
    }
    const e = lines(original, directed, relax);
    const a = lines(back, directed, relax);
    for (const [what, el, al] of [
        ["node", e.nodes, a.nodes],
        ["edge", e.edges, a.edges],
    ] as const) {
        if (el.length !== al.length) {
            out.push(`${what}s: expected ${el.length}, got ${al.length}`);
        }
        for (let i = 0; i < Math.min(el.length, al.length) && out.length < 5; i++) {
            if (el[i] !== al[i]) {
                out.push(`${what}[${i}]: expected ${clip(el[i])}, got ${clip(al[i])}`);
            }
        }
    }
    return out;
}

const clip = (s: string): string => (s.length > 160 ? `${s.slice(0, 157)}...` : s);

// ============================================================ one round trip

/** The outcome of one generated graph through one target. */
type TripOutcome =
    | { readonly kind: "equal"; readonly relaxed: readonly Relax[] }
    | { readonly kind: "refused"; readonly code: string }
    | { readonly kind: "different"; readonly problems: readonly string[]; readonly text: string | null };

const codeOf = (err: unknown): string => {
    if (typeof err === "object" && err !== null && "code" in err && typeof err.code === "string") {
        return err.code;
    }
    return "";
};

const describeError = (err: unknown): string =>
    (err instanceof Error ? `${err.name} ${codeOf(err)}: ${err.message}` : String(err)).slice(0, 300);

/**
 * Export a generated graph with a target, re-import the bytes and compare.
 *
 * An export that throws is a documented refusal only when check() announced it with an E_* note;
 * any other throw, a re-import that fails, or a difference no relaxation explains is a failure.
 * @param target - the exporter configuration
 * @param g - the generated graph
 * @returns the outcome
 */
export async function roundTrip(target: Target, g: GenGraph): Promise<TripOutcome> {
    const snapshot = buildSnapshot(g);
    const exporter = exporterOf(target.format);
    const notes = exporter.check(snapshot, target.exportOptions).map((n) => n.code);
    if (target.format === "csv") {
        notes.push(...exporter.check(snapshot, { ...target.exportOptions, table: "nodes" }).map((n) => n.code));
    }
    const refusal = notes.find((code) => code.startsWith("E_"));
    let text: string;
    let importOptions: Record<string, unknown> = { format: target.format };
    try {
        text = await exporter.exportToString(snapshot, target.exportOptions);
        if (target.format === "csv") {
            // the edge table cannot carry isolated nodes or the node order: the node table goes with it
            const nodes = await exporter.exportToString(snapshot, { ...target.exportOptions, table: "nodes" });
            importOptions = { ...importOptions, nodes };
        }
    } catch (err) {
        if (refusal !== undefined) {
            return { kind: "refused", code: refusal };
        }
        return { kind: "different", problems: [`export threw without an E_ note: ${describeError(err)}`], text: null };
    }
    if (refusal !== undefined) {
        return { kind: "different", problems: [`check() announced ${refusal} but export() wrote the file`], text };
    }
    try {
        const { snapshot: back } = await importGraph(new TextEncoder().encode(text), importOptions);
        const relax = relaxationsFor(notes);
        const problems = diffCanon(canonOf(g), canonOfSnapshot(back), relax);
        if (problems.length > 0) {
            problems.push(`notes: ${notes.join(", ") || "none"}`);
            return { kind: "different", problems, text };
        }
        return { kind: "equal", relaxed: [...relax] };
    } catch (err) {
        return { kind: "different", problems: [`re-import threw: ${describeError(err)}`], text };
    }
}

// ============================================================ known failures

/** A bug the property found and graph-io has not fixed yet. */
interface KnownFailure {
    /** The target it affects. */
    readonly target: string;
    /** The cause: what goes wrong and on which side. */
    readonly cause: string;
    /** Whether a generated graph hits it; such graphs are skipped by the property (and counted). */
    readonly matches: (g: GenGraph) => boolean;
}

/** The open bugs; each has its minimal case in fixtures/generative/cases.json. */
export const KNOWN_FAILURES: readonly KnownFailure[] = [
    {
        target: "pajek",
        cause: "an infinite edge weight is written as `Infinity`, which the Pajek importer reads as a parameter name without a value (E_PAJEK_LINE) and drops the edge; check() announces nothing",
        matches: (g) => g.edges.some((e) => e.w !== undefined && !Number.isFinite(e.w)),
    },
    {
        target: "csv",
        cause: "a one-column node table (ids only) is written with a bare `|`, `;` or tab in an id, and the importer's delimiter sniff picks that character, splitting the rows (E_CSV_FIELD_COUNT)",
        matches: (g) => g.nodeColumns.length === 0 && g.ids.some((id) => typeof id === "string" && /[|;\t]/.test(id)),
    },
    {
        target: "gml",
        cause: 'a text cell equal to NetworkX\'s list markers ("[]", "()", "_networkx_list_start") is written as that string and read back as a list; check() announces nothing',
        matches: (g) => allTexts(g).some((t) => t === "[]" || t === "()" || t === "_networkx_list_start"),
    },
    {
        target: "neo4j",
        cause: "the importer sniffs the delimiter: a file whose first section has one column and whose quoted cells hold tabs is read tab-delimited, and the comma-delimited rows fail (text after a closing quote); neo4j-admin's delimiter is a comma unless told otherwise",
        matches: (g) => allTexts(g).some((t) => t.includes("\t")),
    },
];

/**
 * Every text of a generated graph: string ids and string cells.
 * @param g - the graph
 * @returns the texts
 */
function allTexts(g: GenGraph): string[] {
    const cells = [...g.nodeValues, ...g.edges.map((e) => e.values)].flat();
    return [...g.ids, ...cells].filter((v): v is string => typeof v === "string");
}

/**
 * The known failure a generated graph hits on a target, if any.
 * @param target - the target
 * @param g - the generated graph
 * @returns the known failure, or undefined
 */
export function knownFailureOf(target: Target, g: GenGraph): KnownFailure | undefined {
    return KNOWN_FAILURES.find((k) => k.target === target.name && k.matches(g));
}

// ============================================================ the committed minimal cases

/** One minimal case of fixtures/generative/cases.json. */
interface GenCase {
    readonly name: string;
    readonly targets: readonly string[];
    readonly exercises: string;
    readonly knownFailure?: string;
    readonly graph: GenGraph;
}

/**
 * The committed minimal cases, numbers JSON cannot spell decoded from `{"$num": text}`.
 * @returns the cases
 */
export function loadCases(): GenCase[] {
    const path = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "generative", "cases.json");
    const revive = (_key: string, value: unknown): unknown => {
        if (typeof value === "object" && value !== null && "$num" in value) {
            return Number((value as { $num: string }).$num);
        }
        return value;
    };
    return (JSON.parse(readFileSync(path, "utf-8"), revive) as { cases: GenCase[] }).cases;
}

/**
 * The target of a name.
 * @param name - the target name
 * @returns the target; throws for an unknown name
 */
export function targetNamed(name: string): Target {
    const target = TARGETS.find((t) => t.name === name);
    if (target === undefined) {
        throw new Error(`unknown generative target ${name}`);
    }
    return target;
}

/**
 * The registered exporter of a format, taking any format-specific options.
 * @param format - the format
 * @returns the exporter
 */
export function exporterOf(format: string): GraphExporter<Record<string, unknown> & CommonExportOptions> {
    return registry.exporter(format) as GraphExporter<Record<string, unknown> & CommonExportOptions>;
}
