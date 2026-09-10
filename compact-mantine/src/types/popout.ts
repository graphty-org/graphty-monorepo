import type { ReactNode, RefObject, SyntheticEvent } from "react";

import type {
    ActivationHandler,
    ChangeHandler,
    DisclosureProps,
    GestureChangeHandler,
    GestureEndHandler,
    GestureStartHandler,
} from "./events";

/**
 * One tab of a pop-out panel's tab strip.
 */
interface PopoutTab {
    /**
     * What this tab is called in the panel's own state, and the key React draws
     * the strip from. Any string, as long as no other tab in the same panel
     * uses it.
     */
    id: string;
    /** The word on the tab. One or two words, sentence case. */
    label: string;
    /** What the panel shows while this tab is the selected one. */
    content: ReactNode;
}

/**
 * One button in a pop-out panel's header, beside its close button.
 */
interface PopoutHeaderAction {
    /** The key React draws the row of buttons from. Any string unique within the panel. */
    id: string;
    /** The drawing on the button. It is hidden from a screen reader, which reads `label` instead. */
    icon: ReactNode;
    /**
     * What the button does, such as `"Reset to defaults"`.
     *
     * The button is icon-only, so this is its accessible name and there is no
     * other text to fall back on. Write it as a phrase a person would
     * recognise.
     */
    label: string;
    /**
     * Called when the button is activated, by a pointer or from the keyboard.
     *
     * The event is passed on so that you can read modifier keys, call
     * `preventDefault`, or find the element that was activated.
     */
    onClick: ActivationHandler;
}

/**
 * A pop-out panel's header when it is a single title.
 */
interface PopoutTitleHeaderConfig {
    /** Which shape the header takes. `"title"` draws one line of text. */
    variant: "title";
    /**
     * What the panel is called, drawn across its header.
     *
     * It is also the panel's accessible name, so write what the panel is for
     * rather than the word "settings".
     */
    title: string;
}

/**
 * A pop-out panel's header when it is a strip of tabs.
 */
interface PopoutTabbedHeaderConfig {
    /** Which shape the header takes. `"tabs"` draws a strip of choices. */
    variant: "tabs";
    /**
     * The tabs, in the order they are drawn. Two to four: a strip of more than
     * that is a panel that should have been two panels.
     */
    tabs: PopoutTab[];
    /**
     * Which tab the panel opens on, by `id`. Defaults to the first one.
     *
     * The panel forgets which tab was selected when it closes, so a reopened
     * panel starts here again.
     */
    defaultTab?: string;
    /**
     * Called when a different tab is selected, with its `id` first.
     *
     * The panel keeps the selection itself, so this is for a caller who wants
     * to know rather than one who has to answer.
     */
    onTabChange?: ChangeHandler<string>;
}

/**
 * What a pop-out panel draws across its top: either one title, or a strip of
 * tabs.
 *
 * Whichever it is, the header is also the panel's drag handle and carries its
 * close button, and it is what names the panel for a screen reader.
 */
export type PopoutHeaderConfig = PopoutTitleHeaderConfig | PopoutTabbedHeaderConfig;

/**
 * Where the pop-out panel sits relative to what it is anchored to.
 *
 * `"start"` and `"end"` follow the reading direction: they resolve to left and
 * right where text runs left to right, and swap where it runs right to left.
 * Prefer them over `"left"` and `"right"`, which always mean the physical side
 * whichever way text runs.
 */
export type PopoutPlacement = "left" | "right" | "top" | "bottom" | "start" | "end";

/**
 * A placement with the reading direction already resolved, so it names a
 * physical side of the anchor.
 */
export type PopoutPhysicalPlacement = "left" | "right" | "top" | "bottom";

/**
 * Alignment of the popout panel along the axis it is placed against.
 *
 * For a panel placed to the left or right, this is the vertical axis:
 * - "start": the panel's top edge meets the top of what it aligns to
 * - "center": the panel is centred on it
 * - "end": the panel's bottom edge meets its bottom
 *
 * For a panel placed above or below, this is the horizontal axis, and "start"
 * and "end" follow the reading direction rather than naming a physical side.
 */
export type PopoutAlignment = "start" | "center" | "end";

/**
 * What one axis of a pop-out panel lines up with.
 *
 * Either a ref to any element on the page, or one of three elements the
 * component already knows about:
 * - `"trigger"`: the control that opened the panel;
 * - `"parent"`: the pop-out panel this one opened from, for a nested panel;
 * - `"panel"`: the container marked with `Popout.Anchor`, such as a sidebar.
 */
export type PopoutAnchorTarget = RefObject<HTMLElement | null> | "parent" | "panel" | "trigger";

/**
 * Props for the PopoutPanel component.
 */
