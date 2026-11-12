/**
 * What building a part reads: an ordinary write (the `rest` part, after a settings change) must not
 * pay for a pass over every node or edge, which at 100,000 nodes cost about 70 ms of main thread on
 * every write (test/browser/autosave-write.bench.test.ts).
 */

import { assert, describe, it, vi } from "vitest";

import { buildParts } from "../../src/autosave/parts";
import { graphIdsOf } from "../../src/session/projectFile";
import { baseSession } from "../helpers/project-session";

describe("buildParts", () => {
    it("builds the rest part without reading the graph's ids, unless an edge is selected", async () => {
        const session = await baseSession();
        const snapshot = vi.spyOn(session.data, "snapshot");
        buildParts(session, new Set(["rest"]), new Map(), new Map());
        assert.strictEqual(snapshot.mock.calls.length, 0, "no snapshot read with nothing selected");

        const edge = graphIdsOf(session).edges[1];
        await session.selection.apply({ nodes: [], edges: [edge] });
        snapshot.mockClear();
        const { parts } = buildParts(session, new Set(["rest"]), new Map(), new Map());
        assert.isAbove(snapshot.mock.calls.length, 0, "an edge selection reads the ids");
        const rest = JSON.parse(parts.rest ?? "{}") as { viewState: { selection: { edges: number[] } } };
        assert.deepEqual(rest.viewState.selection.edges, [1], "the selected edge is written by position");
    });
});
