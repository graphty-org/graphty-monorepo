import React, { useId } from "react";

// Why this module exists, and what it repairs.
//
// Every control in this library could be turned off -- `disabled` has been on
// StyleSelect, StyleNumberInput, CompactColorInput, ToggleRow and
// ToggleWithContent since they were written -- but not one of
// them could say WHY it was off. A control that is dimmed and silent is the
// defect the shell kept hitting: the reader sees a "Show legend" toggle they
// cannot press and has no way at all to learn that nothing is encoded yet, so
// they read it as a bug in the application rather than as a state of their own
// data.
//
// The product spec fixes both halves of that at design/ui/
// app-shell-progressive-disclosure-design.md:6641 -- "DISABLED ink, with the
// one reason appended to its own title after a full stop (floor item 4)" -- and
// the shell already writes exactly that shape by hand in two places ("Export.
// Load data first", "Note. Select something first"). This module is that shape
// written once, so the five controls spell it identically instead of five call
// sites each inventing their own punctuation.
//
// Worse than silence, ToggleRow used to make the sentence IMPOSSIBLE to write
// from outside: it hardcoded `wrapperProps = {title: label}`, so a call site
// that wanted "Labels. Nothing is encoded yet" had no seam to put it through.
// That is the house rule's case in point -- the shared component was wrong, so
// the shared component is fixed and every caller gets the fix, rather than one
// panel growing a bespoke tooltip of its own.
//
// Two carriers, not one, and the reason is measured rather than assumed. A
// probe against @mantine/core 8.3.10 in this package's own jsdom setup found
// that `aria-describedby` passed into Checkbox, Switch and SegmentedControl
// reaches the element that needs it, while the same attribute passed into
// Select, NumberInput or TextInput is SWALLOWED: Input.Wrapper computes its own
// `aria-describedby` from its `description` prop and overwrites whatever came
// in. So an Input.Wrapper-based control must route the sentence through
// `description` with the description element styled out of sight -- which is
// precisely what PanelField already does (PanelField.tsx:756-757) -- and
// everything else renders a hidden element of its own and points at it. Both
// routes are served from here so the wording and the ordering cannot drift
// between them.

/**
 * Hides an element from sight while leaving it in the accessibility tree.
 *
 * The same recipe as Mantine's own `VisuallyHidden`, written as a style object
 * because the Input.Wrapper route hands it to the Styles API rather than
 * rendering an element. Do not swap it for `display: none` or `visibility:
 * hidden`: both take the sentence out of the accessibility tree as well, which
 * would leave a disabled control silent again for exactly the readers who most
 * need the reason.
 * @public
 */
export const VISUALLY_HIDDEN_STYLE: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    border: 0,
};

/**
 * What a control needs to know to annotate itself.
 * @public
 */
export interface ControlAnnotationOptions {
    /**
     * The control's own name, which is what the reason is appended to.
     *
     * Usually the `label` prop. It may be absent -- an unlabelled colour
     * control, or an icon group named by a heading elsewhere -- in which case
     * the reason stands alone rather than being appended to nothing.
     */
    name?: string | undefined;
    /**
     * The `title` the control already draws while it is usable, if any.
     *
     * Passed so that adding a reason cannot ALSO add a tooltip where there was
     * none before. ToggleRow and ToggleWithContent already repeat their label
     * as a title for a pointer user who has no room for the whole word, so they
     * pass their label here; the other four draw no title at rest and pass
     * nothing, and stay exactly as quiet as they are today while they are
     * enabled.
     */
    enabledTitle?: string | undefined;
    /** Whether the control cannot be used at all. */
    disabled?: boolean | undefined;
    /**
     * One sentence saying why the control is off, supplied by the caller.
     *
     * Deliberately never defaulted from the label set: only the call site knows
     * why THIS control is off, and a generic "Unavailable" would be the same
     * silence with more words.
     */
    disabledReason?: string | undefined;
    /**
     * Further sentences to announce whatever the control's disabled state, such
     * as the bound description of a channel that follows a data attribute.
     *
     * Entries that are `undefined` or empty are dropped, so a caller can pass
     * an empty string to say nothing at all -- the same escape hatch
     * `PanelField.boundDescription` already documents.
     */
    extraDescriptions?: readonly (string | undefined)[] | undefined;
}

