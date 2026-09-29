/**
 * @file The published history members on a fresh session: nothing to undo or redo, an empty
 * history, and a transaction that writes nothing records nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import type { SessionEventMap } from "../../../src/session/types";

describe("session history API", () => {
    it("starts with nothing to undo or redo", async () => {
        const session = createGraphSession();

        assert.isFalse(session.canUndo);
        assert.isFalse(session.canRedo);
        assert.deepEqual(await session.undo(), { kind: "nothing" });
        assert.deepEqual(await session.redo(), { kind: "nothing" });
        assert.deepEqual(session.history.steps, []);
        assert.deepEqual(session.history.pending, []);
        assert.isNull(session.history.nextUndo);
        assert.strictEqual(session.history.position, 0);
        assert.strictEqual(session.history.bytes, 0);
        session.dispose();
    });

    it("hands back the identical frozen arrays between changes", () => {
        const session = createGraphSession();

        assert.strictEqual(session.history.steps, session.history.steps);
        assert.strictEqual(session.history.pending, session.history.pending);
        assert.isTrue(Object.isFrozen(session.history.steps));
        session.dispose();
    });

    it("records nothing for a transaction that writes nothing, and returns what its body returned", async () => {
        const session = createGraphSession();
        const reasons: SessionEventMap["history:changed"]["reason"][] = [];
        session.on("history:changed", ({ reason }) => reasons.push(reason));

        const result = await session.transaction("Nothing", () => 7);

        assert.strictEqual(result, 7);
        assert.deepEqual(session.history.steps, []);
        assert.isFalse(session.canUndo);
        // Opening and closing the transaction moved the pending list, and nothing else.
        assert.isTrue(reasons.every((reason) => reason === "pending"));
        assert.strictEqual(session.history.version, reasons.length);
        session.dispose();
    });

    it("rethrows what a transaction's body threw", async () => {
        const session = createGraphSession();

        let caught: unknown;
        try {
            await session.transaction("Fails", () => {
                throw new Error("boom");
            });
        } catch (error) {
            caught = error;
        }

        assert.instanceOf(caught, Error);
        assert.strictEqual(caught.message, "boom");
        assert.deepEqual(session.history.steps, []);
        session.dispose();
    });

    it("keeps the budget settable", () => {
        const session = createGraphSession();

        session.history.limitSteps = 5;
        session.history.limitBytes = 1024;

        assert.strictEqual(session.history.limitSteps, 5);
        assert.strictEqual(session.history.limitBytes, 1024);
        session.dispose();
    });

    it("rejects an op outside the vocabulary with E_BAD_COMMAND", async () => {
        const session = createGraphSession();

        let caught: unknown;
        try {
            await (session.execute as (command: { op: string }) => Promise<unknown>)({ op: "no.such-op" });
        } catch (error) {
            caught = error;
        }

        assert.strictEqual((caught as { code?: string }).code, "E_BAD_COMMAND");
        session.dispose();
    });

    it("starts a run for algo.run and hands back its handle, not a promise of the result", () => {
        const session = createGraphSession();

        const run = session.execute({ op: "algo.run", algorithm: "degree" });

        assert.isString(run.id);
        assert.isFunction(run.cancel);
        run.cancel();
        session.dispose();
    });
});
