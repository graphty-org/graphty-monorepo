/**
 * @file What a layer's value tables, hidden values and rule conditions do when a re-run loses a
 * group: a community re-run that merges two communities, matched by shared members, and a
 * category run re-run that drops a category, matched by name. Also the group editor's refusals
 * and corners: a path no channel reads, folding a path the layer does not paint, a fold on a
 * channel with no single value, named folded groups, and an entry that is neither text nor number.
 */

import { assert, describe, it } from "vitest";

import type { RuleTree } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { type Harness, makeSession } from "../helpers";

/** What the run publishes next, node id to value; a test swaps it before a re-run. */
let published: Readonly<Record<string, number | string>> = {};

/**
 * An executor publishing {@link published} as a community result (numbers) or a category
 * result (texts).
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const nodes = Object.entries(published);
    const community = typeof nodes[0]?.[1] === "number";
    const field = community ? "group" : "category";

    return {
        result: createRunResult({
            runId: context.runId,
            shape: community ? "community" : "category-table",
            fields: [
                {
                    name: field,
                    plainName: field,
                    technicalName: field,
                    kind: "node",
                    type: community ? "integer" : "string",
                    path: `store.graphty.${context.runId}.${field}`,
                },
            ],
            measured: { nodes: nodes.length, edges: 0 },
            nodes: nodes.map(([id, value]) => ({
                id,
                values: community ? { group: value } : { category: value, score: 1 },
            })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session over the published nodes with one run, `r`, finished.
 * @param first - What the first run publishes.
 * @returns The harness.
 */
async function withRun(first: Readonly<Record<string, number | string>>): Promise<Harness> {
    published = first;
    const harness = makeSession({ runs: { execute } });
    harness.add(Object.keys(first).map((id) => ({ id })));
    await harness.session.runs.start("louvain", {}, { as: "r", style: false });

    return harness;
}

/**
 * The rule a layer's selector holds.
 * @param harness - The session.
 * @param id - The layer.
 * @returns The rule.
 */
function ruleOf(harness: Harness, id: string): unknown {
    return (harness.session.styles.get(id)?.selector as { where?: unknown }).where;
}

/**
 * What a call refused with.
 * @param call - The call.
 * @returns `details.reason`, or "none".
 */
async function reasonOf(call: () => PromiseLike<unknown>): Promise<unknown> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.details?.reason : error;
    }

    return "none";
}

describe("a re-run that loses a group", () => {
    it("by shared members: the merged community's entries, hidden value and rule values are dropped and reported", async () => {
        const harness = await withRun({ a: 0, b: 0, c: 0, d: 1, e: 1, f: 2, g: 2, h: 2 });
        const { styles, runs } = harness.session;
        const layer = await styles.encode({ run: "r", channel: "node.color" });
        await styles.setValueEntry(layer.id, "node.color", 1, "#111111");
        await styles.setValueEntry(layer.id, "node.color", 2, "#222222");
        await styles.setValueHidden(layer.id, "node.color", 1, true);
        const where: RuleTree = {
            kind: "any",
            of: [
                { kind: "categories", attribute: "store.graphty.r.group", values: ["1", "2"] },
                { kind: "not", of: { kind: "categories", attribute: "data.other", values: ["x"] } },
                { kind: "all", of: [{ kind: "item", item: { result: "r", key: { field: "group", value: 1 } } }] },
            ],
        };
        const hand = await styles.add({ name: "Hand", target: "node", selector: { match: "rule", where }, set: {} });

        // Community 1 (d, e) joins community 2 (f, g, h): 2 keeps its members and its number.
        published = { a: 0, b: 0, c: 0, d: 2, e: 2, f: 2, g: 2, h: 2 };
        await runs.get("r")?.rerun();
        await styles.settled();

        const color = styles.get(layer.id)?.encode?.["node.color"] as { map?: unknown; hidden?: unknown };
        assert.deepStrictEqual(color.map, { 2: "#222222" }, "the lost community's entry is dropped");
        assert.isUndefined(color.hidden, "and so is its hidden value");
        assert.deepStrictEqual(styles.get(layer.id)?.unmatched, [
            { code: "group.gone", params: { path: "store.graphty.r.group", value: 1, dropped: true } },
        ]);
        assert.deepStrictEqual(ruleOf(harness, hand.id), {
            kind: "any",
            of: [
                { kind: "categories", attribute: "store.graphty.r.group", values: ["2"] },
                { kind: "not", of: { kind: "categories", attribute: "data.other", values: ["x"] } },
                { kind: "all", of: [{ kind: "item", item: { result: "r", key: { field: "group", value: 1 } } }] },
            ],
        });
        assert.deepStrictEqual(styles.get(hand.id)?.unmatched, [
            { code: "group.gone", params: { path: "store.graphty.r.group", value: 1, dropped: true } },
        ]);
        harness.session.dispose();
    });

    it("by name: a dropped category keeps its spelling, is reported, and a new one is reported new", async () => {
        const harness = await withRun({ a: "x", b: "x", c: "y", d: "z" });
        const { styles, runs } = harness.session;
        const layer = await styles.add({
            name: "Categories",
            target: "node",
            selector: { match: "has", path: "store.graphty.r.category" },
            encode: { "node.color": { by: "store.graphty.r.category", scale: "ordinal" } },
        });
        await styles.setValueEntry(layer.id, "node.color", "z", "#333333");
        await styles.setValueEntry(layer.id, "node.color", "x", "#444444");
        await styles.setValueHidden(layer.id, "node.color", "z", true);
        const hand = await styles.add({
            name: "Hand",
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "categories", attribute: "store.graphty.r.category", values: ["z", "y"] },
            },
            set: {},
        });
        const plain = await styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "has", path: "store.graphty.r.category" },
            encode: { "node.size": { by: "store.graphty.r.category", scale: "ordinal" } },
        });

        published = { a: "x", b: "x", c: "y", d: "w" };
        await runs.get("r")?.rerun();
        await styles.settled();

        const color = styles.get(layer.id)?.encode?.["node.color"] as { map?: unknown; hidden?: unknown };
        assert.deepStrictEqual(color.map, { x: "#444444", z: "#333333" }, "by name an entry stays as spelled");
        assert.deepStrictEqual(color.hidden, ["z"]);
        assert.sameDeepMembers(
            [...(styles.get(layer.id)?.unmatched ?? [])],
            [
                { code: "group.new", params: { path: "store.graphty.r.category", value: "w" } },
                { code: "group.gone", params: { path: "store.graphty.r.category", value: "z", dropped: true } },
            ],
        );
        assert.deepStrictEqual(ruleOf(harness, hand.id), {
            kind: "categories",
            attribute: "store.graphty.r.category",
            values: ["z", "y"],
        });
        assert.deepStrictEqual(styles.get(hand.id)?.unmatched, [
            { code: "group.gone", params: { path: "store.graphty.r.category", value: "z", dropped: true } },
        ]);
        assert.isUndefined(styles.get(plain.id)?.unmatched, "a layer naming no value has nothing to report by name");
        harness.session.dispose();
    });
});

