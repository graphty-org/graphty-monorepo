/**
 * @file The round trip of every fixture tagged `session`, on a session with no renderer: run it,
 * undo, and every digest matches the one before; redo, and every digest matches the one after.
 */

import { assert, describe, it } from "vitest";

import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
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

    it.skip("digests the positions lane and the arrangement: nothing restores coordinates until phase 16a", () => {
        // Phase 16a turns on `stateDigest(state, { arrangement: true })` and the lane at rest.
    });
});
