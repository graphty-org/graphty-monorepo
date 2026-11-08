/**
 * A filter draft (`visibility.draft`, design/working-graph/design.md section 3): a filter condition
 * edited without changing what is shown. Its edits write nothing until `commit()`, which lands them
 * as one undo step; `cancel()` writes nothing. Its counts are over the whole graph.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type RuleTree } from "../../../session";

/** Hosts and services with a score. */
const DATA = JSON.stringify({
    nodes: [
        { id: "a", type: "host", score: 0.9 },
        { id: "b", type: "host", score: 0.2 },
        { id: "c", type: "service", score: 0.8 },
        { id: "d", type: "service", score: 0.1 },
        { id: "e", type: "host", score: 0.75 },
    ],
    edges: [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
        { src: "d", dst: "e" },
    ],
});

const HOSTS: RuleTree = { kind: "categories", attribute: "data.type", values: ["host"] };
const HIGH: RuleTree = { kind: "range", attribute: "data.score", min: 0.8 };

/**
 * A session holding the five nodes.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: DATA } });
    return session;
}

/**
 * The visible node ids, sorted.
 * @param session - The session.
 * @returns The ids.
 */
function shown(session: GraphSession): string[] {
    return [...session.visibility.nodes].map(String).sort();
}

describe("a filter draft", () => {
    it("writes nothing while it is edited, and lands as one step on commit", async () => {
        const session = await graph();
        const steps = session.history.steps.length;
        const draft = session.visibility.draft({ effect: "keep", rule: HOSTS });
        draft.update({ rule: HIGH });

        assert.lengthOf(session.visibility.conditions, 0, "nothing is written while it is open");
        assert.deepEqual(shown(session), ["a", "b", "c", "d", "e"], "and nothing that is shown changes");
        assert.strictEqual(session.history.steps.length, steps, "and no step is recorded");
        assert.deepEqual(draft.counts().nodes, { matched: 2, total: 5 }, "counted over the whole graph");

        const { id } = await draft.commit();
        assert.strictEqual(id, draft.condition.id);
        assert.deepEqual(shown(session), ["a", "c"]);
        assert.strictEqual(session.history.steps.length, steps + 1, "one step");
        assert.isFalse(draft.open);

        await session.undo();
        assert.lengthOf(session.visibility.conditions, 0, "undo takes the whole edit back");
    });

    it("edits an existing condition by id, its edits held until commit", async () => {
        const session = await graph();
        await session.visibility.addCondition({ id: "f", effect: "keep", rule: HOSTS });
        assert.deepEqual(shown(session), ["a", "b", "e"]);
        const steps = session.history.steps.length;

        const draft = session.visibility.draft("f");
        draft.update({ rule: HIGH });
        assert.deepEqual(shown(session), ["a", "b", "e"], "the condition still filters as written");
        assert.deepEqual(draft.counts().nodes, { matched: 2, total: 5 });

        await draft.commit();
        assert.deepEqual(shown(session), ["a", "c"]);
        assert.deepEqual(session.visibility.conditions[0]?.rule, HIGH);
        assert.strictEqual(session.history.steps.length, steps + 1);
    });

    it("keeps a write that lands on the condition while its draft is open", async () => {
        const session = await graph();
        await session.visibility.addCondition({ id: "f", effect: "keep", rule: HOSTS });
        const draft = session.visibility.draft("f");
        draft.update({ rule: HIGH });
        await session.visibility.updateCondition("f", { name: "Busy" });
        await draft.commit();
        assert.strictEqual(session.visibility.conditions[0]?.name, "Busy", "the rename is kept");
        assert.deepEqual(session.visibility.conditions[0]?.rule, HIGH, "and the draft's edit lands");
    });

    it("writes nothing on cancel, and refuses edits once closed", async () => {
        const session = await graph();
        const steps = session.history.steps.length;
        const draft = session.visibility.draft({ effect: "keep", rule: HOSTS });
        draft.cancel();
        assert.lengthOf(session.visibility.conditions, 0);
        assert.strictEqual(session.history.steps.length, steps);
        assert.throws(() => {
            draft.update({ rule: HIGH });
        }, /closed/);
        assert.throws(() => {
            void draft.commit();
        }, /closed/);
    });

    it("refuses an id no condition has", async () => {
        const session = await graph();
        assert.throws(() => session.visibility.draft("missing"));
    });
});
