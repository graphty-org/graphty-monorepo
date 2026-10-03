/**
 * @file The runnable examples of the "Project Files" guide (`docs/guide/project-file.md`) that need
 * no page, kept here so the documented code keeps working. Each test is the guide's code on a
 * standalone session, with its comments turned into assertions. The quick start, which needs a
 * page, runs in `test/browser/project-file.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, isGraphtyError } from "../../session";

describe("the project file guide's examples", () => {
    it("saving without a download, and opening the text in another session", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
        await session.data.addEdges([{ src: "ada", dst: "grace" }]);

        const { text, report } = await session.project.save({
            extensions: { "com.example.app": { panel: "values" } },
        });
        assert.strictEqual(report.bytes, new TextEncoder().encode(text).length);
        assert.include(report.written, "graphty-data");
        assert.deepEqual(report.leftOut, []);

        const later = createGraphSession();
        const opened = await later.project.open(text);
        assert.strictEqual(opened.opened, "project");
        assert.deepEqual(opened.problems, []);
        assert.deepEqual(opened.extensions, { "com.example.app": { panel: "values" } });
        assert.deepEqual(later.data.nodes(), session.data.nodes());
        assert.strictEqual(later.data.edges().length, 1);

        session.dispose();
        later.dispose();
    });

    it("the name and unsaved changes", async () => {
        const session = createGraphSession();
        await session.project.rename("Pioneers"); // one undoable step; sets dirty
        assert.strictEqual(session.project.name, "Pioneers");
        assert.isTrue(session.project.dirty);
        await session.undo(); // the old name again
        assert.isNull(session.project.name);

        const later = createGraphSession();
        await later.project.open(JSON.stringify(JSON.parse((await session.project.save()).text)), {
            fileName: "Pioneers.graphty.json",
        });
        assert.strictEqual(later.project.name, "Pioneers", "a file with no name takes the file's name");
        session.dispose();
        later.dispose();
    });

    it("catching the unsaved-changes refusal", async () => {
        const session = createGraphSession();
        const file = (await session.project.save()).text;
        await session.project.rename("Draft");
        let asked = false;
        try {
            await session.project.open(file);
        } catch (error) {
            if (isGraphtyError(error) && error.code === "E_UNSAVED_CHANGES") {
                asked = true;
                await session.project.open(file, { discard: true });
            } else {
                throw error;
            }
        }

        assert.isTrue(asked, "opening over unsaved changes is refused");
        assert.isFalse(session.project.dirty);
        session.dispose();
    });

    it("project:status does not fire at startup, and on() returns a stop function", async () => {
        const session = createGraphSession();
        const seen: boolean[] = [];
        const stop = session.on("project:status", ({ dirty }) => seen.push(dirty));
        assert.deepEqual(seen, []);
        await session.project.rename("Pioneers");
        stop();
        await session.undo();
        assert.deepEqual(seen, [true]);
        session.dispose();
    });

    it("refuses a file a newer element wrote", async () => {
        const session = createGraphSession();
        try {
            await session.project.open(JSON.stringify({ kind: "graphty-document", version: 99, members: [] }));
            assert.fail("a newer file must be refused");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNSUPPORTED_VERSION");
        }

        session.dispose();
    });
});