/**
 * The title, the sentence and the id a control needs in order to say why it is
 * off.
 * @public
 */
export interface ControlAnnotation {
    /**
     * What to put in the control's `title`, or `undefined` to draw no tooltip
     * at all.
     */
    title: string | undefined;
    /**
     * The sentence or sentences a screen reader should add to the control, or
     * `undefined` when there is nothing to add.
     *
     * Hand this to `description` on an Input.Wrapper-based control, with
     * {@link VISUALLY_HIDDEN_STYLE} on its `description` slot; render it into a
     * hidden element carrying {@link ControlAnnotation.describedBy} on anything
     * else.
     */
    description: string | undefined;
    /**
     * The id to give the hidden element holding {@link
     * ControlAnnotation.description}, and to point the control's
     * `aria-describedby` at.
     *
     * Stable for the life of the control, and `undefined` exactly when
     * `description` is, so `aria-describedby` is never left pointing at an id
     * that is not in the document -- which is worse than no reference at all.
     */
    describedBy: string | undefined;
}

/**
 * Appends one sentence to a title after a full stop.
 *
 * The full stop is added only when the base does not already end a sentence, so
 * a label that is written as a question ("Snap to grid?") does not come back as
 * "Snap to grid?. Load data first". A base that is absent or blank leaves the
 * sentence standing on its own.
 * @param base - The title the control would draw without the reason
 * @param sentence - The reason to append
 * @returns The two joined after a full stop, or the sentence alone
 */
function appendAfterFullStop(base: string | undefined, sentence: string): string {
    const trimmed = base === undefined ? "" : base.trim();

    if (trimmed === "") {
        return sentence;
    }

    const terminated = /[.!?]$/u.test(trimmed) ? trimmed : `${trimmed}.`;

    return `${terminated} ${sentence}`;
}

/**
 * Works out what one control should draw and announce about its own state.
 *
 * Reach for it from a control that can be disabled, so that the reason it is
 * disabled reaches BOTH a pointer user, who gets it in the tooltip after a full
 * stop, and a screen reader user, who gets it in the accessible description.
 * Sending it to only one of the two is the failure this exists to stop: a
 * tooltip alone is invisible to assistive technology, and a description alone
 * is invisible to everybody using a mouse.
 *
 * Nothing is drawn while the control is usable. A control that has no title of
 * its own today keeps having none, so adding a reason to one screen cannot
 * sprout tooltips across every other screen that uses the same component.
 * @param options - What the control knows about itself
 * @param options.name - The control's own name, which the reason is appended to
 * @param options.enabledTitle - The title the control already draws while it is usable
 * @param options.disabled - Whether the control cannot be used at all
 * @param options.disabledReason - One caller-supplied sentence saying why it is off
 * @param options.extraDescriptions - Further sentences to announce whatever the disabled state
 * @returns The title, the accessible description and the id that description is given
 * @public
 * @example
 * ```tsx
 * const annotation = useControlAnnotation({
 *     name: label,
 *     disabled,
 *     disabledReason,
 * });
 *
 * <Checkbox
 *     label={label}
 *     disabled={disabled}
 *     aria-describedby={annotation.describedBy}
 *     wrapperProps={{title: annotation.title}}
 * />
 * ```
 */
export function useControlAnnotation({
    name,
    enabledTitle,
    disabled = false,
    disabledReason,
    extraDescriptions,
}: ControlAnnotationOptions): ControlAnnotation {
    // One id per control instance, minted whether or not it is used, because a
    // hook cannot be called conditionally and an unused id costs nothing.
    const describedById = useId();

    const reason = disabled && disabledReason !== undefined && disabledReason !== "" ? disabledReason : undefined;

    const sentences: string[] = [];

    for (const extra of extraDescriptions ?? []) {
        if (extra !== undefined && extra !== "") {
            sentences.push(extra);
        }
    }

    if (reason !== undefined) {
        sentences.push(reason);
    }

    const description = sentences.length > 0 ? sentences.join(". ") : undefined;

    return {
        title: reason === undefined ? enabledTitle : appendAfterFullStop(enabledTitle ?? name, reason),
        description,
        describedBy: description === undefined ? undefined : describedById,
    };
}
