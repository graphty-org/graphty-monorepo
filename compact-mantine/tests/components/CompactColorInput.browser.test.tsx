/**
 * What a screen reader hears from the color field, read through the browser's own accessibility
 * tree (Playwright's role queries) and driven with real pointer and keyboard input: every control
 * names the property it sets, taken from the field's label, and the hex box exposes the value.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React, { useState } from "react";
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

        const hex = page.getByRole("textbox", { name: "Fill color, not set, drawn #3B82F6", exact: true });
        await expect.element(hex).toHaveValue("3B82F6");
        await expect.element(page.getByRole("textbox", { name: "Fill opacity", exact: true })).toHaveValue("100");

        const swatch = page.getByRole("button", { name: "Pick fill color", exact: true });
        await expect.element(swatch).toHaveAttribute("aria-expanded", "false");
        await expect.element(page.getByRole("button", { name: /swatch/i })).not.toBeInTheDocument();
    });

    it("keeps the hex and drops the opacity box when the field is too narrow for both", async () => {
        renderField(<CompactColorInput label="Fill" defaultColor="#3B82F6" width={80} />);

        const hex = page.getByRole("textbox", { name: "Fill color, not set, drawn #3B82F6", exact: true });
        await expect.element(hex).toBeVisible();
        await expect.element(page.getByRole("textbox", { name: "Fill opacity", exact: true })).not.toBeInTheDocument();
    });

    it("does not double the word color when the label already says it", async () => {
        renderField(<CompactColorInput label="Text color" defaultColor="#000000" showOpacity={false} />);

        await expect.element(page.getByRole("textbox", { name: /^Text color(,|$)/ })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick text color", exact: true })).toBeVisible();
    });

    it("names its controls from aria-label without drawing a label", async () => {
        renderField(<CompactColorInput aria-label="Edge color" defaultColor="#000000" />);

        await expect.element(page.getByRole("textbox", { name: /^Edge color(,|$)/ })).toHaveValue("000000");
        await expect.element(page.getByRole("button", { name: "Pick edge color", exact: true })).toBeVisible();
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

        const swatch = page.getByRole("button", { name: "Pick fill color", exact: true });
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
    it("opens its picker, from the swatch or the chip, focused on the picker itself (Figma); its value box takes a hex", async () => {
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
            const panel = page.getByTestId("color-picker-panel");
            await expect.poll(() => panel.element().closest(".cm-popout")?.contains(document.activeElement)).toBe(true);
            const value = page.getByTestId("color-picker-value");
            expect(document.activeElement).not.toBe(value.element());
            await userEvent.click(value);
            await userEvent.keyboard("{Control>}a{/Control}FF00FF{Enter}");
            await expect.poll(() => picked).toBe("#FF00FF");
            unmount();
        }
    });
});

describe("a Mixed color field", () => {
    it("draws a swatch that opens the picker, takes a color by name, and goes back on words that name none", async () => {
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
        const swatch = page.getByRole("button", { name: "Pick fill color", exact: true });
        await expect.element(swatch).toHaveAttribute("data-mixed");
        await userEvent.click(swatch);
        await expect.element(page.getByTestId("color-picker-value")).toBeVisible();
        await userEvent.keyboard("{Escape}");

        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("blu{Enter}");
        await expect.element(hex).toHaveValue("");
        await expect.element(hex).not.toHaveAttribute("aria-invalid");
        assert.isUndefined(picked, "words that name no color write nothing");

        await userEvent.keyboard("blue{Enter}");
        await expect.poll(() => picked).toBe("#0000FF");
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
        // Said aloud, so a screen reader knows the typing is gone and the color kept.
        await expect.element(page.getByRole("status")).toHaveTextContent("Edit discarded; this stays 2E8B57.");
        // Never drawn: Figma shows nothing when an edit is discarded.
        expect(page.getByText("Edit discarded; this stays 2E8B57.", { exact: true }).elements()).toHaveLength(1);
        // The value is selected again, so what is typed next replaces it.
        await userEvent.keyboard("FF0000{Enter}");
        expect(chosen).toEqual(["#FF0000"]);
    });

    it("Enter on words that name no color goes back to the value, as Figma does, and says why aloud", async () => {
        renderField(<CompactColorInput label="Node" defaultColor="#2E8B57" showOpacity={false} />);
        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}dark greer{Enter}");
        await expect.element(hex).toHaveValue("2E8B57");
        await expect.element(hex).not.toHaveAttribute("aria-invalid");
        await expect
            .element(page.getByRole("status"))
            .toHaveTextContent('"dark greer" is not a color, so this stays 2E8B57');
        expect(document.querySelector('[role="alert"]')).toBeNull();

        await userEvent.keyboard("{Control>}a{/Control}seagreen{Enter}");
        await expect.element(hex).toHaveValue("2E8B57");
    });

    it("takes a color keyword written as words, in any case", async () => {
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
        await userEvent.keyboard("dark green{Enter}");
        await expect.element(hex).toHaveValue("006400");
        await userEvent.keyboard("Rebecca Purple{Enter}");
        await expect.element(hex).toHaveValue("663399");
        expect(chosen).toEqual(["#006400", "#663399"]);
    });

    it("draws nothing under the field after a refusal", async () => {
        renderField(
            <div style={{ width: 200 }}>
                <CompactColorInput
                    label="Background color"
                    color="#FF0000"
                    defaultColor="#F5F5F5"
                    showOpacity={false}
                />
            </div>,
        );
        const row = page.getByTestId("compact-color-input").element();
        const before = row.getBoundingClientRect().height;
        await userEvent.click(page.getByTestId("compact-color-input-hex"));
        await userEvent.keyboard("dark greer{Enter}");
        expect(row.getBoundingClientRect().height).toBe(before);
        const field = page.getByTestId("compact-color-input-field").element();
        expect(getComputedStyle(field).borderTopColor).not.toBe("rgb(220, 52, 18)");
    });

    it("shows Figma's arrow over the hex box at rest and the text cursor once it is focused", async () => {
        renderField(<CompactColorInput label="Node" defaultColor="#2E8B57" />);
        const hex = page.getByTestId("compact-color-input-hex").element();
        expect(getComputedStyle(hex).cursor).toBe("default");
        await userEvent.click(hex);
        expect(getComputedStyle(hex).cursor).toBe("text");
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
        await expect
            .element(page.getByRole("status"))
            .toHaveTextContent('"orang" is not a color, so this stays 2E8B57');
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
        await userEvent.click(page.getByRole("button", { name: "Pick node color", exact: true }));
        const value = page.getByRole("textbox", { name: "Color value", exact: true });
        await userEvent.click(value);
        await userEvent.keyboard("{Control>}a{/Control}blue{Enter}");
        await expect.poll(() => picked).toBe("#0000FF");
        await expect.element(page.getByTestId("compact-color-input-hex")).toHaveValue("0000FF");
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
        await userEvent.click(page.getByRole("button", { name: "Pick node color", exact: true }));
        const current = page.getByRole("button", { name: "green 61D095", exact: true });
        const other = page.getByRole("button", { name: "blue 5B8FF9", exact: true });
        await expect.element(current).toHaveAttribute("aria-pressed", "true");
        // Said, never drawn: Figma marks no swatch.
        expect(getComputedStyle(current.element()).outlineColor).toBe("rgba(0, 0, 0, 0)");
        await expect.element(other).toHaveAttribute("aria-pressed", "false");
        await userEvent.hover(other);
        await expect.element(page.getByRole("tooltip")).toHaveTextContent("blue 5B8FF9");
    });

    it("shows exactly the swatches passed in, as they change", async () => {
        /**
         * A field whose swatches are the colors in use, as an application offers them: picking one
         * replaces the old color in the set.
         * @returns the field
         */
        function InUse(): React.JSX.Element {
            const [color, setColor] = useState("#6366F1");
            return (
                <CompactColorInput
                    label="Node"
                    color={color}
                    defaultColor="#6366F1"
                    showOpacity={false}
                    swatches={[color, "#999999", "#FFD400"].filter((c, i, all) => all.indexOf(c) === i)}
                    onChangeEnd={(next) => {
                        setColor(next ?? "#6366F1");
                    }}
                />
            );
        }
        renderField(<InUse />);
        await userEvent.click(page.getByRole("button", { name: "Pick node color", exact: true }));
        const names = (): string[] =>
            [...document.querySelectorAll(".cm-color-swatch-button")].map((b) => b.getAttribute("aria-label") ?? "");
        await expect.poll(names).toEqual(["indigo 6366F1", "gray 999999", "yellow FFD400"]);
        await userEvent.click(page.getByRole("button", { name: "yellow FFD400", exact: true }));
        await expect.poll(names).toEqual(["yellow FFD400", "gray 999999"]);
    });
});

