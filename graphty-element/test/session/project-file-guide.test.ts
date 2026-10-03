/**
 * @file The runnable examples of the "Project Files" guide (`docs/guide/project-file.md`), kept
 * here so the documented code keeps working. Each test is the guide's code on a standalone
 * session, with its comments turned into assertions; the guide reaches the same session as
 * `element.session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, isGraphtyError } from "../../session";

describe("the project file guide's examples", () => {
    it("the quick start: save, open, and read the report", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
        await session.data.addEdges([{ src: "ada", dst: "grace" }]);

        // Save the whole session as one file, with your own app's state beside it
        const file = await session.project.save({ name: "Pioneers", app: { panel: "values" } });

        // ...later, or in another element: open it again
        const later = createGraphSession();
        const report = await later.project.open(file);
        assert.strictEqual(report.name, "Pioneers");
        assert.deepEqual(report.app, { panel: "values" });
        assert.deepEqual(report.missing, []);
        assert.deepEqual(later.data.nodes(), session.data.nodes());
        assert.strictEqual(later.data.edges().length, 1);

        // open is one undoable step
        await later.undo();
        assert.strictEqual(later.data.nodes().length, 0);

        session.dispose();
        later.dispose();
    });

    it("name and unsaved changes", async () => {
        const session = createGraphSession();
        await session.project.save({ name: "Pioneers" });
        assert.strictEqual(session.project.name, "Pioneers");
        assert.isFalse(session.project.dirty);

        let heard = 0;
        session.on("project:changed", () => {
            heard++;
        });
        await session.data.addNodes([{ id: "linus" }]);
        assert.isTrue(session.project.dirty);
        assert.isAbove(heard, 0);

        session.project.name = "Pioneers 2";
        assert.strictEqual(session.project.toDocument().name, "Pioneers 2");
        session.dispose();
    });

    it("refuses a file a newer element wrote", async () => {
        const session = createGraphSession();
        try {
            await session.project.open(JSON.stringify({ format: "graphty-project", version: 99 }));
            assert.fail("a newer file must be refused");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNSUPPORTED_VERSION");
        }

        session.dispose();
    });
});
