import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen, waitFor} from "../../test/test-utils";
import {TopMenuBar} from "./TopMenuBar";

describe("TopMenuBar", () => {
    it("renders the main menu button", () => {
        render(<TopMenuBar />);
        expect(screen.getByLabelText("Main menu")).toBeInTheDocument();
    });

    it("renders Send feedback menu item under Help section", async() => {
        render(<TopMenuBar />);
        fireEvent.click(screen.getByLabelText("Main menu"));
        await waitFor(() => {
            expect(screen.getByText("Help")).toBeInTheDocument();
        });
        expect(screen.getByText("Send feedback...")).toBeInTheDocument();
    });

    it("calls onSendFeedback when clicked", async() => {
        const onSendFeedback = vi.fn();
        render(<TopMenuBar onSendFeedback={onSendFeedback} />);
        fireEvent.click(screen.getByLabelText("Main menu"));
        await waitFor(() => {
            expect(screen.getByText("Send feedback...")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Send feedback..."));
        expect(onSendFeedback).toHaveBeenCalled();
    });

    it("renders File section with Load Data menu item", async() => {
        render(<TopMenuBar />);
        fireEvent.click(screen.getByLabelText("Main menu"));
        await waitFor(() => {
            expect(screen.getByText("File")).toBeInTheDocument();
        });
        expect(screen.getByText("Load Data...")).toBeInTheDocument();
    });

    it("renders View section with toggle options", async() => {
        render(<TopMenuBar />);
        fireEvent.click(screen.getByLabelText("Main menu"));
        await waitFor(() => {
            expect(screen.getByText("View")).toBeInTheDocument();
        });
        expect(screen.getByText("Toggle Layers Panel")).toBeInTheDocument();
        expect(screen.getByText("Toggle Properties Panel")).toBeInTheDocument();
        expect(screen.getByText("Toggle Toolbar")).toBeInTheDocument();
    });
});
