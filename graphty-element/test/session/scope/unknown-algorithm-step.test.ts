/**
 * @file A `measure` step naming an algorithm nothing registers (a project saved with an extension's
 * algorithm, opened where the extension is not loaded): the step selects nothing and says why with
 * a coded reason, and the rest of the selection reads as usual. Never a throw from the reading.
 */

import { assert, describe, it } from "vitest";

import type { RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);
const ROLE = (at: number): string => (at % 3 === 0 ? "staff" : "guest");
const STAFF_COUNT = IDS.filter((_id, at) => at % 3 === 0).length;

/**
 * Les Miserables with a role per character.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(IDS.map((id, at) => ({ id, role: ROLE(at) })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    return session;
}

const STAFF: RuleTree = { kind: "categories", attribute: "data.role", values: ["staff"] };
const UNKNOWN: RuleTree = {
    kind: "measure",
    algorithm: "no-such-algorithm",
    field: "onPath",
    test: { kind: "threshold", top: 5 },
};
const REASON = { code: "unknown-algorithm" as const, params: { algorithm: "no-such-algorithm" } };

/**
 * A node union of the given branches over the whole graph.
 * @param branches - The branches.
 * @returns The leaf.
 */
function union(branches: UnionLeaf["branches"]): UnionLeaf {
    return { kind: "union", side: "nodes", within: "graph", branches };
}

describe("a measure step naming an unregistered algorithm", () => {
    it("selects nothing and says why, while another branch reads as usual", async () => {
        const session = await lesMis();
        const rule = union([
            { start: "all", steps: [{ op: "keep", rule: UNKNOWN }] },
            { start: "none", steps: [{ op: "add", rule: STAFF }] },
        ]);
        const watch = session.scope.watchSteps(rule, () => undefined);
        const [broken, staff] = watch.current.branches;
        watch.end();
        assert.strictEqual(broken.state, "ready");
        assert.deepEqual(broken.steps[0].reason, REASON);
        assert.strictEqual(broken.count, 0);
        assert.strictEqual(staff.count, STAFF_COUNT);
        assert.strictEqual(session.runs.list().length, 0, "no run is started for it");
    });

    it("an Add of it adds nothing; the steps after it still apply", async () => {
        const session = await lesMis();
        const rule = union([
            {
                start: "none",
                steps: [
                    { op: "add", rule: UNKNOWN },
                    { op: "add", rule: STAFF },
                ],
            },
        ]);
        const resolved = await session.scope.resolve({ define: { kind: "rule", where: rule, reading: "clipped" } });
        assert.strictEqual(resolved.nodes.size, STAFF_COUNT);
    });

    it("a style layer with it is added and read without a throw", async () => {
        const session = await lesMis();
        const rule = union([{ start: "none", steps: [{ op: "add", rule: UNKNOWN }] }]);
        const layer = await session.styles.add({
            name: "Path",
            target: "node",
            selector: { match: "rule", where: rule },
            set: { "node.color": "#d55e00" },
        });
        const where = session.styles.get(layer.id)?.selector;
        assert.isTrue(where?.match === "rule");
        const watch = session.scope.watchSteps(where?.match === "rule" ? where.where : rule, () => undefined);
        assert.deepEqual(watch.current.branches[0].steps[0].reason, REASON);
        assert.strictEqual(watch.current.total.count, 0);
        watch.end();
    });
});
