import { ActionIcon, type ActionIconProps, type ElementProps, Tooltip } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { forwardRef, type MouseEvent, type PointerEvent, type ReactNode, useRef } from "react";

/**
 * Props for ToggleIconButton.
 *
 * Every ActionIcon prop but `variant`, `children` and `onChange` is accepted and reaches the
 * button (`size`, `disabled`, `className`, a `data-` attribute ...).
 */
export interface ToggleIconButtonProps
    extends Omit<ActionIconProps, "variant" | "children">,
        ElementProps<"button", "color" | "onChange" | keyof ActionIconProps> {
    /** Whether the toggle is on (controlled). */
    checked?: boolean;
    /** Whether the toggle starts on (uncontrolled). @default false */
    defaultChecked?: boolean;
    /** Called with the new state when the toggle flips. */
    onChange?: (checked: boolean) => void;
    /** The accessible name, and the tooltip text. */
    label: string;
    /** The glyph. */
    icon: ReactNode;
    /** The glyph drawn while on, for a `swap` toggle (eye / eye closed). */
    checkedIcon?: ReactNode;
    /**
     * `fill` (default): on is the selected ground with a brand glyph (lock aspect ratio, use as
     * mask). `swap`: never filled, on swaps the glyph (the visibility eye).
     * @default "fill"
     */
    variant?: "fill" | "swap";
    /** Show the tooltip. @default true */
    withTooltip?: boolean;
}

// Accessibility: the APG "Button" pattern in its toggle form -- a real <button> with
// aria-pressed, so Space and Enter toggle it and a screen reader announces "toggle button,
// pressed". Figma draws this control as a visually hidden checkbox under a label; the role is
// equivalent and the button needs no hidden input.
//
// The pointer toggles on pointer DOWN, as Figma's does (C12), and the click that follows the same
// press is swallowed. A click with no press before it (the keyboard, or a click from assistive
// technology, `detail` 0 or no pointerdown) toggles on its own.
//
// A press dragged down a column toggles every toggle it enters to the value the first one took
// (flows.md, row actions). The value lives in module state until the pointer is released.
// ponytail: one drag state for every toggle on the page, so a drag that wanders into another
// column sets those too; scope it per column if that ever matters.
let dragValue: boolean | null = null;
const endDrag = (): void => {
    dragValue = null;
};

/**
 * A 24 x 24 icon toggle (design/figma-spec.md 4.4): lock aspect ratio, use as mask, visibility.
 * @param props - Component props
 * @returns The toggle
 * @example
 * ```tsx
 * <ToggleIconButton label="Lock aspect ratio" icon={<UiGlyph name="unlock" />} checkedIcon={<UiGlyph name="lock" />} />
 * ```
 */
export const ToggleIconButton = forwardRef<HTMLButtonElement, ToggleIconButtonProps>(function ToggleIconButton(
    {
        checked,
        defaultChecked,
        onChange,
        label,
        icon,
        checkedIcon,
        variant = "fill",
        withTooltip = true,
        disabled,
        className,
        onPointerDown,
        onPointerEnter,
        onClick,
        ...rest
    },
    ref,
) {
    const [on, setOn] = useUncontrolled({ value: checked, defaultValue: defaultChecked, finalValue: false, onChange });
    const pressed = useRef(false);

    const handlePointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
        onPointerDown?.(event);
        if (event.button !== 0 || disabled) {
            return;
        }
        pressed.current = true;
        // A touch press captures the pointer to this button; release it so the drag reaches the rest.
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragValue = !on;
        window.addEventListener("pointerup", endDrag, { once: true });
        window.addEventListener("pointercancel", endDrag, { once: true });
        setOn(!on);
    };

    const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>): void => {
        onPointerEnter?.(event);
        if (dragValue === null || (event.buttons & 1) === 0 || disabled || on === dragValue) {
            return;
        }
        setOn(dragValue);
    };

    const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event);
        const fromPress = pressed.current && event.detail > 0;
        pressed.current = false;
        if (!fromPress) {
            setOn(!on);
        }
    };

    const button = (
        <ActionIcon
            data-testid="toggle-icon-button"
            {...rest}
            ref={ref}
            variant="subtle"
            className={className ? `cm-toggle-icon ${className}` : "cm-toggle-icon"}
            aria-label={label}
            aria-pressed={on}
            data-swap={variant === "swap" || undefined}
            disabled={disabled}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onClick={handleClick}
        >
            {on && checkedIcon ? checkedIcon : icon}
        </ActionIcon>
    );

    return withTooltip ? <Tooltip label={label}>{button}</Tooltip> : button;
});
