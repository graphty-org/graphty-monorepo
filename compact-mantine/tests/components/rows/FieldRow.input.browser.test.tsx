/**
 * A field row forwards what the real mouse does on it: a Shift-click, a right click and a double
 * click, each made by the browser.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { FieldRow } from "../../../src/components/rows/FieldRow";
import { PanelField } from "../../../src/components/rows/PanelField";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * The pair the stories and the mockups both use: the smallest and the largest
 * node size.
 * @returns The two fields
 */
function pair(): React.JSX.Element[] {
    return [
        <PanelField key="smallest" label="Smallest node size" glyph="sizeSmallest" value="1.0" />,
        <PanelField key="largest" label="Largest node size" glyph="sizeLargest" value="4.0" />,
    ];
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

describe("FieldRow forwarding under the real mouse", () => {
    it("forwards a click, with the event a consumer needs to read modifiers off", async () => {
        const onClick = vi.fn();
        renderRow(<FieldRow onClick={onClick}>{pair()}</FieldRow>);

        await shiftClick(screen.getByTestId("field-row"));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onClick.mock.calls[0]?.[0]).toMatchObject({ shiftKey: true, type: "click" });
    });

    it("forwards a context menu and a double click", async () => {
        const onContextMenu = vi.fn();
        const onDoubleClick = vi.fn();
        renderRow(
            <FieldRow onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
                {pair()}
            </FieldRow>,
        );

        const row = screen.getByTestId("field-row");
        await userEvent.click(row, { button: "right" });
        await userEvent.dblClick(row);

        expect(onContextMenu).toHaveBeenCalledTimes(1);
        expect(onDoubleClick).toHaveBeenCalledTimes(1);
    });
});
