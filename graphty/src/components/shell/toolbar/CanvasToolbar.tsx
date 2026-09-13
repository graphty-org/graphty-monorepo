/**
 * The bottom-centre canvas toolbar.
 *
 * One horizontal floating bar, centred on the LIVE CANVAS RECT -- never on the window
 * -- and riding above its bottom edge on the offset ladder the canvas region owns
 * (`canvasToolbarBottomOffset`). Order, left to right, by how long an effect lasts
 * (SPEC:3504-3509): `[2D | 3D]`, a divider, Zoom out, Zoom in, Zoom to fit, Zoom to
 * selection, a divider, Views. Zoom OUT precedes zoom IN because magnitude increases
 * rightward.
 *
 * The item set is FIXED (SPEC:3511-3517). Nothing appears or disappears with
 * selection or state, because a centred container that changes width moves every item
 * under the pointer: Zoom to selection is permanently drawn and merely disables,
 * carrying the register's exact disabled title. For the same reason the bar carries no
 * zoom percentage -- the status bar owns that fact, and a readout would change the
 * bar's width between 10% and 1000% -- and no pointer, hand or zoom tool modes.
 *
 * Two sizes and nothing else changes between them (SPEC:3534): 246 x 36 at and above
 * 1280 px, 274 x 40 below it. Neither total is written down here. The bar's width is
 * the sum of the parts it draws, and `canvasToolbarWidth` is the same sum over the
 * same profile, which is what the geometry test compares.
 *
 * TWO-VALUE EXCEPTION, recorded deliberately (SPEC:3534-3539): this bar is the ONLY
 * canvas overlay that carries the tooltip shadow token, and the only one whose corner
 * is 7 rather than the register's 4. The 7 is concentric -- 3 px of container padding
 * around a 4 px item radius -- so the two curves stay parallel. The minimap and the
 * legend stay flat at radius 4 with no shadow. This is two values, not a general
 * "floating" style, and nothing else on the canvas may copy it.
 *
 * The bar takes NO key binding of its own and is never on the Escape ladder
 * (SPEC:3581-3587). Hiding it hides its own Views menu with it, so the way back is
 * the command palette row "Show canvas toolbar" -- which is why the Views menu's
 * Toolbar row has no chip and this component renders nothing at all once the row is
 * unchecked.
 *
 * A tap on the bar is NOT a tap on the canvas (SPEC:411-413): the bar is drawn inside
 * the canvas element, so below 1280 px a tap on Zoom to fit must not dismiss the open
 * panel. The container stops the pointer before the canvas's own tap handler sees it.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";

import { keyChipFor } from "../bindings";
import { CANVAS_TOOLBAR_Z_INDEX,type CanvasToolbarProfile } from "../constants";
import type { CanvasToolbarProps } from "../types";
import { ToolbarGlyph } from "./toolbarGlyphs";
import { ToolbarItem } from "./ToolbarItem";
import { canvasToolbarProfileFor, toolbarItemTitle } from "./toolbarMetrics";
import { ViewModeSegment } from "./ViewModeSegment";
import { ViewsMenu,type ViewsMenuProps } from "./ViewsMenu";

/** The bar's accessible name -- the name the spec and the palette row both use. */
export const CANVAS_TOOLBAR_LABEL = "Canvas toolbar";

/**
 * Zoom out's plain name, the 5.6 table's own words. The one home for the 5.6 wording, so
 * anything finding the control by name quotes it rather than retyping it.
 * @public
 */
export const ZOOM_OUT_LABEL = "Zoom out";

/**
 * Zoom in's plain name. Public with the other three zoom names, whose wording the 5.6 table
 * fixes.
 * @public
 */
export const ZOOM_IN_LABEL = "Zoom in";

/**
 * Zoom to fit's plain name. Public with the other three zoom names, whose wording the 5.6 table
 * fixes.
 * @public
 */
export const ZOOM_TO_FIT_LABEL = "Zoom to fit";

/**
 * Zoom to selection's plain name. Public with the other three zoom names; the reason it carries
 * while disabled is the constant below.
 * @public
 */
export const ZOOM_TO_SELECTION_LABEL = "Zoom to selection";

/**
 * Why Zoom to selection is inoperable, verbatim (SPEC:3513-3515). With the label and
 * the chip it makes the register's disabled title,
 * "Zoom to selection (F). Select something first".
 *
 * Public with the label it pairs with, so the disabled title is read from one place.
 * @public
 */
export const ZOOM_TO_SELECTION_DISABLED_REASON = "Select something first";

/**
 * The tooltip shadow token, and the second half of the two-value exception above.
 *
 * The app's theme publishes no separate tooltip shadow, so the token used is the
 * nearest Mantine one; it is named here, once, so the exception stays one decision
 * rather than a literal sprayed across the bar.
 */
const CANVAS_TOOLBAR_SHADOW = "var(--mantine-shadow-md)";

/**
 * Everything the Views menu needs that the frozen `CanvasToolbarProps` does not
 * carry: what is shown, what XR the browser reports, and each row's action.
 */
export type CanvasToolbarViewsProps = Omit<ViewsMenuProps, "onOpenChange" | "opened" | "profile">;

/**
 * Props of {@link CanvasToolbar}: the shell's frozen contract plus the Views menu's
 * own rows.
 */
