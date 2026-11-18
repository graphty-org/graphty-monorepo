/**
 * The Views place's Video tours section (design/ui/camera-views-tours-and-capture.md, section
 * 3.1): one card per tour, in project order, one unfolded at a time, its stops inside. Every write
 * goes through graphty-element's `session.tours`; every length and enable state is its `planTour`,
 * worded here. The app keeps only which card is unfolded and the tour playing (`tour-progress`).
 */

import { ActionRow, CardList, type CardListItem, ControlSection, MenuCheckItem } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { EasingName, GraphSession, Tour, TourStop } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { orRefusal } from "../graph-place/actions";
import { RowMore, type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useCommand, useWorkspaceState } from "../state/WorkspaceContext";
import { nextName } from "../toolbar/commands";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { lengthWords, tourProblemWords } from "../toolbar/viewWords";
import { type CardKey, copyName, moveBy, useHeaderKeys } from "./commands";
import { TourStops } from "./TourStops";

/** A new camera stop's flight and hold, and a new pause's length, in milliseconds. */
const STOP_MS = 2000;

/** The easings a tour can fly with, in the app's words. */
const EASINGS: readonly { readonly id: EasingName; readonly label: string }[] = [
    { id: "linear", label: "Linear" },
    { id: "easeIn", label: "Ease in" },
    { id: "easeOut", label: "Ease out" },
    { id: "easeInOut", label: "Ease in and out" },
];

/** Props for ToursSection. */
interface ToursProps {
    readonly session: GraphSession;
    readonly element: GraphtyElement | null;
    readonly store: WorkspaceStore;
}

/**
 * A camera stop naming a camera: the first stop cuts there (flight 0), the rest fly 2 s; each holds 2 s.
 * @param stops - the tour's stops now.
 * @param view - the camera.
 * @returns the stop.
 */
function cameraStop(stops: readonly TourStop[], view: string): TourStop {
    return { view, duration: stops.length === 0 ? 0 : STOP_MS, hold: STOP_MS };
}

/**
 * The Video tours section: a ControlSection with New tour in its header, one card per tour, and
 * the list-local keys on its cards' headers.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.store - the chrome store
 * @returns The section
 */
export function ToursSection({ session, element, store }: ToursProps): React.JSX.Element {
    const save = useCommand("camera.save");
    const opened = useWorkspaceState((state) => state.viewsToursOpen);
    const progress = useWorkspaceState((state) => state.tourProgress);
    const [open, setOpen] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const names = [...session.tours.keys()];
    const drawn = nothingDrawn(session);

    const writeTour = (what: string, name: string, tour: Tour): void => {
        void orRefusal(store, what, session.tours.save([{ name, tour }]));
    };
    const remove = (name: string): void => {
        void orRefusal(store, `delete ${name}`, session.tours.remove([name]));
    };
    const move = (name: string, by: -1 | 1): void => {
        const work = moveBy(session.tours, name, by);
        if (work !== undefined) {
            void orRefusal(store, `move ${name}`, work);
        }
    };
    const newTour = (): void => {
        const name = nextName(session.tours, "Tour");
        void orRefusal(store, "start a tour", session.tours.save([{ name, tour: { stops: [] } }])).then(() => {
            if (session.tours.has(name)) {
                setOpen(name);
                setRenaming(name);
            }
        });
    };
    // Current camera: saves "Camera N" and appends a stop naming it, as one step.
    const addCurrent = (name: string): void => {
        let saved = "";
        void orRefusal(
            store,
            `add a stop to ${name}`,
            session.transaction(`adding a stop to ${name}`, async (tx) => {
                saved = nextName(tx.views, "Camera");
                await tx.views.save([{ name: saved }]);
                const tour: Tour = tx.tours.get(name) ?? { stops: [] };
                await tx.tours.save([
                    { name, tour: { ...tour, stops: [...tour.stops, cameraStop(tour.stops, saved)] } },
                ]);
            }),
        ).then(() => {
            if (session.views.has(saved)) {
                store.set({ announcement: `Saved ${saved}` });
            }
        });
    };
    const onKey = (name: string, key: CardKey): void => {
        if (key === "rename") {
            setRenaming(name);
        } else if (key === "delete") {
            remove(name);
        } else {
            move(name, key === "up" ? -1 : 1);
        }
    };
    const wrapper = useHeaderKeys(onKey);

    const card = (name: string, tour: Tour, at: number): CardListItem => {
        const plan = element?.planTour(name) ?? null;
        const problem = drawn ?? (plan === null ? null : tourProblemWords(plan, element));
        const playing = progress?.tour === name;
        const length = plan === null ? null : lengthWords(plan.totalMs);
        const first: SelectionMenuItem[] = [
            {
                id: "export",
                label: "Export video...",
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
                    writeTour(`duplicate ${name}`, copyName(session.tours, name), tour);
                },
            },
        ];
        const rest: SelectionMenuItem[] = [
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
        ];
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
            aside:
                length === null ? undefined : (
                    <Text span size="xs" c="dimmed" className="vp-length" aria-label={`Length ${length}`}>
                        {length}
                    </Text>
                ),
            header: (
                <PlayButton
                    name={name}
                    playing={playing}
                    problem={problem}
                    onPlay={() => {
                        void orRefusal(
                            store,
                            `play ${name}`,
                            element?.playTour(name, { restoreCamera: true }) ?? Promise.resolve(),
                        );
                    }}
                    onStop={() => {
                        element?.cancelCameraAnimation();
                    }}
                />
            ),
            menu: (
                <RowMore name={name} items={[]}>
                    <SelectionMenuItems items={first} />
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Easing</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            {EASINGS.map(({ id, label }) => (
                                <MenuCheckItem
                                    key={id}
                                    radio
                                    checked={(tour.easing ?? "easeInOut") === id}
                                    onClick={() => {
                                        writeTour(`change ${name}`, name, { ...tour, easing: id });
                                    }}
                                >
                                    {label}
                                </MenuCheckItem>
                            ))}
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <SelectionMenuItems items={rest} />
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
                <AddStops
                    session={session}
                    store={store}
                    name={name}
                    tour={tour}
                    saveReason={save === null ? "Not available" : save.disabledReason}
                    onCurrent={() => {
                        addCurrent(name);
                    }}
                />
            ),
        };
    };

    const newTourButton = (
        <Tooltip label="New tour">
            <ActionIcon variant="subtle" size="sm" aria-label="New tour" onClick={newTour}>
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
    return (
        <div className="vp-tours" ref={wrapper}>
            <ControlSection
                label="Video tours"
                opened={opened}
                onOpenChange={(next) => {
                    store.set({ viewsToursOpen: next });
                }}
                actions={newTourButton}
            >
                {names.length === 0 ? (
                    <ActionRow
                        state="No tours"
                        actions={
                            <Button size="compact-xs" variant="subtle" onClick={newTour}>
                                New tour
                            </Button>
                        }
                    />
                ) : (
                    <CardList
                        label="Saved tours"
                        items={names.flatMap((name, at) => {
                            const tour = session.tours.get(name);
                            return tour === undefined ? [] : [card(name, tour, at)];
                        })}
                        autoFold={false}
                        folded={new Set(names.filter((name) => name !== open))}
                        onFoldedChange={(folded) => {
                            // One unfolded at a time: the card just unfolded, or none.
                            setOpen(names.find((name) => !folded.has(name) && name !== open) ?? null);
                        }}
                        onReorder={(name, to) => {
                            void orRefusal(store, `move ${name}`, session.tours.move(name, to));
                        }}
                        renaming={renaming}
                        onRenamingChange={setRenaming}
                        onRename={(from, typed) => {
                            const to = typed.trim();
                            if (to === "" || to === from) {
                                return;
                            }
                            let renamed = false;
                            const work = session.tours.rename(from, to).then(() => {
                                renamed = true;
                            });
                            void orRefusal(store, `rename ${from}`, work).then(() => {
                                const now = renamed ? to : from;
                                if (open === from) {
                                    setOpen(now);
                                }
                                wrapper.current
                                    ?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(now)}"] .cm-card-name`)
                                    ?.focus();
                            });
                        }}
                    />
                )}
            </ControlSection>
        </div>
    );
}

