/**
 * What a selection step can test, and how a step reads back as a condition card: the value
 * picker's sections in the spec's order (design/ui/selection-groups/spec.md, section 4), the rule
 * each entry writes, and the card (or reference form) a step's test is edited with. Every entry
 * and kind comes from graphty-element (`data.readableValues`, `catalog.algorithms`, `runs`); the
 * app only arranges and names them.
 */

import {
    type GraphSession,
    type MeasureTest,
    type RuleTree,
    type Selector,
    selectorRule,
    type StepReading,
    type StepReference,
    type UnionLeaf,
    type UnionStep,
} from "@graphty/graphty-element/session";

import { groupAlgorithms, HEADINGS, wordsFor } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { type Card, type CardField, cardFields, cardOf, leafOf, type Side, SOURCE_PATH } from "../style/cards";
import type { ExtraItem } from "../style/WhichPicker";

/** The hosts a selection is edited in: a style layer's selector, or an import filter card. */
export type Host = "selector" | "filter";

/** A section of the value picker past the field groups. */
export interface PickSection {
    readonly group: string;
    readonly items: readonly ExtraItem[];
}

/**
 * The card side a selection speaks.
 * @param rule - the selection.
 * @returns node or edge.
 */
export const sideOf = (rule: Pick<UnionLeaf, "side">): Side => (rule.side === "nodes" ? "node" : "edge");

/**
 * A field's rule before its test is set: inert (graphty-element reads it as "test-unset"), so a
 * step with a value and no test changes nothing (spec 1).
 * @param field - the field.
 * @returns the leaf.
 */
function untested(field: CardField): RuleTree {
    switch (field.kind) {
        case "number":
            return { kind: "range", attribute: field.path };
        case "date":
            return { kind: "range", attribute: field.path, as: "time" };
        case "category":
            return { kind: "categories", attribute: field.path, values: [] };
        case "yes-no":
            return { kind: "text", reads: field.path, mode: "exact", text: "true", caseSensitive: true };
        case "source":
            return { kind: "source", sources: [] };
        default:
            return { kind: "text", reads: field.path, mode: "substring", text: "" };
    }
}

/**
 * Every field a step on one side can read: the readable values, and on the node side the
 * structure values (Degree, and In and Out degree on a directed graph), read with no run.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields.
 */
function stepFields(session: GraphSession, side: Side): CardField[] {
    const fields = cardFields(session, side);
    if (side !== "node") {
        return fields;
    }
    const structure = session.data.structureValues().map((value): CardField => {
        const histogram = session.scope.histogram(value.path);
        const range =
            histogram.kind === "numeric" && histogram.min !== undefined && histogram.max !== undefined
                ? { range: { min: histogram.min, max: histogram.max } }
                : {};
        return { path: value.path, on: "node", kind: "number", name: value.plainName, group: "Structure", ...range };
    });
    return [...fields, ...structure];
}

/**
 * The fields of the selection's side for the picker: Data first (Node id, the columns, Degree),
 * then Results (a finished run's main values; no rank or percentile entries).
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, regrouped.
 */
export function pickerFields(session: GraphSession, side: Side): CardField[] {
    const fields = stepFields(session, side).filter(
        (field) => !field.path.endsWith(".rank") && !field.path.endsWith(".percentile"),
    );
    const data = fields
        .filter((field) => field.group !== "Results")
        .map((field) => ({ ...field, group: "Data" as const }));
    return [...data, ...fields.filter((field) => field.group === "Results")];
}

/**
 * The run a Results field reads, and that field's name in the run.
 * @param session - the element's session.
 * @param path - the field's path.
 * @returns the run's algorithm, params, scope and field, or undefined for a data column.
 */
