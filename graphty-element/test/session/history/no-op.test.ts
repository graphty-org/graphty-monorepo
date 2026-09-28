/**
 * @file A command or a transaction that leaves the project as it found it records no step, so
 * the reader never presses Undo and sees nothing happen.
 */

import { assert, describe, it } from "vitest";

import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";

/**
 * Check an action changes nothing and records nothing.
 * @param session - The session.
 * @param what - The action, for messages.
 * @param act - The action.
 */
async function recordsNothing(session: GraphSession, what: string, act: () => PromiseLike<unknown>): Promise<void> {
    const before = stateDigest(dispatcherOf(session).state);
    const steps = session.history.steps.map((step) => step.label);
    await act();
    assert.strictEqual(stateDigest(dispatcherOf(session).state), before, `${what}: the state`);
    assert.deepEqual(
        session.history.steps.map((step) => step.label),
        steps,
        `${what}: the steps`,
    );
}

describe("a change that changes nothing", () => {
    it("records no step for a setting written with the value it already reads as", async () => {
        const session = createElementSession();
        await recordsNothing(session, "the default of an unset setting", () =>
            session.config.set({ runAlgorithmsOnLoad: false, layoutBehavior: { preSteps: 0 } }),
        );

        await session.config.set({ layoutBehavior: { preSteps: 20 } });
        assert.lengthOf(session.history.steps, 1);
        session.history.clear();
        await recordsNothing(session, "the value a set setting holds", () =>
            session.config.set({ layoutBehavior: { preSteps: 20 } }),
        );
        session.dispose();
    });

    it("records no step for a style edit that leaves every layer as it was", async () => {
        const session = createElementSession();
        const layer = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        session.history.clear();

        await recordsNothing(session, "an empty update", () => session.styles.update(layer.id, {}));
        await recordsNothing(session, "a transaction of an empty update", () =>
            session.transaction("Nothing", async (tx) => {
                await tx.styles.update(layer.id, {});
            }),
        );
        session.dispose();
    });
});
