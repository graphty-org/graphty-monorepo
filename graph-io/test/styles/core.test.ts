import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
    isStyleValue,
    STYLE_ISSUE,
    STYLE_PROPERTIES,
    STYLE_WORK_BUDGET,
    StyleBudget,
    type StyleNoteCode,
    StyleNotes,
    TOOL_DEFAULTS,
    type ToolDefaults,
    toolDefaults,
} from "../../src/styles/index.js";

/** Every module URL Node resolves while importing `entry` in a fresh process. */
function modulesLoadedBy(entry: string): string[] {
    const hooks = `export async function resolve(s, c, next) { const r = await next(s, c); process.stderr.write("LOADED " + r.url + "\\n"); return r; }`;
    const register = `import { register } from "node:module"; register("data:text/javascript," + encodeURIComponent(${JSON.stringify(hooks)}));`;
    const run = spawnSync(
        process.execPath,
        [
            "--import",
            "tsx",
            "--import",
            `data:text/javascript,${encodeURIComponent(register)}`,
            "--input-type=module",
            "-e",
            `const m = await import(${JSON.stringify(pathToFileURL(entry).href)}); if (!m.STYLE_ISSUE) process.exit(3);`,
        ],
        { encoding: "utf8" },
    );
    expect(run.status, run.stderr).toBe(0);
    return run.stderr
        .split("\n")
        .filter((l) => l.startsWith("LOADED "))
        .map((l) => l.slice("LOADED ".length));
}

describe("the styles entry", () => {
    it("loads in Node without evaluating any format module, the registry or the root barrel", () => {
        const src = pathToFileURL(resolve("src")).href;
        const loaded = modulesLoadedBy(resolve("src/styles/index.ts")).filter((u) => u.startsWith(src));
        expect(loaded).toContain(`${src}/styles/index.ts`);
        const forbidden = loaded.filter(
            (u) =>
                u.startsWith(`${src}/formats/`) ||
                u === `${src}/index.ts` ||
                u === `${src}/registry.ts` ||
                u === `${src}/sniff.ts`,
        );
        expect(forbidden).toEqual([]);
    });

    it.skipIf(!existsSync(resolve("dist/styles.js")))(
        "is built as its own bundle entry with its declaration",
        async () => {
            expect(readFileSync(resolve("dist/styles.d.ts"), "utf-8").trim()).toBe(
                'export * from "./src/styles/index.js";',
            );
            const built = (await import(resolve("dist/styles.js"))) as { STYLE_ISSUE: unknown };
            expect(built.STYLE_ISSUE).toEqual(STYLE_ISSUE);
        },
    );
});

describe("STYLE_ISSUE", () => {
    it("names each code by the code without its severity and style prefixes", () => {
        for (const [key, code] of Object.entries(STYLE_ISSUE)) {
            expect(code.replace(/^[EW]_STYLES?_/, ""), key).toBe(key);
        }
        expect(STYLE_ISSUE.MISMATCH).toBe("E_STYLES_MISMATCH");
        expect(STYLE_ISSUE.NOT_EXPORTED).toBe("W_STYLES_NOT_EXPORTED");
        expect(STYLE_ISSUE.NOT_IMPORTED).toBe("W_STYLES_NOT_IMPORTED");
        expect(new Set(Object.values(STYLE_ISSUE)).size).toBe(Object.keys(STYLE_ISSUE).length);
    });

    it("holds every code the import and export reports name", () => {
        for (const code of [
            "W_STYLE_APPROXIMATED",
            "W_STYLE_BLOCK_IGNORED",
            "W_STYLE_BUDGET",
            "W_STYLE_LAYER_FLATTENED",
            "W_STYLE_NOT_WRITTEN",
            "W_STYLE_RAMP_ROUNDED",
            "W_STYLE_REFERENCE_CYCLE",
            "W_STYLE_RULES_NOT_KEPT",
            "W_STYLE_SIZE_MINIMUM",
            "W_STYLE_VALUE_TOO_LONG",
            "W_STYLES_NOT_EXPORTED",
            "W_STYLES_NOT_IMPORTED",
            "E_STYLES_MISMATCH",
        ]) {
            expect(Object.values(STYLE_ISSUE)).toContain(code);
        }
    });

    it("gives every note code graph-io's own wording", () => {
        const notes = new StyleNotes();
        const noteCodes = Object.values(STYLE_ISSUE).filter((c): c is StyleNoteCode => c.startsWith("W_STYLE_"));
        for (const code of noteCodes) {
            notes.add(code, "node", "fill");
        }
        for (const note of notes.list()) {
            expect(note.message, note.code).not.toContain(note.code);
        }
    });
});

