import "./timeline.css";

import { EntityChip, Toolbar, ToolButton } from "@graphty/compact-mantine";
import {
    addTimeStep,
    type GraphSession,
    type TimeHistogram,
    type TimeStep,
    type TimeWindow,
} from "@graphty/graphty-element/session";
import { ActionIcon, Popover, Select, Stack, Switch } from "@mantine/core";
import { Pause, Play, Settings, SkipBack, SkipForward } from "lucide-react";
import React, { useEffect, useState } from "react";

import { useSessionVersion } from "../inspector/hooks";
import { formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    applyWindow,
    boundsOf,
    DATE_UNITS,
    type DateUnit,
    firstWindow,
    numberSizes,
    readout,
    steppedWindow,
    timeFields,
} from "./commands";

/** How many bars the density strip draws. */
const BINS = 60;

/** How long play holds each window, in ms. */
const PLAY_MS = 800;

/** The histogram's drawing box. */
const WIDTH = 240;
const HEIGHT = 28;

/** The Select value for "the window's own size" as the step, and for no end column. */
const SAME = "__same__";
const NONE = "__none__";

/**
 * The calendar unit a window spans exactly, if any.
 * @param from - its start.
 * @param to - its end.
 * @returns the unit, or undefined.
 */
function unitOf(from: number, to: number): DateUnit | undefined {
    return DATE_UNITS.find((unit) => addTimeStep(from, unit, 1) === to);
}

/**
 * The window size and step choices: calendar units for dates, integer sizes for numbers.
 * @param histogram - the field's histogram.
 * @returns the Select data.
 */
function sizeChoices(histogram: TimeHistogram): { value: string; label: string }[] {
    if (histogram.kind === "date") {
        return DATE_UNITS.map((unit) => ({ value: unit, label: `1 ${unit}` }));
    }
    const sizes = numberSizes(histogram.min ?? 0, histogram.max ?? 0);
    return sizes.map((size) => ({ value: String(size), label: size.toLocaleString("en-US") }));
}

/**
 * A size choice back as a step.
 * @param value - the Select value.
 * @returns the step.
 */
function stepOf(value: string): TimeStep {
    return (DATE_UNITS as readonly string[]).includes(value) ? (value as DateUnit) : Number(value);
}

/**
 * The timeline strip (data prototype spec section 3.10), above the bottom toolbar while the clock
 * button is on: step back, play and step forward; the window band over the density histogram of
 * the time column (click or drag to move it); the readout; the window size; the node and edge
 * counts; and the gear for the fields, the step and whether nodes follow their edges. The window
 * is graphty-element's (`visibility.window`), combined with the filters into one mask.
 * @returns the strip, or nothing while it is closed or there is no window to draw
 */
export function TimelineStrip(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const open = useWorkspaceState((state) => state.timelineOpen);
    useSessionVersion(session);
    if (!open || session === null) {
        return null;
    }
    return <Strip session={session} />;
}

/**
 * The strip over a live session.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns the strip
 */
