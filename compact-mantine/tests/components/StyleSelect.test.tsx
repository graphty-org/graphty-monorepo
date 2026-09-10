import { DirectionProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { compactTheme, StyleSelect } from "../../src";
import { LabelsProvider } from "../../src/i18n";

const options = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
];

function renderSelect(children: ReactNode, dir: "ltr" | "rtl" = "ltr") {
    return render(
        <DirectionProvider initialDirection={dir} detectDirection={false}>
            <MantineProvider theme={compactTheme}>{children}</MantineProvider>
        </DirectionProvider>,
    );
}

beforeAll(() => {
    // Mantine's Combobox scrolls the highlighted option into view; jsdom has
    // no such method, and without it opening the dropdown throws before the
    // options are rendered.
    if (typeof Element.prototype.scrollIntoView !== "function") {
        Element.prototype.scrollIntoView = () => {};
    }
});

describe("StyleSelect", () => {
    it("renders label", () => {
        renderSelect(
            <StyleSelect label="Select" value={undefined} defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        expect(screen.getByText("Select")).toBeInTheDocument();
    });

    it("shows default value when value is undefined", () => {
        renderSelect(
            <StyleSelect label="Select" value={undefined} defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("value", "Option 1");
    });

    it("shows explicit value when provided", () => {
        renderSelect(
            <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("value", "Option 2");
    });

    it("shows italic styling for default value", () => {
        renderSelect(
            <StyleSelect label="Select" value={undefined} defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(getComputedStyle(select).fontStyle).toBe("italic");
    });

    it("hides reset button when using default", () => {
        renderSelect(
            <StyleSelect label="Select" value={undefined} defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("shows reset button when explicit value set", () => {
        renderSelect(
            <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("has data-is-default attribute when using default", () => {
        renderSelect(
            <StyleSelect label="Select" value={undefined} defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("data-is-default", "true");
    });

    it("has data-is-default=false when using explicit value", () => {
        renderSelect(
            <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("data-is-default", "false");
    });

    describe("accessible name", () => {
        // The control used to carry both a visible <label> and an aria-label
        // repeating it, which replaces name-from-content rather than adding to
        // it. The visible label is now the only source of the name.
        it("takes its name from the visible label rather than an aria-label", () => {
            renderSelect(
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />,
            );
            const select = screen.getByRole("textbox", { name: "Select" });
            expect(select).not.toHaveAttribute("aria-label");
        });

        it("names the reset button from the labels", () => {
            renderSelect(
                <StyleSelect label="Shape" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
            );
            expect(screen.getByRole("button", { name: "Reset Shape to default" })).toBeInTheDocument();
        });

        it("takes the reset button's name from a LabelsProvider override", () => {
            renderSelect(
                <LabelsProvider labels={{ resetToDefault: (label) => `Retablir ${label}` }}>
                    <StyleSelect
                        label="Forme"
                        value="option2"
                        defaultValue="option1"
                        options={options}
                        onChange={vi.fn()}
                    />
                </LabelsProvider>,
            );
            expect(screen.getByRole("button", { name: "Retablir Forme" })).toBeInTheDocument();
        });
    });

    describe("event model", () => {
        it("calls onChange with undefined when reset clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderSelect(
                <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={onChange} />,
            );

            await user.click(screen.getByRole("button", { name: /reset/i }));

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBeUndefined();
        });

        // Contract 1.2: an activation hands the consumer the event, so a
        // modifier key, preventDefault and the target are all reachable.
        it("hands the reset click's event to onChange", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderSelect(
                <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={onChange} />,
            );

            const reset = screen.getByRole("button", { name: /reset/i });
            await user.click(reset);

            // React clears currentTarget once the handler has returned, so
            // the identity of the button is checked through the native event.
            const event = onChange.mock.calls[0][1];
            expect(event).toBeDefined();
            expect(event.type).toBe("click");
            expect(reset.contains(event.nativeEvent.target as Node)).toBe(true);
        });

        it("reports the chosen option", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderSelect(<StyleSelect label="Select" defaultValue="option1" options={options} onChange={onChange} />);

            await user.click(screen.getByRole("textbox", { name: "Select" }));
            // Mantine's dropdown is a Popover whose transition never completes
            // in jsdom, so the option is in the tree but painted `display:
            // none`; it is found with `hidden` and clicked directly.
            fireEvent.click(screen.getByRole("option", { name: "Option 3", hidden: true }));

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe("option3");
        });

        it("forwards focus and blur", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            renderSelect(
                <>
                    <StyleSelect
                        label="Select"
                        defaultValue="option1"
                        options={options}
                        onFocus={onFocus}
                        onBlur={onBlur}
                    />
                    <button type="button">elsewhere</button>
                </>,
            );

            await user.click(screen.getByRole("textbox", { name: "Select" }));
            expect(onFocus).toHaveBeenCalled();

            await user.click(screen.getByRole("button", { name: "elsewhere" }));
            expect(onBlur).toHaveBeenCalled();
        });
    });

    describe("target size and direction", () => {
        // WCAG 2.2 (2.5.8) asks for a 24px target; the reset used to be an
        // 18px "xs" ActionIcon.
        it("draws the reset button at the 24px target size", () => {
            renderSelect(
                <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
            );
            const reset = screen.getByRole("button", { name: /reset/i });
            expect(reset.style.getPropertyValue("--ai-size")).toContain("24");
        });

        it("offsets the reset button along the block axis, not a physical one", () => {
            renderSelect(
                <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
            );
            const reset = screen.getByRole("button", { name: /reset/i });
            expect(reset.style.getPropertyValue("margin-block-end")).toBe("2px");
            expect(reset.style.getPropertyValue("margin-bottom")).toBe("");
        });

        it("renders under a right-to-left direction provider", () => {
            renderSelect(
                <StyleSelect label="Select" value="option2" defaultValue="option1" options={options} onChange={vi.fn()} />,
                "rtl",
            );
            expect(screen.getByRole("textbox", { name: "Select" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
        });
    });

    // Every value editor in the library takes `disabled` and means the same
    // thing by it: unusable, skipped by Tab, and announced as unavailable.
    describe("disabled", () => {
        it("refuses the dropdown and its reset together", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleSelect label="Select" defaultValue="option1" value="option2" options={options} disabled />
                </MantineProvider>,
            );

            expect(screen.getByRole("textbox", { name: "Select" })).toBeDisabled();
            expect(screen.getByTestId("style-select-reset")).toBeDisabled();
        });
    });
});
