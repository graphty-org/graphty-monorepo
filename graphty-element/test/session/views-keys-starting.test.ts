/**
 * @file Saved views that follow a camera view and carry a key chord, and the starting cameras a
 * session writes once into every project that never had them (design/ui/camera-views-tours-and-capture.md,
 * sections 4.1 and 4.5).
 */

import { assert, describe, it } from "vitest";

import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { startingViews } from "../../src/session/commands/view";
import { createProjectState } from "../../src/session/project/state";
import type { StartingCamera } from "../../src/session/types";
import { FakeClock, FakeLocks } from "../autosave/fakes";

/** The five starting cameras, as an application would pass them. */
const STARTING: readonly StartingCamera[] = [
    { name: "Top", follows: "topView", key: "1" },
    { name: "Isometric", follows: "isometric", key: "2" },
    { name: "Side", follows: "sideView", key: "3" },
    { name: "Bottom", follows: "bottomView", key: "4" },
    { name: "Front", follows: "frontView", key: "5" },
];

/** The starting cameras' names, in order. */
const FIVE = STARTING.map((view) => view.name);

/** A fixed 2D camera. */
const FLAT = { mode: "2d" as const, zoom: 2, pan: { x: 0, y: 0 } };

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

/**
 * Each saved view's key, by name, in project order.
 * @param session - The session.
 * @returns The keys.
 */
function keysOf(session: GraphSession): [string, string | undefined][] {
    return [...session.views].map(([name, view]) => [name, view.key]);
}

/**
 * A project file with the `startingCamerasWritten` member taken out, as a file saved before the
 * member existed holds it.
 * @param text - The file.
 * @returns The older file.
 */
function olderFile(text: string): string {
    const strip = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(strip);
        }
        if (typeof value === "object" && value !== null) {
            return Object.fromEntries(
                Object.entries(value)
                    .filter(([key]) => key !== "startingCamerasWritten")
                    .map(([key, inner]) => [key, strip(inner)]),
            );
        }
        return value;
    };
    return JSON.stringify(strip(JSON.parse(text)));
}

/**
 * The last recorded step's fact.
 * @param session - The session.
 * @returns The fact.
 */
function lastFact(session: GraphSession): unknown {
    return session.history.steps.at(session.history.position - 1)?.fact;
}

describe("saved views that follow a camera view", () => {
    it("keeps the followed id and no camera, and refuses both, neither known, and an empty key", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "Above", follows: "topView" }]);
        assert.deepStrictEqual(session.views.get("Above"), { follows: "topView" });

        assert.deepStrictEqual(
            await refusal(session.views.save([{ name: "Both", camera: FLAT, follows: "topView" }])),
            { code: "E_BAD_COMMAND", details: { reason: "conflict", options: ["camera", "follows"] } },
        );
        assert.deepStrictEqual(await refusal(session.views.save([{ name: "Lost", follows: "noSuchView" }])), {
            code: "E_UNKNOWN_CAMERA",
            details: { name: "noSuchView" },
        });
        assert.deepStrictEqual(await refusal(session.views.save([{ name: "Blank", camera: FLAT, key: "" }])), {
            code: "E_BAD_COMMAND",
            details: { reason: "empty-key" },
        });
        assert.deepStrictEqual([...session.views.keys()], ["Above"]);
        session.dispose();
    });

    it("refuses bottomView as a saved name, as every camera view's id", async () => {
        const session = createGraphSession();
        assert.deepStrictEqual(await refusal(session.views.save([{ name: "bottomView", camera: FLAT }])), {
            code: "E_PROTECTED",
            details: { name: "bottomView" },
        });
        session.dispose();
    });

    it("saving onto a name keeps its place and its key unless a key is given", async () => {
        const session = createGraphSession();
        await session.views.save([
            { name: "a", camera: FLAT, key: "1" },
            { name: "b", camera: FLAT },
        ]);
        await session.views.save([{ name: "a", follows: "topView" }]);
        assert.deepStrictEqual([...session.views.keys()], ["a", "b"]);
        assert.deepStrictEqual(session.views.get("a"), { follows: "topView", key: "1" });

        await session.views.save([{ name: "a", camera: FLAT, key: null }]);
        assert.deepStrictEqual(session.views.get("a"), { camera: FLAT });
        session.dispose();
    });
});

