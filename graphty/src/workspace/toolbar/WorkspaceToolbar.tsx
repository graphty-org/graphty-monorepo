import "./toolbar.css";

import { MenuCheckItem, MenuItemDescription, Toolbar, ToolButton } from "@graphty/compact-mantine";
import type { TourProgressEvent } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Menu, Popover, Text } from "@mantine/core";
import React, { forwardRef, useEffect, useReducer, useRef } from "react";

import { AnalyzePopover } from "../analyze/AnalyzePopover";
import type { PaletteRow } from "../commands/registry";
import { tabStops } from "../frame/focus";
import { CommandMenuItem, Sections } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { focusPathValuesNext } from "../inspector/reads";
import { ariaKey, formatKey } from "../keys/keys";
import { LayoutPopover } from "../layout/LayoutPopover";
import { errorWords } from "../project/words";
import { RenderCount } from "../renderCount";
import { TOOLBAR_EVENTS, useSessionEvents } from "../sessionEvents";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { immersiveMode, savedViewRows } from "./commands";
import { openers, type ToolbarPopover } from "./popover";
import { QuickActionsPalette } from "./QuickActionsPalette";
import { cameraViewName } from "./viewWords";

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
            data-ph-capture-attribute-control={commandId}
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
            data-ph-capture-attribute-control={commandId}
            onClick={reason === null && !(radio && checked) ? door.run : undefined}
            closeMenuOnClick={reason === null}
            aria-disabled={reason !== null}
            data-disabled={reason === null ? undefined : true}
            aria-keyshortcuts={shortcut === undefined ? undefined : ariaKey(shortcut)}
            title={shortcut === undefined ? undefined : formatKey(shortcut)}
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

/** The Mode tool's face in VR and AR: the mode's icon. 2D and 3D show their words instead. */
const MODE_GLYPHS = { vr: GLYPHS.modeVr, ar: GLYPHS.modeAr } as const;

/**
 * The Mode menu: Exit VR or AR while immersive; then the modes, 2D, 3D, VR and AR, a row each. A
 * mode that cannot be entered is disabled and says only "Not available".
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The menu's rows
 */
