import { useUncontrolled } from "@mantine/hooks";
import React, { useRef, useState } from "react";

import { PanelLabelsProvider } from "../../context/PanelLabelsContext";
import { useCompactStyles } from "../../theme/useCompactStyles";
import type { ChangeHandler } from "../../types/events";
import { PanelField } from "../rows/PanelField";

/** The words an AnglePicker speaks. */
export interface AnglePickerLabels {
    /** The dial's spoken value: "45 degrees". */
    valueText: (degrees: string) => string;
    /** The number field's name, after the picker's label: "<label>, degrees". */
    field: (label: string) => string;
}

const DEFAULT_LABELS: AnglePickerLabels = {
    valueText: (degrees) => `${degrees} degrees`,
    field: (label) => `${label}, degrees`,
};

/** Props for the AnglePicker component. */
export interface AnglePickerProps {
    /** The angle's name: the dial's accessible name and the caption FieldRow prints above it. */
    label: string;
    /** Degrees, 0 to 359 (any number is wrapped into that range). */
    value?: number;
    /** The angle the picker starts with when it keeps its own state. */
    defaultValue?: number;
    /** Live: every pointer move, arrow key and committed typing. */
    onChange?: ChangeHandler<number>;
    /** Once per finished edit: pointer release, each key step, each typed commit. */
    onChangeEnd?: ChangeHandler<number>;
    /** Where 0 points. @default "top" */
    zeroAt?: "top" | "right";
    /** Which way the angle grows. @default "clockwise" */
    direction?: "clockwise" | "counterclockwise";
    /** The snap step with Shift held, in degrees. @default 15 */
    snap?: number;
    /** Whether the picker cannot be used. */
    disabled?: boolean;
    /** One sentence saying why the picker is off, used only while `disabled` is true. */
    disabledReason?: string;
    /** Replacements for the English words. */
    labels?: Partial<AnglePickerLabels>;
}

/**
 * Wrap any number of degrees into 0 to 359.
 * @param degrees - an angle
 * @returns the same direction, 0 to 359
 */
function wrap(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
}

/**
 * Round an angle to whole degrees, or to the nearest multiple of `snap`, and wrap it.
 * @param degrees - an angle
 * @param snap - the step to round to, or 1
 * @returns the rounded, wrapped angle
 */
function rounded(degrees: number, snap: number): number {
    return wrap(Math.round(degrees / snap) * snap);
}

/**
 * A dial and a number field for picking an angle.
 *
 * Press anywhere in the dial and drag to point its hand (the pointer is captured, so the drag
 * keeps steering outside the dial); hold Shift to snap; Escape during a drag puts the angle back.
 * The dial is a slider for the keyboard, and the number field beside it takes typing,
 * arithmetic and scrubbing. A typed value outside 0-359 wraps rather than clamps.
 *
 * Its label goes above it, as `FieldRow` prints it: put the picker in a `FieldRow` with labels on.
 * @example
 * ```tsx
 * const [angle, setAngle] = useState(0);
 * <AnglePicker label="Rotation" value={angle} onChange={setAngle} />
 * ```
 * @param props - the picker's props
 * @returns the picker
 */
