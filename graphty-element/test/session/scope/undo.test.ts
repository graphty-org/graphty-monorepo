/**
 * @file Saved scopes as steps: saving, removing and promoting a selection are each one undoable
 * step, redo puts back the id that was minted, and what state holds is a frozen copy of the
 * specification rather than the caller's own object.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import type { ScopeResolver } from "../../../src/session/scope";
import { makeSession } from "../helpers";

/**
 * A session over a, b and c with a -> b.
 * @returns The session.
 */
function sessionOf(): ReturnType<typeof makeSession>["session"] {
    const harness = makeSession();
    harness.add([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }]);
    return harness.session;
}

/**
 * The code a call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("saved scopes under undo", () => {
    it("brings a save back under the same id on redo", async () => {
        const session = sessionOf();
        const id = session.scope.save("Core", { nodes: ["a", "b"] });

        await session.undo();
        assert.deepEqual(session.scope.list(), []);
        assert.strictEqual(codeOf(() => session.scope.resolve({ set: id })), "E_BAD_COMMAND");

        await session.redo();
        assert.deepEqual(
            session.scope.list().map((saved) => saved.id),
            [id],
        );
        assert.strictEqual((await session.scope.resolve({ set: id })).nodeCount, 2);
        session.dispose();
    });

    it("keeps a copy of the specification, so mutating the caller's object changes nothing", async () => {
        const session = sessionOf();
        const spec = { nodes: ["a", "b"] };
        const id = session.scope.save("Core", spec);

        spec.nodes.push("c");

        const [saved] = session.scope.list();
        assert.deepEqual(saved.spec, { nodes: ["a", "b"] });
        assert.isTrue(Object.isFrozen(saved.spec));
        assert.strictEqual((await session.scope.resolve({ set: id })).nodeCount, 2);
        session.dispose();
    });

    it("answers from the saved scopes at once, not from a cache taken before an undo", async () => {
        const session = sessionOf();
        // The synchronous door the session's resolver has, so no pass can run in between.
        const scope = session.scope as ScopeResolver;
        const id = scope.save("Core", { nodes: ["a"] });
        assert.strictEqual(scope.resolveNow({ set: id }).nodeCount, 1);

        const undone = session.undo();
        assert.strictEqual(codeOf(() => scope.resolveNow({ set: id })), "E_BAD_COMMAND");
        await undone;

        const redone = session.redo();
        assert.strictEqual(scope.resolveNow({ set: id }).nodeCount, 1);
        await redone;
        session.dispose();
    });

    it("puts a removed scope back where it was listed", async () => {
        const session = sessionOf();
        const first = session.scope.save("First", "graph");
        const second = session.scope.save("Second", { nodes: ["a"] });

        session.scope.remove(first);
        assert.deepEqual(
            session.scope.list().map((saved) => saved.id),
            [second],
        );

        await session.undo();
        assert.deepEqual(
            session.scope.list().map((saved) => saved.id),
            [first, second],
        );
        assert.strictEqual(session.history.steps[session.history.position]?.label, 'Removed the scope "First"', "the removal is the step to redo");
        session.dispose();
    });

    it("records a promoted selection as one step, and undo forgets it", async () => {
        const session = sessionOf();
        await session.selection.apply({ nodes: ["a", "c"] });

        const id = session.selection.promote("Picked");

        assert.lengthOf(session.history.steps, 1);
        assert.deepEqual(session.history.steps[0]?.ops, ["scope.save"]);
        await session.undo();
        assert.deepEqual(session.scope.list(), []);
        await session.redo();
        assert.deepEqual(session.scope.list()[0]?.spec, { nodes: ["a", "c"] });
        assert.strictEqual(session.scope.list()[0]?.id, id);
        session.dispose();
    });

    it("mints the same id through execute, and refuses a taken one", async () => {
        const session = sessionOf();

        const id = await session.execute({ op: "scope.save", name: "Core", spec: "graph" });
        assert.strictEqual(id, "set_core");

        const refused = await session.execute({ op: "scope.save", name: "Other", spec: "graph", id }).then(
            () => null,
            (error: unknown) => (isGraphtyError(error) ? error.code : "not-a-graphty-error"),
        );
        assert.strictEqual(refused, "E_DUPLICATE_ID");
        assert.lengthOf(session.history.steps, 1, "a refused save records nothing");
        session.dispose();
    });
});
