/**
 * A tour's stops in the Views place (design/ui/camera-views-tours-and-capture.md, section 3.1): a
 * nested CardList, one card per stop, reordered only by its grip (a drag, or Alt+Up and Alt+Down)
 * and deleted only by its x. A camera stop's body is its Camera, Fly in and Stay; a pause's is its
 * Wait. Each edit saves the whole tour through `session.tours`, one undo step; a stop's problem is
 * the element's (`planTour`), worded.
 */

import { CardList, type CardListItem, PanelField } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { CodedFact, GraphSession, Tour, TourStop } from "@graphty/graphty-element/session";
import { Select, Stack, Text, Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { orRefusal } from "../graph-place/actions";
import type { WorkspaceStore } from "../state/store";
import { cameraViewName, stopProblemWords } from "../toolbar/viewWords";
import { cameraReason } from "./commands";
import { useDragOrder } from "./useNamedList";

/**
 * Each stop's card id, in stop order, for the stops it was made for; `pending` is where a move or
 * a delete being saved puts them.
 */
interface StopIds {
    readonly stops: readonly TourStop[];
    readonly ids: readonly string[];
    readonly pending: readonly string[] | null;
}

let stopCount = 0;

/**
 * A new stop card id, never given before.
 * @returns the id.
 */
function newStopId(): string {
    stopCount += 1;
    return `stop-${String(stopCount)}`;
}

/** A stop that names a camera (not a pause). */
type CameraStop = Extract<TourStop, { view: string }>;

/** What each time means, as its label's tooltip and its field's description. */
const MEANING = {
    firstFly: "Seconds to fly here from where the camera is when Play is pressed (0 cuts straight there)",
    fly: "Seconds to fly here from the previous stop",
    stay: "Seconds to stay here before moving on",
    wait: "Seconds the camera stays still",
} as const;

/** Props for TourStops. */
interface TourStopsProps {
    readonly session: GraphSession;
    readonly element: GraphtyElement | null;
    readonly store: WorkspaceStore;
    /** The tour's name. */
    readonly name: string;
    /** The tour. */
    readonly tour: Tour;
    /** Each stop's problem, from `planTour`, in stop order. */
    readonly problems: readonly (CodedFact | null)[];
    /** The stop playing now (0-based), or null. */
    readonly playing: number | null;
}

/**
 * A camera's words: a saved camera's name, or a camera view id (written through the API) in the
 * app's words.
 * @param session - the element's session.
 * @param view - the stop's camera.
 * @returns the words.
 */
function cameraLabel(session: GraphSession, view: string): string {
    if (session.views.has(view)) {
        return view;
    }
    const camera = session.catalog.cameras().find(({ id }) => id === view);
    return camera === undefined ? view : cameraViewName(view, camera.plainName);
}

/**
 * The cameras a stop can name: the saved cameras in project order. A stop naming a camera view id
 * directly adds that view in the app's words; a name nothing answers to is kept as a choice of its
 * own, so the field shows it.
 * @param session - the element's session.
 * @param element - the element, which judges each camera.
 * @param view - the stop's camera now.
 * @returns the choices, in Mantine's `Select` shape, each with why it cannot be chosen now.
 */
function cameraChoices(
    session: GraphSession,
    element: GraphtyElement | null,
    view: string,
): { value: string; label: string; reason: string | null; disabled: boolean }[] {
    // A camera that cannot be flown now (3D only in 2D) is listed disabled, with its reason.
    const saved = [...session.views].map(([each, camera]) => {
        const reason = each === view ? null : cameraReason(element, each, camera);
        return { value: each, label: each, reason, disabled: reason !== null };
    });
    if (session.views.has(view)) {
        return saved;
    }
    return [{ value: view, label: cameraLabel(session, view), reason: null, disabled: false }, ...saved];
}

/**
 * Whether a stop is a pause.
 * @param stop - the stop.
 * @returns true for a pause.
 */
function isPause(stop: TourStop): stop is Extract<TourStop, { pause: number }> {
    return "pause" in stop;
}

/**
 * Milliseconds as seconds, one decimal at most: 2000 is "2", 500 is "0.5".
 * @param ms - the time.
 * @returns the words.
 */
function secondsWords(ms: number): string {
    return String(Math.round(ms / 100) / 10);
}

/**
 * A folded stop's one line: "Top 0 s / 2 s" (the camera, then Fly in / Stay), or "Pause 2 s". The
 * camera's name gives way before the times, and the line's tooltip says them in full.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.stop - the stop
 * @param props.current - "step" on the stop playing now
 * @returns The line
 */
function Summary({
    session,
    stop,
    current,
}: Readonly<{ session: GraphSession; stop: TourStop; current: "step" | undefined }>): React.JSX.Element {
    if (isPause(stop)) {
        return <span aria-current={current}>Pause {secondsWords(stop.pause)} s</span>;
    }
    const camera = cameraLabel(session, stop.view);
    const fly = secondsWords(stop.duration ?? 0);
    const stay = secondsWords(stop.hold ?? 0);
    return (
        <span className="vp-stop-summary" aria-current={current} title={`${camera}, fly in ${fly} s, stay ${stay} s`}>
            <span className="vp-stop-summary-camera">{camera}</span>
            <span className="vp-stop-summary-times">
                {fly} s / {stay} s
            </span>
        </span>
    );
}

/**
 * One labelled time: its word in the label column, with what it means as a tooltip, and a number
 * field in seconds that says the same as its description.
 * @param props - Component props
 * @param props.label - the word: Fly in, Stay or Wait
 * @param props.meaning - what it means
 * @param props.ms - the time, in milliseconds
 * @param props.onChange - saves a new time, in milliseconds
 * @returns The row
 */
function TimeRow({
    label,
    meaning,
    ms,
    onChange,
}: Readonly<{ label: string; meaning: string; ms: number; onChange: (ms: number) => void }>): React.JSX.Element {
    return (
        <div className="vp-field">
            <Tooltip label={meaning} multiline w={200}>
                <Text span size="xs" className="vp-field-label" aria-hidden>
                    {label}
                </Text>
            </Tooltip>
            <PanelField
                kind="number"
                label={label}
                title={meaning}
                stepHint={meaning}
                unit="s"
                width="fill"
                min={0}
                step={0.5}
                decimalScale={1}
                value={ms / 1000}
                onChange={(value) => {
                    onChange(Math.round(Number(value) * 1000));
                }}
            />
        </div>
    );
}

/**
 * The stops of one tour, in order, as a nested CardList.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.store - the chrome store
 * @param props.name - the tour's name
 * @param props.tour - the tour
 * @param props.problems - each stop's problem
 * @param props.playing - the stop playing now
 * @returns The stops
 */
export function TourStops({
    session,
    element,
    store,
    name,
    tour,
    problems,
    playing,
}: TourStopsProps): React.JSX.Element {
    const { stops } = tour;
    const box = useRef<HTMLDivElement>(null);
    const write = (what: string, next: readonly TourStop[]): Promise<void> =>
        orRefusal(store, what, session.tours.save([{ name, tour: { ...tour, stops: next } }]));
    const edit = (at: number, change: Partial<CameraStop> | { pause: number }): void => {
        void write(
            `change ${name}`,
            stops.map((stop, i) => (i === at ? { ...stop, ...change } : stop)),
        );
    };

    // A stop has no identity of its own (two stops may name one camera), so each card gets an id
    // that moves with its stop: a move or a delete says where the ids go once it is saved, and any
    // other change keeps them by place, numbering stops added at the end. CardList keeps a card's
    // fold, and a key move's focus, by this id.
    const [ident, setIdent] = useState<StopIds>(() => ({ stops, ids: stops.map(() => newStopId()), pending: null }));
    let { ids } = ident;
    if (ident.stops !== stops) {
        const { pending } = ident;
        ids =
            pending !== null && pending.length === stops.length
                ? pending
                : stops.map((_, at) => ident.ids[at] ?? newStopId());
        setIdent({ stops, ids, pending: null });
    }
    const index = (id: string): number => ids.indexOf(id);
    const writeIds = (what: string, next: readonly TourStop[], nextIds: readonly string[]): Promise<void> => {
        const before = JSON.stringify(stops);
        setIdent((now) => ({ ...now, pending: nextIds }));
        return write(what, next).then(() => {
            // Refused: nothing changes, so the ids stay where they are.
            if (JSON.stringify(session.tours.get(name)?.stops ?? []) === before) {
                setIdent((now) => (now.pending === nextIds ? { ...now, pending: null } : now));
            }
        });
    };

    const drag = useDragOrder(ids, (id, to) => {
        const from = index(id);
        const rest = stops.filter((_, i) => i !== from);
        const restIds = ids.filter((each) => each !== id);
        return writeIds(
            `move a stop of ${name}`,
            [...rest.slice(0, to), stops[from], ...rest.slice(to)],
            [...restIds.slice(0, to), id, ...restIds.slice(to)],
        );
    });

    // The last stop's x leaves no card to focus: focus goes to the tour's Add camera.
    const remove = (id: string): void => {
        const card = box.current?.parentElement?.closest<HTMLElement>("[data-card-id]");
        const last = stops.length === 1;
        const addCamera = CSS.escape(`Add camera to ${name}`);
        const from = index(id);
        void writeIds(
            `delete a stop of ${name}`,
            stops.filter((_, i) => i !== from),
            ids.filter((each) => each !== id),
        ).then(() => {
            if (last && session.tours.get(name)?.stops.length === 0) {
                card?.querySelector<HTMLElement>(`[aria-label="${addCamera}"]`)?.focus();
            }
        });
    };

    const items = drag.order.map((id, shown): CardListItem => {
        const at = index(id);
        const stop = stops[at];
        const current = playing === at ? "step" : undefined;
        return {
            id,
            title: `Stop ${String(shown + 1)}`,
            className: current === undefined ? "vp-stop" : "vp-stop vp-stop-playing",
            summary: <Summary session={session} stop={stop} current={current} />,
            children: (
                <div className="vp-stop-body" aria-current={current}>
                    {isPause(stop) ? (
                        <TimeRow
                            label="Wait"
                            meaning={MEANING.wait}
                            ms={stop.pause}
                            onChange={(pause) => {
                                edit(at, { pause });
                            }}
                        />
                    ) : (
                        <>
                            <StopCamera
                                session={session}
                                element={element}
                                view={stop.view}
                                problem={stopProblemWords(problems[at] ?? null, element)}
                                onChange={(view) => {
                                    edit(at, { view });
                                }}
                            />
                            <TimeRow
                                label="Fly in"
                                meaning={shown === 0 ? MEANING.firstFly : MEANING.fly}
                                ms={stop.duration ?? 0}
                                onChange={(duration) => {
                                    edit(at, { duration });
                                }}
                            />
                            <TimeRow
                                label="Stay"
                                meaning={MEANING.stay}
                                ms={stop.hold ?? 0}
                                onChange={(hold) => {
                                    edit(at, { hold });
                                }}
                            />
                        </>
                    )}
                </div>
            ),
        };
    });

    return (
        <div className="vp-stops" ref={box} onPointerDownCapture={drag.onPointerDownCapture}>
            <CardList label={`Stops of ${name}`} items={items} autoFold={false} onRemove={remove} {...drag.listProps} />
        </div>
    );
}

/**
 * A camera stop's Camera: the saved cameras, in its error state with the worded problem.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.view - the stop's camera
 * @param props.problem - why the stop cannot be flown, or null
 * @param props.onChange - names another camera
 * @returns The row
 */
function StopCamera({
    session,
    element,
    view,
    problem,
    onChange,
}: Readonly<{
    session: GraphSession;
    element: GraphtyElement | null;
    view: string;
    problem: string | null;
    onChange: (view: string) => void;
}>): React.JSX.Element {
    const choices = cameraChoices(session, element, view);
    return (
        <div className="vp-field">
            <Text span size="xs" className="vp-field-label" aria-hidden>
                Camera
            </Text>
            <Select
                className="vp-field-input"
                size="xs"
                aria-label="Camera"
                aria-description={problem ?? undefined}
                data={choices}
                renderOption={({ option }) => {
                    const why = choices.find((each) => each.value === option.value)?.reason;
                    return why === null || why === undefined ? (
                        option.label
                    ) : (
                        <Stack gap={0}>
                            <Text size="xs">{option.label}</Text>
                            <Text size="xs" c="dimmed">
                                {why}
                            </Text>
                        </Stack>
                    );
                }}
                value={view}
                error={problem ?? undefined}
                allowDeselect={false}
                searchable={false}
                comboboxProps={{ withinPortal: true }}
                onChange={(next) => {
                    if (next !== null && next !== view) {
                        onChange(next);
                    }
                }}
            />
        </div>
    );
}
