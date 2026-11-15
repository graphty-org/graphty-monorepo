import type { JoinChoices, JoinKey, JoinShape } from "@graphty/graphty-element/session";
import { ActionIcon, Checkbox, Select } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { keysFor } from "./commands";

/** The shapes a join can take, as the Match row's first dropdown names them. */
const SHAPES: readonly { readonly value: JoinShape; readonly label: string }[] = [
    { value: "node-values", label: "Node values" },
    { value: "edge-values", label: "Edge values" },
    { value: "edges", label: "Edges" },
];

/**
 * A key pair's label: Source and Target for an edge file, else Match.
 * @param edges - whether the rows are edges.
 * @param at - the pair's place.
 * @returns the label.
 */
function keyLabel(edges: boolean, at: number): string {
    if (!edges) {
        return "Match";
    }
    return at === 0 ? "Source" : "Target";
}

/** One choice of a dropdown. */
interface Option {
    readonly value: string;
    readonly label: string;
}

/** Props for MatchRow. */
interface MatchRowProps {
    /** The join as chosen. */
    choices: JoinChoices;
    /** The incoming table's columns. */
    columns: readonly string[];
    /** The graph values a key can match: `id` and `data.<column>`. */
    graphPaths: readonly Option[];
    /** The joined tables that can map ids, by load; empty hides the mapping dropdown. */
    mappings: readonly Option[];
    /** Takes changed choices. */
    onChange: (choices: JoinChoices) => void;
    /** The matches Ignore case and Ignore spaces would add, from the element's join report. */
    extra: { readonly ignoringCase: number; readonly ignoringSpaces: number };
}

/**
 * An Ignore box's label, with the matches it would add while off.
 * @param words - "Ignore case" or "Ignore spaces".
 * @param extra - the matches it would add.
 * @returns the label.
 */
function ignoreLabel(words: string, extra: number): string {
    return extra > 0 ? `${words} +${extra.toLocaleString("en-US")}` : words;
}

/**
 * The join screen's Match row (spec section 3.6): what the rows are, each key pair as two
 * dropdowns (`symbol = Id`), Ignore case and Ignore spaces (each with the matches it would add), `+`
 * for a compound key, and the mapping
 * table when a joined table could map ids.
 * @param props - Component props
 * @param props.choices - The join as chosen
 * @param props.columns - The incoming columns
 * @param props.graphPaths - The graph values a key can match
 * @param props.mappings - The joined tables that can map ids
 * @param props.onChange - Takes changed choices
 * @param props.extra - The matches Ignore case and Ignore spaces would add
 * @returns The row
 */
export function MatchRow({
    choices,
    columns,
    graphPaths,
    mappings,
    onChange,
    extra,
}: Readonly<MatchRowProps>): React.JSX.Element {
    const shape = choices.shape ?? "node-values";
    const edges = shape === "edges";
    const fileOptions = columns.map((column) => ({ value: column, label: column }));
    const setKey = (at: number, key: Partial<JoinKey>): void => {
        onChange({ ...choices, keys: choices.keys.map((each, i) => (i === at ? { ...each, ...key } : each)) });
    };
    return (
        <div // NOSONAR(S6819): a <fieldset> brings a border and legend layout the compact row does not use; the role names the group
            className="jn-match"
            role="group"
            aria-label="Match"
        >
            <Select
                size="xs"
                className="jn-shape"
                aria-label="Rows are"
                data={SHAPES}
                value={shape}
                allowDeselect={false}
                onChange={(value) => {
                    const next = (value ?? shape) as JoinShape;
                    onChange({ ...choices, shape: next, keys: keysFor(choices, next, columns) });
                }}
            />
            <div className="jn-keys">
                {choices.keys.map((key, at) => {
                    const side = keyLabel(edges, at);
                    const name = edges || at === 0 ? side : `Match ${String(at + 1)}`;
                    return (
                        <div
                            className="jn-key"
                            key={at} // NOSONAR(S6479): one slot per key position; the position is its identity
                        >
                            <span className="jn-key-label">{side}</span>
                            <Select
                                size="xs"
                                aria-label={`${name} column`}
                                data={fileOptions}
                                value={key.file}
                                allowDeselect={false}
                                searchable
                                onChange={(value) => {
                                    setKey(at, { file: value ?? key.file });
                                }}
                            />
                            <span aria-hidden>=</span>
                            <Select
                                size="xs"
                                aria-label={`${name} graph value`}
                                data={graphPaths}
                                value={key.graph}
                                allowDeselect={false}
                                searchable
                                onChange={(value) => {
                                    setKey(at, { graph: value ?? key.graph });
                                }}
                            />
                            {!edges && at > 0 ? (
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={`Remove ${name}`}
                                    onClick={() => {
                                        onChange({ ...choices, keys: choices.keys.filter((_each, i) => i !== at) });
                                    }}
                                >
                                    <GLYPHS.close size={14} aria-hidden />
                                </ActionIcon>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            <Checkbox
                size="xs"
                label={ignoreLabel("Ignore case", extra.ignoringCase)}
                checked={choices.ignoreCase === true}
                onChange={(event) => {
                    onChange({ ...choices, ignoreCase: event.currentTarget.checked });
                }}
            />
            <Checkbox
                size="xs"
                label={ignoreLabel("Ignore spaces", extra.ignoringSpaces)}
                checked={choices.ignoreSpaces === true}
                onChange={(event) => {
                    onChange({ ...choices, ignoreSpaces: event.currentTarget.checked });
                }}
            />
            {edges ? null : (
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Add key pair"
                    onClick={() => {
                        const used = new Set(choices.keys.map((key) => key.file));
                        const file = columns.find((column) => !used.has(column)) ?? columns[0] ?? "";
                        onChange({ ...choices, keys: [...choices.keys, { file, graph: "id" }] });
                    }}
                >
                    <GLYPHS.add size={14} aria-hidden />
                </ActionIcon>
            )}
            {mappings.length === 0 ? null : (
                <Select
                    size="xs"
                    className="jn-mapping"
                    aria-label="Mapping table"
                    placeholder="no mapping"
                    data={mappings}
                    value={choices.via ?? null}
                    clearable
                    onChange={(value) => {
                        const { via: _gone, ...rest } = choices;
                        onChange(value === null ? rest : { ...rest, via: value });
                    }}
                />
            )}
        </div>
    );
}
