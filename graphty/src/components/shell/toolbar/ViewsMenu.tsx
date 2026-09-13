/**
 * The Views menu: the canvas toolbar's last item and the only surface it opens.
 *
 * Geometry (build spec 01 section 6; ART-VM:326-390):
 *
 * - It opens UPWARD, and the trigger's caret points up, because a surface whose
 *   opener sits on the canvas floor grows away from that floor.
 * - Its bottom edge is 4 px above the bar's TOP edge, which is the same pixel as the
 *   artboard's 8 px above the VIEWS BUTTON's top edge -- the button sits one border
 *   and one container padding inside the bar. On the desktop profile both readings
 *   give `bottom: 52`. The menu is anchored to the button itself, with the library's
 *   own `POPOUT_GAP`, so the two readings cannot drift apart.
 * - It is right-edge aligned to the Views button rather than centred on it: a
 *   transient surface inherits both axes from its opener -- a gap on the side it
 *   opens from, a shared edge line on the other.
 * - It is 248 wide, under the 280 threshold, so it carries an 8 px caret on the edge
 *   that faces its opener, clamped 12 px inside the menu's corner.
 * - It is clamped 12 px inside the canvas's edges and scrolls internally above that.
 * - It paints at `CANVAS_MENU_Z_INDEX`, over the bar's own.
 *
 * Rows (SPEC:3589-3591, in this order): Reset view, Top, Front, Side, Isometric,
 * Follow selection | Save as view... | Minimap, Toolbar, Legend | Enter VR, Enter AR.
 * The three unshipped rows carry the muted `Coming` tag of 5.8 and, per 10.3, no key
 * chip; the longest unshipped run is two rows and Save as view... sits alone in its
 * group, so the three-or-more consolidation does not fire here -- no group note and
 * no info circle. The Toolbar row carries NO binding by design: M and L are taken,
 * and it is the only canvas overlay whose toggle can hide its own front door, so the
 * way back from it is the command palette row "Show canvas toolbar".
 *
 * The rows are built here rather than from `Menu.Item` for one reason: a checkable
 * menu row has to carry `role="menuitemcheckbox"` with `aria-checked`, and
 * `Menu.Item` fixes `role="menuitem"` after its own props. They keep Mantine's menu
 * behaviour -- the same `data-menu-item` hook and the same scoped arrow-key handler
 * the library's own items use -- inside Mantine's `Menu` and `Menu.Dropdown`, which
 * own the anchor, the caret, the focus trap, Escape and the outside click.
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK, POPOUT_GAP, UiGlyph, useNumberFormatter } from "@graphty/compact-mantine";
import { ActionIcon, createScopedKeydownHandler, Menu, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import { ComingTag } from "../ComingTag";
import { CANVAS_MENU_Z_INDEX, type CanvasToolbarProfile, TOOLTIP_DELAY_MS } from "../constants";
import { MenuCaret } from "../MenuCaret";
import { ToolbarGlyph } from "./toolbarGlyphs";
import { ToolbarKeyChip } from "./ToolbarItem";
import {
    CANVAS_EDGE_CLAMP,
    VIEWS_MENU_CARET_CLAMP,
    VIEWS_MENU_CARET_SIZE,
    VIEWS_MENU_PADDING,
    VIEWS_MENU_RADIUS,
    VIEWS_MENU_ROW_GAP,
    VIEWS_MENU_ROW_RADIUS,
    VIEWS_MENU_SECOND_LINE_FONT_SIZE,
    VIEWS_MENU_SEPARATOR_MARGIN,
    VIEWS_MENU_WIDTH,
    xrEntryState,
    xrReadinessLine,
    xrRowLabel,
} from "./toolbarMetrics";

/**
 * The trigger's title, its accessible name, and the menu's own name. ART-TB. The one home for
 * the word, quoted rather than retyped by whatever asserts the menu.
 * @public
 */
export const VIEWS_LABEL = "Views";

/** The gap between the trigger's cube and its caret. ART-TB (`gap: 2px`). */
const VIEWS_TRIGGER_GAP = 2;

/*
 * The muted tag an unshipped row carries (5.8) is the shell's one pill: the activity
 * panel and the inspector draw the same box, so it is declared once in
 * `shell/ComingTag.tsx` rather than a third time here.
 */

/** The XR verb rows, verbatim (SPEC:3491-3498). */
const ENTER_VR_LABEL = "Enter VR";

