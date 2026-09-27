/**
 * @file The round trip of every fixture tagged `session`, on a session with no renderer: run it,
 * undo, and every digest matches the one before; redo, and every digest matches the one after.
 */

import { assert, describe, it } from "vitest";

import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";
import { fixtureSession } from "./fixture-session";
import { FIXTURES } from "./fixtures";
import { pictureDigest, roundTrip } from "./round-trip-harness";

describe("round trip per command", () => {
    for (const fixture of FIXTURES.filter((each) => each.tags.includes("session"))) {
        it(fixture.name, async () => {
            const session = await fixtureSession();
            await roundTrip(session, fixture);
            session.dispose();
        });
    }

    it("digests a session the same way twice when nothing changed", () => {
        const session = createElementSession();

        assert.strictEqual(pictureDigest(session), pictureDigest(session));
        assert.strictEqual(stateDigest(dispatcherOf(session).state), stateDigest(dispatcherOf(session).state));
        session.dispose();
    });

    it("filter across a data step: set a filter, remove nodes, undo both, and the masks equal a fresh evaluation of the original filter on the original graph", async () => {
        const shown = (session: GraphSession): string =>
            JSON.stringify([[...session.visibility.nodes].map(String).sort(), [...session.visibility.edges].map(String).sort()]);
        const filter = { kind: "degree", min: 1, max: 1 } as const;
        const fresh = await fixtureSession();
        const unfiltered = shown(fresh);
        await fresh.visibility.set(filter);
        const filtered = shown(fresh);
        fresh.dispose();

        const session = await fixtureSession();
        await session.visibility.set(filter);
        await session.data.removeNodes(["n1"]);
        assert.notStrictEqual(shown(session), filtered, "the removal changed what the filter shows");

        await session.undo();
        assert.strictEqual(shown(session), filtered, "undoing the removal: the filter over the original graph");
        await session.undo();
        assert.strictEqual(shown(session), unfiltered, "undoing the filter too: everything shows");
        session.dispose();
    });

    it.skip("digests the positions lane and the arrangement: nothing restores coordinates until phase 16a", () => {
        // Phase 16a turns on `stateDigest(state, { arrangement: true })` and the lane at rest.
    });
});
