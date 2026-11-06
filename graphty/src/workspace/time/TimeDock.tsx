/**
 * The timeline dock (design/data/timeline-attribute.md section 6.6): under the canvas while a time
 * field is designated. The transport, the speed and the readout on the first row; the histogram of
 * the designated field with its range brush and the selection's activity on the second. Everything
 * it shows is graphty-element's (`session.time`): the bins, their step, the window and whether it is
 * at either end. The app holds only a drag in progress and the stretch of the axis zoomed to, and
 * writes the words.
 */

import "./time.css";

import { HistogramRow, Popout, PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, TimeBin, TimeStep, TimeUnit, TimeWindow } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, NumberInput, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { runFailureWords } from "../inspector/words";
import { formatKey } from "../keys/keys";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    announceWindow,
    jumpToSelection,
    reportTimeError,
    selectionSpan,
    stepWindow,
    togglePlay,
    unitOf,
    zoneOf,
} from "./timeActions";
import { countWords, instantWords, intervalOf, rangeWords, readoutRange, SPEEDS, windowWords } from "./timeWords";
import { useTimeVersion } from "./useTimeVersion";
import { useTimeZoom } from "./useTimeZoom";

/** The narrowest a bar is drawn: the element is asked for at most one bin per this many pixels. */
const PX_PER_BIN = 3;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * How far a brush thumb moves: a fixed calendar step's length, a day for months and longer, or the
 * bins' own number step.
 * @param step - the bins' step.
 * @returns milliseconds, or ordinal units.
 */
function brushStep(step: TimeStep | undefined): number {
    if (typeof step === "number") {
        return step;
    }
    if (step === "hour") {
        return HOUR;
    }
    return step === "week" ? 7 * DAY : DAY;
}

/**
 * The readout: a range being dragged, else the window, else the whole span.
 * @param drag - the range being dragged, or null.
 * @param window - the window, or null.
 * @param extent - the data's span.
 * @param extent.from - its start.
 * @param extent.to - its end.
 * @param unit - how the field reads numbers.
 * @param zone - the zone it reads in.
 * @returns the words.
 */
function readoutWords(
    drag: readonly [number, number] | null,
    window: TimeWindow | null,
    extent: { readonly from: number; readonly to: number },
    unit: TimeUnit,
    zone: string,
): string {
    if (drag !== null) {
        return readoutRange(drag, unit, window?.step, zone);
    }
    return window === null
        ? rangeWords(extent.from, extent.to, unit, undefined, zone)
        : windowWords(window, unit, zone);
}

/**
 * Whether a bin overlaps a range.
 * @param bin - the bin.
 * @param range - the range, `[from, to)`.
 * @returns true when they overlap.
 */
function overlaps(bin: TimeBin, range: readonly [number, number]): boolean {
    return bin.start < range[1] && bin.end > range[0];
}

/**
 * The readout's popover: type the first and last day of the window.
 * @param props - Component props
 * @param props.session - the element's session.
 * @param props.store - the chrome store.
 * @param props.unit - how the field reads numbers.
 * @param props.zone - the zone dates read in, so a typed date means what the readout shows.
 * @param props.range - the range shown now.
 * @param props.readout - the readout's words.
 * @returns the readout button and its popover.
 */
function ReadoutEntry({
    session,
    store,
    unit,
    zone,
    range,
    readout,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    unit: TimeUnit;
    zone: string;
    range: readonly [number, number];
    readout: string;
}>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const ordinal = unit === "ordinal";
    // An inclusive last value back to the half-open end the element takes: one unit past it.
    // ponytail: 24 hours, so on a day the clocks change the end is an hour off; a day step in the zone if that matters.
    const grain = ordinal ? 1 : DAY;
    const submit = (): void => {
        const start = session.time.parse(from, { timeZone: zone });
        const last = session.time.parse(to, { timeZone: zone });
        if (start === null || last === null || last < start) {
            store.set({ notice: { message: "Not a range of dates" } });
            return;
        }
        session.time.pause();
        session.time.window({ from: start, to: last + grain }).then(() => {
            announceWindow(session, store);
        }, reportTimeError(store));
        setOpened(false);
    };
    const field = (label: string, value: string, set: (next: string) => void): React.JSX.Element =>
        ordinal ? (
            <NumberInput
                size="xs"
                label={label}
                value={value}
                hideControls
                onChange={(next) => {
                    set(String(next));
                }}
            />
        ) : (
            <TextInput
                size="xs"
                label={label}
                value={value}
                onChange={(event) => {
                    set(event.currentTarget.value);
                }}
            />
        );
    return (
        <PopoutManager>
            <Popout opened={opened} onOpenChange={setOpened}>
                <Popout.Trigger>
                    <UnstyledButton
                        className="tl-readout"
                        data-testid="time-readout"
                        aria-label={`Time window ${readout}`}
                        aria-haspopup="dialog"
                        aria-expanded={opened}
                        onClick={() => {
                            setFrom(instantWords(range[0], unit, undefined, zone));
                            // The last included instant, as the readout writes it.
                            setTo(instantWords(range[1] - 1, unit, undefined, zone));
                        }}
                    >
                        {readout}
                    </UnstyledButton>
                </Popout.Trigger>
                <Popout.Panel
                    width={300}
                    placement="top"
                    alignment="start"
                    header={{ variant: "title", title: "Time window" }}
                    closeLabel="Close Time window"
                >
                    <Popout.Content>
                        <form
                            className="tl-range-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                        >
                            {field("From", from, setFrom)}
                            {field("To", to, setTo)}
                            <Button size="compact-xs" type="submit">
                                Set
                            </Button>
                        </form>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </PopoutManager>
    );
}

