import { type ElementProps, Menu, type MenuProps, Tooltip, UnstyledButton, type UnstyledButtonProps } from "@mantine/core";
import React from "react";

import { useLabels } from "../../i18n";
import { useShellStyles } from "./roving";

/**
 * Figma's bare question mark (bc/help-button--default #25 #26): the 24-unit help widget glyph
 * drawn in a 30 x 32 box, so the mark is 8.5 x 15.8.
 * @returns The glyph
 */
function HelpGlyph(): React.JSX.Element {
    return (
        <svg width="30" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: "none" }}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.69 16.572q.357 0 .61.254a.83.83 0 0 1 .26.616q0 .236-.12.435a.9.9 0 0 1-.315.32.84.84 0 0 1-.435.114.85.85 0 0 1-.615-.253.85.85 0 0 1-.254-.616.84.84 0 0 1 .254-.616.85.85 0 0 1 .615-.254m.332-10.884q1.002 0 1.763.416.76.41 1.19 1.13.428.712.428 1.635 0 .61-.193 1.111a2.9 2.9 0 0 1-.58.924 4.8 4.8 0 0 1-.954.797 4.6 4.6 0 0 0-.863.718 2.1 2.1 0 0 0-.459.815q-.138.453-.15 1.117c0 .18-.146.326-.326.326h-.44a.326.326 0 0 1-.327-.326q.006-.954.21-1.551.207-.598.604-1.009a5.5 5.5 0 0 1 1.003-.797q.447-.29.748-.61.308-.325.465-.711a2.2 2.2 0 0 0 .163-.852q0-.651-.307-1.14a2.04 2.04 0 0 0-.822-.755 2.450 2.450 0 0 0-1.153-.272q-.603 0-1.129.266a2.15 2.15 0 0 0-1.138 1.483c-.067.3-.312.545-.619.545-.323 0-.588-.269-.53-.587a3.12 3.12 0 0 1 1.678-2.268 3.7 3.7 0 0 1 1.738-.405"
            />
        </svg>
    );
}

/**
 * Props for the HelpButton component.
 */
export interface HelpButtonProps extends Omit<UnstyledButtonProps, "children">, Omit<ElementProps<"button">, "children"> {
    /** Accessible name and tooltip. Defaults to the "Help" label. */
    label?: string;
    /** The menu's items (`Menu.Item`, `Menu.Divider`, ...). Without any, the button opens nothing. */
    children?: React.ReactNode;
    /** Extra props for the Mantine `Menu` (its `opened`, `onChange`, ...). */
    menuProps?: Omit<MenuProps, "children">;
}

/**
 * Figma's floating help button: a 32 x 32 circle on `--cm-bg` with the 200 elevation and no hover
 * change. Its tooltip shows and hides at once outside a Tooltip.Group; its focus ring (1px at -2px) fades in over 200ms.
 * It opens a dark menu of the caller's items, 4px above and end-aligned.
 * @param props - Component props
 * @param props.label - Accessible name and tooltip
 * @param props.children - The menu's items
 * @param props.menuProps - Extra props for the Mantine `Menu`
 * @param props.className - Extra class on the root
 * @returns The help button
 */
export function HelpButton({ label, children, menuProps, className, ...others }: HelpButtonProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const name = label ?? labels.help;
    const button = (
        <UnstyledButton {...others} aria-label={name} className={className ? `cm-help-button ${className}` : "cm-help-button"}>
            <HelpGlyph />
        </UnstyledButton>
    );
    // Instant show and hide (flows.md 211). Inside the app's shell-wide Tooltip.Group Mantine uses
    // the group's delays instead; the button joins that group rather than nesting its own, so the
    // warm hand-off crosses the whole shell (spec 8.3).
    const tip = (target: React.ReactElement): React.JSX.Element => (
        <Tooltip label={name} position="top" openDelay={0} closeDelay={0}>
            {target}
        </Tooltip>
    );
    if (!children) {
        return tip(button);
    }
    // The tooltip wraps Menu.Target (not the reverse), or the target's click never opens the menu.
    return (
        <Menu position="top-end" offset={4} classNames={{ dropdown: "cm-menu-surface", item: "cm-menu-row" }} {...menuProps}>
            {tip(<Menu.Target>{button}</Menu.Target>)}
            <Menu.Dropdown>{children}</Menu.Dropdown>
        </Menu>
    );
}
