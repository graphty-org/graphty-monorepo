import "./toolbar.css";

import { MenuCheckItem, MenuItemDescription, Toolbar, ToolButton } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Menu, Popover, VisuallyHidden } from "@mantine/core";
import React, { forwardRef, useRef } from "react";

import { AnalyzePopover } from "../analyze/AnalyzePopover";
import { CommandMenuItem, Sections } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { xrRows } from "../inspector/words";
import { formatKey } from "../keys/keys";
import { LayoutPopover } from "../layout/LayoutPopover";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { immersiveMode } from "./commands";
import type { ToolbarPopover } from "./popover";
import { QuickActionsPalette } from "./QuickActionsPalette";
import { ShowMenuRows } from "./ShowMenuRows";
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
 * One row of the View menu's mode set (2D, 3D, VR, AR): a radio with the check on the current
 * mode; a disabled row stays focusable with its reason on a second line.
 * @param props - Component props
 * @param props.command - The command the row runs
 * @param props.label - The mode word
 * @param props.checked - Whether it is the current mode
 * @param props.shortcut - The key shown on the row, or undefined
 * @returns The row, or nothing when the command is a stub
 */
function ModeItem({
    command: commandId,
    label,
    checked,
    shortcut,
}: Readonly<{ command: string; label: string; checked: boolean; shortcut?: string }>): React.JSX.Element | null {
    const door = useCommand(commandId);
    if (door === null) {
        return null;
    }
    const reason = checked ? null : door.disabledReason;
    return (
        <MenuCheckItem
            radio
            checked={checked}
            onClick={reason === null && !checked ? door.run : undefined}
            closeMenuOnClick={reason === null}
            aria-disabled={reason !== null}
            data-disabled={reason === null ? undefined : true}
            rightSection={shortcut === undefined ? undefined : formatKey(shortcut)}
        >
            {label}
            {reason === null ? null : <MenuItemDescription>{reason}</MenuItemDescription>}
        </MenuCheckItem>
    );
}

/** The mode words, as the View tool's face and its menu rows show them. */
const MODE_WORDS = { "2d": "2D", "3d": "3D", vr: "VR", ar: "AR" } as const;

/**
 * The View menu: Exit VR or AR while immersive; the modes (2D, 3D, then one "VR / AR" row when
 * neither can be entered for the same reason, else a row each); Fit and Frame selection; then
 * the four camera views in 3D, or zoom and one "Camera views" row saying why not in 2D.
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The menu's rows
 */
