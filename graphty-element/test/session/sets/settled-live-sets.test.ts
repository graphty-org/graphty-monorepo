/**
 * @file `styles.settled()` waits for a live set's new membership to be painted: a graph change
 * queues the set's re-resolution for a later frame, and the repaint it asks for (issue #3667).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";

const RED = "#ff0000";

describe("styles.settled() over a layer on a live set", () => {
    it("resolves only once a node that joined the set after a graph change is painted", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", score: 5 },
            { id: "b", score: 1 },
        ]);
        const set = session.sets.create({
            kind: "rule",
            where: { kind: "range", attribute: "data.score", min: 4 },
            reading: "induced",
        });
        await session.styles.add({
            name: "High scores",
            target: "node",
            selector: { match: "member", of: { set } },
            set: { "node.color": RED },
        });
        await session.styles.settled();

        await session.data.addNodes([{ id: "c", score: 9 }]);
        await session.styles.settled();

        const element = session as ElementSession;
        const snapshot = session.data.snapshot();
        const red = Array.from({ length: snapshot.nodeCount }, (_, index) => index)
            .filter((index) => element.paint.styleOf("node", index)["node.color"]?.hex === RED)
            .map((index) => String(snapshot.ids.idOf(index)))
            .sort();
        assert.deepEqual(red, ["a", "c"]);
        session.dispose();
    });
});
