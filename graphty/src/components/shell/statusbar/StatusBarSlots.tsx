/**
 * The status bar's nine slots, build spec 02 section 4.2, one small component each.
 *
 * Every slot carries the same four facts and nothing else: a render condition (the
 * model member exists -- an absent member is a slot that does not render), an exact
 * string template, a click action and a tooltip. Slot order, drop order and the
 * never-drop list are the foundation's tables; this module only draws.
 *
 * `StatusBar.tsx` assembles these into the slot table the overflow rule is a function
 * over.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { Loader, Progress } from "@mantine/core";
import React from "react";

import type {
    StatusBarAi,
    StatusBarCounts,
    StatusBarIssues,
    StatusBarSelection,
    StatusBarViewing,
    StatusBarXr,
    StatusBarZoom,
} from "../types";
import { CANCEL_LABEL, LOAD_CANCEL_DISABLED_TITLE, RUN_CANCEL_DISABLED_TITLE } from "./loadingPhases";
import { StatusBarChip } from "./StatusBarChip";
import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";
import type { StatusBarLayoutModel, StatusBarLoading, StatusBarRunningModel } from "./statusBarModel";

/**
 * `Exit`, the XR mode chip's own control (spec 02 section 4.2 slot 3). The one home for the
 * word, so anything asserting the chip's control quotes it.
 * @public
 */
export const XR_EXIT_LABEL = "Exit";

/** Every slot is a row of its own parts and never shrinks. */
const SLOT_STYLE: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: STATUS_BAR_GEOMETRY.GROUP_GAP,
    flex: "0 0 auto",
};

/** Which ink the AI slot's 6 px state dot takes: ready is success, a call in flight is the accent. */
const AI_DOT_INK: Record<StatusBarAi["state"], string> = {
    busy: PANEL_INK.ACCENT,
    error: PANEL_INK.DANGER,
    ready: PANEL_INK.SUCCESS,
};

/** A control that reads as the bar's own text rather than as a button. */
const BARE_BUTTON: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: STATUS_BAR_GEOMETRY.GROUP_GAP,
    margin: 0,
    padding: 0,
    border: "none",
    background: "none",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
};

/**
 * One of the bar's status dots: the validation warning, the note mark, the AI state.
 * @param props - Component props.
 * @param props.size - The dot's diameter in pixels.
 * @param props.color - The dot's ink.
 * @returns The dot, which is decorative: the text beside it carries the meaning.
 */
function StatusDot({ size, color }: { size: number; color: string }): React.JSX.Element {
    return (
        <span
            aria-hidden="true"
            style={{ display: "block", flex: "0 0 auto", width: size, height: size, borderRadius: "50%", background: color }}
        />
    );
}

/**
 * The Performance mode chip's leading bolt, 10 px in warning ink.
 * @returns The bolt, which is decorative: the chip's text carries the meaning.
 */
function PerformanceBolt(): React.JSX.Element {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height={STATUS_BAR_GEOMETRY.BOLT}
            stroke={PANEL_INK.WARNING}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            style={{ display: "block", flex: "0 0 auto" }}
            viewBox="0 0 16 16"
            width={STATUS_BAR_GEOMETRY.BOLT}
        >
            <path d="M9 1.5L3 9h4.5L7 14.5 13 7H8.5z" />
        </svg>
    );
}

/**
 * The bar's Cancel, which keeps its text in every form (REGISTER 1.5 section 1.6).
 *
 * Where it cannot act it is drawn disabled with its reason in its tooltip rather than
 * removed, and it stays hoverable and focusable so that the reason is reachable --
 * floor item 4. `aria-disabled` rather than `disabled` is what keeps it so.
 * @param props - Component props.
 * @param props.disabled - Whether Cancel can act on this run or load.
 * @param props.title - The reason it cannot, drawn as the tooltip.
 * @param props.onCancel - Cancels the run or the load; it takes effect within 1 s.
 * @returns The Cancel control.
 */
