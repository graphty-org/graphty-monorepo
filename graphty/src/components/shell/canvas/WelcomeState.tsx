/**
 * Welcome: what the canvas draws in the Empty state (6.1).
 *
 * ART-WEL:303-340. The Empty state renders NO canvas overlays -- no minimap, no
 * legend, no Insights strip and no canvas toolbar -- because there is no graph to
 * navigate; the canvas region enforces that, and this block is the whole canvas.
 *
 * Welcome is the arrival path and is exempt from the density rules and from the icon
 * rule (6.8 "does not apply at all to: the Empty state"). Every string below is the
 * artboard's, character for character.
 *
 * The sample datasets, the recent files and the recipes are the Data activity's lists
 * drawn in this block, which owns them on this screen; they arrive as `children` so
 * the canvas region does not fork the Data panel's own data.
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Button } from "@mantine/core";
import React, { useCallback, useState } from "react";

import { CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE } from "./canvasLayout";

/**
 * Props of the Welcome block.
 * @public
 */
export interface WelcomeStateProps {
    /** Opens the file picker. */
    readonly onOpenFile: () => void;
    /** Opens the paste-or-URL route, which is one link because it is one decision. */
    readonly onPasteOrOpenFromUrl: () => void;
    /** A file dropped on the zone. */
    readonly onFilesDropped?: (files: FileList) => void;
    /** Sample datasets, recent files and recipes, supplied by the Data activity. */
    readonly children?: React.ReactNode;
}

const HEADING = "Open a graph to get started";
const SUB_HEADING =
    "Drop a file, pick a sample, or reopen something recent. Everything here is also in the Data panel on the left.";
const DROP_INSTRUCTION = "Drop a graph file (or a nodes file and an edges file) here";
const OPEN_FILE = "Open file";
const ACCEPTED_FORMATS = "Accepted formats: JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2";
const PASTE_OR_URL = "or paste data / open from URL";

/**
 * Draws the Empty state's Welcome block, centred in the canvas.
 * @param props - the two routes in, the drop handler and the Data activity's lists.
 * @returns the Welcome element.
 */
export function WelcomeState(props: WelcomeStateProps): React.JSX.Element {
    const { children, onFilesDropped, onOpenFile, onPasteOrOpenFromUrl } = props;
    const [dragging, setDragging] = useState(false);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragging(false);
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDragging(false);

            if (onFilesDropped !== undefined) {
                onFilesDropped(event.dataTransfer.files);
            }
        },
        [onFilesDropped],
    );

    return (
        <div
            data-canvas-welcome="true"
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
            }}
        >
            <div
                style={{
                    width: CANVAS_METRICS.WELCOME_WIDTH,
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: CANVAS_SPACE.LG,
                    boxSizing: "border-box",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: CANVAS_SPACE.SM }}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: CANVAS_TYPE.HEADING,
                            fontWeight: 600,
                            lineHeight: CANVAS_LEADING.HEADING,
                            color: PANEL_INK.VALUE,
                        }}
                    >
                        {HEADING}
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            fontSize: CANVAS_TYPE.BODY,
                            lineHeight: CANVAS_LEADING.PROSE,
                            color: PANEL_INK.PROSE,
                        }}
                    >
                        {SUB_HEADING}
                    </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: CANVAS_SPACE.MD }}>
                    <div
                        data-dragging={dragging ? "true" : "false"}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: CANVAS_SPACE.MD,
                            padding: `${String(CANVAS_SPACE.LG)}px ${String(CANVAS_SPACE.XXL)}px`,
                            borderRadius: "var(--mantine-radius-lg)",
                            border: `${String(CANVAS_SPACE.HAIRLINE)}px dashed ${dragging ? PANEL_INK.ACCENT : PANEL_INK.BORDER}`,
                            background: PANEL_INK.PANEL,
                            boxSizing: "border-box",
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            width={CANVAS_METRICS.WELCOME_ART_WIDTH}
                            height={CANVAS_METRICS.WELCOME_ART_HEIGHT}
                            viewBox={`0 0 ${String(CANVAS_METRICS.WELCOME_ART_WIDTH)} ${String(CANVAS_METRICS.WELCOME_ART_HEIGHT)}`}
                            fill="none"
                            stroke={PANEL_INK.BORDER}
                            strokeWidth={CANVAS_METRICS.GLYPH_STROKE}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="14" y1="34" x2="29" y2="21" />
                            <line x1="29" y1="21" x2="46" y2="14" />
                            <line x1="29" y1="21" x2="38" y2="37" />
                            <line x1="46" y1="14" x2="58" y2="26" />
                            <line x1="38" y1="37" x2="58" y2="26" />
                            <line x1="46" y1="14" x2="38" y2="37" />
                            <line x1="14" y1="34" x2="38" y2="37" />
                            <circle cx="14" cy="34" r="4" />
                            <circle cx="29" cy="21" r="5" stroke={PANEL_INK.ACCENT} />
                            <circle cx="46" cy="14" r="4" />
                            <circle cx="38" cy="37" r="4" />
                            <circle cx="58" cy="26" r="4" />
                        </svg>

                        <span
                            style={{
                                fontSize: CANVAS_TYPE.BODY,
                                lineHeight: CANVAS_LEADING.DENSE,
                                color: PANEL_INK.VALUE,
                            }}
                        >
                            {DROP_INSTRUCTION}
                        </span>

                        <Button
                            h={PANEL_GRID.CONTROL_HEIGHT}
                            px={COMPACT_SIZING.CONTROL_PADDING}
                            fz={CANVAS_TYPE.SMALL}
                            onClick={onOpenFile}
                        >
                            {OPEN_FILE}
                        </Button>

                        <span
                            style={{
                                fontSize: CANVAS_TYPE.SMALL,
                                lineHeight: CANVAS_LEADING.TIGHT,
                                color: PANEL_INK.CHROME,
                            }}
                        >
                            {ACCEPTED_FORMATS}
                        </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <button
                            type="button"
                            onClick={onPasteOrOpenFromUrl}
                            style={{
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                color: PANEL_INK.ACCENT,
                                fontSize: CANVAS_TYPE.SMALL,
                                lineHeight: CANVAS_LEADING.TIGHT,
                                cursor: "pointer",
                            }}
                        >
                            {PASTE_OR_URL}
                        </button>
                    </div>
                </div>

                {children}
            </div>
        </div>
    );
}
