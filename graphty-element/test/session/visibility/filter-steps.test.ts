/**
 * Filter steps: an ordered list of `{ id, on, rule }` combined with AND, held in the visibility
 * slice, one undoable step per change, saved and reopened with the project, and previewed step by
 * step through `plan`.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type FilterStep, type GraphSession } from "../../../session";

/** Six people, seven friendships: Ava knows four, Fay knows only Eli. */
const FRIENDS = "source,target\nAva,Ben\nAva,Cal\nAva,Dee\nAva,Eli\nBen,Cal\nCal,Dee\nEli,Fay\n";

/** People with two or more friends: everyone but Fay, and the six edges between them. */
const POPULAR: FilterStep = { id: "popular", on: true, rule: { kind: "degree", min: 2 } };
/** Fay and her friend. */
const NEAR_FAY: FilterStep = { id: "near-fay", on: true, rule: { kind: "neighborhood", seeds: ["Fay"], depth: 1 } };

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
        const plan = await session.plan({ op: "visibility.steps", steps: [POPULAR, NEAR_FAY] });

        assert.isTrue(plan.ok);
        assert.deepStrictEqual(plan.effect, {
            kind: "steps",
            start: { nodes: 6, edges: 7 },
            steps: [
                { id: "popular", nodes: 5, edges: 6 },
                { id: "near-fay", nodes: 1, edges: 0 },
            ],
        });

        // A step that is off is left out, and restores what it took.
        const off = await session.plan({ op: "visibility.steps", steps: [{ ...POPULAR, on: false }, NEAR_FAY] });
        assert.deepStrictEqual(off.effect, {
            kind: "steps",
            start: { nodes: 6, edges: 7 },
            steps: [{ id: "near-fay", nodes: 2, edges: 1 }],
        });
        // Planning wrote nothing.
        assert.deepStrictEqual(session.visibility.steps, []);
        assert.deepStrictEqual(shown(session), [6, 7]);
        session.dispose();
    });

    it("hides what the steps that are on leave out, and nothing once a step is switched off", async () => {
        const session = await friends();

        await session.visibility.setSteps([POPULAR, NEAR_FAY]);
        assert.deepStrictEqual(shown(session), [1, 0]);

        await session.visibility.setSteps([POPULAR, { ...NEAR_FAY, on: false }]);
        assert.deepStrictEqual(shown(session), [5, 6]);
        // The single filter still composes with the steps.
        await session.visibility.set({ kind: "neighborhood", seeds: ["Fay"], depth: 1 });
        assert.deepStrictEqual(shown(session), [1, 0]);
        await session.visibility.set(null);
        assert.deepStrictEqual(shown(session), [5, 6]);

        await session.visibility.setSteps([
            { ...POPULAR, on: false },
            { ...NEAR_FAY, on: false },
        ]);
        assert.deepStrictEqual(shown(session), [6, 7], "every step off hides nothing");
        assert.strictEqual(session.visibility.steps[0]?.rule.kind, "degree", "a step that is off keeps its rule");
        session.dispose();
    });

    it("records one undoable step per add, toggle, edit and delete, naming the step", async () => {
        const session = await friends();

        await session.visibility.setSteps([POPULAR]);
        await session.visibility.setSteps([POPULAR, NEAR_FAY]);
        await session.visibility.setSteps([POPULAR, { ...NEAR_FAY, on: false }]);
        await session.visibility.setSteps([
            { ...POPULAR, rule: { kind: "degree", min: 3 } },
            { ...NEAR_FAY, on: false },
        ]);
        await session.visibility.setSteps([{ ...NEAR_FAY, on: false }]);

        const facts = session.history.steps.slice(-5).map((step) => step.fact);
        assert.deepStrictEqual(facts, [
            { code: "visibility.step-add", params: { id: "popular" } },
            { code: "visibility.step-add", params: { id: "near-fay" } },
            { code: "visibility.step-off", params: { id: "near-fay" } },
            { code: "visibility.step-edit", params: { id: "popular" } },
            { code: "visibility.step-remove", params: { id: "popular" } },
        ]);
        assert.deepStrictEqual(shown(session), [6, 7]);

        await session.undo();
        assert.strictEqual(session.visibility.steps.length, 2);
        await session.undo();
        assert.deepStrictEqual(
            session.visibility.steps.map((step) => step.on),
            [true, false],
        );
        assert.deepStrictEqual(shown(session), [5, 6]);
        await session.undo();
        assert.deepStrictEqual(shown(session), [1, 0]);
        await session.redo();
        assert.deepStrictEqual(shown(session), [5, 6]);
        session.dispose();
    });

    it("saves the steps, a switched-off one included, and reopens them", async () => {
        const saved = await friends();
        await saved.visibility.setSteps([POPULAR, { ...NEAR_FAY, on: false }]);
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual(opened.visibility.steps, [POPULAR, { ...NEAR_FAY, on: false }]);
        assert.deepStrictEqual(shown(opened), [5, 6]);
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