export function AnglePicker(props: Readonly<AnglePickerProps>): React.JSX.Element {
    const {
        label,
        value,
        defaultValue,
        onChange,
        onChangeEnd,
        zeroAt = "top",
        direction = "clockwise",
        snap = 15,
        disabled = false,
        disabledReason,
        labels: labelOverrides,
    } = props;
    useCompactStyles();
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };

    const [angle, setAngle] = useUncontrolled<number>({
        value: value === undefined ? undefined : wrap(value),
        defaultValue: defaultValue === undefined ? undefined : wrap(defaultValue),
        finalValue: 0,
        onChange,
    });
    // The angle a drag started from (null while no drag is running), and the latest angle the drag
    // set, which a release reports before React has drawn it.
    const dragStart = useRef<number | null>(null);
    const latest = useRef(angle);
    latest.current = angle;
    const [dragging, setDragging] = useState(false);

    const zero = zeroAt === "right" ? 90 : 0;
    const sign = direction === "clockwise" ? 1 : -1;

    /**
     * Set the angle, telling onChange only when it moved.
     * @param next - the new angle
     * @param event - the event that set it
     */
    const set = (next: number, event?: React.SyntheticEvent): void => {
        if (next !== latest.current) {
            latest.current = next;
            setAngle(next, event);
        }
    };

    /**
     * The angle a pointer at a point on the page names.
     * @param event - a pointer event over (or captured by) the dial
     * @returns the angle, rounded (snapped with Shift)
     */
    const angleAt = (event: React.PointerEvent<HTMLElement>): number => {
        const box = event.currentTarget.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        // Clockwise from the top of the screen; an angle has no reading direction, so RTL is ignored.
        const screen = (Math.atan2(dx, -dy) * 180) / Math.PI;
        return rounded(sign * (screen - zero), event.shiftKey ? snap : 1);
    };

    /**
     * End a drag.
     * @param event - the event that ended it
     * @param keep - whether the angle stays (a release) or goes back (Escape)
     */
    const endDrag = (event: React.SyntheticEvent, keep: boolean): void => {
        const start = dragStart.current;
        if (start === null) {
            return;
        }
        dragStart.current = null;
        setDragging(false);
        if (keep) {
            onChangeEnd?.(latest.current, event);
        } else {
            set(start, event);
        }
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (disabled || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = latest.current;
        setDragging(true);
        set(angleAt(event), event);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (dragStart.current !== null) {
            set(angleAt(event), event);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (disabled) {
            return;
        }
        if (event.key === "Escape" && dragStart.current !== null) {
            event.preventDefault();
            // The dial consumed it: an enclosing pop-out must not close too.
            event.stopPropagation();
            endDrag(event, false);
            return;
        }
        const step = event.shiftKey ? snap : 1;
        const steps: Record<string, number> = {
            ArrowUp: step,
            ArrowRight: step,
            ArrowDown: -step,
            ArrowLeft: -step,
            PageUp: snap,
            PageDown: -snap,
        };
        let next: number;
        if (event.key === "Home") {
            next = 0;
        } else if (event.key in steps) {
            next = wrap(latest.current + steps[event.key]);
        } else {
            return;
        }
        event.preventDefault();
        set(next, event);
        onChangeEnd?.(next, event);
    };

    const handleFieldChange = (next: string | number, event?: React.SyntheticEvent): void => {
        const parsed = Number(next);
        if (!Number.isFinite(parsed)) {
            return;
        }
        const wrapped = wrap(Math.round(parsed));
        set(wrapped, event);
        onChangeEnd?.(wrapped, event);
    };

    return (
        <div className="cm-angle-picker" data-dragging={dragging ? "true" : undefined}>
            <div // eslint-disable-line jsx-a11y/prefer-tag-over-role, jsx-a11y/role-supports-aria-props -- a circular dial steered in two dimensions, which input type=range cannot draw; aria-description is a global ARIA 1.3 attribute
                className="cm-angle-picker-dial cm-focus-double"
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={359}
                aria-valuenow={angle}
                aria-valuetext={labels.valueText(String(angle))}
                aria-disabled={disabled ? "true" : undefined}
                aria-description={disabled ? disabledReason : undefined}
                title={disabled && disabledReason !== undefined ? `${label}. ${disabledReason}` : label}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => {
                    endDrag(event, true);
                }}
                onLostPointerCapture={(event) => {
                    endDrag(event, true);
                }}
                onKeyDown={handleKeyDown}
            >
                <span
                    className="cm-angle-picker-hand"
                    data-testid="angle-picker-hand"
                    style={{ transform: `rotate(${String(zero + sign * angle)}deg)` }}
                />
                <span className="cm-angle-picker-hub" />
            </div>
            {/* The caption is FieldRow's, above the picker: the field never draws a word of its own. */}
            <PanelLabelsProvider showLabels={false}>
                <PanelField
                    label={labels.field(label)}
                    kind="number"
                    width="fill"
                    value={angle}
                    onChange={handleFieldChange}
                    unit={"\u00b0"}
                    step={1}
                    decimalScale={0}
                    disabled={disabled}
                    disabledReason={disabledReason}
                />
            </PanelLabelsProvider>
        </div>
    );
}