function Strip({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [playing, setPlaying] = useState(false);
    const [dragAt, setDragAt] = useState<number | null>(null);
    const { window } = session.visibility;
    const fields = timeFields(session);
    const attribute = window?.attribute ?? fields.find((f) => f.roles?.includes("time") === true)?.path;
    // The whole graph's histogram, read on each render: the strip renders on element changes.
    const histogram = attribute === undefined ? null : session.visibility.timeHistogram(attribute, { bins: BINS });
    const fail = (): void => {
        store.set({ notice: { message: "Window not moved" } });
    };
    const set = (next: TimeWindow | null): void => {
        if (next !== null) {
            applyWindow(session, next, fail);
        }
    };

    useEffect(() => {
        if (!playing) {
            return undefined;
        }
        const timer = setInterval(() => {
            const next = steppedWindow(session, 1);
            if (next === null) {
                setPlaying(false);
                return;
            }
            applyWindow(session, next, () => {
                store.set({ notice: { message: "Window not moved" } });
            });
        }, PLAY_MS);
        return () => {
            clearInterval(timer);
        };
    }, [playing, session, store]);

    if (histogram === null || histogram.min === null || histogram.max === null) {
        return null;
    }
    const { min, kind, bins } = histogram;
    const end = bins.at(-1)?.to ?? histogram.max;
    const span = Math.max(1, end - min);
    const bounds = boundsOf(window);
    const width = bounds === null ? undefined : bounds.to - bounds.from;
    const widthUnit = bounds === null ? undefined : unitOf(bounds.from, bounds.to);
    const xOf = (at: number): number => ((Math.min(Math.max(at, min), end) - min) / span) * WIDTH;
    const tallest = Math.max(1, ...bins.map((bin) => bin.nodes + bin.edges));
    const { summary } = session.visibility;

    /**
     * Moves the window so it starts at the step holding an instant, its size kept.
     * @param at - the instant.
     */
    const moveTo = (at: number): void => {
        if (window === null || width === undefined) {
            return;
        }
        const moved = session.visibility.firstWindow(window.attribute, { step: widthUnit ?? width, at });
        set(moved === null ? null : { ...window, from: moved.from, to: moved.to });
    };
    const instantAt = (event: React.PointerEvent<SVGSVGElement>): number => {
        const box = event.currentTarget.getBoundingClientRect();
        return min + ((event.clientX - box.left) / Math.max(1, box.width)) * span;
    };
    const shown = dragAt !== null && width !== undefined ? { from: dragAt, to: dragAt + width } : bounds;
    const sizeValue = widthUnit ?? (width === undefined ? null : String(width));
    const choices = sizeChoices(histogram);

    return (
        <section className="ws-timeline" aria-label="Timeline">
            <Toolbar aria-label="Play">
                <ToolButton
                    label="Step back"
                    icon={<SkipBack size={18} />}
                    shortcut={formatKey(",")}
                    onClick={() => {
                        set(steppedWindow(session, -1));
                    }}
                />
                <ToolButton
                    label={playing ? "Pause" : "Play"}
                    icon={playing ? <Pause size={18} /> : <Play size={18} />}
                    onClick={() => {
                        setPlaying((now) => !now);
                    }}
                />
                <ToolButton
                    label="Step forward"
                    icon={<SkipForward size={18} />}
                    shortcut={formatKey(".")}
                    onClick={() => {
                        set(steppedWindow(session, 1));
                    }}
                />
            </Toolbar>
            <svg
                className="ws-timeline-histogram"
                role="img"
                aria-label="Time histogram"
                viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
                preserveAspectRatio="none"
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragAt(instantAt(event));
                }}
                onPointerMove={(event) => {
                    if (dragAt !== null) {
                        setDragAt(instantAt(event));
                    }
                }}
                onPointerUp={(event) => {
                    setDragAt(null);
                    moveTo(instantAt(event));
                }}
                onPointerCancel={() => {
                    setDragAt(null);
                }}
            >
                {bins.map((bin) => {
                    const x = xOf(bin.from);
                    const w = Math.max(0.5, xOf(bin.to) - x - 0.5);
                    const edgeH = (bin.edges / tallest) * HEIGHT;
                    const nodeH = (bin.nodes / tallest) * HEIGHT;
                    return (
                        <g key={bin.from}>
                            <rect className="ws-timeline-edges" x={x} width={w} y={HEIGHT - edgeH} height={edgeH} />
                            <rect
                                className="ws-timeline-nodes"
                                x={x}
                                width={w}
                                y={HEIGHT - edgeH - nodeH}
                                height={nodeH}
                            />
                        </g>
                    );
                })}
                {shown === null ? null : (
                    <rect
                        className="ws-timeline-band"
                        data-testid="timeline-band"
                        x={xOf(shown.from)}
                        width={Math.max(2, xOf(shown.to) - xOf(shown.from))}
                        y={0}
                        height={HEIGHT}
                    />
                )}
            </svg>
            <span className="ws-timeline-readout" aria-label="Window" aria-live="polite">
                {bounds === null ? "--" : readout(bounds.from, bounds.to, kind)}
            </span>
            <Select
                size="xs"
                className="ws-timeline-size"
                aria-label="Window size"
                allowDeselect={false}
                data={
                    sizeValue === null || choices.some((c) => c.value === sizeValue)
                        ? choices
                        : [...choices, { value: sizeValue, label: sizeValue }]
                }
                value={sizeValue}
                onChange={(picked) => {
                    if (picked === null || window === null || bounds === null) {
                        return;
                    }
                    const step = stepOf(picked);
                    set({ ...window, step, to: addTimeStep(bounds.from, step, 1) });
                }}
            />
            <EntityChip kind="node">
                {`${summary.visibleNodes.toLocaleString("en-US")} of ${summary.totalNodes.toLocaleString("en-US")}`}
            </EntityChip>
            <EntityChip kind="edge">
                {`${summary.visibleEdges.toLocaleString("en-US")} of ${summary.totalEdges.toLocaleString("en-US")}`}
            </EntityChip>
            <Gear session={session} window={window} choices={choices} onChange={set} />
        </section>
    );
}

