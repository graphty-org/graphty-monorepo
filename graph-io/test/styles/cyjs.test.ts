import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { cyjsProperties, cyjsRendered } from "../../src/styles/cyjs/mappers.js";
import {
    CYJS_PROPERTY_DEFAULTS,
    type CyjsCheck,
    type CyjsQuery,
    cytoscapeJsStyles,
    cytoscapeStyleKey,
    evaluateCytoscapeJs,
    type ExtractedStyles,
    featuresOf,
    parseCyjsSelector,
    planStyles,
    readCytoscapeStyles,
    resolveStyles,
    STYLE_ISSUE,
    STYLE_PROPERTIES,
    StyleBudget,
    styleFingerprint,
    StyleNotes,
    type StyleProperty,
    type StyleTarget,
    type StyleValue,
    toCytoscapeStylesheet,
} from "../../src/styles/internal.js";

const CORPUS = resolve(import.meta.dirname, "../corpus/styles/cyjs");

/** One column of the golden file: `[value, run length]` pairs. */
type Runs = [string, number][];

interface Golden {
    readonly files: Record<
        string,
        {
            readonly nodes: number;
            readonly edges: number;
            readonly node: Record<string, Runs>;
            readonly edge: Record<string, Runs>;
        }
    >;
}

const GOLDEN = JSON.parse(gunzipSync(readFileSync(resolve(CORPUS, "golden.json.gz"))).toString("utf8")) as Golden;

/** A run-length encoded column, expanded. */
function expand(runs: Runs): string[] {
    return runs.flatMap(([v, k]) => new Array<string>(k).fill(v));
}

/**
 * What a value Cytoscape.js reports (`ele.style(name)`) is drawn as: the neutral value, or undefined where it cannot
 * be evaluated.
 */
function drawn(target: StyleTarget, name: string, str: string): StyleValue | null | undefined {
    const v = cyjsRendered(target, name, str, { notes: new StyleNotes(), target, property: name });
    if (v === null) {
        throw new Error(`Cytoscape.js reported ${name}: ${str}, which does not parse`);
    }
    return v;
}

const POSITION: Record<string, string> = {
    "top,left": "top-left",
    "top,center": "top",
    "top,right": "top-right",
    "center,left": "left",
    "center,center": "center",
    "center,right": "right",
    "bottom,left": "bottom-left",
    "bottom,center": "bottom",
    "bottom,right": "bottom-right",
};

/** Every element's expected value per neutral property, from Cytoscape.js's reported values. */
function expected(
    target: StyleTarget,
    cols: Record<string, Runs>,
    n: number,
): { values: Map<string, (StyleValue | null | undefined)[]>; errors: Set<number> } {
    const values = new Map<string, (StyleValue | null | undefined)[]>();
    const errors = new Set<number>();
    const raw = new Map<string, string[]>();
    for (const [name, runs] of Object.entries(cols)) {
        const col = expand(runs);
        expect(col.length).toBe(n);
        col.forEach((v, i) => {
            if (v === "!error") {
                errors.add(i);
            }
        });
        raw.set(name, col);
    }
    for (const [name, col] of raw) {
        const spec = cyjsProperties(target).get(name);
        if (spec === undefined || spec.property.startsWith("_")) {
            continue;
        }
        values.set(
            spec.property,
            col.map((v) => (v === "!error" ? null : drawn(target, name, v))),
        );
    }
    if (target === "node") {
        const va = raw.get("text-valign") ?? [];
        const ha = raw.get("text-halign") ?? [];
        values.set(
            "labelPosition",
            va.map((v, i) => POSITION[`${v.replace("-inside", "")},${ha[i].replace("-inside", "")}`] ?? null),
        );
    }
    const vis = raw.get("visibility") ?? [];
    const disp = raw.get("display") ?? [];
    values.set(
        "visible",
        vis.map((v, i) => v !== "hidden" && disp[i] !== "none"),
    );
    return { values, errors };
}

