/**
 * @file `session.layout.set` on a session with no renderer refuses a layout id or engine the
 * catalog does not know with `E_UNKNOWN_LAYOUT`, as the renderer's layout manager does, and
 * changes nothing (#9653).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

/**
 * The rejection a promise settles with.
 * @param promise - The promise.
 * @returns The error, or undefined when it resolved.
 */
async function refusal(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => undefined,
        (error: unknown) => error,
    );
}

describe("an unknown layout on a session with no renderer", () => {
    it("refuses an unknown id and an unknown engine, and records nothing", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.layout.set("circular");
        const steps = session.history.steps.length;

        const byId = await refusal(session.layout.set("nonexistent_layout_xyz"));
        assert.propertyVal(byId, "code", "E_UNKNOWN_LAYOUT");
        assert.include((byId as { details: { available: string[] } }).details.available, "ngraph");

        const byEngine = await refusal(session.layout.set("force", { engine: "nonexistent_engine_xyz" }));
        assert.propertyVal(byEngine, "code", "E_UNKNOWN_LAYOUT");

        assert.lengthOf(session.history.steps, steps, "no step");
        assert.strictEqual(session.layout.id, "circular");
        session.dispose();
    });

    it("still takes a catalog id, an engine name, a deprecated name and an id in the engine slot", async () => {
        const session = createGraphSession();
        await session.layout.set("ngraph");
        assert.strictEqual(session.layout.id, "force");
        await session.layout.set("force-2d");
        assert.strictEqual(session.layout.engine, "arf");
        await session.layout.set("force", { engine: "d3" });
        assert.strictEqual(session.layout.engine, "d3");
        // `setLayout("force")` names the layout id as its engine too.
        await session.layout.set("force", { engine: "force" });
        assert.strictEqual(session.layout.id, "force");
        await session.layout.set("force", { engine: "force-2d" });
        assert.strictEqual(session.layout.id, "force");
        session.dispose();
    });
});
