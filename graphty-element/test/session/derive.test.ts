/**
 * @file Computed columns: `session.data.derive(name, expression)` reads other columns and run
 * results through the selector expression language, follows its inputs in the step that moved
 * them, is undone as one step, is saved as its expression and worked out again on open, and
 * refuses what it cannot take with a code.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, quotePath, resultPath } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { withConsumerStrictState } from "./helpers";

/** Each person's score, as the stand-in algorithm publishes it. */
const SCORES: Readonly<Record<string, number>> = { a: 1, b: 2, c: 1 };

/**
 * An executor publishing each node's score as `value`.
 * @param context - The run.
 * @returns Its outcome.
 */
function scores(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Score",
                    technicalName: "score",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 3, edges: 2 },
            nodes: Object.entries(SCORES).map(([id, value]) => ({ id, values: { value } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "score", facts: [], notes: [] },
            durationMs: 1,
        }),
    });
}

/**
 * A session over three people, two with a nickname, and a path a -> b -> c.
 * @returns The session.
 */
async function people(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: scores } });
    await session.data.addNodes([
        { id: "a", name: "Ada", nickname: "Countess" },
        { id: "b", name: "Bob" },
        { id: "c", name: "Cy", nickname: "Ceecee" },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", kind: "x" },
        { source: "b", target: "c", kind: "y" },
    ]);
    return session;
}

/**
 * What a call refused with.
 * @param call - The call.
 * @returns Its error's code and details.
 */
async function refusal(call: () => Promise<unknown>): Promise<{ code: string; details: Record<string, unknown> }> {
    const error: unknown = await call().then(
        () => null,
        (caught: unknown) => caught,
    );
    assert.isTrue(isGraphtyError(error), `refused with a GraphtyError: ${String(error)}`);
    const { code, details } = error as { code: string; details: Record<string, unknown> };
    return { code, details };
}

