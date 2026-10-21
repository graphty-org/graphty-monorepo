/**
 * @file The node models guide's first example (docs/guide/node-models.md), run exactly as a reader
 * copies it: the example file is imported as written, against an element already on the page. Its
 * import of the published package is the element this test already defined, and the model's web
 * address is answered with the sample server's bytes, so the run needs no network.
 */

import { assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { drawnAsModel, mount, nextModelEvent, stubFetch } from "./helpers";

// The example's `import "@graphty/graphty-element"` defines the element; helpers already did.
vi.mock("@graphty/graphty-element", () => ({}));

const RACK = "https://example.com/models/rack.glb";

describe("the node models guide's first example", () => {
    it("draws both servers as the model and leaves alice as her shape", async () => {
        const bytes = new Uint8Array(
            await (await fetch(new URL("../../../assets/models/server.glb", import.meta.url))).arrayBuffer(),
        );
        const element = await mount();
        const requested = stubFetch(new Map([[RACK, bytes]]));
        const drawn = nextModelEvent(element, (change) => change.ref === RACK && change.state === "drawn");

        await import("../../../docs/examples/node-models/servers-as-racks");

        const change = await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.deepEqual(change.problems, []);
        assert.isTrue(drawnAsModel(element.graph, "web"));
        assert.isTrue(drawnAsModel(element.graph, "db"));
        assert.isFalse(drawnAsModel(element.graph, "alice"));
        assert.deepEqual(
            requested.filter((url) => !url.startsWith("blob:")),
            [RACK],
            "the model is fetched once for both nodes",
        );
        const record = await element.session.assets.ready(RACK);
        assert.equal(record.state, "accepted");
    });
});
