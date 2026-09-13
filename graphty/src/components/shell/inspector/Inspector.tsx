/**
 * The inspector region: a 280 px collapsible column on the right edge of the body row
 * whose content is driven by the selection (spec 03 section 3).
 *
 * Box (3.1): 280 wide -- the same column as an activity panel, and NOT the 260 of the
 * earlier properties sidebar -- pinned to the right edge, `border-left: 1px solid`, column
 * flex, `overflow: hidden`. It takes the same 16 / 224 / 8 / 24 / 8 grid, the same
 * 24 px field and the same 32 px pitch. It is collapsible; the collapsed state is
 * remembered by the store (6.5) and the toggle lives both here and in the top bar.
 * The desktop drag is clamped by the store so the canvas never falls below 520 px.
 *
 * Layout (5, the binding pinning rule): computed metrics, neighbors and the actions
 * block never move below the first screen, so the CONTENT scrolls and the ACTIONS
 * BLOCK is a sticky footer outside that scroll. This component owns both elements and
 * publishes the footer through `InspectorStateProvider`.
 *
 * Below 1280 px the column is an overlay over the canvas rather than a dock, and it
 * does not resize (spec 01 section 7).
 *
 * Its header carries TWO pins and they are different objects: `Pin as A` freezes a copy
 * of the content for comparison (5.4) and is owned by `inspectorContext`, while
 * `Keep open` latches the column on screen (6.12) and is owned by the shell store. This
 * component threads the latch through and holds no latch state itself.
 */

import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useCallback, useRef, useState } from "react";

import { CANVAS_MENU_Z_INDEX, INSPECTOR_MAX_WIDTH, INSPECTOR_MIN_WIDTH } from "../constants";
import type { InspectorProps } from "../types";
import {
    INSPECTOR_BORDER_WIDTH,
    INSPECTOR_RESIZE_HANDLE_WIDTH,
    INSPECTOR_RESIZE_KEYBOARD_STEP,
    kindTakesPin,
} from "./inspectorConstants";
import { InspectorStateProvider, useInspectorPin } from "./inspectorContext";
import { InspectorHeader } from "./InspectorHeader";
import { PinnedCard } from "./PinnedCard";

/**
 * The boundary between the canvas and the inspector, which the desktop drag grabs.
 */
interface ResizeHandleProps {
    readonly width: number;
    readonly onWidthChange: (width: number) => void;
}

/**
 * Draws the resize boundary and turns a drag or an arrow press into a width request.
 *
 * It requests; it never clamps. The store owns the 520 px canvas clamp and hands back
 * the width the column actually takes.
 * @param props - the boundary's props.
 * @returns the boundary.
 */
function InspectorResizeHandle(props: ResizeHandleProps): React.JSX.Element {
    const { width, onWidthChange } = props;
    const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

    return (
        <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the inspector"
            aria-valuenow={width}
            aria-valuemin={INSPECTOR_MIN_WIDTH}
            aria-valuemax={INSPECTOR_MAX_WIDTH}
            tabIndex={0}
            data-testid="inspector-resize-handle"
            onPointerDown={(event) => {
                dragRef.current = { startX: event.clientX, startWidth: width };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
                const drag = dragRef.current;

                if (drag === null) {
                    return;
                }

                // The column sits on the right edge, so dragging towards the canvas
                // -- leftwards, a falling clientX -- widens it.
                onWidthChange(drag.startWidth + (drag.startX - event.clientX));
            }}
            onPointerUp={(event) => {
                dragRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    onWidthChange(width + INSPECTOR_RESIZE_KEYBOARD_STEP);
                }

                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    onWidthChange(width - INSPECTOR_RESIZE_KEYBOARD_STEP);
                }
            }}
            style={{
                position: "absolute",
                insetBlock: 0,
                insetInlineStart: 0,
                width: INSPECTOR_RESIZE_HANDLE_WIDTH,
                cursor: "col-resize",
                background: "transparent",
            }}
        />
    );
}

/**
 * The part of the column that reads the pin, which is everything inside the provider.
 */
interface InspectorContentsProps {
    readonly kindLabel: string;
    readonly identityLabel?: string;
    readonly showPin: boolean;
    readonly keptOpen?: boolean;
    readonly onKeepOpenChange?: (kept: boolean) => void;
    readonly onCopyReading: () => void;
    readonly onToggle: () => void;
    readonly setFooterNode: (node: HTMLDivElement | null) => void;
    readonly children?: React.ReactNode;
}