describe("session.data.derive", () => {
    it("adds a column read from other columns", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");

        assert.strictEqual(session.data.node("a")?.display, "Countess");
        assert.strictEqual(session.data.node("b")?.display, "Bob");
        assert.deepStrictEqual(session.data.derivedColumns(), [
            { kind: "node", name: "display", expression: "data.nickname || data.name" },
        ]);
        assert.isTrue(session.data.attributes().some((each) => each.kind === "node" && each.name === "display"));
        session.dispose();
    });

    it("adds an edge column", async () => {
        const session = await people();
        await session.data.derive("isX", "data.kind == 'x'", { kind: "edge" });

        const values = session.data.edges().map((edge) => [edge.source, edge.isX]);
        assert.deepStrictEqual(values, [
            ["a", true],
            ["b", false],
        ]);
        session.dispose();
    });

    it("reads a run's result, and follows the run when it is removed", async () => {
        const session = await people();
        const run = session.run({ op: "algo.run", algorithm: "degree" });
        await run;
        await session.data.derive("hub", `${quotePath(resultPath(run.id, "value"))} >= \`2\``);

        assert.strictEqual(session.data.node("b")?.hub, true);
        assert.strictEqual(session.data.node("a")?.hub, false);

        session.runs.remove(run.id);
        // A removal returns at once; the values it moved follow as part of its step.
        await session.styles.settled();
        // JMESPath orders numbers only: an absent value compared answers null.
        assert.isNull(session.data.node("b")?.hub, "a removed run's values read as nothing");
        session.dispose();
    });

    it("updates when its inputs change, in the same step", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");
        const steps = session.history.steps.length;

        await session.data.updateNodes([{ id: "b", values: { nickname: "Bobby" } }]);
        assert.strictEqual(session.data.node("b")?.display, "Bobby");

        await session.data.addNodes([{ id: "d", name: "Dee" }]);
        assert.strictEqual(session.data.node("d")?.display, "Dee");
        assert.strictEqual(session.history.steps.length, steps + 2, "each edit is one step with its values");

        await session.undo();
        await session.undo();
        assert.strictEqual(session.data.node("b")?.display, "Bob", "undo takes back the edit and its values");
        session.dispose();
    });

    it("is one undoable step: undo removes it, redo puts it back", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");

        await session.undo();
        assert.isUndefined(session.data.node("a")?.display);
        assert.deepStrictEqual(session.data.derivedColumns(), []);

        await session.redo();
        assert.strictEqual(session.data.node("a")?.display, "Countess");
        assert.strictEqual(session.data.derivedColumns().length, 1);
        session.dispose();
    });

    it("takes a new expression for a computed column's name", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");
        await session.data.derive("display", "data.name");

        assert.strictEqual(session.data.node("a")?.display, "Ada");
        assert.strictEqual(session.data.derivedColumns().length, 1);
        session.dispose();
    });

    it("reads an earlier computed column's new values", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");
        await session.data.derive("shown", "data.display");
        await session.data.updateNodes([{ id: "b", values: { nickname: "Bobby" } }]);

        assert.strictEqual(session.data.node("b")?.shown, "Bobby");
        session.dispose();
    });

    it("is saved as its expression and worked out again on open", async () => {
        const saved = await people();
        const run = saved.run({ op: "algo.run", algorithm: "degree" });
        await run;
        await saved.data.derive("display", "data.nickname || data.name");
        await saved.data.derive("hub", `${quotePath(resultPath(run.id, "value"))} >= \`2\``);
        const { text } = await saved.project.save();

        const data = (JSON.parse(text) as { members: { kind: string; graph?: { nodes: object[] } }[] }).members.find(
            (member) => member.kind === "graphty-data",
        );
        assert.isTrue(
            data?.graph?.nodes.every((node) => !("display" in node) && !("hub" in node)),
            "the values are not saved",
        );

        const opened = createGraphSession({ runs: { execute: scores } });
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual(opened.data.derivedColumns(), saved.data.derivedColumns());
        assert.strictEqual(opened.data.node("a")?.display, "Countess");
        assert.strictEqual(opened.data.node("b")?.hub, true);
        saved.dispose();
        opened.dispose();
    });

    it("leaves its values out of a save with a group collapsed", async () => {
        const session = await people();
        await session.data.derive("display", "data.nickname || data.name");
        await session.data.derive("tag", "data.kind");
        await session.groups.collapse({ groupBy: "data.name", group: "Ada" });
        const { text } = await session.project.save();

        const { members } = JSON.parse(text) as {
            members: { kind: string; groups?: object; graph?: { nodes: { id: string }[]; links: object[] } }[];
        };
        assert.isDefined(members.find((member) => member.kind === "graphty-session")?.groups, "a group is collapsed");
        const data = members.find((member) => member.kind === "graphty-data");
        assert.deepEqual(
            data?.graph?.nodes.map((node) => [node.id, "display" in node]).sort(),
            [
                ["a", false],
                ["b", false],
                ["c", false],
            ],
            "the saved graph is expanded, without the computed values",
        );
        assert.isTrue(
            data?.graph?.links.every((edge) => !("tag" in edge)),
            "edge values are not saved",
        );
        session.dispose();
    });

    it("refuses what it cannot take, with a code", async () => {
        const session = await people();

        const bad = await refusal(() => session.data.derive("x", "data.name =="));
        assert.strictEqual(bad.code, "E_BAD_SELECTOR");
        assert.strictEqual(bad.details.reason, "missing-operand");

        const taken = await refusal(() => session.data.derive("name", "data.nickname"));
        assert.strictEqual(taken.code, "E_BAD_COMMAND");
        assert.strictEqual(taken.details.reason, "name-taken");

        const empty = await refusal(() => session.data.derive(" ", "data.nickname"));
        assert.strictEqual(empty.details.reason, "empty-name");

        const unknown = await refusal(() => session.data.derive("x", "data.nmae"));
        assert.strictEqual(unknown.code, "E_UNKNOWN_ATTRIBUTE");
        assert.deepStrictEqual(unknown.details.paths, ["data.nmae"]);

        await session.data.derive("display", "data.name");
        const itself = await refusal(() => session.data.derive("display", "data.display || data.name"));
        assert.strictEqual(itself.details.reason, "reads-itself");

        assert.strictEqual(session.data.derivedColumns().length, 1, "nothing refused was added");
        session.dispose();
    });
});

describe("session.data.derive does work in proportion to the graph", () => {
    it("SessionDataApi.derive: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            (size) =>
                withConsumerStrictState(async () => {
                    const session = createGraphSession();
                    await session.data.addNodes(
                        Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, weight: at })),
                    );
                    const visits = await visitsDuring(() => session.data.derive("heavy", "data.weight >= `10`"));
                    session.dispose();
                    return visits;
                }),
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.derive" },
        );
    });
});