function runFieldOf(
    session: GraphSession,
    path: string,
): { algorithm: string; params: Readonly<Record<string, unknown>>; field: string; scope: unknown } | undefined {
    const value = session.data.readableValues().find((each) => each.path === path && each.runId !== undefined);
    const run = value?.runId === undefined ? undefined : session.runs.get(value.runId);
    if (run === undefined) {
        return undefined;
    }
    const field = run.fields.find((each) => session.results.path(run.id, each.name) === path);
    return field === undefined
        ? undefined
        : { algorithm: run.algorithm, params: run.params, field: field.name, scope: run.scope.spec };
}

/**
 * The rule a picked field writes: a data column's untested leaf, or for a run's value an
 * untested `measure` of that algorithm, settings and field (spec 6: every algorithm step saves as
 * algorithm, settings, field and test).
 * @param session - the element's session.
 * @param field - the picked field.
 * @returns the step's rule.
 */
export function ruleOfField(session: GraphSession, field: CardField): RuleTree {
    if (field.group !== "Results") {
        return untested(field);
    }
    const run = runFieldOf(session, field.path);
    return run === undefined
        ? untested(field)
        : {
              kind: "measure",
              algorithm: run.algorithm,
              ...(Object.keys(run.params).length === 0 ? {} : { params: run.params }),
              field: run.field,
          };
}

/**
 * The value picker's sections after Data and Results: the Analyze categories (algorithms not yet
 * run, named by method, a single-field result by its method alone), Added (user-registered
 * algorithms), Structure, and Relative to.
 * @param session - the element's session.
 * @param rule - the selection.
 * @param onPick - takes the rule an entry writes.
 * @returns the sections, in order; an empty one is left out.
 */
export function pickSections(
    session: GraphSession,
    rule: UnionLeaf,
    onPick: (stepRule: RuleTree) => void,
): PickSection[] {
    const side = sideOf(rule);
    const ran = new Set(
        session.runs
            .list()
            .filter((run) => run.status === "succeeded")
            .map((run) => run.algorithm),
    );
    const algorithmItems = (custom: boolean): { heading: string; items: ExtraItem[] }[] =>
        groupAlgorithms(session.catalog.algorithms()).map(({ heading, entries }) => ({
            heading: heading.title,
            items: entries
                // Degree is listed under Data, read with no run (spec 4).
                .filter(
                    (each) => (each.category === "custom") === custom && !ran.has(each.key) && each.key !== "degree",
                )
                .flatMap((each) => {
                    // No rank or percentile entries (spec 4): the test's By position covers them.
                    const fields = each.fields.filter(
                        (field) =>
                            field.kind === side &&
                            field.type !== "table" &&
                            field.name !== "rank" &&
                            field.name !== "percentile",
                    );
                    const method = wordsFor(each).name;
                    return fields.map((field) => ({
                        key: `alg:${each.key}:${field.name}`,
                        name: fields.length === 1 ? method : `${method}: ${field.plainName}`,
                        glyph: GLYPHS.analyze,
                        onPick: () => {
                            onPick({ kind: "measure", algorithm: each.key, field: field.name });
                        },
                    }));
                }),
        }));
    // Results with nothing per node or edge (pairs, series, graph facts) are not entries.
    const shown = new Set(HEADINGS.filter((heading) => heading.id !== "measure").map((heading) => heading.title));
    const analyze = algorithmItems(false).filter((each) => shown.has(each.heading) && each.items.length > 0);
    const added = algorithmItems(true).flatMap((each) => each.items);
    const other: Side = side === "node" ? "edge" : "node";
    const across = cardFields(session, other)
        .filter((field) => field.group === "Data" && field.path !== SOURCE_PATH)
        .map((field) => ({
            key: `other:${field.path}`,
            name: field.name,
            glyph: GLYPHS[other],
            ...(field.fact === undefined ? {} : { fact: field.fact }),
            onPick: () => {
                onPick(untested(field));
            },
        }));
    const item = (key: string, name: string, glyph: ExtraItem["glyph"], leaf: RuleTree): ExtraItem => ({
        key,
        name,
        glyph,
        onPick: () => {
            onPick(leaf);
        },
    });
    const structure =
        side === "node"
            ? [
                  item("largest", "Largest component", GLYPHS.graph, { kind: "member", of: "largest-component" }),
                  item("isolated", "Isolated", GLYPHS.node, { kind: "isolated" }),
              ]
            : [
                  item("self-loop", "Self-loops", GLYPHS.edge, { kind: "self-loop" }),
                  item("repeated", "Repeated edges", GLYPHS.edge, { kind: "repeated-edge" }),
              ];
    const directed = session.data.statistics().directedness === "directed";
    const relative =
        side === "node"
            ? [
                  item("is-in", "Is in", GLYPHS.neighborhood, { kind: "hops", max: 0 }),
                  item("within", "Within hops of", GLYPHS.neighborhood, { kind: "hops", max: 1 }),
                  item("neighbors", "Neighbors of selection", GLYPHS.neighborhood, {
                      kind: "hops",
                      of: "selection",
                      max: 1,
                  }),
                  item("connected", "Connected to", GLYPHS.neighborhood, { kind: "hops" }),
                  ...(directed
                      ? [
                            item("downstream", "Downstream of", GLYPHS.neighborhood, {
                                kind: "hops",
                                direction: "out",
                            }),
                            item("upstream", "Upstream of", GLYPHS.neighborhood, { kind: "hops", direction: "in" }),
                        ]
                      : []),
                  item("while", "While has nodes", GLYPHS.selection, { kind: "nonempty" }),
              ]
            : [
                  item("touching", "Edges touching", GLYPHS.edge, { kind: "touching", ends: "either" }),
                  item("within-edges", "Edges within", GLYPHS.edge, { kind: "touching", ends: "both" }),
                  item("leaving", "Edges leaving", GLYPHS.edge, { kind: "touching", ends: "one" }),
                  item("while", "While has nodes", GLYPHS.selection, { kind: "nonempty" }),
              ];
    const sections: PickSection[] = [
        ...analyze.map((each) => ({ group: each.heading, items: each.items })),
        { group: "Added", items: added },
        { group: side === "node" ? "Edges (nodes touching)" : "Nodes (edge ends)", items: across },
        { group: "Structure", items: structure },
        { group: "Relative to", items: relative },
    ];
    return sections.filter((each) => each.items.length > 0);
}

