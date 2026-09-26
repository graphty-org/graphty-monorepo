/**
 * The dark listbox (design/figma-spec.md 6.5): the dropdown of Select, Autocomplete,
 * MultiSelect, TagsInput and ComboInput. The look is CSS (`cm-menu-surface`, `cm-menu-row`,
 * `cm-listbox*` in src/theme/css); this module holds the parts CSS cannot do: where the list
 * opens, and the 16px check column every option carries.
 */
import type { ComboboxLikeRenderOptionInput, ComboboxProps } from "@mantine/core";
import React from "react";

import { FLOATING_UI_Z_INDEX } from "../../constants/popout";
import { UiGlyph } from "../../icons";

/** The list's inset: its top padding, and how far it starts before the trigger. */
const LISTBOX_EDGE = 8;

/** The list is at least this much wider than its trigger (8 each side). */
const LISTBOX_EXTRA_WIDTH = 2 * LISTBOX_EDGE;

/** The gap between a field and a list that opens below it. */
const LISTBOX_BELOW_GAP = 4;

/** Distance from the viewport edges a list is clamped to. */
const VIEWPORT_MARGIN = 6;

/** The part of floating-ui's middleware state the list placement reads. */
interface ListState {
    rects: { reference: { width: number; height: number } };
    elements: { reference: unknown; floating: HTMLElement };
}

/**
 * The box the list lines up with: the whole field (Mantine's Input wrapper, `cm-input-wrapper`),
 * not the `<input>` Mantine anchors the dropdown to, which sits inside an outlined field's 1px
 * border and after any leading section.
 * @param state - floating-ui's middleware state
 * @returns the anchor's box, and the reference's box
 */
function anchorBoxes(state: ListState): { anchor: DOMRect; reference: DOMRect } | null {
    const { reference } = state.elements;
    if (!(reference instanceof Element)) {
        return null;
    }
    const field = reference.closest(".cm-input-wrapper") ?? reference;
    return { anchor: field.getBoundingClientRect(), reference: reference.getBoundingClientRect() };
}

/**
 * Where a single-choice list opens: over its field, with the selected option exactly on top of
 * the field and the list starting 8px before it (macOS style). With no selection the list opens
 * below, 4px away, flush with the field.
 *
 * Measured from the rendered list, so it follows groups, separators and scrolling without being
 * told the selected index.
 * @param state - floating-ui's middleware state
 * @returns the offset along the main axis and the alignment axis
 */
function overTriggerOffset(state: ListState): { mainAxis: number; alignmentAxis: number } {
    const { floating } = state.elements;
    const boxes = anchorBoxes(state);
    const rtl = getComputedStyle(floating).direction === "rtl";
    // The checked option, not the keyboard's: Mantine's store moves aria-selected with the
    // highlight, while data-checked stays on the value.
    const selected =
        floating.querySelector<HTMLElement>("[data-checked]") ??
        floating.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!boxes) {
        return { mainAxis: LISTBOX_BELOW_GAP, alignmentAxis: 0 };
    }
    const { anchor, reference } = boxes;
    // floating-ui mirrors the alignment offset of a -start placement under rtl.
    const align = (edge: number): number =>
        rtl ? reference.right - anchor.right - edge : anchor.left - edge - reference.left;
    if (!selected) {
        return { mainAxis: anchor.bottom - reference.bottom + LISTBOX_BELOW_GAP, alignmentAxis: align(0) };
    }
    const top = selected.getBoundingClientRect().top - floating.getBoundingClientRect().top;
    return { mainAxis: anchor.top - top - reference.bottom, alignmentAxis: align(LISTBOX_EDGE) };
}

/**
 * The list is 16px wider than its field at least, and grows to its longest option.
 * @param state - floating-ui's size middleware state
 */
function listboxMinWidth(state: ListState): void {
    const width = anchorBoxes(state)?.anchor.width ?? state.rects.reference.width;
    state.elements.floating.style.minWidth = `${String(width + LISTBOX_EXTRA_WIDTH)}px`;
}

