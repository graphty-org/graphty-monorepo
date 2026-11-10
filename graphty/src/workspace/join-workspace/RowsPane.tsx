import { DataTable, type DataTableColumn } from "@graphty/compact-mantine";
import type { JoinPreviewRow } from "@graphty/graphty-element/session";
import { Button, Group, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import React, { useEffect, useMemo, useState } from "react";

import { formatNumber } from "../inspector/words";
import { shownStep, useJoinWorkspace } from "./context";
import { ROW_FATE_WORDS, ROWS_PAGE } from "./words";

/**
 * The rows the shown step reads, a page at a time, each with its fate (graphty-element's
 * `draft.rows`): never more than one page is drawn, whatever the table holds.
 * @returns the pane.
 */
export function RowsPane(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const step = shownStep(api);
    const [offset, setOffset] = useState(0);
    // A new step, or a new edit, starts on the first page.
    useEffect(() => {
        setOffset(0);
    }, [step]);
    // Read again on every edit to the draft.
    const { page } = useMemo(
        () => ({ version, page: step === undefined ? null : draft.rows(step, { offset, limit: ROWS_PAGE }) }),
        [draft, version, step, offset],
    );
    const { ref, height } = useElementSize();
    const items = useMemo(() => page?.items ?? [], [page]);
    const columns = useMemo((): DataTableColumn<JoinPreviewRow>[] => {
        const names = [...new Set(items.flatMap((row) => Object.keys(row.values)))];
        return [
            {
                id: "fate",
                header: "Fate",
                value: (row) => (row.fate === undefined ? "" : ROW_FATE_WORDS[row.fate]),
            },
            ...names.map((name): DataTableColumn<JoinPreviewRow> => ({
                id: `v:${name}`,
                header: name,
                value: (row) => {
                    const value = row.values[name];
                    return Array.isArray(value) ? value.join(";") : ((value as string | number | null) ?? null);
                },
            })),
        ];
    }, [items]);
    const total = page?.total ?? 0;
    const last = Math.min(total, offset + ROWS_PAGE);
    return (
        <div className="jw-rows" ref={ref}>
            <Group gap={4} justify="flex-end" className="jw-rows-bar" wrap="nowrap">
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
            <DataTable<JoinPreviewRow>
                label="Rows"
                data={items}
                columns={columns}
                getRowId={(row) => String(row.index)}
                height={Math.max(32, height - 28)}
                selectionMode="none"
            />
        </div>
    );
}
