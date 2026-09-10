import { Box, Text } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useNumberFormatter } from "../i18n";

// Contract sections 2.2, 2.4, 3, 7.3 and 7.5 were applied to this file: the
// locale-aware number formatting, the reachable full text, the ARIA, the
// user-facing documentation and the deprecation marker.
//
// Superseded by DataRow, and the evidence is that DataRow is a strict superset:
// the same reader's string on the leading edge, the same value on the trailing
// edge in the same secondary ink, plus a leading icon, a selected state, a
// trailing slot, activation, double click and a context menu. There is nothing
// this component draws that DataRow cannot. It stays exported and working,
// because the package is published.

/**
 * The 4px above and below the pair, which is what the row was drawn with
 * before this component was deprecated and is kept so a panel of them does not
 * move.
 */
const ROW_PADDING_Y = 4;

/**
 * The most fraction digits a value is drawn with.
 *
 * `Intl.NumberFormat` rounds to three fraction digits by default, which would
 * silently shorten a value that used to be drawn by `String()`. Twenty is past
 * the seventeen significant digits a JavaScript number can hold, so every digit
 * survives and the only thing formatting changes is that the digits, the
 * grouping and the decimal separator now follow the reader's locale.
 */
const MAX_FRACTION_DIGITS = 20;

/**
 * Props for the StatRow component.
 */
interface StatRowOwnProps {
    /**
     * What the value is: "Nodes", "Edges", "Density".
     *
     * It is also the accessible name of the pair, so a screen reader reads the
     * two together rather than as two loose pieces of text. A label too long
     * for the row is shortened with an ellipsis and repeated as a tooltip, and
     * is read out in full either way.
     */
    label: string;
    /**
     * The reading.
     *
     * A number is formatted for the reader's locale -- grouped, and with that
     * locale's own digits and decimal separator -- so `1000000` is drawn as
     * "1,000,000" in English and "1.000.000" in German. Every digit is kept.
     * Pass a string when you have formatted the value yourself, or when it is
     * not a number at all.
     */
    value: string | number;
}

/**
 * Props for the StatRow component.
 * @deprecated Use {@link DataRowProps}, the props of the row that replaces this
 * one.
 */
export type StatRowProps = StatRowOwnProps;

/**
 * A label and a reading on one line: a graph's node count, its density, a
 * selected item's degree.
 *
 * The label sits at the leading edge in the secondary text colour and the
 * reading at the trailing edge in the primary one, and the pair is announced
 * together, so a screen reader says "Nodes, 1,000,000" rather than reading two
 * unrelated strings. A number is formatted for the reader's locale.
 *
 * Nothing here is interactive: it is a reading, not a control. If the row
 * should be selectable, open something when it is double-clicked, offer a
 * context menu, or carry a small control at its end, that is `DataRow`.
 * @deprecated Use `DataRow`, which draws the same pair and can also be
 * selected, activated and given a trailing control.
 * @param props - Component props
 * @param props.label - What the value is, which is also the accessible name of the pair
 * @param props.value - The reading; a number is formatted for the reader's locale
 * @returns The label and its reading, on one line
 * @example
 * ```tsx
 * <StatRow label="Nodes" value={graph.nodeCount} />
 * <StatRow label="Density" value={density.toFixed(3)} />
 * ```
 */
export function StatRow({ label, value }: StatRowOwnProps): React.JSX.Element {
    const labelId = useId();
    const numberFormatter = useNumberFormatter({ maximumFractionDigits: MAX_FRACTION_DIGITS });

    const reading = typeof value === "number" ? numberFormatter.format(value) : value;

    // Accessibility: no ARIA Authoring Practices widget pattern applies,
    // because nothing here is a widget. What applies is the practices' plain
    // grouping technique -- role="group" named through aria-labelledby by the
    // label already on the screen -- which is what makes the pairing
    // programmatically determinable (WCAG 1.3.1) instead of leaving the label
    // and the reading as two unrelated runs of text. Naming the group from the
    // visible text rather than with an aria-label is what keeps the spoken name
    // and the written one from drifting apart, and is why the label carries an
    // id.
    return (
        <Box
            role="group"
            aria-labelledby={labelId}
            data-testid="stat-row"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: PANEL_GRID.GUTTER,
                paddingBlock: ROW_PADDING_Y,
            }}
        >
            {/* The label shortens rather than wrapping, so it carries a title
                for a reader using a pointer. The whole string stays in the
                document either way, so a screen reader reads all of it however
                narrow the panel is. */}
            <Text
                id={labelId}
                data-testid="stat-row-label"
                size="sm"
                c={PANEL_INK.CHROME}
                title={label}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </Text>

            <Text data-testid="stat-row-value" size="sm" c={PANEL_INK.VALUE} fw={500} style={{ flex: "0 0 auto" }}>
                {reading}
            </Text>
        </Box>
    );
}
