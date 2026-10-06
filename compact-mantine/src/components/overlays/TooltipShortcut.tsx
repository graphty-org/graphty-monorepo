import type { JSX, ReactNode } from "react";

/**
 * Props for TooltipShortcut.
 */
export interface TooltipShortcutProps {
    /** What the control does, such as "Align left". */
    label: ReactNode;
    /** Its keyboard shortcut, such as "Alt+A". */
    shortcut: ReactNode;
}

/**
 * A tooltip label with its keyboard shortcut on the same line (design/figma-spec.md
 * 8.3): the shortcut sits 12px after the label in the tooltip's secondary text
 * color, as Figma's "Align left  Alt+A". Pass it as a Tooltip's `label`. The
 * tooltip's `aria-describedby` reads both.
 * @param props - Component props
 * @param props.label - What the control does
 * @param props.shortcut - Its keyboard shortcut
 * @returns The label and shortcut
 * @example
 * ```tsx
 * <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />}>
 *     <ActionIcon aria-label="Align left">...</ActionIcon>
 * </Tooltip>
 * ```
 */
export function TooltipShortcut({ label, shortcut }: TooltipShortcutProps): JSX.Element {
    return (
        <span className="cm-tooltip-shortcut-row">
            <span>{label}</span>
            <span className="cm-tooltip-shortcut">{shortcut}</span>
        </span>
    );
}
