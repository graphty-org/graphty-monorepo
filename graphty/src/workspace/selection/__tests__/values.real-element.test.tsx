/**
 * @file On the REAL graphty-element's session: what a selection step can test and how a step reads back as a card: the picker's fields
 * and sections, the rule a pick writes, a step's card in the mode it holds, the rule an edited card
 * writes back, and a layer's or a filter's selector read as a selection.
 */
// Registers the real <graphty-element>, as main.tsx does: its session runs algorithms.
import "@graphty/graphty-element";

import {
    type GraphSession,
    type RuleTree,
    type StepReading,
    type UnionLeaf,
    type UnionStep,
} from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { waitFor } from "../../../test/test-utils";
import type { Card, CardField } from "../../style/cards";
import {
    filterSelection,
    freshTest,
    isRelative,
    layerSelection,
    modeOf,
    pickerFields,
    pickSections,
    referenceOf,
    ruleOfCard,
    ruleOfField,
    stepCard,
    usedPaths,
    withReference,
} from "../values";

afterEach(() => {
    for (const element of document.querySelectorAll("graphty-element")) {
        element.remove();
    }
});

type Measure = Extract<RuleTree, { kind: "measure" }>;

const nodes: UnionLeaf = { kind: "union", side: "nodes", within: "graph", branches: [] };
const edges: UnionLeaf = { kind: "union", side: "edges", within: "graph", branches: [] };

/**
 * A session over a small graph: four nodes with a number, a word and a date, three edges with a
 * weight.
 * @param directed - whether every edge has a direction.
 * @returns the session.
 */
async function graph(directed = false): Promise<GraphSession> {
    const element = document.createElement("graphty-element");
    document.body.append(element);
    const session = await waitFor(() => {
        assert.isOk(element.session);
        return element.session;
    });
    await session.data.addNodes([
        { id: "a", size: 1, kind: "x", when: "2020-01-01" },
        { id: "b", size: 2, kind: "y", when: "2021-01-01" },
        { id: "c", size: 3, kind: "x", when: "2022-01-01" },
        { id: "d", size: 4, kind: "y", when: "2023-01-01" },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", weight: 1, directed },
        { source: "b", target: "c", weight: 2, directed },
        { source: "c", target: "a", weight: 3, directed },
    ]);
    return session;
}

/**
 * A data field of one kind, as the picker lists it.
 * @param kind - its kind.
 * @param group - its group.
 * @returns the field.
 */
const field = (kind: CardField["kind"], group: CardField["group"] = "Data"): CardField => ({
    path: "data.size",
    on: "node",
    kind,
    name: "size",
    group,
});

/**
 * A step reading nothing yet, or reading a run or values.
 * @param over - what it reads.
 * @returns the reading.
 */
const reading = (over: Partial<StepReading>): StepReading => ({
    count: 0,
    frozen: false,
    id: "s1",
    input: "graph",
    members: "graph",
    orderMatters: false,
    reason: null,
    run: null,
    state: "settled" as StepReading["state"],
    values: null,
    waiting: false,
    ...over,
});

describe("freshTest", () => {
    it("starts a listed field with nothing ticked and a number with no test", () => {
        assert.deepEqual(freshTest({ type: "number", measurement: "categorical" }), { kind: "categories", values: [] });
        assert.deepEqual(freshTest({ type: "boolean" }), { kind: "categories", values: [] });
        assert.deepEqual(freshTest({ type: "string" }), { kind: "categories", values: [] });
        assert.isUndefined(freshTest({ type: "number" }));
    });
});