describe("CompactColorInput's picker swatches and Enter", () => {
    const names = (): string[] =>
        [...document.querySelectorAll(".cm-color-swatch-button")].map((b) => b.getAttribute("aria-label") ?? "");

    it("offers the same swatches on every opening, and never adds the shown color", async () => {
        renderField(
            <CompactColorInput
                label="Line"
                defaultColor="#6366F1"
                showOpacity={false}
                swatches={["#999999", "#FFD400"]}
            />,
        );
        const trigger = page.getByRole("button", { name: "Pick line color", exact: true });
        await userEvent.click(trigger);
        await expect.poll(names).toEqual(["gray 999999", "yellow FFD400"]);
        const first = names();
        await userEvent.click(page.getByTestId("popout-header-close"));
        await expect.element(page.getByTestId("color-picker-panel")).not.toBeInTheDocument();
        await userEvent.click(trigger);
        await expect.poll(names).toEqual(first);
    });

    it("never names a swatch as the color before the edit", async () => {
        renderField(<CompactColorInput label="Line" color="#0000FF" defaultColor="#6366F1" showOpacity={false} />);
        await userEvent.click(page.getByRole("button", { name: "Pick line color", exact: true }));
        await expect.poll(() => names().length).toBeGreaterThan(0);
        assert.isFalse(names().some((name) => name.includes("starting") || name.includes("before this edit")));
    });

    it("Enter in the picker's value box applies the color and keeps the picker open (Figma)", async () => {
        let picked: string | undefined;
        renderField(
            <CompactColorInput
                label="Line"
                defaultColor="#6366F1"
                showOpacity={false}
                onChangeEnd={(color) => {
                    picked = color;
                }}
            />,
        );
        const trigger = page.getByRole("button", { name: "Pick line color", exact: true });
        await userEvent.click(trigger);
        const value = page.getByRole("textbox", { name: "Color value", exact: true });
        await userEvent.click(value);
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await expect.poll(() => picked).toBe("#FF0000");
        await expect.element(page.getByTestId("color-picker-panel")).toBeVisible();
        expect(document.activeElement).toBe(value.element());
    });
});

