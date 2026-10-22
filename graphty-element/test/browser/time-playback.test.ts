/**
 * @file Playing the timeline on a real element: the designated field comes from the
 * `edge-time-path` attribute, playback advances the window step by step, and after every step the
 * drawn nodes and edges are the ones the masks say are visible.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { TimeStepEvent } from "../../session.js";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Emails along a line, one a day: a sends to b on the 1st, b to c on the 2nd, and so on. */
const EMAILS = JSON.stringify({
    nodes: ["a", "b", "c", "d", "e"].map((id) => ({ id })),
    edges: [
        { src: "a", dst: "b", sent: "2026-01-01T09:00:00Z" },
        { src: "b", dst: "c", sent: "2026-01-02T09:00:00Z" },
        { src: "c", dst: "d", sent: "2026-01-03T09:00:00Z" },
        { src: "d", dst: "e", sent: "2026-01-04T09:00:00Z" },
    ],
});

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Assert every node and edge is drawn as the session's visibility says.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
function assertDrawnAsVisible(element: Graphty, when: string): void {
    const { visibility } = element.session;
    const dm = element.graph.getDataManager();
    for (const node of dm.nodes.values()) {
        assert.strictEqual(node.mesh.isEnabled(), visibility.isVisible(node.id), `${when}: node ${String(node.id)}`);
    }

    for (const edge of dm.edges.values()) {
        assert.strictEqual(edge.isRenderVisible(), visibility.isVisible(edge.id), `${when}: edge ${edge.id}`);
    }
}

describe("session.time playback on the element", () => {
    it("steps a one-day window across the data and draws only what each step leaves", async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.setAttribute("edge-time-path", "sent");
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        await vi.waitFor(() => {
            assert.isTrue(element.graph.initialized, "the element initialised its graph");
        });
        await element.graph.setLayout("random");
        element.dataSource = "json";
        element.dataSourceConfig = { data: EMAILS };
        await element.waitForSettled();

        const { time } = element.session;
        await time.ready;
        assert.deepStrictEqual(time.field, { edges: { start: "sent" } });
        assert.strictEqual(time.extent()?.from, T0 + 9 * 3_600_000);

        await time.window({ from: T0, to: T0 + DAY, step: "day" });
        await element.waitForSettled();
        await element.waitForStableFrame();
        assert.deepStrictEqual([...element.session.visibility.nodes].map(String).sort(), ["a", "b"]);
        assertDrawnAsVisible(element, "the first day");

        const steps: TimeStepEvent[] = [];
        const drawnAfterStep: string[][] = [];
        element.session.on("time:step", (step) => {
            steps.push(step);
            drawnAfterStep.push([...element.session.visibility.nodes].map(String).sort());
        });
        await new Promise<void>((resolve) => {
            const off = element.session.on("time:end", () => {
                off();
                resolve();
            });
            time.play({ interval: 0 });
        });
        await element.waitForSettled();
        await element.waitForStableFrame();

        assert.deepStrictEqual(
            steps.map((step) => step.from),
            [T0 + DAY, T0 + 2 * DAY, T0 + 3 * DAY],
        );
        assert.deepStrictEqual(drawnAfterStep, [
            ["b", "c"],
            ["c", "d"],
            ["d", "e"],
        ]);
        assert.isFalse(time.playing);
        assertDrawnAsVisible(element, "the last day");

        await element.session.undo();
        await element.waitForSettled();
        await element.waitForStableFrame();
        assert.strictEqual(element.session.visibility.window?.from, T0, "one undo returns to before the play");
        assertDrawnAsVisible(element, "after undo");
    });
});