function CancelControl({
    disabled,
    title,
    onCancel,
}: {
    disabled: boolean;
    title?: string;
    onCancel?: () => void;
}): React.JSX.Element {
    return (
        <button
            aria-disabled={disabled || undefined}
            onClick={() => {
                if (!disabled && onCancel !== undefined) {
                    onCancel();
                }
            }}
            style={{
                ...BARE_BUTTON,
                color: disabled ? PANEL_INK.DISABLED : PANEL_INK.ACCENT,
                cursor: disabled ? "default" : "pointer",
            }}
            title={title}
            type="button"
        >
            {CANCEL_LABEL}
        </button>
    );
}

/**
 * Slot 1, counts. Never drops.
 *
 * One clickable group of two spans -- `20 nodes` / `29 edges`, or `500k of 1.1M
 * edges` once a filter, window or cap makes shown and total differ -- with the exact
 * values in its tooltip and the sample line beside them in the subset state. Clicking
 * opens the data table drawer. This slot OWNS node and edge counts and "shown of
 * loaded of total"; neither is repeated anywhere else in the shell.
 * @param props - Component props.
 * @param props.counts - The counts model.
 * @returns The counts slot.
 */
export function StatusBarCountsSlot({ counts }: { counts: StatusBarCounts }): React.JSX.Element {
    return (
        <button onClick={counts.onClick} style={{ ...BARE_BUTTON, ...SLOT_STYLE, cursor: "pointer" }} title={counts.title} type="button">
            <span>{counts.nodes}</span>
            <span>{counts.edges}</span>
            {counts.sample === undefined ? null : <span>{counts.sample}</span>}
        </button>
    );
}

/**
 * Slot 2, zoom. Drops third.
 *
 * `Zoom 100%`, the fit extent over the current extent. Clicking opens the small menu
 * -- Fit, Zoom to selection, 50%, 100%, 200%. No tooltip is drawn. The percentage
 * stays here and never joins the canvas toolbar.
 * @param props - Component props.
 * @param props.zoom - The zoom model.
 * @returns The zoom slot.
 */
export function StatusBarZoomSlot({ zoom }: { zoom: StatusBarZoom }): React.JSX.Element {
    return (
        <button aria-haspopup="menu" onClick={zoom.onClick} style={{ ...BARE_BUTTON, cursor: "pointer" }} type="button">
            {zoom.label}
        </button>
    );
}

/**
 * Slot 3, the XR mode chip.
 *
 * Rendered ONLY while an XR session is active, and there is no 3D chip: the canvas
 * 2D/3D control is always visible on the canvas toolbar. The chip reads `VR` or `AR`
 * and carries an `Exit` button that ends the session -- Escape never leaves XR. The
 * sources draw no tooltip for this chip.
 * @param props - Component props.
 * @param props.xr - The XR model.
 * @returns The XR mode slot.
 */
export function StatusBarXrSlot({ xr }: { xr: StatusBarXr }): React.JSX.Element {
    return (
        <span style={SLOT_STYLE}>
            <StatusBarChip>{xr.mode}</StatusBarChip>
            <button onClick={xr.onExit} style={{ ...BARE_BUTTON, color: PANEL_INK.ACCENT }} type="button">
                {XR_EXIT_LABEL}
            </button>
        </span>
    );
}

/**
 * Slot 4, the layout chip. Its NAME drops second; the chip and its caret stay.
 *
 * No `Layout:` label and no state dot. The visible text is one of the five states --
 * `Positions from file`, `Quick grid (Performance mode)`, `Force directed - step 120
 * of 1,000, Stop`, `Force directed - settled`, `Force directed - stopped after 1,000
 * steps` -- and the technical name, `Force directed (ngraph) - settled`, lives in the
 * chip's own tooltip and nowhere else in the bar. The body re-runs the layout; the
 * caret opens the layout menu.
 * @param props - Component props.
 * @param props.layout - The layout model.
 * @param props.nameDropped - Whether the overflow rule has taken the name.
 * @param props.nameRef - Measures the name span for the overflow rule.
 * @param props.menu - The caret half with its menu.
 * @returns The layout slot.
 */
