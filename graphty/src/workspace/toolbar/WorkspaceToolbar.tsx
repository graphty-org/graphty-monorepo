import "./toolbar.css";

import { MenuCheckItem, MenuItemDescription, MenuShortcut, Toolbar, ToolButton } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Menu, Popover } from "@mantine/core";
import React, { forwardRef, useRef } from "react";

import { AnalyzePopover } from "../analyze/AnalyzePopover";
import { tabStops } from "../frame/focus";
import { CommandMenuItem, Sections } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { focusPathValuesNext } from "../inspector/reads";
import { xrRows } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { LayoutPopover } from "../layout/LayoutPopover";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { immersiveMode } from "./commands";
import { openers, type ToolbarPopover } from "./popover";
import { QuickActionsPalette } from "./QuickActionsPalette";
import { useSessionVersion } from "./useSessionVersion";

/** Props for CommandTool. */
interface CommandToolProps {
    /** The command id. (Not `id`: a popover target writes its own `id` onto its child.) */
    command: string;
    /** The glyph. */
    icon: React.ReactNode;
    /** Whether the thing it switches is on (the Legend, the Table). */
    selected?: boolean;
    /** Words joined to the command's name after a comma: what the button's face stands for (Mode's "3D"). */
    shows?: string;
}

/**
 * A toolbar button for one command: its label is the accessible name and the tooltip with the
 * first key; a disabled command stays focusable and its reason follows the name in the tooltip.
 * Forwards its ref so a popover or menu can anchor to it.
 */
const CommandTool = forwardRef<HTMLButtonElement, CommandToolProps>(function CommandTool(
    { command: commandId, icon, selected, shows, ...anchor },
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
            // Where a region the command opened sends focus back to (Escape in the table).
            data-command={commandId}
            // A button whose face stands for a state says it in its name (WCAG 2.5.3): "Mode, 3D".
            label={shows === undefined ? command.label : `${command.label}, ${shows}`}
            icon={icon}
            shortcut={key === undefined ? undefined : formatKey(key)}
            selected={selected}
            disabledReason={disabledReason ?? undefined}
            onClick={run}
        />
    );
});

/**
 * One checked row: a radio of the Mode menu's set (2D, 3D, VR, AR), the check on the current mode,
 * or a switch such as Camera > Auto-rotate; a disabled row stays focusable with its reason on a
 * second line. A radio that is checked does nothing and gives no reason.
 * @param props - Component props
 * @param props.command - The command the row runs
 * @param props.label - The row's words
 * @param props.checked - Whether it is the current mode, or the switch is on
 * @param props.shortcut - The key shown on the row, or undefined
 * @param props.radio - Whether the row is one of a set (default true)
 * @returns The row, or nothing when the command is a stub
 */
function CheckItem({
    command: commandId,
    label,
    checked,
    shortcut,
    radio = true,
}: Readonly<{
    command: string;
    label: string;
    checked: boolean;
    shortcut?: string;
    radio?: boolean;
}>): React.JSX.Element | null {
    const door = useCommand(commandId);
    if (door === null) {
        return null;
    }
    const reason = radio && checked ? null : door.disabledReason;
    return (
        <MenuCheckItem
            radio={radio}
            checked={checked}
            onClick={reason === null && !(radio && checked) ? door.run : undefined}
            closeMenuOnClick={reason === null}
            aria-disabled={reason !== null}
            data-disabled={reason === null ? undefined : true}
            aria-keyshortcuts={shortcut === undefined ? undefined : ariaKey(shortcut)}
            rightSection={shortcut === undefined ? undefined : <MenuShortcut>{formatKey(shortcut)}</MenuShortcut>}
        >
            {label}
            {reason === null ? null : <MenuItemDescription>{reason}</MenuItemDescription>}
        </MenuCheckItem>
    );
}

/**
 * Whether focus goes with a closing toolbar popover or menu: it is on the page, or still on a row
 * of the dropdown that is about to unmount (a menu calls its onClose before the dropdown goes).
 * Focus the reader already put somewhere else is left there.
 * @returns true when the popover's button should take focus back.
 */
