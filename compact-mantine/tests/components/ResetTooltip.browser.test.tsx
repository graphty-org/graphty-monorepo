/**
 * The reset beside a StyleSelect, StyleNumberInput or CompactColorInput is an icon-only button, so
 * it says what it does on hover, not only to a screen reader. Real Chromium, so the tooltip opens.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { CompactColorInput } from "../../src/components/CompactColorInput";
import { PopoutManager } from "../../src/components/popout";
import { StyleNumberInput } from "../../src/components/StyleNumberInput";
import { StyleSelect } from "../../src/components/StyleSelect";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

describe("an icon-only reset button", () => {
    it.each([
        [
            "StyleSelect",
            <StyleSelect
                key="select"
                label="Shape"
                value="square"
                defaultValue="circle"
                options={[
                    { value: "circle", label: "Circle" },
                    { value: "square", label: "Square" },
                ]}
            />,
        ],
        ["StyleNumberInput", <StyleNumberInput key="number" label="Shape" value={3} defaultValue={1} />],
        ["CompactColorInput", <CompactColorInput key="color" label="Shape" color="#00FF00" defaultColor="#FF0000" />],
    ])("shows its action as a tooltip on a %s", async (_name, control) => {
        await renderThemed(
            <PopoutManager>
                <div style={{ width: 240 }}>{control}</div>
            </PopoutManager>,
        );
        await userEvent.hover(screen.getByRole("button", { name: "Reset Shape to default" }));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe("Reset Shape to default");
    });
});