describe("session.data.deriveScore", () => {
    it("rescales each term to 0..1 and sums them by weight", async () => {
        const session = await people();
        // a: score 1, size 10; b: score 2, size 0; c: score 1, size 5.
        await session.data.updateNodes([
            { id: "a", values: { size: 10 } },
            { id: "b", values: { size: 0 } },
            { id: "c", values: { size: 5 } },
        ]);
        const run = session.run({ op: "algo.run", algorithm: "degree" });
        await run;
        const terms = [
            { path: resultPath(run.id, "value"), weight: 0.6 },
            { path: "data.size", weight: 0.4 },
        ];
        await session.data.deriveScore("importance", terms);

        assert.closeTo(session.data.node("a")?.importance as number, 0.4, 1e-12);
        assert.closeTo(session.data.node("b")?.importance as number, 0.6, 1e-12);
        assert.closeTo(session.data.node("c")?.importance as number, 0.2, 1e-12);
        const [column] = session.data.derivedColumns();
        assert.deepStrictEqual(column.score, terms);
        assert.strictEqual(column.expression, `${quotePath(terms[0].path)} * \`0.6\` + data.size * \`0.4\``);
        session.dispose();
    });

    it("follows its inputs, scores null where a term has no number, and counts a flat column 0", async () => {
        const session = await people();
        await session.data.updateNodes([
            { id: "a", values: { size: 3, flat: 7 } },
            { id: "b", values: { size: 1, flat: 7 } },
        ]);
        await session.data.deriveScore("s", [{ path: "data.size" }, { path: "data.flat" }]);
        assert.strictEqual(session.data.node("a")?.s, 1);
        assert.strictEqual(session.data.node("b")?.s, 0);
        assert.isNull(session.data.node("c")?.s ?? null, "c has no size");

        await session.data.updateNodes([{ id: "c", values: { size: 5, flat: 7 } }]);
        assert.strictEqual(session.data.node("c")?.s, 1, "the new largest");
        assert.strictEqual(session.data.node("a")?.s, 0.5, "rescaled in the same step");
        session.dispose();
    });

    it("is undoable, and saved as its terms and worked out again on open", async () => {
        const saved = await people();
        const run = saved.run({ op: "algo.run", algorithm: "degree" });
        await run;
        await saved.data.deriveScore("s", [{ path: resultPath(run.id, "value"), weight: 2 }]);
        const { text } = await saved.project.save();

        const opened = createGraphSession({ runs: { execute: scores } });
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual(opened.data.derivedColumns(), saved.data.derivedColumns());
        assert.strictEqual(opened.data.node("b")?.s, 2);

        await saved.undo();
        assert.deepStrictEqual(saved.data.derivedColumns(), []);
        saved.dispose();
        opened.dispose();
    });

    it("refuses what it cannot take, with a code", async () => {
        const session = await people();
        const none = await refusal(() => session.data.deriveScore("s", []));
        assert.strictEqual(none.details.reason, "no-terms");
        const weight = await refusal(() => session.data.deriveScore("s", [{ path: "data.name", weight: Number.NaN }]));
        assert.strictEqual(weight.details.reason, "bad-weight");
        const unknown = await refusal(() => session.data.deriveScore("s", [{ path: "data.nmae" }]));
        assert.strictEqual(unknown.code, "E_UNKNOWN_ATTRIBUTE");
        const taken = await refusal(() => session.data.deriveScore("name", [{ path: "data.nickname" }]));
        assert.strictEqual(taken.details.reason, "name-taken");
        assert.deepStrictEqual(session.data.derivedColumns(), []);
        session.dispose();
    });

    it("SessionDataApi.deriveScore: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            (size) =>
                withConsumerStrictState(async () => {
                    const session = createGraphSession();
                    await session.data.addNodes(
                        Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, weight: at })),
                    );
                    const visits = await visitsDuring(() =>
                        session.data.deriveScore("heavy", [{ path: "data.weight", weight: 2 }]),
                    );
                    session.dispose();
                    return visits;
                }),
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.deriveScore" },
        );
    });
});
