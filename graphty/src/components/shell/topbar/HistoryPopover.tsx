/**
 * The History pop-out (build spec 02 section 2.5).
 *
 * A 6.11 pop-out -- not a menu, not a dialog, not a tooltip bubble. It hangs from the
 * top bar's own bottom edge with a gap of 0 and shares its left edge with the WHOLE
 * Undo split button, not with the caret half that opened it, so it is anchored on two
 * elements: `barRef` decides how far down it opens and `anchorRef` which edge it
 * lines up with. It draws no caret, because at the bar's bottom edge there is no gap
 * to draw one in.
 *
 * The surface does NOT repeat Undo and Redo: those two sit in the bar just above it
 * and are the same two register verbs.
 *
 * Rows run newest first with the current position marked, an undone row is STRUCK
 * THROUGH and never dimmed (dim ink is reserved for what has not shipped), a row
 * click restores that point, a title click opens the panel that owns the step, and a
 * History row never re-runs anything.
 */

import { InfoCircle, PANEL_INK, Popout, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { TOOLTIP_DELAY_MS } from "../constants";
import {
    HISTORY_ACTIVITY_COLUMN,
    HISTORY_BADGE_FONT_SIZE,
    HISTORY_BADGE_HEIGHT,
    HISTORY_BADGE_PADDING_X,
    HISTORY_BADGE_RADIUS,
    HISTORY_BODY_PADDING,
    HISTORY_CLOSE_GLYPH_SIZE,
    HISTORY_CURRENT_BAR_WIDTH,
    HISTORY_GLYPH_COLUMN,
    HISTORY_HEADER_FONT_SIZE,
    HISTORY_HEADER_GAP,
    HISTORY_HEADER_HEIGHT,
    HISTORY_HEADER_PADDING_LEFT,
    HISTORY_HEADER_PADDING_RIGHT,
    HISTORY_POPOVER_CONTENT_WIDTH,
    HISTORY_POPOVER_GAP,
    HISTORY_POPOVER_HEIGHT_RESERVE,
    HISTORY_POPOVER_WIDTH,
    HISTORY_PROVENANCE_FONT_SIZE,
    HISTORY_PROVENANCE_GAP,
    HISTORY_ROW_GAP,
    HISTORY_ROW_HEIGHT,
    HISTORY_ROW_PADDING_X,
    HISTORY_ROW_RADIUS,
    HISTORY_TIME_COLUMN,
    HISTORY_TITLE_GAP,
    HISTORY_XR_CHILD_INDENT,
    TOP_BAR_BORDER_WIDTH,
    TOP_BAR_FONT_SIZE,
    TOP_BAR_LABEL_FONT_WEIGHT,
    TOP_BAR_LINE_HEIGHT,
} from "./topBarGeometry";
import {
    CLOSE_TITLE,
    formatHistoryTime,
    HISTORY_CURRENT_BADGE,
    HISTORY_INFO_TEXT,
    HISTORY_TITLE,
    historyStateLine,
    xrSessionStepCount,
} from "./topBarStrings";
import type { HistoryEntry, HistoryEntryRow, HistoryRow } from "./undoStore";

const MONO_COLUMN: React.CSSProperties = {
    fontFamily: "var(--mantine-font-family-monospace)",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    color: PANEL_INK.CHROME,
};

const TITLE_CELL: React.CSSProperties = {
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: PANEL_INK.VALUE,
};

/**
 * Props of one drawn row.
 */
interface HistoryRowItemProps {
    readonly row: HistoryEntryRow;
    readonly indented: boolean;
    readonly onRestore: (entry: HistoryEntry) => void;
    readonly onOpenOwningPanel: (entry: HistoryEntry) => void;
    readonly onPreview?: (entry: HistoryEntry | null) => void;
}

function HistoryRowItem(props: HistoryRowItemProps): React.JSX.Element {
    const { indented, onOpenOwningPanel, onPreview, onRestore, row } = props;
    const { current, entry, undone } = row;

    const preview = useCallback(() => {
        onPreview?.(entry);
    }, [entry, onPreview]);

    const clearPreview = useCallback(() => {
        onPreview?.(null);
    }, [onPreview]);

    const columns = indented
        ? `minmax(0, 1fr) ${HISTORY_ACTIVITY_COLUMN}px ${HISTORY_TIME_COLUMN}px`
        : `${HISTORY_GLYPH_COLUMN}px minmax(0, 1fr) ${HISTORY_ACTIVITY_COLUMN}px ${HISTORY_TIME_COLUMN}px`;

    return (
        <li
            aria-current={current ? "true" : undefined}
            onMouseEnter={preview}
            onMouseLeave={clearPreview}
            onFocus={preview}
            onBlur={clearPreview}
            style={{
                position: "relative",
                listStyle: "none",
                borderRadius: HISTORY_ROW_RADIUS,
                ...(current
                    ? {
                        background: "var(--mantine-primary-color-light)",
                        boxShadow: `inset ${HISTORY_CURRENT_BAR_WIDTH}px 0 0 ${PANEL_INK.ACCENT}`,
                    }
                    : {}),
            }}
        >
            {/*
                The row restores and the title opens a panel: two actions, so two real
                buttons. The restore button is laid over the whole row rather than
                wrapped around it, because a button inside a button is not a control a
                keyboard or a screen reader can reach.
            */}
            <button
                type="button"
                onClick={() => {
                    onRestore(entry);
                }}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    borderRadius: HISTORY_ROW_RADIUS,
                    cursor: "pointer",
                }}
            >
                <VisuallyHidden>{entry.title}</VisuallyHidden>
            </button>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: columns,
                    alignItems: "center",
                    gap: HISTORY_ROW_GAP,
                    minHeight: HISTORY_ROW_HEIGHT,
                    padding: indented
                        ? `0 ${HISTORY_ROW_PADDING_X}px 0 ${HISTORY_XR_CHILD_INDENT}px`
                        : `0 ${HISTORY_ROW_PADDING_X}px`,
                    fontSize: TOP_BAR_FONT_SIZE,
                    lineHeight: TOP_BAR_LINE_HEIGHT,
                    boxSizing: "border-box",
                }}
            >
                {/*
                    The 14 px glyph column of the row grid. The artboard draws a
                    per-step glyph here, but spec 02's register table names no glyph
                    for any of the section 3.1 categories and the compact-mantine
                    register is closed, so the column is reserved and left undrawn
                    rather than nine drawings being invented for it.
                */}
                {indented ? null : <span aria-hidden="true" />}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: HISTORY_PROVENANCE_GAP,
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: HISTORY_TITLE_GAP,
                            minWidth: 0,
                        }}
                    >
                        {entry.destinationTitle === undefined ? (
                            <span
                                style={{
                                    ...TITLE_CELL,
                                    textDecoration: undone ? "line-through" : undefined,
                                }}
                            >
                                {entry.title}
                            </span>
                        ) : (
                            <Tooltip label={entry.destinationTitle} openDelay={TOOLTIP_DELAY_MS} withinPortal>
                                <button
                                    type="button"
                                    aria-label={entry.destinationTitle}
                                    onClick={() => {
                                        onOpenOwningPanel(entry);
                                    }}
                                    style={{
                                        ...TITLE_CELL,
                                        position: "relative",
                                        padding: 0,
                                        border: 0,
                                        background: "transparent",
                                        font: "inherit",
                                        color: PANEL_INK.VALUE,
                                        cursor: "pointer",
                                        textAlign: "start",
                                        textDecoration: undone ? "line-through" : "underline",
                                        textUnderlineOffset: 2,
                                    }}
                                >
                                    {entry.title}
                                </button>
                            </Tooltip>
                        )}
                        {current ? (
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    flex: "0 0 auto",
                                    height: HISTORY_BADGE_HEIGHT,
                                    padding: `0 ${HISTORY_BADGE_PADDING_X}px`,
                                    borderRadius: HISTORY_BADGE_RADIUS,
                                    background: PANEL_INK.ACCENT,
                                    color: PANEL_INK.ON_ACCENT,
                                    fontSize: HISTORY_BADGE_FONT_SIZE,
                                    fontWeight: TOP_BAR_LABEL_FONT_WEIGHT,
                                    lineHeight: 1,
                                }}
                            >
                                {HISTORY_CURRENT_BADGE}
                            </span>
                        ) : null}
                    </div>
                    {entry.provenance === undefined ? null : (
                        <span
                            style={{
                                fontSize: HISTORY_PROVENANCE_FONT_SIZE,
                                lineHeight: TOP_BAR_LINE_HEIGHT,
                                color: PANEL_INK.CHROME,
                            }}
                        >
                            {entry.provenance}
                        </span>
                    )}
                </div>
                <span style={{ color: PANEL_INK.CHROME }}>{entry.activityLabel}</span>
                <span style={MONO_COLUMN}>{formatHistoryTime(entry.at)}</span>
            </div>
        </li>
    );
}

