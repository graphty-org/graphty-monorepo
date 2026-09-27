/**
 * @file `session.sets`: every synchronous door through the published session, `set:changed`,
 * and reading and counting a kept set through `session.scope` (design/sets/sets-design.md
 * sections 14, 15.2).
 */

import { assert, describe, it } from "vitest";

import type { SetDefinitionInput } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import type { SetChange } from "../../src/session/sets/types";
import { edgeBetween, type Harness, makeSession } from "./helpers";
import { finishAtOnce } from "./runs/harness";

/** A path a-b-c-d and a spur c-e. */
function harnessOf(): Harness {
    const harness = makeSession({ runs: { execute: finishAtOnce } });
    harness.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "c", dst: "e" },
        ],
    );

    return harness;
}

/**
 * The code a call refused with, whether it threw or rejected; null when it did neither.
 * @param call - The call.
 * @returns The code.
 */
async function codeOf(call: () => unknown): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("session.sets: the synchronous doors", () => {
    it("creates, reads, renames, redefines, edits members and removes, telling set:changed each time", () => {
        const h = harnessOf();
        const { sets } = h.session;
        const changes: SetChange[] = [];
        const stop = h.session.on("set:changed", (change) => changes.push(change));

        const id = sets.create({ kind: "fixed", nodes: ["b", "a"], reading: "induced" }, { name: "Core" });
        assert.strictEqual(id, "set_core");
        assert.deepStrictEqual(sets.get(id)?.definition, { kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        assert.deepStrictEqual(sets.get(id)?.createdFrom, { kind: "user" });
        assert.match(sets.get(id)?.revision ?? "", /^r1:/);
        assert.deepStrictEqual(sets.list().map((set) => set.id), [id]);

        sets.rename(id, "Hub");
        sets.redefine(id, { kind: "fixed", nodes: ["a", "b"], reading: "listed" });
        sets.addMembers(id, { nodes: ["c"], edges: [edgeBetween(h, "b", "c")] });
        sets.removeMembers(id, { nodes: ["a"] });
        assert.deepStrictEqual(sets.get(id)?.definition.kind, "fixed");
        assert.strictEqual(sets.get(id)?.name, "Hub");
        sets.remove(id);
        assert.isUndefined(sets.get(id));
        assert.deepStrictEqual(sets.list(), []);

        assert.deepStrictEqual(
            changes.map((change) => [change.change, [...change.fields]]),
            [
                ["created", []],
                ["updated", ["name"]],
                ["updated", ["definition"]],
                ["updated", ["definition"]],
                ["updated", ["definition"]],
                ["removed", []],
            ],
        );
        assert.isTrue(changes.every((change) => change.id === id && change.cause === "command"));
        assert.isNull(changes.at(-1)?.set);

        stop();
        h.session.dispose();
    });

    it("tells nothing for a refused write or a no-op", async () => {
        const h = harnessOf();
        const { sets } = h.session;
        const id = sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "One" });
        const changes: SetChange[] = [];
        h.session.on("set:changed", (change) => changes.push(change));

        assert.strictEqual(await codeOf(() => sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" }, { name: "One" })), "E_DUPLICATE_ID");
        sets.rename(id, "One");
        assert.deepStrictEqual(changes, []);
        h.session.dispose();
    });
});

describe("reading and counting a kept set through session.scope", () => {
    const kinds: [string, SetDefinitionInput, readonly string[], number][] = [
        ["fixed", { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" }, ["a", "b", "c"], 2],
        ["rule", { kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" }, ["b", "c"], 1],
        ["path", { kind: "path", nodes: ["a", "b", "c", "d"] }, ["a", "b", "c", "d"], 3],
    ];

    for (const [kind, definition, nodes, edges] of kinds) {
        it(`resolves and counts a ${kind} set`, async () => {
            const h = harnessOf();
            const id = h.session.sets.create(definition, { name: kind });

            const resolved = await h.session.scope.resolve({ set: id });
            assert.deepStrictEqual([...resolved.nodes].sort(), [...nodes]);
            assert.strictEqual(resolved.edgeCount, edges);

            const count = await h.session.scope.count({ set: id });
            assert.strictEqual(count.nodes, nodes.length);
            assert.strictEqual(count.edges, edges);
            assert.isTrue(count.exact);
            h.session.dispose();
        });
    }

    it("reports what a fixed or path set names that the graph does not hold", async () => {
        const h = harnessOf();
        const fixed = h.session.sets.create(
            { kind: "fixed", nodes: ["a", "gone"], edges: [{ source: "a", target: "zz", id: "nowhere" }], reading: "listed" },
            { name: "Fixed" },
        );
        const path = h.session.sets.create({ kind: "path", nodes: ["a", "b", "gone"] }, { name: "Path" });

        const fixedCount = await h.session.scope.count({ set: fixed });
        assert.strictEqual(fixedCount.missingNodes, 1);
        assert.strictEqual(fixedCount.missingEdges, 1);

        const pathCount = await h.session.scope.count({ set: path });
        assert.strictEqual(pathCount.missingNodes, 1);
        assert.strictEqual(pathCount.missingEdges, 1, "the step to a node that is gone has no edge");

        const rule = h.session.sets.create({ kind: "rule", where: { kind: "degree", min: 1 }, reading: "induced" }, { name: "Rule" });
        const ruleCount = await h.session.scope.count({ set: rule });
        assert.isUndefined(ruleCount.missingNodes, "a rule names nothing, so nothing it names can be missing");
        h.session.dispose();
    });

    it("counts a removed set, and a rule over one, as nothing without throwing", async () => {
        const h = harnessOf();
        const inner = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Inner" });
        const outer = h.session.sets.create({ kind: "rule", where: { kind: "scope", scope: { set: inner } }, reading: "induced" }, { name: "Outer" });
        h.session.sets.remove(inner);

        assert.deepStrictEqual(await h.session.scope.count({ set: inner }), { nodes: 0, edges: 0, exact: true });
        assert.deepStrictEqual(await h.session.scope.count({ set: outer }), { nodes: 0, edges: 0, exact: true });
        assert.strictEqual(await codeOf(() => h.session.scope.resolve({ set: inner })), "E_BAD_COMMAND", "resolving a removed set refuses");
        h.session.dispose();
    });

    it("refuses to count an id that was never issued", async () => {
        const h = harnessOf();

        assert.strictEqual(await codeOf(() => h.session.scope.count({ set: "set_never" })), "E_BAD_COMMAND");
        h.session.dispose();
    });
});

describe("a run over a kept set", () => {
    it("records the set and its revision, the reading, and labels the run by the set's name", async () => {
        const h = harnessOf();
        const id = h.session.sets.create({ kind: "path", nodes: ["a", "b", "c"] }, { name: "Route" });
        const revision = h.session.sets.get(id)?.revision;

        await h.session.runs.start("degree", undefined, { as: "whole", scope: "graph", style: false });
        const run = h.session.runs.start("degree", undefined, { as: "route", scope: { set: id }, style: false });
        await run;

        assert.deepStrictEqual(run.record.scope.set, { id, revision });
        assert.strictEqual(run.record.scope.reading, "listed");
        assert.include(run.label, "Route");

        h.session.sets.redefine(id, { kind: "path", nodes: ["a", "b"] });
        assert.strictEqual(run.record.scope.set?.revision, revision, "the record keeps the revision the run resolved");

        const whole = h.session.runs.get("whole");
        assert.isUndefined(whole?.record.scope.set);
        assert.strictEqual(whole?.record.scope.reading, "induced");
        h.session.dispose();
    });
});

describe("scope.save freezes the live keywords", () => {
    it("keeps the nodes selected when it was saved, not the selection that follows", async () => {
        const h = harnessOf();
        await h.session.selection.apply({ nodes: ["a", "b"] });
        const id = h.session.scope.save("Picked", "selection");
        await h.session.selection.apply({ nodes: ["e"] });

        assert.deepStrictEqual([...(await h.session.scope.resolve({ set: id })).nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual(h.session.scope.list()[0]?.spec, { nodes: ["a", "b"] });
        h.session.dispose();
    });

    it("keeps what was visible, with the edges a filter hid left out", async () => {
        const h = makeSession();
        h.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", weight: 1 },
                { src: "b", dst: "c", weight: 0.1 },
            ],
        );
        await h.session.visibility.set({ kind: "edges", where: "data.weight > `0.5`" });
        const id = h.session.scope.save("Shown", "visible");
        await h.session.visibility.set(null);

        const kept = await h.session.scope.resolve({ set: id });
        assert.deepStrictEqual([...kept.nodes].sort(), ["a", "b", "c"]);
        assert.deepStrictEqual([...kept.edges], [edgeBetween(h, "a", "b")], "the hidden edge stays out after the filter is cleared");
        const { spec } = h.session.scope.list()[0] ?? {};
        assert.isTrue(typeof spec === "object" && "define" in spec && spec.define.kind === "fixed" && spec.define.reading === "listed");
        h.session.dispose();
    });

    it("stores what was visible as its nodes when no edge was hidden", async () => {
        const h = harnessOf();
        const id = h.session.scope.save("All", "visible");

        assert.deepStrictEqual(h.session.scope.list()[0]?.spec, { nodes: ["a", "b", "c", "d", "e"] });
        assert.strictEqual((await h.session.scope.count({ set: id })).edges, 4);
        h.session.dispose();
    });
});