function ViewMenuRows({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const dimension = session?.layout.dimension ?? "3d";
    const active = immersiveMode(session);
    const exit = useCommand("view.exit-xr");
    const xr = session?.capabilities.xr;
    const rows =
        xr === undefined
            ? []
            : xrRows(xr).map((row) => ({ ...row, checked: row.mode !== "both" && row.mode === active }));
    // Key 5 switches 2D and 3D; it is shown on the row it would switch to.
    const keyOn = (mode: "2d" | "3d"): string | undefined => (mode === dimension ? undefined : "5");
    return (
        <>
            {active === null || exit === null ? null : (
                <>
                    <CommandMenuItem
                        label={`Exit ${MODE_WORDS[active]}`}
                        shortcut={undefined}
                        reason={exit.disabledReason}
                        onRun={exit.run}
                    />
                    <Menu.Divider />
                </>
            )}
            <ModeItem
                command="view.mode-2d"
                label="2D"
                checked={active === null && dimension === "2d"}
                shortcut={keyOn("2d")}
            />
            <ModeItem
                command="view.mode-3d"
                label="3D"
                checked={active === null && dimension === "3d"}
                shortcut={keyOn("3d")}
            />
            {rows.map((row) =>
                row.mode === "both" ? (
                    <MenuCheckItem
                        key="both"
                        radio
                        checked={false}
                        closeMenuOnClick={false}
                        aria-disabled
                        data-disabled
                    >
                        VR / AR
                        <MenuItemDescription>{row.reason}</MenuItemDescription>
                    </MenuCheckItem>
                ) : (
                    <ModeItem
                        key={row.mode}
                        command={`view.enter-${row.mode}`}
                        label={MODE_WORDS[row.mode]}
                        checked={row.checked}
                    />
                ),
            )}
            <Menu.Divider />
            <Sections
                sections={[
                    ["view.fit", "view.frame-selection"],
                    dimension === "3d"
                        ? ["view.front", "view.side", "view.top", "view.isometric"]
                        : ["view.zoom-in", "view.zoom-out"],
                ]}
            />
            {dimension === "3d" ? null : (
                <CommandMenuItem
                    label="Camera views"
                    shortcut={undefined}
                    reason="Only in 3D"
                    onRun={() => undefined}
                />
            )}
        </>
    );
}

/**
 * The View tool's face: the current mode as a word with a caret.
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The face
 */
function ViewFace({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const mode = immersiveMode(session) ?? session?.layout.dimension ?? "3d";
    return (
        <span className="ws-view-face">
            {MODE_WORDS[mode]}
            <GLYPHS.expand size={10} />
        </span>
    );
}

/**
 * The canvas toolbar (tier1-design.md 2.3): Analyze | Layout, View | Quick actions, at the
 * canvas's bottom center; a selection never changes it. Analyze, Layout and Quick actions open
 * popovers above it and View opens its flyout; each holds the store's one `dialog` slot, so only
 * one is open at a time and Esc or a click outside closes it. A popover's body is mounted only
 * while it is open, so each opening starts fresh (Analyze on its list, the filter empty).
 * @returns The toolbar
 */
export function WorkspaceToolbar(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    const dialog = useWorkspaceState((state) => state.dialog);
    const announcement = useWorkspaceState((state) => state.announcement);
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

    return (
        <>
            <Toolbar aria-label="Canvas tools">
                <Popover {...popoverProps("analyze")} closeOnEscape={false} width={380}>
                    <Popover.Target>
                        <CommandTool
                            ref={anchor("analyze")}
                            command="analyze.open"
                            icon={<GLYPHS.analyze size={20} />}
                        />
                    </Popover.Target>
                    <Popover.Dropdown aria-label="Analyze">
                        {dialog !== "analyze" || session === null ? null : (
                            <AnalyzePopover
                                session={session}
                                onClose={close}
                                onStarted={(name) => {
                                    store.set({ announcement: `${name} added, running` });
                                }}
                            />
                        )}
                    </Popover.Dropdown>
                </Popover>
                <Toolbar.Divider />
                <Popover
                    {...popoverProps("layout")}
                    closeOnEscape={false}
                    width={380}
                    // Capped to the room above the toolbar in the visual viewport, so a touch
                    // keyboard never hides the field being typed into; the body scrolls.
                    middlewares={{ flip: false, shift: true, size: { padding: 8 } }}
                >
                    <Popover.Target>
                        <CommandTool ref={anchor("layout")} command="layout.open" icon={<GLYPHS.layout size={20} />} />
                    </Popover.Target>
                    <Popover.Dropdown aria-label="Layout" style={{ overflowY: "auto" }}>
                        {dialog !== "layout" || session === null ? null : (
                            <LayoutPopover session={session} onClose={close} />
                        )}
                    </Popover.Dropdown>
                </Popover>
                <Menu {...popoverProps("view")}>
                    <Menu.Target>
                        <CommandTool ref={anchor("view")} command="view.open" icon={<ViewFace session={session} />} />
                    </Menu.Target>
                    <Menu.Dropdown aria-label="View">
                        <ViewMenuRows session={session} />
                        <ShowMenuRows />
                    </Menu.Dropdown>
                </Menu>
                <Toolbar.Divider />
                <Popover {...popoverProps("quick-actions")}>
                    <Popover.Target>
                        <CommandTool
                            ref={anchor("quick-actions")}
                            command="quick-actions.open"
                            icon={<GLYPHS.quickActions size={20} />}
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
        </>
    );
}
