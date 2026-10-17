/**
 * What a screen reader hears from the color field, read through the browser's own accessibility
 * tree (Playwright's role queries) and driven with real pointer and keyboard input: every control
 * names the property it sets, taken from the field's label, and the hex box exposes the value.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { assert, describe, expect, it } from "vitest";
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

        const hex = page.getByRole("textbox", { name: "Fill color, not set, #3B82F6", exact: true });
        await expect.element(hex).toHaveValue("3B82F6");
        await expect.element(page.getByRole("textbox", { name: "Fill opacity", exact: true })).toHaveValue("100");

        const swatch = page.getByRole("button", { name: "Pick Fill color", exact: true });
        await expect.element(swatch).toHaveAttribute("aria-expanded", "false");
        await expect.element(page.getByRole("button", { name: /swatch/i })).not.toBeInTheDocument();
    });

    it("does not double the word color when the label already says it", async () => {
        renderField(<CompactColorInput label="Text color" defaultColor="#000000" showOpacity={false} />);

        await expect.element(page.getByRole("textbox", { name: /^Text color(,|$)/ })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick Text color", exact: true })).toBeVisible();
    });

    it("names its controls from aria-label without drawing a label", async () => {
        renderField(<CompactColorInput aria-label="Edge color" defaultColor="#000000" />);

        await expect.element(page.getByRole("textbox", { name: /^Edge color(,|$)/ })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick Edge color", exact: true })).toBeVisible();
        await expect.element(page.getByRole("textbox", { name: "Edge color opacity", exact: true })).toBeVisible();
        await expect.element(page.getByText("Edge color", { exact: true })).not.toBeInTheDocument();
    });

    it("announces a newly typed value on the same named box", async () => {
        renderField(<CompactColorInput label="Fill" defaultColor="#3B82F6" />);

        const hex = page.getByRole("textbox", { name: /^Fill color(,|$)/ });
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

describe("CompactColorInput empty words", () => {
    it("shows the words in an empty hex box until a color is typed, and typing the default chooses it", async () => {
        const chosen: (string | undefined)[] = [];
        renderField(
            <CompactColorInput
                label="Head"
                defaultColor="#808080"
                emptyText="Line color"
                showOpacity={false}
                onChangeEnd={(color) => {
                    chosen.push(color);
                }}
            />,
        );

        const hex = page.getByRole("textbox", { name: /^Head color(,|$)/ });
        await expect.element(hex).toHaveValue("");
        await expect.element(hex).toHaveAttribute("placeholder", "Line color");
        await userEvent.click(hex);
        await userEvent.keyboard("808080{Enter}");
        expect(chosen).toEqual(["#808080"]);
        await expect.element(hex).toHaveValue("808080");
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

describe("CompactColorInput picker focus", () => {
    it("opens its picker, from the swatch or the chip, with focus in the value box so a typed hex sets it", async () => {
        for (const variant of ["field", "chip"] as const) {
            let picked: string | undefined;
            const { unmount } = render(
                <MantineProvider theme={compactTheme}>
                    <PopoutManager>
                        <CompactColorInput
                            aria-label="Glow"
                            variant={variant}
                            defaultColor="#000000"
                            showOpacity={false}
                            onChangeEnd={(color) => {
                                picked = color;
                            }}
                        />
                    </PopoutManager>
                </MantineProvider>,
            );
            const opener =
                variant === "chip"
                    ? page.getByTestId("compact-color-input-chip")
                    : page.getByTestId("compact-color-input-swatch");
            await userEvent.click(opener);
            const value = page.getByTestId("color-picker-value");
            await expect.poll(() => document.activeElement === value.element()).toBe(true);
            await userEvent.keyboard("FF00FF{Enter}");
            await expect.poll(() => picked).toBe("#FF00FF");
            unmount();
        }
    });
});

describe("a Mixed color field", () => {
    it("draws a swatch that opens the picker, takes a color by name, and marks words that name none", async () => {
        let picked: string | undefined;
        renderField(
            <CompactColorInput
                label="Fill"
                mixed
                defaultColor="#999999"
                showOpacity={false}
                onChangeEnd={(color) => {
                    picked = color;
                }}
            />,
        );
        const swatch = page.getByRole("button", { name: "Pick Fill color", exact: true });
        await expect.element(swatch).toHaveAttribute("data-mixed");
        await userEvent.click(swatch);
        await expect.element(page.getByTestId("color-picker-value")).toBeVisible();
        await userEvent.keyboard("{Escape}");

        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("blu{Enter}");
        await expect.element(hex).toHaveAttribute("aria-invalid", "true");
        await expect.element(hex).toHaveValue("blu");
        assert.isUndefined(picked, "words that name no color write nothing");

        await userEvent.clear(hex);
        await userEvent.keyboard("blue{Enter}");
        await expect.poll(() => picked).toBe("#0000FF");
        await expect.element(hex).not.toHaveAttribute("aria-invalid");
    });
});

describe("CompactColorInput refusals and Escape", () => {
    it("Escape takes back what was typed and keeps focus in the hex box", async () => {
        const chosen: (string | undefined)[] = [];
        renderField(
            <CompactColorInput
                label="Node"
                defaultColor="#2E8B57"
                showOpacity={false}
                onChangeEnd={(color) => {
                    chosen.push(color);
                }}
            />,
        );
        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}123456{Escape}");
        await expect.element(hex).toHaveValue("2E8B57");
        expect(document.activeElement).toBe(hex.element());
        expect(chosen).toEqual([]);
        // The value is selected again, so what is typed next replaces it.
        await userEvent.keyboard("FF0000{Enter}");
        expect(chosen).toEqual(["#FF0000"]);
    });

    it("says on screen and in the hex box's description why Enter refused the words", async () => {
        renderField(<CompactColorInput label="Node" defaultColor="#2E8B57" showOpacity={false} />);
        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}dark green{Enter}");
        const message = page.getByRole("alert");
        await expect.element(message).toHaveTextContent('"dark green" is not a color');
        await expect.element(message).toHaveTextContent("a color name or a hex code such as 2E8B57");
        await expect.element(hex).toHaveAttribute("aria-invalid", "true");
        await expect.element(hex).toHaveAccessibleDescription(/"dark green" is not a color/);

        await userEvent.keyboard("{Control>}a{/Control}seagreen{Enter}");
        await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
        await expect.element(hex).toHaveValue("2E8B57");
    });

    it("leaving with words that name no color goes back to the value and says so", async () => {
        const chosen: (string | undefined)[] = [];
        renderField(
            <CompactColorInput
                label="Node"
                defaultColor="#2E8B57"
                showOpacity={false}
                onChangeEnd={(color) => {
                    chosen.push(color);
                }}
            />,
        );
        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}orang");
        await userEvent.tab();
        await expect.element(hex).toHaveValue("2E8B57");
        await expect.element(page.getByRole("alert")).toHaveTextContent('"orang" is not a color, so this stays 2E8B57');
        await expect.element(hex).not.toHaveAttribute("aria-invalid");
        expect(chosen).toEqual([]);
    });
});

describe("CompactColorInput picker", () => {
    it("takes a color name in the picker's value box, as the hex box does", async () => {
        let picked: string | undefined;
        renderField(
            <CompactColorInput
                label="Node"
                defaultColor="#2E8B57"
                showOpacity={false}
                onChangeEnd={(color) => {
                    picked = color;
                }}
            />,
        );
        await userEvent.click(page.getByRole("button", { name: "Pick Node color", exact: true }));
        const value = page.getByRole("textbox", { name: "Color value", exact: true });
        await expect.poll(() => document.activeElement === value.element()).toBe(true);
        await userEvent.keyboard("blue{Enter}");
        await expect.poll(() => picked).toBe("#0000FF");
        await expect.element(value).toHaveValue("0000FF");
    });

    it("names each swatch on hover and marks the one in force", async () => {
        renderField(
            <CompactColorInput
                label="Node"
                color="#61D095"
                defaultColor="#2E8B57"
                showOpacity={false}
                swatches={["#5B8FF9", "#61D095"]}
            />,
        );
        await userEvent.click(page.getByRole("button", { name: "Pick Node color", exact: true }));
        const current = page.getByRole("button", { name: "#61D095", exact: true });
        const other = page.getByRole("button", { name: "#5B8FF9", exact: true });
        await expect.element(current).toHaveAttribute("aria-pressed", "true");
        await expect.element(other).toHaveAttribute("aria-pressed", "false");
        await userEvent.hover(other);
        await expect.element(page.getByRole("tooltip")).toHaveTextContent("#5B8FF9");
    });
});
