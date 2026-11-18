/**
 * The Graph place's Views section (design/ui/camera-views-tours-and-capture.md, section 3.2): the
 * reader's saved views and tours, managed next to the live canvas. Every write goes through
 * graphty-element's `session.views` and `session.tours`; every enable state and length is the
 * element's (`viewProblem`, `planTour`), worded here. The app keeps only which tour is open, the
 * row in focus and the tour playing (from `tour-progress`).
 */

import {
    ActionRow,
    CardList,
    type CardListItem,
    ControlGroup,
    ControlSection,
    MenuCheckItem,
    PageList,
} from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { EasingName, GraphSession, Tour } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useReducer, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey, matchesKey } from "../keys/keys";
import { errorWords } from "../project/words";
import { type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { goToSavedView, nextName, savedViewReason } from "../toolbar/commands";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { tourProblemWords } from "../toolbar/viewWords";
import { orRefusal } from "./actions";
import { RowMore, TourStops } from "./TourStops";

/** A new stop's hold, and every stop's flight but the first, in milliseconds. */
const STOP_MS = 2000;

/** How many saved views New tour turns into stops; more (or none) starts it empty. */
const SEED_MAX = 6;

/** The easings a tour can fly with, in the app's words. */
const EASINGS: readonly { readonly id: EasingName; readonly label: string }[] = [
    { id: "linear", label: "Linear" },
    { id: "easeIn", label: "Ease in" },
    { id: "easeOut", label: "Ease out" },
    { id: "easeInOut", label: "Ease in and out" },
];

/**
 * A tour's length as a clock reads it: "0:14", "1:05".
 * @param ms - the length in milliseconds.
 * @returns the words.
 */
function lengthWords(ms: number): string {
    const seconds = Math.round(ms / 1000);
    return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Draws again whenever anything `viewProblem` or `planTour` reads may have changed: views, their
 * order, tours, the drawing mode, an immersive session, a registered camera view.
 * @param element - the element, or null.
 */
function useViewsChanged(element: GraphtyElement | null): void {
    const [, redraw] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        element.addEventListener("views-changed", redraw);
        return () => {
            element.removeEventListener("views-changed", redraw);
        };
    }, [element]);
}

/**
 * Moves a saved view or tour one place up or down its list.
 * @param list - the list, `session.views` or `session.tours`.
 * @param name - the item.
 * @param by - -1 for up, 1 for down.
 * @returns the write, or undefined at the list's end.
 */
function moveBy(
    list: GraphSession["views"] | GraphSession["tours"],
    name: string,
    by: -1 | 1,
): Promise<void> | undefined {
    const names = [...list.keys()];
    const to = names.indexOf(name) + by;
    return to < 0 || to >= names.length ? undefined : list.move(name, to);
}

/** Props for ViewList. */
interface ListProps {
    readonly session: GraphSession;
    readonly element: GraphtyElement | null;
    readonly store: WorkspaceStore;
}

/**
 * The saved views, project order, as a compact-mantine `PageList`: one Tab stop, the arrows
 * between rows. Enter or a click goes to a view; F2 renames, Delete deletes, Mod+] and Mod+[ move
 * it. A view the element cannot apply now is disabled with its reason as a tooltip and description.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @returns The list, or its empty state
 */