/** What an unstyled element is drawn with, per neutral property. */
function defaults(target: StyleTarget): Map<string, StyleValue | null | undefined> {
    const out = new Map<string, StyleValue | null | undefined>();
    for (const [name, spec] of cyjsProperties(target)) {
        const raw = CYJS_PROPERTY_DEFAULTS.get(name);
        if (raw !== undefined && !spec.property.startsWith("_")) {
            out.set(spec.property, drawn(target, name, raw));
        }
    }
    out.set("labelPosition", "top");
    out.set("visible", true);
    return out;
}

describe("the Cytoscape.js style engine against real Cytoscape.js", () => {
    for (const [file, g] of Object.entries(GOLDEN.files)) {
        it(`draws ${file} as Cytoscape.js 3.34 does`, () => {
            const doc = JSON.parse(readFileSync(resolve(CORPUS, file), "utf8")) as {
                elements: unknown;
                style: unknown;
            };
            const notes = new StyleNotes();
            const r = evaluateCytoscapeJs({ elements: doc.elements, style: doc.style, notes });
            const noted = notes.list();
            const diffs: string[] = [];
            for (const target of ["node", "edge"] as const) {
                const t = r[target];
                const n = target === "node" ? g.nodes : g.edges;
                expect(t.n).toBe(n);
                const { values, errors } = expected(target, g[target], n);
                const base = defaults(target);
                for (const [prop, want] of values) {
                    const got = t.values[prop];
                    for (let i = 0; i < n; i++) {
                        const truth = got?.[i] ?? null;
                        const isNoted = (): boolean =>
                            noted.some(
                                (x) =>
                                    x.code === "W_STYLE_BAD_VALUE" &&
                                    x.params.target === target &&
                                    x.params.property === prop &&
                                    Array.isArray(x.elements) &&
                                    x.elements.includes(i),
                            );
                        if (errors.has(i)) {
                            continue;
                        }
                        const w = want[i];
                        let ok: boolean;
                        if (w === undefined) {
                            ok = truth === null && isNoted();
                        } else if (truth === null) {
                            ok = w === base.get(prop) || (w === "" && prop.toLowerCase().includes("label"));
                        } else {
                            ok = truth === w;
                        }
                        if (!ok && diffs.length < 20) {
                            diffs.push(
                                `${target} ${String(i)} ${prop}: engine ${JSON.stringify(truth)}, Cytoscape.js ${JSON.stringify(w)}`,
                            );
                        }
                    }
                }
                // an element Cytoscape.js cannot style is noted
                for (const i of errors) {
                    expect(noted.some((x) => Array.isArray(x.elements) && x.elements.includes(i))).toBe(true);
                }
            }
            expect(diffs).toEqual([]);
        });
    }
});

/** A Cytoscape.js document as a snapshot, through graph-io's JSON importer. */
async function snapshotOf(doc: { elements: unknown }): Promise<GraphSnapshot> {
    const bytes = new TextEncoder().encode(JSON.stringify({ elements: doc.elements }));
    return (await importGraph(bytes, { format: "json", errorLimit: Infinity })).snapshot;
}

/** A Cytoscape.js document's styles, planned. */
function extract(
    doc: { elements: unknown; style: unknown },
    s: GraphSnapshot,
    budget = new StyleBudget(),
): ExtractedStyles {
    const st = cytoscapeJsStyles({ elements: doc.elements, style: doc.style, snapshot: s, budget });
    if (!("canonical" in st)) {
        throw new Error("expected the advanced path");
    }
    return planStyles(
        {
            format: "json",
            dialect: st.dialect,
            tool: st.tool,
            units: st.units,
            node: st.node,
            edge: st.edge,
            fingerprint: styleFingerprint(s),
        },
        { node: featuresOf(s, "node"), edge: featuresOf(s, "edge") },
        { budget },
    );
}

/** Every property's resolved values, per target. */
function resolved(ex: ExtractedStyles, s: GraphSnapshot): Record<string, readonly (StyleValue | null)[]> {
    const out: Record<string, readonly (StyleValue | null)[]> = {};
    for (const target of ["node", "edge"] as const) {
        for (const p of STYLE_PROPERTIES[target].keys()) {
            out[`${target}.${p}`] = resolveStyles(ex, target, p as StyleProperty, s);
        }
    }
    return out;
}

