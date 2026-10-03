/**
 * The header's two menus (tier1-design.md section 2.1). Every item is a command from the
 * registry, so a stub command is not drawn and a disabled one shows its reason on a second line.
 */

import { Menu, Text, UnstyledButton } from "@mantine/core";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import React, { Fragment } from "react";

import { FILE_LIST } from "../commands/registry";
import { formatKey } from "../keys/keys";
import { RecentMenu } from "../project/RecentMenu";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";

/**
 * One menu row for a command, or nothing when the command is a stub.
 * @param props - Component props
 * @param props.id - The command id
 * @returns The row
 */
function CommandItem({ id }: { id: string }): React.JSX.Element | null {
    const door = useCommand(id);
    if (door === null) {
        return null;
    }
    const { command, disabledReason, run } = door;
    const key = command.keys?.[0];
    return (
        // A disabled row stays focusable with its reason (tier1-design.md section 4, "Disabled"),
        // so it is marked rather than given the `disabled` attribute.
        <Menu.Item
            onClick={disabledReason === null ? run : undefined}
            closeMenuOnClick={disabledReason === null}
            aria-disabled={disabledReason !== null}
            data-disabled={disabledReason === null ? undefined : true}
            rightSection={key === undefined ? undefined : formatKey(key)}
        >
            {command.label}
            {disabledReason === null ? null : (
                <Text component="span" display="block" size="xs" c="var(--cm-text-menu-secondary)">
                    {disabledReason}
                </Text>
            )}
        </Menu.Item>
    );
}

/**
 * Menu sections of command ids, with a divider between two sections that both draw something;
 * a section whose commands are all stubs leaves no divider behind.
 * @param props - Component props
 * @param props.sections - The sections, top to bottom
 * @returns The rows
 */
function Sections({ sections }: { sections: readonly (readonly string[])[] }): React.JSX.Element {
    const { registry } = useWorkspace();
    const drawn = sections
        .map((ids) => ids.filter((id) => registry.built(id) !== undefined))
        .filter((ids) => ids.length > 0);
    return (
        <>
            {drawn.map((ids, index) => (
                <Fragment key={ids.join()}>
                    {index > 0 ? <Menu.Divider /> : null}
                    {ids.map((id) => (
                        <CommandItem key={id} id={id} />
                    ))}
                </Fragment>
            ))}
        </>
    );
}

/**
 * The main menu: the app. New project, Open recent, the File list, Settings, Keyboard shortcuts,
 * Help.
 * @returns The menu button and its menu
 */
export function MainMenu(): React.JSX.Element {
    return (
        <Menu position="bottom-start" withinPortal>
            <Menu.Target>
                <UnstyledButton aria-label="Main menu" className="ws-header-button">
                    <MenuIcon size={16} aria-hidden />
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                <CommandItem id="project.new" />
                <RecentMenu />
                <Menu.Divider />
                <Sections sections={[FILE_LIST, ["settings.open", "help.shortcuts"]]} />
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Help</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        <CommandItem id="help.documentation" />
                        <CommandItem id="help.report" />
                        <CommandItem id="help.about" />
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The project-name menu: this project. Rename | the File list | Save as..., Close project.
 * @param props - Component props
 * @param props.name - The project's name, the menu's button
 * @param props.onDoubleClick - Starts a rename
 * @returns The project name and its menu
 */
export function ProjectMenu({ name, onDoubleClick }: { name: string; onDoubleClick: () => void }): React.JSX.Element {
    return (
        <Menu position="bottom-start" withinPortal>
            <Menu.Target>
                <UnstyledButton
                    className="ws-project-name"
                    aria-label={`Project: ${name}`}
                    onDoubleClick={onDoubleClick}
                >
                    <span className="ws-project-text">{name}</span>
                    <ChevronDown size={12} aria-hidden />
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                <Sections sections={[["project.rename"], FILE_LIST, ["project.save-as", "project.close"]]} />
            </Menu.Dropdown>
        </Menu>
    );
}
