import { EntityChip, ScrollArea } from "@graphty/compact-mantine";
import type { CodedFact, SourcePreview } from "@graphty/graphty-element/session";
import { Badge, Divider, Group, Stack, Text } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { TYPE_ICONS } from "../table/typeIcons";
import { codeWords } from "./words";

/** At most this many node names in the preview. */
const NAMES = 25;

/**
 * One coded fact: a failure in the danger ink, as the app's other inline errors are; a warning as
 * an outlined badge.
 * @param props - Component props
 * @param props.fact - the code and its params.
 * @returns the fact.
 */
export function CodeChip({ fact }: Readonly<{ fact: CodedFact }>): React.JSX.Element {
    if (fact.code.startsWith("E_")) {
        return (
            <Text span size="xs" c="var(--cm-text-danger)" data-code={fact.code} data-error="" truncate>
                {codeWords(fact)}
            </Text>
        );
    }
    return (
        <Badge size="sm" variant="outline" data-code={fact.code} maw="100%">
            {codeWords(fact)}
        </Badge>
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
        <>
            <Divider />
            <ScrollArea.Autosize mah={280}>
                <Stack
                    // NOSONAR(S6819): a <fieldset> brings a border and legend layout the compact row does not use; the role names the group
                    role="group"
                    aria-label="Preview"
                    gap={6}
                >
                    <Group gap={4}>
                        <EntityChip kind="node">{`${formatNumber(preview.nodes.length)}${more}`}</EntityChip>
                        <EntityChip kind="edge">{formatNumber(preview.edges.length)}</EntityChip>
                        {preview.serverFacts.map(({ code, params }) => (
                            <Badge
                                key={code}
                                size="sm"
                                variant="outline"
                                title={`${code.replace(/^source\./, "")}: ${String(params.value)}`}
                            >
                                {String(params.value)}
                            </Badge>
                        ))}
                        {preview.issues.map((issue, i) => (
                            <CodeChip key={`${issue.code}-${String(i)}`} fact={issue} />
                        ))}
                    </Group>
                    {preview.columns.length === 0 ? null : (
                        <Group gap={4} role="list" aria-label="Columns">
                            {preview.columns.map((column) => {
                                const Icon = TYPE_ICONS[column.type] ?? GLYPHS.mixed;
                                return (
                                    <Badge
                                        key={`${column.kind}:${column.name}`}
                                        role="listitem"
                                        size="sm"
                                        variant="outline"
                                        data-kind={column.kind}
                                        leftSection={<Icon size={12} aria-label={column.type} />}
                                    >
                                        {column.plainName}
                                    </Badge>
                                );
                            })}
                        </Group>
                    )}
                    <Group gap={4} aria-label="Preview nodes">
                        {preview.nodes.slice(0, NAMES).map((row, i) => (
                            <EntityChip key={`${rowName(row)}-${String(i)}`} kind="node">
                                {rowName(row)}
                            </EntityChip>
                        ))}
                    </Group>
                </Stack>
            </ScrollArea.Autosize>
        </>
    );
}