/** An element's data columns as a consumer writes them from the snapshot. */
function attributes(s: GraphSnapshot, target: StyleTarget, i: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of featuresOf(s, target)) {
        // a compound parent is written as the parent's id
        if (
            "data" in f.ref &&
            f.values[i] !== null &&
            s[target === "node" ? "nodes" : "edges"].get(f.ref.data)?.meta.role !== "parent"
        ) {
            out[f.ref.data] = f.values[i];
        }
    }
    return out;
}

/** The elements of a snapshot as Cytoscape.js JSON, with an emit's element data and bypasses. */
function coreElements(s: GraphSnapshot, em: ReturnType<typeof toCytoscapeStylesheet>, prefix = ""): unknown[] {
    const out: unknown[] = [];
    const parentOf = (i: number): Record<string, string> => {
        const name = ["graphty.parent", "parent"].find((n) => s.nodes.get(n)?.meta.role === "parent");
        const v: unknown = name === undefined ? null : s.nodes.value(name, i);
        return typeof v === "number" && v >= 0 && v < s.nodeCount ? { parent: prefix + String(s.ids.idOf(v)) } : {};
    };
    for (let i = 0; i < s.nodeCount; i++) {
        const bypass = em.bypass.node[i];
        out.push({
            group: "nodes",
            data: {
                ...attributes(s, "node", i),
                ...em.elementData.node[i],
                ...parentOf(i),
                id: prefix + String(s.ids.idOf(i)),
            },
            selected: s.nodes.names().includes("selected") && s.nodes.value("selected", i) === true,
            ...(bypass === null ? {} : { style: bypass }),
        });
    }
    for (let i = 0; i < s.edgeCount; i++) {
        const bypass = em.bypass.edge[i];
        out.push({
            group: "edges",
            data: {
                ...attributes(s, "edge", i),
                ...em.elementData.edge[i],
                id: `${prefix}e${String(i)}`,
                source: prefix + String(s.ids.idOf(s.edgeSource(i))),
                target: prefix + String(s.ids.idOf(s.edgeTarget(i))),
            },
            ...(bypass === null ? {} : { style: bypass }),
        });
    }
    return out;
}

/** The data fields a selector reads, walking its queries. */
function selectorFields(q: CyjsQuery, out: Set<string>): void {
    for (const c of q.checks) {
        const check = c as CyjsCheck & Record<string, unknown>;
        if (typeof check.field === "string" && c.type !== "meta") {
            out.add(check.field);
        }
        for (const v of Object.values(check)) {
            if (v !== null && typeof v === "object" && "checks" in v) {
                selectorFields(v as CyjsQuery, out);
            }
        }
    }
}

const SMALL = {
    elements: [
        { data: { id: "a", kind: "x", w: 1 }, classes: "big" },
        { data: { id: "b", kind: "y", w: 5 } },
        { data: { id: "c", kind: "x", w: 9 }, classes: "big" },
        { data: { id: "d", kind: "z", w: 3 } },
        { data: { id: "ab", source: "a", target: "b", w: 2 } },
        { data: { id: "cd", source: "c", target: "d", w: 8 } },
    ],
    style: [
        { selector: "node", style: { width: 20, "background-color": "#336699", label: "data(kind)" } },
        { selector: ".big", style: { width: 50 } },
        { selector: "node[kind = 'x']", style: { shape: "diamond" } },
        { selector: "node[kind = 'y']", style: { shape: "star" } },
        { selector: "node[kind = 'z']", style: { shape: "triangle" } },
        { selector: "node[[degree = 0]]", style: { opacity: 0.5 } },
        {
            selector: "edge",
            style: { width: "mapData(w, 0, 10, 1, 6)", "line-color": "mapData(w, 0, 10, #000000, #ff0000)" },
        },
    ],
};