/**
 * How many of the timed elements a bin holds.
 * @param bin - The bin, or undefined for none.
 * @param onEdges - Whether time is on the edges, so a bin counts edges rather than nodes.
 * @returns The count; 0 for no bin.
 */
function countIn(bin: TimeBin | undefined, onEdges: boolean): number {
    if (bin === undefined) {
        return 0;
    }
    return onEdges ? bin.edges : bin.nodes;
}

/**
 * The histogram's accessible name: what it counts, the total and the busiest bar, read from the
 * whole timeline's bins, so it stays the same while the window moves.
 * @param bins - the whole timeline's bins.
 * @param onEdges - Whether time is on the edges.
 * @param unit - how the field reads numbers.
 * @param zone - the zone it reads in.
 * @returns the words.
 */
function histogramName(bins: readonly TimeBin[], onEdges: boolean, unit: TimeUnit, zone: string): string {
    const noun = onEdges ? "edge" : "node";
    const name = onEdges ? "Edges over time" : "Nodes over time";
    const busiest = bins.reduce<TimeBin | undefined>(
        (top, bin) => (countIn(bin, onEdges) > countIn(top, onEdges) ? bin : top),
        undefined,
    );
    if (busiest === undefined) {
        return name;
    }
    const total = bins.reduce((sum, bin) => sum + countIn(bin, onEdges), 0);
    const when = rangeWords(busiest.start, busiest.end, unit, busiest.step, zone);
    return `${name}, ${countWords(total, noun)}, busiest ${when}: ${countWords(countIn(busiest, onEdges), noun)}`;
}

/**
 * What the brush's gesture does: a whole window dragged slides the element's cursor, the graph
 * following, and its release commits it; an end dragged is drawn here and set on release. One
 * gesture, one undoable step. An end the zoom cut off and the gesture left alone stays where it is.
 * @param session - The session.
 * @param store - The workspace store, for errors and the announcement.
 * @param setDrag - Sets the brush drawn while an end is dragged.
 * @param sliding - Whether a whole-window drag is under way.
 * @param shown - The window as the axis shows it.
 * @returns The brush's change handlers.
 */
function brushGesture(
    session: GraphSession,
    store: WorkspaceStore,
    setDrag: (value: [number, number] | null) => void,
    sliding: React.RefObject<boolean>,
    shown: readonly [number, number],
): { onChange: (value: [number, number]) => void; onChangeEnd: (value: [number, number]) => void } {
    const { time } = session;

    return {
        onChange: (value) => {
            time.pause();
            const at = time.current;
            if (at !== null && at.mode !== "cumulative" && value[1] - value[0] === Number(at.to) - Number(at.from)) {
                // The whole window dragged: the graph follows the drag, row by row, and the
                // release records it.
                setDrag(null);
                sliding.current = true;
                time.seek(value[0], { commit: false }).then(() => undefined, reportTimeError(store));
                return;
            }
            setDrag(value);
        },
        onChangeEnd: (value) => {
            time.pause();
            // A slid cursor is committed as a step of its own, never merged into the window step
            // before it (#4400).
            const at = time.current;
            const moved: PromiseLike<unknown> = sliding.current
                ? time.commit()
                : time.window({
                      ...at,
                      from: at !== null && value[0] === shown[0] ? at.from : value[0],
                      to: at !== null && value[1] === shown[1] ? at.to : value[1],
                  });
            sliding.current = false;
            moved.then(
                () => {
                    setDrag(null);
                    announceWindow(session, store);
                },
                (error: unknown) => {
                    setDrag(null);
                    reportTimeError(store)(error);
                },
            );
        },
    };
}

