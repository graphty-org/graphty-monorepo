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
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const made = await element([]);

        assert.deepEqual(made.refusedFeatures, [
            { code: "E_FEATURE_OFF", params: { feature: "timeline", key: "edgeTimePath" } },
        ]);
        assert.isUndefined(made.edgeTimePath);
        assert.isNull(made.session.config.data.knownFields.edgeTimePath);
    });

    it("are refused when set after the first render with the experiment off", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const made = await element([]);

        made.nodeTimePath = "joined";
        made.nodeTimePath = "joined";

        assert.deepEqual(made.refusedFeatures.at(-1), {
            code: "E_FEATURE_OFF",
            params: { feature: "timeline", key: "nodeTimePath" },
        });
        assert.lengthOf(made.refusedFeatures, 2);
        assert.isUndefined(made.nodeTimePath);
        assert.isNull(made.session.config.data.knownFields.nodeTimePath);
    });

    it("refuses nothing when an attribute is cleared with the experiment off", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const made = await element([]);
        logged.mockClear();

        made.nodeTimePath = undefined;
        made.edgeTimeUnit = "";

        assert.lengthOf(made.refusedFeatures, 1);
        assert.lengthOf(logged.mock.calls, 0);
    });

    it("designate an end column with the experiment on", async () => {
        const made = await element(["timeline"]);
        made.edgeTimeEndPath = "closed";
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.end, "closed");
        });
        assert.strictEqual(made.edgeTimeEndPath, "closed");
    });

    it("refuse an end column with the experiment off, once, writing nothing", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const made = await element([]);

        made.nodeTimeEndPath = "left";

        assert.deepEqual(made.refusedFeatures.at(-1), {
            code: "E_FEATURE_OFF",
            params: { feature: "timeline", key: "nodeTimeEndPath" },
        });
        assert.isNull(made.session.config.data.knownFields.nodeTimeEndPath ?? null);
    });

    it("lists no refusal with the experiment on", async () => {
        const made = await element(["timeline"]);
        assert.deepEqual(made.refusedFeatures, []);
    });

    it("designate the field when set after the first render with the experiment on", async () => {
        const made = await element(["timeline"]);
        made.edgeTimePath = "received";
        await vi.waitFor(() => {
            assert.strictEqual(made.session.time.field?.edges?.start, "received");
        });
    });
});
