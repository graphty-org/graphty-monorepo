/**
 * @file A malformed argument to an element-level data door (`addNodes`, `addEdges`, `updateNodes`,
 * `updateEdges`, `removeNodes`, `removeEdges` on `<graphty-element>`) is refused with a
 * `GraphtyError` coded `E_BAD_COMMAND`, never a plain TypeError, and a well-formed one still works
 * (issue #5504). The session doors are in `test/session/data-door-arguments.test.ts`.
 */

import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { GraphtyError } from "../../src/errors/GraphtyError";
import { operationQueueOf } from "../../src/Graph";

/**
 * Hand a door the wrong shape on purpose.
 * @param value - The malformed value.
 * @returns The value, typed to fit any argument.
 */
const BAD = (value: unknown): never => value as never;

describe("a malformed argument to an element data door", () => {
    let element: Graphty;

    beforeAll(async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "300px";
        element.style.height = "200px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.addNodes([{ id: "a" }, { id: "b" }]);
        await element.addEdges([{ source: "a", target: "b" }]);
    });

    afterAll(() => {
        element.remove();
    });

    /**
     * Assert a call is refused with `E_BAD_COMMAND`, leaving the graph as it was.
     * @param call - The malformed call.
     */
    async function refused(call: () => Promise<unknown>): Promise<void> {
        const counts = { ...element.session.status.counts };
        const error: unknown = await call().then(
            () => null,
            (thrown: unknown) => thrown,
        );
        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(element.session.status.counts.nodes, counts.nodes);
        assert.strictEqual(element.session.status.counts.edges, counts.edges);
    }

    it("refuses each malformed call with E_BAD_COMMAND", async () => {
        await refused(() => element.addNodes([BAD(null)]));
        await refused(() => element.addNodes(BAD({ id: "c" })));
        await refused(() => element.addEdges([BAD(null)]));
        await refused(() => element.updateNodes([BAD(null)]));
        await refused(() => element.updateNodes(BAD({ id: "a" })));
        await refused(() => element.updateNodes([BAD({ group: 1 })]));
        await refused(() => element.updateEdges([BAD(null)]));
        await refused(() => element.removeNodes([BAD({})]));
        await refused(() => element.removeEdges(BAD(null)));
    });

    it("still takes a well-formed call at every door", async () => {
        await element.updateNodes([{ id: "a", group: 1 }]);
        assert.strictEqual(element.session.data.node("a")?.group, 1);
        await element.updateEdges([{ id: "0", kind: "x" }]);
        assert.strictEqual(element.session.data.edge("0")?.kind, "x");
        await element.addNodes([{ id: "c" }]);
        await element.addEdges([{ source: "b", target: "c" }]);
        assert.strictEqual(element.session.status.counts.edges, 2);
        await element.removeEdges(["0"]);
        await element.removeNodes(["c"]);
        assert.strictEqual(element.session.status.counts.nodes, 2);
        assert.strictEqual(element.session.status.counts.edges, 0);
    });
});