/**
 * The bar's buttons that come and go: Jump to selection while the selection has a time, and Show
 * whole timeline while the axis is zoomed, since no gesture may be the only way back.
 * @param props - Component props
 * @param props.session - the element's session.
 * @param props.store - the chrome store.
 * @param props.zoomed - whether the axis is zoomed.
 * @param props.reset - shows the whole timeline.
 * @returns the buttons.
 */
function ViewButtons({
    session,
    store,
    zoomed,
    reset,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    zoomed: boolean;
    reset: () => void;
}>): React.JSX.Element {
    return (
        <>
            {selectionSpan(session) === null ? null : (
                <Tooltip label="Jump to selection">
                    <ActionIcon
                        variant="subtle"
                        aria-label="Jump to selection"
                        onClick={() => {
                            jumpToSelection(session, store);
                        }}
                    >
                        <GLYPHS.jumpToSelection size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
            {zoomed ? (
                <Tooltip label="Show whole timeline">
                    <ActionIcon variant="subtle" aria-label="Show whole timeline" onClick={reset}>
                        <GLYPHS.wholeTimeline size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ) : null}
        </>
    );
}

/**
 * The dock, or nothing while no time field is designated.
 * @returns the dock.
 */
export function TimeDock(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useTimeVersion(session);
    const speed = useWorkspaceState((state) => state.timeSpeed);
    const open = useWorkspaceState((state) => state.timelineOpen);
    // The brush while it is dragged; written to the element once, on release.
    const [drag, setDrag] = useState<[number, number] | null>(null);
    // A whole-window drag moves the element's cursor; its release commits it as its own step.
    const sliding = useRef(false);
    const { ref, width } = useElementSize();
    const maxCount = Math.max(10, Math.floor((width > 0 ? width : 300) / PX_PER_BIN));
    const { view, reset, chartRef } = useTimeZoom(session, maxCount);

    // A run the Re-run setting could not re-run says so.
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        return session.on("time:rerun-failed", ({ error }) => {
            store.set({ notice: { message: runFailureWords(error.code as never), error: true } });
        });
    }, [session, store]);

    const extent = session === null ? null : session.time.extent();
    if (session === null || extent === null || !open) {
        return null;
    }
    const { time } = session;
    const unit = unitOf(session);
    const onEdges = time.field?.edges !== undefined;
    const noun = onEdges ? "edge" : "node";
    const window: TimeWindow | null = time.current;
    const zone = zoneOf(session);
    const whole = time.bins({ maxCount }) ?? [];
    const all = time.bins({ ...view, maxCount }) ?? [];
    const visible = time.bins({ ...view, maxCount, scope: "visible" }) ?? [];
    const first = all.at(0);
    const last = all.at(-1);
    const min = first?.start ?? extent.from;
    const max = last?.end ?? extent.to;
    const clamp = (value: number): number => Math.min(max, Math.max(min, value));
    const shown: [number, number] =
        window === null ? [min, max] : [clamp(Number(window.from)), clamp(Number(window.to))];
    const range = drag ?? shown;
    const countOf = (bin: TimeBin | undefined): number => countIn(bin, onEdges);
    const { nodes, edges } = session.selection;
    const profile =
        nodes.length + edges.length === 0
            ? null
            : time.bins({ ...view, maxCount, of: { nodes, edges, incident: true } });
    const step = window?.step;
    const readout = readoutWords(drag, window, extent, unit, zone);
    const { visibleEdges, visibleNodes } = session.visibility.summary;
    const { playing, atStart, atEnd } = time;
    const playLabel = playing ? "Pause" : "Play";
    const valueText = (value: number, thumb: 0 | 1): string =>
        thumb === 0 ? instantWords(value, unit, step, zone) : rangeWords(value - 1, value, unit, step, zone);
    const binAt = (value: number): TimeBin | undefined => all.find((bin) => value >= bin.start && value < bin.end);
    // With no window and no zoom the axis is the whole span, which the readout already names.
    const axisHidden = window === null && view === null;
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];

    return (
        <section // NOSONAR(S6847): Space plays and pauses as it bubbles from the dock's own controls
            className="tl-dock"
            aria-label="Timeline"
            ref={ref}
            onKeyDown={(event) => {
                // Space plays and pauses from anywhere in the dock but a button or a field.
                const target = event.target as HTMLElement;
                if (event.key === " " && !(target instanceof HTMLButtonElement) && target.tagName !== "INPUT") {
                    event.preventDefault();
                    togglePlay(session, store);
                }
            }}
        >
            <Group gap={4} className="tl-bar">
                <Tooltip label={`Step back (${formatKey(",")})`}>
                    <ActionIcon
                        variant="subtle"
                        aria-label="Step back"
                        disabled={atStart}
                        onClick={() => {
                            stepWindow(session, store, -1);
                        }}
                    >
                        <GLYPHS.stepBack size={16} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={playLabel}>
                    <ActionIcon
                        variant={playing ? "light" : "subtle"}
                        aria-label={playLabel}
                        onClick={() => {
                            togglePlay(session, store);
                        }}
                    >
                        {playing ? <GLYPHS.pause size={16} aria-hidden /> : <GLYPHS.play size={16} aria-hidden />}
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={`Step forward (${formatKey(".")})`}>
                    <ActionIcon
                        variant="subtle"
                        aria-label="Step forward"
                        disabled={atEnd}
                        onClick={() => {
                            stepWindow(session, store, 1);
                        }}
                    >
                        <GLYPHS.stepForward size={16} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label="Speed">
                    <Button
                        variant="subtle"
                        size="compact-xs"
                        className="tl-speed"
                        aria-label={`Speed ${String(speed)}x`}
                        onClick={() => {
                            store.set({ timeSpeed: nextSpeed });
                            // A play in progress goes on at the new speed.
                            if (time.playing) {
                                time.pause();
                                time.play({ interval: intervalOf(nextSpeed) });
                            }
                        }}
                    >
                        {`${String(speed)}x`}
                    </Button>
                </Tooltip>
                <ReadoutEntry
                    session={session}
                    store={store}
                    unit={unit}
                    zone={zone}
                    // The window the readout names, not the brush's range clamped to the bins.
                    range={window === null ? [extent.from, extent.to] : [Number(window.from), Number(window.to)]}
                    readout={readout}
                />
                <Text size="xs" c="dimmed" className="tl-counts">
                    {`${countWords(visibleNodes, "node")}, ${countWords(visibleEdges, "edge")}`}
                </Text>
                <ViewButtons session={session} store={store} zoomed={view !== null} reset={reset} />
            </Group>
            <div className="tl-chart" data-panel-start="" ref={chartRef}>
                <HistogramRow
                    label={histogramName(whole, onEdges, unit, zone)}
                    bins={all.map((bin, index) => {
                        const inside = window !== null && overlaps(bin, range);
                        const shown = countOf(visible[index]);
                        return {
                            label: `${rangeWords(bin.start, bin.end, unit, bin.step, zone)}: ${countWords(countOf(bin), noun)}`,
                            count: shown,
                            ghost: countOf(bin),
                            from: bin.start,
                            to: bin.end,
                            // Lit only for a bin holding something the window shows; outside it, dimmed.
                            highlighted: inside && shown > 0,
                            dimmed: window !== null && !inside,
                        };
                    })}
                    minLabel={axisHidden ? "" : instantWords(min, unit, first?.step, zone)}
                    maxLabel={axisHidden ? "" : instantWords(max - 1, unit, last?.step, zone)}
                    {...(profile === null || profile.length === 0
                        ? {}
                        : { overlay: { label: "Selection over time", values: profile.map(countOf) } })}
                    brush={{
                        min,
                        max,
                        step: Math.min(brushStep(first?.step), brushStep(step)),
                        value: range,
                        startLabel: "Window start",
                        endLabel: "Window end",
                        bodyLabel: "Window",
                        valueText,
                        rangeText: (value) => rangeWords(value[0], value[1], unit, step, zone),
                        thumbLabel: (value) => {
                            const bin = binAt(value);
                            return bin === undefined
                                ? instantWords(value, unit, step, zone)
                                : `${rangeWords(bin.start, bin.end, unit, bin.step, zone)}: ${countWords(countOf(bin), noun)}`;
                        },
                        ...brushGesture(session, store, setDrag, sliding, shown),
                    }}
                />
            </div>
            {window === null ? null : (
                <Tooltip label="Show all time">
                    <ActionIcon
                        className="tl-all"
                        variant="subtle"
                        aria-label="Show all time"
                        onClick={() => {
                            time.pause();
                            time.window(null).then(() => undefined, reportTimeError(store));
                        }}
                    >
                        <GLYPHS.allTime size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
        </section>
    );
}
