import { Box, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { useHover, useMediaQuery } from "@mantine/hooks";
import React, { useId, useState } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { type ActivationHandlerWithMeta, getActivationMeta } from "../../types/events";
import { useDevWarning } from "../../utils/dev-warning";
import { liveRegionProps,type LiveSetting } from "../../utils/live-region";

// RT-7 in the internal vocabulary. Nothing below says so in a `/** */`, because
// that text is compiled into dist/index.d.ts and into the Storybook prop
// tables, where a stranger reads it.

/**
 * The gap between two affordances of one cluster.
 *
 * Tighter than `PANEL_GRID.TRAIL_GAP`, which is the distance between a row's
 * body and its trailing slot: the glyphs at the end of an action row are one
 * group rather than two parts of the grid, so they pack at 4px.
 */
const AFFORDANCE_GAP = 4;

/**
 * The media query that says the pointer cannot hover.
 *
 * On a touch screen there is no hover state to reveal anything, so every
 * hidden action becomes resident. This is read as a hook rather than as a CSS
 * `@media` block because the package ships no stylesheet.
 */
const NO_HOVER = "(hover: none)";

/**
 * Props for the ActionRow component.
 */
export interface ActionRowProps {
    /**
     * What the row reports: a count, a status, a record of the last run.
     *
     * Always drawn, at the leading edge, in the secondary text colour, and
     * truncated with an ellipsis rather than wrapped -- the row is 32px and
     * stays 32px. Only the drawing is truncated: the text itself is complete in
     * the document, so a screen reader reads all of it however little of it
     * fits. Pass `stateTitle` as well when what you draw is genuinely shorter
     * than what you mean.
     */
    state?: React.ReactNode;
    /**
     * The complete reading, for when `state` does not contain all of it.
     *
     * Use it when `state` is markup rather than plain text, or when what the
     * row draws is an abbreviation of what it means. It becomes the row's
     * tooltip, and it is what a screen reader reads in place of the drawing --
     * so the full reading is reachable without a pointer, which a tooltip on
     * its own is not.
     *
     * A plain-text `state` needs none of this: it is already complete, and it
     * is used as its own tooltip.
     */
    stateTitle?: string;
    /**
     * Whether the reading is still being worked out by something that finishes
     * later, such as a background job.
     *
     * Supplying it at all -- `busy={isRunning}`, true or false -- is how you
     * say the reading arrives late, and that is what makes it a live region a
     * screen reader announces. Pass it for the whole life of the row rather
     * than only while the job is in flight: a live region has to be in the
     * document before the change it announces, so one that gains the prop at
     * the same moment it gains its reading announces nothing.
     *
     * While it is true the reading is marked busy, which holds the announcement
     * back until the job finishes. Leave it out for a reading the reader set
     * themselves, which needs no announcement and gets none.
     */
    busy?: boolean;
    /**
     * How urgently a screen reader announces the reading when it changes on its
     * own.
     *
     * Defaults to `"polite"` when `busy` is given and `"off"` when it is not.
     * Raise it to `"assertive"`, which interrupts whatever is being read, only
     * for a failure. Set it on a row that reports few things rather than on
     * every row of a list: a page of live regions all talking at once is
     * unusable.
     */
    live?: LiveSetting;
    /**
     * Controls that act: Run, Recompute, Copy, a button that opens the advanced
     * settings.
     *
     * Hidden until the row is hovered or something inside it is focused, and
     * always drawn where the pointer cannot hover. Hidden means faded out, not
     * unmounted: they keep their accessible names and their place in the tab
     * order, and any one of them reveals the whole cluster by taking focus.
     */
    actions?: React.ReactNode;
    /**
     * Controls that report a state as well as changing it: the crossed-out eye
     * on a hidden item, the pin on a pinned reading.
     *
     * Never hidden. A state that only appears on hover is a state nobody can
     * scan a column for.
     */
    residentActions?: React.ReactNode;
    /**
     * Forces `actions` to be drawn, or forces them hidden, instead of letting
     * the row decide from hover and focus.
     *
     * Leave it out for the usual behaviour. Set it to `true` while a menu or a
     * pop-out opened from this row is still open, so that the control which
     * opened it does not vanish the moment the pointer moves onto the thing it
     * opened.
     *
     * Focus outranks it in one direction only: `false` will not fade out a
     * control that currently has keyboard focus, because a focus ring nobody
     * can see is worse than an action nobody asked for.
     */
    actionsVisible?: boolean;
    /**
     * Called when the row itself is activated, by a click on its reading or by
     * Enter or Space when that reading has focus.
     *
     * Supplying it turns the reading into a button that fills the row, which is
     * how a row is made selectable. It is never called by a click on a control
     * in `actions` or `residentActions`; those have their own handlers.
     *
     * The event is passed so that a consumer can read modifier keys -- shift
     * for a range, the platform key for a second selection -- and call
     * `preventDefault`. The second argument says whether the activation came
     * from a pointer or from the keyboard, which is worth knowing because a
     * range selection has no meaning without a pointer.
     *
     * A row given `onClick` needs a `state` to name the button; one without is
     * reported in development.
     */
    onClick?: ActivationHandlerWithMeta;
    /**
     * Called when focus enters the row or moves between its controls.
     *
     * The row watches focus to reveal its hidden controls and passes the event
     * on untouched, so a consumer can watch it too.
     */
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    /**
     * Called when focus leaves a control in the row.
     *
     * Fires for a move between two controls of the same row as well as for a
     * move out of it; `event.relatedTarget` says which happened.
     */
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
}

/**
 * Reads the tooltip text out of a reading that is plain text.
 *
 * Markup has no single string to fall back on, so it gets none and the caller
 * supplies `stateTitle` instead.
 * @param state - The row's reading, as it was given
 * @returns The text of the reading, or undefined when it is markup
 */
function readingText(state: React.ReactNode): string | undefined {
    if (typeof state === "string") {
        return state;
    }

    if (typeof state === "number") {
        return String(state);
    }

    return undefined;
}

// Accessibility: the row is a container rather than a widget, so the pattern it
// follows is the ARIA `group` role, named from the reading it reports, rather
// than one of the APG's composite widgets. That name is what makes "Copy
// reading" mean something in a column of twenty identical rows. The APG
// "Toolbar" pattern was considered for the affordance cluster and rejected: a
// toolbar owns a roving tabindex over its children, and the children here
// belong to the caller, who is entitled to expect each of them in the tab
// order.
//
// The row's own activation is the APG "Button" pattern on a real <button>, so
// Enter, Space and the focus ring all come from the browser. It is the reading
// that becomes the button rather than the row, because role="button" on the row
// would make its own descendants presentational (ARIA 1.2, "children
// presentational: true") and take the affordances out of the accessibility tree
// -- the exact failure this component exists to avoid.
//
// The hover reveal is where WCAG bites. 1.4.13 (content on hover or focus) is
// satisfied by construction: the revealed controls sit in reserved layout space
// and obscure nothing, and they go away when the pointer or focus does. 2.1.1
// (keyboard) and 2.4.7 (focus visible) are the reason hiding is done with
// opacity -- the controls stay in the DOM, stay focusable, and reveal
// themselves on focus as well as on hover; they are also why focus outranks a
// caller's `actionsVisible={false}`, which would otherwise fade out the very
// control the focus ring is drawn on. 2.5.8 (target size) is why the reading,
// when it is the row's activation, is the full 32px height of the row.
//
// A tooltip is unreachable by keyboard and by touch, so it is never the only
// route to text. When the drawing is short of the meaning, the complete reading
// goes into the accessibility tree in a visually hidden element and the drawn
// abbreviation is taken out of it with aria-hidden -- so the name of the row,
// the name of its button and anything the live region announces are all the
// complete reading, and are said once rather than twice. `title` stays on top
// of that for the pointer.

/**
 * A 32px row that reports what something is doing and holds the controls for
 * doing something about it: a reading at the leading edge, a cluster of
 * controls at the trailing edge.
 *
 * **The hover split is the whole component.** A control that *acts* -- Run,
 * Recompute, Copy, a button that opens the advanced settings -- is hidden until
 * the row is reached, because a panel of resident verbs is a panel of noise.
 * Anything that *reports a state* is drawn always, because a state that only
 * appears on hover is a state nobody can scan a column for. A layers panel is
 * the model: the eye appears on hover, but a layer that is actually hidden
 * shows its crossed-out eye with no hover at all.
 *
 * Three things keep the split usable rather than merely tidy, and all three are
 * why this is a component instead of a CSS rule:
 *
 * - **A touch screen has no hover**, so where the pointer cannot hover every
 *   hidden control is drawn.
 * - **Hidden is not gone.** Hidden controls are faded out, never unmounted, so
 *   they keep their accessible names and their place in the tab order.
 * - **Focus reveals what hover reveals.** Tabbing into a hidden control shows
 *   it, because the row watches focus anywhere inside itself.
 *
 * Keep the word on a control that is genuinely a verb -- Run, Cancel, anything
 * destructive, anything ending in "anyway". Everything else is a 24px glyph
 * carrying its word as its tooltip and its accessible name.
 * @param props - Component props
 * @param props.state - What the row reports, drawn at the leading edge in the secondary text colour
 * @param props.stateTitle - The complete reading, for when `state` is markup or an abbreviation of what the row means
 * @param props.busy - Whether the reading is still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the reading when it changes on its own
 * @param props.actions - Controls that act, hidden until the row is hovered or focused, and always drawn where the pointer cannot hover
 * @param props.residentActions - Controls that report a state, which are never hidden
 * @param props.actionsVisible - Forces the hidden controls shown or hidden instead of letting hover and focus decide
 * @param props.onClick - Called when the row's own reading is activated, with the event and the activation source
 * @param props.onFocus - Called when focus enters the row or moves between its controls
 * @param props.onBlur - Called when focus leaves a control in the row
 * @returns The action row
 * @example
 * ```tsx
 * <ActionRow
 *     state="Running, 40%"
 *     live="polite"
 *     actions={<Button onClick={cancel}>Cancel</Button>}
 *     residentActions={<ActionIcon aria-label="Pinned to the panel"><UiGlyph name="pin" /></ActionIcon>}
 *     onClick={(event, meta) => { select(id, {extend: event.shiftKey, source: meta.source}); }}
 * />
 * ```
 */
export function ActionRow(props: ActionRowProps): React.JSX.Element {
    const { state, stateTitle, busy, live, actions, residentActions, actionsVisible, onClick, onFocus, onBlur } =
        props;

    const announcement = liveRegionProps(live, busy);

    // No stylesheet ships with this package, so hover is a hook, not a `:hover`.
    // The hook attaches its own native listeners to the row, so it neither sees
    // nor swallows anything a consumer passes.
    const { hovered, ref } = useHover<HTMLDivElement>();
    // Where hover does not exist, nothing may depend on it. The hook reports
    // `undefined` until its first effect has run, which is one render at the
    // hidden state and then the truth.
    const coarsePointer = useMediaQuery(NO_HOVER) ?? false;
    const [focusWithin, setFocusWithin] = useState(false);
    const readingId = useId();

    // The split: focus first, because a faded-out control with the focus ring on
    // it is a WCAG 2.4.7 failure whatever the caller asked for. Then the
    // caller's own answer, then hover, then a pointer that cannot hover.
    const revealed = focusWithin || (actionsVisible ?? (hovered || coarsePointer));

    const hasAffordances = actions !== undefined || residentActions !== undefined;
    const drawnText = readingText(state);
    // The drawing is short of the meaning: markup with a caller-supplied
    // reading, or a deliberate abbreviation of a longer one. Both need the full
    // text somewhere a screen reader will find it, because a `title` is
    // reachable by neither keyboard nor touch.
    const abbreviated = stateTitle !== undefined && stateTitle !== drawnText;
    const tooltip = stateTitle ?? drawnText;
    // A group with no name tells a screen reader nothing, so the role is only
    // worth having when the reading is there to name it.
    const isGroup = hasAffordances && state !== undefined;

    // What goes inside the reading element. When the drawing is complete it is
    // simply the drawing. When it is not, the drawing is marked decorative and
    // the complete text is put beside it where only a screen reader goes: the
    // element's accessible text is then the complete reading, which is what
    // names the group, names the button and is announced by the live region.
    const readingContent = abbreviated ? (
        <>
            <span aria-hidden="true">{state}</span>
            <VisuallyHidden data-testid="action-row-state-full">{stateTitle}</VisuallyHidden>
        </>
    ) : (
        state
    );

    // The row's activation is carried by its reading, so a row that reports
    // nothing has nothing to turn into a button -- and an unnamed button is a
    // WCAG 4.1.2 failure rather than a cosmetic one.
    useDevWarning(
        onClick !== undefined && state === undefined
            ? "ActionRow was given onClick but no state, and its own activation is carried by the text it " +
                  "reports. That text is also what names the row for a screen reader, so a row with nothing to " +
                  "report has nothing to activate. Give the row a state, or put the action on a control in actions."
            : undefined,
    );

    /**
     * Reveal the hidden controls when focus enters the row, so the keyboard
     * route shows the reader where they are, and hand the event on.
     * @param event - The focus event, passed through to the consumer untouched
     */
    const handleFocus = (event: React.FocusEvent<HTMLDivElement>): void => {
        setFocusWithin(true);
        onFocus?.(event);
    };

    /**
     * Hide them again when focus leaves the row altogether. Focus moving
     * between two controls of the same row is not leaving.
     * @param event - The focus event, whose related target is where focus went
     */
    const handleBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocusWithin(false);
        }

        onBlur?.(event);
    };

    /**
     * Report the row's own activation, with the source stated separately so the
     * consumer does not have to work out whether a click came from a key.
     * @param event - The click, which a browser also synthesises from Enter and Space
     */
    const handleActivate = (event: React.MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event, getActivationMeta(event));
    };

    /** The reading: one line, truncated rather than wrapped, at the secondary text colour. */
    const readingStyle: React.CSSProperties = {
        flex: "1 1 auto",
        minWidth: 0,
        fontSize: "var(--mantine-font-size-sm)",
        lineHeight: 1.2,
        color: PANEL_INK.CHROME,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    };

    /** The same reading when it is also the row's activation target. */
    const activationStyle: React.CSSProperties = {
        ...readingStyle,
        // The pressable area is the whole height of the row, not the height of
        // one line of 11px text: WCAG 2.2 asks 24px of any target and this is
        // 32. The line height centres the text inside it without a flex box,
        // which would defeat the ellipsis.
        alignSelf: "stretch",
        lineHeight: `${PANEL_GRID.ROW_PITCH}px`,
        // Mantine's UnstyledButton sets `text-align: left`, which is physical:
        // this makes it follow the text direction instead.
        textAlign: "start",
        borderRadius: "var(--mantine-radius-sm)",
    };

    return (
        <Box
            ref={ref}
            data-testid="action-row"
            role={isGroup ? "group" : undefined}
            aria-labelledby={isGroup ? readingId : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxSizing: "border-box",
                gap: PANEL_GRID.TRAIL_GAP,
                height: PANEL_GRID.ROW_PITCH,
            }}
        >
            {state !== undefined &&
                (onClick === undefined ? (
                    <Box
                        component="span"
                        id={readingId}
                        data-testid="action-row-state"
                        title={tooltip}
                        {...announcement}
                        style={readingStyle}
                    >
                        {readingContent}
                    </Box>
                ) : (
                    <UnstyledButton
                        type="button"
                        id={readingId}
                        data-testid="action-row-state"
                        title={tooltip}
                        {...announcement}
                        onClick={handleActivate}
                        style={activationStyle}
                    >
                        {readingContent}
                    </UnstyledButton>
                ))}

            {hasAffordances && (
                <Box
                    data-testid="action-row-affordances"
                    style={{
                        // `marginInlineStart: auto` is what holds the cluster at
                        // the row's trailing edge when the row reports nothing.
                        flex: "0 0 auto",
                        marginInlineStart: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: AFFORDANCE_GAP,
                    }}
                >
                    {actions !== undefined && (
                        <Box
                            data-testid="action-row-actions"
                            data-visible={revealed ? "true" : "false"}
                            style={{
                                flex: "0 0 auto",
                                display: "flex",
                                alignItems: "center",
                                gap: AFFORDANCE_GAP,
                                // Hidden with opacity and never by unmounting:
                                // the controls have to stay focusable. Pointer
                                // events are withdrawn with the ink so that an
                                // invisible button cannot be clicked -- which
                                // costs nothing, since reaching it with a
                                // pointer is what reveals it.
                                opacity: revealed ? 1 : 0,
                                pointerEvents: revealed ? undefined : "none",
                            }}
                        >
                            {actions}
                        </Box>
                    )}

                    {residentActions !== undefined && (
                        <Box
                            data-testid="action-row-resident-actions"
                            style={{
                                flex: "0 0 auto",
                                display: "flex",
                                alignItems: "center",
                                gap: AFFORDANCE_GAP,
                            }}
                        >
                            {residentActions}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}