/**
 * Props of one XR session group.
 */
interface HistoryXrGroupProps {
    readonly label: string;
    readonly steps: number;
    readonly at: number;
    readonly undone: boolean;
    readonly children: React.ReactNode;
}

function HistoryXrGroup(props: HistoryXrGroupProps): React.JSX.Element {
    const { at, children, label, steps, undone } = props;
    const [open, setOpen] = useState(true);

    return (
        <li style={{ listStyle: "none" }}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => {
                    setOpen((current) => !current);
                }}
                style={{
                    display: "grid",
                    gridTemplateColumns: `${HISTORY_GLYPH_COLUMN}px minmax(0, 1fr) ${HISTORY_ACTIVITY_COLUMN}px ${HISTORY_TIME_COLUMN}px`,
                    alignItems: "center",
                    gap: HISTORY_ROW_GAP,
                    width: "100%",
                    minHeight: HISTORY_ROW_HEIGHT,
                    padding: `0 ${HISTORY_ROW_PADDING_X}px`,
                    border: 0,
                    background: "transparent",
                    borderRadius: HISTORY_ROW_RADIUS,
                    color: PANEL_INK.VALUE,
                    fontFamily: "inherit",
                    fontSize: TOP_BAR_FONT_SIZE,
                    lineHeight: TOP_BAR_LINE_HEIGHT,
                    cursor: "pointer",
                    boxSizing: "border-box",
                }}
            >
                <span aria-hidden="true" style={{ display: "inline-flex", color: PANEL_INK.CHROME }}>
                    <UiGlyph name={open ? "chevronDown" : "chevronRight"} size={HISTORY_CLOSE_GLYPH_SIZE} />
                </span>
                <span style={{ ...TITLE_CELL, textDecoration: undone ? "line-through" : undefined }}>
                    {label}
                </span>
                <span style={{ color: PANEL_INK.CHROME }}>{xrSessionStepCount(steps)}</span>
                <span style={MONO_COLUMN}>{formatHistoryTime(at)}</span>
            </button>
            {open ? (
                <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>{children}</ul>
            ) : null}
        </li>
    );
}

