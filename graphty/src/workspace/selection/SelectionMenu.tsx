/**
 * A group's or a step's "..." menu items in the style tree's row-command grammar
 * (graph-place/commands.ts, RowMenu.tsx): icon, words and key per item, a divider between groups,
 * one order -- edit, view, remove.
 */

import { Menu } from "@mantine/core";
import React from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";

/** One item of a group's or a step's "..." menu, in the style tree's row-command grammar. */
export interface SelectionMenuItem {
    readonly id: string;
    readonly label: string;
    readonly icon: keyof typeof GLYPHS;
    /** Its group, in the tree's order: a divider falls between two groups. */
    readonly group: "edit" | "view" | "remove";
    readonly key?: string;
    readonly reason?: string | null;
    /** Whether the reason is drawn under the label; false greys the item and only says why to a screen reader. */
    readonly reasonDrawn?: boolean;
    readonly onRun: () => void;
}

/**
 * A "..." menu's items, drawn as the style tree's row menu draws its commands: icon, words and
 * key per item, a divider between groups, one order (edit, view, remove).
 * @param props - Component props
 * @param props.items - the items, in order within each group
 * @returns The items
 */
export function SelectionMenuItems({ items }: Readonly<{ items: readonly SelectionMenuItem[] }>): React.JSX.Element {
    const groups = (["edit", "view", "remove"] as const)
        .map((group) => items.filter((item) => item.group === group))
        .filter((each) => each.length > 0);
    return (
        <>
            {groups.map((each, index) => (
                <React.Fragment key={each[0]?.group}>
                    {index > 0 ? <Menu.Divider /> : null}
                    {each.map((item) => {
                        const Glyph = GLYPHS[item.icon];
                        return (
                            <CommandMenuItem
                                key={item.id}
                                label={item.label}
                                icon={<Glyph size={14} aria-hidden />}
                                shortcut={item.key}
                                reason={item.reason ?? null}
                                reasonDrawn={item.reasonDrawn ?? true}
                                onRun={item.onRun}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </>
    );
}
