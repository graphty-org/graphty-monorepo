/**
 * @file Small facts a style panel reads off the element: the Selected starting row's ring stands
 * off the default background and every default palette color, a legend block says how many
 * elements it paints, a rank binding's block names the rank, the node size descriptor refuses a
 * 0 that hides every node, a label size states its unit, and the layout catalog's descriptions
 * hold no code.
 */

import { assert, describe, it } from "vitest";

import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import { OKABE_ITO_COLORS } from "../../src/config/palettes/categorical";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { CHANNEL_DESCRIPTORS, toColorValue } from "../../src/session/styles/channels";
import { luminance } from "../../src/session/styles/legend";
import { STARTING_SELECTED_LOOK } from "../../src/session/styles/rows";
import { lesMiserables } from "../helpers/les-miserables";

/** The Les Miserables network, read once: the snapshot is frozen, so every test can share it. */
const LES_MISERABLES = await lesMiserables();

/** The element's default background, `whitesmoke`. */
const DEFAULT_BACKGROUND = "#F5F5F5";

/** The dark backgrounds the element's own settings offer (`session/commands/doors.ts`). */
const DARK_BACKGROUNDS = ["#101010", "#202020"];

/** The element's default node color (`config/NodeStyle.ts`). */
const DEFAULT_NODE_COLOR = "#6366F1";

/**
 * The WCAG contrast ratio of two colors.
 * @param a - One color.
 * @param b - The other.
 * @returns The ratio, 1 to 21.
 */
function contrast(a: string, b: string): number {
    const la = luminance(toColorValue(a) ?? { r: 0, g: 0, b: 0 });
    const lb = luminance(toColorValue(b) ?? { r: 0, g: 0, b: 0 });

    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * A degree run over the loaded graph: each node's degree and its rank by degree.
 * @param context - The run.
 * @returns The outcome.
 */
async function degree(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const sample = LES_MISERABLES;
    const ids = sample.ids ?? [];
    const counts = ids.map(() => 0);
    sample.src.forEach((src, e) => {
        counts[src]++;
        counts[sample.dst[e]]++;
    });
    const order = [...counts.keys()].sort((a, b) => counts[b] - counts[a]);
    const field = (name: string, plainName: string): RunOutcome["result"]["fields"][number] => ({
        name,
        plainName,
        technicalName: name,
        kind: "node",
        type: "integer",
        path: `results.${context.runId}.${name}`,
    });

    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [field("value", "Degree"), field("rank", "Rank")],
            measured: { nodes: ids.length, edges: sample.src.length },
            graph: { normalization: "none" },
            nodes: ids.map((id, at) => ({ id, values: { value: counts[at], rank: order.indexOf(at) + 1 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session holding Les Miserables, whose runs are {@link degree}.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const sample = LES_MISERABLES;
    const ids = sample.ids ?? [];
    const session = createGraphSession({ runs: { execute: degree } });
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));

    return session;
}

/**
 * The Selected starting row's layer that paints one kind.
 * @param session - The session, with its starting rows on.
 * @param target - Which kind.
 * @returns The layer.
 */
function selectedPart(session: GraphSession, target: "node" | "edge"): ReturnType<GraphSession["styles"]["get"]> {
    return session.styles.list().find((each) => each.name === "Selected" && each.target === target);
}

describe("the Selected starting row's ring", () => {
    it("is the selection settings' gold, carried by a near-black glow wherever the gold alone is faint", async () => {
        const session = await lesMis();
        await session.config.set({ startingRows: true });
        const set = selectedPart(session, "node")?.set ?? {};
        const ring = set["node.haloColor"] as string;
        const glow = set["node.glow"] as string;

        assert.strictEqual(ring, session.config.selectionStyle.color, "the yellow highlight readers expect");
        assert.strictEqual(ring, "#FFD700");
        assert.strictEqual(glow, STARTING_SELECTED_LOOK.glow);
        assert.strictEqual(set["node.haloOpacity"], 1, "solid, so the ring is the color measured");
        const band = selectedPart(session, "edge")?.set?.["edge.bandColor"] as string;
        assert.strictEqual(band, session.config.selectionStyle.edgeColor);
        for (const background of [DEFAULT_BACKGROUND, ...DARK_BACKGROUNDS]) {
            assert.isAtLeast(
                Math.max(contrast(ring, background), contrast(glow, background)),
                3,
                `ring on ${background}`,
            );
            assert.isAtLeast(contrast(band, background), 3, `band on ${background}`);
        }
        for (const background of DARK_BACKGROUNDS) {
            assert.isAtLeast(contrast(ring, background), 3, `the gold alone on ${background}`);
        }
        // The halo is what touches a black node (a route's): the glow is the same dark as the node.
        assert.isAtLeast(contrast(ring, "#000000"), 3, "ring on a black node");
        for (const color of [...OKABE_ITO_COLORS, DEFAULT_NODE_COLOR, "#000000"]) {
            assert.isAtLeast(Math.max(contrast(ring, color), contrast(glow, color)), 3, color);
        }
        session.dispose();
    });
});

describe("a legend block's painted count", () => {
    it("is 0 for the Selected row with nothing selected, and counts the selection once there is one", async () => {
        const session = await lesMis();
        await session.config.set({ startingRows: true });
        const id = selectedPart(session, "node")?.id;
        const halo = (): number | undefined =>
            session.styles.legend().find((block) => block.layerId === id && block.channel === "node.haloColor")
                ?.painted;

        assert.strictEqual(halo(), 0);
        await session.selection.apply({ ids: ["Valjean", "Javert"] });
        await session.styles.settled();
        assert.strictEqual(halo(), 2);
        session.dispose();
    });
});

describe("a rank binding's legend block", () => {
    it("names the rank field of the degree run, not degree itself", async () => {
        const session = await lesMis();
        const run = session.runs.start("degree", {}, { as: "deg", style: false });
        await run;
        const layer = await session.styles.add({
            name: "Degree",
            target: "node",
            selector: { match: "has", path: "results.deg.rank" },
            encode: { "node.size": { by: "results.deg.rank", range: [1, 3] } },
        });
        await session.styles.settled();
        const block = session.styles.legendOf(layer.id).find((entry) => entry.channel === "node.size");

        assert.strictEqual(block?.field?.path, "results.deg.rank");
        assert.deepStrictEqual(block?.field?.result, { algorithm: "degree", field: "rank" });
        assert.strictEqual(block?.field?.technicalName, "rank");
        assert.strictEqual(block?.painted, 77);
        session.dispose();
    });
});

describe("channel descriptors", () => {
    it("refuse a node size of 0 and state a label size's unit", () => {
        const size = CHANNEL_DESCRIPTORS["node.size"];
        assert.strictEqual(size.min, 0);
        assert.isTrue(size.exclusiveMin, "a node of size 0 draws nothing, so 0 is refused");

        for (const channel of ["node.labelSize", "edge.labelSize", "node.tooltipSize"] as const) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].perWorldUnit, 48, channel);
        }
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.opacity"].perWorldUnit);
    });
});

describe("the layout catalog", () => {
    it("describes every layout in words, with no code in them", () => {
        for (const entry of LAYOUT_CATALOG) {
            assert.notInclude(entry.descriptor.description, "`", entry.descriptor.id);
        }
    });
});
