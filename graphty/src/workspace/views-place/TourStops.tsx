/**
 * A tour's stops in the Views place (design/ui/camera-views-tours-and-capture.md, section 3.1):
 * a camera stop is its number and camera on one line and its Flight and Hold in seconds on the
 * next; a pause is its number, the word Pause and its length. Each edit saves the whole tour
 * through `session.tours`, one undo step; a stop's problem is the element's (`planTour`), worded.
 */

import { FieldRow, PanelField } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { CodedFact, GraphSession, Tour, TourStop } from "@graphty/graphty-element/session";
import { Select, Stack, Text } from "@mantine/core";
import React from "react";

import { orRefusal } from "../graph-place/actions";
import { matchesKey } from "../keys/keys";
import { RowMore, type SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { goToSavedView, nextName } from "../toolbar/commands";
import { cameraViewName, stopProblemWords } from "../toolbar/viewWords";
import { cameraReason } from "./commands";

/** A stop that names a camera (not a pause). */
type CameraStop = Extract<TourStop, { view: string }>;

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
 * The cameras a stop can name: the saved cameras in project order. A stop naming a camera view id
 * directly (written through the API) adds that view in the app's words; a name nothing answers to
 * is kept as a choice of its own, so the field shows it.
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
    const camera = session.catalog.cameras().find(({ id }) => id === view);
    const label = camera === undefined ? view : cameraViewName(view, camera.plainName);
    return [{ value: view, label, reason: null, disabled: false }, ...saved];
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
 * The stops of one tour, in order. Mod+] and Mod+[ move a stop and Delete deletes it, from its
 * camera field or its "..." button (never from a number field, where Delete deletes text).
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
    const workspace = useWorkspace();
    const { stops } = tour;
    const write = (what: string, next: readonly TourStop[]): void => {
        void orRefusal(store, what, session.tours.save([{ name, tour: { ...tour, stops: next } }]));
    };
    const edit = (at: number, change: Partial<CameraStop> | { pause: number }): void => {
        write(
            `change ${name}`,
            stops.map((stop, i) => (i === at ? { ...stop, ...change } : stop)),
        );
    };
    const list = React.useRef<HTMLOListElement>(null);
    // Returns where the stop went, or null at the list's end.
    const move = (at: number, by: -1 | 1): number | null => {
        const to = at + by;
        if (to < 0 || to >= stops.length) {
            return null;
        }
        const next = [...stops];
        [next[at], next[to]] = [next[to], next[at]];
        write(`move a stop of ${name}`, next);
        return to;
    };
    // Focus goes to the next stop's "..." (stops are drawn by place, so it is this row's), or to
    // + Camera when the last stop went; the list may be gone by then, so the card is found first.
    const remove = (at: number): void => {
        const card = list.current?.closest<HTMLElement>("[data-card-id]");
        const addCamera = CSS.escape(`Add camera to ${name}`);
        const next = stops.filter((_, i) => i !== at);
        void orRefusal(
            store,
            `delete a stop of ${name}`,
            session.tours.save([{ name, tour: { ...tour, stops: next } }]),
        ).then(() => {
            if (session.tours.get(name)?.stops.length !== next.length) {
                return;
            }
            const target =
                at < next.length
                    ? list.current?.querySelector<HTMLElement>(`[aria-label="More for Stop ${String(at + 1)}"]`)
                    : card?.querySelector<HTMLElement>(`[aria-label="${addCamera}"]`);
            target?.focus();
        });
    };
    // A new "Camera N" at the camera on screen; the old camera and every tour using it stay as they are.
    const replace = (at: number): void => {
        let saved = "";
        void orRefusal(
            store,
            `replace a stop of ${name}`,
            session.transaction(`replacing a stop of ${name}`, async (tx) => {
                saved = nextName(tx.views, "Camera");
                await tx.views.save([{ name: saved }]);
                const now = tx.tours.get(name) ?? tour;
                await tx.tours.save([
                    {
                        name,
                        tour: {
                            ...now,
                            stops: now.stops.map((stop, i) => (i === at ? { ...stop, view: saved } : stop)),
                        },
                    },
                ]);
            }),
        ).then(() => {
            if (session.views.has(saved)) {
                store.set({ announcement: `Saved ${saved}` });
            }
        });
    };
    const items = (stop: TourStop, at: number, reason: string | null): SelectionMenuItem[] => [
        ...(isPause(stop)
            ? []
            : [
                  {
                      id: "go",
                      label: "Go to",
                      icon: "go" as const,
                      group: "edit" as const,
                      reason,
                      reasonDrawn: false,
                      onRun: () => {
                          const work = session.views.has(stop.view)
                              ? goToSavedView(workspace, stop.view)
                              : (element?.applyCameraView(stop.view, { animate: true }) ?? Promise.resolve());
                          void orRefusal(store, `go to ${stop.view}`, work);
                      },
                  },
              ]),
        {
            id: "up",
            label: "Move up",
            icon: "moveUp",
            group: "edit",
            key: "Mod+]",
            reason: at === 0 ? "Already at the top" : null,
            reasonDrawn: false,
            onRun: () => {
                move(at, -1);
            },
        },
        {
            id: "down",
            label: "Move down",
            icon: "moveDown",
            group: "edit",
            key: "Mod+[",
            reason: at === stops.length - 1 ? "Already at the bottom" : null,
            reasonDrawn: false,
            onRun: () => {
                move(at, 1);
            },
        },
        ...(isPause(stop)
            ? []
            : [
                  {
                      id: "replace",
                      label: "Replace with current camera",
                      icon: "camera" as const,
                      group: "edit" as const,
                      onRun: () => {
                          replace(at);
                      },
                  },
              ]),
        {
            id: "delete",
            label: "Delete stop",
            icon: "delete",
            group: "remove",
            key: "Delete",
            onRun: () => {
                remove(at);
            },
        },
    ];

    // Mod+] and Mod+[ move a stop, Delete deletes it, from its camera field or its "..." button; an
    // open list keeps its keys.
    const stopKeys = (event: React.KeyboardEvent<HTMLElement>, at: number): void => {
        if ("expanded" in event.currentTarget.dataset) {
            return;
        }
        if (matchesKey(event.nativeEvent, "Mod+]") || matchesKey(event.nativeEvent, "Mod+[")) {
            event.preventDefault();
            event.stopPropagation();
            const to = move(at, event.key === "]" ? -1 : 1);
            // Stops are drawn by place, so focus follows the stop to its new place: the same control
            // there, named after its new number.
            const field = event.currentTarget.getAttribute("aria-label");
            if (to !== null && field !== null) {
                const there = field.replace(/\d+/, String(to + 1));
                list.current?.querySelector<HTMLElement>(`[aria-label="${CSS.escape(there)}"]`)?.focus();
            }
        } else if (event.key === "Delete") {
            event.preventDefault();
            event.stopPropagation();
            remove(at);
        }
    };

    const seconds = (label: string, ms: number, onChange: (ms: number) => void): React.JSX.Element => (
        <PanelField
            kind="number"
            label={label}
            unit="s"
            min={0}
            step={0.5}
            decimalScale={1}
            value={ms / 1000}
            onChange={(value) => {
                onChange(Math.round(Number(value) * 1000));
            }}
        />
    );

    return (
        <ol className="vp-stops" ref={list} aria-label={`Stops of ${name}`}>
            {stops.map((stop, at) => {
                const reason = isPause(stop) ? null : stopProblemWords(problems[at] ?? null, element);
                const choices = isPause(stop) ? [] : cameraChoices(session, element, stop.view);
                const label = `Stop ${String(at + 1)}`;
                const more = (
                    <RowMore
                        name={label}
                        items={items(stop, at, reason)}
                        onKeyDown={(event) => {
                            stopKeys(event, at);
                        }}
                    />
                );
                return (
                    // A stop's camera may repeat, so its place is its key: an edit never moves it.
                    // eslint-disable-next-line react/no-array-index-key -- a stop has no identity but its place (two stops may name one camera), and an edit must not remount its fields
                    <li key={at} className="vp-stop" aria-current={playing === at ? "step" : undefined}>
                        <div className="vp-stop-line">
                            <Text span className="vp-stop-number" aria-hidden>
                                {at + 1}
                            </Text>
                            {isPause(stop) ? (
                                <Text span className="vp-stop-pause">
                                    Pause
                                </Text>
                            ) : (
                                <Select
                                    className="vp-stop-camera"
                                    size="xs"
                                    aria-label={`${label} camera`}
                                    aria-description={reason ?? undefined}
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
                                    value={stop.view}
                                    error={reason ?? undefined}
                                    allowDeselect={false}
                                    searchable={false}
                                    comboboxProps={{ withinPortal: true }}
                                    onKeyDown={(event) => {
                                        stopKeys(event, at);
                                    }}
                                    onChange={(view) => {
                                        if (view !== null && view !== stop.view) {
                                            edit(at, { view });
                                        }
                                    }}
                                />
                            )}
                            {more}
                        </div>
                        <FieldRow groupLabel={`${label} times`}>
                            {isPause(stop) ? (
                                seconds("Pause", stop.pause, (pause) => {
                                    edit(at, { pause });
                                })
                            ) : (
                                <>
                                    {seconds("Flight", stop.duration ?? 0, (duration) => {
                                        edit(at, { duration });
                                    })}
                                    {seconds("Hold", stop.hold ?? 0, (hold) => {
                                        edit(at, { hold });
                                    })}
                                </>
                            )}
                        </FieldRow>
                    </li>
                );
            })}
        </ol>
    );
}
