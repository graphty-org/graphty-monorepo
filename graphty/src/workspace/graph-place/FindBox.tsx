import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindHit, FindResult, FindValueRow } from "@graphty/graphty-element";
import { type GraphSession, isGraphtyError, type RuleCheck, rulePath } from "@graphty/graphty-element/session";
import { ScrollArea, Text, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { focusInspectorTitle } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { focusValuesNext, takeValuesFocus } from "../inspector/reads";
import { edgeJoiner, edgeName, selectionWords, sizeWords, valueWord, yesNoWord } from "../inspector/words";
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
 * such as minutes > 25, else a text column equal to one of its values, such as name == 'Ava' (the
 * rule language has no "contains"), never the ids. A file with neither gets no example: one over a
 * column the reader never gave would teach a name they cannot know.
 * @param session - the element's session.
 * @returns the example, or null.
 */
function exampleRule(session: GraphSession): string | null {
    const columns = session.data
        .attributes()
        .filter((a) => a.kind === "node" && (a.origin === "imported" || a.origin === "joined"));
    const number = columns.find((a) => a.measurement === "quantitative" && a.min !== undefined && a.max !== undefined);
    if (number?.min !== undefined && number.max !== undefined) {
        return `${rulePath(number.path)} > ${String(middleOf(number.min, number.max))}`;
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
 * names it does not know, and its rewrite to the column each one names, when there is one.
 * @param check - what `selection.checkRule` said.
 * @returns the refusal, or null when every column is known.
 */
function unknownRefusal(check: RuleCheck): Refusal | null {
    if (check.unknown.length === 0) {
        return null;
    }
    // A bare name and its `data.` path are one column to the reader.
    const names = check.unknown.map(({ path }) => `"${path.replace(/^data\./, "")}"`).join(", ");
    const words = `No ${check.unknown.length === 1 ? "column" : "columns"} named ${names}`;
    return check.suggestion === undefined
        ? { words, rule: null }
        : { words: `${words}. Did you mean:`, rule: `=${check.suggestion}` };
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
        return unknownRefusal(session.selection.checkRule(rule)) ?? "ok";
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
    const [refusal, setRefusal] = useState<Refusal | null>(null);
    // The list closes as a list does -- a click or focus anywhere outside the find box -- and
    // opens again on typing, a click in the box or the Down arrow.
    const [listOpen, setListOpen] = useState(true);
    const boxRef = useRef<HTMLDivElement>(null);
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
    }, []);
    // The element's answers below are kept with the text they were asked for: a session change
    // asks again, and the line under the box keeps the last answer until the new one arrives
    // rather than blinking out (and being announced again by its status region) on every change.
    // What the element said of the typed rule: "ok", "empty", or null while unchecked.
    const [ruleAnswer, setRuleAnswer] = useState<{ text: string; verdict: "ok" | "empty" | null } | null>(null);
    // The rule plain text that found nothing reads as once "=" leads it, null when it reads as
    // none, or undefined until the element has answered.
    const [textAsRuleAnswer, setTextAsRuleAnswer] = useState<{ text: string; rule: string | null } | null>(null);
    const listId = useId();
    // A change to the data, a run or the selection asks again, so a count or a hit is never stale.
    const version = useSessionVersion(session);

    const found: FindResult | null = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so the memo runs again on each session change
        return session === null || text.trim() === ""
            ? null
            : session.find(text, { limit: LIMIT, edgeNameJoiner: edgeJoiner(session), booleanWords: BOOLEAN_WORDS });
    }, [session, text, version]);
    const isRule = found?.notSearchable === "expression";
    const ruleCheck = isRule && ruleAnswer?.text === text ? ruleAnswer.verdict : null;
    const { word, columns } = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so a new column is offered
        return session !== null && isRule ? columnOptions(session, text) : { word: "", columns: [] };
    }, [session, text, isRule, version]);
    // Nodes first, then edges, each under its own heading; the keyboard walks them in that order.
    const nodeHits = found?.records.filter((hit) => hit.kind !== "edge") ?? [];
    const edgeHits = found?.records.filter((hit) => hit.kind === "edge") ?? [];
    const hits = [...nodeHits, ...edgeHits];
    // Each value row, then its "or more" row when the element offers one; then the element's
    // "or more" rows for a typed number no value equals.
    const valueOptions = [
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
    // Plain text that finds nothing is asked of the element as a rule once typing pauses.
    const foundNothing =
        found !== null && found.notSearchable === undefined && found.records.length === 0 && valueOptions.length === 0;
    const textAsRule = foundNothing && textAsRuleAnswer?.text === text ? textAsRuleAnswer.rule : undefined;
    // A rule run with Enter is the selection's origin until anything else changes the selection,
    // typed with its "=" or as plain text that reads as a rule.
    const origin = session?.selection.origin;
    const originText = origin !== null && origin !== undefined && "text" in origin ? origin.text : undefined;
    let ran = false;
    if (session !== null && originText !== undefined) {
        ran = isRule
            ? originText === text || originText === `=${elementRule(session, text.slice(1))}`
            : typeof textAsRule === "string" && originText === `=${elementRule(session, textAsRule)}`;
    }
    // A rule shown under the box, the element's rewrite of a refused rule or the plain text as a
    // rule not yet run, is an option too: the last, and the one Enter picks.
    let ruleOption: string | null = null;
    if (isRule) {
        ruleOption = refusal?.rule ?? null;
    } else if (typeof textAsRule === "string" && !ran) {
        ruleOption = `=${textAsRule}`;
    }
    const options: Option[] = found
        ? [
              ...hits.map((hit): Option => ({ type: "hit", hit })),
              ...valueOptions,
              ...columns.map((column): Option => ({ type: "column", column })),
              ...(ruleOption === null ? [] : [{ type: "rule", rule: ruleOption } as const]),
          ]
        : [];

    // How many the rule option selects, asked of the element as Enter would select it.
    const [offerCount, setOfferCount] = useState<{ rule: string; nodes: number; edges: number } | null>(null);
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
    // A typed rule is checked once typing pauses, so a refusal shows before Enter.
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
    }, [session, text, isRule, version]);
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
    }, [session, text, foundNothing, version]);
    // The refusal is spoken from a region that stays mounted and keeps its words while the reader
    // types, so a refusal is said once, politely, not again on every keystroke; it empties only
    // once the box holds no rule or a rule Find can read.
    const [spoken, setSpoken] = useState("");
    useEffect(() => {
        if (refusal === null || session === null) {
            return;
        }
        const example = refusal.example ? exampleRule(session) : null;
        if (refusal.rule !== null) {
            setSpoken(`${refusal.words} ${plainRule(refusal.rule.slice(1))}`);
        } else {
            setSpoken(example === null ? refusal.words : `${refusal.words}. A rule reads like ${example}`);
        }
    }, [refusal, session]);
    useEffect(() => {
        if (!isRule || ruleCheck !== null) {
            setSpoken("");
        }
    }, [isRule, ruleCheck]);
    const optionId = (i: number): string => `${listId}-${String(i)}`;

    const pick = async (option: Option, adding = false): Promise<void> => {
        if (session === null) {
            return;
        }
        if (adding && (option.type === "value" || option.type === "hit")) {
            // Shift adds the pick to the selection and keeps the list, for the next pick.
            await session.selection.apply(option.type === "hit" ? option.hit.target : valueTarget(option), "add");
            setListOpen(true);
            return;
        }
        if (option.type === "column") {
            // The column replaces the word being typed; the box keeps focus for the rest of the rule.
            setText(text.slice(0, text.length - word.length) + option.column.insert);
            setActive(-1);
            return;
        }
        if (option.type === "rule") {
            // The box keeps the reader's own words, and runs, as if run with Enter. A typed rule the
            // element corrected (a column renamed) shows the correction, as the reader would type it.
            if (text.startsWith("=")) {
                setText(`=${plainRule(option.rule.slice(1))}`);
            }
            setActive(-1);
            setRefusal(null);
            await runTyped(session, option.rule);
            return;
        }
        setText("");
        setActive(-1);
        if (option.type === "value") {
            await session.selection.apply(valueTarget(option));
            return;
        }
        const { hit } = option;
        // The keyboard follows the pick into the node's or the edge's values, out of the box (task T12).
        focusValuesNext();
        await session.selection.apply(hit.target);
        // The inspector shows what is selected once no row is open.
        store.set({ inspected: null });
        // On the Style tab no values view takes the request: the title does, so Enter leaves the
        // box the same way whichever tab is open and however focus reached the box.
        requestAnimationFrame(() => {
            if (takeValuesFocus()) {
                focusInspectorTitle();
            }
        });
        // The camera turns only to bring a pick that is off screen into view: turning to every pick
        // swings the rest of the drawing out of the canvas, and it stays out.
        const ids = hit.kind === "edge" ? [hit.ends.source.id, hit.ends.target.id] : [hit.id];
        if (!ids.every((id) => element?.nodeScreenPosition(id)?.visible === true)) {
            await element?.zoomToSelection();
        }
    };

    const runTyped = async (current: GraphSession, typed: string): Promise<void> => {
        // The rule stays in the box with the caret at its end, so it can be changed; the line under
        // the box then says what it selected.
        try {
            // A rule over a column the graph does not have would select nothing, which reads like
            // an answer; it is refused instead.
            const rule = typed.startsWith("=") ? `=${elementRule(current, typed.slice(1))}` : typed;
            const unknown = rule.startsWith("=") ? unknownRefusal(current.selection.checkRule(rule.slice(1))) : null;
            if (unknown !== null) {
                setRefusal(unknown);
                return;
            }
            await current.selection.apply({ text: rule });
        } catch (error) {
            const refused = ruleRefusal(error);
            if (refused === null) {
                throw error;
            }
            setRefusal(refused);
        }
    };

    // A regex or expression is not run while typing; Enter runs it as a selection unless an
    // option was chosen with the arrows.
    const runsTyped = found?.notSearchable !== undefined && session !== null && !(isRule && isEmptyRule(text));
    // The option Enter picks: the first until the arrows move it, and marked as such; none while
    // Enter would run the typed rule or pattern instead.
    let target = 0;
    if (active >= 0) {
        target = active;
    } else if (ruleOption !== null) {
        target = options.length - 1;
    } else if (runsTyped) {
        target = -1;
    }
    const chosen: Option | undefined = options[target];
    // Focus stays in the text box, so the browser never scrolls the list to the arrows' row: the
    // row is brought into view here, by the least scroll that shows it whole, with its group's
    // heading when it is the group's first row.
    const activeId = active >= 0 ? optionId(active) : undefined;
    useLayoutEffect(() => {
        const row = activeId === undefined ? null : document.getElementById(activeId);
        const heading = row?.previousElementSibling;
        if (heading?.classList.contains("ws-find-heading") === true) {
            heading.scrollIntoView({ block: "nearest" });
        }
        row?.scrollIntoView({ block: "nearest" });
    }, [activeId]);

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (!listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp") && options.length > 0) {
            // A closed list opens on the arrows first, as a list box does.
            event.preventDefault();
            setListOpen(true);
        } else if (event.key === "ArrowDown" && options.length > 0) {
            event.preventDefault();
            setActive(Math.min(target + 1, options.length - 1));
        } else if (event.key === "ArrowUp" && options.length > 0) {
            event.preventDefault();
            setActive(Math.max(target - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (chosen !== undefined) {
                void pick(chosen);
            } else if (runsTyped) {
                void runTyped(session, text);
            }
        } else if (event.key === "Escape" && text === "") {
            // An empty box has nothing left to clear: Escape leaves it for the drawing and keeps
            // the selection, which Escape on the drawing clears.
            event.preventDefault();
            event.stopPropagation();
            element?.focus();
        }
    };

    const open = found !== null && listOpen;
    // The list takes the room the panel has below it, less what stays of the tree and the panel's
    // foot. Past that room it ends on a whole row: its height is cut back to the bottom of the last
    // option row that fits, headings counted in, so it never ends on a heading. Scrolling then
    // stops only where a row's bottom meets the edge, or at the top (scroll-snap in graph-place.css).
    const listRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
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
    // What stays selected while a find misses or is refused, said so the drawing is not misread.
    const held = session === null ? 0 : session.selection.nodes.length + session.selection.edges.length;
    const keptWords =
        session === null || held === 0
            ? ""
            : `. Still selected: ${sizeWords(session.selection.nodes.length, session.selection.edges.length)}`;
    // The example is drawn on a line of its own, so what stays selected is said before it.
    let emptyLine: React.ReactNode = `No match for "${text}"`;
    // The line's words as a screen reader hears them: the status line speaks them, since the
    // line arrives with its words.
    let lineWords: string | null = `No match for "${text}"`;
    const example = session === null ? null : exampleRule(session);
    if (ran && session !== null) {
        const { nodes, edges } = session.selection;
        lineWords =
            nodes.length + edges.length === 0
                ? "Nothing matches this rule"
                : selectionWords(nodes.length, edges.length);
        emptyLine = lineWords;
    } else if (isRule) {
        // The press-Enter hint is only for a rule the element accepts.
        const ruleLines = {
            ok: "Rule: press Enter to select matches",
            // The example rule never breaks: the sentence wraps before it.
            empty:
                example === null ? (
                    "Type a rule"
                ) : (
                    <>
                        Type a rule, such as <span className="ws-nowrap ws-mono">{example}</span>
                    </>
                ),
        } as const;
        emptyLine = ruleCheck === null ? null : ruleLines[ruleCheck];
        if (ruleCheck === null) {
            lineWords = null;
        } else if (ruleCheck === "ok") {
            lineWords = ruleLines.ok;
        } else {
            lineWords = example === null ? "Type a rule" : `Type a rule, such as ${example}`;
        }
    } else if (typeof textAsRule === "string") {
        // The rule itself is the option under this line.
        lineWords = "Select by a value:";
        emptyLine = lineWords;
    } else if (textAsRule === null && example !== null) {
        // Text that reads as no rule gets an example of one, on a line of its own.
        emptyLine = (
            <>
                <span>{emptyLine}</span>
                {keptWords}. To select by a value, type a rule such as{" "}
                <span className="ws-find-example ws-mono">{example}</span>
            </>
        );
        lineWords = `${lineWords}${keptWords}. To select by a value, type a rule such as ${example}`;
    } else if (textAsRule === null) {
        lineWords = `${lineWords}${keptWords}`;
        emptyLine = lineWords;
    } else if (found?.notSearchable === "regex") {
        lineWords = `Press Enter to select "${text}"`;
        emptyLine = lineWords;
    }

    // A refusal keeps the earlier selection; one the element cannot read at all shows a rule that
    // works. A refusal that offers a correction is a suggestion, drawn as the hint is, not an error.
    let refusalLine: React.ReactNode = null;
    if (refusal !== null && session !== null && refusal.rule === null) {
        refusalLine =
            refusal.example && example !== null ? (
                <>
                    {refusal.words}
                    {keptWords}. A rule reads like <span className="ws-find-example ws-mono">{example}</span>
                </>
            ) : (
                `${refusal.words}${keptWords}`
            );
    }
    const suggestion = refusal?.rule === null || refusal === null ? null : refusal.words;
    const showLine =
        found !== null &&
        (options.length === 0 || isRule || ruleOption !== null) &&
        refusal === null &&
        emptyLine !== null;
    const spokenLine = showLine ? lineWords : null;
    useEffect(() => {
        // Said to the reader in the box; a line that changes because something else changed (a
        // selection cleared by Esc elsewhere) does not talk over that change's own message.
        if (spokenLine !== null && spokenLine !== "" && document.activeElement?.id === FIND_BOX_ID) {
            store.set({ announcement: spokenLine });
        }
    }, [spokenLine, store]);

    return (
        <div
            className="ws-find"
            ref={boxRef}
            onBlur={(event) => {
                // Focus moving on to another control closes the list; focus leaving the window does not.
                const next = event.relatedTarget;
                if (next instanceof Node && !event.currentTarget.contains(next)) {
                    setListOpen(false);
                }
            }}
        >
            <SearchInput
                id={FIND_BOX_ID}
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(-1);
                    setRefusal(null);
                    setListOpen(true);
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
                aria-activedescendant={chosen === undefined || !open ? undefined : optionId(target)}
                // Mantine ties its error line and the line under the box to it with aria-describedby.
                error={refusalLine}
                errorProps={{ className: "ws-find-refusal" }}
                description={suggestion ?? (showLine ? emptyLine : undefined)}
                descriptionProps={{ className: "ws-find-empty" }}
                inputWrapperOrder={["label", "input", "error", "description"]}
                disabled={session === null}
            />
            {found !== null && listOpen && options.length > 0 ? (
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
                                <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
                                    key={label}
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
                                        return (
                                            <ResultRow
                                                lines={2}
                                                key={optionId(i)}
                                                id={optionId(i)}
                                                name={name}
                                                match={text}
                                                path={where}
                                                icon={
                                                    hit.kind === "edge" ? (
                                                        <GLYPHS.edge size={14} />
                                                    ) : (
                                                        <GLYPHS.node size={14} />
                                                    )
                                                }
                                                current={i === target}
                                                onClick={(event) => {
                                                    void pick({ type: "hit", hit }, event.shiftKey);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ),
                        )}
                        {valueOptions.length > 0 && session !== null ? (
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
                                    const i = found.records.length + j;
                                    const { row } = option;
                                    const count = option.orMore === true ? row.atLeast?.count : row.count;
                                    const words = `${attributeName(session, row.path)} is ${valueWord(row.value)}${option.orMore === true ? " or more" : ""} (${String(count)})`;
                                    return (
                                        <ResultRow
                                            lines={2}
                                            key={optionId(i)}
                                            id={optionId(i)}
                                            name={words}
                                            aria-label={`Select where ${words}`}
                                            icon={<GLYPHS.filter size={14} />}
                                            current={i === target}
                                            onClick={(event) => {
                                                void pick(option, event.shiftKey);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}
                        {columns.length > 0 ? (
                            <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
                                role="group"
                                aria-label="Columns"
                            >
                                <Text component="div" className="ws-find-heading" aria-hidden="true">
                                    Columns
                                </Text>
                                {columns.map((column, j) => {
                                    const i = found.records.length + valueOptions.length + j;
                                    return (
                                        <ResultRow
                                            lines={2}
                                            key={optionId(i)}
                                            id={optionId(i)}
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
                        ) : null}
                        {ruleOption === null ? null : (
                            <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
                                role="group"
                                aria-label="Rule"
                                className="ws-find-rule"
                            >
                                <ResultRow
                                    lines={2}
                                    id={optionId(options.length - 1)}
                                    name={plainRule(ruleOption.slice(1))}
                                    path={
                                        offerCount?.rule === ruleOption && session !== null
                                            ? offerWords(session, ruleOption.slice(1), offerCount)
                                            : "Select its matches"
                                    }
                                    icon={<GLYPHS.filter size={14} />}
                                    current={options.length - 1 === target}
                                    onClick={() => {
                                        void pick({ type: "rule", rule: ruleOption });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </ScrollArea.Autosize>
            ) : null}
            <VisuallyHidden role="status">{spoken}</VisuallyHidden>
        </div>
    );
}
