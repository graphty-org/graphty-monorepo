/**
 * The time slider: an OVERLAY, full width along the bottom edge of whatever rect
 * remains, 70 tall (not 72), drawn only when a Time role is assigned and the slider is
 * on. It docks to the top edge of the data table drawer when both are open, and the
 * canvas toolbar rides 12 px above it.
 *
 * Build spec 01 sections 1 and 2; ART-TS:1349-1382.
 *
 * One row only (MIN-15, DEF-1): step back, play, pause, step forward, the Viewing
 * readout, the "by" sub-label, the `Coming` tag -- the visibility layer and time
 * detection are new element work (5.8) -- then a spacer, a rule, and the gear that
 * opens the slider's settings pop-out. Window, Step, Cumulative / Sliding, Speed and
 * "Compare with another window" live in that pop-out, not on the bar.
 *
 * The readout is the Viewing fact's owner alongside the status bar Viewing slot, which
 * is why the filter strip drops its time chip while the slider is docked (section 8).
 *
 * T toggles the slider itself and belongs to the control that owns it; the gear opens
 * the pop-out and prints NO binding. The step buttons print theirs, from `keyChipFor`.
 *
 * The TRACK is a faithful placeholder: it draws the weekly density and the window it
 * is handed at the right height in the right box, but it is not yet a draggable
 * two-handle range over real timestamps.
 */

import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import React from "react";

import { keyChipFor } from "../bindings";
import { TIME_SLIDER_HEIGHT } from "../constants";
import { CanvasIconButton } from "./CanvasIconButton";
import { CANVAS_DOCK_Z_INDEX, CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE } from "./canvasLayout";
import { TimeSliderGlyph } from "./timeSliderGlyphs";

/**
 * The window the slider is showing, as fractions of the whole domain.
 */
export interface TimeSliderWindow {
    /** 0 at the domain's start, 1 at its end. */
    readonly start: number;
    /** 0 at the domain's start, 1 at its end. */
    readonly end: number;
}

/**
 * Props of the time slider.
 * @public
 */
export interface TimeSliderProps {
    /** Its bottom offset: the drawer's top edge, or the canvas floor. */
    readonly bottom: number;
    /** Whether playback is running; the lit half of the transport says which. */
    readonly playing: boolean;
    /** The step size, as the transport titles print it, e.g. "7 days". */
    readonly stepLabel: string;
    /** The readout, e.g. "Viewing: 2026-01-05 to 2026-02-04". */
    readonly viewingLabel: string;
    /** The attribute the window runs over, e.g. "by opened". */
    readonly byLabel?: string;
    /** Step back one step. */
    readonly onStepBack: () => void;
    /** Start playback. */
    readonly onPlay: () => void;
    /** Pause playback. */
    readonly onPause: () => void;
    /** Step forward one step. */
    readonly onStepForward: () => void;
    /** Opens the slider's settings pop-out. Prints no binding, by design. */
    readonly onOpenSettings: () => void;
    /** Whether that pop-out is open; the gear is drawn lit while it is. */
    readonly settingsOpen?: boolean;
    /** The weekly density behind the track, one value per bucket. */
    readonly density?: readonly number[];
    /** The window the two handles hold. */
    readonly window?: TimeSliderWindow;
}

const SETTINGS_LABEL = "Time slider settings";

/**
 * Play and Pause are bound to the space bar while the slider has focus (5.6,
 * `timelinePlayPause`). The binding table stores that chord as the literal space
 * character, which prints as nothing, so the chip is the word the artboard draws in
 * both titles: "Play (Space)", "Pause (Space)" (ART-TS:1364-1365).
 */
const PLAY_PAUSE_CHIP = "Space";

/**
 * Draws the bottom-edge time slider overlay.
 * @param props - the offset, the transport state, the readout and the handlers.
 * @returns the time slider element.
 */
