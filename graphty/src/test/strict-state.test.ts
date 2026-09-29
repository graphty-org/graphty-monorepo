/**
 * The app's browser tests run graphty-element with strict state on: extra checks that project
 * state changes only through the element's dispatcher. `setup.ts` turns it on before any test
 * file loads the element. A switch that silently failed to turn on fails here, rather than
 * letting the whole suite pass without the checks.
 */

// Registers the real element.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { waitFor } from "./test-utils";

type StrictGlobals = typeof globalThis & {
    __GRAPHTY_STRICT_STATE__?: unknown;
    __GRAPHTY_STRICT_SWEEP__?: unknown;
};

describe("strict state in the app's tests", () => {
    afterEach(() => {
        document.querySelectorAll("graphty-element").forEach((element) => {
            element.remove();
        });
    });

    it("is on, and the element read it as on when it loaded", () => {
        const scope = globalThis as StrictGlobals;

        assert.strictEqual(scope.__GRAPHTY_STRICT_STATE__, true);
        // The element registers its end-of-test sweep only when it found strict state on at load.
        assert.isFunction(scope.__GRAPHTY_STRICT_SWEEP__);
    });

    it("refuses a write to a node record, on an element the app's tests create", async () => {
        const element = document.createElement("graphty-element");

        document.body.append(element);
        await waitFor(() => {
            assert.isOk(element.session);
        });

        const { session } = element;

        await session.data.addNodes([{ id: "a", tags: { kind: "person" } }]);

        const [record] = session.data.nodes();
        const tags = record.tags as Record<string, unknown>;

        assert.throws(() => {
            tags.kind = "place";
        }, TypeError);
        assert.deepEqual(session.data.node("a")?.tags, { kind: "person" });
    });
});
