import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindHit, FindResult, FindValueRow } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Text } from "@mantine/core";
import { CircleDot, ListFilter, Minus } from "lucide-react";
import React, { useId, useMemo, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

/** The find box's id, which `find.focus` ("/") moves focus to. */
export const FIND_BOX_ID = "ws-find";

/** How many element hits the list shows. */
const LIMIT = 20;

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
 * A hit's name: a node's name, or an edge's two ends.
 * @param hit - the hit.
 * @returns the name.
 */
function hitName(hit: FindHit): string {
    return hit.kind === "edge" ? `${hit.ends.source.name} -- ${hit.ends.target.name}` : hit.name;
}

/**
 * The find box and its one live list (tier1-design.md section 2.5 and task T12): results appear
 * as the reader types and focus stays in the box; Down enters the list, Enter picks, Esc clears
 * and then leaves the box. The selection changes only on a pick. Every match comes from
 * graphty-element's `session.find`; the box only words and arranges it.
 * @returns The find box
 */
export function FindBox(): React.JSX.Element {
    const { session, element, store } = useWorkspace();
    const [text, setText] = useState("");
    const [active, setActive] = useState(-1);
    const listId = useId();

    const found: FindResult | null = useMemo(
        () => (session === null || text.trim() === "" ? null : session.find(text, { limit: LIMIT })),
        // The revision is read inside find; a new text is what asks again.
        [session, text],
    );
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
        await session.selection.apply(hit.target);
        store.set({ inspected: { kind: hit.kind, id: String(hit.id) } });
        await element?.zoomToSelection();
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
                void session.selection.apply({ text });
                setText("");
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

    return (
        <div className="ws-find">
            <SearchInput
                id={FIND_BOX_ID}
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(-1);
                }}
                onKeyDown={onKeyDown}
                aria-label="Find"
                placeholder="Find nodes, edges, values"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open && options.length > 0}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                disabled={session === null}
            />
            {found !== null && options.length > 0 ? (
                <div id={listId} role="listbox" aria-label="Find results" className="ws-find-list">
                    {found.records.length > 0 ? (
                        <div role="group" aria-label="Elements">
                            <Text component="div" className="ws-find-heading" aria-hidden="true">
                                Elements
                            </Text>
                            {found.records.map((hit, i) => {
                                const name = hitName(hit);
                                const where =
                                    String(hit.match.value) === name || session === null
                                        ? undefined
                                        : `${attributeName(session, hit.match.path)}: ${String(hit.match.value)}`;
                                return (
                                    <ResultRow
                                        key={optionId(i)}
                                        id={optionId(i)}
                                        name={name}
                                        match={text}
                                        path={where}
                                        icon={hit.kind === "edge" ? <Minus size={14} /> : <CircleDot size={14} />}
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
                        <div role="group" aria-label="Values">
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
                                        icon={<ListFilter size={14} />}
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
            {found !== null && options.length === 0 ? (
                <Text role="status" size="xs" c="dimmed" className="ws-find-empty">
                    {found.notSearchable === undefined ? `No match for "${text}"` : `Press Enter to select "${text}"`}
                </Text>
            ) : null}
        </div>
    );
}
