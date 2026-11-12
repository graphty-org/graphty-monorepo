import {
    type ChangeEventHandler,
    type FocusEventHandler,
    type KeyboardEventHandler,
    type MouseEventHandler,
    type SyntheticEvent,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { flushSync } from "react-dom";

import { clamp, evaluateExpression, tidy } from "./expression";
import { SCRUB_UNITS_PER_PX, type ScrubCallbacks } from "./useScrub";

/** What a Figma number field needs from its owner (design/figma-spec.md 6.1). */
interface NumberFieldOptions {
    /** the committed number; null when there is none (empty, mixed, unparseable) */
    value: number | null;
    /** what the field shows while nobody is editing it */
    display: string;
    /** called once per commit: Enter, Tab, blur, an arrow key, or the end of a scrub */
    onCommit: (value: number, event: SyntheticEvent) => void;
    /** reads one number in the reader's locale; NaN when the text is not one */
    parse: (text: string) => number;
    /** writes a number for the live scrub display */
    format?: (value: number) => string;
    /** trailing text the display carries (a unit) and a commit strips */
    suffix?: string;
    min?: number;
    max?: number;
    /** one arrow press; Shift moves ten */
    step?: number;
    /** decimal places a committed value is rounded to */
    decimalScale?: number;
    /** refuses every edit */
    locked?: boolean;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

/** The props the field's `<input>` takes. */
interface NumberFieldInputProps {
    value: string;
    role: "spinbutton" | undefined;
    inputMode: "decimal";
    "aria-valuenow"?: number;
    "aria-valuemin"?: number;
    "aria-valuemax"?: number;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onKeyDown: KeyboardEventHandler<HTMLInputElement>;
    onFocus: FocusEventHandler<HTMLInputElement>;
    onBlur: FocusEventHandler<HTMLInputElement>;
    onMouseUp: MouseEventHandler<HTMLInputElement>;
}

/** The field's behavior: its input props and the value-changing scrub. */
interface NumberField {
    inputProps: NumberFieldInputProps;
    /** scrub callbacks that change the value live and commit once on release */
    scrub: ScrubCallbacks;
    /** true while a draft (typed or scrubbed) differs from the committed display */
    editing: boolean;
    /** true from an Escape that took back typing until the next edit, commit or blur */
    discarded: boolean;
}

/**
 * Figma's number field behavior on a plain text input:
 *
 * - typing applies nothing until Enter, Tab or blur; the text may be an expression (`40*2`);
 *   anything that does not evaluate silently reverts;
 * - Enter commits and keeps focus (the whole value is re-selected), then submits the field's form
 *   when it has an enabled submit button; Escape reverts and keeps
 *   focus (the whole value selected), and with nothing typed is left to what holds the field;
 * - ArrowUp / ArrowDown step at once (Shift: ten steps);
 * - a click selects the whole value;
 * - a scrub moves the value live at 0.5 per px and commits once on release.
 * @param options - the value, how to read and write it, and the handlers to chain
 * @returns the input props and the scrub callbacks
 */
export function useNumberField(options: NumberFieldOptions): NumberField {
    const { value, display, onCommit, parse, suffix, min, max, step = 1, decimalScale, locked = false } = options;
    const format = options.format ?? String;
    const [draft, setDraftState] = useState<string | null>(null);
    // Mirrored in a ref: a handler that clears the draft and then commits (a blur in the same
    // handler) must see the cleared draft, not the render's.
    const draftRef = useRef<string | null>(null);
    const setDraft = (next: string | null): void => {
        draftRef.current = next;
        setDraftState(next);
    };
    const justFocused = useRef(false);
    // Escape took back what was typed: the owner says so until the reader edits or leaves.
    const [discarded, setDiscarded] = useState(false);
    const scrubBase = useRef(0);
    const scrubValue = useRef<number | null>(null);
    // After Enter or a scrub the whole value stays selected, so the next key replaces it. The
    // owner may draw the committed value later (a microtask, a promise, a session write), and
    // writing a new value into the input drops a selection: the field selects again after each
    // render that changes what it shows, until the reader edits, presses another key or leaves.
    const field = useRef<HTMLInputElement | null>(null);
    const keepSelected = useRef(false);

    const settle = (v: number): number => {
        const clamped = clamp(tidy(v), min, max);
        return decimalScale === undefined ? clamped : Number(clamped.toFixed(decimalScale));
    };

    const read = (text: string): number | null => {
        const bare = suffix && text.trimEnd().endsWith(suffix) ? text.trimEnd().slice(0, -suffix.length) : text;
        return evaluateExpression(bare, parse);
    };

    const commit = (event: SyntheticEvent): void => {
        const text = draftRef.current;
        if (text === null) {
            return;
        }
        setDraft(null);
        const typed = read(text);
        if (typed === null) {
            return;
        }
        const next = settle(typed);
        if (next !== value) {
            onCommit(next, event);
        }
    };

    const shown = draft ?? display;
    useLayoutEffect(() => {
        const input = field.current;
        if (keepSelected.current && input?.ownerDocument.activeElement === input) {
            input?.select();
        }
    }, [shown]);

    const inputProps: NumberFieldInputProps = {
        value: shown,
        // A spinbutton always has a value: Chromium reads one with no aria-valuenow as 0. An
        // empty field (not set, Mixed) is a plain text box until it holds a number, so a screen
        // reader hears its words and no number nobody set.
        role: value === null ? undefined : "spinbutton",
        inputMode: "decimal",
        "aria-valuenow": value ?? undefined,
        "aria-valuemin": min,
        "aria-valuemax": max,
        onChange: (event) => {
            const text = event.currentTarget.value;
            // A letter is taken as typed and reverts on commit, as in Figma.
            if (!locked) {
                keepSelected.current = false;
                setDiscarded(false);
                setDraft(text);
            }
        },
        onKeyDown: (event) => {
            keepSelected.current = false;
            options.onKeyDown?.(event);
            if (event.defaultPrevented || locked) {
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                // The whole value is selected at once and again when the commit is drawn, so a key
                // typed next replaces it even on a busy page, which handles input before its frame.
                keepSelected.current = true;
                setDiscarded(false);
                commit(event);
                const input = event.currentTarget;
                input.select();
                // Enter in a form's field submits it, as in any text box: the field's own Enter
                // is held back so the commit lands first, and the form is submitted a frame later
                // with the committed value, through its submit button unless that is disabled.
                const submit = input.form?.querySelector<HTMLButtonElement | HTMLInputElement>(
                    'button[type="submit"], input[type="submit"]',
                );
                requestAnimationFrame(() => {
                    if (submit?.disabled === false && submit.isConnected) {
                        input.form?.requestSubmit(submit);
                    }
                });
            } else if (event.key === "Escape") {
                // Takes back what was typed and keeps focus, the whole value selected, so focus
                // never falls to the page. With nothing typed the key goes on to what holds the
                // field (a pop-out closes, a panel steps back).
                if (draftRef.current !== null) {
                    event.preventDefault();
                    event.stopPropagation();
                    flushSync(() => {
                        setDraft(null);
                        setDiscarded(true);
                    });
                    event.currentTarget.select();
                }
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                const base = (draftRef.current !== null ? read(draftRef.current) : null) ?? value ?? min ?? 0;
                const delta = (event.key === "ArrowUp" ? step : -step) * (event.shiftKey ? 10 : 1);
                const next = settle(base + delta);
                setDraft(null);
                setDiscarded(false);
                if (next !== value) {
                    onCommit(next, event);
                }
            }
        },
        onFocus: (event) => {
            field.current = event.currentTarget;
            justFocused.current = true;
            // However focus arrives (a click, Tab, or a control handing it over), the value is
            // selected, so what is typed replaces it rather than joining it ("8" + "24" is never 824).
            event.currentTarget.select();
            options.onFocus?.(event);
        },
        onBlur: (event) => {
            keepSelected.current = false;
            justFocused.current = false;
            setDiscarded(false);
            commit(event);
            options.onBlur?.(event);
        },
        onMouseUp: (event) => {
            if (justFocused.current) {
                justFocused.current = false;
                event.preventDefault();
                event.currentTarget.select();
            }
        },
    };

    const scrub: ScrubCallbacks = {
        onStart: () => {
            const typed = draftRef.current !== null ? read(draftRef.current) : null;
            scrubBase.current = typed ?? value ?? 0;
            scrubValue.current = null;
        },
        onMove: (_delta, total) => {
            const next = settle(scrubBase.current + total * SCRUB_UNITS_PER_PX);
            scrubValue.current = next;
            setDraft(format(next) + (suffix ?? ""));
        },
        onEnd: (event) => {
            const next = scrubValue.current;
            scrubValue.current = null;
            keepSelected.current = true;
            setDraft(null);
            if (next !== null && next !== value) {
                onCommit(next, event);
            }
        },
    };

    return { inputProps, scrub, editing: draft !== null, discarded };
}
