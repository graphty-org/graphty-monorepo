import { Menu, type MenuItemProps } from "@mantine/core";
import type { ComponentPropsWithoutRef, JSX, ReactElement } from "react";

import { UiGlyph } from "../../icons";

// Accessibility: a real menuitemcheckbox (or menuitemradio) with aria-checked.
// Mantine's Menu.Item writes role="menuitem" after the props it is given, so the
// role is set on the rendered root through renderRoot, which receives the final
// props. Keyboard behavior (arrows, Home / End, type-ahead, Enter / Space) is
// the menu's own, unchanged: the row keeps data-menu-item.

/**
 * Props for MenuCheckItem: every `Menu.Item` prop except the leading section,
 * which is the check column, plus the checked state.
 */
export interface MenuCheckItemProps
    extends Omit<MenuItemProps, "leftSection">,
        Omit<ComponentPropsWithoutRef<"button">, keyof MenuItemProps | "role"> {
    /** Whether the row is checked: the white check shows in the 16px column. */
    checked: boolean;
    /** Render a `menuitemradio` (one of a set) instead of a `menuitemcheckbox`. */
    radio?: boolean;
}

/**
 * A menu row with Figma's 16 x 16 check column (design/figma-spec.md 8.1): the
 * white 9 x 8.5 check shows when `checked` and is invisible (but keeps its
 * space) when not, so the labels of a menu's rows stay aligned 32px from its
 * edge. Use it inside a Mantine `Menu.Dropdown` beside ordinary items.
 * @param props - Component props
 * @param props.checked - Whether the row is checked
 * @param props.radio - Whether the row is one of a set of radio rows
 * @returns The menu row
 * @example
 * ```tsx
 * <Menu.Dropdown>
 *     <MenuCheckItem checked={rulers} onClick={toggleRulers}>Rulers</MenuCheckItem>
 *     <MenuCheckItem checked={grid} onClick={toggleGrid}>Pixel grid</MenuCheckItem>
 * </Menu.Dropdown>
 * ```
 */
export function MenuCheckItem({ checked, radio = false, ...props }: MenuCheckItemProps): JSX.Element {
    return (
        <Menu.Item
            {...props}
            leftSection={
                <span className="cm-menu-row-check" aria-hidden="true">
                    <UiGlyph name="check" size={16} />
                </span>
            }
            renderRoot={(rootProps: Record<string, unknown>): ReactElement => (
                <button
                    type="button"
                    {...rootProps}
                    role={radio ? "menuitemradio" : "menuitemcheckbox"}
                    aria-checked={checked}
                />
            )}
        />
    );
}
