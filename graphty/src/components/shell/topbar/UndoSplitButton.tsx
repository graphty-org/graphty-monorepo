/**
 * The top bar's Undo split button (build spec 02 section 2.3a).
 *
 * One 24 px tall group of TWO separately clickable halves with a 1 px x 16 px divider
 * between them. The main half undoes. The caret half opens History and is a control
 * in its own right, with its own hit area and its own title naming what it opens --
 * `History`, never a bare `More` and never the main half's words (REGISTER 1.5
 * section 1.1, the caret row).
 *
 * The main half is disabled when the history store is empty and then takes the
 * appended reason. The caret half is NEVER disabled by an empty undo stack: History
 * is still a surface worth opening.
 *
 * History has three routes from this control, and all three land on the one callback:
 * the caret half, a right-click on the main half, and a long-press on the main half
 * (spec 02 section 2.5).
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React, { useCallback, useEffect, useRef } from "react";

import { TopBarIconButton } from "./topBarControls";
import {
    LONG_PRESS_MS,
    SPLIT_BUTTON_HEIGHT,
    SPLIT_CARET_GLYPH_SIZE,
    SPLIT_CARET_WIDTH,
    SPLIT_DIVIDER_HEIGHT,
    SPLIT_DIVIDER_WIDTH,
    SPLIT_MAIN_WIDTH,
    TOP_BAR_ICON_RADIUS,
} from "./topBarGeometry";
import { HISTORY_TITLE, undoAccessibleName, undoTitle } from "./topBarStrings";

/**
 * Props of the Undo split button.
 * @public
 */
export interface UndoSplitButtonProps {
    /** Whether there is anything to undo. Never disables the caret half. */
    readonly canUndo: boolean;
    /** Undo one step. */
    readonly onUndo: () => void;
    /** Open History, from the caret half, a right-click or a long-press. */
    readonly onOpenHistory: () => void;
    /** Whether the History pop-out is open; the caret half draws active while it is. */
    readonly historyOpen?: boolean;
    /**
     * The whole split button, which is the History pop-out's horizontal anchor box --
     * not its caret half (spec 02 section 2.5, HistoryPopover 1.8 B4).
     */
    readonly groupRef?: React.RefObject<HTMLDivElement | null>;
    /** The caret half, which Escape returns focus to. */
    readonly caretRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * The Undo split button.
 * @param props - the button's props.
 * @returns the two-half group.
 */
export function UndoSplitButton(props: UndoSplitButtonProps): React.JSX.Element {
    const { canUndo, caretRef, groupRef, historyOpen = false, onOpenHistory, onUndo } = props;

    const longPressTimer = useRef<number | null>(null);
    const longPressFired = useRef(false);

    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current !== null) {
            window.clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    useEffect(() => cancelLongPress, [cancelLongPress]);

    const startLongPress = useCallback(() => {
        cancelLongPress();
        longPressFired.current = false;
        longPressTimer.current = window.setTimeout(() => {
            longPressTimer.current = null;
            longPressFired.current = true;
            onOpenHistory();
        }, LONG_PRESS_MS);
    }, [cancelLongPress, onOpenHistory]);

    const handleUndoClick = useCallback(() => {
        // A long-press has already opened History; the click that ends it is part of
        // the press and must not also undo a step.
        if (longPressFired.current) {
            longPressFired.current = false;
            return;
        }

        onUndo();
    }, [onUndo]);

    const handleContextMenu = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            cancelLongPress();
            onOpenHistory();
        },
        [cancelLongPress, onOpenHistory],
    );

    return (
        <div
            ref={groupRef}
            style={{
                display: "flex",
                alignItems: "center",
                height: SPLIT_BUTTON_HEIGHT,
                borderRadius: TOP_BAR_ICON_RADIUS,
                boxSizing: "border-box",
            }}
        >
            <TopBarIconButton
                title={undoTitle(canUndo)}
                accessibleName={undoAccessibleName(canUndo)}
                glyph="undo"
                width={SPLIT_MAIN_WIDTH}
                radius={`${TOP_BAR_ICON_RADIUS}px 0 0 ${TOP_BAR_ICON_RADIUS}px`}
                disabled={!canUndo}
                onClick={handleUndoClick}
                onContextMenu={handleContextMenu}
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
            />
            <div
                aria-hidden="true"
                style={{
                    flex: "0 0 auto",
                    width: SPLIT_DIVIDER_WIDTH,
                    height: SPLIT_DIVIDER_HEIGHT,
                    background: PANEL_INK.DIVIDER,
                }}
            />
            <TopBarIconButton
                ref={caretRef}
                title={HISTORY_TITLE}
                accessibleName={HISTORY_TITLE}
                glyph="splitCaret"
                glyphSize={SPLIT_CARET_GLYPH_SIZE}
                width={SPLIT_CARET_WIDTH}
                radius={`0 ${TOP_BAR_ICON_RADIUS}px ${TOP_BAR_ICON_RADIUS}px 0`}
                active={historyOpen}
                aria-expanded={historyOpen}
                aria-haspopup="dialog"
                popoutTrigger
                onClick={onOpenHistory}
            />
        </div>
    );
}
