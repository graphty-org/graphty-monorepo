import React, { useEffect, useRef, useState } from "react";

import { useNumberFormatter, useNumberParser } from "../../i18n";
import { isLeavingWithoutCommit, leaveWithoutCommit } from "./escape";

/** The opacity range, in percent. */
const MIN = 0;
const MAX = 100;

/** Figma's scrub rate: half a percent per screen pixel dragged on the "%". */
const SCRUB_PER_PX = 0.5;

/** Shift multiplies an arrow step by this. */
const SHIFT_STEP = 10;

/** Props for the internal OpacityInput. */
interface OpacityInputProps {
    /** The opacity shown, 0-100. */
    value: number;
    /** Called once per committed change: a blur or Enter after typing, an arrow key, the end of a scrub. */
    onCommit: (value: number, event?: React.SyntheticEvent) => void;
    /** Accessible name of the text box. */
    ariaLabel: string;
    /** Draw the value as the default (italic, secondary) rather than as the reader's own. */
    isDefault?: boolean;
    disabled?: boolean;
    /** id of a hidden description (a disabled reason). */
    describedBy?: string | undefined;
    testId?: string;
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * Clamp a percentage into 0..100.
 * @param n - the value
 * @returns the clamped value
 */
function clamp(n: number): number {
    return Math.min(MAX, Math.max(MIN, n));
}

/**
 * The opacity part of a paint field (design/figma-spec.md 7.2): a 38px text box holding the
 * number without "%", then a 14px "%" that is the scrub handle. Typing commits on blur or Enter
 * and reverts on Escape; ArrowUp / ArrowDown step by 1 (Shift 10) and commit at once; dragging
 * the "%" changes the shown value live at 0.5 per pixel and commits once on release.
 * @param props - Component props
 * @param props.value - the value
 * @param props.onCommit - called once per committed change
 * @param props.ariaLabel - the accessible name
 * @param props.isDefault - draw the value as the default
 * @param props.disabled - whether the box is off
 * @param props.describedBy - id of a hidden description
 * @param props.testId - test id
 * @param props.onFocus - forwarded focus
 * @param props.onBlur - forwarded blur
 * @returns the opacity part
 */
export function OpacityInput({
    value,
    onCommit,
    ariaLabel,
    isDefault = false,
    disabled = false,
    describedBy,
    testId,
    onFocus,
    onBlur,
}: OpacityInputProps): React.JSX.Element {
    const format = useNumberFormatter({ maximumFractionDigits: 2 });
    const parse = useNumberParser();
    const [draft, setDraft] = useState(format.format(value));
    const scrub = useRef<{ startX: number; start: number; last: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDraft(format.format(value));
    }, [value, format]);

    /**
     * Commit the typed text when it reads as a number, otherwise redraw the value.
     * @param event - the event that ended the edit
     */
    const commitDraft = (event: React.SyntheticEvent): void => {
        const typed = parse(draft);
        if (Number.isNaN(typed)) {
            setDraft(format.format(value));
            return;
        }
        const next = clamp(typed);
        setDraft(format.format(next));
        if (next !== value) {
            onCommit(next, event);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "Enter") {
            commitDraft(event);
            return;
        }
        if (event.key === "Escape") {
            leaveWithoutCommit(event, () => {
                setDraft(format.format(value));
            });
            return;
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const step = (event.shiftKey ? SHIFT_STEP : 1) * (event.key === "ArrowUp" ? 1 : -1);
            const typed = parse(draft);
            const next = clamp(Math.round((Number.isNaN(typed) ? value : typed) + step));
            setDraft(format.format(next));
            if (next !== value) {
                onCommit(next, event);
            }
        }
    };

    const setDragCursor = (cursor: string): void => {
        document.documentElement.style.cursor = cursor;
        document.body.style.cursor = cursor;
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLSpanElement>): void => {
        if (disabled || event.button > 0) {
            return;
        }
        event.preventDefault();
        // A scrub leaves focus in the field, so the arrow keys edit it next (flows.md 6).
        inputRef.current?.focus({ preventScroll: true });
        // jsdom has no pointer capture; browsers always do.
        if ("setPointerCapture" in event.currentTarget) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        scrub.current = { startX: event.clientX, start: value, last: value };
        setDragCursor("ew-resize");
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>): void => {
        const s = scrub.current;
        if (s === null) {
            return;
        }
        s.last = clamp(Math.round(s.start + (event.clientX - s.startX) * SCRUB_PER_PX));
        setDraft(format.format(s.last));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLSpanElement>): void => {
        const s = scrub.current;
        if (s === null) {
            return;
        }
        scrub.current = null;
        setDragCursor("");
        if (s.last !== value) {
            onCommit(s.last, event);
        }
    };

    return (
        <label className="cm-paint-opacity" data-disabled={disabled || undefined}>
            <input
                ref={inputRef}
                className="cm-paint-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                data-testid={testId}
                data-is-default={isDefault ? "true" : "false"}
                aria-label={ariaLabel}
                aria-describedby={describedBy}
                disabled={disabled}
                value={draft}
                onChange={(event) => {
                    setDraft(event.currentTarget.value);
                }}
                onFocus={(event) => {
                    event.currentTarget.select();
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    if (!isLeavingWithoutCommit(event)) {
                        commitDraft(event);
                    }
                    onBlur?.(event);
                }}
                onKeyDown={handleKeyDown}
            />
            <span
                className="cm-paint-suffix"
                aria-hidden
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                %
            </span>
        </label>
    );
}
