/**
 * @file The time window never moves a layout over only what is shown (owner rule 2026-11-12: "the
 * layout shouldn't change because of the nodes that are / aren't visible due to the timeline"):
 * the working graph is built from the filters alone, so a window step, a play and its pause lay
 * nothing out, while a filter change still does.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { setDefaultFeatures } from "../../src/features/resolve";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/** Twenty nodes, node i timed i, on a path. */
const COUNT = 20;

describe("a layout over only what the filter shows while time plays", () => {
    let mounted: Graphty | null = null;

    afterEach(() => {
        if (mounted?.session.time.playing === true) {
            mounted.session.time.pause();
        }

        mounted?.remove();
        mounted = null;
    });

    /**
     * An element laying out only what is shown, with a two-step time window and its layouts counted.
     * @param visibleOnly - `layout.visibleOnly`, or undefined to follow the working graph (on by default).
     * @returns The element and a reader of how many layouts ran since it was ready.
     */
    async function element(visibleOnly?: boolean): Promise<{ made: Graphty; layouts: () => number }> {
        const made = document.createElement("graphty-element");
        made.style.width = "400px";
        made.style.height = "300px";
        made.style.display = "block";
        made.setAttribute("node-time-path", "t");
        document.body.appendChild(made);
        mounted = made;
        await made.updateComplete;
        await vi.waitFor(() => {
            assert.isTrue(made.graph.initialized, "the element initialised its graph");
        });
        await made.graph.setLayout("circular", { dim: 2 });
        made.dataSource = "json";
        made.dataSourceConfig = {
            data: JSON.stringify({
                nodes: Array.from({ length: COUNT }, (_, at) => ({ id: `n${String(at)}`, t: at })),
                edges: Array.from({ length: COUNT - 1 }, (_, at) => ({
                    src: `n${String(at)}`,
                    dst: `n${String(at + 1)}`,
                })),
            }),
        };
        await made.waitForSettled();
        await made.session.time.ready;
        if (visibleOnly !== undefined) {
            made.graph.setLayoutBehavior({ layout: { visibleOnly } });
            await made.waitForSettled();
        }

        let count = 0;
        made.graph.addListener("layout-changed", () => {
            count++;
        });
        return { made, layouts: () => count };
    }

    /**
     * Where a node is now, from the shared positions array.
     * @param on - The element.
     * @param id - The node.
     * @returns Its x, y and z.
     */
    function placeOf(on: Graphty, id: string): [number, number, number] {
        const row = on.session.data.snapshot().ids.indexOf(id);
        const at = { x: 0, y: 0, z: 0 };
        on.session.positions.read(row, at);
        return [at.x, at.y, at.z];
    }

    /**
     * Settles once the play has taken more steps.
     * @param on - The element.
     * @param count - How many.
     */
    async function steps(on: Graphty, count: number): Promise<void> {
        await new Promise<void>((resolve) => {
            let seen = 0;
            const off = on.session.on("time:step", () => {
                seen++;
                if (seen === count) {
                    off();
                    resolve();
                }
            });
        });
    }

    it.each([
        ["visibleOnly true", true],
        ["the working graph default", undefined],
    ] as const)("lays nothing out for a window step, a play or its pause under %s", async (_name, visibleOnly) => {
        const { made, layouts } = await element(visibleOnly);
        const placed = placeOf(made, "n15");

        await made.session.time.window({ from: 0, to: 2, step: 1 });
        await made.waitForSettled();
        assert.strictEqual(layouts(), 0, "a window step lays nothing out");

        const shownBefore = [...made.session.visibility.nodes];
        made.session.time.play({ motion: "steps", interval: 0, loop: true });
        await steps(made, 5);
        assert.notDeepEqual([...made.session.visibility.nodes], shownBefore, "the play moved the window");
        made.session.time.pause();
        await made.waitForSettled();

        assert.strictEqual(layouts(), 0, "neither the play nor its pause laid anything out");
        assert.deepEqual(placeOf(made, "n15"), placed, "a node the window hid kept its place");
    });

    it("still lays out again when a filter changes what is shown", async () => {
        const { made, layouts } = await element(true);
        await made.session.time.window({ from: 0, to: 2, step: 1 });
        await made.waitForSettled();

        await made.session.visibility.set({ kind: "member", of: { nodes: ["n0", "n1", "n2", "n3"] } });
        await made.waitForSettled();
        assert.isAbove(layouts(), 0, "the filter change laid the shown nodes out again");
    });
});
