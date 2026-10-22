/**
 * The timeline dock (design/data/timeline-attribute.md section 6.6): under the canvas while a time
 * field is designated. The transport and the readout on the first row; the histogram of the
 * designated field, the brush over it, and the selection's activity under it. Everything it shows
 * is graphty-element's (`session.time`); the app holds only a drag in progress and writes the words.
 */

import "./time.css";

import { HistogramRow, SparklineRow } from "@graphty/compact-mantine";
import type { TimeBin, TimeWindow } from "@graphty/graphty-element/session";
import { ActionIcon, Group, RangeSlider, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { announceWindow, stepWindow, togglePlay, unitOf } from "./timeActions";
import { countWords, instantWords, rangeWords, windowWords } from "./timeWords";
import { useTimeVersion } from "./useTimeVersion";

/** How many bars the histogram draws. */
const BINS = 100;

/**
 * Whether a bin overlaps a window.
 * @param bin - the bin.
 * @param from - the window's start.
 * @param to - the window's end, excluded.
 * @returns true when they overlap.
 */
function overlaps(bin: TimeBin, from: number, to: number): boolean {
    return bin.start < to && bin.end > from;
}

/**
 * The dock, or nothing while no time field is designated.
 * @returns the dock.
 */
export function TimeDock(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useTimeVersion(session);
    // The speed is read when play starts; drawn here so a change shows on the play tooltip.
    const speed = useWorkspaceState((state) => state.timeSpeed);
    // The brush while a thumb is dragged; written to the element once, on release.
    const [drag, setDrag] = useState<[number, number] | null>(null);
    const extent = session?.time.field ? session.time.extent() : null;
    if (session === null || extent === null) {
        return null;
    }
    const { time } = session;
    const unit = unitOf(session);
    const onEdges = time.field?.edges !== undefined;
    const noun = onEdges ? "edge" : "node";
    const window: TimeWindow | null = time.current;
    const width = Math.max(1, Math.round((extent.to - extent.from) / BINS));
    const max = extent.from + width * BINS;
    const clamp = (value: number): number => Math.min(max, Math.max(extent.from, value));
    const shown: [number, number] = drag ?? [
        clamp(window === null ? extent.from : Number(window.from)),
        clamp(window === null ? max : Number(window.to)),
    ];
    const bins = time.bins({ count: BINS, from: extent.from, to: max }) ?? [];
    const countOf = (bin: TimeBin): number => (onEdges ? bin.edges : bin.nodes);
    const step = window?.step;
    const { nodes, edges } = session.selection;
    const profile =
        nodes.length + edges.length === 0
            ? null
            : time.bins({ count: BINS, from: extent.from, to: max, of: { nodes, edges, incident: true } });
    const readout = window === null ? rangeWords(extent.from, extent.to, unit) : windowWords(window, unit);
    const { visibleEdges, visibleNodes } = session.visibility.summary;
    const fieldName = time.field?.edges?.start ?? time.field?.nodes?.start ?? "";
    const { playing } = time;
    const valueText = (index: 0 | 1): string =>
        index === 0 ? instantWords(shown[0], unit, step) : rangeWords(shown[1] - 1, shown[1], unit, step);

    return (
        <section
            className="tl-dock"
            aria-label="Timeline"
            onKeyDown={(event) => {
                // Space plays and pauses from anywhere in the dock but a button, which Space presses.
                if (event.key === " " && !(event.target instanceof HTMLButtonElement)) {
                    event.preventDefault();
                    togglePlay(session, store);
                }
            }}
        >
            <Group gap={4} wrap="nowrap" className="tl-bar">
                <Tooltip label={`Step back (${formatKey(",")})`}>
                    <ActionIcon
                        variant="subtle"
                        aria-label="Step back"
                        onClick={() => {
                            stepWindow(session, store, -1);
                        }}
                    >
                        <GLYPHS.stepBack size={16} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={playing ? "Pause" : `Play, ${String(speed)}x`}>
                    <ActionIcon
                        variant={playing ? "light" : "subtle"}
                        aria-label={playing ? "Pause" : "Play"}
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
                        onClick={() => {
                            stepWindow(session, store, 1);
                        }}
                    >
                        <GLYPHS.stepForward size={16} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <Text size="xs" fw={500} className="tl-readout" data-testid="time-readout">
                    {readout}
                </Text>
                <Text size="xs" c="dimmed" className="tl-counts">
                    {`${countWords(visibleNodes, "node")}, ${countWords(visibleEdges, "edge")}`}
                </Text>
                <span className="tl-spacer" />
                <Text size="xs" c="dimmed" className="tl-field">
                    <GLYPHS.time size={12} aria-hidden /> {fieldName}
                </Text>
                {window === null ? null : (
                    <Tooltip label="Show all time">
                        <ActionIcon
                            variant="subtle"
                            aria-label="Show all time"
                            onClick={() => {
                                time.pause();
                                time.window(null).then(
                                    () => undefined,
                                    () => undefined,
                                );
                            }}
                        >
                            <GLYPHS.close size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
            <div className="tl-chart">
                <HistogramRow
                    label={`${noun === "edge" ? "Edges" : "Nodes"} over time`}
                    bins={bins.map((bin) => ({
                        label: `${rangeWords(bin.start, bin.end, unit)}: ${countWords(countOf(bin), noun)}`,
                        count: countOf(bin),
                        highlighted: overlaps(bin, shown[0], shown[1]),
                    }))}
                    minLabel={instantWords(extent.from, unit)}
                    maxLabel={instantWords(extent.to - 1, unit)}
                />
                <RangeSlider
                    className="tl-brush"
                    size="sm"
                    label={null}
                    min={extent.from}
                    max={max}
                    step={width}
                    minRange={width}
                    value={shown}
                    thumbFromLabel="Window start"
                    thumbToLabel="Window end"
                    thumbProps={(index) => ({ "aria-valuetext": valueText(index) })}
                    onChange={(value) => {
                        time.pause();
                        setDrag(value);
                    }}
                    onChangeEnd={(value) => {
                        // One gesture, one undoable step.
                        time.window({ ...(window ?? {}), from: value[0], to: value[1] }).then(
                            () => {
                                setDrag(null);
                                announceWindow(session, store);
                            },
                            () => {
                                setDrag(null);
                            },
                        );
                    }}
                />
                {profile === null ? null : (
                    <SparklineRow label="Selection over time" values={profile.map(countOf)} minLabel="" maxLabel="" />
                )}
            </div>
        </section>
    );
}