describe("CompactColorInput replacing its value", () => {
    /**
     * A field that records each color it settles on.
     * @returns the hex box and the colors it settled on
     */
    function field(): { hex: ReturnType<typeof page.getByTestId>; chosen: (string | undefined)[] } {
        const chosen: (string | undefined)[] = [];
        renderField(
            <CompactColorInput
                label="Node"
                defaultColor="#FFA500"
                showOpacity={false}
                onChangeEnd={(color) => {
                    chosen.push(color);
                }}
            />,
        );
        return { hex: page.getByTestId("compact-color-input-hex"), chosen };
    }

    it("selects the whole value on a click into the focused box, so typing replaces it", async () => {
        const { hex, chosen } = field();
        await userEvent.click(hex);
        await userEvent.keyboard("orang{Escape}");
        await userEvent.click(hex);
        await userEvent.keyboard("red{Enter}");
        expect(chosen).toEqual(["#FF0000"]);
        await expect.element(hex).toHaveValue("FF0000");
    });

    it("keeps the caret where a click puts it while the box holds typing", async () => {
        const { hex } = field();
        await userEvent.click(hex);
        await userEvent.keyboard("abc");
        await userEvent.click(hex);
        const input = hex.element() as HTMLInputElement;
        expect(input.selectionStart).toBe(input.selectionEnd);
        await expect.element(hex).toHaveValue("abc");
    });

    it("leaves the value selected after Enter, so the next color typed replaces it", async () => {
        const { hex, chosen } = field();
        await userEvent.click(hex);
        await userEvent.keyboard("blue{Enter}");
        await expect.element(hex).toHaveValue("0000FF");
        await expect.element(hex).toHaveAttribute("data-committed");
        await userEvent.keyboard("red{Enter}");
        expect(chosen).toEqual(["#0000FF", "#FF0000"]);
        await userEvent.keyboard("g");
        await expect.element(hex).not.toHaveAttribute("data-committed");
    });

    it("drops a refusal when the value changes and when focus moves on after it", async () => {
        /**
         * A field whose color a button outside it sets, as an undo does, among other controls. They
         * come before it, so the message drawn under the field does not move them under a click.
         * @returns the field and the button
         */
        function Outside(): React.JSX.Element {
            const [color, setColor] = useState("#FFA500");
            return (
                <>
                    <button
                        type="button"
                        onClick={() => {
                            setColor("#00FF00");
                        }}
                    >
                        Undo
                    </button>
                    <input aria-label="Other" />
                    <CompactColorInput label="Node" color={color} defaultColor="#FFA500" showOpacity={false} />
                </>
            );
        }
        renderField(<Outside />);
        const hex = page.getByTestId("compact-color-input-hex");
        await userEvent.click(hex);
        const said = (): string =>
            [...document.querySelectorAll('[role="status"]')].map((n) => n.textContent ?? "").join("");
        await userEvent.keyboard("orang{Enter}");
        await expect.poll(said).toContain("orang");
        await userEvent.click(page.getByRole("button", { name: "Undo", exact: true }));
        await expect.poll(said).not.toContain("orang");

        await userEvent.click(hex);
        await userEvent.keyboard("orang");
        await userEvent.tab();
        // Leaving says why the box went back; the move after that clears it.
        await expect.poll(said).toContain("so this stays 00FF00");
        expect(document.activeElement).not.toBe(hex.element());
        await userEvent.click(page.getByRole("textbox", { name: "Other" }));
        await expect.poll(said).not.toContain("orang");
    });

    it("reads the caller's color words beside the hex in the box's name", async () => {
        renderField(<CompactColorInput aria-label="Node" color="#FF0000" defaultColor="#FF0000" valueText="red" />);
        await expect
            .element(page.getByRole("textbox", { name: "Node color, set here, red", exact: true }))
            .toHaveValue("FF0000");
    });
});

describe("CompactColorInput reset", () => {
    it("sits beside its field in a row narrower than the field, never on a line of its own", async () => {
        renderField(
            <div data-testid="row" style={{ width: 200 }}>
                <CompactColorInput
                    label="Background color"
                    color="#FF0000"
                    defaultColor="#F5F5F5"
                    showOpacity={false}
                />
            </div>,
        );
        const reset = page.getByRole("button", { name: /Reset/ });
        await expect.element(reset).toBeVisible();
        const field = document.querySelector('[data-testid="compact-color-input-field"]');
        assert(field !== null);
        const resetBox = reset.element().getBoundingClientRect();
        const fieldBox = field.getBoundingClientRect();
        expect(Math.abs(resetBox.top + resetBox.height / 2 - (fieldBox.top + fieldBox.height / 2))).toBeLessThan(1);
        const row = document.querySelector('[data-testid="row"]')?.getBoundingClientRect();
        expect(resetBox.right).toBeLessThanOrEqual((row?.right ?? 0) + 0.5);
        expect(resetBox.left).toBeGreaterThanOrEqual(fieldBox.right);
    });
});
