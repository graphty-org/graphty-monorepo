/**
 * An element removed from the page with a Lit update still scheduled: the update runs after the
 * element's session was disposed, and reading the records must not reject from inside Lit.
 */
import "../../index";

import { assert, describe, it } from "vitest";

describe("a removed element", () => {
    it("finishes an update scheduled before it was removed, and reads no records", async () => {
        const element = document.createElement("graphty-element");
        document.body.append(element);
        await element.updateComplete;
        await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);

        // Schedule an update that reads the records, then take the element away before it runs.
        element.nodeData = [{ id: "c" }];
        element.remove();

        assert.isTrue(await element.updateComplete);
        assert.isUndefined(element.nodeData);
    });
});
