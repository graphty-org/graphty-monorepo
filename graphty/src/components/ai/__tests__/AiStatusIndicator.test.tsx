import { describe, expect, it } from "vitest";

import { render, screen } from "../../../test/test-utils";
import type { AiStatus } from "../../../types/ai";
import { AiStatusIndicator } from "../AiStatusIndicator";

describe("AiStatusIndicator", () => {
    describe("rendering with null status", () => {
        it("renders idle state when status is null", () => {
            render(<AiStatusIndicator status={null} />);

            expect(screen.getByText("Ready")).toBeInTheDocument();
        });

        it("uses gray color for idle state", () => {
            render(<AiStatusIndicator status={null} />);

            const badge = screen.getByText("Ready").closest(".mantine-Badge-root");
            expect(badge).toHaveAttribute("data-variant", "light");
        });
    });

    describe("rendering different stages", () => {
        it("renders processing state", () => {
            const status: AiStatus = { stage: "processing" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Processing")).toBeInTheDocument();
        });

        it("renders executingTool state", () => {
            const status: AiStatus = { stage: "executingTool" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Executing")).toBeInTheDocument();
        });

        it("renders streaming state", () => {
            const status: AiStatus = { stage: "streaming" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Generating")).toBeInTheDocument();
        });

        it("renders complete state", () => {
            const status: AiStatus = { stage: "complete" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Complete")).toBeInTheDocument();
        });

        it("renders error state", () => {
            const status: AiStatus = { stage: "error" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Error")).toBeInTheDocument();
        });

        it("renders idle state explicitly", () => {
            const status: AiStatus = { stage: "idle" };
            render(<AiStatusIndicator status={status} />);

            expect(screen.getByText("Ready")).toBeInTheDocument();
        });
    });

    describe("showText prop", () => {
        it("shows additional detail text when showText is true and message exists", () => {
            const status: AiStatus = { stage: "processing", message: "Loading model..." };
            render(<AiStatusIndicator status={status} showText={true} />);

            expect(screen.getByText("Loading model...")).toBeInTheDocument();
        });

        it("shows tool name when executing tool with showText", () => {
            const status: AiStatus = {
                stage: "executingTool",
                toolCalls: [{ name: "setNodeColor", status: "executing" }],
            };
            render(<AiStatusIndicator status={status} showText={true} />);

            expect(screen.getByText("Running: setNodeColor")).toBeInTheDocument();
        });

        it("shows truncated streamed text when streaming with showText", () => {
            const longText = "A".repeat(100);
            const status: AiStatus = { stage: "streaming", streamedText: longText };
            render(<AiStatusIndicator status={status} showText={true} />);

            // Should be truncated to 50 chars + "..."
            expect(screen.getByText("A".repeat(50) + "...")).toBeInTheDocument();
        });

        it("shows full streamed text when short", () => {
            const status: AiStatus = { stage: "streaming", streamedText: "Short text" };
            render(<AiStatusIndicator status={status} showText={true} />);

            expect(screen.getByText("Short text")).toBeInTheDocument();
        });

        it("shows error message when error stage with showText", () => {
            const status: AiStatus = { stage: "error", error: new Error("Something went wrong") };
            render(<AiStatusIndicator status={status} showText={true} />);

            expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        });

        it("does not show detail text when it matches the label", () => {
            const status: AiStatus = { stage: "idle" };
            render(<AiStatusIndicator status={status} showText={true} />);

            // Should only have one "Ready" - the badge label, not a duplicate detail
            const readyElements = screen.getAllByText("Ready");
            expect(readyElements).toHaveLength(1);
        });
    });

    describe("size prop", () => {
        it("renders with default md size", () => {
            render(<AiStatusIndicator status={null} />);

            // Just verify it renders - size mapping is internal
            expect(screen.getByText("Ready")).toBeInTheDocument();
        });

        it("renders with sm size", () => {
            render(<AiStatusIndicator status={null} size="sm" />);

            expect(screen.getByText("Ready")).toBeInTheDocument();
        });

        it("renders with lg size", () => {
            render(<AiStatusIndicator status={null} size="lg" />);

            expect(screen.getByText("Ready")).toBeInTheDocument();
        });
    });

    describe("tooltip", () => {
        it("renders with tooltip when showText is false", () => {
            const status: AiStatus = { stage: "processing", message: "Loading..." };
            render(<AiStatusIndicator status={status} showText={false} />);

            // The badge should be wrapped in a tooltip
            // We can verify the component renders without error
            expect(screen.getByText("Processing")).toBeInTheDocument();
        });
    });

    describe("tool call status", () => {
        it("finds executing tool when multiple tools present", () => {
            const status: AiStatus = {
                stage: "executingTool",
                toolCalls: [
                    { name: "getNodes", status: "success" },
                    { name: "setLayout", status: "executing" },
                    { name: "zoom", status: "pending" },
                ],
            };
            render(<AiStatusIndicator status={status} showText={true} />);

            expect(screen.getByText("Running: setLayout")).toBeInTheDocument();
        });

        it("shows default label when no executing tool found", () => {
            const status: AiStatus = {
                stage: "executingTool",
                toolCalls: [{ name: "getNodes", status: "success" }],
            };
            render(<AiStatusIndicator status={status} showText={true} />);

            // Should show "Executing" since no tool is currently executing
            const executingElements = screen.getAllByText("Executing");
            expect(executingElements.length).toBeGreaterThan(0);
        });
    });
});
