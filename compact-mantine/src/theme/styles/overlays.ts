/**
 * The values the overlay theme extensions in ../components/overlays.ts hand Mantine: classNames
 * that point each part at the CSS in ../css/overlays.css.ts, the menu's vars, and the timing and
 * placement defaults of design/figma-spec.md section 8.
 *
 * Colors, radii, type and shadows live in the CSS, keyed on these classes and written in
 * tokens; nothing here is a color.
 */
/**
 * CSS variables for the Menu dropdown. The row type is the foundation's cm-menu-row (11/16), and
 * Mantine reads --menu-item-fz nowhere else, so it is kept at 11px for anything that does.
 *
 * One object for every render rather than a CompactSizeScale: Menu has no size prop to key a
 * scale on.
 */
export const compactMenuVars = {
    "--menu-item-fz": "11px",
} as const;

/** The Menu parts, pointed at the foundation's dark menu primitives and this package's rules. */
export const compactMenuClassNames = {
    dropdown: "cm-menu-surface cm-menu",
    item: "cm-menu-row cm-menu-item",
    itemLabel: "cm-menu-item-label",
    itemSection: "cm-menu-item-section",
    label: "cm-menu-label",
    divider: "cm-menu-divider",
} as const;

/** How far a menu or a tooltip is kept inside the viewport, in px (Figma: 6). */
export const VIEWPORT_MARGIN = 6;

/**
 * The size middleware's `apply`: clamp the floating element's height to what is left of the
 * viewport, so a long menu scrolls instead of running off the screen.
 * @param state - floating-ui's size state
 * @param state.availableHeight - the height left between the anchor and the viewport margin
 * @param state.elements - the floating elements
 * @param state.elements.floating - the dropdown
 */
function clampMenuHeight({
    availableHeight,
    elements,
}: {
    availableHeight: number;
    elements: { floating: HTMLElement };
}): void {
    elements.floating.style.maxHeight = `${Math.max(0, Math.floor(availableHeight))}px`;
}

/**
 * Menu placement middlewares: flip when there is no room, shift and clamp 6px inside the
 * viewport.
 */
export const compactMenuMiddlewares = {
    flip: true,
    shift: { padding: VIEWPORT_MARGIN },
    size: { padding: VIEWPORT_MARGIN, apply: clampMenuHeight },
};

/**
 * A submenu sits 4px beside its parent menu with its first row level with the parent row: the
 * submenu's own 8px top padding is taken back on the alignment axis.
 */
export const compactSubmenuOffset = { mainAxis: 4, alignmentAxis: -8 } as const;

/** Every overlay opens and closes in one frame (spec 2.8). */
export const NO_TRANSITION = { duration: 0 } as const;

/** Tooltip timing (spec 8.3): 1000 ms cold, 300 ms hide. */
export const TOOLTIP_OPEN_DELAY = 1000;
/** How long a tooltip stays after the pointer leaves, in ms; the warm window. */
export const TOOLTIP_CLOSE_DELAY = 300;

/**
 * The tooltip arrow's square side, in px. Mantine draws the arrow as a square rotated 45
 * degrees half inside the bubble, so the part outside the bubble is a triangle side * sqrt 2 wide
 * and side / sqrt 2 tall: 8.5 gives 12 x 6 (6 x 12 beside). Figma's element below the trigger
 * is 14 x 7, but it overlaps the bubble by 1px (`tooltip--arrowInset`, box 819-826 against a
 * bubble starting at 825 in dark-theme/dark-tooltip-effect-row-icon), so what shows outside the
 * bubble is the same 12 x 6 triangle, its tip on the trigger's edge 6px away. Beside, Figma's
 * 6 x 12 has no inset.
 */
export const TOOLTIP_ARROW_SIZE = 8.5;

/** The gap between a tooltip bubble and its trigger, in px (Figma: 6). */
export const TOOLTIP_GAP = 6;

/**
 * The Tooltip `offset` that yields that gap: Mantine adds half the arrow size to `offset` when
 * the arrow is shown (@mantine/core Tooltip: `offset + (withArrow ? arrowSize / 2 : 0)`).
 */
export const TOOLTIP_OFFSET = TOOLTIP_GAP - TOOLTIP_ARROW_SIZE / 2;

/** The Tooltip parts. */
export const compactTooltipClassNames = {
    tooltip: "cm-tooltip",
    arrow: "cm-tooltip-arrow",
} as const;

/** The Popover and HoverCard parts: the light popover shell. */
export const compactPopoverClassNames = {
    dropdown: "cm-popover-surface cm-popover",
    arrow: "cm-popover-arrow",
} as const;

/** The Modal parts. */
export const compactModalClassNames = {
    root: "cm-modal",
    overlay: "cm-modal-overlay",
    content: "cm-modal-content",
    header: "cm-modal-header",
    title: "cm-modal-title",
    close: "cm-modal-close",
    body: "cm-modal-body",
} as const;

/** The Notification parts: the toast pill. */
export const compactNotificationClassNames = {
    root: "cm-toast",
    icon: "cm-toast-icon",
    body: "cm-toast-body",
    title: "cm-toast-title",
    description: "cm-toast-description",
    closeButton: "cm-toast-close",
} as const;

/** The ScrollArea parts: the overlay scrollbar. */
export const compactScrollAreaClassNames = {
    root: "cm-scroll-root",
    viewport: "cm-scroll-viewport",
    scrollbar: "cm-scroll-scrollbar",
    thumb: "cm-scroll-thumb",
    corner: "cm-scroll-corner",
} as const;

/** The overlay scrollbar's track width, in px (thumb 6 inside 2px padding). */
export const SCROLLBAR_SIZE = 10;
