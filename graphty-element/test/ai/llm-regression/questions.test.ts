/**
 * @file Questions on a real model: with `questions: true`, a request only the reader can settle
 * ("my favorite department") is asked about with `ask_reader`, offering the departments the graph
 * holds; answering one continues the message, which styles exactly that department's nodes and
 * answers in text.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";

const DEPARTMENTS: Record<string, string> = {
    s1: "Sales",
    s2: "Sales",
    o1: "Ops",
    o2: "Ops",
    r1: "R&D",
    r2: "R&D",
};
const GRAPH = {
    nodes: Object.entries(DEPARTMENTS).map(([id, dept]) => ({ id, label: id, dept })),
    edges: [
        { source: "s1", target: "s2" },
        { source: "s2", target: "o1" },
        { source: "o1", target: "o2" },
        { source: "o2", target: "r1" },
        { source: "r1", target: "r2" },
    ],
};

/** How many questions one message may ask before the test stops answering. */
const MOST_QUESTIONS = 3;

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

/**
 * The nodes a layer the assistant added paints.
 * @param session - The session.
 * @returns Their ids.
 */
function styledNodes(session: GraphSession): string[] {
    return Object.keys(DEPARTMENTS).filter((id) =>
        session.styles.explain({ node: id }).contributions.some((contribution) => {
            const layer = session.styles.get(contribution.layerId);
            return layer !== undefined && layer.source.by !== "element";
        }),
    );
}

describe.skipIf(skipIfNoApiKey())("questions on a real model", () => {
    it("asks which department, offering the three, and styles exactly the one answered", async () => {
        const session = await assistantSession(GRAPH);
        harness = await LlmRegressionTestHarness.create({ session, questions: true });

        // "in red": "highlight" alone a model reads as selecting about one time in three.
        const first = await harness.testPrompt("highlight the nodes in my favorite department in red");
        assert.strictEqual(first.code, "AI_QUESTION_ASKED", JSON.stringify(first.toolCalls));
        const [question] = harness.pendingQuestions();
        for (const dept of ["Sales", "Ops", "R&D"]) {
            assert.include(question.choices, dept, JSON.stringify(question));
        }

        assert.deepStrictEqual(styledNodes(session), [], "nothing styled before the answer");

        let { result } = await harness.answerQuestion(question.id, "Sales");
        // A model may check once more before it acts; each further question is answered the same.
        for (let asked = 1; asked < MOST_QUESTIONS && result.code === "AI_QUESTION_ASKED"; asked++) {
            const [next] = harness.pendingQuestions();
            const sales = next.choices.find((choice) => choice.includes("Sales")) ?? next.choices[0];
            ({ result } = await harness.answerQuestion(next.id, sales));
        }

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.isNotEmpty(result.llmText ?? "", "the model answers in text");
        assert.deepStrictEqual(styledNodes(session), ["s1", "s2"]);
    });
});
