/**
 * @file Which record keys name an edge's endpoints, and what happens when none of them do.
 *
 * THE BUG THIS EXISTS FOR. The element read two configured paths whose defaults were `src` and
 * `dst`, while its own getting-started guide, installation guide and data-sources guide all taught
 * `source` and `target`. A file written the way the documentation says passed validation, reached
 * the data manager, resolved null against both defaults, and produced a graph with nodes, no edges
 * and no error at all -- while the load event reported the file's full edge count, because that
 * number counted records handed over rather than edges accepted.
 *
 * These cases are about the DECISION. That the decision reaches a real graph is
 * `test/browser/edge-endpoints.test.ts`, which loads through an element rather than stopping at
 * this function.
 */
import { assert, describe, it } from "vitest";

import { resolveEndpoints } from "../../src/data/endpoints";
import { isGraphtyError } from "../../src/errors";

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
        return null;
    } catch (error) {
        return isGraphtyError(error) ? error.code : null;
    }
}

const NOTHING_DECLARED = { source: null, target: null };

describe("choosing which keys name an edge's endpoints", () => {
    it("reads source and target before anything else, because that is what the ecosystem writes", () => {
        const resolved = resolveEndpoints([{ source: "a", target: "b" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.source, "source");
        assert.strictEqual(resolved.target, "target");
        assert.strictEqual(resolved.resolvedFrom, "source/target");
    });

    it("prefers source and target over src and dst when a record carries both", () => {
        // This is the order itself, pinned. The element's default USED to be src/dst while every
        // one of its guides taught source/target, and a graph written the documented way came out
        // with no edges at all.
        const resolved = resolveEndpoints([{ source: "a", target: "b", src: "x", dst: "y" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.resolvedFrom, "source/target");
    });

    it("prefers src and dst over from and to when a record carries both", () => {
        const resolved = resolveEndpoints([{ src: "a", dst: "b", from: "x", to: "y" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.resolvedFrom, "src/dst");
    });

    it("falls back to src and dst, which is what the element's own default used to be", () => {
        const resolved = resolveEndpoints([{ src: "a", dst: "b" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.resolvedFrom, "src/dst");
    });

    it("falls back again to from and to, which is what vis.js writes", () => {
        const resolved = resolveEndpoints([{ from: "a", to: "b" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.resolvedFrom, "from/to");
    });

    it("needs BOTH halves of a pair before it will choose that pair", () => {
        // A record carrying `source` and `to` answers neither pair completely. Choosing on one
        // half would pair a real column with a guessed one and then reject every record.
        const resolved = resolveEndpoints([{ source: "a", to: "b" }, { from: "c", to: "d" }], NOTHING_DECLARED);

        assert.strictEqual(resolved.resolvedFrom, "from/to", "the only pair some record answers in full");
    });

    it("decides once for the whole batch, so a mixed file gets one answer rather than one per record", () => {
        const resolved = resolveEndpoints(
            [
                { from: "a", to: "b" },
                { source: "c", target: "d" },
            ],
            NOTHING_DECLARED,
        );

        // `source`/`target` wins even though the from/to record came first: the probe order is the
        // probe order, and the answer is a property of the batch. Resolving per record would make
        // the answer unreportable and dependent on how the file happened to be written.
        assert.strictEqual(resolved.resolvedFrom, "source/target");
    });

    it("uses a declared pair and never probes against it", () => {
        // Every record here answers `source`/`target` perfectly well. The caller named other
        // columns, and a caller who named the columns has settled the question -- a record that
        // does not answer them is a rejected record, not a reason to guess again.
        const resolved = resolveEndpoints([{ source: "a", target: "b" }], { source: "start", target: "end" });

        assert.strictEqual(resolved.source, "start");
        assert.strictEqual(resolved.target, "end");
        assert.strictEqual(resolved.resolvedFrom, "declared");
    });

    it("treats half a declaration as a declaration, rather than guessing the other half", () => {
        const resolved = resolveEndpoints([{ src: "a", dst: "b" }], { source: "start", target: null });

        assert.strictEqual(resolved.source, "start");
        assert.strictEqual(resolved.resolvedFrom, "declared", "not src/dst, which the records do answer");
    });

    it("refuses a batch no spelling answers, and names the columns the records DO carry", () => {
        let thrown: unknown;
        try {
            resolveEndpoints([{ a: "one", b: "two", weight: 3 }], NOTHING_DECLARED);
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown), "an edgeless graph is a failure, not a quiet success");
        if (!isGraphtyError(thrown)) {
            return;
        }

        assert.strictEqual(thrown.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assert.deepStrictEqual(thrown.details?.columns, ["a", "b", "weight"], "so a reader can see what to name");
    });

    it("says nothing about a batch with no edge records in it at all", () => {
        // A chunked load whose first chunk is all nodes must not fail before the edges arrive.
        assert.isNull(codeOf(() => resolveEndpoints([], NOTHING_DECLARED)));
    });

    it("reads a real JMESPath expression, not only a top-level key", () => {
        const resolved = resolveEndpoints([{ ends: { source: "a", target: "b" } }], {
            source: "ends.source",
            target: "ends.target",
        });

        assert.strictEqual(resolved.source, "ends.source");
        assert.strictEqual(resolved.resolvedFrom, "declared");
    });
});