export interface CanvasToolbarComponentProps extends CanvasToolbarProps {
    /** The Views menu's state and actions. */
    readonly views: CanvasToolbarViewsProps;
}

/**
 * Keeps a press on the bar off the canvas. The bar lives inside the canvas element,
 * and below 1280 px a tap on the canvas closes an open overlay.
 * @param event - the pointer or mouse event the bar received.
 */
function stopCanvasTap(event: React.SyntheticEvent): void {
    event.stopPropagation();
}

interface ToolbarDividerProps {
    readonly profile: CanvasToolbarProfile;
}

/**
 * One divider slot: an item-tall box carrying a 1 x 16 rule.
 * @param props - the size profile in force.
 * @returns the divider slot.
 */
function ToolbarDivider(props: ToolbarDividerProps): React.JSX.Element {
    const { profile } = props;

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: profile.dividerSlotWidth,
                height: profile.itemSize,
                flex: "0 0 auto",
            }}
        >
            <div
                style={{
                    width: profile.dividerRuleWidth,
                    height: profile.dividerRuleHeight,
                    background: PANEL_INK.DIVIDER,
                }}
            />
        </div>
    );
}

/**
 * The canvas toolbar.
 * @param props - the view mode, the four zoom actions, the offset ladder's current rung, the size profile, and the Views menu.
 * @returns the bar, or null when it is not drawn -- with the drawer maximised, or with its own Views row unchecked.
 */
export function CanvasToolbar(props: CanvasToolbarComponentProps): React.JSX.Element | null {
    const {
        viewMode,
        onViewModeChange,
        zoomToSelectionEnabled,
        onZoomOut,
        onZoomIn,
        onZoomToFit,
        onZoomToSelection,
        bottomOffset,
        profileId,
        viewsMenuOpen,
        onViewsMenuOpenChange,
        views,
    } = props;

    // Two ways the bar is not drawn, and both take the Views menu with them: the
    // drawer maximised to the full canvas height (the whole bar leaves with the
    // minimap and the legend, and returns on restore), and the Views menu's own
    // Toolbar row unchecked.
    if (bottomOffset === null || !views.toolbarShown) {
        return null;
    }

    const profile = canvasToolbarProfileFor(profileId);
    const zoomToSelectionChip = keyChipFor("zoomToSelection");

    return (
        <div
            role="toolbar"
            aria-label={CANVAS_TOOLBAR_LABEL}
            aria-orientation="horizontal"
            onPointerDown={stopCanvasTap}
            onClick={stopCanvasTap}
            style={{
                position: "absolute",
                left: "50%",
                bottom: bottomOffset,
                transform: "translateX(-50%)",
                display: "inline-flex",
                alignItems: "center",
                height: profile.height,
                padding: profile.containerPadding,
                borderRadius: profile.containerRadius,
                background: PANEL_INK.PANEL,
                border: `${profile.borderWidth}px solid ${PANEL_INK.BORDER}`,
                boxShadow: CANVAS_TOOLBAR_SHADOW,
                zIndex: CANVAS_TOOLBAR_Z_INDEX,
                boxSizing: "border-box",
            }}
        >
            <ViewModeSegment value={viewMode} profile={profile} onChange={onViewModeChange} />

            <ToolbarDivider profile={profile} />

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: profile.zoomItemGap,
                    flex: "0 0 auto",
                }}
            >
                {/* Zoom out before zoom in: magnitude increases rightward. */}
                <ToolbarItem
                    title={toolbarItemTitle(ZOOM_OUT_LABEL, keyChipFor("zoomOut"))}
                    keyChip={keyChipFor("zoomOut")}
                    glyph={<ToolbarGlyph name="zoomOut" size={profile.glyphSize} />}
                    profile={profile}
                    onClick={onZoomOut}
                />
                <ToolbarItem
                    title={toolbarItemTitle(ZOOM_IN_LABEL, keyChipFor("zoomIn"))}
                    keyChip={keyChipFor("zoomIn")}
                    glyph={<ToolbarGlyph name="zoomIn" size={profile.glyphSize} />}
                    profile={profile}
                    onClick={onZoomIn}
                />
                <ToolbarItem
                    title={toolbarItemTitle(ZOOM_TO_FIT_LABEL, keyChipFor("zoomToFit"))}
                    keyChip={keyChipFor("zoomToFit")}
                    glyph={<ToolbarGlyph name="zoomToFit" size={profile.glyphSize} />}
                    profile={profile}
                    onClick={onZoomToFit}
                />
                {/* Permanently drawn, never removed: it disables and says why. */}
                <ToolbarItem
                    title={toolbarItemTitle(
                        ZOOM_TO_SELECTION_LABEL,
                        zoomToSelectionChip,
                        zoomToSelectionEnabled ? undefined : ZOOM_TO_SELECTION_DISABLED_REASON,
                    )}
                    keyChip={zoomToSelectionChip}
                    glyph={<ToolbarGlyph name="zoomToSelection" size={profile.glyphSize} />}
                    disabled={!zoomToSelectionEnabled}
                    profile={profile}
                    onClick={onZoomToSelection}
                />
            </div>

            <ToolbarDivider profile={profile} />

            <ViewsMenu
                {...views}
                opened={viewsMenuOpen}
                onOpenChange={onViewsMenuOpenChange}
                profile={profile}
            />
        </div>
    );
}
