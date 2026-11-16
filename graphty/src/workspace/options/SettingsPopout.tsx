import { AdvancedButton, Popout } from "@graphty/compact-mantine";
import { Tooltip } from "@mantine/core";
import React, { createContext, useContext } from "react";

import { GLYPHS } from "../glyphs";

/** Whether this part of the tree is already inside a settings popover. */
const InSettings = createContext(false);

/** Props for SettingsPopout. */
interface SettingsPopoutProps {
    /** Names the button: its tooltip and accessible name, and the panel's heading unless `title` is set. */
    label: string;
    /** The panel's heading, when it differs from the button's name. */
    title?: string;
    /** The button's tooltip, when it says more than its name. */
    tip?: string;
    /** Whether a setting inside is changed from its default, drawn on and said by the button. */
    changed?: boolean;
    /** Whether the panel is open, when the caller drives it. */
    opened?: boolean;
    /** Called when the panel opens or closes. */
    onOpenChange?: (opened: boolean) => void;
    /** The panel's width. */
    width?: number;
    /** The side of the button it opens on: `right` only where the row sits at the window's start edge. */
    placement?: "left" | "right";
    /** The highest the panel's top may sit. */
    boundaryTop?: number;
    /** The button's glyph; the settings gear by default. */
    icon?: React.ReactNode;
    /** The settings. */
    children: React.ReactNode;
}

/**
 * A row's settings, the one way every panel shows them: a row draws its key values inline, and all
 * its other settings go in this one light popover, opened by the 24px settings button in the row's
 * trailing slot and anchored to it. A popover may open a child to pick a value (a color, a column),
 * never for more settings, so one of these inside another throws while developing. A form that is
 * itself a popover (Analyze, Layout) draws all its settings flat and needs none of this.
 * @param props - Component props
 * @param props.label - Names the button, and the panel unless `title` is set
 * @param props.title - The panel's heading
 * @param props.tip - The button's tooltip
 * @param props.changed - Whether a setting inside is changed from its default
 * @param props.opened - Whether the panel is open, when the caller drives it
 * @param props.onOpenChange - Called when the panel opens or closes
 * @param props.width - The panel's width
 * @param props.placement - The side of the button it opens on
 * @param props.boundaryTop - The highest the panel's top may sit
 * @param props.icon - The button's glyph
 * @param props.children - The settings
 * @returns The button and its popover
 */
export function SettingsPopout({
    label,
    title = label,
    tip = label,
    changed = false,
    opened,
    onOpenChange,
    width = 264,
    placement = "left",
    boundaryTop,
    icon = <GLYPHS.settings size={14} aria-hidden />,
    children,
}: Readonly<SettingsPopoutProps>): React.JSX.Element {
    if (useContext(InSettings) && import.meta.env.DEV) {
        throw new Error(`The ${label} popover is inside another settings popover: draw its settings flat there.`);
    }
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>
                <Tooltip label={tip}>
                    <AdvancedButton label={label} changed={changed} icon={icon} />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel
                width={width}
                placement={placement}
                alignment="start"
                boundaryTop={boundaryTop}
                header={{ variant: "title", title }}
                closeLabel={`Close ${title}`}
            >
                <Popout.Content>
                    <InSettings.Provider value>{children}</InSettings.Provider>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
