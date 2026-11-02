/**
 * @file `styles.showBranches`: while a reader picks, every layer is suspended (kept, listed, no
 * undo step), each branch's members are drawn in its color, and ending the view brings the
 * stack's picture back. Read through `styles.explain`, `styles.list` and `history`.
 */

import { assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);

/**
 * Les Miserables, every node painted red by one layer.
 * @returns The session and the layer's id.
 */
async function painted(): Promise<{ session: GraphSession; red: string }> {
    const session = createGraphSession();
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    const { id } = await session.styles.add({
        name: "Red",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#FF0000" },
    });
    await session.styles.settled();
    return { session, red: id };
}

const NEAR_VALJEAN: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            start: "none",
            color: "#009E73",
            steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 } }],
        },
    ],
};

/**
 * The color a node is drawn with, and the layer that wrote it.
 * @param session - The session.
 * @param node - The node.
 * @returns The color and its layer.
 */
function colorOf(session: GraphSession, node: string): { value: string; layerId: string | undefined } {
    const explained = session.styles.explain({ node });
    const entry = explained.channels.find((each) => each.channel === "node.color");
    const { r, g, b } = (explained.merged as Record<string, { r: number; g: number; b: number }>)["node.color"];
    const hex = `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    return { value: hex, layerId: entry?.layerId };
}

describe("styles.showBranches", () => {
    it("draws each branch's members in its color over a suspended stack, then restores it", async () => {
        const { session, red } = await painted();
        const layers = session.styles.list();
        const steps = session.history.steps.length;
        const shown: boolean[] = [];
        session.on("style:branches-shown-changed", ({ shown: now }) => shown.push(now));

        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        assert.isTrue(session.styles.showingBranches);
        assert.strictEqual(session.styles.shownBranches?.rule, NEAR_VALJEAN, "the view drawn is told");
        assert.strictEqual(colorOf(session, "Valjean").value, "#009E73");
        assert.notStrictEqual(colorOf(session, "Napoleon").layerId, red, "a suspended layer paints nothing");
        assert.strictEqual(session.styles.list(), layers, "the layer list is unchanged");
        assert.strictEqual(session.history.steps.length, steps, "no undo step");

        view.end();
        await session.styles.settled();
        assert.isFalse(session.styles.showingBranches);
        assert.isNull(session.styles.shownBranches);
        assert.deepEqual(colorOf(session, "Valjean"), { value: "#FF0000", layerId: red });
        assert.deepEqual(shown, [true, false]);
    });

    it("keeps the selection ring and the hover mark drawn above the branches", async () => {
        const { session } = await painted();
        const { id: ring } = await session.styles.add({
            name: "Selected",
            target: "node",
            selector: { match: "state", state: "selected" },
            set: { "node.haloColor": "#FFAA00", "node.haloOpacity": 1 },
        });
        const { id: hover } = await session.styles.add({
            name: "Hovered",
            target: "node",
            selector: { match: "state", state: "hovered" },
            set: { "node.color": "#0000FF" },
        });
        await session.selection.apply({ nodes: ["Valjean"] });
        session.selection.hover("Napoleon");
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        const halo = session.styles
            .explain({ node: "Valjean" })
            .channels.find((each) => each.channel === "node.haloColor");
        assert.strictEqual(halo?.layerId, ring, "the ring is still written while the view is drawn");
        assert.strictEqual(colorOf(session, "Napoleon").layerId, hover, "the hover mark is drawn above the view");
        view.end();
    });

    it("a marked branch keeps its members at full strength and draws the others faint", async () => {
        const { session } = await painted();
        const rule: UnionLeaf = {
            ...NEAR_VALJEAN,
            branches: [
                { ...NEAR_VALJEAN.branches[0], id: "near" },
                {
                    id: "napoleon",
                    start: "none",
                    color: "#D55E00",
                    steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Napoleon"] }, max: 0 } }],
                },
            ],
        };
        const opacity = (node: string): unknown =>
            (session.styles.explain({ node }).merged as Record<string, unknown>)["node.opacity"];
        const view = session.styles.showBranches({ rule, rest: "faint", mark: "napoleon" });
        await session.styles.settled();
        assert.strictEqual(opacity("Napoleon"), 1, "the marked branch is at full strength");
        assert.strictEqual(opacity("Valjean"), 0.2, "another branch is faint");
        assert.strictEqual(colorOf(session, "Valjean").value, "#009E73", "and keeps its color");
        view.end();
    });

    it("a marked branch draws a member it shares with an earlier branch in its own color", async () => {
        const { session } = await painted();
        // A: Valjean and his neighbors; B: Valjean alone, so every member of B is also in A.
        const rule: UnionLeaf = {
            ...NEAR_VALJEAN,
            branches: [
                { ...NEAR_VALJEAN.branches[0], id: "a" },
                {
                    id: "b",
                    start: "none",
                    color: "#D55E00",
                    steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
                },
            ],
        };
        const opacity = (node: string): unknown =>
            (session.styles.explain({ node }).merged as Record<string, unknown>)["node.opacity"];
        const view = session.styles.showBranches({ rule, rest: "faint", mark: "b" });
        await session.styles.settled();
        assert.strictEqual(colorOf(session, "Valjean").value, "#D55E00", "the marked branch's color");
        assert.strictEqual(opacity("Valjean"), 1, "at full strength");
        view.end();
    });

    it("one view at a time: a second view replaces the first, whose end does nothing", async () => {
        const { session, red } = await painted();
        const first = session.styles.showBranches({ rule: NEAR_VALJEAN });
        const told: boolean[] = [];
        session.on("style:branches-shown-changed", ({ shown }) => told.push(shown));
        const second = session.styles.showBranches({
            rule: { ...NEAR_VALJEAN, branches: [{ ...NEAR_VALJEAN.branches[0], color: "#D55E00" }] },
        });
        assert.deepEqual(told, [true], "a view that replaces another is told");
        first.end();
        await session.styles.settled();
        assert.isTrue(session.styles.showingBranches);
        assert.strictEqual(session.styles.shownBranches?.rule.branches[0]?.color, "#D55E00");
        assert.strictEqual(colorOf(session, "Valjean").value, "#D55E00");
        second.end();
        await session.styles.settled();
        assert.strictEqual(colorOf(session, "Valjean").layerId, red);
    });
});

describe("a branches view that draws what is drawn already", () => {
    it("keeps its layers, so a step with no test or the same rule again repaints nothing", async () => {
        const { session } = await painted();
        const branchLayers = (): unknown[] =>
            (session as ElementSession).styles
                .compiled()
                .filter((entry) => entry.layer.id.startsWith("graphty-branches-"));
        session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        const before = branchLayers();

        session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        const [branch] = NEAR_VALJEAN.branches;
        const untested: UnionLeaf = {
            ...NEAR_VALJEAN,
            branches: [
                {
                    ...branch,
                    name: "Renamed",
                    steps: [...branch.steps, { op: "keep", rule: { kind: "range", attribute: "data.x" } as never }],
                },
            ],
        };
        session.styles.showBranches({ rule: untested, rest: "faint" });
        await session.styles.settled();
        const after = branchLayers();
        assert.strictEqual(after.length, before.length);
        after.forEach((entry, at) => {
            assert.strictEqual(entry, before[at], `layer ${String(at)} is the same object: nothing to repaint`);
        });

        const narrowed: UnionLeaf = {
            ...NEAR_VALJEAN,
            branches: [
                { ...branch, steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Myriel"] }, max: 1 } }] },
            ],
        };
        session.styles.showBranches({ rule: narrowed, rest: "faint" });
        await session.styles.settled();
        assert.notStrictEqual(branchLayers().at(-3), before.at(-3), "a step that changes the members is a new layer");
    });
});

describe("a branches view holding a filter condition", () => {
    it("keeps what the held condition removes drawn faint, still not visible, until the view ends", async () => {
        const { session } = await painted();
        const { id } = await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "neighborhood", seeds: ["Valjean"], depth: 1 },
        });
        const visible = session.visibility.summary.visibleNodes;
        const opacity = (): unknown =>
            (session.styles.explain({ node: "Valjean" }).merged as Record<string, unknown>)["node.opacity"];
        const before = opacity();

        // A filter's selection reads the full graph, so what the condition hides is still a member.
        const view = session.styles.showBranches({
            rule: { ...NEAR_VALJEAN, within: "graph" },
            rest: "faint",
            hold: id,
        });
        await session.styles.settled();
        assert.strictEqual(session.visibility.summary.visibleNodes, visible, "the held condition still filters");
        assert.strictEqual(opacity(), 0.2, "what it removes is drawn faint");
        assert.strictEqual(colorOf(session, "Valjean").value, "#009E73", "a member keeps its branch color");

        view.end();
        await session.styles.settled();
        assert.strictEqual(opacity(), before, "ending the view lets the condition go");
        assert.strictEqual(session.visibility.summary.visibleNodes, visible);
    });

    it("over the full graph draws a member another condition removes in its color, the rest faint", async () => {
        const { session } = await painted();
        // Another card removes Napoleon and Myriel; the edited card removes Cravatte and Myriel.
        // Myriel is within 1 hop of Valjean; Napoleon and Child1 are not, and Child1 stays.
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "neighborhood", seeds: ["Napoleon"], depth: 1 },
        });
        const { id } = await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "neighborhood", seeds: ["Cravatte"], depth: 1 },
        });
        const visible = session.visibility.summary.visibleNodes;
        const opacity = (node: string): { value: unknown; layerId: string | undefined } => {
            const explained = session.styles.explain({ node });
            return {
                value: (explained.merged as Record<string, unknown>)["node.opacity"],
                layerId: explained.channels.find((each) => each.channel === "node.opacity")?.layerId,
            };
        };

        const view = session.styles.showBranches({
            rule: { ...NEAR_VALJEAN, within: "graph" },
            rest: "faint",
            hold: id,
            base: "full",
        });
        await session.styles.settled();
        assert.strictEqual(session.visibility.summary.visibleNodes, visible, "what is visible does not change");
        assert.strictEqual(colorOf(session, "Myriel").value, "#009E73", "a removed member is drawn in its color");
        assert.strictEqual(opacity("Myriel").value, 1, "at full strength");
        assert.strictEqual(opacity("Napoleon").value, 0.2, "what another condition removes is drawn faint");
        assert.notStrictEqual(
            opacity("Napoleon").layerId,
            opacity("Child1").layerId,
            "as a ghost, not as the rest that stays",
        );
        view.end();
    });
});

describe("a branches view and the key", () => {
    it("the legend and a layer's counts keep describing the stack while a view is drawn", async () => {
        const { session, red } = await painted();
        const before = session.styles.legend();
        const counted = session.styles.counts(red);
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        const during = session.styles.legend();
        const countedDuring = session.styles.counts(red);
        view.end();
        assert.deepEqual({ ...countedDuring, revision: "" }, { ...counted, revision: "" });
        assert.deepEqual(
            during.map((block) => block.layerId),
            before.map((block) => block.layerId),
        );
        assert.include(
            during.map((block) => block.layerId),
            red,
        );
    });

    it("which layer decides a value is read from the stack, not the view", async () => {
        const { session, red } = await painted();
        const row = red;
        const before = session.styles.agreement("graph", "node.color", { over: row });
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        const during = session.styles.agreement("graph", "node.color", { over: row });
        const beneath = session.styles.agreement("graph", "node.color", { below: row, over: row });
        view.end();
        assert.deepEqual(during.channels, before.channels, "the picked view never covers a layer");
        assert.notInclude(JSON.stringify(beneath.channels), "graphty-branches");
    });
});

describe("the cost of a branches view", () => {
    it("grows with the graph, not faster", async () => {
        const { assertScalesLinearly, visitsDuring } = await import("../../helpers/cost");
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession();
                const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                await session.data.addNodes(ids.map((id) => ({ id })));
                await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
                const rule: UnionLeaf = {
                    ...NEAR_VALJEAN,
                    branches: [
                        {
                            ...NEAR_VALJEAN.branches[0],
                            steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["n0"] }, max: 2 } }],
                        },
                    ],
                };
                const visits = await visitsDuring(async () => {
                    const view = session.styles.showBranches({ rule, rest: "faint" });
                    await session.styles.settled();
                    view.end();
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by StylesApi.showBranches" },
        );
    });
});
