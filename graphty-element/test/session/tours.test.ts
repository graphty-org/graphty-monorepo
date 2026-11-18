/**
 * @file Saved camera tours: `session.tours` keeps them in project order, each of its four verbs is
 * one undoable step reported as the `tours` slice, a view's rename rewrites the stops naming it,
 * and the project file carries them as a versioned member that a newer reader skips.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import type { ProjectSlice } from "../../src/session/types";

/**
 * A session holding two views and two tours that name them.
 * @returns The session.
 */
async function twoTours(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.views.save([
        { name: "overview", camera: { mode: "3d", position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
        { name: "hub", camera: { mode: "3d", position: { x: 5, y: 0, z: 5 }, target: { x: 0, y: 0, z: 0 } } },
    ]);
    await session.tours.save([
        {
            name: "intro",
            tour: {
                stops: [
                    { view: "overview", hold: 2000 },
                    { view: "hub", duration: 1500 },
                ],
            },
        },
        { name: "short", tour: { stops: [{ view: "hub", hold: 500 }], easing: "linear" } },
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

/**
 * The slices each `project:changed` reported while some work ran.
 * @param session - The session.
 * @param work - The work.
 * @returns The reports, in order.
 */
async function reported(session: GraphSession, work: () => Promise<unknown>): Promise<(readonly ProjectSlice[])[]> {
    const seen: (readonly ProjectSlice[])[] = [];
    const off = session.on("project:changed", ({ slices }) => seen.push(slices));
    await work();
    off();
    return seen;
}

describe("session.tours", () => {
    it("keeps tours in the order saved, and a save under a name replaces the tour in its place", async () => {
        const session = await twoTours();
        assert.deepStrictEqual([...session.tours.keys()], ["intro", "short"]);
        assert.strictEqual(session.tours.size, 2);
        assert.deepStrictEqual(session.tours.get("short"), { stops: [{ view: "hub", hold: 500 }], easing: "linear" });

        await session.tours.save([{ name: "intro", tour: { stops: [] } }]);
        assert.deepStrictEqual([...session.tours.keys()], ["intro", "short"]);
        assert.deepStrictEqual(session.tours.get("intro"), { stops: [] });
        session.dispose();
    });

    it("allows an empty tour and a stop naming no saved view, so drafts exist", async () => {
        const session = createGraphSession();
        await session.tours.save([
            { name: "draft", tour: { stops: [] } },
            { name: "dangling", tour: { stops: [{ view: "nowhere" }] } },
        ]);
        assert.deepStrictEqual([...session.tours.keys()], ["draft", "dangling"]);
        session.dispose();
    });

    it("refuses an empty name, a bad flight or hold, a stop with no view name and an unknown easing", async () => {
        const session = createGraphSession();
        assert.deepStrictEqual(await refusal(session.tours.save([{ name: " ", tour: { stops: [] } }])), {
            code: "E_BAD_COMMAND",
            details: { reason: "empty-name" },
        });
        assert.deepStrictEqual(
            await refusal(
                session.tours.save([{ name: "t", tour: { stops: [{ view: "a" }, { view: "b", hold: -1 }] } }]),
            ),
            { code: "E_OPTION_RANGE", details: { option: "hold", stop: 1 } },
        );
        assert.deepStrictEqual(
            await refusal(session.tours.save([{ name: "t", tour: { stops: [{ view: "a", duration: Number.NaN }] } }])),
            { code: "E_OPTION_RANGE", details: { option: "duration", stop: 0 } },
        );
        assert.deepStrictEqual(
            await refusal(session.tours.save([{ name: "t", tour: { stops: [{ view: 3 as unknown as string }] } }])),
            { code: "E_OPTION_RANGE", details: { option: "view", stop: 0 } },
        );
        assert.deepStrictEqual(
            await refusal(
                session.tours.save([{ name: "t", tour: { stops: [], easing: "bouncy" as unknown as "linear" } }]),
            ),
            { code: "E_OPTION_RANGE", details: { option: "easing" } },
        );
        assert.strictEqual(session.tours.size, 0);
        session.dispose();
    });

    it("undoes each of the four verbs and reports the tours slice for each", async () => {
        const session = await twoTours();
        const before = [...session.tours];

        const steps: [string, () => Promise<void>][] = [
            ["tour.save", () => session.tours.save([{ name: "third", tour: { stops: [{ view: "hub" }] } }])],
            ["tour.remove", () => session.tours.remove(["intro"])],
            ["tour.rename", () => session.tours.rename("intro", "welcome")],
            ["tour.move", () => session.tours.move("short", 0)],
        ];
        for (const [code, step] of steps) {
            assert.deepStrictEqual(await reported(session, step), [["tours"]], code);
            assert.strictEqual(session.history.steps.at(session.history.position - 1)?.fact.code, code);
            assert.deepStrictEqual(await reported(session, () => session.undo()), [["tours"]], `undo ${code}`);
            assert.deepStrictEqual([...session.tours], before, `undo ${code} restores the list exactly`);
        }
        session.dispose();
    });

    it("renames and moves, keeping places, and refuses what a view's rename and move refuse", async () => {
        const session = await twoTours();
        await session.tours.rename("intro", "welcome");
        assert.deepStrictEqual([...session.tours.keys()], ["welcome", "short"]);
        await session.tours.move("short", 0);
        assert.deepStrictEqual([...session.tours.keys()], ["short", "welcome"]);

        assert.deepStrictEqual(await refusal(session.tours.rename("welcome", "short")), {
            code: "E_BAD_COMMAND",
            details: { reason: "name-taken", name: "short" },
        });
        assert.deepStrictEqual(await refusal(session.tours.rename("nope", "x")), {
            code: "E_BAD_COMMAND",
            details: { missing: ["nope"], available: ["short", "welcome"] },
        });
        assert.deepStrictEqual(await refusal(session.tours.remove(["nope"])), {
            code: "E_BAD_COMMAND",
            details: { missing: ["nope"], available: ["short", "welcome"] },
        });
        assert.deepStrictEqual(await refusal(session.tours.move("nope", 0)), {
            code: "E_BAD_COMMAND",
            details: { missing: ["nope"], available: ["short", "welcome"] },
        });
        session.dispose();
    });
});

describe("a view's rename and the tours that name it", () => {
    it("rewrites every stop naming the view, says which tours in its fact, and one undo restores both", async () => {
        const session = await twoTours();
        await session.views.rename("hub", "Hub cluster");

        assert.deepStrictEqual(
            session.tours.get("intro")?.stops.map((stop) => stop.view),
            ["overview", "Hub cluster"],
        );
        assert.deepStrictEqual(
            session.tours.get("short")?.stops.map((stop) => stop.view),
            ["Hub cluster"],
        );
        const fact = session.history.steps.at(session.history.position - 1)?.fact;
        assert.deepStrictEqual(fact, {
            code: "view.rename",
            params: { from: "hub", to: "Hub cluster", tours: ["intro", "short"] },
        });

        await session.undo();
        assert.deepStrictEqual([...session.views.keys()], ["overview", "hub"]);
        assert.deepStrictEqual(
            session.tours.get("short")?.stops.map((stop) => stop.view),
            ["hub"],
        );
        session.dispose();
    });

    it("leaves the stops of a removed view in place", async () => {
        const session = await twoTours();
        await session.views.remove(["hub"]);
        assert.deepStrictEqual(
            session.tours.get("short")?.stops.map((stop) => stop.view),
            ["hub"],
        );
        session.dispose();
    });
});

describe("tours in the project file", () => {
    it("round-trip in order, with their easing and stops", async () => {
        const source = await twoTours();
        await source.tours.move("short", 0);
        const { text } = await source.project.save();

        const target = createGraphSession();
        const report = await target.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual([...target.tours], [...source.tours]);
        assert.deepStrictEqual([...target.tours.keys()], ["short", "intro"]);
        source.dispose();
        target.dispose();
    });

    it("are written as a versioned member, and not at all when there are none", async () => {
        const source = await twoTours();
        const member = (text: string): Record<string, unknown> =>
            (JSON.parse(text) as { members: Record<string, unknown>[] }).members.find(
                (each) => each.kind === "graphty-session",
            ) ?? {};
        const written = member((await source.project.save()).text);
        assert.deepStrictEqual(written.tours, {
            version: 1,
            list: [
                {
                    name: "intro",
                    stops: [
                        { view: "overview", hold: 2000 },
                        { view: "hub", duration: 1500 },
                    ],
                },
                { name: "short", stops: [{ view: "hub", hold: 500 }], easing: "linear" },
            ],
        });

        const empty = createGraphSession();
        assert.notProperty(member((await empty.project.save()).text), "tours");
        source.dispose();
        empty.dispose();
    });

    it("of a newer version are reported and skipped, and the views still open", async () => {
        const source = await twoTours();
        const file = JSON.parse((await source.project.save()).text) as { members: Record<string, unknown>[] };
        const member = file.members.find((each) => each.kind === "graphty-session") ?? {};
        member.tours = { version: 2, list: [] };

        const target = createGraphSession();
        const report = await target.project.open(JSON.stringify(file));
        assert.deepStrictEqual(report.problems, [
            { code: "E_UNSUPPORTED_VERSION", params: { slice: "tours", found: 2 } },
        ]);
        assert.strictEqual(target.tours.size, 0);
        assert.deepStrictEqual([...target.views.keys()], ["overview", "hub"]);
        source.dispose();
        target.dispose();
    });

    it("are absent from a file written before tours were saved, which opens with none", async () => {
        const source = createGraphSession();
        await source.views.save([{ name: "a", camera: { zoom: 2 } }]);
        const { text } = await source.project.save();
        const target = createGraphSession();
        const report = await target.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.strictEqual(target.tours.size, 0);
        source.dispose();
        target.dispose();
    });

    it("never carry from one project into the next", async () => {
        const first = await twoTours();
        const second = createGraphSession();
        await second.views.save([{ name: "b", camera: { zoom: 2 } }]);
        const [a, b] = await Promise.all([first.project.save(), second.project.save()]);

        const target = createGraphSession();
        await target.project.open(a.text);
        assert.strictEqual(target.tours.size, 2);
        await target.project.open(b.text);
        assert.strictEqual(target.tours.size, 0);
        assert.deepStrictEqual([...target.views.keys()], ["b"]);
        first.dispose();
        second.dispose();
        target.dispose();
    });
});