/**
 * The same minimum for a list that opens below its field, flush with it: at least the field's
 * width.
 * @param state - floating-ui's size middleware state
 */
function belowMinWidth(state: ListState): void {
    const width = anchorBoxes(state)?.anchor.width ?? state.rects.reference.width;
    state.elements.floating.style.minWidth = `${String(width)}px`;
}

/**
 * Where a list that opens below its field goes: 4px below the whole field, flush with its
 * leading edge.
 * @param state - floating-ui's middleware state
 * @returns the offset
 */
function belowFieldOffset(state: ListState): { mainAxis: number; alignmentAxis: number } {
    const boxes = anchorBoxes(state);
    if (!boxes) {
        return { mainAxis: LISTBOX_BELOW_GAP, alignmentAxis: 0 };
    }
    const { anchor, reference } = boxes;
    const rtl = getComputedStyle(state.elements.floating).direction === "rtl";
    return {
        mainAxis: anchor.bottom - reference.bottom + LISTBOX_BELOW_GAP,
        alignmentAxis: rtl ? reference.right - anchor.right : anchor.left - reference.left,
    };
}

/** A shift limiter that keeps the clamped position (floating-ui's limiter shape). */
const NO_LIMIT = {
    fn: (state: { x: number; y: number }): { x: number; y: number } => ({ x: state.x, y: state.y }),
};

/**
 * Combobox props for a single-choice list that opens over its trigger (Select, NativeSelect's
 * look-alike, ComboInput).
 *
 * `offset` is floating-ui's derivable form (a function of the middleware state). Mantine passes
 * `offset` straight to floating-ui's `offset()`, which accepts it, but Mantine's prop type only
 * names the number and object forms, hence the one cast.
 *
 * A function rather than an exported constant: Storybook's docgen annotates exported objects
 * with `displayName` / `__docgenInfo`, which Mantine then spreads onto the input as attributes.
 * @returns the Combobox props
 */
export function overTriggerComboboxProps(): ComboboxProps {
    return {
        position: "bottom-start",
        offset: overTriggerOffset as unknown as number,
        middlewares: {
            flip: false,
            // Clamp on both axes, with no limiter: Mantine's default limitShift keeps a list touching
            // its trigger's edge, which would stop a list that opens over its trigger from being
            // pulled back inside the viewport.
            shift: { crossAxis: true, padding: VIEWPORT_MARGIN, limiter: NO_LIMIT },
            size: { apply: listboxMinWidth },
        },
        width: "max-content",
        transitionProps: { duration: 0 },
        zIndex: FLOATING_UI_Z_INDEX,
    };
}

/**
 * Combobox props for a list that opens below its field (Autocomplete, MultiSelect, TagsInput:
 * there is no single selected row to align).
 * @returns the Combobox props
 */
export function belowComboboxProps(): ComboboxProps {
    return {
        position: "bottom-start",
        offset: belowFieldOffset as unknown as number,
        middlewares: { flip: true, shift: { padding: VIEWPORT_MARGIN }, size: { apply: belowMinWidth } },
        width: "max-content",
        transitionProps: { duration: 0 },
        zIndex: FLOATING_UI_Z_INDEX,
    };
}

/** The attribute on `<html>` saying how focus last moved: `"pointer"` or `"keyboard"`. */
const MODALITY_ATTRIBUTE = "data-cm-modality";

let modalityTracked = false;

/**
 * Track whether focus last moved by pointer or by keyboard, on `<html>`.
 *
 * A select trigger rings on keyboard focus only (spec 6.4), like Figma's `<button>` trigger. Mantine's
 * trigger is a read-only `<input>`, which Chromium treats as `:focus-visible` even after a click,
 * so `:focus-visible` alone would ring it on every click. Installed once, by the Select and
 * NativeSelect theme resolvers; does nothing without a DOM.
 */
