import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, EffectToggle } from "../../src";

describe("EffectToggle", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={false} onChange={vi.fn()}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );
        expect(screen.getByLabelText("Enable Glow")).toBeInTheDocument();
    });

    it("hides children when unchecked", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={false} onChange={vi.fn()}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );
        expect(screen.queryByText("Glow settings")).not.toBeInTheDocument();
    });

    it("shows children when checked", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={true} onChange={vi.fn()}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );
        expect(screen.getByText("Glow settings")).toBeInTheDocument();
    });

    it("calls onChange when checkbox clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={false} onChange={onChange}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );

        await user.click(screen.getByRole("checkbox"));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it("has children container with test id when checked", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={true} onChange={vi.fn()}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );
        expect(screen.getByTestId("effect-toggle-children")).toBeInTheDocument();
    });

    it("renders checkbox as checked when checked prop is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <EffectToggle label="Enable Glow" checked={true} onChange={vi.fn()}>
                    <div>Glow settings</div>
                </EffectToggle>
            </MantineProvider>,
        );
        expect(screen.getByRole("checkbox")).toBeChecked();
    });
});