export interface PopoutPanelProps {
    /**
     * The panel's minimum width in pixels.
     *
     * Content wider than this widens the panel rather than being clipped, and
     * the panel's position is worked out from the width it actually renders at,
     * so a panel that grows still meets the edge it is aligned to.
     */
    width: number;
    /**
     * The panel's height in pixels.
     *
     * Only needed for a panel placed above or below its anchor, where the
     * height is what decides how far up or down it has to start. A panel placed
     * to one side takes its height from its content.
     */
    height?: number;
    /**
     * The panel's header: either a title or a strip of tabs.
     *
     * The header is also the panel's drag handle and carries its close button.
     * Leave it out for a panel with no chrome of its own -- an explanation
     * bubble, for instance -- and give `label` instead, so the panel still has
     * an accessible name.
     */
    header?: PopoutHeaderConfig;
    /**
     * The panel's accessible name, used when there is no header to name it.
     *
     * Ignored when `header` is supplied, since the header's title names the
     * panel already.
     */
    label?: string;
    /**
     * What the panel holds. Wrap it in `Popout.Content` for the panel's own
     * padding, or pass your own layout to fill the panel edge to edge.
     */
    children?: ReactNode;
    /**
     * The element the panel lines up with, on both axes at once.
     * @deprecated Use `anchorX` and `anchorY`, which set the two axes
     * separately. Passing a ref here still aligns both axes to that element.
     */
    anchorRef?: RefObject<HTMLElement | null>;
    /**
     * What the panel's horizontal position lines up with.
     *
     * Defaults to the pop-out this one opened from, then to the container
     * marked with `Popout.Anchor`, then to the trigger. That default is what
     * makes a stack of nested panels step out one level at a time instead of
     * collapsing onto the same edge.
     */
    anchorX?: PopoutAnchorTarget;
    /**
     * What the panel's vertical position lines up with.
     *
     * Defaults to the trigger, so a panel opens level with the row that opened
     * it however far away the edge it aligns to horizontally happens to be.
     */
    anchorY?: PopoutAnchorTarget;
    /**
     * Which side of the anchor the panel sits on.
     * @default "left"
     */
    placement?: PopoutPlacement;
    /**
     * Alignment along the axis the panel is placed against.
     * @default "start"
     */
    alignment?: PopoutAlignment;
    /**
     * Gap between the panel and the anchor, in pixels. Negative values overlap
     * the two so their borders meet exactly.
     *
     * Defaults to 0 for a panel opened from the page, and to 4 for a panel
     * opened from inside another panel, so a stack of nested panels shows a
     * consistent step.
     */
    gap?: number;
    /**
     * The panel's own buttons, drawn in its header before the close button.
     *
     * Each is icon-only and takes its accessible name from its `label`. Leave
     * it out for a panel whose only chrome is a title and a close button.
     */
    actions?: PopoutHeaderAction[];
    /**
     * Whether opening the panel moves keyboard focus into it, and closing it
     * returns focus to the trigger.
     *
     * Turn this off for a panel that opens on hover, where taking focus away
     * from what the person is doing would be an interruption.
     * @default true
     */
    manageFocus?: boolean;
    /** Called when the person starts dragging the panel by its header. */
    onDragStart?: GestureStartHandler;
    /**
     * Called repeatedly while the panel is being dragged, with how far it has
     * moved from where it opened.
     */
    onDrag?: GestureChangeHandler<PopoutPosition>;
    /** Called when the drag finishes. Commit an undo transaction here. */
    onDragEnd?: GestureEndHandler;
}

/**
 * Props for the Popout component.
 */
export interface PopoutProps extends DisclosureProps {
    /**
     * The pop-out's parts: one `Popout.Trigger` wrapping the control that opens
     * it, and one `Popout.Panel` holding what it shows.
     */
    children: ReactNode;
}

/**
 * Props for the PopoutTrigger component.
 */
export interface PopoutTriggerProps {
    /**
     * The single element that opens the panel.
     *
     * Give it a real button: the wrapper attaches a click handler, a ref and
     * the ARIA that ties the control to the panel, but adds no keyboard
     * handling of its own, so anything that is not focusable leaves the pop-out
     * unreachable from the keyboard.
     */
    children: ReactNode;
    /**
     * What activating the trigger does: `"toggle"` opens a closed panel and
     * closes an open one; `"open"` only ever opens it.
     *
     * Use `"open"` for a pop-out that also opens on hover, where the click that
     * follows the pointer arriving would otherwise close it again.
     * @default "toggle"
     */
    action?: "toggle" | "open";
}

/**
 * Props for the PopoutContent component.
 */
export interface PopoutContentProps {
    /** What the panel shows, laid out inside the panel's own padding. */
    children: ReactNode;
}

