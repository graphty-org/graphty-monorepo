/**
 * A metric row under the real mouse: a Shift-click and a right click made by the browser, so the
 * event a consumer reads carries what a reader's own click carries.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, MetricRow } from "../../../src";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderChart(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Click with Shift held, as a range or multiple selection does.
 * @param element - what is clicked
 */
async function shiftClick(element: Element): Promise<void> {
    await userEvent.keyboard("{Shift>}");
    await userEvent.click(element);
    await userEvent.keyboard("{/Shift}");
}

describe("MetricRow events under the real mouse", () => {
    it("carries the modifier keys a multiple selection needs", async () => {
        const onClick = vi.fn();
        renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

        await shiftClick(screen.getByRole("button", { name: /Betweenness/ }));

        const [event, meta] = onClick.mock.calls[0];
        expect(event.shiftKey).toBe(true);
        expect(meta.source).toBe("pointer");
    });

    it("reports a right click, so a consumer can put its own menu there", async () => {
        const onContextMenu = vi.fn();
        renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onContextMenu={onContextMenu} />);

        await userEvent.click(screen.getByTestId("metric-row"), { button: "right" });

        expect(onContextMenu).toHaveBeenCalledTimes(1);
    });
});
