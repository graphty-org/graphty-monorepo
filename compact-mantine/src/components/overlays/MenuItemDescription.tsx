import type { JSX, ReactNode } from "react";

/**
 * A menu row's second line, under its label: why a disabled row cannot run ("Only in 3D"), or
 * what the row does. A row holding one grows from 24px to a 44px touch target and keeps both
 * lines whole; the line itself is the menu's secondary ink.
 * @param props - Component props
 * @param props.children - The line's text
 * @returns The line
 * @example
 * ```tsx
 * <Menu.Item aria-disabled data-disabled>
 *     Camera views
 *     <MenuItemDescription>Only in 3D</MenuItemDescription>
 * </Menu.Item>
 * ```
 */
export function MenuItemDescription({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
    return <span className="cm-menu-item-description">{children}</span>;
}
