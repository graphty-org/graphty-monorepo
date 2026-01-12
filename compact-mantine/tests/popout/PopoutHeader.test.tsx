import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { PopoutHeader } from "../../src/components/popout/PopoutHeader";
import { compactTheme } from "../../src/theme";
import type { PopoutHeaderConfig } from "../../src/types/popout";

/**
 * Helper to render PopoutHeader with MantineProvider
 */
function renderHeader(ui: ReactElement) {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("PopoutHeader", () => {
    it("renders title variant with title text", () => {
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();

        renderHeader(<PopoutHeader config={config} onClose={onClose} />);

        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders tabs variant with segmented control", () => {
        const config: PopoutHeaderConfig = {
            variant: "tabs",
            tabs: [
                { id: "tab1", label: "Tab 1", content: <div>Content 1</div> },
                { id: "tab2", label: "Tab 2", content: <div>Content 2</div> },
            ],
        };
        const onClose = vi.fn();

        renderHeader(
            <PopoutHeader config={config} onClose={onClose} activeTab="tab1" onTabChange={vi.fn()} />,
        );

        expect(screen.getByRole("radio", { name: "Tab 1" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Tab 2" })).toBeInTheDocument();
    });

    it("switches tab content on click", async () => {
        const user = userEvent.setup();
        const onTabChange = vi.fn();
        const config: PopoutHeaderConfig = {
            variant: "tabs",
            tabs: [
                { id: "tab1", label: "Tab 1", content: <div>Content 1</div> },
                { id: "tab2", label: "Tab 2", content: <div>Content 2</div> },
            ],
            defaultTab: "tab1",
        };
        const onClose = vi.fn();

        renderHeader(
            <PopoutHeader config={config} onClose={onClose} activeTab="tab1" onTabChange={onTabChange} />,
        );

        // First option should be selected (controlled by activeTab prop)
        const option1 = screen.getByRole("radio", { name: "Tab 1" });
        const option2 = screen.getByRole("radio", { name: "Tab 2" });

        expect(option1).toBeChecked();
        expect(option2).not.toBeChecked();

        // Click second option
        await user.click(option2);

        // Should call onTabChange with the new tab id
        expect(onTabChange).toHaveBeenCalledWith("tab2");
    });

    it("renders action buttons", () => {
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();
        const onAction = vi.fn();
        const actions = [
            { id: "help", icon: <span data-testid="help-icon">?</span>, label: "Help", onClick: onAction },
        ];

        renderHeader(<PopoutHeader config={config} onClose={onClose} actions={actions} />);

        expect(screen.getByLabelText("Help")).toBeInTheDocument();
        expect(screen.getByTestId("help-icon")).toBeInTheDocument();
    });

    it("calls action onClick when action button clicked", async () => {
        const user = userEvent.setup();
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();
        const onAction = vi.fn();
        const actions = [{ id: "help", icon: <span>?</span>, label: "Help", onClick: onAction }];

        renderHeader(<PopoutHeader config={config} onClose={onClose} actions={actions} />);

        await user.click(screen.getByLabelText("Help"));

        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button clicked", async () => {
        const user = userEvent.setup();
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();

        renderHeader(<PopoutHeader config={config} onClose={onClose} />);

        await user.click(screen.getByLabelText("Close panel"));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders close button with aria-label", () => {
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();

        renderHeader(<PopoutHeader config={config} onClose={onClose} />);

        expect(screen.getByLabelText("Close panel")).toBeInTheDocument();
    });

    it("applies drag trigger props", () => {
        const config: PopoutHeaderConfig = { variant: "title", title: "Settings" };
        const onClose = vi.fn();
        const dragTriggerProps = { "data-drag-trigger": true, "data-testid": "drag-area" };

        renderHeader(
            <PopoutHeader config={config} onClose={onClose} dragTriggerProps={dragTriggerProps} />,
        );

        const dragArea = screen.getByTestId("drag-area");
        expect(dragArea).toHaveAttribute("data-drag-trigger", "true");
    });

    it("shows first option as selected when activeTab matches first tab", () => {
        const config: PopoutHeaderConfig = {
            variant: "tabs",
            tabs: [
                { id: "first", label: "First", content: <div>First Content</div> },
                { id: "second", label: "Second", content: <div>Second Content</div> },
            ],
        };
        const onClose = vi.fn();

        renderHeader(
            <PopoutHeader config={config} onClose={onClose} activeTab="first" onTabChange={vi.fn()} />,
        );

        const option1 = screen.getByRole("radio", { name: "First" });
        expect(option1).toBeChecked();
    });
});
