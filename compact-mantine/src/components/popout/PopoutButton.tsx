import { ActionIcon, type ActionIconProps, type ElementProps } from "@mantine/core";
import { forwardRef, type ReactNode } from "react";

import { usePopoutContext } from "./PopoutContext";

/**
 * Props for the PopoutButton component.
 *
 * Every `ActionIcon` prop but `variant` and `children` is accepted as well and
 * is forwarded to the underlying button, so `size`, `color`, `disabled`,
 * `aria-label` and a `data-` attribute all work. The variant is the button's
 * own: it is what draws the open state.
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
 * An icon button that opens a pop-out and stays lit while it is open.
 *
 * It draws itself dimmed and subtle while the panel is closed and highlighted
 * while it is open, so a column of them says at a glance which panel is on
 * screen. Give it an `aria-label`: an icon on its own has no accessible name.
 *
 * Use it inside `Popout.Trigger`, which supplies the open state it reads.
 * @param props - Component props
 * @param props.icon - The drawing on the button
 * @param props.size - How big the button is, defaulting to the compact 18px `"xs"`
 * @returns The trigger button
 * @example
 * ```tsx
 * <Popout>
 *     <Popout.Trigger>
 *         <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Open settings" />
 *     </Popout.Trigger>
 *     <Popout.Panel width={280} header={{variant: "title", title: "Settings"}}>
 *         <Popout.Content>Content here</Popout.Content>
 *     </Popout.Panel>
 * </Popout>
 * ```
 */
export const PopoutButton = forwardRef<HTMLButtonElement, PopoutButtonProps>(
    function PopoutButton({ icon, size = "xs", ...props }, ref) {
        const { isOpen } = usePopoutContext();

        return (
            <ActionIcon
                ref={ref}
                data-testid="popout-button"
                variant={isOpen ? "light" : "subtle"}
                size={size}
                c={isOpen ? undefined : "dimmed"}
                {...props}
            >
                {icon}
            </ActionIcon>
        );
    },
);
