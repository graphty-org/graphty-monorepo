import "./source-steps.css";

import { DataTable, type DataTableColumn, PANEL_GRID, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    SourceColumnProfile,
    SourceMatchValue,
    SourceMatchValuesOptions,
} from "@graphty/graphty-element/session";
import { Group, Stack, Text } from "@mantine/core";
import React, { useState } from "react";

import { sourceName } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import type { JoinCardState } from "../state/store";
import { field1Profile, field2Profile, joinOptions, joinPair, spaceChoices } from "./join";
import { cellWords, JOIN_WORDS, KIND_WORDS, OVERLAP_FILTERS } from "./words";

/** How many values the list asks the element for at a time. */
const PAGE = 200;

/** The overlap list's filter. */
type Filter = (typeof OVERLAP_FILTERS)[number]["value"];

/**
 * One field's profile: kind, valid, empty, distinct and samples.
 * @param props - Component props
 * @param props.title - whose field
 * @param props.profile - the profile, from the element
 * @returns the column
 */
function Profile({
    title,
    profile,
}: Readonly<{ title: string; profile: SourceColumnProfile | null }>): React.JSX.Element {
    const rows: readonly (readonly [string, string])[] =
        profile === null
            ? []
            : [
                  [JOIN_WORDS.kind, KIND_WORDS[profile.kind]],
                  [JOIN_WORDS.valid, formatNumber(profile.valid)],
                  [JOIN_WORDS.empty, formatNumber(profile.empty)],
                  [JOIN_WORDS.distinct, formatNumber(profile.distinct)],
                  [JOIN_WORDS.samples, profile.samples.map((sample) => cellWords(sample)).join(", ")],
              ];
    return (
        <fieldset className="ss-profile">
            <Text component="legend" size="xs" fw={600} truncate>
                {title}
            </Text>
            {rows.map(([label, value]) => (
                <Group key={label} gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed" w={56}>
                        {label}
                    </Text>
                    <Text size="xs" truncate aria-label={`${title} ${label.toLowerCase()}`}>
                        {value}
                    </Text>
                </Group>
            ))}
        </fieldset>
    );
}

/** The value list's columns: the value, then how many in each side hold it. */
const COLUMNS: readonly DataTableColumn<SourceMatchValue>[] = [
    { id: "value", header: JOIN_WORDS.value, sortable: false, rowHeader: true, value: (row) => cellWords(row.value) },
    { id: "in1", header: JOIN_WORDS.in1, sortable: false, align: "end", value: (row) => row.count1 },
    { id: "in2", header: JOIN_WORDS.in2, sortable: false, align: "end", value: (row) => row.count2 },
];

/**
 * The names of the card's two fields: Field 1's type and field, Field 2's source and field.
 * @param session - the element's session.
 * @param card - the card's picks.
 * @returns the two titles.
 */
function titles(session: GraphSession, card: JoinCardState): readonly [string, string] {
    const space = spaceChoices(session).find((choice) => choice.value === card.field1?.space)?.label ?? "";
    const one = `${space} ${card.field1?.field ?? JOIN_WORDS.key}`;
    const source = [...session.data.staged(), ...session.data.sources()].find(
        (each) => each.key === card.field2?.source,
    );
    const two = `${source === undefined ? "" : sourceName(source)} ${card.field2?.field ?? ""}`;
    return [one.trim(), two.trim()];
}

/**
 * The dock's Fields tab while the Join card is open (design 5.2): the two fields' profiles side by
 * side, and the value-overlap list (`data.matchValues`) filterable to Matched, Only 1 or Only 2,
 * read a page at a time. View-only.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card's picks
 * @param props.height - the room for the list, in pixels
 * @returns the tab's body
 */
export function FieldsTab({
    session,
    card,
    height,
}: Readonly<{ session: GraphSession; card: JoinCardState; height: number }>): React.JSX.Element {
    const [filter, setFilter] = useState<Filter>("all");
    const [offset, setOffset] = useState(0);
    const pair = joinPair(card);
    const [one, two] = titles(session, card);
    let page: { total: number; values: readonly SourceMatchValue[] } = { total: 0, values: [] };
    if (pair !== null) {
        const options: SourceMatchValuesOptions = {
            ...joinOptions(card),
            ...(filter === "all" ? {} : { only: filter }),
            offset,
            limit: PAGE,
        };
        try {
            page = session.data.matchValues(pair, options);
        } catch {
            // A pair the element refuses lists no values; the card shows no counts for it either.
        }
    }
    return (
        <Stack gap={6} className="ss-fields-tab">
            <Group gap="md" align="flex-start" wrap="nowrap">
                <Profile title={one} profile={field1Profile(session, card.field1)} />
                <Profile title={two} profile={field2Profile(session, card.field2)} />
            </Group>
            {pair === null ? null : (
                <>
                    <SegmentedControl
                        size="xs"
                        aria-label={JOIN_WORDS.values}
                        value={filter}
                        data={OVERLAP_FILTERS.map((each) => ({ ...each }))}
                        onChange={(next) => {
                            setFilter(next as Filter);
                            setOffset(0);
                        }}
                    />
                    <DataTable<SourceMatchValue>
                        key={filter}
                        label={JOIN_WORDS.values}
                        rowHeight={PANEL_GRID.ROW_PITCH}
                        headerHeight={PANEL_GRID.ROW_PITCH}
                        data={page.values}
                        rowCount={page.total}
                        rowOffset={offset}
                        onRangeChange={(start, end) => {
                            if (start < offset || end > offset + PAGE) {
                                setOffset(Math.max(0, start - PAGE / 4));
                            }
                        }}
                        columns={COLUMNS}
                        getRowId={(row) => `${typeof row.value}:${String(row.value)}`}
                        // Below the profiles (six rows) and the filter.
                        height={Math.max(PANEL_GRID.ROW_PITCH * 4, height - PANEL_GRID.ROW_PITCH * 8)}
                        selectionMode="none"
                    />
                </>
            )}
        </Stack>
    );
}