function ViewList({ session, store }: ListProps): React.JSX.Element {
    const workspace = useWorkspace();
    const save = useCommand("view.save");
    const names = [...session.views.keys()];
    const [renaming, setRenaming] = useState<string | null>(null);
    const list = useRef<HTMLDivElement>(null);
    // A row to focus once the list draws again: after a delete, the one that took its place;
    // after a rename, the row under its new name.
    const focusNext = useRef<string | null>(null);
    useEffect(() => {
        const name = focusNext.current;
        if (name !== null && names.includes(name)) {
            focusNext.current = null;
            list.current?.querySelector<HTMLElement>(`[role="gridcell"][data-id="${CSS.escape(name)}"]`)?.focus();
        }
    });

    if (names.length === 0) {
        return (
            <ActionRow
                state="No saved views"
                actions={
                    save === null ? null : (
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            aria-disabled={save.disabledReason !== null}
                            aria-description={save.disabledReason ?? undefined}
                            onClick={save.disabledReason === null ? save.run : undefined}
                        >
                            {save.command.label}
                        </Button>
                    )
                }
            />
        );
    }

    const remove = (name: string): void => {
        const at = names.indexOf(name);
        focusNext.current = names[at + 1] ?? names[at - 1] ?? null;
        void orRefusal(store, `delete ${name}`, session.views.remove([name]));
    };
    const move = (name: string, by: -1 | 1): void => {
        const work = moveBy(session.views, name, by);
        if (work !== undefined) {
            void orRefusal(store, `move ${name}`, work);
        }
    };
    const items = (name: string, at: number, reason: string | null): SelectionMenuItem[] => [
        {
            id: "go",
            label: "Go to",
            icon: "go",
            group: "edit",
            reason,
            reasonDrawn: false,
            onRun: () => {
                void orRefusal(store, `go to ${name}`, goToSavedView(workspace, name));
            },
        },
        {
            id: "update",
            label: "Update view",
            icon: "camera",
            group: "edit",
            reason: save?.disabledReason ?? null,
            reasonDrawn: false,
            onRun: () => {
                void orRefusal(store, `update ${name}`, session.views.save([{ name }]));
            },
        },
        {
            id: "rename",
            label: "Rename",
            icon: "rename",
            group: "edit",
            key: "F2",
            onRun: () => {
                setRenaming(name);
            },
        },
        {
            id: "up",
            label: "Move up",
            icon: "moveUp",
            group: "edit",
            key: "Mod+]",
            reason: at === 0 ? "Already at the top" : null,
            reasonDrawn: false,
            onRun: () => {
                move(name, -1);
            },
        },
        {
            id: "down",
            label: "Move down",
            icon: "moveDown",
            group: "edit",
            key: "Mod+[",
            reason: at === names.length - 1 ? "Already at the bottom" : null,
            reasonDrawn: false,
            onRun: () => {
                move(name, 1);
            },
        },
        {
            id: "delete",
            label: "Delete",
            icon: "delete",
            group: "remove",
            key: "Delete",
            onRun: () => {
                remove(name);
            },
        },
    ];

    return (
        <div className="ws-views-list" ref={list}>
            <PageList
                label="Saved views"
                current={null}
                items={names.map((name, at) => {
                    const reason = savedViewReason(workspace, name);
                    return {
                        id: name,
                        name,
                        disabledReason: reason,
                        menu: <RowMore name={name} items={items(name, at, reason)} />,
                    };
                })}
                onCurrentChange={(name) => {
                    void orRefusal(store, `go to ${name}`, goToSavedView(workspace, name));
                }}
                renameLabel="View name"
                renaming={renaming}
                onRenamingChange={(name) => {
                    setRenaming(name);
                }}
                onRename={(name, typed) => {
                    const to = typed.trim();
                    if (to !== "" && to !== name) {
                        focusNext.current = to;
                        void orRefusal(store, `rename ${name}`, session.views.rename(name, to));
                    }
                }}
                onRowKeyDown={(name, event) => {
                    if (event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault();
                        remove(name);
                    } else if (matchesKey(event.nativeEvent, "Mod+]") || matchesKey(event.nativeEvent, "Mod+[")) {
                        // As in the selection editor: Mod+] moves up the list, Mod+[ down.
                        event.preventDefault();
                        move(name, event.key === "]" ? -1 : 1);
                    }
                }}
            />
        </div>
    );
}

/**
 * Starts a new tour, "Tour N": with one to six saved views, one stop per view (the first flown to
 * at once, the rest in 2 s, each held 2 s); otherwise empty.
 * @param session - the element's session.
 * @returns the new tour's name, once saved.
 */
async function newTour(session: GraphSession): Promise<string> {
    const name = nextName(session.tours, "Tour");
    const views = [...session.views.keys()];
    const stops =
        views.length > 0 && views.length <= SEED_MAX
            ? views.map((view, at) => ({ view, duration: at === 0 ? 0 : STOP_MS, hold: STOP_MS }))
            : [];
    await session.tours.save([{ name, tour: { stops } }]);
    return name;
}

/**
 * A copy's name: "Walk copy", then "Walk copy 2" and on.
 * @param saved - the tours saved.
 * @param name - the tour copied.
 * @returns the name.
 */
function copyName(saved: ReadonlyMap<string, unknown>, name: string): string {
    let copy = `${name} copy`;
    let n = 2;
    while (saved.has(copy)) {
        copy = `${name} copy ${String(n)}`;
        n += 1;
    }
    return copy;
}

/**
 * Adds a stop at the camera on screen: saves it as "View N" and appends a stop naming it, as one
 * step.
 * @param session - the element's session.
 * @param name - the tour.
 * @returns the write.
 */
function addStop(session: GraphSession, name: string): Promise<void> {
    return session.transaction("Add stop", async (tx) => {
        const view = nextName(tx.views);
        await tx.views.save([{ name: view }]);
        const tour: Tour = tx.tours.get(name) ?? { stops: [] };
        const first = tour.stops.length === 0;
        await tx.tours.save([
            { name, tour: { ...tour, stops: [...tour.stops, { view, duration: first ? 0 : STOP_MS, hold: STOP_MS }] } },
        ]);
    });
}

/**
 * The tours, project order, as cards: one open at a time, its stops inside. Each says its length
 * and has Play (Stop while it plays); its "..." holds Record..., Rename, Duplicate, Easing and
 * Delete. F2 and Delete on a card rename and delete it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.store - the chrome store
 * @returns The list
 */
