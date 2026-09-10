import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, ToggleWithContent } from "../../src";
import { PANEL_INK } from "../../src/constants/panel";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderToggle(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("ToggleWithContent", () => {
    describe("anatomy", () => {
        it("names the checkbox with the label", () => {
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByRole("checkbox", { name: "Glow" })).toBeInTheDocument();
        });

        it("takes the controls out of the document while the feature is off", () => {
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            // Not merely hidden: nothing inside a feature that is off can be
            // reached by Tab or read out by a screen reader.
            expect(screen.queryByText("Glow settings")).not.toBeInTheDocument();
            expect(screen.queryByTestId("toggle-with-content-children")).not.toBeInTheDocument();
        });

        it("draws the controls when the feature is on", () => {
            renderToggle(
                <ToggleWithContent label="Glow" checked onChange={vi.fn()}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByTestId("toggle-with-content-children")).toHaveTextContent("Glow settings");
        });

        it("indents the controls from the leading edge, not the left one", () => {
            renderToggle(
                <ToggleWithContent label="Glow" checked onChange={vi.fn()}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            const content = screen.getByTestId("toggle-with-content-children");
            expect(content).toHaveStyle({ paddingInlineStart: "8px" });
            expect(content.getAttribute("style")).not.toContain("padding-left");
        });

        it("reports its state on the wrapper for a test or a style hook", () => {
            renderToggle(
                <ToggleWithContent label="Glow" checked onChange={vi.fn()}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByTestId("toggle-with-content")).toHaveAttribute("data-checked", "true");
        });

        it("shortens a long label rather than wrapping it, and keeps the whole string reachable", () => {
            const label = "Glow, halo and outer shadow";
            renderToggle(
                <ToggleWithContent label={label}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
            expect(screen.getByTitle(label)).toBeInTheDocument();
        });
    });

    describe("the value", () => {
        it("keeps its own state when it is not driven from outside", async () => {
            const user = userEvent.setup();
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.click(screen.getByRole("checkbox"));

            expect(screen.getByRole("checkbox")).toBeChecked();
            expect(screen.getByText("Glow settings")).toBeInTheDocument();
        });

        it("starts on when told to", () => {
            renderToggle(
                <ToggleWithContent label="Glow" defaultChecked>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByRole("checkbox")).toBeChecked();
        });

        it("reports the new state first and the event that caused it second", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderToggle(
                <ToggleWithContent label="Glow" onChange={onChange}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.click(screen.getByRole("checkbox"));

            // The event is second and optional, so a change made in code is
            // still expressible as onChange(next). The previous revision called
            // this handler with the value alone, which left a consumer unable to
            // read a modifier key or call preventDefault.
            expect(onChange).toHaveBeenCalledTimes(1);
            const [next, event] = onChange.mock.calls[0];
            expect(next).toBe(true);
            expect(event).toBeDefined();
            expect(event.type).toBe("change");
        });

        it("does not turn itself on when it is driven from outside", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderToggle(
                <ToggleWithContent label="Glow" checked={false} onChange={onChange}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.click(screen.getByRole("checkbox"));

            expect(onChange).toHaveBeenCalledWith(true, expect.anything());
            expect(screen.getByRole("checkbox")).not.toBeChecked();
            expect(screen.queryByText("Glow settings")).not.toBeInTheDocument();
        });
    });

    describe("accessibility", () => {
        it("says that the checkbox opens something", () => {
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            // The disclosure pattern, carried by a checkbox: aria-expanded is a
            // supported property of role="checkbox", so the control states both
            // that the feature is off and that nothing is revealed.
            expect(screen.getByRole("checkbox")).toHaveAttribute("aria-expanded", "false");
        });

        it("points the checkbox at the controls it revealed", async () => {
            const user = userEvent.setup();
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.click(screen.getByRole("checkbox"));

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("aria-expanded", "true");
            expect(checkbox.getAttribute("aria-controls")).toBe(
                screen.getByTestId("toggle-with-content-children").id,
            );
        });

        it("points at nothing while there is nothing to point at", () => {
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            // A reference to an id that is not in the document is worse than no
            // reference at all.
            expect(screen.getByRole("checkbox")).not.toHaveAttribute("aria-controls");
        });

        it("announces a disabled toggle as unavailable rather than only dimming it", () => {
            renderToggle(
                <ToggleWithContent label="Glow" disabled>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            expect(screen.getByRole("checkbox")).toBeDisabled();
            expect(screen.getByText("Glow").getAttribute("style")).toContain(PANEL_INK.DISABLED);
        });

        it("refuses to change while it is disabled", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderToggle(
                <ToggleWithContent label="Glow" disabled onChange={onChange}>
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.click(screen.getByRole("checkbox"));

            expect(onChange).not.toHaveBeenCalled();
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            renderToggle(
                <>
                    <ToggleWithContent label="Glow" onFocus={onFocus} onBlur={onBlur}>
                        <div>Glow settings</div>
                    </ToggleWithContent>
                    <button type="button">After</button>
                </>,
            );

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("is reachable by Tab and answers Space", async () => {
            const user = userEvent.setup();
            renderToggle(
                <ToggleWithContent label="Glow">
                    <div>Glow settings</div>
                </ToggleWithContent>,
            );

            await user.tab();
            expect(document.activeElement).toBe(screen.getByRole("checkbox"));

            await user.keyboard(" ");
            expect(screen.getByRole("checkbox")).toBeChecked();
        });
    });
});