function focusGoesWithClose(): boolean {
    const active = document.activeElement;
    return (
        active === null ||
        active === document.body ||
        active.closest("[data-menu-dropdown], .mantine-Popover-dropdown") !== null
    );
}

/** The mode words, as the Mode tool's name and its menu rows say them. */
const MODE_WORDS = { "2d": "2D", "3d": "3D", vr: "VR", ar: "AR" } as const;

/** The Mode tool's face: the icon of the mode the canvas is in. */
const MODE_GLYPHS = { "2d": GLYPHS.mode2d, "3d": GLYPHS.mode3d, vr: GLYPHS.modeVr, ar: GLYPHS.modeAr } as const;

/**
 * The Mode menu: Exit VR or AR while immersive; then the modes (2D, 3D, then one "VR / AR" row
 * when neither can be entered for the same reason, else a row each).
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The menu's rows
 */
function ModeMenuRows({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
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
            <CheckItem
                command="view.mode-2d"
                label="2D"
                checked={active === null && dimension === "2d"}
                shortcut={keyOn("2d")}
            />
            <CheckItem
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
                    <CheckItem
                        key={row.mode}
                        command={`view.enter-${row.mode}`}
                        label={MODE_WORDS[row.mode]}
                        checked={row.checked}
                    />
                ),
            )}
        </>
    );
}

/**
 * The Camera menu: Fit and Frame selection; the four standard views, disabled with their reason in
 * 2D; zoom in and out in 2D; then the Auto-rotate switch.
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The menu's rows
 */
