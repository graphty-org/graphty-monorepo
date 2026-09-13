/**
 * The inspector's 36 px title row (spec 03 section 3.2).
 *
 * One inventory, one order, every board that draws one. Trailing, in this order:
 * `Copy reading`, `Pin as A`, `Keep open`, `Toggle inspector (D)`. The pin is drawn only
 * for a node, edge, selection or result -- never for Nothing selected. Leading: the
 * surface KIND, which never truncates, then its IDENTITY, which ellipsizes into its own
 * title. No leading glyph, ever.
 *
 * INSPECTOR-TITLE-1.9 section 4 refused a fourth slot in this row by measurement
 * ("nothing else is ever in this row"). The product owner asked for the latch on
 * 2026-09-12 and it lands here; the cost is that with the pin also drawn the cluster is
 * 108 px and the name band 139 rather than 167, so the longest names ellipsize in that
 * one state. The override is recorded in INSPECTOR-TITLE-1.9 itself. `Pin as A` did NOT
 * move out of the row to make space: its delta machinery reads from this position, and
 * moving it would have put a working comparison at risk to save 28 px.
 */

import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box, Text, Tooltip } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import { PANEL_HEADER_HEIGHT, TOOLTIP_DELAY_MS } from "../constants";
import { activeRingStyle } from "../panel/PanelHeader";
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
     * Whether a pin is currently held, which the pin control draws as an accent ring over
     * a tinted ground and reports as its pressed state.
     */
    readonly pinned?: boolean;
    /**
     * Whether the column is latched open, which `Keep open` draws as an accent ring over a
     * tinted ground and reports as its pressed state. This is not
     * {@link InspectorHeaderProps.pinned}: that is the comparison pin, which freezes the
     * content; this holds the column on screen (6.12).
     */
    readonly keptOpen?: boolean;
    /**
     * The latch. The control is drawn only where the region supplies this, exactly as
     * the pin is; the shell always supplies it.
     */
    readonly onKeepOpenChange?: (kept: boolean) => void;
    /** Copies the reading, the caveats line, the Counts rows and the legend's channel lines. */
    readonly onCopyReading: () => void;
    /** Takes the pin. Absent for the Nothing-selected surface, which has no pin. */
    readonly onPin?: () => void;
    /** Collapses the column. The same verb lives in the top bar. */
    readonly onToggle: () => void;
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
     * Whether the control draws ACTIVE: an accent ring over a tinted ground, with an
     * accent glyph -- the shell's own pressed treatment (topbar/topBarControls.tsx) plus
     * the boundary WCAG 1.4.11 asks for, which is {@link activeRingStyle}. It is
     * deliberately not {@link HeaderIconProps.pressed}: the row's last control passes
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
        <Tooltip label={label} openDelay={TOOLTIP_DELAY_MS} position="bottom" withinPortal>
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
                style={{ flex: "0 0 auto", ...activeRingStyle(active) }}
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
    const { kindLabel, identityLabel, showPin, pinned, keptOpen, onCopyReading, onKeepOpenChange, onPin, onToggle } =
        props;

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

                {/* The pin takes the SAME treatment as the latch two slots along
                    (2026-09-13, second pass): until then it passed `pressed` and no
                    `active`, so a held pin rendered identically to an empty one -- the
                    exact defect reported against the latch, in the same header row. A pin
                    that is held and a pin that is not are two states of one control, and
                    1.4.11 asks the same 3:1 boundary of this one as of that one. */}
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

                {/* The latch, immediately left of the control that dismisses the column,
                    so the pair reads as keep-open against dismiss. It draws its latched
                    state as an accent ring over a tinted ground, with an accent glyph
                    (2026-09-13: until then the two states rendered byte for byte
                    identically -- `pressed` reached `aria-pressed` and nothing else -- and
                    the product owner could not tell a locked column from an unlocked one;
                    the ring is the second pass, because the ground alone measured 1.20:1
                    where 1.4.11 asks 3:1). The word and the padlock are the same in both
                    states (6.8; REGISTER-1.5 10.2). */}
                {onKeepOpenChange !== undefined && (
                    <HeaderIcon
                        words={INSPECTOR_HEADER_LABELS.keepOpen}
                        chip={null}
                        glyph={<UiGlyph name="keepOpen" size={PANEL_GRID.GLYPH} />}
                        active={keptOpen ?? false}
                        pressed={keptOpen ?? false}
                        testId="inspector-keep-open"
                        onClick={() => {
                            onKeepOpenChange(!(keptOpen ?? false));
                        }}
                    />
                )}

                <HeaderIcon
                    words={INSPECTOR_HEADER_LABELS.toggleInspector}
                    chip={keyChipFor("toggleInspector")}
                    glyph={<UiGlyph name="chevronRight" size={PANEL_GRID.CHEVRON} />}
                    pressed
                    testId="inspector-toggle"
                    onClick={onToggle}
                />
            </Box>
        </Box>
    );
}
