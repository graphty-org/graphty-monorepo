import { ActionIcon, Box, type BoxProps, type ElementProps, Menu, type MenuProps, Tooltip } from "@mantine/core";
import type { MouseEventHandler, ReactNode } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { UiGlyph } from "../../icons";
import { TargetTooltip } from "../overlays/TargetTooltip";

/** Props for SplitButton. */
export interface SplitButtonProps extends BoxProps, ElementProps<"div", "onClick"> {
    /** The main half's glyph. */
    icon: ReactNode;
    /** The main half's accessible name and tooltip ("Present"). */
    label: string;
    /** Called when the main half is activated. */
    onClick?: MouseEventHandler<HTMLButtonElement>;
    /** The chevron half's accessible name and tooltip ("Prototype view"). */
    menuLabel: string;
    /** The menu the chevron opens: `Menu.Item`, `Menu.Label`, `Menu.Divider` ... */
    children: ReactNode;
    /** `md` (Figma's header size): a 32 x 32 main half and a 16 x 32 chevron. `sm`: 24 tall. @default "md" */
    size?: "sm" | "md";
    /** Disable both halves. */
    disabled?: boolean;
    /** Passed to the Mantine Menu (position, offset, opened / onChange ...). */
    menuProps?: Omit<MenuProps, "children">;
}

// Accessibility: a role=group holding two real buttons, each named. The chevron opens a Mantine
// Menu (arrow keys, Escape returns focus to the chevron); TargetTooltip hands Menu.Target's
// aria-haspopup / aria-expanded / aria-controls to the chevron.

/**
 * Two icon buttons joined into one control (design/figma-spec.md 4.5): a main action and a
 * chevron that opens a menu of related choices. Hovering either half lights both; the pressed half
 * darkens; the chevron shows the selected ground and a brand caret while its menu is open.
 * @param props - Component props
 * @param props.icon - The main half's glyph
 * @param props.label - The main half's accessible name and tooltip, and the group's name
 * @param props.onClick - Called when the main half is activated
 * @param props.menuLabel - The chevron's accessible name and tooltip
 * @param props.children - The menu the chevron opens
 * @param props.size - md (32 tall, the default) or sm (24 tall)
 * @param props.disabled - Disable both halves
 * @param props.menuProps - Passed to the Mantine Menu
 * @param props.className - Added to the group
 * @returns The split button
 * @example
 * ```tsx
 * <SplitButton icon={<PlayGlyph />} label="Present" menuLabel="Prototype view" onClick={present}>
 *     <Menu.Item>Present</Menu.Item>
 *     <Menu.Item>Preview</Menu.Item>
 * </SplitButton>
 * ```
 */
export function SplitButton({
    icon,
    label,
    onClick,
    menuLabel,
    children,
    size = "md",
    disabled,
    menuProps,
    className,
    ...rest
}: SplitButtonProps): React.JSX.Element {
    return (
        <Box
            data-testid="split-button"
            {...rest}
            role="group"
            aria-label={label}
            className={className ? `cm-split ${className}` : "cm-split"}
        >
            <Tooltip label={label}>
                <ActionIcon
                    className="cm-split-main"
                    size={size}
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                >
                    {icon}
                </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" {...menuProps}>
                <Menu.Target>
                    <TargetTooltip label={menuLabel}>
                        <ActionIcon className="cm-split-chevron" size={size} aria-label={menuLabel} disabled={disabled}>
                            <UiGlyph name="caretDown" size={PANEL_GRID.CHEVRON} />
                        </ActionIcon>
                    </TargetTooltip>
                </Menu.Target>
                <Menu.Dropdown>{children}</Menu.Dropdown>
            </Menu>
        </Box>
    );
}