/**
 * Props for the PopoutHeader component.
 *
 * The panel builds these from its own `header` prop, so a caller composing a
 * pop-out out of `Popout.Trigger` and `Popout.Panel` never writes them.
 */
export interface PopoutHeaderProps {
    /** What the header draws: one title, or a strip of tabs. */
    config: PopoutHeaderConfig;
    /**
     * Closes the panel. The event is optional because a panel is also closed in
     * code, by an Escape handler elsewhere or by a route change.
     */
    onClose: (event?: SyntheticEvent) => void;
    /**
     * The properties that make the whole header a drag handle, supplied by the
     * panel.
     */
    dragTriggerProps?: Record<string, unknown>;
    /** The panel's own buttons, drawn before the close button. */
    actions?: PopoutHeaderAction[];
    /**
     * Which tab is selected, by `id`. The panel holds the selection, so the
     * header is always driven rather than remembering it.
     */
    activeTab?: string;
    /** Called when a different tab is selected, with its `id` first. */
    onTabChange?: ChangeHandler<string>;
    /**
     * The id put on the title element, which is what the panel points
     * `aria-labelledby` at.
     */
    titleId?: string;
}

/**
 * Where a pop-out panel sits, in viewport pixels.
 *
 * These are the coordinates a fixed-position element is placed at, measured
 * from the top left of the viewport in both text directions -- the panel's
 * anchoring has already been resolved by the time a position exists, so there
 * is nothing left here for the reading direction to flip.
 */
export interface PopoutPosition {
    /** How far the panel's left edge is from the left of the viewport. */
    left: number;
    /** How far the panel's top edge is from the top of the viewport. */
    top: number;
}

/**
 * What one pop-out publishes to the parts inside it.
 *
 * A trigger, a panel and anything else written inside a `Popout` read this to
 * find the open state and the handles that change it.
 */
export interface PopoutContextValue {
    /** This pop-out's own id, which the manager keys its place in the stack by. */
    id: string;
    /** Whether the panel is open. */
    isOpen: boolean;
    /** Opens the panel. Pass the event that caused it, when there is one. */
    open: (event?: SyntheticEvent) => void;
    /** Closes the panel. Pass the event that caused it, when there is one. */
    close: (event?: SyntheticEvent) => void;
    /** Opens a closed panel and closes an open one. Pass the event that caused it, when there is one. */
    toggle: (event?: SyntheticEvent) => void;
    /** The trigger element, which the panel measures its position against. */
    triggerRef: RefObject<HTMLElement | null>;
    /**
     * The id of the pop-out this one was opened from, or null when it was
     * opened from the page. It is what makes closing an outer panel close
     * everything opened from it.
     */
    parentId: string | null;
}

/**
 * What the shared floating layer publishes to every pop-out beneath it.
 *
 * A `PopoutManager` owns the stacking order, the family tree of nested panels
 * and the element they are all drawn into. Reading this is how a pop-out takes
 * part in the dismissal rules the whole page obeys; a consumer composing panels
 * out of `Popout` never needs it.
 */
export interface PopoutManagerContextValue {
    /** Adds a pop-out to the layer, with the callback that closes it and the pop-out it was opened from. */
    register: (id: string, closeCallback: () => void, parentId?: string | null) => void;
    /** Takes a pop-out out of the layer, when it leaves the page. */
    unregister: (id: string) => void;
    /** The stacking order a pop-out currently draws at. */
    getZIndex: (id: string) => number;
    /** Puts a pop-out in front of every other one. */
    bringToFront: (id: string) => void;
    /**
     * The element the panels are drawn into. It is not assumed to be the
     * document body, so a pop-out works inside a dialog or a shadow root.
     */
    portalContainer: HTMLElement | null;
    /** Changes whenever the stacking order does, which is what re-renders the panels that moved. */
    zIndexVersion: number;
    /** Closes the innermost open pop-out. This is what Escape does. */
    closeFocused: () => void;
    /** Closes every open pop-out. This is what a click outside does. */
    closeAll: () => void;
    /** Whether any pop-out is open at all. */
    hasOpenPopouts: () => boolean;
    /** Closes one pop-out and everything opened from it. */
    closeWithDescendants: (id: string) => void;
    /** Closes everything opened from one pop-out, leaving that pop-out open. */
    closeDescendants: (id: string) => void;
    /**
     * Closes the pop-outs opened from the same place as this one, and
     * everything opened from those. This is what makes opening one panel put
     * away the panel beside it.
     */
    closeSiblings: (id: string, parentId: string | null) => void;
    /** The pop-out one was opened from, or null when it was opened from the page. */
    getParentId: (id: string) => string | null;
    /** Whether one pop-out was opened from another, at any depth. */
    isAncestor: (ancestorId: string, descendantId: string) => boolean;
}