/**
 * Props of the History pop-out.
 */
export interface HistoryPopoverProps {
    /** Whether the pop-out is open. */
    readonly opened: boolean;
    /** The rows, newest first, from `historyRows`. */
    readonly rows: readonly HistoryRow[];
    /** How many entries the one history store holds, for the header's state line. */
    readonly entryCount: number;
    /** How many of them have been undone, for the header's state line. */
    readonly undoneCount: number;
    /**
     * The whole Undo split button: the pop-out shares its left edge (spec 02 section
     * 2.5, HistoryPopover 1.8 B4 -- the anchor box is the split button, not its caret).
     */
    readonly anchorRef: React.RefObject<HTMLElement | null>;
    /** The top bar: the pop-out hangs from its bottom edge with a gap of 0. */
    readonly barRef: React.RefObject<HTMLElement | null>;
    /** Open and close, including the pop-out layer's own Escape and click-outside. */
    readonly onOpenChange: (opened: boolean) => void;
    /** A row click restores that point. */
    readonly onRestore: (entry: HistoryEntry) => void;
    /** A title click opens the panel that owns the step. */
    readonly onOpenOwningPanel: (entry: HistoryEntry) => void;
    /** A row hover previews that point on the canvas, faintly. */
    readonly onPreview?: (entry: HistoryEntry | null) => void;
    /** Escape returns focus here -- the caret half that opened the pop-out. */
    readonly returnFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * The History pop-out.
 * @param props - the pop-out's props.
 * @returns the pop-out, rendered into the shell's one pop-out layer.
 */
export function HistoryPopover(props: HistoryPopoverProps): React.JSX.Element {
    const {
        anchorRef,
        barRef,
        entryCount,
        onOpenChange,
        onOpenOwningPanel,
        onPreview,
        onRestore,
        opened,
        returnFocusRef,
        rows,
        undoneCount,
    } = props;

    const wasOpen = useRef(false);

    // The pop-out is not opened through a Popout.Trigger -- its three routes live on
    // the Undo split button -- so the library has no trigger to hand focus back to.
    useEffect(() => {
        if (!opened && wasOpen.current) {
            returnFocusRef?.current?.focus();
        }

        wasOpen.current = opened;
    }, [opened, returnFocusRef]);

    const handleOpenChange = useCallback(
        (next: boolean) => {
            onOpenChange(next);
        },
        [onOpenChange],
    );

    return (
        <Popout opened={opened} onOpenChange={handleOpenChange}>
            <Popout.Panel
                width={HISTORY_POPOVER_WIDTH}
                label={HISTORY_TITLE}
                anchorX={anchorRef}
                anchorY={barRef}
                placement="bottom"
                alignment="start"
                gap={HISTORY_POPOVER_GAP}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: HISTORY_POPOVER_CONTENT_WIDTH,
                        maxHeight: `calc(100vh - ${HISTORY_POPOVER_HEIGHT_RESERVE}px)`,
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            flex: `0 0 ${HISTORY_HEADER_HEIGHT}px`,
                            display: "flex",
                            alignItems: "center",
                            gap: HISTORY_HEADER_GAP,
                            height: HISTORY_HEADER_HEIGHT,
                            padding: `0 ${HISTORY_HEADER_PADDING_RIGHT}px 0 ${HISTORY_HEADER_PADDING_LEFT}px`,
                            boxSizing: "border-box",
                        }}
                    >
                        <span
                            style={{
                                flex: "0 0 auto",
                                fontSize: HISTORY_HEADER_FONT_SIZE,
                                fontWeight: TOP_BAR_LABEL_FONT_WEIGHT,
                                lineHeight: TOP_BAR_LINE_HEIGHT,
                                color: PANEL_INK.VALUE,
                            }}
                        >
                            {HISTORY_TITLE}
                        </span>
                        <InfoCircle label={HISTORY_TITLE}>{HISTORY_INFO_TEXT}</InfoCircle>
                        <span
                            style={{
                                flex: "1 1 auto",
                                minWidth: 0,
                                fontSize: TOP_BAR_FONT_SIZE,
                                lineHeight: TOP_BAR_LINE_HEIGHT,
                                color: PANEL_INK.CHROME,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {historyStateLine(entryCount, undoneCount)}
                        </span>
                        <Tooltip label={CLOSE_TITLE} openDelay={TOOLTIP_DELAY_MS} withinPortal>
                            <ActionIcon
                                type="button"
                                variant="subtle"
                                c={PANEL_INK.CHROME}
                                aria-label={CLOSE_TITLE}
                                onClick={() => {
                                    onOpenChange(false);
                                }}
                            >
                                <UiGlyph name="close" size={HISTORY_CLOSE_GLYPH_SIZE} />
                            </ActionIcon>
                        </Tooltip>
                    </div>
                    <div
                        aria-hidden="true"
                        style={{ flex: `0 0 ${TOP_BAR_BORDER_WIDTH}px`, background: PANEL_INK.DIVIDER }}
                    />
                    <ul
                        style={{
                            flex: "1 1 auto",
                            minHeight: 0,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            margin: 0,
                            padding: `${HISTORY_BODY_PADDING}px ${HISTORY_BODY_PADDING}px 0`,
                            boxSizing: "border-box",
                        }}
                    >
                        {rows.map((row) =>
                            row.kind === "xrSession" ? (
                                <HistoryXrGroup
                                    key={row.sessionId}
                                    label={row.label}
                                    steps={row.children.length}
                                    at={row.at}
                                    undone={row.undone}
                                >
                                    {row.children.map((child) => (
                                        <HistoryRowItem
                                            key={child.entry.id}
                                            row={child}
                                            indented
                                            onRestore={onRestore}
                                            onOpenOwningPanel={onOpenOwningPanel}
                                            onPreview={onPreview}
                                        />
                                    ))}
                                </HistoryXrGroup>
                            ) : (
                                <HistoryRowItem
                                    key={row.entry.id}
                                    row={row}
                                    indented={false}
                                    onRestore={onRestore}
                                    onOpenOwningPanel={onOpenOwningPanel}
                                    onPreview={onPreview}
                                />
                            ),
                        )}
                    </ul>
                </div>
            </Popout.Panel>
        </Popout>
    );
}