export function StatusBarLayoutSlot({
    layout,
    nameDropped,
    nameRef,
    menu,
}: {
    layout: StatusBarLayoutModel;
    nameDropped: boolean;
    nameRef: (node: HTMLElement | null) => void;
    menu: React.ReactNode;
}): React.JSX.Element {
    const caretSlot = layout.caret ? menu : undefined;

    return (
        <StatusBarChip caretSlot={caretSlot} onClick={nameDropped ? undefined : layout.onRerun} title={layout.title}>
            {nameDropped ? null : <span ref={nameRef}>{layout.label}</span>}
        </StatusBarChip>
    );
}

/**
 * Slot 5, algorithm progress. Never drops, and neither does its Cancel.
 *
 * `Computing Bridges (betweenness)... 42%` with `Cancel` and, when a queue is behind
 * it, `and 2 queued`. Until the algorithm reports progress the slot shows elapsed
 * time and an indeterminate spinner, never a percentage, and Cancel is disabled with
 * `Cannot cancel this run`. While the Analyze panel is open with the running card in
 * view the slot compacts to the spinner and the percentage alone, so exactly one
 * Cancel is on screen per run.
 * @param props - Component props.
 * @param props.running - The running model.
 * @returns The running slot.
 */
export function StatusBarRunningSlot({ running }: { running: StatusBarRunningModel }): React.JSX.Element {
    const indeterminate = running.percentLabel === undefined;
    const cancelDisabled = indeterminate || !running.cancellable;
    const spinner = indeterminate ? <Loader aria-hidden="true" size={STATUS_BAR_GEOMETRY.SPINNER} /> : null;

    if (running.compact === true) {
        return (
            <span style={SLOT_STYLE}>
                {spinner}
                <span>{running.percentLabel ?? running.elapsed}</span>
            </span>
        );
    }

    return (
        <span style={SLOT_STYLE}>
            {spinner}
            <span style={{ color: PANEL_INK.VALUE }}>{running.label}</span>
            {running.elapsed === undefined ? null : <span>{running.elapsed}</span>}
            <CancelControl
                disabled={cancelDisabled}
                onCancel={running.onCancel}
                title={cancelDisabled ? (running.cancelTitle ?? RUN_CANCEL_DISABLED_TITLE) : undefined}
            />
            {running.queued === undefined ? null : <span>{running.queued}</span>}
        </span>
    );
}

/**
 * Slot 6, Viewing. Drops fourth.
 *
 * Rendered only while the time slider is on, and it reads out the same string the
 * slider does -- `Viewing: 2026-01-05 to 2026-02-04`, `Viewing: steps 1,200 to
 * 1,250`, `Viewing: v1.2 to v1.4`. No tooltip and no click are drawn.
 * @param props - Component props.
 * @param props.viewing - The Viewing model.
 * @returns The Viewing slot.
 */
export function StatusBarViewingSlot({ viewing }: { viewing: StatusBarViewing }): React.JSX.Element {
    return (
        <span style={SLOT_STYLE}>
            <span>{viewing.label}</span>
        </span>
    );
}

/**
 * Slot 7, the issues slot. Never drops, and neither does the Performance mode chip.
 *
 * Up to three chips in this order: the validation issues chip, which names kinds
 * first and the instance total in parentheses and opens the validation report; the
 * notes chip, which opens Explore with the Notes section expanded; and the
 * Performance mode chip, which names the label cap only and opens Settings >
 * Performance with the whole rule list in its tooltip.
 * @param props - Component props.
 * @param props.issues - The issues model.
 * @returns The issues slot.
 */
