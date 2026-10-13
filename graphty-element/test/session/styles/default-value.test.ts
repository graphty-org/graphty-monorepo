/**
 * @file `styles.defaultValue`: what the element draws for a channel no layer writes, on the graph
 * as it is. An edge's head is the catalog's default on a directed graph and none on an undirected one.
 */

import { assert, describe, it } from "vitest";

import { channelDescriptor } from "../../../src/session/styles/channels";
import { makeSession } from "../helpers";

describe("styles.defaultValue", () => {
    it("draws no head on an undirected graph and the catalog's head on a directed one", async () => {
        for (const directed of [true, false]) {
            const { session } = makeSession({ directed });
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            await session.data.addEdges([{ source: "a", target: "b" }]);
            assert.strictEqual(
                session.styles.defaultValue("edge.arrowHead"),
                directed ? channelDescriptor("edge.arrowHead")?.default : "none",
            );
            assert.strictEqual(session.styles.defaultValue("edge.arrowTail"), "none");
            assert.strictEqual(session.styles.defaultValue("node.size"), channelDescriptor("node.size")?.default);
            session.dispose();
        }
    });
});
