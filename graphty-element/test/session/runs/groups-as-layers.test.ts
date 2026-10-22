/**
 * @file A partition run started with `style: { groups: "layers" }` paints each group as a layer of
 * its own in a folder named for the run; a re-run keeps each layer on its group and adds a layer
 * for a new group; one undo, and removing the run, take the folder away.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/** Eleven nodes in four communities of 3, 3, 2 and 3... and the first run's membership. */
const FIRST: Readonly<Record<string, number>> = { a: 0, b: 0, c: 0, d: 0, e: 1, f: 1, g: 1, h: 2, i: 2, j: 3, k: 3 };

/**
 * The second run: the same communities renumbered (0 is now 2, 1 is 0, 2 is 3, 3 is 1), except
 * that c and d leave community 0 for a new one, 4.
 */
const SECOND: Readonly<Record<string, number>> = { a: 2, b: 2, c: 4, d: 4, e: 0, f: 0, g: 0, h: 3, i: 3, j: 1, k: 1 };

/** What the run publishes next; a test swaps it before a re-run. */
let membership: Readonly<Record<string, number>> = FIRST;

/**
 * An executor that publishes {@link membership} as a community result.
 * @param context - The run.
 * @returns The outcome.
 */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const nodes = Object.entries(membership);
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: nodes.length, edges: 0 },
            nodes: nodes.map(([id, group]) => ({ id, values: { group } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session over the eleven nodes.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    membership = FIRST;
    const made = createGraphSession({ runs: { execute: communities } });
    await made.data.addNodes(Object.keys(FIRST).map((id) => ({ id })));
    return made;
}

/**
 * The hex a node is painted.
 * @param s - The session.
 * @param node - The node.
 * @returns The hex.
 */
function colorOf(s: GraphSession, node: string): string | undefined {
    return (s.styles.explain({ node: node as NodeId }).merged["node.color"] as { hex?: string } | undefined)?.hex;
}

describe("a partition's groups as layers", () => {
    it("adds one folder named for the run with one layer per group, largest on top, painting what one layer would", async () => {
        const plain = await session();
        await plain.runs.start("louvain", {}, { as: "louvain" });
        await plain.styles.settled();

        const s = await session();
        await s.runs.start(
            "louvain",
            {},
            {
                as: "louvain",
                style: { groups: "layers", name: "Louvain", groupName: (group) => `Group ${String(group.rank)}` },
            },
        );
        await s.styles.settled();

        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        assert.strictEqual(folder.name, "Louvain");
        // Bottom first: the smallest group at the bottom, the largest on top.
        assert.deepEqual(
            folder.children.map((row) => row.name),
            ["Group 4", "Group 3", "Group 2", "Group 1"],
        );
        const counts = folder.children.map((row) => s.styles.counts(row.id).matched);
        assert.strictEqual(
            counts.reduce((sum, count) => sum + count, 0),
            11,
        );
        const top = s.styles.get(folder.children[3].id);
        assert.deepEqual(top?.selector, {
            match: "rule",
            where: { kind: "categories", attribute: "results.louvain.group", values: ["0"] },
        });
        for (const node of Object.keys(FIRST)) {
            assert.strictEqual(
                colorOf(s, node),
                colorOf(plain, node),
                `node ${node} is painted as one layer paints it`,
            );
        }
    });

    it("is one step: one undo takes the run, the folder and its layers away", async () => {
        const s = await session();
        const before = s.styles.tree().length;
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();

        await s.undo();
        await s.styles.settled();

        assert.strictEqual(s.styles.tree().length, before);
        assert.isUndefined(s.runs.get("louvain"));
    });

    it("brings the results back with the layers on redo: each group layer matches what it matched before", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();
        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        const before = folder.children.map((row) => [row.id, s.styles.counts(row.id).matched] as const);
        const painted = Object.keys(FIRST).map((node) => colorOf(s, node));

        await s.undo();
        await s.styles.settled();
        await s.redo();
        await s.styles.settled();

        assert.deepEqual(
            before.map(([id]) => [id, s.styles.counts(id).matched] as const),
            before,
            "each group layer matches what it matched before the undo",
        );
        assert.strictEqual(s.runs.get("louvain")?.result?.node("a")?.group, 0, "the values read again");
        assert.deepEqual(
            Object.keys(FIRST).map((node) => colorOf(s, node)),
            painted,
            "and every node is painted as before",
        );
    });

    it("keeps a recolored group's layer on its members after a re-run, and adds a layer for a new group", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();
        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        // The layer of e, f and g's group (1), recolored by hand.
        const efg = folder.children.find((row) => s.styles.counts(row.id).matched === 3 && row.name === "1");
        assert.isDefined(efg);
        await s.styles.update(efg?.id ?? "", { set: { "node.color": "#123456" } });

        // A re-run started without the option, as a Rerun button starts it, keeps the folder whole.
        membership = SECOND;
        await s.runs.start("louvain", {}, { as: "louvain", seed: 7 });
        await s.styles.settled();

        assert.strictEqual(colorOf(s, "e"), "#123456");
        assert.strictEqual(colorOf(s, "g"), "#123456");
        const [after] = s.styles.tree().filter((row) => row.kind === "folder");
        assert.lengthOf(after.children, 5, "a new layer for the new group");
        assert.strictEqual(after.children[0].name, "4", "at the bottom of the folder");
        assert.strictEqual(s.styles.counts(after.children[0].id).matched, 2);
    });

    it("names a re-run's new group with a name no layer has, and names each group's value as its layer", async () => {
        const s = await session();
        const asked: string[][] = [];
        await s.runs.start(
            "louvain",
            {},
            {
                as: "louvain",
                style: {
                    groups: "layers",
                    groupName: ({ rank, taken }) => {
                        asked.push([...taken]);
                        let n = rank;
                        while (taken.includes(`Group ${String(n)}`)) {
                            n += 1;
                        }
                        return `Group ${String(n)}`;
                    },
                },
            },
        );
        await s.styles.settled();
        assert.deepEqual(asked[1], ["Group 1"], "each name sees the names before it");
        assert.strictEqual(s.data.valueLabels("results.louvain.group").get("1"), "Group 2", "e, f and g's group");

        membership = SECOND;
        await s.runs.start("louvain", {}, { as: "louvain", seed: 7 });
        await s.styles.settled();

        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        const names = folder.children.map((row) => row.name);
        assert.lengthOf(new Set(names), names.length, `no two layers share a name: ${names.join(", ")}`);
        // e, f and g are group 0 now: the name followed them.
        assert.strictEqual(s.data.valueLabels("results.louvain.group").get("0"), "Group 2");
        const fresh = folder.children[0];
        assert.strictEqual(s.data.valueLabels("results.louvain.group").get("4"), fresh.name);
        assert.notInclude(
            folder.children.slice(1).map((row) => s.styles.get(row.id)?.set?.["node.color"]),
            s.styles.get(fresh.id)?.set?.["node.color"],
            "the new group takes a colour no group layer holds",
        );
    });

    it("keeps each group's colour from a binding copied into every group layer across a re-run", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();
        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        // Each layer holds one group: its copy keeps that group's colour in its own table.
        await s.styles.updateMany(
            folder.children.map((row) => {
                const selector = s.styles.get(row.id)?.selector;
                const where = selector?.match === "rule" ? selector.where : undefined;
                const value = where?.kind === "categories" ? where.values[0] : "";
                const { bins } = s.styles.preview(
                    { by: "results.louvain.group", scale: "ordinal", palette: "okabe-ito" },
                    { channel: "node.color", within: row.id },
                );
                const paints = bins.find((bin) => bin.count > 0)?.paints as { hex: string };
                return {
                    id: row.id,
                    patch: {
                        set: {},
                        encode: {
                            "node.color": {
                                by: "results.louvain.group",
                                scale: "ordinal",
                                palette: "okabe-ito",
                                map: { [value]: paints.hex },
                            },
                        },
                    },
                };
            }),
        );
        await s.styles.settled();
        const before = Object.keys(FIRST).map((node) => colorOf(s, node));
        assert.lengthOf(
            s.styles.legend().filter((block) => block.channel === "node.color"),
            1,
            "the copies are one block",
        );

        membership = SECOND;
        await s.runs.start("louvain", {}, { as: "louvain", seed: 7 });
        await s.styles.settled();

        for (const [at, node] of Object.keys(FIRST).entries()) {
            if (node !== "c" && node !== "d") {
                assert.strictEqual(colorOf(s, node), before[at], `node ${node} keeps its group's colour`);
            }
        }
    });

    it("gives every group a colour of its own when there are more groups than the palette has colours", async () => {
        const s = createGraphSession({ runs: { execute: communities } });
        membership = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`n${String(i)}`, i]));
        await s.data.addNodes(Object.keys(membership).map((id) => ({ id })));
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();
        const colors = Object.keys(membership).map((node) => colorOf(s, node));
        assert.lengthOf(new Set(colors), 12, colors.join(", "));
        assert.include(
            colors.map((color) => color?.toUpperCase()),
            "#E69F00",
            "the run's categorical palette first, not a ramp picked for twelve groups",
        );
    });

    for (const count of [6, 12]) {
        it(`colors ${String(count)} groups from the first of the consumer's palettes with a color for each`, async () => {
            const s = createGraphSession({ runs: { execute: communities } });
            membership = Object.fromEntries(Array.from({ length: count }, (_, i) => [`n${String(i)}`, i]));
            await s.data.addNodes(Object.keys(membership).map((id) => ({ id })));
            await s.runs.start(
                "louvain",
                {},
                { as: "louvain", style: { groups: "layers", groupPalettes: ["okabe-ito", "kelly"] } },
            );
            await s.styles.settled();
            const expected = count <= 8 ? "okabe-ito" : "kelly";
            const palette = s.catalog.palettes().find((p) => p.id === expected)?.colors ?? [];
            const colors = Object.keys(membership).map((node) => colorOf(s, node)?.toUpperCase());
            assert.lengthOf(new Set(colors), count, colors.join(", "));
            assert.sameMembers(
                colors,
                palette.slice(0, count).map((color) => color.toUpperCase()),
                `${expected}'s first ${String(count)} colors`,
            );
        });
    }

    it("puts the folder of groups back when a deleted folder's run restores its layer", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers", name: "Louvain" } });
        await s.styles.settled();
        const [folder] = s.styles.tree().filter((row) => row.kind === "folder");
        await s.styles.deleteRow(folder.id);
        await s.styles.settled();

        await s.runs.start("louvain", {}, { as: "louvain", restoreLayer: true });
        await s.styles.settled();

        const [back] = s.styles.tree().filter((row) => row.kind === "folder");
        assert.strictEqual(back.name, "Louvain");
        assert.lengthOf(back.children, 4);
    });

    it("takes the folder away with the run", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "louvain", style: { groups: "layers" } });
        await s.styles.settled();

        s.runs.remove("louvain");
        await s.styles.settled();

        assert.lengthOf(
            s.styles.tree().filter((row) => row.kind === "folder"),
            0,
        );
    });
});
