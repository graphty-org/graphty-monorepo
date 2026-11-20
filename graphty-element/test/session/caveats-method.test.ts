/**
 * @file A run's `caveats.method` is an identifier an application can name, never the catalog's
 * English name for the algorithm.
 */

import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import { createGraphSession } from "../../src/session";

describe("caveats.method", () => {
    it("is the algorithm's key in a plan, not its technical name", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const plan = await session.plan({ op: "algo.run", algorithm: "bfs", params: { source: "a" } });
        assert.isTrue(plan.ok);
        assert.strictEqual(plan.caveats?.method, "bfs");
        assert.notStrictEqual(plan.caveats?.method, algorithmByKey("bfs")?.technicalName);
        session.dispose();
    });
});
