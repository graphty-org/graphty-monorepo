/**
 * Filter conditions: a flat list of `{ id, on, effect, rule }` where order never matters. Keep
 * conditions intersect what stays, exclude conditions add up what goes, select conditions select
 * what all of them match over the whole graph. Each condition says what its rule matches, and the
 * filter steps are a view of the keep and exclude conditions.
 */
import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    type FilterCondition,
    type FilterConditionInput,
    type GraphSession,
    type RuleTree,
    type TransactionScope,
} from "../../../session";
import { dispatcherOf } from "../../../src/session/GraphSession";

/** Hosts and services with a score, and weighted edges; edge ids are "0" to "4" in this order. */
const DATA = JSON.stringify({
    nodes: [
        { id: "a", type: "host", score: 0.9 },
        { id: "b", type: "host", score: 0.2 },
        { id: "c", type: "service", score: 0.8 },
        { id: "d", type: "service", score: 0.1 },
        { id: "e", type: "host", score: 0.75 },
    ],
    edges: [
        { src: "a", dst: "b", weight: 5 },
        { src: "b", dst: "c", weight: 1 },
        { src: "c", dst: "d", weight: 2 },
        { src: "d", dst: "e", weight: 6 },
        { src: "a", dst: "e", weight: 3 },
    ],
});
const NODES = ["a", "b", "c", "d", "e"];
const EDGES: readonly (readonly [string, string, string])[] = [
    ["0", "a", "b"],
    ["1", "b", "c"],
    ["2", "c", "d"],
    ["3", "d", "e"],
    ["4", "a", "e"],
];
const TYPE: Record<string, string> = { a: "host", b: "host", c: "service", d: "service", e: "host" };
const SCORE: Record<string, number> = { a: 0.9, b: 0.2, c: 0.8, d: 0.1, e: 0.75 };

const HOSTS: RuleTree = { kind: "categories", attribute: "data.type", values: ["host"] };
const HIGH: RuleTree = { kind: "range", attribute: "data.score", min: 0.8 };
const SERVICES: RuleTree = { kind: "categories", attribute: "data.type", values: ["service"] };
const HEAVY: RuleTree = { kind: "range", attribute: "data.weight", min: 5 };

async function graph(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: DATA } });
    return session;
}

function visible(session: GraphSession): { nodes: string[]; edges: string[] } {
    return {
        nodes: [...session.visibility.nodes].map(String).sort(),
        edges: [...session.visibility.edges].map(String).sort(),
    };
}

function selected(session: GraphSession): { nodes: string[]; edges: string[] } {
    return {
        nodes: NODES.filter((id) => session.selection.has(id)),
        edges: EDGES.map(([id]) => id).filter((id) => session.selection.has(id)),
    };
}

