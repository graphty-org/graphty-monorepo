/**
 * @file Export scope and columns, the style file, the recipe and the screenshot presets: the
 * pieces the common Export dialog reads from graphty-element.
 */

import { assert, describe, it } from "vitest";

import { SCREENSHOT_PRESET_DESCRIPTORS } from "../../catalog";
import type { RuleTree } from "../../src/catalog/types";
import { exportSession } from "../../src/data/export";
import { resolvePreset } from "../../src/screenshot/presets";
import { type Harness, makeSession } from "../session/helpers";

/** The 140 nodes of 900 a filter on `v` leaves showing. */
const FIRST_140: RuleTree = { kind: "range", attribute: "data.v", max: 139 };

/**
 * A chain of 900 nodes, `n0` to `n899`, each with `v` (its number), `score` and `tag`.
 * @returns The harness.
 */
function chain(): Harness {
    const h = makeSession({ directed: true });
    const nodes = Array.from({ length: 900 }, (_value, i) => ({ id: `n${String(i)}`, v: i, score: i * 2, tag: "t" }));
    const edges = nodes.slice(1).map((node, i) => ({ src: `n${String(i)}`, dst: node.id, w: 1 }));
    h.add(nodes, edges);
    return h;
}

/**
 * The data rows of a CSV table.
 * @param text - The CSV.
 * @returns The rows, header left out.
 */
function rowsOf(text: string): string[] {
    return text.trim().split("\n").slice(1);
}

describe("exportGraph scope", () => {
    it("writes only what is shown: 140 of 900 nodes, and the edges between them", async () => {
        const h = chain();
        await h.session.visibility.set(FIRST_140);

        const nodes = rowsOf(await exportSession(h.session, "csv", { table: "nodes", scope: "shown" }).text());
        const edges = rowsOf(await exportSession(h.session, "csv", { scope: "shown" }).text());
        const all = rowsOf(await exportSession(h.session, "csv", { table: "nodes" }).text());

        assert.strictEqual(nodes.length, 140);
        assert.strictEqual(edges.length, 139);
        assert.strictEqual(all.length, 900, "no scope writes the whole graph");
        h.session.dispose();
    });

    it("writes the selection, a kept set and a rule tree", async () => {
        const h = chain();
        await h.session.selection.apply({ nodes: ["n1", "n2", "n500"] });
        const set = h.session.sets.create({ kind: "fixed", nodes: ["n10", "n11", "n12", "n13"], reading: "induced" });

        const count = async (scope: Parameters<typeof exportSession>[2]): Promise<number> =>
            rowsOf(await exportSession(h.session, "csv", { table: "nodes", ...scope }).text()).length;

        assert.strictEqual(await count({ scope: "selection" }), 3);
        assert.strictEqual(await count({ scope: { set } }), 4);
        assert.strictEqual(await count({ scope: { kind: "range", attribute: "data.v", min: 800 } }), 100);
        h.session.dispose();
    });

    it("keeps each node's own position and values when it writes a subset", async () => {
        const h = chain();
        await h.session.selection.apply({ nodes: ["n700"] });

        const text = await exportSession(h.session, "json", { scope: "selection" }).text();

        assert.include(text, '"n700"');
        assert.include(text, "1400", "n700's score");
        assert.notInclude(text, '"n0"');
        h.session.dispose();
    });
});

describe("exportGraph columns", () => {
    it("writes only the columns named, by name or data path", async () => {
        const h = chain();

        const named = (await exportSession(h.session, "csv", { table: "nodes", columns: ["score"] }).text()).split(
            "\n",
        )[0];
        const byPath = (await exportSession(h.session, "csv", { table: "nodes", columns: ["data.tag"] }).text()).split(
            "\n",
        )[0];

        assert.include(named, "score");
        assert.notInclude(named, "tag");
        assert.notInclude(named, ",v");
        assert.include(byPath, "tag");
        assert.notInclude(byPath, "score");
        h.session.dispose();
    });

    it("refuses a columns option that is not a list of names", () => {
        const h = chain();
        assert.throws(
            () => exportSession(h.session, "csv", { columns: "score" as unknown as string[] }),
            /columns must be a list/,
        );
        h.session.dispose();
    });
});

describe("styles.toFile", () => {
    it("holds only the layers, and applies back as a template", async () => {
        const h = chain();
        await h.session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "expression", where: "v > `100`" },
            set: { "node.size": 3 },
        });

        const file = h.session.styles.toFile();

        assert.strictEqual(file.kind, "graphty-style");
        assert.sameMembers(Object.keys(file), ["kind", "version", "layers"]);
        assert.deepStrictEqual(
            file.layers.map((layer) => layer.name),
            ["Big"],
        );
        assert.notInclude(JSON.stringify(file), "n0");

        const other = chain();
        await other.session.styles.applyTemplate(JSON.parse(JSON.stringify(file)));
        assert.include(
            other.session.styles.list().map((layer) => layer.name),
            "Big",
        );
        h.session.dispose();
        other.session.dispose();
    });
});

describe("session.recipe", () => {
    it("names columns and never nodes", async () => {
        const h = chain();
        await h.session.data.declare({ kind: "node", name: "tag" }, { measurement: "categorical" });
        await h.session.visibility.set({
            kind: "all",
            of: [FIRST_140, { kind: "neighborhood", seeds: ["n77"], depth: 2 }],
        });
        await h.session.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["n33"] },
            set: { "node.size": 4 },
        });
        await h.session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "expression", where: "v > `100`" },
            set: { "node.size": 3 },
        });

        const recipe = h.session.recipe();
        const text = JSON.stringify(recipe);

        assert.strictEqual(recipe.kind, "graphty-recipe");
        assert.notMatch(text, /"n\d+"/, "no node id");
        assert.deepStrictEqual(recipe.filter.rule, { kind: "all", of: [FIRST_140] });
        assert.deepStrictEqual(
            recipe.styles.layers.map((layer) => layer.name),
            ["Big"],
        );
        assert.deepStrictEqual(recipe.leftOut, [
            { code: "names-elements", params: { part: "filter", count: 1 } },
            { code: "names-elements", params: { part: "style", count: 1 } },
        ]);
        const tag = recipe.columns.find((column) => column.name === "tag");
        assert.deepStrictEqual(tag?.measurement, "categorical");
        assert.isTrue(Object.isFrozen(recipe));
        h.session.dispose();
    });
});

describe("catalog.screenshotPresets", () => {
    it("lists the presets the capture code applies", () => {
        const h = makeSession();
        const presets = h.session.catalog.screenshotPresets();

        assert.strictEqual(presets, SCREENSHOT_PRESET_DESCRIPTORS);
        assert.sameMembers(
            presets.map((preset) => preset.id),
            ["web-share", "print", "thumbnail", "documentation"],
        );
        for (const { id, destination, ...settings } of presets) {
            const resolved = resolvePreset(id);
            for (const [key, value] of Object.entries(settings)) {
                assert.deepStrictEqual(resolved[key as keyof typeof resolved], value, `${id}.${key}`);
            }

            assert.deepStrictEqual(resolved.destination, destination === undefined ? undefined : { ...destination });
        }

        h.session.dispose();
    });
});
