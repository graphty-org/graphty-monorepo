/**
 * Card A -- the frozen copy a pin leaves above the live content (spec 03 section 3.3).
 *
 * The card is read-only by construction: it is a photograph of the figures that were
 * on screen when the pin was taken, and the live content below it keeps following the
 * selection. Releasing the pin is one of exactly two routes -- this card's `Unpin`, or
 * a data reload -- so the verb keeps its word rather than becoming the register's pin
 * glyph, which would name the state and not the change.
 */

import { DataRow, PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box, Button, Group, Text } from "@mantine/core";
import React from "react";

import { INSPECTOR_CLUSTER_GAP, INSPECTOR_HEADER_LABELS, INSPECTOR_KIND_FONT_SIZE } from "./inspectorConstants";
import type { InspectorPinSnapshot } from "./inspectorContext";

/**
 * Props of the pinned card.
 * @public
 */
export interface PinnedCardProps {
    /** The frozen copy. */
    readonly snapshot: InspectorPinSnapshot;
    /** Releases the pin. */
    readonly onUnpin: () => void;
}

/**
 * Draws the pinned copy as card A above the live content.
 * @param props - the card's props.
 * @returns the card, its identity line and its frozen figures.
 */
export function PinnedCard(props: PinnedCardProps): React.JSX.Element {
    const { snapshot, onUnpin } = props;
    const identity = snapshot.identityLabel;

    return (
        <Box
            component="section"
            aria-label={`Pinned as A: ${snapshot.kindLabel}`}
            data-testid="inspector-pinned-card"
            style={{
                flex: "0 0 auto",
                marginInlineStart: PANEL_GRID.PAD_LEFT,
                marginInlineEnd: PANEL_GRID.PAD_RIGHT,
                marginBlockStart: PANEL_GRID.SECTION_PAD_BOTTOM,
                padding: PANEL_GRID.SECTION_PAD_BOTTOM,
                border: `1px solid ${PANEL_INK.BORDER}`,
                borderRadius: PANEL_GRID.TRIPLE_GAP,
                background: PANEL_INK.RAISED,
            }}
        >
            <Group gap={INSPECTOR_CLUSTER_GAP} justify="space-between" wrap="nowrap">
                <Box style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: INSPECTOR_CLUSTER_GAP }}>
                    <Text
                        span
                        style={{
                            flex: "0 0 auto",
                            fontSize: INSPECTOR_KIND_FONT_SIZE,
                            fontWeight: 500,
                            color: PANEL_INK.VALUE,
                            whiteSpace: "nowrap",
                        }}
                    >
                        A
                    </Text>
                    <Text
                        span
                        title={identity ?? snapshot.kindLabel}
                        style={{
                            minWidth: 0,
                            fontSize: "var(--mantine-font-size-sm)",
                            color: PANEL_INK.CHROME,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {identity ?? snapshot.kindLabel}
                    </Text>
                </Box>

                <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => {
                        onUnpin();
                    }}
                >
                    {INSPECTOR_HEADER_LABELS.unpin}
                </Button>
            </Group>

            {snapshot.metrics.map((metric) => (
                <DataRow key={metric.metricId} name={metric.name} value={metric.display} />
            ))}
        </Box>
    );
}
