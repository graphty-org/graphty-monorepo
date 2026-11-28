/**
 * @file A source/target pair a caller hands an edge add is checked like a configured one: a
 * malformed expression is refused instead of reading null for every record and leaving every
 * edge out as "missing endpoint". Driven through a real headless session's `data.apply` command,
 * whose `add-edges` mutation carries the pair the way a file load or an expansion declares it.
 */
import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session/GraphSession";

describe("an endpoint pair declared on an edge add", () => {
    it("refuses a malformed expression with E_OPTION_RANGE", async () => {
        const session = createGraphSession();
        let thrown: unknown;
        try {
            await session.execute({
                op: "data.apply",
                mutation: { kind: "add-edges", records: [{ from: "a", to: "b" }], source: "from[", target: "to" },
            });
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
        assert.strictEqual(session.status.counts.edges, 0);
        session.dispose();
    });

    it("still reads a valid declared pair", async () => {
        const session = createGraphSession();
        await session.execute({
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ from: "a", to: "b" }], source: "from", target: "to" },
        });
        assert.strictEqual(session.status.counts.edges, 1);
        session.dispose();
    });
});