describe("StyleBudget", () => {
    it("is exhausted at exactly the first operation past its limit, per target", () => {
        const budget = new StyleBudget(1000);
        let spent = 0;
        let exhaustedAt = -1;
        for (let op = 1; op <= 2000; op++) {
            spent++;
            if (!budget.spend("node", 1)) {
                exhaustedAt = op;
                break;
            }
            expect(budget.exhausted("node")).toBe(false);
        }
        expect(exhaustedAt).toBe(1001);
        expect(spent).toBe(1001);
        expect(budget.used("node")).toBe(1001);
        expect(budget.exhausted("node")).toBe(true);
        // stays exhausted, and the other target is untouched
        expect(budget.spend("node", 0)).toBe(false);
        expect(budget.exhausted("edge")).toBe(false);
        expect(budget.spend("edge", 1000)).toBe(true);
        expect(budget.spend("edge", 1)).toBe(false);
    });

    it("defaults to 2e8 operations per target", () => {
        expect(STYLE_WORK_BUDGET).toBe(2e8);
        const budget = new StyleBudget();
        expect(budget.limit).toBe(2e8);
        expect(budget.spend("edge", 2e8)).toBe(true);
        expect(budget.spend("edge", 1)).toBe(false);
    });
});

describe("StyleNotes", () => {
    it("aggregates 10,000 reports into one note with 8 samples and the full element list", () => {
        const notes = new StyleNotes();
        for (let i = 0; i < 10_000; i++) {
            notes.add(STYLE_ISSUE.BAD_VALUE, "node", "fill", { sample: `bad-${i % 20}`, element: 9_999 - i });
        }
        const list = notes.list();
        expect(list).toHaveLength(1);
        const [note] = list;
        expect(note.code).toBe("W_STYLE_BAD_VALUE");
        expect(note.params).toEqual({
            property: "fill",
            target: "node",
            count: 10_000,
            samples: ["bad-0", "bad-1", "bad-2", "bad-3", "bad-4", "bad-5", "bad-6", "bad-7"],
        });
        expect(note.elements).toEqual(Array.from({ length: 10_000 }, (_, i) => i));
        expect(notes.covers(STYLE_ISSUE.BAD_VALUE, "node", "fill", 1234)).toBe(true);
        expect(notes.covers(STYLE_ISSUE.BAD_VALUE, "edge", "fill", 1234)).toBe(false);
    });

    it("keeps one note per code, target and property, and counts reports without an element", () => {
        const notes = new StyleNotes();
        notes.add(STYLE_ISSUE.BAD_VALUE, "node", "fill", { element: 1 });
        notes.add(STYLE_ISSUE.BAD_VALUE, "edge", "fill", { element: 1 });
        notes.add(STYLE_ISSUE.BAD_VALUE, "node", "borderColor", { element: 1 });
        notes.add(STYLE_ISSUE.BUDGET, "node", null, { count: 3 });
        notes.add(STYLE_ISSUE.BUDGET, "node", null, { count: 2, sample: { families: 2 } });
        const list = notes.list();
        expect(list.map((n) => [n.code, n.params.target, n.params.property])).toEqual([
            ["W_STYLE_BAD_VALUE", "node", "fill"],
            ["W_STYLE_BAD_VALUE", "edge", "fill"],
            ["W_STYLE_BAD_VALUE", "node", "borderColor"],
            ["W_STYLE_BUDGET", "node", null],
        ]);
        expect(list[3].params.count).toBe(5);
        expect(list[3].elements).toEqual({ count: 5 });
        expect(list[3].params.samples).toEqual(['{"families":2}']);
    });

    it("cuts long samples to 80 characters and survives values JSON cannot write", () => {
        const notes = new StyleNotes();
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        notes.add(STYLE_ISSUE.BAD_VALUE, "node", "label", { sample: "x".repeat(5000) });
        notes.add(STYLE_ISSUE.BAD_VALUE, "node", "label", { sample: cyclic });
        notes.add(STYLE_ISSUE.BAD_VALUE, "node", "label", { sample: 10n });
        expect(notes.list()[0].params.samples).toEqual(["x".repeat(80), "object", "bigint"]);
    });
});

