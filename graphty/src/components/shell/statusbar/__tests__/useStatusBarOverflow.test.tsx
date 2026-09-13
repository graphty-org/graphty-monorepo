import { describe, expect, it } from "vitest";

import { render, screen, waitFor } from "../../../../test/test-utils";
import { STATUS_BAR_DROP_ORDER, STATUS_BAR_NEVER_DROP } from "../../constants";
import type { StatusBarSlotId } from "../../types";
import { STATUS_BAR_GEOMETRY } from "../statusBarGeometry";
import { statusBarDrops, useStatusBarOverflow } from "../useStatusBarOverflow";

interface HarnessSlot {
    id: StatusBarSlotId;
    width: number;
}

function Harness({ barWidth, slots }: { barWidth: number; slots: HarnessSlot[] }) {
    const overflow = useStatusBarOverflow();

    return (
        <div
            data-testid="bar"
            ref={overflow.barRef}
            style={{
                width: barWidth,
                display: "flex",
                alignItems: "center",
                gap: STATUS_BAR_GEOMETRY.SLOT_GAP,
                padding: `0 ${STATUS_BAR_GEOMETRY.PADDING_X}px`,
                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            <div data-testid="counts" style={{ flex: "0 0 auto", width: 100 }}>
                counts
            </div>
            {slots
                .filter((slot) => !overflow.droppedSlots.includes(slot.id))
                .map((slot) => (
                    <div
                        data-testid={slot.id}
                        key={slot.id}
                        ref={overflow.measureSlot(slot.id)}
                        style={{ flex: "0 0 auto", width: slot.width }}
                    >
                        {slot.id}
                    </div>
                ))}
            <div data-status-spacer="true" style={{ flex: "1 1 auto" }} />
        </div>
    );
}

describe("useStatusBarOverflow", () => {
    describe("statusBarDrops", () => {
        it("drops nothing when the content fits", () => {
            expect(statusBarDrops(400, 300, { ai: 60, zoom: 70 })).toEqual([]);
        });

        it("drops AI status first", () => {
            expect(statusBarDrops(300, 320, { ai: 60, layout: 80, zoom: 70, viewing: 90 })).toEqual(["ai"]);
        });

        it("drops in the documented order until the content fits", () => {
            expect(statusBarDrops(150, 320, { ai: 60, layout: 80, zoom: 70, viewing: 90 })).toEqual([
                "ai",
                "layout",
                "zoom",
            ]);
        });

        it("follows STATUS_BAR_DROP_ORDER exactly", () => {
            const widths = { ai: 1, layout: 1, zoom: 1, viewing: 1 };

            expect(statusBarDrops(0.5, 100, widths)).toEqual([...STATUS_BAR_DROP_ORDER]);
        });

        it("never drops counts, the running slot or the issues chip", () => {
            const widths = { ai: 10, counts: 999, issues: 999, running: 999 };
            const dropped = statusBarDrops(1, 5000, widths);

            for (const slot of STATUS_BAR_NEVER_DROP) {
                expect(dropped).not.toContain(slot);
            }
        });

        it("skips a slot whose width has never been measured", () => {
            expect(statusBarDrops(100, 320, { zoom: 300 })).toEqual(["zoom"]);
        });

        it("reports nothing when the bar has not been laid out", () => {
            expect(statusBarDrops(0, 320, { ai: 60 })).toEqual([]);
        });
    });

    describe("measuring a real bar", () => {
        it("drops nothing when every slot fits", async () => {
            render(
                <Harness
                    barWidth={600}
                    slots={[
                        { id: "zoom", width: 60 },
                        { id: "ai", width: 50 },
                    ]}
                />,
            );

            await waitFor(() => {
                expect(screen.getByTestId("ai")).toBeInTheDocument();
            });
            expect(screen.getByTestId("zoom")).toBeInTheDocument();
        });

        it("drops AI status, then zoom, when the bar is too narrow for both", async () => {
            render(
                <Harness
                    barWidth={200}
                    slots={[
                        { id: "zoom", width: 60 },
                        { id: "ai", width: 50 },
                    ]}
                />,
            );

            await waitFor(() => {
                expect(screen.queryByTestId("ai")).toBeNull();
            });
            await waitFor(() => {
                expect(screen.queryByTestId("zoom")).toBeNull();
            });
            expect(screen.getByTestId("counts")).toBeInTheDocument();
        });

        it("settles rather than dropping everything once a slot has gone", async () => {
            render(
                <Harness
                    barWidth={260}
                    slots={[
                        { id: "zoom", width: 60 },
                        { id: "ai", width: 50 },
                    ]}
                />,
            );

            await waitFor(() => {
                expect(screen.queryByTestId("ai")).toBeNull();
            });
            expect(screen.getByTestId("zoom")).toBeInTheDocument();
        });
    });
});
