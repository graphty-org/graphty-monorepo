import { ControlSection, PageList, type PageListItem } from "@graphty/compact-mantine";
import { ActionIcon, ColorSwatch, Group, Tooltip, VisuallyHidden } from "@mantine/core";
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

/** How many of a card's sources a line names before it counts the rest. */
const NAMED = 2;

/**
 * A card's line: its first sources, then how many more, which a hover names; the whole name is the
 * row's accessible name.
 * @param name - the card's whole name, its sources joined by " + "
 * @param color - its color, if it has one
 * @returns the line's name and the value after it
 */
function lineOf(name: string, color: string | undefined): Pick<PageListItem, "name" | "value"> {
    const swatch = color === undefined ? null : <ColorSwatch size={10} color={color} />;
    const parts = name.split(" + ");
    if (parts.length <= NAMED) {
        return { name, value: swatch ?? undefined };
    }
    const rest = parts.slice(NAMED);
    return {
        name: parts.slice(0, NAMED).join(" + "),
        value: (
            <Group gap={4} wrap="nowrap" component="span">
                <VisuallyHidden data-rest="">{` + ${rest.join(" + ")}`}</VisuallyHidden>
                <Tooltip label={name}>
                    <span aria-hidden>{`+${String(rest.length)}`}</span>
                </Tooltip>
                {swatch}
            </Group>
        ),
    };
}

/**
 * "Join +" and every join under it, one line each: below the data sources, and at the top of the join
 * workspace.
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
                    items={rows.map(({ id, name, color, menu }) => ({ id, menu, ...lineOf(name, color) }))}
                    current={current}
                    onCurrentChange={onSelect}
                />
            )}
        </ControlSection>
    );
}
