/**
 * @file Loads through the element's own doors and through `session.data` share one line, so they
 * land in the order they were asked for, whichever finishes reading first (issue #3382). The
 * older load here is a network source whose read the test holds until the newer load is asked
 * for; the newer one is inline data, which needs no read.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { defineSource, type Graphty, registerSource } from "../../index.js";

/** The held read of the current test: released by the test, announced when it starts. */
let held: Promise<void> = Promise.resolve();
let readStarted = (): void => undefined;

registerSource(
    defineSource({
        id: "held-element-load",
        descriptor: {
            plainName: "Held",
            params: [{ name: "size", plainName: "Size", type: "number", required: true }],
        },
        async records(params: { size: number }) {
            readStarted();
            await held;
            return { nodes: Array.from({ length: params.size }, (_, i) => ({ id: `n${String(i)}` })) };
        },
    }),
);

/**
 * Hold the next read of the source until the returned release is called.
 * @returns Settles once the read has started, with the release.
 */
function holdRead(): { started: Promise<void>; release: () => void } {
    let release = (): void => undefined;
    held = new Promise<void>((done) => (release = done));
    const started = new Promise<void>((done) => (readStarted = done));
    return { started, release };
}

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [] });

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element connected with no data, once its first update has run.
 * @returns The element.
 */
async function page(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * Settle once the history holds `count` imports and nothing is pending.
 * @param element - The element.
 * @param count - How many import steps to wait for.
 * @returns Settles when it does.
 */
function importsRecorded(element: Graphty, count: number): Promise<void> {
    const { session } = element;
    const done = (): boolean =>
        session.history.pending.length === 0 &&
        session.history.steps.filter((step) => step.ops.includes("data.import")).length >= count;
    if (done()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const off = session.on("history:changed", () => {
            if (done()) {
                off();
                resolve();
            }
        });
    });
}

describe("loads through the element and through session.data that overlap", () => {
    it("keeps a file pair assigned after a network-source pair whose read is still running", async () => {
        const element = await page();
        const { started, release } = holdRead();
        element.setAttribute("data-source", "held-element-load");
        element.setAttribute("data-source-config", JSON.stringify({ size: 5 }));
        await started;
        element.setAttribute("data-source", "json");
        element.setAttribute("data-source-config", JSON.stringify({ data: TRIANGLE }));
        release();
        await importsRecorded(element, 2);
        assert.strictEqual(element.session.data.nodes().length, 3, "the pair assigned last");
        assert.strictEqual(element.session.data.source()?.type, "json");
    });

    it("keeps addDataFromSource called after a session.data source load whose read is still running", async () => {
        const element = await page();
        const { started, release } = holdRead();
        const older = element.session.data.import({ source: "held-element-load", config: { size: 5 } });
        await started;
        const newer = element.addDataFromSource("json", { data: TRIANGLE }, { replace: true });
        release();
        await Promise.all([older, newer]);
        assert.strictEqual(element.session.data.nodes().length, 3, "the load asked for last");
        await element.session.undo();
        assert.strictEqual(element.session.data.nodes().length, 5, "the source landed first, under it");
    });
});
