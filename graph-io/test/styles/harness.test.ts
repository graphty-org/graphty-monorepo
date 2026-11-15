/**
 * The style harness over every registered format and every committed corpus directory: each input's planned rules
 * reproduce what its reader read, element by element (design 7.1), and RESULTS.md records the measures of every
 * input. The round trip of design 10.7, for each format with a style writer, is harness-writes-*.test.ts.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type ExtractedStyles, extractStyles, type StyleRule } from "../../src/styles/internal.js";
import { editJsonNodeFill } from "./formats/json.js";
import {
    checkInput,
    checkStyles,
    fileInput,
    formatInputs,
    mutants,
    STYLE_CORPUS,
    type StyleResult,
    styleTruth,
} from "./harness.js";
import { FORMATS, registered, SCALE_POINTS, sharedInputs, split, WRITE_SLICES } from "./harness-cases.js";
import { resultsTable } from "./results.js";

const results: StyleResult[] = [];

/**
 * What kinds of rules styles have: each rule's target, role, the properties it sets and the kind of each mapping
 * (sorted: a mapping's properties come in the order the file's elements first give them).
 * @param ex - the styles
 * @returns one line per rule
 */
function ruleKinds(ex: ExtractedStyles | null): string[] {
    return (ex?.styles.rules ?? []).map(
        (r) =>
            `${r.target} ${r.role} set ${Object.keys(r.set ?? {}).join(",")} map ${Object.entries(r.map ?? {})
                .map(([p, m]) => `${p}=${m?.kind ?? ""}`)
                .sort()
                .join(",")}`,
    );
}

describe.each(FORMATS.map((f) => [f.name, f] as const))("%s", (_name, format) => {
    const inputs = sharedInputs(format);

    const plans = split(inputs, "plans");
    const plan = async (input: (typeof inputs)[number]): Promise<void> => {
        const checked = await checkInput(input);
        results.push(checked.result);
        const failures = [...checked.failures];
        if (checked.result.styled && input.bytes !== undefined) {
            for (const m of mutants(format.name, input.name, input.bytes, format.mutantsPerFile ?? 0)) {
                const filename = input.name.split("/").pop()?.replace(/\.gz$/, "") ?? input.name;
                const mutant = await checkInput(fileInput(format, `${input.name} (mutant)`, m.bytes, filename));
                failures.push(...mutant.failures.map((f) => `with ${JSON.stringify(m.value.slice(0, 40))}: ${f}`));
            }
        }
        expect(failures).toEqual([]);
    };
    it.each(plans.pass)("%s plans to rules that reproduce what its reader read", (_name, input) => plan(input));
    if (plans.fail.length > 0) {
        it.fails.each(plans.fail)("%s plans to rules that reproduce what its reader read (known failure)", (_n, i) =>
            plan(i),
        );
    }
});

describe.each([...SCALE_POINTS].map(([large, small]) => [large, small] as const))("%s", (large, small) => {
    it(`has the kinds of rules ${small} has, which runs the whole round trip`, async () => {
        const load = async (name: string): Promise<ExtractedStyles | null> => {
            const format = FORMATS.find((f) => f.name === name.split("/")[0]);
            const input = format === undefined ? undefined : formatInputs(format).find((i) => i.name === name);
            if (input === undefined) {
                throw new Error(`${name} is not a harness input`);
            }
            const loaded = await input.load();
            return extractStyles(loaded.importer, loaded.snapshot, loaded.report);
        };
        const kinds = ruleKinds(await load(large));
        expect(kinds.length).toBeGreaterThan(2);
        expect(kinds).toEqual(ruleKinds(await load(small)));
    });
});

