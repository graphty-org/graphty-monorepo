/**
 * @file The timeline's attributes behind its experiment: `features` may arrive after them, so
 * they wait for the first render; with the experiment off they are refused and change nothing.
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
 * An element with `edge-time-path` set before its features.
 * @param features - The ids.
 * @returns The element, after its first render.
 */
async function element(features: readonly string[]): Promise<Graphty> {
    const made = document.createElement("graphty-element");
    made.setAttribute("edge-time-path", "sent");
    made.features = features;
    document.body.appendChild(made);
    mounted = made;
    await made.updateComplete;
    return made;
}

describe("the timeline's attributes", () => {
    it("designate the field with the experiment on, whatever the order they arrive in", async () => {
        const made = await element(["timeline"]);
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.start, "sent");
        });
        assert.strictEqual(made.edgeTimePath, "sent");
    });

    it("are refused with the experiment off, and change nothing", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const made = await element([]);

        const refusal = logged.mock.calls.flat().find((each) => (each as { code?: string }).code === "E_FEATURE_OFF");
        assert.deepEqual((refusal as { details?: unknown } | undefined)?.details, {
            feature: "timeline",
            key: "edgeTimePath",
        });
        assert.isUndefined(made.edgeTimePath);
        assert.isNull(made.session.config.data.knownFields.edgeTimePath);
    });
});
