import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    MAX_STYLE_RULES,
    planStyles,
    type Predicate,
    resolveStyles,
    STYLE_WORK_BUDGET,
    StyleBudget,
    type StyleFeature,
    styleFingerprint,
    type StyleProperty,
    type StyleTarget,
    type StyleValue,
    type StyleValues,
    toolDefaults,
} from "../../src/styles/internal.js";
import { isShortPredicate } from "../../src/styles/plan/resolve.js";

/** A seeded generator, so every run tests the same inputs. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0");
const color = (r: number, g: number, b: number): string => `#${hex(r)}${hex(g)}${hex(b)}`;
const fp = (nodes: number, edges = 0): StyleValues["fingerprint"] => ({ nodes, edges, ids: "test" });
const data = (name: string, values: readonly (string | number | boolean | null)[]): StyleFeature => ({
    ref: { data: name },
    values,
});

/** The number of terms of a predicate, or Infinity when it is not short. */
function terms(p: Predicate): number {
    if (!isShortPredicate(p)) {
        return Infinity;
    }
    if ("and" in p) {
        return p.and.reduce((s, q) => s + terms(q), 0);
    }
    return "in" in p ? p.in[1].length : 1;
}

/**
 * Checks the guarantees of a plan: every property resolves to the file's value (or the tool's default where the
 * file has none), within the tool's rounding only where a note names the element; no inferred rule paints an
 * element the file left unstyled; at most 16 rules per target; every predicate short.
 */
function checkPlan(
    ex: ExtractedStyles,
    truth: Partial<Record<StyleTarget, Record<string, readonly (StyleValue | null)[]>>>,
    snapshot?: GraphSnapshot,
): void {
    for (const target of ["node", "edge"] as const) {
        const rules = ex.styles.rules.filter((r) => r.target === target);
        expect(rules.length).toBeLessThanOrEqual(MAX_STYLE_RULES);
        for (const r of rules) {
            expect(terms(r.where), r.id).toBeLessThanOrEqual(8);
        }
        const tool = ex.styles.source.tool === null ? null : toolDefaults(ex.styles.source.tool);
        for (const [p, t] of Object.entries(truth[target] ?? {})) {
            const got = resolveStyles(ex, target, p as StyleProperty, snapshot);
            const rounded = ex.styles.notes.find(
                (n) => n.code === "W_STYLE_RAMP_ROUNDED" && n.params.target === target && n.params.property === p,
            );
            const covered = new Set(Array.isArray(rounded?.elements) ? rounded.elements : []);
            const fallback =
                (tool?.[target] as Record<string, { value: StyleValue } | undefined> | undefined)?.[p]?.value ?? null;
            for (let i = 0; i < t.length; i++) {
                const want = t[i] ?? fallback;
                if (got[i] === want) {
                    continue;
                }
                expect(
                    covered.has(i),
                    `${target} ${p} element ${String(i)}: ${String(got[i])} != ${String(want)}`,
                ).toBe(true);
            }
            // no inferred rule writes a value where the file has none
            for (const r of rules.filter((x) => x.origin === "inferred")) {
                const only = resolveStyles(
                    { ...ex, styles: { ...ex.styles, rules: [r] } },
                    target,
                    p as StyleProperty,
                    snapshot,
                );
                for (let i = 0; i < t.length; i++) {
                    if (t[i] === null) {
                        expect(only[i], `${r.id} paints ${target} ${String(i)}`).toBeNull();
                    }
                }
            }
        }
    }
}