function TourList({ session, element, store }: ListProps): React.JSX.Element {
    const save = useCommand("view.save");
    const progress = useWorkspaceState((state) => state.tourProgress);
    const [open, setOpen] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const names = [...session.tours.keys()];
    const drawn = nothingDrawn(session);

    const play = (name: string): void => {
        void orRefusal(store, `play ${name}`, element?.playTour(name, { restoreCamera: true }) ?? Promise.resolve());
    };
    const remove = (name: string): void => {
        void orRefusal(store, `delete ${name}`, session.tours.remove([name]));
    };

    const card = (name: string, tour: Tour): CardListItem => {
        const plan = element?.planTour(name) ?? null;
        const problem = drawn ?? (plan === null ? null : tourProblemWords(plan));
        const playing = progress?.tour === name;
        const length = plan === null ? null : lengthWords(plan.totalMs);
        const items: SelectionMenuItem[] = [
            {
                id: "record",
                label: "Record...",
                icon: "picture",
                group: "edit",
                reason: problem,
                onRun: () => {
                    store.set({ dialog: "export", exportOn: "video", exportSource: null, exportTour: name });
                },
            },
            {
                id: "rename",
                label: "Rename",
                icon: "rename",
                group: "edit",
                key: "F2",
                onRun: () => {
                    setRenaming(name);
                },
            },
            {
                id: "duplicate",
                label: "Duplicate",
                icon: "duplicate",
                group: "edit",
                onRun: () => {
                    void orRefusal(
                        store,
                        `duplicate ${name}`,
                        session.tours.save([{ name: copyName(session.tours, name), tour }]),
                    );
                },
            },
        ];
        // Delete last, after Easing, as every row menu ends.
        const removal: SelectionMenuItem[] = [
            {
                id: "delete",
                label: "Delete",
                icon: "delete",
                group: "remove",
                key: "Delete",
                onRun: () => {
                    remove(name);
                },
            },
        ];
        return {
            id: name,
            title: name,
            data: { "data-tour": name, "data-playing": playing ? "" : undefined },
            header: (
                <>
                    {length === null ? null : (
                        <Text span size="xs" c="dimmed" className="ws-tour-length" aria-label={`Length ${length}`}>
                            {length}
                        </Text>
                    )}
                    <Tooltip label={playing ? "Stop" : (problem ?? "Play")}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={playing ? "Stop" : "Play"}
                            aria-disabled={!playing && problem !== null ? true : undefined}
                            aria-description={playing ? undefined : (problem ?? undefined)}
                            onClick={() => {
                                if (playing) {
                                    element?.cancelCameraAnimation();
                                } else if (problem === null) {
                                    play(name);
                                }
                            }}
                        >
                            {playing ? <GLYPHS.stop size={14} aria-hidden /> : <GLYPHS.play size={14} aria-hidden />}
                        </ActionIcon>
                    </Tooltip>
                </>
            ),
            menu: (
                <RowMore name={name} items={items}>
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Easing</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            {EASINGS.map(({ id, label }) => (
                                <MenuCheckItem
                                    key={id}
                                    radio
                                    checked={tour.easing === id}
                                    onClick={() => {
                                        void orRefusal(
                                            store,
                                            `change ${name}`,
                                            session.tours.save([{ name, tour: { ...tour, easing: id } }]),
                                        );
                                    }}
                                >
                                    {label}
                                </MenuCheckItem>
                            ))}
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Divider />
                    <SelectionMenuItems items={removal} />
                </RowMore>
            ),
            children:
                tour.stops.length === 0 ? undefined : (
                    <TourStops
                        session={session}
                        element={element}
                        store={store}
                        name={name}
                        tour={tour}
                        problems={plan?.stops.map((stop) => stop.problem) ?? []}
                        playing={playing ? (progress?.stop ?? null) : null}
                    />
                ),
            footer: (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<GLYPHS.add size={12} aria-hidden />}
                    aria-disabled={save?.disabledReason === null ? undefined : true}
                    aria-description={save?.disabledReason ?? undefined}
                    onClick={() => {
                        if (save?.disabledReason === null) {
                            void orRefusal(store, `add a stop to ${name}`, addStop(session, name));
                        }
                    }}
                >
                    Add stop
                </Button>
            ),
        };
    };

    // F2 and Delete on a card's header (its name, its fold, its buttons) rename and delete its tour:
    // list-local keys, read as they bubble from the card's own controls, which CardList draws.
    const wrapper = useRef<HTMLDivElement>(null);
    const cardKeys = useRef<(event: KeyboardEvent) => void>(() => undefined);
    cardKeys.current = (event) => {
        const target = event.target as HTMLElement;
        const name = target.closest<HTMLElement>("[data-tour]")?.dataset.tour;
        if (name === undefined || target.closest(".cm-card-body, .cm-card-foot, input") !== null) {
            return;
        }
        if (event.key === "F2") {
            event.preventDefault();
            setRenaming(name);
        } else if (event.key === "Delete") {
            event.preventDefault();
            remove(name);
        }
    };
    useEffect(() => {
        const box = wrapper.current;
        const listen = (event: KeyboardEvent): void => {
            cardKeys.current(event);
        };
        box?.addEventListener("keydown", listen);
        return () => {
            box?.removeEventListener("keydown", listen);
        };
    }, []);

    return (
        <div className="ws-tours" ref={wrapper}>
            <ControlGroup
                label="Tours"
                actions={
                    names.length === 0 ? undefined : (
                        <NewTourButton
                            onRun={() => {
                                void newTour(session).then(setOpen, (error: unknown) => {
                                    store.set({
                                        notice: { message: errorWords("Could not start a tour", error), error: true },
                                    });
                                });
                            }}
                        />
                    )
                }
            >
                {names.length === 0 ? (
                    <ActionRow
                        state="No tours"
                        actions={
                            <NewTourButton
                                onRun={() => {
                                    void newTour(session).then(setOpen, (error: unknown) => {
                                        store.set({
                                            notice: {
                                                message: errorWords("Could not start a tour", error),
                                                error: true,
                                            },
                                        });
                                    });
                                }}
                            />
                        }
                    />
                ) : (
                    <CardList
                        label="Tours"
                        items={names.flatMap((name) => {
                            const tour = session.tours.get(name);
                            return tour === undefined ? [] : [card(name, tour)];
                        })}
                        autoFold={false}
                        folded={new Set(names.filter((name) => name !== open))}
                        onFoldedChange={(folded) => {
                            // One open at a time: the card just unfolded, or none.
                            setOpen(names.find((name) => !folded.has(name) && name !== open) ?? null);
                        }}
                        renaming={renaming}
                        onRenamingChange={setRenaming}
                        onRename={(from, to) => {
                            const name = to.trim();
                            if (name !== "" && name !== from) {
                                if (open === from) {
                                    setOpen(name);
                                }
                                void orRefusal(store, `rename ${from}`, session.tours.rename(from, name));
                            }
                        }}
                    />
                )}
            </ControlGroup>
        </div>
    );
}

