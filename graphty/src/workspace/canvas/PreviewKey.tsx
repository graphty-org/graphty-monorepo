/**
 * The canvas key while a selection is being picked (design/ui/selection-groups/spec.md, section 9):
 * graphty-element draws each group in its color with every style layer suspended, and the key says
 * so -- "Preview: Which nodes", a swatch, name and count per group, and how many match none -- so
 * nobody takes the suspended styles for lost ones.
 */

import { DataRow } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { formatNumber } from "../inspector/words";
import { useEditedSelection, useShownBranches } from "../selection/useSteps";
import { letterOf } from "../selection/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { colorName } from "../style/words";

/**
 * The preview key, in place of the canvas key while the element draws a selection's groups.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.children - the canvas key, drawn when nothing is previewed
 * @returns The key
 */
export function PreviewKey({
    session,
    children,
}: Readonly<{ session: GraphSession; children: React.ReactNode }>): React.ReactNode {
    // The view the element draws, never the store's: the key says what the canvas shows.
    const shown = useShownBranches(session);
    const edited = useWorkspaceState((state) => state.editingSelection);
    const reading = useEditedSelection(session, shown?.rule ?? null);
    // While graphty-element is still drawing the view (a large graph repaints over many frames),
    // the key says so, so its counts are never read as the canvas's.
    const { element } = useWorkspace();
    const [drawing, setDrawing] = useState(false);
    useEffect(() => {
        if (element === null || element === undefined || shown === null) {
            setDrawing(false);
            return undefined;
        }
        // Read on each animation frame until the element says the picture is final.
        let frame = 0;
        const look = (): void => {
            const stable = element.isFrameStable;
            setDrawing(!stable);
            if (!stable) {
                frame = requestAnimationFrame(look);
            }
        };
        frame = requestAnimationFrame(look);
        return () => {
            cancelAnimationFrame(frame);
        };
    }, [element, shown]);
    if (shown === null || reading === null) {
        return children;
    }
    const title = edited?.title ?? `Which ${reading.rule.side}`;
    const single = reading.rule.branches.length === 1;
    // Each row counts what is drawn in its color (a member of an earlier group is drawn in that
    // group's), so the rows and No match add up to the base; a group that is off draws nothing.
    const nameOf = (at: number): string => reading.rule.branches[at]?.name ?? (single ? title : letterOf(at));
    const rows = reading.rule.branches.flatMap((branch, at) => {
        const read = reading.branches.find((each) => each.id === branch.id);
        if (branch.on === false || read === undefined) {
            return [];
        }
        // A group whose every member an earlier group already draws says so ("1, under A"),
        // never 0, so its row, its pane and the key agree on its count.
        const under =
            read.drawn === 0 && read.count > 0
                ? reading.rule.branches
                      .slice(0, at)
                      .map((each, index) => ({ each, index }))
                      .filter(
                          ({ each }) =>
                              each.on !== false &&
                              (reading.branches.find((other) => other.id === each.id)?.drawn ?? 0) > 0,
                      )
                      .map(({ index }) => nameOf(index))
                : [];
        return [
            {
                id: branch.id ?? String(at),
                // One group is the selection itself: it goes by the selection's title.
                name: nameOf(at),
                color: branch.color ?? "",
                count:
                    under.length > 0
                        ? `${formatNumber(read.count)}, under ${under.join(", ")}`
                        : formatNumber(read.drawn),
            },
        ];
    });
    return (
        <Paper
            component="section"
            aria-label={`Preview: ${title}`}
            className="ws-legend-card"
            withBorder
            shadow="xs"
            p="xs"
        >
            <Stack gap={4}>
                <Text size="xs" fw={500} aria-hidden="true">
                    {`Preview: ${title}`}
                    {drawing && (
                        <Text span size="xs" c="dimmed" fw={400} ml={6} data-drawing="">
                            Drawing
                        </Text>
                    )}
                </Text>
                {rows.map((row) => (
                    <DataRow
                        key={row.id}
                        name={row.name}
                        value={row.count}
                        icon={
                            <ColorSwatch
                                className="ws-legend-chit"
                                color={row.color}
                                size={12}
                                role="img"
                                aria-label={colorName(row.color.slice(0, 7))}
                            />
                        }
                    />
                ))}
                <DataRow
                    name="No match"
                    value={formatNumber(reading.total.of - reading.total.count)}
                    // The faint rest, as the canvas draws it, so the row lines up with the groups'.
                    icon={
                        <ColorSwatch
                            className="ws-legend-chit"
                            color="var(--mantine-color-dimmed)"
                            size={12}
                            opacity={0.35}
                            aria-hidden
                        />
                    }
                />
            </Stack>
        </Paper>
    );
}