/**
 * The gear pop-over: the time field, an interval's end field, the step and whether nodes follow
 * their edges.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.window - the window in force, or null
 * @param props.choices - the step choices
 * @param props.onChange - applies a changed window
 * @returns the gear and its pop-over
 */
function Gear({
    session,
    window,
    choices,
    onChange,
}: Readonly<{
    session: GraphSession;
    window: TimeWindow | null;
    choices: readonly { value: string; label: string }[];
    onChange: (window: TimeWindow | null) => void;
}>): React.JSX.Element {
    const fields = timeFields(session);
    // A path names a node column and an edge column alike; offer each path once.
    const paths = [...new Map(fields.map((f) => [f.path, f])).values()];
    const data = paths.map((f) => ({ value: f.path, label: f.name }));
    const step = window?.step === undefined ? SAME : String(window.step);
    return (
        <Popover position="top-end" withinPortal trapFocus>
            <Popover.Target>
                <ActionIcon variant="subtle" size="sm" aria-label="Timeline settings">
                    <Settings size={16} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown aria-label="Timeline settings">
                <Stack gap={8} w={200}>
                    <Select
                        size="xs"
                        label="Field"
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: false }}
                        data={data}
                        value={window?.attribute ?? null}
                        onChange={(picked) => {
                            const field = paths.find((f) => f.path === picked);
                            if (field !== undefined && picked !== window?.attribute) {
                                onChange(firstWindow(session, field));
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="End field"
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: false }}
                        disabled={window === null}
                        data={[{ value: NONE, label: "none" }, ...data.filter((d) => d.value !== window?.attribute)]}
                        value={window?.end ?? NONE}
                        onChange={(picked) => {
                            if (window === null) {
                                return;
                            }
                            const { end: _end, ...rest } = window;
                            onChange(picked === null || picked === NONE ? rest : { ...rest, end: picked });
                        }}
                    />
                    <Select
                        size="xs"
                        label="Step"
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: false }}
                        disabled={window === null}
                        data={[{ value: SAME, label: "window size" }, ...choices]}
                        value={choices.some((c) => c.value === step) ? step : SAME}
                        onChange={(picked) => {
                            if (window === null) {
                                return;
                            }
                            const { step: _step, ...rest } = window;
                            onChange(picked === null || picked === SAME ? rest : { ...rest, step: stepOf(picked) });
                        }}
                    />
                    <Switch
                        size="xs"
                        label="Nodes follow edges"
                        disabled={window === null}
                        checked={window?.nodes === "follow-edges"}
                        onChange={(event) => {
                            if (window !== null) {
                                onChange({ ...window, nodes: event.currentTarget.checked ? "follow-edges" : "own" });
                            }
                        }}
                    />
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}
