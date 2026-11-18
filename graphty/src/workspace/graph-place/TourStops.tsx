/**
 * A tour's stops in the Views section (design/ui/camera-views-tours-and-capture.md, section 3.2):
 * two lines per stop, its number and view on the first, its Flight and Hold in seconds side by
 * side on the second. Each edit saves the whole tour through `session.tours`, one undo step; a
 * stop's problem is the element's (`planTour`), worded.
 */

import { FieldRow, PanelField } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { CodedFact, GraphSession, Tour, TourStop } from "@graphty/graphty-element/session";
import { Select, Text, Tooltip } from "@mantine/core";
import React from "react";

import { matchesKey } from "../keys/keys";
import { RowMore, type SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { nextName, savedViewReason } from "../toolbar/commands";
import { cameraViewName, stopProblemWords } from "../toolbar/viewWords";
import { orRefusal } from "./actions";

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
 * The views a stop can name, grouped as the element resolves a name: camera views first, then the
 * saved views no camera view has taken the name of (picking one would fly to the camera view).
 * A name nothing answers to is kept as a choice of its own, so the field shows it.
 * @param session - the element's session.
 * @param ctx - the workspace, for each saved view's reason.
 * @param view - the stop's view now.
 * @returns the choices, in Mantine's `Select` shape.
 */
function viewChoices(
    session: GraphSession,
    ctx: ReturnType<typeof useWorkspace>,
    view: string,
): (
    { value: string; label: string; disabled?: boolean } | { group: string; items: { value: string; label: string }[] }
)[] {
    const cameras = session.catalog
        .cameras()
        .map(({ id, plainName }) => ({ value: id, label: cameraViewName(id, plainName) }));
    const saved = [...session.views.keys()]
        .filter((each) => ctx.element?.viewProblem(each, { saved: true })?.code !== "E_PROTECTED")
        .map((each) => ({ value: each, label: each }));
    const known = [...cameras, ...saved].some((each) => each.value === view);
    return [
        ...(known ? [] : [{ value: view, label: view, disabled: true }]),
        { group: "Camera views", items: cameras },
        ...(saved.length === 0 ? [] : [{ group: "Saved views", items: saved }]),
    ];
}

/**
 * The stops of one tour, in order. Mod+] and Mod+[ move the focused stop, Delete deletes it, from
 * anywhere in its first line.
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
    const edit = (at: number, change: Partial<TourStop>): void => {
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
    const remove = (at: number): void => {
        write(
            `delete a stop of ${name}`,
            stops.filter((_, i) => i !== at),
        );
    };
    // A new "View N" at the camera on screen; the old view and every tour using it stay as they are.
    const replace = (at: number): void => {
        void orRefusal(
            store,
            `replace a stop of ${name}`,
            session.transaction("Replace stop", async (tx) => {
                const view = nextName(tx.views);
                await tx.views.save([{ name: view }]);
                const now = tx.tours.get(name) ?? tour;
                await tx.tours.save([
                    {
                        name,
                        tour: { ...now, stops: now.stops.map((stop, i) => (i === at ? { ...stop, view } : stop)) },
                    },
                ]);
            }),
        );
    };
    const items = (stop: TourStop, at: number, reason: string | null): SelectionMenuItem[] => [
        {
            id: "go",
            label: "Go to",
            icon: "go",
            group: "edit",
            reason,
            reasonDrawn: false,
            onRun: () => {
                if (session.views.has(stop.view) && savedViewReason(workspace, stop.view) === null) {
                    workspace.store.set({ lastView: stop.view });
                }
                void orRefusal(
                    store,
                    `go to ${stop.view}`,
                    element?.applyCameraView(stop.view, { animate: true }) ?? Promise.resolve(),
                );
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
        {
            id: "replace",
            label: "Replace with current camera",
            icon: "camera",
            group: "edit",
            onRun: () => {
                replace(at);
            },
        },
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

    // Mod+] and Mod+[ move a stop, Delete deletes it, from its view field or its "..." button; an
    // open list keeps its keys.
    const stopKeys = (event: React.KeyboardEvent<HTMLElement>, at: number): void => {
        if ("expanded" in event.currentTarget.dataset) {
            return;
        }
        if (matchesKey(event.nativeEvent, "Mod+]") || matchesKey(event.nativeEvent, "Mod+[")) {
            event.preventDefault();
            const to = move(at, event.key === "]" ? -1 : 1);
            // Stops are drawn by place, so focus follows the stop to its new place: the same field
            // there, named after its new number.
            const field = event.currentTarget.getAttribute("aria-label");
            if (to !== null && field !== null) {
                const there = field.replace(/\d+/, String(to + 1));
                list.current?.querySelector<HTMLElement>(`[aria-label="${CSS.escape(there)}"]`)?.focus();
            }
        } else if (event.key === "Delete") {
            event.preventDefault();
            remove(at);
        }
    };

    return (
        <ol className="ws-tour-stops" ref={list} aria-label={`Stops of ${name}`}>
            {stops.map((stop, at) => {
                const reason = stopProblemWords(problems[at] ?? null, element);
                const label = `Stop ${String(at + 1)}`;
                return (
                    // A stop's view may repeat, so its place is its key: an edit never moves it.
                    // eslint-disable-next-line react/no-array-index-key -- a stop has no identity but its place (two stops may name one view), and an edit must not remount its fields
                    <li key={at} className="ws-tour-stop" aria-current={playing === at ? "step" : undefined}>
                        <div className="ws-tour-stop-line">
                            <Text span className="ws-tour-stop-number" aria-hidden>
                                {playing === at ? "* " : ""}
                                {at + 1}
                            </Text>
                            <Tooltip label={reason} disabled={reason === null}>
                                <Select
                                    className="ws-tour-stop-view"
                                    size="xs"
                                    aria-label={`${label} view`}
                                    aria-description={reason ?? undefined}
                                    data={viewChoices(session, workspace, stop.view)}
                                    value={stop.view}
                                    error={reason !== null}
                                    allowDeselect={false}
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
                            </Tooltip>
                            <RowMore
                                name={label}
                                items={items(stop, at, reason)}
                                onKeyDown={(event) => {
                                    stopKeys(event, at);
                                }}
                            />
                        </div>
                        <FieldRow groupLabel={`${label} times`}>
                            <PanelField
                                kind="number"
                                label="Flight"
                                unit="s"
                                min={0}
                                step={0.5}
                                decimalScale={1}
                                value={(stop.duration ?? 0) / 1000}
                                onChange={(seconds) => {
                                    edit(at, { duration: Math.round(Number(seconds) * 1000) });
                                }}
                            />
                            <PanelField
                                kind="number"
                                label="Hold"
                                unit="s"
                                min={0}
                                step={0.5}
                                decimalScale={1}
                                value={(stop.hold ?? 0) / 1000}
                                onChange={(seconds) => {
                                    edit(at, { hold: Math.round(Number(seconds) * 1000) });
                                }}
                            />
                        </FieldRow>
                    </li>
                );
            })}
        </ol>
    );
}