export function ensureFocusModality(): void {
    if (modalityTracked || typeof document === "undefined") {
        return;
    }
    modalityTracked = true;
    const root = document.documentElement;
    const set = (mode: string) => (event: Event): void => {
        // The listbox's own walk dispatches untrusted arrow presses; they are not the user's.
        if (event.isTrusted && root.getAttribute(MODALITY_ATTRIBUTE) !== mode) {
            root.setAttribute(MODALITY_ATTRIBUTE, mode);
        }
    };
    document.addEventListener("pointerdown", set("pointer"), true);
    document.addEventListener("keydown", set("keyboard"), true);
}

/** How long a type-ahead run lasts after its last letter. */
const TYPEAHEAD_RESET_MS = 500;

let keyboardTracked = false;

/**
 * The open list of a select-only trigger (a read-only `cm-input-wrapper` input), or null.
 * @param input - the event target
 * @returns the list element
 */
function openSelectList(input: EventTarget | null): HTMLElement | null {
    if (
        !(input instanceof HTMLInputElement) ||
        !input.readOnly ||
        !input.hasAttribute("data-expanded") ||
        !input.closest(".cm-input-wrapper")
    ) {
        return null;
    }
    const listId = input.getAttribute("aria-controls");
    return listId ? input.ownerDocument.getElementById(listId) : null;
}

/**
 * Move Mantine's highlight to `target` by pressing ArrowDown / ArrowUp on the trigger.
 *
 * Mantine's Select keeps its highlight in a store that only its own arrow-key handling moves, and
 * only that handling sets `aria-activedescendant`, so the highlight is walked there: the store,
 * `aria-activedescendant` and Enter stay in step. Each press steps toward the target in DOM
 * order, so the walk never wraps; the cap is a guard, not a lap.
 * @param input - the trigger
 * @param list - its open list
 * @param target - the enabled option to highlight
 */
function walkHighlight(input: HTMLInputElement, list: HTMLElement, target: HTMLElement): void {
    const items = [...list.querySelectorAll<HTMLElement>("[data-combobox-option]")];
    const goal = items.indexOf(target);
    const enabled = items.filter((item) => !item.hasAttribute("data-combobox-disabled"));
    const lastEnabled = items.indexOf(enabled[enabled.length - 1]);
    for (let i = 0; i <= items.length + 1; i++) {
        const at = items.findIndex((item) => item.hasAttribute("data-combobox-selected"));
        if (at === goal) {
            return;
        }
        // With nothing highlighted in the DOM the store may still hold the checked option's index
        // (Select sets it on open); stepping up to reach the last option keeps it from wrapping.
        const down = at === -1 ? goal !== lastEnabled : at < goal;
        const key = down ? "ArrowDown" : "ArrowUp";
        input.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true }));
    }
}

/**
 * The keyboard of an open select-only list (flows.md 4 and 9, design/figma-spec.md 6.5), on top
 * of Mantine's arrows, Enter and Escape:
 *
 * - When the list opens (Enter, Space, a click or an arrow), the checked option becomes the
 *   `aria-activedescendant`, so a screen reader announces it. Mantine sets that attribute only
 *   after the first arrow press.
 * - Home and End highlight the first and last enabled option.
 * - Letters type ahead: the highlight moves to the next enabled option whose label starts with
 *   the letters typed in the last half second (one repeated letter cycles through the options
 *   that start with it).
 *
 * Installed once, by the Select theme resolver; applies to read-only triggers only (an editable
 * combobox keeps Home / End for its caret and has no checked option to announce), and does
 * nothing without a DOM.
 */
