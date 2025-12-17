import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, type MockInstance, vi} from "vitest";

import {render, screen, waitFor} from "../../../test/test-utils";
import {CopyButton} from "../CopyButton";

describe("CopyButton", () => {
    let clipboardSpy: MockInstance;

    beforeEach(() => {
        // Spy on the clipboard writeText method with immediate implementation
        clipboardSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a button with clipboard icon", () => {
        render(<CopyButton value="test" />);
        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute("aria-label", "Copy value");
    });

    it("copies string value on click and shows feedback", async() => {
        const user = userEvent.setup();
        render(<CopyButton value="test string" />);
        await user.click(screen.getByRole("button"));
        // Verify via UI state change - the button shows "Copied!" when clipboard write succeeds
        // This is the most important user-facing behavior to test
        await waitFor(() => {
            expect(screen.getByLabelText("Copied!")).toBeInTheDocument();
        });
    });

    it("copies number value as string on click", async() => {
        const user = userEvent.setup();
        render(<CopyButton value={42} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("42");
        });
    });

    it("copies boolean value as string on click", async() => {
        const user = userEvent.setup();
        render(<CopyButton value={true} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("true");
        });
    });

    it("copies object value as JSON on click", async() => {
        const user = userEvent.setup();
        const obj = {name: "test", value: 123};
        render(<CopyButton value={obj} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith(JSON.stringify(obj, null, 2));
        });
    });

    it("copies array value as JSON on click", async() => {
        const user = userEvent.setup();
        const arr = [1, 2, 3];
        render(<CopyButton value={arr} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith(JSON.stringify(arr, null, 2));
        });
    });

    it("shows Copied! feedback after clicking", async() => {
        const user = userEvent.setup();
        render(<CopyButton value="test" />);
        await user.click(screen.getByRole("button"));
        // The "Copied!" text should appear (via aria-label change)
        await waitFor(() => {
            expect(screen.getByLabelText("Copied!")).toBeInTheDocument();
        });
    });

    it("copies path on shift+click when path is provided", async() => {
        const user = userEvent.setup();
        render(<CopyButton value="test" path="nodes[0].name" />);

        // Use keyboard to trigger shift+click
        await user.keyboard("{Shift>}");
        await user.click(screen.getByRole("button"));
        await user.keyboard("{/Shift}");

        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("nodes[0].name");
        });
    });

    it("copies value normally when path is provided but shift is not held", async() => {
        const user = userEvent.setup();
        render(<CopyButton value="test" path="nodes[0].name" />);

        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("test");
        });
    });

    it("copies value when path is not provided even with shift", async() => {
        const user = userEvent.setup();
        render(<CopyButton value="test" />);

        await user.keyboard("{Shift>}");
        await user.click(screen.getByRole("button"));
        await user.keyboard("{/Shift}");

        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("test");
        });
    });

    it("resets Copied! feedback after timeout", async() => {
        const user = userEvent.setup();

        render(<CopyButton value="test" />);
        await user.click(screen.getByRole("button"));

        // Should show "Copied!" immediately after click
        await waitFor(() => {
            expect(screen.getByLabelText("Copied!")).toBeInTheDocument();
        });

        // Wait for the real timeout to reset the feedback (1.5s in the component)
        await waitFor(
            () => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            },
            {timeout: 3000},
        );
    });

    it("handles null value", async() => {
        const user = userEvent.setup();
        render(<CopyButton value={null} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("null");
        });
    });

    it("handles undefined value", async() => {
        const user = userEvent.setup();
        render(<CopyButton value={undefined} />);
        await user.click(screen.getByRole("button"));
        await waitFor(() => {
            expect(clipboardSpy).toHaveBeenCalledWith("undefined");
        });
    });
});
