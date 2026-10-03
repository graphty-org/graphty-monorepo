import "./toolbar.css";

import { Toolbar, ToolButton } from "@graphty/compact-mantine";
import { Menu, Popover, VisuallyHidden } from "@mantine/core";
import { Box, Command, FlaskConical, List, Move, Square, Target } from "lucide-react";
import React, { forwardRef, useRef, useState } from "react";

import { AnalyzePopover } from "../analyze/AnalyzePopover";
import { Sections } from "../frame/menus";
import { formatKey } from "../keys/keys";
import { LayoutGroup } from "../layout/LayoutGroup";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import type { ToolbarPopover } from "./popover";
import { QuickActionsPalette } from "./QuickActionsPalette";
import { useSessionVersion } from "./useSessionVersion";

/** Props for CommandTool. */
interface CommandToolProps {
    /** The command id. (Not `id`: a popover target writes its own `id` onto its child.) */
    command: string;
    /** The glyph. */
    icon: React.ReactNode;
    /** Whether the thing it switches is on (the Legend). */
    selected?: boolean;
}

/**
 * A toolbar button for one command: its label is the accessible name and the tooltip with the
 * first key; a disabled command stays focusable and its reason follows the name in the tooltip.
 * Forwards its ref so a popover or menu can anchor to it.
 */
const CommandTool = forwardRef<HTMLButtonElement, CommandToolProps>(function CommandTool(
    { command: commandId, icon, selected, ...anchor },
    ref,
) {
    const door = useCommand(commandId);
    if (door === null) {
        return null;
    }
    const { command, disabledReason, run } = door;
    const key = command.keys?.[0];
    return (
        <ToolButton
            {...anchor}
            ref={ref}
            label={command.label}
            icon={icon}
            shortcut={key === undefined ? undefined : formatKey(key)}
            selected={selected}
            disabledReason={disabledReason ?? undefined}
            onClick={run}
        />
    );
});

/**
 * The selection bar (tier1-design.md 2.3), directly above the toolbar while a node is selected.
 * Tier 1 holds one verb, Neighborhood.
 * @returns The bar, or nothing with no node selected
 */
function SelectionBar(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null || session.selection.nodes.length === 0) {
        return null;
    }
    return (
        <Toolbar aria-label="Selection" className="ws-selection-bar">
            <CommandTool command="selection.neighborhood" icon={<Target size={20} />} />
        </Toolbar>
    );
}

/**
 * The canvas toolbar (tier1-design.md 2.3): Analyze | Layout, View, Legend | Quick actions, at the
 * canvas's bottom center, with the selection bar above it. Analyze, Layout and Quick actions open
 * popovers above it and View opens its flyout; each holds the store's one `dialog` slot, so only
 * one is open at a time and Esc or a click outside closes it. A popover's body is mounted only
 * while it is open, so each opening starts fresh (Analyze on its list, the filter empty).
 * @returns The toolbar
 */
export function WorkspaceToolbar(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    const dialog = useWorkspaceState((state) => state.dialog);
    const legendShown = useWorkspaceState((state) => state.legendShown);
    const [announcement, setAnnouncement] = useState("");
    // The button each popover opened from. Mantine's own returnFocus records the element focused
    // when the popover opens, but the Filter box and the Quick actions search focus themselves as
    // they mount, before Mantine records it, so it would hand focus back to a box that is gone.
    const anchors = useRef<Partial<Record<ToolbarPopover, HTMLButtonElement | null>>>({});
    const anchor = (id: ToolbarPopover) => (button: HTMLButtonElement | null) => {
        anchors.current[id] = button;
    };
    const close = (): void => {
        store.set((state) => (state.dialog === dialog ? { dialog: null } : {}));
    };
    const popoverProps = (id: ToolbarPopover) =>
        ({
            opened: dialog === id,
            onChange: (opened: boolean) => {
                if (!opened) {
                    store.set((state) => (state.dialog === id ? { dialog: null } : {}));
                }
            },
            position: "top",
            offset: 8,
            // Closing (Esc, Run, a pick) unmounts the focused control; focus goes back to the
            // popover's button, unless the reader has already put it somewhere else.
            onClose: () => {
                if (document.activeElement === null || document.activeElement === document.body) {
                    anchors.current[id]?.focus();
                }
            },
            withinPortal: true,
            trapFocus: true,
            returnFocus: false,
        }) as const;
    const dimension = session?.layout.dimension ?? "3d";

    return (
        <div className="ws-toolbar-stack">
            <SelectionBar />
            <Toolbar aria-label="Canvas tools">
                <Popover {...popoverProps("analyze")} closeOnEscape={false} width={380}>
                    <Popover.Target>
                        <CommandTool ref={anchor("analyze")} command="analyze.open" icon={<FlaskConical size={20} />} />
                    </Popover.Target>
                    <Popover.Dropdown aria-label="Analyze">
                        {dialog !== "analyze" || session === null ? null : (
                            <AnalyzePopover
                                session={session}
                                onClose={close}
                                onStarted={(name) => {
                                    setAnnouncement(`${name} added, running`);
                                }}
                            />
                        )}
                    </Popover.Dropdown>
                </Popover>
                <Toolbar.Divider />
                <Popover {...popoverProps("layout")} width={280}>
                    <Popover.Target>
                        <CommandTool ref={anchor("layout")} command="layout.open" icon={<Move size={20} />} />
                    </Popover.Target>
                    <Popover.Dropdown aria-label="Layout">
                        {dialog === "layout" ? <LayoutGroup /> : null}
                    </Popover.Dropdown>
                </Popover>
                <Menu {...popoverProps("view")}>
                    <Menu.Target>
                        <CommandTool
                            ref={anchor("view")}
                            command="view.open"
                            icon={dimension === "3d" ? <Box size={20} /> : <Square size={20} />}
                        />
                    </Menu.Target>
                    <Menu.Dropdown aria-label="View">
                        <Sections
                            sections={[
                                ["view.fit", "view.frame-selection"],
                                dimension === "3d"
                                    ? ["view.front", "view.side", "view.top", "view.isometric"]
                                    : ["view.zoom-in", "view.zoom-out"],
                                ["view.toggle-dimension"],
                            ]}
                        />
                    </Menu.Dropdown>
                </Menu>
                <CommandTool command="view.legend" icon={<List size={20} />} selected={legendShown} />
                <Toolbar.Divider />
                <Popover {...popoverProps("quick-actions")}>
                    <Popover.Target>
                        <CommandTool
                            ref={anchor("quick-actions")}
                            command="quick-actions.open"
                            icon={<Command size={20} />}
                        />
                    </Popover.Target>
                    <Popover.Dropdown p={0}>
                        {dialog === "quick-actions" ? <QuickActionsPalette onClose={close} /> : null}
                    </Popover.Dropdown>
                </Popover>
            </Toolbar>
            <VisuallyHidden role="status" aria-live="polite">
                {announcement}
            </VisuallyHidden>
        </div>
    );
}