export function ensureListboxKeyboard(): void {
    if (keyboardTracked || typeof document === "undefined") {
        return;
    }
    keyboardTracked = true;
    let typed = "";
    let lastAt = 0;
    let closedTrigger: EventTarget | null = null;

    // Opening: note a closed trigger before Mantine handles the event (capture), then, after
    // Mantine's own zero-delay index update has run, walk to the checked option.
    const noteClosed = (event: Event): void => {
        const input = event.target;
        closedTrigger =
            event.isTrusted && input instanceof HTMLInputElement && !input.hasAttribute("data-expanded")
                ? input
                : null;
    };
    const announceOpened = (event: Event): void => {
        const input = event.target;
        if (!event.isTrusted || input !== closedTrigger) {
            return;
        }
        closedTrigger = null;
        window.setTimeout(() => {
            const list = openSelectList(input);
            if (!list || !(input instanceof HTMLInputElement) || input.hasAttribute("aria-activedescendant")) {
                return;
            }
            const checked = list.querySelector<HTMLElement>("[data-combobox-option][data-combobox-active]");
            if (!checked || checked.hasAttribute("data-combobox-disabled")) {
                return;
            }
            // The walk may scroll a row into view; the list was placed around its scroll position.
            const scroller = list.closest<HTMLElement>(".cm-listbox") ?? list;
            const top = scroller.scrollTop;
            walkHighlight(input, list, checked);
            scroller.scrollTop = top;
        }, 0);
    };
    document.addEventListener("keydown", noteClosed, true);
    document.addEventListener("click", noteClosed, true);
    document.addEventListener("keydown", announceOpened);
    document.addEventListener("click", announceOpened);

    document.addEventListener(
        "keydown",
        (event) => {
            const list = openSelectList(event.target);
            const input = event.target as HTMLInputElement;
            if (!list || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            const options = [...list.querySelectorAll<HTMLElement>("[data-combobox-option]")].filter(
                (option) => !option.hasAttribute("data-combobox-disabled"),
            );
            if (options.length === 0) {
                return;
            }
            if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                walkHighlight(input, list, event.key === "Home" ? options[0] : options[options.length - 1]);
                return;
            }
            if (event.key.length !== 1 || event.key === " ") {
                return;
            }
            event.preventDefault();
            const now = event.timeStamp;
            typed = now - lastAt > TYPEAHEAD_RESET_MS ? event.key : typed + event.key;
            lastAt = now;
            const current = options.findIndex((option) => option.hasAttribute("data-combobox-selected"));
            const repeated = typed.length > 1 && typed === typed[0].repeat(typed.length);
            const needle = (repeated ? typed[0] : typed).toLocaleLowerCase();
            // A new run starts after the highlight; a longer run may stay on it.
            const from = typed.length === 1 || repeated ? current + 1 : Math.max(current, 0);
            const count = options.length;
            for (let i = 0; i < count; i++) {
                const option = options[(from + i) % count];
                if ((option.textContent ?? "").trim().toLocaleLowerCase().startsWith(needle)) {
                    walkHighlight(input, list, option);
                    return;
                }
            }
        },
        true,
    );
}

/**
 * The white check that marks the selected option, drawn in the 16 x 16 check column (9 x 8.5
 * visible). Hidden (`opacity: 0`) on every row that is not selected, so labels stay aligned.
 * @returns the check column
 */
export function ListboxCheck(): React.JSX.Element {
    return (
        <span className="cm-menu-row-check" aria-hidden="true">
            <UiGlyph name="check" size={16} />
        </span>
    );
}

/**
 * The default option renderer for the themed Mantine lists: the check column, then the label.
 * @param input - Mantine's option and whether it is checked
 * @param input.option - the option
 * @returns the option's content
 */
export function renderListboxOption({
    option,
}: ComboboxLikeRenderOptionInput<{ value: string; label?: string }>): React.ReactNode {
    return (
        <>
            <ListboxCheck />
            <span className="cm-listbox-label">{option.label ?? option.value}</span>
        </>
    );
}

/**
 * The 5 x 3 caret of a select trigger or a combo field, in the field's section colour.
 * @returns the caret
 */
export function FieldCaret(): React.JSX.Element {
    return (
        <span className="cm-field-caret" aria-hidden="true">
            <UiGlyph name="caretDown" size={10} />
        </span>
    );
}
