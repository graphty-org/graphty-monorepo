/**
 * @file The timeline's attributes: set before the first render, they wait for it, then designate
 * the time field.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
    vi.restoreAllMocks();
});

/**
 * An element with `edge-time-path` set before its first render.
 * @returns The element, after its first render.
 */
async function element(): Promise<Graphty> {
    const made = document.createElement("graphty-element");
    made.setAttribute("edge-time-path", "sent");
    document.body.appendChild(made);
    mounted = made;
    await made.updateComplete;
    return made;
}

describe("the timeline's attributes", () => {
    it("designate the field, whatever the order they arrive in", async () => {
        const made = await element();
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.start, "sent");
        });
        assert.strictEqual(made.edgeTimePath, "sent");
    });

    it("designate an end column", async () => {
        const made = await element();
        made.edgeTimeEndPath = "closed";
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.end, "closed");
        });
        assert.strictEqual(made.edgeTimeEndPath, "closed");
    });

    it("lists no refusal", async () => {
        const made = await element();
        assert.deepEqual(made.refusedFeatures, []);
    });

    it("designate the field when set after the first render", async () => {
        const made = await element();
        made.edgeTimePath = "received";
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.start, "received");
        });
    });
});
