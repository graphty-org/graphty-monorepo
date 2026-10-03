/**
 * The inspector's 36 px title row (spec 03 section 3.2).
 *
 * One inventory, one order, every board that draws one. Trailing, in this order:
 * `Copy reading`, then `Pin as A`. The pin is drawn only for a node, edge, selection or
 * result -- never for Nothing selected. Leading: the surface KIND, which never truncates,
 * then its IDENTITY, which ellipsizes into its own title. No leading glyph, ever.
 *
 * TWO CONTROLS LEFT THIS ROW ON 2026-09-14, a `Keep open` latch and a `Toggle inspector
 * (D)` collapse chevron. Both were individual controls over ONE sidebar; the product
 * owner's instruction was "there is one button to hide / show both at the same time and
 * not individual buttons", and that one button lives in the top bar. INSPECTOR-TITLE-1.9
 * section 4 had refused a fourth slot in this row by measurement, the latch was granted an
 * override on 2026-09-12 at a measured cost of 28 px off the name band, and both the
 * override and the cost are now moot. `Pin as A` STAYS: it is the comparison pin, it
 * freezes the CONTENT rather than holding the column, and its delta machinery reads from
 * this position.
 *
 * FOLLOW-UP, not this file's to make: `INSPECTOR_HEADER_CLUSTER_WIDTH` still reserves
 * 80 px for what is now at most 52 px of controls, and `INSPECTOR_HEADER_NAME_BAND` is
 * still measured against the wider cluster. Both live in `inspectorConstants.ts`, which
 * belongs to the style-inspector rebuild landing after this change.
 */

import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box, Text, Tooltip } from "@mantine/core";
import React from "react";

import { PANEL_HEADER_HEIGHT } from "../constants";
import {
    INSPECTOR_CLUSTER_GAP,
    INSPECTOR_HEADER_CLUSTER_WIDTH,
    INSPECTOR_HEADER_LABELS,
    INSPECTOR_HEADER_NAME_BAND,
    INSPECTOR_KIND_FONT_SIZE,
    INSPECTOR_KIND_LINE_HEIGHT,
    KEY_CHIP_GAP,
} from "./inspectorConstants";

/**
 * Props of the inspector header.
 * @public
 */
export interface InspectorHeaderProps {
    /** The surface KIND at 12 px / weight 500, which never truncates. */
    readonly kindLabel: string;
    /** The surface IDENTITY at 11 px muted, which ellipsizes into its own title. */
    readonly identityLabel?: string;
    /** Whether `Pin as A` is drawn: a node, edge, selection or result, and nothing else. */
    readonly showPin: boolean;
    /**
     * Whether a pin is currently held, which the pin control draws as an accent border
     * over a tinted ground and reports as its pressed state.
     */
    readonly pinned?: boolean;
    /*
     * `keptOpen`, `onKeepOpenChange` and `onToggle` all left on 2026-09-14. The trailing
     * cluster ended in a `Keep open` latch and a collapse chevron; both were individual
     * controls over ONE sidebar, and the product owner asked for "one button to hide /
     * show both at the same time and not individual buttons". The inspector is drawn
     * whenever the sidebars are shown, so it has nothing of its own to collapse.
     *
     * `pinned` and `onPin` STAY. The pin is the comparison pin (design 5.4): it freezes a
     * copy of the CONTENT as an anchor and never held the column. Two objects, two words.
     */
    /** Copies the reading, the caveats line, the Counts rows and the legend's channel lines. */
    readonly onCopyReading: () => void;
    /** Takes the pin. Absent for the Nothing-selected surface, which has no pin. */
    readonly onPin?: () => void;
}

/**
 * One 24 px icon control of the trailing cluster: a register glyph, a tooltip that
 * carries the words and, after a 6 px gap, the key chip, and an `aria-label` equal to
 * that tooltip with the chip removed (build spec 04 sections 8.2 and 10.3).
 */
interface HeaderIconProps {
    readonly words: string;
    readonly chip: string | null;
    readonly glyph: React.ReactNode;
    readonly pressed?: boolean;
    /**
     * Whether the control draws ACTIVE: Mantine's `light` variant -- a tinted ground, an
     * accent glyph and the 1px accent border `@graphty/compact-mantine`'s ActionIcon theme
     * draws for that variant, which is the boundary WCAG 1.4.11 asks 3:1 of. Nothing here
     * draws that boundary itself: this row spread a local `activeRingStyle` from the panel
     * header until 2026-09-13, when the product owner ruled the bespoke control out and the
     * library was fixed instead.
     *
     * It is deliberately not {@link HeaderIconProps.pressed}: the row's last control passes
     * `pressed` hardcoded true -- the column is open whenever this header is drawn -- so a
     * treatment keyed off `pressed` would light that chevron for ever.
     */
    readonly active?: boolean;
    readonly testId: string;
    readonly onClick: () => void;
}

