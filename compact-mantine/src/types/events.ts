import type React from "react";

// The event model for the whole package. Section 1 of the hardening contract:
// state changes are value-first, interactions carry the event. Every component's
// props are typed from the aliases in this file so that fourteen components do
// not each invent their own spelling of the same handler.

/**
 * An event that activates a control.
 *
 * A control is activated either by a pointer or by a key, so every activation
 * handler receives one of the two rather than no argument at all. Handing the
 * event to the consumer is what makes shift-click multi-selection,
 * modifier-aware sorting and `preventDefault` possible from outside the
 * library.
 */
export type ActivationEvent = React.MouseEvent | React.KeyboardEvent;

/**
 * Extra facts about an activation that the event alone does not state plainly.
 */
export interface ActivationMeta {
    /**
     * Whether the control was activated by a pointer or from the keyboard.
     *
     * Selection semantics differ between the two: a pointer activation carries
     * a click count and modifier keys for range selection, while a keyboard
     * activation is a single deliberate choice. Reading this is more reliable
     * than inspecting the event, because a browser turns Enter or Space on a
     * button into a synthetic click.
     */
    source: "pointer" | "keyboard";
}

/**
 * Called when a component's value changes.
 *
 * The value comes first because that is what a consumer almost always wants,
 * and it matches Mantine's own components. The event is second and optional, so
 * a change made in code rather than by a person is expressible as
 * `onChange(next)` with no event at all.
 * @example
 * ```tsx
 * const handleChange: ChangeHandler<string> = (value, event) => {
 *     setName(value);
 *     event?.preventDefault();
 * };
 * ```
 */
export type ChangeHandler<T> = (value: T, event?: React.SyntheticEvent) => void;

/**
 * Called when a control is activated, by a pointer or from the keyboard.
 *
 * Never write a bare `() => void` for an activation: without the event a
 * consumer cannot read modifier keys, cannot call `preventDefault`, and cannot
 * find the element that was activated.
 */
export type ActivationHandler = (event: ActivationEvent) => void;

/**
 * Called when a control is activated, with the activation source stated
 * separately.
 *
 * Use this in place of {@link ActivationHandler} only where the behaviour
 * genuinely differs between a pointer and a key -- selectable list rows, where a
 * click extends a selection and Enter does not. Everywhere else the plain event
 * is enough, and a second parameter is noise.
 */
export type ActivationHandlerWithMeta = (event: ActivationEvent, meta: ActivationMeta) => void;

/**
 * Called when a continuous gesture begins, on the first movement rather than on
 * the press.
 */
export type GestureStartHandler = (event: React.PointerEvent) => void;

/**
 * Called repeatedly while a continuous gesture is in progress.
 *
 * The value comes first, as it does for every other change in this package. Its
 * meaning belongs to the gesture: a scrub reports the change since the previous
 * call, a drag reports a position.
 */
export type GestureChangeHandler<T = number> = (value: T, event: React.PointerEvent) => void;

/**
 * Called once when a continuous gesture finishes, including when it is
 * cancelled.
 */
export type GestureEndHandler = (event: React.PointerEvent) => void;

/**
 * The three handlers a continuous gesture reports: start, change and end.
 *
 * A gesture that reported only its changes would leave a consumer with one undo
 * entry per pixel moved. The start and end handlers mark the boundaries of a
 * single interaction, so one undo transaction can be opened on start and
 * committed on end.
 * @example
 * ```tsx
 * <PanelField
 *     onScrubStart={() => { history.beginTransaction(); }}
 *     onScrub={(delta) => { setSize((size) => size + delta); }}
 *     onScrubEnd={() => { history.commitTransaction(); }}
 * />
 * ```
 */
export interface GestureHandlers<T = number> {
    /** Called when the gesture begins. Open an undo transaction here. */
    onGestureStart?: GestureStartHandler;
    /** Called repeatedly while the gesture is in progress. */
    onGestureChange?: GestureChangeHandler<T>;
    /** Called when the gesture finishes or is cancelled. Commit the undo transaction here. */
    onGestureEnd?: GestureEndHandler;
}

/**
 * Called when something that opens and closes changes state.
 *
 * The event is optional because a disclosure is also closed in code -- by an
 * Escape handler elsewhere on the page, or by a route change.
 */
export type OpenChangeHandler = (opened: boolean, event?: React.SyntheticEvent) => void;

/**
 * The props of anything that opens and closes: a section, a sub-group, an
 * explanation bubble, a pop-out.
 *
 * Supply `opened` to drive the component from your own state, or `defaultOpened`
 * to let it keep its own. Supplying both makes `opened` win and `defaultOpened`
 * the value used before the first change.
 */
export interface DisclosureProps {
    /** Whether it is open. Supply this to control the component from your own state. */
    opened?: boolean;
    /** Whether it starts open when the component keeps its own state. */
    defaultOpened?: boolean;
    /** Called when it opens or closes, with the new state first. */
    onOpenChange?: OpenChangeHandler;
}

// A pointer event a browser synthesises from Enter or Space reports an empty
// pointerType; a plain MouseEvent synthesised the same way reports a click
// count of zero. Both are the browser telling us the activation came from the
// keyboard, and both are more reliable than guessing from the element.
//
// Note for tests: Testing Library's `fireEvent.click` builds a MouseEvent whose
// `detail` defaults to 0, so it reads as a keyboard activation. Use
// `userEvent.click`, which sets a click count, to assert the pointer source.

/**
 * Works out whether an activation came from a pointer or from the keyboard.
 *
 * A keyboard activation is recognised three ways: the event is a keyboard event;
 * or it is a pointer event with no pointer type; or it is a mouse event with a
 * click count of zero, which is how a browser reports the click it synthesises
 * from Enter or Space on a button.
 * @param event - The event that activated the control
 * @returns The activation source, ready to hand to an {@link ActivationHandlerWithMeta}
 */
export function getActivationMeta(event: ActivationEvent): ActivationMeta {
    if ("key" in event) {
        return { source: "keyboard" };
    }

    const native = event.nativeEvent;

    if (typeof PointerEvent !== "undefined" && native instanceof PointerEvent) {
        return { source: native.pointerType === "" ? "keyboard" : "pointer" };
    }

    return { source: native.detail === 0 ? "keyboard" : "pointer" };
}