describe("the checks", () => {
    const byGroup = (): Promise<{ readonly input: ReturnType<typeof formatInputs>[number] }> => {
        const roles = registered.find((f) => f.name === "roles");
        const input = roles === undefined ? undefined : formatInputs(roles).find((i) => i.name === "roles/by-group-60");
        if (input === undefined) {
            throw new Error("the roles inputs are missing");
        }
        return Promise.resolve({ input });
    };

    it("read the generic reader's truth from the role columns, spellings canonicalized", async () => {
        const { input } = await byGroup();
        const loaded = await input.load();
        const truth = styleTruth(loaded);
        const fill = truth?.node?.fill ?? [];
        expect(fill).toHaveLength(60);
        expect(fill.every((v) => v === null || /^#[0-9a-f]{6}$/.test(String(v)))).toBe(true);
        expect(new Set(fill)).toEqual(new Set(["#ff0000", "#0000ff", "#008000", "#ffa500"]));
        expect(truth?.node?.visible?.some((v) => v === false)).toBe(true);
    });

    it("edit a JSON node's color and keep its alpha, so an outside edit changes one value", () => {
        const fill = (doc: unknown, read: (d: Record<string, never>) => unknown): unknown => {
            const out = editJsonNodeFill(new TextEncoder().encode(JSON.stringify(doc)));
            return out === null ? null : read(JSON.parse(new TextDecoder().decode(out)) as Record<string, never>);
        };
        const vis = {
            nodes: [{ id: 1, color: { background: "rgba(0,0,255,0.501961)" } }],
            edges: [{ from: 1, to: 1 }],
        };
        expect(fill(vis, (d) => (d.nodes as { color: { background: string } }[])[0].color.background)).toBe(
            "rgba(18,52,86,0.501961)",
        );
        const graphology = { attributes: {}, nodes: [{ key: "a", attributes: { color: "#0000ff80" } }] };
        expect(fill(graphology, (d) => (d.nodes as { attributes: { color: string } }[])[0].attributes.color)).toBe(
            "#12345680",
        );
    });

    it("fail on an injected wrong rule, naming the element and the property", async () => {
        const { input } = await byGroup();
        const loaded = await input.load();
        const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
        const truth = styleTruth(loaded);
        if (ex === null || truth === null) {
            throw new Error("no styles");
        }
        expect(checkStyles(ex, truth, loaded.snapshot).failures).toEqual([]);
        const wrong: StyleRule = {
            id: "node.injected",
            target: "node",
            role: "group",
            origin: "inferred",
            where: { eq: [{ data: "group" }, "g1"] },
            set: { fill: "#abcdef" },
        };
        const bad = { ...ex, styles: { ...ex.styles, rules: [...ex.styles.rules, wrong] } };
        const { failures } = checkStyles(bad, truth, loaded.snapshot);
        let index = -1;
        for (let i = 0; i < loaded.snapshot.nodeCount && index < 0; i++) {
            if (loaded.snapshot.nodes.value("group", i) === "g1") {
                index = i;
            }
        }
        expect(index).toBeGreaterThanOrEqual(0);
        expect(failures).toContain(
            `node ${JSON.stringify(loaded.snapshot.ids.idOf(index))} (index ${String(index)}) fill: the rules give "#abcdef", the file has ${JSON.stringify(truth.node?.fill?.[index])}`,
        );
    });

    it("fail on a rule that paints an element the file left unstyled", async () => {
        const roles = registered.find((f) => f.name === "roles");
        const input = roles === undefined ? undefined : formatInputs(roles).find((i) => i.name === "roles/sparse-60");
        const loaded = await input?.load();
        if (loaded === undefined) {
            throw new Error("the roles inputs are missing");
        }
        const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
        const truth = styleTruth(loaded);
        if (ex === null || truth === null) {
            throw new Error("no styles");
        }
        const everything: StyleRule = {
            id: "node.everything",
            target: "node",
            role: "defaults",
            origin: "inferred",
            where: { all: true },
            set: { fill: "#010101" },
        };
        const bad = { ...ex, styles: { ...ex.styles, rules: [everything, ...ex.styles.rules] } };
        const { failures } = checkStyles(bad, truth, loaded.snapshot);
        expect(
            failures.some((f) => f.includes('rule node.everything paints "#010101", the file leaves it unstyled')),
        ).toBe(true);
    });

    it("fail on more than 16 rules, a long predicate and a note code that is not a style code", async () => {
        const { input } = await byGroup();
        const loaded = await input.load();
        const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
        if (ex === null) {
            throw new Error("no styles");
        }
        const many: StyleRule[] = Array.from({ length: 17 }, (_, k) => ({
            id: `node.extra.${String(k)}`,
            target: "node",
            role: "group",
            origin: "declared",
            where: { in: [{ data: "group" }, Array.from({ length: 9 }, (_v, j) => `x${String(j)}`)] },
            set: { borderWidth: 1 },
        }));
        const note = { ...ex.styles.notes[0], code: "E_SOMETHING" } as unknown as (typeof ex.styles.notes)[number];
        const bad = { ...ex, styles: { ...ex.styles, rules: [...ex.styles.rules, ...many], notes: [note] } };
        const { failures, result } = checkStyles(bad, {}, loaded.snapshot);
        expect(failures.some((f) => /node rules, over the bound of 16/.test(f))).toBe(true);
        expect(failures).toContain(
            "rule node.extra.0 selects with a predicate that is not a short form of at most 8 terms",
        );
        expect(failures).toContain("a note has the code E_SOMETHING, which is not a W_STYLE_ code");
        expect(result.declaredEmpty).toBe(17);
    });
});

describe("the round trip slices", () => {
    it("are one file per slice, so that every input's round trip runs", () => {
        const files = readdirSync(import.meta.dirname).filter((f) => /^harness-writes-\d+\.test\.ts$/.test(f));
        expect(files.sort()).toEqual(
            Array.from({ length: WRITE_SLICES }, (_unused, k) => `harness-writes-${String(k + 1)}.test.ts`),
        );
    });
});

describe("RESULTS.md", () => {
    it("records every input's counts and measures", async () => {
        expect(results.length).toBeGreaterThan(0);
        await expect(resultsTable(results)).toMatchFileSnapshot(join(STYLE_CORPUS, "RESULTS.md"));
    });
});