/**
 * Draws one trailing-cluster control.
 * @param props - the control's props.
 * @returns the icon button and its tooltip.
 */
function HeaderIcon(props: HeaderIconProps): React.JSX.Element {
    const { active = false, words, chip, glyph, pressed, testId, onClick } = props;

    const label =
        chip === null ? (
            words
        ) : (
            <Box component="span" style={{ display: "inline-flex", alignItems: "center", gap: KEY_CHIP_GAP }}>
                <Box component="span">{words}</Box>
                <Box component="span">{chip}</Box>
            </Box>
        );

    /*
     * A RESTING control inks itself with `PANEL_INK.CHROME`, the register's own secondary
     * ink and the one the activity panel's header row uses, rather than with the
     * `color="gray"` this row carried until 2026-09-13: the two resolved to two different
     * greys -- rgb(163,168,177) in the panel against rgb(222,226,230) here -- so one
     * control read as two greys in two headers that sit side by side.
     */
    return (
        <Tooltip label={label} position="bottom" withinPortal>
            <ActionIcon
                type="button"
                variant={active ? "light" : "subtle"}
                size={PANEL_GRID.TRAIL}
                radius="sm"
                c={active ? undefined : PANEL_INK.CHROME}
                aria-label={words}
                aria-pressed={pressed}
                data-testid={testId}
                onClick={onClick}
                style={{ flex: "0 0 auto" }}
            >
                {glyph}
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * The inspector's title row.
 * @param props - the header's props.
 * @returns the 36 px header, its name band and its trailing cluster.
 */
export function InspectorHeader(props: InspectorHeaderProps): React.JSX.Element {
    const { kindLabel, identityLabel, showPin, pinned, onCopyReading, onPin } = props;

    return (
        <Box
            data-testid="inspector-header"
            style={{
                flex: `0 0 ${PANEL_HEADER_HEIGHT}px`,
                height: PANEL_HEADER_HEIGHT,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: PANEL_GRID.TRAIL_GAP,
                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
            }}
        >
            <Box
                data-testid="inspector-header-name"
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    maxWidth: INSPECTOR_HEADER_NAME_BAND,
                    display: "flex",
                    alignItems: "baseline",
                    gap: INSPECTOR_CLUSTER_GAP,
                }}
            >
                <Text
                    span
                    data-testid="inspector-kind"
                    style={{
                        flex: "0 0 auto",
                        fontSize: INSPECTOR_KIND_FONT_SIZE,
                        fontWeight: 500,
                        lineHeight: INSPECTOR_KIND_LINE_HEIGHT,
                        color: PANEL_INK.VALUE,
                        whiteSpace: "nowrap",
                    }}
                >
                    {kindLabel}
                </Text>

                {identityLabel !== undefined && identityLabel !== "" && (
                    <Text
                        span
                        title={identityLabel}
                        data-testid="inspector-identity"
                        style={{
                            minWidth: 0,
                            fontSize: "var(--mantine-font-size-sm)",
                            lineHeight: INSPECTOR_KIND_LINE_HEIGHT,
                            color: PANEL_INK.CHROME,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {identityLabel}
                    </Text>
                )}
            </Box>

            <Box
                data-testid="inspector-header-actions"
                style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: INSPECTOR_CLUSTER_GAP,
                    minWidth: showPin ? undefined : INSPECTOR_HEADER_CLUSTER_WIDTH,
                    justifyContent: "flex-end",
                }}
            >
                <HeaderIcon
                    words={INSPECTOR_HEADER_LABELS.copyReading}
                    chip={null}
                    glyph={<UiGlyph name="copy" size={PANEL_GRID.GLYPH} />}
                    testId="inspector-copy-reading"
                    onClick={onCopyReading}
                />

                {/* The pin draws its held state as an accent border over a tinted ground
                    with an accent glyph (2026-09-13, second pass): until then it passed
                    `pressed` and no `active`, so a held pin rendered identically to an
                    empty one. A pin that is held and a pin that is not are two states of
                    one control, and 1.4.11 asks a 3:1 boundary between them. It comes from
                    compact-mantine's shared ActionIcon theme, which is where that boundary
                    lives -- never from a local ring here. */}
                {showPin && onPin !== undefined && (
                    <HeaderIcon
                        words={INSPECTOR_HEADER_LABELS.pinAsA}
                        chip={null}
                        glyph={<UiGlyph name="pin" size={PANEL_GRID.GLYPH} />}
                        active={pinned ?? false}
                        pressed={pinned ?? false}
                        testId="inspector-pin"
                        onClick={onPin}
                    />
                )}
            </Box>
        </Box>
    );
}
