/**
 * @file A `state` rule leaf: hovered, selected, pinned and ghosted as calculated values. A layer
 * reading one follows the state live, and the leaf sits beside other conditions in a selection.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { ElementState, RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { selectorRule, selectorStates } from "../../../src/session/styles";

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/** Four nodes in a line, each at its step; nodes 1 and 2 are tagged. */
async function line(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        ["a", "b", "c", "d"].map((id, step) => ({ id, step, tagged: step < 2 ? "yes" : "no" })),
    );
    await session.data.addEdges([
        { source: "a", target: "b", step: 1 },
        { source: "b", target: "c", step: 2 },
        { source: "c", target: "d", step: 3 },
    ]);
    return session;
}

/** A node layer and an edge layer on a rule. */
async function layersOn(session: GraphSession, where: RuleTree): Promise<{ node: string; edge: string }> {
    const node = await session.styles.add({
        name: "Node",
        target: "node",
        selector: { match: "rule", where },
        set: { "node.color": "#123456" },
    });
    const edge = await session.styles.add({
        name: "Edge",
        target: "edge",
        selector: { match: "rule", where },
        set: { "edge.color": "#123456" },
    });
    await session.styles.settled();
    return { node: node.id, edge: edge.id };
}

/** How many elements a layer matches, once what is moving has settled. */
async function matched(session: GraphSession, id: string): Promise<number> {
    await session.styles.settled();
    return session.styles.counts(id).matched;
}

const leaf = (state: ElementState): RuleTree => ({ kind: "state", state });

describe("a state selector has a rule form", () => {
    it.each(["selected", "hovered", "ghosted", "pinned"] as const)("reads %s as a state leaf when asked", (state) => {
        assert.deepEqual(selectorRule({ match: "state", state }, { states: true }), {
            match: "rule",
            where: leaf(state),
        });
    });

    it.each(["selected", "hovered", "ghosted", "pinned"] as const)("reads %s as no rule by default", (state) => {
        assert.isUndefined(selectorRule({ match: "state", state }));
        assert.isUndefined(selectorRule({ match: "state", state }, { comparisons: true }));
    });

    it("names the states a selector reads, however deep", () => {
        const union: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                { start: "all", steps: [{ op: "keep", rule: leaf("selected") }] },
                { start: "none", steps: [{ op: "add", rule: { kind: "not", of: leaf("pinned") } }] },
            ],
        };
        assert.deepEqual(selectorStates({ match: "state", state: "hovered" }), ["hovered"]);
        assert.deepEqual(selectorStates({ match: "rule", where: union }), ["selected", "pinned"]);
        assert.deepEqual(selectorStates({ match: "everything" }), []);
    });

    it("refuses a state that does not exist", async () => {
        const session = await line();
        let refused = false;
        try {
            await session.styles.add({
                name: "Bad",
                target: "node",
                selector: { match: "rule", where: { kind: "state", state: "asleep" } as unknown as RuleTree },
                set: { "node.color": "#123456" },
            });
        } catch {
            refused = true;
        }
        assert.isTrue(refused);
        session.dispose();
    });
});

describe("a layer on a state leaf follows the state live", () => {
    it("selected: nodes and edges each as the selection holds them, ends or no ends", async () => {
        const session = await line();
        const { node, edge } = await layersOn(session, leaf("selected"));
        assert.strictEqual(await matched(session, node), 0);

        await session.selection.apply({ nodes: ["a", "d"] });
        assert.strictEqual(await matched(session, node), 2);
        assert.strictEqual(await matched(session, edge), 0);

        const [first] = session.data.edges();
        await session.selection.apply({ nodes: [], edges: [first.id] });
        assert.strictEqual(await matched(session, node), 0, "a selected edge selects no node");
        assert.strictEqual(await matched(session, edge), 1, "and stands without its ends");
        session.dispose();
    });

    it("hovered: the pointer's node, and no edge", async () => {
        const session = await line();
        const { node, edge } = await layersOn(session, leaf("hovered"));
        session.selection.hover("b");
        assert.strictEqual(await matched(session, node), 1);
        assert.strictEqual(await matched(session, edge), 0);
        session.selection.hover(null);
        assert.strictEqual(await matched(session, node), 0);
        session.dispose();
    });

    it("pinned: follows a pin, a release, an undo", async () => {
        const session = await line();
        const { node } = await layersOn(session, leaf("pinned"));
        await session.positions.pin(["a", "b"]);
        assert.strictEqual(await matched(session, node), 2);
        await session.positions.unpin(["a"]);
        assert.strictEqual(await matched(session, node), 1);
        await session.undo();
        assert.strictEqual(await matched(session, node), 2);
        session.dispose();
    });

    it("ghosted: follows the time window, with no layer on the state selector", async () => {
        const session = await line();
        await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
        await session.time.setSettings({ outside: "ghost" });
        const { node } = await layersOn(session, leaf("ghosted"));
        await session.time.window({ from: 0, to: 2 });
        assert.strictEqual(await matched(session, node), 2, "steps 2 and 3 lie outside");
        await session.time.window({ from: 0, to: 3 });
        assert.strictEqual(await matched(session, node), 1);
        session.dispose();
    });
});