export function StatusBarIssuesSlot({ issues }: { issues: StatusBarIssues }): React.JSX.Element {
    const { validation, notes, performance } = issues;

    return (
        <span style={SLOT_STYLE}>
            {validation === undefined ? null : (
                <StatusBarChip
                    leading={<StatusDot color={PANEL_INK.WARNING} size={STATUS_BAR_GEOMETRY.WARNING_DOT} />}
                    onClick={validation.onClick}
                    title={validation.title}
                >
                    {validation.label}
                </StatusBarChip>
            )}
            {notes === undefined ? null : (
                <StatusBarChip
                    leading={<StatusDot color={PANEL_INK.ACCENT} size={STATUS_BAR_GEOMETRY.NOTE_DOT} />}
                    onClick={notes.onClick}
                >
                    {notes.label}
                </StatusBarChip>
            )}
            {performance === undefined ? null : (
                <StatusBarChip leading={<PerformanceBolt />} onClick={performance.onClick} title={performance.title}>
                    {performance.label}
                </StatusBarChip>
            )}
        </span>
    );
}

/**
 * Slot 8, AI status. Drops first.
 *
 * Rendered only when a provider is configured or a call is in flight: an unconfigured
 * assistant is not a status, so `AI: not configured` is never drawn. A 6 px state dot
 * plus the string `AI: Anthropic ready`, of the form `AI: <provider> <state>`. No
 * click and no tooltip are drawn.
 * @param props - Component props.
 * @param props.ai - The AI model.
 * @returns The AI status slot.
 */
export function StatusBarAiSlot({ ai }: { ai: StatusBarAi }): React.JSX.Element {
    return (
        <span style={{ ...SLOT_STYLE, gap: STATUS_BAR_GEOMETRY.AI_GAP }}>
            <StatusDot color={AI_DOT_INK[ai.state]} size={STATUS_BAR_GEOMETRY.AI_DOT} />
            <span>{ai.label}</span>
        </span>
    );
}

/**
 * Slot 9, the selection count.
 *
 * Rendered only when the selection is non-zero; a selected style layer or a selected
 * result is not a selection and never fills this slot. Brighter ink than the rest of
 * the bar. No click and no tooltip are drawn. This slot owns the selection size with
 * the inspector header, so the canvas marquee caption and the reading's opening
 * restatement do not repeat it.
 * @param props - Component props.
 * @param props.selection - The selection model.
 * @returns The selection slot.
 */
export function StatusBarSelectionSlot({ selection }: { selection: StatusBarSelection }): React.JSX.Element {
    return (
        <span style={SLOT_STYLE}>
            <span style={{ color: PANEL_INK.VALUE }}>{selection.label}</span>
        </span>
    );
}

/**
 * The three loading phases, which take over the layout slot (spec 02 section 6).
 *
 * The phase sentence, then the 120 x 4 progress bar where the phase has a percentage,
 * then Cancel -- which is present in EVERY phase, stops within 1 s, and is drawn
 * disabled with `Cannot cancel this load` where it cannot act. While a load runs the
 * slot takes no caret: there is no layout engine to pick until the graph is built.
 * @param props - Component props.
 * @param props.loading - The loading model.
 * @returns The loading slot.
 */
export function StatusBarLoadingSlot({ loading }: { loading: StatusBarLoading }): React.JSX.Element {
    const { label, progress, cancellable, onCancel } = loading;

    return (
        <span style={SLOT_STYLE}>
            <span style={{ color: PANEL_INK.VALUE }}>{label}</span>
            {progress === undefined ? (
                <Loader aria-hidden="true" size={STATUS_BAR_GEOMETRY.SPINNER} />
            ) : (
                <Progress
                    aria-label={label}
                    radius={STATUS_BAR_GEOMETRY.PROGRESS_RADIUS}
                    size={STATUS_BAR_GEOMETRY.PROGRESS_HEIGHT}
                    style={{ flex: "0 0 auto" }}
                    value={Math.round(progress * 100)}
                    w={STATUS_BAR_GEOMETRY.PROGRESS_WIDTH}
                />
            )}
            <CancelControl disabled={!cancellable} onCancel={onCancel} title={cancellable ? undefined : LOAD_CANCEL_DISABLED_TITLE} />
        </span>
    );
}
