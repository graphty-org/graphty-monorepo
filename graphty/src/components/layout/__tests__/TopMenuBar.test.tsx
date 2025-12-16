import {MantineProvider} from "@mantine/core";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {TopMenuBar} from "../TopMenuBar";

const defaultProps = {
    onToggleLeftSidebar: vi.fn(),
    onToggleRightSidebar: vi.fn(),
    onToggleToolbar: vi.fn(),
    onLoadData: vi.fn(),
};

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider>{ui}</MantineProvider>);
}

async function openMenu(): Promise<void> {
    await userEvent.click(screen.getByLabelText("Main menu"));
    await waitFor(() => {
        expect(screen.getByText("View Data...")).toBeInTheDocument();
    });
}

describe("TopMenuBar", () => {
    it("renders the main menu button", () => {
        renderWithProvider(<TopMenuBar {...defaultProps} />);
        expect(screen.getByLabelText("Main menu")).toBeInTheDocument();
    });

    it("renders the Graphty title", () => {
        renderWithProvider(<TopMenuBar {...defaultProps} />);
        expect(screen.getByText("Graphty")).toBeInTheDocument();
    });
});

describe("TopMenuBar - View Data", () => {
    it("renders View Data menu item", async() => {
        renderWithProvider(<TopMenuBar {...defaultProps} />);
        await openMenu();
        expect(screen.getByText("View Data...")).toBeInTheDocument();
    });

    it("calls onViewData when clicked", async() => {
        const onViewData = vi.fn();
        renderWithProvider(<TopMenuBar {...defaultProps} onViewData={onViewData} />);
        await openMenu();
        await userEvent.click(screen.getByText("View Data..."));
        expect(onViewData).toHaveBeenCalled();
    });

    it("disables View Data when hasData is false", async() => {
        renderWithProvider(<TopMenuBar {...defaultProps} hasData={false} />);
        await openMenu();
        const item = screen.getByText("View Data...").closest("[role='menuitem']");
        expect(item).toHaveAttribute("data-disabled", "true");
    });

    it("enables View Data when hasData is true", async() => {
        renderWithProvider(<TopMenuBar {...defaultProps} hasData={true} />);
        await openMenu();
        const item = screen.getByText("View Data...").closest("[role='menuitem']");
        expect(item).not.toHaveAttribute("data-disabled", "true");
    });

    it("enables View Data when hasData is not specified", async() => {
        renderWithProvider(<TopMenuBar {...defaultProps} />);
        await openMenu();
        const item = screen.getByText("View Data...").closest("[role='menuitem']");
        expect(item).not.toHaveAttribute("data-disabled", "true");
    });
});
