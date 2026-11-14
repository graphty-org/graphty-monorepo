import { DataTable, type DataTableColumn } from "@graphty/compact-mantine";
import type { JoinElementFate, JoinPreviewRow, JoinRowFate } from "@graphty/graphty-element/session";
import { Button, Group, SegmentedControl, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import React, { useEffect, useMemo, useState } from "react";

import { formatNumber } from "../inspector/words";
import { fateWord as rowFateWord, inputName } from "./cards/outcomes";
import { shownStep, useJoinWorkspace } from "./context";
import { ELEMENT_FATE_WORDS, ROW_FATE_WORDS, ROWS_PAGE } from "./words";

/** What the table lists: the rows the shown step reads, or the nodes or edges it leaves. */
type RowsTab = "rows" | "nodes" | "edges";

/** Each tab's word. */
const TAB_WORDS: Readonly<Record<RowsTab, string>> = { rows: "Rows", nodes: "Nodes", edges: "Edges" };

/** One line of the table: a row the step reads, or an element of the preview. */
interface Line {
    readonly key: string;
    readonly fate: string;
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * A cell's text.
 * @param value - the value.
 * @returns the text, or null for a blank.
 */
function cell(value: unknown): string | number | null {
    if (Array.isArray(value)) {
        return value.join(";");
    }
    if (typeof value === "string" || typeof value === "number") {
        return value;
    }
    return typeof value === "boolean" ? String(value) : null;
}

/**
 * The rows the shown step reads, a page at a time, each with its fate (graphty-element's
 * `draft.rows`), or the nodes or edges the preview draws: never more than one page is drawn,
 * whatever the table holds. The fate the workspace shows only narrows the rows.
 * @returns the pane.
 */
export function RowsPane(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version, side, fate } = api;
    const step = shownStep(api);
    const [tab, setTab] = useState<RowsTab>("rows");
    const [offset, setOffset] = useState(0);
    // A new step, tab or fate starts on the first page.
    useEffect(() => {
        setOffset(0);
    }, [step, tab, fate]);
    const shown: RowsTab = step === undefined && tab === "rows" ? "nodes" : tab;
    // Read again on every edit to the draft.
    const { lines, total } = useMemo((): { lines: readonly Line[]; total: number; version: number } => {
        if (shown === "rows" && step !== undefined) {
            const page = draft.rows(step, { offset, limit: ROWS_PAGE, ...(fate === null ? {} : { fate }) });
            const entry = draft.steps.find((each) => each.id === step);
            const rowFate = (each: JoinRowFate): string => {
                if (entry === undefined) {
                    return ROW_FATE_WORDS[each];
                }
                const word = rowFateWord(each, entry.choices, inputName(draft.inputs, entry.from));
                return word.charAt(0).toUpperCase() + word.slice(1);
            };
            return {
                version,
                total: page.total,
                lines: page.items.map((row: JoinPreviewRow) => ({
                    key: String(row.index),
                    fate: row.fate === undefined ? "" : rowFate(row.fate),
                    values: row.values,
                })),
            };
        }
        const preview = draft.preview(step === undefined ? {} : { step, before: side === "before" });
        const fateWord = (each?: JoinElementFate): string => (each === undefined ? "" : ELEMENT_FATE_WORDS[each]);
        const all =
            shown === "nodes"
                ? preview.nodes.slice(offset, offset + ROWS_PAGE).map((node) => ({
                      key: String(node.id),
                      fate: fateWord(node.fate),
                      values: { id: node.id, ...node.data },
                  }))
                : preview.edges.slice(offset, offset + ROWS_PAGE).map((edge) => ({
                      key: edge.id,
                      fate: fateWord(edge.fate),
                      values: { source: edge.source, target: edge.target, ...edge.data },
                  }));
        return {
            version,
            total: shown === "nodes" ? preview.nodes.length : preview.edges.length,
            lines: all,
        };
    }, [draft, version, step, side, shown, offset, fate]);
    const { ref, height } = useElementSize();
    const columns = useMemo((): DataTableColumn<Line>[] => {
        const names = [...new Set(lines.flatMap((line) => Object.keys(line.values)))];
        return [
            { id: "fate", header: "Fate", value: (line) => line.fate },
            ...names.map((name): DataTableColumn<Line> => ({
                id: `v:${name}`,
                header: name,
                value: (line) => cell(line.values[name]),
            })),
        ];
    }, [lines]);
    const last = Math.min(total, offset + ROWS_PAGE);
    return (
        <div className="jw-rows" ref={ref}>
            <Group gap={4} className="jw-rows-bar" wrap="nowrap">
                <SegmentedControl
                    size="xs"
                    aria-label="Table"
                    value={shown}
                    data={[
                        { value: "rows", label: TAB_WORDS.rows, disabled: step === undefined },
                        { value: "nodes", label: TAB_WORDS.nodes },
                        { value: "edges", label: TAB_WORDS.edges },
                    ]}
                    onChange={(value) => {
                        setTab(value as RowsTab);
                    }}
                />
                <span className="sel-spacer" />
                <Text size="sm" c="dimmed" className="jw-rows-range">
                    {total === 0 ? "0" : `${formatNumber(offset + 1)}-${formatNumber(last)} of ${formatNumber(total)}`}
                </Text>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={offset === 0}
                    onClick={() => {
                        setOffset(Math.max(0, offset - ROWS_PAGE));
                    }}
                >
                    Previous
                </Button>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={last >= total}
                    onClick={() => {
                        setOffset(offset + ROWS_PAGE);
                    }}
                >
                    Next
                </Button>
            </Group>
            <DataTable<Line>
                label={TAB_WORDS[shown]}
                data={lines}
                columns={columns}
                getRowId={(line) => line.key}
                height={Math.max(32, height - 28)}
                selectionMode="none"
            />
        </div>
    );
}
