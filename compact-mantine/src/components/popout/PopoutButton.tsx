import { ActionIcon, type ActionIconProps, type ElementProps } from "@mantine/core";
import { forwardRef, type ReactNode } from "react";

import { usePopoutContext } from "./PopoutContext";

/**
 * Props for the PopoutButton component.
 *
 * Every `ActionIcon` prop but `variant` and `children` is accepted as well and
 * is forwarded to the underlying button, so `size`, `color`, `disabled`,
 * `aria-label` and a `data-` attribute all work. The variant is the button's
 * own: the ghost (`subtle`) button, whose open state the theme draws.
 */
export interface PopoutButtonProps
    extends Omit<ActionIconProps, "variant" | "children">,
        ElementProps<"button", "color" | keyof ActionIconProps> {
    /**
     * The drawing on the button.
     *
     * It carries no name of its own, so give the button an `aria-label` saying
     * what the panel it opens is for.
     */
    icon: ReactNode;
}

/**
 * An icon button that opens a pop-out and shows that it is open.
 *
 * It is Figma's 24px ghost icon button (design/figma-spec.md 4.3): transparent
 * at rest, and while its panel is up it takes the "open" look -- the selected
 * ground (#e5f4ff / #394360) with a brand-coloured glyph -- which the theme
 * draws from the `aria-expanded="true"` that `Popout.Trigger` sets. A column of
 * them therefore says at a glance which panel is on screen. Give it an
 * `aria-label`: an icon on its own has no accessible name.
 *
 * Use it inside `Popout.Trigger`, which supplies the open state.
 * @param props - Component props
 * @param props.icon - The drawing on the button
 * @param props.size - How big the button is, defaulting to Figma's 24px `"sm"`
 * @returns The trigger button
 * @example
 * ```tsx
 * <Popout>
 *     <Popout.Trigger>
 *         <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Open settings" />
 *     </Popout.Trigger>
 *     <Popout.Panel width={240} header={{variant: "title", title: "Settings"}}>
 *         <Popout.Content>Content here</Popout.Content>
 *     </Popout.Panel>
 * </Popout>
 * ```
 */
export const PopoutButton = forwardRef<HTMLButtonElement, PopoutButtonProps>(
    function PopoutButton({ icon, size = "sm", ...props }, ref) {
        const { isOpen } = usePopoutContext();

        return (
            <ActionIcon
                ref={ref}
                data-testid="popout-button"
                data-open={isOpen || undefined}
                variant="subtle"
                size={size}
                {...props}
            >
                {icon}
            </ActionIcon>
        );
    },
);
