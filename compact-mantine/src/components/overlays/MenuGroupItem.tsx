import { Menu, type MenuItemProps, VisuallyHidden } from "@mantine/core";
import type { ComponentPropsWithoutRef, JSX } from "react";

import { useLabels } from "../../i18n";

// Accessibility: an ordinary menuitem that opens a dialog (aria-haspopup="dialog"). The set mark
// is drawn for the eye only; a screen reader hears the row's name followed by the `groupSet`
// label ("Wrap, set"). It is not a check: a check says a row is on, this says a group of settings
// behind the row has something in effect.

/**
 * Props for MenuGroupItem: every `Menu.Item` prop except the trailing section, which holds the set
 * mark, plus whether the group is set.
 */
export interface MenuGroupItemProps
    extends
        Omit<MenuItemProps, "rightSection">,
        Omit<ComponentPropsWithoutRef<"button">, keyof MenuItemProps | "aria-haspopup"> {
    /** Whether the group of settings this row opens has something set: the mark shows at its end. */
    set?: boolean;
}

/**
 * A row of a "..." menu that opens one group of a thing's settings in its own pop-over (a label's
 * Position, Wrap or Badge). When the group has settings in effect, a 5 x 5 brand dot shows at the
 * row's end -- in the row's text color while it is highlighted -- so a reader sees which groups
 * are set before opening any.
 * @param props - Component props
 * @param props.set - Whether the group has something set
 * @param props.children - The group's name
 * @returns The menu row
 * @example
 * ```tsx
 * <Popout.Panel
 *     width={240}
 *     header={{ variant: "title", title: "Label" }}
 *     more={{
 *         label: "More label settings",
 *         set: wrapSet || badgeSet,
 *         children: (
 *             <>
 *                 <MenuGroupItem set={wrapSet} onClick={() => setGroup("wrap")}>Wrap</MenuGroupItem>
 *                 <MenuGroupItem set={badgeSet} onClick={() => setGroup("badge")}>Badge</MenuGroupItem>
 *             </>
 *         ),
 *     }}
 * >
 * ```
 */
export function MenuGroupItem({ set = false, children, ...props }: Readonly<MenuGroupItemProps>): JSX.Element {
    const labels = useLabels();
    return (
        <Menu.Item
            {...props}
            aria-haspopup="dialog"
            data-set={set ? "" : undefined}
            rightSection={set ? <span className="cm-menu-row-set" aria-hidden="true" /> : undefined}
        >
            {children}
            {set ? <VisuallyHidden>{`, ${labels.groupSet}`}</VisuallyHidden> : null}
        </Menu.Item>
    );
}
