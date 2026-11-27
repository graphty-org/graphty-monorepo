/**
 * A thing's groups of settings (design/ui/style-panel-v2/design.md, "Input rules"): the "..." in its pop-over's header
 * opens a menu of the groups, a mark on each one the layer sets, or with one group opens it directly. Choosing a
 * group opens that group's own pop-over beside the pop-over, which stays open and uncovered (compact-mantine's
 * `placement="beside"`); one group pop-over is open at a time.
 */

import { MenuGroupItem, Popout, type PopoutHeaderMore } from "@graphty/compact-mantine";
import { Menu } from "@mantine/core";
import React, { useContext, useLayoutEffect, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { HeaderMoreContext } from "../../options/useHeaderMore";

/** The "..." button's name and tooltip, the same in every pop-over. */
export const MORE_NAME = "More settings";

/** A group pop-over's width: the settings pop-over's own. */
const GROUP_WIDTH = 264;

/** A group in the "..." menu: its name, and the heading it is listed under (a label's Placement, Letters, ...). */
export interface MenuGroup {
    readonly name: string;
    readonly heading?: string;
}

/**
 * The "...": see the file header.
 * @param props - Component props
 * @param props.groups - the thing's groups, in menu order
 * @param props.isSet - whether the layer sets a line of a group
 * @param props.onUnset - takes every line of a group off the layer
 * @param props.linesOf - a group's lines
 * @returns each group's pop-over (closed until chosen), or nothing without groups
 */
export function GroupMenu<G extends MenuGroup>({
    groups,
    isSet,
    onUnset,
    linesOf,
}: Readonly<{
    groups: readonly G[];
    isSet: (group: G) => boolean;
    onUnset: (group: G) => void;
    linesOf: (group: G) => React.ReactNode;
}>): React.JSX.Element | null {
    const setMore = useContext(HeaderMoreContext);
    // on reload: fresh: pointer: a menu held open by its control
    const [open, setOpen] = useState<string | null>(null);
    const sets = groups.map((group) => isSet(group));
    // Handed to the pop-over's frame each render: the frame's re-render draws its header only, as this content is
    // the same element to it.
    const more = ((): PopoutHeaderMore | undefined => {
        if (groups.length === 0) {
            return undefined;
        }
        const set = sets.some(Boolean);
        const [only] = groups;
        if (groups.length === 1) {
            return {
                label: MORE_NAME,
                set,
                expanded: open === only.name,
                onClick: () => {
                    setOpen((now) => (now === only.name ? null : only.name));
                },
            };
        }
        // A menu short enough for one heading needs none (owner, 2026-11-24: headings of at most 6 entries each).
        const headed = groups.length > 6;
        return {
            label: MORE_NAME,
            set,
            children: groups.map((group, at) => (
                <React.Fragment key={group.name}>
                    {headed && group.heading !== undefined && group.heading !== groups[at - 1]?.heading ? (
                        <Menu.Label>{group.heading}</Menu.Label>
                    ) : null}
                    <MenuGroupItem
                        set={sets[at]}
                        onClick={() => {
                            setOpen(group.name);
                        }}
                    >
                        {group.name}
                    </MenuGroupItem>
                </React.Fragment>
            )),
        };
    })();
    // Before paint: the pop-over never draws a frame without its "...".
    useLayoutEffect(() => {
        setMore?.(more);
        return () => {
            setMore?.(undefined);
        };
    }, [setMore, more]);
    if (groups.length === 0) {
        return null;
    }
    if (setMore === null && import.meta.env.DEV) {
        throw new Error('A "..." menu has no pop-over to put it in: draw it inside a settings pop-over.');
    }
    return (
        <>
            {groups.map((group, at) => (
                <Popout
                    key={group.name}
                    opened={open === group.name}
                    onOpenChange={(next) => {
                        if (!next) {
                            setOpen((now) => (now === group.name ? null : now));
                        }
                    }}
                >
                    <Popout.Panel
                        width={GROUP_WIDTH}
                        placement="beside"
                        header={{ variant: "title", title: group.name }}
                        closeLabel={`Close ${group.name}`}
                        actions={
                            sets[at]
                                ? [
                                      {
                                          id: "remove",
                                          label: `Remove ${group.name.toLowerCase()}`,
                                          icon: <GLYPHS.remove size={14} aria-hidden />,
                                          onClick: () => {
                                              onUnset(group);
                                          },
                                      },
                                  ]
                                : undefined
                        }
                    >
                        <Popout.Content>
                            <div data-thing-popover="" data-group-pop={group.name}>
                                {linesOf(group)}
                            </div>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            ))}
        </>
    );
}