describe("the cascade", () => {
    it("draws .big nodes at 50 when `node { width: 20 }` precedes `.big { width: 50 }`, through the rules too", async () => {
        const doc = {
            elements: SMALL.elements,
            style: [
                { selector: "node", style: { width: 20 } },
                { selector: ".big", style: { width: 50 } },
            ],
        };
        const r = evaluateCytoscapeJs(doc);
        expect(r.node.values.width).toEqual([50, 20, 50, 20]);
        const s = await snapshotOf(doc);
        const ex = extract(doc, s);
        const big = new Set(["a", "c"]);
        const width = resolveStyles(ex, "node", "width", s);
        for (let i = 0; i < s.nodeCount; i++) {
            expect(width[i]).toBe(big.has(String(s.ids.idOf(i))) ? 50 : 20);
        }
    });

    it("reads a stylesheet given as text as it reads the same sheet given as an array", () => {
        const text = `node { width: 20; background-color: #336699 }
            .big { width: 50 }
            node[kind = 'x'] { shape: diamond }`;
        const array = SMALL.style.slice(0, 3).map((e) => ({ selector: e.selector, style: { ...e.style } }));
        delete (array[0].style as Record<string, unknown>).label;
        const a = evaluateCytoscapeJs({ elements: SMALL.elements, style: text });
        const b = evaluateCytoscapeJs({ elements: SMALL.elements, style: array });
        expect(a.node.values).toEqual(b.node.values);
        expect(a.node.values.width).toEqual([50, 20, 50, 20]);
    });

    it("evaluates metadata selectors over the degree, as a predicate on the computed degree", async () => {
        const doc = {
            elements: [...SMALL.elements, { data: { id: "lonely" } }],
            style: [{ selector: "node[[degree = 0]]", style: { opacity: 0.25 } }],
        };
        const r = evaluateCytoscapeJs(doc);
        expect(r.node.values.opacity).toEqual([null, null, null, null, 0.25]);
        const s = await snapshotOf(doc);
        const st = cytoscapeJsStyles({ ...doc, snapshot: s });
        const rules = "canonical" in st ? (st.node?.rules ?? []) : [];
        expect(rules.map((x) => x.where)).toContainEqual({ eq: [{ computed: "degree" }, 0] });
    });

    it("keeps an order test on the degree as a predicate on the computed degree, so it follows later edits", async () => {
        const doc = {
            elements: [...SMALL.elements, { data: { id: "e" } }, { data: { id: "ae", source: "a", target: "e" } }],
            style: [
                { selector: "node[[degree > 1]]", style: { opacity: 0.25 } },
                { selector: "node[[degree < 2]]", style: { opacity: 0.5 } },
            ],
        };
        const s = await snapshotOf(doc);
        const st = cytoscapeJsStyles({ ...doc, snapshot: s });
        const rules = "canonical" in st ? (st.node?.rules ?? []) : [];
        const wheres = rules.filter((x) => x.origin === "declared").map((x) => x.where);
        expect(wheres).toContainEqual({ not: { in: [{ computed: "degree" }, [0, 1]] } });
        expect(wheres).toContainEqual({ in: [{ computed: "degree" }, [0, 1]] });
        const ex = extract(doc, s);
        const opacity = resolveStyles(ex, "node", "opacity", s);
        const a = s.ids.indexOf("a");
        expect(opacity[a]).toBe(0.25);
        expect(evaluateCytoscapeJs(doc).node.values.opacity?.[a]).toBe(0.25);
    });

    it("tests classes through membership style columns, never a long selector", async () => {
        const doc = { elements: SMALL.elements, style: [{ selector: ".big", style: { shape: "star" } }] };
        const s = await snapshotOf(doc);
        const st = cytoscapeJsStyles({ ...doc, snapshot: s });
        const node = "canonical" in st ? st.node : undefined;
        const rule = node?.rules?.find((x) => x.origin === "declared");
        expect(rule?.where).toEqual({ has: { style: "member.1" } });
        const col = node?.columns?.get("member.1") ?? [];
        expect(Array.from({ length: s.nodeCount }, (_, i) => col[i] === true)).toEqual(
            Array.from({ length: s.nodeCount }, (_, i) => ["a", "c"].includes(String(s.ids.idOf(i)))),
        );
    });
});