/**
 * The New tour button.
 * @param props - Component props
 * @param props.onRun - starts the tour
 * @returns The button
 */
function NewTourButton({ onRun }: Readonly<{ onRun: () => void }>): React.JSX.Element {
    return (
        <Button size="compact-xs" variant="subtle" leftSection={<GLYPHS.add size={12} aria-hidden />} onClick={onRun}>
            New tour
        </Button>
    );
}

/**
 * The Views section: a collapsible section under the style tree holding the saved views and the
 * tours, its body scrolling inside itself (at most half the column). Save view sits in its header.
 * Views and tours... (Camera menu) expands it and puts focus on its first list.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The section
 */
export function ViewsSection({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    useViewsChanged(element);
    const opened = useWorkspaceState((state) => state.viewsOpen);
    const focusNext = useWorkspaceState((state) => state.viewsFocusNext);
    const save = useCommand("view.save");
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!focusNext || !opened) {
            return;
        }
        store.set({ viewsFocusNext: false });
        const first = root.current?.querySelector<HTMLElement>(
            '.ws-views-list [role="gridcell"][tabindex="0"], .cm-section-content button:not([tabindex="-1"])',
        );
        first?.focus({ preventScroll: true });
        first?.scrollIntoView({ block: "nearest" });
    }, [focusNext, opened, store]);

    const key = save?.command.keys?.[0];
    const keyWords = key === undefined ? null : `(${formatKey(key)})`;
    return (
        <div className="ws-views" ref={root}>
            <ControlSection
                label="Views"
                opened={opened}
                onOpenChange={(open) => {
                    store.set({ viewsOpen: open });
                }}
                actions={
                    save === null ? null : (
                        <Tooltip
                            label={[[save.command.label, keyWords].filter(Boolean).join(" "), save.disabledReason]
                                .filter(Boolean)
                                .join(": ")}
                        >
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label={save.command.label}
                                aria-keyshortcuts={key === undefined ? undefined : ariaKey(key)}
                                aria-disabled={save.disabledReason === null ? undefined : true}
                                aria-description={save.disabledReason ?? undefined}
                                onClick={save.disabledReason === null ? save.run : undefined}
                            >
                                <GLYPHS.camera size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    )
                }
            >
                <ControlGroup label="Saved views">
                    <ViewList session={session} element={element} store={store} />
                </ControlGroup>
                <TourList session={session} element={element} store={store} />
            </ControlSection>
        </div>
    );
}
