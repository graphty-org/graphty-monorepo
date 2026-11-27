import { ControlSection, PageList, type PageListItem } from "@graphty/compact-mantine";
import { ActionIcon, ColorSwatch, Group, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey } from "../keys/keys";
import { JOIN_WORKSPACE_KEY } from "./keys";
import { KeyWords } from "./KeyWords";
import { WORKSPACE_WORDS } from "./words";

/** One card, as the list draws it. */
export interface JoinListRow {
    readonly id: string;
    /** Its one line. */
    readonly name: string;
    /** Its color in the preview, while each card has one. */
    readonly color?: string;
    readonly menu?: PageListItem["menu"];
}

/**
 * "Join +" and every join under it, one line each, below the data sources (the join workspace draws its
 * joins as cards).
 * @param props - Component props
 * @param props.rows - the joins, in order
 * @param props.current - the selected one, or null
 * @param props.onSelect - selects one
 * @param props.onAdd - adds one
 * @returns the section
 */
export function JoinList({
    rows,
    current,
    onSelect,
    onAdd,
}: Readonly<{
    rows: readonly JoinListRow[];
    current: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
}>): React.JSX.Element {
    return (
        <ControlSection
            label={WORKSPACE_WORDS.open}
            empty={rows.length === 0}
            actions={
                <Group gap={4} wrap="nowrap" data-join-plus="">
                    <KeyWords combo={JOIN_WORKSPACE_KEY} />
                    <Tooltip label={WORKSPACE_WORDS.open}>
                        <ActionIcon
                            variant="subtle"
                            aria-label={WORKSPACE_WORDS.open}
                            aria-keyshortcuts={ariaKey(JOIN_WORKSPACE_KEY)}
                            onClick={onAdd}
                        >
                            <GLYPHS.add size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            }
        >
            {rows.length === 0 ? null : (
                <PageList
                    label={WORKSPACE_WORDS.joins}
                    items={rows.map(({ id, name, color, menu }) => ({
                        id,
                        menu,
                        // The whole name, cut by an ellipsis only where it does not fit.
                        name,
                        value: color === undefined ? undefined : <ColorSwatch size={10} color={color} />,
                    }))}
                    current={current}
                    onCurrentChange={onSelect}
                />
            )}
        </ControlSection>
    );
}