/** A rule that tests against a reference: Relative to's forms. */
export type RelativeRule = Extract<RuleTree, { kind: "hops" | "touching" | "nonempty" | "same-value" }>;

/**
 * Whether a step's rule is one of Relative to's forms.
 * @param rule - the rule.
 * @returns true for hops, touching, nonempty and same-value.
 */
export const isRelative = (rule: RuleTree): rule is RelativeRule =>
    rule.kind === "hops" || rule.kind === "touching" || rule.kind === "nonempty" || rule.kind === "same-value";

/**
 * A measure test as a leaf on a path, so the card a data column draws can edit it.
 * @param test - the test.
 * @param path - the run field's path.
 * @returns the leaf.
 */
function testLeaf(test: MeasureTest, path: string): RuleTree {
    return { ...test, attribute: path, path, reads: path } as unknown as RuleTree;
}

/**
 * A leaf's test without its path: the body a `measure` holds.
 * @param leaf - the leaf a card made.
 * @returns the test, or undefined for a leaf no measure test has.
 */
function testOf(leaf: RuleTree): MeasureTest | undefined {
    switch (leaf.kind) {
        case "range":
        case "categories": {
            const { attribute: _attribute, ...test } = leaf;
            return test;
        }
        case "threshold": {
            const { path: _path, ...test } = leaf;
            return test;
        }
        case "text": {
            const { reads: _reads, ...test } = leaf;
            return test;
        }
        default:
            return undefined;
    }
}

/** A step as its card edits it. */
interface StepCardRead {
    /** The card, or null while a run's values are not there yet, or for a rule no card edits. */
    readonly card: Card | null;
    /** The field the step reads, when known. */
    readonly field?: CardField;
}

