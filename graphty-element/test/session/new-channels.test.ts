/**
 * @file The channels that hide an element by style, the bindable looks of a label, and the combine
 * modes of a number write.
 */

import { edgeBetweennessCentrality } from "@graphty/algorithms";
import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { assert, describe, it } from "vitest";

import type { Channel, LayerSpec } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";
import type { ElementSession } from "../../src/session/types";

/**
 * A session holding Les Miserables, each node carrying its degree and each edge its edge
 * betweenness (measured by the algorithms package on the same graph), as data.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    const src = [...sample.src];
    const dst = [...sample.dst];
    const degree = ids.map((_, index) => src.filter((s, e) => s === index || dst[e] === index).length);

    const measuring = createGraphSession();
    await measuring.data.addNodes(ids.map((id) => ({ id })));
    await measuring.data.addEdges(src.map((s, e) => ({ source: ids[s], target: ids[dst[e]] })));
    const { scores } = edgeBetweennessCentrality(measuring.data.snapshot());
    measuring.dispose();

    const session = createGraphSession();
    await session.data.addNodes(ids.map((id, index) => ({ id, degree: degree[index] })));
    await session.data.addEdges(src.map((s, e) => ({ source: ids[s], target: ids[dst[e]], betweenness: scores[e] })));

    return session;
}

/**
 * Repaint every layer, then read one channel for every element of one kind.
 * @param session - The session.
 * @param target - Nodes or edges.
 * @param channel - The channel.
 * @returns What each element is painted, by dense index.
 */
async function painted(session: GraphSession, target: "node" | "edge", channel: Channel): Promise<unknown[]> {
    const element = session as ElementSession;
    await element.paint.repaintAll(element.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    const snapshot = session.data.snapshot();
    const count = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;

    return Array.from({ length: count }, (_, index) => element.paint.styleOf(target, index)[channel]);
}

describe("hiding by style", () => {
    it("hides every edge yet keeps each one counted by selection and statistics", async () => {
        const session = await lesMis();
        const { edgeCount } = session.data.statistics();

        await session.styles.add({
            name: "No lines",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.visible": false },
        });

        const visible = await painted(session, "edge", "edge.visible");
        assert.strictEqual(visible.length, edgeCount);
        assert.isTrue(
            visible.every((value) => value === false),
            "every edge is painted hidden",
        );

        assert.strictEqual(session.data.statistics().edgeCount, edgeCount, "statistics still count them");
        const counted = await session.selection.count({ where: "betweenness >= `0`" });
        assert.strictEqual(counted.edges, edgeCount, "selection still reaches them");
        session.dispose();
    });

    it("is a switch on both kinds, shown by default", () => {
        for (const channel of ["node.visible", "edge.visible"] as const) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].accepts, "boolean");
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].default, true);
        }
    });
});

describe("label looks that vary", () => {
    it("label size bound to degree gives the highest-degree node the largest label", async () => {
        const session = await lesMis();

        await session.styles.add({
            name: "Labels by degree",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "x" },
            encode: { "node.labelSize": { by: "data.degree", range: [12, 96] } },
        });

        const sizes = (await painted(session, "node", "node.labelSize")) as number[];
        const snapshot = session.data.snapshot();
        const degrees = [...snapshot.degree()];
        const top = degrees.indexOf(Math.max(...degrees));

        assert.strictEqual(String(snapshot.ids.idOf(top)), "Valjean");
        assert.strictEqual(sizes[top], Math.max(...sizes), "the highest-degree node has the largest label");
        assert.strictEqual(sizes[top], 96);
        assert.isBelow(Math.min(...sizes), 96, "the sizes vary");
        session.dispose();
    });

    it("exists for node labels, tooltips, edge labels and both captions, as size, text color and background", () => {
        for (const base of ["node.label", "node.tooltip", "edge.label", "edge.arrowHeadText", "edge.arrowTailText"]) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${base}Size` as Channel].accepts, "number", base);
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${base}Color` as Channel].accepts, "color", base);
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${base}Background` as Channel].accepts, "color", base);
        }
    });
});

describe("combine on number writes", () => {
    it("Selected's edge width 'multiply 2' over an edge-betweenness width doubles each edge's beneath value", async () => {
        const session = await lesMis();

        await session.styles.add({
            name: "Edge betweenness",
            target: "edge",
            selector: { match: "everything" },
            encode: { "edge.width": { by: "data.betweenness", range: [1, 8] } },
        });
        const beneath = (await painted(session, "edge", "edge.width")) as number[];

        const selected = await session.styles.add({
            name: "Selected",
            target: "edge",
            selector: { match: "everything" },
            encode: { "edge.width": { value: 2, combine: "multiply" } },
        });
        const doubled = (await painted(session, "edge", "edge.width")) as number[];

        assert.isAbove(new Set(beneath).size, 1, "the widths beneath vary");
        doubled.forEach((width, index) => {
            assert.closeTo(width, beneath[index] * 2, 1e-9, `edge ${String(index)}`);
        });

        await session.styles.update(selected.id, { encode: { "edge.width": { value: 0.5, combine: "add" } } });
        const added = (await painted(session, "edge", "edge.width")) as number[];
        added.forEach((width, index) => {
            assert.closeTo(width, beneath[index] + 0.5, 1e-9, `edge ${String(index)}`);
        });
        session.dispose();
    });

    it("scales the channel's default where nothing beneath painted, and clamps to what it draws", async () => {
        const session = await lesMis();
        await session.styles.add({
            name: "Half again",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.opacity": { value: 5, combine: "multiply" } },
        });

        const opacity = (await painted(session, "node", "node.opacity")) as number[];
        assert.isTrue(
            opacity.every((value) => value === 1),
            "an opacity of 1 times 5 is clamped to 1",
        );
        session.dispose();
    });

    it("refuses a combine on a channel that is not a number", async () => {
        const session = await lesMis();
        const layer: LayerSpec = {
            name: "Bad",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { value: "#ff0000", combine: "multiply" } },
        };

        let refused: unknown = null;
        try {
            await session.styles.add(layer);
        } catch (error) {
            refused = error;
        }

        assert.isTrue(isGraphtyError(refused) && refused.code === "E_BAD_LAYER", String(refused));
        session.dispose();
    });
});
