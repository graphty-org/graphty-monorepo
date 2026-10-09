import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindHit, FindResult, FindValueRow } from "@graphty/graphty-element";
import { type GraphSession, isGraphtyError, quotePath } from "@graphty/graphty-element/session";
import { ScrollArea, Text, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { focusNodeValuesNext } from "../inspector/reads";
import { edgeJoiner, edgeName, selectionWords } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { useSessionVersion } from "./useSessionVersion";

/** The find box's id, which `find.focus` ("/") moves focus to. */
export const FIND_BOX_ID = "ws-find";

/** How many element hits the list shows. */
const LIMIT = 20;

/**
 * The tallest the list grows before it scrolls; it is cut back to end on a whole row, and it
 * scrolls a row at a time, so its edge never falls inside a row or just under a heading.
 */
const LIST_MAX_PX = 320;

/**
 * An example rule over the open data, for a box that holds only "=": a number column from the
 * file (else any number column), compared with a value inside its range, such as minutes > `5`.
 * @param session - the element's session.
 * @returns the example.
 */
function exampleRule(session: GraphSession): string {
    const numbers = session.data.attributes().filter((a) => a.measurement === "quantitative");
    const column = numbers.find((a) => a.origin === "imported") ?? numbers[0];
    if (column === undefined) {
        return "weight > `3`";
    }
    const middle = column.min === undefined || column.max === undefined ? 3 : (column.min + column.max) / 2;
    return `${columnText(column.path)} > \`${String(Math.round(middle))}\``;
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

/**
 * One line wording why the element refused a typed rule, from the refusal's reason code.
 * @param error - what `selection.apply` threw.
 * @returns the line, or null when the error is not a refused rule.
 */
function ruleRefusalWords(error: unknown): string | null {
    if (!isGraphtyError(error) || error.code !== "E_BAD_SELECTOR") {
        return null;
    }
    const details = (error.details ?? {}) as { position?: unknown };
    // The reader's own rule, rewritten by the element (an example from other numbers gets copied),
    // on a line of its own so the sentence never wraps around it.
    const suggestion = backtickSuggestion(error);
    if (suggestion !== null) {
        return `Put numbers in backticks:\n${suggestion}`;
    }
    // The element counts from 0 after the "="; the reader counts from 1 including it.
    return typeof details.position === "number"
        ? `Not a rule Find can read (at character ${String(details.position + 2)})`
        : "Not a rule Find can read";
}

/** How long typing pauses before the element checks a typed rule. */
const CHECK_DELAY_MS = 200;

/**
 * What the element says of a typed rule, without selecting anything: it counts the rule's
 * matches, which reads the rule exactly as `selection.apply` does.
 * @param session - the element's session.
 * @param typed - the box's text, starting with "=".
 * @returns "ok", "empty" for a lone "=", the refusal's words, or null for any other error.
 */
async function ruleVerdict(session: GraphSession, typed: string): Promise<string | null> {
    if (isEmptyRule(typed)) {
        return "empty";
    }
    try {
        await session.scope.count({ where: typed.slice(1) });
        return "ok";
    } catch (error) {
        // An error that is not a refused rule is left for Enter, which reports it as before.
        return ruleRefusalWords(error);
    }
}

/**
 * The rule plain text that found nothing reads as once "=" is put before it: the text itself when
 * the element accepts it and it matches something, or the element's rewrite when it is refused
 * only for a bare number. A word the element reads as a column that holds nothing, such as a
 * name, is not one.
 * @param session - the element's session.
 * @param typed - the box's text, with no "=".
 * @returns the rule to show after "=", or null when the reader most likely did not type a condition.
 */
async function ruleFromText(session: GraphSession, typed: string): Promise<string | null> {
    try {
        const { nodes, edges } = await session.scope.count({ where: typed });
        return nodes + edges > 0 ? typed : null;
    } catch (error) {
        return backtickSuggestion(error);
    }
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
 * How a rule names a column: a data column by its bare name when that needs no quotes, else
 * the column key quoted by the element.
 * @param path - the column key.
 * @returns the text to insert.
 */
function columnText(path: string): string {
    const quoted = quotePath(path);
    const bare = quoted.slice("data.".length);
    return quoted.startsWith("data.") && !/[."]/.test(bare) ? bare : quoted;
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
    const word = /[A-Za-z_]\w*$/.exec(rule)?.[0] ?? "";
    const before = rule.slice(0, rule.length - word.length);
    const inQuotes = ["`", "'", '"'].some((q) => before.split(q).length % 2 === 0);
    const startsTerm = word !== "" || /(^|&&|\|\||\(|!)\s*$/.test(before);
    if (inQuotes || !startsTerm) {
        return { word, columns: [] };
    }
    const byText = new Map<string, { name: string; insert: string; kinds: Set<"node" | "edge"> }>();
    for (const attribute of session.data.attributes()) {
        const insert = columnText(attribute.path);
        if (insert === word || !attribute.name.toLowerCase().includes(word.toLowerCase())) {
            continue;
        }
        const entry = byText.get(insert) ?? { name: attribute.name, insert, kinds: new Set() };
        entry.kinds.add(attribute.kind);
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

/** One pickable entry of the list: an element hit, a value row or a column for a rule. */
type Option =
    | { readonly type: "hit"; readonly hit: FindHit }
    | { readonly type: "value"; readonly row: FindValueRow }
    | { readonly type: "column"; readonly column: ColumnOption };

/**
 * An attribute's name as the reader knows it, from its literal column key.
 * @param session - the element's session.
 * @param path - the column key, such as `"data.name"`, or `"id"`.
 * @returns its plain name, else the key.
 */
function attributeName(session: GraphSession, path: string): string {
    if (path === "id") {
        return "id";
    }
    return session.data.attributes().find((a) => a.path === path)?.plainName ?? path;
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
    const [refusal, setRefusal] = useState<string | null>(null);
    // What the element said of the typed rule: "ok", "empty", or null while unchecked.
    const [ruleCheck, setRuleCheck] = useState<"ok" | "empty" | null>(null);
    // The rule plain text that found nothing reads as once "=" leads it, or null.
    const [textAsRule, setTextAsRule] = useState<string | null>(null);
    const listId = useId();
    // A change to the data, a run or the selection asks again, so a count or a hit is never stale.
    const version = useSessionVersion(session);

    const found: FindResult | null = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so the memo runs again on each session change
        return session === null || text.trim() === ""
            ? null
            : session.find(text, { limit: LIMIT, edgeNameJoiner: edgeJoiner(session) });
    }, [session, text, version]);
    const isRule = found?.notSearchable === "expression";
    const { word, columns } = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so a new column is offered
        return session !== null && isRule ? columnOptions(session, text) : { word: "", columns: [] };
    }, [session, text, isRule, version]);
    // Nodes first, then edges, each under its own heading; the keyboard walks them in that order.
    const nodeHits = found?.records.filter((hit) => hit.kind !== "edge") ?? [];
    const edgeHits = found?.records.filter((hit) => hit.kind === "edge") ?? [];
    const hits = [...nodeHits, ...edgeHits];
    const options: Option[] = found
        ? [
              ...hits.map((hit): Option => ({ type: "hit", hit })),
              ...found.values.map((row): Option => ({ type: "value", row })),
              ...columns.map((column): Option => ({ type: "column", column })),
          ]
        : [];

    // A typed rule is checked once typing pauses, so a refusal shows before Enter.
    useEffect(() => {
        setRuleCheck(null);
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
                    setRuleCheck(verdict);
                    setRefusal(null);
                } else {
                    setRefusal(verdict);
                }
            });
        }, CHECK_DELAY_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [session, text, isRule, version]);
    // Plain text that finds nothing is asked of the element as a rule once typing pauses.
    const foundNothing =
        found !== null && found.notSearchable === undefined && found.records.length === 0 && found.values.length === 0;
    useEffect(() => {
        setTextAsRule(null);
        if (session === null || !foundNothing) {
            return undefined;
        }
        let current = true;
        const timer = setTimeout(() => {
            void ruleFromText(session, text).then((rule) => {
                if (current) {
                    setTextAsRule(rule);
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
        if (refusal !== null) {
            setSpoken(refusal);
        }
    }, [refusal]);
    useEffect(() => {
        if (!isRule || ruleCheck !== null) {
            setSpoken("");
        }
    }, [isRule, ruleCheck]);
    const optionId = (i: number): string => `${listId}-${String(i)}`;

    const pick = async (option: Option): Promise<void> => {
        if (session === null) {
            return;
        }
        if (option.type === "column") {
            // The column replaces the word being typed; the box keeps focus for the rest of the rule.
            setText(text.slice(0, text.length - word.length) + option.column.insert);
            setActive(-1);
            return;
        }
        setText("");
        setActive(-1);
        if (option.type === "value") {
            await session.selection.apply(option.row.target);
            return;
        }
        const { hit } = option;
        if (hit.kind !== "edge") {
            // The keyboard follows the pick into the node's values, out of the box (task T12).
            focusNodeValuesNext();
        }
        await session.selection.apply(hit.target);
        // The inspector shows what is selected once no row is open.
        store.set({ inspected: null });
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
            await current.selection.apply({ text: typed });
        } catch (error) {
            const words = ruleRefusalWords(error);
            if (words === null) {
                throw error;
            }
            setRefusal(words);
        }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "ArrowDown" && options.length > 0) {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
        } else if (event.key === "ArrowUp" && options.length > 0) {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            const chosen = active >= 0 ? options[active] : undefined;
            if (chosen !== undefined) {
                void pick(chosen);
            } else if (found?.notSearchable !== undefined && session !== null && !(isRule && isEmptyRule(text))) {
                // A regex or expression is not run while typing; Enter runs it as a selection.
                void runTyped(session, text);
            } else {
                const option = options[Math.max(active, 0)];
                if (option !== undefined) {
                    void pick(option);
                }
            }
        } else if (event.key === "Escape" && text === "") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
        }
    };

    const open = found !== null;
    // The list ends on a whole row: past the cap, its height is cut back to the bottom of the last
    // option row that fits, headings counted in, so it never ends on a heading. Scrolling then
    // stops only where a row's bottom meets the edge (scroll-snap in graph-place.css).
    const listRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const { current: list } = listRef;
        const { current: viewport } = viewportRef;
        if (list === null || viewport === null) {
            return;
        }
        list.style.maxHeight = "";
        if (viewport.scrollHeight <= LIST_MAX_PX) {
            return;
        }
        const { top } = viewport.getBoundingClientRect();
        const fits = [...viewport.querySelectorAll<HTMLElement>("[role=option]")]
            .map((row) => row.getBoundingClientRect().bottom - top + viewport.scrollTop)
            .filter((bottom) => bottom <= LIST_MAX_PX);
        // The max height counts the bottom border too (border-box).
        list.style.maxHeight = `${String(Math.max(...fits, 0) + list.offsetHeight - list.clientHeight)}px`;
    });
    // A rule run with Enter is the selection's origin until anything else changes the selection.
    const origin = session?.selection.origin;
    const ran = isRule && origin !== null && origin !== undefined && "text" in origin && origin.text === text;
    let emptyLine: React.ReactNode = `No match for "${text}"`;
    if (ran && session !== null) {
        const { nodes, edges } = session.selection;
        emptyLine =
            nodes.length + edges.length === 0
                ? "Nothing matches this rule"
                : selectionWords(nodes.length, edges.length);
    } else if (isRule) {
        // The press-Enter hint is only for a rule the element accepts.
        const ruleLines = {
            ok: "Rule: press Enter to select matches",
            // The example rule never breaks: the sentence wraps before it.
            empty:
                session === null ? (
                    ""
                ) : (
                    <>
                        Type a rule, such as <span className="ws-nowrap">{exampleRule(session)}</span>
                    </>
                ),
        } as const;
        emptyLine = ruleCheck === null ? null : ruleLines[ruleCheck];
    } else if (textAsRule !== null) {
        // The example gets its own line, so the sentence never wraps around it.
        emptyLine = (
            <>
                Start with = to select by a value: <span className="ws-find-example ws-mono">={textAsRule}</span>
            </>
        );
    } else if (found?.notSearchable === "regex") {
        emptyLine = `Press Enter to select "${text}"`;
    }

    const showLine = found !== null && (options.length === 0 || isRule) && refusal === null && emptyLine !== null;

    return (
        <div className="ws-find">
            <SearchInput
                id={FIND_BOX_ID}
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(-1);
                    setRefusal(null);
                }}
                onKeyDown={onKeyDown}
                aria-label="Find"
                placeholder="Find nodes, edges, values"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open && options.length > 0}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                // Mantine ties its error line and the line under the box to it with aria-describedby.
                error={refusal}
                errorProps={{ className: "ws-find-refusal" }}
                description={showLine ? emptyLine : undefined}
                descriptionProps={{ role: "status", className: "ws-find-empty" }}
                inputWrapperOrder={["label", "input", "error", "description"]}
                disabled={session === null}
            />
            {found !== null && options.length > 0 ? (
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
                                                : `${attributeName(session, hit.match.path)}: ${String(hit.match.value)}`;
                                        return (
                                            <ResultRow
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
                                                current={i === active}
                                                onClick={() => {
                                                    void pick({ type: "hit", hit });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ),
                        )}
                        {found.values.length > 0 && session !== null ? (
                            <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
                                role="group"
                                aria-label="Values"
                            >
                                <Text component="div" className="ws-find-heading" aria-hidden="true">
                                    Values
                                </Text>
                                {found.values.map((row, j) => {
                                    const i = found.records.length + j;
                                    return (
                                        <ResultRow
                                            key={optionId(i)}
                                            id={optionId(i)}
                                            name={`Select where ${attributeName(session, row.path)} is ${String(row.value)} (${String(row.count)})`}
                                            icon={<GLYPHS.filter size={14} />}
                                            current={i === active}
                                            onClick={() => {
                                                void pick({ type: "value", row });
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
                                    const i = found.records.length + found.values.length + j;
                                    return (
                                        <ResultRow
                                            key={optionId(i)}
                                            id={optionId(i)}
                                            name={column.name}
                                            match={word}
                                            path={kindWords(column.kinds)}
                                            icon={<GLYPHS.attribute size={14} />}
                                            current={i === active}
                                            onClick={() => {
                                                void pick({ type: "column", column });
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </ScrollArea.Autosize>
            ) : null}
            <VisuallyHidden role="status">{spoken}</VisuallyHidden>
        </div>
    );
}
