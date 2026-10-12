/**
 * What a screen reader hears from the color field, read through the browser's own accessibility
 * tree (Playwright's role queries) and driven with real pointer and keyboard input: every control
 * names the property it sets, taken from the field's label, and the hex box exposes the value.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CompactColorInput, compactTheme, GradientEditor, PopoutManager } from "../../src";

/**
 * Render one element under the providers the color field needs.
 * @param ui - the element to render
 */
function renderField(ui: React.ReactElement): void {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{ui}</PopoutManager>
        </MantineProvider>,
    );
}

describe("CompactColorInput accessible names", () => {
    it("names the hex box after the label, with the hex as its value, and the swatch after what it does", async () => {
        renderField(<CompactColorInput label="Fill" defaultColor="#3B82F6" defaultOpacity={100} />);

        const hex = page.getByRole("textbox", { name: "Fill color", exact: true });
        await expect.element(hex).toHaveValue("3B82F6");
        await expect.element(page.getByRole("textbox", { name: "Fill opacity", exact: true })).toHaveValue("100");

        const swatch = page.getByRole("button", { name: "Pick Fill color", exact: true });
        await expect.element(swatch).toHaveAttribute("aria-expanded", "false");
        await expect.element(page.getByRole("button", { name: /swatch/i })).not.toBeInTheDocument();
    });

    it("does not double the word color when the label already says it", async () => {
        renderField(<CompactColorInput label="Text color" defaultColor="#000000" showOpacity={false} />);

        await expect.element(page.getByRole("textbox", { name: "Text color", exact: true })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick Text color", exact: true })).toBeVisible();
    });

    it("names its controls from aria-label without drawing a label", async () => {
        renderField(<CompactColorInput aria-label="Edge color" defaultColor="#000000" />);

        await expect.element(page.getByRole("textbox", { name: "Edge color", exact: true })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick Edge color", exact: true })).toBeVisible();
        await expect.element(page.getByRole("textbox", { name: "Edge color opacity", exact: true })).toBeVisible();
        await expect.element(page.getByText("Edge color", { exact: true })).not.toBeInTheDocument();
    });

    it("announces a newly typed value on the same named box", async () => {
        renderField(<CompactColorInput label="Fill" defaultColor="#3B82F6" />);

        const hex = page.getByRole("textbox", { name: "Fill color", exact: true });
        await userEvent.click(hex);
        await userEvent.keyboard("FF0000{Enter}");
        await expect.element(hex).toHaveValue("FF0000");
    });

    it("opens the picker from the named swatch by click and by keyboard", async () => {
        renderField(<CompactColorInput label="Fill" defaultColor="#3B82F6" />);

        const swatch = page.getByRole("button", { name: "Pick Fill color", exact: true });
        await userEvent.click(swatch);
        await expect.element(page.getByRole("dialog")).toBeVisible();
        await expect.element(swatch).toHaveAttribute("aria-expanded", "true");

        await userEvent.keyboard("{Escape}");
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

        (swatch.element() as HTMLElement).focus();
        await userEvent.keyboard("{Enter}");
        await expect.element(page.getByRole("dialog")).toBeVisible();
    });
});

describe("GradientEditor stop names", () => {
    it("names each stop's swatch and hex box by the stop's position", async () => {
        renderField(
            <GradientEditor
                defaultStops={[
                    { id: "a", offset: 0, color: "#FF0000" },
                    { id: "b", offset: 1, color: "#0000FF" },
                ]}
            />,
        );

        await expect.element(page.getByRole("textbox", { name: "Stop 2 color", exact: true })).toHaveValue("0000FF");
        const chit = page.getByRole("button", { name: "Edit stop 2 color", exact: true });
        await userEvent.click(chit);
        await expect.element(chit).toHaveAttribute("aria-pressed", "true");
    });
});