describe("key chords", () => {
    it("setKey takes a held key in one undo step, and undo gives it back", async () => {
        const session = createGraphSession();
        await session.views.save([
            { name: "a", camera: FLAT, key: "1" },
            { name: "b", camera: FLAT },
        ]);
        const before = session.history.position;

        await session.views.setKey("b", "1");
        assert.deepStrictEqual(keysOf(session), [
            ["a", undefined],
            ["b", "1"],
        ]);
        assert.strictEqual(session.history.position, before + 1, "one step");
        assert.deepStrictEqual(lastFact(session), { code: "view.key", params: { name: "b", key: "1", from: "a" } });

        await session.undo();
        assert.deepStrictEqual(keysOf(session), [
            ["a", "1"],
            ["b", undefined],
        ]);
        session.dispose();
    });

    it("save with a key takes it from another view in the same step", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "a", camera: FLAT, key: "1" }]);
        await session.views.save([{ name: "b", follows: "isometric", key: "1" }]);
        assert.deepStrictEqual(keysOf(session), [
            ["a", undefined],
            ["b", "1"],
        ]);
        await session.undo();
        assert.deepStrictEqual(keysOf(session), [["a", "1"]]);
        session.dispose();
    });

    it("refuses an empty key and a view not saved; null clears", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "a", camera: FLAT, key: "1" }]);
        assert.deepStrictEqual(await refusal(session.views.setKey("a", "")), {
            code: "E_BAD_COMMAND",
            details: { reason: "empty-key" },
        });
        assert.deepStrictEqual(await refusal(session.views.setKey("nope", "2")), {
            code: "E_BAD_COMMAND",
            details: { missing: ["nope"], available: ["a"] },
        });
        await session.views.setKey("a", null);
        assert.deepStrictEqual(session.views.get("a"), { camera: FLAT });
        session.dispose();
    });

    it("rename keeps the key, remove drops it, and undo restores both", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "a", camera: FLAT, key: "1" }]);
        await session.views.rename("a", "hub");
        assert.deepStrictEqual(keysOf(session), [["hub", "1"]]);

        await session.views.remove(["hub"]);
        assert.deepStrictEqual(keysOf(session), []);
        assert.deepStrictEqual(lastFact(session), { code: "view.remove", params: { names: ["hub"] } });

        await session.undo();
        assert.deepStrictEqual(keysOf(session), [["hub", "1"]]);
        await session.undo();
        assert.deepStrictEqual(keysOf(session), [["a", "1"]]);
        session.dispose();
    });
});

describe("starting cameras", () => {
    it("are written once, in order, after the project's views: a taken name skipped, a held key dropped", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "Top", camera: FLAT, key: "2" }]);

        await session.views.setStartingCameras(STARTING);
        assert.deepStrictEqual(keysOf(session), [
            ["Top", "2"],
            ["Isometric", undefined],
            ["Side", "3"],
            ["Bottom", "4"],
            ["Front", "5"],
        ]);
        assert.deepStrictEqual(session.views.get("Top"), { camera: FLAT, key: "2" });
        assert.deepStrictEqual(session.views.get("Side"), { follows: "sideView", key: "3" });
        assert.isTrue(session.config.startingCamerasWritten);

        const { position } = session.history;
        await session.views.setStartingCameras(STARTING);
        assert.deepStrictEqual([...session.views.keys()], ["Top", "Isometric", "Side", "Bottom", "Front"]);
        assert.strictEqual(session.history.position, position, "a second call writes nothing");
        session.dispose();
    });

    it("write nothing by default, and refuse a follows nothing answers to", async () => {
        const session = createGraphSession();
        await session.views.setStartingCameras(null);
        assert.strictEqual(session.views.size, 0);
        assert.isFalse(session.config.startingCamerasWritten);

        assert.deepStrictEqual(
            await refusal(session.views.setStartingCameras([{ name: "Lost", follows: "noSuchView" }])),
            { code: "E_UNKNOWN_CAMERA", details: { name: "noSuchView" } },
        );
        assert.strictEqual(session.views.size, 0);
        session.dispose();
    });

    it("skip an entry whose follows is no longer registered when they are written", () => {
        const state = createProjectState();
        const written = startingViews(state, [...STARTING.slice(0, 2), { name: "Gone", follows: "noSuchView" }]);
        assert.deepStrictEqual(
            written.map(([name]) => name),
            ["Top", "Isometric"],
        );
    });

    it("on a fresh session are its starting state: no step, not dirty, no project:changed, no autosave", async () => {
        const session = createGraphSession();
        const store = memoryAutosaveStore();
        const saver = new Autosaver({
            key: "test.starting",
            session,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        let changed = 0;
        let seeded: readonly string[] = [];
        session.on("project:changed", () => changed++);
        session.on("views:seeded", ({ names }) => {
            seeded = names;
        });

        await session.views.setStartingCameras(STARTING);
        assert.deepStrictEqual([...session.views.keys()], FIVE);
        assert.deepStrictEqual(seeded, FIVE);
        assert.isFalse(session.canUndo);
        assert.isFalse(session.project.dirty);
        assert.strictEqual(changed, 0);
        await saver.flush();
        assert.deepStrictEqual(await store.list("test.starting"), []);
        saver.stop();

        await session.data.import(
            { type: "json", config: { data: JSON.stringify({ nodes: [{ id: "a" }], edges: [] }) } },
            { history: "start" },
        );
        assert.deepStrictEqual([...session.views.keys()], FIVE, "a data load keeps them");
        session.dispose();
    });

    it("called late are one step, and undo takes them out with their record", async () => {
        const session = createGraphSession();
        await session.views.save([{ name: "Mine", camera: FLAT }]);
        await session.views.setStartingCameras(STARTING);
        assert.deepStrictEqual([...session.views.keys()], ["Mine", ...FIVE]);
        assert.deepStrictEqual(lastFact(session), { code: "view.starting", params: { names: FIVE } });
        assert.isTrue(session.project.dirty);

        await session.undo();
        assert.deepStrictEqual([...session.views.keys()], ["Mine"]);
        assert.isFalse(session.config.startingCamerasWritten);

        await session.redo();
        assert.deepStrictEqual([...session.views.keys()], ["Mine", ...FIVE]);
        assert.isTrue(session.config.startingCamerasWritten);
        session.dispose();
    });
});

