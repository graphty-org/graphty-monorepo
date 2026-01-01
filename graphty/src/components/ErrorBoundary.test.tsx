import { describe, expect, it, vi } from "vitest";

import { SourceMapTestContent } from "../stories/Sentry.stories";
import { fireEvent, render, screen } from "../test/test-utils";
import { ErrorBoundary } from "./ErrorBoundary";
import { ErrorFallback } from "./ErrorFallback";

function ThrowingComponent(): React.JSX.Element {
    throw new Error("Test render error");
}

describe("ErrorBoundary", () => {
    it("renders children when no error occurs", () => {
        render(
            <ErrorBoundary>
                <div>Normal content</div>
            </ErrorBoundary>,
        );
        expect(screen.getByText("Normal content")).toBeInTheDocument();
    });

    it("renders fallback UI when error occurs", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>,
        );
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
        spy.mockRestore();
    });
});

describe("ErrorFallback", () => {
    it("renders error message", () => {
        render(<ErrorFallback error={new Error("Demo error")} resetError={vi.fn()} />);
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it("calls resetError when Try again button is clicked", () => {
        const resetError = vi.fn();
        render(<ErrorFallback error={new Error("Demo error")} resetError={resetError} />);
        fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
        expect(resetError).toHaveBeenCalled();
    });
});

describe("SourceMapTestContent (Storybook regression)", () => {
    it("renders without MantineProvider error", () => {
        // This test verifies that Mantine components render correctly
        // Regression test for: MantineProvider was not found in component tree
        render(<SourceMapTestContent />);

        // Verify the component renders with expected Mantine components
        expect(screen.getByText("Source Map Verification Test")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Send Test Error to Sentry/i })).toBeInTheDocument();
    });

    it("shows Sentry not configured alert when DSN is not set", () => {
        render(<SourceMapTestContent />);

        // Should show the warning alert since Sentry DSN is not configured in tests
        expect(screen.getByText("Sentry Not Configured")).toBeInTheDocument();
        expect(screen.getByText(/Set VITE_SENTRY_DSN/)).toBeInTheDocument();
    });

    it("has disabled button when Sentry is not configured", () => {
        render(<SourceMapTestContent />);

        const button = screen.getByRole("button", { name: /Send Test Error to Sentry/i });
        expect(button).toBeDisabled();
    });
});