/** The AR verb row, verbatim (SPEC:3491-3498). */
const ENTER_AR_LABEL = "Enter AR";

/**
 * Which camera preset a row asks for. The three presets keep their key chips: the
 * shortcuts table lists those bindings as live, and that reading wins.
 *
 * Named in {@link ViewsMenuProps.onViewPreset}, so a caller can name the preset it is handed.
 * @public
 */
export type ViewPresetId = "front" | "side" | "top";

/**
 * Props of {@link ViewsMenu}.
 */
export interface ViewsMenuProps {
    /** Whether the menu is open. */
    readonly opened: boolean;
    /** Open and close. Hiding the toolbar closes the menu through this. */
    readonly onOpenChange: (opened: boolean) => void;
    /** The size profile in force; the trigger is 36 x 28 or 40 x 32. */
    readonly profile: CanvasToolbarProfile;
    /** Whether the minimap is shown; the row is checked when it is. */
    readonly minimapShown: boolean;
    /** Whether the legend is shown. */
    readonly legendShown: boolean;
    /** Whether the toolbar is shown. Unchecking it hides this menu with the bar. */
    readonly toolbarShown: boolean;
    /** Whether the browser reports immersive-vr support. The row is omitted when it does not. */
    readonly vrSupported: boolean;
    /** Whether the browser reports immersive-ar support. */
    readonly arSupported: boolean;
    /** Visible nodes, which the XR rows act on and name before they act. */
    readonly visibleNodeCount: number;
    /** Visible edges; the second half of the XR entry ceiling. */
    readonly visibleEdgeCount?: number;
    /** Reset view (Shift+0). */
    readonly onResetView: () => void;
    /** Top (7), Front (1), Side (3). */
    readonly onViewPreset: (preset: ViewPresetId) => void;
    /** Toggle the minimap. The same action the M binding fires. */
    readonly onToggleMinimap: () => void;
    /** Toggle the toolbar. No binding fires this -- the palette row does. */
    readonly onToggleToolbar: () => void;
    /** Toggle the legend. The same action the L binding fires. */
    readonly onToggleLegend: () => void;
    /** Opens the flat XR entry sheet for VR, never the session. */
    readonly onEnterVr: () => void;
    /** Opens the flat XR entry sheet for AR, never the session. */
    readonly onEnterAr: () => void;
}

interface ViewsMenuRowProps {
    readonly label: string;
    readonly secondLine?: string;
    readonly glyph?: React.ReactNode;
    readonly keyChip?: string | null;
    readonly coming?: boolean;
    readonly checked?: boolean;
    readonly disabled?: boolean;
    readonly height?: number;
    readonly onSelect?: () => void;
}

const rowKeydownHandler = createScopedKeydownHandler({
    parentSelector: "[data-menu-dropdown]",
    siblingSelector: "[data-menu-item]",
    orientation: "vertical",
    loop: true,
    activateOnFocus: false,
});

/**
 * One menu row.
 *
 * A row that cannot be acted on -- an unshipped one, or one the XR gate refuses --
 * stays in the arrow-key ring and keeps its name, because its state is the thing the
 * reader came to learn. It says so on the row, never in a title.
 * @param props - the row's name, marks, state and action.
 * @returns the row.
 */
