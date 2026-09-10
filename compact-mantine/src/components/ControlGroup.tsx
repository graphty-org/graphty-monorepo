import { Box, Divider, Stack } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";

// Contract sections 2.3, 3, 7 and 7.5 were applied to this file: the logical
// properties, the ARIA, the user-facing documentation, and the question of
// whether this component is superseded by ControlSection.
//
// It is not, and the evidence is two capabilities ControlSection does not have.
// (1) A section always draws a header button and always collapses; driving it
// with opened={true} leaves a chevron that does nothing, which is a worse
// answer than a group that never claimed to fold. (2) `bleed` pulls the rule
// out through the padding of the container the group sits in, which is what a
// group nested in a pop-out or a sidebar needs and what a section, drawn for
// the panel's own 16/8 grid, has no equivalent for. The package's own pop-out
// story uses this component for exactly that. So it keeps no @deprecated
// marker; the choice between the two is documented below instead.

// The 8px a group insets its header and its rows from the container it sits
// in. It is the same 8 the panel grid spends between a pair of fields and
// above a trailing slot, so it is spelled from PANEL_GRID rather than typed as
// a literal three times.
const GROUP_PADDING = PANEL_GRID.GUTTER;

// The 4px this library puts between the parts of one control: here, between
// two header actions.
const INLINE_GAP = 4;

// The 1px rule that separates one group from whatever precedes it.
const DIVIDER_HEIGHT = 1;

// The line height of a single-line label, from the type ramp.
const LABEL_LINE_HEIGHT = 1.2;

// The negative margin that pulls the rule out to the edges of a padded
// container. The extra pixel accounts for the 1px border such a container
// usually carries; `--mantine-spacing-sm` is the padding a pop-out panel and a
// sidebar are built with.
const BLEED_MARGIN = "calc(-1 * var(--mantine-spacing-sm) - 1px)";

/**
 * Props for the ControlGroup component.
 */
export interface ControlGroupProps {
    /**
     * The group's name, drawn in its header.
     *
     * One to three words in sentence case. It is also the accessible name of
     * the group, so every control inside is announced as belonging to it.
     */
    label: string;
    /**
     * Buttons drawn at the end of the header row, such as add or reset.
     *
     * Give each one an accessible name of its own; they sit outside the
     * group's name and are not described by it.
     */
    actions?: React.ReactNode;
    /** The controls the group holds, stacked in the order you write them. */
    children: React.ReactNode;
    /**
     * Run the rule above the header out to the edges of the surrounding
     * container instead of stopping at its padding.
     *
     * Turn this on when the group sits inside something that supplies its own
     * padding -- a pop-out panel, or a sidebar -- and you want the rule to read
     * as a divider across the whole panel rather than as a line floating
     * inside it. It is drawn with a negative inline margin, so it follows the
     * text direction with no further work.
     */
    bleed?: boolean;
}

/**
 * A labelled group of controls, with a rule above its name.
 *
 * The group is always open: the rule, the name, any header buttons and the
 * controls are all on screen at once, and nothing about it collapses. That is
 * the whole difference between this and `ControlSection`, and it is the
 * question to ask when choosing between them:
 *
 * - Reach for `ControlSection` when the group should fold away, or when it
 *   sits directly in a property panel and should line up on that panel's
 *   16px/8px grid. It adds a chevron, a keyboard-operable header, an empty
 *   state and an explanation bubble.
 * - Reach for `ControlGroup` when the controls must stay visible, or when the
 *   group is nested inside a container that already supplies its own padding.
 *   `bleed` exists for exactly that case and `ControlSection` has no
 *   equivalent.
 *
 * The header is a flex row: the name takes the space it needs and shortens
 * with an ellipsis when the container is narrow, and the buttons stay pinned
 * to the end of the row. Everything is laid out in inline terms, so the group
 * mirrors correctly when it is rendered right to left.
 * @param props - Component props
 * @param props.label - The group's name, which is also its accessible name
 * @param props.actions - Buttons drawn at the end of the header row
 * @param props.children - The controls the group holds
 * @param props.bleed - Run the rule out to the edges of a padded container
 * @returns The control group
 * @example
 * ```tsx
 * <ControlGroup label="Appearance" actions={<ResetButton />}>
 *     <ToggleRow label="Labels" defaultChecked />
 *     <StyleSelect label="Shape" defaultValue="circle" options={shapes} />
 * </ControlGroup>
 * ```
 */
export function ControlGroup({ label, actions, children, bleed = false }: ControlGroupProps): React.JSX.Element {
    // ARIA Authoring Practices: no widget pattern applies, because nothing
    // here is interactive -- this is the practices' plain grouping technique,
    // role="group" named by the header text that is already on screen through
    // aria-labelledby. Naming it from the visible text rather than with an
    // aria-label keeps the two from drifting apart, and is why the header text
    // carries an id.
    const labelId = useId();
    const hasActions = actions !== undefined && actions !== null;

    return (
        <Box data-testid="control-group" role="group" aria-labelledby={labelId}>
            <Divider
                data-testid="control-group-divider"
                color={PANEL_INK.DIVIDER}
                size={DIVIDER_HEIGHT}
                style={{
                    marginBlockStart: GROUP_PADDING,
                    marginBlockEnd: 0,
                    marginInline: bleed ? BLEED_MARGIN : undefined,
                }}
            />

            <Box
                data-testid="control-group-header"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: INLINE_GAP,
                    boxSizing: "border-box",
                    paddingBlock: GROUP_PADDING,
                    paddingInline: GROUP_PADDING,
                }}
            >
                {/* The name shortens rather than wrapping, so it carries a
                    title for a reader using a pointer. The full string stays
                    in the document either way, so assistive technology reads
                    all of it however narrow the container is. */}
                <Box
                    component="span"
                    id={labelId}
                    data-testid="control-group-label"
                    title={label}
                    style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "var(--mantine-font-size-xs)",
                        fontWeight: 500,
                        lineHeight: LABEL_LINE_HEIGHT,
                        color: PANEL_INK.VALUE,
                    }}
                >
                    {label}
                </Box>

                {hasActions && (
                    <Box
                        data-testid="control-group-actions"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: INLINE_GAP,
                            flex: "0 0 auto",
                        }}
                    >
                        {actions}
                    </Box>
                )}
            </Box>

            <Stack data-testid="control-group-content" gap={0} px={GROUP_PADDING}>
                {children}
            </Stack>
        </Box>
    );
}
