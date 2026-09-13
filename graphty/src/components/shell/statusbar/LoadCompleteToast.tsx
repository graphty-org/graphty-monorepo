/**
 * The completion toast, build spec 02 section 6.
 *
 * It hangs above the status bar for a few seconds after a load finishes and reads
 * `Loaded 51,000 nodes and 212,000 edges in 34 s. Details`, with the mapping clause
 * added when roles were guessed or changed in the Import options dialog:
 * `Loaded 200 nodes and 612 edges in 1 s. Mapped amount to weight, ts to time.
 * Details`.
 *
 * `Details` opens Data with the Loaded data section expanded, scrolled to the mapping
 * line and highlighting it for two seconds. On the session's FIRST load the panel has
 * already switched to Explore, and this toast is the route back to Data -- which is
 * why the sentence stays on screen rather than behind a door.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { Anchor, Group, Paper, Text } from "@mantine/core";
import React, { useEffect } from "react";

import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";
import type { StatusBarCompletion } from "./statusBarModel";

/**
 * The toast's one control (spec 02 section 6). The one home for the word, so anything asserting
 * the toast's control quotes it.
 * @public
 */
export const DETAILS_LABEL = "Details";

/**
 * Props of the completion toast.
 * @public
 */
export interface LoadCompleteToastProps {
    /** What the finished load reports, and where Details goes. */
    readonly completion: StatusBarCompletion;
}

/**
 * The load completion toast.
 *
 * It dismisses itself after the documented few seconds when the host gives it an
 * `onDismiss`; without one it stays until the host stops passing a completion, so no
 * report is lost to a timer the caller did not ask for.
 * @param props - Component props.
 * @param props.completion - What the finished load reports.
 * @returns The toast.
 */
export function LoadCompleteToast({ completion }: LoadCompleteToastProps): React.JSX.Element {
    const { message, onDetails, onDismiss } = completion;

    useEffect(() => {
        if (onDismiss === undefined) {
            return undefined;
        }

        const timer = window.setTimeout(onDismiss, STATUS_BAR_GEOMETRY.TOAST_DURATION_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [onDismiss]);

    return (
        <Paper
            data-status-float="true"
            p={STATUS_BAR_GEOMETRY.TOAST_PADDING}
            role="status"
            shadow="md"
            style={{
                position: "absolute",
                bottom: "100%",
                left: STATUS_BAR_GEOMETRY.PADDING_X,
                marginBottom: STATUS_BAR_GEOMETRY.TOAST_GAP,
                maxWidth: STATUS_BAR_GEOMETRY.TOAST_MAX_WIDTH,
            }}
            withBorder
        >
            <Group align="flex-start" gap={STATUS_BAR_GEOMETRY.GROUP_GAP} wrap="nowrap">
                <Text c={PANEL_INK.VALUE} fz={STATUS_BAR_GEOMETRY.FONT_SIZE} lh={STATUS_BAR_GEOMETRY.LINE_HEIGHT}>
                    {message}
                </Text>
                <Anchor
                    component="button"
                    fz={STATUS_BAR_GEOMETRY.FONT_SIZE}
                    lh={STATUS_BAR_GEOMETRY.LINE_HEIGHT}
                    onClick={onDetails}
                    style={{ flex: "0 0 auto" }}
                    type="button"
                >
                    {DETAILS_LABEL}
                </Anchor>
            </Group>
        </Paper>
    );
}
