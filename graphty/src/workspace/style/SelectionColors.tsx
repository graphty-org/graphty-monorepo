import { CompactColorInput, ControlSection } from "@graphty/compact-mantine";
import type { StyleColor } from "@graphty/graphty-element/session";
import { ColorSwatch, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { orNotice } from "../graph-place/actions";
import { useWorkspace } from "../state/WorkspaceContext";

/** How many chits show before "+N". */
const CHITS = 3;

/**
 * Selection colors (tier3 design, decision 1.13): the fixed colors some rows write, from
 * graphty-element's `styles.colors`. Up to three chits and "+N"; a click expands it to one row per
 * color naming the layers that write it, and editing one rewrites that color in exactly those
 * layers in one undo step (`styles.replaceColor`). Colors painted by rows outside are not listed.
 * @param props - Component props
 * @param props.rowIds - the rows: a folder, or several selected rows
 * @returns The section, or nothing when the rows write no fixed color
 */
export function SelectionColors({ rowIds }: Readonly<{ rowIds: readonly string[] }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [open, setOpen] = useState(false);
    if (session === null) {
        return null;
    }
    let colors: readonly StyleColor[];
    try {
        colors = session.styles.colors(rowIds);
    } catch {
        // A row an undo took away: the panel says so itself.
        colors = [];
    }
    if (colors.length === 0) {
        return null;
    }
    const namesOf = (color: StyleColor): string =>
        [
            ...new Set(
                // Top first, as the tree and the folder's list read.
                [...color.writes]
                    .reverse()
                    .map((write) => session.styles.parts(write.layer)?.name ?? session.styles.get(write.layer)?.name),
            ),
        ]
            .filter((name): name is string => name !== undefined)
            .join(", ");
    // ponytail: the picker edits the color's first six hex digits; a color with its own alpha
    // comes back opaque. Show opacity here when a layer writes such a color.
    const hex = (color: StyleColor): string => color.color.slice(0, 7).toUpperCase();
    return (
        <ControlSection label="Selection colors" collapsible={false} headingLevel={3}>
            {open ? (
                <Stack gap={4} px={8} pb={8}>
                    {colors.map((color) => (
                        <div // NOSONAR(S6819): an ARIA group naming one color's control and its layers; a fieldset would draw its own border and legend
                            key={color.color}
                            role="group"
                            aria-label={`${hex(color)}, from ${namesOf(color)}`}
                        >
                            <CompactColorInput
                                aria-label={`Replace ${hex(color)}`}
                                width="100%"
                                color={hex(color)}
                                defaultColor={hex(color)}
                                showOpacity={false}
                                showReset={false}
                                onChangeEnd={(next) => {
                                    if (next !== undefined && next.toUpperCase() !== hex(color)) {
                                        void orNotice(
                                            store,
                                            `change ${hex(color)}`,
                                            session.styles.replaceColor(rowIds, color.color, next.toUpperCase()),
                                        );
                                    }
                                }}
                            />
                            <Text size="xs" c="dimmed" truncate>
                                {namesOf(color)}
                            </Text>
                        </div>
                    ))}
                </Stack>
            ) : (
                <UnstyledButton
                    className="cm-focus-inside"
                    aria-label={`Show ${String(colors.length)} selection color${colors.length === 1 ? "" : "s"}`}
                    px={8}
                    pb={8}
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    <Group gap={4}>
                        {colors.slice(0, CHITS).map((color) => (
                            <ColorSwatch key={color.color} color={hex(color)} size={16} />
                        ))}
                        {colors.length > CHITS && <Text size="xs">+{colors.length - CHITS}</Text>}
                    </Group>
                </UnstyledButton>
            )}
        </ControlSection>
    );
}