function ModeMenuRows({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const dimension = session?.layout.dimension ?? "3d";
    const active = immersiveMode(session);
    const exit = useCommand("view.exit-xr");
    // The Switch between 2D and 3D command's key, shown on the row it would switch to; that
    // command has no button, so these rows are where its key is seen.
    const toggleKey = useCommand("view.toggle-dimension")?.command.keys?.[0];
    const keyOn = (mode: "2d" | "3d"): string | undefined => (mode === dimension ? undefined : toggleKey);
    return (
        <>
            {active === null || exit === null ? null : (
                <>
                    <CommandMenuItem
                        label={`Exit ${MODE_WORDS[active]}`}
                        shortcut={undefined}
                        reason={exit.disabledReason}
                        onRun={exit.run}
                        control="view.exit-xr"
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
            {session === null
                ? null
                : (["vr", "ar"] as const).map((mode) => (
                      <CheckItem
                          key={mode}
                          command={`view.enter-${mode}`}
                          label={MODE_WORDS[mode]}
                          checked={active === mode}
                      />
                  ))}
        </>
    );
}

/**
 * One Camera menu row for a saved camera (a Quick actions row too), with its key: disabled with
 * its reason, and a failure becomes a notice.
 * @param props - Component props
 * @param props.row - The row
 * @returns The menu row
 */
function RowItem({ row }: Readonly<{ row: PaletteRow }>): React.JSX.Element {
    const workspace = useWorkspace();
    return (
        <CommandMenuItem
            label={row.label}
            shortcut={row.keys?.[0]}
            reason={row.disabled?.(workspace) ?? null}
            onRun={() => {
                const outcome = row.run(workspace);
                if (outcome instanceof Promise) {
                    outcome.catch((error: unknown) => {
                        workspace.store.set({ notice: { message: errorWords(`${row.label} failed`, error) } });
                    });
                }
            }}
        />
    );
}

/**
 * The reader's cameras on the Camera menu, every one in project order with its key;
 * nothing (and no divider) with none. Cameras are managed in the Views place, never here.
 * @returns The rows
 */
function CameraRows(): React.JSX.Element | null {
    const workspace = useWorkspace();
    const rows = savedViewRows(workspace);
    if (rows.length === 0) {
        return null;
    }
    return (
        <>
            {rows.map((row) => (
                <RowItem key={row.id} row={row} />
            ))}
            <Menu.Divider />
        </>
    );
}

/**
 * The Camera menu's Auto-rotate and Focus selected switches.
 * @returns The rows
 */
function CameraSwitchRows(): React.JSX.Element {
    const autoRotate = useWorkspaceState((state) => state.autoRotate);
    const followSelection = useWorkspaceState((state) => state.followSelection);
    const { element } = useWorkspace();
    return (
        <>
            <CheckItem
                command="view.auto-rotate"
                label="Auto-rotate"
                checked={autoRotate && element?.isMotionReduced() !== true}
                shortcut="9"
                radio={false}
            />
            <CheckItem command="view.follow-selection" label="Focus selected" checked={followSelection} radio={false} />
        </>
    );
}

/**
 * The Camera menu (design/ui/camera-views-tours-and-capture.md,
 * section 3.2): every camera, Fit and Fit selection, Zoom in and Zoom out in 2D, then the
 * Auto-rotate and Focus selected switches.
 * @param props - Component props
 * @param props.session - The element's session, or null
 * @returns The menu's rows
 */
function CameraViewsMenuRows({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const flat = session?.layout.dimension === "2d";
    return (
        <>
            {session === null ? null : <CameraRows />}
            <Sections
                sections={[["view.fit", "view.frame-selection", ...(flat ? ["view.zoom-in", "view.zoom-out"] : [])]]}
            />
            <Menu.Divider />
            <CameraSwitchRows />
        </>
    );
}

/**
 * A tour's stop as the status line says it: "Stop 3 of 4, Port nodes".
 * @param session - The element's session.
 * @param progress - The `tour-progress` event's detail.
 * @param progress.stop - The stop, 0-based.
 * @param progress.stops - How many stops the tour has.
 * @param progress.view - The saved view the stop flies to, if any.
 * @param progress.phase - Whether it flies, holds or pauses.
 * @returns The words.
 */
function stopWords(session: GraphSession, { stop, stops, view, phase }: TourProgressEvent): string {
    const lead = `Stop ${String(stop + 1)} of ${String(stops)}`;
    if (view === undefined) {
        return phase === "pause" ? `${lead}, Pause` : lead;
    }
    return `${lead}, ${cameraViewName(view, session.catalog.cameras().find(({ id }) => id === view)?.plainName)}`;
}

/**
 * Follows graphty-element's camera facts the toolbar draws from: the tour playing (`tour-progress`,
 * `tour-ended`, kept in the store: the Camera tool is Stop while one plays) and a redraw whenever what
 * `viewProblem` and `planTour` read changes (`views-changed`) or motion is reduced or no longer.
 * @param element - The element, or null.
 */
function useCameraFacts(element: ReturnType<typeof useWorkspace>["element"]): void {
    const { store } = useWorkspace();
    const [, redraw] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const progress = ({ detail }: CustomEvent<TourProgressEvent>): void => {
            const { tour, stop, stops } = detail;
            const before = store.get().tourProgress;
            const moved = before?.tour !== tour || before.stop !== stop;
            store.set({
                tourProgress: { tour, stop, stops },
                // The polite status line says each stop once, as it is reached, never a phase or a tick.
                ...(moved ? { announcement: stopWords(element.session, detail) } : {}),
            });
        };
        const ended = (): void => {
            store.set({ tourProgress: null });
        };
        element.addEventListener("tour-progress", progress);
        element.addEventListener("tour-ended", ended);
        element.addEventListener("views-changed", redraw);
        element.addEventListener("reduced-motion-changed", redraw);
        return () => {
            element.removeEventListener("tour-progress", progress);
            element.removeEventListener("tour-ended", ended);
            element.removeEventListener("views-changed", redraw);
            element.removeEventListener("reduced-motion-changed", redraw);
        };
    }, [element, store]);
}

/**
 * The Camera tool while a tour plays outside a recording: Stop, in the Camera tool's place and
 * size, so nothing shifts and Escape has a visible button exactly while it applies.
 * @param props - Component props
 * @param props.onStop - called as the button stops the tour
 * @returns The tool, or nothing when Stop tour is not built
 */
function StopTourTool({ onStop }: Readonly<{ onStop: () => void }>): React.JSX.Element | null {
    const door = useCommand("tour.stop");
    if (door === null) {
        return null;
    }
    const key = door.command.whileShownKeys?.[0];
    return (
        <ToolButton
            data-command="tour.stop"
            label={door.command.label}
            icon={<GLYPHS.stop size={20} />}
            shortcut={key === undefined ? undefined : formatKey(key)}
            aria-keyshortcuts={key === undefined ? undefined : ariaKey(key)}
            onClick={() => {
                onStop();
                door.run();
            }}
        />
    );
}

/**
 * The Mode tool's face, named for tests by `data-mode`: the words "2D" or "3D" (an icon for 2D read
 * as a plain rectangle), or the VR or AR icon, in the same 20px box as the other tools' glyphs.
 * @param props - Component props
 * @param props.mode - The mode
 * @returns The face
 */
function ModeGlyph({ mode }: Readonly<{ mode: keyof typeof MODE_WORDS }>): React.JSX.Element {
    if (mode === "2d" || mode === "3d") {
        return (
            <Text span fz={13} fw={700} lh="20px" w={20} ta="center" data-mode={mode}>
                {MODE_WORDS[mode]}
            </Text>
        );
    }
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
    const { session, store, element } = useWorkspace();
    // The toolbar reads no style layer: a change to them alone does not draw it again.
    useSessionEvents(session, TOOLBAR_EVENTS, true);
    useCameraFacts(element);
    const dialog = useWorkspaceState((state) => state.dialog);
    // Pressed while a key is drawn, or while the reader asked for one over nothing (the card then
    // says nothing is styled yet); a switch that is on by default over nothing reads as off.
    const legendShown = useWorkspaceState((state) => state.legendShown && (state.keyHasEntries || state.legendAsked));
    const dockOpen = useWorkspaceState((state) => state.dockOpen);
    const timelineOpen = useWorkspaceState((state) => state.timelineOpen);
    // While a tour plays the Camera tool is Stop; while a recording plays one, the Export dialog
    // covers the toolbar and holds its own Stop, so the tool stays Camera.
    const touring = useWorkspaceState((state) => state.tourProgress !== null && state.dialog !== "export");
    const mode = viewMode(session);
    // The button each popover opened from. Mantine's own returnFocus records the element focused
    // when the popover opens, but the Filter box and the Quick actions search focus themselves as
    // they mount, before Mantine records it, so it would hand focus back to a box that is gone.
    const anchors = useRef<Partial<Record<ToolbarPopover, HTMLButtonElement | null>>>({});
    const anchor = (id: ToolbarPopover) => (button: HTMLButtonElement | null) => {
        anchors.current[id] = button;
    };
    // Stop tour pressed on the toolbar hands focus to the Camera tool that comes back in its place.
    const focusCamera = useRef(false);
    useEffect(() => {
        if (!touring && focusCamera.current) {
            focusCamera.current = false;
            anchors.current.camera?.focus();
        }
    }, [touring]);
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
            // Closing (Esc, Run, a pick, a menu row such as Fit selection) unmounts the focused
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
        <RenderCount id="toolbar">
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
                        store.set({ analyzeOn: null, analyzeValues: null, pathDraft: null });
                    }}
                    closeOnEscape={false}
                    width={380}
                >
                    <Popover.Target>
                        <CommandTool
                            ref={anchor("analyze")}
                            command="analyze.open"
                            icon={<GLYPHS.analyze size={20} />}
                        />
                    </Popover.Target>
                    <Popover.Dropdown aria-label="Analyze">
                        {(dialog !== "analyze" && dialog !== "path") || session === null ? null : (
                            <AnalyzePopover
                                session={session}
                                path={dialog === "path"}
                                initialPick={dialog === "analyze" ? (store.get().analyzeOn ?? undefined) : undefined}
                                initialValues={
                                    dialog === "analyze" ? (store.get().analyzeValues ?? undefined) : undefined
                                }
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
                {touring ? (
                    <StopTourTool
                        onStop={() => {
                            focusCamera.current = true;
                        }}
                    />
                ) : (
                    <Menu {...popoverProps("camera")}>
                        <Menu.Target>
                            <CommandTool
                                ref={anchor("camera")}
                                command="view.camera"
                                icon={<GLYPHS.camera size={20} />}
                            />
                        </Menu.Target>
                        <Menu.Dropdown aria-label="Camera">
                            <CameraViewsMenuRows session={session} />
                        </Menu.Dropdown>
                    </Menu>
                )}
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
        </RenderCount>
    );
}
