import {
    type ChangeEventHandler,
    type FocusEventHandler,
    type KeyboardEventHandler,
    type MouseEventHandler,
    type SyntheticEvent,
    useRef,
    useState,
} from "react";

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
    role: "spinbutton";
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

/** The field's behaviour: its input props and the value-changing scrub. */
interface NumberField {
    inputProps: NumberFieldInputProps;
    /** scrub callbacks that change the value live and commit once on release */
    scrub: ScrubCallbacks;
    /** true while a draft (typed or scrubbed) differs from the committed display */
    editing: boolean;
}

/**
 * Figma's number field behaviour on a plain text input:
 *
 * - typing applies nothing until Enter, Tab or blur; the text may be an expression (`40*2`);
 *   anything that does not evaluate silently reverts;
 * - Enter commits and keeps focus (the whole value is re-selected); Escape reverts and blurs;
 * - ArrowUp / ArrowDown step at once (Shift: ten steps);
 * - a click selects the whole value;
 * - a scrub moves the value live at 0.5 per px and commits once on release.
 * @param options - the value, how to read and write it, and the handlers to chain
 * @returns the input props and the scrub callbacks
 */
export function useNumberField(options: NumberFieldOptions): NumberField {
    const { value, display, onCommit, parse, suffix, min, max, step = 1, decimalScale, locked = false } = options;
    const format = options.format ?? ((n: number): string => String(n));
    const [draft, setDraftState] = useState<string | null>(null);
    // Mirrored in a ref: Escape clears the draft and blurs in one handler, and the blur's commit
    // must see the cleared draft, not the render's.
    const draftRef = useRef<string | null>(null);
    const setDraft = (next: string | null): void => {
        draftRef.current = next;
        setDraftState(next);
    };
    const justFocused = useRef(false);
    const scrubBase = useRef(0);
    const scrubValue = useRef<number | null>(null);

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

    const inputProps: NumberFieldInputProps = {
        value: draft ?? display,
        role: "spinbutton",
        inputMode: "decimal",
        "aria-valuenow": value ?? undefined,
        "aria-valuemin": min,
        "aria-valuemax": max,
        onChange: (event) => {
            if (!locked) {
                setDraft(event.currentTarget.value);
            }
        },
        onKeyDown: (event) => {
            options.onKeyDown?.(event);
            if (event.defaultPrevented || locked) {
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                commit(event);
                const input = event.currentTarget;
                requestAnimationFrame(() => {
                    input.select();
                });
            } else if (event.key === "Escape") {
                if (draftRef.current !== null) {
                    event.preventDefault();
                    setDraft(null);
                }
                event.currentTarget.blur();
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                const base = (draftRef.current !== null ? read(draftRef.current) : null) ?? value ?? min ?? 0;
                const delta = (event.key === "ArrowUp" ? step : -step) * (event.shiftKey ? 10 : 1);
                const next = settle(base + delta);
                setDraft(null);
                if (next !== value) {
                    onCommit(next, event);
                }
            }
        },
        onFocus: (event) => {
            justFocused.current = true;
            options.onFocus?.(event);
        },
        onBlur: (event) => {
            justFocused.current = false;
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
            setDraft(null);
            if (next !== null && next !== value) {
                onCommit(next, event);
            }
        },
    };

    return { inputProps, scrub, editing: draft !== null };
}
