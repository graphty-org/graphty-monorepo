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
 *   own `VIEWS_MENU_GAP`, so the two readings cannot drift apart.
 * - It is right-edge aligned to the Views button rather than centred on it: a
 *   transient surface inherits both axes from its opener -- a gap on the side it
 *   opens from, a shared edge line on the other.
 * - It is 248 wide, under the 280 threshold, so it carries an 8 px caret on the edge
 *   that faces its opener, clamped 12 px inside the menu's corner.
 * - It is clamped 12 px inside the canvas's edges and scrolls internally above that.
 * - It paints at `CANVAS_MENU_Z_INDEX`, over the bar's own.
 *
 * Rows (SPEC:3589-3591, in this order): Reset view, Top, Front, Side, Isometric,
 * Follow selection | Save as view... | Minimap, Toolbar, Legend | the XR rows. The XR rows
 * are always drawn: one disabled "VR / AR" row when neither mode can be entered for the same
 * reason, otherwise Enter VR and Enter AR, each disabled with its own reason when it cannot be
 * entered, and Exit VR or Exit AR while the element presents one.
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

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK, UiGlyph, useNumberFormatter } from "@graphty/compact-mantine";
import type { CameraId } from "@graphty/graphty-element/catalog";
import type { XrCapability } from "@graphty/graphty-element/session";
import { ActionIcon, createScopedKeydownHandler, Menu, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { xrRows } from "../../../workspace/inspector/words";
import { keyChipFor } from "../bindings";
import { LEGEND_EMPTY_REASON } from "../canvas/legendAvailability";
import { ComingTag } from "../ComingTag";
import { CANVAS_MENU_Z_INDEX, type CanvasToolbarProfile } from "../constants";
import { MenuCaret } from "../MenuCaret";
import { ToolbarGlyph } from "./toolbarGlyphs";
import { ToolbarKeyChip } from "./ToolbarItem";
import {
    CANVAS_EDGE_CLAMP,
    VIEWS_MENU_CARET_CLAMP,
    VIEWS_MENU_CARET_SIZE,
    VIEWS_MENU_GAP,
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

/** The one XR row drawn when neither mode can be entered for the same reason. */
const XR_BOTH_LABEL = "VR / AR";

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
    /** Whether the legend is shown. */
    readonly legendShown: boolean;
    /**
     * Whether the legend has anything to draw, from
     * {@link legendAvailable}. False -- the state straight after a load, before any
     * algorithm run has painted an encoding -- draws the Legend row DISABLED with
     * {@link LEGEND_EMPTY_REASON} as its second line, because a row that reports
     * "checked" while the legend cannot exist reports a state the reader cannot see
     * (6.14, design line 6633). Defaults to true so a caller that has not measured its
     * channels draws the row exactly as it drew before this prop existed.
     */
    readonly legendAvailable?: boolean;
    /** Whether the toolbar is shown. Unchecking it hides this menu with the bar. */
    readonly toolbarShown: boolean;
    /** The element's XR facts (`session.capabilities.xr`): which modes can be entered, why not, and which is presenting. */
    readonly xr: XrCapability;
    /** Visible nodes, which the XR rows act on and name before they act. */
    readonly visibleNodeCount: number;
    /** Visible edges; the second half of the XR entry ceiling. */
    readonly visibleEdgeCount?: number;
    /** Reset view (Shift+0). */
    readonly onResetView: () => void;
    /** Top (7), Front (1), Side (3), by the element's own view names: "topView", "frontView", "sideView". */
    readonly onViewPreset: (preset: CameraId) => void;
    /** Toggle the toolbar. No binding fires this -- the palette row does. */
    readonly onToggleToolbar: () => void;
    /** Toggle the legend. The same action the L binding fires. */
    readonly onToggleLegend: () => void;
    /** Enter an immersive VR session. */
    readonly onEnterVr: () => void;
    /** Enter an immersive AR session. */
    readonly onEnterAr: () => void;
    /** Leave the immersive session the element is presenting. */
    readonly onExitXr: () => void;
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
        legendShown,
        legendAvailable = true,
        toolbarShown,
        xr,
        visibleNodeCount,
        visibleEdgeCount = 0,
        onResetView,
        onViewPreset,
        onToggleToolbar,
        onToggleLegend,
        onEnterVr,
        onEnterAr,
        onExitXr,
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
            offset={VIEWS_MENU_GAP}
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
                    disabled={opened}
                    label={VIEWS_LABEL}
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
                        onViewPreset("topView");
                    })}
                />
                <ViewsMenuRow
                    label="Front"
                    glyph={<ToolbarGlyph name="viewFront" size={glyphSize} />}
                    keyChip={keyChipFor("viewFront")}
                    onSelect={choose(() => {
                        onViewPreset("frontView");
                    })}
                />
                <ViewsMenuRow
                    label="Side"
                    glyph={<ToolbarGlyph name="viewSide" size={glyphSize} />}
                    keyChip={keyChipFor("viewSide")}
                    onSelect={choose(() => {
                        onViewPreset("sideView");
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

                {/* Unshipped until graphty-element publishes node positions and camera
                    changes for it to project (#293). */}
                <ViewsMenuRow label="Minimap" coming />
                <ViewsMenuRow
                    label="Toolbar"
                    checked={toolbarShown}
                    glyph={toolbarShown ? <UiGlyph name="check" size={glyphSize} /> : undefined}
                    onSelect={choose(onToggleToolbar)}
                />
                {/*
                    The Legend row keeps its name, its check mark and its arrow-key place
                    when the legend cannot be drawn, and says why on the row itself. The
                    check mark is NOT stripped: it still reports the remembered boolean
                    truthfully, and the second line is what tells the reader that the
                    remembered boolean is not the thing deciding anything right now
                    (floor item 4; design line 6641). A disabled row stays in the ring
                    that `rowKeydownHandler` walks, so keyboard traversal counts do not
                    change -- which is what this file's own row comment already requires
                    of a row that cannot be acted on.
                */}
                <ViewsMenuRow
                    label="Legend"
                    secondLine={legendAvailable ? undefined : LEGEND_EMPTY_REASON}
                    checked={legendShown}
                    glyph={legendShown ? <UiGlyph name="check" size={glyphSize} /> : undefined}
                    keyChip={keyChipFor("toggleLegend")}
                    disabled={!legendAvailable}
                    height={legendAvailable ? PANEL_GRID.CONTROL_HEIGHT : PANEL_GRID.ROW_PITCH}
                    onSelect={onToggleLegend}
                />

                <ViewsMenuSeparator />

                {xr.active === null ? (
                    xrRows(xr).map(({ mode, reason }) => {
                        if (mode === "both") {
                            return (
                                <ViewsMenuRow
                                    key={mode}
                                    label={XR_BOTH_LABEL}
                                    secondLine={reason ?? undefined}
                                    glyph={<ToolbarGlyph name="enterVr" size={glyphSize} />}
                                    disabled
                                    height={PANEL_GRID.ROW_PITCH}
                                />
                            );
                        }

                        const vr = mode === "vr";
                        const verb = vr ? ENTER_VR_LABEL : ENTER_AR_LABEL;
                        // The gate's readiness count rides on Enter VR; Enter AR carries it only to say why it is refused.
                        const secondLine = reason ?? (vr || xrBlocked ? readiness : undefined);

                        return (
                            <ViewsMenuRow
                                key={mode}
                                label={reason === null ? xrRowLabel(verb, xrState) : verb}
                                secondLine={secondLine}
                                glyph={<ToolbarGlyph name={vr ? "enterVr" : "enterAr"} size={glyphSize} />}
                                disabled={reason !== null || xrBlocked}
                                height={secondLine === undefined ? PANEL_GRID.CONTROL_HEIGHT : PANEL_GRID.ROW_PITCH}
                                onSelect={choose(vr ? onEnterVr : onEnterAr)}
                            />
                        );
                    })
                ) : (
                    <ViewsMenuRow
                        label={`Exit ${xr.active.toUpperCase()}`}
                        glyph={<ToolbarGlyph name={xr.active === "vr" ? "enterVr" : "enterAr"} size={glyphSize} />}
                        onSelect={choose(onExitXr)}
                    />
                )}
            </Menu.Dropdown>
        </Menu>
    );
}