/**
 * Draws the header, card A, the scroll region and the sticky footer.
 * @param props - the contents' props.
 * @returns the inspector's inner column.
 */
function InspectorContents(props: InspectorContentsProps): React.JSX.Element {
    const {
        kindLabel,
        identityLabel,
        showPin,
        keptOpen,
        onKeepOpenChange,
        onCopyReading,
        onToggle,
        setFooterNode,
        children,
    } = props;
    const { snapshot, pin, unpin } = useInspectorPin();

    return (
        <>
            {/* Two pins, deliberately: `pinned` is the comparison pin this provider owns
                and `keptOpen` is 6.12's latch, which the shell store owns. Neither reads
                the other. */}
            <InspectorHeader
                kindLabel={kindLabel}
                identityLabel={identityLabel}
                showPin={showPin}
                pinned={snapshot !== null}
                keptOpen={keptOpen}
                onCopyReading={onCopyReading}
                onKeepOpenChange={onKeepOpenChange}
                onPin={showPin ? pin : undefined}
                onToggle={onToggle}
            />

            {/* Blocks 1 to 5 scroll. The horizontal padding is NOT drawn here: every
                ControlSection draws the panel's own 16 / 8 itself, and the blocks that
                are not sections draw it for themselves. */}
            <Box
                data-testid="inspector-scroll"
                style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    overflowX: "hidden",
                    paddingBlockEnd: PANEL_GRID.SECTION_PAD_BOTTOM,
                }}
            >
                {snapshot !== null && <PinnedCard snapshot={snapshot} onUnpin={unpin} />}
                {children}
            </Box>

            {/* Block 6 lives here, outside the scroll, so it never falls below the
                first screen however long the content above it grows. */}
            <Box ref={setFooterNode} data-testid="inspector-footer" style={{ flex: "0 0 auto" }} />
        </>
    );
}

/**
 * The inspector column.
 * @param props - the region's props, from the shell's shared contract.
 * @returns the column, or null while it is collapsed.
 */
export function Inspector(props: InspectorProps): React.JSX.Element | null {
    const {
        open,
        width,
        presentation,
        selectionKind,
        kindLabel,
        identityLabel,
        pinned,
        keptOpen,
        onCopyReading,
        onKeepOpenChange,
        onPin,
        onToggle,
        onWidthChange,
        children,
    } = props;

    const [footerNode, setFooterNode] = useState<HTMLDivElement | null>(null);

    const handlePinnedChange = useCallback(
        (next: boolean): void => {
            if (next) {
                onPin?.();
            }
        },
        [onPin],
    );

    if (!open) {
        return null;
    }

    const overlaid = presentation === "overlay";
    const showPin = kindTakesPin(selectionKind);

    return (
        <Box
            component="aside"
            aria-label={kindLabel}
            data-testid="inspector"
            data-presentation={presentation}
            style={{
                position: overlaid ? "absolute" : "relative",
                insetBlock: overlaid ? 0 : undefined,
                insetInlineEnd: overlaid ? 0 : undefined,
                zIndex: overlaid ? CANVAS_MENU_Z_INDEX : undefined,
                flex: overlaid ? undefined : `0 0 ${width}px`,
                width,
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderInlineStart: `${INSPECTOR_BORDER_WIDTH}px solid ${PANEL_INK.BORDER}`,
                background: PANEL_INK.PANEL,
            }}
        >
            {/* Below 1280 px the column is an overlay and does not resize, so the
                boundary is not drawn at all rather than drawn and inert. */}
            {!overlaid && onWidthChange !== undefined && (
                <InspectorResizeHandle width={width} onWidthChange={onWidthChange} />
            )}

            <InspectorStateProvider
                kindLabel={kindLabel}
                identityLabel={identityLabel}
                pinned={pinned}
                onPinnedChange={handlePinnedChange}
                footerNode={footerNode}
            >
                <InspectorContents
                    kindLabel={kindLabel}
                    identityLabel={identityLabel}
                    showPin={showPin}
                    keptOpen={keptOpen}
                    onKeepOpenChange={onKeepOpenChange}
                    onCopyReading={onCopyReading}
                    onToggle={onToggle}
                    setFooterNode={setFooterNode}
                >
                    {children}
                </InspectorContents>
            </InspectorStateProvider>
        </Box>
    );
}
