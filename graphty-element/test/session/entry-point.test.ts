import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("the ./session entry point", () => {
    it("hands a consumer a working graph with one import and no renderer", () => {
        // This is the whole promise of the entry point: `import { createGraphSession } from
        // "@graphty/graphty-element/session"` in Node, and a graph that answers. The packaging
        // test proves no 3D engine is in the import graph; this one proves the module is useful.
        const session = createGraphSession();

        assert.isFunction(createGraphSession);
        assert.strictEqual(session.status.ready, true);
        assert.strictEqual(session.status.counts.nodes, 0);
        assert.isAbove(session.catalog.algorithms().length, 0);
        assert.strictEqual(session.data.statistics().components.count, 0);
        session.dispose();
    });
});