describe("linear work", () => {
    it("matches a selector of 100,000 class tests in one counted pass", () => {
        const n = 2000;
        const elements = Array.from({ length: n }, (_, i) => ({
            data: { id: `n${String(i)}` },
            classes: `k${String(i % 500)}`,
        }));
        const alternatives = Array.from({ length: 100_000 }, (_, k) => `.k${String(k)}`).join(", ");
        const conjunction = Array.from({ length: 100_000 }, (_, k) => `.k${String(k)}`).join("");
        const budget = new StyleBudget();
        const r = evaluateCytoscapeJs({
            elements,
            style: [
                { selector: alternatives, style: { width: 7 } },
                { selector: conjunction, style: { width: 9 } },
            ],
            budget,
            toolDefaults: false,
        });
        expect(r.node.values.width?.every((w) => w === 7)).toBe(true);
        // linear: a small constant times the elements plus the tests, never their product
        expect(budget.used("node")).toBeLessThan(20 * (n + 200_000));
    });

    it("applies 20,000 per-value rules in one counted pass and keeps them as one mapping", async () => {
        const n = 20_000;
        const hex = (i: number): string => `#${((i * 2654435761) % 0xffffff).toString(16).padStart(6, "0")}`;
        const doc = {
            elements: Array.from({ length: n }, (_, i) => ({ data: { id: `n${String(i)}`, v: i } })),
            style: Array.from({ length: n }, (_, i) => ({
                selector: `node[v = ${String(i)}]`,
                style: { "background-color": hex(i) },
            })),
        };
        const budget = new StyleBudget();
        const r = evaluateCytoscapeJs({ ...doc, budget, toolDefaults: false });
        expect(r.node.values.fill?.[123]).toBe(hex(123));
        expect(budget.used("node")).toBeLessThan(20 * 2 * n);
        const s = await snapshotOf(doc);
        const st = cytoscapeJsStyles({ ...doc, snapshot: s, toolDefaults: false });
        const rules = "canonical" in st ? (st.node?.rules ?? []) : [];
        expect(rules).toHaveLength(1);
        expect(rules[0].map?.fill).toMatchObject({ kind: "discrete", by: { data: "v" } });
    });
});

describe("compound selectors and deep hierarchies", () => {
    /** A chain of n nodes, each the parent of the next, listed parent first. */
    const chain = (n: number): { data: { id: string; parent?: string } }[] =>
        Array.from({ length: n }, (_, i) => ({
            data: i === 0 ? { id: "c0" } : { id: `c${String(i)}`, parent: `c${String(i - 1)}` },
        }));

    it("matches a selector nested 20 deep over a 60-node chain in polynomial work", () => {
        const budget = new StyleBudget();
        const r = evaluateCytoscapeJs({
            elements: chain(60),
            style: [{ selector: `.x ${"node ".repeat(20)}`, style: { width: 7 } }],
            budget,
            toolDefaults: false,
        });
        // no node has class x, so nothing matches; the work stays far below the budget
        expect((r.node.values.width ?? []).some((w) => w === 7)).toBe(false);
        expect(budget.used("node")).toBeLessThan(5_000_000);
    });

    it("stops a match partway when the budget runs out and says so", () => {
        const budget = new StyleBudget(1000);
        const notes = new StyleNotes();
        evaluateCytoscapeJs({
            elements: chain(400),
            style: [{ selector: `.x ${"node ".repeat(10)}`, style: { width: 7 } }],
            budget,
            notes,
            toolDefaults: false,
        });
        expect(notes.list().some((n) => n.code === STYLE_ISSUE.BUDGET)).toBe(true);
        // the match is checked every few thousand units of work, not only after it returns
        expect(budget.used("node")).toBeLessThan(1000 + 5000);
    });

    it("builds a deep parent chain in near-linear work and still breaks a parent cycle", () => {
        const r = evaluateCytoscapeJs({ elements: chain(80_000), style: [{ selector: "node", style: { width: 3 } }] });
        expect(r.graph.parent[79_999]).toBe(79_998);
        const cyc = evaluateCytoscapeJs({
            elements: [
                { data: { id: "a", parent: "c" } },
                { data: { id: "b", parent: "a" } },
                { data: { id: "c", parent: "b" } },
            ],
            style: [],
        });
        expect(Array.from(cyc.graph.parent)).toEqual([2, 0, -1]);
    });
});

