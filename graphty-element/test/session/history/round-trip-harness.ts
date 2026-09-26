/**
 * @file The round trip every fixture goes through: digest, run, digest, undo, compare with the
 * first, redo, compare with the second. Shared by the session test and its renderer twin, which
 * adds a scene digest.
 *
 * The state digest is `stateDigest` over the dispatcher's project state. The picture digest is
 * what the session derives from it: every element's resolved style and mesh key, and the ids the
 * visibility masks leave showing. Neither includes the positions lane or the arrangement: nothing
 * restores coordinates until phase 16a of design/undo/undo-plan.md, which turns them on.
 */

import { assert } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { ElementSession, GraphSession } from "../../../src/session/types";
import type { RoundTripFixture } from "./fixtures";

/** Every digest of one moment: the state, the picture, and whatever else the caller reads. */
interface Digests {
    readonly state: string;
    readonly picture: string;
    readonly extra: string;
}

/**
 * The picture the session derived: resolved styles and mesh keys by index, and what is visible.
 * @param session - The session.
 * @returns Its canonical text.
 */
export function pictureDigest(session: GraphSession): string {
    // Every session is built as an element session, which is where the paint is read.
    const { paint } = session as ElementSession;
    const snapshot = session.snapshot();
    const painted = (target: "node" | "edge", count: number): unknown[] =>
        Array.from({ length: count }, (_, index) => [
            paint.meshKeyOf(target, index),
            JSON.stringify(paint.styleOf(target, index)),
        ]);

    return JSON.stringify({
        nodes: painted("node", snapshot.nodeCount),
        edges: painted("edge", snapshot.edgeCount),
        visibleNodes: [...session.visibility.nodes].map(String).sort(),
        visibleEdges: [...session.visibility.edges].map(String).sort(),
    });
}

/**
 * Every digest of the session now.
 * @param session - The session.
 * @param extra - A further digest, such as the renderer twin's scene digest.
 * @returns The digests.
 */
function digestsOf(session: GraphSession, extra: () => string): Digests {
    return {
        state: stateDigest(dispatcherOf(session).state),
        picture: pictureDigest(session),
        extra: extra(),
    };
}

/**
 * Run one fixture's round trip, failing on the first digest that does not match.
 * @param session - The session to run it on.
 * @param fixture - The fixture.
 * @param extra - A further digest compared alongside the state and the picture.
 */
export async function roundTrip(
    session: GraphSession,
    fixture: RoundTripFixture,
    extra: () => string = () => "",
): Promise<void> {
    await fixture.before?.(session);
    const steps = session.history.steps.length;
    const before = digestsOf(session, extra);

    await session.execute(fixture.command);
    const after = digestsOf(session, extra);
    assert.strictEqual(session.history.steps.length, steps + 1, `${fixture.name} recorded one step`);
    assert.notStrictEqual(after.state, before.state, `${fixture.name} changed project state`);

    await session.undo();
    assert.deepEqual(digestsOf(session, extra), before, `${fixture.name}: undo restores every digest`);

    await session.redo();
    assert.deepEqual(digestsOf(session, extra), after, `${fixture.name}: redo restores every digest`);
}