function ViewsMenuRow(props: ViewsMenuRowProps): React.JSX.Element {
    const {
        label,
        secondLine,
        glyph,
        keyChip,
        coming = false,
        checked,
        disabled = false,
        height = PANEL_GRID.CONTROL_HEIGHT,
        onSelect,
    } = props;
    const inoperable = coming || disabled;

    return (
        <UnstyledButton
            role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={checked}
            aria-disabled={inoperable}
            aria-keyshortcuts={keyChip ?? undefined}
            data-menu-item
            data-mantine-stop-propagation
            tabIndex={-1}
            onKeyDown={rowKeydownHandler}
            onClick={() => {
                if (!inoperable) {
                    onSelect?.();
                }
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: COMPACT_SIZING.CONTROL_PADDING,
                width: "100%",
                height,
                minHeight: height,
                flex: "0 0 auto",
                padding: `0 ${COMPACT_SIZING.CONTROL_PADDING}px`,
                borderRadius: VIEWS_MENU_ROW_RADIUS,
                color: disabled ? PANEL_INK.DISABLED : PANEL_INK.VALUE,
                fontSize: COMPACT_SIZING.FONT_SIZE,
                lineHeight: 1.2,
                cursor: inoperable ? "default" : "pointer",
                boxSizing: "border-box",
            }}
        >
            <span
                style={{
                    display: "flex",
                    flex: `0 0 ${PANEL_GRID.GLYPH}px`,
                    width: PANEL_GRID.GLYPH,
                    height: PANEL_GRID.GLYPH,
                    color: checked === true ? PANEL_INK.ACCENT : PANEL_INK.CHROME,
                }}
            >
                {glyph}
            </span>
            {secondLine === undefined ? (
                <span
                    style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {label}
                </span>
            ) : (
                <span style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    <span
                        style={{
                            fontSize: VIEWS_MENU_SECOND_LINE_FONT_SIZE,
                            color: PANEL_INK.CHROME,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {secondLine}
                    </span>
                </span>
            )}
            {coming ? <ComingTag subject={label} /> : null}
            {keyChip === undefined || keyChip === null ? null : <ToolbarKeyChip>{keyChip}</ToolbarKeyChip>}
        </UnstyledButton>
    );
}

/**
 * A separator between two groups of rows.
 * @returns the rule.
 */
function ViewsMenuSeparator(): React.JSX.Element {
    return (
        <div
            role="separator"
            style={{
                height: 1,
                flex: "0 0 1px",
                background: PANEL_INK.DIVIDER,
                margin: `${VIEWS_MENU_SEPARATOR_MARGIN}px 0`,
            }}
        />
    );
}

/**
 * The Views trigger and the menu it opens upward.
 * @param props - the menu's open state, the size profile, what is shown, what XR the browser reports, and every row's action.
 * @returns the trigger with its menu.
 */
export function ViewsMenu(props: ViewsMenuProps): React.JSX.Element {
    const {
        opened,
        onOpenChange,
        profile,
        minimapShown,
        legendShown,
        toolbarShown,
        vrSupported,
        arSupported,
        visibleNodeCount,
        visibleEdgeCount = 0,
        onResetView,
        onViewPreset,
        onToggleMinimap,
        onToggleToolbar,
        onToggleLegend,
        onEnterVr,
        onEnterAr,
    } = props;
    const numberFormatter = useNumberFormatter();
    const xrState = xrEntryState(visibleNodeCount, visibleEdgeCount);
    const xrBlocked = xrState === "blocked";
    const readiness = xrReadinessLine(numberFormatter.format(visibleNodeCount), xrState);
    const glyphSize = PANEL_GRID.GLYPH;

    const choose = (action: () => void): (() => void) => {
        return () => {
            action();
            onOpenChange(false);
        };
    };

    return (
        <Menu
            opened={opened}
            onChange={onOpenChange}
            position="top-end"
            offset={POPOUT_GAP}
            width={VIEWS_MENU_WIDTH}
            withArrow
            arrowSize={VIEWS_MENU_CARET_SIZE}
            arrowOffset={VIEWS_MENU_CARET_CLAMP}
            arrowPosition="side"
            middlewares={{
                flip: false,
                shift: { padding: CANVAS_EDGE_CLAMP },
                size: { padding: CANVAS_EDGE_CLAMP },
            }}
            zIndex={CANVAS_MENU_Z_INDEX}
            radius={VIEWS_MENU_RADIUS}
            shadow="md"
            trapFocus
            returnFocus
            withInitialFocusPlaceholder={false}
            styles={{
                dropdown: {
                    display: "flex",
                    flexDirection: "column",
                    gap: VIEWS_MENU_ROW_GAP,
                    padding: VIEWS_MENU_PADDING,
                    background: PANEL_INK.SURFACE,
                    border: `1px solid ${PANEL_INK.BORDER}`,
                    overflowY: "auto",
                },
            }}
        >
            <Menu.Target>
                <Tooltip
                    label={VIEWS_LABEL}
                    openDelay={TOOLTIP_DELAY_MS}
                    position="top"
                    events={{ hover: true, focus: true, touch: true }}
                >
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        radius={profile.itemRadius}
                        aria-label={VIEWS_LABEL}
                        aria-haspopup="menu"
                        aria-expanded={opened}
                        __vars={{
                            "--ai-color": PANEL_INK.CHROME,
                            "--ai-hover-color": PANEL_INK.VALUE,
                            "--ai-bg": "transparent",
                        }}
                        style={{
                            width: profile.viewsButtonWidth,
                            height: profile.itemSize,
                            minWidth: profile.viewsButtonWidth,
                            minHeight: profile.itemSize,
                            flex: "0 0 auto",
                            // The trigger keeps a toggled state while its menu is open.
                            background: opened ? PANEL_INK.RAISED : "transparent",
                        }}
                    >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: VIEWS_TRIGGER_GAP }}>
                            <ToolbarGlyph name="cube" size={profile.glyphSize} />
                            {/* REGISTER-1.5 holds two caret entries, and the menu
                                affordance is the 8 px one at stroke 2. It is turned,
                                not redrawn, because this menu opens upward. */}
                            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                                <MenuCaret />
                            </span>
                        </span>
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>

            <Menu.Dropdown aria-label={VIEWS_LABEL}>
                <ViewsMenuRow
                    label="Reset view"
                    glyph={<UiGlyph name="refresh" size={glyphSize} />}
                    keyChip={keyChipFor("resetView")}
                    onSelect={choose(onResetView)}
                />
                <ViewsMenuRow
                    label="Top"
                    glyph={<ToolbarGlyph name="viewTop" size={glyphSize} />}
                    keyChip={keyChipFor("viewTop")}
                    onSelect={choose(() => {
                        onViewPreset("top");
                    })}
                />
                <ViewsMenuRow
                    label="Front"
                    glyph={<ToolbarGlyph name="viewFront" size={glyphSize} />}
                    keyChip={keyChipFor("viewFront")}
                    onSelect={choose(() => {
                        onViewPreset("front");
                    })}
                />
                <ViewsMenuRow
                    label="Side"
                    glyph={<ToolbarGlyph name="viewSide" size={glyphSize} />}
                    keyChip={keyChipFor("viewSide")}
                    onSelect={choose(() => {
                        onViewPreset("side");
                    })}
                />
                <ViewsMenuRow label="Isometric" glyph={<ToolbarGlyph name="cube" size={glyphSize} />} coming />
                <ViewsMenuRow label="Follow selection" coming />

                <ViewsMenuSeparator />

                <ViewsMenuRow
                    label="Save as view..."
                    glyph={<ToolbarGlyph name="saveView" size={glyphSize} />}
                    coming
                />

                <ViewsMenuSeparator />

                <ViewsMenuRow
                    label="Minimap"
                    checked={minimapShown}
                    glyph={minimapShown ? <UiGlyph name="check" size={glyphSize} /> : undefined}
                    keyChip={keyChipFor("toggleMinimap")}
                    onSelect={onToggleMinimap}
                />
                <ViewsMenuRow
                    label="Toolbar"
                    checked={toolbarShown}
                    glyph={toolbarShown ? <UiGlyph name="check" size={glyphSize} /> : undefined}
                    onSelect={choose(onToggleToolbar)}
                />
                <ViewsMenuRow
                    label="Legend"
                    checked={legendShown}
                    glyph={legendShown ? <UiGlyph name="check" size={glyphSize} /> : undefined}
                    keyChip={keyChipFor("toggleLegend")}
                    onSelect={onToggleLegend}
                />

                {vrSupported || arSupported ? <ViewsMenuSeparator /> : null}

                {vrSupported ? (
                    <ViewsMenuRow
                        label={xrRowLabel(ENTER_VR_LABEL, xrState)}
                        secondLine={readiness}
                        glyph={<ToolbarGlyph name="enterVr" size={glyphSize} />}
                        disabled={xrBlocked}
                        height={PANEL_GRID.ROW_PITCH}
                        onSelect={choose(onEnterVr)}
                    />
                ) : null}
                {arSupported ? (
                    <ViewsMenuRow
                        label={xrRowLabel(ENTER_AR_LABEL, xrState)}
                        secondLine={xrBlocked ? readiness : undefined}
                        glyph={<ToolbarGlyph name="enterAr" size={glyphSize} />}
                        disabled={xrBlocked}
                        height={xrBlocked ? PANEL_GRID.ROW_PITCH : PANEL_GRID.CONTROL_HEIGHT}
                        onSelect={choose(onEnterAr)}
                    />
                ) : null}
            </Menu.Dropdown>
        </Menu>
    );
}