describe("ruleOfField", () => {
    it("writes an inert leaf of each data kind", async () => {
        const session = await graph();
        assert.deepEqual(ruleOfField(session, field("number")), { kind: "range", attribute: "data.size" });
        assert.deepEqual(ruleOfField(session, field("date")), { kind: "range", attribute: "data.size", as: "time" });
        assert.deepEqual(ruleOfField(session, field("category")), {
            kind: "categories",
            attribute: "data.size",
            values: [],
        });
        assert.deepEqual(ruleOfField(session, field("yes-no")), {
            kind: "categories",
            attribute: "data.size",
            values: [],
        });
        assert.deepEqual(ruleOfField(session, field("source")), { kind: "source", sources: [] });
        assert.deepEqual(ruleOfField(session, field("text")), {
            kind: "text",
            reads: "data.size",
            mode: "substring",
            text: "",
        });
        // A Results field no run holds writes the data column's leaf.
        assert.deepEqual(ruleOfField(session, field("number", "Results")), { kind: "range", attribute: "data.size" });
    });

    it("writes a run's value as a measure, naming its settings and a scope other than the base", async () => {
        const session = await graph();
        // A run starts over the visible graph.
        await session.runs.start("pagerank", { dampingFactor: 0.5 });
        const rank = pickerFields(session, "node", "visible").find((each) => each.group === "Results");
        assert.isDefined(rank);
        const rule = ruleOfField(session, rank, "visible");
        assert.equal(rule.kind, "measure");
        assert.deepInclude(rule, { algorithm: "pagerank", field: "value" });
        assert.deepInclude((rule as Measure).params, { dampingFactor: 0.5 });
        assert.notProperty(rule, "scope");
        assert.notProperty(rule, "test");
        assert.deepInclude(ruleOfField(session, rank, "graph"), { scope: "visible" });
    });
});

describe("pickerFields", () => {
    it("lists Data with the structure values, and drops a run's rank and percentile", async () => {
        const session = await graph(true);
        await session.runs.start("pagerank", {});
        const fields = pickerFields(session, "node");
        const degree = fields.find((each) => each.path === "graphty.degree");
        assert.deepInclude(degree, { group: "Data", integer: true, tip: "Edges at a node" });
        // d has no edges.
        assert.deepEqual(degree?.range, { min: 0, max: 2 });
        assert.isTrue(fields.some((each) => each.path === "graphty.inDegree"));
        assert.isFalse(fields.some((each) => each.path.endsWith(".rank") || each.path.endsWith(".percentile")));
        assert.isTrue(fields.some((each) => each.group === "Results"));
        // The edge side has no structure values.
        assert.isFalse(pickerFields(session, "edge").some((each) => each.path.startsWith("graphty.")));
    });

    it("names a run over another part of the graph, and a filter never lists a run over the visible graph", async () => {
        const session = await graph();
        await session.runs.start("pagerank", {}, { scope: "visible" });
        const same = pickerFields(session, "node", "visible").filter((each) => each.group === "Results");
        assert.deepEqual(
            same.map((each) => each.name),
            ["PageRank"],
        );
        const named = pickerFields(session, "node").filter((each) => each.group === "Results");
        assert.deepEqual(
            named.map((each) => each.name),
            ["PageRank (4 showing)"],
        );
        assert.equal(pickerFields(session, "node", "graph").filter((each) => each.group === "Results").length, 0);
    });

    it("leaves out an algorithm's default run when each algorithm has one entry, and keeps other settings", async () => {
        const session = await graph();
        await session.runs.start("pagerank", {});
        const results = (perAlgorithm: boolean): number =>
            pickerFields(session, "node", "visible", perAlgorithm).filter((each) => each.group === "Results").length;
        assert.isAbove(results(false), 0);
        assert.equal(results(true), 0);
        // Over another part of the graph than the base, the run is not the entry's: it stays listed.
        assert.equal(pickerFields(session, "node", "graph", true).filter((each) => each.group === "Results").length, 0);
        assert.equal(
            pickerFields(session, "node", undefined, true).filter((each) => each.group === "Results").length,
            1,
        );
        await session.runs.start("pagerank", { dampingFactor: 0.5 });
        assert.isAbove(results(true), 0);
    });
});

