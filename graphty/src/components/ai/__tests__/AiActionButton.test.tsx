import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import { AiActionButton } from "../AiActionButton";

describe("AiActionButton", () => {
    describe("rendering", () => {
        it("renders a button", () => {
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toBeInTheDocument();
        });

        it("has accessible label when not configured", () => {
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toHaveAccessibleName("Configure AI");
        });

        it("has accessible label when configured", () => {
            render(<AiActionButton isConfigured={true} isProcessing={false} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toHaveAccessibleName("Open AI Assistant");
        });

        it("has accessible label when processing", () => {
            render(<AiActionButton isConfigured={true} isProcessing={true} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toHaveAccessibleName("AI is processing...");
        });

        it("has accessible label when not ready", () => {
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={false} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toHaveAccessibleName("Loading AI...");
        });
    });

    describe("visual states", () => {
        it("uses subtle variant when not configured", () => {
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            // Mantine adds data attributes for variant
            expect(button).toHaveAttribute("data-variant", "subtle");
        });

        it("uses filled variant when configured", () => {
            render(<AiActionButton isConfigured={true} isProcessing={false} isReady={true} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toHaveAttribute("data-variant", "filled");
        });

        it("is disabled when not ready", () => {
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={false} onClick={vi.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toBeDisabled();
        });
    });

    describe("interactions", () => {
        it("calls onClick when clicked", () => {
            const onClick = vi.fn();
            render(<AiActionButton isConfigured={true} isProcessing={false} isReady={true} onClick={onClick} />);

            const button = screen.getByRole("button");
            fireEvent.click(button);

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("does not call onClick when disabled", () => {
            const onClick = vi.fn();
            render(<AiActionButton isConfigured={false} isProcessing={false} isReady={false} onClick={onClick} />);

            const button = screen.getByRole("button");
            fireEvent.click(button);

            expect(onClick).not.toHaveBeenCalled();
        });
    });
});
