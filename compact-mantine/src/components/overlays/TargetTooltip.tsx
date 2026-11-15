import { Tooltip, type TooltipProps } from "@mantine/core";
import { cloneElement, forwardRef, type ReactElement } from "react";

/** Props for TargetTooltip: Mantine Tooltip's props, with one element child (the button). */
export interface TargetTooltipProps extends TooltipProps {
    /** The button the menu or popover opens from. */
    children: ReactElement;
}

/** What Menu.Target and Popover.Target put on their child to say the popup is open. */
type TargetState = Record<"aria-haspopup" | "aria-expanded" | "aria-controls" | "data-expanded", unknown>;

/**
 * A Tooltip for a button that opens a Menu or a Popover, placed between `Menu.Target` (or
 * `Popover.Target`) and the button. The target writes `aria-haspopup`, `aria-expanded`,
 * `aria-controls`, `id` and `data-expanded` on its direct child; a plain Tooltip there would put
 * them on its floating label, so the button would never show the open style (design/figma-spec.md,
 * an icon button with `aria-expanded="true"`) and a screen reader would never hear the menu is
 * open. TargetTooltip hands them to the button.
 * @param props - Mantine Tooltip props
 * @param props.children - The button
 * @returns The tooltip around the button
 * @example
 * ```tsx
 * <Menu>
 *     <Menu.Target>
 *         <TargetTooltip label="Add source">
 *             <ActionIcon aria-label="Add source">+</ActionIcon>
 *         </TargetTooltip>
 *     </Menu.Target>
 *     <Menu.Dropdown>...</Menu.Dropdown>
 * </Menu>
 * ```
 */
export const TargetTooltip = forwardRef<HTMLDivElement, TargetTooltipProps>(function TargetTooltip(
    {
        children,
        id,
        "aria-haspopup": hasPopup,
        "aria-expanded": expanded,
        "aria-controls": controls,
        "data-expanded": dataExpanded,
        ...tooltipProps
    }: TargetTooltipProps & Partial<TargetState>,
    ref,
) {
    const state = {
        id,
        "aria-haspopup": hasPopup,
        "aria-expanded": expanded,
        "aria-controls": controls,
        "data-expanded": dataExpanded,
    };
    // Only what the target set: undefined would erase what the button sets on itself.
    const forwarded = Object.fromEntries(Object.entries(state).filter(([, value]) => value !== undefined));
    return (
        <Tooltip ref={ref} {...tooltipProps}>
            {cloneElement(children, forwarded)}
        </Tooltip>
    );
});
