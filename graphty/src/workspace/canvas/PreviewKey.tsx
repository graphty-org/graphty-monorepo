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

import { useEditedSelection } from "../selection/useSteps";
import { letterOf } from "../selection/words";
import { useWorkspaceState } from "../state/WorkspaceContext";
import { colorName } from "../style/words";

/**
 * Whether graphty-element draws a branches view now.
 * @param session - the element's session.
 * @returns true while it does.
 */
function useShowingBranches(session: GraphSession): boolean {
    const [shown, setShown] = useState(session.styles.showingBranches);
    useEffect(() => {
        setShown(session.styles.showingBranches);
        return session.on("style:branches-shown-changed", (change) => {
            setShown(change.shown);
        });
    }, [session]);
    return shown;
}

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
    const shown = useShowingBranches(session);
    const edited = useWorkspaceState((state) => state.editingSelection);
    const reading = useEditedSelection(session, shown ? (edited?.rule ?? null) : null);
    if (!shown || edited === null || reading === null) {
        return children;
    }
    const rows = reading.rule.branches.map((branch, at) => ({
        id: branch.id ?? String(at),
        name: branch.name ?? letterOf(at),
        color: branch.color ?? "",
        count: reading.branches.find((each) => each.id === branch.id)?.count ?? 0,
    }));
    return (
        <Paper
            component="section"
            aria-label={`Preview: ${edited.title}`}
            className="ws-legend-card"
            withBorder
            shadow="xs"
            p="xs"
        >
            <Stack gap={4}>
                <Text size="xs" fw={500} aria-hidden="true">
                    {`Preview: ${edited.title}`}
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
                <DataRow name="No match" value={reading.total.of - reading.total.count} />
            </Stack>
        </Paper>
    );
}
