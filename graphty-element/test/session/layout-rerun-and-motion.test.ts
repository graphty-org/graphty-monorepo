/**
 * @file `session.layout.rerun()` and `session.layout.motion` on a session with no renderer: there
 * is no layout to run, so a re-run is refused and records nothing, and the motion reads `settled`
 * and is never published. The renderer's side is in `test/browser/simulation-layout-engine.test.ts`
 * and the re-run's round trip in `test/session/history/fixtures.ts`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

describe("re-running the layout and reading its motion without a renderer", () => {
    it("refuses a re-run with E_UNSUPPORTED and records nothing", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.layout.set("circular", { options: { scale: 2 } });
        const steps = session.history.steps.length;

        const refused = await session.layout.rerun().then(
            () => undefined,
            (error: unknown) => error,
        );

        assert.propertyVal(refused, "code", "E_UNSUPPORTED");
        assert.lengthOf(session.history.steps, steps, "no step");
        assert.strictEqual(session.layout.id, "circular");
        assert.deepStrictEqual(session.layout.options, { scale: 2 });
        session.dispose();
    });

    it("reads settled and publishes no motion change", async () => {
        const session = createGraphSession();
        const heard: string[] = [];
        session.on("layout:motion-changed", ({ motion }) => heard.push(motion));
        await session.data.addNodes([{ id: "a" }]);
        await session.layout.set("circular");

        assert.strictEqual(session.layout.motion, "settled");
        assert.deepStrictEqual(heard, []);
        session.dispose();
    });
});
