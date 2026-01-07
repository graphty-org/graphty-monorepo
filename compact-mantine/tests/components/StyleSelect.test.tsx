import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, StyleSelect } from "../../src";

const options = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
];

describe("StyleSelect", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        expect(screen.getByText("Select")).toBeInTheDocument();
    });

    it("shows default value when value is undefined", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("value", "Option 1");
    });

    it("shows explicit value when provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value="option2"
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("value", "Option 2");
    });

    it("shows italic styling for default value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(getComputedStyle(select).fontStyle).toBe("italic");
    });

    it("hides reset button when using default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("shows reset button when explicit value set", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value="option2"
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("calls onChange with undefined when reset clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value="option2"
                    defaultValue="option1"
                    options={options}
                    onChange={onChange}
                />
            </MantineProvider>,
        );

        await user.click(screen.getByRole("button", { name: /reset/i }));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("has data-is-default attribute when using default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value={undefined}
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("data-is-default", "true");
    });

    it("has data-is-default=false when using explicit value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleSelect
                    label="Select"
                    value="option2"
                    defaultValue="option1"
                    options={options}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const select = screen.getByRole("textbox", { name: "Select" });
        expect(select).toHaveAttribute("data-is-default", "false");
    });
});
