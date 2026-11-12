/**
 * The reset beside a field (a ResetButton in a FieldRow) or a CompactColorInput is an icon-only button, so
 * it says what it does on hover, not only to a screen reader. Real Chromium, so the tooltip opens.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { CompactColorInput } from "../../src/components/CompactColorInput";
import { PopoutManager } from "../../src/components/popout";
import { FieldRow } from "../../src/components/rows/FieldRow";
import { PanelField } from "../../src/components/rows/PanelField";
import { ResetButton } from "../../src/components/rows/TrailingSlot";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

describe("an icon-only reset button", () => {
    it.each([
        [
            "select field",
            <FieldRow key="select" trailing={<ResetButton label="Shape" />}>
                <PanelField
                    label="Shape"
                    kind="select"
                    value="square"
                    data={[
                        { value: "circle", label: "Circle" },
                        { value: "square", label: "Square" },
                    ]}
                />
            </FieldRow>,
        ],
        [
            "number field",
            <FieldRow key="number" trailing={<ResetButton label="Shape" />}>
                <PanelField label="Shape" kind="number" value={3} />
            </FieldRow>,
        ],
        ["CompactColorInput", <CompactColorInput key="color" label="Shape" color="#00FF00" defaultColor="#FF0000" />],
    ])("shows its action as a tooltip on a %s", async (_name, control) => {
        await renderThemed(
            <PopoutManager>
                <div style={{ width: 240 }}>{control}</div>
            </PopoutManager>,
        );
        await userEvent.hover(screen.getByRole("button", { name: "Reset Shape to default" }));
        expect((await screen.findByRole("tooltip", {})).textContent).toBe("Reset Shape to default");
    });

    it("says the caller's whole name, in its tooltip too, when one is given", async () => {
        await renderThemed(
            <FieldRow trailing={<ResetButton label="Palette" fullLabel="Reset the node color palette to default" />}>
                <PanelField label="Palette" kind="number" value={3} />
            </FieldRow>,
        );
        await userEvent.hover(screen.getByRole("button", { name: "Reset the node color palette to default" }));
        expect((await screen.findByRole("tooltip", {})).textContent).toBe("Reset the node color palette to default");
    });
});
