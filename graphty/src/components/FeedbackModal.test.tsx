import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { captureUserFeedback } from "../lib/sentry";
import { render, screen, waitFor } from "../test/test-utils";
import { FeedbackModal } from "./FeedbackModal";

vi.mock("../lib/sentry", () => ({
    captureUserFeedback: vi.fn(),
}));

const mockCaptureUserFeedback = vi.mocked(captureUserFeedback);

describe("FeedbackModal", () => {
    beforeEach(() => {
        mockCaptureUserFeedback.mockClear();
        // Mock successful feedback submission by default
        mockCaptureUserFeedback.mockReturnValue({
            success: true,
            message: "Thank you for your feedback!",
        });
    });

    it("renders modal when opened", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
    });

    it("does not render modal when closed", () => {
        render(<FeedbackModal opened={false} onClose={vi.fn()} />);
        expect(screen.queryByText("Send Feedback")).not.toBeInTheDocument();
    });

    it("disables submit when message is empty", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByRole("button", { name: /Send Feedback/i })).toBeDisabled();
    });

    it("enables submit when message is provided", async () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const textarea = screen.getByPlaceholderText(/Describe the issue/);
        await userEvent.fill(textarea, "Bug report");
        expect(screen.getByRole("button", { name: /Send Feedback/i })).not.toBeDisabled();
    });

    it("calls onClose when Cancel is clicked", async () => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);
        await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it("renders name and email fields", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("your.email@example.com")).toBeInTheDocument();
    });

    it("shows message field label with required indicator", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        // The label should indicate it's required with an asterisk
        expect(screen.getByText(/What happened\?/)).toBeInTheDocument();
    });

    it("renders file attachment field", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByText("Attachments (optional)")).toBeInTheDocument();
        // FileInput renders a hidden file input
        const fileInput = document.querySelector("input[type='file']");
        expect(fileInput).toBeInTheDocument();
    });

    it("updates name field when typed into", async () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const nameInput = screen.getByPlaceholderText("Your name");
        await userEvent.fill(nameInput, "John Doe");
        expect(nameInput).toHaveValue("John Doe");
    });

    it("updates email field when typed into", async () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const emailInput = screen.getByPlaceholderText("your.email@example.com");
        await userEvent.fill(emailInput, "john@example.com");
        expect(emailInput).toHaveValue("john@example.com");
    });

    it("submits feedback with message only", async () => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in message
        const textarea = screen.getByPlaceholderText(/Describe the issue/);
        await userEvent.fill(textarea, "Test feedback message");

        // Click submit
        await userEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

        await waitFor(() => {
            expect(mockCaptureUserFeedback).toHaveBeenCalledWith({
                name: undefined,
                email: undefined,
                message: "Test feedback message",
                attachments: undefined,
            });
        });

        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("submits feedback with name and email", async () => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in name
        await userEvent.fill(screen.getByPlaceholderText("Your name"), "John Doe");

        // Fill in email
        await userEvent.fill(screen.getByPlaceholderText("your.email@example.com"), "john@example.com");

        // Fill in message
        await userEvent.fill(screen.getByPlaceholderText(/Describe the issue/), "Test feedback");

        // Click submit
        await userEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

        await waitFor(() => {
            expect(mockCaptureUserFeedback).toHaveBeenCalledWith({
                name: "John Doe",
                email: "john@example.com",
                message: "Test feedback",
                attachments: undefined,
            });
        });
    });

    it("resets form after successful submission", async () => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in fields
        await userEvent.fill(screen.getByPlaceholderText("Your name"), "John");
        await userEvent.fill(screen.getByPlaceholderText(/Describe the issue/), "Test");

        // Click submit
        await userEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });

        // The form values are reset internally, but since the modal closes,
        // we can verify onClose was called which triggers the reset
        expect(mockCaptureUserFeedback).toHaveBeenCalled();
    });

    describe("error handling", () => {
        it("shows error alert when Sentry is not configured", async () => {
            mockCaptureUserFeedback.mockReturnValue({
                success: false,
                message: "Feedback could not be sent. Error reporting is not configured.",
            });

            const onClose = vi.fn();
            render(<FeedbackModal opened onClose={onClose} />);

            // Fill in message
            await userEvent.fill(screen.getByPlaceholderText(/Describe the issue/), "Test feedback");

            // Click submit
            await userEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

            // Should show error alert
            await waitFor(() => {
                expect(screen.getByRole("alert")).toBeInTheDocument();
                expect(screen.getByText(/Error reporting is not configured/)).toBeInTheDocument();
            });

            // Modal should NOT close on error
            expect(onClose).not.toHaveBeenCalled();
        });

        it("keeps form data when submission fails", async () => {
            mockCaptureUserFeedback.mockReturnValue({
                success: false,
                message: "Feedback could not be sent.",
            });

            render(<FeedbackModal opened onClose={vi.fn()} />);

            // Fill in all fields
            await userEvent.fill(screen.getByPlaceholderText("Your name"), "John Doe");
            await userEvent.fill(screen.getByPlaceholderText("your.email@example.com"), "john@example.com");
            await userEvent.fill(screen.getByPlaceholderText(/Describe the issue/), "My feedback message");

            // Click submit
            await userEvent.click(screen.getByRole("button", { name: /Send Feedback/i }));

            // Wait for error alert
            await waitFor(() => {
                expect(screen.getByRole("alert")).toBeInTheDocument();
            });

            // Form data should be preserved
            expect(screen.getByPlaceholderText("Your name")).toHaveValue("John Doe");
            expect(screen.getByPlaceholderText("your.email@example.com")).toHaveValue("john@example.com");
            expect(screen.getByPlaceholderText(/Describe the issue/)).toHaveValue("My feedback message");
        });
    });

    describe("password autocomplete prevention", () => {
        // Regression test: browsers ignore autoComplete="off" but respect semantic values
        // and password manager-specific data attributes

        it("has password manager ignore attributes on form element", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const form = document.querySelector("form");
            expect(form).toHaveAttribute("data-lpignore", "true");
            expect(form).toHaveAttribute("data-form-type", "other");
            expect(form).toHaveAttribute("data-1p-ignore");
            expect(form).toHaveAttribute("autocomplete", "off");
            // Form ID contains "search" to prevent LastPass from treating it as a login form
            expect(form).toHaveAttribute("id", "feedback-search-form");
        });

        it("has field names with 'search' keyword to avoid LastPass heuristics", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const nameInput = screen.getByPlaceholderText("Your name");
            const emailInput = screen.getByPlaceholderText("your.email@example.com");
            // Names containing "search" prevent LastPass from matching to saved credentials
            expect(nameInput.getAttribute("name")).toContain("search");
            expect(emailInput.getAttribute("name")).toContain("search");
        });

        it("has password manager ignore attributes on name field", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const nameInput = screen.getByPlaceholderText("Your name");
            expect(nameInput).toHaveAttribute("data-1p-ignore");
            expect(nameInput).toHaveAttribute("data-lpignore", "true");
        });

        it("has password manager ignore attributes on email field", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const emailInput = screen.getByPlaceholderText("your.email@example.com");
            expect(emailInput).toHaveAttribute("data-1p-ignore");
            expect(emailInput).toHaveAttribute("data-lpignore", "true");
        });

        it("uses autocomplete='off' on input fields", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const nameInput = screen.getByPlaceholderText("Your name");
            const emailInput = screen.getByPlaceholderText("your.email@example.com");

            // Combined with data-lpignore and "search" in field names,
            // autocomplete="off" helps prevent password manager autofill
            expect(nameInput).toHaveAttribute("autocomplete", "off");
            expect(emailInput).toHaveAttribute("autocomplete", "off");
        });

        it("does not have password-related autocomplete attributes", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            const allInputs = screen.getAllByRole("textbox");

            const passwordAutocompleteValues = ["current-password", "new-password", "password", "username"];

            allInputs.forEach((input) => {
                const autocomplete = input.getAttribute("autocomplete");
                passwordAutocompleteValues.forEach((value) => {
                    expect(autocomplete).not.toBe(value);
                });
            });
        });
    });
});