/**
 * A tour card's foot: + Camera (Current camera, then every saved camera) and + Pause.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.name - the tour
 * @param props.tour - the tour
 * @param props.saveReason - why the camera on screen cannot be saved now, or null
 * @param props.onCurrent - saves the camera on screen and appends a stop naming it
 * @returns The row
 */
function AddStops({
    session,
    store,
    name,
    tour,
    saveReason,
    onCurrent,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    name: string;
    tour: Tour;
    saveReason: string | null;
    onCurrent: () => void;
}>): React.JSX.Element {
    const writeTour = (what: string, next: Tour): void => {
        void orRefusal(store, what, session.tours.save([{ name, tour: next }]));
    };
    return (
        <div className="vp-add-stops">
            <Menu position="bottom-start" withinPortal>
                <Menu.Target>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        leftSection={<GLYPHS.add size={12} aria-hidden />}
                        aria-label={`Add camera to ${name}`}
                    >
                        Camera
                    </Button>
                </Menu.Target>
                <Menu.Dropdown data-portal="">
                    <Menu.Item disabled={saveReason !== null} onClick={onCurrent}>
                        Current camera
                    </Menu.Item>
                    {session.views.size === 0 ? null : <Menu.Divider />}
                    {[...session.views.keys()].map((view) => (
                        <Menu.Item
                            key={view}
                            onClick={() => {
                                writeTour(`add a stop to ${name}`, {
                                    ...tour,
                                    stops: [...tour.stops, cameraStop(tour.stops, view)],
                                });
                            }}
                        >
                            {view}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
            <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<GLYPHS.add size={12} aria-hidden />}
                aria-label={`Add pause to ${name}`}
                onClick={() => {
                    void orRefusal(
                        store,
                        `add a pause to ${name}`,
                        session.transaction(`adding a pause to ${name}`, async (tx) => {
                            const now: Tour = tx.tours.get(name) ?? tour;
                            await tx.tours.save([
                                { name, tour: { ...now, stops: [...now.stops, { pause: STOP_MS }] } },
                            ]);
                        }),
                    );
                }}
            >
                Pause
            </Button>
        </div>
    );
}

/**
 * A tour card's Play button, which is Stop while its tour plays.
 * @param props - Component props
 * @param props.name - the tour
 * @param props.playing - whether it plays now
 * @param props.problem - why it cannot play, or null
 * @param props.onPlay - plays it
 * @param props.onStop - stops it
 * @returns The button
 */
function PlayButton({
    name,
    playing,
    problem,
    onPlay,
    onStop,
}: Readonly<{
    name: string;
    playing: boolean;
    problem: string | null;
    onPlay: () => void;
    onStop: () => void;
}>): React.JSX.Element {
    if (playing) {
        return (
            <Tooltip label="Stop tour (Esc)">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Stop tour"
                    aria-keyshortcuts="Escape"
                    onClick={onStop}
                >
                    <GLYPHS.stop size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    }
    return (
        <Tooltip label={problem ?? "Play tour"}>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={`Play ${name}`}
                aria-disabled={problem === null ? undefined : true}
                aria-description={problem ?? undefined}
                onClick={problem === null ? onPlay : undefined}
            >
                <GLYPHS.play size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
}
