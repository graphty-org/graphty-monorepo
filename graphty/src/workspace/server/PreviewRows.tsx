import { EntityChip } from "@graphty/compact-mantine";
import type { CodedFact, SourcePreview } from "@graphty/graphty-element/session";
import React from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { TYPE_ICONS } from "../table/typeIcons";
import { codeWords } from "./words";

/** At most this many node names in the preview. */
const NAMES = 25;

/**
 * One coded chip: a failure or a warning, as a label.
 * @param props - Component props
 * @param props.fact - the code and its params.
 * @returns the chip.
 */
export function CodeChip({ fact }: Readonly<{ fact: CodedFact }>): React.JSX.Element {
    return (
        <span className="sv-code" data-code={fact.code} data-error={fact.code.startsWith("E_") ? "" : undefined}>
            {codeWords(fact)}
        </span>
    );
}

/**
 * A preview row's name: its label, else its name, else its id.
 * @param row - the node row.
 * @returns the name.
 */
function rowName(row: Readonly<Record<string, unknown>>): string {
    for (const key of ["label", "name", "title", "id"]) {
        const value = row[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value);
        }
    }
    return "?";
}

/**
 * What Test read (spec section 3.9): the node and edge chips, the server's facts, the columns with
 * their type icons, up to 25 node names, and the read's warnings. Nothing loads.
 * @param props - Component props
 * @param props.preview - what `data.previewSource` returned.
 * @returns the rows.
 */
export function PreviewRows({ preview }: Readonly<{ preview: SourcePreview }>): React.JSX.Element {
    const more = preview.more ? "+" : "";
    return (
        <div // NOSONAR(S6819): a <fieldset> brings a border and legend layout the compact row does not use; the role names the group
            className="sv-preview"
            role="group"
            aria-label="Preview"
        >
            <div className="sv-chips">
                <EntityChip kind="node">{`${formatNumber(preview.nodes.length)}${more}`}</EntityChip>
                <EntityChip kind="edge">{formatNumber(preview.edges.length)}</EntityChip>
                {Object.entries(preview.facts).map(([key, value]) => (
                    <span key={key} className="sv-fact" title={`${key}: ${value}`}>
                        {value}
                    </span>
                ))}
                {preview.issues.map((issue, i) => (
                    <CodeChip key={`${issue.code}-${String(i)}`} fact={issue} />
                ))}
            </div>
            {preview.columns.length === 0 ? null : (
                <ul className="sv-columns" aria-label="Columns">
                    {preview.columns.map((column) => {
                        const Icon = TYPE_ICONS[column.type] ?? GLYPHS.mixed;
                        return (
                            <li key={`${column.kind}:${column.name}`} data-kind={column.kind}>
                                <Icon size={12} aria-label={column.type} />
                                {column.plainName}
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="sv-names" aria-label="Preview nodes">
                {preview.nodes.slice(0, NAMES).map((row, i) => (
                    <EntityChip key={`${rowName(row)}-${String(i)}`} kind="node">
                        {rowName(row)}
                    </EntityChip>
                ))}
            </div>
        </div>
    );
}
