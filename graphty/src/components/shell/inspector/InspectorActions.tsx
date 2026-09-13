/**
 * Block 6 of a selection surface: the actions block, pinned to the bottom of the
 * inspector (spec 03 section 5, "Pinning rule (binding)").
 *
 * Computed metrics, neighbors and the actions block never move below the first screen.
 * The content above scrolls; this block is a sticky footer OUTSIDE that scroll, which
 * it reaches by rendering into the element the inspector's chrome publishes through
 * `useInspectorFooterNode`. Rendered without that chrome above it -- in a test, say --
 * it simply draws in place.
 *
 * Design 5.8's group rule is applied here: three or more contiguous rows whose
 * capability has not shipped carry ONE `Coming` tag on this block's header and are
 * drawn dimmed and disabled, with one info circle; an isolated unshipped row keeps its
 * own tag. An unshipped row carries no key chip anywhere.
 */

import { PANEL_GRID, PANEL_INK, UiGlyph,type UiGlyphName } from "@graphty/compact-mantine";
import { Box, Menu, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";
import { createPortal } from "react-dom";

import { TOOLTIP_DELAY_MS } from "../constants";
import { ComingTag, UnshippedGroupMark } from "./ComingTag";
import {
    INSPECTOR_ACTION_ROW_CAP,
    INSPECTOR_CLUSTER_GAP,
    INSPECTOR_KIND_FONT_SIZE,
    UNSHIPPED_GROUP_THRESHOLD,
} from "./inspectorConstants";
import { useInspectorFooterNode } from "./inspectorContext";

/**
 * One verb in the actions block.
 */
export interface InspectorAction {
    /** Stable id, unique within the block. */
    readonly id: string;
    /** The verb, in full. Never shortened: floor item 4 owns what a control will do. */
    readonly label: string;
    /** A glyph from the closed register, where one names this verb. Omit otherwise. */
    readonly glyph?: UiGlyphName;
    /** What this will act on, or what it will cost -- drawn under the verb, resident. */
    readonly cost?: string;
    /** Whether the verb is drawn inoperable. */
    readonly disabled?: boolean;
    /** Why it is inoperable. Carried in the control's tooltip (floor item 4). */
    readonly disabledReason?: string;
    /** Whether the capability behind the verb has not shipped yet (design 5.8). */
    readonly coming?: boolean;
    /** What the verb does. */
    readonly onSelect?: () => void;
}

/**
 * Props of the actions block.
 * @public
 */
export interface InspectorActionsProps {
    /** The block's name, which is also the accessible name of the footer region. */
    readonly label: string;
    /** The resident verbs, in the order spec 03 section 5 item 6 fixes. */
    readonly actions: readonly InspectorAction[];
    /** The verbs that live under `More`, in full text. */
    readonly moreActions?: readonly InspectorAction[];
    /** The overflow's own word. Defaults to `More`. */
    readonly moreLabel?: string;
}

/**
 * The longest run of contiguous unshipped rows in a list.
 * @param actions - the rows to measure.
 * @returns how many unshipped rows sit next to each other at the longest.
 */
function longestUnshippedRun(actions: readonly InspectorAction[]): number {
    let longest = 0;
    let run = 0;

    for (const action of actions) {
        if (action.coming === true) {
            run += 1;
            longest = Math.max(longest, run);
        } else {
            run = 0;
        }
    }

    return longest;
}

interface ActionButtonProps {
    readonly action: InspectorAction;
    readonly tagged: boolean;
}

/**
 * One subtle action row: 24 px tall, full width, radius 4, a 16 px leading glyph slot
 * and an 11 px label at weight 500 (build spec 04 section 10.4). Its trailing slot
 * carries data about the action or a `Coming` tag -- never a key.
 * @param props - the row's props.
 * @returns the action row.
 */
function ActionButton(props: ActionButtonProps): React.JSX.Element {
    const { action, tagged } = props;
    const unshipped = action.coming === true;
    const disabled = unshipped || action.disabled === true;
    const ink = disabled ? PANEL_INK.DISABLED : PANEL_INK.VALUE;

    const button = (
        <UnstyledButton
            type="button"
            disabled={disabled}
            data-testid="inspector-action"
            data-coming={unshipped ? "true" : undefined}
            onClick={() => {
                action.onSelect?.();
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: PANEL_GRID.TRIPLE_GAP,
                width: "100%",
                height: PANEL_GRID.CONTROL_HEIGHT,
                paddingInline: PANEL_GRID.PAD_RIGHT,
                borderRadius: PANEL_GRID.TRIPLE_GAP,
                background: "transparent",
                color: ink,
                fontSize: "var(--mantine-font-size-sm)",
                fontWeight: 500,
                cursor: disabled ? "default" : "pointer",
            }}
        >
            <Box
                aria-hidden
                style={{
                    flex: "0 0 auto",
                    width: PANEL_GRID.GLYPH_SLOT,
                    height: PANEL_GRID.GLYPH_SLOT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: PANEL_INK.CHROME,
                }}
            >
                {action.glyph !== undefined && <UiGlyph name={action.glyph} size={PANEL_GRID.GLYPH} />}
            </Box>

            <Box
                component="span"
                style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", textAlign: "start" }}
            >
                {action.label}
            </Box>

            {tagged && <ComingTag subject={action.label} />}
        </UnstyledButton>
    );

    const reason = action.disabledReason;

    return (
        <Box style={{ display: "flex", flexDirection: "column" }}>
            {reason === undefined ? (
                button
            ) : (
                <Tooltip label={`${action.label}. ${reason}`} openDelay={TOOLTIP_DELAY_MS} position="top" withinPortal>
                    <Box>{button}</Box>
                </Tooltip>
            )}

            {action.cost !== undefined && (
                <Text
                    span
                    data-testid="inspector-action-cost"
                    style={{
                        paddingInlineStart: PANEL_GRID.PAD_RIGHT + PANEL_GRID.GLYPH_SLOT + PANEL_GRID.TRIPLE_GAP,
                        fontSize: "var(--mantine-font-size-sm)",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {action.cost}
                </Text>
            )}
        </Box>
    );
}

/**
 * Splits a surface's verbs into the rows the block draws and the rows its `More`
 * menu holds, enforcing D4's four-row cap.
 *
 * The cap is applied HERE rather than left to each surface, for the reason D4 gives
 * it: it holds "in every selection state", and a rule that six surfaces each have to
 * remember is a rule that one of them forgets. A surface still chooses its own
 * order, and what survives the cap is simply the front of its own list -- the
 * register's frozen order (REGISTER-1.5 12.1) reading left to right.
 *
 * Rows carrying a `cost` are exempt and keep their place: see
 * `INSPECTOR_ACTION_ROW_CAP`.
 * @param actions - the surface's resident verbs, in its own order.
 * @param moreActions - the verbs the surface already put behind `More`.
 * @returns the rows to draw and the rows to hold, with the overflow ahead of the surface's own.
 */
function applyRowCap(
    actions: readonly InspectorAction[],
    moreActions: readonly InspectorAction[] | undefined,
): { rows: InspectorAction[]; overflow: InspectorAction[] } {
    const rows: InspectorAction[] = [];
    const overflow: InspectorAction[] = [];
    let capped = 0;

    for (const action of actions) {
        if (action.cost !== undefined) {
            rows.push(action);
            continue;
        }

        if (capped < INSPECTOR_ACTION_ROW_CAP) {
            rows.push(action);
            capped += 1;
            continue;
        }

        overflow.push(action);
    }

    return { rows, overflow: [...overflow, ...(moreActions ?? [])] };
}

/**
 * The actions block, drawn into the inspector's sticky footer.
 * @param props - the block's props.
 * @returns the footer region, in the chrome's footer element when there is one.
 */
export function InspectorActions(props: InspectorActionsProps): React.JSX.Element | null {
    const { label, actions: given, moreActions: givenMore, moreLabel = "More" } = props;
    const footerNode = useInspectorFooterNode();

    const { rows: actions, overflow: moreActions } = applyRowCap(given, givenMore);
    const groupIsUnshipped = longestUnshippedRun(actions) >= UNSHIPPED_GROUP_THRESHOLD;

    const block = (
        <Box
            component="section"
            aria-label={label}
            data-testid="inspector-actions"
            style={{
                display: "flex",
                flexDirection: "column",
                borderTop: `1px solid ${PANEL_INK.DIVIDER}`,
                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                paddingBlockEnd: PANEL_GRID.SECTION_PAD_BOTTOM,
                background: PANEL_INK.PANEL,
            }}
        >
            <Box
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: PANEL_GRID.TRAIL_GAP,
                    height: PANEL_GRID.SECTION_HEADER,
                }}
            >
                <Text
                    span
                    style={{
                        minWidth: 0,
                        fontSize: INSPECTOR_KIND_FONT_SIZE,
                        fontWeight: 500,
                        color: groupIsUnshipped ? PANEL_INK.CHROME : PANEL_INK.VALUE,
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Text>

                <Box style={{ display: "flex", alignItems: "center", gap: INSPECTOR_CLUSTER_GAP }}>
                    {groupIsUnshipped && <UnshippedGroupMark subject={label} />}

                    {moreActions.length > 0 && (
                        <Menu position="top-end" withinPortal>
                            <Menu.Target>
                                <UnstyledButton
                                    type="button"
                                    aria-label={moreLabel}
                                    data-testid="inspector-actions-more"
                                    style={{
                                        height: PANEL_GRID.CONTROL_HEIGHT,
                                        paddingInline: PANEL_GRID.PAD_RIGHT,
                                        borderRadius: PANEL_GRID.TRIPLE_GAP,
                                        color: PANEL_INK.CHROME,
                                        fontSize: "var(--mantine-font-size-sm)",
                                        fontWeight: 500,
                                    }}
                                >
                                    {moreLabel}
                                </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {moreActions.map((action) => (
                                    <Menu.Item
                                        key={action.id}
                                        disabled={action.coming === true || action.disabled === true}
                                        title={action.disabledReason}
                                        onClick={() => {
                                            action.onSelect?.();
                                        }}
                                    >
                                        {action.label}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    )}
                </Box>
            </Box>

            {actions.map((action) => (
                <ActionButton key={action.id} action={action} tagged={!groupIsUnshipped && action.coming === true} />
            ))}
        </Box>
    );

    if (footerNode === null) {
        return block;
    }

    return createPortal(block, footerNode);
}
