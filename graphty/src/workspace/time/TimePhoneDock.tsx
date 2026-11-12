/**
 * The dock on a phone (design/data/timeline-attribute.md section 6.1): one row of transport and
 * readout over a sparkline of the same bins, so the canvas keeps its height. Tapping the readout
 * opens a bottom sheet with what the row has no room for: the histogram with its brush, the From and
 * To fields, and the dock's other buttons. `TimeDock` builds every part; this only arranges them.
 * The sheet comes up with focus on the brush, what it is for, and the header's chip opens it too.
 */

import { SparklineRow, type SparklineRowProps } from "@graphty/compact-mantine";
import { Drawer, Group, UnstyledButton } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { focusWindowStart } from "./timeActions";

/**
 * The phone's row, sparkline and sheet.
 * @param props - Component props
 * @param props.transport - the transport's buttons.
 * @param props.readout - the readout's words.
 * @param props.onOpen - opens the sheet, for the readout's tap.
 * @param props.line - the sparkline.
 * @param props.tools - the dock's buttons and counts, at the top of the sheet.
 * @param props.chart - the histogram and its brush.
 * @param props.renderFields - the From and To fields, given what closes the sheet.
 * @returns the phone's dock.
 */
export function TimePhoneDock({
    transport,
    readout,
    onOpen,
    line,
    tools,
    chart,
    renderFields,
}: Readonly<{
    transport: React.ReactNode;
    readout: string;
    onOpen: () => void;
    line: SparklineRowProps;
    tools: React.ReactNode;
    chart: React.ReactNode;
    renderFields: (close: () => void) => React.ReactNode;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.timeSheetOpen);
    // The Drawer slides, and tells its end, only on a change of `opened` after its portal has drawn
    // it closed, so a sheet that comes up with the dock opens a frame later. An effect alone is too
    // soon: it runs before the portal's first draw, and both land in one render.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setMounted(true);
        });
        return () => {
            cancelAnimationFrame(frame);
        };
    }, []);
    const close = (): void => {
        store.set({ timeSheetOpen: false });
    };
    // A sheet left up as the window widens must not come back on the next phone-sized one.
    useEffect(
        () => () => {
            store.set({ timeSheetOpen: false });
        },
        [store],
    );
    return (
        <>
            <Group gap={0} wrap="nowrap" className="tl-phone-row">
                {transport}
                <UnstyledButton
                    className="tl-readout"
                    data-testid="time-readout"
                    aria-label={`Time window ${readout}`}
                    aria-haspopup="dialog"
                    aria-expanded={opened}
                    onClick={onOpen}
                >
                    {readout}
                </UnstyledButton>
            </Group>
            <SparklineRow {...line} />
            <Drawer
                opened={opened && mounted}
                onClose={close}
                onEnterTransitionEnd={focusWindowStart}
                position="bottom"
                title="Time window"
                classNames={{ content: "tl-sheet-content", close: "tl-sheet-close" }}
                closeButtonProps={{ "aria-label": "Close Time window" }}
            >
                {/* The dock's class, so its pinch and its touch rules hold here as well. */}
                <div className="tl-dock tl-sheet">
                    <Group gap={4} wrap="nowrap">
                        {tools}
                    </Group>
                    {chart}
                    {renderFields(close)}
                </div>
            </Drawer>
        </>
    );
}
