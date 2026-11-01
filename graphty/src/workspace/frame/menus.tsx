/**
 * The main menu, the app's one menu (tier1-design.md section 2.1). Every item is a command from
 * the registry, so a stub command is not drawn and a disabled one shows its reason on a second
 * line.
 */

import { MenuItemDescription, MenuShortcut, TargetTooltip } from "@graphty/compact-mantine";
import { Menu, UnstyledButton, VisuallyHidden } from "@mantine/core";
import React, { Fragment } from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import { FILE_LIST } from "../commands/registry";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { RecentMenu } from "../project/RecentMenu";
import { sampleCommandId } from "../start/commands";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";

/**
 * One menu row for a command. A disabled row stays focusable with its reason (tier1-design.md
 * section 4, "Disabled"), so it is marked rather than given the `disabled` attribute.
 * @param props - Component props
 * @param props.label - The command's label
 * @param props.shortcut - Its first key, or undefined
 * @param props.reason - Why it cannot run now, or null
 * @param props.onRun - Runs it
 * @param props.icon - Its icon, drawn before the label
 * @param props.reasonDrawn - Whether the reason is drawn; false where a row above already shows
 *   the same words, so a menu says a shared reason once. It is still read with the row.
 * @returns The row
 */
export function CommandMenuItem({
    label,
    shortcut,
    reason,
    onRun,
    icon,
    reasonDrawn = true,
}: Readonly<{
    label: string;
    shortcut: string | undefined;
    reason: string | null;
    onRun: () => void;
    icon?: React.ReactNode;
    reasonDrawn?: boolean;
}>): React.JSX.Element {
    let why: React.ReactNode = null;
    if (reason !== null) {
        why = reasonDrawn ? (
            <MenuItemDescription>{reason}</MenuItemDescription>
        ) : (
            <VisuallyHidden>{reason}</VisuallyHidden>
        );
    }
    return (
        <Menu.Item
            leftSection={icon}
            onClick={reason === null ? onRun : undefined}
            closeMenuOnClick={reason === null}
            aria-disabled={reason !== null}
            data-disabled={reason === null ? undefined : true}
            aria-keyshortcuts={shortcut === undefined ? undefined : ariaKey(shortcut)}
            rightSection={shortcut === undefined ? undefined : <MenuShortcut>{formatKey(shortcut)}</MenuShortcut>}
        >
            {label}
            {why}
        </Menu.Item>
    );
}

/**
 * One menu row for a registered command, or nothing when the command is a stub.
 * @param props - Component props
 * @param props.id - The command id
 * @returns The row
 */
function CommandItem({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const door = useCommand(id);
    if (door === null) {
        return null;
    }
    const { command, disabledReason, run } = door;
    return (
        <CommandMenuItem
            label={command.label}
            shortcut={command.keys?.[0] ?? command.rowKeys?.[0]}
            reason={disabledReason}
            onRun={run}
        />
    );
}

/**
 * Menu sections of command ids, with a divider between two sections that both draw something;
 * a section whose commands are all stubs leaves no divider behind.
 * @param props - Component props
 * @param props.sections - The sections, top to bottom
 * @returns The rows
 */
export function Sections({ sections }: Readonly<{ sections: readonly (readonly string[])[] }>): React.JSX.Element {
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
 * One row per start-screen sample, each running its "Open sample: <name>" command (a new project,
 * asking first over unsaved changes). Inside a menu titled for samples, so a row shows the name;
 * the one open now is checked and says so.
 * @returns The rows
 */
export function SampleItems(): React.JSX.Element {
    const workspace = useWorkspace();
    // The sample the graph was loaded from, read from where the element says it came from.
    const loaded = workspace.session?.data.source()?.config?.url;
    return (
        <>
            {START_SAMPLES.map((sample) => {
                const open = loaded === sample.url;
                return (
                    <Menu.Item
                        key={sample.id}
                        // A check marks the one that is open; the others keep its room, so the names line up.
                        leftSection={
                            <GLYPHS.check size={14} aria-hidden style={{ visibility: open ? "visible" : "hidden" }} />
                        }
                        rightSection={open ? "Open now" : sample.size}
                        aria-current={open ? "true" : undefined}
                        onClick={() => {
                            workspace.run(sampleCommandId(sample));
                        }}
                    >
                        {sample.name}
                    </Menu.Item>
                );
            })}
        </>
    );
}

/**
 * The main menu's "Open sample" submenu.
 * @returns The submenu
 */
function SampleMenu(): React.JSX.Element {
    return (
        <Menu.Sub>
            <Menu.Sub.Target>
                <Menu.Sub.Item>Open sample</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>
                <SampleItems />
            </Menu.Sub.Dropdown>
        </Menu.Sub>
    );
}

/**
 * The main menu, the app's one menu: Back to start | New project, Open, Open sample, Open recent
 * | the File list | Rename | Settings, Keyboard shortcuts, Help. The start screen's copy leaves
 * out the rows that need a project (Back to start, the File list, Rename) rather than
 * drawing them disabled.
 * @param props - Component props
 * @param props.start - Draws the start screen's shorter menu
 * @returns The menu button and its menu
 */
export function MainMenu({ start = false }: Readonly<{ start?: boolean }>): React.JSX.Element {
    return (
        <Menu position="bottom-start" withinPortal>
            <Menu.Target>
                <TargetTooltip label="Main menu">
                    <UnstyledButton aria-label="Main menu" className="ws-header-button">
                        <GLYPHS.menu size={16} aria-hidden />
                    </UnstyledButton>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {start ? null : (
                    <>
                        <CommandItem id="project.close" />
                        <Menu.Divider />
                    </>
                )}
                <CommandItem id="project.new" />
                <CommandItem id="file.open" />
                <SampleMenu />
                <RecentMenu />
                <Menu.Divider />
                <Sections
                    sections={
                        start
                            ? [["settings.open", "help.shortcuts"]]
                            : [FILE_LIST, ["project.rename"], ["settings.open", "help.shortcuts"]]
                    }
                />
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