describe("pickSections", () => {
    it("lists an edge selection's structure, relative and canvas entries, and each writes its rule", async () => {
        const session = await graph();
        const picked: RuleTree[] = [];
        const sections = pickSections(session, edges, (rule) => picked.push(rule), "selector");
        const groups = sections.map((each) => each.group);
        assert.includeMembers(groups, ["Nodes (edge ends)", "Structure", "Relative to", "On the canvas"]);
        const keys = sections.flatMap((each) => each.items.map((item) => item.key));
        assert.includeMembers(keys, ["self-loop", "repeated", "touching", "within-edges", "leaving", "while"]);
        assert.includeMembers(keys, ["selected", "outsideWindow"]);
        assert.notInclude(keys, "hovered");
        for (const item of sections.flatMap((each) => each.items)) {
            item.onPick();
        }
        assert.deepInclude(picked, { kind: "self-loop" });
        assert.deepInclude(picked, { kind: "touching", ends: "one" });
        assert.deepInclude(picked, { kind: "state", state: "outsideWindow" });
        // The node columns across are untested leaves.
        assert.deepInclude(picked, { kind: "range", attribute: "data.size" });
    });

    it("leaves On the canvas out of a filter, and writes an algorithm entry as a measure", async () => {
        const session = await graph();
        const picked: RuleTree[] = [];
        const sections = pickSections(session, nodes, (rule) => picked.push(rule), "filter");
        assert.notInclude(
            sections.map((each) => each.group),
            "On the canvas",
        );
        const items = sections.flatMap((each) => each.items);
        const pagerank = items.find((each) => each.key.startsWith("alg:pagerank:"));
        assert.isDefined(pagerank);
        pagerank.onPick();
        assert.deepInclude(picked.at(-1), { kind: "measure", algorithm: "pagerank" });
        // A categorical result starts with nothing ticked.
        const community = items.find((each) => each.key.startsWith("alg:louvain:"));
        assert.isDefined(community);
        community.onPick();
        assert.deepInclude(picked.at(-1), { test: { kind: "categories", values: [] } });
        assert.includeMembers(
            items.map((each) => each.key),
            ["largest", "isolated", "is-in", "within", "neighbors", "connected", "while"],
        );
    });

    it("hides an algorithm already run unless each algorithm has one entry", async () => {
        const session = await graph();
        await session.runs.start("pagerank", {});
        const keys = (perAlgorithm: boolean): string[] =>
            pickSections(session, nodes, () => undefined, "selector", perAlgorithm).flatMap((each) =>
                each.items.map((item) => item.key),
            );
        assert.isFalse(keys(false).some((key) => key.startsWith("alg:pagerank:")));
        assert.equal(keys(true).filter((key) => key.startsWith("alg:pagerank:")).length, 1);
    });
});

describe("relative rules", () => {
    it("reads and replaces a reference on each form", () => {
        const hops: RuleTree = { kind: "hops", max: 1 };
        const same = { kind: "same-value", attribute: "data.kind" } as unknown as RuleTree;
        assert.isTrue(isRelative(hops));
        assert.isTrue(isRelative(same));
        assert.isTrue(isRelative({ kind: "nonempty" }));
        assert.isTrue(isRelative({ kind: "touching", ends: "both" }));
        assert.isFalse(isRelative({ kind: "isolated" }));
        const reference = { step: "s1" } as unknown as Parameters<typeof withReference>[1];
        const withHops = withReference(hops, reference);
        assert.deepEqual(referenceOf(withHops as Parameters<typeof referenceOf>[0]), reference);
        const withSame = withReference(same as Parameters<typeof withReference>[0], reference);
        assert.deepEqual(referenceOf(withSame as Parameters<typeof referenceOf>[0]), reference);
        assert.isUndefined(referenceOf(hops));
    });
});

