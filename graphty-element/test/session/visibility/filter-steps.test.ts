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
            kind: "match",
            nodes: 7,
            edges: 10,
            exact: true,
            steps: {
                start: { nodes: 20, edges: 41 },
                steps: [
                    { id: "popular", nodes: 19, edges: 38 },
                    { id: "near-ava", nodes: 7, edges: 10 },
                ],
            },
        });

        // A step that is off is left out, and restores what it took.
        const off = await session.plan({ op: "visibility.steps", steps: [{ ...POPULAR, on: false }, NEAR_AVA] });
        assert.deepStrictEqual(off.effect, {
            kind: "match",
            nodes: 7,
            edges: 10,
            exact: true,
            steps: { start: { nodes: 20, edges: 41 }, steps: [{ id: "near-ava", nodes: 7, edges: 10 }] },
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

    it("counts what each step leaves out, in order, after a move, a switch and the single filter", async () => {
        const session = await friends();
        await session.visibility.setSteps([POPULAR, NEAR_AVA]);
        const counts = session.visibility.stepCounts();
        assert.deepStrictEqual(counts, [
            {
                id: "popular",
                on: true,
                before: { nodes: 20, edges: 41 },
                after: { nodes: 19, edges: 38 },
                leftOut: { nodes: 1, edges: 3 },
            },
            {
                id: "near-ava",
                on: true,
                before: { nodes: 19, edges: 38 },
                after: { nodes: 7, edges: 10 },
                leftOut: { nodes: 12, edges: 28 },
            },
        ]);
        // Read again with nothing changed: the same answer, counted once.
        assert.strictEqual(session.visibility.stepCounts(), counts);

        // A move changes what each step leaves out, never what is visible.
        await session.visibility.moveStep("near-ava", 0);
        assert.deepStrictEqual(
            session.visibility.steps.map((step) => step.id),
            ["near-ava", "popular"],
        );
        assert.deepStrictEqual(shown(session), [7, 10]);
        const moved = session.visibility.stepCounts();
        assert.deepStrictEqual(moved[0].before, { nodes: 20, edges: 41 });
        assert.deepStrictEqual(moved[1].after, { nodes: 7, edges: 10 });
        assert.deepStrictEqual(moved[0].after, moved[1].before);
        assert.strictEqual(moved[0].leftOut.nodes + moved[1].leftOut.nodes, 13);

        // A step that is off leaves out nothing, and the next one counts from what is left.
        await session.visibility.updateCondition("near-ava", { on: false });
        const off = session.visibility.stepCounts();
        assert.deepStrictEqual(off[0], {
            id: "near-ava",
            on: false,
            before: { nodes: 20, edges: 41 },
            after: { nodes: 20, edges: 41 },
            leftOut: { nodes: 0, edges: 0 },
        });
        assert.deepStrictEqual(off[1].leftOut, { nodes: 1, edges: 3 });

        // The single filter set with set() comes before every step.
        await session.visibility.set({ kind: "degree", min: 5 });
        const filtered = session.visibility.stepCounts();
        assert.deepStrictEqual(filtered[0].before, { nodes: shown(session)[0], edges: shown(session)[1] });
        assert.deepStrictEqual(filtered[1].leftOut, { nodes: 0, edges: 0 }, "degree 5 already keeps degree 4");
        session.dispose();
    });

    it("moves a step as one undoable step that undo puts back, and keeps its effect", async () => {
        const session = await friends();
        await session.visibility.setConditions([
            { id: "popular", effect: "keep", rule: POPULAR.rule },
            { id: "pick", effect: "select", rule: { kind: "degree", min: 6 } },
            { id: "lonely", effect: "exclude", rule: { kind: "degree", max: 1 } },
        ]);
        const steps = session.history.steps.length;

        await session.visibility.moveStep("lonely", 0);
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.deepStrictEqual(
            session.visibility.conditions.map((each) => [each.id, each.effect]),
            [
                ["lonely", "exclude"],
                ["pick", "select"],
                ["popular", "keep"],
            ],
            "the steps swap slots; the select condition stays where it was",
        );

        await session.undo();
        assert.deepStrictEqual(
            session.visibility.steps.map((step) => step.id),
            ["popular", "lonely"],
        );
        assert.strictEqual(session.visibility.stepCounts()[0].id, "popular");
        await session.redo();
        assert.deepStrictEqual(
            session.visibility.steps.map((step) => step.id),
            ["lonely", "popular"],
        );

        assert.throws(() => void session.visibility.moveStep("pick", 0), /no filter step "pick"/);
        assert.throws(() => void session.visibility.moveStep("popular", 2), /not a place/);
        assert.throws(() => void session.visibility.moveStep("popular", 0.5), /not a place/);
        session.dispose();
    });

    it("recounts after a data change, and after a project is opened", async () => {
        const session = await friends();
        await session.visibility.setSteps([POPULAR, NEAR_AVA]);
        const counts = session.visibility.stepCounts();

        await session.data.addNodes([{ id: "Zed" }]);
        const grown = session.visibility.stepCounts();
        assert.notStrictEqual(grown, counts);
        assert.deepStrictEqual(grown[0].before, { nodes: 21, edges: 41 });
        assert.deepStrictEqual(grown[0].leftOut, { nodes: 2, edges: 3 });

        await session.visibility.moveStep("near-ava", 0);
        const { text } = await session.project.save();
        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepStrictEqual(
            opened.visibility.steps.map((step) => step.id),
            ["near-ava", "popular"],
        );
        assert.deepStrictEqual(opened.visibility.stepCounts(), session.visibility.stepCounts());
        session.dispose();
        opened.dispose();
    });
});
