import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindHit, FindResult, FindValueRow } from "@graphty/graphty-element";
import {
    type GraphSession,
    isGraphtyError,
    renamePaths,
    type RuleCheck,
    rulePath,
} from "@graphty/graphty-element/session";
import { ScrollArea, Text, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { focusInspectorTitle } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { focusValuesNext, takeValuesFocus } from "../inspector/reads";
import { edgeJoiner, edgeName, selectedNameWords, sizeWords, valueWord, yesNoWord } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { selectorName } from "../style/cards";
import { attributeName, readableName } from "../style/words";
import { useSessionVersion } from "./useSessionVersion";

/** The find box's id, which `find.focus` ("/") moves focus to. */
export const FIND_BOX_ID = "ws-find";

/** How many element hits the list shows. */
const LIMIT = 20;

/**
 * How much of the style tree under the list stays in view while the list is open: its first row,
 * so the list never pushes the layers out of the panel altogether.
 */
const TREE_KEEP_PX = 32;

/** The words a yes-or-no value is found by, as every place writes it. */
const BOOLEAN_WORDS = { true: yesNoWord(true), false: yesNoWord(false) } as const;

/**
 * A number in the middle of a range, to two significant figures, so an example reads 75000 rather
 * than 75025, and a whole number for a range of whole numbers.
 * @param min - the lowest value.
 * @param max - the highest value.
 * @returns the number.
 */
function middleOf(min: number, max: number): number {
    // A whole-number range (a count, a degree) gets a whole number.
    const middle = Number.isInteger(min) && Number.isInteger(max) ? Math.round((min + max) / 2) : (min + max) / 2;
    return middle === 0 ? 0 : Number(middle.toPrecision(2));
}

/** The longest text value an example rule quotes. */
const EXAMPLE_TEXT_MAX = 20;

/**
 * An example rule over the open data, in the plain form the box reads, always over a column the
 * nodes carry from the reader's own data: a number column compared with a value inside its range,
 * such as minutes >= 25 (inclusive, so a reader copying it for "25 or more" keeps the 25), else a text column equal to one of its values, such as name == 'Ava' (the
 * rule language has no "contains"), never the ids. A file with neither gets no example: one over a
 * column the reader never gave would teach a name they cannot know.
 * @param session - the element's session.
 * @returns the example, or null.
 */
function exampleRule(session: GraphSession): string | null {
    const columns = session.data
        .attributes()
        .filter((a) => a.kind === "node" && (a.origin === "imported" || a.origin === "joined"));
    // The id column is left out, whichever kind: an example over the ids teaches nothing about the data.
    const number = columns.find(
        (a) =>
            a.measurement === "quantitative" &&
            a.min !== undefined &&
            a.max !== undefined &&
            a.roles?.includes("key") !== true,
    );
    if (number?.min !== undefined && number.max !== undefined) {
        return `${rulePath(number.path)} >= ${String(middleOf(number.min, number.max))}`;
    }
    for (const column of columns) {
        // The id column is left out: an example over the ids teaches nothing about the data.
        if ((column.type !== "string" && column.type !== "category") || column.roles?.includes("key") === true) {
            continue;
        }
        // A short value, which the line shows whole; a quote in it would end it early.
        const value = column.sampleValues.find(
            (each): each is string =>
                typeof each === "string" &&
                each.trim() !== "" &&
                each.length <= EXAMPLE_TEXT_MAX &&
                !/['\\]/.test(each),
        );
        if (value !== undefined) {
            return `${rulePath(column.path)} == '${value}'`;
        }
    }
    return null;
}

/**
 * A rule as the reader reads and types it: its numbers without the backticks the element writes
 * around them. Only numbers: a backticked text or `true` means something else bare.
 * @param rule - the rule, without "=".
 * @returns the rule.
 */
function plainRule(rule: string): string {
    return rule.replaceAll(/`(-?\d+(?:\.\d+)?)`/g, "$1");
}

/**
 * The name the panels show a column a rule reads by: a run's value under its run's name, a node's
 * structure under its own (Degree, never graphty.degree).
 * @param session - the element's session.
 * @param path - the path as the rule names it: a bare column name or a dotted path.
 * @returns the name, or undefined for a path no value answers.
 */
function shownName(session: GraphSession, path: string): string | undefined {
    const value = session.data
        .readableValues()
        .find((each) => each.end === undefined && (each.path === path || rulePath(each.path) === path));
    if (value !== undefined) {
        return readableName(session, value).name;
    }
    const structure = session.data.structureValues().find((each) => each.path === path);
    if (structure !== undefined) {
        return structure.plainName;
    }
    const named = attributeName(session, path);
    return named === path ? undefined : named;
}

/**
 * A rule as the find box shows it: each column under the name the panels give it, numbers bare.
 * It is shown, never typed back: a rule reads columns by their paths.
 * @param session - the element's session.
 * @param rule - the rule, without "=".
 * @returns the words.
 */
function shownRule(session: GraphSession, rule: string): string {
    try {
        return plainRule(renamePaths(rule, (path) => shownName(session, path)));
    } catch {
        return plainRule(rule);
    }
}

/**
 * The rule the element reads for one the reader typed: the rule itself, or, when its only fault is
 * bare numbers, the element's rewrite with them in backticks. So the box reads donations >= 10000
 * as typed.
 * @param session - the element's session.
 * @param rule - the rule, without "=".
 * @returns the rule to run, without "=".
 */
function elementRule(session: GraphSession, rule: string): string {
    try {
        session.selection.checkRule(rule);
        return rule;
    } catch (error) {
        return backtickSuggestion(error) ?? rule;
    }
}

/**
 * The reader's own rule with its bare numbers in backticks, from a refusal for a bare number.
 * @param error - what the element threw.
 * @returns the element's suggestion, or null for any other error.
 */
function backtickSuggestion(error: unknown): string | null {
    if (!isGraphtyError(error) || error.code !== "E_BAD_SELECTOR") {
        return null;
    }
    const details = (error.details ?? {}) as { reason?: unknown; suggestion?: unknown };
    return details.reason === "number-needs-backticks" && typeof details.suggestion === "string"
        ? details.suggestion
        : null;
}

/** Why the element refused a typed rule, worded, and the rule it offers instead. */
interface Refusal {
    /** The line under the box. */
    readonly words: string;
    /** The element's rewrite of the reader's rule, with its "=", offered as the option Enter picks. */
    readonly rule: string | null;
    /** Whether the line also shows a rule that works: for a rule the element cannot read at all. */
    readonly example?: true;
}

/**
 * The element's correction of a typed rule that reads a column this graph does not have, as
 * Enter on its offer runs it.
 * @param session - the element's session.
 * @param typed - the box's text, starting with "=".
 * @returns the corrected rule with its "=", or null when there is none.
 */
function correctedRule(session: GraphSession, typed: string): string | null {
    try {
        const { suggestion } = session.selection.checkRule(elementRule(session, typed.slice(1)));
        return suggestion === undefined ? null : `=${suggestion}`;
    } catch {
        return null;
    }
}

/**
 * Words why the element refused a typed rule, from the refusal's reason code.
 * @param error - what `selection.apply` threw.
 * @returns the refusal, or null when the error is not a refused rule.
 */
function ruleRefusal(error: unknown): Refusal | null {
    if (!isGraphtyError(error) || error.code !== "E_BAD_SELECTOR") {
        return null;
    }
    const details = (error.details ?? {}) as { position?: unknown };
    // The element counts from 0 after the "="; the reader counts from 1 including it.
    const words =
        typeof details.position === "number"
            ? `Not a rule Find can read (at character ${String(details.position + 2)})`
            : "Not a rule Find can read";
    return { words, rule: null, example: true };
}

/**
 * Words for a rule that reads a column this graph does not have, from the element's check: the
 * names it does not know, or, when the element rewrites each to one column, that column under the
 * name the panels show it by, with the rewrite.
 * @param session - the element's session.
 * @param check - what `selection.checkRule` said.
 * @returns the refusal, or null when every column is known.
 */
function unknownRefusal(session: GraphSession, check: RuleCheck): Refusal | null {
    if (check.unknown.length === 0) {
        return null;
    }
    if (check.suggestion !== undefined) {
        // "No column named degree" beside a Degree column on screen reads as a contradiction:
        // the line names the column the reader meant, as the screen names it.
        const meant = check.unknown.map(({ candidates }) => shownName(session, candidates[0]) ?? candidates[0]);
        return { words: `Did you mean ${[...new Set(meant)].join(", ")}?`, rule: `=${check.suggestion}` };
    }
    // A bare name and its `data.` path are one column to the reader.
    const names = check.unknown.map(({ path }) => `"${path.replace(/^data\./, "")}"`).join(", ");
    return { words: `No ${check.unknown.length === 1 ? "column" : "columns"} named ${names}`, rule: null };
}

/** How long typing pauses before the element checks a typed rule. */
const CHECK_DELAY_MS = 200;

/**
 * What the element says of a typed rule, without selecting anything: it counts the rule's
 * matches, which reads the rule exactly as `selection.apply` does.
 * @param session - the element's session.
 * @param typed - the box's text, starting with "=".
 * @returns "ok", "empty" for a lone "=", the refusal, or null for any other error.
 */
async function ruleVerdict(session: GraphSession, typed: string): Promise<"ok" | "empty" | Refusal | null> {
    if (isEmptyRule(typed)) {
        return "empty";
    }
    try {
        const rule = elementRule(session, typed.slice(1));
        await session.scope.count({ where: rule });
        return unknownRefusal(session, session.selection.checkRule(rule)) ?? "ok";
    } catch (error) {
        // An error that is not a refused rule is left for Enter, which reports it as before.
        return ruleRefusal(error);
    }
}

/**
 * The rule plain text that found nothing reads as once "=" is put before it, as the element reads
 * it (its numbers in backticks, a name it does not know written as the one value of that name),
 * when it matches something. A word the element reads as a column that holds nothing, such as a
 * name, is not one.
 * @param session - the element's session.
 * @param typed - the box's text, with no "=".
 * @returns the rule to show after "=", or null when the reader most likely did not type a condition.
 */
async function ruleFromText(session: GraphSession, typed: string): Promise<string | null> {
    try {
        const read = elementRule(session, typed);
        const rule = session.selection.checkRule(read).suggestion ?? read;
        // Counted as Enter would select it, so a rule over an edge column counts its edges.
        const { nodes, edges } = await session.selection.count({ text: `=${rule}` });
        return nodes + edges > 0 ? rule : null;
    } catch {
        return null;
    }
}

/**
 * What picking a rule option does, in words: how many it selects, and what the rule says of them
 * as a layer made from it would be named ("Select the 15 nodes (email: has a value)").
 * @param session - the element's session.
 * @param rule - the rule, without "=".
 * @param count - how many nodes and edges it selects.
 * @param count.nodes - nodes.
 * @param count.edges - edges.
 * @returns the words.
 */
function offerWords(session: GraphSession, rule: string, count: { nodes: number; edges: number }): string {
    if (count.nodes + count.edges === 0) {
        return "Selects nothing";
    }
    const what = selectorName(session, { match: "expression", where: rule });
    // A rule no card draws is named by the rule itself, which the row already shows.
    const meaning = what === undefined || what.startsWith("Rule:") ? "" : ` (${what})`;
    return `Select the ${sizeWords(count.nodes, count.edges)}${meaning}`;
}

/**
 * Whether the box holds "=" and nothing after it yet.
 * @param typed - the box's text.
 * @returns true for a rule still to be typed.
 */
function isEmptyRule(typed: string): boolean {
    return typed.slice(1).trim() === "";
}

/** A column a rule can name, offered after "=". */
interface ColumnOption {
    /** The column's name as the reader knows it. */
    readonly name: string;
    /** What picking it puts in the box. */
    readonly insert: string;
    /** Whether nodes, edges or both carry it. */
    readonly kinds: ReadonlySet<"node" | "edge">;
}

/**
 * The attribute name at the end of a rule: its trailing run of word characters, from the first
 * letter or underscore in it. Scanned by hand, since a regular expression anchored at the end
 * backtracks from every position.
 * @param rule - the rule typed so far.
 * @returns the name, or "" when the rule does not end in one.
 */
function trailingName(rule: string): string {
    let start = rule.length;
    while (start > 0 && /\w/.test(rule.charAt(start - 1))) {
        start--;
    }
    while (start < rule.length && !/[A-Za-z_]/.test(rule.charAt(start))) {
        start++;
    }
    return rule.slice(start);
}

/**
 * The columns to offer for a typed rule: those whose name holds the word being typed, at a
 * place a column can start, and never inside a quoted value.
 * @param session - the element's session.
 * @param typed - the box's text, starting with "=".
 * @returns the word being typed, and the columns.
 */
function columnOptions(session: GraphSession, typed: string): { word: string; columns: ColumnOption[] } {
    const rule = typed.slice(1);
    const word = trailingName(rule);
    const before = rule.slice(0, rule.length - word.length);
    const inQuotes = ["`", "'", '"'].some((q) => before.split(q).length % 2 === 0);
    const startsTerm = word !== "" || /(^|&&|\|\||\(|!)\s*$/.test(before);
    if (inQuotes || !startsTerm) {
        return { word, columns: [] };
    }
    const byText = new Map<string, { name: string; insert: string; kinds: Set<"node" | "edge"> }>();
    // Every value a rule can read, a run's results too; the node id ("id" in a rule reads a column
    // of that name) and a node's value read at an edge's end are left out.
    for (const value of session.data.readableValues()) {
        if (value.from === "element" || value.end !== undefined) {
            continue;
        }
        const insert = rulePath(value.path);
        const { name } = readableName(session, value);
        const named = [name, value.plainName, value.technicalName].some((each) =>
            each.toLowerCase().includes(word.toLowerCase()),
        );
        if (insert === word || !named) {
            continue;
        }
        const entry = byText.get(insert) ?? { name, insert, kinds: new Set() };
        entry.kinds.add(value.on);
        byText.set(insert, entry);
    }
    return { word, columns: [...byText.values()].slice(0, LIMIT) };
}

/**
 * Says which elements carry a column.
 * @param kinds - the kinds that carry it.
 * @returns the words.
 */
function kindWords(kinds: ReadonlySet<"node" | "edge">): string {
    if (kinds.size === 2) {
        return "Node and edge column";
    }
    return kinds.has("edge") ? "Edge column" : "Node column";
}

/** One pickable entry of the list: an element hit, a value row, a column for a rule, or a rule to run. */
type Option =
    | { readonly type: "hit"; readonly hit: FindHit }
    | { readonly type: "value"; readonly row: Omit<FindValueRow, "rule">; readonly orMore?: boolean }
    | { readonly type: "column"; readonly column: ColumnOption }
    | { readonly type: "rule"; readonly rule: string };

/**
 * What a value row selects: the elements carrying the value, or, on its "or more" row, the
 * elements at that value or above.
 * @param option - the value row.
 * @returns the target.
 */
function valueTarget(option: Extract<Option, { type: "value" }>): FindValueRow["target"] {
    return option.orMore === true && option.row.atLeast ? option.row.atLeast.target : option.row.target;
}

/**
 * A value row's key, the same for the same row however the list around it changes.
 * @param option - the value row.
 * @returns the key.
 */
function valueKey(option: Extract<Option, { type: "value" }>): string {
    return JSON.stringify([option.row.kind, option.row.path, option.row.value, option.orMore === true]);
}

/**
 * The height the find list may take: from its top to the bottom of the panel it opens in, less
 * the panel's parts below it that keep their height (the tree's title, its foot) and the first
 * row of the style tree, which gives up the rest of its room.
 * @param list - the list.
 * @returns the height in pixels.
 */
function listRoom(list: HTMLElement): number {
    const place = list.closest(".ws-graph-place");
    const bar = place === null ? undefined : [...place.children].find((part) => part.contains(list));
    if (place === null || bar === undefined) {
        return Number.POSITIVE_INFINITY;
    }
    let below = 0;
    for (let part = bar.nextElementSibling; part !== null; part = part.nextElementSibling) {
        below += part.classList.contains("cm-tree")
            ? Math.min(TREE_KEEP_PX, part.scrollHeight)
            : part.getBoundingClientRect().height;
    }
    return Math.max(place.getBoundingClientRect().bottom - list.getBoundingClientRect().top - below, TREE_KEEP_PX);
}

/**
 * A hit's name: a node's name, or an edge's two ends written the way the inspector writes them.
 * @param session - the session, which says whether the graph is directed.
 * @param hit - the hit.
 * @returns the name.
 */
function hitName(session: GraphSession, hit: FindHit): string {
    return hit.kind === "edge"
        ? edgeName(session, { source: hit.ends.source.id, target: hit.ends.target.id })
        : hit.name;
}

/** What the element said of a typed rule: "ok", "empty", or null while unchecked. */
type RuleVerdict = "ok" | "empty" | null;

/** A typed rule and what the element said of it. */
interface RuleAnswer {
    readonly text: string;
    readonly verdict: RuleVerdict;
}

/** The rule plain text that found nothing reads as once "=" leads it, null when it reads as none. */
interface TextAsRuleAnswer {
    readonly text: string;
    readonly rule: string | null;
}

/** How many the rule option selects. */
interface OfferCount {
    readonly rule: string;
    readonly nodes: number;
    readonly edges: number;
}

type Workspace = ReturnType<typeof useWorkspace>;

/**
 * A list row's id.
 * @param listId - the list's id.
 * @param i - the row's place among the options.
 * @returns the id.
 */
function optionIdOf(listId: string, i: number): string {
    return `${listId}-${String(i)}`;
}

/**
 * What the element finds for the typed text, or null for an empty box.
 * @param session - the element's session.
 * @param text - the typed text.
 * @returns the result, or null.
 */
function findIn(session: GraphSession | null, text: string): FindResult | null {
    return session === null || text.trim() === ""
        ? null
        : session.find(text, { limit: LIMIT, edgeNameJoiner: edgeJoiner(session), booleanWords: BOOLEAN_WORDS });
}

/**
 * The columns offered while a rule is typed.
 * @param session - the element's session.
 * @param text - the typed text.
 * @param isRule - whether the text is a rule.
 * @returns the word being typed and the columns it may name.
 */
function columnsFor(
    session: GraphSession | null,
    text: string,
    isRule: boolean,
): { word: string; columns: ColumnOption[] } {
    return session !== null && isRule ? columnOptions(session, text) : { word: "", columns: [] };
}

/**
 * Each value row, then its "or more" row when the element offers one; then the element's
 * "or more" rows for a typed number no value equals.
 * @param found - what the element found.
 * @returns the value options.
 */
function valueOptionsOf(found: FindResult | null): Option[] {
    return [
        ...(found?.values.flatMap((row): Option[] =>
            row.atLeast === undefined
                ? [{ type: "value", row }]
                : [
                      { type: "value", row },
                      { type: "value", row, orMore: true },
                  ],
        ) ?? []),
        ...(found?.atLeast ?? []).map((row): Option => ({
            type: "value",
            row: { ...row, atLeast: row },
            orMore: true,
        })),
    ];
}

/**
 * Whether plain text found nothing at all, so it is asked of the element as a rule.
 * @param found - what the element found.
 * @param valueOptions - the value options.
 * @returns true when nothing was found.
 */
function isNothingFound(found: FindResult | null, valueOptions: readonly Option[]): boolean {
    return (
        found !== null && found.notSearchable === undefined && found.records.length === 0 && valueOptions.length === 0
    );
}

/**
 * The element's verdict on the typed rule, once it is for the text in the box.
 * @param isRule - whether the text is a rule.
 * @param answer - the element's last answer.
 * @param text - the typed text.
 * @returns the verdict, or null while unchecked.
 */
function ruleCheckOf(isRule: boolean, answer: RuleAnswer | null, text: string): RuleVerdict {
    return isRule && answer?.text === text ? answer.verdict : null;
}

/**
 * The rule the element reads plain text that found nothing as, once it is for the text in the box.
 * @param foundNothing - whether the text found nothing.
 * @param answer - the element's last answer.
 * @param text - the typed text.
 * @returns the rule, null when it reads as none, or undefined until the element has answered.
 */
function textAsRuleOf(foundNothing: boolean, answer: TextAsRuleAnswer | null, text: string): string | null | undefined {
    return foundNothing && answer?.text === text ? answer.rule : undefined;
}

/**
 * Whether the selection came from running the box's rule: typed with its "=" or as plain text
 * that reads as a rule. A rule run with Enter is the selection's origin until anything else
 * changes the selection.
 * @param session - the element's session.
 * @param text - the typed text.
 * @param isRule - whether the text is a rule.
 * @param textAsRule - the rule the plain text reads as.
 * @returns true when the box's rule ran.
 */
function ranFromBox(
    session: GraphSession | null,
    text: string,
    isRule: boolean,
    textAsRule: string | null | undefined,
): boolean {
    const origin = session?.selection.origin;
    const originText = origin !== null && origin !== undefined && "text" in origin ? origin.text : undefined;
    if (session === null || originText === undefined) {
        return false;
    }
    if (isRule) {
        return [text, `=${elementRule(session, text.slice(1))}`, correctedRule(session, text)].includes(originText);
    }
    return typeof textAsRule === "string" && originText === `=${elementRule(session, textAsRule)}`;
}

/**
 * A rule shown under the box, the element's rewrite of a refused rule or the plain text as a rule
 * not yet run: an option too, the last, and the one Enter picks.
 * @param isRule - whether the text is a rule.
 * @param refusal - the element's refusal of the typed rule.
 * @param textAsRule - the rule the plain text reads as.
 * @param ran - whether the box's rule ran.
 * @returns the rule, with its "=", or null.
 */
function ruleOptionOf(
    isRule: boolean,
    refusal: Refusal | null,
    textAsRule: string | null | undefined,
    ran: boolean,
): string | null {
    if (isRule) {
        return refusal?.rule ?? null;
    }
    return typeof textAsRule === "string" && !ran ? `=${textAsRule}` : null;
}

/**
 * Every option of the list, in the order the keyboard walks them.
 * @param found - what the element found.
 * @param hits - the hits, nodes first.
 * @param valueOptions - the value options.
 * @param columns - the columns offered.
 * @param ruleOption - the rule option.
 * @returns the options.
 */
function optionsOf(
    found: FindResult | null,
    hits: readonly FindHit[],
    valueOptions: readonly Option[],
    columns: readonly ColumnOption[],
    ruleOption: string | null,
): Option[] {
    return found
        ? [
              ...hits.map((hit): Option => ({ type: "hit", hit })),
              ...valueOptions,
              ...columns.map((column): Option => ({ type: "column", column })),
              ...(ruleOption === null ? [] : [{ type: "rule", rule: ruleOption } as const]),
          ]
        : [];
}

/**
 * Whether Enter runs the typed text as a selection: a regex or expression is not run while
 * typing.
 * @param found - what the element found.
 * @param session - the element's session.
 * @param isRule - whether the text is a rule.
 * @param text - the typed text.
 * @returns true when Enter runs the text.
 */
function runsTypedOf(found: FindResult | null, session: GraphSession | null, isRule: boolean, text: string): boolean {
    return found?.notSearchable !== undefined && session !== null && !(isRule && isEmptyRule(text));
}

/**
 * The option Enter picks: the first until the arrows move it; none while Enter would run the
 * typed rule or pattern instead.
 * @param active - the row the arrows are on, or -1.
 * @param ruleOption - the rule option.
 * @param runsTyped - whether Enter runs the typed text.
 * @param count - how many options there are.
 * @returns the option's place, or -1.
 */
function enterTarget(active: number, ruleOption: string | null, runsTyped: boolean, count: number): number {
    if (active >= 0) {
        return active;
    }
    if (ruleOption !== null) {
        return count - 1;
    }
    return runsTyped ? -1 : 0;
}

/**
 * The refusal as it is spoken: the correction it offers, or its words with an example rule.
 * @param session - the element's session.
 * @param refusal - the refusal.
 * @returns the words.
 */
function refusalSpeech(session: GraphSession, refusal: Refusal): string {
    const example = refusal.example ? exampleRule(session) : null;
    if (refusal.rule !== null) {
        return `Did you mean ${shownRule(session, refusal.rule.slice(1)).trim()}?`;
    }
    return example === null ? refusal.words : `${refusal.words}. A rule reads like ${example}`;
}

/**
 * Runs a typed rule or pattern as a selection. The rule stays in the box with the caret at its
 * end, so it can be changed; the line under the box then says what it selected.
 * @param current - the element's session.
 * @param typed - the typed text.
 * @param setRefusal - shows a refusal under the box.
 */
async function runTypedRule(
    current: GraphSession,
    typed: string,
    setRefusal: (refusal: Refusal | null) => void,
): Promise<void> {
    try {
        // A rule over a column the graph does not have would select nothing, which reads like
        // an answer; it is refused instead.
        const rule = typed.startsWith("=") ? `=${elementRule(current, typed.slice(1))}` : typed;
        const unknown = rule.startsWith("=")
            ? unknownRefusal(current, current.selection.checkRule(rule.slice(1)))
            : null;
        if (unknown !== null) {
            setRefusal(unknown);
            return;
        }
        await current.selection.apply({ text: rule }, "replace", { cause: "user" });
    } catch (error) {
        const refused = ruleRefusal(error);
        if (refused === null) {
            throw error;
        }
        setRefusal(refused);
    }
}

/** What a pick reads and changes. */
interface PickContext {
    readonly session: GraphSession | null;
    readonly element: Workspace["element"];
    readonly store: Workspace["store"];
    readonly text: string;
    readonly word: string;
    readonly shiftPicked: React.RefObject<boolean>;
    readonly setText: (text: string) => void;
    readonly setActive: (active: number) => void;
    readonly setRefusal: (refusal: Refusal | null) => void;
    readonly setListOpen: (open: boolean) => void;
    readonly setPickedValues: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
}

/**
 * Shift adds the pick to the selection and keeps the list, for the next pick.
 * @param ctx - what the pick reads and changes.
 * @param session - the element's session.
 * @param option - the picked row.
 */
async function addPick(
    ctx: PickContext,
    session: GraphSession,
    option: Extract<Option, { type: "value" | "hit" }>,
): Promise<void> {
    await session.selection.apply(option.type === "hit" ? option.hit.target : valueTarget(option), "add", {
        cause: "user",
    });
    ctx.shiftPicked.current = true;
    if (option.type === "value") {
        ctx.setPickedValues((before) => new Set(before).add(valueKey(option)));
    }
    ctx.setListOpen(true);
}

/**
 * Selects a picked node or edge and moves the keyboard into its values.
 * @param ctx - what the pick reads and changes.
 * @param session - the element's session.
 * @param hit - the picked hit.
 */
async function pickHit(ctx: PickContext, session: GraphSession, hit: FindHit): Promise<void> {
    // The keyboard follows the pick into the node's or the edge's values, out of the box (task T12).
    focusValuesNext();
    await session.selection.apply(hit.target, "replace", { cause: "user" });
    // The inspector shows what is selected once no row is open.
    ctx.store.set({ inspected: null });
    // On the Style tab no values view takes the request: the title does, so Enter leaves the
    // box the same way whichever tab is open and however focus reached the box.
    requestAnimationFrame(() => {
        if (takeValuesFocus()) {
            focusInspectorTitle();
        }
    });
    // The element glides the camera to center every pick (camera.pivotOnSelection, set in
    // ElementHost); a pick that is off screen is also zoomed to, so it is drawn at a size to see.
    const ids = hit.kind === "edge" ? [hit.ends.source.id, hit.ends.target.id] : [hit.id];
    if (!ids.every((id) => ctx.element?.nodeScreenPosition(id)?.visible === true)) {
        await ctx.element?.zoomToSelection();
    }
}

/**
 * Picks one row of the list.
 * @param ctx - what the pick reads and changes.
 * @param option - the row.
 * @param adding - whether Shift adds it to the selection.
 */
async function pickOption(ctx: PickContext, option: Option, adding: boolean): Promise<void> {
    const { session } = ctx;
    if (session === null) {
        return;
    }
    if (adding && (option.type === "value" || option.type === "hit")) {
        await addPick(ctx, session, option);
        return;
    }
    if (option.type === "column") {
        // The column replaces the word being typed; the box keeps focus for the rest of the rule.
        ctx.setText(ctx.text.slice(0, ctx.text.length - ctx.word.length) + option.column.insert);
        ctx.setActive(-1);
        return;
    }
    if (option.type === "rule") {
        // The box keeps the reader's own words, and runs, as if run with Enter: a typed rule the
        // element corrected runs the correction, which the line under the box named.
        ctx.setActive(-1);
        ctx.setRefusal(null);
        await runTypedRule(session, option.rule, ctx.setRefusal);
        return;
    }
    ctx.setText("");
    ctx.setActive(-1);
    if (option.type === "value") {
        await session.selection.apply(valueTarget(option), "replace", { cause: "user" });
        return;
    }
    await pickHit(ctx, session, option.hit);
}

/** What the box's keys read and change. */
interface KeyContext {
    readonly session: GraphSession | null;
    readonly element: Workspace["element"];
    readonly store: Workspace["store"];
    readonly text: string;
    readonly listOpen: boolean;
    readonly count: number;
    readonly target: number;
    readonly chosen: Option | undefined;
    readonly runsTyped: boolean;
    readonly spokenLine: string | null;
    readonly setListOpen: (open: boolean) => void;
    readonly setActive: (active: number) => void;
    readonly pick: (option: Option) => Promise<void>;
    readonly setRefusal: (refusal: Refusal | null) => void;
}

/**
 * Enter picks the chosen row, runs the typed rule or pattern, or says there is nothing to pick.
 * @param ctx - what the keys read and change.
 */
function enterKey(ctx: KeyContext): void {
    if (ctx.chosen !== undefined) {
        void ctx.pick(ctx.chosen);
    } else if (ctx.runsTyped && ctx.session !== null) {
        void runTypedRule(ctx.session, ctx.text, ctx.setRefusal);
    } else if (ctx.text.trim() !== "") {
        // Enter with nothing to pick says so, rather than nothing at all.
        ctx.store.set({ announcement: ctx.spokenLine ?? `No match for "${ctx.text}"` });
    }
}

/**
 * The box's keys: the arrows walk the list, Enter picks, Esc in an empty box leaves it.
 * @param event - the key.
 * @param ctx - what the keys read and change.
 */
function findKeyDown(event: React.KeyboardEvent<HTMLInputElement>, ctx: KeyContext): void {
    const arrow = event.key === "ArrowDown" || event.key === "ArrowUp";
    if (!ctx.listOpen && arrow && ctx.count > 0) {
        // A closed list opens on the arrows first, as a list box does.
        event.preventDefault();
        ctx.setListOpen(true);
    } else if (arrow && ctx.count > 0) {
        event.preventDefault();
        ctx.setActive(
            event.key === "ArrowDown" ? Math.min(ctx.target + 1, ctx.count - 1) : Math.max(ctx.target - 1, 0),
        );
    } else if (event.key === "Enter") {
        event.preventDefault();
        enterKey(ctx);
    } else if (event.key === "Escape" && ctx.text === "") {
        // An empty box has nothing left to clear: Escape leaves it for the drawing and keeps
        // the selection, which Escape on the drawing clears.
        event.preventDefault();
        event.stopPropagation();
        ctx.element?.focus();
    }
}

/** The line under the box, as drawn and as a screen reader hears it. */
interface FindLine {
    readonly emptyLine: React.ReactNode;
    readonly lineWords: string | null;
}

/**
 * The line under a typed rule: the press-Enter hint is only for a rule the element accepts.
 * @param ruleCheck - the element's verdict on the rule.
 * @param example - an example rule, or null.
 * @returns the line.
 */
function ruleLine(ruleCheck: RuleVerdict, example: string | null): FindLine {
    if (ruleCheck === null) {
        return { emptyLine: null, lineWords: null };
    }
    if (ruleCheck === "ok") {
        const ok = "Rule: press Enter to select matches";
        return { emptyLine: ok, lineWords: ok };
    }
    if (example === null) {
        return { emptyLine: "Type a rule", lineWords: "Type a rule" };
    }
    // The example rule never breaks: the sentence wraps before it.
    return {
        emptyLine: (
            <>
                Type a rule, such as <span className="ws-nowrap ws-mono">{example}</span>
            </>
        ),
        lineWords: `Type a rule, such as ${example}`,
    };
}

/** What the line under the box is worded from. */
interface LineFacts {
    readonly session: GraphSession | null;
    readonly text: string;
    readonly ran: boolean;
    readonly isRule: boolean;
    readonly ruleCheck: RuleVerdict;
    readonly example: string | null;
    readonly textAsRule: string | null | undefined;
    readonly listOpen: boolean;
    readonly keptWords: string;
    readonly found: FindResult | null;
}

/**
 * The line under the box. The example is drawn on a line of its own, so what stays selected is
 * said before it; the status line speaks the words, since the line arrives with its words.
 * @param facts - what the line is worded from.
 * @returns the line.
 */
function findLine(facts: LineFacts): FindLine {
    const { session, text, keptWords, textAsRule, example } = facts;
    const noMatch = `No match for "${text}"`;
    if (facts.ran && session !== null) {
        const { nodes, edges } = session.selection;
        const words = nodes.length + edges.length === 0 ? "Nothing matches this rule" : selectedNameWords(session);
        return { emptyLine: words, lineWords: words };
    }
    if (facts.isRule) {
        return ruleLine(facts.ruleCheck, example);
    }
    if (typeof textAsRule === "string") {
        // The rule itself is the option under this line: with the list closed there is no row for
        // the heading to lead to, so it goes too.
        const words = facts.listOpen ? "Select by a value:" : null;
        return { emptyLine: words, lineWords: words };
    }
    if (textAsRule === null && example !== null) {
        // Text that reads as no rule gets an example of one, on a line of its own.
        return {
            emptyLine: (
                <>
                    <span>{noMatch}</span>
                    {keptWords}. To select by a value, type a rule such as{" "}
                    <span className="ws-find-example ws-mono">{example}</span>
                </>
            ),
            lineWords: `${noMatch}${keptWords}. To select by a value, type a rule such as ${example}`,
        };
    }
    if (textAsRule === null) {
        return { emptyLine: `${noMatch}${keptWords}`, lineWords: `${noMatch}${keptWords}` };
    }
    if (facts.found?.notSearchable === "regex") {
        const words = `Press Enter to select "${text}"`;
        return { emptyLine: words, lineWords: words };
    }
    return { emptyLine: noMatch, lineWords: noMatch };
}

/**
 * What stays selected while a find misses or is refused, said so the drawing is not misread.
 * @param session - the element's session.
 * @param held - how many nodes and edges are selected.
 * @returns the words, or "".
 */
function keptWordsOf(session: GraphSession | null, held: number): string {
    return session === null || held === 0
        ? ""
        : `. Still selected: ${sizeWords(session.selection.nodes.length, session.selection.edges.length)}`;
}

/**
 * A refusal keeps the earlier selection; one the element cannot read at all shows a rule that
 * works. A refusal that offers a correction is a suggestion, drawn as the hint is, not an error.
 * @param refusal - the refusal.
 * @param session - the element's session.
 * @param example - an example rule, or null.
 * @param keptWords - what stays selected.
 * @returns the error line, or null.
 */
function refusalLineOf(
    refusal: Refusal | null,
    session: GraphSession | null,
    example: string | null,
    keptWords: string,
): React.ReactNode {
    if (refusal === null || session === null || refusal.rule !== null) {
        return null;
    }
    return refusal.example && example !== null ? (
        <>
            {refusal.words}
            {keptWords}. A rule reads like <span className="ws-find-example ws-mono">{example}</span>
        </>
    ) : (
        `${refusal.words}${keptWords}`
    );
}

/** What decides whether the line shows and what it says aloud. */
interface SpeechFacts {
    readonly session: GraphSession | null;
    readonly found: FindResult | null;
    readonly count: number;
    readonly isRule: boolean;
    readonly ruleOption: string | null;
    readonly refusal: Refusal | null;
    readonly line: FindLine;
    readonly foundNothing: boolean;
    readonly textAsRule: string | null | undefined;
    readonly offerCount: OfferCount | null;
}

/**
 * Whether the line under the box shows, and the words said for it. Plain text the element has
 * not yet read as a rule is not said to match nothing: on the next pause it may offer one. An
 * offered rule is said with what it selects, once that is counted.
 * @param facts - what decides it.
 * @returns whether the line shows, and its spoken words or null.
 */
function lineSpeech(facts: SpeechFacts): { showLine: boolean; spokenLine: string | null } {
    const { session, ruleOption, textAsRule, offerCount } = facts;
    const showLine =
        facts.found !== null &&
        (facts.count === 0 || facts.isRule || ruleOption !== null) &&
        facts.refusal === null &&
        facts.line.emptyLine !== null;
    const settled = !(facts.foundNothing && textAsRule === undefined);
    const spokenLine = showLine && settled ? facts.line.lineWords : null;
    if (spokenLine === null || typeof textAsRule !== "string" || ruleOption === null || session === null) {
        return { showLine, spokenLine };
    }
    return {
        showLine,
        spokenLine:
            offerCount?.rule === ruleOption
                ? `${spokenLine} ${shownRule(session, ruleOption.slice(1))}. ${offerWords(session, ruleOption.slice(1), offerCount)}`
                : null,
    };
}

/**
 * The list closes as a list does: on a click anywhere outside the find box.
 * @param boxRef - the find box.
 * @param setListOpen - opens or closes the list.
 */
function useCloseOnPointerOutside(
    boxRef: React.RefObject<HTMLDivElement | null>,
    setListOpen: (open: boolean) => void,
): void {
    useEffect(() => {
        const onPointerDown = (event: PointerEvent): void => {
            if (!(event.target instanceof Node && boxRef.current?.contains(event.target) === true)) {
                setListOpen(false);
            }
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [boxRef, setListOpen]);
}

/**
 * A Shift pick keeps the list for the next one; once the list closes, the box clears as it does
 * after a plain pick.
 * @param listOpen - whether the list is open.
 * @param shiftPicked - whether a Shift pick kept the list.
 * @param setText - sets the box's text.
 * @param setActive - sets the arrows' row.
 * @param setPickedValues - sets the value rows marked as picked.
 */
function useClearAfterShiftPicks(
    listOpen: boolean,
    shiftPicked: React.RefObject<boolean>,
    setText: (text: string) => void,
    setActive: (active: number) => void,
    setPickedValues: (values: ReadonlySet<string>) => void,
): void {
    useEffect(() => {
        if (!listOpen && shiftPicked.current) {
            shiftPicked.current = false;
            setText("");
            setActive(-1);
            setPickedValues(new Set());
        }
    }, [listOpen, shiftPicked, setText, setActive, setPickedValues]);
}

/**
 * How many the rule option selects, asked of the element as Enter would select it.
 * @param session - the element's session.
 * @param ruleOption - the rule option.
 * @param version - the session's change count.
 * @returns the count, for the rule it was asked for.
 */
function useOfferCount(session: GraphSession | null, ruleOption: string | null, version: number): OfferCount | null {
    const [offerCount, setOfferCount] = useState<OfferCount | null>(null);
    useEffect(() => {
        if (session === null || ruleOption === null) {
            return undefined;
        }
        let current = true;
        session.selection.count({ text: ruleOption }).then(
            ({ nodes, edges }) => {
                if (current) {
                    setOfferCount({ rule: ruleOption, nodes, edges });
                }
            },
            () => undefined,
        );
        return () => {
            current = false;
        };
    }, [session, ruleOption, version]);
    return offerCount;
}

/**
 * A typed rule is checked once typing pauses, so a refusal shows before Enter.
 * @param session - the element's session.
 * @param text - the typed text.
 * @param isRule - whether the text is a rule.
 * @param version - the session's change count.
 * @param setRuleAnswer - keeps the element's verdict.
 * @param setRefusal - shows a refusal under the box.
 */
function useRuleCheck(
    session: GraphSession | null,
    text: string,
    isRule: boolean,
    version: number,
    setRuleAnswer: (answer: RuleAnswer) => void,
    setRefusal: (refusal: Refusal | null) => void,
): void {
    useEffect(() => {
        if (session === null || !isRule) {
            return undefined;
        }
        let current = true;
        const timer = setTimeout(() => {
            void ruleVerdict(session, text).then((verdict) => {
                if (!current) {
                    return;
                }
                if (verdict === "ok" || verdict === "empty") {
                    setRuleAnswer({ text, verdict });
                    setRefusal(null);
                } else {
                    setRuleAnswer({ text, verdict: null });
                    setRefusal(verdict);
                }
            });
        }, CHECK_DELAY_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [session, text, isRule, version, setRuleAnswer, setRefusal]);
}

/**
 * Plain text that finds nothing is asked of the element as a rule once typing pauses.
 * @param session - the element's session.
 * @param text - the typed text.
 * @param foundNothing - whether the text found nothing.
 * @param version - the session's change count.
 * @param setTextAsRuleAnswer - keeps the element's answer.
 */
function useTextAsRule(
    session: GraphSession | null,
    text: string,
    foundNothing: boolean,
    version: number,
    setTextAsRuleAnswer: (answer: TextAsRuleAnswer) => void,
): void {
    useEffect(() => {
        if (session === null || !foundNothing) {
            return undefined;
        }
        let current = true;
        const timer = setTimeout(() => {
            void ruleFromText(session, text).then((rule) => {
                if (current) {
                    setTextAsRuleAnswer({ text, rule });
                }
            });
        }, CHECK_DELAY_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [session, text, foundNothing, version, setTextAsRuleAnswer]);
}

/**
 * The refusal is spoken from a region that stays mounted and keeps its words while the reader
 * types, so a refusal is said once, politely, not again on every keystroke; it empties only once
 * the box holds no rule or a rule Find can read.
 * @param session - the element's session.
 * @param refusal - the refusal.
 * @param isRule - whether the text is a rule.
 * @param ruleCheck - the element's verdict on the rule.
 * @param ran - whether the box's rule ran.
 * @returns the words the region holds.
 */
function useSpokenRefusal(
    session: GraphSession | null,
    refusal: Refusal | null,
    isRule: boolean,
    ruleCheck: RuleVerdict,
    ran: boolean,
): string {
    const [spoken, setSpoken] = useState("");
    useEffect(() => {
        if (refusal === null || session === null) {
            return;
        }
        setSpoken(refusalSpeech(session, refusal));
    }, [refusal, session]);
    useEffect(() => {
        if (!isRule || ruleCheck !== null || ran) {
            setSpoken("");
        }
    }, [isRule, ruleCheck, ran]);
    return spoken;
}

/**
 * Focus stays in the text box, so the browser never scrolls the list to the arrows' row: the row
 * is brought into view here, by the least scroll that shows it whole, with its group's heading
 * when it is the group's first row.
 * @param activeId - the arrows' row's id.
 */
function useScrollActiveIntoView(activeId: string | undefined): void {
    useLayoutEffect(() => {
        const row = activeId === undefined ? null : document.getElementById(activeId);
        const heading = row?.previousElementSibling;
        if (heading?.classList.contains("ws-find-heading") === true) {
            heading.scrollIntoView({ block: "nearest" });
        }
        row?.scrollIntoView({ block: "nearest" });
    }, [activeId]);
}

/**
 * The list takes the room the panel has below it, less what stays of the tree and the panel's
 * foot. Past that room it ends on a whole row: its height is cut back to the bottom of the last
 * option row that fits, headings counted in, so it never ends on a heading. Scrolling then
 * stops only where a row's bottom meets the edge, or at the top (scroll-snap in graph-place.css).
 * @param listRef - the list.
 * @param viewportRef - the list's scrolling viewport.
 */
function useListHeight(
    listRef: React.RefObject<HTMLDivElement | null>,
    viewportRef: React.RefObject<HTMLDivElement | null>,
): void {
    useLayoutEffect(() => {
        const { current: list } = listRef;
        const { current: viewport } = viewportRef;
        if (list === null || viewport === null) {
            return;
        }
        list.style.maxHeight = "";
        const room = listRoom(list);
        if (viewport.scrollHeight <= room) {
            return;
        }
        const { top } = viewport.getBoundingClientRect();
        const fits = [...viewport.querySelectorAll<HTMLElement>("[role=option]")]
            .map((row) => row.getBoundingClientRect().bottom - top + viewport.scrollTop)
            .filter((bottom) => bottom <= room);
        // The max height counts the bottom border too (border-box).
        list.style.maxHeight = `${String(Math.max(...fits, 0) + list.offsetHeight - list.clientHeight)}px`;
    });
}

/**
 * Said to the reader in the box; a line that changes because something else changed (a selection
 * cleared by Esc elsewhere) does not talk over that change's own message.
 * @param spokenLine - the line's spoken words.
 * @param store - the workspace store.
 */
function useSayInBox(spokenLine: string | null, store: Workspace["store"]): void {
    useEffect(() => {
        if (spokenLine !== null && spokenLine !== "" && document.activeElement?.id === FIND_BOX_ID) {
            store.set({ announcement: spokenLine });
        }
    }, [spokenLine, store]);
}

/**
 * The box's blur: focus moving on to another control closes the list; focus leaving the window
 * does not.
 * @param setListOpen - opens or closes the list.
 * @returns the handler.
 */
function closeOnFocusOut(setListOpen: (open: boolean) => void): (event: React.FocusEvent<HTMLDivElement>) => void {
    return (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) {
            setListOpen(false);
        }
    };
}

/** The props every group of the list shares. */
interface GroupProps {
    readonly listId: string;
    readonly target: number;
    readonly pick: (option: Option, adding?: boolean) => Promise<void>;
}

/**
 * A group of hits, nodes or edges, under its heading.
 * @param props - Component props
 * @param props.label - the heading.
 * @param props.group - the hits.
 * @param props.first - the first hit's place among the options.
 * @param props.total - every match of its kind, not only the rows listed.
 * @param props.session - the element's session.
 * @param props.text - the typed text.
 * @param props.listId - the list's id.
 * @param props.target - the place of the option Enter picks.
 * @param props.pick - picks a row.
 * @returns the group.
 */
function HitGroup({
    label,
    group,
    first,
    total,
    session,
    text,
    listId,
    target,
    pick,
}: GroupProps & {
    readonly label: string;
    readonly group: readonly FindHit[];
    readonly first: number;
    readonly total: number;
    readonly session: GraphSession;
    readonly text: string;
}): React.JSX.Element {
    return (
        <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
            role="group"
            aria-label={label}
        >
            {/* The heading counts every match of its kind, not only the rows listed. */}
            <Text component="div" className="ws-find-heading" aria-hidden="true">
                {label} <span className="ws-find-heading-count">{total}</span>
            </Text>
            {group.map((hit, j) => {
                const i = first + j;
                const name = hitName(session, hit);
                const where =
                    String(hit.match.value) === name
                        ? undefined
                        : `${attributeName(session, hit.match.path)}: ${valueWord(hit.match.value)}`;
                const isEdge = hit.kind === "edge";
                return (
                    <ResultRow
                        lines={2}
                        key={optionIdOf(listId, i)}
                        id={optionIdOf(listId, i)}
                        name={name}
                        match={text}
                        path={where}
                        icon={isEdge ? <GLYPHS.edge size={14} /> : <GLYPHS.node size={14} />}
                        current={i === target}
                        picked={(isEdge ? session.selection.edges : session.selection.nodes).includes(hit.id)}
                        onClick={(event) => {
                            void pick({ type: "hit", hit }, event.shiftKey);
                        }}
                    />
                );
            })}
        </div>
    );
}

/**
 * The value rows, under Values.
 * @param props - Component props
 * @param props.valueOptions - the value options.
 * @param props.first - the first row's place among the options.
 * @param props.session - the element's session.
 * @param props.held - how many nodes and edges are selected.
 * @param props.pickedValues - the rows added with Shift.
 * @param props.listId - the list's id.
 * @param props.target - the place of the option Enter picks.
 * @param props.pick - picks a row.
 * @returns the group.
 */
function ValuesGroup({
    valueOptions,
    first,
    session,
    held,
    pickedValues,
    listId,
    target,
    pick,
}: GroupProps & {
    readonly valueOptions: readonly Option[];
    readonly first: number;
    readonly session: GraphSession;
    readonly held: number;
    readonly pickedValues: ReadonlySet<string>;
}): React.JSX.Element {
    return (
        <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
            role="group"
            aria-label="Values"
        >
            <Text component="div" className="ws-find-heading" aria-hidden="true">
                Values
            </Text>
            {valueOptions.map((option, j) => {
                if (option.type !== "value") {
                    return null;
                }
                const i = first + j;
                const { row } = option;
                const orMore = option.orMore === true;
                const count = orMore ? row.atLeast?.count : row.count;
                const more = orMore ? " or more" : "";
                const words = `${attributeName(session, row.path)} is ${valueWord(row.value)}${more} (${String(count)})`;
                return (
                    <ResultRow
                        lines={2}
                        key={optionIdOf(listId, i)}
                        id={optionIdOf(listId, i)}
                        name={words}
                        aria-label={`Select where ${words}`}
                        icon={<GLYPHS.filter size={14} />}
                        current={i === target}
                        picked={held > 0 && pickedValues.has(valueKey(option))}
                        onClick={(event) => {
                            void pick(option, event.shiftKey);
                        }}
                    />
                );
            })}
        </div>
    );
}

/**
 * The columns a rule can name, under Columns.
 * @param props - Component props
 * @param props.columns - the columns.
 * @param props.first - the first row's place among the options.
 * @param props.word - the word being typed.
 * @param props.listId - the list's id.
 * @param props.target - the place of the option Enter picks.
 * @param props.pick - picks a row.
 * @returns the group.
 */
function ColumnsGroup({
    columns,
    first,
    word,
    listId,
    target,
    pick,
}: GroupProps & {
    readonly columns: readonly ColumnOption[];
    readonly first: number;
    readonly word: string;
}): React.JSX.Element {
    return (
        <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
            role="group"
            aria-label="Columns"
        >
            <Text component="div" className="ws-find-heading" aria-hidden="true">
                Columns
            </Text>
            {columns.map((column, j) => {
                const i = first + j;
                return (
                    <ResultRow
                        lines={2}
                        key={optionIdOf(listId, i)}
                        id={optionIdOf(listId, i)}
                        name={column.name}
                        match={word}
                        path={kindWords(column.kinds)}
                        icon={<GLYPHS.attribute size={14} />}
                        current={i === target}
                        onClick={() => {
                            void pick({ type: "column", column });
                        }}
                    />
                );
            })}
        </div>
    );
}

/**
 * The rule option, the list's last row.
 * @param props - Component props
 * @param props.ruleOption - the rule, with its "=".
 * @param props.index - its place among the options.
 * @param props.session - the element's session.
 * @param props.offerCount - how many it selects, once counted.
 * @param props.listId - the list's id.
 * @param props.target - the place of the option Enter picks.
 * @param props.pick - picks a row.
 * @returns the group.
 */
function RuleGroup({
    ruleOption,
    index,
    session,
    offerCount,
    listId,
    target,
    pick,
}: GroupProps & {
    readonly ruleOption: string;
    readonly index: number;
    readonly session: GraphSession | null;
    readonly offerCount: OfferCount | null;
}): React.JSX.Element {
    const rule = ruleOption.slice(1);
    return (
        <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
            role="group"
            aria-label="Rule"
            className="ws-find-rule"
        >
            <ResultRow
                lines={2}
                id={optionIdOf(listId, index)}
                name={session === null ? plainRule(rule) : shownRule(session, rule)}
                path={
                    offerCount?.rule === ruleOption && session !== null
                        ? offerWords(session, rule, offerCount)
                        : "Select its matches"
                }
                icon={<GLYPHS.filter size={14} />}
                current={index === target}
                onClick={() => {
                    void pick({ type: "rule", rule: ruleOption });
                }}
            />
        </div>
    );
}

/**
 * The find box's live list: nodes, edges, values, columns and the rule, each under its heading.
 * @param props - Component props
 * @param props.found - what the element found.
 * @param props.session - the element's session.
 * @param props.nodeHits - the node hits.
 * @param props.edgeHits - the edge hits.
 * @param props.valueOptions - the value options.
 * @param props.columns - the columns offered.
 * @param props.ruleOption - the rule option.
 * @param props.count - how many options there are.
 * @param props.text - the typed text.
 * @param props.word - the word being typed.
 * @param props.held - how many nodes and edges are selected.
 * @param props.pickedValues - the value rows added with Shift.
 * @param props.offerCount - how many the rule option selects.
 * @param props.listRef - the list.
 * @param props.viewportRef - the list's scrolling viewport.
 * @param props.listId - the list's id.
 * @param props.target - the place of the option Enter picks.
 * @param props.pick - picks a row.
 * @returns the list.
 */
function FindList({
    found,
    session,
    nodeHits,
    edgeHits,
    valueOptions,
    columns,
    ruleOption,
    count,
    text,
    word,
    held,
    pickedValues,
    offerCount,
    listRef,
    viewportRef,
    listId,
    target,
    pick,
}: GroupProps & {
    readonly found: FindResult;
    readonly session: GraphSession | null;
    readonly nodeHits: readonly FindHit[];
    readonly edgeHits: readonly FindHit[];
    readonly valueOptions: readonly Option[];
    readonly columns: readonly ColumnOption[];
    readonly ruleOption: string | null;
    readonly count: number;
    readonly text: string;
    readonly word: string;
    readonly held: number;
    readonly pickedValues: ReadonlySet<string>;
    readonly offerCount: OfferCount | null;
    readonly listRef: React.RefObject<HTMLDivElement | null>;
    readonly viewportRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
    const shared = { listId, target, pick };
    return (
        // The scrollbar is drawn while the list overflows, so more rows below are seen. It
        // scrolls only up and down: a long name ends in "..." rather than widening the list.
        <ScrollArea.Autosize
            type="auto"
            scrollbars="y"
            className="ws-find-list"
            classNames={{ viewport: "ws-find-viewport" }}
            ref={listRef}
            viewportRef={viewportRef}
        >
            <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                id={listId}
                role="listbox"
                aria-label="Find results"
            >
                {[
                    { label: "Nodes", group: nodeHits, first: 0, total: found.totals.node },
                    { label: "Edges", group: edgeHits, first: nodeHits.length, total: found.totals.edge },
                ].map(({ label, group, first, total }) =>
                    group.length === 0 || session === null ? null : (
                        <HitGroup
                            key={label}
                            label={label}
                            group={group}
                            first={first}
                            total={total}
                            session={session}
                            text={text}
                            {...shared}
                        />
                    ),
                )}
                {valueOptions.length > 0 && session !== null ? (
                    <ValuesGroup
                        valueOptions={valueOptions}
                        first={found.records.length}
                        session={session}
                        held={held}
                        pickedValues={pickedValues}
                        {...shared}
                    />
                ) : null}
                {columns.length > 0 ? (
                    <ColumnsGroup
                        columns={columns}
                        first={found.records.length + valueOptions.length}
                        word={word}
                        {...shared}
                    />
                ) : null}
                {ruleOption === null ? null : (
                    <RuleGroup
                        ruleOption={ruleOption}
                        index={count - 1}
                        session={session}
                        offerCount={offerCount}
                        {...shared}
                    />
                )}
            </div>
        </ScrollArea.Autosize>
    );
}

/**
 * The find box and its one live list (tier1-design.md section 2.5 and task T12): results appear
 * as the reader types and focus stays in the box; Down enters the list, Enter picks, Esc clears
 * and then leaves the box. A node pick moves focus to that node's values in the inspector. The selection changes only on a pick. Every match comes from
 * graphty-element's `session.find`; the box only words and arranges it.
 * @returns The find box
 */
export function FindBox(): React.JSX.Element {
    const { session, element, store } = useWorkspace();
    const [text, setText] = useState("");
    const [active, setActive] = useState(-1);
    const [refused, setRefusal] = useState<Refusal | null>(null);
    // The list closes as a list does -- a click or focus anywhere outside the find box -- and
    // opens again on typing, a click in the box or the Down arrow.
    const [listOpen, setListOpen] = useState(true);
    const boxRef = useRef<HTMLDivElement>(null);
    useCloseOnPointerOutside(boxRef, setListOpen);
    // The element's answers below are kept with the text they were asked for: a session change
    // asks again, and the line under the box keeps the last answer until the new one arrives
    // rather than blinking out (and being announced again by its status region) on every change.
    const [ruleAnswer, setRuleAnswer] = useState<RuleAnswer | null>(null);
    const [textAsRuleAnswer, setTextAsRuleAnswer] = useState<TextAsRuleAnswer | null>(null);
    const listId = useId();
    // The value rows added to the selection with Shift while the list stays open, marked as picked.
    const [pickedValues, setPickedValues] = useState<ReadonlySet<string>>(new Set());
    const shiftPicked = useRef(false);
    useClearAfterShiftPicks(listOpen, shiftPicked, setText, setActive, setPickedValues);
    // A change to the data, a run or the selection asks again, so a count or a hit is never stale.
    const version = useSessionVersion(session);

    const found: FindResult | null = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so the memo runs again on each session change
        return findIn(session, text);
    }, [session, text, version]);
    const isRule = found?.notSearchable === "expression";
    const ruleCheck = ruleCheckOf(isRule, ruleAnswer, text);
    const { word, columns } = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so a new column is offered
        return columnsFor(session, text, isRule);
    }, [session, text, isRule, version]);
    // Nodes first, then edges, each under its own heading; the keyboard walks them in that order.
    const nodeHits = found?.records.filter((hit) => hit.kind !== "edge") ?? [];
    const edgeHits = found?.records.filter((hit) => hit.kind === "edge") ?? [];
    const valueOptions = valueOptionsOf(found);
    const foundNothing = isNothingFound(found, valueOptions);
    const textAsRule = textAsRuleOf(foundNothing, textAsRuleAnswer, text);
    const ran = ranFromBox(session, text, isRule, textAsRule);
    // Once a rule ran, from the reader's words or from the element's correction of them, the line
    // says what it selected rather than offering the correction again.
    const refusal = ran ? null : refused;
    const ruleOption = ruleOptionOf(isRule, refusal, textAsRule, ran);
    const options = optionsOf(found, [...nodeHits, ...edgeHits], valueOptions, columns, ruleOption);

    const offerCount = useOfferCount(session, ruleOption, version);
    useRuleCheck(session, text, isRule, version, setRuleAnswer, setRefusal);
    useTextAsRule(session, text, foundNothing, version, setTextAsRuleAnswer);
    const spoken = useSpokenRefusal(session, refusal, isRule, ruleCheck, ran);

    const pick = (option: Option, adding = false): Promise<void> =>
        pickOption(
            {
                session,
                element,
                store,
                text,
                word,
                shiftPicked,
                setText,
                setActive,
                setRefusal,
                setListOpen,
                setPickedValues,
            },
            option,
            adding,
        );

    const runsTyped = runsTypedOf(found, session, isRule, text);
    const target = enterTarget(active, ruleOption, runsTyped, options.length);
    const chosen: Option | undefined = options[target];
    useScrollActiveIntoView(active >= 0 ? optionIdOf(listId, active) : undefined);

    const open = found !== null && listOpen;
    const listRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    useListHeight(listRef, viewportRef);
    const held = session === null ? 0 : session.selection.nodes.length + session.selection.edges.length;
    const keptWords = keptWordsOf(session, held);
    const example = session === null ? null : exampleRule(session);
    const line = findLine({ session, text, ran, isRule, ruleCheck, example, textAsRule, listOpen, keptWords, found });
    const refusalLine = refusalLineOf(refusal, session, example, keptWords);
    const suggestion = typeof refusal?.rule === "string" ? refusal.words : null;
    const { showLine, spokenLine } = lineSpeech({
        session,
        found,
        count: options.length,
        isRule,
        ruleOption,
        refusal,
        line,
        foundNothing,
        textAsRule,
        offerCount,
    });
    useSayInBox(spokenLine, store);

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        findKeyDown(event, {
            session,
            element,
            store,
            text,
            listOpen,
            count: options.length,
            target,
            chosen,
            runsTyped,
            spokenLine,
            setListOpen,
            setActive,
            pick,
            setRefusal,
        });
    };

    return (
        <div // NOSONAR(S6848): blur only closes the list as focus leaves the box; the box is not a control
            className="ws-find"
            ref={boxRef}
            onBlur={closeOnFocusOut(setListOpen)}
        >
            <SearchInput
                id={FIND_BOX_ID}
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(-1);
                    setRefusal(null);
                    setListOpen(true);
                    shiftPicked.current = false;
                    setPickedValues(new Set());
                }}
                onClick={() => {
                    setListOpen(true);
                }}
                onKeyDown={onKeyDown}
                aria-label="Find"
                placeholder="Find nodes, edges, values"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open && options.length > 0}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={chosen === undefined || !open ? undefined : optionIdOf(listId, target)}
                // Mantine ties its error line and the line under the box to it with aria-describedby.
                error={refusalLine}
                errorProps={{ className: "ws-find-refusal" }}
                description={suggestion ?? (showLine ? line.emptyLine : undefined)}
                descriptionProps={{ className: "ws-find-empty" }}
                inputWrapperOrder={["label", "input", "error", "description"]}
                disabled={session === null}
            />
            {found !== null && listOpen && options.length > 0 ? (
                <FindList
                    found={found}
                    session={session}
                    nodeHits={nodeHits}
                    edgeHits={edgeHits}
                    valueOptions={valueOptions}
                    columns={columns}
                    ruleOption={ruleOption}
                    count={options.length}
                    text={text}
                    word={word}
                    held={held}
                    pickedValues={pickedValues}
                    offerCount={offerCount}
                    listRef={listRef}
                    viewportRef={viewportRef}
                    listId={listId}
                    target={target}
                    pick={pick}
                />
            ) : null}
            <VisuallyHidden role="status">{spoken}</VisuallyHidden>
        </div>
    );
}