/** The committed reference: the values of style-tool-defaults.md, checked by hand. */
const REFERENCE = JSON.parse(readFileSync(resolve("test/styles/tool-defaults.json"), "utf-8")) as Record<
    string,
    unknown
>;

/**
 * A tool's defaults without their sources.
 * @param d - the defaults
 * @returns the values only
 */
function valuesOf(d: ToolDefaults): unknown {
    const strip = (o: object): Record<string, unknown> =>
        Object.fromEntries(Object.entries(o).map(([k, e]) => [k, (e as { value: unknown }).value]));
    return {
        units: d.units,
        node: strip(d.node),
        edge: strip(d.edge),
        graph: strip(d.graph),
        derived: d.derived.map(({ source: _source, ...rest }) => rest),
    };
}

describe("TOOL_DEFAULTS", () => {
    it("equals the hand-checked reference, tool by tool", () => {
        expect([...TOOL_DEFAULTS.keys()].sort()).toEqual(Object.keys(REFERENCE).sort());
        for (const [tool, d] of TOOL_DEFAULTS) {
            expect(d.tool).toBe(tool);
            expect(valuesOf(d), tool).toEqual(REFERENCE[tool]);
            expect(toolDefaults(tool)).toBe(d);
        }
        expect(toolDefaults("igraph")).toBeNull();
        expect(toolDefaults("neo4j-browser")).toBeNull();
    });

    it("holds only canonical values of the vocabulary, each with a source", () => {
        for (const [tool, d] of TOOL_DEFAULTS) {
            for (const target of ["node", "edge", "graph"] as const) {
                for (const [property, entry] of Object.entries(d[target])) {
                    const { value, source } = entry as { value: unknown; source: string };
                    expect(STYLE_PROPERTIES[target].has(property), `${tool} ${target} ${property}`).toBe(true);
                    expect(
                        isStyleValue(target, property, value),
                        `${tool} ${target} ${property} ${String(value)}`,
                    ).toBe(true);
                    expect(source.length, `${tool} ${target} ${property}`).toBeGreaterThan(0);
                }
            }
            for (const rule of d.derived) {
                expect(rule.source.length, `${tool} ${rule.kind}`).toBeGreaterThan(0);
            }
            expect(d.version.length).toBeGreaterThan(0);
        }
    });

    it("is plain ASCII throughout", () => {
        const text = JSON.stringify([...TOOL_DEFAULTS.values()]);
        expect(/^[\x20-\x7e]*$/.test(text)).toBe(true);
        expect(
            /^[\x20-\x7e]*$/.test(readFileSync(resolve("test/styles/tool-defaults.json"), "utf-8").replace(/\s/g, " ")),
        ).toBe(true);
    });

    it("gives NetworkX its stated drawing defaults and leaves out igraph and Neo4j Browser", () => {
        const nx = toolDefaults("networkx");
        expect(nx?.node.fill?.value).toBe("#1f78b4");
        expect(nx?.derived).toContainEqual(
            expect.objectContaining({ kind: "targetArrowOnDirected", arrow: "triangle" }),
        );
        const record = readFileSync(resolve("../design/graph-io/style-tool-defaults.md"), "utf-8");
        for (const name of ["NetworkX", "igraph", "Neo4j Browser"]) {
            expect(record).toContain(name);
        }
    });
});

describe("isStyleValue", () => {
    it("checks each property's kind and canonical spelling", () => {
        expect(isStyleValue("node", "fill", "#a0b1c2")).toBe(true);
        expect(isStyleValue("node", "fill", "#A0B1C2")).toBe(false);
        expect(isStyleValue("node", "fill", "red")).toBe(false);
        expect(isStyleValue("node", "fillOpacity", 1.5)).toBe(false);
        expect(isStyleValue("node", "width", -1)).toBe(false);
        expect(isStyleValue("node", "width", Number.POSITIVE_INFINITY)).toBe(false);
        expect(isStyleValue("node", "shape", "other:cloud")).toBe(true);
        expect(isStyleValue("node", "shape", "other:")).toBe(false);
        expect(isStyleValue("node", "labelWeight", "other:heavy")).toBe(false);
        expect(isStyleValue("edge", "curved", "true")).toBe(false);
        expect(isStyleValue("edge", "graphty:glow", 2)).toBe(true);
        expect(isStyleValue("node", "constructor", "x")).toBe(false);
        expect(isStyleValue("node", "__proto__", "x")).toBe(false);
        expect(isStyleValue("graph", "background", "#ffffff")).toBe(true);
    });
});
