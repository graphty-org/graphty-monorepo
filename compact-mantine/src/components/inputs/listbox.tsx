/**
 * The listbox (design/figma-spec.md 6.5): the dropdown of Select, Autocomplete,
 * MultiSelect, TagsInput and ComboInput. The look is CSS (`cm-menu-surface`, `cm-menu-row`,
 * `cm-listbox*` in src/theme/css); this module holds the parts CSS cannot do: where the list
 * opens, and the 16px check column every option carries.
 */
import type { ComboboxLikeRenderOptionInput, ComboboxProps } from "@mantine/core";
import React from "react";

import { FLOATING_UI_Z_INDEX } from "../../constants/popout";
import { defaultLabels } from "../../i18n/labels";
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
 *
 * A list taller than the viewport (less 6px each side) that would cross its edge when aligned is
 * cut there instead of being pushed back inside, as macOS does: its height is capped to the part
 * that fits and its content scrolled, so the selected option still lands on the field. A list
 * that fits whole is pushed back inside instead (floating-ui's shift), moving the selected option
 * off the field by the overflow, so every option shows.
 *
 * ponytail: a long list on a field near the edge is still cut to whatever fits beside the field,
 * which can be a few rows; open it toward the room when that shows.
 * @param state - floating-ui's middleware state
 * @returns the offset along the main axis and the alignment axis
 */
function overTriggerOffset(state: ListState): { mainAxis: number; alignmentAxis: number } {
    const { floating } = state.elements;
    const boxes = anchorBoxes(state);
    const rtl = getComputedStyle(floating).direction === "rtl";
    const selected = selectedOption(floating);
    if (!boxes) {
        return { mainAxis: LISTBOX_BELOW_GAP, alignmentAxis: 0 };
    }
    const { anchor, reference } = boxes;
    // floating-ui mirrors the alignment offset of a -start placement under rtl.
    const align = (edge: number): number =>
        rtl ? reference.right - anchor.right - edge : anchor.left - edge - reference.left;
    if (!selected) {
        floating.style.maxHeight = "";
        return { mainAxis: anchor.bottom - reference.bottom + LISTBOX_BELOW_GAP, alignmentAxis: align(0) };
    }
    // Where the list's content would start, unscrolled, for the selected option to sit on the field.
    const contentTop =
        anchor.top - (selected.getBoundingClientRect().top - floating.getBoundingClientRect().top + floating.scrollTop);
    // The list is the part of that content inside the viewport less the margin. A field outside
    // that band cannot have its option both on it and inside it, and a list that fits the band
    // whole is never cut (cut, a short list on a field at the window's edge shows a strip with no
    // option): either way the list opens unscrolled and shift pulls it in.
    const viewportBottom = floating.ownerDocument.documentElement.clientHeight - VIEWPORT_MARGIN;
    const inside =
        anchor.top >= VIEWPORT_MARGIN &&
        anchor.bottom <= viewportBottom &&
        floating.scrollHeight > viewportBottom - VIEWPORT_MARGIN;
    const top = inside ? Math.max(contentTop, VIEWPORT_MARGIN) : contentTop;
    const bottom = Math.min(contentTop + floating.scrollHeight, viewportBottom);
    floating.style.maxHeight = inside ? `${String(bottom - top)}px` : "";
    floating.scrollTop = top - contentTop;
    return { mainAxis: top - reference.bottom, alignmentAxis: align(LISTBOX_EDGE) };
}

/**
 * The option a single-choice list lines up on its field. The checked option, not the keyboard's:
 * Mantine's store moves aria-selected with the highlight, while data-checked stays on the value.
 * @param floating - the list
 * @returns the option, or null
 */
function selectedOption(floating: HTMLElement): HTMLElement | null {
    return (
        floating.querySelector<HTMLElement>("[data-checked]") ??
        floating.querySelector<HTMLElement>('[aria-selected="true"]')
    );
}

/**
 * The list is 16px wider than its field at least (8px each side of an option on the field), and
 * grows to its longest option. A list with nothing selected opens below, flush with the field, so
 * it is the field's width at least: 16px more would run past a field at the window's edge.
 * @param state - floating-ui's size middleware state
 */
function listboxMinWidth(state: ListState): void {
    const width = anchorBoxes(state)?.anchor.width ?? state.rects.reference.width;
    const extra = selectedOption(state.elements.floating) ? LISTBOX_EXTRA_WIDTH : 0;
    state.elements.floating.style.minWidth = `${String(width + extra)}px`;
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

/**
 * Whether a list belongs to a single-choice field (Select), which opens its list over the
 * trigger, rather than to a field whose list opens below it.
 * @param state - floating-ui's middleware state
 * @returns true for a single-choice field
 */
function opensOverTrigger(state: ListState): boolean {
    const { reference } = state.elements;
    return reference instanceof Element && reference.closest(".cm-select") !== null;
}

/**
 * The Combobox theme defaults: what a field's list falls back to for every key its caller's
 * `comboboxProps` leaves out.
 *
 * Mantine merges a component's props over its theme defaults one level deep, so a caller's
 * `comboboxProps={{ withinPortal: false }}` replaces the field's whole `comboboxProps` default.
 * Every field spreads that object onto its Combobox, which merges over its own theme defaults,
 * so defaults set here survive a caller's partial object. The Combobox cannot see which field
 * it belongs to, so the placement asks the DOM: a `cm-select` field opens over its trigger,
 * every other field below.
 *
 * ponytail: shift is one static object (Mantine spreads it, so it cannot be derived per field);
 * a below-the-field list given partial `comboboxProps` clamps on both axes with no limiter, as
 * a single-choice list does. Derive it per field if that ever shows.
 * @returns the Combobox props
 */
export function listboxComboboxProps(): ComboboxProps {
    const over = overTriggerComboboxProps();
    const flipFor = (state: ListState): { mainAxis: boolean; crossAxis: boolean } => {
        const on = !opensOverTrigger(state);
        return { mainAxis: on, crossAxis: on };
    };
    return {
        ...over,
        offset: ((state: ListState) =>
            opensOverTrigger(state) ? overTriggerOffset(state) : belowFieldOffset(state)) as unknown as number,
        middlewares: {
            ...over.middlewares,
            // floating-ui derives a middleware's options from a function of its state; Mantine
            // passes a non-boolean `flip` straight through. Both axes off is no flip at all.
            flip: flipFor as unknown as boolean,
            size: {
                apply: (state: ListState) => {
                    if (opensOverTrigger(state)) {
                        listboxMinWidth(state);
                    } else {
                        belowMinWidth(state);
                    }
                },
            },
        },
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
    const set =
        (mode: string) =>
        (event: Event): void => {
            // The listbox's own walk dispatches untrusted arrow presses; they are not the user's.
            if (event.isTrusted && root.getAttribute(MODALITY_ATTRIBUTE) !== mode) {
                root.setAttribute(MODALITY_ATTRIBUTE, mode);
            }
        };
    document.addEventListener("pointerdown", set("pointer"), true);
    document.addEventListener("keydown", set("keyboard"), true);
}

/**
 * Move focus to a field the reader did not press -- the first field of a card a click elsewhere
 * opened -- and draw its focus ring there, as keyboard focus would. A select trigger rings on
 * keyboard focus only, so focus put on one after a click would land with no ring, and the reader
 * could not see where the next key goes. The next pointer press hides rings again as before.
 * @param element - the field to focus.
 */
export function focusWithRing(element: HTMLElement): void {
    ensureFocusModality();
    document.documentElement.setAttribute(MODALITY_ATTRIBUTE, "keyboard");
    element.focus();
}

/** The most frames a letter typed on a closed trigger waits for its list to be drawn. */
const OPEN_FRAMES = 10;

/** How long a type-ahead run lasts after its last letter. */
const TYPEAHEAD_RESET_MS = 500;

let keyboardTracked = false;

let { listNoMatch } = defaultLabels;

/**
 * The words of the line an open list shows and speaks when the letters typed start no option
 * (`listNoMatch` of `LabelsProvider`, which calls this).
 * @param label - the line, given the letters typed
 */
export function setListNoMatchLabel(label: (typed: string) => string): void {
    listNoMatch = label;
}

/**
 * Says a line to a screen reader through a polite status region in the open list's surface, which
 * goes when the list closes. A region added with its words is announced by nothing, so a region
 * made now gets its words a frame later.
 * @param list - the open list
 * @param words - what to say, or "" to clear
 */
function speak(list: HTMLElement, words: string): void {
    const surface = list.closest<HTMLElement>(".cm-listbox") ?? list;
    const region = surface.querySelector<HTMLElement>(":scope > .cm-listbox-said");
    if (region === null) {
        if (words === "") {
            return;
        }
        const made = surface.ownerDocument.createElement("div");
        made.className = "cm-listbox-said cm-visually-hidden";
        made.setAttribute("role", "status");
        surface.append(made);
        made.dataset.say = words;
        requestAnimationFrame(() => {
            made.textContent = made.dataset.say ?? "";
        });
        return;
    }
    region.dataset.say = words;
    region.textContent = words;
}

/**
 * The open list of any list field (a select or a field the reader types in, such as an
 * Autocomplete), or null.
 * @param input - the event target
 * @returns the list element
 */
function openList(input: EventTarget | null): HTMLElement | null {
    if (!(input instanceof HTMLInputElement) || input.dataset.expanded === undefined) {
        return null;
    }
    const listId = input.getAttribute("aria-controls");
    return listId ? input.ownerDocument.getElementById(listId) : null;
}

/**
 * The open list of a select-only trigger (a read-only `cm-input-wrapper` input), or null.
 * @param input - the event target
 * @returns the list element
 */
function openSelectList(input: EventTarget | null): HTMLElement | null {
    if (
        !(input instanceof HTMLInputElement) ||
        !input.readOnly ||
        input.dataset.expanded === undefined ||
        !input.closest(".cm-input-wrapper")
    ) {
        return null;
    }
    const listId = input.getAttribute("aria-controls");
    return listId ? input.ownerDocument.getElementById(listId) : null;
}

/**
 * The option a list opens on: the checked one, else the one its trigger names as the value in
 * force while nothing is chosen (`data-in-force`, set by StyleSelect), which is highlighted but
 * never checked.
 * @param input - the trigger
 * @param list - its open list
 * @returns the option, or null
 */
function inForce(input: HTMLInputElement, list: HTMLElement): HTMLElement | null {
    const checked = list.querySelector<HTMLElement>("[data-combobox-option][data-combobox-active]");
    const value = input.dataset.inForce;
    if (checked !== null || value === undefined) {
        return checked;
    }
    return (
        [...list.querySelectorAll<HTMLElement>("[data-combobox-option]")].find(
            (option) => option.getAttribute("value") === value,
        ) ?? null
    );
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
    const enabled = items.filter((item) => item.dataset.comboboxDisabled === undefined);
    const lastEnabled = items.indexOf(enabled[enabled.length - 1]);
    for (let i = 0; i <= items.length + 1; i++) {
        const at = items.findIndex((item) => item.dataset.comboboxSelected !== undefined);
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
 * A list field's keydown default: an Escape that closes the field's open list is used up there,
 * so the panel, popover or dialog around the field stays open. Mantine closes the list but lets
 * the key bubble on, and the next Escape handler up (a popover's) closed the whole panel and
 * threw away what was typed in it. With the list shut, Escape bubbles as usual.
 * @param event - the field's keydown
 */
export function consumeListEscape(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape" && "expanded" in event.currentTarget.dataset) {
        event.preventDefault();
        event.stopPropagation();
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
 *   that start with it). A letter typed on the closed trigger opens the list and types ahead.
 *   The run is drawn in a line at the foot of the list while the list is open. When no option
 *   starts with the whole run, nothing is highlighted and Enter writes nothing, so a reader who
 *   types a name the list does not hold never gets the option that shared its first letter; the
 *   line then names what was typed as matching nothing (`listNoMatch`), and a screen reader
 *   hears it.
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
    // The trigger whose last run matched no option: its Enter is used up, writing nothing.
    let missOn: EventTarget | null = null;
    // The walk owed to letters that opened a closed trigger's list, run once Mantine's own update
    // for the open has run, or at once by an Enter that comes first.
    let walkOwed: (() => void) | null = null;
    // The trigger whose Enter came before the list its letters opened was drawn.
    let enterOwed: EventTarget | null = null;
    // The closed trigger a letter is opening the list of, until its run is walked.
    let opening: EventTarget | null = null;

    // Opening: note a closed trigger before Mantine handles the event (capture), then, after
    // Mantine's own zero-delay index update has run, walk to the checked option.
    const noteClosed = (event: Event): void => {
        const input = event.target;
        closedTrigger =
            event.isTrusted && input instanceof HTMLInputElement && input.dataset.expanded === undefined ? input : null;
        if (closedTrigger !== null) {
            missOn = null;
        }
    };
    const announceOpened = (event: Event): void => {
        const input = event.target;
        if (!event.isTrusted || input !== closedTrigger) {
            return;
        }
        closedTrigger = null;
        globalThis.setTimeout(() => {
            const list = openSelectList(input);
            if (!list || !(input instanceof HTMLInputElement)) {
                return;
            }
            // Mantine highlights a checked option itself on an arrow; with none checked it
            // highlights the first, so a value in force that is not checked is walked to anyway.
            if (input.hasAttribute("aria-activedescendant") && input.dataset.inForce === undefined) {
                return;
            }
            const checked = inForce(input, list);
            if (
                !checked ||
                checked.dataset.comboboxDisabled !== undefined ||
                checked.dataset.comboboxSelected !== undefined
            ) {
                return;
            }
            // The walk may scroll a row into view; the list was placed around its scroll position.
            const scroller = list.closest<HTMLElement>(".cm-listbox") ?? list;
            const top = scroller.scrollTop;
            walkHighlight(input, list, checked);
            scroller.scrollTop = top;
        }, 0);
    };
    // Mantine's store marks the keyboard's highlight aria-selected and strips it from the option it
    // leaves, so a screen reader hears "selected" on whatever the arrows pass over, even while the
    // field holds no value. Once Mantine has moved the highlight (its handlers run first), put
    // aria-selected back on the checked option only. The highlight stays data-combobox-selected
    // and aria-activedescendant, which is how it is announced. The same in a field the reader
    // types in (an Autocomplete's suggestions): an option is "selected" only once Enter takes it.
    const syncSelected = (list: HTMLElement | null): void => {
        for (const option of list?.querySelectorAll<HTMLElement>("[data-combobox-option]") ?? []) {
            option.setAttribute("aria-selected", option.dataset.checked !== undefined ? "true" : "false");
        }
    };
    document.addEventListener("keydown", (event) => {
        syncSelected(openList(event.target));
    });
    document.addEventListener("mouseover", (event) => {
        const list = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=listbox]") : null;
        const trigger = list?.id ? document.querySelector(`[aria-controls="${list.id}"]`) : null;
        syncSelected(openList(trigger));
    });
    // Focus that leaves an open list's trigger for another control (a script; Tab is held while the list is open)
    // closes the list. Mantine's Select closes on blur only when searchable, so a select-only
    // list stayed open over the controls focus moved to, where Escape no longer reached it. Its
    // own click toggles the list; options never take focus, so a press inside does not land here.
    document.addEventListener("focusout", (event) => {
        const list = openSelectList(event.target);
        const next = event.relatedTarget;
        if (list && next instanceof Node && !list.contains(next)) {
            (event.target as HTMLInputElement).click();
        }
    });
    document.addEventListener("keydown", noteClosed, true);
    document.addEventListener("click", noteClosed, true);
    document.addEventListener("keydown", announceOpened);
    document.addEventListener("click", announceOpened);

    let runOn: EventTarget | null = null;
    /**
     * Adds a key to the type-ahead run, or starts a new one after a pause or on another field. The
     * pause runs from when the page took the last letter, not from when it was typed: letters
     * typed while the page was busy (opening the list, redrawing the panel around it) are one run
     * however late each is handled.
     * @param event - the key
     */
    const extendRun = (event: KeyboardEvent): void => {
        const now = event.timeStamp;
        typed = now - lastAt > TYPEAHEAD_RESET_MS || event.target !== runOn ? event.key : typed + event.key;
        lastAt = Math.max(now, performance.now());
        runOn = event.target;
    };
    /**
     * Highlights the next enabled option whose label starts with the run typed so far.
     * @param input - the trigger
     * @param list - its open list
     * @param options - its enabled options
     * @param current - the option the search starts after: the highlight, or the checked one
     */
    const typeAhead = (input: HTMLInputElement, list: HTMLElement, options: HTMLElement[], current: number): void => {
        const repeated = typed.length > 1 && typed === typed[0].repeat(typed.length);
        const needle = (repeated ? typed[0] : typed).toLocaleLowerCase();
        // A new run starts after the highlight; a longer run may stay on it.
        const from = typed.length === 1 || repeated ? current + 1 : Math.max(current, 0);
        const count = options.length;
        for (let i = 0; i < count; i++) {
            const option = options[(from + i) % count];
            if ((option.textContent ?? "").trim().toLocaleLowerCase().startsWith(needle)) {
                missOn = null;
                speak(list, "");
                walkHighlight(input, list, option);
                lastAt = performance.now();
                return;
            }
        }
        // No option starts with the run: no highlight, and the reason spoken (Figma draws nothing).
        // Mantine's store keeps its index (only its own handlers move it), so the miss also holds
        // back Enter until the next move.
        missOn = input;
        speak(list, listNoMatch(typed));
        list.querySelector("[data-combobox-selected]")?.removeAttribute("data-combobox-selected");
        input.removeAttribute("aria-activedescendant");
        lastAt = performance.now();
    };
    const enabledOptions = (list: HTMLElement): HTMLElement[] =>
        [...list.querySelectorAll<HTMLElement>("[data-combobox-option]")].filter(
            (option) => option.dataset.comboboxDisabled === undefined,
        );
    const printable = (event: KeyboardEvent): boolean =>
        event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey;

    /**
     * Takes an Enter on a select-only trigger. Letters that opened the list are walked first, so
     * Enter takes the option they name; before the list is drawn, Enter waits for that walk. Then
     * Enter presses the highlight shown, or nothing after a run that matched nothing. Mantine's
     * own Enter presses the option at its stored index, which its zero-delay update for the open
     * resets to the checked option (none, on a field set nowhere) when that update runs after the
     * walk, as it does on a busy page, where input is handled before timers.
     * @param event - the Enter
     * @param list - the trigger's open list, or null
     * @param input - the trigger
     * @returns whether the Enter was used up here
     */
    const takeEnter = (event: KeyboardEvent, list: HTMLElement | null, input: EventTarget | null): boolean => {
        if (list === null) {
            if (opening === null || opening !== input) {
                return false;
            }
            enterOwed = input;
        } else {
            walkOwed?.();
            const highlight = missOn === input ? null : list.querySelector<HTMLElement>("[data-combobox-selected]");
            if (missOn !== input && highlight === null) {
                return false;
            }
            highlight?.click();
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    };

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Enter" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                takeEnter(event, openSelectList(event.target), event.target)
            ) {
                return;
            }
            const list = openSelectList(event.target);
            const input = event.target as HTMLInputElement;
            if (!list || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            // Tab does nothing while a list is open (Figma); Escape or a choice closes it first.
            if (event.key === "Tab") {
                event.preventDefault();
                return;
            }
            if (!printable(event)) {
                missOn = null;
            }
            const options = enabledOptions(list);
            if (options.length === 0) {
                return;
            }
            if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                walkHighlight(input, list, event.key === "Home" ? options[0] : options[options.length - 1]);
                return;
            }
            if (!printable(event)) {
                return;
            }
            event.preventDefault();
            extendRun(event);
            typeAhead(
                input,
                list,
                options,
                options.findIndex((option) => option.dataset.comboboxSelected !== undefined),
            );
        },
        true,
    );

    // A letter typed on a closed trigger opens its list and types ahead in it (the APG select-only
    // combobox), so a reader who types a value's name with focus on a select is not ignored. On
    // the way out, after the field's own handlers: a key one of them used (a row's "=") is left alone.
    document.addEventListener("keydown", (event) => {
        const input = event.target;
        if (
            event.defaultPrevented ||
            !printable(event) ||
            !(input instanceof HTMLInputElement) ||
            !input.readOnly ||
            input.disabled ||
            input.dataset.expanded !== undefined ||
            input.getAttribute("aria-haspopup") !== "listbox" ||
            !input.closest(".cm-input-wrapper")
        ) {
            return;
        }
        event.preventDefault();
        extendRun(event);
        // Letters that come before the list is drawn join the run.
        if (opening === input) {
            return;
        }
        opening = input;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
        // The run is walked once the list is drawn with its options, and after Mantine's own
        // zero-delay index update for the open (or that update would put the highlight back).
        // The frame count is a guard for a list that never opens, not a wait.
        const walkWhenDrawn = (framesLeft: number): void => {
            const list = openSelectList(input);
            const options = list ? enabledOptions(list) : [];
            if (list === null || options.length === 0) {
                if (framesLeft > 0) {
                    requestAnimationFrame(() => {
                        walkWhenDrawn(framesLeft - 1);
                    });
                } else {
                    opening = null;
                    enterOwed = null;
                }
                return;
            }
            const walk = (): void => {
                if (walkOwed !== walk) {
                    return;
                }
                walkOwed = null;
                opening = null;
                // An Enter or Escape already closed the list: walking now would open it again.
                const shown = openSelectList(input);
                if (shown === null) {
                    enterOwed = null;
                    return;
                }
                const current = inForce(input, shown);
                const choices = enabledOptions(shown);
                typeAhead(input, shown, choices, current === null ? -1 : choices.indexOf(current));
                if (enterOwed === input) {
                    enterOwed = null;
                    if (missOn !== input) {
                        shown.querySelector<HTMLElement>("[data-combobox-selected]")?.click();
                    }
                }
            };
            walkOwed = walk;
            globalThis.setTimeout(walk, 0);
        };
        walkWhenDrawn(OPEN_FRAMES);
    });
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
 * The 5 x 3 caret of a select trigger or a combo field, in the field's section color.
 * @returns the caret
 */
export function FieldCaret(): React.JSX.Element {
    return (
        <span className="cm-field-caret" aria-hidden="true">
            <UiGlyph name="caretDown" size={10} />
        </span>
    );
}
