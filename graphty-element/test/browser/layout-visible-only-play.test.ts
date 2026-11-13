/**
 * @file `behavior.layout.visibleOnlyWhilePlaying`: what a layout over only what the filter shows
 * does while time plays and the moving window changes what is shown at every step. "hold", the
 * default, lays nothing out during the play and lays out once at the pause; "follow" lays out
 * again during the play.
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
     * An element laying out only what its two-step time window shows, with its layouts counted.
     * @param whilePlaying - The behaviour while time plays, or undefined for the default.
     * @returns The element and a reader of how many layouts ran since it was ready.
     */
    async function element(whilePlaying?: "hold" | "follow"): Promise<{ made: Graphty; layouts: () => number }> {
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
        made.graph.setLayoutBehavior({
            layout:
                whilePlaying === undefined
                    ? { visibleOnly: true }
                    : { visibleOnly: true, visibleOnlyWhilePlaying: whilePlaying },
        });
        await made.session.time.window({ from: 0, to: 2, step: 1 });
        await made.waitForSettled();

        let count = 0;
        made.graph.addListener("layout-changed", () => {
            count++;
        });
        return { made, layouts: () => count };
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

    it("holds the layout while time plays by default, and lays out once at the pause", async () => {
        const { made, layouts } = await element();
        const shownBefore = [...made.session.visibility.nodes];

        made.session.time.play({ motion: "steps", interval: 0, loop: true });
        await steps(made, 5);
        assert.notDeepEqual([...made.session.visibility.nodes], shownBefore, "the play moved the filter");
        assert.strictEqual(layouts(), 0, "no layout while time plays");

        made.session.time.pause();
        await made.waitForSettled();
        assert.strictEqual(layouts(), 1, "one layout over what the pause shows");
    });

    it("lays out again while time plays under follow", async () => {
        const { made, layouts } = await element("follow");

        made.session.time.play({ motion: "steps", interval: 0, loop: true });
        await vi.waitUntil(() => layouts() > 0);
        assert.isTrue(made.session.time.playing, "the layout ran while time was still playing");
    });
});