describe("stepCard and modeOf", () => {
    it("draws a number card in By position before its count is typed, with its end and unit", async () => {
        const session = await graph();
        const step: UnionStep = {
            id: "s1",
            op: "keep",
            rule: { kind: "range", attribute: "data.size" },
            mode: "top low percent",
        };
        const { card } = stepCard(session, step, undefined, "node");
        assert.deepInclude(card, { type: "number", match: "top", from: "low", percent: true });
        assert.equal(modeOf(card!), "top low percent");
        const high = stepCard(session, { ...step, mode: "top" }, undefined, "node").card!;
        assert.equal(modeOf(high), "top");
        // A range with a bound set stays By value.
        const bounded = stepCard(
            session,
            { ...step, rule: { kind: "range", attribute: "data.size", min: 2 } },
            undefined,
            "node",
        ).card!;
        assert.equal(modeOf(bounded), "range");
    });

    it("keeps a text test's way to match picked before any text is typed", async () => {
        const session = await graph();
        const rule: RuleTree = { kind: "text", reads: "data.kind", mode: "substring", text: "" };
        const card = stepCard(session, { id: "s1", op: "keep", rule, mode: "exact" }, undefined, "node").card!;
        assert.deepInclude(card, { type: "text", match: "exact" });
        assert.equal(modeOf(card), "exact");
        // An unknown mode leaves Contains.
        assert.deepInclude(stepCard(session, { id: "s1", op: "keep", rule, mode: "nope" }, undefined, "node").card, {
            match: "substring",
        });
    });

    it("keeps a date test's Before, After or Between unless the rule holds a bound it has no box for", async () => {
        const session = await graph();
        const rule: RuleTree = { kind: "range", attribute: "data.when", as: "time", min: Date.UTC(2021, 0, 1) };
        const card = (mode: string): Card | null =>
            stepCard(session, { id: "s1", op: "keep", rule, mode }, undefined, "node").card;
        const drawn = card("between");
        assert.equal(drawn?.type, "date");
        if (drawn?.type !== "date") {
            return;
        }
        assert.equal(drawn.match, "between");
        assert.equal(modeOf(drawn), "between");
        // Before has no box for a lower bound: the rule's After stands.
        assert.deepInclude(card("before"), { match: "after" });
        assert.deepInclude(card("after"), { match: "after" });
        assert.deepInclude(card("range"), { match: "after" });
        assert.isUndefined(modeOf({ ...drawn, match: "present" }));
    });

    it("has no mode for a category card, and no card for a rule no card edits", async () => {
        const session = await graph();
        const card = stepCard(
            session,
            { id: "s1", op: "keep", rule: { kind: "categories", attribute: "data.kind", values: ["x"] } },
            undefined,
            "node",
        ).card!;
        assert.equal(card.type, "category");
        assert.isUndefined(modeOf(card));
        assert.isNull(stepCard(session, { id: "s1", op: "keep", rule: { kind: "isolated" } }, undefined, "node").card);
    });

    it("counts a degree step over its Links", async () => {
        const session = await graph();
        const step: UnionStep = {
            id: "s1",
            op: "keep",
            rule: { kind: "range", attribute: "graphty.degree" },
            links: { kind: "range", attribute: "data.weight", min: 3 },
        };
        const read = stepCard(session, step, undefined, "node", "graph");
        assert.equal(read.card?.type, "number");
        assert.deepInclude(read.field, { links: step.links, range: { min: 0, max: 1 } });
    });

    it("draws a measure's card from its run, a yes-or-no as declared, and none for a field the run lacks", async () => {
        const session = await graph();
        const run = session.runs.start("pagerank", {});
        await run;
        const rule: Measure = { kind: "measure", algorithm: "pagerank", field: "value" };
        const read = stepCard(session, { id: "s1", op: "keep", rule }, reading({ run: run.id }), "node");
        assert.equal(read.card?.type, "number");
        const tested = stepCard(
            session,
            { id: "s1", op: "keep", rule: { ...rule, test: { kind: "range", min: 0 } } },
            reading({ run: run.id }),
            "node",
        );
        assert.deepInclude(tested.card, { type: "number", min: 0 });
        assert.isNull(
            stepCard(
                session,
                { id: "s1", op: "keep", rule: { ...rule, field: "nope" } },
                reading({ run: run.id }),
                "node",
            ).card,
        );
    });

    it("draws a So far step's card from its own values, and none while they are not there", async () => {
        const session = await graph();
        const rule: Measure = { kind: "measure", algorithm: "pagerank", field: "value" };
        assert.isNull(stepCard(session, { id: "s1", op: "keep", rule }, undefined, "node").card);
        const numeric = {
            kind: "numeric",
            min: 0,
            max: 1,
            missing: 0,
            bins: [],
        } as unknown as StepReading["values"];
        const own = stepCard(session, { id: "s1", op: "keep", rule }, reading({ values: numeric }), "node");
        assert.deepInclude(own.field, { path: "so-far:s1", kind: "number", range: { min: 0, max: 1 } });
        const unknown = stepCard(
            session,
            { id: "s1", op: "keep", rule: { ...rule, algorithm: "nope", test: { kind: "range", min: 0.5 } } },
            reading({ values: { ...numeric, min: undefined } as unknown as StepReading["values"] }),
            "node",
        );
        assert.deepInclude(unknown.field, { name: "nope" });
        assert.notProperty(unknown.field, "range");
        const categorical = {
            kind: "categorical",
            values: [{ value: "1", count: 2 }],
            missing: 0,
        } as unknown as StepReading["values"];
        const listed = stepCard(
            session,
            { id: "s1", op: "keep", rule: { kind: "measure", algorithm: "louvain", field: "community" } },
            reading({ values: categorical }),
            "edge",
        );
        assert.deepInclude(listed.field, { kind: "category", on: "edge" });
    });
});

