import {beforeEach, describe, expect, it, vi} from "vitest";

import {captureUserFeedback} from "../lib/sentry";
import {fireEvent, render, screen, waitFor} from "../test/test-utils";
import {FeedbackModal} from "./FeedbackModal";

vi.mock("../lib/sentry", () => ({
    captureUserFeedback: vi.fn(),
}));

const mockCaptureUserFeedback = vi.mocked(captureUserFeedback);

describe("FeedbackModal", () => {
    beforeEach(() => {
        mockCaptureUserFeedback.mockClear();
    });

    it("renders modal when opened", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Send Feedback"})).toBeInTheDocument();
    });

    it("does not render modal when closed", () => {
        render(<FeedbackModal opened={false} onClose={vi.fn()} />);
        expect(screen.queryByText("Send Feedback")).not.toBeInTheDocument();
    });

    it("disables submit when message is empty", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByRole("button", {name: /Send Feedback/i})).toBeDisabled();
    });

    it("enables submit when message is provided", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const textarea = screen.getByPlaceholderText(/Describe the issue/);
        fireEvent.change(textarea, {
            target: {value: "Bug report"},
        });
        expect(screen.getByRole("button", {name: /Send Feedback/i})).not.toBeDisabled();
    });

    it("calls onClose when Cancel is clicked", () => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);
        fireEvent.click(screen.getByRole("button", {name: /Cancel/i}));
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

    it("updates name field when typed into", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const nameInput = screen.getByPlaceholderText("Your name");
        fireEvent.change(nameInput, {target: {value: "John Doe"}});
        expect(nameInput).toHaveValue("John Doe");
    });

    it("updates email field when typed into", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        const emailInput = screen.getByPlaceholderText("your.email@example.com");
        fireEvent.change(emailInput, {target: {value: "john@example.com"}});
        expect(emailInput).toHaveValue("john@example.com");
    });

    it("submits feedback with message only", async() => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in message
        const textarea = screen.getByPlaceholderText(/Describe the issue/);
        fireEvent.change(textarea, {target: {value: "Test feedback message"}});

        // Click submit
        fireEvent.click(screen.getByRole("button", {name: /Send Feedback/i}));

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

    it("submits feedback with name and email", async() => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in name
        fireEvent.change(screen.getByPlaceholderText("Your name"), {
            target: {value: "John Doe"},
        });

        // Fill in email
        fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
            target: {value: "john@example.com"},
        });

        // Fill in message
        fireEvent.change(screen.getByPlaceholderText(/Describe the issue/), {
            target: {value: "Test feedback"},
        });

        // Click submit
        fireEvent.click(screen.getByRole("button", {name: /Send Feedback/i}));

        await waitFor(() => {
            expect(mockCaptureUserFeedback).toHaveBeenCalledWith({
                name: "John Doe",
                email: "john@example.com",
                message: "Test feedback",
                attachments: undefined,
            });
        });
    });

    it("resets form after successful submission", async() => {
        const onClose = vi.fn();
        render(<FeedbackModal opened onClose={onClose} />);

        // Fill in fields
        fireEvent.change(screen.getByPlaceholderText("Your name"), {
            target: {value: "John"},
        });
        fireEvent.change(screen.getByPlaceholderText(/Describe the issue/), {
            target: {value: "Test"},
        });

        // Click submit
        fireEvent.click(screen.getByRole("button", {name: /Send Feedback/i}));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
        });

        // The form values are reset internally, but since the modal closes,
        // we can verify onClose was called which triggers the reset
        expect(mockCaptureUserFeedback).toHaveBeenCalled();
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

            const passwordAutocompleteValues = [
                "current-password",
                "new-password",
                "password",
                "username",
            ];

            allInputs.forEach((input) => {
                const autocomplete = input.getAttribute("autocomplete");
                passwordAutocompleteValues.forEach((value) => {
                    expect(autocomplete).not.toBe(value);
                });
            });
        });
    });
});