describe("planStyles over random per-element values", () => {
    it("resolves exactly, never paints the unstyled, stays within 16 rules and short predicates", () => {
        const next = rng(20261011);
        const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
        for (let run = 0; run < 120; run++) {
            const n = Math.floor(next() * 400);
            const k = 2 + Math.floor(next() * 12);
            const cat = Array.from({ length: n }, () => (next() < 0.1 ? null : `c${String(Math.floor(next() * k))}`));
            const num = Array.from({ length: n }, () => Math.round(next() * 1000) / 10);
            const flag = Array.from({ length: n }, () => next() < 0.5);
            const features = { node: [data("cat", cat), data("num", num), data("flag", flag)], edge: [] };
            const palette = Array.from({ length: k }, () => color(next() * 255, next() * 255, next() * 255));
            const props: Record<string, (StyleValue | null)[]> = {};
            const gens: (() => (StyleValue | null)[])[] = [
                // by category, with hand edits and unstyled elements
                () =>
                    cat.map((c) => {
                        if (next() < 0.05) {
                            return null;
                        }
                        if (next() < 0.05) {
                            return pick(palette);
                        }
                        return c === null ? "#000000" : palette[Number(c.slice(1))];
                    }),
                // linear in a number
                () => num.map((x) => Math.round((2 + x * 0.5) * 1000) / 1000),
                // a color ramp
                () => num.map((x) => color(x * 2.55, 0, 255 - x * 2.55)),
                // noise
                () => Array.from({ length: n }, () => (next() < 0.2 ? null : Math.round(next() * 50))),
                // a few joint classes
                () => flag.map((f) => (f ? "#ff0000" : "#00ff00")),
                // constant
                () => Array.from({ length: n }, () => "#123456"),
            ];
            for (const p of ["fill", "width", "borderColor", "labelSize", "borderWidth"]) {
                const gen = pick(gens)();
                const isColor = typeof gen.find((v) => v !== null) === "string";
                if ((p === "fill" || p === "borderColor") === isColor) {
                    props[p] = gen;
                }
            }
            props.label = Array.from({ length: n }, (_, i) => (next() < 0.3 ? null : `n${String(i)}`));
            const tool = next() < 0.5 ? "cytoscape" : null;
            const ex = planStyles({ format: "test", tool, fingerprint: fp(n), node: { values: props } }, features);
            checkPlan(ex, { node: props });
        }
    });

    it("is deterministic and JSON-stable", () => {
        const next = rng(7);
        const n = 500;
        const cat = Array.from({ length: n }, () => `t${String(Math.floor(next() * 6))}`);
        const fill = cat.map((c) => color(Number(c.slice(1)) * 40, 10, 10));
        const width = Array.from({ length: n }, () => Math.floor(next() * 100));
        const plan = (): ExtractedStyles =>
            planStyles(
                { format: "test", tool: "gephi", fingerprint: fp(n), node: { values: { fill, width } } },
                { node: [data("type", cat)], edge: [] },
            );
        const a = JSON.stringify(plan().styles);
        expect(JSON.stringify(plan().styles)).toBe(a);
        expect(JSON.stringify(JSON.parse(a))).toBe(a);
    });
});

/** A seeded random graph. */
function randomGraph(n: number, m: number, seed: number): GraphSnapshot {
    const next = rng(seed);
    const b = new GraphBuilder({ directed: false });
    for (let i = 0; i < n; i++) {
        b.addNode(`n${String(i)}`);
    }
    for (let e = 0; e < m; e++) {
        b.addEdgeByIndex(Math.floor(next() * n), Math.floor(next() * n));
    }
    return b.freeze();
}