/**
 * Five nodes in groups 0 (three nodes), 1 and 2, under a layer coloring them by group.
 * @returns The session and the layer's id.
 */
async function grouped(): Promise<{ session: GraphSession; id: string }> {
    const session = createGraphSession();
    await session.data.addNodes([0, 0, 0, 1, 2].map((group, at) => ({ id: `n${String(at)}`, group, tag: "t" })));
    const layer = await session.styles.add({
        name: "Groups",
        target: "node",
        selector: { match: "has", path: "data.group" },
        encode: { "node.color": { by: "data.group", scale: "ordinal" } },
    });
    await session.styles.settled();

    return { session, id: layer.id };
}

describe("group editor corners", () => {
    it("lists no groups for a path no channel reads, and refuses to fold it", async () => {
        const { session, id } = await grouped();
        assert.deepStrictEqual(session.styles.groups(id, "data.tag"), []);
        assert.strictEqual(await reasonOf(() => session.styles.setFoldBelow(id, "data.tag", 2)), "not-bound");
        session.dispose();
    });

    it("names folded groups and keeps them hidden when hidden", async () => {
        const { session, id } = await grouped();
        await session.data.setValueLabel("data.group", 2, "Two");
        await session.styles.setValueHidden(id, "node.color", 2, true);
        await session.styles.setFoldBelow(id, "data.group", 2);
        await session.styles.settled();

        const folded = session.styles.groups(id, "data.group").filter((group) => group.folded === true);
        assert.deepStrictEqual(
            folded.map((group) => [group.value, group.count, group.hidden, group.name]),
            [
                [1, 1, false, undefined],
                [2, 1, true, "Two"],
            ],
        );
        session.dispose();
    });

    it("refuses an entry that is neither a text nor a number", async () => {
        const { session, id } = await grouped();
        assert.strictEqual(await reasonOf(() => session.styles.setValueEntry(id, "node.color", 1, true)), "bad-entry");
        session.dispose();
    });

    it("folds a channel bound later to the fold's value, the default when it had none", async () => {
        const { session, id } = await grouped();
        await session.styles.setFoldBelow(id, "data.group", 2);
        await session.styles.setValueEntries(id, "data.group", [
            { channel: "node.size", value: 0, entry: 4 },
            { channel: "node.shape", value: 0, entry: "cone" },
        ]);
        await session.styles.settled();

        const encode = session.styles.get(id)?.encode ?? {};
        const size = encode["node.size"] as { other?: { threshold: number; value: unknown } };
        const shape = encode["node.shape"] as { other?: { threshold: number; value: unknown } };
        assert.strictEqual(size.other?.threshold, 2);
        assert.strictEqual(shape.other?.threshold, 2);
        assert.strictEqual(typeof size.other?.value, "number", "every group without an entry draws the default size");
        session.dispose();
    });
});
