/**
 * The inspector region: a 280 px collapsible column on the right edge of the body row
 * whose content is driven by the selection (spec 03 section 3).
 *
 * Box (3.1): 280 wide -- the same column as an activity panel, and NOT the 260 of the
 * earlier properties sidebar -- pinned to the right edge, `border-left: 1px solid`, column
 * flex. It takes the same 16 / 224 / 8 / 24 / 8 grid, the same
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

import { PANEL_GRID, PANEL_INK, ResizeHandle } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useCallback, useState } from "react";

import { CANVAS_MENU_Z_INDEX, INSPECTOR_MAX_WIDTH, INSPECTOR_MIN_WIDTH } from "../constants";
import type { InspectorProps } from "../types";
import {
    INSPECTOR_BORDER_WIDTH,
    kindTakesPin,
} from "./inspectorConstants";
import { InspectorStateProvider } from "./inspectorContext";
import { InspectorHeader } from "./InspectorHeader";
import { useInspectorPin } from "./inspectorState";
import { PinnedCard } from "./PinnedCard";

/**
 * The part of the column that reads the pin, which is everything inside the provider.
 */
interface InspectorContentsProps {
    readonly kindLabel: string;
    readonly identityLabel?: string;
    readonly showPin: boolean;
    readonly onCopyReading: () => void;
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
        onCopyReading,
        setFooterNode,
        children,
    } = props;
    const { snapshot, pin, unpin } = useInspectorPin();

    return (
        <>
            {/* ONE pin now, where there used to be two. `pinned` is the comparison pin
                this provider owns; the other was 6.12's `keptOpen` latch, deleted on
                2026-09-14 with the rest of the per-surface panel model. They never read
                each other, which is exactly why two controls drawn alike in one 36 px row
                was a reading hazard. */}
            <InspectorHeader
                kindLabel={kindLabel}
                identityLabel={identityLabel}
                showPin={showPin}
                pinned={snapshot !== null}
                onCopyReading={onCopyReading}
                onPin={showPin ? pin : undefined}
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
        onCopyReading,
        onPin,
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
                // No clip here: the content scrolls in its own box, and a clip would cut the
                // resize handle, which straddles this edge, down to its inner half.
                borderInlineStart: `${INSPECTOR_BORDER_WIDTH}px solid ${PANEL_INK.BORDER}`,
                background: PANEL_INK.PANEL,
            }}
        >
            {/* Below 1280 px the column is an overlay and does not resize, so the
                boundary is not drawn at all rather than drawn and inert. */}
            {!overlaid && onWidthChange !== undefined && (
                // The store clamps what this asks for, so the canvas keeps its minimum.
                <ResizeHandle
                    edge="start"
                    value={width}
                    min={INSPECTOR_MIN_WIDTH}
                    max={INSPECTOR_MAX_WIDTH}
                    onChange={onWidthChange}
                    label="Resize the inspector"
                />
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
                    onCopyReading={onCopyReading}
                    setFooterNode={setFooterNode}
                >
                    {children}
                </InspectorContents>
            </InspectorStateProvider>
        </Box>
    );
}