describe("degree", () => {
    it("plans a size table over degree as a mapping over { computed: degree }, live from the snapshot", () => {
        const snapshot = randomGraph(300, 600, 3);
        const deg = Array.from(snapshot.degree());
        // a table, not a ramp: sizes jump around between degrees
        const size = new Map<number, number>();
        const next = rng(11);
        const width = deg.map((d) => {
            if (!size.has(d)) {
                size.set(d, 5 + Math.floor(next() * 40));
            }
            return size.get(d) ?? 0;
        });
        const features = { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") };
        expect(features.node.some((f) => "computed" in f.ref && f.ref.computed === "degree")).toBe(true);
        const ex = planStyles(
            { format: "test", fingerprint: styleFingerprint(snapshot), node: { values: { width } } },
            features,
        );
        const rule = ex.styles.rules.find((r) => r.map?.width !== undefined);
        expect(rule?.map?.width?.by).toEqual({ computed: "degree" });
        expect(rule?.map?.width?.kind).toBe("discrete");
        expect(Array.from(ex.columns.node.keys()).some((k) => k.includes("degree"))).toBe(false);
        checkPlan(ex, { node: { width } }, snapshot);
    });

    it("offers no degree where an undirected edge is stored as a directed pair (a mixed Pajek file)", async () => {
        // vertex 1 is only ever a source: a reader that folds the *Edges pair counts its in-degree 0, the pair 1
        const text = "*Vertices 4\n1 a\n2 b\n3 c\n4 d\n*Arcs\n3 4\n*Edges\n1 2\n";
        const { snapshot } = await importGraph(new TextEncoder().encode(text), { format: "pajek" });
        expect(snapshot.directed).toBe(true);
        expect(featuresOf(snapshot, "node").some((f) => "computed" in f.ref)).toBe(false);
        const arcs = await importGraph(new TextEncoder().encode("*Vertices 2\n1 a\n2 b\n*Arcs\n1 2\n"), {
            format: "pajek",
        });
        expect(
            featuresOf(arcs.snapshot, "node").some((f) => "computed" in f.ref && f.ref.computed === "indegree"),
        ).toBe(true);
    });

    it("fingerprints the ids whatever their order, and tells other ids apart", () => {
        const a = randomGraph(10, 5, 1);
        const reversed = new GraphBuilder({ directed: false });
        const other = new GraphBuilder({ directed: false });
        for (let i = 9; i >= 0; i--) {
            reversed.addNode(`n${String(i)}`);
            other.addNode(`m${String(i)}`);
        }
        const fa = styleFingerprint(a);
        expect(fa).toEqual(styleFingerprint(randomGraph(10, 5, 1)));
        expect(fa.nodes).toBe(10);
        expect(fa.edges).toBe(5);
        expect(styleFingerprint(reversed.freeze()).ids).toBe(fa.ids);
        expect(styleFingerprint(other.freeze()).ids).not.toBe(fa.ids);
    });
});

describe("bounds", () => {
    /** Fill by a category, size linear in a weight, a label per node. */
    function grown(n: number): { ex: ExtractedStyles; truth: Record<string, (StyleValue | null)[]> } {
        const next = rng(n);
        const kind = Array.from({ length: n }, (_, i) => `k${String(i % 5)}`);
        const weight = Array.from({ length: n }, () => Math.floor(next() * 20));
        const name = Array.from({ length: n }, (_, i) => `node ${String(i)}`);
        const truth = {
            fill: kind.map((k) => color(Number(k.slice(1)) * 50, 100, 200)),
            width: weight.map((w) => 10 + w * 2),
            label: name,
        };
        const ex = planStyles(
            { format: "test", tool: "cytoscape", fingerprint: fp(n), node: { values: truth } },
            { node: [data("kind", kind), data("weight", weight), data("name", name)], edge: [] },
        );
        return { ex, truth };
    }

    it("keeps the layer count of a graph grown from 50 to 6,000 nodes", () => {
        const counts = [50, 400, 2000, 6000].map((n) => {
            const { ex, truth } = grown(n);
            checkPlan(ex, { node: truth });
            return ex.styles.rules.map((r) => `${r.id}:${r.role}`);
        });
        for (const c of counts) {
            expect(c).toEqual(counts[0]);
        }
        expect(counts[0]).toContain("node.by.kind:mapping");
        expect(counts[0]).toContain("node.ramp.weight:mapping");
    });

    it("stays in bound from 2 to 5,000 categories", () => {
        for (const k of [2, 9, 64, 65, 256, 300, 1000, 5000]) {
            const n = Math.max(50, k * 3);
            const next = rng(k);
            const cat = Array.from({ length: n }, (_, i) => `c${String(i % k)}`);
            const palette = Array.from({ length: k }, () => color(next() * 255, next() * 255, next() * 255));
            const fill = cat.map((c) => palette[Number(c.slice(1))]);
            const shape = cat.map((c) => (Number(c.slice(1)) % 2 === 0 ? "ellipse" : "rectangle"));
            const ex = planStyles(
                { format: "test", fingerprint: fp(n), node: { values: { fill, shape } } },
                { node: [data("cat", cat)], edge: [] },
            );
            checkPlan(ex, { node: { fill, shape } });
        }
    });

    it("folds rules over the cap into the copy and stays exact", () => {
        const n = 400;
        const next = rng(5);
        const declared = Array.from({ length: 30 }, (_, j) => ({
            id: `node.rule.${String(j)}`,
            target: "node" as const,
            role: "group",
            origin: "declared",
            where: { eq: [{ data: "g" }, `g${String(j)}`] as const },
            set: { fill: color(j * 8, 0, 0) },
        }));
        const g = Array.from({ length: n }, () => `g${String(Math.floor(next() * 30))}`);
        const fill = g.map((x) => color(Number(x.slice(1)) * 8, 0, 0));
        const ex = planStyles(
            { format: "test", fingerprint: fp(n), node: { values: { fill }, rules: declared } },
            { node: [data("g", g)], edge: [] },
        );
        expect(ex.styles.notes.some((x) => x.code === "W_STYLE_LAYER_CAP")).toBe(true);
        checkPlan(ex, { node: { fill } });
    });

    it("turns a long declared selector into a membership style column", () => {
        const n = 100;
        const ids = Array.from({ length: n }, (_, i) => `v${String(i)}`);
        const members = ids.filter((_, i) => i % 3 === 0);
        const fill = ids.map((_, i) => (i % 3 === 0 ? "#ff0000" : null));
        const ex = planStyles(
            {
                format: "test",
                fingerprint: fp(n),
                node: {
                    values: { fill },
                    rules: [
                        {
                            id: "node.rule.wide",
                            target: "node",
                            role: "group",
                            origin: "declared",
                            where: { in: [{ data: "id" }, members] },
                            set: { fill: "#ff0000" },
                        },
                    ],
                },
            },
            { node: [data("id", ids)], edge: [] },
        );
        const rule = ex.styles.rules.find((r) => r.id === "node.rule.wide");
        expect(rule?.where).toEqual({ has: { style: "member.1" } });
        expect(ex.columns.node.get("member.1")?.filter((v) => v === true).length).toBe(members.length);
        checkPlan(ex, { node: { fill } });
    });

    it("finishes a 300,000-node file with a unique integer column within the counted budget", () => {
        const n = 300_000;
        const next = rng(300);
        const uid = Array.from({ length: n }, (_, i) => i * 7 + Math.floor(next() * 7));
        const fill = Array.from({ length: n }, () => color(next() * 255, next() * 255, next() * 255));
        const width = uid.map((u) => (u % 13) + 1);
        const budget = new StyleBudget();
        const ex = planStyles(
            { format: "test", fingerprint: fp(n), node: { values: { fill, width } } },
            { node: [data("uid", uid)], edge: [] },
            { budget },
        );
        expect(budget.used("node")).toBeLessThanOrEqual(STYLE_WORK_BUDGET);
        expect(ex.styles.notes.some((x) => x.code === "W_STYLE_BUDGET")).toBe(false);
        expect(resolveStyles(ex, "node", "fill")).toEqual(fill);
        expect(resolveStyles(ex, "node", "width")).toEqual(width);
    });

    it("sends what is left to the copy when the budget runs out", () => {
        const n = 1000;
        const cat = Array.from({ length: n }, (_, i) => `c${String(i % 4)}`);
        const fill = cat.map((c) => color(Number(c.slice(1)) * 60, 0, 0));
        const ex = planStyles(
            { format: "test", fingerprint: fp(n), node: { values: { fill } } },
            { node: [data("cat", cat)], edge: [] },
            { budget: new StyleBudget(10) },
        );
        expect(ex.styles.notes.some((x) => x.code === "W_STYLE_BUDGET")).toBe(true);
        expect(ex.styles.rules.find((r) => r.id === "node.copy")?.facts?.reason).toBe("BUDGET");
        checkPlan(ex, { node: { fill } });
    });
});

describe("tool defaults", () => {
    it("puts the tool's defaults at the bottom and leaves the unstyled to them", () => {
        const n = 40;
        const fill = Array.from({ length: n }, (_, i) => (i < 20 ? "#ff0000" : null));
        const ex = planStyles(
            { format: "cx2", tool: "cytoscape", fingerprint: fp(n), node: { values: { fill } } },
            { node: [], edge: [] },
        );
        expect(ex.styles.rules[0]).toMatchObject({ id: "node.tool", origin: "tool", role: "defaults" });
        expect(ex.styles.source.tool).toBe("cytoscape");
        expect(ex.styles.graph.background).toBe("#ffffff");
        expect(resolveStyles(ex, "node", "fill")[30]).toBe("#89d0f5");
        checkPlan(ex, { node: { fill } });
        const off = planStyles(
            { format: "cx2", tool: "cytoscape", fingerprint: fp(n), node: { values: { fill } } },
            { node: [], edge: [] },
            { toolDefaults: false },
        );
        expect(off.styles.rules.some((r) => r.origin === "tool")).toBe(false);
        expect(off.styles.source.tool).toBeNull();
    });
});

describe("the prototype's fixtures", () => {
    it("recovers fill by Modularity Class and size by degree from Gephi's Les Miserables", async () => {
        const path = resolve(import.meta.dirname, "../conformance/fixtures/graphml/graphology/miserables.graphml");
        const { snapshot } = await importGraph(new Uint8Array(readFileSync(path)), { format: "graphml" });
        const n = snapshot.nodeCount;
        const cell = (name: string, i: number): number => Number(snapshot.nodes.value(name, i));
        const fill = Array.from({ length: n }, (_, i) => color(cell("r", i), cell("g", i), cell("b", i)));
        const size = Array.from({ length: n }, (_, i) => Number(cell("size", i).toPrecision(6)));
        const label = Array.from({ length: n }, (_, i) => String(snapshot.nodes.value("label", i)));
        const ex = planStyles(
            {
                format: "graphml",
                fingerprint: styleFingerprint(snapshot),
                node: { values: { fill, width: size, height: size, label } },
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
            { rawColumns: { node: ["r", "g", "b", "size"] } },
        );
        const byId = new Map(ex.styles.rules.map((r) => [r.id, r]));
        expect(byId.get("node.by.Modularity Class")?.map?.fill).toEqual({
            kind: "discrete",
            by: { data: "Modularity Class" },
            table: [
                [1, "#f55b5b"],
                [8, "#5bf55b"],
                [6, "#c25bf5"],
                [7, "#5bf5c2"],
                [2, "#5bc2f5"],
                [0, "#5b5bf5"],
                [3, "#c2f55b"],
                [4, "#f5c25b"],
                [5, "#f55bc2"],
            ],
        });
        const ramp = byId.get("node.ramp.degree");
        expect(ramp?.map?.width?.by).toEqual({ computed: "degree" });
        const at = [1, 2, 3, 8, 9, 12, 13, 16, 17, 36];
        const value = [4, 6.74286, 9.48571, 23.2, 25.9429, 34.1714, 36.9143, 45.1429, 47.8857, 100];
        expect(ramp?.map?.width).toEqual({
            kind: "continuous",
            by: { computed: "degree" },
            points: at.map((x, j) => ({ at: x, below: value[j], value: value[j], above: value[j] })),
        });
        expect(ramp?.map?.height).toEqual(ramp?.map?.width);
        expect(byId.get("node.passthrough")?.map?.label).toEqual({ kind: "passthrough", by: { data: "label" } });
        expect(ex.styles.rules.filter((r) => r.target === "node")).toHaveLength(3);
        checkPlan(ex, { node: { fill, width: size, height: size, label } }, snapshot);
    });
});

describe("a value read from a 32-bit float column", () => {
    it("gives the style value its 64-bit form gives: the shortest decimal of the float", () => {
        // 0.705815 as a 32-bit float is 0.70581501722..., so 1 + it rounds to 1.70582 in six digits, 1.705815 to 1.70581
        const widths = (dtype: "f32" | "f64"): readonly unknown[] => {
            const b = new GraphBuilder({ directed: false });
            b.addNode("a");
            b.declareNodeColumn({ name: "score", dtype });
            b.setNodeValue("score", 0, 0.705815);
            const g = b.freeze();
            const ex: ExtractedStyles = {
                styles: {
                    version: 1,
                    source: { format: "test", dialect: null, tool: null },
                    units: { length: "px" },
                    graph: {},
                    rules: [
                        {
                            id: "w",
                            target: "node",
                            role: "mapping",
                            origin: "declared",
                            where: { all: true },
                            map: {
                                width: {
                                    kind: "continuous",
                                    by: { data: "score" },
                                    points: [
                                        { at: 0, below: 1, value: 1, above: 1 },
                                        { at: 1, below: 2, value: 2, above: 2 },
                                    ],
                                },
                            },
                        },
                    ],
                    notes: [],
                },
                columns: { node: new Map(), edge: new Map() },
                features: { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
                fingerprint: styleFingerprint(g),
            };
            return resolveStyles(ex, "node", "width", g);
        };
        expect(widths("f64")).toEqual([1.70581]);
        expect(widths("f32")).toEqual(widths("f64"));
    });
});
