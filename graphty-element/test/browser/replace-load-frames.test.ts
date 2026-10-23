/**
 * @file A replacing load lays the graph out again: under a seeded layout it draws the new data as
 * an open of that data does, whatever graph it replaced, and the camera frames it once it settles.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

/**
 * A ring of 20 with two chords, as a links spreadsheet would hold it.
 * @param chord - where the first chord lands.
 * @returns the CSV text.
 */
function csv(chord: number): string {
    const rows = ["source,target"];
    for (let i = 0; i < 20; i++) {
        rows.push(`p${String(i)},p${String((i + 1) % 20)}`);
    }
    rows.push(`p0,p${String(chord)}`, "p5,p15");
    return `${rows.join("\n")}\n`;
}

/**
 * Wait for a few frames.
 * @param ms - how long.
 * @returns settles after the wait.
 */
async function wait(ms = 300): Promise<void> {
    // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
    await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load a CSV through a draft, as an application's import page does, and wait for the new layout
 * to settle (the old one's settlement must not count).
 * @param element - the element.
 * @param data - the CSV text.
 */
async function load(element: Graphty, data: string): Promise<void> {
    const draft = await element.session.data.prepare({ type: "csv", config: { data }, name: "links.csv" });
    await draft.load({ mode: "replace" });
    const layoutManager = element.graph.getLayoutManager();
    for (let tries = 0; tries < 100 && !(layoutManager.isSettled && !layoutManager.running); tries++) {
        // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
        await wait(100);
    }
    await wait();
}

/**
 * Where each node is drawn, rounded.
 * @param element - the element.
 * @returns id to position.
 */
function positions(element: Graphty): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [id, node] of element.graph.getDataManager().nodes) {
        const { x, y, z } = node.mesh.getAbsolutePosition();
        out[String(id)] = [x, y, z].map((value) => value.toFixed(2)).join(",");
    }
    return out;
}

describe("a replacing load", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "600px";
        container.style.height = "400px";
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.replaceChildren();
        container.remove();
    });

    /**
     * Stand up an element with a seeded force layout.
     * @returns the element.
     */
    async function mount(): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.layout = "force";
        element.layoutConfig = { seed: 1 };
        container.appendChild(element);
        await element.updateComplete;
        return element;
    }

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it("draws the new data as opening it does, and frames it", { timeout: 60000 }, async () => {
        const opened = await mount();
        await load(opened, csv(10));
        const expected = positions(opened);
        const openedDistance = opened.graph.getCameraState().cameraDistance ?? 0;
        opened.remove();

        const replaced = await mount();
        await load(replaced, csv(7));
        await load(replaced, csv(10));

        assert.deepStrictEqual(positions(replaced), expected);
        assert.approximately(replaced.graph.getCameraState().cameraDistance ?? 0, openedDistance, 0.5);
    });
});
