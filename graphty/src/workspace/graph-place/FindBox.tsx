import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindHit, FindResult, FindValueRow } from "@graphty/graphty-element";
import { type GraphSession, isGraphtyError } from "@graphty/graphty-element/session";
import { Text } from "@mantine/core";
import React, { useId, useMemo, useState } from "react";

import { GLYPHS } from "../glyphs";
import { focusNodeValuesNext } from "../inspector/reads";
import { edgeName } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { useSessionVersion } from "./useSessionVersion";

/** The find box's id, which `find.focus` ("/") moves focus to. */
export const FIND_BOX_ID = "ws-find";

/** How many element hits the list shows. */
const LIMIT = 20;

/**
 * One line wording why the element refused a typed rule, from the refusal's reason code.
 * @param error - what `selection.apply` threw.
 * @returns the line, or null when the error is not a refused rule.
 */
function ruleRefusalWords(error: unknown): string | null {
    if (!isGraphtyError(error) || error.code !== "E_BAD_SELECTOR") {
        return null;
    }
    const details = (error.details ?? {}) as { reason?: unknown; position?: unknown };
    if (details.reason === "number-needs-backticks") {
        return "Put numbers in backticks: weight > `3`";
    }
    // The element counts from 0 after the "="; the reader counts from 1 including it.
    return typeof details.position === "number"
        ? `Not a rule Find can read (at character ${String(details.position + 2)})`
        : "Not a rule Find can read";
}

/** One pickable entry of the list: an element hit or a value row. */
type Option = { readonly type: "hit"; readonly hit: FindHit } | { readonly type: "value"; readonly row: FindValueRow };

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
        ? edgeName(session, { source: hit.ends.source.name, target: hit.ends.target.name })
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
    const listId = useId();
    // A change to the data, a run or the selection asks again, so a count or a hit is never stale.
    const version = useSessionVersion(session);

    const found: FindResult | null = useMemo(() => {
        const _changeCount = version; // NOSONAR(S1481): reads the change count so the memo runs again on each session change
        return session === null || text.trim() === "" ? null : session.find(text, { limit: LIMIT });
    }, [session, text, version]);
    const options: Option[] = found
        ? [
              ...found.records.map((hit): Option => ({ type: "hit", hit })),
              ...found.values.map((row): Option => ({ type: "value", row })),
          ]
        : [];
    const optionId = (i: number): string => `${listId}-${String(i)}`;

    const pick = async (option: Option): Promise<void> => {
        if (session === null) {
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
        await element?.zoomToSelection();
    };

    const runTyped = async (current: GraphSession, typed: string): Promise<void> => {
        try {
            await current.selection.apply({ text: typed });
            setText("");
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
            if (found?.notSearchable !== undefined && session !== null) {
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
    let emptyLine = `No match for "${text}"`;
    if (found?.notSearchable === "expression") {
        emptyLine = "Rule: press Enter to select matches";
    } else if (found?.notSearchable === "regex") {
        emptyLine = `Press Enter to select "${text}"`;
    }

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
                // Mantine ties its error line to the box with aria-invalid and aria-describedby.
                error={refusal}
                errorProps={{ role: "alert" }}
                disabled={session === null}
            />
            {found !== null && options.length > 0 ? (
                <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                    id={listId}
                    role="listbox"
                    aria-label="Find results"
                    className="ws-find-list"
                >
                    {found.records.length > 0 ? (
                        <div // NOSONAR(S6819): an option group inside a listbox; ARIA allows no native element there
                            role="group"
                            aria-label="Elements"
                        >
                            <Text component="div" className="ws-find-heading" aria-hidden="true">
                                Elements
                            </Text>
                            {found.records.map((hit, i) => {
                                if (session === null) {
                                    return null;
                                }
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
                                            hit.kind === "edge" ? <GLYPHS.edge size={14} /> : <GLYPHS.node size={14} />
                                        }
                                        current={i === active}
                                        onClick={() => {
                                            void pick({ type: "hit", hit });
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ) : null}
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
                </div>
            ) : null}
            {found !== null && options.length === 0 && refusal === null ? (
                <Text role="status" size="xs" c="dimmed" className="ws-find-empty">
                    {emptyLine}
                </Text>
            ) : null}
        </div>
    );
}
