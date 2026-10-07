import type { JSX } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/test-utils";
import { FeedbackModal } from "../FeedbackModal";
import { LoadDataModal } from "../LoadDataModal";
import { RunAlgorithmModal } from "../RunAlgorithmModal";
import { RunLayoutsModal } from "../RunLayoutsModal";

const dialogs: [string, () => JSX.Element, RegExp][] = [
    ["RunLayoutsModal", () => <RunLayoutsModal opened onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />, /Apply Layout/],
    ["LoadDataModal", () => <LoadDataModal opened onClose={vi.fn()} onLoad={vi.fn()} />, /^Load/],
    ["RunAlgorithmModal", () => <RunAlgorithmModal opened onClose={vi.fn()} graphtyRef={{ current: null }} />, /Run Algorithm/],
    ["FeedbackModal", () => <FeedbackModal opened onClose={vi.fn()} />, /Send Feedback/],
];

describe("Modal styling consistency", () => {
    describe.each(dialogs)("%s", (_name, ui, primary) => {
        it("puts Cancel and its primary action in the shared modal footer", () => {
            render(ui());
            const footer = screen.getByRole("button", { name: primary }).closest(".cm-modal-footer");
            expect(footer).not.toBeNull();
            expect(footer).toContainElement(screen.getByRole("button", { name: "Cancel" }));
        });

        it("adds no modal style of its own over the shared theme", () => {
            render(ui());
            const modal = screen.getByRole("dialog");
            // No colour that only works in dark mode. A `dark-N` paired inside
            // `light-dark(light, dark)` is the correct way to write both modes at once.
            modal.querySelectorAll("*").forEach((el) => {
                const style = (el.getAttribute("style") ?? "").replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, "");
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
            for (const part of [".mantine-Modal-body", ".mantine-Modal-header", ".mantine-Modal-content"]) {
                expect(document.querySelector(part)?.getAttribute("style") ?? "").not.toMatch(/padding|background/);
            }
        });
    });
});
