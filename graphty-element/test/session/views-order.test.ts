/**
 * @file Saved views in project order: rename keeps the place, move rewrites it, every undo puts the
 * whole order back, the project file keeps it, and a view saved with no camera reads the camera
 * once, at the save.
 */

import { assert, describe, it } from "vitest";

import type { CameraState } from "../../src/camera/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { ProjectSlice } from "../../src/session/types";

/**
 * A session holding three views, in order.
 * @returns The session.
 */
async function threeViews(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.views.save([
        { name: "a", camera: { mode: "3d", position: { x: 1, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } } },
        { name: "b", camera: { mode: "2d", zoom: 2, pan: { x: 0, y: 0 } } },
        { name: "c", camera: { zoom: 3 } },
    ]);
    return session;
}

/**
 * The code and details a promise was refused with.
 * @param work - The promise.
 * @returns The code and details, or null when it settled.
 */
async function refusal(work: Promise<unknown>): Promise<{ code: string; details: unknown } | null> {
    try {
        await work;
        return null;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), "refused with a GraphtyError");
        return isGraphtyError(error) ? { code: error.code, details: { ...error.details } } : null;
    }
}

describe("saved views in project order", () => {
    it("iterates in the order saved, and a rename keeps the place, one undo step", async () => {
        const session = await threeViews();
        assert.deepStrictEqual([...session.views.keys()], ["a", "b", "c"]);

        await session.views.rename("b", "hub");
        assert.deepStrictEqual([...session.views.keys()], ["a", "hub", "c"]);
        assert.deepStrictEqual(session.views.get("hub"), { mode: "2d", zoom: 2, pan: { x: 0, y: 0 } });
        assert.strictEqual(session.history.steps.at(session.history.position - 1)?.fact.code, "view.rename");

        await session.undo();
        assert.deepStrictEqual([...session.views.keys()], ["a", "b", "c"]);
        assert.isFalse(session.views.has("hub"));
        session.dispose();
    });

    it("refuses a rename onto a name in use, a camera view's id, or from a name not saved", async () => {
        const session = await threeViews();
        assert.deepStrictEqual(await refusal(session.views.rename("a", "c")), {
            code: "E_BAD_COMMAND",
            details: { reason: "name-taken", name: "c" },
        });
        assert.deepStrictEqual(await refusal(session.views.rename("a", "topView")), {
            code: "E_PROTECTED",
            details: { name: "topView" },
        });
        assert.deepStrictEqual(await refusal(session.views.rename("nope", "x")), {
            code: "E_BAD_COMMAND",
            details: { missing: ["nope"], available: ["a", "b", "c"] },
        });
        assert.deepStrictEqual(await refusal(session.views.rename("a", " ")), {
            code: "E_BAD_COMMAND",
            details: { reason: "empty-name" },
        });
        assert.deepStrictEqual([...session.views.keys()], ["a", "b", "c"]);
        session.dispose();
    });

    it("moves a view, reports the views slice, and undoes the move", async () => {
        const session = await threeViews();
        const reported: (readonly ProjectSlice[])[] = [];
        session.on("project:changed", ({ slices }) => reported.push(slices));

        await session.views.move("c", 0);
        assert.deepStrictEqual([...session.views.keys()], ["c", "a", "b"]);
        assert.deepStrictEqual(reported, [["views"]]);

        await session.undo();
        assert.deepStrictEqual([...session.views.keys()], ["a", "b", "c"]);
        assert.deepStrictEqual(reported.at(-1), ["views"]);
        session.dispose();
    });

    it("puts a removed middle view back in the middle on undo", async () => {
        const session = await threeViews();
        await session.views.remove(["b"]);
        assert.deepStrictEqual([...session.views.keys()], ["a", "c"]);

        await session.undo();
        assert.deepStrictEqual([...session.views.keys()], ["a", "b", "c"]);
        assert.deepStrictEqual(
            [...session.views.values()].map((camera) => camera.zoom),
            [undefined, 2, 3],
        );
        session.dispose();
    });

    it("keeps the order and each view's mode through the project file", async () => {
        const source = await threeViews();
        await source.views.move("a", 2);
        const { text } = await source.project.save();

        const target = createGraphSession();
        await target.project.open(text);
        assert.deepStrictEqual([...target.views.keys()], ["b", "c", "a"]);
        assert.strictEqual(target.views.get("a")?.mode, "3d");
        assert.strictEqual(target.views.get("b")?.mode, "2d");
        source.dispose();
        target.dispose();
    });

    it("loads views with no mode, as an older file holds them, in file order", async () => {
        const source = createGraphSession();
        await source.views.save([
            { name: "z", camera: { zoom: 1 } },
            { name: "m", camera: { zoom: 2 } },
        ]);
        const { text } = await source.project.save();
        const target = createGraphSession();
        await target.project.open(text);
        assert.deepStrictEqual(
            [...target.views.entries()],
            [
                ["z", { zoom: 1 }],
                ["m", { zoom: 2 }],
            ],
        );
        source.dispose();
        target.dispose();
    });
});

describe("a view saved with no camera", () => {
    it("is refused by a session that draws nothing", async () => {
        const session = createGraphSession();
        const refused = await refusal(session.views.save([{ name: "here" }]));
        assert.strictEqual(refused?.code, "E_UNSUPPORTED");
        assert.isFalse(session.views.has("here"));
        session.dispose();
    });

    it("reads the camera once: redo writes the camera of the first save", async () => {
        const session = createGraphSession();
        let camera: CameraState = { mode: "2d", zoom: 4 };
        dispatcherOf(session).services.camera = { move: () => Promise.resolve(), current: () => camera };

        await session.views.save([{ name: "here" }]);
        assert.deepStrictEqual(session.views.get("here"), { mode: "2d", zoom: 4 });

        await session.undo();
        camera = { mode: "2d", zoom: 9 };
        await session.redo();
        assert.deepStrictEqual(session.views.get("here"), { mode: "2d", zoom: 4 });
        session.dispose();
    });

    it("is refused while immersive, as the renderer's camera refuses", async () => {
        const session = createGraphSession();
        dispatcherOf(session).services.camera = {
            move: () => Promise.resolve(),
            current: () => {
                throw Object.assign(new Error("immersive"), { code: "E_UNSUPPORTED" });
            },
        };
        const failed = await session.views.save([{ name: "here" }]).then(
            () => null,
            (error: unknown) => (error as { code?: string }).code,
        );
        assert.strictEqual(failed, "E_UNSUPPORTED");
        assert.isFalse(session.views.has("here"));
        session.dispose();
    });
});
