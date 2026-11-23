/**
 * @file A source/target pair a caller hands `addEdges` is checked like a configured one: a
 * malformed expression is refused instead of reading null for every record and leaving every
 * edge out as "missing endpoint".
 */
import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import type { GraphContext } from "../../src/managers/GraphContext";
import { Styles } from "../../src/Styles";

function makeManager(): DataManager {
    const dm = new DataManager(new EventManager(), Styles.default());
    dm.setGraphContext({} as unknown as GraphContext);
    dm.renderLimits = { ceilings: () => undefined, batched: () => true };
    return dm;
}

describe("an endpoint pair declared on addEdges", () => {
    it("refuses a malformed expression with E_OPTION_RANGE", () => {
        const dm = makeManager();
        let thrown: unknown;
        try {
            dm.addEdges([{ from: "a", to: "b" }], { source: "from[", target: "to" });
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown));
        if (!isGraphtyError(thrown)) {
            return;
        }

        assert.strictEqual(thrown.code, "E_OPTION_RANGE");
        assert.strictEqual(thrown.details?.option, "edgeSrcIdPath");
        assert.strictEqual(thrown.details?.value, "from[");
        assert.strictEqual(dm.getSnapshot().edgeCount, 0);
    });

    it("still reads a valid declared pair", () => {
        const dm = makeManager();
        dm.addEdges([{ from: "a", to: "b" }], { source: "from", target: "to" });
        assert.strictEqual(dm.getSnapshot().edgeCount, 1);
    });
});
