import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { forwardRef, type ReactNode } from "react";

import { usePopoutContext } from "./PopoutContext";

/**
 * Props for the PopoutButton component.
 */
export interface PopoutButtonProps extends Omit<ActionIconProps, "variant" | "children"> {
    /** The icon to display inside the button */
    icon: ReactNode;
}

/**
 * A button component designed to be used as a Popout trigger.
 * Automatically highlights when the associated popout is open.
 * Features:
 * - Uses `subtle` variant when popout is closed (dimmed appearance)
 * - Uses `light` variant when popout is open (highlighted appearance)
 * - Must be used within a Popout component (inside Popout.Trigger)
 * @example
 * ```tsx
 * <Popout>
 *     <Popout.Trigger>
 *         <PopoutButton icon={<Settings size={12} />} aria-label="Open settings" />
 *     </Popout.Trigger>
 *     <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
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