describe("a state beside other conditions", () => {
    const tagged: RuleTree = { kind: "categories", attribute: "data.tagged", values: ["yes"] };
    const onNodes = (...steps: UnionLeaf["branches"][number]["steps"]): UnionLeaf => ({
        kind: "union",
        side: "nodes",
        within: "graph",
        branches: [{ start: "none", steps }],
    });

    it("narrows in an all", async () => {
        const session = await line();
        const { node } = await layersOn(session, { kind: "all", of: [leaf("selected"), tagged] });
        await session.selection.apply({ nodes: ["a", "c"] });
        assert.strictEqual(await matched(session, node), 1);
        session.dispose();
    });

    it("takes Add, Keep and Except in a union", async () => {
        const session = await line();
        const added = await layersOn(
            session,
            onNodes({ op: "add", rule: tagged }, { op: "add", rule: leaf("selected") }),
        );
        const kept = await layersOn(
            session,
            onNodes({ op: "add", rule: tagged }, { op: "keep", rule: leaf("selected") }),
        );
        const removed = await layersOn(
            session,
            onNodes({ op: "add", rule: tagged }, { op: "except", rule: leaf("selected") }),
        );
        await session.selection.apply({ nodes: ["a", "c"] });
        assert.strictEqual(await matched(session, added.node), 3, "a, b and c");
        assert.strictEqual(await matched(session, kept.node), 1, "a");
        assert.strictEqual(await matched(session, removed.node), 1, "b");
        await session.selection.apply({ nodes: [] });
        assert.strictEqual(await matched(session, added.node), 2, "it follows the selection");
        session.dispose();
    });

    it("reads as a step of a selection through asUnion", async () => {
        const session = await line();
        const union = session.scope.asUnion(leaf("selected"), { side: "nodes", within: "graph" });
        assert.deepEqual(
            union?.branches[0].steps.map((step) => step.rule),
            [leaf("selected")],
        );
        session.dispose();
    });
});

describe("a project on a state", () => {
    it("keeps a state selector and a state condition live through a save and an open", async () => {
        const saved = await line();
        await saved.config.set({ startingRows: true });
        await layersOn(saved, { kind: "all", of: [leaf("selected"), { kind: "isolated" }] });
        const { text } = await saved.project.save();
        saved.dispose();

        const session = createGraphSession();
        await session.project.open(text);
        const of = (name: string): string => {
            const layer = session.styles.list().find((each) => each.name === name && each.target === "node");
            assert.isDefined(layer, name);
            return layer?.id ?? "";
        };
        await session.selection.apply({ nodes: ["a", "b"] });
        assert.strictEqual(await matched(session, of("Selected")), 2, "a starting layer's selector");
        await session.styles.update(of("Node"), {
            selector: { match: "rule", where: { kind: "all", of: [leaf("selected"), { kind: "degree", min: 2 }] } },
        });
        assert.strictEqual(await matched(session, of("Node")), 1, "b alone has two edges");
        session.dispose();
    });
});

describe("what cannot follow the reader refuses a state", () => {
    it("a kept set", async () => {
        const session = await line();
        let refusal: { details?: { reason?: unknown } } = {};
        try {
            session.sets.create({ kind: "rule", where: leaf("selected"), reading: "clipped" }, { name: "Live" });
        } catch (error) {
            refusal = error as typeof refusal;
        }
        assert.strictEqual(refusal.details?.reason, "live-selection");
        session.dispose();
    });

    it("a visibility filter", async () => {
        const session = await line();
        let refusal: { code?: unknown } = {};
        try {
            await session.visibility.set(leaf("selected"));
        } catch (error) {
            refusal = error as typeof refusal;
        }
        assert.strictEqual(refusal.code, "E_UNSUPPORTED");
        session.dispose();
    });
});
