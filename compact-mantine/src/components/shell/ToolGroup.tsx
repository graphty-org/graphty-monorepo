import { Menu, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { UiGlyph } from "../../icons";
import { TipLabel, ToolButton } from "./ToolButton";

/** One tool of a group: what the face and the flyout row show. */
export interface ToolItem {
    /** The tool's identifier, handed to `onToolChange`. */
    value: string;
    /** The tool's name. */
    label: string;
    /** The tool's glyph (drawn in a 24px box). */
    icon: React.ReactNode;
    /** The keyboard shortcut shown in the tooltip and the flyout, such as `"R"`. */
    shortcut?: string;
}

/**
 * Props for the ToolGroup component.
 */
export interface ToolGroupProps {
    /** The chevron's accessible name and tooltip, and the flyout's name, such as "Shape tools". */
    label: string;
    /** The tools of the group, in flyout order. */
    tools: readonly ToolItem[];
    /** The toolbar's current tool. When it is one of this group's tools, the face shows it selected. */
    activeTool?: string | null;
    /** Called with a tool's value when the face is clicked or a flyout row is picked. */
    onToolChange?: (value: string) => void;
    /** The tool the face shows until one is picked. Defaults to the first tool. */
    defaultFace?: string;
    /** Extra attributes for the chevron button, such as a `data-testid` or a forced `data-state`. */
    chevronProps?: React.ComponentPropsWithoutRef<"button"> & { [data: `data-${string}`]: string | undefined };
}

function asMenuItemRadio(el: HTMLButtonElement | null): void {
    el?.setAttribute("role", "menuitemradio");
}

/**
 * A tool and its flyout (Figma's tool group): the face is the LAST tool picked from the flyout,
 * and a 16 x 32 chevron 1px after it opens a dark menu 4px above, start-aligned to the chevron,
 * whose rows are radios with a check on the current face. Picking a row selects the tool, makes
 * it the face and closes the menu.
 * @param props - Component props
 * @param props.label - The chevron's name, such as "Shape tools"
 * @param props.tools - The tools of the group
 * @param props.activeTool - The toolbar's current tool
 * @param props.onToolChange - Called with a tool's value when it is picked
 * @param props.defaultFace - The tool the face shows until one is picked
 * @param props.chevronProps - Extra attributes for the chevron button
 * @returns The tool group
 */
export function ToolGroup({ label, tools, activeTool, onToolChange, defaultFace, chevronProps }: ToolGroupProps): React.JSX.Element {
    const [picked, setPicked] = useState(defaultFace ?? tools[0]?.value);
    const isMember = tools.some((t) => t.value === activeTool);
    // A tool chosen elsewhere (a shortcut) becomes the face too.
    useEffect(() => {
        if (isMember && activeTool) {
            setPicked(activeTool);
        }
    }, [isMember, activeTool]);
    const faceValue = isMember && activeTool ? activeTool : picked;
    const face = tools.find((t) => t.value === faceValue) ?? tools[0];
    const pick = (value: string): void => {
        setPicked(value);
        onToolChange?.(value);
    };
    const faceRef = useRef<HTMLButtonElement>(null);
    const chevronRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pickedFromFlyout = useRef(false);
    // Closing the flyout returns focus itself (Mantine's returnFocus would always pick the
    // chevron): after a pick it goes to the face, the newly selected tool, so the toolbar's Tab
    // stop is that tool (spec 11.1); otherwise back to the chevron. Focus the reader moved
    // elsewhere (a click outside) is left alone.
    const onFlyoutClose = (): void => {
        const target = pickedFromFlyout.current ? faceRef.current : chevronRef.current;
        pickedFromFlyout.current = false;
        const active = document.activeElement;
        if (active === null || active === document.body || dropdownRef.current?.contains(active) || active === chevronRef.current) {
            target?.focus();
        }
    };

    return (
        <div className="cm-tool-group" role="group" aria-label={face.label}>
            <ToolButton
                ref={faceRef}
                label={face.label}
                icon={face.icon}
                shortcut={face.shortcut}
                selected={activeTool === undefined ? undefined : activeTool === face.value}
                onClick={() => {
                    pick(face.value);
                }}
            />
            <Menu
                position="top-start"
                offset={4}
                returnFocus={false}
                onClose={onFlyoutClose}
                classNames={{ dropdown: "cm-menu-surface", item: "cm-menu-row cm-tool-flyout-row" }}
            >
                <Tooltip label={<TipLabel label={label} />} position="top">
                    <Menu.Target>
                        <UnstyledButton {...chevronProps} ref={chevronRef} className="cm-tool-chevron" aria-label={label}>
                            <UiGlyph name="chevronDown" size={10} />
                        </UnstyledButton>
                    </Menu.Target>
                </Tooltip>
                <Menu.Dropdown ref={dropdownRef} aria-label={label}>
                    {tools.map((tool) => (
                        <Menu.Item
                            key={tool.value}
                            // Mantine's Menu.Item writes role="menuitem" after the caller's props, so
                            // the radio role (Figma's flyout rows are menuitemradio) is set on the node.
                            ref={asMenuItemRadio}
                            aria-checked={tool.value === face.value}
                            leftSection={
                                <span className="cm-tool-flyout-lead">
                                    <span className="cm-tool-flyout-check">
                                        <UiGlyph name="check" size={16} />
                                    </span>
                                    <span className="cm-tool-icon">{tool.icon}</span>
                                </span>
                            }
                            rightSection={tool.shortcut}
                            onClick={() => {
                                pickedFromFlyout.current = true;
                                pick(tool.value);
                            }}
                        >
                            {tool.label}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        </div>
    );
}