function CameraMenuRows({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const flat = session?.layout.dimension === "2d";
    const autoRotate = useWorkspaceState((state) => state.autoRotate);
    return (
        <>
            <Sections
                sections={[
                    ["view.fit", "view.frame-selection"],
                    ["view.front", "view.side", "view.top", "view.isometric"],
                    ...(flat ? [["view.zoom-in", "view.zoom-out"]] : []),
                ]}
            />
            <Menu.Divider />
            <CheckItem command="view.auto-rotate" label="Auto-rotate" checked={autoRotate} radio={false} />
        </>
    );
}

/**
 * The Mode tool's face: the icon of the mode the canvas is in, named for tests by `data-mode`.
 * @param props - Component props
 * @param props.mode - The mode
 * @returns The icon
 */
function ModeGlyph({ mode }: Readonly<{ mode: keyof typeof MODE_WORDS }>): React.JSX.Element {
    const Glyph = MODE_GLYPHS[mode];
    return <Glyph size={20} data-mode={mode} />;
}

/**
 * The mode the canvas is in: VR or AR while immersive, else 2D or 3D.
 * @param session - The element's session, or null
 * @returns The mode
 */
function viewMode(session: GraphSession | null): keyof typeof MODE_WORDS {
    return immersiveMode(session) ?? session?.layout.dimension ?? "3d";
}

/**
 * The canvas toolbar (tier1-design.md 2.3): Analyze | Layout, Camera, Mode | Legend, Table, Timeline
 * | Quick actions, at the canvas's bottom center; a selection never changes it. Legend and Table are
 * toggles, pressed while what they switch is showing, as is Timeline (the timeline strip).
 * Analyze, Layout and Quick actions open popovers above it, and Camera and Mode open their menus
 * (Mode's face is the icon of the mode the canvas is in); each holds the store's one `dialog` slot, so only
 * one is open at a time and Esc or a click outside closes it. A popover's body is mounted only
 * while it is open, so each opening starts fresh (Analyze on its list, the filter empty).
 * @returns The toolbar
 */
export function WorkspaceToolbar(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    const dialog = useWorkspaceState((state) => state.dialog);
    // Pressed while a key is drawn, or while the reader asked for one over nothing (the card then
    // says nothing is styled yet); a switch that is on by default over nothing reads as off.
    const legendShown = useWorkspaceState((state) => state.legendShown && (state.keyHasEntries || state.legendAsked));
    const dockOpen = useWorkspaceState((state) => state.dockOpen);
    const timelineOpen = useWorkspaceState((state) => state.timelineOpen);
    const mode = viewMode(session);
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
            // Closing (Esc, Run, a pick, a menu row such as Frame selection) unmounts the focused
            // control; focus goes back to the popover's button, unless the reader has already put
            // it somewhere else.
            onClose: () => {
                if (focusGoesWithClose()) {
                    anchors.current[id]?.focus();
                }
            },
            withinPortal: true,
            trapFocus: true,
            returnFocus: false,
        }) as const;

    return (
        <Toolbar aria-label="Canvas tools" startAt="first">
            <Popover
                {...popoverProps("analyze")}
                // Path between... (P, a node's menu) opens the same popover on its Path form.
                opened={dialog === "analyze" || dialog === "path"}
                onChange={(opened) => {
                    if (!opened) {
                        store.set((state) =>
                            state.dialog === "analyze" || state.dialog === "path" ? { dialog: null } : {},
                        );
                    }
                }}
                onClose={() => {
                    if (focusGoesWithClose()) {
                        (openers.path ?? openers.analyze ?? anchors.current.analyze)?.focus();
                    }
                    delete openers.path;
                    delete openers.analyze;
                }}
                closeOnEscape={false}
                width={380}
            >
                <Popover.Target>
                    <CommandTool ref={anchor("analyze")} command="analyze.open" icon={<GLYPHS.analyze size={20} />} />
                </Popover.Target>
                <Popover.Dropdown aria-label="Analyze">
                    {(dialog !== "analyze" && dialog !== "path") || session === null ? null : (
                        <AnalyzePopover
                            session={session}
                            path={dialog === "path"}
                            onClose={close}
                            onTab={(back) => {
                                const opener = openers.path ?? openers.analyze ?? anchors.current.analyze;
                                // Back goes to the button it opened from; on goes to the next Tab
                                // stop after it on the page, past the toolbar's other tools. Found
                                // by page order, not by the opener's own place in the Tab order: a
                                // toolbar tool the roving focus has left (Analyze while Table was
                                // last used) or a key press from elsewhere is no Tab stop itself.
                                const group = opener?.closest('[role="toolbar"]') ?? opener;
                                const target = back
                                    ? opener
                                    : tabStops(document).find(
                                          (stop) =>
                                              stop.closest(".mantine-Popover-dropdown") === null &&
                                              group !== null &&
                                              group !== undefined &&
                                              !group.contains(stop) &&
                                              (group.compareDocumentPosition(stop) &
                                                  Node.DOCUMENT_POSITION_FOLLOWING) !==
                                                  0,
                                      );
                                target?.focus();
                                close();
                            }}
                            onStarted={(name) => {
                                store.set({ announcement: `${name} added, running` });
                            }}
                            onPathStarted={(run) => {
                                // The new row is selected, so the inspector shows its path, and
                                // focus goes to the route's first node once it is drawn.
                                focusPathValuesNext(run.id);
                                store.set({ inspected: { kind: "measure-row", id: run.id } });
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
            <Menu {...popoverProps("camera")}>
                <Menu.Target>
                    <CommandTool ref={anchor("camera")} command="view.camera" icon={<GLYPHS.camera size={20} />} />
                </Menu.Target>
                <Menu.Dropdown aria-label="Camera">
                    <CameraMenuRows session={session} />
                </Menu.Dropdown>
            </Menu>
            <Menu {...popoverProps("view")}>
                <Menu.Target>
                    <CommandTool
                        ref={anchor("view")}
                        command="view.open"
                        icon={<ModeGlyph mode={mode} />}
                        shows={MODE_WORDS[mode]}
                    />
                </Menu.Target>
                <Menu.Dropdown aria-label="Mode">
                    <ModeMenuRows session={session} />
                </Menu.Dropdown>
            </Menu>
            <Toolbar.Divider />
            <CommandTool command="view.legend" icon={<GLYPHS.legend size={20} />} selected={legendShown} />
            <CommandTool command="table.toggle" icon={<GLYPHS.table size={20} />} selected={dockOpen} />
            <CommandTool command="timeline.toggle" icon={<GLYPHS.timeline size={20} />} selected={timelineOpen} />
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
    );
}
