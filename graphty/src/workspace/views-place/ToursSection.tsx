/**
 * The Views place's Video tours section (design/ui/camera-views-tours-and-capture.md, section
 * 3.1): one card per tour, in project order, one unfolded at a time, its stops inside. Every write
 * goes through graphty-element's `session.tours`; every length and enable state is its `planTour`,
 * worded here. The app keeps only which card is unfolded and the tour playing (`tour-progress`).
 */

import { ActionRow, CardList, type CardListItem, ControlSection, PanelField } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { EasingName, GraphSession, Tour, TourStop } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Text, Tooltip } from "@mantine/core";
import React from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { orRefusal } from "../graph-place/actions";
import { RowMore, type SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useWorkspaceState } from "../state/WorkspaceContext";
import { nextName } from "../toolbar/commands";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { lengthWords, tourProblemWords } from "../toolbar/viewWords";
import { cameraReason, copyName } from "./commands";
import { TourStops } from "./TourStops";
import { useNamedList } from "./useNamedList";

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
 * The Video tours section: a ControlSection with New tour in its header and one card per tour, in
 * project order (tours are not reordered), each action with exactly one control.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.store - the chrome store
 * @returns The section
 */
export function ToursSection({ session, element, store }: ToursProps): React.JSX.Element {
    const opened = useWorkspaceState((state) => state.viewsToursOpen);
    const progress = useWorkspaceState((state) => state.tourProgress);
    const { names, setOpen, setRenaming, wrapper, deleteItems, listProps, cards } = useNamedList(session.tours, store);
    const drawn = nothingDrawn(session);

    const writeTour = (what: string, name: string, tour: Tour): void => {
        void orRefusal(store, what, session.tours.save([{ name, tour }]));
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
    const card = (name: string, tour: Tour): CardListItem => {
        const plan = element?.planTour(name) ?? null;
        const problem = drawn ?? (plan === null ? null : tourProblemWords(plan, element));
        const playing = progress?.tour === name;
        const length = plan === null ? null : lengthWords(plan.totalMs);
        const items: SelectionMenuItem[] = [
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
                id: "duplicate",
                label: "Duplicate",
                icon: "duplicate",
                group: "edit",
                onRun: () => {
                    writeTour(`duplicate ${name}`, copyName(session.tours, name), tour);
                },
            },
            ...deleteItems(name),
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
            menu: <RowMore name={name} items={items} />,
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
                <div className="vp-tour-foot">
                    <AddStops session={session} element={element} store={store} name={name} tour={tour} />
                    <Easing
                        name={name}
                        easing={tour.easing ?? "easeInOut"}
                        onChange={(easing) => {
                            writeTour(`change ${name}`, name, { ...tour, easing });
                        }}
                    />
                </div>
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
                    <ActionRow state="No tours" />
                ) : (
                    <CardList
                        label="Saved tours"
                        items={cards(names, (name) => session.tours.get(name), card)}
                        {...listProps}
                    />
                )}
            </ControlSection>
        </div>
    );
}

/**
 * A tour card's add row: Add camera (every saved camera) and Add pause.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element, which judges each camera
 * @param props.store - the chrome store
 * @param props.name - the tour
 * @param props.tour - the tour
 * @returns The row
 */
function AddStops({
    session,
    element,
    store,
    name,
    tour,
}: Readonly<{
    session: GraphSession;
    element: GraphtyElement | null;
    store: WorkspaceStore;
    name: string;
    tour: Tour;
}>): React.JSX.Element {
    const writeTour = (what: string, next: Tour): void => {
        void orRefusal(store, what, session.tours.save([{ name, tour: next }]));
    };
    const none = session.views.size === 0 ? "No cameras" : null;
    return (
        <div className="vp-add-stops">
            <Menu position="bottom-start" withinPortal disabled={none !== null}>
                <Menu.Target>
                    <Tooltip label={none ?? "Add camera"} disabled={none === null}>
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            leftSection={<GLYPHS.add size={12} aria-hidden />}
                            aria-label={`Add camera to ${name}`}
                            aria-disabled={none === null ? undefined : true}
                            aria-description={none ?? undefined}
                        >
                            Add camera
                        </Button>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown data-portal="">
                    {[...session.views].map(([view, saved]) => (
                        <CommandMenuItem
                            key={view}
                            label={view}
                            shortcut={undefined}
                            reason={cameraReason(element, view, saved)}
                            onRun={() => {
                                writeTour(`add a stop to ${name}`, {
                                    ...tour,
                                    stops: [...tour.stops, cameraStop(tour.stops, view)],
                                });
                            }}
                        />
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
                Add pause
            </Button>
        </div>
    );
}

/**
 * A tour's Easing: one labelled row under the add row, the only way to set it.
 * @param props - Component props
 * @param props.name - the tour
 * @param props.easing - its easing now
 * @param props.onChange - saves a new easing
 * @returns The row
 */
function Easing({
    name,
    easing,
    onChange,
}: Readonly<{ name: string; easing: EasingName; onChange: (easing: EasingName) => void }>): React.JSX.Element {
    return (
        <div className="vp-field">
            <Text span size="xs" className="vp-field-label" aria-hidden>
                Easing
            </Text>
            <PanelField
                kind="select"
                label="Easing"
                title={`Easing of ${name}`}
                width="fill"
                data={EASINGS.map(({ id, label }) => ({ value: id, label }))}
                value={easing}
                onChange={(value) => {
                    const chosen = EASINGS.find(({ id }) => id === value);
                    if (chosen !== undefined && chosen.id !== easing) {
                        onChange(chosen.id);
                    }
                }}
            />
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