export function TimeSlider(props: TimeSliderProps): React.JSX.Element {
    const {
        bottom,
        byLabel,
        density,
        onOpenSettings,
        onPause,
        onPlay,
        onStepBack,
        onStepForward,
        playing,
        settingsOpen = false,
        stepLabel,
        viewingLabel,
        window: timeWindow,
    } = props;

    const buckets = density ?? [];
    const maxBucket = buckets.length === 0 ? 0 : Math.max(...buckets);

    return (
        <div
            data-canvas-overlay="time-slider"
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom,
                height: TIME_SLIDER_HEIGHT,
                display: "flex",
                flexDirection: "column",
                gap: CANVAS_SPACE.TIGHT,
                padding: `${String(CANVAS_METRICS.TIME_PAD_TOP)}px ${String(CANVAS_SPACE.LG)}px ${String(CANVAS_SPACE.HAIRLINE)}px`,
                background: PANEL_INK.PANEL,
                borderTop: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                boxSizing: "border-box",
                overflow: "hidden",
                zIndex: CANVAS_DOCK_Z_INDEX,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: CANVAS_SPACE.MD,
                    height: PANEL_GRID.CONTROL_HEIGHT,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: CANVAS_SPACE.TIGHT }}>
                    <CanvasIconButton
                        label={`Step back ${stepLabel}`}
                        chip={keyChipFor("timeStepBack")}
                        glyph={<TimeSliderGlyph name="stepBack" />}
                        onClick={onStepBack}
                    />
                    <CanvasIconButton
                        label="Play"
                        chip={PLAY_PAUSE_CHIP}
                        glyph={<TimeSliderGlyph name="play" />}
                        active={playing}
                        onClick={onPlay}
                    />
                    <CanvasIconButton
                        label="Pause"
                        chip={PLAY_PAUSE_CHIP}
                        glyph={<TimeSliderGlyph name="pause" />}
                        active={!playing}
                        onClick={onPause}
                    />
                    <CanvasIconButton
                        label={`Step forward ${stepLabel}`}
                        chip={keyChipFor("timeStepForward")}
                        glyph={<TimeSliderGlyph name="stepForward" />}
                        onClick={onStepForward}
                    />
                </div>

                <div
                    style={{
                        width: CANVAS_SPACE.HAIRLINE,
                        height: CANVAS_METRICS.RULE_HEIGHT,
                        background: PANEL_INK.BORDER,
                    }}
                />

                <span
                    style={{
                        fontSize: CANVAS_TYPE.READOUT,
                        fontWeight: 500,
                        lineHeight: CANVAS_LEADING.TIGHT,
                        color: PANEL_INK.VALUE,
                        whiteSpace: "nowrap",
                    }}
                >
                    {viewingLabel}
                </span>

                {byLabel === undefined ? null : (
                    <span
                        style={{
                            fontSize: CANVAS_TYPE.SMALL,
                            lineHeight: CANVAS_LEADING.TIGHT,
                            color: PANEL_INK.CHROME,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {byLabel}
                    </span>
                )}

                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        flex: "0 0 auto",
                        height: CANVAS_METRICS.PILL_HEIGHT,
                        padding: `0 ${String(CANVAS_METRICS.PILL_PAD_X)}px`,
                        borderRadius: "var(--mantine-radius-lg)",
                        background: PANEL_INK.RAISED,
                        color: PANEL_INK.CHROME,
                        fontSize: CANVAS_TYPE.PILL,
                        fontWeight: 500,
                        lineHeight: 1,
                        boxSizing: "border-box",
                    }}
                >
                    Coming
                </span>

                <div style={{ flex: "1 1 auto" }} />

                <div
                    style={{
                        width: CANVAS_SPACE.HAIRLINE,
                        height: CANVAS_METRICS.RULE_HEIGHT,
                        background: PANEL_INK.BORDER,
                    }}
                />

                <CanvasIconButton
                    label={SETTINGS_LABEL}
                    glyph={<UiGlyph name="gear" size={PANEL_GRID.GLYPH} />}
                    active={settingsOpen}
                    onClick={onOpenSettings}
                />
            </div>

            <svg
                aria-hidden="true"
                width="100%"
                height={CANVAS_METRICS.TIME_TRACK_HEIGHT}
                viewBox={`0 0 100 ${String(CANVAS_METRICS.TIME_TRACK_HEIGHT)}`}
                preserveAspectRatio="none"
                style={{ display: "block" }}
            >
                {buckets.map((count, index) => {
                    const width = 100 / buckets.length;
                    const full = CANVAS_METRICS.TIME_TRACK_HEIGHT - CANVAS_SPACE.MD;
                    const drawn = maxBucket === 0 ? 0 : (count / maxBucket) * full;

                    return (
                        <rect
                            key={`bucket-${String(index)}`}
                            x={index * width}
                            y={full - drawn}
                            width={width}
                            height={drawn}
                            fill={PANEL_INK.BORDER}
                        />
                    );
                })}

                <rect
                    x={0}
                    y={CANVAS_METRICS.TIME_TRACK_HEIGHT - CANVAS_SPACE.MD}
                    width={100}
                    height={CANVAS_SPACE.XS}
                    fill={PANEL_INK.RAISED}
                />

                {timeWindow === undefined ? null : (
                    <rect
                        x={timeWindow.start * 100}
                        y={CANVAS_METRICS.TIME_TRACK_HEIGHT - CANVAS_SPACE.MD}
                        width={Math.max(0, timeWindow.end - timeWindow.start) * 100}
                        height={CANVAS_SPACE.XS}
                        fill={PANEL_INK.ACCENT}
                    />
                )}
            </svg>
        </div>
    );
}
