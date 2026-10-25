/**
 * Filter steps: an ordered list of `{ id, on, rule }` combined with AND, held in the visibility
 * slice, one undoable step per change, saved and reopened with the project, and previewed step by
 * step through `plan`.
 */
import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type FilterStep, type GraphSession } from "../../../session";

/** The study's friends file: 20 people, 41 friendships. */
const FRIENDS = readFileSync(new URL("../../../../design/ui/studio/tool/files/friends.csv", import.meta.url), "utf8");

/** People with four or more friends. */
const POPULAR: FilterStep = { id: "popular", on: true, rule: { kind: "degree", min: 4 } };
/** Ava and her friends. */
const NEAR_AVA: FilterStep = { id: "near-ava", on: true, rule: { kind: "neighborhood", seeds: ["Ava"], depth: 1 } };

async function friends(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: FRIENDS } });

    return session;
}

function shown(session: GraphSession): [number, number] {
    const { visibleNodes, visibleEdges } = session.visibility.summary;

    return [visibleNodes, visibleEdges];
}

describe("visibility filter steps", () => {
    it("plans the nodes and edges left after each step that is on", async () => {
        const session = await friends();
        const plan = await session.plan({ op: "visibility.steps", steps: [POPULAR, NEAR_AVA] });

        assert.isTrue(plan.ok);
        assert.deepStrictEqual(plan.effect, {
            kind: "steps",
            start: { nodes: 20, edges: 41 },
            steps: [
                { id: "popular", nodes: 19, edges: 38 },
                { id: "near-ava", nodes: 7, edges: 10 },
            ],
        });

        // A step that is off is left out, and restores what it took.
        const off = await session.plan({ op: "visibility.steps", steps: [{ ...POPULAR, on: false }, NEAR_AVA] });
        assert.deepStrictEqual(off.effect, {
            kind: "steps",
            start: { nodes: 20, edges: 41 },
            steps: [{ id: "near-ava", nodes: 7, edges: 10 }],
        });
        // Planning wrote nothing.
        assert.deepStrictEqual(session.visibility.steps, []);
        assert.deepStrictEqual(shown(session), [20, 41]);
        session.dispose();
    });

    it("hides what the steps that are on leave out, and nothing once a step is unticked", async () => {
        const session = await friends();

        await session.visibility.setSteps([POPULAR, NEAR_AVA]);
        assert.deepStrictEqual(shown(session), [7, 10]);

        await session.visibility.setSteps([POPULAR, { ...NEAR_AVA, on: false }]);
        assert.deepStrictEqual(shown(session), [19, 38]);
        // The single filter still composes with the steps.
        await session.visibility.set({ kind: "neighborhood", seeds: ["Ava"], depth: 1 });
        assert.deepStrictEqual(shown(session), [7, 10]);
        await session.visibility.set(null);
        assert.deepStrictEqual(shown(session), [19, 38]);
        session.dispose();
    });

    it("records one undoable step per add, toggle, edit and delete, naming the step", async () => {
        const session = await friends();

        await session.visibility.setSteps([POPULAR]);
        await session.visibility.setSteps([POPULAR, NEAR_AVA]);
        await session.visibility.setSteps([POPULAR, { ...NEAR_AVA, on: false }]);
        await session.visibility.setSteps([
            { ...POPULAR, rule: { kind: "degree", min: 5 } },
            { ...NEAR_AVA, on: false },
        ]);
        await session.visibility.setSteps([{ ...NEAR_AVA, on: false }]);

        const facts = session.history.steps.slice(-5).map((step) => step.fact);
        assert.deepStrictEqual(facts, [
            { code: "visibility.step-add", params: { id: "popular" } },
            { code: "visibility.step-add", params: { id: "near-ava" } },
            { code: "visibility.step-off", params: { id: "near-ava" } },
            { code: "visibility.step-edit", params: { id: "popular" } },
            { code: "visibility.step-remove", params: { id: "popular" } },
        ]);
        assert.deepStrictEqual(shown(session), [20, 41]);

        await session.undo();
        assert.strictEqual(session.visibility.steps.length, 2);
        await session.undo();
        assert.deepStrictEqual(
            session.visibility.steps.map((step) => step.on),
            [true, false],
        );
        assert.deepStrictEqual(shown(session), [19, 38]);
        await session.undo();
        assert.deepStrictEqual(shown(session), [7, 10]);
        await session.redo();
        assert.deepStrictEqual(shown(session), [19, 38]);
        session.dispose();
    });

    it("saves the steps, an unticked one included, and reopens them", async () => {
        const saved = await friends();
        await saved.visibility.setSteps([POPULAR, { ...NEAR_AVA, on: false }]);
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual(opened.visibility.steps, [POPULAR, { ...NEAR_AVA, on: false }]);
        assert.deepStrictEqual(shown(opened), [19, 38]);
        saved.dispose();
        opened.dispose();
    });

    it("refuses two steps with one id", async () => {
        const session = await friends();
        assert.throws(() => {
            void session.visibility.setSteps([POPULAR, POPULAR]);
        }, /unique/);
        const plan = await session.plan({ op: "visibility.steps", steps: [POPULAR, POPULAR] });
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_BAD_COMMAND");
        session.dispose();
    });
});