/**
 * The card a step's test is edited with: the card a data column's leaf draws, or, for a
 * `measure`, the card of the run field it reads once that run is there.
 * @param session - the element's session.
 * @param step - the step.
 * @param reading - its reading.
 * @param side - the selection's side.
 * @returns the card.
 */
export function stepCard(
    session: GraphSession,
    step: UnionStep,
    reading: StepReading | undefined,
    side: Side,
): StepCardRead {
    const fields = [...stepFields(session, side), ...stepFields(session, side === "node" ? "edge" : "node")];
    const { rule } = step;
    if (rule.kind !== "measure") {
        const card = cardOf(session, rule, fields, 0);
        return card.type === "fixed" ? { card: null } : { card, ...("field" in card ? { field: card.field } : {}) };
    }
    const run = reading?.run ?? null;
    if (run === null) {
        return { card: null };
    }
    const path = session.results.path(run, rule.field);
    const field = fields.find((each) => each.path === path);
    if (field === undefined || path === undefined) {
        return { card: null };
    }
    const card =
        rule.test === undefined
            ? cardOf(session, untested(field), fields, 0)
            : cardOf(session, testLeaf(rule.test, path), fields, 0);
    return { card: card.type === "fixed" ? null : card, field };
}

/**
 * A step's rule after its card was edited: the card's leaf (untested while it holds no test), or
 * for a `measure`, its test with the path taken off.
 * @param step - the step.
 * @param card - the card as edited.
 * @returns the rule.
 */
export function ruleOfCard(step: UnionStep, card: Card): RuleTree {
    const field = "field" in card ? card.field : undefined;
    const leaf = leafOf(card) ?? (field === undefined ? step.rule : untested(field));
    if (step.rule.kind !== "measure") {
        return leaf;
    }
    const test = leafOf(card) === null ? undefined : testOf(leaf);
    const { test: _old, ...rest } = step.rule;
    return test === undefined ? rest : { ...rest, test };
}

/**
 * A relative rule's reference.
 * @param rule - the rule.
 * @returns its reference, or undefined while none is chosen.
 */
export const referenceOf = (rule: RelativeRule): StepReference | undefined =>
    rule.kind === "same-value" ? rule.as : rule.of;

/**
 * A relative rule with a new reference.
 * @param rule - the rule.
 * @param reference - the reference.
 * @returns the rule.
 */
export const withReference = (rule: RelativeRule, reference: StepReference): RuleTree =>
    rule.kind === "same-value" ? { ...rule, as: reference } : { ...rule, of: reference };

/**
 * A layer's selector as a selection: its `union` rule, a flat rule converted by the element, or
 * one group starting All with no step for a layer that picks everything (what it paints, so the
 * layer's row, the folded row and the editor read one count); null for a selector the editor does
 * not edit (the selected, the hovered, ids picked by hand).
 * @param session - the element's session.
 * @param selector - the layer's selector.
 * @param side - nodes or edges.
 * @returns the selection, or null.
 */
export function layerSelection(session: GraphSession, selector: Selector, side: Side): UnionLeaf | null {
    if (selector.match === "everything") {
        return {
            kind: "union",
            side: side === "node" ? "nodes" : "edges",
            within: "visible",
            branches: [{ start: "all", steps: [] }],
        };
    }
    const rule = selectorRule(selector)?.where;
    if (rule === undefined) {
        return null;
    }
    if (rule.kind === "union") {
        return rule;
    }
    return session.scope.asUnion(rule, { side: side === "node" ? "nodes" : "edges", within: "visible" });
}

/**
 * A condition's rule as a selection: its `union` rule, or a flat rule converted by the element.
 * @param session - the element's session.
 * @param rule - the condition's rule.
 * @param side - nodes or edges.
 * @returns the selection, or null for a rule the editor does not edit.
 */
export function filterSelection(session: GraphSession, rule: RuleTree, side: Side): UnionLeaf | null {
    if (rule.kind === "union") {
        return rule;
    }
    return session.scope.asUnion(rule, { side: side === "node" ? "nodes" : "edges", within: "graph" });
}
