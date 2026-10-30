/**
 * A toggle's tooltip can say what it does in other words than its accessible name: a row's eye
 * reads "Turn this layer off" on hover and keeps the row's own name for a screen reader.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { ToggleIconButton } from "../../src/components/buttons/ToggleIconButton";
import { UiGlyph } from "../../src/icons";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

describe("ToggleIconButton's tooltip", () => {
    it("shows its own words on hover and keeps the label as the accessible name", async () => {
        await renderThemed(
            <ToggleIconButton label="Hide Degree" tooltip="Turn this layer off" icon={<UiGlyph name="lock" />} />,
        );
        const button = screen.getByRole("button", { name: "Hide Degree" });
        await userEvent.hover(button);
        expect((await screen.findByRole("tooltip", {})).textContent).toBe("Turn this layer off");
    });

    it("shows the label when no tooltip is given", async () => {
        await renderThemed(<ToggleIconButton label="Lock aspect ratio" icon={<UiGlyph name="lock" />} />);
        await userEvent.hover(screen.getByRole("button", { name: "Lock aspect ratio" }));
        expect((await screen.findByRole("tooltip", {})).textContent).toBe("Lock aspect ratio");
    });
});