describe("filter conditions", () => {
    it("combines keep, exclude and select for every on/off combination, whatever the order", async () => {
        const session = await graph();
        for (let mask = 0; mask < 8; mask++) {
            const on = [Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4)];
            const conditions: FilterConditionInput[] = [
                { id: "hosts", on: on[0], effect: "keep", rule: HOSTS },
                { id: "high", on: on[1], effect: "exclude", rule: HIGH },
                { id: "services", on: on[2], effect: "select", rule: SERVICES },
            ];
            // The order the list is in changes nothing.
            const list = mask % 2 === 0 ? conditions : [...conditions].reverse();
            await session.visibility.setConditions(list);

            const shown = NODES.filter((id) => (!on[0] || TYPE[id] === "host") && (!on[1] || SCORE[id] < 0.8));
            const edges = EDGES.filter(([, s, t]) => shown.includes(s) && shown.includes(t)).map(([id]) => id);
            assert.deepStrictEqual(visible(session), { nodes: shown, edges: edges.sort() }, `mask ${mask}`);
            // Select selects only what is in the picture.
            const picked = on[2] ? ["c", "d"].filter((id) => shown.includes(id)) : [];
            assert.deepStrictEqual(selected(session).nodes, picked, `selection, mask ${mask}`);
        }

        session.dispose();
    });

    it("hides a OR b with two exclude conditions, and a AND b with one on all[a, b]", async () => {
        const session = await graph();
        await session.visibility.setConditions([
            { effect: "exclude", rule: HOSTS },
            { effect: "exclude", rule: HIGH },
        ]);
        assert.deepStrictEqual(visible(session).nodes, ["d"]);

        await session.visibility.setConditions([{ effect: "exclude", rule: { kind: "all", of: [HOSTS, HIGH] } }]);
        assert.deepStrictEqual(visible(session).nodes, ["b", "c", "d", "e"]);
        session.dispose();
    });

    it("reads an edge condition by its effect, unless the rule names a reading", async () => {
        const session = await graph();
        const { id } = await session.visibility.addCondition({ effect: "keep", rule: HEAVY });
        // Keep: the heavy edges and the nodes at their ends.
        assert.deepStrictEqual(visible(session), { nodes: ["a", "b", "d", "e"], edges: ["0", "3"] });

        // Exclude: only the heavy edges go; no node is hidden.
        await session.visibility.updateCondition(id, { effect: "exclude" });
        assert.deepStrictEqual(visible(session), { nodes: NODES, edges: ["1", "2", "4"] });
        assert.deepStrictEqual(session.visibility.conditions[0].rule, HEAVY, "the rule is not rewritten");

        // Select: only the heavy edges, nothing hidden.
        await session.visibility.updateCondition(id, { effect: "select" });
        assert.deepStrictEqual(visible(session), { nodes: NODES, edges: ["0", "1", "2", "3", "4"] });
        assert.deepStrictEqual(selected(session), { nodes: [], edges: ["0", "3"] });

        // A reading written in the rule wins: keep with "all" keeps every node.
        await session.visibility.updateCondition(id, { effect: "keep", rule: { ...HEAVY, nodes: "all" } });
        assert.deepStrictEqual(visible(session), { nodes: NODES, edges: ["0", "3"] });
        session.dispose();
    });

    it("counts what each rule matches, whatever its effect, on or the others", async () => {
        const session = await graph();
        await session.visibility.setConditions([
            { id: "hosts", effect: "keep", rule: HOSTS },
            { id: "heavy", effect: "exclude", rule: HEAVY, on: false },
            { id: "ends", effect: "select", rule: { ...HEAVY, nodes: "ends" } },
            { id: "gone", effect: "keep", rule: { kind: "range", attribute: "data.nothing", min: 1 } },
        ]);

        const counts = session.visibility.conditionCounts();
        assert.deepStrictEqual(counts, [
            { id: "hosts", nodes: { matched: 3, total: 5 }, edges: null, unresolved: [] },
            { id: "heavy", nodes: null, edges: { matched: 2, total: 5 }, unresolved: [] },
            { id: "ends", nodes: { matched: 4, total: 5 }, edges: { matched: 2, total: 5 }, unresolved: [] },
            { id: "gone", nodes: { matched: 0, total: 5 }, edges: null, unresolved: ["data.nothing"] },
        ]);
        // Read again with nothing changed: the same answer, counted once.
        assert.strictEqual(session.visibility.conditionCounts(), counts);

        // Another effect, on or off: the same count.
        await session.visibility.updateCondition("hosts", { effect: "exclude", on: false });
        const after = session.visibility.conditionCounts();
        assert.deepStrictEqual(after[0], counts[0]);
        // Only the edited condition is counted again; the others hand back their kept count.
        assert.strictEqual(after[1], counts[1]);
        assert.strictEqual(after[2], counts[2]);
        assert.strictEqual(after[3], counts[3]);
        session.dispose();
    });

    it("selects what the select conditions match only when they change, and undo puts the reader's selection back", async () => {
        const session = await graph();
        await session.selection.apply({ nodes: ["a"] });
        const selections: string[] = [];
        const shows: string[] = [];
        session.on("selection:changed", (delta) => selections.push(delta.cause));
        session.on("visibility:changed", (change) => shows.push(change.filterKind));

        // A keep condition hides, and leaves the reader's selection alone.
        await session.visibility.addCondition({ id: "hosts", effect: "keep", rule: HOSTS });
        assert.deepStrictEqual(selected(session).nodes, ["a"]);
        assert.deepStrictEqual(shows, ["conditions"]);

        // A select condition selects the matches in the picture and hides nothing: the services
        // are hidden by the keep condition, so nothing is selected.
        await session.visibility.addCondition({ id: "services", effect: "select", rule: SERVICES });
        assert.deepStrictEqual(selected(session).nodes, []);
        assert.deepStrictEqual(selections, ["command"]);
        assert.deepStrictEqual(shows, ["conditions"], "a select-only change is not a visibility change");

        // A keep edit that brings the services into the picture selects them; setSteps that
        // hides them again drops them; turning the select condition off empties the selection.
        await session.selection.apply({ nodes: ["b"] });
        await session.visibility.updateCondition("hosts", { rule: { ...HOSTS, values: ["host", "service"] } });
        assert.deepStrictEqual(selected(session).nodes, ["c", "d"]);
        await session.visibility.setSteps([{ id: "s1", on: true, rule: HOSTS }]);
        assert.deepStrictEqual(selected(session).nodes, []);
        assert.deepStrictEqual(
            session.visibility.conditions.map((each) => each.id),
            ["s1", "services"],
            "setSteps leaves the select conditions",
        );
        await session.visibility.updateCondition("services", { on: false });
        assert.deepStrictEqual(selected(session).nodes, []);

        // Undo walks the selection back through each step; undo of the add puts "a" back.
        await session.undo(); // services off
        assert.deepStrictEqual(selected(session).nodes, []);
        await session.undo(); // setSteps
        assert.deepStrictEqual(selected(session).nodes, ["c", "d"]);
        await session.undo(); // the keep edit
        assert.deepStrictEqual(selected(session).nodes, ["b"], "undo puts back the reader's selection");
        await session.undo(); // the select condition's add
        assert.deepStrictEqual(selected(session).nodes, ["a"]);
        await session.redo();
        assert.deepStrictEqual(selected(session).nodes, []);
        session.dispose();
    });

    it("switches the select conditions off for a selection.apply a reader made, never for a script's", async () => {
        const session = await graph();
        await session.visibility.addCondition({ id: "hosts", effect: "select", rule: HOSTS });
        const causes: string[] = [];
        session.on("selection:changed", (delta) => causes.push(delta.cause));

        // A script's selection leaves the condition on, as it always did.
        await session.selection.apply({ nodes: ["c"] });
        assert.isTrue(session.visibility.conditions[0]?.on);

        // A reader's pick from a table acts like a click on the canvas.
        const delta = await session.selection.apply({ nodes: ["d"] }, "replace", { cause: "user" });
        assert.strictEqual(delta.cause, "user");
        assert.isFalse(session.visibility.conditions[0]?.on, "the reader's selection switched the condition off");
        assert.deepStrictEqual(selected(session).nodes, ["d"], "the reader's selection stands");
        assert.deepStrictEqual(session.selection.origin, { nodes: ["d"] }, "the target is still the origin");
        assert.deepStrictEqual(causes, ["api", "user"]);

        await session.undo();
        assert.isTrue(session.visibility.conditions[0]?.on, "undo switches the condition back on");

        try {
            await session.selection.apply({ nodes: ["d"] }, "replace", { cause: "history" as "user" });
            assert.fail("a cause other than user or api is refused");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_BAD_COMMAND");
        }
        session.dispose();
    });

    it("selects only what the other conditions leave in the picture, whatever order they come in", async () => {
        const conditions: FilterConditionInput[] = [
            { id: "high", effect: "exclude", rule: HIGH },
            { id: "hosts", effect: "select", rule: HOSTS },
        ];
        for (const list of [conditions, [...conditions].reverse()]) {
            const session = await graph();
            for (const each of list) {
                await session.visibility.addCondition(each);
            }

            // Host a scores 0.8 or more and is out of the picture: b and e are selected.
            assert.deepStrictEqual(selected(session).nodes, ["b", "e"], list.map((each) => each.id).join(" then "));
            assert.ok(NODES.filter((id) => session.selection.has(id)).every((id) => session.visibility.isVisible(id)));

            // Switching the exclude condition off brings them back into the selection.
            await session.visibility.updateCondition("high", { on: false });
            assert.deepStrictEqual(selected(session).nodes, ["a", "b", "e"]);
            session.dispose();
        }
    });

    it("keeps the steps API as a view: setSteps then steps is the same list, ids stay unique", async () => {
        const session = await graph();
        const steps = [
            { id: "s1", on: true, rule: HOSTS },
            { id: "s2", on: false, rule: { kind: "not", of: { ...HEAVY, nodes: "ends" } } as RuleTree },
            { id: "s3", on: true, rule: HEAVY },
        ];
        await session.visibility.setSteps(steps);
        assert.deepStrictEqual(session.visibility.steps, steps);
        // A step on an edge value with no reading means what it meant as a step: no node hidden.
        assert.deepStrictEqual(visible(session), { nodes: ["a", "b", "e"], edges: ["0"] });
        assert.deepStrictEqual(
            session.visibility.conditions.map((each: FilterCondition) => each.effect),
            ["keep", "keep", "keep"],
        );

        // An exclude condition reads as a not step.
        await session.visibility.addCondition({ id: "x", effect: "exclude", rule: HIGH });
        assert.deepStrictEqual(session.visibility.steps.at(-1), { id: "x", on: true, rule: { kind: "not", of: HIGH } });

        await session.visibility.addCondition({ id: "sel", effect: "select", rule: HIGH });
        assert.throws(() => {
            void session.visibility.setSteps([{ id: "sel", on: true, rule: HOSTS }]);
        }, /unique/);
        assert.throws(() => {
            void session.visibility.addCondition({ id: "sel", effect: "keep", rule: HOSTS });
        }, /unique/);
        assert.throws(() => {
            void session.visibility.setConditions([
                { id: "q", effect: "keep", rule: HOSTS },
                { id: "q", effect: "keep", rule: HIGH },
            ]);
        }, /unique/);
        assert.throws(() => {
            void session.visibility.setConditions([{ effect: "paint" as never, rule: HOSTS }]);
        }, /effect/);
        assert.throws(() => {
            void session.visibility.updateCondition("nope", { on: false });
        }, /nope/);
        session.dispose();
    });

    it("records one undoable step per add, switch, edit and remove, naming the condition", async () => {
        const session = await graph();
        const { id } = await session.visibility.addCondition({ effect: "keep", rule: HOSTS });
        await session.visibility.updateCondition(id, { on: false });
        await session.visibility.updateCondition(id, { on: true });
        await session.visibility.updateCondition(id, { effect: "exclude" });
        await session.visibility.removeCondition(id);

        assert.deepStrictEqual(
            session.history.steps.slice(-5).map((step) => step.fact),
            [
                { code: "visibility.condition-add", params: { id, effect: "keep" } },
                { code: "visibility.condition-off", params: { id, effect: "keep" } },
                { code: "visibility.condition-on", params: { id, effect: "keep" } },
                { code: "visibility.condition-edit", params: { id, effect: "exclude", previousEffect: "keep" } },
                { code: "visibility.condition-remove", params: { id, effect: "exclude" } },
            ],
        );
        await session.undo();
        assert.deepStrictEqual(visible(session).nodes, ["c", "d"]);
        session.dispose();
    });

    it("switches every keep and exclude condition off in one transaction, one undo step", async () => {
        const session = await graph();
        await session.visibility.setConditions([
            { id: "k", effect: "keep", rule: HOSTS },
            { id: "x", effect: "exclude", rule: HIGH },
            { id: "s", effect: "select", rule: SERVICES },
        ]);
        await session.transaction("Clear filters", async (tx) => {
            for (const c of tx.visibility.conditions) {
                if (c.on && c.effect !== "select") {
                    await tx.visibility.updateCondition(c.id, { on: false });
                }
            }
        });

        assert.deepStrictEqual(
            session.visibility.conditions.map((c) => [c.id, c.on]),
            [
                ["k", false],
                ["x", false],
                ["s", true],
            ],
        );
        assert.deepStrictEqual(visible(session).nodes, NODES);
        await session.undo();
        assert.deepStrictEqual(visible(session).nodes, ["b", "e"]);
        session.dispose();
    });

    it("announces a transaction's visibility change whatever order its keep and select edits come in", async () => {
        const orders: [string, (tx: TransactionScope) => PromiseLike<unknown>][][] = [
            [
                ["keep", (tx) => tx.visibility.addCondition({ effect: "keep", rule: HOSTS })],
                ["select", (tx) => tx.visibility.addCondition({ effect: "select", rule: HIGH })],
            ],
        ];
        orders.push([...orders[0]].reverse());
        for (const order of orders) {
            const session = await graph();
            let shows = 0;
            session.on("visibility:changed", () => shows++);
            await session.transaction("Both", async (tx) => {
                for (const [, edit] of order) {
                    await edit(tx);
                }
            });
            assert.deepStrictEqual(visible(session).nodes, ["a", "b", "e"]);
            assert.strictEqual(shows, 1, order.map(([name]) => name).join(" then "));
            session.dispose();
        }

        // Switching a keep condition off and then a select condition off.
        const session = await graph();
        await session.visibility.setConditions([
            { id: "k", effect: "keep", rule: HOSTS },
            { id: "s", effect: "select", rule: HIGH },
        ]);
        let shows = 0;
        session.on("visibility:changed", () => shows++);
        await session.transaction("Both off", async (tx) => {
            await tx.visibility.updateCondition("k", { on: false });
            await tx.visibility.updateCondition("s", { on: false });
        });
        assert.deepStrictEqual(visible(session).nodes, NODES);
        assert.strictEqual(shows, 1);
        session.dispose();
    });

    it("puts the reader's selection back when a transaction that added a select condition rolls back", async () => {
        const session = await graph();
        await session.selection.apply({ nodes: ["b"] });
        const failure = new Error("stop");
        let thrown: unknown;
        try {
            await session.transaction("Fails", async (tx) => {
                await tx.visibility.addCondition({ effect: "select", rule: HIGH });
                throw failure;
            });
        } catch (error) {
            thrown = error;
        }

        assert.strictEqual(thrown, failure);
        await dispatcherOf(session).lane.settled();
        assert.deepStrictEqual(session.visibility.conditions, []);
        assert.deepStrictEqual(selected(session).nodes, ["b"]);
        session.dispose();
    });

    it("keeps every condition and its effect through a column rename", async () => {
        const session = await graph();
        await session.visibility.setConditions([
            {
                id: "k",
                effect: "keep",
                rule: { kind: "not", of: { kind: "text", reads: "data.type", mode: "regex", text: "" } },
            },
            { id: "s", effect: "select", rule: { kind: "categories", attribute: "data.type", values: ["host"] } },
        ]);
        await session.data.renameColumn({ kind: "node", name: "type" }, "role");

        assert.deepStrictEqual(session.visibility.conditions, [
            {
                id: "k",
                on: true,
                effect: "keep",
                rule: { kind: "not", of: { kind: "text", reads: "data.role", mode: "regex", text: "" } },
            },
            {
                id: "s",
                on: true,
                effect: "select",
                rule: { kind: "categories", attribute: "data.role", values: ["host"] },
            },
        ]);
        session.dispose();
    });
});
