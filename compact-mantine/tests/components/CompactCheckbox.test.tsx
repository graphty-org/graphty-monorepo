import { Checkbox, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../src";

describe("Checkbox with default size (sm)", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Checkbox label="Test Checkbox" />
            </MantineProvider>,
        );
        expect(screen.getByLabelText("Test Checkbox")).toBeInTheDocument();
    });

    it("renders unchecked by default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Checkbox label="Test" />
            </MantineProvider>,
        );
        expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("renders checked when checked prop is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Checkbox label="Test" checked onChange={() => {}} />
            </MantineProvider>,
        );
        expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("calls onChange when clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <Checkbox label="Test" onChange={onChange} />
            </MantineProvider>,
        );

        await user.click(screen.getByRole("checkbox"));
        expect(onChange).toHaveBeenCalled();
    });

    it("applies default sm size styling", () => {
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <Checkbox label="Test" />
            </MantineProvider>,
        );
        // The checkbox should have sm size attribute by default
        expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
    });
});