/** The Cytoscape.js fixtures the emit tests run over. */
const EMIT_FILES = [
    "adv/cyjs-selector-zoo.cyjs",
    "adv/cyjs-500-classes.cyjs",
    "adv6/three-rules.cyjs",
    "rules/cyjs-semantics.cyjs",
    "rules/cyjs-text.cyjs",
];

describe("the stylesheet emitter", () => {
    for (const file of EMIT_FILES) {
        it(`writes ${file} so that reading the stylesheet back gives the same styles`, async () => {
            const doc = JSON.parse(readFileSync(resolve(CORPUS, file), "utf8")) as {
                elements: unknown;
                style: unknown;
            };
            const s = await snapshotOf(doc);
            const ex = extract(doc, s);
            const em = toCytoscapeStylesheet(ex, { importId: "one" });
            // every selector parses, and reads only keys the element data or the element JSON holds
            const elements = coreElements(s, em);
            for (const rule of em.stylesheet) {
                const sel = parseCyjsSelector(rule.selector);
                expect(sel.invalid).toBe(false);
                const fields = new Set<string>();
                for (const q of sel.queries) {
                    selectorFields(q, fields);
                }
                for (const v of Object.values(rule.style)) {
                    const m = /^(?:data|mapData)\(([\w.]+)/.exec(String(v));
                    if (m !== null) {
                        fields.add(m[1]);
                    }
                }
                for (const f of fields) {
                    const target = rule.selector.startsWith("node") ? "node" : "edge";
                    const held = elements.some((el) => {
                        const e = el as { group: string; data: Record<string, unknown> };
                        return e.group === `${target}s` && Object.hasOwn(e.data, f);
                    });
                    expect(held, `${rule.selector} reads ${f}`).toBe(true);
                }
            }
            const back = readCytoscapeStyles({ elements, style: em.stylesheet, snapshot: s });
            // every value the styles give comes back; where they give none, what Cytoscape.js draws is its own
            const got = resolved(back, s);
            const want = resolved(ex, s);
            for (const [k, col] of Object.entries(want)) {
                expect(
                    col.map((v, i) => v ?? got[k][i] ?? null),
                    k,
                ).toEqual(got[k]);
            }
        });
    }

    it("gives the same rules back for a plain stylesheet", async () => {
        const doc = {
            elements: SMALL.elements,
            style: [
                { selector: "node", style: { "background-color": "#336699" } },
                { selector: "node[kind = 'x']", style: { shape: "diamond" } },
                { selector: "node[kind = 'y']", style: { shape: "star" } },
                { selector: "node[kind = 'z']", style: { shape: "triangle" } },
                { selector: "edge", style: { width: "mapData(w, 0, 10, 1, 6)" } },
            ],
        };
        const s = await snapshotOf(doc);
        const ex = extract(doc, s);
        const em = toCytoscapeStylesheet(ex);
        const back = readCytoscapeStyles({ elements: coreElements(s, em), style: em.stylesheet, snapshot: s });
        const shape = (x: ExtractedStyles): unknown[] =>
            x.styles.rules
                .filter((r) => r.origin !== "tool")
                .map((r) => [
                    r.target,
                    r.role,
                    Object.keys(r.set ?? {}),
                    Object.values(r.map ?? {}).map((m) => m?.kind),
                ]);
        expect(shape(back)).toEqual(shape(ex));
        expect(resolved(back, s)).toEqual(resolved(ex, s));
    });

    it("scopes two imports so that each stylesheet styles only its own elements", async () => {
        const a = {
            elements: SMALL.elements,
            style: [{ selector: "node", style: { "background-color": "#ff0000", width: 11 } }],
        };
        const b = { elements: SMALL.elements, style: [{ selector: "node", style: { "background-color": "#00ff00" } }] };
        const sa = await snapshotOf(a);
        const sb = await snapshotOf(b);
        const ea = toCytoscapeStylesheet(extract(a, sa), { importId: "a" });
        const eb = toCytoscapeStylesheet(extract(b, sb), { importId: "b" });
        for (const rule of [...ea.stylesheet, ...eb.stylesheet]) {
            const id = ea.stylesheet.includes(rule) ? "a" : "b";
            for (const q of parseCyjsSelector(rule.selector).queries) {
                expect(q.checks).toContainEqual({
                    type: "compare",
                    field: "graphty_import",
                    op: "=",
                    not: false,
                    ci: false,
                    value: id,
                });
            }
        }
        // one core holding both imports, with both stylesheets: each element keeps its own import's styles
        const core = [...coreElements(sa, ea, "a-"), ...coreElements(sb, eb, "b-")];
        const r = evaluateCytoscapeJs({ elements: core, style: [...ea.stylesheet, ...eb.stylesheet] });
        const fill = r.node.values.fill ?? [];
        const width = r.node.values.width ?? [];
        r.node.elements.forEach((el, i) => {
            const mine = el?.id.startsWith("a-") === true;
            expect(fill[i]).toBe(mine ? "#ff0000" : "#00ff00");
            expect(width[i]).toBe(mine ? 11 : null);
        });
        expect(ea.elementData.node.every((d) => d?.graphty_import === "a")).toBe(true);
    });

    it("names style columns with one flat key", () => {
        expect(cytoscapeStyleKey("member.3")).toBe("graphty_style_member_3");
        expect(cytoscapeStyleKey("exceptions.fill")).toBe("graphty_style_exceptions_fill");
    });
});

describe("the live-core reader", () => {
    it("takes the values a core reports over the stylesheet's where they disagree", async () => {
        const doc = {
            elements: SMALL.elements.slice(0, 4),
            style: [{ selector: "node", style: { "background-color": "red" } }],
        };
        const s = await snapshotOf(doc);
        const rendered = doc.elements.map((_e, i) => ({
            "background-color": i === 1 ? "rgb(0,0,255)" : "rgb(255,0,0)",
        }));
        const ex = readCytoscapeStyles({ elements: doc.elements, style: doc.style, rendered, snapshot: s });
        const fill = resolveStyles(ex, "node", "fill", s);
        for (let i = 0; i < s.nodeCount; i++) {
            expect(fill[i]).toBe(String(s.ids.idOf(i)) === "b" ? "#0000ff" : "#ff0000");
        }
    });

    it("writes a function-valued property from the reported values and says it was flattened", async () => {
        const doc = {
            elements: SMALL.elements.slice(0, 4),
            style: [{ selector: "node", style: { width: "fn", shape: "star" } }],
        };
        const s = await snapshotOf(doc);
        const rendered = doc.elements.map((_e, i) => ({ width: `${String(10 + i)}px`, shape: "star" }));
        const notes = new StyleNotes();
        const ex = readCytoscapeStyles({ elements: doc.elements, style: doc.style, rendered, snapshot: s, notes });
        const width = resolveStyles(ex, "node", "width", s);
        const byId = new Map(doc.elements.map((e, i) => [e.data.id, 10 + i]));
        for (let i = 0; i < s.nodeCount; i++) {
            expect(width[i]).toBe(byId.get(String(s.ids.idOf(i))));
        }
        expect(
            ex.styles.notes.some((n) => n.code === "W_STYLE_LAYER_FLATTENED" && n.params.samples.includes("FUNCTION")),
        ).toBe(true);
        expect(ex.styles.rules.some((r) => r.facts?.reason === "FUNCTION")).toBe(true);
    });
});