describe("ruleOfCard", () => {
    it("writes a data card's leaf back, and a measure's test without its path", async () => {
        const session = await graph();
        const step: UnionStep = { id: "s1", op: "keep", rule: { kind: "range", attribute: "data.size" } };
        const card = stepCard(session, step, undefined, "node").card!;
        assert.deepEqual(ruleOfCard(step, { ...card, min: 2 } as Card), {
            kind: "range",
            attribute: "data.size",
            min: 2,
        });
        const measure: UnionStep = {
            id: "s1",
            op: "keep",
            rule: { kind: "measure", algorithm: "pagerank", field: "value", test: { kind: "range", min: 1 } },
        };
        const tested = ruleOfCard(measure, { ...card, min: 2 } as Card);
        assert.deepInclude(tested, { kind: "measure", test: { kind: "range", min: 2 } });
        // By position with a count writes a top test.
        const top = ruleOfCard(measure, { ...card, match: "top", top: 2 } as Card) as Measure;
        assert.deepInclude(top.test, { kind: "threshold", top: 2 });
        assert.notProperty(top.test, "path");
        // A number card with no finished test (By position before its count) has none.
        assert.notProperty(ruleOfCard(measure, { ...card, match: "top" } as Card), "test");
    });

    it("writes a checklist with nothing ticked as an empty pick, and a text card's test", async () => {
        const session = await graph();
        const category = stepCard(
            session,
            { id: "s1", op: "keep", rule: { kind: "categories", attribute: "data.kind", values: [] } },
            undefined,
            "node",
        ).card!;
        const measure: UnionStep = {
            id: "s1",
            op: "keep",
            rule: { kind: "measure", algorithm: "louvain", field: "community" },
        };
        assert.deepInclude(ruleOfCard(measure, category), { test: { kind: "categories", values: [] } });
        const text = stepCard(
            session,
            { id: "s1", op: "keep", rule: { kind: "text", reads: "data.kind", mode: "substring", text: "x" } },
            undefined,
            "node",
        ).card!;
        assert.deepInclude(ruleOfCard(measure, text), { test: { kind: "text", mode: "substring", text: "x" } });
    });
});

describe("layerSelection and filterSelection", () => {
    it("reads Everything as one All group, a union as itself, a flat rule converted, and ids by hand as none", async () => {
        const session = await graph();
        assert.deepEqual(layerSelection(session, { match: "everything" } as never, "edge"), {
            kind: "union",
            side: "edges",
            within: "visible",
            branches: [{ start: "all", steps: [] }],
        });
        const union: UnionLeaf = { ...nodes, branches: [{ start: "all", steps: [] }] };
        assert.deepEqual(layerSelection(session, { match: "rule", where: union } as never, "node"), union);
        const flat = layerSelection(session, { match: "rule", where: { kind: "isolated" } } as never, "node");
        assert.deepInclude(flat, { kind: "union", side: "nodes", within: "visible" });
        const state = layerSelection(
            session,
            { match: "rule", where: { kind: "state", state: "selected" } } as never,
            "node",
        );
        assert.deepInclude(state, { within: "graph" });
        assert.isNull(layerSelection(session, { match: "ids", nodes: ["a"] } as never, "node"));
    });

    it("reads a keeping union as itself and a removing condition as what it leaves", async () => {
        const session = await graph();
        const union: UnionLeaf = { ...edges, branches: [{ start: "all", steps: [] }] };
        assert.equal(filterSelection(session, union, "edge"), union);
        assert.deepInclude(filterSelection(session, { kind: "isolated" }, "node", "exclude"), {
            kind: "union",
            side: "nodes",
            within: "graph",
        });
    });
});

describe("usedPaths", () => {
    it("marks the columns a group's steps read", () => {
        const branch = {
            start: "all" as const,
            steps: [
                { id: "1", op: "keep", rule: { kind: "range", attribute: "data.size" } },
                { id: "2", op: "keep", rule: { kind: "text", reads: "data.kind", mode: "substring", text: "" } },
                { id: "3", op: "keep", rule: { kind: "isolated" } },
            ] as UnionStep[],
        };
        assert.deepEqual(usedPaths(edges, branch), ["edge:data.size", "edge:data.kind"]);
    });
});
