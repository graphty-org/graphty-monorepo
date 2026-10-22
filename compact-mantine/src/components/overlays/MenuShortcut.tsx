import type { JSX, ReactNode } from "react";

/**
 * A menu row's shortcut, drawn at its right as Figma does ("F2", "Ctrl+D"). It is hidden from
 * assistive technology, so the row's name stays its label ("Rename", not "Rename F2"); give the
 * row `aria-keyshortcuts` with the same keys in ARIA's spelling ("Control+D", "Meta+D") so a
 * screen reader still says them.
 * @param props - Component props
 * @param props.children - The keys as the reader reads them
 * @returns The shortcut text
 * @example
 * ```tsx
 * <Menu.Item aria-keyshortcuts="Control+D" rightSection={<MenuShortcut>Ctrl+D</MenuShortcut>}>
 *     Duplicate
 * </Menu.Item>
 * ```
 */
export function MenuShortcut({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
    return <span aria-hidden="true">{children}</span>;
}