describe("starting cameras and opening a project", () => {
    /**
     * A session with the starting cameras set first, as the app does.
     * @returns The session.
     */
    async function seededSession(): Promise<GraphSession> {
        const session = createGraphSession();
        await session.views.setStartingCameras(STARTING);
        return session;
    }

    it("a reopened project keeps a deleted, renamed or moved starting camera as it was saved", async () => {
        const source = await seededSession();
        await source.views.remove(["Side"]);
        await source.views.rename("Top", "Overhead");
        await source.views.move("Front", 0);
        const { text } = await source.project.save();
        assert.include(text, "startingCamerasWritten");

        const target = await seededSession();
        await target.project.open(text);
        assert.deepStrictEqual([...target.views.keys()], ["Front", "Overhead", "Isometric", "Bottom"]);
        assert.isFalse(target.canUndo);
        assert.isFalse(target.project.dirty);
        source.dispose();
        target.dispose();
    });

    it("an older file gains the five after its own views, as part of opening it", async () => {
        const source = createGraphSession();
        await source.views.save([{ name: "Overview", camera: { zoom: 3 } }]);
        const { text } = await source.project.save();

        const target = await seededSession();
        await target.project.open(olderFile(text));
        assert.deepStrictEqual([...target.views.keys()], ["Overview", ...FIVE]);
        assert.deepStrictEqual(target.views.get("Overview"), { camera: { zoom: 3, mode: "2d" } });
        assert.isTrue(target.config.startingCamerasWritten);
        assert.isFalse(target.canUndo);
        assert.isFalse(target.project.dirty);
        source.dispose();
        target.dispose();
    });

    it("an older file opened before the call is written by the call", async () => {
        const source = createGraphSession();
        await source.views.save([{ name: "Overview", camera: { zoom: 3 } }]);
        const { text } = await source.project.save();

        const target = createGraphSession();
        await target.project.open(olderFile(text));
        await target.views.setStartingCameras(STARTING);
        assert.deepStrictEqual([...target.views.keys()], ["Overview", ...FIVE]);
        source.dispose();
        target.dispose();
    });

    it("the autosave recovery writes nothing again", async () => {
        const store = memoryAutosaveStore();
        const first = await seededSession();
        const writer = new Autosaver({
            key: "test.starting.recover",
            session: first,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        await first.views.remove(["Top"]);
        await writer.flush();
        const id = writer.status.entry ?? "";
        writer.stop();

        const second = await seededSession();
        const reader = new Autosaver({
            key: "test.starting.recover",
            session: second,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        await reader.restore(id, true);
        assert.deepStrictEqual([...second.views.keys()], ["Isometric", "Side", "Bottom", "Front"]);
        reader.stop();
        first.dispose();
        second.dispose();
    });
});

describe("the project file", () => {
    it("round-trips fixed and following views, keys and startingCamerasWritten", async () => {
        const source = createGraphSession();
        await source.views.save([
            { name: "Fixed", camera: FLAT, key: "9" },
            { name: "Above", follows: "topView", key: "8" },
        ]);
        await source.config.set({ startingCamerasWritten: true });
        const { text } = await source.project.save();

        const target = createGraphSession();
        await target.project.open(text);
        assert.deepStrictEqual(
            [...target.views],
            [
                ["Fixed", { camera: FLAT, key: "9" }],
                ["Above", { follows: "topView", key: "8" }],
            ],
        );
        assert.isTrue(target.config.startingCamerasWritten);
        source.dispose();
        target.dispose();
    });

    it("falls back to the pose saved beside a follows nothing answers to, and skips an entry with neither", async () => {
        const source = createGraphSession();
        await source.views.save([
            { name: "A", camera: FLAT },
            { name: "B", camera: FLAT },
        ]);
        const { text } = await source.project.save();
        // Rewrite the two entries: one following an unregistered view with a pose beside it, one with nothing.
        const edited = text
            .replace(/"name":"A","camera":/u, '"name":"A","follows":"noSuchView","camera":')
            .replace(/"name":"B","camera":\{[^}]*\{[^}]*\}\}/u, '"name":"B"');
        const target = createGraphSession();
        const { problems } = await target.project.open(edited);
        assert.deepStrictEqual([...target.views], [["A", { camera: FLAT }]]);
        assert.deepInclude(problems, { code: "E_BAD_DOCUMENT", params: { slice: "views", id: "B" } });
        source.dispose();
        target.dispose();
    });
});
